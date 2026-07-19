const mongoose = require('mongoose');

const studyGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member',
    },
    active: {
      type: Boolean,
      default: true,
    },
  }],
  maxMembers: {
    type: Number,
    default: 50,
  },
  privacy: {
    type: String,
    enum: ['public', 'private', 'invite-only'],
    default: 'public',
    index: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active',
    index: true,
  },
  tags: [String],
  studySessions: [{
    title: String,
    scheduledAt: Date,
    duration: Number, // in minutes
    topic: String,
    meetingLink: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    attendees: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
  }],
  resources: [{
    title: String,
    description: String,
    url: String,
    type: {
      type: String,
      enum: ['document', 'video', 'link', 'file'],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  stats: {
    totalMessages: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 },
    avgAttendance: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
});

// Indexes
studyGroupSchema.index({ subject: 1, status: 1 });
studyGroupSchema.index({ 'members.userId': 1 });
studyGroupSchema.index({ createdBy: 1 });

// Virtual for member count
studyGroupSchema.virtual('memberCount').get(function() {
  return this.members.filter(m => m.active).length;
});

// Virtual for is full
studyGroupSchema.virtual('isFull').get(function() {
  return this.memberCount >= this.maxMembers;
});

// Method to add member
studyGroupSchema.methods.addMember = function(userId, role = 'member') {
  const existing = this.members.find(m => m.userId.equals(userId));
  
  if (existing) {
    if (!existing.active) {
      existing.active = true;
      existing.joinedAt = new Date();
    }
    return this.save();
  }
  
  if (this.isFull) {
    throw new Error('Study group is full');
  }
  
  this.members.push({
    userId,
    role,
    joinedAt: new Date(),
    active: true,
  });
  
  return this.save();
};

// Method to remove member
studyGroupSchema.methods.removeMember = function(userId) {
  const member = this.members.find(m => m.userId.equals(userId));
  
  if (member) {
    member.active = false;
  }
  
  return this.save();
};

// Method to check if user is member
studyGroupSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.userId.equals(userId) && m.active);
};

// Method to check if user is admin
studyGroupSchema.methods.isAdmin = function(userId) {
  const member = this.members.find(m => m.userId.equals(userId) && m.active);
  return member && (member.role === 'admin' || this.createdBy.equals(userId));
};

// Static method to find user's groups
studyGroupSchema.statics.findUserGroups = async function(userId) {
  return this.find({
    'members.userId': userId,
    'members.active': true,
    status: 'active',
  }).sort({ updatedAt: -1 });
};

// Static method to find public groups
studyGroupSchema.statics.findPublicGroups = async function(filters = {}) {
  const query = { privacy: 'public', status: 'active' };
  
  if (filters.subject) query.subject = filters.subject;
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
    ];
  }
  
  return this.find(query)
    .sort({ memberCount: -1, updatedAt: -1 })
    .limit(filters.limit || 20);
};

module.exports = mongoose.model('StudyGroup', studyGroupSchema);
