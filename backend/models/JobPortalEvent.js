const mongoose = require('mongoose');

const jobPortalEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        'job_view',
        'job_save',
        'job_unsave',
        'job_apply',
        'job_report',
        'job_status_update',
        'profile_update',
        'job_posted',
        'job_updated',
        'assistant_chat',
        'screen_view',
        'api_error',
        'deep_link_open',
        'offline_action_queued',
        'offline_queue_flushed',
        'background_refresh',
        'notification_registered',
      ],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobApplication',
    },
    source: {
      type: String,
      default: 'web',
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

jobPortalEventSchema.index({ eventType: 1, createdAt: -1 });
jobPortalEventSchema.index({ userId: 1, createdAt: -1 });
jobPortalEventSchema.index({ jobId: 1, eventType: 1, createdAt: -1 });

module.exports = mongoose.model('JobPortalEvent', jobPortalEventSchema);
