const CustomReport = require('../models/CustomReport');
const PaymentAnalyticsService = require('../services/PaymentAnalyticsService');
const WalletAnalyticsService = require('../services/WalletAnalyticsService');
const RefundAnalyticsService = require('../services/RefundAnalyticsService');
const FraudDetectionService = require('../services/FraudDetectionService');

class ReportController {
  /**
   * Create custom report
   */
  static async createReport(req, res) {
    try {
      const { reportName, reportType, frequency, metrics, dimensions, filters } = req.body;
      const createdBy = req.user?.userId;

      if (!reportName || !reportType || !metrics || !Array.isArray(metrics)) {
        return res.status(400).json({
          success: false,
          message: 'Missing or invalid required fields',
        });
      }

      const report = new CustomReport({
        reportName,
        reportType,
        frequency: frequency || 'once',
        metrics,
        dimensions: dimensions || [],
        filters: filters || {},
        createdBy,
        status: 'scheduled',
      });

      await report.save();

      res.status(201).json({
        success: true,
        data: report,
        message: 'Report created successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get user's reports
   */
  static async getReports(req, res) {
    try {
      const { limit = 20, skip = 0, status } = req.query;
      const createdBy = req.user?.userId;

      const query = { createdBy };
      if (status) {
        query.status = status;
      }

      const [reports, total] = await Promise.all([
        CustomReport.find(query)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip(parseInt(skip)),
        CustomReport.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: reports,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
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
   * Get report by ID
   */
  static async getReportById(req, res) {
    try {
      const { reportId } = req.params;

      const report = await CustomReport.findById(reportId);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found',
        });
      }

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update report configuration
   */
  static async updateReport(req, res) {
    try {
      const { reportId } = req.params;
      const { reportName, frequency, metrics, dimensions, filters } = req.body;
      const userId = req.user?.userId;

      const report = await CustomReport.findById(reportId);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found',
        });
      }

      if (report.createdBy.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to modify this report',
        });
      }

      if (reportName) report.reportName = reportName;
      if (frequency) report.frequency = frequency;
      if (metrics) report.metrics = metrics;
      if (dimensions) report.dimensions = dimensions;
      if (filters) report.filters = filters;

      await report.save();

      res.json({
        success: true,
        data: report,
        message: 'Report updated successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Generate report
   */
  static async generateReport(req, res) {
    try {
      const { reportId } = req.params;

      const report = await CustomReport.findById(reportId);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found',
        });
      }

      report.status = 'generating';
      await report.save();

      // Collect data based on report type
      let data = {};

      if (report.reportType === 'payment') {
        data = await PaymentAnalyticsService.getAnalyticsRange(
          report.dateRange.startDate,
          report.dateRange.endDate,
          'daily'
        );
      } else if (report.reportType === 'wallet') {
        data = await WalletAnalyticsService.getAnalyticsRange(
          report.dateRange.startDate,
          report.dateRange.endDate
        );
      } else if (report.reportType === 'refund') {
        data = await RefundAnalyticsService.getAnalyticsRange(
          report.dateRange.startDate,
          report.dateRange.endDate
        );
      }

      report.dataPoints = data;
      report.status = 'generated';
      report.lastGeneratedAt = new Date();
      report.nextGenerationAt = this._calculateNextGeneration(report.frequency);

      await report.save();

      res.json({
        success: true,
        data: report,
        message: 'Report generated successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get report data
   */
  static async getReportData(req, res) {
    try {
      const { reportId } = req.params;
      const { format = 'json' } = req.query;

      const report = await CustomReport.findById(reportId);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found',
        });
      }

      if (!report.dataPoints || report.dataPoints.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Report has no data. Generate it first.',
        });
      }

      // Note: In production, implement CSV/PDF conversion
      if (format === 'csv') {
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename="report.csv"');
      } else if (format === 'pdf') {
        res.header('Content-Type', 'application/pdf');
        res.header('Content-Disposition', 'attachment; filename="report.pdf"');
      }

      res.json({
        success: true,
        data: report.dataPoints,
        format,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Send report to recipients
   */
  static async sendReport(req, res) {
    try {
      const { reportId } = req.params;
      const { recipients, includeFormat = 'pdf' } = req.body;

      if (!reportId || !recipients || !Array.isArray(recipients)) {
        return res.status(400).json({
          success: false,
          message: 'Missing or invalid required fields',
        });
      }

      const report = await CustomReport.findById(reportId);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found',
        });
      }

      // Note: In production, implement email sending
      report.recipients = recipients;
      report.outputFormats = [includeFormat];

      await report.save();

      res.json({
        success: true,
        data: report,
        message: `Report sent to ${recipients.length} recipient(s)`,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Delete report
   */
  static async deleteReport(req, res) {
    try {
      const { reportId } = req.params;
      const userId = req.user?.userId;

      const report = await CustomReport.findById(reportId);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found',
        });
      }

      if (report.createdBy.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to delete this report',
        });
      }

      await CustomReport.deleteOne({ _id: reportId });

      res.json({
        success: true,
        message: 'Report deleted successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get report templates
   */
  static async getTemplates(req, res) {
    try {
      const templates = await CustomReport.find({
        isTemplate: true,
      });

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Private: Calculate next generation time
   */
  static _calculateNextGeneration(frequency) {
    const now = new Date();

    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  }
}

module.exports = ReportController;
