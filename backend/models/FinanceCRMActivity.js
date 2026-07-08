const mongoose = require('mongoose');

const financeCRMActivitySchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinanceLead',
      required: true,
      index: true,
    },
    activityType: {
      type: String,
      required: true,
      enum: [
        'call',
        'email',
        'sms',
        'whatsapp',
        'meeting',
        'note',
        'task',
        'document-upload',
        'status-change',
        'comment',
      ],
      index: true,
    },
    subject: {
      type: String,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 2000,
    },
    // For calls
    callDetails: {
      direction: {
        type: String,
        enum: ['inbound', 'outbound'],
      },
      duration: Number, // in seconds
      recording: String, // URL to call recording
      outcome: {
        type: String,
        enum: ['connected', 'no-answer', 'busy', 'failed', 'voicemail'],
      },
    },
    // For tasks
    taskDetails: {
      dueDate: Date,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
      },
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      completed: {
        type: Boolean,
        default: false,
      },
      completedAt: Date,
    },
    // For meetings
    meetingDetails: {
      scheduledAt: Date,
      duration: Number, // in minutes
      location: String,
      attendees: [String],
      outcome: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: [String],
    attachments: [
      {
        filename: String,
        url: String,
        type: String,
      },
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
financeCRMActivitySchema.index({ lead: 1, createdAt: -1 });
financeCRMActivitySchema.index({ activityType: 1, createdAt: -1 });
financeCRMActivitySchema.index({ 'taskDetails.assignedTo': 1, 'taskDetails.completed': 1 });
financeCRMActivitySchema.index({ 'taskDetails.dueDate': 1 });

module.exports = mongoose.model('FinanceCRMActivity', financeCRMActivitySchema);
