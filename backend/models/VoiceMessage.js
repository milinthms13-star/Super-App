const mongoose = require('mongoose');

const voiceMessageSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    chatId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    duration: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    fileHash: {
      type: String,
      required: true,
      index: true,
    },
    storagePath: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    transcription: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    transcriptionStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    detectedLanguage: {
      type: String,
      default: null,
    },
    waveform: {
      type: [Number],
      default: [],
    },
    device: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

voiceMessageSchema.index({ chatId: 1, createdAt: -1 });
voiceMessageSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.VoiceMessage || mongoose.model('VoiceMessage', voiceMessageSchema);
