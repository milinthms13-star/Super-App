/**
 * Diary AI Recommendations Engine
 * Generates personalized insights and recommendations based on diary analytics
 * Phase 7 - AI-Powered Recommendations
 */

const logger = require('./logger');

/**
 * Generate AI-powered recommendations based on diary analytics
 * @param {Object} analytics - Complete dashboard analytics
 * @param {Array} entries - Diary entries
 * @param {Object} userPreferences - User preferences for recommendations
 * @returns {Object} Recommendations object with insights and actions
 */
function generateRecommendations(analytics, entries, userPreferences = {}) {
  try {
    const recommendations = {
      focusAreas: [],
      wellnessActions: [],
      writingEnhancements: [],
      moodInsights: [],
      consistencyTips: [],
      motivationBoosts: [],
      timestamp: new Date(),
      severity: 'informational'
    };

    if (!analytics || !entries) {
      logger.warn('Missing analytics or entries for recommendations');
      return recommendations;
    }

    // Generate focus area recommendations
    recommendations.focusAreas = generateFocusAreas(analytics, entries);

    // Generate wellness recommendations
    recommendations.wellnessActions = generateWellnessActions(analytics);

    // Generate writing enhancement tips
    recommendations.writingEnhancements = generateWritingEnhancements(analytics, entries);

    // Generate mood-based insights
    recommendations.moodInsights = generateMoodInsights(analytics);

    // Generate consistency tips
    recommendations.consistencyTips = generateConsistencyTips(analytics);

    // Generate motivation boosts
    recommendations.motivationBoosts = generateMotivationBoosts(analytics);

    // Determine overall severity based on recommendations
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
      severity: 'error',
      error: error.message
    };
  }
}

/**
 * Generate focus area recommendations based on analytics
 * @private
 */
function generateFocusAreas(analytics, entries) {
  const focusAreas = [];

  if (!analytics || !analytics.writing) {
    return focusAreas;
  }

  const { writing, wellness, mood } = analytics;

  // Low entry count
  if (writing.entryCount < 10) {
    focusAreas.push({
      title: 'Establish a Writing Routine',
      description: `You have ${writing.entryCount} entries. Aim for at least 10 entries in the next week to build consistency.`,
      action: 'Set a daily writing reminder',
      priority: 'high',
      category: 'consistency'
    });
  }

  // Low wellness score
  if (wellness && wellness.score < 50) {
    focusAreas.push({
      title: 'Improve Emotional Wellness',
      description: 'Your wellness score is below average. Consider reflecting on what brings you joy.',
      action: 'Write about positive moments from today',
      priority: 'high',
      category: 'wellness'
    });
  }

  // Negative mood patterns
  if (mood && mood.dominantMood && 
      ['sad', 'anxious', 'stressed', 'overwhelmed'].includes(mood.dominantMood.toLowerCase())) {
    focusAreas.push({
      title: 'Address Emotional Patterns',
      description: `You've been feeling ${mood.dominantMood} frequently. Processing emotions through writing can help.`,
      action: 'Write about your feelings without judgment',
      priority: 'high',
      category: 'emotion'
    });
  }

  // Short word count
  if (writing.avgWords < 100) {
    focusAreas.push({
      title: 'Deepen Your Reflections',
      description: 'Your entries average under 100 words. Try writing more expansively to explore your thoughts.',
      action: 'Challenge yourself to write 300+ words today',
      priority: 'medium',
      category: 'writing_depth'
    });
  }

  return focusAreas;
}

/**
 * Generate wellness action recommendations
 * @private
 */
function generateWellnessActions(analytics) {
  const actions = [];

  if (!analytics || !analytics.writing) {
    return actions;
  }

  const { writing, wellness, mood } = analytics;

  // Encourage regular writing
  if (writing.entriesPerDay && writing.entriesPerDay < 0.5) {
    actions.push({
      title: 'Write More Regularly',
      description: 'Consider setting a daily writing habit. Just 10-15 minutes can improve mood.',
      timeframe: 'daily',
      estimatedImpact: 'Increased emotional clarity and stress relief',
      difficulty: 'easy'
    });
  }

  // Promote mood diversity
  if (mood && mood.uniqueMoods && mood.uniqueMoods < 3) {
    actions.push({
      title: 'Explore Mood Diversity',
      description: 'Try to notice and record different moods throughout your day.',
      timeframe: 'daily',
      estimatedImpact: 'Better emotional awareness and resilience',
      difficulty: 'easy'
    });
  }

  // Self-reflection exercises
  if (writing.entryCount >= 5) {
    actions.push({
      title: 'Weekly Reflection Exercise',
      description: 'Once a week, write about your progress, challenges, and growth.',
      timeframe: 'weekly',
      estimatedImpact: 'Enhanced self-understanding and progress tracking',
      difficulty: 'medium'
    });
  }

  // Gratitude practice
  actions.push({
    title: 'Gratitude Practice',
    description: 'Dedicate a section of your entry to three things you\'re grateful for.',
    timeframe: 'daily',
    estimatedImpact: 'Improved mood and resilience',
    difficulty: 'easy'
  });

  return actions;
}

/**
 * Generate writing enhancement recommendations
 * @private
 */
function generateWritingEnhancements(analytics, entries) {
  const enhancements = [];

  if (!analytics || !analytics.writing) {
    return enhancements;
  }

  const { writing, tags } = analytics;

  // Tag usage
  if (tags && tags.uniqueTags < 5) {
    enhancements.push({
      title: 'Add More Tags for Organization',
      description: 'Use tags to categorize your entries (e.g., #gratitude, #goals, #reflection)',
      suggestion: 'Try at least 5 different tags',
      benefit: 'Better organization and easier searching'
    });
  }

  // Word variety
  if (writing.uniqueWords !== undefined && writing.totalWords > 0) {
    const wordVariety = writing.uniqueWords / writing.totalWords;
    if (wordVariety < 0.15) {
      enhancements.push({
        title: 'Expand Your Vocabulary',
        description: 'Your writing uses limited vocabulary. Try exploring new ways to express yourself.',
        suggestion: 'Challenge yourself with descriptive language',
        benefit: 'More expressive and engaging entries'
      });
    }
  }

  // Entry variety
  if (writing.avgWords > 300) {
    enhancements.push({
      title: 'Try Quick Reflections',
      description: 'Mix longer entries with short 5-minute quick writes to capture daily moments.',
      suggestion: 'Write one short entry and one long entry per week',
      benefit: 'Capture more moments without burnout'
    });
  }

  return enhancements;
}

/**
 * Generate mood-based insights
 * @private
 */
function generateMoodInsights(analytics) {
  const insights = [];

  if (!analytics || !analytics.mood) {
    return insights;
  }

  const { mood, sentiment } = analytics;

  // Mood frequency insight
  if (mood.moodCounts) {
    const sortedMoods = Object.entries(mood.moodCounts || {})
      .sort((a, b) => b[1] - a[1]);

    if (sortedMoods.length > 0) {
      const topMood = sortedMoods[0];
      insights.push({
        title: 'Your Dominant Mood',
        description: `You've been feeling ${topMood[0]} the most (${topMood[1]} times).`,
        insight: `This reflects ${topMood[1] > 5 ? 'a strong pattern' : 'a notable trend'} in your emotional state.`,
        suggestion: 'Consider what factors influence this mood and how to nurture or process it.'
      });
    }
  }

  // Sentiment trend insight
  if (sentiment && sentiment.sentiment) {
    const positive = sentiment.sentiment.positive || 0;
    const negative = sentiment.sentiment.negative || 0;
    const neutral = sentiment.sentiment.neutral || 0;

    if (positive > 50) {
      insights.push({
        title: 'Overall Positive Tone',
        description: 'Your recent entries have a positive outlook.',
        insight: 'This suggests you\'re experiencing contentment or working through challenges constructively.',
        suggestion: 'Keep channeling this positivity into your daily life.'
      });
    } else if (negative > 50) {
      insights.push({
        title: 'Challenging Period',
        description: 'Your entries reflect a predominantly negative sentiment.',
        insight: 'You may be navigating a difficult time. Remember that processing emotions through writing is healing.',
        suggestion: 'Consider talking to someone you trust or seeking professional support if needed.'
      });
    }
  }

  return insights;
}

/**
 * Generate consistency tips
 * @private
 */
function generateConsistencyTips(analytics) {
  const tips = [];

  if (!analytics || !analytics.writing) {
    return tips;
  }

  const { writing } = analytics;

  // Streak awareness
  if (writing.currentStreak !== undefined) {
    if (writing.currentStreak === 0) {
      tips.push({
        title: 'Start a New Streak Today',
        description: 'Your current writing streak is at zero. Today is a perfect day to begin again.',
        tip: 'Even 5 minutes counts. Start with one entry today.',
        motivation: 'Every streak begins with a single entry.'
      });
    } else if (writing.currentStreak > 1 && writing.currentStreak < 7) {
      tips.push({
        title: 'Keep Your Momentum',
        description: `You have a ${writing.currentStreak}-day streak! You're building consistency.`,
        tip: 'Push for 7 days this week to establish the habit.',
        motivation: 'Great start! You\'re creating a powerful habit.'
      });
    } else if (writing.currentStreak >= 7 && writing.currentStreak < 30) {
      tips.push({
        title: 'Building Strong Habits',
        description: `Amazing! You have a ${writing.currentStreak}-day streak.`,
        tip: 'Aim for 30 days to cement this as a daily habit.',
        motivation: 'You\'re demonstrating real commitment to self-reflection.'
      });
    } else if (writing.currentStreak >= 30) {
      tips.push({
        title: 'Exceptional Dedication',
        description: `Outstanding! ${writing.currentStreak} days of consistent writing!`,
        tip: 'Continue this momentum. You\'ve built an incredible habit.',
        motivation: 'You\'re an inspiration. Your consistency is transformative.'
      });
    }
  }

  // Longest streak insight
  if (writing.longestStreak && writing.longestStreak > writing.currentStreak) {
    tips.push({
      title: 'You\'ve Done It Before',
      description: `Your longest streak was ${writing.longestStreak} days. You can reach that again!`,
      tip: 'Use that as your target and gradually build back up.',
      motivation: 'Prove to yourself that consistency is possible.'
    });
  }

  return tips;
}

/**
 * Generate motivation boosts
 * @private
 */
function generateMotivationBoosts(analytics) {
  const boosts = [];

  if (!analytics || !analytics.writing) {
    return boosts;
  }

  const { writing, wellness } = analytics;

  // Celebrate milestones
  if (writing.entryCount === 10) {
    boosts.push({
      title: '🎉 10 Entries Milestone!',
      message: 'You\'ve created 10 entries! That\'s 10 moments of self-reflection and growth.',
      celebration: 'You\'re building a meaningful record of your thoughts and feelings.'
    });
  } else if (writing.entryCount === 50) {
    boosts.push({
      title: '🌟 50 Entries Milestone!',
      message: 'Incredible! 50 entries represent months of consistent self-reflection.',
      celebration: 'You\'ve created a powerful journal of your personal growth.'
    });
  } else if (writing.entryCount === 100) {
    boosts.push({
      title: '👑 100 Entries Landmark!',
      message: 'You\'ve reached 100 entries! That\'s a year\'s worth of daily reflection.',
      celebration: 'This is a testament to your commitment to understanding yourself.'
    });
  }

  // Wellness achievement
  if (wellness && wellness.score > 75) {
    boosts.push({
      title: '✨ High Wellness Score!',
      message: `Your wellness score is ${wellness.score}/100. You're in a great place emotionally!`,
      celebration: 'Keep leveraging journaling to maintain this positive state.'
    });
  }

  // Total words achievement
  if (writing.totalWords > 5000) {
    boosts.push({
      title: '📝 5,000+ Words Written!',
      message: `You've written over ${Math.round(writing.totalWords / 1000)}k words. That's the length of a short book!`,
      celebration: 'Your voice and thoughts matter. Keep expressing yourself.'
    });
  }

  // General motivational message
  if (boosts.length === 0) {
    boosts.push({
      title: '💪 Keep Going',
      message: 'Every entry you write is a step toward greater self-awareness and peace.',
      celebration: 'The fact that you\'re journaling means you care about your growth.'
    });
  }

  return boosts;
}

/**
 * Determine overall severity/importance level of recommendations
 * @private
 */
function determineSeverity(recommendations) {
  const totalRecommendations = Object.values(recommendations).reduce((sum, arr) => {
    return sum + (Array.isArray(arr) ? arr.length : 0);
  }, 0);

  if (totalRecommendations === 0) return 'none';
  if (totalRecommendations <= 2) return 'low';
  if (totalRecommendations <= 4) return 'medium';
  if (totalRecommendations <= 6) return 'high';
  return 'critical';
}

/**
 * Generate personalized writing prompts
 * @param {Array} entries - User's diary entries
 * @param {Object} analytics - User's analytics
 * @returns {Array} Array of personalized writing prompts
 */
function generateWritingPrompts(entries, analytics) {
  const prompts = [];

  if (!entries || entries.length === 0) {
    prompts.push(
      'What was the most interesting thing that happened to you today?',
      'How are you feeling right now, and why?',
      'What are you grateful for today?',
      'What challenge did you overcome today?',
      'What made you smile today?'
    );
    return prompts;
  }

  // Mood-based prompts
  if (analytics && analytics.mood && analytics.mood.dominantMood) {
    const mood = analytics.mood.dominantMood.toLowerCase();
    
    const moodPrompts = {
      happy: [
        'What brought you the most joy today?',
        'How can you share this happiness with others?',
        'What small things are you appreciating right now?'
      ],
      sad: [
        'What\'s weighing on your heart right now?',
        'How have you overcome similar challenges before?',
        'What would bring you comfort right now?'
      ],
      anxious: [
        'What\'s causing your anxiety? Break it down into smaller pieces.',
        'What can you control in this situation?',
        'What would help you feel calmer?'
      ],
      peaceful: [
        'What is bringing you peace in this moment?',
        'How can you hold onto this peaceful feeling?',
        'What creates a sense of calm for you?'
      ],
      excited: [
        'What are you looking forward to?',
        'What new opportunities are you considering?',
        'How can you channel this energy productively?'
      ]
    };

    if (moodPrompts[mood]) {
      prompts.push(...moodPrompts[mood]);
    }
  }

  // Tag-based prompts
  if (analytics && analytics.tags && analytics.tags.tagFrequency) {
    const tags = analytics.tags.tagFrequency.slice(0, 3);
    tags.forEach(tag => {
      prompts.push(`What else do you want to explore about ${tag.tag}?`);
    });
  }

  // Streak-based prompts
  if (analytics && analytics.writing && analytics.writing.currentStreak) {
    if (analytics.writing.currentStreak >= 7) {
      prompts.push('How has journaling changed you over the past week?');
    }
  }

  // Generic reflective prompts
  prompts.push(
    'What are your thoughts on a recent conversation?',
    'What did you learn about yourself today?',
    'What would your future self want you to know?'
  );

  return prompts.slice(0, 5); // Return top 5 prompts
}

module.exports = {
  generateRecommendations,
  generateWritingPrompts
};
