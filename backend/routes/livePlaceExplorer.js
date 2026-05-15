const express = require('express');
const { OpenAI } = require('openai');
const logger = require('../utils/logger');

const router = express.Router();

let openai;
try {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} catch (error) {
  logger.warn('LivePlaceExplorer OpenAI initialization failed:', error.message);
  openai = null;
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

    if (!openai) {
      return res.json({
        success: true,
        guide: createFallbackGuide({ placeName, address, weather, liveStatus, question }),
      });
    }

    const prompt = createGuidePrompt({ placeName, address, description, weather, traffic, liveStatus, question });
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_PLACE_GUIDE_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a friendly travel assistant that provides concise, inspiring guidance.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 300,
    });

    const guideText = response?.choices?.[0]?.message?.content?.trim();
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
