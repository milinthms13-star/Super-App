/**
 * Search Controller - Phase 14
 * Handle search, indexing, and search analytics
 */

const ElasticsearchService = require('../services/elasticsearchService');
const SearchOptimizationService = require('../services/searchOptimizationService');
const SearchAnalyticsService = require('../services/searchAnalyticsService');
const Product = require('../models/Product');
const logger = require('../services/logger');

class SearchController {
  /**
   * POST /api/v1/search/products
   * Search products with full-text search
   */
  static async searchProducts(req, res) {
    try {
      const { query, filters = {}, page = 1, limit = 20 } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      // Track search query
      await SearchAnalyticsService.trackSearchQuery(req.user?.id, query, 0, 0);

      const results = await ElasticsearchService.searchProducts(query, filters, page, limit);

      return res.json({
        success: true,
        data: results
      });
    } catch (error) {
      logger.error('Error searching products:', error);
      return res.status(500).json({
        success: false,
        error: 'Search failed'
      });
    }
  }

  /**
   * GET /api/v1/search/suggestions
   * Get search suggestions
   */
  static async getSearchSuggestions(req, res) {
    try {
      const { partial, limit = 5 } = req.query;

      if (!partial) {
        return res.status(400).json({
          success: false,
          error: 'Partial search term is required'
        });
      }

      const suggestions = await SearchOptimizationService.getSearchSuggestions(partial, parseInt(limit));

      return res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      logger.error('Error getting search suggestions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get suggestions'
      });
    }
  }

  /**
   * GET /api/v1/search/trends
   * Get search trends
   */
  static async getSearchTrends(req, res) {
    try {
      const { timeWindow = 'weekly' } = req.query;

      const trends = await SearchOptimizationService.analyzeSearchTrends(timeWindow);

      return res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      logger.error('Error getting search trends:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get search trends'
      });
    }
  }

  /**
   * POST /api/v1/search/index/product
   * Index a product
   */
  static async indexProduct(req, res) {
    try {
      const { productId } = req.body;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      const result = await ElasticsearchService.indexProduct(product);

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error indexing product:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to index product'
      });
    }
  }

  /**
   * POST /api/v1/search/index/bulk
   * Bulk index products
   */
  static async bulkIndexProducts(req, res) {
    try {
      const { productIds = [] } = req.body;

      const products = await Product.find({ _id: { $in: productIds } });

      const result = await ElasticsearchService.bulkIndexDocuments(products);

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error bulk indexing products:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to bulk index products'
      });
    }
  }

  /**
   * POST /api/v1/search/index/reindex
   * Reindex all products
   */
  static async reindexAll(req, res) {
    try {
      const result = await ElasticsearchService.reindexProducts();

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error reindexing products:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to reindex products'
      });
    }
  }

  /**
   * GET /api/v1/search/index/health
   * Get index health status
   */
  static async getIndexHealth(req, res) {
    try {
      const health = await ElasticsearchService.getIndexHealth();

      return res.json({
        success: true,
        data: health
      });
    } catch (error) {
      logger.error('Error getting index health:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get index health'
      });
    }
  }

  /**
   * GET /api/v1/search/index/statistics
   * Get index statistics
   */
  static async getIndexStatistics(req, res) {
    try {
      const stats = await ElasticsearchService.getIndexStatistics();

      return res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting index statistics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get index statistics'
      });
    }
  }

  /**
   * GET /api/v1/search/analytics/popular
   * Get popular searches
   */
  static async getPopularSearches(req, res) {
    try {
      const { limit = 20, timeWindow = 'day' } = req.query;

      const searches = await SearchAnalyticsService.getPopularSearches(parseInt(limit), timeWindow);

      return res.json({
        success: true,
        data: searches
      });
    } catch (error) {
      logger.error('Error getting popular searches:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get popular searches'
      });
    }
  }

  /**
   * GET /api/v1/search/analytics/funnel
   * Get search funnel analysis
   */
  static async getSearchFunnel(req, res) {
    try {
      const funnel = await SearchAnalyticsService.analyzeSearchFunnel();

      return res.json({
        success: true,
        data: funnel
      });
    } catch (error) {
      logger.error('Error getting search funnel:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get search funnel'
      });
    }
  }

  /**
   * GET /api/v1/search/analytics/performance
   * Get search performance metrics
   */
  static async getSearchPerformance(req, res) {
    try {
      const metrics = await SearchAnalyticsService.getSearchPerformanceMetrics();

      return res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Error getting search performance:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get search performance'
      });
    }
  }

  /**
   * GET /api/v1/search/analytics/failed
   * Get failed searches
   */
  static async getFailedSearches(req, res) {
    try {
      const data = await SearchAnalyticsService.getFailedSearches();

      return res.json({
        success: true,
        data
      });
    } catch (error) {
      logger.error('Error getting failed searches:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get failed searches'
      });
    }
  }

  /**
   * GET /api/v1/search/analytics/filters
   * Get search filter usage
   */
  static async getFilterUsage(req, res) {
    try {
      const data = await SearchAnalyticsService.getSearchFiltersUsage();

      return res.json({
        success: true,
        data
      });
    } catch (error) {
      logger.error('Error getting filter usage:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get filter usage'
      });
    }
  }

  /**
   * GET /api/v1/search/analytics/roi
   * Get search ROI analysis
   */
  static async getSearchROI(req, res) {
    try {
      const roi = await SearchAnalyticsService.getSearchROIAnalysis();

      return res.json({
        success: true,
        data: roi
      });
    } catch (error) {
      logger.error('Error getting search ROI:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get search ROI'
      });
    }
  }
}

module.exports = SearchController;
