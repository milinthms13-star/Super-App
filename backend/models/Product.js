const mongoose = require('mongoose');
const crypto = require('crypto');

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    subcategory: {
      type: String,
      default: '',
      trim: true,
    },
    model: {
      type: String,
      default: '',
      trim: true,
    },
    color: {
      type: String,
      default: '',
      trim: true,
    },
    styleTheme: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    mrp: {
      type: Number,
      min: 0,
      default: 0,
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    discountStartDate: {
      type: Date,
      default: null,
    },
    discountEndDate: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    expiryApplicable: {
      type: Boolean,
      default: false,
    },
    image: {
      type: String,
      default: '',
      trim: true,
    },
    stock: {
      type: Number,
      min: 0,
      default: 0,
    },
    manufacturingDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    inventoryBatches: [
      {
        id: {
          type: String,
          default: () => crypto.randomUUID(),
        },
        batchLabel: {
          type: String,
          default: '',
          trim: true,
        },
        stock: {
          type: Number,
          required: true,
          min: 0,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        mrp: {
          type: Number,
          required: true,
          min: 0,
        },
        location: {
          type: String,
          default: '',
          trim: true,
        },
        discountAmount: {
          type: Number,
          min: 0,
          default: 0,
        },
        discountPercentage: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
        discountStartDate: {
          type: Date,
          default: null,
        },
        discountEndDate: {
          type: Date,
          default: null,
        },
        manufacturingDate: {
          type: Date,
          default: null,
        },
        expiryDate: {
          type: Date,
          default: null,
        },
        returnAllowed: {
          type: Boolean,
          default: false,
        },
        returnWindowDays: {
          type: Number,
          min: 0,
          default: 0,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    sellerName: {
      type: String,
      required: true,
      trim: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    sellerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    moderationNote: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Product', ProductSchema);
