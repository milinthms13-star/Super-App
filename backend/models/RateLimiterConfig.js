/**
 * Rate Limiter Configuration Model - Phase 10 Feature 10
 * API rate limiting and throttling configuration
 */

const { Schema, model } = require('mongoose');

const RateLimiterConfigSchema = new Schema(
  {
    limiterId: {
      type: String,
      unique: true,
      index: true,
      description: 'Unique rate limiter configuration ID',
    },
    name: {
      type: String,
      required: true,
      description: 'Name of rate limiter configuration',
    },
    targetType: {
      type: String,
      enum: ['endpoint', 'user', 'ip', 'api_key', 'combination'],
      description: 'What entity this rate limit applies to',
    },
    targetEndpoint: {
      type: String,
      description: 'Specific endpoint (if applicable)',
    },
    targetUser: {
      type: String,
      description: 'Specific user ID (if applicable)',
    },
    targetIP: {
      type: String,
      description: 'Specific IP address (if applicable)',
    },
    targetAPIKey: {
      type: String,
      description: 'Specific API key (if applicable)',
    },
    rateLimit: {
      requestsPerSecond: { type: Number, description: 'Max requests per second' },
      requestsPerMinute: { type: Number, description: 'Max requests per minute' },
      requestsPerHour: { type: Number, description: 'Max requests per hour' },
      requestsPerDay: { type: Number, description: 'Max requests per day' },
      concurrent: { type: Number, description: 'Max concurrent requests' },
    },
    windowType: {
      type: String,
      enum: ['sliding', 'fixed'],
      default: 'sliding',
      description: 'Type of time window for rate limiting',
    },
    burstAllowed: {
      type: Boolean,
      default: false,
      description: 'Whether burst traffic is allowed',
    },
    burstSize: {
      type: Number,
      description: 'Maximum burst size if allowed',
    },
    actionOnLimitExceeded: {
      type: String,
      enum: ['reject', 'queue', 'throttle', 'redirect'],
      default: 'reject',
      description: 'Action to take when limit exceeded',
    },
    responseStatus: {
      type: Number,
      default: 429,
      description: 'HTTP status code for rate limit exceeded response',
    },
    responseBody: {
      type: String,
      description: 'Response body template when limit exceeded',
    },
    bypassConditions: {
      type: [{
        condition: String,
        value: Schema.Types.Mixed,
        description: String,
      }],
      default: [],
      description: 'Conditions under which rate limit can be bypassed',
    },
    whitelistedIPs: {
      type: [String],
      default: [],
      description: 'IPs exempt from rate limiting',
    },
    whitelistedUsers: {
      type: [String],
      default: [],
      description: 'User IDs exempt from rate limiting',
    },
    whitelistedAPIKeys: {
      type: [String],
      default: [],
      description: 'API keys exempt from rate limiting',
    },
    priorityUsers: {
      type: [{
        userId: String,
        multiplier: Number, // e.g., 2x normal limit
      }],
      default: [],
      description: 'Users with higher rate limits',
    },
    blacklistedIPs: {
      type: [String],
      default: [],
      description: 'IPs automatically blocked',
    },
    blacklistedUsers: {
      type: [String],
      default: [],
      description: 'Users automatically blocked',
    },
    gradualThrottling: {
      enabled: Boolean,
      stages: [{
        stage: Number,
        threshold: Number, // percentage of limit
        responseDelay: Number, // milliseconds
        responseFactor: Number, // slow down multiplier
      }],
    },
    monitoringMetrics: {
      trackRequestPatterns: Boolean,
      detectAnomalies: Boolean,
      anomalyThreshold: Number,
      alertOnLimitExceeded: Boolean,
    },
    logViolations: {
      type: Boolean,
      default: true,
      description: 'Whether to log rate limit violations',
    },
    violationLog: {
      type: [{
        violationDate: Date,
        targetIdentifier: String,
        requestCount: Number,
        timeWindow: String,
        ipAddress: String,
        endpoint: String,
        action: String,
      }],
      default: [],
      description: 'Log of rate limit violations',
    },
    scheduleOverrides: {
      type: [{
        dayOfWeek: String,
        startTime: String,
        endTime: String,
        limitsOverride: {
          requestsPerMinute: Number,
          requestsPerHour: Number,
        },
      }],
      default: [],
      description: 'Time-based limit overrides (e.g., during peak hours)',
    },
    enabled: {
      type: Boolean,
      default: true,
      description: 'Whether this rate limiter is active',
    },
    priority: {
      type: Number,
      default: 0,
      description: 'Priority when multiple limiters apply (higher = higher priority)',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: String,
      description: 'Admin who created this configuration',
    },
    updatedBy: {
      type: String,
      description: 'Admin who last updated this configuration',
    },
    effectiveDate: {
      type: Date,
      description: 'When this configuration becomes effective',
    },
    expiryDate: {
      type: Date,
      description: 'When this configuration expires',
    },
  },
  { timestamps: true, collection: 'rate_limiter_configs' }
);

// Indexes
RateLimiterConfigSchema.index({ targetType: 1 });
RateLimiterConfigSchema.index({ targetEndpoint: 1 });
RateLimiterConfigSchema.index({ targetUser: 1 });
RateLimiterConfigSchema.index({ targetIP: 1 });
RateLimiterConfigSchema.index({ enabled: 1 });
RateLimiterConfigSchema.index({ priority: -1 });

// Instance methods
RateLimiterConfigSchema.methods.isIPWhitelisted = function (ip) {
  return this.whitelistedIPs.includes(ip);
};

RateLimiterConfigSchema.methods.isIPBlacklisted = function (ip) {
  return this.blacklistedIPs.includes(ip);
};

RateLimiterConfigSchema.methods.isUserWhitelisted = function (userId) {
  return this.whitelistedUsers.includes(userId);
};

RateLimiterConfigSchema.methods.isUserBlacklisted = function (userId) {
  return this.blacklistedUsers.includes(userId);
};

RateLimiterConfigSchema.methods.getPriorityMultiplier = function (userId) {
  const priority = this.priorityUsers.find((p) => p.userId === userId);
  return priority ? priority.multiplier : 1;
};

RateLimiterConfigSchema.methods.logViolation = function (targetId, requestCount, ipAddress, endpoint) {
  this.violationLog.push({
    violationDate: new Date(),
    targetIdentifier: targetId,
    requestCount,
    ipAddress,
    endpoint,
    action: this.actionOnLimitExceeded,
  });
};

RateLimiterConfigSchema.methods.isActive = function () {
  const now = new Date();
  const activeByDate = (!this.effectiveDate || now >= this.effectiveDate) &&
                       (!this.expiryDate || now <= this.expiryDate);
  return this.enabled && activeByDate;
};

module.exports = model('RateLimiterConfig', RateLimiterConfigSchema);
