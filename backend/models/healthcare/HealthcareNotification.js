const mongoose = require('mongoose');

const healthcareNotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    notificationType: {
      type: String,
      enum: ['appointment', 'pharmacy', 'refill', 'emergency', 'partner', 'record', 'system'],
      default: 'system',
      index: true,
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

healthcareNotificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('HealthcareNotification', healthcareNotificationSchema);
