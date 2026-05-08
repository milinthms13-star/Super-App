const PaymentAnalyticsService = require('../services/PaymentAnalyticsService');
const WalletAnalyticsService = require('../services/WalletAnalyticsService');
const RefundAnalyticsService = require('../services/RefundAnalyticsService');
const FraudDetectionService = require('../services/FraudDetectionService');

class AnalyticsController {
  /**
   * Get payment analytics dashboard
   */
  static async getPaymentDashboard(req, res) {
    try {
      const { startDate, endDate, period = 'daily' } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: startDate, endDate',
        });
      }

      const [analytics, methodComparison, fraudMetrics, successRate] = await Promise.all([
        PaymentAnalyticsService.getAnalyticsRange(startDate, endDate, period),
        PaymentAnalyticsService.getPaymentMethodComparison(startDate, endDate),
        PaymentAnalyticsService.getFraudMetrics(startDate, endDate),
        PaymentAnalyticsService.getSuccessRateMetrics(startDate, endDate),
      ]);

      res.json({
        success: true,
        data: {
          analytics,
          methodComparison,
          fraudMetrics,
          successRate,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get wallet analytics dashboard
   */
  static async getWalletDashboard(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: startDate, endDate',
        });
      }

      const [analytics, health, cashback, transactions, segmentation] = await Promise.all([
        WalletAnalyticsService.getAnalyticsRange(startDate, endDate),
        WalletAnalyticsService.getWalletHealth(startDate, endDate),
        WalletAnalyticsService.getCashbackMetrics(startDate, endDate),
        WalletAnalyticsService.getTransactionVolume(startDate, endDate),
        WalletAnalyticsService.getUserSegmentation(startDate, endDate),
      ]);

      res.json({
        success: true,
        data: {
          analytics,
          health,
          cashback,
          transactions,
          segmentation,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get refund analytics dashboard
   */
  static async getRefundDashboard(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: startDate, endDate',
        });
      }

      const [analytics, rates, reasons, methods, approval] = await Promise.all([
        RefundAnalyticsService.getAnalyticsRange(startDate, endDate),
        RefundAnalyticsService.getRefundRateMetrics(startDate, endDate),
        RefundAnalyticsService.getRefundReasonAnalysis(startDate, endDate),
        RefundAnalyticsService.getRefundMethodDistribution(startDate, endDate),
        RefundAnalyticsService.getApprovalMetrics(startDate, endDate),
      ]);

      res.json({
        success: true,
        data: {
          analytics,
          rates,
          reasons,
          methods,
          approval,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get fraud risk dashboard
   */
  static async getFraudDashboard(req, res) {
    try {
      const { timeframe = '24h' } = req.query;

      const summary = await FraudDetectionService.getRiskSummary(timeframe);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get executive summary
   */
  static async getExecutiveSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: startDate, endDate',
        });
      }

      const [paymentSummary, walletHealth, refundMetrics, fraud] = await Promise.all([
        PaymentAnalyticsService.getCurrentAnalytics('daily'),
        WalletAnalyticsService.getWalletHealth(startDate, endDate),
        RefundAnalyticsService.getRefundRateMetrics(startDate, endDate),
        FraudDetectionService.getRiskSummary('24h'),
      ]);

      res.json({
        success: true,
        data: {
          payments: paymentSummary,
          wallet: walletHealth,
          refunds: refundMetrics,
          fraud,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get fraud risk cases
   */
  static async getFraudCases(req, res) {
    try {
      const { limit = 50, skip = 0, status, riskLevel } = req.query;

      // Note: Implement FraudRisk.find with filters
      res.json({
        success: true,
        data: [],
        message: 'Fraud cases endpoint',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Review fraud case
   */
  static async reviewFraudCase(req, res) {
    try {
      const { caseId } = req.params;
      const { resolution } = req.body;
      const reviewedBy = req.user?.userId;

      if (!caseId || !resolution) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
        });
      }

      const result = await FraudDetectionService.reviewFraudCase(
        caseId,
        reviewedBy,
        resolution
      );

      res.json({
        success: true,
        data: result,
        message: 'Fraud case reviewed',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Export analytics to CSV/PDF
   */
  static async exportAnalytics(req, res) {
    try {
      const { type, format = 'csv', startDate, endDate } = req.query;

      if (!type || !['csv', 'pdf'].includes(format)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid type or format',
        });
      }

      // Note: Implement actual export logic
      res.json({
        success: true,
        message: `${type} analytics export initiated (${format})`,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get trending metrics
   */
  static async getTrendingMetrics(req, res) {
    try {
      const { metric, days = 7 } = req.query;

      if (!metric) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: metric',
        });
      }

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      let trend = [];

      if (metric === 'payment_success_rate') {
        trend = await PaymentAnalyticsService.getSuccessRateMetrics(startDate, endDate);
      } else if (metric === 'refund_rate') {
        trend = await RefundAnalyticsService.getRefundRateMetrics(startDate, endDate);
      } else if (metric === 'wallet_balance') {
        trend = await WalletAnalyticsService.getWalletHealth(startDate, endDate);
      }

      res.json({
        success: true,
        data: trend,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = AnalyticsController;
