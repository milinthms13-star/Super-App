const mongoose = require('mongoose');

// Push notifications and SMS for food delivery
const NotificationSchema = new mongoose.Schema({
  // Recipients
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  deliveryPersonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider',
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodDeliveryRestaurant',
  },

  // Reference to order
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodDeliveryOrder',
    index: true,
  },

  // Notification type
  notificationType: {
    type: String,
    enum: [
      // Customer notifications
      'order_confirmed',
      'order_preparing',
      'order_ready',
      'rider_assigned',
      'rider_nearby',
      'rider_arrived',
      'order_delivered',
      'order_cancelled',
      'order_issue',
      'refund_processed',
      'delivery_delayed',
      'new_message',
      'call_incoming',
      'promotional',
      // Rider notifications
      'new_order_assigned',
      'order_details_updated',
      'customer_called',
      'customer_message',
      'delivery_completed',
      'payment_received',
      // Restaurant notifications
      'new_order_received',
      'order_cancelled_by_customer',
      'delivery_completed_confirmed',
    ],
    required: true,
    index: true,
  },

  // Content
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  image: String,

  // Data payload for deep linking
  data: {
    orderId: String,
    screen: String, // order_tracking, chat, order_details
    action: String, // view_order, accept_call, open_chat
    metadata: mongoose.Schema.Types.Mixed,
  },

  // Delivery channels
  channels: [
    {
      type: {
        type: String,
        enum: ['push', 'sms', 'email', 'in_app'],
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
        default: 'pending',
      },
      phoneNumber: String, // for SMS
      email: String, // for email
      deviceToken: String, // for push
      sentAt: Date,
      deliveredAt: Date,
      readAt: Date,
      error: String,
      retryCount: {
        type: Number,
        default: 0,
      },
    },
  ],

  // User preferences
  userPreferences: {
    muteNotifications: Boolean,
    doNotDisturb: {
      enabled: Boolean,
      startTime: String, // HH:mm
      endTime: String, // HH:mm
    },
    notificationSettings: {
      orderUpdates: Boolean,
      deliveryUpdates: Boolean,
      messages: Boolean,
      promotions: Boolean,
    },
  },

  // Scheduling
  scheduledFor: Date,
  isPriority: {
    type: Boolean,
    default: false,
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'sent', 'delivered', 'read', 'failed', 'cancelled'],
    default: 'pending',
    index: true,
  },

  // Analytics
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: Date,
  clickedAt: Date,
  clickedUrl: String,

  // Retry logic
  nextRetryAt: Date,
  failureReason: String,

  // Context
  context: {
    previousStatus: String,
    newStatus: String,
    eta: Number, // minutes
    distance: Number, // km
    reason: String,
  },

  // Expiry (old notifications auto-delete)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  },
}, { collection: 'fooddeliverynotifications', timestamps: true });

// TTL Index: Auto-delete expired notifications
NotificationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// Indexes for efficient queries
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ deliveryPersonId: 1, createdAt: -1 });
NotificationSchema.index({ orderId: 1, createdAt: -1 });
NotificationSchema.index({ status: 1, createdAt: -1 });
NotificationSchema.index({ 'channels.status': 1, nextRetryAt: 1 });

// Methods
NotificationSchema.methods.addChannel = function(channelType, details = {}) {
  if (!this.channels) this.channels = [];

  const channel = {
    type: channelType,
    status: 'pending',
    ...details,
  };

  this.channels.push(channel);
  return channel;
};

NotificationSchema.methods.markChannelSent = function(channelType) {
  if (!this.channels) return false;

  const channel = this.channels.find((ch) => ch.type === channelType);
  if (channel) {
    channel.status = 'sent';
    channel.sentAt = new Date();
    return true;
  }

  return false;
};

NotificationSchema.methods.markChannelDelivered = function(channelType) {
  if (!this.channels) return false;

  const channel = this.channels.find((ch) => ch.type === channelType);
  if (channel) {
    channel.status = 'delivered';
    channel.deliveredAt = new Date();
    return true;
  }

  return false;
};

NotificationSchema.methods.markChannelFailed = function(channelType, error) {
  if (!this.channels) return false;

  const channel = this.channels.find((ch) => ch.type === channelType);
  if (channel) {
    channel.status = 'failed';
    channel.error = error;
    channel.retryCount = (channel.retryCount || 0) + 1;

    // Schedule retry (exponential backoff: 5min, 15min, 1hour)
    const retryDelays = [5, 15, 60]; // minutes
    const delay = retryDelays[Math.min(channel.retryCount - 1, retryDelays.length - 1)];
    channel.nextRetryAt = new Date(Date.now() + delay * 60 * 1000);

    return true;
  }

  return false;
};

NotificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  this.status = 'read';

  // Mark all delivered channels as read
  if (this.channels) {
    this.channels.forEach((channel) => {
      if (channel.status === 'delivered') {
        channel.status = 'read';
        channel.readAt = new Date();
      }
    });
  }
};

NotificationSchema.methods.markClicked = function(url) {
  this.clickedAt = new Date();
  this.clickedUrl = url;
};

NotificationSchema.methods.shouldRetry = function() {
  const maxRetries = 3;
  if (!this.channels) return false;

  return this.channels.some(
    (ch) => ch.status === 'failed' && (ch.retryCount || 0) < maxRetries
  );
};

NotificationSchema.methods.getChannelStatus = function() {
  const status = {};
  
  if (this.channels) {
    this.channels.forEach((ch) => {
      status[ch.type] = {
        status: ch.status,
        sentAt: ch.sentAt,
        deliveredAt: ch.deliveredAt,
        readAt: ch.readAt,
        error: ch.error,
      };
    });
  }

  return status;
};

NotificationSchema.methods.applyUserPreferences = function(preferences) {
  this.userPreferences = preferences;

  // Don't send if muted
  if (preferences.muteNotifications) {
    this.status = 'cancelled';
    return false;
  }

  // Check DND (Do Not Disturb)
  if (preferences.doNotDisturb?.enabled) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Simple comparison (doesn't handle midnight edge case)
    if (currentTime >= preferences.doNotDisturb.startTime && currentTime < preferences.doNotDisturb.endTime) {
      // Schedule for after DND
      const [endHour, endMin] = preferences.doNotDisturb.endTime.split(':');
      const endTime = new Date();
      endTime.setHours(parseInt(endHour), parseInt(endMin), 0);
      if (endTime <= now) {
        endTime.setDate(endTime.getDate() + 1);
      }
      this.scheduledFor = endTime;
      this.status = 'scheduled';
      return true;
    }
  }

  // Check notification type preferences
  const prefKey = this.notificationType.replace('_', '');
  if (preferences.notificationSettings && !preferences.notificationSettings[this.notificationType.split('_')[0]]) {
    this.status = 'cancelled';
    return false;
  }

  return true;
};

NotificationSchema.methods.getSummary = function() {
  return {
    notificationId: this._id,
    orderId: this.orderId,
    title: this.title,
    body: this.body,
    type: this.notificationType,
    status: this.status,
    isRead: this.isRead,
    channels: this.getChannelStatus(),
    createdAt: this.createdAt,
    readAt: this.readAt,
  };
};

NotificationSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  delete obj.expiresAt; // Don't expose TTL field
  return obj;
};

module.exports = mongoose.model('FoodDeliveryNotification', NotificationSchema);
