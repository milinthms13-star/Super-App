/**
 * ComplianceReportingService.js
 * Comprehensive compliance and tax reporting for ridesharing platform
 * Includes regulatory reporting, tax filing support, audit trails
 */

const mongoose = require('mongoose');

class ComplianceReportingService {
  /**
   * Generate tax compliance report for a user
   */
  static async generateTaxReport(userId, year, month) {
    try {
      const collection = mongoose.connection.collection('payment_transactions');

      // Create date filter
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Get transactions for the period
      const transactions = await collection
        .find({
          userId,
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        })
        .toArray();

      // Calculate tax metrics
      let grossIncome = 0;
      let deductions = 0;
      let taxes = 0;
      let transactionCount = 0;

      transactions.forEach(txn => {
        grossIncome += txn.amount;
        // Assume 15% operational deductions
        deductions += txn.amount * 0.15;
        transactionCount++;
      });

      const taxableIncome = grossIncome - deductions;
      // Assume 30% tax rate
      taxes = Math.max(0, taxableIncome * 0.30);

      const taxReportId = `tax_${userId}_${year}_${month}_${Date.now()}`;

      // Store report in database
      const reportsCollection = mongoose.connection.collection('tax_reports');
      await reportsCollection.insertOne({
        taxReportId,
        userId,
        year,
        month,
        periodStart: startDate,
        periodEnd: endDate,
        grossIncome: grossIncome.toFixed(2),
        deductions: deductions.toFixed(2),
        taxableIncome: taxableIncome.toFixed(2),
        estimatedTaxes: taxes.toFixed(2),
        transactionCount,
        transactions: transactions.map(t => ({
          date: t.createdAt,
          amount: t.amount,
          category: t.category || 'ride'
        })),
        status: 'generated',
        createdAt: new Date()
      });

      return {
        success: true,
        message: 'Tax report generated successfully',
        data: {
          taxReportId,
          year,
          month,
          grossIncome: grossIncome.toFixed(2),
          deductions: deductions.toFixed(2),
          taxableIncome: taxableIncome.toFixed(2),
          estimatedTaxes: taxes.toFixed(2),
          transactionCount
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error generating tax report: ${error.message}`
      };
    }
  }

  /**
   * Get audit trail for regulatory compliance
   */
  static async getAuditTrail(filters = {}, page = 1, limit = 50) {
    try {
      const collection = mongoose.connection.collection('audit_trail');

      const query = {};
      if (filters.userId) query.userId = filters.userId;
      if (filters.action) query.action = filters.action;
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = filters.startDate;
        if (filters.endDate) query.createdAt.$lte = filters.endDate;
      }

      const skip = (page - 1) * limit;

      const auditRecords = await collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .toArray();

      const total = await collection.countDocuments(query);

      return {
        success: true,
        data: {
          auditRecords,
          pagination: {
            total,
            pages: Math.ceil(total / limit),
            currentPage: page
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching audit trail: ${error.message}`
      };
    }
  }

  /**
   * Log compliance event for audit purposes
   */
  static async logComplianceEvent(eventData) {
    try {
      const {
        userId,
        action,
        resourceType,
        resourceId,
        description,
        changes = {},
        ipAddress,
        userAgent
      } = eventData;

      const collection = mongoose.connection.collection('audit_trail');

      const auditRecord = {
        auditId: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action,
        resourceType,
        resourceId,
        description,
        changes,
        ipAddress,
        userAgent,
        createdAt: new Date()
      };

      await collection.insertOne(auditRecord);

      return {
        success: true,
        message: 'Compliance event logged',
        data: { auditId: auditRecord.auditId }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error logging compliance event: ${error.message}`
      };
    }
  }

  /**
   * Generate compliance report for regulatory submission
   */
  static async generateRegulatoryReport(startDate, endDate, reportType = 'all') {
    try {
      const transactionsCollection = mongoose.connection.collection('payment_transactions');
      const usersCollection = mongoose.connection.collection('users');
      const ratingsCollection = mongoose.connection.collection('ratings');

      // Get transaction metrics
      const transactions = await transactionsCollection
        .find({
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        })
        .toArray();

      const totalTransactions = transactions.length;
      const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
      const avgTransactionValue = totalRevenue / Math.max(totalTransactions, 1);

      // Get user metrics
      const activeUsers = await usersCollection.countDocuments({
        lastActivityAt: { $gte: startDate, $lte: endDate }
      });

      const drivers = await usersCollection.countDocuments({ userType: 'driver' });
      const riders = await usersCollection.countDocuments({ userType: 'rider' });

      // Get safety metrics
      const flaggedReviews = await ratingsCollection.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        flagCount: { $gt: 0 }
      });

      const cancellations = await transactionsCollection.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'cancelled'
      });

      const reportData = {
        reportId: `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        reportType,
        period: {
          startDate,
          endDate
        },
        metrics: {
          totalTransactions,
          totalRevenue: totalRevenue.toFixed(2),
          avgTransactionValue: avgTransactionValue.toFixed(2),
          activeUsers,
          totalDrivers: drivers,
          totalRiders: riders,
          flaggedReviews,
          cancellations,
          cancellationRate: (cancellations / Math.max(totalTransactions, 1) * 100).toFixed(2)
        },
        compliance: {
          status: 'compliant',
          issues: [],
          warnings: []
        },
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      // Perform compliance checks
      if (reportData.metrics.cancellationRate > 20) {
        reportData.compliance.warnings.push('High cancellation rate (>20%)');
      }

      if (reportData.metrics.flaggedReviews > 50) {
        reportData.compliance.warnings.push(`High number of flagged reviews (${reportData.metrics.flaggedReviews})`);
      }

      // Store report
      const reportsCollection = mongoose.connection.collection('regulatory_reports');
      await reportsCollection.insertOne(reportData);

      return {
        success: true,
        message: 'Regulatory report generated successfully',
        data: reportData
      };
    } catch (error) {
      return {
        success: false,
        message: `Error generating regulatory report: ${error.message}`
      };
    }
  }

  /**
   * Generate KYC (Know Your Customer) compliance report
   */
  static async generateKYCReport() {
    try {
      const usersCollection = mongoose.connection.collection('users');

      // Get KYC status breakdown
      const kycStatus = await usersCollection.aggregate([
        {
          $group: {
            _id: '$kycStatus', // verified, pending, rejected, not_started
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      // Get unverified users (potential issue)
      const unverifiedUsers = await usersCollection.countDocuments({
        kycStatus: { $in: ['pending', 'not_started'] }
      });

      const verifiedUsers = await usersCollection.countDocuments({
        kycStatus: 'verified'
      });

      const totalUsers = await usersCollection.countDocuments({});

      const report = {
        reportId: `kyc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        generatedAt: new Date(),
        summary: {
          totalUsers,
          verifiedUsers,
          unverifiedUsers,
          verificationRate: ((verifiedUsers / totalUsers) * 100).toFixed(2)
        },
        breakdown: Object.fromEntries(
          kycStatus.map(s => [s._id, s.count])
        ),
        compliance: {
          status: verifiedUsers / totalUsers >= 0.95 ? 'compliant' : 'needs_attention',
          requiredRate: 95,
          currentRate: ((verifiedUsers / totalUsers) * 100).toFixed(2)
        }
      };

      // Store report
      const reportsCollection = mongoose.connection.collection('kyc_reports');
      await reportsCollection.insertOne(report);

      return {
        success: true,
        message: 'KYC report generated',
        data: report
      };
    } catch (error) {
      return {
        success: false,
        message: `Error generating KYC report: ${error.message}`
      };
    }
  }

  /**
   * Get user compliance status
   */
  static async getUserComplianceStatus(userId) {
    try {
      const usersCollection = mongoose.connection.collection('users');
      const ratingsCollection = mongoose.collection('ratings');
      const transactionsCollection = mongoose.connection.collection('payment_transactions');

      const user = await usersCollection.findOne({ _id: userId });

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Get compliance indicators
      const flaggedReviews = await ratingsCollection.countDocuments({
        [user.userType === 'driver' ? 'driverId' : 'riderId']: userId,
        flagCount: { $gt: 0 }
      });

      const totalReviews = await ratingsCollection.countDocuments({
        [user.userType === 'driver' ? 'driverId' : 'riderId']: userId
      });

      const completedTransactions = await transactionsCollection.countDocuments({
        userId,
        status: 'completed'
      });

      const cancelledTransactions = await transactionsCollection.countDocuments({
        userId,
        status: 'cancelled'
      });

      const cancellationRate = (cancelledTransactions / (completedTransactions + cancelledTransactions)) * 100 || 0;

      let status = 'compliant';
      const issues = [];

      if (user.kycStatus !== 'verified') {
        status = 'at_risk';
        issues.push('KYC verification incomplete');
      }

      if (flaggedReviews > 5) {
        status = 'at_risk';
        issues.push(`${flaggedReviews} flagged reviews`);
      }

      if (cancellationRate > 30) {
        status = 'warning';
        issues.push(`High cancellation rate: ${cancellationRate.toFixed(2)}%`);
      }

      return {
        success: true,
        data: {
          userId,
          status,
          issues,
          complianceScore: (100 - (flaggedReviews * 5) - (cancellationRate * 0.5)).toFixed(2),
          indicators: {
            kycStatus: user.kycStatus,
            flaggedReviews,
            totalReviews,
            cancellationRate: cancellationRate.toFixed(2),
            accountAge: new Date() - user.createdAt
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error checking user compliance: ${error.message}`
      };
    }
  }

  /**
   * Generate compliance summary dashboard
   */
  static async getComplianceDashboard() {
    try {
      const usersCollection = mongoose.connection.collection('users');
      const transactionsCollection = mongoose.connection.collection('payment_transactions');
      const auditCollection = mongoose.connection.collection('audit_trail');

      const totalUsers = await usersCollection.countDocuments({});
      const verifiedUsers = await usersCollection.countDocuments({ kycStatus: 'verified' });
      const suspendedUsers = await usersCollection.countDocuments({ status: 'suspended' });

      const recentTransactions = await transactionsCollection.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      const recentAuditEvents = await auditCollection.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      return {
        success: true,
        data: {
          overview: {
            totalUsers,
            verifiedUsers,
            verificationRate: ((verifiedUsers / totalUsers) * 100).toFixed(2),
            suspendedUsers,
            recentTransactions24h: recentTransactions,
            auditEventsLast7Days: recentAuditEvents
          },
          dashboard: {
            kycCompliance: verifiedUsers / totalUsers >= 0.95 ? 'compliant' : 'needs_attention',
            auditTrailStatus: 'active',
            reportingStatus: 'current'
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error generating compliance dashboard: ${error.message}`
      };
    }
  }
}

module.exports = ComplianceReportingService;
