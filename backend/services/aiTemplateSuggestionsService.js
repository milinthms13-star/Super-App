/**
 * AI Template Suggestions Service
 * Generate template suggestions using Google Gemini API
 * Analyze reminder content and suggest professionally formatted templates
 */

const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');
const ReminderTemplate = require('../models/ReminderTemplate');
const logger = require('../utils/logger');

class AITemplateSuggestionsService {
  constructor() {
    this.aiProvider = process.env.AI_TEMPLATE_PROVIDER || 'gemini';
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.CLAUDE_API_KEY;
    this.geminiModel = process.env.GEMINI_TEMPLATE_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.googleAI = null;

    if (this.aiProvider === 'gemini' && this.apiKey && !process.env.CLAUDE_API_KEY) {
      try {
        this.googleAI = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (_error) {
        this.googleAI = null;
      }
    } else if (this.aiProvider === 'gemini' && this.apiKey) {
      try {
        this.googleAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY });
      } catch (_error) {
        this.googleAI = null;
      }
    }

    this.apiEndpoint = 'https://api.anthropic.com/v1/messages';
  }

  async generateSuggestions(userId, reminderData) {
    try {
      if (!this.apiKey) {
        throw new Error('AI API key not configured. Set GEMINI_API_KEY/GOOGLE_API_KEY.');
      }

      const prompt = this._buildPrompt(reminderData);
      const suggestions = await this._callAIApi(prompt);
      const parsedSuggestions = this._parseSuggestions(suggestions, reminderData);

      return parsedSuggestions;
    } catch (error) {
      logger.error('Error generating template suggestions:', error);
      throw error;
    }
  }

  _buildPrompt(reminderData) {
    return `Generate 3 diverse reminder notification templates for the following reminder:

Title: ${reminderData.title}
Description: ${reminderData.description || 'N/A'}
Category: ${reminderData.category}
Priority: ${reminderData.priority}

For each template, provide suggestions in JSON format with:
1. A "professional" formal template (use for work/business)
2. A "casual" friendly template (use for personal)
3. An "urgent" impactful template (use for high priority)

Each template should include variations for:
- Email subject and body (HTML)
- SMS/WhatsApp message (short, concise)
- Telegram message (Markdown formatted)
- Push notification title and body

Use these available variables: {title}, {description}, {dueDate}, {dueTime}, {category}, {priority}, {dayOfWeek}

Return ONLY valid JSON array of 3 template objects. Each template object should have:
{
  "name": "Template Name",
  "style": "professional|casual|urgent",
  "description": "Brief description",
  "email": { "subject": "...", "htmlContent": "...", "textContent": "..." },
  "sms": { "content": "..." },
  "whatsapp": { "content": "..." },
  "telegram": { "content": "..." },
  "push": { "title": "...", "body": "..." }
}`;
  }

  async _callAIApi(prompt) {
    try {
      if (this.aiProvider === 'claude') {
        const response = await axios.post(
          this.apiEndpoint,
          {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2000,
            messages: [{ role: 'user', content: prompt }],
          },
          {
            headers: {
              'x-api-key': process.env.CLAUDE_API_KEY,
              'anthropic-version': '2023-06-01',
            },
            timeout: 30000,
          }
        );
        return response.data.content[0].text;
      }

      if (!this.googleAI) {
        throw new Error('Gemini client unavailable');
      }

      const response = await this.googleAI.models.generateContent({
        model: this.geminiModel,
        contents: prompt,
        config: {
          systemInstruction: 'You are a professional notification template writer. Always return valid JSON.',
          temperature: 0.7,
          maxOutputTokens: 2000,
          responseMimeType: 'application/json',
        },
      });

      return response?.text
        || response?.candidates?.[0]?.content?.parts
          ?.map((part) => (typeof part?.text === 'string' ? part.text : ''))
          .join('\n')
          .trim();
    } catch (error) {
      logger.error('Error calling AI API:', error.message);
      throw new Error(`AI API error: ${error.message}`);
    }
  }

  _parseSuggestions(aiResponse, reminderData) {
    try {
      let jsonStr = aiResponse;
      const jsonMatch = String(aiResponse || '').match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1];

      const suggestions = JSON.parse(jsonStr);
      if (!Array.isArray(suggestions)) {
        throw new Error('AI response is not an array');
      }

      return suggestions.map((suggestion, index) => ({
        id: `ai-suggestion-${Date.now()}-${index}`,
        name: suggestion.name || `AI Suggestion ${index + 1}`,
        style: suggestion.style || 'professional',
        description: suggestion.description || '',
        emailTemplate: suggestion.email || { subject: '', htmlContent: '', textContent: '' },
        smsTemplate: suggestion.sms || { content: '' },
        whatsappTemplate: suggestion.whatsapp || { content: '' },
        telegramTemplate: suggestion.telegram || { content: '' },
        pushTemplate: suggestion.push || { title: '', body: '' },
        generatedFor: {
          title: reminderData.title,
          category: reminderData.category,
          priority: reminderData.priority,
        },
        createdAt: new Date(),
        approved: false,
      }));
    } catch (error) {
      logger.error('Error parsing AI suggestions:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  async acceptSuggestion(userId, suggestion, customName) {
    try {
      const template = new ReminderTemplate({
        userId,
        name: customName || suggestion.name,
        description: suggestion.description || suggestion.style + ' template',
        isDefault: false,
        emailTemplate: suggestion.emailTemplate,
        smsTemplate: suggestion.smsTemplate,
        whatsappTemplate: suggestion.whatsappTemplate,
        telegramTemplate: suggestion.telegramTemplate,
        pushTemplate: suggestion.pushTemplate,
        usageCount: 0,
        lastUsed: null,
      });

      await template.save();

      logger.info(`Accepted AI suggestion and saved as template: ${template._id}`);

      return {
        success: true,
        templateId: template._id,
        templateName: template.name,
      };
    } catch (error) {
      logger.error('Error accepting suggestion:', error);
      throw error;
    }
  }

  async enhanceTemplate(userId, templateId) {
    try {
      const template = await ReminderTemplate.findOne({
        _id: templateId,
        userId,
      });

      if (!template) throw new Error('Template not found');

      const prompt = `Improve and create variations of this reminder template:

Name: ${template.name}
Description: ${template.description}

Email Subject: ${template.emailTemplate?.subject}
Email Body: ${template.emailTemplate?.htmlContent}

SMS Content: ${template.smsTemplate?.content}

Suggest 2-3 variations of this template with improvements in:
- Clarity and conciseness
- Emoji and formatting
- Call-to-action
- Mobile optimization

Return as JSON array with same structure but with "improvement": "description of what was improved"`;

      const aiResponse = await this._callAIApi(prompt);
      const variations = this._parseSuggestions(aiResponse, {
        title: template.name,
        category: 'enhancement',
        priority: 'high',
      });

      return {
        success: true,
        originalTemplate: {
          id: template._id,
          name: template.name,
        },
        variations,
      };
    } catch (error) {
      logger.error('Error enhancing template:', error);
      throw error;
    }
  }

  async generateStyleSpecific(userId, reminderData, preferredStyle) {
    try {
      const validStyles = ['professional', 'casual', 'urgent'];
      if (!validStyles.includes(preferredStyle)) {
        throw new Error('Invalid style');
      }

      const prompt = `Generate a single reminder notification template in a "${preferredStyle}" style:

Title: ${reminderData.title}
Description: ${reminderData.description || 'N/A'}
Category: ${reminderData.category}
Priority: ${reminderData.priority}

Create templates for all channels with a "${preferredStyle}" tone.
Return as JSON object with email, sms, whatsapp, telegram, push objects.`;

      const aiResponse = await this._callAIApi(prompt);
      const suggestions = this._parseSuggestions(aiResponse, reminderData);

      return suggestions[0] || suggestions;
    } catch (error) {
      logger.error('Error generating style-specific suggestions:', error);
      throw error;
    }
  }

  async batchGenerateSuggestions(userId, reminderList) {
    try {
      const results = [];

      for (const reminder of reminderList) {
        try {
          const suggestions = await this.generateSuggestions(userId, reminder);
          results.push({
            reminderId: reminder._id,
            title: reminder.title,
            suggestions,
          });
        } catch (error) {
          logger.warn(`Failed to generate suggestions for reminder ${reminder._id}:`, error.message);
          results.push({
            reminderId: reminder._id,
            title: reminder.title,
            error: error.message,
          });
        }
      }

      return {
        success: true,
        processed: reminderList.length,
        results,
      };
    } catch (error) {
      logger.error('Error in batch generation:', error);
      throw error;
    }
  }
}

module.exports = new AITemplateSuggestionsService();
