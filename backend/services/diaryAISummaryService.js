const { GoogleGenAI } = require('@google/genai');
const logger = require('../utils/logger');

/**
 * Diary AI Summary Service
 * Uses Google Gemini API for:
 * - Diary entry summaries
 * - Mood/sentiment analysis
 * - Wellness recommendations
 * - Writing pattern insights
 */

class DiaryAISummaryService {
  constructor() {
    this.isFreeMode = ['1', 'true', 'yes', 'on'].includes(String(process.env.FREE_MODE || '').toLowerCase());
    this.apiKey = this.isFreeMode ? '' : (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    this.model = process.env.GEMINI_DIARY_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.client = this.apiKey ? new GoogleGenAI({ apiKey: this.apiKey }) : null;

    if (!this.apiKey) {
      logger.warn('GEMINI_API_KEY/GOOGLE_API_KEY not configured - diary AI features disabled');
    }
  }

  isEnabled() {
    return !!this.client;
  }

  async generateEntrySummary(entryContent, entryTitle, metadata = {}) {
    if (!this.isEnabled()) throw new Error('AI features not enabled');

    try {
      const prompt = `Summarize this diary entry in 2-3 sentences. Focus on the main themes and emotions.

Title: ${entryTitle}
Mood: ${metadata.mood || 'Not specified'}
Category: ${metadata.category || 'General'}
Tags: ${(metadata.tags || []).join(', ') || 'None'}

Entry:
${entryContent}

Provide only the summary, no additional commentary.`;

      return await this.callGemini(prompt);
    } catch (error) {
      logger.error('Failed to generate entry summary:', error);
      throw error;
    }
  }

  async analyzeEmotionalPatterns(entries, period = 'month') {
    if (!this.isEnabled()) throw new Error('AI features not enabled');

    try {
      const entriesText = entries
        .map((e) => `${e.date}: [${e.mood}] ${e.title}\n${String(e.content || '').substring(0, 200)}...`)
        .join('\n\n');

      const prompt = `Analyze the emotional patterns in these diary entries from the past ${period}:

${entriesText}

Provide analysis in JSON format with:
{
  "dominantMood": "most common emotion",
  "sentimentScore": -1 to 1,
  "emotionalThemes": ["theme1", "theme2"],
  "stressPatterns": "patterns of stress or anxiety if any",
  "wellnessRecommendations": ["recommendation1", "recommendation2"],
  "improvementAreas": ["area1", "area2"]
}

Respond with only valid JSON.`;

      const response = await this.callGemini(prompt, 1200, true);
      return JSON.parse(response);
    } catch (error) {
      logger.error('Failed to analyze emotional patterns:', error);
      throw error;
    }
  }

  async generateWeeklyDigest(entries) {
    if (!this.isEnabled()) throw new Error('AI features not enabled');

    try {
      const entriesText = entries
        .map((e, i) => `Day ${i + 1}: ${e.title}\n${String(e.content || '').substring(0, 150)}...`)
        .join('\n\n');

      const prompt = `Create a brief weekly digest of these diary entries:

${entriesText}

Provide response in JSON format:
{
  "weeklyHighlight": "one memorable moment or achievement",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "moodTrend": "improving/stable/declining",
  "suggestedReflection": "one thoughtful question for reflection"
}

Respond with only valid JSON.`;

      const response = await this.callGemini(prompt, 1000, true);
      return JSON.parse(response);
    } catch (error) {
      logger.error('Failed to generate weekly digest:', error);
      throw error;
    }
  }

  async getWellnessRecommendations(entries, metadata = {}) {
    if (!this.isEnabled()) throw new Error('AI features not enabled');

    try {
      const entriesText = entries
        .slice(0, 10)
        .map((e) => `${e.mood}: ${e.title}`)
        .join('\n');

      const prompt = `Based on these diary entries and mood history, provide 3-5 personalized wellness recommendations:

Recent entries:
${entriesText}

Current mood trends: ${metadata.moodTrend || 'Not specified'}
Primary concerns: ${metadata.concerns || 'General wellness'}

Provide recommendations in JSON format:
{
  "recommendations": [
    {"title": "...", "description": "...", "priority": "high|medium|low"},
    ...
  ],
  "generalTip": "one general wellness tip"
}

Respond with only valid JSON.`;

      const response = await this.callGemini(prompt, 1000, true);
      return JSON.parse(response);
    } catch (error) {
      logger.error('Failed to get wellness recommendations:', error);
      throw error;
    }
  }

  async extractActionItems(entryContent) {
    if (!this.isEnabled()) throw new Error('AI features not enabled');

    try {
      const prompt = `Extract any action items, todos, or goals mentioned in this diary entry:

${entryContent}

Return as JSON object:
{
  "actionItems": [
    {"item": "...", "deadline": "if mentioned", "priority": "high|medium|low"},
    ...
  ]
}

Respond with only valid JSON. If no action items, return empty array.`;

      const response = await this.callGemini(prompt, 900, true);
      return JSON.parse(response);
    } catch (error) {
      logger.error('Failed to extract action items:', error);
      throw error;
    }
  }

  async callGemini(prompt, maxTokens = 1000, jsonMode = false) {
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          systemInstruction: 'You are a compassionate diary assistant. Provide insightful, supportive analysis of diary entries.',
          maxOutputTokens: maxTokens,
          temperature: 0.7,
          ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      });

      const text = response?.text?.trim()
        || response?.candidates?.[0]?.content?.parts
          ?.map((part) => (typeof part?.text === 'string' ? part.text : ''))
          .join('\n')
          .trim();

      if (!text) {
        throw new Error('Empty Gemini response');
      }
      return text;
    } catch (error) {
      logger.error('Gemini API call failed:', error.message);
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  async checkRateLimit(_userId, _limit = 10, _windowMs = 3600000) {
    return true;
  }
}

module.exports = new DiaryAISummaryService();
