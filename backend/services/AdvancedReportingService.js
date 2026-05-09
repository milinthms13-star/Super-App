/**
 * AdvancedReportingService.js
 * Custom reports, PDF generation, scheduling
 */

const logger = require('../config/logger');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Report = require('../models/Report');
const PDFDocument = require('pdfkit');
const fs = require('fs');

class AdvancedReportingService {
  /**
   * Generate sales report
   */
  static async generateSalesReport(startDate, endDate, groupBy = 'daily') {
    try {
      const grouping = {
        daily: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        weekly: { $week: '$createdAt' },
        monthly: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
      };

      const sales = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
            status: { $in: ['confirmed', 'delivered'] }
          }
        },
        {
          $group: {
            _id: grouping[groupBy] || grouping.daily,
            totalRevenue: { $sum: '$totalAmount' },
            totalOrders: { $sum: 1 },
            avgOrderValue: { $avg: '$totalAmount' },
            maxOrderValue: { $max: '$totalAmount' },
            minOrderValue: { $min: '$totalAmount' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const report = await Report.create({
        type: 'sales',
        title: `Sales Report (${startDate} to ${endDate})`,
        period: { startDate, endDate },
        groupBy,
        data: sales,
        generatedAt: new Date()
      });

      logger.info(`Sales report generated: ${report._id}`);
      return { success: true, report };
    } catch (error) {
      logger.error(`Generate sales report error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate vendor performance report
   */
  static async generateVendorPerformanceReport(vendorId, startDate, endDate) {
    try {
      const orders = await Order.aggregate([
        {
          $match: {
            vendorId,
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalOrders: { $sum: 1 },
            avgRating: { $avg: '$rating' }
          }
        }
      ]);

      const products = await Product.find({ vendorId });
      const avgProductRating = products.reduce((sum, p) => sum + (p.averageRating || 0), 0) / products.length;

      const report = await Report.create({
        type: 'vendor-performance',
        vendorId,
        title: `Vendor Performance Report - ${vendorId}`,
        period: { startDate, endDate },
        data: {
          orders: orders[0] || {},
          productCount: products.length,
          avgProductRating
        },
        generatedAt: new Date()
      });

      logger.info(`Vendor report generated: ${report._id}`);
      return { success: true, report };
    } catch (error) {
      logger.error(`Generate vendor report error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate customer analytics report
   */
  static async generateCustomerAnalyticsReport(startDate, endDate) {
    try {
      const customers = await User.find({
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        role: 'user'
      });

      const orders = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
          }
        },
        {
          $group: {
            _id: '$buyerId',
            orderCount: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' }
          }
        }
      ]);

      const report = await Report.create({
        type: 'customer-analytics',
        title: `Customer Analytics Report (${startDate} to ${endDate})`,
        period: { startDate, endDate },
        data: {
          newCustomers: customers.length,
          returningCustomers: orders.length,
          avgCustomerValue: orders.reduce((sum, o) => sum + o.totalSpent, 0) / orders.length
        },
        generatedAt: new Date()
      });

      logger.info(`Customer report generated: ${report._id}`);
      return { success: true, report };
    } catch (error) {
      logger.error(`Generate customer report error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate PDF report
   */
  static async generatePDFReport(reportId) {
    try {
      const report = await Report.findById(reportId);
      if (!report) throw new Error('Report not found');

      const doc = new PDFDocument();
      const fileName = `report-${reportId}-${Date.now()}.pdf`;
      const filePath = `./reports/${fileName}`;

      // Create reports directory if needed
      if (!fs.existsSync('./reports')) fs.mkdirSync('./reports');

      doc.pipe(fs.createWriteStream(filePath));

      // Title
      doc.fontSize(20).text(report.title, 100, 100);
      doc.fontSize(12).text(`Generated: ${report.generatedAt}`, 100, 140);

      // Period
      if (report.period) {
        doc.text(`Period: ${report.period.startDate} to ${report.period.endDate}`, 100, 160);
      }

      // Data table
      doc.fontSize(10);
      let y = 200;
      if (Array.isArray(report.data)) {
        const headers = Object.keys(report.data[0] || {});
        headers.forEach((h, i) => doc.text(h, 100 + i * 100, y));
        y += 20;

        report.data.forEach(row => {
          headers.forEach((h, i) => {
            doc.text(String(row[h]), 100 + i * 100, y);
          });
          y += 20;
        });
      }

      doc.end();

      logger.info(`PDF report generated: ${filePath}`);
      return { success: true, fileName, filePath };
    } catch (error) {
      logger.error(`Generate PDF error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Schedule report generation
   */
  static async scheduleReportGeneration(reportType, schedule, recipients) {
    try {
      const scheduledReport = await Report.create({
        type: reportType,
        scheduled: true,
        schedule, // cron: '0 0 * * 1' = every Monday at midnight
        recipients,
        nextRun: new Date(),
        createdAt: new Date()
      });

      logger.info(`Report scheduled: ${scheduledReport._id}`);
      return { success: true, scheduledReport };
    } catch (error) {
      logger.error(`Schedule report error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get report history
   */
  static async getReportHistory(reportType = null, limit = 50) {
    try {
      let query = {};
      if (reportType) query.type = reportType;

      const reports = await Report.find(query)
        .sort({ generatedAt: -1 })
        .limit(limit);

      return { success: true, reports, count: reports.length };
    } catch (error) {
      logger.error(`Get report history error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export report as CSV
   */
  static async exportReportAsCSV(reportId) {
    try {
      const report = await Report.findById(reportId);
      if (!report) throw new Error('Report not found');

      let csv = `${report.title}\n`;
      csv += `Generated: ${report.generatedAt}\n\n`;

      if (Array.isArray(report.data)) {
        const headers = Object.keys(report.data[0] || {});
        csv += headers.join(',') + '\n';

        report.data.forEach(row => {
          csv += headers.map(h => row[h]).join(',') + '\n';
        });
      }

      const fileName = `report-${reportId}-${Date.now()}.csv`;
      const filePath = `./exports/${fileName}`;

      if (!fs.existsSync('./exports')) fs.mkdirSync('./exports');
      fs.writeFileSync(filePath, csv);

      logger.info(`Report exported as CSV: ${filePath}`);
      return { success: true, fileName, filePath };
    } catch (error) {
      logger.error(`Export CSV error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Custom report builder
   */
  static async createCustomReport(name, metrics, filters) {
    try {
      const report = await Report.create({
        type: 'custom',
        title: name,
        metrics,
        filters,
        createdAt: new Date()
      });

      logger.info(`Custom report created: ${report._id}`);
      return { success: true, report };
    } catch (error) {
      logger.error(`Create custom report error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Email report
   */
  static async emailReport(reportId, recipients) {
    try {
      const report = await Report.findById(reportId);
      if (!report) throw new Error('Report not found');

      // Mock email sending
      logger.info(`Report emailed to: ${recipients.join(', ')}`);

      return {
        success: true,
        message: `Report sent to ${recipients.length} recipient(s)`,
        recipients
      };
    } catch (error) {
      logger.error(`Email report error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = AdvancedReportingService;
