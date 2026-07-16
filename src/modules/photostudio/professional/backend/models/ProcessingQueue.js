/**
 * Processing Queue Model
 * Handles asynchronous image processing jobs
 */

const mongoose = require('mongoose');

const processingQueueSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'background_removal',
        'batch_process',
        'ai_enhancement',
        'style_transfer',
        'super_resolution',
        'object_removal',
        'face_enhancement',
        'color_correction',
        'export_high_res',
        'video_processing',
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    error: {
      message: String,
      stack: String,
      code: String,
    },
    metadata: {
      estimatedDuration: Number, // milliseconds
      actualDuration: Number,
      inputSize: Number, // bytes
      outputSize: Number,
      processingNode: String,
      retryCount: {
        type: Number,
        default: 0,
      },
      maxRetries: {
        type: Number,
        default: 3,
      },
    },
    startedAt: Date,
    completedAt: Date,
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
processingQueueSchema.index({ userId: 1, status: 1, createdAt: -1 });
processingQueueSchema.index({ status: 1, priority: -1, createdAt: 1 });
processingQueueSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for duration
processingQueueSchema.virtual('duration').get(function () {
  if (this.startedAt && this.completedAt) {
    return this.completedAt - this.startedAt;
  }
  return null;
});

// Methods
processingQueueSchema.methods.start = async function () {
  this.status = 'processing';
  this.startedAt = new Date();
  await this.save();
};

processingQueueSchema.methods.complete = async function (result) {
  this.status = 'completed';
  this.progress = 100;
  this.result = result;
  this.completedAt = new Date();
  
  if (this.startedAt) {
    this.metadata.actualDuration = this.completedAt - this.startedAt;
  }
  
  await this.save();
};

processingQueueSchema.methods.fail = async function (error) {
  this.status = 'failed';
  this.error = {
    message: error.message,
    stack: error.stack,
    code: error.code,
  };
  this.completedAt = new Date();
  
  await this.save();
};

processingQueueSchema.methods.updateProgress = async function (progress) {
  this.progress = Math.min(100, Math.max(0, progress));
  await this.save();
};

processingQueueSchema.methods.retry = async function () {
  if (this.metadata.retryCount < this.metadata.maxRetries) {
    this.status = 'pending';
    this.progress = 0;
    this.error = undefined;
    this.startedAt = undefined;
    this.completedAt = undefined;
    this.metadata.retryCount += 1;
    await this.save();
    return true;
  }
  return false;
};

processingQueueSchema.methods.cancel = async function () {
  if (this.status === 'pending' || this.status === 'processing') {
    this.status = 'cancelled';
    this.completedAt = new Date();
    await this.save();
    return true;
  }
  return false;
};

// Static methods
processingQueueSchema.statics.getNextJob = async function () {
  return this.findOneAndUpdate(
    {
      status: 'pending',
      $or: [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: null },
      ],
    },
    {
      status: 'processing',
      startedAt: new Date(),
    },
    {
      sort: { priority: -1, createdAt: 1 },
      new: true,
    }
  );
};

processingQueueSchema.statics.getUserJobs = function (userId, options = {}) {
  const { status, type, page = 1, limit = 20 } = options;
  
  const query = { userId };
  
  if (status) {
    query.status = status;
  }
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

processingQueueSchema.statics.cleanupOldJobs = async function (daysOld = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const result = await this.deleteMany({
    status: { $in: ['completed', 'failed', 'cancelled'] },
    completedAt: { $lt: cutoffDate },
  });
  
  return result.deletedCount;
};

processingQueueSchema.statics.getQueueStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgProgress: { $avg: '$progress' },
      },
    },
  ]);
  
  const result = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  };
  
  stats.forEach((stat) => {
    result[stat._id] = stat.count;
  });
  
  return result;
};

// Pre-save middleware
processingQueueSchema.pre('save', function (next) {
  // Set expiration date if not set
  if (!this.expiresAt && this.status === 'pending') {
    const expires = new Date();
    expires.setDate(expires.getDate() + 7); // 7 days
    this.expiresAt = expires;
  }
  
  // Clear expiration once processing starts
  if (this.status === 'processing' && this.expiresAt) {
    this.expiresAt = undefined;
  }
  
  next();
});

const ProcessingQueue = mongoose.model('ProcessingQueue', processingQueueSchema);

module.exports = ProcessingQueue;
