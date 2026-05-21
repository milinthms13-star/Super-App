const mongoose = require('mongoose');

const astrologyOperationalEventSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['booking', 'payment', 'webhook', 'security', 'system'],
      required: true,
      index: true,
    },
    eventType: { type: String, required: true, trim: true, index: true },
    severity: {
      type: String,
      enum: ['info', 'warn', 'critical'],
      default: 'warn',
      index: true,
    },
    message: { type: String, required: true, trim: true },
    consultantId: { type: String, default: '', trim: true, index: true },
    bookingId: { type: String, default: '', trim: true, index: true },
    userId: { type: String, default: '', trim: true, index: true },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

astrologyOperationalEventSchema.index({ createdAt: -1, category: 1, eventType: 1 });

module.exports =
  mongoose.models.AstrologyOperationalEvent ||
  mongoose.model('AstrologyOperationalEvent', astrologyOperationalEventSchema);
