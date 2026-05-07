/**
 * Message Retry Job
 * Runs every 30 seconds to process failed messages with retry logic
 * Runs daily at 2 AM UTC to cleanup completed messages older than 30 days
 */

const cron = require('node-cron');
const MessageQueue = require('../models/MessageQueue');
const messageRetryHandler = require('../services/messageRetryHandler');
const logger = require('../utils/logger');

class MessageRetryJob {
  constructor() {
    this.retryJobSchedule = null;
    this.cleanupJobSchedule = null;
    this.isRunning = false;
    this.lastRunTime = null;
  }

  /**
   * Start the message retry job scheduler
   * Processes retry queue every 30 seconds
   */
  startRetryProcessor() {
    if (this.retryJobSchedule) {
      logger.warn('Retry processor already running');
      return;
    }

    // Run every 30 seconds
    this.retryJobSchedule = cron.schedule('*/30 * * * * *', async () => {
      try {
        if (this.isRunning) {
          logger.debug('Previous retry processing still in progress, skipping');
          return;
        }

        this.isRunning = true;
        this.lastRunTime = new Date();

        const processedCount = await messageRetryHandler.processRetryQueue(50);
        
        if (processedCount > 0) {
          logger.info(`Processed ${processedCount} messages from retry queue`);
        }
      } catch (error) {
        logger.error('Error processing retry queue:', error);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('Message retry processor started (every 30 seconds)');
  }

  /**
   * Start the message cleanup job
   * Removes completed messages older than 30 days
   * Runs daily at 2 AM UTC
   */
  startCleanupJob() {
    if (this.cleanupJobSchedule) {
      logger.warn('Cleanup job already running');
      return;
    }

    // Run daily at 2 AM UTC (0 2 * * *)
    this.cleanupJobSchedule = cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Starting message cleanup job...');
        
        const deletedCount = await messageRetryHandler.cleanupOldMessages(30);
        logger.info(`Cleanup job completed: Deleted ${deletedCount} old messages`);
      } catch (error) {
        logger.error('Error in cleanup job:', error);
      }
    });

    logger.info('Message cleanup job started (daily at 2 AM UTC)');
  }

  /**
   * Stop all jobs
   */
  stop() {
    if (this.retryJobSchedule) {
      this.retryJobSchedule.stop();
      this.retryJobSchedule.destroy();
      this.retryJobSchedule = null;
      logger.info('Message retry processor stopped');
    }

    if (this.cleanupJobSchedule) {
      this.cleanupJobSchedule.stop();
      this.cleanupJobSchedule.destroy();
      this.cleanupJobSchedule = null;
      logger.info('Message cleanup job stopped');
    }
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      retryProcessorRunning: !!this.retryJobSchedule,
      cleanupJobRunning: !!this.cleanupJobSchedule,
      isProcessing: this.isRunning,
      lastRunTime: this.lastRunTime,
    };
  }

  /**
   * Start all jobs
   */
  startAll() {
    this.startRetryProcessor();
    this.startCleanupJob();
    logger.info('All message jobs started');
  }
}

module.exports = new MessageRetryJob();
