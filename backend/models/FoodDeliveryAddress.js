/**
 * FoodDeliveryAddress Model
 * Address management for food delivery users
 */

const mongoose = require('mongoose');

const foodDeliveryAddressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryUser',
      required: true,
    },

    // Address Type
    addressType: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home',
    },

    // Address Details
    label: {
      type: String,
      required: true,
      trim: true,
      example: 'Home', // Display name for address
    },

    fullAddress: {
      type: String,
      required: true,
      trim: true,
    },

    // Address Components
    streetAddress: {
      type: String,
      required: true,
      trim: true,
    },

    apt_building: {
      type: String,
      trim: true,
      example: 'Apartment 102', // Flat/Apartment number
    },

    landmark: {
      type: String,
      trim: true,
      example: 'Near XYZ mall',
    },

    area: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    postalCode: {
      type: String,
      required: true,
      match: /^[0-9]{6}$/,
    },

    country: {
      type: String,
      default: 'India',
      trim: true,
    },

    // Geolocation
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function (v) {
            return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
          },
          message: 'Invalid coordinates',
        },
      },
    },

    // Additional Info
    instructions: {
      type: String,
      maxlength: 500,
      example: 'Ring the doorbell twice',
    },

    contactPerson: {
      name: String,
      phoneNumber: {
        type: String,
        match: /^[0-9]{10}$/,
      },
    },

    // Address Validation
    isVerified: {
      type: Boolean,
      default: false,
    },

    verifiedAt: Date,

    // Geofencing
    deliveryZone: {
      zoneId: mongoose.Schema.Types.ObjectId,
      zoneName: String,
      zone_code: String,
    },

    // Availability
    isDefault: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Delivery Details
    averageDeliveryTime: {
      type: Number, // in minutes
      default: 45,
    },

    deliveryCharges: {
      type: Number,
      default: 0,
    },

    accessibilityNotes: {
      hasElevator: Boolean,
      hasParking: Boolean,
      isGated: Boolean,
      gateCode: String,
      notes: String,
    },

    // Metadata
    createdByApp: {
      type: String,
      enum: ['web', 'ios', 'android'],
      default: 'web',
    },

    lastUsedAt: Date,
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    indexes: [
      { userId: 1, isActive: 1 },
      { userId: 1, isDefault: 1 },
      { 'location.coordinates': '2dsphere' }, // For geospatial queries
    ],
  }
);

// Virtual: Full formatted address
foodDeliveryAddressSchema.virtual('formattedAddress').get(function () {
  const parts = [
    this.apt_building,
    this.streetAddress,
    this.area,
    this.city,
    this.state,
    this.postalCode,
  ];
  return parts.filter((p) => p).join(', ');
});

// Pre-save middleware to ensure only one default address
foodDeliveryAddressSchema.pre('save', async function (next) {
  if (this.isDefault && this.isActive) {
    // Remove default from other addresses
    await this.constructor.updateMany(
      {
        userId: this.userId,
        _id: { $ne: this._id },
      },
      { isDefault: false }
    );
  }
  next();
});

// Method: Update usage count
foodDeliveryAddressSchema.methods.recordUsage = function () {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
};

// Method: Verify address
foodDeliveryAddressSchema.methods.markAsVerified = function () {
  this.isVerified = true;
  this.verifiedAt = new Date();
};

// Static method: Get nearby restaurants
foodDeliveryAddressSchema.statics.getNearbyAddresses = function (longitude, latitude, maxDistance = 1000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance,
      },
    },
  });
};

// Static method: Find default address for user
foodDeliveryAddressSchema.statics.getDefaultAddress = function (userId) {
  return this.findOne({
    userId,
    isDefault: true,
    isActive: true,
  });
};

// Static method: Count active addresses
foodDeliveryAddressSchema.statics.countActiveAddresses = function (userId) {
  return this.countDocuments({
    userId,
    isActive: true,
  });
};

module.exports = mongoose.model('FoodDeliveryAddress', foodDeliveryAddressSchema);
