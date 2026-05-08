const FraudRisk = require('../models/FraudRisk');
const FoodDeliveryPayment = require('../models/FoodDeliveryPayment');
const FoodDeliveryRefund = require('../models/FoodDeliveryRefund');

class FraudDetectionService {
  /**
   * Detect fraud for payment
   */
  static async detectPaymentFraud(payment) {
    try {
      const factors = [];
      let riskScore = 0;

      // Check 1: Unusual amount
      const userAvgAmount = await this._getUserAverageAmount(payment.userId);
      const amountDeviation = Math.abs(payment.amount - userAvgAmount) / (userAvgAmount || 1);
      
      if (amountDeviation > 2) {
        factors.push({
          factor: 'unusual_amount',
          weight: 20,
          description: `Amount ${amountDeviation.toFixed(1)}x user average`,
          evidenceValue: { userAverage: userAvgAmount, current: payment.amount },
        });
        riskScore += 20;
      }

      // Check 2: Rapid successive transactions
      const recentPayments = await FoodDeliveryPayment.countDocuments({
        userId: payment.userId,
        initiatedAt: {
          $gte: new Date(Date.now() - 3600000), // Last hour
        },
      });

      if (recentPayments > 5) {
        factors.push({
          factor: 'rapid_transactions',
          weight: 25,
          description: `${recentPayments} payments in last hour`,
          evidenceValue: { count: recentPayments },
        });
        riskScore += 25;
      }

      // Check 3: Multiple payment method changes
      const uniqueMethods = await FoodDeliveryPayment.distinct('paymentMethod', {
        userId: payment.userId,
        initiatedAt: {
          $gte: new Date(Date.now() - 86400000), // Last 24 hours
        },
      });

      if (uniqueMethods.length > 3) {
        factors.push({
          factor: 'multiple_payment_methods',
          weight: 15,
          description: `${uniqueMethods.length} different payment methods in 24h`,
          evidenceValue: { methods: uniqueMethods },
        });
        riskScore += 15;
      }

      // Check 4: New device
      const isNewDevice = await this._isNewDevice(payment.userId, payment);
      if (isNewDevice) {
        factors.push({
          factor: 'new_device',
          weight: 10,
          description: 'First transaction from this device',
          evidenceValue: { deviceId: payment.deviceId },
        });
        riskScore += 10;
      }

      // Check 5: Geographic anomaly
      const isUnusualLocation = await this._checkGeographicAnomaly(payment);
      if (isUnusualLocation) {
        factors.push({
          factor: 'geographic_anomaly',
          weight: 20,
          description: 'Transaction from unusual location',
          evidenceValue: { location: payment.location },
        });
        riskScore += 20;
      }

      // Check 6: Failed attempts before success
      const recentFailures = await FoodDeliveryPayment.countDocuments({
        userId: payment.userId,
        status: 'failed',
        initiatedAt: {
          $gte: new Date(Date.now() - 3600000),
        },
      });

      if (recentFailures > 3) {
        factors.push({
          factor: 'multiple_failures',
          weight: 15,
          description: `${recentFailures} failed attempts in last hour`,
          evidenceValue: { failureCount: recentFailures },
        });
        riskScore += 15;
      }

      // Check 7: VPN/Proxy detection
      if (payment.isVpnDetected || payment.isProxyDetected) {
        factors.push({
          factor: 'vpn_proxy_usage',
          weight: 25,
          description: 'Transaction via VPN or proxy',
          evidenceValue: { vpn: payment.isVpnDetected, proxy: payment.isProxyDetected },
        });
        riskScore += 25;
      }

      // Cap risk score at 100
      riskScore = Math.min(riskScore, 100);

      // Determine risk level
      let riskLevel = 'low';
      if (riskScore >= 70) {
        riskLevel = 'critical';
      } else if (riskScore >= 50) {
        riskLevel = 'high';
      } else if (riskScore >= 30) {
        riskLevel = 'medium';
      }

      const riskRecord = new FraudRisk({
        riskId: `FRAUD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        entityType: 'payment',
        entityId: payment._id,
        userId: payment.userId,
        overallRiskScore: riskScore,
        riskLevel,
        riskFactors: factors,
        status: 'pending_review',
      });

      await riskRecord.save();

      return {
        riskScore,
        riskLevel,
        factors,
        requiresApproval: riskScore >= 70,
      };
    } catch (error) {
      throw new Error(`Fraud detection failed: ${error.message}`);
    }
  }

  /**
   * Detect fraud for refund
   */
  static async detectRefundFraud(refund) {
    try {
      const factors = [];
      let riskScore = 0;

      // Check 1: Rapid refund request
      const recentRefunds = await FoodDeliveryRefund.countDocuments({
        userId: refund.userId,
        initiatedAt: {
          $gte: new Date(Date.now() - 604800000), // Last 7 days
        },
      });

      if (recentRefunds > 5) {
        factors.push({
          factor: 'frequent_refunds',
          weight: 30,
          description: `${recentRefunds} refunds in last 7 days`,
          evidenceValue: { count: recentRefunds },
        });
        riskScore += 30;
      }

      // Check 2: High refund percentage
      const userRefundRate = await this._getUserRefundRate(refund.userId);
      if (userRefundRate > 0.2) {
        factors.push({
          factor: 'high_refund_rate',
          weight: 25,
          description: `${(userRefundRate * 100).toFixed(1)}% of orders refunded`,
          evidenceValue: { rate: userRefundRate },
        });
        riskScore += 25;
      }

      // Check 3: High refund amount
      if (refund.refundAmount > 5000) {
        factors.push({
          factor: 'high_amount',
          weight: 15,
          description: `High refund amount: ${refund.refundAmount}`,
          evidenceValue: { amount: refund.refundAmount },
        });
        riskScore += 15;
      }

      // Check 4: Refund shortly after order
      if (refund.metadata?.daysSinceOrder < 1) {
        factors.push({
          factor: 'immediate_refund',
          weight: 20,
          description: 'Refund requested within 1 day of order',
          evidenceValue: { daysSinceOrder: refund.metadata.daysSinceOrder },
        });
        riskScore += 20;
      }

      // Check 5: Suspicious reason
      const highRiskReasons = ['customer_request', 'other'];
      if (highRiskReasons.includes(refund.reason)) {
        factors.push({
          factor: 'suspicious_reason',
          weight: 15,
          description: `Reason: ${refund.reason}`,
          evidenceValue: { reason: refund.reason },
        });
        riskScore += 15;
      }

      riskScore = Math.min(riskScore, 100);

      let riskLevel = 'low';
      if (riskScore >= 70) {
        riskLevel = 'critical';
      } else if (riskScore >= 50) {
        riskLevel = 'high';
      } else if (riskScore >= 30) {
        riskLevel = 'medium';
      }

      const riskRecord = new FraudRisk({
        riskId: `FRAUD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        entityType: 'refund',
        entityId: refund._id,
        userId: refund.userId,
        overallRiskScore: riskScore,
        riskLevel,
        riskFactors: factors,
        status: 'pending_review',
      });

      await riskRecord.save();

      return {
        riskScore,
        riskLevel,
        factors,
        requiresApproval: riskScore >= 70,
      };
    } catch (error) {
      throw new Error(`Refund fraud detection failed: ${error.message}`);
    }
  }

  /**
   * Review fraud detection
   */
  static async reviewFraudCase(riskId, reviewedBy, resolution) {
    try {
      const riskCase = await FraudRisk.findById(riskId);
      if (!riskCase) {
        throw new Error('Fraud case not found');
      }

      riskCase.status = resolution;
      riskCase.reviewedBy = reviewedBy;
      riskCase.reviewedAt = new Date();

      if (resolution === 'appealed') {
        riskCase.appeal = {
          appealedAt: new Date(),
          appealedBy: reviewedBy,
          appealStatus: 'pending',
        };
      }

      await riskCase.save();

      return riskCase;
    } catch (error) {
      throw new Error(`Fraud review failed: ${error.message}`);
    }
  }

  /**
   * Get fraud risk summary
   */
  static async getRiskSummary(timeframe = '24h') {
    try {
      const dateFilter = this._getDateFilter(timeframe);

      const summary = {
        totalRisksDetected: 0,
        byLevel: { low: 0, medium: 0, high: 0, critical: 0 },
        byEntity: { payment: 0, refund: 0, wallet: 0, user: 0 },
        reviewedCases: 0,
        pendingReview: 0,
      };

      const risks = await FraudRisk.find({
        detectedAt: { $gte: dateFilter },
      });

      summary.totalRisksDetected = risks.length;

      risks.forEach((risk) => {
        summary.byLevel[risk.riskLevel] += 1;
        summary.byEntity[risk.entityType] += 1;

        if (risk.status === 'pending_review') {
          summary.pendingReview += 1;
        } else if (['approved', 'rejected', 'appealed'].includes(risk.status)) {
          summary.reviewedCases += 1;
        }
      });

      return summary;
    } catch (error) {
      throw new Error(`Failed to get risk summary: ${error.message}`);
    }
  }

  /**
   * Private: Get user average amount
   */
  static async _getUserAverageAmount(userId) {
    const result = await FoodDeliveryPayment.aggregate([
      { $match: { userId, status: 'success' } },
      { $group: { _id: null, avgAmount: { $avg: '$amount' } } },
    ]);

    return result[0]?.avgAmount || 0;
  }

  /**
   * Private: Check if new device
   */
  static async _isNewDevice(userId, payment) {
    const existing = await FoodDeliveryPayment.findOne({
      userId,
      'deviceId': payment.deviceId,
    });

    return !existing;
  }

  /**
   * Private: Check geographic anomaly
   */
  static async _checkGeographicAnomaly(payment) {
    const recentLocations = await FoodDeliveryPayment.find({
      userId: payment.userId,
      initiatedAt: {
        $gte: new Date(Date.now() - 86400000),
      },
    }).select('location').limit(5);

    const locations = recentLocations.map((p) => p.location).filter((l) => l);
    return locations.length > 0 && !locations.includes(payment.location);
  }

  /**
   * Private: Get user refund rate
   */
  static async _getUserRefundRate(userId) {
    const totalOrders = await FoodDeliveryPayment.countDocuments({
      userId,
      status: 'success',
    });

    const totalRefunds = await FoodDeliveryRefund.countDocuments({
      userId,
      status: 'completed',
    });

    return totalOrders > 0 ? totalRefunds / totalOrders : 0;
  }

  /**
   * Private: Get date filter
   */
  static _getDateFilter(timeframe) {
    const now = new Date();

    switch (timeframe) {
      case '1h':
        return new Date(now - 3600000);
      case '24h':
        return new Date(now - 86400000);
      case '7d':
        return new Date(now - 604800000);
      case '30d':
        return new Date(now - 2592000000);
      default:
        return new Date(now - 86400000);
    }
  }
}

module.exports = FraudDetectionService;
