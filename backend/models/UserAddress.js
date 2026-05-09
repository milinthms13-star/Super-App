const mongoose = require('mongoose');

const UserAddressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    addresses: [
      {
        addressId: {
          type: String,
          unique: true,
          default: () => `addr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
        name: {
          type: String,
          required: true, // e.g., "Home", "Office", "Mom's House"
        },
        type: {
          type: String,
          enum: ['home', 'office', 'other', 'business', 'apartment'],
          default: 'home',
        },
        street: {
          type: String,
          required: true,
        },
        building: {
          type: String,
          default: '',
        },
        area: {
          type: String,
          required: true,
        },
        city: {
          type: String,
          required: true,
          lowercase: true,
          trim: true,
        },
        state: {
          type: String,
          required: true,
          lowercase: true,
          trim: true,
        },
        postalCode: {
          type: String,
          required: true,
          match: /^\d{6}$/,
        },
        country: {
          type: String,
          required: true,
          default: 'India',
        },
        latitude: {
          type: Number,
          default: null,
        },
        longitude: {
          type: Number,
          default: null,
        },
        recipient: {
          type: String,
          required: true, // Name of person to receive at this address
        },
        phoneNumber: {
          type: String,
          required: true,
          match: /^[0-9]{10}$/,
        },
        alternatePhoneNumber: {
          type: String,
          default: null,
        },
        instructions: {
          type: String,
          default: '', // e.g., "Ring twice", "Gate code 1234"
        },
        landmark: {
          type: String,
          default: '', // e.g., "Near XYZ temple"
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        savedPaymentMethods: [
          {
            methodId: String,
            type: String, // 'card', 'upi', 'wallet'
            label: String,
            isDefault: Boolean,
            savedAt: Date,
          },
        ],
        usageCount: {
          type: Number,
          default: 0,
        },
        lastUsedAt: {
          type: Date,
          default: null,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    primaryAddressId: {
      type: String,
      default: null,
    },
    defaultPaymentMethod: {
      type: String,
      default: null,
    },
    totalAddresses: {
      type: Number,
      default: 0,
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'user_addresses',
  }
);

// Auto-calculate totalAddresses
UserAddressSchema.pre('save', function (next) {
  this.totalAddresses = this.addresses.filter((addr) => addr.isActive).length;
  this.lastModified = new Date();
  next();
});

// Create indexes
UserAddressSchema.index({ userEmail: 1, 'addresses.isPrimary': 1 });
UserAddressSchema.index({ userEmail: 1, createdAt: -1 });

// Instance methods
UserAddressSchema.methods.addAddress = function (addressData) {
  // Check if this is the first address
  const isFirst = this.addresses.length === 0;

  const newAddress = {
    addressId: `addr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...addressData,
    isPrimary: isFirst || addressData.isPrimary || false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // If this is marked as primary, unmark others
  if (newAddress.isPrimary) {
    this.addresses.forEach((addr) => {
      addr.isPrimary = false;
    });
    this.primaryAddressId = newAddress.addressId;
  }

  this.addresses.push(newAddress);
  return this;
};

UserAddressSchema.methods.updateAddress = function (addressId, updates) {
  const address = this.addresses.find((addr) => addr.addressId === addressId);

  if (address) {
    Object.assign(address, updates, { updatedAt: new Date() });

    // If marked as primary, unmark others
    if (updates.isPrimary) {
      this.addresses.forEach((addr) => {
        if (addr.addressId !== addressId) {
          addr.isPrimary = false;
        }
      });
      this.primaryAddressId = addressId;
    }
  }

  return this;
};

UserAddressSchema.methods.deleteAddress = function (addressId) {
  const address = this.addresses.find((addr) => addr.addressId === addressId);

  if (address) {
    if (address.isPrimary && this.addresses.length > 1) {
      // Make another address primary
      const nextAddress = this.addresses.find((addr) => addr.addressId !== addressId && addr.isActive);
      if (nextAddress) {
        nextAddress.isPrimary = true;
        this.primaryAddressId = nextAddress.addressId;
      }
    }

    address.isActive = false;
  }

  return this;
};

UserAddressSchema.methods.getPrimaryAddress = function () {
  return this.addresses.find((addr) => addr.isPrimary && addr.isActive);
};

UserAddressSchema.methods.getActiveAddresses = function () {
  return this.addresses.filter((addr) => addr.isActive);
};

UserAddressSchema.methods.recordAddressUsage = function (addressId) {
  const address = this.addresses.find((addr) => addr.addressId === addressId);

  if (address) {
    address.usageCount += 1;
    address.lastUsedAt = new Date();
  }

  return this;
};

UserAddressSchema.methods.setSavedPaymentMethod = function (addressId, paymentMethod) {
  const address = this.addresses.find((addr) => addr.addressId === addressId);

  if (address) {
    const existingMethod = address.savedPaymentMethods.find(
      (method) => method.methodId === paymentMethod.methodId
    );

    if (existingMethod) {
      Object.assign(existingMethod, paymentMethod);
    } else {
      address.savedPaymentMethods.push({
        ...paymentMethod,
        savedAt: new Date(),
      });
    }
  }

  return this;
};

// Statics
UserAddressSchema.statics.findByEmail = function (email) {
  return this.findOne({ userEmail: email.toLowerCase() });
};

UserAddressSchema.statics.getOrCreate = async function (userId, userEmail) {
  let userAddresses = await this.findOne({ userEmail: userEmail.toLowerCase() });

  if (!userAddresses) {
    userAddresses = new this({
      userId,
      userEmail: userEmail.toLowerCase(),
      addresses: [],
    });
    await userAddresses.save();
  }

  return userAddresses;
};

module.exports = mongoose.model('UserAddress', UserAddressSchema);
