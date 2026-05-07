const mongoose = require('mongoose');

const trackingLinkSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
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
    // Expiry
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Auto-delete after expiry
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Access tracking
    accessCount: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: Date,
    accessLog: [
      {
        timestamp: Date,
        ipAddress: String,
        userAgent: String,
        _id: false,
      },
    ],
    // Revocation
    revokedAt: Date,
    revokeReason: String,
  },
  { timestamps: true }
);

// Index for finding by token
trackingLinkSchema.index({ token: 1 });

// Index for finding active links by incident
trackingLinkSchema.index({ incidentId: 1, active: 1 });

// Index for cleanup of expired links
trackingLinkSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('TrackingLink', trackingLinkSchema);
