const mongoose = require('mongoose');

const healthcareWearableDataSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dataSource: {
      type: String,
      enum: ['apple_health', 'google_fit', 'fitbit', 'garmin', 'manual', 'other'],
      required: true,
      index: true,
    },
    dataType: {
      type: String,
      enum: [
        'steps',
        'heart_rate',
        'sleep',
        'blood_pressure',
        'blood_glucose',
        'weight',
        'calories',
        'distance',
        'exercise',
        'oxygen_saturation',
        'body_temperature',
        'water_intake',
      ],
      required: true,
      index: true,
    },
    value: { type: Number, required: true },
    unit: { type: String, required: true, trim: true },
    recordedAt: { type: Date, required: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    deviceInfo: { type: String, default: '', trim: true },
    syncedAt: { type: Date, default: Date.now },
    isAnomaly: { type: Boolean, default: false },
    anomalyReason: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

healthcareWearableDataSchema.index({ userId: 1, dataType: 1, recordedAt: -1 });
healthcareWearableDataSchema.index({ userId: 1, recordedAt: -1 });

module.exports = mongoose.model('HealthcareWearableData', healthcareWearableDataSchema);
