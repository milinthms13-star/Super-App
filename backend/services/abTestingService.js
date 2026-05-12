/**
 * A/B Testing Service
 * Framework for variant assignment and metric tracking for astrology module UI improvements
 */

const logger = require('../config/logger');
const mongoose = require('mongoose');

class ABTestingService {
  static inMemoryEvents = [];

  /**
   * Define experiment variants with weights
   * Example: { buttonColor: { control: 0.5, primary: 0.25, secondary: 0.25 } }
   */
  static experiments = {
    consultantCardLayout: {
      control: 0.5,      // Current layout
      compact: 0.25,     // Compact card without images
      expandable: 0.25,  // Expandable with more details
    },
    bookingFlow: {
      control: 0.5,      // 3-step flow (consultant → slot → confirm)
      twoStep: 0.25,     // 2-step flow (select + auto-slot)
      quickbook: 0.25,   // 1-click booking with defaults
    },
    slotDisplay: {
      control: 0.5,      // Grid layout
      carousel: 0.25,    // Horizontal carousel
      timeline: 0.25,    // Timeline view
    },
    paymentPrompt: {
      control: 0.5,      // Optional payment after booking
      mandatory: 0.25,   // Mandatory immediate payment
      delayed: 0.25,     // Payment reminder after 1 hour
    },
    uiTheme: {
      control: 0.5,      // Light theme
      dark: 0.25,        // Dark theme
      auto: 0.25,        // Auto (system preference)
    },
  };

  /**
   * Assign user to experiment variants based on consistent hashing
   */
  static assignVariants(userId) {
    const variants = {};

    for (const [experimentName, experimentVariants] of Object.entries(this.experiments)) {
      const variant = this._assignVariant(userId, experimentName, experimentVariants);
      variants[experimentName] = variant;
    }

    return variants;
  }

  /**
   * Consistent variant assignment using hash
   */
  static _assignVariant(userId, experimentName, variants) {
    // Create consistent hash from userId + experimentName
    const hash = this._hashCode(`${userId}:${experimentName}`);
    const hashValue = Math.abs(hash) % 100 / 100;

    let cumulative = 0;
    for (const [variant, weight] of Object.entries(variants)) {
      cumulative += weight;
      if (hashValue <= cumulative) {
        return variant;
      }
    }

    // Fallback (shouldn't happen)
    return Object.keys(variants)[0];
  }

  /**
   * Simple hash function for consistent user assignment
   */
  static _hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Track experiment event (user interaction with experiment variant)
   */
  static async trackEvent(userId, experimentName, eventType, eventData = {}) {
    try {
      if (!this.experiments[experimentName]) {
        throw new Error(`Unknown experiment: ${experimentName}`);
      }

      const variant = this._assignVariant(
        userId,
        experimentName,
        this.experiments[experimentName]
      );

      const eventPayload = {
        userId,
        experimentName,
        variant,
        eventType, // 'impression', 'click', 'conversion', 'custom'
        eventData,
        timestamp: new Date(),
      };

      if (mongoose.connection.readyState === 1) {
        const Experiment = require('../models/Experiment');
        const event = new Experiment(eventPayload);
        await event.save();
      } else {
        this.inMemoryEvents.push({
          ...eventPayload,
          _id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        });
      }

      logger.info(`A/B Test event tracked: ${experimentName}/${variant}/${eventType}`);

      return {
        success: true,
        variant,
        event: eventPayload.timestamp.toISOString(),
      };
    } catch (error) {
      logger.error('Error tracking A/B test event:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's current variants
   */
  static async getUserVariants(userId) {
    try {
      const variants = this.assignVariants(userId);

      // Cache user's variant assignment
      const cache = {
        userId,
        variants,
        assignedAt: new Date(),
        ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
      };

      return {
        success: true,
        variants,
        cache,
      };
    } catch (error) {
      logger.error('Error getting user variants:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get experiment results and statistical analysis
   */
  static async getExperimentResults(experimentName) {
    try {
      let events = [];

      if (mongoose.connection.readyState === 1) {
        const Experiment = require('../models/Experiment');
        events = await Experiment.find({ experimentName });
      } else {
        events = this.inMemoryEvents.filter((event) => event.experimentName === experimentName);
      }

      if (events.length === 0) {
        return {
          success: true,
          experimentName,
          results: {},
          message: 'No events recorded yet',
        };
      }

      // Group by variant and event type
      const variants = this.experiments[experimentName];
      const results = {};

      for (const variant of Object.keys(variants)) {
        const variantEvents = events.filter(e => e.variant === variant);

        const impressions = variantEvents.filter(e => e.eventType === 'impression').length;
        const clicks = variantEvents.filter(e => e.eventType === 'click').length;
        const conversions = variantEvents.filter(e => e.eventType === 'conversion').length;

        results[variant] = {
          impressions,
          clicks,
          conversions,
          ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0,
          conversionRate:
            impressions > 0 ? ((conversions / impressions) * 100).toFixed(2) : 0,
          avgTimeSpent: this._calculateAvgTimeSpent(variantEvents),
        };
      }

      return {
        success: true,
        experimentName,
        results,
        winningVariant: this._determineWinner(results),
        confidence: this._calculateConfidence(results),
      };
    } catch (error) {
      logger.error('Error getting experiment results:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate average time spent for a variant
   */
  static _calculateAvgTimeSpent(events) {
    const timeEvents = events.filter(e => e.eventData?.timeSpent);
    if (timeEvents.length === 0) return 0;

    const totalTime = timeEvents.reduce(
      (sum, e) => sum + (e.eventData.timeSpent || 0),
      0
    );
    return (totalTime / timeEvents.length).toFixed(2);
  }

  /**
   * Determine winning variant based on conversion rate
   */
  static _determineWinner(results) {
    let winner = null;
    let maxConversion = -1;

    for (const [variant, stats] of Object.entries(results)) {
      if (parseFloat(stats.conversionRate) > maxConversion) {
        maxConversion = parseFloat(stats.conversionRate);
        winner = variant;
      }
    }

    return winner;
  }

  /**
   * Calculate statistical confidence (simplified)
   */
  static _calculateConfidence(results) {
    const conversions = Object.values(results).map(r => r.conversions);
    const minConversions = Math.min(...conversions);

    // Simple confidence: need at least 100 conversions per variant
    return minConversions >= 100 ? 'high' : minConversions >= 50 ? 'medium' : 'low';
  }

  /**
   * Get all active experiments
   */
  static async getActiveExperiments() {
    try {
      const experimentNames = Object.keys(this.experiments);

      const results = await Promise.all(
        experimentNames.map(name => this.getExperimentResults(name))
      );

      return {
        success: true,
        experiments: experimentNames,
        results,
        totalExperiments: experimentNames.length,
      };
    } catch (error) {
      logger.error('Error getting active experiments:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Pause or stop an experiment
   */
  static async stopExperiment(experimentName) {
    try {
      // Remove from experiments list
      delete this.experiments[experimentName];

      logger.info(`Experiment stopped: ${experimentName}`);

      return {
        success: true,
        message: `Experiment ${experimentName} has been stopped`,
      };
    } catch (error) {
      logger.error('Error stopping experiment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create custom experiment
   */
  static async createExperiment(experimentName, variantWeights) {
    try {
      // Validate weights sum to 1
      const totalWeight = Object.values(variantWeights).reduce((a, b) => a + b, 0);
      if (Math.abs(totalWeight - 1) > 0.01) {
        throw new Error('Variant weights must sum to 1');
      }

      this.experiments[experimentName] = variantWeights;

      logger.info(
        `New experiment created: ${experimentName} with variants: ${Object.keys(variantWeights).join(', ')}`
      );

      return {
        success: true,
        experimentName,
        variants: variantWeights,
        message: `Experiment ${experimentName} created successfully`,
      };
    } catch (error) {
      logger.error('Error creating experiment:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ABTestingService;
