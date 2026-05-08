/**
 * MLFraudDetectionService
 * Manages ML model loading, inference, and fraud scoring
 * Interfaces with trained ML models for real-time fraud detection
 */

const FraudMLModel = require('../models/FraudMLModel');
const FraudAlert = require('../models/FraudAlert');
const FraudRisk = require('../models/FraudRisk');
const logger = require('../utils/logger');

class MLFraudDetectionService {
  constructor() {
    this.activeModels = {};
    this.modelCache = new Map();
    this.lastModelUpdate = null;
  }

  /**
   * Load all active models from database
   */
  async loadActiveModels() {
    try {
      const models = await FraudMLModel.find({
        status: 'active',
        active: true,
      }).sort({ version: -1 });

      if (!models.length) {
        logger.warn('No active ML models found');
        return;
      }

      for (const model of models) {
        this.activeModels[model.modelId] = {
          id: model.modelId,
          name: model.modelName,
          type: model.modelType,
          version: model.version,
          features: model.features,
          thresholds: model.performanceThresholds,
          featureImportance: model.featureImportance,
          tags: model.tags,
        };
      }

      this.lastModelUpdate = new Date();
      logger.info(`Loaded ${models.length} active ML models`);
    } catch (error) {
      logger.error('Error loading ML models:', error);
      throw error;
    }
  }

  /**
   * Get ML fraud score for a transaction
   * In production, this would call actual ML inference engine
   */
  async getMLFraudScore(transaction, modelId = null) {
    try {
      // Use specified model or most recent active model
      let modelToUse = null;

      if (modelId) {
        modelToUse = await FraudMLModel.findOne({
          modelId,
          status: 'active',
          active: true,
        });
      } else {
        modelToUse = await FraudMLModel.findOne({
          status: 'active',
          active: true,
        }).sort({ createdAt: -1 });
      }

      if (!modelToUse) {
        logger.warn('No active ML model available for inference');
        return this._fallbackFraudScore(transaction);
      }

      // Extract features from transaction
      const features = this._extractFeatures(transaction, modelToUse.features);

      // Simulate ML inference (in production, call actual ML service)
      const riskScore = this._simulateMLInference(features, modelToUse);
      const confidence = this._calculateConfidence(features, modelToUse);

      // Identify triggered indicators
      const indicators = this._identifyIndicators(features, riskScore);

      return {
        riskScore,
        confidence,
        indicators,
        modelId: modelToUse.modelId,
        modelVersion: modelToUse.version,
        category: this._categorizeFraud(indicators, riskScore),
        recommendation: this._getRecommendation(riskScore, modelToUse.performanceThresholds),
      };
    } catch (error) {
      logger.error('Error getting ML fraud score:', error);
      return this._fallbackFraudScore(transaction);
    }
  }

  /**
   * Extract features from transaction for ML model
   */
  _extractFeatures(transaction, requiredFeatures) {
    const features = {};

    // Amount features
    features.transaction_amount = transaction.amount || 0;
    features.amount_category = this._categorizeAmount(transaction.amount);
    features.is_high_amount = transaction.amount > 10000 ? 1 : 0;

    // Temporal features
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    features.hour_of_day = hour;
    features.day_of_week = dayOfWeek;
    features.is_outside_hours = hour < 6 || hour > 22 ? 1 : 0;

    // Payment method features
    features.payment_method = transaction.paymentMethod || 'unknown';
    features.is_new_payment_method = transaction.isNewPaymentMethod ? 1 : 0;

    // Device features
    features.is_new_device = transaction.isNewDevice ? 1 : 0;
    features.device_trust_score = transaction.deviceTrustScore || 0.5;

    // Location features
    features.is_vpn_detected = transaction.vpnDetected ? 1 : 0;
    features.is_proxy_detected = transaction.proxyDetected ? 1 : 0;
    features.country_risk_score = this._getCountryRiskScore(transaction.country);

    // Velocity features
    features.transactions_last_hour = transaction.transactionsLastHour || 0;
    features.transactions_last_day = transaction.transactionsLastDay || 0;
    features.refunds_last_day = transaction.refundsLastDay || 0;

    // User features
    features.account_age_days = transaction.accountAgeDays || 0;
    features.is_new_account = transaction.accountAgeDays < 30 ? 1 : 0;
    features.user_risk_history = transaction.userRiskHistory || 0;

    // Merchant features
    features.merchant_risk_score = transaction.merchantRiskScore || 0;
    features.is_high_risk_merchant = transaction.merchantRiskScore > 0.7 ? 1 : 0;

    return features;
  }

  /**
   * Simulate ML model inference
   * In production, integrate with actual ML model/service
   */
  _simulateMLInference(features, model) {
    // Weighted feature scoring
    const weights = {
      is_new_device: 0.15,
      is_new_account: 0.12,
      transaction_amount: 0.10,
      is_outside_hours: 0.08,
      transactions_last_hour: 0.08,
      is_vpn_detected: 0.12,
      merchant_risk_score: 0.10,
      refunds_last_day: 0.10,
      country_risk_score: 0.07,
      is_new_payment_method: 0.08,
    };

    let score = 0;

    // Amount deviation
    if (features.transaction_amount > 5000) {
      score += 0.15;
    }

    // New device
    if (features.is_new_device) {
      score += 0.20;
    }

    // New account
    if (features.is_new_account) {
      score += 0.18;
    }

    // Outside normal hours
    if (features.is_outside_hours) {
      score += 0.12;
    }

    // High velocity
    if (features.transactions_last_hour > 3) {
      score += 0.15;
    }

    // VPN/Proxy
    if (features.is_vpn_detected || features.is_proxy_detected) {
      score += 0.18;
    }

    // Merchant risk
    score += features.merchant_risk_score * 0.15;

    // Refund abuse
    if (features.refunds_last_day > 5) {
      score += 0.12;
    }

    // Country risk
    score += features.country_risk_score * 0.08;

    // Normalize to 0-100
    return Math.min(score * 100, 100);
  }

  /**
   * Calculate confidence score
   */
  _calculateConfidence(features, model) {
    // Base confidence
    let confidence = 0.75;

    // Increase confidence for strong signals
    if (features.is_new_device && features.is_new_account) {
      confidence = 0.92;
    } else if (features.is_new_device || features.is_new_account) {
      confidence = 0.88;
    }

    // Decrease confidence for ambiguous cases
    if (features.transactions_last_hour === 0) {
      confidence *= 0.9;
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Identify triggered fraud indicators
   */
  _identifyIndicators(features, riskScore) {
    const indicators = [];

    if (features.transaction_amount > 5000) {
      indicators.push({
        indicator: 'unusual_amount',
        description: `High transaction amount: ${features.transaction_amount}`,
        weight: 0.15,
        detected: true,
      });
    }

    if (features.is_new_device) {
      indicators.push({
        indicator: 'new_device',
        description: 'Transaction from new device',
        weight: 0.20,
        detected: true,
      });
    }

    if (features.is_new_account) {
      indicators.push({
        indicator: 'new_account',
        description: 'New account activity',
        weight: 0.18,
        detected: true,
      });
    }

    if (features.transactions_last_hour > 3) {
      indicators.push({
        indicator: 'velocity_abuse',
        description: `High transaction velocity: ${features.transactions_last_hour} in last hour`,
        weight: 0.15,
        detected: true,
      });
    }

    if (features.is_vpn_detected || features.is_proxy_detected) {
      indicators.push({
        indicator: 'vpn_proxy_usage',
        description: 'VPN or proxy usage detected',
        weight: 0.18,
        detected: true,
      });
    }

    if (features.merchant_risk_score > 0.7) {
      indicators.push({
        indicator: 'high_risk_merchant',
        description: `High-risk merchant: ${features.merchant_risk_score}`,
        weight: 0.15,
        detected: true,
      });
    }

    if (features.refunds_last_day > 5) {
      indicators.push({
        indicator: 'refund_abuse',
        description: `High refund rate: ${features.refunds_last_day} in last day`,
        weight: 0.12,
        detected: true,
      });
    }

    return indicators;
  }

  /**
   * Categorize fraud type
   */
  _categorizeFraud(indicators, riskScore) {
    if (riskScore > 90) {
      const hasVelocity = indicators.some((i) => i.indicator === 'velocity_abuse');
      const hasDevice = indicators.some((i) => i.indicator === 'new_device');
      const hasRefund = indicators.some((i) => i.indicator === 'refund_abuse');

      if (hasVelocity) return 'account_takeover';
      if (hasRefund) return 'refund_abuse';
      if (hasDevice && riskScore > 85) return 'money_mule';
      return 'account_takeover';
    }

    if (riskScore > 70) {
      return 'suspicious_activity';
    }

    return 'low_risk';
  }

  /**
   * Get recommendation based on risk score
   */
  _getRecommendation(riskScore, thresholds) {
    if (riskScore >= thresholds.autoBlockThreshold) {
      return 'auto_block';
    }

    if (riskScore >= thresholds.riskScoreThreshold) {
      return 'manual_review';
    }

    if (riskScore >= thresholds.riskScoreThreshold * 0.7) {
      return 'challenge_user';
    }

    return 'approve';
  }

  /**
   * Fallback fraud score if no model available
   */
  _fallbackFraudScore(transaction) {
    const baseScore = 30;
    let score = baseScore;

    if (transaction.isNewDevice) score += 15;
    if (transaction.isNewPaymentMethod) score += 10;
    if (transaction.accountAgeDays < 30) score += 12;
    if (transaction.amount > 5000) score += 10;
    if (transaction.transactionsLastHour > 3) score += 15;

    return {
      riskScore: Math.min(score, 100),
      confidence: 0.6,
      indicators: [],
      modelId: null,
      category: 'fallback_assessment',
      recommendation: score > 70 ? 'manual_review' : 'approve',
    };
  }

  /**
   * Helper: Categorize transaction amount
   */
  _categorizeAmount(amount) {
    if (amount < 100) return 'micro';
    if (amount < 500) return 'small';
    if (amount < 2000) return 'medium';
    if (amount < 5000) return 'large';
    return 'xlarge';
  }

  /**
   * Helper: Get country risk score
   */
  _getCountryRiskScore(country) {
    const highRiskCountries = ['XX', 'YY', 'ZZ'];
    return highRiskCountries.includes(country) ? 0.8 : 0.2;
  }

  /**
   * Update model performance metrics
   */
  async updateModelMetrics(modelId, correct, total, fraudDetected, falseAlert) {
    try {
      const model = await FraudMLModel.findOne({ modelId });
      if (model) {
        await model.updateProductionMetrics(correct, total, fraudDetected, falseAlert);
        logger.info(`Updated metrics for model ${modelId}`);
      }
    } catch (error) {
      logger.error('Error updating model metrics:', error);
    }
  }

  /**
   * Get top models by performance
   */
  async getTopModels(limit = 5) {
    try {
      return await FraudMLModel.find({ status: 'active', active: true })
        .sort({ 'trainingMetrics.auc': -1 })
        .limit(limit);
    } catch (error) {
      logger.error('Error getting top models:', error);
      throw error;
    }
  }

  /**
   * Compare models performance
   */
  async compareModels(modelIds) {
    try {
      return await FraudMLModel.find({
        modelId: { $in: modelIds },
        status: 'active',
      });
    } catch (error) {
      logger.error('Error comparing models:', error);
      throw error;
    }
  }

  /**
   * Get model by ID
   */
  async getModel(modelId) {
    try {
      return await FraudMLModel.findOne({ modelId });
    } catch (error) {
      logger.error('Error getting model:', error);
      throw error;
    }
  }

  /**
   * Create new model
   */
  async createModel(modelData) {
    try {
      const model = new FraudMLModel(modelData);
      await model.save();
      logger.info(`Created new ML model: ${model.modelId}`);
      return model;
    } catch (error) {
      logger.error('Error creating model:', error);
      throw error;
    }
  }

  /**
   * Deprecate old model
   */
  async deprecateModel(modelId) {
    try {
      const model = await FraudMLModel.findOne({ modelId });
      if (model) {
        model.status = 'deprecated';
        await model.save();
        logger.info(`Deprecated model: ${modelId}`);
      }
    } catch (error) {
      logger.error('Error deprecating model:', error);
      throw error;
    }
  }
}

module.exports = new MLFraudDetectionService();
