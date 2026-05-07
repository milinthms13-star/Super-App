const logger = require('./logger');

/**
 * OpenAI integration for diary summaries
 * Provides smart summaries using GPT-3.5-turbo with fallback to keyword-based
 */

const getOpenAIClient = () => {
  // Lazy load to avoid requiring if not available
  if (process.env.OPENAI_API_KEY) {
    try {
      const { OpenAI } = require('openai');
      return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } catch (error) {
      logger.warn('OpenAI client not available:', error.message);
      return null;
    }
  }
  return null;
};

/**
 * Generate summary using OpenAI GPT-3.5
 * Falls back to keyword-based if API unavailable or fails
 */
const generateOpenAISummary = async (entries, period = 'week') => {
  const client = getOpenAIClient();

  if (!client) {
    logger.debug('OpenAI not configured, using fallback');
    return null; // Will fallback to keyword-based
  }

  try {
    // Prepare entry content for OpenAI
    const entriesText = entries
      .map((e) => {
        const content = (e.content || '').substring(0, 500); // Limit to avoid token bloat
        const mood = e.mood ? `[Mood: ${e.mood}]` : '';
        const date = new Date(e.createdAt).toLocaleDateString();
        return `${date} - ${e.title || 'Untitled'} ${mood}\n${content}`;
      })
      .join('\n\n');

    const prompt = buildOpenAIPrompt(entriesText, period, entries.length);

    logger.debug(`Calling OpenAI for ${period} summary (${entries.length} entries)`);

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a thoughtful diary analyst. Generate insightful summaries that are personal, 
          meaningful, and actionable. Focus on patterns, emotions, and growth. Be warm and encouraging.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800,
      top_p: 0.9
    });

    const summaryText = response.choices[0]?.message?.content || '';
    const tokensUsed = response.usage?.total_tokens || 0;

    // Parse OpenAI response into structured format
    const parsedSummary = parseOpenAISummaryResponse(summaryText);

    return {
      narrative: parsedSummary.narrative || summaryText,
      keyThemes: parsedSummary.themes || extractThemesFromText(summaryText),
      moodSummary: parsedSummary.moodSummary || calculateMoodFromEntries(entries),
      highlights: parsedSummary.highlights || [],
      aiProvider: 'openai',
      tokensUsed,
      success: true
    };
  } catch (error) {
    logger.error('OpenAI API error:', error);
    // Return null to trigger fallback
    return null;
  }
};

/**
 * Build prompt for OpenAI
 */
const buildOpenAIPrompt = (entriesText, period, entryCount) => {
  const periodLabel = {
    week: 'this week',
    month: 'this month',
    quarter: 'this quarter',
    year: 'this year'
  }[period] || period;

  return `Please analyze these ${entryCount} diary entries from ${periodLabel} and provide:

1. A warm, personal summary (3-4 sentences) capturing the essence of this period
2. Key themes or patterns you notice
3. Overall mood or emotional state
4. One encouraging insight or observation

Here are the entries:

${entriesText}

Format your response as:

SUMMARY: [Your summary here]

THEMES: [theme1, theme2, theme3]

MOOD: [Overall mood assessment]

INSIGHT: [Your insight here]`;
};

/**
 * Parse structured response from OpenAI
 */
const parseOpenAISummaryResponse = (responseText) => {
  const parsed = {};

  // Extract SUMMARY
  const summaryMatch = responseText.match(/SUMMARY:\s*(.+?)(?=THEMES:|$)/is);
  if (summaryMatch) {
    parsed.narrative = summaryMatch[1].trim();
  }

  // Extract THEMES
  const themesMatch = responseText.match(/THEMES:\s*(.+?)(?=MOOD:|$)/is);
  if (themesMatch) {
    parsed.themes = themesMatch[1]
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 5);
  }

  // Extract MOOD
  const moodMatch = responseText.match(/MOOD:\s*(.+?)(?=INSIGHT:|$)/is);
  if (moodMatch) {
    parsed.moodSummary = moodMatch[1].trim();
  }

  // Extract INSIGHT
  const insightMatch = responseText.match(/INSIGHT:\s*(.+?)$/is);
  if (insightMatch) {
    parsed.insight = insightMatch[1].trim();
  }

  return parsed;
};

/**
 * Extract themes from OpenAI response if structured parsing fails
 */
const extractThemesFromText = (text) => {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 5);

  const wordFreq = {};
  words.forEach((word) => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
};

/**
 * Calculate mood from entries
 */
const calculateMoodFromEntries = (entries) => {
  if (entries.length === 0) return 'Neutral';

  const moodCounts = {};
  entries.forEach((e) => {
    if (e.mood) {
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    }
  });

  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
  if (!dominantMood) return 'Neutral';

  const [mood, count] = dominantMood;
  const percentage = Math.round((count / entries.length) * 100);

  const moodEmojis = {
    happy: '😊 Happy',
    sad: '😢 Sad',
    peaceful: '😌 Peaceful',
    anxious: '😰 Anxious',
    angry: '😠 Angry',
    grateful: '🙏 Grateful',
    energetic: '⚡ Energetic',
    neutral: '😐 Neutral'
  };

  const label = moodEmojis[mood] || mood;
  return `${label} (${percentage}% of entries)`;
};

/**
 * Generate insights using OpenAI
 */
const generateInsights = async (entries, type = 'general') => {
  const client = getOpenAIClient();

  if (!client) {
    logger.debug('OpenAI not available for insights');
    return null;
  }

  try {
    const entriesText = entries
      .map((e) => `${e.createdAt.toLocaleDateString()}: ${e.content?.substring(0, 200)}`)
      .join('\n');

    const prompts = {
      general: `Based on these diary entries, what are the main themes and patterns? What advice would you give?`,
      wellness: `Analyze these entries for wellness indicators. How is the person doing mentally and emotionally?`,
      goals: `What goals or aspirations can you identify from these entries? Are they on track?`,
      relationships: `What can you learn about this person's relationships from these entries?`,
      growth: `How has this person grown or changed based on these entries?`
    };

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an empathetic diary analyst providing insightful observations.'
        },
        {
          role: 'user',
          content: `${prompts[type] || prompts.general}\n\nEntries:\n${entriesText}`
        }
      ],
      temperature: 0.8,
      max_tokens: 500
    });

    return response.choices[0]?.message?.content || null;
  } catch (error) {
    logger.error('Error generating insights:', error);
    return null;
  }
};

/**
 * Generate suggestions for entries
 */
const generateSuggestions = async (entryContent) => {
  const client = getOpenAIClient();

  if (!client) return null;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a writing coach helping someone improve their diary entries. Provide 2-3 specific suggestions.'
        },
        {
          role: 'user',
          content: `How could I improve this diary entry? What questions could I explore?\n\nEntry:\n${entryContent}`
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    return response.choices[0]?.message?.content || null;
  } catch (error) {
    logger.error('Error generating suggestions:', error);
    return null;
  }
};

/**
 * Estimate tokens for cost calculation
 */
const estimateTokens = (text) => {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
};

/**
 * Calculate cost of API calls
 */
const calculateAPICost = (tokensUsed) => {
  // GPT-3.5-turbo pricing (as of May 2026)
  const inputCost = 0.0015; // per 1K tokens
  const outputCost = 0.002; // per 1K tokens

  // Assuming roughly 60/40 split input/output
  const inputTokens = Math.round(tokensUsed * 0.6);
  const outputTokens = tokensUsed - inputTokens;

  const cost = (inputTokens * inputCost + outputTokens * outputCost) / 1000;
  return cost.toFixed(6);
};

module.exports = {
  generateOpenAISummary,
  generateInsights,
  generateSuggestions,
  estimateTokens,
  calculateAPICost,
  getOpenAIClient
};
