const mongoose = require('mongoose');

const localServicePackageRequestSchema = new mongoose.Schema(
  {
    packageCode: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true },
    eventType: { type: String, required: true, trim: true },
    eventDate: { type: Date, required: true, index: true },
    items: [{ type: String, trim: true }],
    budget: { type: Number, required: true, min: 0 },
    customerPhone: { type: String, required: true, trim: true, index: true },
    status: { type: String, default: 'Coordinator assigned', index: true },
    notes: { type: String, trim: true, default: '' },
    assignedCoordinator: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

localServicePackageRequestSchema.virtual('id').get(function () {
  return this.packageCode;
});

module.exports = mongoose.model('LocalServicePackageRequest', localServicePackageRequestSchema);
