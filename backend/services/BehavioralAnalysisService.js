/**
 * BehavioralAnalysisService
 * Analyzes user behavioral patterns and detects anomalies
 */

const BehavioralPattern = require('../models/BehavioralPattern');
const FraudAlert = require('../models/FraudAlert');
const logger = require('../utils/logger');
const crypto = require('crypto');

class BehavioralAnalysisService {
  /**
   * Analyze transaction against behavioral patterns
   */
  async analyzeTransactionBehavior(userId, transaction) {
    try {
      const patterns = await BehavioralPattern.find({
        userId,
        status: { $in: ['active', 'learning'] },
        'learningStatus.isStable': true,
      });

      if (patterns.length === 0) {
        return {
          anomalies: [],
          riskLevel: 'low',
          recommendation: 'approve',
          patternMatches: [],
        };
      }

      const anomalies = [];
      const patternMatches = [];

      for (const pattern of patterns) {
        const deviation = this._checkAnomalyForPattern(transaction, pattern);

        if (deviation) {
          anomalies.push(deviation);

          if (deviation.isAnomaly) {
            patternMatches.push({
              patternId: pattern.patternId,
              patternType: pattern.patternType,
              deviationScore: deviation.deviationScore,
            });

            // Record anomaly in pattern
            await pattern.recordAnomaly(deviation.detectedValue, deviation.zScore);
          }
        }
      }

      // Aggregate anomalies
      const aggregatedRisk = this._aggregateAnomalies(anomalies);

      return {
        anomalies,
        patternMatches,
        riskLevel: aggregatedRisk.level,
        riskScore: aggregatedRisk.score,
        recommendation: this._getRecommendation(aggregatedRisk.score),
      };
    } catch (error) {
      logger.error('Error analyzing transaction behavior:', error);
      return {
        anomalies: [],
        riskLevel: 'low',
        recommendation: 'approve',
        patternMatches: [],
      };
    }
  }

  /**
   * Check anomaly for specific pattern
   */
  _checkAnomalyForPattern(transaction, pattern) {
    let detectedValue, expectedValue, isAnomaly, zScore, deviationScore;

    switch (pattern.patternType) {
      case 'transaction_amount':
        detectedValue = transaction.amount;
        expectedValue = pattern.normalBehavior.mean;
        zScore = pattern.calculateZScore(detectedValue);
        isAnomaly = pattern.isAnomaly(detectedValue);
        deviationScore = Math.abs(zScore);
        break;

      case 'transaction_frequency':
        detectedValue = transaction.frequency || 1;
        expectedValue = pattern.frequencyPattern?.transactionsPerDay?.mean || 1;
        isAnomaly = detectedValue > expectedValue * 3;
        deviationScore = isAnomaly ? Math.abs((detectedValue - expectedValue) / expectedValue) : 0;
        zScore = isAnomaly ? 3 : 0;
        break;

      case 'time_of_day':
        const hour = new Date().getHours();
        const isNormalHour = pattern.timePattern?.preferredTimeWindow?.startHour <= hour &&
          hour <= pattern.timePattern?.preferredTimeWindow?.endHour;
        isAnomaly = !isNormalHour;
        zScore = isAnomaly ? 2 : 0;
        deviationScore = isAnomaly ? 0.5 : 0;
        break;

      case 'geographic_location':
        if (pattern.geographicPattern?.allowedRadius && transaction.locationDistance) {
          isAnomaly = transaction.locationDistance > pattern.geographicPattern.allowedRadius;
          deviationScore = isAnomaly
            ? transaction.locationDistance / pattern.geographicPattern.allowedRadius
            : 0;
          zScore = isAnomaly ? 2.5 : 0;
        }
        break;

      case 'device_type':
        const isKnownDevice = pattern.devicePattern?.allowedDevices?.includes(transaction.deviceId);
        isAnomaly = !isKnownDevice;
        zScore = isAnomaly ? 2 : 0;
        deviationScore = isAnomaly ? 1 : 0;
        break;

      case 'payment_method_usage':
        const isKnownMethod = pattern.paymentMethodPattern?.preferredMethods?.some(
          (m) => m.method === transaction.paymentMethod
        );
        isAnomaly = !isKnownMethod && pattern.learningStatus.dataPoints > 50;
        deviationScore = isAnomaly ? 0.7 : 0;
        zScore = isAnomaly ? 1.8 : 0;
        break;

      case 'refund_behavior':
        if (transaction.isRefund) {
          const refundRate = pattern.refundPattern?.refundRate || 0;
          isAnomaly = refundRate > 0.3 || (transaction.timeSinceOrder && transaction.timeSinceOrder < 60);
          deviationScore = isAnomaly ? Math.min(refundRate * 100, 100) : 0;
          zScore = isAnomaly ? 2.2 : 0;
        }
        break;

      default:
        return null;
    }

    if (isAnomaly === undefined) return null;

    return {
      patternType: pattern.patternType,
      isAnomaly,
      detectedValue,
      expectedValue,
      zScore,
      deviationScore,
      description: `${pattern.patternType}: Expected ${expectedValue}, got ${detectedValue}`,
    };
  }

  /**
   * Aggregate anomalies to overall risk
   */
  _aggregateAnomalies(anomalies) {
    if (anomalies.length === 0) {
      return { level: 'low', score: 20 };
    }

    // Weight anomalies by severity
    const weights = {
      transaction_amount: 0.20,
      velocity: 0.20,
      geographic_location: 0.25,
      device_type: 0.18,
      time_of_day: 0.10,
      payment_method_usage: 0.12,
      refund_behavior: 0.22,
    };

    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const anomaly of anomalies) {
      if (anomaly.isAnomaly) {
        const weight = weights[anomaly.patternType] || 0.1;
        const score = Math.min(anomaly.deviationScore * 100, 100);
        totalWeightedScore += score * weight;
        totalWeight += weight;
      }
    }

    const riskScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 0.8 : 20;

    let level;
    if (riskScore > 75) level = 'critical';
    else if (riskScore > 60) level = 'high';
    else if (riskScore > 40) level = 'medium';
    else level = 'low';

    return { level, score: Math.min(riskScore, 100) };
  }

  /**
   * Get recommendation based on behavioral risk
   */
  _getRecommendation(riskScore) {
    if (riskScore > 80) return 'block';
    if (riskScore > 65) return 'manual_review';
    if (riskScore > 45) return 'challenge_user';
    return 'approve';
  }

  /**
   * Learn pattern from transaction
   */
  async learnFromTransaction(userId, transaction, entityType, entityId) {
    try {
      let pattern = await BehavioralPattern.findOne({
        userId,
        entityType,
        entityId,
        patternType: 'transaction_amount',
      });

      if (!pattern) {
        pattern = new BehavioralPattern({
          patternId: `pat_${crypto.randomBytes(12).toString('hex')}`,
          userId,
          entityType,
          entityId,
          patternType: 'transaction_amount',
          status: 'learning',
          learningStatus: {
            dataPoints: 0,
            isStable: false,
            minDataPointsRequired: 30,
          },
        });
      }

      await pattern.addDataPoint(transaction.amount);

      if (pattern.learningStatus.dataPoints === pattern.learningStatus.minDataPointsRequired) {
        logger.info(`Pattern learning complete for ${userId} - ${entityId}`);
      }

      return pattern;
    } catch (error) {
      logger.error('Error learning pattern:', error);
    }
  }

  /**
   * Get user patterns summary
   */
  async getUserPatternsSummary(userId) {
    try {
      const patterns = await BehavioralPattern.find({ userId });

      return {
        totalPatterns: patterns.length,
        activePatterns: patterns.filter((p) => p.status === 'active').length,
        learningPatterns: patterns.filter((p) => p.status === 'learning').length,
        stablePatterns: patterns.filter((p) => p.learningStatus.isStable).length,
        averageConfidence: patterns.reduce((sum, p) => sum + p.learningStatus.confidenceScore, 0) /
          Math.max(patterns.length, 1),
        patterns,
      };
    } catch (error) {
      logger.error('Error getting patterns summary:', error);
      throw error;
    }
  }

  /**
   * Get behavioral anomalies for user
   */
  async getUserAnomalies(userId, timeframe = '7d') {
    try {
      const startDate = this._getDateFromTimeframe(timeframe);

      const alerts = await FraudAlert.find({
        userId,
        createdAt: { $gte: startDate },
        triggeredBy: { $in: ['behavioral_analysis', 'pattern_match'] },
      }).sort({ createdAt: -1 });

      return {
        totalAnomalies: alerts.length,
        byCategory: this._groupByCategory(alerts),
        byStatus: this._groupByStatus(alerts),
        trend: this._calculateTrend(alerts),
        alerts,
      };
    } catch (error) {
      logger.error('Error getting user anomalies:', error);
      throw error;
    }
  }

  /**
   * Helper: Get date from timeframe
   */
  _getDateFromTimeframe(timeframe) {
    const now = new Date();
    const match = timeframe.match(/(\d+)([dhm])/);

    if (!match) return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [, value, unit] = match;
    const amount = parseInt(value);

    switch (unit) {
      case 'd':
        return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
      case 'h':
        return new Date(now.getTime() - amount * 60 * 60 * 1000);
      case 'm':
        return new Date(now.getTime() - amount * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Helper: Group alerts by category
   */
  _groupByCategory(alerts) {
    return alerts.reduce((acc, alert) => {
      acc[alert.category] = (acc[alert.category] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Helper: Group alerts by status
   */
  _groupByStatus(alerts) {
    return alerts.reduce((acc, alert) => {
      acc[alert.status] = (acc[alert.status] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Helper: Calculate trend
   */
  _calculateTrend(alerts) {
    if (alerts.length < 2) return 'stable';

    const firstHalf = alerts.slice(Math.ceil(alerts.length / 2));
    const secondHalf = alerts.slice(0, Math.ceil(alerts.length / 2));

    const firstRate = firstHalf.length;
    const secondRate = secondHalf.length;

    if (secondRate > firstRate * 1.2) return 'increasing';
    if (firstRate > secondRate * 1.2) return 'decreasing';
    return 'stable';
  }

  /**
   * Get pattern details
   */
  async getPatternDetails(patternId) {
    try {
      return await BehavioralPattern.findOne({ patternId });
    } catch (error) {
      logger.error('Error getting pattern details:', error);
      throw error;
    }
  }

  /**
   * Update pattern threshold
   */
  async updatePatternThreshold(patternId, zScoreThreshold) {
    try {
      const pattern = await BehavioralPattern.findOne({ patternId });
      if (pattern) {
        pattern.anomalyThresholds.zScoreThreshold = zScoreThreshold;
        await pattern.save();
        logger.info(`Updated threshold for pattern ${patternId}`);
      }
      return pattern;
    } catch (error) {
      logger.error('Error updating pattern threshold:', error);
      throw error;
    }
  }
}

module.exports = new BehavioralAnalysisService();
