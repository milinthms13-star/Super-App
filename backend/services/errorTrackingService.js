/**
 * Error Tracking and Audit Logging Service
 * Sentry integration and audit trail
 */

const Sentry = require('@sentry/node');
const logger = require('../utils/logger');

class ErrorTrackingService {
  constructor() {
    this.sentryInitialized = false;
    this.auditLogs = [];
  }

  /**
   * Initialize Sentry
   */
  initialize() {
    try {
      const sentryDsn = process.env.SENTRY_DSN;
      
      if (!sentryDsn) {
        logger.warn('Sentry DSN not configured. Error tracking disabled.');
        return;
      }

      Sentry.init({
        dsn: sentryDsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: true })
        ]
      });

      this.sentryInitialized = true;
      logger.info('Sentry error tracking initialized');
    } catch (error) {
      logger.error('Failed to initialize Sentry:', error);
    }
  }

  /**
   * Capture error
   */
  captureError(error, context = {}) {
    try {
      // Log to console/file
      logger.error('Error captured:', error);

      // Send to Sentry if initialized
      if (this.sentryInitialized) {
        Sentry.captureException(error, {
          contexts: { custom: context },
          tags: {
            module: 'matrimonial',
            ...context.tags
          }
        });
      }

      return { captured: true };
    } catch (err) {
      logger.error('Error capturing exception:', err);
      return { captured: false };
    }
  }

  /**
   * Capture message
   */
  captureMessage(message, level = 'info', context = {}) {
    try {
      logger.log(level, message);

      if (this.sentryInitialized) {
        Sentry.captureMessage(message, {
          level,
          contexts: { custom: context },
          tags: {
            module: 'matrimonial'
          }
        });
      }

      return { captured: true };
    } catch (error) {
      logger.error('Error capturing message:', error);
      return { captured: false };
    }
  }

  /**
   * Set user context
   */
  setUser(user) {
    try {
      if (this.sentryInitialized && user) {
        Sentry.setUser({
          id: user._id || user.id,
          email: user.email,
          username: user.name
        });
      }
    } catch (error) {
      logger.error('Error setting user context:', error);
    }
  }

  /**
   * Clear user context
   */
  clearUser() {
    try {
      if (this.sentryInitialized) {
        Sentry.setUser(null);
      }
    } catch (error) {
      logger.error('Error clearing user context:', error);
    }
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(category, message, data = {}, level = 'info') {
    try {
      if (this.sentryInitialized) {
        Sentry.addBreadcrumb({
          category,
          message,
          data,
          level
        });
      }
    } catch (error) {
      logger.error('Error adding breadcrumb:', error);
    }
  }

  /**
   * Log audit event
   */
  async logAudit(event) {
    try {
      const auditEntry = {
        timestamp: new Date(),
        userId: event.userId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        details: event.details || {},
        ip: event.ip,
        userAgent: event.userAgent,
        status: event.status || 'success'
      };

      // Store in memory (in production, store in database)
      this.auditLogs.push(auditEntry);

      // Keep only last 1000 entries in memory
      if (this.auditLogs.length > 1000) {
        this.auditLogs.shift();
      }

      logger.info('Audit log:', auditEntry);

      // Could also send to external audit service
      return { logged: true };
    } catch (error) {
      logger.error('Error logging audit:', error);
      return { logged: false };
    }
  }

  /**
   * Get audit logs
   */
  getAuditLogs(filters = {}) {
    try {
      let logs = [...this.auditLogs];

      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }

      if (filters.action) {
        logs = logs.filter(log => log.action === filters.action);
      }

      if (filters.resource) {
        logs = logs.filter(log => log.resource === filters.resource);
      }

      if (filters.startDate) {
        logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
      }

      if (filters.endDate) {
        logs = logs.filter(log => new Date(log.timestamp) <= new Date(filters.endDate));
      }

      return logs;
    } catch (error) {
      logger.error('Error getting audit logs:', error);
      return [];
    }
  }

  /**
   * Track performance
   */
  trackPerformance(operation, duration, metadata = {}) {
    try {
      if (this.sentryInitialized) {
        const transaction = Sentry.startTransaction({
          op: operation,
          name: metadata.name || operation
        });

        transaction.setMeasurement('duration', duration, 'millisecond');
        
        if (metadata.tags) {
          Object.entries(metadata.tags).forEach(([key, value]) => {
            transaction.setTag(key, value);
          });
        }

        transaction.finish();
      }

      logger.info(`Performance: ${operation} took ${duration}ms`);
    } catch (error) {
      logger.error('Error tracking performance:', error);
    }
  }

  /**
   * Middleware for Express error handling
   */
  errorHandler() {
    return (err, req, res, next) => {
      this.captureError(err, {
        url: req.url,
        method: req.method,
        userId: req.user?._id || req.user?.id,
        body: req.body,
        query: req.query
      });

      // Audit log for errors
      this.logAudit({
        userId: req.user?._id || req.user?.id,
        action: 'error',
        resource: req.url,
        details: {
          error: err.message,
          stack: err.stack
        },
        ip: req.ip,
        userAgent: req.get('user-agent'),
        status: 'error'
      });

      next(err);
    };
  }

  /**
   * Middleware for request tracking
   */
  requestHandler() {
    if (this.sentryInitialized) {
      return Sentry.Handlers.requestHandler();
    }
    return (req, res, next) => next();
  }

  /**
   * Middleware for error tracking
   */
  errorHandlerMiddleware() {
    if (this.sentryInitialized) {
      return Sentry.Handlers.errorHandler();
    }
    return (err, req, res, next) => next(err);
  }

  /**
   * Check if configured
   */
  isConfigured() {
    return this.sentryInitialized;
  }
}

// Singleton instance
const errorTrackingService = new ErrorTrackingService();

module.exports = errorTrackingService;
