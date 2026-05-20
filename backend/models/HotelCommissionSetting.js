const mongoose = require('mongoose');

const hotelCommissionSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, default: 'hotelbooking.default' },
    defaultRate: { type: Number, default: 10, min: 0, max: 100 },
    basicRate: { type: Number, default: 8, min: 0, max: 100 },
    featuredRate: { type: Number, default: 12, min: 0, max: 100 },
    premiumRate: { type: Number, default: 15, min: 0, max: 100 },
  },
  { timestamps: true, collection: 'hotel_commission_settings' }
);

module.exports =
  mongoose.models.HotelCommissionSetting ||
  mongoose.model('HotelCommissionSetting', hotelCommissionSettingSchema);
