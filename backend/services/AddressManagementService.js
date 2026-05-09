/**
 * AddressManagementService.js
 * Manages user addresses including validation, geolocation, and defaults
 */

const UserAddress = require('../models/UserAddress');
const geoip = require('geoip-lite');

class AddressManagementService {
  static instance;

  constructor() {}

  static getInstance() {
    if (!this.instance) {
      this.instance = new AddressManagementService();
    }
    return this.instance;
  }

  // Add new address
  async addAddress(userId, addressData) {
    // Validate address fields
    this.validateAddress(addressData);

    const address = new UserAddress({
      userId,
      ...addressData
    });

    // Geolocation (if API available)
    if (addressData.coordinates) {
      address.coordinates = {
        type: 'Point',
        coordinates: [addressData.coordinates.longitude, addressData.coordinates.latitude]
      };
    }

    // Set as default if first address
    const existingCount = await UserAddress.countDocuments({ userId, isActive: true });
    if (existingCount === 0) {
      address.isShippingDefault = true;
      address.isBillingDefault = true;
    }

    await address.save();
    return address;
  }

  // Update address
  async updateAddress(userId, addressId, addressData) {
    const address = await UserAddress.findOne({ _id: addressId, userId });
    if (!address) {
      throw new Error('Address not found');
    }

    this.validateAddress(addressData);

    Object.assign(address, addressData);

    // Update coordinates if provided
    if (addressData.coordinates) {
      address.coordinates = {
        type: 'Point',
        coordinates: [addressData.coordinates.longitude, addressData.coordinates.latitude]
      };
    }

    // Verification needs to be redone if address changed significantly
    if (this.hasSignificantChanges(address, addressData)) {
      address.isVerified = false;
      const code = address.generateVerificationCode();
      // In production, send verification code via SMS
    }

    await address.save();
    return address;
  }

  // Delete address (soft delete)
  async deleteAddress(userId, addressId) {
    const address = await UserAddress.findOne({ _id: addressId, userId });
    if (!address) {
      throw new Error('Address not found');
    }

    address.isActive = false;

    // If this was default, set another as default
    if (address.isShippingDefault || address.isBillingDefault) {
      const nextAddress = await UserAddress.findOne({
        userId,
        isActive: true,
        _id: { $ne: addressId }
      });

      if (nextAddress) {
        if (address.isShippingDefault) {
          await nextAddress.setAsShippingDefault();
        }
        if (address.isBillingDefault) {
          await nextAddress.setAsBillingDefault();
        }
      }
    }

    await address.save();
    return address;
  }

  // Get all addresses
  async getAddresses(userId) {
    return UserAddress.getActiveAddresses(userId);
  }

  // Get shipping default
  async getShippingDefault(userId) {
    const address = await UserAddress.getShippingDefault(userId);
    if (!address) {
      throw new Error('No default shipping address');
    }
    return address;
  }

  // Get billing default
  async getBillingDefault(userId) {
    const address = await UserAddress.getBillingDefault(userId);
    if (!address) {
      throw new Error('No default billing address');
    }
    return address;
  }

  // Set shipping default
  async setShippingDefault(userId, addressId) {
    const address = await UserAddress.findOne({ _id: addressId, userId });
    if (!address) {
      throw new Error('Address not found');
    }

    await address.setAsShippingDefault();
    return address;
  }

  // Set billing default
  async setBillingDefault(userId, addressId) {
    const address = await UserAddress.findOne({ _id: addressId, userId });
    if (!address) {
      throw new Error('Address not found');
    }

    await address.setAsBillingDefault();
    return address;
  }

  // Verify address
  async verifyAddress(userId, addressId, code) {
    const address = await UserAddress.findOne({ _id: addressId, userId });
    if (!address) {
      throw new Error('Address not found');
    }

    await address.verifyAddress(code);
    return address;
  }

  // Generate verification code
  async generateVerificationCode(userId, addressId) {
    const address = await UserAddress.findOne({ _id: addressId, userId });
    if (!address) {
      throw new Error('Address not found');
    }

    const code = address.generateVerificationCode();
    await address.save();

    // In production, send SMS with code
    return { code, expiresAt: address.verificationExpires };
  }

  // Find nearby addresses
  async findNearby(longitude, latitude, maxDistance = 5000) {
    return UserAddress.findNearby(longitude, latitude, maxDistance);
  }

  // Record address usage
  async recordAddressUsage(userId, addressId) {
    const address = await UserAddress.findOne({ _id: addressId, userId });
    if (!address) {
      throw new Error('Address not found');
    }

    await address.recordUsage();
    return address;
  }

  // Get address suggestions based on user location
  async getSuggestedAddresses(userId, ipAddress = null) {
    try {
      if (ipAddress) {
        const geo = geoip.lookup(ipAddress);
        if (geo) {
          return {
            city: geo.city,
            state: geo.state,
            country: geo.country,
            timezone: geo.timezone,
            ll: geo.ll // [lat, lon]
          };
        }
      }
    } catch (err) {
      console.error('Geolocation error:', err);
    }

    // Return last used address info if available
    const lastUsed = await UserAddress.findOne({ userId, lastUsedAt: { $exists: true } })
      .sort({ lastUsedAt: -1 })
      .limit(1);

    if (lastUsed) {
      return {
        city: lastUsed.city,
        state: lastUsed.state,
        country: lastUsed.country
      };
    }

    return null;
  }

  // Validate address
  validateAddress(addressData) {
    if (!addressData.recipientName || addressData.recipientName.trim().length === 0) {
      throw new Error('Recipient name required');
    }

    if (!addressData.recipientPhone || !/^[6-9]\d{9}$/.test(addressData.recipientPhone)) {
      throw new Error('Invalid phone number');
    }

    if (!addressData.addressLine1 || addressData.addressLine1.trim().length === 0) {
      throw new Error('Address line 1 required');
    }

    if (!addressData.city || addressData.city.trim().length === 0) {
      throw new Error('City required');
    }

    if (!addressData.state || addressData.state.trim().length === 0) {
      throw new Error('State required');
    }

    if (!addressData.pincode || !/^\d{6}$/.test(addressData.pincode)) {
      throw new Error('Invalid pincode');
    }

    return true;
  }

  // Helper to check significant changes
  hasSignificantChanges(oldAddress, newData) {
    const significantFields = ['addressLine1', 'addressLine2', 'city', 'state', 'pincode'];
    return significantFields.some((field) => oldAddress[field] !== newData[field]);
  }

  // Delete multiple addresses
  async deleteMultiple(userId, addressIds) {
    const result = await UserAddress.updateMany(
      { _id: { $in: addressIds }, userId },
      { isActive: false }
    );

    return { deletedCount: result.modifiedCount };
  }

  // Bulk get addresses
  async getMultiple(userId, addressIds) {
    return UserAddress.find({ _id: { $in: addressIds }, userId });
  }

  // Get address count
  async getAddressCount(userId) {
    return UserAddress.countDocuments({ userId, isActive: true });
  }
}

module.exports = AddressManagementService.getInstance();
