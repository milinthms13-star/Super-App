const axios = require('axios');
const logger = require('../config/logger');

/**
 * Diary AI Summary Service
 * Uses OpenAI API for:
 * - Diary entry summaries
 * - Mood/sentiment analysis
 * - Wellness recommendations
 * - Writing pattern insights
 */

class DiaryAISummaryService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    this.model = 'gpt-4-turbo-preview'; // or gpt-3.5-turbo for cost optimization

    if (!this.apiKey) {
      logger.warn('OPENAI_API_KEY not configured - AI features disabled');
    }
  }

  /**
   * Check if AI features are enabled
   */
  isEnabled() {
    return !!this.apiKey;
  }

  /**
   * Generate summary for single entry
   * @param {string} entryContent - Full entry text
   * @param {string} entryTitle - Entry title
   * @param {object} metadata - { mood, category, tags }
   * @returns {Promise<string>} - Summary text
   */
  async generateEntrySummary(entryContent, entryTitle, metadata = {}) {
    if (!this.isEnabled()) {
      throw new Error('AI features not enabled');
    }

    try {
      const prompt = `Summarize this diary entry in 2-3 sentences. Focus on the main themes and emotions.

Title: ${entryTitle}
Mood: ${metadata.mood || 'Not specified'}
Category: ${metadata.category || 'General'}
Tags: ${(metadata.tags || []).join(', ') || 'None'}

Entry:
${entryContent}

Provide only the summary, no additional commentary.`;

      const response = await this.callOpenAI(prompt);
      return response;
    } catch (error) {
      logger.error('Failed to generate entry summary:', error);
      throw error;
    }
  }

  /**
   * Analyze mood and sentiment from entries
   * @param {array} entries - Array of { title, content, mood, date }
   * @param {string} period - 'week' | 'month' | 'year'
   * @returns {Promise<object>} - { dominantMood, sentimentScore, themes, recommendations }
   */
  async analyzeEmotionalPatterns(entries, period = 'month') {
    if (!this.isEnabled()) {
      throw new Error('AI features not enabled');
    }

    try {
      const entriesText = entries
        .map(e => `${e.date}: [${e.mood}] ${e.title}\n${e.content.substring(0, 200)}...`)
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

      const response = await this.callOpenAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      logger.error('Failed to analyze emotional patterns:', error);
      throw error;
    }
  }

  /**
   * Get weekly digest summary
   * @param {array} entries - Array of entries for the week
   * @returns {Promise<object>} - { weeklyHighlight, keyThemes, moodTrend, suggestion }
   */
  async generateWeeklyDigest(entries) {
    if (!this.isEnabled()) {
      throw new Error('AI features not enabled');
    }

    try {
      const entriesText = entries
        .map((e, i) => `Day ${i + 1}: ${e.title}\n${e.content.substring(0, 150)}...`)
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

      const response = await this.callOpenAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      logger.error('Failed to generate weekly digest:', error);
      throw error;
    }
  }

  /**
   * Get personalized wellness recommendations
   * @param {array} entries - Recent entries
   * @param {object} metadata - User mood history
   * @returns {Promise<array>} - Array of recommendations
   */
  async getWellnessRecommendations(entries, metadata = {}) {
    if (!this.isEnabled()) {
      throw new Error('AI features not enabled');
    }

    try {
      const entriesText = entries
        .slice(0, 10) // Last 10 entries
        .map(e => `${e.mood}: ${e.title}`)
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

      const response = await this.callOpenAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      logger.error('Failed to get wellness recommendations:', error);
      throw error;
    }
  }

  /**
   * Extract action items from entry
   * @param {string} entryContent - Entry text
   * @returns {Promise<array>} - Array of action items
   */
  async extractActionItems(entryContent) {
    if (!this.isEnabled()) {
      throw new Error('AI features not enabled');
    }

    try {
      const prompt = `Extract any action items, todos, or goals mentioned in this diary entry:

${entryContent}

Return as JSON array:
{
  "actionItems": [
    {"item": "...", "deadline": "if mentioned", "priority": "high|medium|low"},
    ...
  ]
}

Respond with only valid JSON. If no action items, return empty array.`;

      const response = await this.callOpenAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      logger.error('Failed to extract action items:', error);
      throw error;
    }
  }

  /**
   * Generic OpenAI API call
   * @param {string} prompt - User prompt
   * @param {number} maxTokens - Max response tokens
   * @returns {Promise<string>} - AI response
   */
  async callOpenAI(prompt, maxTokens = 1000) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You are a compassionate diary assistant. Provide insightful, supportive analysis of diary entries.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      logger.error('OpenAI API call failed:', error.response?.data || error.message);
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  /**
   * Rate limit check (basic implementation)
   * Could be extended with Redis for distributed rate limiting
   */
  async checkRateLimit(userId, limit = 10, windowMs = 3600000) {
    // Simple implementation - in production use Redis
    const key = `ai-summary-${userId}`;
    // TODO: Implement with Redis
    return true;
  }
}

module.exports = new DiaryAISummaryService();
