/**
 * Query Optimization Service - Phase 14
 * Analyze and optimize database queries
 */

const logger = require('./logger');

class QueryOptimizationService {
  /**
   * Analyze query performance
   */
  static async analyzeQueryPerformance(queryMetrics) {
    try {
      const analysis = {
        timestamp: new Date(),
        totalQueries: queryMetrics.length,
        slowQueries: [],
        averageExecutionTime: 0,
        recommendations: []
      };

      let totalTime = 0;

      queryMetrics.forEach(metric => {
        totalTime += metric.executionTime;

        if (metric.executionTime > 100) {
          analysis.slowQueries.push({
            query: metric.query,
            executionTime: metric.executionTime,
            collection: metric.collection
          });
        }
      });

      analysis.averageExecutionTime = totalTime / queryMetrics.length;

      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis.slowQueries);

      logger.info('Query analysis completed', { totalQueries: analysis.totalQueries });

      return analysis;
    } catch (error) {
      logger.error('Error analyzing query performance:', error);
      throw error;
    }
  }

  /**
   * Generate optimization recommendations
   */
  static generateRecommendations(slowQueries) {
    const recommendations = [];

    if (slowQueries.length > 5) {
      recommendations.push({
        type: 'high-priority',
        message: 'Multiple slow queries detected. Consider database indexing.',
        priority: 1
      });
    }

    slowQueries.forEach(query => {
      if (query.collection === 'orders') {
        recommendations.push({
          type: 'index',
          message: `Add index on orders collection for ${query.query}`,
          priority: 2
        });
      }
    });

    if (slowQueries.some(q => q.executionTime > 500)) {
      recommendations.push({
        type: 'query-restructure',
        message: 'Consider restructuring queries with very long execution times',
        priority: 1
      });
    }

    return recommendations;
  }

  /**
   * Get query statistics
   */
  static async getQueryStatistics(collection, field = null) {
    try {
      return {
        collection,
        field,
        statistics: {
          totalQueries: 0,
          averageTime: 0,
          maxTime: 0,
          minTime: 0
        },
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error getting query statistics:', error);
      throw error;
    }
  }
}

module.exports = QueryOptimizationService;
