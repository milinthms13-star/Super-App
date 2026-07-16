const mongoose = require('mongoose');

const autoReplyRuleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  enabled: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  scheduleStart: {
    type: Date
  },
  scheduleEnd: {
    type: Date
  },
  excludedContacts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  triggeredCount: {
    type: Number,
    default: 0
  },
  lastTriggeredAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Method to check if auto-reply is active
autoReplyRuleSchema.methods.isActive = function() {
  if (!this.enabled) return false;
  
  const now = new Date();
  
  if (this.scheduleStart && now < this.scheduleStart) return false;
  if (this.scheduleEnd && now > this.scheduleEnd) return false;
  
  return true;
};

module.exports = mongoose.model('AutoReplyRule', autoReplyRuleSchema);
