const mongoose = require('mongoose');

/**
 * ModerationQueue Model - Phase 2 Feature 3
 * Tracks moderation tasks and workflow
 * 
 * Fields:
 * - abuseReport: Reference to AbuseReport
 * - status: Current queue status (queued, in_progress, completed, escalated)
 * - priority: Queue priority (low, medium, high, critical)
 * - assignedTo: Moderator assigned to this task
 * - dueDate: When task should be completed
 * - estimatedTime: How long it should take
 * - severity: Assessment of content severity
 */

const moderationQueueSchema = new mongoose.Schema(
  {
    abuseReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AbuseReport',
      required: true,
      unique: true,
      index: true
    },
    status: {
      type: String,
      enum: ['queued', 'in_progress', 'completed', 'escalated', 'on_hold'],
      default: 'queued',
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      description: 'Moderator assigned to this task'
    },
    assignedAt: Date,
    dueDate: {
      type: Date,
      description: 'Target completion time based on priority'
    },
    estimatedTime: {
      type: Number,
      description: 'Estimated minutes to resolve'
    },
    // Assessment details
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      description: 'Content severity assessment'
    },
    contentType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'link', 'multiple'],
      description: 'Type of content being reported'
    },
    preliminaryAssessment: String,
    requiresEscalation: {
      type: Boolean,
      default: false
    },
    escalationReason: String,
    escalatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      description: 'Senior moderator or admin'
    },

    // Time tracking
    startedAt: Date,
    completedAt: Date,
    timeSpent: {
      type: Number,
      description: 'Actual minutes spent'
    },

    // Resolution tracking
    resolution: {
      approved: Boolean,
      actionTaken: String,
      warnings: Number,
      suspensionDays: Number
    },

    // Metrics
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
      description: 'Quality score of moderation decision'
    },
    userAppeal: {
      appealed: Boolean,
      appealedAt: Date,
      appealReason: String
    }
  },
  {
    timestamps: true,
    collection: 'moderation_queue'
  }
);

// Indexes
moderationQueueSchema.index({ status: 1, priority: -1, createdAt: 1 });
moderationQueueSchema.index({ assignedTo: 1, status: 1 });
moderationQueueSchema.index({ dueDate: 1 }); // For overdue tasks
moderationQueueSchema.index({ createdAt: -1 });

// Static Methods

/**
 * Add to queue
 */
moderationQueueSchema.statics.enqueue = async function(abuseReportId, priority) {
  try {
    // Calculate due date based on priority
    const dueDateMap = {
      'critical': 0.5 * 60 * 60 * 1000, // 30 minutes
      'high': 2 * 60 * 60 * 1000, // 2 hours
      'medium': 8 * 60 * 60 * 1000, // 8 hours
      'low': 24 * 60 * 60 * 1000 // 24 hours
    };

    const estimatedTimeMap = {
      'critical': 10,
      'high': 15,
      'medium': 20,
      'low': 30
    };

    const queueItem = new this({
      abuseReport: abuseReportId,
      priority,
      dueDate: new Date(Date.now() + dueDateMap[priority]),
      estimatedTime: estimatedTimeMap[priority]
    });

    await queueItem.save();
    return queueItem;
  } catch (error) {
    throw error;
  }
};

/**
 * Get next task for moderator
 */
moderationQueueSchema.statics.getNextTask = async function(moderatorId) {
  return this.findOneAndUpdate(
    {
      status: 'queued',
      assignedTo: { $exists: false }
    },
    {
      status: 'in_progress',
      assignedTo: moderatorId,
      assignedAt: new Date(),
      startedAt: new Date()
    },
    { new: true }
  ).sort({ priority: -1, createdAt: 1 })
    .populate('abuseReport');
};

/**
 * Get assigned tasks for moderator
 */
moderationQueueSchema.statics.getAssignedTasks = async function(moderatorId) {
  return this.find({
    assignedTo: moderatorId,
    status: { $in: ['queued', 'in_progress'] }
  })
    .sort({ priority: -1, dueDate: 1 })
    .populate('abuseReport');
};

/**
 * Complete task
 */
moderationQueueSchema.statics.completeTask = async function(queueId, resolution, qualityScore) {
  const item = await this.findById(queueId);
  if (!item) {
    throw new Error('Queue item not found');
  }

  const timeSpent = Math.round((new Date() - item.startedAt) / 60 / 1000); // minutes

  return this.findByIdAndUpdate(
    queueId,
    {
      status: 'completed',
      completedAt: new Date(),
      timeSpent,
      resolution,
      qualityScore
    },
    { new: true }
  );
};

/**
 * Escalate task
 */
moderationQueueSchema.statics.escalateTask = async function(queueId, escalatedTo, reason) {
  return this.findByIdAndUpdate(
    queueId,
    {
      status: 'escalated',
      requiresEscalation: true,
      escalatedTo,
      escalationReason: reason
    },
    { new: true }
  );
};

/**
 * Get queue statistics
 */
moderationQueueSchema.statics.getQueueStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgTimeSpent: { $avg: '$timeSpent' },
        avgQualityScore: { $avg: '$qualityScore' }
      }
    }
  ]);

  // Count overdue tasks
  const overdue = await this.countDocuments({
    status: { $in: ['queued', 'in_progress'] },
    dueDate: { $lt: new Date() }
  });

  return {
    byStatus: stats,
    overdueCount: overdue,
    totalInQueue: stats.reduce((sum, s) => sum + s.count, 0)
  };
};

/**
 * Get moderator performance metrics
 */
moderationQueueSchema.statics.getModeratorStats = async function(moderatorId, days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const stats = await this.aggregate([
    {
      $match: {
        assignedTo: moderatorId,
        completedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalCompleted: { $sum: 1 },
        avgTimeSpent: { $avg: '$timeSpent' },
        avgQualityScore: { $avg: '$qualityScore' },
        escalations: {
          $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] }
        },
        appeals: {
          $sum: { $cond: ['$userAppeal.appealed', 1, 0] }
        }
      }
    }
  ]);

  return stats[0] || {
    totalCompleted: 0,
    avgTimeSpent: 0,
    avgQualityScore: 0,
    escalations: 0,
    appeals: 0
  };
};

// Instance Methods

/**
 * Check if task is overdue
 */
moderationQueueSchema.methods.isOverdue = function() {
  return this.status !== 'completed' && new Date() > this.dueDate;
};

/**
 * Get time until due
 */
moderationQueueSchema.methods.getTimeUntilDue = function() {
  if (this.status === 'completed') return null;
  const msRemaining = this.dueDate - new Date();
  return Math.ceil(msRemaining / 1000 / 60); // minutes
};

/**
 * Assign to moderator
 */
moderationQueueSchema.methods.assignToModerator = function(moderatorId) {
  this.assignedTo = moderatorId;
  this.assignedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('ModerationQueue', moderationQueueSchema);
