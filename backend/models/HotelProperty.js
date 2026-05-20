const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true },
    capacity: { type: Number, default: 1, min: 1 },
    bedType: { type: String, default: 'Double', trim: true },
    basePrice: { type: Number, default: 0, min: 0 },
    totalInventory: { type: Number, default: 1, min: 0 },
    availableRooms: { type: Number, default: 1, min: 0 },
    amenities: [{ type: String, trim: true }],
    cancellationPolicy: { type: String, default: 'Flexible', trim: true },
    active: { type: Boolean, default: true },
  },
  { _id: false }
);

const hotelPropertySchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    businessName: { type: String, required: true, trim: true, index: true },
    propertyType: {
      type: String,
      enum: ['Hotel', 'Resort', 'Homestay', 'Villa', 'Apartment', 'Lodge', 'Heritage Property', 'Houseboat'],
      default: 'Hotel',
      index: true,
    },
    location: { type: String, required: true, trim: true, index: true },
    address: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true, index: true },
    pincode: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    description: { type: String, default: '', trim: true },
    amenities: [{ type: String, trim: true }],
    images: [{ type: String, trim: true }],
    rooms: { type: [roomSchema], default: [] },
    pricePerNight: { type: Number, default: 0, min: 0, index: true },
    availableRooms: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5, index: true },
    reviews: { type: Number, default: 0, min: 0 },
    verified: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Inactive'],
      default: 'Pending',
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    listingType: {
      type: String,
      enum: ['standard', 'featured', 'premium'],
      default: 'standard',
    },
    commissionRate: { type: Number, default: 10, min: 0, max: 100 },
    adminNote: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.HotelProperty || mongoose.model('HotelProperty', hotelPropertySchema);
