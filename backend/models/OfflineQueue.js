const mongoose = require('mongoose');

const offlineQueueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'location', 'contact'],
    default: 'text'
  },
  media: {
    url: String,
    filename: String,
    size: Number,
    mimeType: String,
    thumbnail: String
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  status: {
    type: String,
    enum: ['pending', 'synced', 'failed'],
    default: 'pending',
    index: true
  },
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastError: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
offlineQueueSchema.index({ userId: 1, status: 1, createdAt: 1 });

// Auto-delete synced messages after 7 days
offlineQueueSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('OfflineQueue', offlineQueueSchema);
