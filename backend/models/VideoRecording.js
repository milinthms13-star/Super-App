const mongoose = require('mongoose');

/**
 * VideoRecording Schema
 * Store metadata and lifecycle info for recorded emergency videos
 * Videos are stored in /public/videos with TTL cleanup
 */
const videoRecordingSchema = new mongoose.Schema(
  {
    // References
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

    // File Information
    filename: {
      type: String,
      required: true,
      unique: true,
    },
    filepath: {
      type: String,
      required: true,
    },
    publicPath: {
      type: String,
      required: true,
    },
    filesize: {
      type: Number,
      required: true, // in bytes
    },
    mimeType: {
      type: String,
      default: 'video/mp4',
      enum: ['video/mp4', 'video/webm', 'video/quicktime'],
    },

    // Duration & Quality
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    quality: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    codec: {
      type: String,
      default: 'h264,aac',
    },

    // Transcoding
    transcodingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'skipped'],
      default: 'pending',
    },
    transcodingError: {
      type: String,
      default: null,
    },
    transcodingProgress: {
      type: Number,
      default: 0, // 0-100
    },

    // Storage & Lifecycle
    storedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days TTL
      index: true,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },

    // Access & Analytics
    accessCount: {
      type: Number,
      default: 0,
    },
    accessLog: [
      {
        accessedAt: Date,
        accessedBy: mongoose.Schema.Types.ObjectId,
        ipAddress: String,
      },
    ],

    // Video Quality Metadata
    audioQuality: {
      sampleRate: { type: Number, default: 48000 }, // Hz
      channels: { type: Number, default: 2 },
      bitrate: { type: String, default: '128k' },
    },
    videoQuality: {
      width: { type: Number, default: 1280 },
      height: { type: Number, default: 720 },
      fps: { type: Number, default: 30 },
      bitrate: { type: String, default: '2500k' },
    },

    // Audio Analysis
    analysis: {
      speechDetected: { type: Boolean, default: false },
      noiseLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
      clarity: { type: Number, min: 0, max: 100, default: 75 }, // 0-100%
    },

    // Metadata
    metadata: {
      originalMimeType: String,
      transcodedAt: Date,
      preset: String, // FFmpeg preset used (ultrafast, fast, medium, slow)
      crfQuality: Number, // Quality 0-51 (lower = better)
      capturedFrom: { type: String, enum: ['app', 'web', 'mobile'], default: 'app' },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// TTL Index: Auto-delete after 90 days
videoRecordingSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// Compound indexes for fast queries
videoRecordingSchema.index({ incidentId: 1, storedAt: -1 });
videoRecordingSchema.index({ userId: 1, storedAt: -1 });
videoRecordingSchema.index({ transcodingStatus: 1 });
videoRecordingSchema.index({ archived: 1, deletedAt: 1 });

// Virtual: Formatted file size
videoRecordingSchema.virtual('fileSizeFormatted').get(function () {
  const size = this.filesize;
  if (size === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.floor(Math.log(size) / Math.log(1024));
  return `${(size / Math.pow(1024, unitIndex)).toFixed(2)} ${units[unitIndex]}`;
});

// Virtual: Duration formatted (MM:SS)
videoRecordingSchema.virtual('durationFormatted').get(function () {
  const mins = Math.floor(this.duration / 60);
  const secs = this.duration % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
});

// Virtual: Is expired
videoRecordingSchema.virtual('isExpired').get(function () {
  return new Date() > this.expiresAt;
});

// Method: Record access
videoRecordingSchema.methods.recordAccess = async function (userId, ipAddress) {
  this.accessCount += 1;
  this.accessLog.push({
    accessedAt: new Date(),
    accessedBy: userId,
    ipAddress,
  });
  return this.save();
};

// Method: Mark as archived
videoRecordingSchema.methods.archive = async function () {
  this.archived = true;
  return this.save();
};

// Method: Mark as deleted
videoRecordingSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  return this.save();
};

// Pre-delete hook: Clean up physical file
videoRecordingSchema.pre('deleteOne', async function (next) {
  try {
    const doc = await this.model.findOne(this.getFilter());
    if (doc && doc.filepath) {
      const fs = require('fs').promises;
      const path = require('path');
      try {
        await fs.unlink(doc.filepath);
      } catch (err) {
        // File may already be deleted
        console.warn(`Could not delete physical file: ${doc.filepath}`);
      }
    }
  } catch (error) {
    console.error('Pre-delete hook error:', error);
  }
  next();
});

module.exports = mongoose.model('VideoRecording', videoRecordingSchema);
