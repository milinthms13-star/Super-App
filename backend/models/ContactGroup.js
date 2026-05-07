const mongoose = require('mongoose');

/**
 * ContactGroup Schema
 * Store reusable groups of emergency contacts for bulk notification
 */
const contactGroupSchema = new mongoose.Schema(
  {
    // Owner
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Group Information
    name: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 50,
    },
    description: {
      type: String,
      maxlength: 200,
      default: '',
    },

    // Contacts
    contacts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SosContact',
      },
    ],

    // Priority
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'high',
    },

    // Stats
    usageCount: {
      type: Number,
      default: 0, // Track how often this group is used for alerts
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },

    // Metadata
    metadata: {
      clonedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ContactGroup',
        default: null,
      },
      createdBy: {
        type: String,
        enum: ['user', 'system', 'import'],
        default: 'user',
      },
      tags: [String], // Custom tags for organization
      isDefault: {
        type: Boolean,
        default: false, // Mark one group as default
      },
    },

    // Lifecycle
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
contactGroupSchema.index({ userId: 1, createdAt: -1 });
contactGroupSchema.index({ userId: 1, isActive: 1 });
contactGroupSchema.index({ userId: 1, 'metadata.isDefault': 1 });
contactGroupSchema.index({ userId: 1, name: 1 }, { unique: true, sparse: true });

// Virtual: Contact count
contactGroupSchema.virtual('contactCount').get(function () {
  return this.contacts ? this.contacts.length : 0;
});

// Virtual: Is default
contactGroupSchema.virtual('isDefault').get(function () {
  return this.metadata?.isDefault || false;
});

// Method: Mark as used (for analytics)
contactGroupSchema.methods.recordUsage = async function () {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

// Method: Set as default
contactGroupSchema.methods.setAsDefault = async function () {
  // Unset other defaults for this user
  await this.model('ContactGroup').updateMany(
    { userId: this.userId, 'metadata.isDefault': true },
    { $set: { 'metadata.isDefault': false } }
  );

  // Set this as default
  this.metadata.isDefault = true;
  return this.save();
};

// Method: Soft delete
contactGroupSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Method: Restore
contactGroupSchema.methods.restore = async function () {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Method: Add tag
contactGroupSchema.methods.addTag = async function (tag) {
  if (!this.metadata.tags) {
    this.metadata.tags = [];
  }
  if (!this.metadata.tags.includes(tag)) {
    this.metadata.tags.push(tag);
  }
  return this.save();
};

// Method: Remove tag
contactGroupSchema.methods.removeTag = async function (tag) {
  if (this.metadata.tags) {
    this.metadata.tags = this.metadata.tags.filter(t => t !== tag);
  }
  return this.save();
};

// Query helper: Get active groups only
contactGroupSchema.query.active = function () {
  return this.where({ isActive: true, deletedAt: null });
};

// Query helper: Get by user
contactGroupSchema.query.forUser = function (userId) {
  return this.where({ userId });
};

// Query helper: Get default group
contactGroupSchema.query.getDefault = function (userId) {
  return this.findOne({ userId, 'metadata.isDefault': true, isActive: true });
};

// Static method: Get group with populated contacts
contactGroupSchema.statics.getGroupWithContacts = async function (groupId, userId) {
  return this.findOne({ _id: groupId, userId, isActive: true })
    .populate('contacts', 'name phone verified')
    .exec();
};

// Static method: Get all user groups with count
contactGroupSchema.statics.getUserGroupsWithStats = async function (userId) {
  return this.find({ userId, isActive: true })
    .select('name priority contactCount usageCount lastUsedAt metadata.isDefault')
    .sort({ createdAt: -1 })
    .exec();
};

// Pre-save validation
contactGroupSchema.pre('save', async function (next) {
  // Ensure at least one contact
  if (!this.contacts || this.contacts.length === 0) {
    return next(new Error('A contact group must have at least one contact'));
  }

  // Trim name
  if (this.name) {
    this.name = this.name.trim();
  }

  // Ensure unique name per user (if creating/updating)
  if (this.isNew || this.isModified('name')) {
    const existing = await this.model('ContactGroup').findOne({
      userId: this.userId,
      name: this.name,
      _id: { $ne: this._id },
      isActive: true,
    });

    if (existing) {
      return next(new Error(`Group "${this.name}" already exists`));
    }
  }

  next();
});

module.exports = mongoose.model('ContactGroup', contactGroupSchema);
