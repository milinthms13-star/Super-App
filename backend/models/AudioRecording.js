const mongoose = require('mongoose');

/**
 * AudioRecording Schema
 * Stores metadata about audio recordings attached to SOS incidents
 */
const audioRecordingSchema = new mongoose.Schema(
  {
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SosIncident',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Audio metadata
    filename: {
      type: String,
      required: true,
      unique: true,
    },
    filesize: {
      type: Number,
      required: true, // Bytes
    },
    duration: {
      type: Number, // Seconds
      default: 0,
    },
    mimeType: {
      type: String,
      enum: ['audio/webm', 'audio/mp3', 'audio/wav'],
      default: 'audio/webm',
    },
    publicPath: {
      type: String,
      required: true,
    },
    // Access control
    storedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      index: { expireAfterSeconds: 0 }, // Auto-delete
    },
    // Usage tracking
    accessCount: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: Date,
    // Quality metrics
    audioQuality: {
      sampleRate: Number,
      bitDepth: Number,
      channels: Number, // 1=mono, 2=stereo
    },
    // Metadata
    ambient: {
      // Detected ambient sounds
      type: [String],
      enum: ['traffic', 'wind', 'rain', 'voices', 'alarm', 'siren', 'music'],
    },
    analysis: {
      // Audio analysis results (future ML)
      speechDetected: Boolean,
      noiseLevel: { type: String, enum: ['low', 'medium', 'high'] },
      clarity: { type: Number, min: 0, max: 1 }, // 0-1 clarity score
    },
    // Retention policy
    archived: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
  },
  { timestamps: true }
);

// Index for efficient queries
audioRecordingSchema.index({ incidentId: 1, storedAt: -1 });
audioRecordingSchema.index({ userId: 1, storedAt: -1 });
audioRecordingSchema.index({ expiresAt: 1 });

// TTL index for auto-deletion
audioRecordingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AudioRecording', audioRecordingSchema);
