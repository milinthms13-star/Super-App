const logger = require('../utils/logger');
const FinanceLead = require('../models/FinanceLead');

class FraudDetectionService {
  /**
   * Check for duplicate leads
   */
  async checkDuplicateLead(phone, pan = '', aadhaar = '', timeWindowHours = 24) {
    try {
      const timeThreshold = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
      
      const query = {
        createdAt: { $gte: timeThreshold },
        $or: [{ phone }],
      };

      if (pan) {
        query.$or.push({ 'eligibilitySnapshot.pan': pan });
      }

      if (aadhaar) {
        query.$or.push({ 'eligibilitySnapshot.aadhaarNumber': aadhaar });
      }

      const duplicates = await FinanceLead.find(query)
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      return {
        isDuplicate: duplicates.length > 0,
        count: duplicates.length,
        leads: duplicates.map((lead) => ({
          leadId: lead.leadId,
          phone: lead.phone,
          amount: lead.amount,
          createdAt: lead.createdAt,
          status: lead.status,
        })),
        riskLevel: this.calculateDuplicateRiskLevel(duplicates.length),
      };
    } catch (error) {
      logger.error(`Duplicate check error: ${error.message}`);
      return {
        isDuplicate: false,
        error: error.message,
      };
    }
  }

  /**
   * Velocity check - too many applications in short time
   */
  async checkVelocity(phone, timeWindowHours = 168) {
    // 7 days = 168 hours
    try {
      const timeThreshold = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

      const count = await FinanceLead.countDocuments({
        phone,
        createdAt: { $gte: timeThreshold },
      });

      const riskThresholds = {
        low: 1,
        medium: 2,
        high: 4,
        critical: 6,
      };

      let riskLevel = 'low';
      if (count >= riskThresholds.critical) riskLevel = 'critical';
      else if (count >= riskThresholds.high) riskLevel = 'high';
      else if (count >= riskThresholds.medium) riskLevel = 'medium';

      return {
        count,
        timeWindowHours,
        riskLevel,
        blocked: count >= riskThresholds.critical,
        message:
          count >= riskThresholds.critical
            ? 'Too many applications submitted recently. Please contact support.'
            : riskLevel === 'high'
            ? 'Multiple recent applications detected. This may affect approval.'
            : '',
      };
    } catch (error) {
      logger.error(`Velocity check error: ${error.message}`);
      return {
        count: 0,
        riskLevel: 'low',
        error: error.message,
      };
    }
  }

  /**
   * Check if phone/user is blacklisted
   */
  async checkBlacklist(phone, pan = '', aadhaar = '') {
    try {
      // Check in-memory or database blacklist
      const blacklistedPhones = this.getBlacklistedPhones();
      const blacklistedPANs = this.getBlacklistedPANs();

      const isPhoneBlacklisted = blacklistedPhones.includes(phone);
      const isPANBlacklisted = pan && blacklistedPANs.includes(pan.toUpperCase());

      const reasons = [];
      if (isPhoneBlacklisted) reasons.push('Phone number is blacklisted');
      if (isPANBlacklisted) reasons.push('PAN is blacklisted');

      return {
        blacklisted: isPhoneBlacklisted || isPANBlacklisted,
        reasons,
        riskLevel: isPhoneBlacklisted || isPANBlacklisted ? 'critical' : 'low',
      };
    } catch (error) {
      logger.error(`Blacklist check error: ${error.message}`);
      return {
        blacklisted: false,
        error: error.message,
      };
    }
  }

  /**
   * Check IP reputation
   */
  async checkIPReputation(ipAddress) {
    // Simplified IP check - in production, integrate with IP intelligence services
    try {
      // Check for localhost/private IPs
      const privateIPPatterns = [
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^192\.168\./,
      ];

      const isPrivate = privateIPPatterns.some((pattern) =>
        pattern.test(ipAddress)
      );

      // Check recent application rate from this IP
      const recentFromIP = await FinanceLead.countDocuments({
        'sourceMeta.ipAddress': ipAddress,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });

      let riskLevel = 'low';
      if (recentFromIP >= 10) riskLevel = 'critical';
      else if (recentFromIP >= 5) riskLevel = 'high';
      else if (recentFromIP >= 3) riskLevel = 'medium';

      return {
        ipAddress,
        isPrivate,
        recentApplications: recentFromIP,
        riskLevel,
        suspicious: recentFromIP >= 5,
      };
    } catch (error) {
      logger.error(`IP reputation check error: ${error.message}`);
      return {
        ipAddress,
        riskLevel: 'low',
        error: error.message,
      };
    }
  }

  /**
   * Device fingerprint analysis
   */
  analyzeDeviceFingerprint(userAgent, platform, buildNumber) {
    // Simplified device analysis
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
    ];

    const isSuspicious = suspiciousPatterns.some((pattern) =>
      pattern.test(userAgent)
    );

    return {
      userAgent,
      platform,
      buildNumber,
      suspicious: isSuspicious,
      riskLevel: isSuspicious ? 'high' : 'low',
    };
  }

  /**
   * Comprehensive fraud check
   */
  async performFraudCheck(leadData, ipAddress, userAgent) {
    try {
      const checks = await Promise.all([
        this.checkDuplicateLead(
          leadData.phone,
          leadData.pan,
          leadData.aadhaarNumber
        ),
        this.checkVelocity(leadData.phone),
        this.checkBlacklist(leadData.phone, leadData.pan, leadData.aadhaarNumber),
        this.checkIPReputation(ipAddress),
      ]);

      const [duplicateCheck, velocityCheck, blacklistCheck, ipCheck] = checks;

      const deviceCheck = this.analyzeDeviceFingerprint(
        userAgent,
        leadData.platform,
        leadData.buildNumber
      );

      // Calculate overall risk score
      const riskScore = this.calculateOverallRiskScore({
        duplicateCheck,
        velocityCheck,
        blacklistCheck,
        ipCheck,
        deviceCheck,
      });

      const overallRisk = this.getRiskLevelFromScore(riskScore);

      return {
        riskScore,
        overallRisk,
        blocked: blacklistCheck.blacklisted || velocityCheck.blocked,
        checks: {
          duplicate: duplicateCheck,
          velocity: velocityCheck,
          blacklist: blacklistCheck,
          ip: ipCheck,
          device: deviceCheck,
        },
        recommendations: this.generateFraudRecommendations({
          duplicateCheck,
          velocityCheck,
          blacklistCheck,
          ipCheck,
          deviceCheck,
          overallRisk,
        }),
      };
    } catch (error) {
      logger.error(`Fraud check error: ${error.message}`);
      return {
        riskScore: 50,
        overallRisk: 'medium',
        blocked: false,
        error: error.message,
      };
    }
  }

  /**
   * Calculate overall risk score
   */
  calculateOverallRiskScore(checks) {
    let score = 0;

    // Blacklist is most critical
    if (checks.blacklistCheck.blacklisted) {
      score += 50;
    }

    // Velocity
    const velocityRiskScores = { low: 0, medium: 15, high: 25, critical: 40 };
    score += velocityRiskScores[checks.velocityCheck.riskLevel] || 0;

    // Duplicates
    const duplicateRiskScores = { low: 0, medium: 10, high: 20, critical: 30 };
    score +=
      duplicateRiskScores[checks.duplicateCheck.riskLevel] || 0;

    // IP reputation
    const ipRiskScores = { low: 0, medium: 5, high: 15, critical: 25 };
    score += ipRiskScores[checks.ipCheck.riskLevel] || 0;

    // Device
    if (checks.deviceCheck.suspicious) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Get risk level from score
   */
  getRiskLevelFromScore(score) {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * Calculate duplicate risk level
   */
  calculateDuplicateRiskLevel(count) {
    if (count >= 3) return 'critical';
    if (count >= 2) return 'high';
    if (count >= 1) return 'medium';
    return 'low';
  }

  /**
   * Generate fraud recommendations
   */
  generateFraudRecommendations(fraudData) {
    const recommendations = [];

    if (fraudData.blacklistCheck.blacklisted) {
      recommendations.push({
        severity: 'critical',
        action: 'reject',
        reason: 'Blacklisted entity detected',
        message: 'Do not process this application.',
      });
    }

    if (fraudData.velocityCheck.riskLevel === 'critical') {
      recommendations.push({
        severity: 'critical',
        action: 'block',
        reason: 'Excessive application velocity',
        message: 'Block further applications for 48 hours.',
      });
    }

    if (fraudData.velocityCheck.riskLevel === 'high') {
      recommendations.push({
        severity: 'high',
        action: 'review',
        reason: 'Multiple recent applications',
        message: 'Manual review required before proceeding.',
      });
    }

    if (fraudData.duplicateCheck.isDuplicate && fraudData.duplicateCheck.count >= 2) {
      recommendations.push({
        severity: 'medium',
        action: 'review',
        reason: 'Duplicate application detected',
        message: `${fraudData.duplicateCheck.count} similar applications found in last 24 hours.`,
      });
    }

    if (fraudData.ipCheck.suspicious) {
      recommendations.push({
        severity: 'high',
        action: 'investigate',
        reason: 'Suspicious IP activity',
        message: `${fraudData.ipCheck.recentApplications} applications from this IP in 24 hours.`,
      });
    }

    if (fraudData.deviceCheck.suspicious) {
      recommendations.push({
        severity: 'medium',
        action: 'verify',
        reason: 'Suspicious user agent detected',
        message: 'Verify this is a legitimate user application.',
      });
    }

    if (fraudData.overallRisk === 'critical' || fraudData.overallRisk === 'high') {
      recommendations.push({
        severity: fraudData.overallRisk,
        action: 'escalate',
        reason: 'High overall fraud risk',
        message: 'Escalate to fraud prevention team.',
      });
    }

    return recommendations;
  }

  /**
   * Get blacklisted phones (from config/database)
   */
  getBlacklistedPhones() {
    // In production, fetch from database
    return [
      // Example blacklisted numbers
    ];
  }

  /**
   * Get blacklisted PANs (from config/database)
   */
  getBlacklistedPANs() {
    // In production, fetch from database
    return [
      // Example blacklisted PANs
    ];
  }

  /**
   * Add to blacklist
   */
  async addToBlacklist(type, value, reason) {
    try {
      logger.info(`Adding to blacklist: ${type} - ${value} - Reason: ${reason}`);
      // In production, save to database
      return { success: true };
    } catch (error) {
      logger.error(`Blacklist add error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove from blacklist
   */
  async removeFromBlacklist(type, value) {
    try {
      logger.info(`Removing from blacklist: ${type} - ${value}`);
      // In production, remove from database
      return { success: true };
    } catch (error) {
      logger.error(`Blacklist remove error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new FraudDetectionService();
