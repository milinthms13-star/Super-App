const { GoogleGenAI } = require('@google/genai');
const logger = require('./logger');

/**
 * Diary AI integration (Gemini-backed)
 * Note: file/export names are preserved for backward compatibility.
 */

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey });
  } catch (error) {
    logger.warn('Gemini client not available:', error.message);
    return null;
  }
};

const getModelName = () => process.env.GEMINI_DIARY_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const extractGeminiText = (response) => {
  if (!response) return '';
  if (typeof response.text === 'string' && response.text.trim()) {
    return response.text.trim();
  }
  return response?.candidates?.[0]?.content?.parts
    ?.map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim() || '';
};

const extractUsageTokens = (response) => {
  const usage = response?.usageMetadata || {};
  return Number(
    usage.totalTokenCount
    || usage.candidatesTokenCount
    || usage.promptTokenCount
    || 0
  ) || 0;
};

const runGeminiPrompt = async ({
  systemPrompt,
  userPrompt,
  maxTokens = 800,
  temperature = 0.7,
  jsonMode = false,
}) => {
  const client = getGeminiClient();
  if (!client) return null;

  try {
    const response = await client.models.generateContent({
      model: getModelName(),
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature,
        maxOutputTokens: maxTokens,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    });

    return {
      text: extractGeminiText(response),
      tokensUsed: extractUsageTokens(response),
    };
  } catch (error) {
    logger.error('Gemini API error:', error);
    return null;
  }
};

/**
 * Generate summary using Gemini
 * Falls back to keyword-based if API unavailable or fails
 */
const generateGeminiSummary = async (entries, period = 'week') => {
  if (!getGeminiClient()) {
    logger.debug('Gemini not configured, using fallback');
    return null;
  }

  try {
    const entriesText = entries
      .map((e) => {
        const content = (e.content || '').substring(0, 500);
        const mood = e.mood ? `[Mood: ${e.mood}]` : '';
        const date = new Date(e.createdAt).toLocaleDateString();
        return `${date} - ${e.title || 'Untitled'} ${mood}\n${content}`;
      })
      .join('\n\n');

    const prompt = buildGeminiPrompt(entriesText, period, entries.length);
    const result = await runGeminiPrompt({
      systemPrompt: 'You are a thoughtful diary analyst. Generate insightful summaries that are personal, meaningful, and actionable. Focus on patterns, emotions, and growth. Be warm and encouraging.',
      userPrompt: prompt,
      maxTokens: 800,
      temperature: 0.7,
    });

    if (!result || !result.text) {
      return null;
    }

    const parsedSummary = parseGeminiSummaryResponse(result.text);

    return {
      narrative: parsedSummary.narrative || result.text,
      keyThemes: parsedSummary.themes || extractThemesFromText(result.text),
      moodSummary: parsedSummary.moodSummary || calculateMoodFromEntries(entries),
      highlights: parsedSummary.highlights || [],
      aiProvider: 'gemini',
      tokensUsed: result.tokensUsed || 0,
      success: true,
    };
  } catch (error) {
    logger.error('Gemini summary error:', error);
    return null;
  }
};

const buildGeminiPrompt = (entriesText, period, entryCount) => {
  const periodLabel = {
    week: 'this week',
    month: 'this month',
    quarter: 'this quarter',
    year: 'this year',
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

const parseGeminiSummaryResponse = (responseText) => {
  const parsed = {};

  const summaryMatch = responseText.match(/SUMMARY:\s*(.+?)(?=THEMES:|$)/is);
  if (summaryMatch) parsed.narrative = summaryMatch[1].trim();

  const themesMatch = responseText.match(/THEMES:\s*(.+?)(?=MOOD:|$)/is);
  if (themesMatch) {
    parsed.themes = themesMatch[1]
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 5);
  }

  const moodMatch = responseText.match(/MOOD:\s*(.+?)(?=INSIGHT:|$)/is);
  if (moodMatch) parsed.moodSummary = moodMatch[1].trim();

  const insightMatch = responseText.match(/INSIGHT:\s*(.+?)$/is);
  if (insightMatch) parsed.insight = insightMatch[1].trim();

  return parsed;
};

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

const calculateMoodFromEntries = (entries) => {
  if (entries.length === 0) return 'Neutral';

  const moodCounts = {};
  entries.forEach((e) => {
    if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
  });

  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
  if (!dominantMood) return 'Neutral';

  const [mood, count] = dominantMood;
  const percentage = Math.round((count / entries.length) * 100);
  return `${mood} (${percentage}% of entries)`;
};

const generateInsights = async (entries, type = 'general') => {
  if (!getGeminiClient()) return null;

  const entriesText = entries
    .map((e) => `${new Date(e.createdAt).toLocaleDateString()}: ${String(e.content || '').substring(0, 200)}`)
    .join('\n');

  const prompts = {
    general: 'Based on these diary entries, what are the main themes and patterns? What advice would you give?',
    wellness: 'Analyze these entries for wellness indicators. How is the person doing mentally and emotionally?',
    goals: 'What goals or aspirations can you identify from these entries? Are they on track?',
    relationships: 'What can you learn about this person\'s relationships from these entries?',
    growth: 'How has this person grown or changed based on these entries?',
  };

  const result = await runGeminiPrompt({
    systemPrompt: 'You are an empathetic diary analyst providing insightful observations.',
    userPrompt: `${prompts[type] || prompts.general}\n\nEntries:\n${entriesText}`,
    maxTokens: 500,
    temperature: 0.8,
  });

  return result?.text || null;
};

const generateSuggestions = async (entryContent) => {
  if (!getGeminiClient()) return null;

  const result = await runGeminiPrompt({
    systemPrompt: 'You are a writing coach helping someone improve their diary entries. Provide 2-3 specific suggestions.',
    userPrompt: `How could I improve this diary entry? What questions could I explore?\n\nEntry:\n${entryContent}`,
    maxTokens: 300,
    temperature: 0.7,
  });

  return result?.text || null;
};

const estimateTokens = (text) => Math.ceil(String(text || '').length / 4);

const calculateAPICost = (tokensUsed) => {
  const perThousand = 0.0004;
  return ((Number(tokensUsed || 0) / 1000) * perThousand).toFixed(6);
};

// Backward compatibility for existing imports.
const getOpenAIClient = getGeminiClient;
const generateOpenAISummary = generateGeminiSummary;

module.exports = {
  generateGeminiSummary,
  generateOpenAISummary,
  generateInsights,
  generateSuggestions,
  estimateTokens,
  calculateAPICost,
  getGeminiClient,
  getOpenAIClient,
};
