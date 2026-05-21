const mongoose = require('mongoose');

const businessServiceInteractionSchema = new mongoose.Schema(
  {
    customerEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    customerName: { type: String, default: '', trim: true },
    interactionType: {
      type: String,
      required: true,
      trim: true,
      enum: [
        'chat-request',
        'call-request',
        'consultation-request',
        'vendor-contact-request',
        'chat',
        'call',
        'document-request',
      ],
      index: true,
    },
    consultantEmail: { type: String, default: '', trim: true, lowercase: true, index: true },
    consultantName: { type: String, default: '', trim: true },
    orderId: { type: String, default: '', trim: true, index: true },
    categoryId: { type: String, default: '', trim: true, index: true },
    serviceId: { type: String, default: '', trim: true, index: true },
    notes: { type: String, default: '', trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      default: 'submitted',
      enum: ['submitted', 'under-review', 'processing', 'completed', 'open', 'scheduled', 'resolved'],
      trim: true,
      index: true,
    },
    messages: [
      {
        sender: { type: String, default: '', trim: true, lowercase: true },
        senderRole: { type: String, default: 'customer', trim: true },
        text: { type: String, default: '', trim: true },
        attachments: [
          {
            fileId: { type: String, default: '', trim: true },
            name: { type: String, default: '', trim: true },
            url: { type: String, default: '', trim: true },
          },
        ],
        sentAt: { type: Date, default: () => new Date() },
        readAt: { type: Date, default: null },
      },
    ],
    scheduledFor: { type: Date, default: null },
    callProvider: { type: String, default: '', trim: true },
    callLink: { type: String, default: '', trim: true },
    callDuration: { type: Number, default: 0, min: 0 },
    callRecording: { type: String, default: '', trim: true },
    documentRequests: [
      {
        description: { type: String, default: '', trim: true },
        dueDate: { type: Date, default: null },
        status: { type: String, default: 'pending', enum: ['pending', 'submitted', 'approved'], trim: true },
        submittedFile: {
          fileId: { type: String, default: '', trim: true },
          url: { type: String, default: '', trim: true },
        },
      },
    ],
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BusinessServiceInteraction', businessServiceInteractionSchema);
