const mongoose = require('mongoose');

const businessServiceCatalogSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, index: true },
    categories: { type: [mongoose.Schema.Types.Mixed], default: [] },
    serviceDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
    defaultServiceDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
    starterPackage: { type: mongoose.Schema.Types.Mixed, default: {} },
    consultationOptions: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BusinessServiceCatalog', businessServiceCatalogSchema);
