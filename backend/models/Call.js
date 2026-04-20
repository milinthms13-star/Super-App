const mongoose = require('mongoose');

const callSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    initiatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    callType: {
      type: String,
      enum: ['audio', 'video'],
      required: true,
    },
    status: {
      type: String,
      enum: ['initiating', 'ringing', 'accepted', 'declined', 'missed', 'ended'],
      default: 'initiating',
    },
    startedAt: Date,
    endedAt: Date,
    duration: Number, // in seconds
    declinedReason: String,
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        joinedAt: Date,
        leftAt: Date,
        quality: {
          type: String,
          enum: ['excellent', 'good', 'fair', 'poor'],
        },
        audioEnabled: Boolean,
        videoEnabled: Boolean,
        screenShareEnabled: Boolean,
      },
    ],
    recordingUrl: String,
    recordingDuration: Number,
    iceCandidates: [Object], // WebRTC ICE candidates
    sdpOffer: String,
    sdpAnswer: String,
    stats: {
      averageBitrate: Number,
      averageLatency: Number,
      packetLoss: Number,
    },
    messages: [
      {
        senderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        content: String,
        timestamp: Date,
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    indexes: [{ key: { chatId: 1, createdAt: -1 } }, { key: { initiatorId: 1 } }],
  }
);

// TTL index - auto delete after 30 days
callSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('Call', callSchema);
