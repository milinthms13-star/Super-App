const logger = require('./logger');

/**
 * Generate AI summary of diary entries using simple NLP
 * This version uses pattern-based summarization (no external API)
 * Ready for Google Gemini API integration if needed
 */

const generateSummary = async (entries, period = 'week') => {
  if (!entries || entries.length === 0) {
    return {
      period,
      summary: 'No entries to summarize.',
      keyThemes: [],
      moodSummary: 'N/A',
      highlights: [],
      generatedAt: new Date()
    };
  }

  try {
    // Extract key information
    const keyThemes = extractKeyThemes(entries);
    const moodSummary = generateMoodSummary(entries);
    const highlights = extractHighlights(entries);
    const summaryText = generateNarrativeSummary(entries, keyThemes, period);

    return {
      period,
      summary: summaryText,
      keyThemes,
      moodSummary,
      highlights,
      generatedAt: new Date(),
      entryCount: entries.length
    };
  } catch (error) {
    logger.error('Error generating summary:', error);
    return {
      period,
      summary: 'Could not generate summary.',
      keyThemes: [],
      moodSummary: 'Error',
      highlights: [],
      generatedAt: new Date(),
      error: error.message
    };
  }
};

/**
 * Extract key themes from entries using keyword frequency
 */
const extractKeyThemes = (entries) => {
  const themes = {};
  const categoryCount = {};

  entries.forEach((entry) => {
    // Count categories
    if (entry.category) {
      categoryCount[entry.category] = (categoryCount[entry.category] || 0) + 1;
    }

    // Extract common words (exclude stop words)
    const content = `${entry.title || ''} ${entry.content || ''}`.toLowerCase();
    const words = content
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .map((w) => w.replace(/[^\w]/g, ''));

    words.forEach((word) => {
      if (!isStopWord(word)) {
        themes[word] = (themes[word] || 0) + 1;
      }
    });
  });

  // Get top themes
  const topThemes = Object.entries(themes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme, count]) => theme);

  return topThemes;
};

/**
 * Generate mood summary string
 */
const generateMoodSummary = (entries) => {
  if (!entries || entries.length === 0) return 'No data';

  const moodCounts = {};
  entries.forEach((entry) => {
    if (entry.mood) {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    }
  });

  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
  if (!dominantMood) return 'Mixed emotions';

  const moodEmojis = {
    happy: '😊 Happy',
    sad: '😢 Sad',
    peaceful: '😌 Peaceful',
    anxious: '😰 Anxious',
    angry: '😠 Angry',
    neutral: '😐 Neutral',
    energetic: '⚡ Energetic',
    grateful: '🙏 Grateful'
  };

  const [mood, count] = dominantMood;
  const moodLabel = moodEmojis[mood] || mood;
  const percentage = Math.round((count / entries.length) * 100);

  return `Mostly ${moodLabel} (${percentage}% of entries)`;
};

/**
 * Extract highlights - notable entries or moments
 */
const extractHighlights = (entries) => {
  const highlights = [];

  entries.forEach((entry) => {
    // Entries with long content (probably important)
    const content = entry.content || '';
    const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;

    if (wordCount > 300) {
      highlights.push({
        date: entry.createdAt,
        title: entry.title || 'Untitled',
        wordCount,
        type: 'detailed'
      });
    }

    // Entries with specific moods
    if (entry.mood === 'grateful' || entry.mood === 'happy') {
      highlights.push({
        date: entry.createdAt,
        title: entry.title || 'Untitled',
        mood: entry.mood,
        type: 'positive'
      });
    }

    // Entries with multiple tags (richly tagged entries)
    if (entry.tags && entry.tags.length > 3) {
      highlights.push({
        date: entry.createdAt,
        title: entry.title || 'Untitled',
        tagCount: entry.tags.length,
        type: 'multi-topic'
      });
    }
  });

  // Remove duplicates and limit to top 5
  const uniqueHighlights = Array.from(
    new Map(highlights.map((h) => [h.date.toISOString(), h])).values()
  );

  return uniqueHighlights.slice(0, 5);
};

/**
 * Generate narrative summary of entries
 */
const generateNarrativeSummary = (entries, themes, period) => {
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const totalEntries = entries.length;
  const totalWords = entries.reduce((sum, e) => {
    const content = (e.content || '').replace(/<[^>]*>/g, '');
    return sum + content.split(/\s+/).filter((w) => w.length > 0).length;
  }, 0);

  const avgWords = Math.round(totalWords / totalEntries);
  const dateRange = getDateRange(entries);

  let summary = '';

  if (period === 'week') {
    summary = `During this week, you wrote ${totalEntries} entries totaling approximately ${totalWords} words (average ${avgWords} words per entry). `;
  } else if (period === 'month') {
    summary = `This month, you documented ${totalEntries} moments, capturing ${totalWords} words of reflection (averaging ${avgWords} words per entry). `;
  } else {
    summary = `You've written ${totalEntries} entries containing roughly ${totalWords} words (${avgWords} words on average). `;
  }

  if (themes.length > 0) {
    summary += `Key themes in your writing include: ${themes.slice(0, 3).join(', ')}. `;
  }

  // Add mood insight
  const moodStats = getMoodStats(entries);
  if (moodStats.dominantMood) {
    summary += `You experienced mostly ${moodStats.dominantMood} emotions throughout this period. `;
  }

  // Add personal insight
  if (sortedEntries.length > 0 && sortedEntries[0].title) {
    summary += `Your most recent entry "${sortedEntries[0].title}" reflects your current state of mind.`;
  } else {
    summary += `Continue journaling to track your progress and growth.`;
  }

  return summary;
};

/**
 * Get mood statistics for entries
 */
const getMoodStats = (entries) => {
  const moodCounts = {};
  entries.forEach((entry) => {
    if (entry.mood) {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    }
  });

  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
  const moodLabels = {
    happy: 'joyful',
    sad: 'reflective',
    peaceful: 'calm',
    anxious: 'concerned',
    angry: 'frustrated',
    grateful: 'appreciative',
    energetic: 'energetic',
    neutral: 'neutral'
  };

  return {
    dominantMood: dominantMood ? moodLabels[dominantMood[0]] : null,
    moodDistribution: moodCounts
  };
};

/**
 * Get date range for entries
 */
const getDateRange = (entries) => {
  if (entries.length === 0) return null;

  const dates = entries.map((e) => new Date(e.createdAt));
  const earliest = new Date(Math.min(...dates));
  const latest = new Date(Math.max(...dates));

  return {
    start: earliest,
    end: latest,
    daysSpanned: Math.floor((latest - earliest) / (1000 * 60 * 60 * 24))
  };
};

/**
 * Generate action items from entry content
 */
const extractActionItems = (entries) => {
  const actionItems = [];
  const actionKeywords = [
    'need to',
    'should',
    'must',
    'plan to',
    'will',
    'want to',
    'goal',
    'task',
    'todo',
    'try to'
  ];

  entries.forEach((entry) => {
    const content = (entry.content || '').toLowerCase();
    const sentences = content.split(/[.!?]/);

    sentences.forEach((sentence) => {
      actionKeywords.forEach((keyword) => {
        if (sentence.includes(keyword)) {
          const cleaned = sentence.trim().substring(0, 100);
          if (cleaned.length > 10) {
            actionItems.push({
              item: cleaned,
              entryDate: entry.createdAt,
              entryTitle: entry.title
            });
          }
        }
      });
    });
  });

  // Deduplicate and limit
  const unique = Array.from(
    new Map(actionItems.map((a) => [a.item, a])).values()
  );

  return unique.slice(0, 5);
};

/**
 * Stop words to exclude from theme extraction
 */
const isStopWord = (word) => {
  const stopWords = new Set([
    'the',
    'and',
    'that',
    'this',
    'from',
    'with',
    'have',
    'been',
    'were',
    'about',
    'what',
    'which',
    'their',
    'would',
    'could',
    'should',
    'other',
    'after',
    'while',
    'before',
    'time',
    'entry',
    'wrote',
    'feel',
    'felt',
    'think',
    'today',
    'think',
    'mood',
    'diary'
  ]);

  return stopWords.has(word) || word.length < 4;
};

/**
 * Format summary for display (markdown)
 */
const formatSummaryMarkdown = (summary) => {
  let markdown = `# ${summary.period.charAt(0).toUpperCase() + summary.period.slice(1)} Summary\n\n`;

  markdown += `**${summary.summary}**\n\n`;

  if (summary.keyThemes && summary.keyThemes.length > 0) {
    markdown += `## Key Themes\n${summary.keyThemes.map((t) => `- ${t}`).join('\n')}\n\n`;
  }

  markdown += `## Mood\n${summary.moodSummary}\n\n`;

  if (summary.highlights && summary.highlights.length > 0) {
    markdown += `## Highlights\n`;
    summary.highlights.forEach((h) => {
      markdown += `- **${h.title}** (${new Date(h.date).toLocaleDateString()})\n`;
    });
    markdown += '\n';
  }

  markdown += `*Generated: ${new Date(summary.generatedAt).toLocaleString()}*\n`;

  return markdown;
};

module.exports = {
  generateSummary,
  extractActionItems,
  extractKeyThemes,
  generateMoodSummary,
  extractHighlights,
  formatSummaryMarkdown
};
