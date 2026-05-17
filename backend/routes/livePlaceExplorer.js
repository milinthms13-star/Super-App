const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const logger = require('../utils/logger');

const router = express.Router();

let googleAI;
try {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  googleAI = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;
} catch (error) {
  logger.warn('LivePlaceExplorer Google AI initialization failed:', error.message);
  googleAI = null;
}

const createGuidePrompt = ({ placeName, address, description, weather, traffic, liveStatus, question }) => {
  const summary = [];
  summary.push(`Place: ${placeName}`);
  summary.push(`Address: ${address}`);
  summary.push(`Description: ${description || 'Public place and tourist destination'}`);
  if (weather) {
    summary.push(`Weather: ${weather}`);
  }
  if (traffic) {
    summary.push(`Traffic: ${traffic}`);
  }
  summary.push(`Live camera status: ${liveStatus || 'Not Live'}`);
  if (question) {
    summary.push(`Question: ${question}`);
  }

  return `You are a friendly travel guide assistant. Use the information below to write a concise, helpful guide for a visitor. Include highlights, what to explore, why it matters, and practical tips. If a question is included, answer it clearly at the end.

${summary.join('\n')}

Guide:`;
};

const createFallbackGuide = ({ placeName, address, weather, liveStatus, question }) => {
  const answers = [`Explore ${placeName} at ${address}.`];
  if (weather) {
    answers.push(`Current weather is ${weather}.`);
  }
  answers.push(`This location is best explored with the map preview, 360° street view and nearby photo gallery.`);
  if (liveStatus === "Not Live") {
    answers.push(`Live camera is not available, but you can still enjoy the street view and AI guide.`);
  }
  if (question) {
    answers.push(`Answer: ${question}`);
  }
  return answers.join(' ');
};

router.post('/guide', async (req, res) => {
  try {
    const {
      placeName,
      address,
      description,
      weather,
      traffic,
      liveStatus,
      question,
    } = req.body || {};

    if (!placeName || !address) {
      return res.status(400).json({ success: false, error: 'placeName and address are required' });
    }

    if (!googleAI) {
      return res.json({
        success: true,
        guide: createFallbackGuide({ placeName, address, weather, liveStatus, question }),
      });
    }

    const prompt = createGuidePrompt({ placeName, address, description, weather, traffic, liveStatus, question });
    const response = await googleAI.models.generateContent({
      model: process.env.GEMINI_PLACE_GUIDE_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are a friendly travel assistant that provides concise, inspiring guidance.',
        maxOutputTokens: 300,
        temperature: 0.6,
      },
    });

    const guideText = response?.text?.trim()
      || response?.candidates?.[0]?.content?.parts
        ?.map((part) => (typeof part?.text === 'string' ? part.text : ''))
        .join('\n')
        .trim();
    return res.json({ success: true, guide: guideText || createFallbackGuide({ placeName, address, weather, liveStatus, question }) });
  } catch (error) {
    logger.error('LivePlaceExplorer guide error:', error);
    return res.json({
      success: true,
      guide: createFallbackGuide(req.body || {}),
    });
  }
});

router.post('/report', async (req, res) => {
  try {
    const { placeId, placeName, issue } = req.body || {};
    logger.info('Live Place Explorer report received', { placeId, placeName, issue });
    return res.json({ success: true, message: 'Report submitted successfully.' });
  } catch (error) {
    logger.error('LivePlaceExplorer report error:', error);
    return res.status(500).json({ success: false, error: 'Unable to submit report.' });
  }
});

module.exports = router;
