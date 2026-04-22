const mongoose = require('mongoose');

const sosContactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  relation: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['Primary', 'Backup', 'Escalation'],
    default: 'Backup'
  },
  notifyBy: [{
    type: String,
    enum: ['Push', 'SMS', 'Call'],
    default: ['Push']
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

sosContactSchema.index({ userId: 1, priority: 1 });

module.exports = mongoose.model('SosContact', sosContactSchema);

