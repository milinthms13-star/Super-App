/**
 * Ecommerce Category Model
 * Hierarchical product category system
 */

const mongoose = require('mongoose');

const EcommerceCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    
    // Hierarchy
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EcommerceCategory',
      default: null,
      index: true,
    },
    level: {
      type: Number,
      default: 0, // 0 = top level, 1 = subcategory, 2 = sub-subcategory
      index: true,
    },
    path: {
      type: String,
      default: '',
      index: true,
    },
    
    // Display
    icon: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    banner: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: '#3498db',
    },
    
    // SEO
    metaTitle: {
      type: String,
      default: '',
    },
    metaDescription: {
      type: String,
      default: '',
    },
    metaKeywords: {
      type: [String],
      default: [],
    },
    
    // Category-Specific Attributes
    attributes: [
      {
        name: {
          type: String,
          required: true,
        },
        label: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ['text', 'number', 'select', 'multiselect', 'boolean', 'color', 'size'],
          default: 'text',
        },
        required: {
          type: Boolean,
          default: false,
        },
        options: [String],
        unit: String,
        helpText: String,
        displayOrder: {
          type: Number,
          default: 0,
        },
      },
    ],
    
    // Commission Override
    commissionOverride: {
      enabled: {
        type: Boolean,
        default: false,
      },
      rate: {
        type: Number,
        min: 0,
        max: 100,
      },
      minimumAmount: Number,
    },
    
    // Category Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    
    // Display Order
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    
    // Statistics
    stats: {
      productCount: {
        type: Number,
        default: 0,
      },
      activeProductCount: {
        type: Number,
        default: 0,
      },
      totalViews: {
        type: Number,
        default: 0,
      },
      totalSales: {
        type: Number,
        default: 0,
      },
    },
    
    // Restrictions
    restrictions: {
      requiresVerification: {
        type: Boolean,
        default: false,
      },
      minimumSellerRating: {
        type: Number,
        min: 0,
        max: 5,
      },
      allowedSubscriptionPlans: {
        type: [String],
        default: [],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
EcommerceCategorySchema.index({ parentCategory: 1, displayOrder: 1 });
EcommerceCategorySchema.index({ isActive: 1, level: 1 });
EcommerceCategorySchema.index({ path: 1 });
EcommerceCategorySchema.index({ isFeatured: 1, displayOrder: 1 });

// Pre-save hook to generate slug and path
EcommerceCategorySchema.pre('save', async function (next) {
  // Generate slug if not exists
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  // Generate path for hierarchical categories
  if (this.isModified('parentCategory') || this.isNew) {
    if (this.parentCategory) {
      const parent = await this.constructor.findById(this.parentCategory);
      if (parent) {
        this.level = parent.level + 1;
        this.path = parent.path ? `${parent.path}/${this.slug}` : this.slug;
      }
    } else {
      this.level = 0;
      this.path = this.slug;
    }
  }
  
  next();
});

// Methods
EcommerceCategorySchema.methods.getFullPath = async function () {
  const pathParts = [];
  let current = this;
  
  while (current) {
    pathParts.unshift(current.name);
    if (current.parentCategory) {
      current = await this.constructor.findById(current.parentCategory);
    } else {
      current = null;
    }
  }
  
  return pathParts.join(' > ');
};

EcommerceCategorySchema.methods.getChildren = function () {
  return this.constructor.find({ parentCategory: this._id, isActive: true }).sort({ displayOrder: 1 });
};

EcommerceCategorySchema.methods.hasChildren = async function () {
  const count = await this.constructor.countDocuments({ parentCategory: this._id });
  return count > 0;
};

EcommerceCategorySchema.methods.getAllDescendants = async function () {
  const descendants = [];
  const children = await this.getChildren();
  
  for (const child of children) {
    descendants.push(child);
    const childDescendants = await child.getAllDescendants();
    descendants.push(...childDescendants);
  }
  
  return descendants;
};

EcommerceCategorySchema.methods.incrementProductCount = function (isActive = true) {
  this.stats.productCount += 1;
  if (isActive) {
    this.stats.activeProductCount += 1;
  }
  return this.save();
};

EcommerceCategorySchema.methods.decrementProductCount = function (wasActive = true) {
  this.stats.productCount = Math.max(0, this.stats.productCount - 1);
  if (wasActive) {
    this.stats.activeProductCount = Math.max(0, this.stats.activeProductCount - 1);
  }
  return this.save();
};

// Static methods
EcommerceCategorySchema.statics.getTopLevelCategories = function () {
  return this.find({ level: 0, isActive: true }).sort({ displayOrder: 1 });
};

EcommerceCategorySchema.statics.getFeaturedCategories = function (limit = 6) {
  return this.find({ isFeatured: true, isActive: true })
    .sort({ displayOrder: 1 })
    .limit(limit);
};

EcommerceCategorySchema.statics.getCategoryBySlug = function (slug) {
  return this.findOne({ slug, isActive: true });
};

EcommerceCategorySchema.statics.getCategoryByPath = function (path) {
  return this.findOne({ path, isActive: true });
};

EcommerceCategorySchema.statics.buildCategoryTree = async function () {
  const categories = await this.find({ isActive: true }).sort({ displayOrder: 1 }).lean();
  
  const categoryMap = {};
  const tree = [];
  
  // Create a map of categories
  categories.forEach((cat) => {
    categoryMap[cat._id.toString()] = { ...cat, children: [] };
  });
  
  // Build tree structure
  categories.forEach((cat) => {
    if (cat.parentCategory) {
      const parent = categoryMap[cat.parentCategory.toString()];
      if (parent) {
        parent.children.push(categoryMap[cat._id.toString()]);
      }
    } else {
      tree.push(categoryMap[cat._id.toString()]);
    }
  });
  
  return tree;
};

module.exports = mongoose.model('EcommerceCategory', EcommerceCategorySchema);
