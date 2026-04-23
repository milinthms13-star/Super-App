const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
  {
    // Ticket identification
    ticketNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // User who created the ticket
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Module the issue is related to
    module: {
      type: String,
      enum: [
        'ecommerce',
        'messaging',
        'classifieds',
        'realestate',
        'fooddelivery',
        'localmarket',
        'ridesharing',
        'matrimonial',
        'socialmedia',
        'reminderalert',
        'sosalert',
        'astrology',
        'diary',
        'general',
      ],
      default: 'general',
      index: true,
    },

    // Related entity (order ID, product ID, etc.)
    entityId: {
      type: String,
      sparse: true,
    },

    entityType: {
      type: String,
      enum: ['order', 'product', 'property', 'restaurant', 'ride', 'profile', 'message', 'other'],
      sparse: true,
    },

    // Ticket details
    subject: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    // Category of support issue
    category: {
      type: String,
      enum: [
        'technical',
        'payment',
        'delivery',
        'quality',
        'account',
        'refund',
        'cancellation',
        'shipping',
        'general',
      ],
      default: 'general',
      index: true,
    },

    // Priority level
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },

    // Status tracking
    status: {
      type: String,
      enum: ['open', 'in_progress', 'awaiting_user', 'resolved', 'closed', 'escalated'],
      default: 'open',
      index: true,
    },

    // Support staff assignment
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },

    // Ticket history
    messages: [
      {
        senderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },

        senderType: {
          type: String,
          enum: ['user', 'support_agent', 'system'],
          default: 'user',
        },

        content: {
          type: String,
          required: true,
        },

        attachments: [
          {
            fileName: String,
            fileUrl: String,
            fileSize: Number,
            fileType: String,
          },
        ],

        createdAt: {
          type: Date,
          default: Date.now,
        },

        isInternal: {
          type: Boolean,
          default: false, // Internal notes visible only to support team
        },
      },
    ],

    // Resolution details
    resolutionNotes: {
      type: String,
      sparse: true,
    },

    resolutionDate: {
      type: Date,
      sparse: true,
    },

    // Satisfaction rating (after resolution)
    satisfactionRating: {
      type: Number,
      min: 1,
      max: 5,
      sparse: true,
    },

    feedback: {
      type: String,
      sparse: true,
    },

    // Tags for organization
    tags: [String],

    // Attachments in initial ticket
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileSize: Number,
        fileType: String,
      },
    ],

    // Contact information
    contactEmail: {
      type: String,
      required: true,
    },

    contactPhone: {
      type: String,
      sparse: true,
    },

    // Escalation tracking
    isEscalated: {
      type: Boolean,
      default: false,
    },

    escalationReason: {
      type: String,
      sparse: true,
    },

    escalatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },

    // Auto-response sent flag
    autoResponseSent: {
      type: Boolean,
      default: false,
    },

    // Expected resolution date
    expectedResolutionDate: {
      type: Date,
      sparse: true,
    },
  },
  {
    timestamps: true,
    collection: 'supporttickets',
  }
);

// Index for efficient queries
supportTicketSchema.index({ userId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: -1 });
supportTicketSchema.index({ module: 1, status: 1 });
supportTicketSchema.index({ assignedTo: 1, status: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
