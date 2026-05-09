/**
 * SmartSearchService.js
 * Advanced search with typo correction, fuzzy matching, and suggestions
 */

const Product = require('../models/Product');
const SearchHistory = require('../models/SearchHistory');
const logger = require('../config/logger');

// Simple fuzzy matching using Levenshtein distance
class SmartSearchService {
  /**
   * Calculate Levenshtein distance (typo correction)
   */
  static calculateDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Correct typos in search query
   */
  static correctTypos(query, suggestions, maxDistance = 2) {
    if (query.length < 3) return query;

    let bestMatch = query;
    let minDistance = maxDistance;

    suggestions.forEach(suggestion => {
      const distance = this.calculateDistance(
        query.toLowerCase(),
        suggestion.toLowerCase()
      );

      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = suggestion;
      }
    });

    return bestMatch;
  }

  /**
   * Search with fuzzy matching and typo correction
   */
  static async fuzzySearch(query, options = {}) {
    try {
      const {
        limit = 20,
        page = 1,
        fuzzyThreshold = 0.6,
      } = options;

      // Get all product names and brands for fuzzy matching
      const products = await Product.find({})
        .select('name brand category price rating image')
        .limit(1000);

      const searchTermLower = query.toLowerCase();
      const scored = [];

      products.forEach(product => {
        let score = 0;

        // Exact match in name (highest priority)
        if (product.name.toLowerCase().includes(searchTermLower)) {
          score = 1.0;
        }
        // Fuzzy match in name
        else if (
          this.fuzzyMatch(product.name.toLowerCase(), searchTermLower) >
          fuzzyThreshold
        ) {
          score = this.fuzzyMatch(
            product.name.toLowerCase(),
            searchTermLower
          );
        }
        // Exact match in brand
        else if (product.brand?.toLowerCase().includes(searchTermLower)) {
          score = 0.8;
        }
        // Fuzzy match in brand
        else if (
          product.brand &&
          this.fuzzyMatch(product.brand.toLowerCase(), searchTermLower) >
            fuzzyThreshold
        ) {
          score = this.fuzzyMatch(
            product.brand.toLowerCase(),
            searchTermLower
          );
        }

        if (score > fuzzyThreshold) {
          scored.push({
            ...product.toObject(),
            matchScore: score,
          });
        }
      });

      // Sort by relevance score
      scored.sort((a, b) => b.matchScore - a.matchScore);

      // Pagination
      const startIdx = (page - 1) * limit;
      const paginatedResults = scored.slice(startIdx, startIdx + limit);

      return {
        results: paginatedResults,
        total: scored.length,
        correctedQuery: query,
      };
    } catch (error) {
      logger.error('Error in fuzzy search:', error);
      throw error;
    }
  }

  /**
   * Simple fuzzy match implementation
   */
  static fuzzyMatch(haystack, needle) {
    const hlen = haystack.length;
    const nlen = needle.length;

    if (nlen > hlen) return 0;
    if (nlen === hlen) return haystack === needle ? 1 : 0;

    let matched = 0;
    let haystackIdx = 0;

    for (let i = 0; i < nlen; i++) {
      const nch = needle.charCodeAt(i);
      while (haystackIdx < hlen) {
        if (haystack.charCodeAt(haystackIdx++) === nch) {
          matched++;
          break;
        }
      }
    }

    return matched / nlen;
  }

  /**
   * Get auto-suggestions for search
   */
  static async getAutoSuggestions(query, limit = 10) {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      const searchRegex = new RegExp(`^${query}`, 'i');

      // Get suggestions from product names
      const productSuggestions = await Product.find(
        { name: searchRegex },
        { name: 1 }
      )
        .limit(limit / 2)
        .distinct('name');

      // Get suggestions from brand names
      const brandSuggestions = await Product.find(
        { brand: searchRegex },
        { brand: 1 }
      )
        .limit(limit / 2)
        .distinct('brand');

      // Get suggestions from search history
      const historySuggestions = await SearchHistory.find(
        { query: searchRegex },
        { query: 1 }
      )
        .sort({ count: -1 })
        .limit(5)
        .distinct('query');

      // Combine and deduplicate
      const allSuggestions = [
        ...new Set([...productSuggestions, ...brandSuggestions, ...historySuggestions]),
      ].slice(0, limit);

      return allSuggestions;
    } catch (error) {
      logger.error('Error getting auto suggestions:', error);
      throw error;
    }
  }

  /**
   * Get trending search terms
   */
  static async getTrendingSearches(limit = 10, daysBack = 7) {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysBack);

      const trending = await SearchHistory.aggregate([
        {
          $match: {
            createdAt: { $gte: dateThreshold },
          },
        },
        {
          $group: {
            _id: '$query',
            count: { $sum: '$count' },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      return trending.map(t => ({
        query: t._id,
        searchCount: t.count,
      }));
    } catch (error) {
      logger.error('Error getting trending searches:', error);
      throw error;
    }
  }

  /**
   * Search with regex and filters
   */
  static async advancedSearch(query, filters = {}, options = {}) {
    try {
      const {
        page = 1,
        pageSize = 20,
        sortBy = 'relevance',
      } = options;

      const searchRegex = new RegExp(query, 'i');
      const matchStage = {
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { brand: searchRegex },
          { category: searchRegex },
        ],
      };

      // Apply additional filters
      if (filters.category) matchStage.category = filters.category;
      if (filters.minPrice || filters.maxPrice) {
        matchStage.price = {};
        if (filters.minPrice) matchStage.price.$gte = filters.minPrice;
        if (filters.maxPrice) matchStage.price.$lte = filters.maxPrice;
      }

      const sortStage = {};
      if (sortBy === 'relevance') {
        sortStage.score = { $meta: 'textScore' };
      } else if (sortBy === 'price_low') {
        sortStage.price = 1;
      } else if (sortBy === 'price_high') {
        sortStage.price = -1;
      } else if (sortBy === 'rating') {
        sortStage.rating = -1;
      } else if (sortBy === 'newest') {
        sortStage.createdAt = -1;
      }

      const pipeline = [
        { $match: matchStage },
        { $sort: sortStage },
        { $skip: (page - 1) * pageSize },
        { $limit: pageSize },
      ];

      const results = await Product.aggregate(pipeline);

      // Get total count
      const countPipeline = [
        { $match: matchStage },
        { $count: 'total' },
      ];
      const countResult = await Product.aggregate(countPipeline);
      const total = countResult[0]?.total || 0;

      return {
        results,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      logger.error('Error in advanced search:', error);
      throw error;
    }
  }

  /**
   * Track search query for history and trending
   */
  static async trackSearch(query, userId = null, resultCount = 0) {
    try {
      const normalizedQuery = query.toLowerCase().trim();

      const searchEntry = await SearchHistory.findOneAndUpdate(
        { query: normalizedQuery },
        {
          $inc: { count: 1 },
          $set: {
            lastSearched: new Date(),
            resultCount,
          },
          $addToSet: { users: userId },
        },
        { upsert: true, new: true }
      );

      return searchEntry;
    } catch (error) {
      logger.error('Error tracking search:', error);
    }
  }

  /**
   * Get regional keywords (for Malayalam and other languages)
   */
  static async getRegionalKeywords(language = 'en', limit = 10) {
    try {
      // Map language codes to keywords
      const keywordMaps = {
        ml: ['മോബൈൽ', 'ലാപ്ടോപ്പ്', 'കാമറ', 'ഇലക്ട്രോണിക്സ്'], // Malayalam
        hi: ['मोबाइल', 'लैपटॉप', 'कैमरा', 'इलेक्ट्रॉनिक्स'], // Hindi
        ta: ['மொபைல்', 'லேபிடாப்', 'கேமரா', 'மின்சாரம்'], // Tamil
      };

      return keywordMaps[language] || [];
    } catch (error) {
      logger.error('Error getting regional keywords:', error);
      throw error;
    }
  }

  /**
   * Voice search (convert audio to text if needed)
   */
  static async voiceSearch(query, userId = null, options = {}) {
    try {
      // Query is already converted from audio to text
      // by the voice service before reaching here
      const searchResults = await this.advancedSearch(query, {}, options);
      await this.trackSearch(query, userId, searchResults.results.length);

      return searchResults;
    } catch (error) {
      logger.error('Error in voice search:', error);
      throw error;
    }
  }

  /**
   * Get recently searched items for user
   */
  static async getRecentSearches(userId, limit = 10) {
    try {
      const SearchHistory = require('../models/SearchHistory');
      const searches = await SearchHistory.find({ users: userId })
        .sort({ lastSearched: -1 })
        .limit(limit)
        .select('query count resultCount lastSearched');

      return searches;
    } catch (error) {
      logger.error('Error getting recent searches:', error);
      throw error;
    }
  }
}

module.exports = SmartSearchService;
