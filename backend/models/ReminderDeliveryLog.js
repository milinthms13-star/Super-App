const mongoose = require('mongoose');

const reminderDeliveryLogSchema = new mongoose.Schema({
  reminderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reminder',
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  channel: {
    type: String,
    enum: ['In-app', 'SMS', 'Call', 'Email', 'WhatsApp', 'Telegram', 'Push'],
    required: true,
    index: true
  },
  offsetMinutes: {
    type: Number,
    required: true  // Which offset triggered this delivery
  },
  scheduledTime: {
    type: Date,
    required: true  // When it was supposed to go out
  },
  deliveredAt: {
    type: Date  // Actual delivery time
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'bounced', 'undelivered'],
    default: 'pending',
    index: true
  },
  recipient: {
    type: String  // Phone number, email, chat ID, etc.
  },
  errorMessage: {
    type: String  // Error details if failed
  },
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  metadata: {
    messageId: String,  // Provider message ID (SMS SID, email Message-ID, etc.)
    duration: Number,    // Delivery time in ms
    provider: String,    // Provider name (Twilio, SendGrid, Firebase, etc.)
    deviceInfo: String   // Device info for push notifications
  },

  // Analytics fields
  reminderTitle: String,
  reminderCategory: String,
  reminderPriority: String,
  userTimezone: String,
  isRetry: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now,
    expires: 2592000  // Auto-delete after 30 days
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient queries
reminderDeliveryLogSchema.index({ userId: 1, createdAt: -1 });
reminderDeliveryLogSchema.index({ channel: 1, status: 1, createdAt: -1 });
reminderDeliveryLogSchema.index({ reminderId: 1, channel: 1 });
reminderDeliveryLogSchema.index({ status: 1, createdAt: -1 });

/**
 * Get delivery success rate
 */
reminderDeliveryLogSchema.statics.getSuccessRate = async function(userId, channel = null, startDate = null) {
  const match = { userId };
  if (channel) match.channel = channel;
  if (startDate) match.createdAt = { $gte: startDate };

  const [stats] = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
      }
    }
  ]);

  if (!stats) return { total: 0, sent: 0, failed: 0, successRate: 0 };

  return {
    total: stats.total,
    sent: stats.sent,
    failed: stats.failed,
    successRate: stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(2) + '%' : '0%'
  };
};

/**
 * Get delivery analytics for dashboard
 */
reminderDeliveryLogSchema.statics.getAnalytics = async function(userId, daysBack = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const deliveryByChannel = await this.aggregate([
    {
      $match: {
        userId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$channel',
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
      }
    },
    { $sort: { total: -1 } }
  ]);

  const deliveryTrend = await this.aggregate([
    {
      $match: {
        userId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 },
        sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return {
    period: `${daysBack} days`,
    deliveryByChannel,
    deliveryTrend,
    totalDeliveries: deliveryByChannel.reduce((sum, d) => sum + d.total, 0)
  };
};

/**
 * Retry failed delivery
 */
reminderDeliveryLogSchema.methods.retry = async function() {
  if (this.retryCount >= this.maxRetries) {
    throw new Error('Max retries exceeded');
  }

  this.retryCount += 1;
  this.isRetry = true;
  this.status = 'pending';
  await this.save();

  return {
    retryCount: this.retryCount,
    maxRetries: this.maxRetries,
    canRetry: this.retryCount < this.maxRetries
  };
};

module.exports = mongoose.model('ReminderDeliveryLog', reminderDeliveryLogSchema);
