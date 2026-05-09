/**
 * SpecificationSchema.js
 * Mongoose schema for product category specifications
 */

const mongoose = require('mongoose');

const SpecificationSchemaSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    specifications: {
      type: [
        {
          key: String,
          label: String,
          type: {
            type: String,
            enum: ['text', 'number', 'dropdown', 'multiselect', 'boolean'],
            default: 'text',
          },
          required: Boolean,
          options: [String], // For dropdown/multiselect
          unit: String, // For number fields
          description: String,
        },
      ],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SpecificationSchema', SpecificationSchemaSchema);
