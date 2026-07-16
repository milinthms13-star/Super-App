/**
 * Photo Studio Project Model
 * Stores user projects with all canvas data, layers, and settings
 */

const mongoose = require('mongoose');

const layerSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['image', 'text', 'shape', 'empty'],
    required: true,
  },
  visible: {
    type: Boolean,
    default: true,
  },
  locked: {
    type: Boolean,
    default: false,
  },
  opacity: {
    type: Number,
    default: 100,
    min: 0,
    max: 100,
  },
  blendMode: {
    type: String,
    default: 'normal',
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  thumbnail: String,
});

const assetSchema = new mongoose.Schema({
  filename: String,
  url: String,
  type: {
    type: String,
    enum: ['image', 'font', 'pattern', 'other'],
  },
  size: Number,
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const photoStudioProjectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    canvasData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    layers: [layerSchema],
    canvasSize: {
      width: {
        type: Number,
        required: true,
      },
      height: {
        type: Number,
        required: true,
      },
    },
    thumbnail: {
      type: String,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    assets: [assetSchema],
    settings: {
      backgroundColor: String,
      zoom: Number,
      gridEnabled: Boolean,
      rulersEnabled: Boolean,
    },
    metadata: {
      version: {
        type: String,
        default: '1.0',
      },
      editorVersion: String,
      lastOpenedTool: String,
      editingTime: {
        type: Number,
        default: 0,
      },
    },
    collaborators: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      role: {
        type: String,
        enum: ['viewer', 'editor', 'owner'],
        default: 'viewer',
      },
      addedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    isPublic: {
      type: Boolean,
      default: false,
    },
    isTemplate: {
      type: Boolean,
      default: false,
    },
    parentTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PhotoStudioProject',
    },
    forkCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
photoStudioProjectSchema.index({ userId: 1, updatedAt: -1 });
photoStudioProjectSchema.index({ userId: 1, status: 1 });
photoStudioProjectSchema.index({ tags: 1 });
photoStudioProjectSchema.index({ isPublic: 1, status: 1 });
photoStudioProjectSchema.index({ 'collaborators.userId': 1 });

// Virtual for total asset size
photoStudioProjectSchema.virtual('totalAssetSize').get(function () {
  return this.assets.reduce((total, asset) => total + (asset.size || 0), 0);
});

// Method to check if user has access
photoStudioProjectSchema.methods.hasAccess = function (userId, requiredRole = 'viewer') {
  if (this.userId.toString() === userId.toString()) {
    return true;
  }

  const collaborator = this.collaborators.find(
    (c) => c.userId.toString() === userId.toString()
  );

  if (!collaborator) {
    return this.isPublic && requiredRole === 'viewer';
  }

  const roleHierarchy = { viewer: 0, editor: 1, owner: 2 };
  return roleHierarchy[collaborator.role] >= roleHierarchy[requiredRole];
};

// Method to add collaborator
photoStudioProjectSchema.methods.addCollaborator = async function (userId, role = 'viewer') {
  const exists = this.collaborators.some(
    (c) => c.userId.toString() === userId.toString()
  );

  if (!exists) {
    this.collaborators.push({ userId, role });
    await this.save();
  }
};

// Method to remove collaborator
photoStudioProjectSchema.methods.removeCollaborator = async function (userId) {
  this.collaborators = this.collaborators.filter(
    (c) => c.userId.toString() !== userId.toString()
  );
  await this.save();
};

// Method to fork/duplicate project
photoStudioProjectSchema.methods.fork = async function (userId) {
  const Project = this.constructor;

  const forkedProject = new Project({
    userId,
    name: `${this.name} (Copy)`,
    description: this.description,
    canvasData: this.canvasData,
    layers: this.layers,
    canvasSize: this.canvasSize,
    tags: this.tags,
    settings: this.settings,
    parentTemplate: this._id,
    isTemplate: false,
  });

  await forkedProject.save();

  // Increment fork count on original
  await Project.findByIdAndUpdate(this._id, {
    $inc: { forkCount: 1 },
  });

  return forkedProject;
};

// Static method to get public templates
photoStudioProjectSchema.statics.getPublicTemplates = function (options = {}) {
  const { page = 1, limit = 20, tags = [] } = options;

  const query = { isTemplate: true, isPublic: true, status: 'published' };

  if (tags.length > 0) {
    query.tags = { $in: tags };
  }

  return this.find(query)
    .select('name description thumbnail tags forkCount likeCount viewCount createdAt')
    .sort({ likeCount: -1, viewCount: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

// Pre-save middleware
photoStudioProjectSchema.pre('save', function (next) {
  // Limit number of layers
  if (this.layers.length > 100) {
    return next(new Error('Maximum 100 layers allowed'));
  }

  // Limit asset count
  if (this.assets.length > 50) {
    return next(new Error('Maximum 50 assets allowed'));
  }

  next();
});

const PhotoStudioProject = mongoose.model(
  'PhotoStudioProject',
  photoStudioProjectSchema
);

module.exports = PhotoStudioProject;
