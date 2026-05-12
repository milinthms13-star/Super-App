const mongoose = require('mongoose');

const experimentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true, trim: true },
    experimentName: { type: String, required: true, index: true, trim: true },
    variant: { type: String, required: true, trim: true },
    eventType: { type: String, required: true, trim: true },
    eventData: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Experiment || mongoose.model('Experiment', experimentSchema);
