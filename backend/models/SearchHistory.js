const mongoose = require('mongoose');

const SearchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    searches: [
      {
        query: {
          type: String,
          required: true,
          lowercase: true,
        },
        // Applied filters during this search
        filters: {
          minPrice: Number,
          maxPrice: Number,
          minRating: Number,
          maxRating: Number,
          brands: [String],
          categories: [String],
          inStockOnly: Boolean,
          sortBy: String, // 'relevance', 'price-asc', 'price-desc', 'newest', 'rating'
          deliveryType: String, // 'instant', 'same-day', 'scheduled'
          distance: Number, // in km for local search
        },
        resultsCount: {
          type: Number,
          default: 0,
        },
        clickedProductId: String, // If user clicked on a result
        searchedAt: {
          type: Date,
          default: Date.now,
        },
        deviceType: {
          type: String,
          enum: ['mobile', 'tablet', 'desktop'],
          default: 'mobile',
        },
        // AI/ML enrichment
        hasImage: Boolean, // Visual search
        language: {
          type: String,
          enum: ['english', 'malayalam', 'hindi', 'tamil'],
          default: 'english',
        },
        isTypoSearch: Boolean, // If search had typos that were corrected
        correctedQuery: String, // What we actually searched for
        executionTimeMs: Number, // Search performance
      },
    ],
    // Trending searches user follows
    trendingSearches: [
      {
        query: String,
        trendsAt: Date,
        trend: String, // 'up', 'down', 'stable'
      },
    ],
    // Saved searches (bookmarked searches)
    savedSearches: [
      {
        searchId: {
          type: String,
          unique: true,
          default: () => `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
        name: String, // e.g., "Latest iPhones under 50k"
        query: String,
        filters: {
          minPrice: Number,
          maxPrice: Number,
          minRating: Number,
          categories: [String],
          brands: [String],
        },
        notifyNewResults: {
          type: Boolean,
          default: false,
        },
        lastNotificationSent: Date,
        savedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    totalSearches: {
      type: Number,
      default: 0,
    },
    favoriteSearchQueries: [String], // Most searched
    lastSearchedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'search_history',
  }
);

// Index for performance
SearchHistorySchema.index({ userEmail: 1, 'searches.searchedAt': -1 });
SearchHistorySchema.index({ userEmail: 1, 'searches.query': 1 });

// Instance methods
SearchHistorySchema.methods.addSearch = function (query, filters = {}, resultsCount = 0, additionalData = {}) {
  if (!query || query.trim().length === 0) return this;

  // Keep only last 100 searches
  if (this.searches.length >= 100) {
    this.searches.shift();
  }

  this.searches.push({
    query: query.toLowerCase(),
    filters,
    resultsCount,
    searchedAt: new Date(),
    ...additionalData,
  });

  this.totalSearches = this.searches.length;
  this.lastSearchedAt = new Date();

  // Update favorite searches
  this.updateFavoriteSearches();

  return this;
};

SearchHistorySchema.methods.updateFavoriteSearches = function () {
  const queryCount = {};

  this.searches.forEach((search) => {
    queryCount[search.query] = (queryCount[search.query] || 0) + 1;
  });

  this.favoriteSearchQueries = Object.entries(queryCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([query]) => query);

  return this;
};

SearchHistorySchema.methods.saveSearch = function (name, query, filters = {}) {
  this.savedSearches.push({
    searchId: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    query,
    filters,
    notifyNewResults: false,
    savedAt: new Date(),
  });

  return this;
};

SearchHistorySchema.methods.removeSavedSearch = function (searchId) {
  this.savedSearches = this.savedSearches.filter((search) => search.searchId !== searchId);
  return this;
};

SearchHistorySchema.methods.getRecentSearches = function (limit = 10) {
  return this.searches.slice(-limit).reverse();
};

SearchHistorySchema.methods.getTrendingQueries = function () {
  const queryFrequency = {};

  this.searches.forEach((search) => {
    queryFrequency[search.query] = (queryFrequency[search.query] || 0) + 1;
  });

  return Object.entries(queryFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));
};

SearchHistorySchema.methods.getSearchAnalytics = function () {
  return {
    totalSearches: this.totalSearches,
    uniqueSearchQueries: new Set(this.searches.map((s) => s.query)).size,
    favoriteSearches: this.favoriteSearchQueries,
    averageResultsPerSearch:
      this.searches.length > 0
        ? Math.round(this.searches.reduce((sum, s) => sum + s.resultsCount, 0) / this.searches.length)
        : 0,
    lastSearchedAt: this.lastSearchedAt,
    savedSearchesCount: this.savedSearches.length,
  };
};

// Statics
SearchHistorySchema.statics.findByEmail = function (email) {
  return this.findOne({ userEmail: email.toLowerCase() });
};

SearchHistorySchema.statics.getOrCreate = async function (userId, userEmail) {
  let history = await this.findOne({ userEmail: userEmail.toLowerCase() });

  if (!history) {
    history = new this({
      userId,
      userEmail: userEmail.toLowerCase(),
      searches: [],
      savedSearches: [],
    });
    await history.save();
  }

  return history;
};

module.exports = mongoose.model('SearchHistory', SearchHistorySchema);
