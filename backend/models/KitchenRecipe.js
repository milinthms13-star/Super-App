const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: String, default: '', trim: true },
    optional: { type: Boolean, default: false },
  },
  { _id: false }
);

const stepSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true, min: 1 },
    instruction: { type: String, required: true, trim: true },
    timerSeconds: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const kitchenRecipeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    cuisine: { type: String, default: 'Indian', trim: true, index: true },
    category: { type: String, default: 'Dinner', trim: true, index: true },
    vegType: {
      type: String,
      enum: ['veg', 'non-veg', 'egg', 'vegan'],
      default: 'veg',
      index: true,
    },
    cookingTime: { type: Number, default: 20, min: 1 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    ingredients: { type: [ingredientSchema], default: [] },
    steps: { type: [stepSchema], default: [] },
    imageUrl: { type: String, default: '', trim: true },
    videoUrl: { type: String, default: '', trim: true },
    calories: { type: Number, default: 0, min: 0 },
    language: { type: String, default: 'en', trim: true, index: true },
    sourceType: {
      type: String,
      enum: ['seed', 'community', 'ai-generated', 'admin'],
      default: 'seed',
      index: true,
    },
    tags: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
      index: true,
    },
    nutritionGoals: { type: [String], default: [] },
  },
  { timestamps: true, collection: 'recipes' }
);

kitchenRecipeSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports =
  mongoose.models.KitchenRecipe || mongoose.model('KitchenRecipe', kitchenRecipeSchema);

