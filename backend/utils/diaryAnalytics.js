const logger = require('./logger');

const getWellnessLevel = (score = 0) => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Moderate';
  if (score > 0) return 'Low';
  return 'Neutral';
};

/**
 * Calculate comprehensive writing statistics
 */
const calculateWritingStats = (entries) => {
  if (!entries || entries.length === 0) {
    return {
      totalEntries: 0,
      totalWords: 0,
      totalCharacters: 0,
      avgWordsPerEntry: 0,
      avgCharsPerEntry: 0,
      longestEntry: 0,
      shortestEntry: 0,
      entriesPerDay: {},
      entriesPerMonth: {},
    };
  }

  let totalWords = 0;
  let totalCharacters = 0;
  let longestEntry = 0;
  let shortestEntry = Infinity;
  const entriesPerDay = {};
  const entriesPerMonth = {};

  entries.forEach((entry) => {
    // Strip HTML tags and count words
    const content = (entry.content || '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();

    const words = content.split(/\s+/).filter((w) => w.length > 0).length;
    const chars = content.length;

    totalWords += words;
    totalCharacters += chars;
    longestEntry = Math.max(longestEntry, words);
    shortestEntry = Math.min(shortestEntry, words);

    // Group by day
    const date = new Date(entry.createdAt);
    const dayKey = date.toISOString().split('T')[0];
    entriesPerDay[dayKey] = (entriesPerDay[dayKey] || 0) + 1;

    // Group by month
    const monthKey = date.toISOString().slice(0, 7);
    entriesPerMonth[monthKey] = (entriesPerMonth[monthKey] || 0) + 1;
  });

  return {
    totalEntries: entries.length,
    totalWords,
    totalCharacters,
    avgWordsPerEntry: Math.round(totalWords / entries.length),
    avgCharsPerEntry: Math.round(totalCharacters / entries.length),
    longestEntry: longestEntry === 0 ? 0 : longestEntry,
    shortestEntry: shortestEntry === Infinity ? 0 : shortestEntry,
    entriesPerDay,
    entriesPerMonth,
  };
};

/**
 * Calculate streak statistics
 */
const calculateStreakStats = (entries) => {
  if (!entries || entries.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalDaysWritten: 0,
      lastEntryDate: null,
    };
  }

  // Get unique dates written
  const datesWritten = new Set();
  entries.forEach((entry) => {
    const date = new Date(entry.createdAt).toISOString().split('T')[0];
    datesWritten.add(date);
  });

  const sortedDates = Array.from(datesWritten).sort().reverse();

  if (sortedDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalDaysWritten: 0,
      lastEntryDate: null,
    };
  }

  // Calculate current streak
  let currentStreak = 0;
  const today = new Date().toISOString().split('T')[0];
  let checkDate = today;

  for (const date of sortedDates) {
    if (date === checkDate) {
      currentStreak++;
      checkDate = new Date(new Date(checkDate).getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
    } else {
      break;
    }
  }

  // Calculate longest streak
  let longestStreak = 1;
  let tempStreak = 1;

  for (let i = 0; i < sortedDates.length - 1; i++) {
    const current = new Date(sortedDates[i]);
    const next = new Date(sortedDates[i + 1]);
    const diffDays = (current - next) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  return {
    currentStreak,
    longestStreak,
    totalDaysWritten: sortedDates.length,
    lastEntryDate: new Date(sortedDates[0]),
  };
};

/**
 * Calculate mood statistics and trends
 */
const calculateMoodStats = (entries, daysBack = 30) => {
  if (!entries || entries.length === 0) {
    return {
      moodDistribution: {},
      moodTrend: [],
      dominantMood: null,
      moodVariability: 0,
    };
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const recentEntries = entries.filter(
    (e) => new Date(e.createdAt) >= cutoffDate
  );

  if (recentEntries.length === 0) {
    return {
      moodDistribution: {},
      moodTrend: [],
      dominantMood: null,
      moodVariability: 0,
    };
  }

  // Count moods
  const moodDistribution = {};
  const moodTrend = [];

  recentEntries.forEach((entry) => {
    const mood = entry.mood || 'unknown';
    moodDistribution[mood] = (moodDistribution[mood] || 0) + 1;

    moodTrend.push({
      date: new Date(entry.createdAt).toISOString().split('T')[0],
      mood,
    });
  });

  // Find dominant mood
  const dominantMood = Object.keys(moodDistribution).reduce((a, b) =>
    moodDistribution[a] > moodDistribution[b] ? a : b
  );

  // Calculate mood variability (standard deviation)
  const moodValues = Object.values(moodDistribution);
  const mean = moodValues.reduce((a, b) => a + b) / moodValues.length;
  const variance =
    moodValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
    moodValues.length;
  const moodVariability = Math.round(Math.sqrt(variance) * 100) / 100;

  return {
    moodDistribution,
    moodTrend,
    dominantMood,
    moodVariability,
  };
};

/**
 * Calculate comprehensive wellness score
 */
const calculateWellnessScore = (entries, daysBack = 30) => {
  if (!entries || entries.length === 0) {
    return {
      overallScore: 0,
      writingFrequency: 0,
      emotionalStability: 0,
      contentLength: 0,
      consistencyScore: 0,
    };
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const recentEntries = entries.filter(
    (e) => new Date(e.createdAt) >= cutoffDate
  );

  // Writing frequency score (entries per week, max 100)
  const daysInRange = Math.min(daysBack, 30);
  const weeksInRange = daysInRange / 7;
  const entriesPerWeek = recentEntries.length / weeksInRange;
  const writingFrequency = Math.min(100, Math.round(entriesPerWeek * 15));

  // Content length score (avg words, target 200-400 words)
  const stats = calculateWritingStats(recentEntries);
  const avgWords = stats.avgWordsPerEntry;
  const contentLength =
    avgWords < 200
      ? Math.round((avgWords / 200) * 100)
      : avgWords < 400
        ? 100
        : Math.max(0, 100 - (avgWords - 400) / 10);

  // Emotional stability (mood consistency, lower variability = higher score)
  const moodStats = calculateMoodStats(recentEntries, daysBack);
  const emotionalStability = Math.max(
    0,
    100 - moodStats.moodVariability * 20
  );

  // Consistency score (streak-based)
  const streakStats = calculateStreakStats(recentEntries);
  const consistencyScore = Math.min(
    100,
    streakStats.currentStreak * 10 + (streakStats.totalDaysWritten * 2) / daysInRange
  );

  // Overall score (weighted average)
  const overallScore = Math.round(
    writingFrequency * 0.2 +
      contentLength * 0.2 +
      emotionalStability * 0.3 +
      consistencyScore * 0.3
  );

  return {
    overallScore: Math.min(100, Math.max(0, overallScore)),
    writingFrequency: Math.min(100, writingFrequency),
    emotionalStability: Math.min(100, emotionalStability),
    contentLength: Math.min(100, Math.max(0, contentLength)),
    consistencyScore: Math.min(100, consistencyScore),
  };
};

/**
 * Get tag frequency analytics
 */
const calculateTagAnalytics = (entries, limit = 10) => {
  if (!entries || entries.length === 0) {
    return {
      uniqueTags: 0,
      tagFrequency: [],
      tagTrend: {},
    };
  }

  const tagFrequency = {};
  const tagTrend = {};

  entries.forEach((entry) => {
    if (entry.tags && Array.isArray(entry.tags)) {
      entry.tags.forEach((tag) => {
        tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;

        const date = new Date(entry.createdAt).toISOString().split('T')[0];
        if (!tagTrend[tag]) {
          tagTrend[tag] = {};
        }
        tagTrend[tag][date] = (tagTrend[tag][date] || 0) + 1;
      });
    }
  });

  const sorted = Object.entries(tagFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, frequency]) => ({
      tag,
      frequency,
      trend: tagTrend[tag],
    }));

  return {
    uniqueTags: Object.keys(tagFrequency).length,
    tagFrequency: sorted,
    totalTagUsages: Object.values(tagFrequency).reduce((a, b) => a + b, 0),
  };
};

/**
 * Get sentiment trend analysis
 */
const calculateSentimentTrend = (entries, groupBy = 'week') => {
  if (!entries || entries.length === 0) {
    return [];
  }

  const grouped = {};

  entries.forEach((entry) => {
    let groupKey;
    const date = new Date(entry.createdAt);

    if (groupBy === 'day') {
      groupKey = date.toISOString().split('T')[0];
    } else if (groupBy === 'week') {
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      groupKey = startOfWeek.toISOString().split('T')[0];
    } else if (groupBy === 'month') {
      groupKey = date.toISOString().slice(0, 7);
    }

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        positive: 0,
        neutral: 0,
        negative: 0,
        total: 0,
      };
    }

    const sentiment = entry.sentiment || 'neutral';
    grouped[groupKey][sentiment]++;
    grouped[groupKey].total++;
  });

  return Object.entries(grouped)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([period, data]) => ({
      period,
      positive: Math.round((data.positive / data.total) * 100),
      neutral: Math.round((data.neutral / data.total) * 100),
      negative: Math.round((data.negative / data.total) * 100),
      entries: data.total,
    }));
};

/**
 * Get daily writing heatmap data
 */
const calculateWritingHeatmap = (entries, monthsBack = 6) => {
  if (!entries || entries.length === 0) {
    return {};
  }

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);

  const heatmapData = {};

  entries
    .filter((e) => new Date(e.createdAt) >= cutoffDate)
    .forEach((entry) => {
      const date = new Date(entry.createdAt).toISOString().split('T')[0];
      heatmapData[date] = (heatmapData[date] || 0) + 1;
    });

  return heatmapData;
};

/**
 * Get word count analytics
 */
const calculateWordCountAnalytics = (entries) => {
  if (!entries || entries.length === 0) {
    return {
      totalWords: 0,
      avgWords: 0,
      minWords: 0,
      maxWords: 0,
      median: 0,
      wordDistribution: {},
    };
  }

  const wordCounts = entries
    .map((e) => {
      const content = (e.content || '')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();
      return content.split(/\s+/).filter((w) => w.length > 0).length;
    })
    .sort((a, b) => a - b);

  const totalWords = wordCounts.reduce((a, b) => a + b, 0);
  const avgWords = Math.round(totalWords / wordCounts.length);
  const medianWords =
    wordCounts.length % 2 === 0
      ? Math.round(
          (wordCounts[wordCounts.length / 2 - 1] + wordCounts[wordCounts.length / 2]) / 2
        )
      : wordCounts[Math.floor(wordCounts.length / 2)];

  // Distribution by ranges
  const distribution = {
    veryShort: wordCounts.filter((w) => w < 100).length,
    short: wordCounts.filter((w) => w >= 100 && w < 300).length,
    medium: wordCounts.filter((w) => w >= 300 && w < 600).length,
    long: wordCounts.filter((w) => w >= 600 && w < 1000).length,
    veryLong: wordCounts.filter((w) => w >= 1000).length,
  };

  return {
    totalWords,
    avgWords,
    minWords: Math.min(...wordCounts),
    maxWords: Math.max(...wordCounts),
    median: medianWords,
    wordDistribution: distribution,
  };
};

/**
 * Get comprehensive analytics dashboard data
 */
const getDashboardAnalytics = async (entries) => {
  if (!entries || entries.length === 0) {
    return {
      writing: {
        totalEntries: 0,
        entryCount: 0,
        totalWords: 0,
        avgWordsPerEntry: 0,
        avgWords: 0,
        entriesPerDay: {},
        entriesPerDayAverage: 0,
        wordsPerDay: 0,
      },
      streak: {
        currentStreak: 0,
        longestStreak: 0,
        totalDaysWritten: 0,
        lastEntryDate: null,
      },
      mood: {
        moodDistribution: {},
        moodCounts: {},
        dominantMood: null,
        moodVariability: 0,
      },
      wellness: {
        overallScore: 0,
        score: 0,
        level: 'Neutral',
        writingFrequency: 0,
        emotionalStability: 0,
        contentLength: 0,
        consistencyScore: 0,
      },
      tags: {},
      sentiment: [],
      words: {
        totalWords: 0,
        avgWords: 0,
        minWords: 0,
        maxWords: 0,
        median: 0,
        wordDistribution: {
          veryShort: 0,
          short: 0,
          medium: 0,
          long: 0,
          veryLong: 0,
        },
      },
      heatmap: {},
    };
  }

  const writing = calculateWritingStats(entries);
  const streak = calculateStreakStats(entries);
  const mood = calculateMoodStats(entries);
  const wellness = calculateWellnessScore(entries);
  const tags = calculateTagAnalytics(entries);
  const sentiment = calculateSentimentTrend(entries);
  const words = calculateWordCountAnalytics(entries);
  const heatmap = calculateWritingHeatmap(entries);
  const activeWritingDays = Object.keys(writing.entriesPerDay || {}).length;
  const entriesPerDayAverage =
    activeWritingDays > 0
      ? Math.round((writing.totalEntries / activeWritingDays) * 10) / 10
      : 0;
  const wordsPerDay =
    activeWritingDays > 0
      ? Math.round((writing.totalWords / activeWritingDays) * 10) / 10
      : 0;

  return {
    writing: {
      ...writing,
      entryCount: writing.totalEntries,
      avgWords: writing.avgWordsPerEntry,
      avgChars: writing.avgCharsPerEntry,
      entriesPerDayAverage,
      wordsPerDay,
    },
    streak,
    mood: {
      ...mood,
      moodCounts: mood.moodDistribution,
    },
    wellness: {
      ...wellness,
      score: wellness.overallScore,
      level: getWellnessLevel(wellness.overallScore),
    },
    tags,
    sentiment,
    words,
    heatmap,
  };
};

module.exports = {
  calculateWritingStats,
  calculateStreakStats,
  calculateMoodStats,
  calculateWellnessScore,
  calculateTagAnalytics,
  calculateSentimentTrend,
  calculateWritingHeatmap,
  calculateWordCountAnalytics,
  getDashboardAnalytics,
};
