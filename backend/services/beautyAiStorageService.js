const normalizeText = (value = '', maxLength = 400) => String(value || '').trim().slice(0, maxLength);
const normalizeLower = (value = '', maxLength = 120) => normalizeText(value, maxLength).toLowerCase();

const normalizeStorageKey = (value = '') =>
  String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\.\.+/g, '');

const parseAllowedPhotoHosts = () =>
  String(process.env.BEAUTY_MEDIA_ALLOWED_HOSTS || '')
    .split(',')
    .map((entry) => normalizeLower(entry, 255))
    .filter(Boolean);

const buildTrustedPhotoHostSet = (req, { isProduction = false } = {}) => {
  const hosts = new Set(parseAllowedPhotoHosts());
  const bucket = normalizeText(process.env.AWS_S3_BUCKET, 120);
  const awsRegion = normalizeText(process.env.AWS_REGION || 'us-east-1', 40);
  const cloudfrontDomain = normalizeLower(process.env.CLOUDFRONT_DOMAIN || '', 255);
  const requestHost = normalizeLower(String(req?.get?.('host') || '').split(':')[0], 255);

  if (requestHost) {
    hosts.add(requestHost);
  }
  if (bucket) {
    hosts.add(normalizeLower(`${bucket}.s3.${awsRegion}.amazonaws.com`, 255));
    hosts.add(normalizeLower(`${bucket}.s3.amazonaws.com`, 255));
  }
  if (cloudfrontDomain) {
    hosts.add(cloudfrontDomain);
  }
  if (!isProduction) {
    hosts.add('localhost');
    hosts.add('127.0.0.1');
  }
  return hosts;
};

const extractStorageKeyFromPhotoUrl = (photoUrl = '') => {
  const value = normalizeText(photoUrl, 2000);
  if (!value) {
    return '';
  }

  try {
    const parsed = new URL(value);
    const normalizedPath = normalizeText(parsed.pathname, 2000);
    if (/^\/uploads\//i.test(normalizedPath)) {
      return normalizeStorageKey(normalizedPath.slice('/uploads/'.length));
    }
    return normalizeStorageKey(normalizedPath.replace(/^\/+/, ''));
  } catch (_error) {
    return '';
  }
};

const normalizeSafePhotoUrl = (req, value = '', { isProduction = false } = {}) => {
  const photoUrl = normalizeText(value, 2000);
  if (!photoUrl) {
    return '';
  }

  if (/^data:/i.test(photoUrl)) {
    throw new Error('Inline base64 photo data is not allowed. Please upload using secure media storage.');
  }

  if (!/^https?:\/\//i.test(photoUrl)) {
    throw new Error('photoUrl must be an http(s) URL.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(photoUrl);
  } catch (_error) {
    throw new Error('photoUrl must be a valid URL.');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('photoUrl must use http or https.');
  }

  const hostname = normalizeLower(parsedUrl.hostname, 255);
  const trustedHosts = buildTrustedPhotoHostSet(req, { isProduction });
  if (!trustedHosts.has(hostname)) {
    throw new Error('photoUrl host is not trusted. Upload using /api/beauty-ai/selfies/upload.');
  }

  return photoUrl;
};

module.exports = {
  normalizeStorageKey,
  extractStorageKeyFromPhotoUrl,
  normalizeSafePhotoUrl,
};
