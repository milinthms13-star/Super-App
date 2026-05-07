const ReminderDeliveryLog = require('../models/ReminderDeliveryLog');
const Reminder = require('../models/Reminder');
const logger = require('../utils/logger');

/**
 * Log a reminder delivery attempt
 */
async function logDelivery(data) {
  try {
    const {
      reminderId,
      userId,
      channel,
      offsetMinutes,
      recipient,
      status = 'sent',
      messageId,
      errorMessage = null
    } = data;

    // Get reminder details for logging
    const reminder = await Reminder.findById(reminderId).select('title category priority').lean();

    const log = new ReminderDeliveryLog({
      reminderId,
      userId,
      channel,
      offsetMinutes,
      scheduledTime: new Date(new Date().getTime() - offsetMinutes * 60 * 1000),
      deliveredAt: status === 'sent' ? new Date() : null,
      status,
      recipient,
      errorMessage,
      reminderTitle: reminder?.title,
      reminderCategory: reminder?.category,
      reminderPriority: reminder?.priority,
      metadata: {
        messageId,
        provider: getProvider(channel)
      }
    });

    await log.save();

    // Update reminder delivery stats
    await updateReminderDeliveryStats(reminderId, channel, status);

    return log;
  } catch (error) {
    logger.error('Error logging delivery:', error);
    throw error;
  }
}

/**
 * Update reminder delivery statistics
 */
async function updateReminderDeliveryStats(reminderId, channel, status) {
  try {
    const update = {
      $inc: {
        'deliveryStats.totalAttempts': 1
      },
      'deliveryStats.lastDeliveryAttempt': new Date()
    };

    if (status === 'sent') {
      update.$inc['deliveryStats.successfulDeliveries'] = 1;
      update['deliveryStats.lastSuccessfulDelivery'] = new Date();
    } else if (status === 'failed') {
      update.$inc['deliveryStats.failedDeliveries'] = 1;
    }

    await Reminder.findByIdAndUpdate(reminderId, update);
  } catch (error) {
    logger.error('Error updating delivery stats:', error);
  }
}

/**
 * Get delivery statistics for a user
 */
async function getUserDeliveryStats(userId, daysBack = 30) {
  try {
    const stats = await ReminderDeliveryLog.getAnalytics(userId, daysBack);
    const successRate = await ReminderDeliveryLog.getSuccessRate(userId);

    return {
      ...stats,
      overallSuccessRate: successRate.successRate,
      totalDeliveries: successRate.total,
      successfulDeliveries: successRate.sent,
      failedDeliveries: successRate.failed
    };
  } catch (error) {
    logger.error('Error fetching user delivery stats:', error);
    throw error;
  }
}

/**
 * Get delivery statistics for a specific channel
 */
async function getChannelStats(userId, channel, daysBack = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const stats = await ReminderDeliveryLog.aggregate([
      {
        $match: {
          userId,
          channel,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const sent = stats.find(s => s._id === 'sent')?.count || 0;
    const failed = stats.find(s => s._id === 'failed')?.count || 0;

    return {
      channel,
      period: `${daysBack} days`,
      total,
      sent,
      failed,
      pending: stats.find(s => s._id === 'pending')?.count || 0,
      successRate: total > 0 ? ((sent / total) * 100).toFixed(2) + '%' : '0%'
    };
  } catch (error) {
    logger.error('Error fetching channel stats:', error);
    throw error;
  }
}

/**
 * Get failed deliveries for retry
 */
async function getFailedDeliveries(userId, channel = null, limit = 10) {
  try {
    const query = { userId, status: 'failed', isRetry: false };
    if (channel) query.channel = channel;

    const failedLogs = await ReminderDeliveryLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('reminderId', 'title dueDate');

    return failedLogs.map(log => ({
      logId: log._id,
      reminderId: log.reminderId,
      channel: log.channel,
      recipient: log.recipient,
      error: log.errorMessage,
      failedAt: log.createdAt,
      retryCount: log.retryCount,
      canRetry: log.retryCount < log.maxRetries
    }));
  } catch (error) {
    logger.error('Error fetching failed deliveries:', error);
    throw error;
  }
}

/**
 * Retry a failed delivery
 */
async function retryFailedDelivery(logId, userId) {
  try {
    const log = await ReminderDeliveryLog.findById(logId);

    if (!log || log.userId !== userId) {
      throw new Error('Delivery log not found');
    }

    const result = await log.retry();

    logger.info(`Retry initiated for delivery ${logId}`, {
      retryCount: result.retryCount,
      channel: log.channel
    });

    return result;
  } catch (error) {
    logger.error('Error retrying delivery:', error);
    throw error;
  }
}

/**
 * Get delivery trend for dashboard
 */
async function getDeliveryTrend(userId, daysBack = 30, channel = null) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const match = {
      userId,
      createdAt: { $gte: startDate }
    };
    if (channel) match.channel = channel;

    const trend = await ReminderDeliveryLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Format for chart
    const formatted = {};
    trend.forEach(item => {
      const date = item._id.date;
      if (!formatted[date]) formatted[date] = { sent: 0, failed: 0, pending: 0 };
      formatted[date][item._id.status] = item.count;
    });

    return Object.entries(formatted).map(([date, data]) => ({
      date,
      ...data
    }));
  } catch (error) {
    logger.error('Error fetching delivery trend:', error);
    throw error;
  }
}

/**
 * Get provider name from channel
 */
function getProvider(channel) {
  const providers = {
    'SMS': 'Twilio',
    'WhatsApp': 'Twilio WhatsApp',
    'Telegram': 'Telegram Bot',
    'Email': 'Nodemailer',
    'Push': 'Firebase/WebPush',
    'Call': 'Twilio Voice'
  };
  return providers[channel] || 'Unknown';
}

/**
 * Clean up old delivery logs (manual cleanup, also auto-expires at 30 days)
 */
async function cleanupOldLogs(daysToKeep = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await ReminderDeliveryLog.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    logger.info(`Cleaned up ${result.deletedCount} old delivery logs`);
    return result.deletedCount;
  } catch (error) {
    logger.error('Error cleaning up logs:', error);
    throw error;
  }
}

module.exports = {
  logDelivery,
  getUserDeliveryStats,
  getChannelStats,
  getFailedDeliveries,
  retryFailedDelivery,
  getDeliveryTrend,
  updateReminderDeliveryStats,
  cleanupOldLogs
};
