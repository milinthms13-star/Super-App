const logger = require('./logger');

/**
 * Analyze sentiment of diary entry content
 * Returns positivity score, emotional tone, and sentiment label
 */
const analyzeSentiment = (content) => {
  if (!content || content.trim().length === 0) {
    return {
      positivityScore: 50,
      sentimentLabel: 'neutral',
      emotionalTone: 'neutral',
      keyEmotions: [],
    };
  }

  // Strip HTML
  let cleanContent = content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .toLowerCase();

  // Positive keywords and their weights
  const positiveKeywords = {
    happy: 2,
    joy: 2,
    excited: 2,
    amazing: 2,
    wonderful: 2,
    excellent: 2,
    great: 1,
    good: 1,
    love: 2,
    proud: 1,
    blessed: 2,
    grateful: 1,
    thankful: 1,
    beautiful: 1,
    perfect: 1,
    awesome: 2,
    fantastic: 2,
    peaceful: 1,
    calm: 1,
    relaxed: 1,
    succeed: 1,
    victory: 2,
    achieve: 1,
  };

  // Negative keywords
  const negativeKeywords = {
    sad: 2,
    unhappy: 2,
    depressed: 2,
    anxious: 2,
    worried: 1,
    stressed: 2,
    angry: 2,
    frustrated: 1,
    disappointed: 1,
    hurt: 1,
    scared: 2,
    afraid: 2,
    terrible: 2,
    awful: 2,
    horrible: 2,
    bad: 1,
    poor: 1,
    fail: 2,
    loss: 1,
    lonely: 2,
    exhausted: 1,
    tired: 1,
  };

  let positiveScore = 0;
  let negativeScore = 0;
  const detectedEmotions = new Set();

  // Count keyword occurrences
  Object.entries(positiveKeywords).forEach(([keyword, weight]) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = cleanContent.match(regex);
    if (matches) {
      positiveScore += matches.length * weight;
      detectedEmotions.add(keyword);
    }
  });

  Object.entries(negativeKeywords).forEach(([keyword, weight]) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = cleanContent.match(regex);
    if (matches) {
      negativeScore += matches.length * weight;
      detectedEmotions.add(keyword);
    }
  });

  // Calculate positivity score (0-100)
  const totalScore = positiveScore + negativeScore;
  let positivityScore = 50;

  if (totalScore > 0) {
    positivityScore = Math.round((positiveScore / totalScore) * 100);
  }

  // Determine sentiment label
  let sentimentLabel = 'neutral';
  if (positivityScore >= 70) {
    sentimentLabel = 'very_positive';
  } else if (positivityScore >= 55) {
    sentimentLabel = 'positive';
  } else if (positivityScore <= 30) {
    sentimentLabel = 'very_negative';
  } else if (positivityScore <= 45) {
    sentimentLabel = 'negative';
  }

  // Determine emotional tone
  const emotionalWords = {
    calm: ['peaceful', 'calm', 'relaxed', 'serene'],
    energetic: ['excited', 'amazing', 'fantastic', 'awesome'],
    melancholic: ['sad', 'lonely', 'blue', 'down'],
    anxious: ['worried', 'anxious', 'stressed', 'nervous'],
    grateful: ['grateful', 'blessed', 'thankful', 'appreciative'],
  };

  let emotionalTone = 'neutral';
  for (const [tone, words] of Object.entries(emotionalWords)) {
    const count = words.filter((w) => cleanContent.includes(w)).length;
    if (count > 0) {
      emotionalTone = tone;
      break;
    }
  }

  return {
    positivityScore,
    sentimentLabel,
    emotionalTone,
    keyEmotions: Array.from(detectedEmotions).slice(0, 5),
  };
};

/**
 * Extract tags from entry content using keyword analysis
 */
const suggestTags = (content, title = '', existingTags = []) => {
  if (!content || content.trim().length === 0) {
    return existingTags || [];
  }

  // Combine title and content
  const fullText = `${title || ''} ${content}`
    .replace(/<[^>]*>/g, '')
    .toLowerCase();

  // Category keywords
  const tagCategories = {
    work: [
      'work',
      'job',
      'office',
      'meeting',
      'project',
      'deadline',
      'boss',
      'colleague',
      'career',
      'promotion',
    ],
    health: [
      'health',
      'sick',
      'doctor',
      'exercise',
      'sleep',
      'diet',
      'medicine',
      'hospital',
      'therapy',
      'wellness',
    ],
    relationships: [
      'friend',
      'family',
      'love',
      'relationship',
      'marriage',
      'partner',
      'breakup',
      'date',
      'conflict',
      'support',
    ],
    travel: [
      'travel',
      'trip',
      'vacation',
      'destination',
      'journey',
      'adventure',
      'flight',
      'hotel',
      'explore',
    ],
    personal_growth: [
      'learning',
      'growth',
      'development',
      'improvement',
      'goal',
      'achieve',
      'overcome',
      'progress',
      'challenge',
    ],
    finance: [
      'money',
      'finance',
      'savings',
      'investment',
      'budget',
      'income',
      'expense',
      'debt',
      'purchase',
    ],
    creativity: [
      'art',
      'music',
      'write',
      'create',
      'design',
      'inspire',
      'imagine',
      'dream',
      'express',
    ],
    nature: [
      'nature',
      'outdoor',
      'park',
      'forest',
      'mountain',
      'beach',
      'weather',
      'garden',
      'animals',
    ],
    food: [
      'food',
      'eat',
      'cook',
      'recipe',
      'restaurant',
      'meal',
      'delicious',
      'taste',
      'drink',
    ],
  };

  const suggestedTags = [];

  // Find matching tags
  Object.entries(tagCategories).forEach(([tag, keywords]) => {
    const matchCount = keywords.filter((kw) => fullText.includes(kw)).length;
    if (matchCount > 0) {
      suggestedTags.push({
        tag,
        confidence: Math.min(100, matchCount * 15),
      });
    }
  });

  // Sort by confidence
  suggestedTags.sort((a, b) => b.confidence - a.confidence);

  // Return top 5 tags
  const newTags = suggestedTags
    .slice(0, 5)
    .map((t) => t.tag);

  // Combine with existing tags (if provided)
  const allTags = [...new Set([...(existingTags || []), ...newTags])];

  return allTags.slice(0, 10); // Max 10 tags
};

module.exports = {
  analyzeSentiment,
  suggestTags,
};
