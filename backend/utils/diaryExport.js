/**
 * Diary Export Utilities
 * Export diary entries and analytics to PDF and CSV formats
 * Phase 7 - Export to PDF/CSV
 */

const logger = require('./logger');

/**
 * Generate CSV export string from diary entries
 * @param {Array} entries - Diary entries to export
 * @param {Object} options - Export options
 * @returns {string} CSV formatted string
 */
function generateCSV(entries, options = {}) {
  try {
    if (!entries || entries.length === 0) {
      return 'No entries to export';
    }

    const includeAnalytics = options.includeAnalytics !== false;
    const delimiter = options.delimiter || ',';
    const lineBreak = '\n';

    // Headers
    const headers = [
      'Date',
      'Title',
      'Content',
      'Mood',
      'Category',
      'Tags',
      'Words',
      'Draft'
    ];

    if (includeAnalytics) {
      headers.push('Sentiment', 'Confidence');
    }

    // Create CSV header row
    let csv = headers.map(h => `"${h}"`).join(delimiter) + lineBreak;

    // Add data rows
    entries.forEach(entry => {
      const row = [
        formatDate(entry.createdAt),
        `"${escapeCSV(entry.title || '')}"`,
        `"${escapeCSV(entry.content || '')}"`,
        entry.mood || '',
        entry.category || '',
        `"${(entry.tags || []).join('; ')}"`,
        entry.wordCount || calculateWordCount(entry.content),
        entry.isDraft ? 'Yes' : 'No'
      ];

      if (includeAnalytics) {
        row.push(entry.sentiment || 'N/A');
        row.push(entry.sentimentConfidence ? (entry.sentimentConfidence * 100).toFixed(2) + '%' : 'N/A');
      }

      csv += row.join(delimiter) + lineBreak;
    });

    logger.info(`Generated CSV with ${entries.length} entries`);
    return csv;
  } catch (error) {
    logger.error('Error generating CSV:', error);
    throw error;
  }
}

/**
 * Generate analytics CSV export
 * @param {Object} analytics - Dashboard analytics
 * @returns {string} CSV formatted analytics
 */
function generateAnalyticsCSV(analytics) {
  try {
    if (!analytics) {
      return 'No analytics data to export';
    }

    let csv = 'Metric,Value,Details' + '\n';

    // Writing statistics
    if (analytics.writing) {
      csv += `Total Entries,${analytics.writing.entryCount},` + '\n';
      csv += `Total Words,${analytics.writing.totalWords},` + '\n';
      csv += `Average Words per Entry,${analytics.writing.avgWords?.toFixed(0) || 0},` + '\n';
      csv += `Current Streak,${analytics.writing.currentStreak || 0} days,` + '\n';
      csv += `Longest Streak,${analytics.writing.longestStreak || 0} days,` + '\n';
    }

    // Mood statistics
    if (analytics.mood) {
      csv += `Dominant Mood,${analytics.mood.dominantMood || 'N/A'},` + '\n';
      
      // Add mood distribution
      if (analytics.mood.moodCounts) {
        Object.entries(analytics.mood.moodCounts).forEach(([mood, count]) => {
          csv += `Mood: ${mood},${count},` + '\n';
        });
      }
    }

    // Tags
    if (analytics.tags) {
      csv += `Unique Tags,${analytics.tags.uniqueTags || 0},` + '\n';
      csv += `Total Tag Uses,${analytics.tags.totalTagUsages || 0},` + '\n';
    }

    // Wellness
    if (analytics.wellness) {
      csv += `Wellness Score,${analytics.wellness.score || 0},out of 100` + '\n';
    }

    logger.info('Generated analytics CSV');
    return csv;
  } catch (error) {
    logger.error('Error generating analytics CSV:', error);
    throw error;
  }
}

/**
 * Generate PDF export (returns object with metadata for PDF generation)
 * @param {Array} entries - Entries to include
 * @param {Object} analytics - Analytics data
 * @param {Object} options - Export options
 * @returns {Object} PDF metadata and content
 */
function generatePDFMetadata(entries, analytics, options = {}) {
  try {
    if (!entries) entries = [];

    const pdfData = {
      title: options.title || 'My Diary Export',
      subtitle: options.subtitle || generateSubtitle(entries),
      generatedAt: new Date().toLocaleString(),
      includeAnalytics: options.includeAnalytics !== false,
      includeEntries: options.includeEntries !== false,
      dateRange: generateDateRange(entries),
      stats: {
        totalEntries: entries.length,
        totalWords: calculateTotalWords(entries),
        dateGenerated: new Date()
      }
    };

    // Add analytics summary
    if (pdfData.includeAnalytics && analytics) {
      pdfData.analyticsSummary = generateAnalyticsSummary(analytics);
    }

    // Prepare entries for PDF
    if (pdfData.includeEntries) {
      pdfData.entries = entries.map(entry => ({
        date: formatDate(entry.createdAt),
        title: entry.title || 'Untitled',
        content: entry.content,
        mood: entry.mood,
        category: entry.category,
        tags: entry.tags || [],
        wordCount: entry.wordCount || calculateWordCount(entry.content)
      }));
    }

    logger.info(`Generated PDF metadata for ${entries.length} entries`);
    return pdfData;
  } catch (error) {
    logger.error('Error generating PDF metadata:', error);
    throw error;
  }
}

/**
 * Generate JSON export (most flexible format)
 * @param {Array} entries - Entries to export
 * @param {Object} analytics - Analytics data
 * @param {Object} options - Export options
 * @returns {Object} Complete JSON export
 */
function generateJSONExport(entries, analytics, options = {}) {
  try {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportFormat: 'json',
      includeAnalytics: options.includeAnalytics !== false,
      metadata: {
        totalEntries: entries?.length || 0,
        totalWords: calculateTotalWords(entries),
        dateRange: generateDateRange(entries),
        generatedBy: 'Malabarbazaar Diary Module'
      }
    };

    if (entries && entries.length > 0) {
      exportData.entries = entries.map(entry => ({
        id: entry._id,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        title: entry.title,
        content: entry.content,
        mood: entry.mood,
        category: entry.category,
        tags: entry.tags || [],
        sentiment: entry.sentiment,
        sentimentConfidence: entry.sentimentConfidence,
        wordCount: entry.wordCount || calculateWordCount(entry.content),
        isDraft: entry.isDraft,
        attachments: entry.attachments || []
      }));
    }

    if (exportData.includeAnalytics && analytics) {
      exportData.analytics = analytics;
    }

    logger.info(`Generated JSON export with ${entries?.length || 0} entries`);
    return exportData;
  } catch (error) {
    logger.error('Error generating JSON export:', error);
    throw error;
  }
}

/**
 * Escape special characters in CSV values
 * @private
 */
function escapeCSV(value) {
  if (!value) return '';
  return String(value)
    .replace(/"/g, '""')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ');
}

/**
 * Format date to readable string
 * @private
 */
function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
}

/**
 * Calculate word count from content
 * @private
 */
function calculateWordCount(content) {
  if (!content) return 0;
  return content.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Calculate total words from entries
 * @private
 */
function calculateTotalWords(entries) {
  if (!entries) return 0;
  return entries.reduce((sum, entry) => {
    return sum + (entry.wordCount || calculateWordCount(entry.content) || 0);
  }, 0);
}

/**
 * Generate subtitle based on entries
 * @private
 */
function generateSubtitle(entries) {
  if (!entries || entries.length === 0) {
    return 'Journal Export';
  }
  
  const dateRange = generateDateRange(entries);
  return `${entries.length} entries | ${dateRange}`;
}

/**
 * Generate date range string
 * @private
 */
function generateDateRange(entries) {
  if (!entries || entries.length === 0) return 'No dates';
  
  const dates = entries
    .map(e => new Date(e.createdAt))
    .sort((a, b) => a - b);
  
  const firstDate = formatDate(dates[0]);
  const lastDate = formatDate(dates[dates.length - 1]);
  
  return `${firstDate} - ${lastDate}`;
}

/**
 * Generate analytics summary for PDF
 * @private
 */
function generateAnalyticsSummary(analytics) {
  return {
    writingStats: analytics.writing ? {
      entries: analytics.writing.entryCount,
      totalWords: analytics.writing.totalWords,
      avgWordsPerEntry: analytics.writing.avgWords?.toFixed(0),
      currentStreak: analytics.writing.currentStreak,
      longestStreak: analytics.writing.longestStreak
    } : null,
    mood: analytics.mood ? {
      dominantMood: analytics.mood.dominantMood,
      uniqueMoods: analytics.mood.uniqueMoods,
      moodDistribution: analytics.mood.moodCounts
    } : null,
    wellness: analytics.wellness ? {
      score: analytics.wellness.score,
      level: analytics.wellness.level,
      factors: analytics.wellness.factors
    } : null,
    tags: analytics.tags ? {
      uniqueTags: analytics.tags.uniqueTags,
      totalUsages: analytics.tags.totalTagUsages,
      topTags: analytics.tags.tagFrequency?.slice(0, 10)
    } : null
  };
}

module.exports = {
  generateCSV,
  generateAnalyticsCSV,
  generatePDFMetadata,
  generateJSONExport,
  calculateWordCount,
  calculateTotalWords,
  formatDate
};
