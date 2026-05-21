const axios = require('axios');
const logger = require('../utils/logger');
const { getRedisClient } = require('../config/redis');

const getNow = () => Date.now();

const makeCacheKey = (bucket, payload = {}) => {
  const stable = JSON.stringify(payload, Object.keys(payload).sort());
  return `${bucket}:${stable}`;
};

const getTtlMs = (fallback = 5 * 60 * 1000) => {
  const configured = Number(process.env.ASTROLOGY_PROVIDER_CACHE_TTL_MS || fallback);
  return Number.isFinite(configured) && configured > 1000 ? configured : fallback;
};

const readCache = async (key) => {
  const redisClient = getRedisClient();
  if (!redisClient) return null;

  const entryJson = await redisClient.get(key);
  if (!entryJson) return null;

  try {
    const entry = JSON.parse(entryJson);
    if (entry.expiresAt <= getNow()) {
      await redisClient.del(key);
      return null;
    }
    return entry.value;
  } catch (error) {
    logger.warn(`Astrology cache decode failed for ${key}: ${error.message}`);
    await redisClient.del(key).catch(() => {});
    return null;
  }
};

const writeCache = async (key, value, ttlMs) => {
  const redisClient = getRedisClient();
  if (!redisClient) return;

  const entry = {
    value,
    expiresAt: getNow() + ttlMs,
  };

  await redisClient.set(key, JSON.stringify(entry), {
    PX: ttlMs,
  });
};

const normalizeMeta = (meta = {}) => ({
  source: String(meta.source || 'template-engine').trim(),
  guidanceOnly: Boolean(meta.guidanceOnly),
  isSynthetic: Boolean(meta.isSynthetic),
  cached: Boolean(meta.cached),
  note: String(meta.note || '').trim(),
  fetchedAt: meta.fetchedAt || new Date().toISOString(),
});

const hasLiveProvider = () =>
  String(process.env.ASTROLOGY_LIVE_MODE || '').toLowerCase() === 'true' &&
  Boolean(process.env.ASTROLOGY_PROVIDER_BASE_URL);

const fetchFromLiveProvider = async (path, params = {}, timeoutMs = 5000) => {
  if (!hasLiveProvider()) {
    throw new Error('Live astrology provider is not configured.');
  }

  const baseUrl = String(process.env.ASTROLOGY_PROVIDER_BASE_URL || '').replace(/\/+$/, '');
  const apiKey = String(process.env.ASTROLOGY_PROVIDER_API_KEY || '').trim();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = apiKey
    ? {
        Authorization: `Bearer ${apiKey}`,
      }
    : {};

  const response = await axios.get(url, {
    params,
    headers,
    timeout: timeoutMs,
  });

  return response?.data;
};

const resolveWithCache = async ({
  bucket,
  keyPayload,
  ttlMs,
  fallbackData,
  fallbackMeta,
  liveResolver,
}) => {
  const cacheKey = makeCacheKey(bucket, keyPayload);
  const cached = await readCache(cacheKey);
  if (cached) {
    return {
      ...cached,
      meta: normalizeMeta({
        ...cached.meta,
        cached: true,
      }),
    };
  }

  try {
    const live = await liveResolver();
    const result = {
      data: live.data,
      meta: normalizeMeta({
        source: live.source || 'live-provider',
        guidanceOnly: false,
        isSynthetic: false,
        cached: false,
        note: live.note || '',
      }),
    };
    await writeCache(cacheKey, result, ttlMs);
    return result;
  } catch (error) {
    logger.warn(`Astrology live provider fallback (${bucket}): ${error.message}`);
    const result = {
      data: fallbackData,
      meta: normalizeMeta({
        ...fallbackMeta,
        cached: false,
      }),
    };
    await writeCache(cacheKey, result, Math.min(ttlMs, 60 * 1000));
    return result;
  }
};

const astrologyProviderService = {
  async getPanchangam({ date = '', timezone = 'Asia/Kolkata', fallbackData }) {
    return resolveWithCache({
      bucket: 'panchangam',
      keyPayload: { date: String(date || ''), timezone: String(timezone || '') },
      ttlMs: getTtlMs(10 * 60 * 1000),
      fallbackData,
      fallbackMeta: {
        source: 'curated-template',
        guidanceOnly: true,
        isSynthetic: true,
        note: 'Panchangam values are currently curated guidance values in this environment.',
      },
      liveResolver: async () => {
        const payload = await fetchFromLiveProvider('/panchangam', { date, timezone });
        if (!payload || typeof payload !== 'object') {
          throw new Error('Invalid live Panchangam payload.');
        }
        return {
          data: payload.data || payload,
          source: 'live-provider',
        };
      },
    });
  },

  async getFestivals({ region = 'IN-KL', month = '', year = '', fallbackData }) {
    return resolveWithCache({
      bucket: 'festivals',
      keyPayload: { region: String(region || ''), month: String(month || ''), year: String(year || '') },
      ttlMs: getTtlMs(6 * 60 * 60 * 1000),
      fallbackData,
      fallbackMeta: {
        source: 'template-engine',
        guidanceOnly: true,
        isSynthetic: true,
        note: 'Festival list is currently guidance-oriented template content.',
      },
      liveResolver: async () => {
        const payload = await fetchFromLiveProvider('/festivals', { region, month, year });
        const list = payload?.data || payload;
        if (!Array.isArray(list)) {
          throw new Error('Invalid live festival payload.');
        }
        return {
          data: list,
          source: 'live-provider',
        };
      },
    });
  },

  async getCompatibility({ sign, partnerSign, fallbackData }) {
    return resolveWithCache({
      bucket: 'compatibility',
      keyPayload: { sign: String(sign || ''), partnerSign: String(partnerSign || '') },
      ttlMs: getTtlMs(60 * 60 * 1000),
      fallbackData,
      fallbackMeta: {
        source: 'template-engine',
        guidanceOnly: true,
        isSynthetic: true,
        note: 'Compatibility score is guidance-oriented and not a deterministic life outcome guarantee.',
      },
      liveResolver: async () => {
        const payload = await fetchFromLiveProvider('/compatibility', { sign, partnerSign });
        const data = payload?.data || payload;
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid live compatibility payload.');
        }
        return {
          data,
          source: 'live-provider',
        };
      },
    });
  },

  async getAssistantReply({ sign, question, fallbackData }) {
    return resolveWithCache({
      bucket: 'assistant',
      keyPayload: {
        sign: String(sign || ''),
        question: String(question || '').trim().toLowerCase(),
      },
      ttlMs: getTtlMs(15 * 60 * 1000),
      fallbackData,
      fallbackMeta: {
        source: 'template-engine',
        guidanceOnly: true,
        isSynthetic: true,
        note: 'Assistant response is currently guidance-oriented template output.',
      },
      liveResolver: async () => {
        const payload = await fetchFromLiveProvider('/assistant', { sign, question });
        const data = payload?.data || payload;
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid live assistant payload.');
        }
        return {
          data,
          source: 'live-provider',
        };
      },
    });
  },

  _resetCacheForTests() {
    cacheStore.clear();
  },
};

module.exports = astrologyProviderService;
