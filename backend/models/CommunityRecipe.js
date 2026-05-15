const mongoose = require('mongoose');

const communityRecipeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    ingredients: { type: [String], default: [] },
    steps: { type: [String], default: [] },
    imageUrl: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    likes: { type: Number, default: 0, min: 0 },
    commentsCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: 'community_recipes' }
);

module.exports =
  mongoose.models.CommunityRecipe || mongoose.model('CommunityRecipe', communityRecipeSchema);

