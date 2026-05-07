const DiaryEntry = require('../models/DiaryEntry');
const DiaryEntryVersion = require('../models/DiaryEntryVersion');
const DiaryVersionTag = require('../models/DiaryVersionTag');
const DiaryVersionComment = require('../models/DiaryVersionComment');
const logger = require('../utils/logger');

/**
 * Advanced Diary Search & Filtering Utility
 * Provides full-text search, filtering, and saved filter management
 */

// Search configuration
const SEARCH_CONFIG = {
  maxResults: 100,
  minSearchLength: 2,
  highlightContext: 50,
  allowedFields: ['title', 'content', 'tags', 'sentiment', 'date'],
  searchWeights: {
    title: 3,
    content: 1,
    tags: 2,
  },
};

const escapeRegExp = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const runDistinctQuery = async (queryBuilder, field, limit = 10) => {
  const distinctQuery = queryBuilder.distinct(field);

  if (distinctQuery && typeof distinctQuery.limit === 'function') {
    return distinctQuery.limit(limit);
  }

  const values = await distinctQuery;
  return Array.isArray(values) ? values.slice(0, limit) : [];
};

const finalizeQuery = async (
  queryLike,
  { select, sort, limit, skip } = {}
) => {
  let cursor = queryLike;

  if (select && typeof cursor?.select === 'function') {
    cursor = cursor.select(select);
  }
  if (sort && typeof cursor?.sort === 'function') {
    cursor = cursor.sort(sort);
  }
  if (typeof limit === 'number' && typeof cursor?.limit === 'function') {
    cursor = cursor.limit(limit);
  }
  if (typeof skip === 'number' && typeof cursor?.skip === 'function') {
    cursor = cursor.skip(skip);
  }

  if (typeof cursor?.exec === 'function') {
    return cursor.exec();
  }
  if (typeof cursor?.then === 'function') {
    return cursor;
  }

  return cursor;
};

/**
 * Full-text search across diary entries
 * @param {string} userId - User ID
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<Array>} - Search results with relevance scores
 */
async function searchEntries(userId, query, options = {}) {
  try {
    if (!query || query.trim().length < SEARCH_CONFIG.minSearchLength) {
      return { results: [], total: 0, query };
    }

    const searchQuery = query.trim();
    const limit = options.limit || 20;
    const skip = options.skip || 0;

    // Build MongoDB text search query
    const mongoQuery = {
      userId,
      isDeleted: false,
      $text: { $search: searchQuery },
    };

    // Add optional filters
    if (options.tags && options.tags.length > 0) {
      mongoQuery.tags = { $in: options.tags };
    }

    if (options.dateFrom || options.dateTo) {
      mongoQuery.createdAt = {};
      if (options.dateFrom) mongoQuery.createdAt.$gte = new Date(options.dateFrom);
      if (options.dateTo) mongoQuery.createdAt.$lte = new Date(options.dateTo);
    }

    if (options.sentiment && options.sentiment.length > 0) {
      mongoQuery.sentiment = { $in: options.sentiment };
    }

    // Execute search
    const results = await DiaryEntry.find(mongoQuery)
      .select('_id title createdAt updatedAt tags sentiment')
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .skip(skip)
      .exec();

    const total = await DiaryEntry.countDocuments(mongoQuery);

    // Format results with highlighting
    const formattedResults = results.map((entry) => ({
      _id: entry._id,
      title: entry.title,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      tags: entry.tags || [],
      sentiment: entry.sentiment,
      score: 1, // Text search score
    }));

    // Save search to history
    await saveSearchHistory(userId, searchQuery, formattedResults.length);

    return {
      results: formattedResults,
      total,
      query: searchQuery,
      page: Math.floor(skip / limit) + 1,
      pageSize: limit,
    };
  } catch (error) {
    logger.error('Search entries error:', error);
    throw new Error(`Search failed: ${error.message}`);
  }
}

/**
 * Search with content highlighting
 * @param {string} userId - User ID
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<Array>} - Results with highlighted content
 */
async function searchWithHighlight(userId, query, options = {}) {
  try {
    const results = await searchEntries(userId, query, options);

    // Add content preview with highlighting
    const enrichedResults = await Promise.all(
      results.results.map(async (result) => {
        const entry = await finalizeQuery(DiaryEntry.findById(result._id), {
          select: 'content',
        });
        const highlighted = highlightSearchTerms(entry.content, query);

        return {
          ...result,
          preview: highlighted.substring(0, SEARCH_CONFIG.highlightContext),
          hasMoreContent: highlighted.length > SEARCH_CONFIG.highlightContext,
        };
      })
    );

    return {
      ...results,
      results: enrichedResults,
    };
  } catch (error) {
    logger.error('Search with highlight error:', error);
    throw error;
  }
}

/**
 * Highlight search terms in text
 * @param {string} text - Text to highlight
 * @param {string} query - Search query
 * @returns {string} - Text with highlighted terms
 */
function highlightSearchTerms(text, query) {
  if (!text) return '';
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Apply advanced filters to entries
 * @param {string} userId - User ID
 * @param {object} filters - Filter configuration
 * @returns {Promise<Array>} - Filtered entries
 */
async function filterEntries(userId, filters = {}) {
  try {
    const mongoQuery = { userId, isDeleted: false };

    // Date range filtering
    if (filters.dateRange) {
      mongoQuery.createdAt = {};
      if (filters.dateRange.from) {
        mongoQuery.createdAt.$gte = new Date(filters.dateRange.from);
      }
      if (filters.dateRange.to) {
        mongoQuery.createdAt.$lte = new Date(filters.dateRange.to);
      }
    }

    // Tag filtering
    if (filters.tags && filters.tags.length > 0) {
      if (filters.tagMatchType === 'all') {
        mongoQuery.tags = { $all: filters.tags };
      } else if (filters.tagMatchType === 'none') {
        mongoQuery.tags = { $nin: filters.tags };
      } else {
        // Default: 'any'
        mongoQuery.tags = { $in: filters.tags };
      }
    }

    // Sentiment filtering
    if (filters.sentiment && filters.sentiment.length > 0) {
      mongoQuery.sentiment = { $in: filters.sentiment };
    }

    // Word count filtering
    if (filters.minWords || filters.maxWords) {
      mongoQuery.wordCount = {};
      if (filters.minWords) mongoQuery.wordCount.$gte = filters.minWords;
      if (filters.maxWords) mongoQuery.wordCount.$lte = filters.maxWords;
    }

    // Status filtering
    if (filters.status) {
      if (filters.status === 'draft') {
        mongoQuery.tags = { ...mongoQuery.tags, $in: ['draft'] };
      } else if (filters.status === 'published') {
        mongoQuery.tags = { ...mongoQuery.tags, $nin: ['draft'] };
      } else if (filters.status === 'archived') {
        mongoQuery.isDeleted = true;
      }
    }

    // Version filtering
    if (filters.minVersions) {
      const entries = await DiaryEntry.find(mongoQuery);
      const idsWithVersions = await Promise.all(
        entries.map(async (entry) => {
          const versionCount = await DiaryEntryVersion.countDocuments({
            entryId: entry._id,
          });
          return versionCount >= filters.minVersions ? entry._id : null;
        })
      );
      mongoQuery._id = { $in: idsWithVersions.filter(Boolean) };
    }

    // Execute query
    const results = await finalizeQuery(DiaryEntry.find(mongoQuery), {
      sort: { createdAt: -1 },
      limit: filters.limit || 100,
      skip: filters.skip || 0,
      select: 'title createdAt updatedAt tags sentiment wordCount',
    });

    const total = await DiaryEntry.countDocuments(mongoQuery);

    return {
      results,
      total,
      filters: filters,
      appliedFiltersCount: Object.keys(filters).length,
    };
  } catch (error) {
    logger.error('Filter entries error:', error);
    throw new Error(`Filtering failed: ${error.message}`);
  }
}

/**
 * Get search suggestions/autocomplete
 * @param {string} query - Partial query
 * @param {string} userId - User ID
 * @param {string} type - 'tags', 'titles', 'content'
 * @returns {Promise<Array>} - Suggestions
 */
async function getSearchSuggestions(query, userId, type = 'all') {
  try {
    if (!query || query.length < 2) {
      return [];
    }

    const searchRegex = new RegExp(`^${escapeRegExp(query)}`, 'i');
    const suggestions = [];
    let encounteredError = false;

    // Tag suggestions
    if (type === 'all' || type === 'tags') {
      try {
        const tags = await runDistinctQuery(
          DiaryVersionTag.find({
            name: searchRegex,
          }),
          'name',
          10
        );

        suggestions.push(
          ...tags.map((tag) => ({
            text: tag,
            type: 'tag',
            category: 'Tags',
          }))
        );
      } catch (error) {
        logger.error('Get tag suggestions error:', error);
        encounteredError = true;
      }
    }

    // Title suggestions
    if (type === 'all' || type === 'titles') {
      try {
        const titles = await runDistinctQuery(
          DiaryEntry.find({
            userId,
            title: searchRegex,
            isDeleted: false,
          }),
          'title',
          10
        );

        suggestions.push(
          ...titles.map((title) => ({
            text: title,
            type: 'title',
            category: 'Titles',
          }))
        );
      } catch (error) {
        logger.error('Get title suggestions error:', error);
        encounteredError = true;
      }
    }

    // Content keywords
    if (type === 'all' || type === 'content') {
      try {
        const recentEntriesQuery = DiaryEntry.find({ userId, isDeleted: false });
        if (typeof recentEntriesQuery.select === 'function') {
          const entries = await recentEntriesQuery
            .select('content')
            .sort({ createdAt: -1 })
            .limit(5)
            .exec();

          const keywords = extractKeywords(entries.map((e) => e.content), query);
          suggestions.push(
            ...keywords.map((keyword) => ({
              text: keyword,
              type: 'keyword',
              category: 'Keywords',
            }))
          );
        }
      } catch (error) {
        logger.error('Get keyword suggestions error:', error);
        encounteredError = true;
      }
    }

    if (encounteredError) {
      return [];
    }

    return suggestions.slice(0, 20); // Limit total suggestions
  } catch (error) {
    logger.error('Get search suggestions error:', error);
    return [];
  }
}

/**
 * Extract keywords from content
 * @param {Array<string>} contents - Content texts
 * @param {string} query - Partial query to match
 * @returns {Array<string>} - Relevant keywords
 */
function extractKeywords(contents, query) {
  const keywords = new Set();
  const regex = new RegExp(`\\b\\w*${query}\\w*\\b`, 'gi');

  contents.forEach((content) => {
    if (!content) return;
    const matches = content.match(regex);
    if (matches) {
      matches.slice(0, 3).forEach((match) => keywords.add(match.toLowerCase()));
    }
  });

  return Array.from(keywords);
}

/**
 * Save search to user search history
 * @param {string} userId - User ID
 * @param {string} query - Search query
 * @param {number} resultCount - Number of results
 * @returns {Promise<void>}
 */
async function saveSearchHistory(userId, query, resultCount) {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user) return;

    // Initialize search history if not exists
    if (!user.searchHistory) {
      user.searchHistory = [];
    }

    // Check if search already exists
    const existingSearch = user.searchHistory.find((s) => s.query === query);

    if (existingSearch) {
      // Update count and date
      existingSearch.count = (existingSearch.count || 1) + 1;
      existingSearch.lastSearched = new Date();
    } else {
      // Add new search
      user.searchHistory.push({
        query,
        resultCount,
        count: 1,
        lastSearched: new Date(),
      });
    }

    // Keep only last 50 searches
    user.searchHistory = user.searchHistory.slice(-50);
    await user.save();
  } catch (error) {
    logger.error('Save search history error:', error);
    // Don't throw, as this is non-critical
  }
}

/**
 * Get user search history
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Search history
 */
async function getSearchHistory(userId) {
  try {
    const User = require('../models/User');
    const user = await finalizeQuery(User.findById(userId), {
      select: 'searchHistory',
    });

    if (!user || !user.searchHistory) {
      return [];
    }

    return user.searchHistory
      .sort((a, b) => new Date(b.lastSearched) - new Date(a.lastSearched))
      .slice(0, 20);
  } catch (error) {
    logger.error('Get search history error:', error);
    throw error;
  }
}

/**
 * Clear search history
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function clearSearchHistory(userId) {
  try {
    const User = require('../models/User');
    await User.findByIdAndUpdate(userId, { searchHistory: [] });
  } catch (error) {
    logger.error('Clear search history error:', error);
    throw error;
  }
}

/**
 * Create and save a filter
 * @param {string} userId - User ID
 * @param {string} name - Filter name
 * @param {object} filterConfig - Filter configuration
 * @returns {Promise<object>} - Saved filter
 */
async function saveFilter(userId, name, filterConfig) {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.savedFilters) {
      user.savedFilters = [];
    }

    // Check for duplicate name
    if (user.savedFilters.some((f) => f.name === name)) {
      throw new Error('Filter with this name already exists');
    }

    const filter = {
      _id: new (require('mongoose').Types.ObjectId)(),
      name,
      config: filterConfig,
      createdAt: new Date(),
      useCount: 0,
    };

    user.savedFilters.push(filter);
    await user.save();

    return filter;
  } catch (error) {
    logger.error('Save filter error:', error);
    throw error;
  }
}

/**
 * Get saved filters
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Saved filters
 */
async function getSavedFilters(userId) {
  try {
    const User = require('../models/User');
    const user = await finalizeQuery(User.findById(userId), {
      select: 'savedFilters',
    });

    return (user?.savedFilters || []).sort((a, b) => b.useCount - a.useCount);
  } catch (error) {
    logger.error('Get saved filters error:', error);
    return [];
  }
}

/**
 * Use saved filter (increment use count)
 * @param {string} userId - User ID
 * @param {string} filterId - Filter ID
 * @returns {Promise<object>} - Filter results
 */
async function useSavedFilter(userId, filterId) {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId);

    const filter = user.savedFilters.find((f) => f._id.toString() === filterId);
    if (!filter) {
      throw new Error('Filter not found');
    }

    filter.useCount = (filter.useCount || 0) + 1;
    filter.lastUsed = new Date();
    await user.save();

    return filterEntries(userId, filter.config);
  } catch (error) {
    logger.error('Use saved filter error:', error);
    throw error;
  }
}

/**
 * Delete saved filter
 * @param {string} userId - User ID
 * @param {string} filterId - Filter ID
 * @returns {Promise<void>}
 */
async function deleteSavedFilter(userId, filterId) {
  try {
    const User = require('../models/User');
    await User.findByIdAndUpdate(userId, {
      $pull: { savedFilters: { _id: filterId } },
    });
  } catch (error) {
    logger.error('Delete saved filter error:', error);
    throw error;
  }
}

/**
 * Get filter suggestions based on user's entries
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Filter suggestions
 */
async function getFilterSuggestions(userId) {
  try {
    const entries = await finalizeQuery(
      DiaryEntry.find({ userId, isDeleted: false }),
      {
        select: 'tags sentiment createdAt',
        limit: 100,
      }
    );

    if (entries.length === 0) {
      return {
        topTags: [],
        sentiments: [],
        dateRanges: [],
      };
    }

    // Get top tags
    const tagCounts = {};
    entries.forEach((entry) => {
      (entry.tags || []).forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    // Get sentiment distribution
    const sentiments = {};
    entries.forEach((entry) => {
      const sentiment = entry.sentiment || 'neutral';
      sentiments[sentiment] = (sentiments[sentiment] || 0) + 1;
    });

    // Get date range suggestions
    const dates = entries.map((e) => new Date(e.createdAt));
    const dateRanges = [
      {
        name: 'Last 7 days',
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date(),
      },
      {
        name: 'Last 30 days',
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
      },
      {
        name: 'Last 3 months',
        from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        to: new Date(),
      },
      {
        name: 'This year',
        from: new Date(new Date().getFullYear(), 0, 1),
        to: new Date(),
      },
    ];

    return {
      topTags,
      sentiments,
      dateRanges,
      totalEntries: entries.length,
    };
  } catch (error) {
    logger.error('Get filter suggestions error:', error);
    throw error;
  }
}

module.exports = {
  searchEntries,
  searchWithHighlight,
  filterEntries,
  getSearchSuggestions,
  getSearchHistory,
  clearSearchHistory,
  saveFilter,
  getSavedFilters,
  useSavedFilter,
  deleteSavedFilter,
  getFilterSuggestions,
};
