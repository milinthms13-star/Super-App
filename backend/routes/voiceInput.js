const express = require('express');
const multer = require('multer');
const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');
const speech = require('@google-cloud/speech');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const isFreeMode = ['1', 'true', 'yes', 'on'].includes(String(process.env.FREE_MODE || '').toLowerCase());
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const geminiModel = process.env.GEMINI_VOICE_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const speechLanguageCode = process.env.GOOGLE_SPEECH_LANGUAGE || 'en-US';

let googleAI = null;
let speechClient = null;

try {
  googleAI = (!isFreeMode && geminiApiKey) ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;
} catch (error) {
  logger.warn('Google AI client not initialized for voice input:', error.message);
  googleAI = null;
}

try {
  speechClient = isFreeMode ? null : new speech.SpeechClient();
} catch (error) {
  logger.warn('Google Speech client not initialized:', error.message);
  speechClient = null;
}

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

const inferSpeechEncoding = (mimeType = '') => {
  const normalized = String(mimeType || '').toLowerCase();
  if (normalized.includes('webm')) return 'WEBM_OPUS';
  if (normalized.includes('ogg')) return 'OGG_OPUS';
  if (normalized.includes('wav')) return 'LINEAR16';
  if (normalized.includes('flac')) return 'FLAC';
  if (normalized.includes('mp3') || normalized.includes('mpeg')) return 'MP3';
  return 'ENCODING_UNSPECIFIED';
};

const flattenGeminiText = (response) => {
  const direct = response?.text;
  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }
  const text = response?.candidates?.[0]?.content?.parts
    ?.map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
  return text || '';
};

const parseJsonFromText = (text, fallback = {}) => {
  try {
    return JSON.parse(text);
  } catch (_error) {
    const fencedMatch = String(text || '').match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch) {
      try {
        return JSON.parse(fencedMatch[1]);
      } catch (_err) {
        return fallback;
      }
    }
    return fallback;
  }
};

const transcribeAudioBuffer = async (buffer, mimeType = 'audio/webm', languageCode = speechLanguageCode) => {
  if (!speechClient || !buffer?.length) return null;

  const [response] = await speechClient.recognize({
    audio: {
      content: buffer.toString('base64'),
    },
    config: {
      encoding: inferSpeechEncoding(mimeType),
      languageCode: languageCode || speechLanguageCode,
      enableAutomaticPunctuation: true,
      model: process.env.GOOGLE_SPEECH_MODEL || 'latest_long',
    },
  });

  const alternatives = response?.results?.flatMap((item) => item.alternatives || []) || [];
  const transcript = alternatives.map((item) => item?.transcript || '').join(' ').trim();
  const confidence = alternatives.length
    ? alternatives.reduce((sum, item) => sum + Number(item?.confidence || 0), 0) / alternatives.length
    : 0;

  return {
    text: transcript,
    confidence: Number(confidence.toFixed(3)),
    language: languageCode || speechLanguageCode,
  };
};

const buildVoiceFieldFallback = (text, fieldType) => {
  const raw = String(text || '').trim();
  if (!raw) {
    return {
      value: '',
      confidence: 0.3,
      entities: {},
      suggestions: ['Please repeat clearly with details.'],
    };
  }

  if (String(fieldType || '').toLowerCase() === 'price') {
    const numberMatch = raw.replace(/[, ]+/g, '').match(/\d+(\.\d+)?/);
    const value = numberMatch ? numberMatch[0] : '';
    return {
      value,
      confidence: value ? 0.7 : 0.45,
      entities: value ? { price: Number(value) } : {},
      suggestions: value ? [] : ['Say only the amount, for example "45000".'],
    };
  }

  return {
    value: raw,
    confidence: 0.75,
    entities: {},
    suggestions: [],
  };
};

// POST /api/voice-input/transcribe - Speech to text
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const transcription = await transcribeAudioBuffer(req.file.buffer, req.file.mimetype);
    if (!transcription || !transcription.text) {
      return res.status(503).json({ error: 'Speech service unavailable or no transcript generated' });
    }

    return res.json({
      success: true,
      text: transcription.text,
      language: transcription.language,
      confidence: transcription.confidence || 0.9,
    });
  } catch (error) {
    logger.error('Voice transcription error:', error);
    return res.status(500).json({ error: 'Transcription failed', details: error.message });
  }
});

// POST /api/voice-input/process - Process voice for specific field/context
router.post('/process', authenticate, async (req, res) => {
  try {
    const { audio, fieldType, context, module, mimeType, languageCode } = req.body || {};

    let text = String(audio || '').trim();
    if (Buffer.isBuffer(audio)) {
      const transcription = await transcribeAudioBuffer(audio, mimeType || 'audio/webm', languageCode || speechLanguageCode);
      text = transcription?.text || '';
    }

    if (!text) {
      return res.status(400).json({ error: 'No voice text provided for processing' });
    }

    if (!googleAI) {
      return res.json({ success: true, ...buildVoiceFieldFallback(text, fieldType) });
    }

    const response = await googleAI.models.generateContent({
      model: geminiModel,
      contents: `You are a voice input assistant for ${module || 'app'} forms.
Extract structured data from this transcribed speech for field: ${fieldType || 'general'}.

Context: ${context || 'general form'}
Field types: title, description, price (numbers only), category, location, contact.
Return strict JSON:
{
  "value": "extracted text/number",
  "confidence": 0.95,
  "entities": {"category": "...", "price": 50000},
  "suggestions": ["option1", "option2"]
}

Speech text:
${text}`,
      config: {
        temperature: 0.2,
        maxOutputTokens: 350,
        responseMimeType: 'application/json',
      },
    });

    const parsed = parseJsonFromText(flattenGeminiText(response), buildVoiceFieldFallback(text, fieldType));
    return res.json({ success: true, ...parsed });
  } catch (error) {
    logger.error('Voice processing error:', error);
    return res.status(500).json({ error: 'Processing failed' });
  }
});

// POST /api/voice-input/search - Voice search across modules
router.post('/search', authenticate, async (req, res) => {
  try {
    const { audio, mimeType, languageCode } = req.body || {};

    let query = String(audio || '').trim();
    if (Buffer.isBuffer(audio)) {
      const transcription = await transcribeAudioBuffer(audio, mimeType || 'audio/webm', languageCode || speechLanguageCode);
      query = transcription?.text || '';
    }

    if (!query) {
      return res.status(400).json({ error: 'No query provided' });
    }

    const [productsRes, realestateRes, classifiedsRes] = await Promise.allSettled([
      axios.get(`${API_BASE_URL}/api/products/search?q=${encodeURIComponent(query)}`).catch(() => ({ data: { products: [] } })),
      axios.get(`${API_BASE_URL}/api/realestate?location=${encodeURIComponent(query)}`).catch(() => ({ data: { data: [] } })),
      axios.get(`${API_BASE_URL}/api/app-data/classifieds/search?q=${encodeURIComponent(query)}`).catch(() => ({ data: { data: { listings: [] } } })),
    ]);

    const searchResults = {
      products: productsRes.status === 'fulfilled' ? productsRes.value.data : { products: [] },
      realestate: realestateRes.status === 'fulfilled' ? realestateRes.value.data : { data: [] },
      classifieds: classifiedsRes.status === 'fulfilled' ? classifiedsRes.value.data : { data: { listings: [] } },
    };

    return res.json({ success: true, query, results: searchResults });
  } catch (error) {
    logger.error('Voice search failed:', error);
    return res.status(500).json({ error: 'Voice search failed' });
  }
});

module.exports = router;
