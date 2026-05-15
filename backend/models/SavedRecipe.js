const mongoose = require('mongoose');

const savedRecipeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KitchenRecipe',
      required: true,
      index: true,
    },
  },
  { timestamps: true, collection: 'saved_recipes' }
);

savedRecipeSchema.index({ userId: 1, recipeId: 1 }, { unique: true });

module.exports =
  mongoose.models.SavedRecipe || mongoose.model('SavedRecipe', savedRecipeSchema);

