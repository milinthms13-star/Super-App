const mongoose = require('mongoose');

const hotelBookingIdempotencyKeySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, trim: true, index: true },
    key: { type: String, required: true, trim: true, index: true },
    method: { type: String, required: true, trim: true, index: true },
    routeKey: { type: String, required: true, trim: true, index: true },
    requestHash: { type: String, required: true, trim: true },
    statusCode: { type: Number, required: true, min: 100, max: 599 },
    responseBody: { type: mongoose.Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

hotelBookingIdempotencyKeySchema.index(
  { userId: 1, key: 1, method: 1, routeKey: 1 },
  { unique: true, name: 'uniq_hotelbooking_idempotency_scope' }
);
hotelBookingIdempotencyKeySchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'ttl_hotelbooking_idempotency_expiry' }
);

module.exports =
  mongoose.models.HotelBookingIdempotencyKey ||
  mongoose.model('HotelBookingIdempotencyKey', hotelBookingIdempotencyKeySchema);
