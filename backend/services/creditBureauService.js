const axios = require('axios');
const logger = require('../utils/logger');

// Credit Bureau Configuration
const CIBIL_API_URL = process.env.CIBIL_API_URL || '';
const CIBIL_API_KEY = process.env.CIBIL_API_KEY || '';
const CIBIL_MEMBER_ID = process.env.CIBIL_MEMBER_ID || '';

const EXPERIAN_API_URL = process.env.EXPERIAN_API_URL || '';
const EXPERIAN_API_KEY = process.env.EXPERIAN_API_KEY || '';
const EXPERIAN_CLIENT_ID = process.env.EXPERIAN_CLIENT_ID || '';

const CREDIT_BUREAU_PROVIDER = process.env.CREDIT_BUREAU_PROVIDER || 'cibil'; // 'cibil' or 'experian'
const CREDIT_BUREAU_TIMEOUT = 15000; // 15 seconds

class CreditBureauService {
  constructor() {
    this.provider = CREDIT_BUREAU_PROVIDER;
  }

  /**
   * Fetch credit report from CIBIL
   */
  async fetchCibilReport(payload) {
    if (!CIBIL_API_URL || !CIBIL_API_KEY) {
      logger.warn('CIBIL credentials not configured');
      return {
        success: false,
        reason: 'cibil-not-configured',
        mock: true,
        data: this.generateMockCibilReport(payload),
      };
    }

    try {
      const response = await axios.post(
        `${CIBIL_API_URL}/credit-report`,
        {
          memberId: CIBIL_MEMBER_ID,
          applicant: {
            name: payload.fullName,
            pan: payload.pan,
            dob: payload.dob,
            gender: payload.gender,
            address: {
              state: payload.state,
              district: payload.district,
              pincode: payload.pincode,
            },
            phone: payload.phone,
          },
          enquiryPurpose: 'LOAN_APPLICATION',
          consentTimestamp: payload.consentTimestamp,
        },
        {
          headers: {
            'Authorization': `Bearer ${CIBIL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: CREDIT_BUREAU_TIMEOUT,
        }
      );

      logger.info(`CIBIL report fetched for PAN: ${payload.pan}`);
      return {
        success: true,
        provider: 'cibil',
        data: this.normalizeCibilResponse(response.data),
      };
    } catch (error) {
      logger.error(`CIBIL API error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        mock: true,
        data: this.generateMockCibilReport(payload),
      };
    }
  }

  /**
   * Fetch credit report from Experian
   */
  async fetchExperianReport(payload) {
    if (!EXPERIAN_API_URL || !EXPERIAN_API_KEY) {
      logger.warn('Experian credentials not configured');
      return {
        success: false,
        reason: 'experian-not-configured',
        mock: true,
        data: this.generateMockCibilReport(payload),
      };
    }

    try {
      const response = await axios.post(
        `${EXPERIAN_API_URL}/credit-score`,
        {
          clientId: EXPERIAN_CLIENT_ID,
          consumer: {
            name: payload.fullName,
            pan: payload.pan,
            dateOfBirth: payload.dob,
            gender: payload.gender,
            address: {
              state: payload.state,
              city: payload.district,
              postal: payload.pincode,
            },
            phone: payload.phone,
          },
          purpose: 'LOAN_ENQUIRY',
          consent: {
            timestamp: payload.consentTimestamp,
            granted: true,
          },
        },
        {
          headers: {
            'X-API-Key': EXPERIAN_API_KEY,
            'Content-Type': 'application/json',
          },
          timeout: CREDIT_BUREAU_TIMEOUT,
        }
      );

      logger.info(`Experian report fetched for PAN: ${payload.pan}`);
      return {
        success: true,
        provider: 'experian',
        data: this.normalizeExperianResponse(response.data),
      };
    } catch (error) {
      logger.error(`Experian API error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        mock: true,
        data: this.generateMockCibilReport(payload),
      };
    }
  }

  /**
   * Main method to fetch credit report
   */
  async fetchCreditReport(payload) {
    // Validate required fields
    if (!payload.fullName || !payload.pan || !payload.phone) {
      return {
        success: false,
        error: 'Missing required fields: fullName, pan, phone',
      };
    }

    // Check if consent was provided
    if (!payload.consentTimestamp) {
      return {
        success: false,
        error: 'Credit bureau consent not provided',
      };
    }

    // Route to appropriate bureau
    if (this.provider === 'experian') {
      return this.fetchExperianReport(payload);
    }

    return this.fetchCibilReport(payload);
  }

  /**
   * Normalize CIBIL response to standard format
   */
  normalizeCibilResponse(data) {
    return {
      score: data.score || 0,
      scoreRange: this.getScoreRange(data.score || 0),
      reportDate: data.reportDate || new Date().toISOString(),
      accountSummary: {
        totalAccounts: data.accountSummary?.total || 0,
        activeAccounts: data.accountSummary?.active || 0,
        closedAccounts: data.accountSummary?.closed || 0,
        overdueAccounts: data.accountSummary?.overdue || 0,
      },
      creditUtilization: data.creditUtilization || 0,
      totalOutstanding: data.totalOutstanding || 0,
      enquiriesLast90Days: data.enquiries?.last90Days || 0,
      oldestAccount: data.oldestAccountAge || 0,
      paymentHistory: {
        onTimePayments: data.paymentHistory?.onTime || 0,
        latePayments: data.paymentHistory?.late || 0,
        defaults: data.paymentHistory?.defaults || 0,
      },
      riskLevel: this.calculateRiskLevel(data.score || 0),
    };
  }

  /**
   * Normalize Experian response to standard format
   */
  normalizeExperianResponse(data) {
    return {
      score: data.creditScore || 0,
      scoreRange: this.getScoreRange(data.creditScore || 0),
      reportDate: data.reportGeneratedDate || new Date().toISOString(),
      accountSummary: {
        totalAccounts: data.accounts?.totalCount || 0,
        activeAccounts: data.accounts?.activeCount || 0,
        closedAccounts: data.accounts?.closedCount || 0,
        overdueAccounts: data.accounts?.overdueCount || 0,
      },
      creditUtilization: data.utilizationRatio || 0,
      totalOutstanding: data.totalDebt || 0,
      enquiriesLast90Days: data.recentEnquiries || 0,
      oldestAccount: data.creditHistoryLength || 0,
      paymentHistory: {
        onTimePayments: data.paymentPerformance?.onTime || 0,
        latePayments: data.paymentPerformance?.delayed || 0,
        defaults: data.paymentPerformance?.defaulted || 0,
      },
      riskLevel: this.calculateRiskLevel(data.creditScore || 0),
    };
  }

  /**
   * Generate mock CIBIL report for development/testing
   */
  generateMockCibilReport(payload) {
    const mockScore = Math.floor(Math.random() * (900 - 650) + 650);
    
    return {
      score: mockScore,
      scoreRange: this.getScoreRange(mockScore),
      reportDate: new Date().toISOString(),
      accountSummary: {
        totalAccounts: Math.floor(Math.random() * 5 + 2),
        activeAccounts: Math.floor(Math.random() * 3 + 1),
        closedAccounts: Math.floor(Math.random() * 2),
        overdueAccounts: Math.floor(Math.random() * 2),
      },
      creditUtilization: Math.floor(Math.random() * 60 + 20),
      totalOutstanding: Math.floor(Math.random() * 500000 + 100000),
      enquiriesLast90Days: Math.floor(Math.random() * 3),
      oldestAccount: Math.floor(Math.random() * 60 + 12),
      paymentHistory: {
        onTimePayments: Math.floor(Math.random() * 30 + 10),
        latePayments: Math.floor(Math.random() * 3),
        defaults: Math.floor(Math.random() * 2),
      },
      riskLevel: this.calculateRiskLevel(mockScore),
      isMock: true,
    };
  }

  /**
   * Get score range label
   */
  getScoreRange(score) {
    if (score >= 750) return 'Excellent';
    if (score >= 700) return 'Good';
    if (score >= 650) return 'Fair';
    if (score >= 600) return 'Poor';
    return 'Very Poor';
  }

  /**
   * Calculate risk level
   */
  calculateRiskLevel(score) {
    if (score >= 750) return 'Low';
    if (score >= 700) return 'Medium';
    if (score >= 650) return 'Medium-High';
    return 'High';
  }

  /**
   * Extract insights from credit report
   */
  extractInsights(creditData) {
    const insights = [];
    const recommendations = [];

    if (creditData.score < 680) {
      insights.push('Credit score is below most lender requirements');
      recommendations.push('Focus on improving payment history for 6-12 months');
    }

    if (creditData.creditUtilization > 50) {
      insights.push('High credit utilization detected');
      recommendations.push('Reduce credit card balances to below 30% of limits');
    }

    if (creditData.enquiriesLast90Days > 3) {
      insights.push('Multiple recent credit enquiries may impact score');
      recommendations.push('Avoid applying for new credit for next 3 months');
    }

    if (creditData.paymentHistory.latePayments > 2) {
      insights.push('Recent late payments detected');
      recommendations.push('Set up auto-pay to ensure on-time payments');
    }

    if (creditData.accountSummary.overdueAccounts > 0) {
      insights.push(`${creditData.accountSummary.overdueAccounts} overdue account(s) found`);
      recommendations.push('Clear overdue accounts immediately to improve score');
    }

    if (creditData.oldestAccount < 12) {
      insights.push('Limited credit history');
      recommendations.push('Maintain existing accounts to build credit history');
    }

    return { insights, recommendations };
  }
}

module.exports = new CreditBureauService();
