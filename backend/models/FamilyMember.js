const mongoose = require('mongoose');

const familyMemberSchema = new mongoose.Schema({
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MatrimonialProfile',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  relationship: {
    type: String,
    required: true,
    enum: ['mother', 'father', 'brother', 'sister', 'uncle', 'aunt', 'cousin', 'friend', 'other']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  permissions: {
    viewProfile: {
      type: Boolean,
      default: true
    },
    editProfile: {
      type: Boolean,
      default: false
    },
    viewMatches: {
      type: Boolean,
      default: true
    },
    sendInterests: {
      type: Boolean,
      default: false
    },
    respondToInterests: {
      type: Boolean,
      default: false
    },
    accessChat: {
      type: Boolean,
      default: false
    },
    viewShortlist: {
      type: Boolean,
      default: true
    },
    addToShortlist: {
      type: Boolean,
      default: false
    },
    scheduleVideoCalls: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'revoked'],
    default: 'pending'
  },
  invitationToken: {
    type: String,
    unique: true,
    sparse: true
  },
  invitationExpiry: {
    type: Date
  },
  acceptedAt: {
    type: Date
  },
  lastActive: {
    type: Date
  },
  activityLog: [{
    action: {
      type: String,
      enum: ['login', 'viewProfile', 'editProfile', 'sendInterest', 'respondInterest', 'chat', 'addShortlist', 'removeShortlist', 'scheduleCall']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    device: String,
    details: mongoose.Schema.Types.Mixed
  }],
  notes: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Indexes for performance
familyMemberSchema.index({ profileId: 1, userId: 1 });
familyMemberSchema.index({ invitationToken: 1 });
familyMemberSchema.index({ status: 1 });

// Generate invitation token
familyMemberSchema.methods.generateInvitationToken = function() {
  const crypto = require('crypto');
  this.invitationToken = crypto.randomBytes(32).toString('hex');
  this.invitationExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  return this.invitationToken;
};

// Check if permission is granted
familyMemberSchema.methods.hasPermission = function(permission) {
  return this.status === 'active' && this.permissions[permission] === true;
};

// Log activity
familyMemberSchema.methods.logActivity = function(action, details = {}) {
  this.activityLog.push({
    action,
    timestamp: new Date(),
    details
  });
  this.lastActive = new Date();
  
  // Keep only last 100 activities
  if (this.activityLog.length > 100) {
    this.activityLog = this.activityLog.slice(-100);
  }
};

module.exports = mongoose.model('FamilyMember', familyMemberSchema);
