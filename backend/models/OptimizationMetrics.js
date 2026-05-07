const mongoose = require('mongoose');

const optimizationMetricsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        'message-send',
        'message-receive',
        'typing-indicator',
        'read-receipt',
        'connection',
        'disconnection',
        'batch-delivery',
        'delta-sync',
        'duplicate-check',
        'heartbeat',
      ],
      required: true,
      index: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
    },
    deviceId: String,
    networkType: {
      type: String,
      enum: ['wifi', '4g', '5g', 'lte', 'cellular', 'unknown'],
    },
    messageSize: Number,
    payloadSize: Number,
    isCompressed: Boolean,
    isDeltaSync: Boolean,
    batchSize: Number,
    errorOccurred: {
      type: Boolean,
      default: false,
    },
    errorType: String,
    clientTimestamp: Date,
    serverTimestamp: {
      type: Date,
      default: Date.now,
    },
    latency: Number,
    jitter: Number,
    packetLoss: Number,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
optimizationMetricsSchema.index({ userId: 1, eventType: 1, createdAt: -1 });
optimizationMetricsSchema.index({ eventType: 1, createdAt: -1 });
optimizationMetricsSchema.index({ userId: 1, createdAt: -1 });

// TTL index - keep metrics for 30 days
optimizationMetricsSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 2592000,
  }
);

module.exports = mongoose.model('OptimizationMetrics', optimizationMetricsSchema);
