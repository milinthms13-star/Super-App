const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const { OpenAI } = require('openai');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY
});

// POST /api/voice-input/transcribe - Speech to text
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const transcription = await openai.audio.transcriptions.create({
      file: new File([req.file.buffer], 'voice-input.m4a', { type: 'audio/m4a' }),
      model: 'whisper-1',
      language: 'en', // Detect or specify
      response_format: 'json',
      prompt: 'Transcribe accurately, preserve intent for forms/search/chat.'
    });

    res.json({
      success: true,
      text: transcription.text,
      language: transcription.language,
      confidence: transcription.segments?.[0]?.avg_logprob || 0.95
    });
  } catch (error) {
    logger.error('Voice transcription error:', error);
    res.status(500).json({ error: 'Transcription failed', details: error.message });
  }
});

// POST /api/voice-input/process - Process voice for specific field/context
router.post('/process', authenticate, async (req, res) => {
  try {
    const { audio, fieldType, context, module } = req.body; // fieldType: 'title', 'description', 'price', etc.

    // Step 1: Transcribe
    let text = audio;
    if (Buffer.isBuffer(audio)) {
      // Handle uploaded audio
      const transcription = await openai.audio.transcriptions.create({
        file: new File([audio], 'voice.m4a', { type: 'audio/m4a' }),
        model: 'whisper-1'
      });
      text = transcription.text;
    }

    // Step 2: Context-aware processing with GPT
    const processed = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `You are a voice input assistant for ${module} forms. Extract structured data from transcribed speech for field: ${fieldType}.

Context: ${context || 'general form'}
Field types: title, description, price (numbers only), category, location, contact.

Respond JSON only:
{
  "value": "extracted text/number",
  "confidence": 0.95,
  "entities": {"category": "...", "price": 50000},
  "suggestions": ["option1", "option2"]
}`
      }, {
        role: 'user',
        content: text
      }]
    });

    const parsed = JSON.parse(processed.choices[0].message.content);
    res.json({ success: true, ...parsed });
  } catch (error) {
    logger.error('Voice processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

// POST /api/voice-input/search - Voice search across modules
router.post('/search', authenticate, async (req, res) => {
  try {
    const { audio } = req.body;

    // Transcribe
    let query = audio;
    if (Buffer.isBuffer(audio)) {
      const transcription = await openai.audio.transcriptions.create({
        file: new File([audio], 'voice.m4a', { type: 'audio/m4a' }),
        model: 'whisper-1'
      });
      query = transcription.text;
    }

    // Search across modules
    const searchResults = {
      products: await fetch(`/api/products/search?q=${encodeURIComponent(query)}`),
      realestate: await fetch(`/api/realestate?location=${query}`),
      classifieds: await fetch(`/api/classifieds/search?q=${query}`)
    };

    res.json({ success: true, query, results: searchResults });
  } catch (error) {
    res.status(500).json({ error: 'Voice search failed' });
  }
});

module.exports = router;

