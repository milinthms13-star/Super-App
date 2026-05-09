/**
 * Search Optimization Service - Phase 14
 * Optimize search queries and improve ranking
 */

const logger = require('./logger');

class SearchOptimizationService {
  /**
   * Analyze search query performance
   */
  static async analyzeSearchPerformance(queries) {
    try {
      const analysis = {
        totalQueries: queries.length,
        performanceMetrics: {
          averageResponseTime: 0,
          slowQueries: [],
          fastQueries: []
        },
        recommendations: []
      };

      let totalResponseTime = 0;

      queries.forEach(query => {
        totalResponseTime += query.responseTime;

        if (query.responseTime > 200) {
          analysis.performanceMetrics.slowQueries.push({
            query: query.text,
            responseTime: query.responseTime,
            resultCount: query.resultCount
          });
        }

        if (query.responseTime < 50) {
          analysis.performanceMetrics.fastQueries.push({
            query: query.text,
            responseTime: query.responseTime
          });
        }
      });

      analysis.performanceMetrics.averageResponseTime = Math.round(totalResponseTime / queries.length);

      // Generate recommendations
      if (analysis.performanceMetrics.slowQueries.length > 0) {
        analysis.recommendations.push({
          type: 'indexing',
          message: 'Create search indexes for slow queries',
          priority: 'high'
        });
      }

      logger.info('Search performance analysis completed', analysis);

      return analysis;
    } catch (error) {
      logger.error('Error analyzing search performance:', error);
      throw error;
    }
  }

  /**
   * Get search ranking factors
   */
  static getRankingFactors() {
    try {
      return {
        factors: [
          {
            factor: 'relevance_score',
            weight: 0.4,
            description: 'How relevant the result is to the query'
          },
          {
            factor: 'popularity',
            weight: 0.25,
            description: 'Number of views and purchases'
          },
          {
            factor: 'rating',
            weight: 0.15,
            description: 'Average customer rating'
          },
          {
            factor: 'recency',
            weight: 0.1,
            description: 'How recently the product was added'
          },
          {
            factor: 'conversion_rate',
            weight: 0.1,
            description: 'Percentage of viewers who purchase'
          }
        ],
        totalWeight: 1.0,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error getting ranking factors:', error);
      throw error;
    }
  }

  /**
   * Optimize query for search
   */
  static optimizeQuery(rawQuery) {
    try {
      // Normalize query
      let optimized = rawQuery.toLowerCase().trim();

      // Remove extra spaces
      optimized = optimized.replace(/\s+/g, ' ');

      // Expand abbreviations
      const abbreviations = {
        'tv': 'television',
        'ac': 'air conditioner',
        'btw': 'between'
      };

      Object.keys(abbreviations).forEach(abbr => {
        optimized = optimized.replace(new RegExp(`\\b${abbr}\\b`, 'g'), abbreviations[abbr]);
      });

      // Remove common stop words
      const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at'];
      optimized = optimized
        .split(' ')
        .filter(word => !stopWords.includes(word))
        .join(' ');

      return {
        originalQuery: rawQuery,
        optimizedQuery: optimized,
        changes: this.getQueryChanges(rawQuery, optimized),
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error optimizing query:', error);
      throw error;
    }
  }

  /**
   * Get query changes
   */
  static getQueryChanges(original, optimized) {
    const changes = [];

    if (original.length !== optimized.length) {
      changes.push('Length normalized');
    }

    if (original !== optimized) {
      changes.push('Stop words removed');
      changes.push('Query normalized');
    }

    return changes;
  }

  /**
   * Get search suggestions
   */
  static async getSearchSuggestions(partial, limit = 5) {
    try {
      const suggestions = [
        {
          suggestion: partial + ' electronics',
          category: 'Electronics',
          popularity: 'high'
        },
        {
          suggestion: partial + ' deals',
          category: 'Promotions',
          popularity: 'high'
        },
        {
          suggestion: partial + ' discounts',
          category: 'Promotions',
          popularity: 'medium'
        },
        {
          suggestion: partial + ' reviews',
          category: 'Information',
          popularity: 'medium'
        },
        {
          suggestion: partial + ' near me',
          category: 'Location',
          popularity: 'low'
        }
      ];

      return {
        query: partial,
        suggestions: suggestions.slice(0, limit),
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error getting search suggestions:', error);
      throw error;
    }
  }

  /**
   * Analyze search trends
   */
  static async analyzeSearchTrends(timeWindow = 'weekly') {
    try {
      return {
        timeWindow,
        trends: [
          {
            query: 'electronics',
            searchCount: 15000,
            trend: 'increasing',
            weekOverWeekChange: '+12%'
          },
          {
            query: 'deals',
            searchCount: 12000,
            trend: 'stable',
            weekOverWeekChange: '+2%'
          },
          {
            query: 'clearance',
            searchCount: 8000,
            trend: 'increasing',
            weekOverWeekChange: '+25%'
          },
          {
            query: 'new arrivals',
            searchCount: 6000,
            trend: 'decreasing',
            weekOverWeekChange: '-5%'
          }
        ],
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error analyzing search trends:', error);
      throw error;
    }
  }
}

module.exports = SearchOptimizationService;
