/**
 * Diary AI Recommendations Engine
 * Generates personalized insights and recommendations based on diary analytics.
 */

const logger = require('./logger');

const NEGATIVE_MOODS = new Set(['sad', 'anxious', 'stressed', 'overwhelmed', 'angry']);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function normalizeAnalytics(rawAnalytics = {}, entries = []) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const writingFromRaw = rawAnalytics.writing && typeof rawAnalytics.writing === 'object' ? rawAnalytics.writing : {};
  const moodFromRaw = rawAnalytics.mood && typeof rawAnalytics.mood === 'object' ? rawAnalytics.mood : {};
  const sentimentFromRaw = rawAnalytics.sentiment && typeof rawAnalytics.sentiment === 'object' ? rawAnalytics.sentiment : {};
  const tagsFromRaw = rawAnalytics.tags && typeof rawAnalytics.tags === 'object' ? rawAnalytics.tags : {};

  const totalEntries = toNumber(
    writingFromRaw.entryCount,
    toNumber(rawAnalytics.totalEntries, safeEntries.length)
  );

  const totalWordsFromEntries = safeEntries.reduce((sum, entry) => {
    if (typeof entry?.wordCount === 'number') {
      return sum + entry.wordCount;
    }
    if (typeof entry?.content === 'string') {
      const count = entry.content.trim() ? entry.content.trim().split(/\s+/).length : 0;
      return sum + count;
    }
    return sum;
  }, 0);

  const totalWords = toNumber(
    writingFromRaw.totalWords,
    toNumber(rawAnalytics.totalWords, totalWordsFromEntries)
  );

  const averageWordCount = toNumber(
    writingFromRaw.avgWords,
    toNumber(rawAnalytics.averageWordCount, totalEntries > 0 ? totalWords / totalEntries : 0)
  );

  const moodDistribution =
    rawAnalytics.moodDistribution && typeof rawAnalytics.moodDistribution === 'object'
      ? rawAnalytics.moodDistribution
      : moodFromRaw.moodCounts && typeof moodFromRaw.moodCounts === 'object'
      ? moodFromRaw.moodCounts
      : {};

  const dominantMood =
    moodFromRaw.dominantMood ||
    rawAnalytics.mostCommonMood ||
    Object.entries(moodDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    'neutral';

  const sentimentScores =
    rawAnalytics.sentimentScores && typeof rawAnalytics.sentimentScores === 'object'
      ? rawAnalytics.sentimentScores
      : sentimentFromRaw.sentiment && typeof sentimentFromRaw.sentiment === 'object'
      ? {
          positive: toNumber(sentimentFromRaw.sentiment.positive, 0) / 100,
          negative: toNumber(sentimentFromRaw.sentiment.negative, 0) / 100,
          neutral: toNumber(sentimentFromRaw.sentiment.neutral, 0) / 100,
        }
      : { positive: 0, negative: 0, neutral: 1 };

  const wellnessScore = toNumber(
    rawAnalytics.wellnessScore,
    toNumber(rawAnalytics.wellness?.score, calculateWellnessScore(rawAnalytics))
  );

  const currentStreak = toNumber(writingFromRaw.currentStreak, toNumber(rawAnalytics.currentStreak, 0));
  const longestStreak = toNumber(writingFromRaw.longestStreak, toNumber(rawAnalytics.longestStreak, currentStreak));

  const entriesPerDay = toNumber(
    writingFromRaw.entriesPerDay,
    totalEntries > 0 ? totalEntries / Math.max(7, Math.min(30, totalEntries)) : 0
  );

  return {
    writing: {
      entryCount: totalEntries,
      totalWords,
      avgWords: averageWordCount,
      currentStreak,
      longestStreak,
      entriesPerDay,
      uniqueWords: toNumber(writingFromRaw.uniqueWords, 0),
    },
    wellness: {
      score: clamp(wellnessScore, 0, 100),
    },
    mood: {
      dominantMood,
      moodCounts: moodDistribution,
      uniqueMoods: Object.keys(moodDistribution).length,
    },
    sentiment: {
      sentiment: {
        positive: clamp(toNumber(sentimentScores.positive, 0) * 100, 0, 100),
        negative: clamp(toNumber(sentimentScores.negative, 0) * 100, 0, 100),
        neutral: clamp(toNumber(sentimentScores.neutral, 0) * 100, 0, 100),
      },
    },
    tags: {
      uniqueTags: toNumber(tagsFromRaw.uniqueTags, 0),
      tagFrequency: Array.isArray(tagsFromRaw.tagFrequency) ? tagsFromRaw.tagFrequency : [],
    },
  };
}

function determineSeverity(recommendations) {
  const totalRecommendations = Object.values(recommendations).reduce((sum, value) => {
    return sum + (Array.isArray(value) ? value.length : 0);
  }, 0);

  if (totalRecommendations <= 2) return 'low';
  if (totalRecommendations <= 6) return 'medium';
  return 'high';
}

function generateFocusAreas(analytics, entries) {
  const normalized = normalizeAnalytics(analytics, entries);
  const { writing, wellness, mood } = normalized;
  const focusAreas = [];

  if (writing.entryCount < 10) {
    focusAreas.push({
      title: 'Increase entries consistency',
      description: `You currently have ${writing.entryCount} entries. Add more entries this week to build momentum.`,
      priority: 'high',
      actions: ['Write one short entry daily', 'Set a fixed journaling time'],
      category: 'consistency',
    });
  }

  if (writing.avgWords < 120) {
    focusAreas.push({
      title: 'Increase word depth in entries',
      description: `Average word count is ${Math.round(writing.avgWords)}. Try adding more context and reflection.`,
      priority: 'medium',
      actions: ['Add one reflection paragraph', 'Describe one feeling and one trigger'],
      category: 'writing_depth',
    });
  }

  if (wellness.score < 50) {
    focusAreas.push({
      title: 'Wellness recovery focus',
      description: 'Your wellness score is currently low. Focus on grounding and gratitude journaling.',
      priority: 'high',
      actions: ['Add gratitude lines daily', 'Track one positive event per day'],
      category: 'wellness',
    });
  }

  if (NEGATIVE_MOODS.has(String(mood.dominantMood || '').toLowerCase())) {
    focusAreas.push({
      title: 'Mood pattern awareness',
      description: `Dominant mood is ${mood.dominantMood}. Add entries that identify patterns and coping steps.`,
      priority: 'medium',
      actions: ['Write a trigger-action reflection', 'List 2 calming strategies'],
      category: 'emotion',
    });
  }

  if (focusAreas.length === 0) {
    focusAreas.push({
      title: 'Sustain progress',
      description: 'Your metrics are stable. Continue improving quality and consistency.',
      priority: 'low',
      actions: ['Keep streak active', 'Review weekly insights'],
      category: 'maintenance',
    });
  }

  return focusAreas;
}

function getRecommendationImpact(analytics) {
  const normalized = normalizeAnalytics(analytics, []);
  const score = normalized.wellness.score;
  return clamp(Math.round(100 - score * 0.6), 5, 95);
}

function generateWellnessActions(analytics) {
  const normalized = normalizeAnalytics(analytics, []);
  const impactBase = getRecommendationImpact(analytics);
  const actions = [
    {
      title: 'Daily mood check-in',
      description: 'Capture one emotion and the reason behind it each day.',
      timeframe: 'daily',
      impact: clamp(impactBase + 5, 0, 100),
    },
    {
      title: 'Weekly reflection',
      description: 'Summarize your week and identify one behavior to continue.',
      timeframe: 'weekly',
      impact: clamp(impactBase, 0, 100),
    },
  ];

  if (normalized.wellness.score < 60) {
    actions.push({
      title: 'Reset plan',
      description: 'Plan a short monthly reset entry focused on stress triggers and coping methods.',
      timeframe: 'monthly',
      impact: clamp(impactBase + 10, 0, 100),
    });
  }

  return actions;
}

function generateWritingEnhancements(analytics, entries) {
  const normalized = normalizeAnalytics(analytics, entries);
  const enhancements = [];

  if (normalized.writing.avgWords < 150) {
    enhancements.push({
      title: 'Expand entry detail',
      suggestion: 'Use a simple structure: event, feeling, lesson.',
      benefit: 'Clearer self-reflection and better pattern tracking',
    });
  }

  enhancements.push({
    title: 'Prompt-led writing',
    suggestion: 'Use one guided prompt when you feel blocked.',
    benefit: 'More consistent journaling habit',
  });

  return enhancements;
}

function generateMoodInsights(analytics) {
  const normalized = normalizeAnalytics(analytics, []);
  const insights = [];

  insights.push({
    title: 'Dominant mood trend',
    description: `Your dominant mood is ${normalized.mood.dominantMood}.`,
    insight: 'Tracking triggers can help improve emotional consistency.',
    suggestion: 'Tag entries with trigger keywords.',
  });

  if (normalized.sentiment.sentiment.negative > 40) {
    insights.push({
      title: 'Negative sentiment signal',
      description: 'Recent entries contain elevated negative sentiment.',
      insight: 'This can indicate stress accumulation.',
      suggestion: 'Balance entries with one gratitude item daily.',
    });
  }

  return insights;
}

function generateConsistencyTips(analytics) {
  const normalized = normalizeAnalytics(analytics, []);
  const streak = normalized.writing.currentStreak;

  if (streak >= 30) {
    return [
      {
        message: `Great consistency. An impressive ${streak}-day streak.`,
        nextMilestone: streak + 10,
      },
    ];
  }

  if (streak <= 1) {
    return [
      {
        message: 'Great restart opportunity. Build your streak one day at a time.',
        nextMilestone: 3,
      },
    ];
  }

  return [
    {
      message: `Great progress with your ${streak}-day streak. Keep it going.`,
      nextMilestone: 7,
    },
  ];
}

function generateMotivationBoosts(analytics) {
  const normalized = normalizeAnalytics(analytics, []);
  const boosts = [];
  const totalEntries = normalized.writing.entryCount;

  if (totalEntries >= 100) {
    boosts.push({
      type: 'milestone',
      emoji: '??',
      message: `You reached ${totalEntries} entries. Excellent commitment.`,
    });
  } else if (totalEntries >= 50) {
    boosts.push({
      type: 'milestone',
      emoji: '??',
      message: `You crossed ${totalEntries} entries. Strong momentum.`,
    });
  }

  if (normalized.wellness.score >= 80) {
    boosts.push({
      type: 'wellness',
      emoji: '?',
      message: `Wellness score is ${normalized.wellness.score}. Keep reinforcing these habits.`,
    });
  }

  if (boosts.length === 0) {
    boosts.push({
      type: 'encouragement',
      emoji: '??',
      message: 'Each entry is progress. Keep showing up for yourself.',
    });
  }

  return boosts;
}

function analyzeWritingPatterns(entries) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const total = safeEntries.length;
  const averageLength =
    total === 0
      ? 0
      : safeEntries.reduce((sum, entry) => {
          if (typeof entry?.wordCount === 'number') return sum + entry.wordCount;
          if (typeof entry?.content === 'string') {
            return sum + (entry.content.trim() ? entry.content.trim().split(/\s+/).length : 0);
          }
          return sum;
        }, 0) / total;

  const themes = {};
  safeEntries.forEach((entry) => {
    const mood = String(entry?.mood || 'neutral').toLowerCase();
    themes[mood] = (themes[mood] || 0) + 1;
  });

  return {
    themes,
    averageLength: Math.round(averageLength),
    frequency: total >= 20 ? 'high' : total >= 7 ? 'moderate' : 'low',
  };
}

function calculateWellnessScore(analytics) {
  const totalEntries = toNumber(analytics?.totalEntries, 0);
  const sentimentScores = analytics?.sentimentScores || {};
  const positive = toNumber(sentimentScores.positive, 0);
  const negative = toNumber(sentimentScores.negative, 0);

  const entryFactor = clamp(totalEntries / 2, 0, 35);
  const sentimentFactor = clamp((positive - negative + 1) * 25, 0, 50);
  const streakFactor = clamp(toNumber(analytics?.currentStreak, 0), 0, 15);

  return clamp(Math.round(entryFactor + sentimentFactor + streakFactor), 0, 100);
}

function identifyProgressAreas(analytics) {
  const score = toNumber(analytics?.wellnessScore, calculateWellnessScore(analytics));
  const progressAreas = [];

  if (score >= 65) {
    progressAreas.push({
      title: 'Emotional balance',
      description: 'Your wellness indicators show positive progress.',
    });
  }

  if (toNumber(analytics?.currentStreak, 0) >= 7) {
    progressAreas.push({
      title: 'Consistency growth',
      description: 'Your streak reflects improving writing discipline.',
    });
  }

  if (progressAreas.length === 0) {
    progressAreas.push({
      title: 'Early progress phase',
      description: 'You are building baseline journaling momentum.',
    });
  }

  return progressAreas;
}

function normalizePromptSignature(firstArg, secondArg) {
  if (Array.isArray(firstArg)) {
    return { entries: firstArg, analytics: secondArg || {} };
  }
  return { entries: Array.isArray(secondArg) ? secondArg : [], analytics: firstArg || {} };
}

function generateWritingPrompts(firstArg, secondArg) {
  const { entries, analytics } = normalizePromptSignature(firstArg, secondArg);
  const normalized = normalizeAnalytics(analytics, entries);
  const mood = String(normalized.mood.dominantMood || 'neutral').toLowerCase();

  const promptTexts = [
    'What emotion stood out most today and why?',
    'Which moment from today do you want to remember one year from now?',
    'What challenge are you facing, and what is one next step?',
    'What are three things you are grateful for right now?',
    'What did you learn about yourself today?',
  ];

  if (mood === 'happy') {
    promptTexts.unshift('What contributed most to your happiness today?');
  } else if (mood === 'sad' || mood === 'anxious') {
    promptTexts.unshift('What support or coping step would help you feel better right now?');
  }

  return promptTexts.slice(0, 5).map((text) => ({ text, mood }));
}

function generateRecommendations(analytics, entries, userPreferences = {}) {
  try {
    void userPreferences;

    const recommendations = {
      focusAreas: [],
      wellnessActions: [],
      writingEnhancements: [],
      moodInsights: [],
      consistencyTips: [],
      motivationBoosts: [],
      timestamp: new Date(),
      severity: 'low',
    };

    if (!analytics || !entries) {
      logger.warn('Missing analytics or entries for recommendations');
      return recommendations;
    }

    recommendations.focusAreas = generateFocusAreas(analytics, entries);
    recommendations.wellnessActions = generateWellnessActions(analytics);
    recommendations.writingEnhancements = generateWritingEnhancements(analytics, entries);
    recommendations.moodInsights = generateMoodInsights(analytics);
    recommendations.consistencyTips = generateConsistencyTips(analytics);
    recommendations.motivationBoosts = generateMotivationBoosts(analytics);
    recommendations.severity = determineSeverity(recommendations);

    logger.info(`Generated ${recommendations.focusAreas.length} recommendations`);
    return recommendations;
  } catch (error) {
    logger.error('Error generating recommendations:', error);
    return {
      focusAreas: [],
      wellnessActions: [],
      writingEnhancements: [],
      moodInsights: [],
      consistencyTips: [],
      motivationBoosts: [],
      timestamp: new Date(),
      severity: 'high',
      error: error.message,
    };
  }
}

module.exports = {
  generateRecommendations,
  generateFocusAreas,
  generateWellnessActions,
  generateConsistencyTips,
  generateMotivationBoosts,
  generateWritingPrompts,
  analyzeWritingPatterns,
  calculateWellnessScore,
  identifyProgressAreas,
  getRecommendationImpact,
};
