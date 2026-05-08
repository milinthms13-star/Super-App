/**
 * MLFraudController
 * Handles ML model management and fraud scoring endpoints
 */

const MLFraudDetectionService = require('../services/MLFraudDetectionService');
const BehavioralAnalysisService = require('../services/BehavioralAnalysisService');
const FraudAlertService = require('../services/FraudAlertService');
const logger = require('../utils/logger');

class MLFraudController {
  /**
   * GET /api/v1/fraud/ml/models
   * List available ML models
   */
  async listModels(req, res) {
    try {
      const models = await MLFraudDetectionService.getTopModels(10);

      return res.json({
        success: true,
        data: {
          models: models.map((m) => ({
            modelId: m.modelId,
            name: m.modelName,
            version: m.version,
            type: m.modelType,
            status: m.status,
            trainingMetrics: m.trainingMetrics,
            productionMetrics: m.productionMetrics,
            isReady: m.isReady,
          })),
          totalModels: models.length,
        },
      });
    } catch (error) {
      logger.error('Error listing models:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to list models',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/fraud/ml/models
   * Create or upload new ML model
   */
  async createModel(req, res) {
    try {
      const { modelName, modelType, version, features, trainingMetrics, hyperparameters } = req.body;

      if (!modelName || !modelType || !version) {
        return res.status(400).json({
          success: false,
          message: 'modelName, modelType, and version are required',
        });
      }

      const modelData = {
        modelId: `ml_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        modelName,
        modelType,
        version,
        features: features || [],
        trainingMetrics: trainingMetrics || {},
        hyperparameters: hyperparameters || {},
        status: 'training',
        createdBy: req.user?.userId || 'system',
        tags: ['ml_model', modelType],
      };

      const model = await MLFraudDetectionService.createModel(modelData);

      return res.status(201).json({
        success: true,
        data: model,
        message: 'Model created successfully',
      });
    } catch (error) {
      logger.error('Error creating model:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create model',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/fraud/ml/score
   * Get ML fraud score for transaction
   */
  async getTransactionScore(req, res) {
    try {
      const {
        amount,
        paymentMethod,
        isNewDevice,
        isNewPaymentMethod,
        deviceTrustScore,
        vpnDetected,
        proxyDetected,
        country,
        transactionsLastHour,
        transactionsLastDay,
        refundsLastDay,
        accountAgeDays,
        userRiskHistory,
        merchantRiskScore,
        modelId,
      } = req.body;

      if (!amount) {
        return res.status(400).json({
          success: false,
          message: 'amount is required',
        });
      }

      const transaction = {
        amount,
        paymentMethod,
        isNewDevice,
        isNewPaymentMethod,
        deviceTrustScore,
        vpnDetected,
        proxyDetected,
        country,
        transactionsLastHour: transactionsLastHour || 0,
        transactionsLastDay: transactionsLastDay || 0,
        refundsLastDay: refundsLastDay || 0,
        accountAgeDays: accountAgeDays || 0,
        userRiskHistory: userRiskHistory || 0,
        merchantRiskScore: merchantRiskScore || 0,
      };

      const mlScore = await MLFraudDetectionService.getMLFraudScore(transaction, modelId);

      // Get behavioral analysis
      const userId = req.user?.userId;
      const behavioralAnalysis = userId
        ? await BehavioralAnalysisService.analyzeTransactionBehavior(userId, transaction)
        : null;

      // Combined score
      const combinedRiskScore =
        mlScore.riskScore * 0.6 + (behavioralAnalysis?.riskScore || mlScore.riskScore) * 0.4;

      return res.json({
        success: true,
        data: {
          mlScore: {
            riskScore: mlScore.riskScore,
            confidence: mlScore.confidence,
            category: mlScore.category,
            indicators: mlScore.indicators,
            recommendation: mlScore.recommendation,
            modelId: mlScore.modelId,
            modelVersion: mlScore.modelVersion,
          },
          behavioralAnalysis: behavioralAnalysis
            ? {
                riskScore: behavioralAnalysis.riskScore,
                riskLevel: behavioralAnalysis.riskLevel,
                anomalies: behavioralAnalysis.anomalies,
                patternMatches: behavioralAnalysis.patternMatches,
              }
            : null,
          combinedRiskScore: Math.round(combinedRiskScore),
          finalRecommendation: this._getFinalRecommendation(
            combinedRiskScore,
            mlScore.recommendation
          ),
        },
      });
    } catch (error) {
      logger.error('Error getting fraud score:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to calculate fraud score',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/fraud/patterns/:userId
   * Get behavioral patterns for user
   */
  async getUserPatterns(req, res) {
    try {
      const { userId } = req.params;

      const summary = await BehavioralAnalysisService.getUserPatternsSummary(userId);

      return res.json({
        success: true,
        data: {
          userId,
          totalPatterns: summary.totalPatterns,
          activePatterns: summary.activePatterns,
          learningPatterns: summary.learningPatterns,
          stablePatterns: summary.stablePatterns,
          averageConfidence: summary.averageConfidence,
          patterns: summary.patterns.map((p) => ({
            patternId: p.patternId,
            patternType: p.patternType,
            entityType: p.entityType,
            status: p.status,
            isReady: p.isReady,
            confidence: p.learningStatus.confidenceScore,
            dataPoints: p.learningStatus.dataPoints,
            anomalyCount: p.anomalies.detectedCount,
          })),
        },
      });
    } catch (error) {
      logger.error('Error getting user patterns:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get patterns',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/fraud/patterns/:userId/anomalies
   * Get behavioral anomalies for user
   */
  async getUserAnomalies(req, res) {
    try {
      const { userId } = req.params;
      const { timeframe = '7d' } = req.query;

      const anomalies = await BehavioralAnalysisService.getUserAnomalies(userId, timeframe);

      return res.json({
        success: true,
        data: {
          userId,
          timeframe,
          totalAnomalies: anomalies.totalAnomalies,
          byCategory: anomalies.byCategory,
          byStatus: anomalies.byStatus,
          trend: anomalies.trend,
          recentAlerts: anomalies.alerts.slice(0, 10),
        },
      });
    } catch (error) {
      logger.error('Error getting user anomalies:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get anomalies',
        error: error.message,
      });
    }
  }

  /**
   * Helper: Get final recommendation
   */
  _getFinalRecommendation(riskScore, mlRecommendation) {
    if (riskScore > 85) return 'auto_block';
    if (riskScore > 70) return 'manual_review';
    if (riskScore > 50) return 'challenge_user';
    return 'approve';
  }
}

module.exports = new MLFraudController();
