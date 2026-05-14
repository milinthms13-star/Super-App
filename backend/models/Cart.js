const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  sessionId: { type: String, index: true }, // for guests
  items: [
    {
      productId: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      addedAt: { type: Date, default: Date.now },
    },
  ],
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Cart', CartSchema);