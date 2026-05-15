const mongoose = require('mongoose');

const groceryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: String, default: '', trim: true },
    availableAtHome: { type: Boolean, default: false },
  },
  { _id: false }
);

const groceryListSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipeId: { type: mongoose.Schema.Types.ObjectId, ref: 'KitchenRecipe', index: true },
    items: { type: [groceryItemSchema], default: [] },
    status: {
      type: String,
      enum: ['active', 'ordered', 'completed'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true, collection: 'grocery_lists' }
);

module.exports =
  mongoose.models.GroceryList || mongoose.model('GroceryList', groceryListSchema);

