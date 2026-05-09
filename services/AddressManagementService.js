const User = require('../models/User');
const UserAddress = require('../models/UserAddress');

/**
 * Address Management Service
 * Manages multiple saved addresses for users
 * Supports address validation, geolocation, default address, and quick shortcuts
 */
class AddressManagementService {
  /**
   * Add new address for user
   * @param {String} userId - User ID
   * @param {Object} addressData - Address details
   * @returns {Object} {success, message, data}
   */
  static async addAddress(userId, addressData) {
    try {
      // Validate required fields
      const required = ['addressText', 'city', 'state', 'pincode', 'name', 'type'];
      for (const field of required) {
        if (!addressData[field]) {
          return {
            success: false,
            message: `${field} is required`,
            data: null
          };
        }
      }

      // Validate pincode format (Indian)
      if (!this.validatePincode(addressData.pincode)) {
        return {
          success: false,
          message: 'Invalid pincode format',
          data: null
        };
      }

      // Validate phone number if provided
      if (addressData.phone && !this.validatePhoneNumber(addressData.phone)) {
        return {
          success: false,
          message: 'Invalid phone number format',
          data: null
        };
      }

      // Check max addresses (limit to 5)
      const addressCount = await UserAddress.countDocuments({ userId });
      if (addressCount >= 5) {
        return {
          success: false,
          message: 'Maximum 5 saved addresses allowed',
          data: null
        };
      }

      // If this is first address or user sets as default, make it default
      let isDefault = addressData.isDefault;
      if (addressCount === 0) {
        isDefault = true;
      }

      // If setting as default, unset others
      if (isDefault) {
        await UserAddress.updateMany(
          { userId },
          { isDefault: false }
        );
      }

      // Create address
      const address = new UserAddress({
        userId: userId,
        name: addressData.name,
        type: addressData.type,
        addressText: addressData.addressText,
        coordinates: addressData.coordinates || { lat: null, lng: null },
        city: addressData.city,
        state: addressData.state,
        pincode: addressData.pincode,
        landmark: addressData.landmark || '',
        phone: addressData.phone,
        instructions: addressData.instructions || '',
        isDefault: isDefault,
        createdAt: new Date()
      });

      await address.save();

      return {
        success: true,
        message: 'Address added successfully',
        data: {
          address: this.formatAddress(address)
        }
      };
    } catch (error) {
      console.error('Add Address Error:', error);
      return {
        success: false,
        message: 'Failed to add address',
        data: null
      };
    }
  }

  /**
   * Get all addresses for user
   * @param {String} userId - User ID
   * @returns {Object} {success, message, data}
   */
  static async getUserAddresses(userId) {
    try {
      const addresses = await UserAddress.find({ userId })
        .sort({ isDefault: -1, createdAt: -1 })
        .lean();

      if (addresses.length === 0) {
        return {
          success: true,
          message: 'No addresses found',
          data: {
            addresses: []
          }
        };
      }

      return {
        success: true,
        message: 'Addresses retrieved',
        data: {
          addresses: addresses.map(addr => this.formatAddress(addr))
        }
      };
    } catch (error) {
      console.error('Get Addresses Error:', error);
      return {
        success: false,
        message: 'Failed to retrieve addresses',
        data: null
      };
    }
  }

  /**
   * Get single address
   * @param {String} userId - User ID
   * @param {String} addressId - Address ID
   * @returns {Object} {success, message, data}
   */
  static async getAddress(userId, addressId) {
    try {
      const address = await UserAddress.findOne({
        _id: addressId,
        userId: userId
      }).lean();

      if (!address) {
        return {
          success: false,
          message: 'Address not found',
          data: null
        };
      }

      return {
        success: true,
        message: 'Address retrieved',
        data: {
          address: this.formatAddress(address)
        }
      };
    } catch (error) {
      console.error('Get Address Error:', error);
      return {
        success: false,
        message: 'Failed to retrieve address',
        data: null
      };
    }
  }

  /**
   * Update address
   * @param {String} userId - User ID
   * @param {String} addressId - Address ID
   * @param {Object} updateData - Fields to update
   * @returns {Object} {success, message, data}
   */
  static async updateAddress(userId, addressId, updateData) {
    try {
      // Validate ownership
      const address = await UserAddress.findOne({
        _id: addressId,
        userId: userId
      });

      if (!address) {
        return {
          success: false,
          message: 'Address not found',
          data: null
        };
      }

      // Validate pincode if changing
      if (updateData.pincode && !this.validatePincode(updateData.pincode)) {
        return {
          success: false,
          message: 'Invalid pincode format',
          data: null
        };
      }

      // If setting as default, unset others
      if (updateData.isDefault === true && !address.isDefault) {
        await UserAddress.updateMany(
          { userId, _id: { $ne: addressId } },
          { isDefault: false }
        );
      }

      // Update address
      const updated = await UserAddress.findByIdAndUpdate(
        addressId,
        {
          ...updateData,
          updatedAt: new Date()
        },
        { new: true }
      ).lean();

      return {
        success: true,
        message: 'Address updated successfully',
        data: {
          address: this.formatAddress(updated)
        }
      };
    } catch (error) {
      console.error('Update Address Error:', error);
      return {
        success: false,
        message: 'Failed to update address',
        data: null
      };
    }
  }

  /**
   * Delete address
   * @param {String} userId - User ID
   * @param {String} addressId - Address ID
   * @returns {Object} {success, message, data}
   */
  static async deleteAddress(userId, addressId) {
    try {
      const address = await UserAddress.findOne({
        _id: addressId,
        userId: userId
      });

      if (!address) {
        return {
          success: false,
          message: 'Address not found',
          data: null
        };
      }

      // Don't allow deleting if it's the only address
      const count = await UserAddress.countDocuments({ userId });
      if (count === 1) {
        return {
          success: false,
          message: 'Cannot delete the only address. Add a new address first.',
          data: null
        };
      }

      // If deleting default address, set next as default
      if (address.isDefault) {
        const nextAddress = await UserAddress.findOne({
          userId: userId,
          _id: { $ne: addressId }
        }).sort({ createdAt: 1 });

        if (nextAddress) {
          nextAddress.isDefault = true;
          await nextAddress.save();
        }
      }

      // Delete address
      await UserAddress.findByIdAndDelete(addressId);

      return {
        success: true,
        message: 'Address deleted successfully',
        data: null
      };
    } catch (error) {
      console.error('Delete Address Error:', error);
      return {
        success: false,
        message: 'Failed to delete address',
        data: null
      };
    }
  }

  /**
   * Set default address
   * @param {String} userId - User ID
   * @param {String} addressId - Address ID
   * @returns {Object} {success, message, data}
   */
  static async setDefaultAddress(userId, addressId) {
    try {
      const address = await UserAddress.findOne({
        _id: addressId,
        userId: userId
      });

      if (!address) {
        return {
          success: false,
          message: 'Address not found',
          data: null
        };
      }

      // Unset all others
      await UserAddress.updateMany(
        { userId, _id: { $ne: addressId } },
        { isDefault: false }
      );

      // Set this as default
      address.isDefault = true;
      await address.save();

      return {
        success: true,
        message: 'Default address set successfully',
        data: {
          address: this.formatAddress(address)
        }
      };
    } catch (error) {
      console.error('Set Default Address Error:', error);
      return {
        success: false,
        message: 'Failed to set default address',
        data: null
      };
    }
  }

  /**
   * Get default address
   * @param {String} userId - User ID
   * @returns {Object} {success, message, data}
   */
  static async getDefaultAddress(userId) {
    try {
      const address = await UserAddress.findOne({
        userId: userId,
        isDefault: true
      }).lean();

      if (!address) {
        return {
          success: false,
          message: 'No default address found',
          data: null
        };
      }

      return {
        success: true,
        message: 'Default address retrieved',
        data: {
          address: this.formatAddress(address)
        }
      };
    } catch (error) {
      console.error('Get Default Address Error:', error);
      return {
        success: false,
        message: 'Failed to retrieve default address',
        data: null
      };
    }
  }

  /**
   * Quick shortcuts for common addresses
   * @param {String} userId - User ID
   * @returns {Object} {success, message, data}
   */
  static async getQuickAddressShortcuts(userId) {
    try {
      const addresses = await UserAddress.find({ userId })
        .select('_id name type')
        .lean();

      const shortcuts = addresses.reduce((acc, addr) => {
        const key = addr.type; // 'home', 'work', etc.
        if (!acc[key]) {
          acc[key] = addr;
        }
        return acc;
      }, {});

      return {
        success: true,
        message: 'Quick shortcuts retrieved',
        data: {
          shortcuts: shortcuts
        }
      };
    } catch (error) {
      console.error('Quick Shortcuts Error:', error);
      return {
        success: false,
        message: 'Failed to retrieve shortcuts',
        data: null
      };
    }
  }

  /**
   * Validate pincode format (Indian)
   * @param {String} pincode - Pincode to validate
   * @returns {Boolean}
   */
  static validatePincode(pincode) {
    // Indian pincode: 6 digits
    const pincodeRegex = /^[0-9]{6}$/;
    return pincodeRegex.test(pincode.toString());
  }

  /**
   * Validate phone number format
   * @param {String} phone - Phone number
   * @returns {Boolean}
   */
  static validatePhoneNumber(phone) {
    // Indian phone: 10 digits, starting with 6-9
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.toString().replace(/\D/g, ''));
  }

  /**
   * Format address for response
   * @param {Object} address - Address document
   * @returns {Object}
   */
  static formatAddress(address) {
    return {
      id: address._id?.toString() || address._id,
      name: address.name,
      type: address.type,
      address: address.addressText,
      landmark: address.landmark,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      phone: address.phone,
      instructions: address.instructions,
      isDefault: address.isDefault,
      fullAddress: `${address.addressText}, ${address.city}, ${address.state} ${address.pincode}`
    };
  }

  /**
   * Search addresses by city
   * @param {String} userId - User ID
   * @param {String} city - City name
   * @returns {Object} {success, message, data}
   */
  static async searchAddressesByCity(userId, city) {
    try {
      const addresses = await UserAddress.find({
        userId: userId,
        city: { $regex: city, $options: 'i' }
      }).lean();

      return {
        success: true,
        message: 'Addresses found',
        data: {
          addresses: addresses.map(addr => this.formatAddress(addr))
        }
      };
    } catch (error) {
      console.error('Search Addresses Error:', error);
      return {
        success: false,
        message: 'Failed to search addresses',
        data: null
      };
    }
  }

  /**
   * Get addresses by type
   * @param {String} userId - User ID
   * @param {String} type - Address type (home, work, etc.)
   * @returns {Object} {success, message, data}
   */
  static async getAddressesByType(userId, type) {
    try {
      const addresses = await UserAddress.find({
        userId: userId,
        type: type
      }).lean();

      return {
        success: true,
        message: 'Addresses retrieved',
        data: {
          addresses: addresses.map(addr => this.formatAddress(addr))
        }
      };
    } catch (error) {
      console.error('Get Addresses By Type Error:', error);
      return {
        success: false,
        message: 'Failed to retrieve addresses',
        data: null
      };
    }
  }
}

module.exports = AddressManagementService;
