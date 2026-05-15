const mongoose = require('mongoose');

const kitchenTipSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    tipText: { type: String, required: true, trim: true },
    category: {
      type: String,
      default: 'daily',
      trim: true,
      index: true,
    },
    language: { type: String, default: 'en', trim: true, index: true },
    imageUrl: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published',
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'kitchen_tips' }
);

module.exports =
  mongoose.models.KitchenTip || mongoose.model('KitchenTip', kitchenTipSchema);

