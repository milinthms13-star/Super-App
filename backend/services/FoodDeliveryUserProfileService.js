/**
 * Food Delivery User Profile Service
 * Handles user profile and address management
 */

const FoodDeliveryUser = require('../models/FoodDeliveryUser');
const FoodDeliveryAddress = require('../models/FoodDeliveryAddress');
const { uploadToS3, deleteFromS3 } = require('../utils/s3Helper');

class FoodDeliveryUserProfileService {
  /**
   * Get user profile
   */
  static async getUserProfile(userId) {
    try {
      const user = await FoodDeliveryUser.findById(userId)
        .populate('defaultAddressId')
        .populate('addresses');

      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        user: user.toJSON(),
      };
    } catch (error) {
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId, updateData) {
    try {
      const allowedFields = [
        'firstName',
        'lastName',
        'phoneNumber',
        'email',
        'gender',
        'dateOfBirth',
        'preferences',
      ];

      // Filter allowed fields
      const filteredData = {};
      allowedFields.forEach((field) => {
        if (field in updateData) {
          filteredData[field] = updateData[field];
        }
      });

      const user = await FoodDeliveryUser.findByIdAndUpdate(
        userId,
        filteredData,
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        message: 'Profile updated successfully',
        user: user.toJSON(),
      };
    } catch (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  /**
   * Upload profile picture
   */
  static async uploadProfilePicture(userId, imageFile) {
    try {
      const user = await FoodDeliveryUser.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Delete old image if exists
      if (user.profilePictureUrl) {
        const key = user.profilePictureUrl.split('/').pop();
        await deleteFromS3(`food-delivery/profiles/${userId}/${key}`);
      }

      // Upload new image
      const s3Key = `food-delivery/profiles/${userId}/${Date.now()}-${imageFile.originalname}`;
      const imageUrl = await uploadToS3(imageFile, s3Key);

      user.profilePictureUrl = imageUrl;
      await user.save();

      return {
        success: true,
        message: 'Profile picture uploaded',
        imageUrl,
      };
    } catch (error) {
      throw new Error(`Failed to upload profile picture: ${error.message}`);
    }
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(userId, preferences) {
    try {
      const user = await FoodDeliveryUser.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Merge preferences
      user.preferences = {
        ...user.preferences,
        ...preferences,
      };

      await user.save();

      return {
        success: true,
        message: 'Preferences updated',
        preferences: user.preferences,
      };
    } catch (error) {
      throw new Error(`Failed to update preferences: ${error.message}`);
    }
  }

  /**
   * Add new address
   */
  static async addAddress(userId, addressData) {
    try {
      // Check max addresses limit
      const addressCount = await FoodDeliveryAddress.countActiveAddresses(userId);
      if (addressCount >= 5) {
        throw new Error('Maximum 5 addresses allowed');
      }

      // Validate required fields
      const requiredFields = [
        'label',
        'streetAddress',
        'city',
        'state',
        'postalCode',
      ];
      for (const field of requiredFields) {
        if (!addressData[field]) {
          throw new Error(`${field} is required`);
        }
      }

      // Build full address
      const addressParts = [
        addressData.apt_building,
        addressData.streetAddress,
        addressData.area,
        addressData.city,
        addressData.state,
        addressData.postalCode,
      ];

      const address = new FoodDeliveryAddress({
        userId,
        label: addressData.label,
        addressType: addressData.addressType || 'other',
        fullAddress: addressParts.filter((p) => p).join(', '),
        streetAddress: addressData.streetAddress,
        apt_building: addressData.apt_building,
        area: addressData.area,
        city: addressData.city,
        state: addressData.state,
        postalCode: addressData.postalCode,
        landmark: addressData.landmark,
        location: {
          type: 'Point',
          coordinates: [
            addressData.longitude,
            addressData.latitude,
          ],
        },
        instructions: addressData.instructions,
        contactPerson: {
          name: addressData.contactName,
          phoneNumber: addressData.contactPhone,
        },
        isDefault: addressData.isDefault || false,
      });

      await address.save();

      // Update user if this is default
      if (addressData.isDefault) {
        const user = await FoodDeliveryUser.findById(userId);
        user.defaultAddressId = address._id;
        user.addresses.push(address._id);
        await user.save();
      } else {
        const user = await FoodDeliveryUser.findById(userId);
        if (!user.addresses.includes(address._id)) {
          user.addresses.push(address._id);
          await user.save();
        }
      }

      return {
        success: true,
        message: 'Address added successfully',
        address,
      };
    } catch (error) {
      throw new Error(`Failed to add address: ${error.message}`);
    }
  }

  /**
   * Get all addresses for user
   */
  static async getUserAddresses(userId) {
    try {
      const addresses = await FoodDeliveryAddress.find({
        userId,
        isActive: true,
      }).sort({ isDefault: -1, createdAt: -1 });

      return {
        success: true,
        addresses,
        count: addresses.length,
      };
    } catch (error) {
      throw new Error(`Failed to fetch addresses: ${error.message}`);
    }
  }

  /**
   * Update address
   */
  static async updateAddress(userId, addressId, updateData) {
    try {
      const address = await FoodDeliveryAddress.findOne({
        _id: addressId,
        userId,
      });

      if (!address) {
        throw new Error('Address not found');
      }

      const allowedFields = [
        'label',
        'addressType',
        'streetAddress',
        'apt_building',
        'area',
        'city',
        'state',
        'postalCode',
        'landmark',
        'instructions',
        'contactPerson',
        'isDefault',
      ];

      allowedFields.forEach((field) => {
        if (field in updateData) {
          address[field] = updateData[field];
        }
      });

      // Update coordinates if provided
      if (updateData.latitude && updateData.longitude) {
        address.location.coordinates = [
          updateData.longitude,
          updateData.latitude,
        ];
      }

      // Rebuild full address
      const addressParts = [
        address.apt_building,
        address.streetAddress,
        address.area,
        address.city,
        address.state,
        address.postalCode,
      ];
      address.fullAddress = addressParts.filter((p) => p).join(', ');

      await address.save();

      return {
        success: true,
        message: 'Address updated successfully',
        address,
      };
    } catch (error) {
      throw new Error(`Failed to update address: ${error.message}`);
    }
  }

  /**
   * Delete address
   */
  static async deleteAddress(userId, addressId) {
    try {
      const address = await FoodDeliveryAddress.findOne({
        _id: addressId,
        userId,
      });

      if (!address) {
        throw new Error('Address not found');
      }

      // Soft delete
      address.isActive = false;
      await address.save();

      // Update user if it was default
      const user = await FoodDeliveryUser.findById(userId);
      if (user.defaultAddressId && user.defaultAddressId.toString() === addressId) {
        user.defaultAddressId = null;

        // Set first active address as default
        const firstActive = await FoodDeliveryAddress.findOne({
          userId,
          isActive: true,
        });

        if (firstActive) {
          user.defaultAddressId = firstActive._id;
        }
      }

      user.addresses = user.addresses.filter(
        (id) => id.toString() !== addressId
      );
      await user.save();

      return {
        success: true,
        message: 'Address deleted successfully',
      };
    } catch (error) {
      throw new Error(`Failed to delete address: ${error.message}`);
    }
  }

  /**
   * Set default address
   */
  static async setDefaultAddress(userId, addressId) {
    try {
      const address = await FoodDeliveryAddress.findOne({
        _id: addressId,
        userId,
        isActive: true,
      });

      if (!address) {
        throw new Error('Address not found');
      }

      address.isDefault = true;
      await address.save();

      const user = await FoodDeliveryUser.findById(userId);
      user.defaultAddressId = address._id;
      await user.save();

      return {
        success: true,
        message: 'Default address set successfully',
        address,
      };
    } catch (error) {
      throw new Error(`Failed to set default address: ${error.message}`);
    }
  }

  /**
   * Get default address
   */
  static async getDefaultAddress(userId) {
    try {
      let address = await FoodDeliveryAddress.getDefaultAddress(userId);

      // If no default, get first active address
      if (!address) {
        address = await FoodDeliveryAddress.findOne({
          userId,
          isActive: true,
        });
      }

      if (!address) {
        return {
          success: false,
          message: 'No address found',
          address: null,
        };
      }

      return {
        success: true,
        address,
      };
    } catch (error) {
      throw new Error(`Failed to get default address: ${error.message}`);
    }
  }

  /**
   * Get nearby restaurants from address (for future use)
   */
  static async getNearbyRestaurants(userId, addressId, radiusInKm = 5) {
    try {
      const address = await FoodDeliveryAddress.findOne({
        _id: addressId,
        userId,
      });

      if (!address) {
        throw new Error('Address not found');
      }

      // This will be implemented in Phase 2
      // For now, return the address details
      return {
        success: true,
        address,
        message: 'Nearby restaurants search will be available soon',
      };
    } catch (error) {
      throw new Error(`Failed to get nearby restaurants: ${error.message}`);
    }
  }

  /**
   * Verify address manually
   */
  static async verifyAddress(userId, addressId) {
    try {
      const address = await FoodDeliveryAddress.findOne({
        _id: addressId,
        userId,
      });

      if (!address) {
        throw new Error('Address not found');
      }

      address.markAsVerified();
      await address.save();

      return {
        success: true,
        message: 'Address verified',
        address,
      };
    } catch (error) {
      throw new Error(`Failed to verify address: ${error.message}`);
    }
  }

  /**
   * Record address usage
   */
  static async recordAddressUsage(userId, addressId) {
    try {
      const address = await FoodDeliveryAddress.findOne({
        _id: addressId,
        userId,
      });

      if (!address) {
        throw new Error('Address not found');
      }

      address.recordUsage();
      await address.save();

      return {
        success: true,
      };
    } catch (error) {
      throw new Error(`Failed to record address usage: ${error.message}`);
    }
  }
}

module.exports = FoodDeliveryUserProfileService;
