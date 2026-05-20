const mongoose = require('mongoose');

const kitchenMealPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true, index: true },
    breakfast: { type: String, default: '', trim: true },
    lunch: { type: String, default: '', trim: true },
    dinner: { type: String, default: '', trim: true },
    snacks: { type: String, default: '', trim: true },
    groceryList: { type: [String], default: [] },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true, collection: 'kitchen_meal_plans' }
);

kitchenMealPlanSchema.index({ userId: 1, date: -1 });

module.exports =
  mongoose.models.KitchenMealPlan || mongoose.model('KitchenMealPlan', kitchenMealPlanSchema);
