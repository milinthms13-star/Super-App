const mongoose = require('mongoose');

// Chat messages between rider and customer
const ChatSchema = new mongoose.Schema({
  // References
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodDeliveryOrder',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodDeliveryRestaurant',
    required: true,
  },
  deliveryPersonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider',
    required: true,
  },

  // Message details
  messages: [
    {
      _id: mongoose.Schema.Types.ObjectId,
      sender: {
        type: String,
        enum: ['customer', 'rider', 'system'],
        required: true,
      },
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      senderName: String,
      senderImage: String,

      messageType: {
        type: String,
        enum: ['text', 'location', 'call', 'image', 'system'],
        default: 'text',
      },

      content: String,

      // For location messages
      location: {
        latitude: Number,
        longitude: Number,
        address: String,
      },

      // For call messages
      callData: {
        type: {
          type: String,
          enum: ['audio', 'video'],
        },
        duration: Number, // seconds
        status: {
          type: String,
          enum: ['initiated', 'accepted', 'completed', 'missed', 'rejected'],
        },
        initiatedAt: Date,
        endedAt: Date,
      },

      // For image messages
      imageUrl: String,

      // Status
      isRead: {
        type: Boolean,
        default: false,
      },
      readAt: Date,

      timestamp: {
        type: Date,
        default: Date.now,
        index: true,
      },

      // Reactions/quick replies
      reactions: [
        {
          type: String, // emoji
          count: Number,
          users: [mongoose.Schema.Types.ObjectId],
        },
      ],

      // For context
      previousMessageId: mongoose.Schema.Types.ObjectId,
    },
  ],

  // Chat metadata
  chatStatus: {
    type: String,
    enum: ['active', 'closed', 'archived'],
    default: 'active',
    index: true,
  },

  participants: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      image: String,
      role: {
        type: String,
        enum: ['customer', 'rider'],
      },
      joinedAt: Date,
    },
  ],

  // Quick reply templates (pre-defined messages)
  quickReplies: [
    {
      label: String,
      message: String,
      emoji: String,
      usageCount: {
        type: Number,
        default: 0,
      },
    },
  ],

  // Block status
  isBlocked: {
    type: Boolean,
    default: false,
  },
  blockedBy: String, // customer or rider
  blockedAt: Date,

  // Call history
  callHistory: [
    {
      callType: {
        type: String,
        enum: ['audio', 'video', 'none'],
      },
      initiatedBy: String, // customer or rider
      duration: Number, // seconds
      status: {
        type: String,
        enum: ['completed', 'missed', 'rejected'],
      },
      timestamp: Date,
    },
  ],

  // Chat settings
  muteNotifications: {
    type: Boolean,
    default: false,
  },

  // Unread count
  unreadCountCustomer: {
    type: Number,
    default: 0,
  },
  unreadCountRider: {
    type: Number,
    default: 0,
  },

  // Last message
  lastMessage: {
    content: String,
    sender: String,
    timestamp: Date,
  },

  // Chat attachments/media
  media: [
    {
      type: {
        type: String,
        enum: ['image', 'video', 'document'],
      },
      url: String,
      title: String,
      uploadedAt: Date,
      uploadedBy: String,
    },
  ],

}, {
  collection: 'fooddeliverychats',
  timestamps: true,
});

// Index for efficient queries
ChatSchema.index({ orderId: 1, 'messages.timestamp': -1 });
ChatSchema.index({ userId: 1, deliveryPersonId: 1, orderId: 1 });
ChatSchema.index({ 'messages.isRead': 1, 'messages.timestamp': -1 });

// TTL Index: Auto-delete 30 days after chat closure
ChatSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 2592000, // 30 days
    partialFilterExpression: { chatStatus: 'closed' },
  }
);

// Methods
ChatSchema.methods.addMessage = function(sender, senderId, senderName, messageType, content, locationData = null) {
  if (!this.messages) this.messages = [];

  const messageId = new mongoose.Types.ObjectId();
  const message = {
    _id: messageId,
    sender,
    senderId,
    senderName,
    messageType,
    content,
    timestamp: new Date(),
    isRead: false,
  };

  if (messageType === 'location' && locationData) {
    message.location = locationData;
  }

  this.messages.push(message);

  // Update last message
  this.lastMessage = {
    content,
    sender,
    timestamp: new Date(),
  };

  // Update unread count
  if (sender === 'customer') {
    this.unreadCountRider = (this.unreadCountRider || 0) + 1;
  } else if (sender === 'rider') {
    this.unreadCountCustomer = (this.unreadCountCustomer || 0) + 1;
  }

  return messageId;
};

ChatSchema.methods.markAsRead = function(reader) {
  if (!this.messages) return;

  const now = new Date();
  let updatedCount = 0;

  this.messages.forEach((message) => {
    if (!message.isRead) {
      const isRelevant = reader === 'customer' ? message.sender === 'rider' : message.sender === 'customer';
      if (isRelevant) {
        message.isRead = true;
        message.readAt = now;
        updatedCount++;
      }
    }
  });

  // Reset unread count for reader
  if (reader === 'customer') {
    this.unreadCountCustomer = 0;
  } else if (reader === 'rider') {
    this.unreadCountRider = 0;
  }

  return updatedCount;
};

ChatSchema.methods.getUnreadMessages = function(reader) {
  if (!this.messages) return [];

  return this.messages.filter((msg) => {
    if (msg.isRead) return false;
    return reader === 'customer' ? msg.sender === 'rider' : msg.sender === 'customer';
  });
};

ChatSchema.methods.addQuickReply = function(label, message, emoji = '👍') {
  if (!this.quickReplies) this.quickReplies = [];

  const existing = this.quickReplies.find((qr) => qr.label === label);
  if (existing) {
    existing.usageCount = (existing.usageCount || 0) + 1;
  } else {
    this.quickReplies.push({
      label,
      message,
      emoji,
      usageCount: 0,
    });
  }

  return this.quickReplies;
};

ChatSchema.methods.initiateCall = function(callType, initiator) {
  if (!this.callHistory) this.callHistory = [];

  const callRecord = {
    callType, // audio or video
    initiatedBy: initiator,
    status: 'initiated',
    timestamp: new Date(),
  };

  this.callHistory.push(callRecord);
  return callRecord;
};

ChatSchema.methods.endCall = function(status = 'completed') {
  if (!this.callHistory || this.callHistory.length === 0) return null;

  const lastCall = this.callHistory[this.callHistory.length - 1];
  if (lastCall.status === 'initiated') {
    lastCall.status = status;
    lastCall.duration = Math.round((new Date() - lastCall.timestamp) / 1000);
    return lastCall;
  }

  return null;
};

ChatSchema.methods.blockChat = function(blockedBy) {
  this.isBlocked = true;
  this.blockedBy = blockedBy;
  this.blockedAt = new Date();
};

ChatSchema.methods.unblockChat = function() {
  this.isBlocked = false;
  this.blockedBy = null;
  this.blockedAt = null;
};

ChatSchema.methods.getRecentMessages = function(limit = 50) {
  if (!this.messages) return [];

  return this.messages.slice(-limit);
};

ChatSchema.methods.getSummary = function() {
  return {
    chatId: this._id,
    orderId: this.orderId,
    userId: this.userId,
    deliveryPersonId: this.deliveryPersonId,
    participants: this.participants,
    messageCount: this.messages ? this.messages.length : 0,
    unreadCount: {
      customer: this.unreadCountCustomer,
      rider: this.unreadCountRider,
    },
    lastMessage: this.lastMessage,
    chatStatus: this.chatStatus,
    isBlocked: this.isBlocked,
    createdAt: this.createdAt,
  };
};

ChatSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  // Limit messages to last 50 for JSON output
  if (obj.messages && obj.messages.length > 50) {
    obj.messageCount = obj.messages.length;
    obj.messages = obj.messages.slice(-50);
  }
  return obj;
};

module.exports = mongoose.model('FoodDeliveryChat', ChatSchema);
