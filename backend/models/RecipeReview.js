const mongoose = require('mongoose');

const recipeReviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KitchenRecipe',
      required: true,
      index: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', trim: true },
  },
  { timestamps: true, collection: 'recipe_reviews' }
);

recipeReviewSchema.index({ userId: 1, recipeId: 1 }, { unique: true });

module.exports =
  mongoose.models.RecipeReview || mongoose.model('RecipeReview', recipeReviewSchema);

