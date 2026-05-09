/**
 * Phase 14 Routes
 * Advanced Features & Optimization - 50+ endpoints
 */

const express = require('express');
const router = express.Router();

// Controllers
const PredictiveAnalyticsController = require('../controllers/predictiveAnalyticsController');
const SearchController = require('../controllers/searchController');
const SegmentationController = require('../controllers/segmentationController');
const RecommendationController = require('../controllers/recommendationController');
const OptimizationController = require('../controllers/optimizationController');

// Validations
const Phase14Validations = require('../validations/phase14Validations');

// ============================================
// PREDICTIVE ANALYTICS ROUTES (9 endpoints)
// ============================================

// Revenue Forecasting
router.get(
  '/predictive/revenue-forecast',
  Phase14Validations.validateRevenueForecast,
  Phase14Validations.handleValidationErrors,
  PredictiveAnalyticsController.getRevenueForecast
);

router.get(
  '/predictive/revenue-forecast/seasonal',
  PredictiveAnalyticsController.getSeasonalPatterns
);

router.get(
  '/predictive/revenue-forecast/confidence',
  Phase14Validations.validateRevenueForecast,
  Phase14Validations.handleValidationErrors,
  PredictiveAnalyticsController.getForecastWithConfidence
);

// Churn Prediction
router.get(
  '/predictive/churn-risk/:userId',
  Phase14Validations.validateChurnPrediction,
  Phase14Validations.handleValidationErrors,
  PredictiveAnalyticsController.getUserChurnRisk
);

router.post(
  '/predictive/churn-risk/batch',
  Phase14Validations.validateBatchChurnPrediction,
  Phase14Validations.handleValidationErrors,
  PredictiveAnalyticsController.getBatchChurnRisk
);

router.get(
  '/predictive/churn-risk/at-risk-users',
  PredictiveAnalyticsController.getAtRiskUsers
);

router.get(
  '/predictive/retention-recommendations/:userId',
  Phase14Validations.validateChurnPrediction,
  Phase14Validations.handleValidationErrors,
  PredictiveAnalyticsController.getRetentionRecommendations
);

// Demand Forecasting
router.get(
  '/predictive/demand-forecast/category/:categoryId',
  Phase14Validations.validateDemandForecast,
  Phase14Validations.handleValidationErrors,
  PredictiveAnalyticsController.forecastDemandByCategory
);

router.get(
  '/predictive/demand-forecast/region/:region',
  PredictiveAnalyticsController.forecastDemandByRegion
);

router.get(
  '/predictive/demand-forecast/insights',
  PredictiveAnalyticsController.getDemandInsights
);

router.get(
  '/predictive/summary',
  PredictiveAnalyticsController.getPredictiveAnalyticsSummary
);

// ============================================
// SEARCH & DISCOVERY ROUTES (13 endpoints)
// ============================================

// Product Search
router.post(
  '/search/products',
  Phase14Validations.validateSearch,
  Phase14Validations.handleValidationErrors,
  SearchController.searchProducts
);

router.get(
  '/search/suggestions',
  Phase14Validations.validateSearchSuggestions,
  Phase14Validations.handleValidationErrors,
  SearchController.getSearchSuggestions
);

router.get(
  '/search/trends',
  SearchController.getSearchTrends
);

// Indexing Operations
router.post(
  '/search/index/product',
  SearchController.indexProduct
);

router.post(
  '/search/index/bulk',
  SearchController.bulkIndexProducts
);

router.post(
  '/search/index/reindex',
  SearchController.reindexAll
);

router.get(
  '/search/index/health',
  SearchController.getIndexHealth
);

router.get(
  '/search/index/statistics',
  SearchController.getIndexStatistics
);

// Search Analytics
router.get(
  '/search/analytics/popular',
  SearchController.getPopularSearches
);

router.get(
  '/search/analytics/funnel',
  SearchController.getSearchFunnel
);

router.get(
  '/search/analytics/performance',
  SearchController.getSearchPerformance
);

router.get(
  '/search/analytics/failed',
  SearchController.getFailedSearches
);

router.get(
  '/search/analytics/filters',
  SearchController.getFilterUsage
);

router.get(
  '/search/analytics/roi',
  SearchController.getSearchROI
);

// ============================================
// USER SEGMENTATION ROUTES (10 endpoints)
// ============================================

router.get(
  '/segmentation/behavioral',
  SegmentationController.getBehavioralSegments
);

router.get(
  '/segmentation/rfm',
  SegmentationController.getRFMSegments
);

router.get(
  '/segmentation/cohort',
  SegmentationController.getCohortAnalysis
);

router.get(
  '/segmentation/:type/users/:segmentName',
  Phase14Validations.validateSegmentationType,
  Phase14Validations.validateSegmentationUsers,
  Phase14Validations.handleValidationErrors,
  SegmentationController.getSegmentUsers
);

router.get(
  '/segmentation/behavioral/vip',
  SegmentationController.getVIPSegment
);

router.get(
  '/segmentation/behavioral/loyal',
  SegmentationController.getLoyalSegment
);

router.get(
  '/segmentation/behavioral/at-risk',
  SegmentationController.getAtRiskSegment
);

router.get(
  '/segmentation/rfm/champions',
  SegmentationController.getChampions
);

router.get(
  '/segmentation/analysis',
  SegmentationController.getSegmentationAnalysis
);

router.post(
  '/segmentation/export/:type',
  Phase14Validations.validateSegmentationType,
  Phase14Validations.handleValidationErrors,
  SegmentationController.exportSegmentData
);

router.get(
  '/segmentation/summary',
  SegmentationController.getSegmentationSummary
);

// ============================================
// RECOMMENDATIONS ROUTES (10 endpoints)
// ============================================

router.get(
  '/recommendations/:userId',
  Phase14Validations.validateRecommendations,
  Phase14Validations.handleValidationErrors,
  RecommendationController.getPersonalizedRecommendations
);

router.get(
  '/recommendations/:userId/collaborative',
  Phase14Validations.validateRecommendations,
  Phase14Validations.handleValidationErrors,
  RecommendationController.getCollaborativeRecommendations
);

router.get(
  '/recommendations/:userId/content-based',
  Phase14Validations.validateRecommendations,
  Phase14Validations.handleValidationErrors,
  RecommendationController.getContentBasedRecommendations
);

router.get(
  '/recommendations/trending',
  Phase14Validations.validateTrendingProducts,
  Phase14Validations.handleValidationErrors,
  RecommendationController.getTrendingRecommendations
);

router.get(
  '/recommendations/:userId/based-on/:productId',
  Phase14Validations.validateRecommendations,
  Phase14Validations.handleValidationErrors,
  RecommendationController.getRecommendationsBasedOnProduct
);

router.post(
  '/recommendations/batch',
  Phase14Validations.validateBatchRecommendations,
  Phase14Validations.handleValidationErrors,
  RecommendationController.getBatchRecommendations
);

router.get(
  '/recommendations/similar-users/:userId',
  Phase14Validations.validateRecommendations,
  Phase14Validations.handleValidationErrors,
  RecommendationController.getSimilarUsers
);

router.post(
  '/recommendations/feedback',
  Phase14Validations.validateRecommendationFeedback,
  Phase14Validations.handleValidationErrors,
  RecommendationController.recordRecommendationFeedback
);

router.get(
  '/recommendations/analytics/performance',
  RecommendationController.getRecommendationPerformance
);

router.get(
  '/recommendations/summary',
  RecommendationController.getRecommendationsSummary
);

// ============================================
// OPTIMIZATION ROUTES (12 endpoints)
// ============================================

// Query Optimization
router.get(
  '/optimization/query-analysis',
  OptimizationController.analyzeQueryPerformance
);

router.get(
  '/optimization/query-statistics/:collection',
  Phase14Validations.validateIndexCollection,
  Phase14Validations.handleValidationErrors,
  OptimizationController.getQueryStatistics
);

// Cache Optimization
router.get(
  '/optimization/cache/strategy/:dataType',
  Phase14Validations.validateCacheStrategy,
  Phase14Validations.handleValidationErrors,
  OptimizationController.getCachingStrategy
);

router.get(
  '/optimization/cache/configuration',
  OptimizationController.getCacheConfiguration
);

router.get(
  '/optimization/cache/efficiency',
  OptimizationController.analyzeCacheEfficiency
);

router.get(
  '/optimization/cache/statistics',
  OptimizationController.getCacheStatistics
);

router.post(
  '/optimization/cache/invalidate',
  Phase14Validations.validateCacheInvalidation,
  Phase14Validations.handleValidationErrors,
  OptimizationController.invalidateCache
);

// Index Optimization
router.get(
  '/optimization/index/recommendations',
  OptimizationController.getIndexRecommendations
);

router.get(
  '/optimization/index/analysis',
  OptimizationController.analyzeIndexes
);

router.get(
  '/optimization/index/scripts',
  OptimizationController.getIndexScripts
);

router.get(
  '/optimization/index/performance',
  OptimizationController.monitorIndexPerformance
);

router.get(
  '/optimization/index/size-estimates',
  OptimizationController.getIndexSizeEstimates
);

// Overall Optimization
router.get(
  '/optimization/summary',
  OptimizationController.getOptimizationSummary
);

// ============================================
// ANOMALY DETECTION & ALERTS (Included in Optimization)
// ============================================

// Note: Anomaly detection endpoints can be added via:
// GET /api/v1/anomalies/transactions
// GET /api/v1/anomalies/behavior
// GET /api/v1/anomalies/alerts

module.exports = router;
