/**
 * Spam Detection Service
 * Analyzes patterns to detect and flag false alarms, spam, and abuse
 * Uses heuristics and machine learning-ready scoring system
 */

const logger = require('../utils/logger');

/**
 * Spam detection scoring system
 * Factors: frequency, time patterns, location patterns, user behavior
 */
class SpamDetector {
  constructor() {
    this.SPAM_THRESHOLD = 0.65; // 65% confidence = spam
    this.SUSPICIOUS_THRESHOLD = 0.45; // 45% confidence = manual review
  }

  /**
   * Calculate spam score for an incident
   * @param {Object} incident - SOS incident data
   * @param {Object} userHistory - User's alert history
   * @returns {Object} {score: 0-1, level: 'clean'|'suspicious'|'spam', reasons: []}
   */
  calculateSpamScore(incident, userHistory = {}) {
    const scores = {
      frequencyScore: this.checkFrequencyAbuse(userHistory),
      timePatternScore: this.checkTimePatterns(userHistory),
      locationScore: this.checkLocationPatterns(userHistory, incident),
      contentScore: this.analyzeContent(incident),
      behaviorScore: this.analyzeBehavior(userHistory),
    };

    const weights = {
      frequencyScore: 0.25,
      timePatternScore: 0.15,
      locationScore: 0.20,
      contentScore: 0.20,
      behaviorScore: 0.20,
    };

    // Calculate weighted score
    const totalScore = Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + (scores[key] * weight);
    }, 0);

    // Determine level and reasons
    const result = {
      score: Math.round(totalScore * 100) / 100,
      level: this.getSpamLevel(totalScore),
      reasons: this.getReasons(scores),
      breakdown: scores,
    };

    return result;
  }

  /**
   * Check for frequency abuse (too many alerts in short time)
   * @param {Object} userHistory - User alert history
   * @returns {number} Score 0-1
   */
  checkFrequencyAbuse(userHistory) {
    const { recentAlerts = [], totalAlerts = 0 } = userHistory;

    // No history = no abuse
    if (totalAlerts === 0) return 0;

    // Check last 24 hours
    const last24h = recentAlerts.filter(alert => {
      const age = Date.now() - new Date(alert.timestamp).getTime();
      return age < 24 * 60 * 60 * 1000;
    }).length;

    // Check last hour
    const lastHour = recentAlerts.filter(alert => {
      const age = Date.now() - new Date(alert.timestamp).getTime();
      return age < 60 * 60 * 1000;
    }).length;

    let score = 0;

    // More than 5 in 24 hours = suspicious
    if (last24h > 5) score += 0.3;
    if (last24h > 10) score += 0.2; // More than 10 = very suspicious
    if (last24h > 15) score += 0.2; // More than 15 = spam

    // More than 2 in 1 hour = suspicious
    if (lastHour > 2) score += 0.2;
    if (lastHour > 3) score += 0.2; // More than 3 = spam
    if (lastHour > 5) score += 0.2; // More than 5 = definitely spam

    return Math.min(score, 1);
  }

  /**
   * Check for time pattern anomalies
   * @param {Object} userHistory - User history
   * @returns {number} Score 0-1
   */
  checkTimePatterns(userHistory) {
    const { recentAlerts = [] } = userHistory;

    if (recentAlerts.length < 3) return 0; // Need at least 3 alerts

    // Check for regular intervals (indicates automation/bot)
    const intervals = [];
    for (let i = 1; i < recentAlerts.length; i++) {
      const prev = new Date(recentAlerts[i - 1].timestamp).getTime();
      const curr = new Date(recentAlerts[i].timestamp).getTime();
      intervals.push(curr - prev);
    }

    // Calculate variance
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => {
      return sum + Math.pow(interval - avgInterval, 2);
    }, 0) / intervals.length;

    const stdDev = Math.sqrt(variance);

    // Low variance = suspicious (regular pattern = bot/spam)
    if (stdDev < avgInterval * 0.1) return 0.6; // Very regular = likely bot
    if (stdDev < avgInterval * 0.2) return 0.3; // Regular = suspicious

    // Overnight patterns (3 AM - 5 AM)
    const overnightAlerts = recentAlerts.filter(alert => {
      const hour = new Date(alert.timestamp).getHours();
      return hour >= 3 && hour <= 5;
    }).length;

    if (overnightAlerts === recentAlerts.length) return 0.2; // All at night = suspicious

    return 0;
  }

  /**
   * Check for location pattern anomalies
   * @param {Object} userHistory - User history
   * @param {Object} incident - Current incident
   * @returns {number} Score 0-1
   */
  checkLocationPatterns(userHistory, incident) {
    const { recentAlerts = [] } = userHistory;
    const { latitude, longitude } = incident;

    if (!latitude || !longitude) return 0;
    if (recentAlerts.length < 2) return 0; // Need at least 2 for comparison

    let score = 0;

    // Check if all alerts from same location
    const sameLocationAlerts = recentAlerts.filter(alert => {
      const distance = this.calculateDistance(
        alert.latitude,
        alert.longitude,
        latitude,
        longitude
      );
      return distance < 100; // Within 100 meters
    });

    // All alerts from same location = suspicious (stationary user)
    if (sameLocationAlerts.length === recentAlerts.length && recentAlerts.length > 2) {
      score += 0.3; // User doesn't move = likely false alarms
    }

    // Extremely rapid location changes (teleportation)
    const lastAlert = recentAlerts[recentAlerts.length - 1];
    const distance = this.calculateDistance(
      lastAlert.latitude,
      lastAlert.longitude,
      latitude,
      longitude
    );
    const timeDiff = new Date(incident.timestamp).getTime() - 
                     new Date(lastAlert.timestamp).getTime();
    
    const requiredSpeed = distance / (timeDiff / 1000 / 3600); // km/h needed
    if (requiredSpeed > 1000) score += 0.4; // Impossible speed = bot/spam
    if (requiredSpeed > 500) score += 0.2; // Very high speed = suspicious

    return Math.min(score, 1);
  }

  /**
   * Analyze content for spam keywords and patterns
   * @param {Object} incident - SOS incident
   * @returns {number} Score 0-1
   */
  analyzeContent(incident) {
    const { reason = '', channels = [] } = incident;
    const reasonLower = reason.toLowerCase();

    let score = 0;

    // Spam keywords
    const spamKeywords = ['test', 'demo', 'spam', 'false alarm', 'oops', 'accident', 'mistake'];
    const spamCount = spamKeywords.filter(kw => reasonLower.includes(kw)).length;
    if (spamCount > 0) score += 0.2;

    // Empty or very short reason
    if (!reason || reason.trim().length < 5) score += 0.1;

    // Only email channel (no phone)
    if (channels.includes('email') && !channels.includes('sms') && channels.length === 1) {
      score += 0.1;
    }

    // All channels selected (overkill)
    if (channels.length > 3) score += 0.1;

    return Math.min(score, 1);
  }

  /**
   * Analyze user behavior patterns
   * @param {Object} userHistory - User history
   * @returns {number} Score 0-1
   */
  analyzeBehavior(userHistory) {
    const { recentAlerts = [], resolutionTime = [], falseAlarmRate = 0 } = userHistory;

    let score = 0;

    // High false alarm rate
    if (falseAlarmRate > 0.5) score += 0.3; // More than 50% false = spam-prone
    if (falseAlarmRate > 0.7) score += 0.2; // More than 70% false = likely spammer

    // No previous incidents resolved properly
    if (recentAlerts.length > 0 && resolutionTime.length === 0) {
      score += 0.15; // Never properly resolved alerts
    }

    // Alerts never verified by checking tracking link
    const unverifiedAlerts = recentAlerts.filter(a => !a.verified).length;
    if (unverifiedAlerts === recentAlerts.length && recentAlerts.length > 2) {
      score += 0.2; // No one checks the tracking link
    }

    return Math.min(score, 1);
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @param {number} lat1, lon1, lat2, lon2
   * @returns {number} Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Get spam level from score
   * @param {number} score - 0-1 spam score
   * @returns {string} 'clean'|'suspicious'|'spam'
   */
  getSpamLevel(score) {
    if (score >= this.SPAM_THRESHOLD) return 'spam';
    if (score >= this.SUSPICIOUS_THRESHOLD) return 'suspicious';
    return 'clean';
  }

  /**
   * Get human-readable reasons for spam score
   * @param {Object} scores - Component scores
   * @returns {Array} Reason strings
   */
  getReasons(scores) {
    const reasons = [];

    if (scores.frequencyScore > 0.3) {
      reasons.push('High alert frequency in short time');
    }
    if (scores.timePatternScore > 0.3) {
      reasons.push('Irregular time patterns detected');
    }
    if (scores.locationScore > 0.3) {
      reasons.push('Location pattern anomalies detected');
    }
    if (scores.contentScore > 0.2) {
      reasons.push('Suspicious content detected');
    }
    if (scores.behaviorScore > 0.3) {
      reasons.push('User behavior indicates possible spam');
    }

    return reasons;
  }
}

const detector = new SpamDetector();

/**
 * Check if incident is spam
 * @param {Object} incident - SOS incident
 * @param {Object} userHistory - User's alert history
 * @returns {Object} Detection result
 */
exports.detectSpam = (incident, userHistory = {}) => {
  try {
    const result = detector.calculateSpamScore(incident, userHistory);

    logger.info(
      `Spam detection for incident ${incident._id}: ` +
      `score=${result.score}, level=${result.level}`
    );

    return result;
  } catch (error) {
    logger.error(`Error in spam detection: ${error.message}`);
    // On error, default to clean
    return {
      score: 0,
      level: 'clean',
      reasons: ['Detection error - defaulted to clean'],
    };
  }
};

/**
 * Batch spam detection for multiple incidents
 * @param {Array} incidents - Array of incidents
 * @param {Array} userHistories - Array of user histories
 * @returns {Array} Detection results
 */
exports.detectSpamBatch = (incidents, userHistories = []) => {
  return incidents.map((incident, index) => {
    const history = userHistories[index] || {};
    return exports.detectSpam(incident, history);
  });
};

/**
 * Get spam statistics
 * @returns {Object} Stats
 */
exports.getSpamStats = () => {
  return {
    thresholds: {
      spam: detector.SPAM_THRESHOLD,
      suspicious: detector.SUSPICIOUS_THRESHOLD,
    },
    factors: [
      'Frequency Abuse',
      'Time Patterns',
      'Location Patterns',
      'Content Analysis',
      'Behavior Scoring',
    ],
  };
};

module.exports = exports;
