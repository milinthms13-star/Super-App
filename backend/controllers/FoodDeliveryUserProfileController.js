/**
 * Food Delivery User Profile Controller
 * Handles HTTP requests for user profile and address management
 */

const FoodDeliveryUserProfileService = require('../services/FoodDeliveryUserProfileService');
const { validationResult } = require('express-validator');

class FoodDeliveryUserProfileController {
  /**
   * Get user profile
   * GET /api/fooddelivery/profile
   */
  static async getProfile(req, res) {
    try {
      const userId = req.user.userId;

      const result = await FoodDeliveryUserProfileService.getUserProfile(userId);

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update user profile
   * PUT /api/fooddelivery/profile
   */
  static async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const userId = req.user.userId;
      const updateData = req.body;

      const result = await FoodDeliveryUserProfileService.updateUserProfile(
        userId,
        updateData
      );

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Upload profile picture
   * POST /api/fooddelivery/profile/picture
   */
  static async uploadProfilePicture(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided',
        });
      }

      const userId = req.user.userId;

      const result = await FoodDeliveryUserProfileService.uploadProfilePicture(
        userId,
        req.file
      );

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update user preferences
   * PUT /api/fooddelivery/profile/preferences
   */
  static async updatePreferences(req, res) {
    try {
      const userId = req.user.userId;
      const preferences = req.body;

      const result = await FoodDeliveryUserProfileService.updatePreferences(
        userId,
        preferences
      );

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Add new address
   * POST /api/fooddelivery/addresses
   */
  static async addAddress(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const userId = req.user.userId;
      const addressData = req.body;

      const result = await FoodDeliveryUserProfileService.addAddress(
        userId,
        addressData
      );

      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get all addresses
   * GET /api/fooddelivery/addresses
   */
  static async getAddresses(req, res) {
    try {
      const userId = req.user.userId;

      const result = await FoodDeliveryUserProfileService.getUserAddresses(userId);

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get default address
   * GET /api/fooddelivery/addresses/default
   */
  static async getDefaultAddress(req, res) {
    try {
      const userId = req.user.userId;

      const result = await FoodDeliveryUserProfileService.getDefaultAddress(userId);

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update address
   * PUT /api/fooddelivery/addresses/:addressId
   */
  static async updateAddress(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const userId = req.user.userId;
      const { addressId } = req.params;
      const updateData = req.body;

      const result = await FoodDeliveryUserProfileService.updateAddress(
        userId,
        addressId,
        updateData
      );

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Delete address
   * DELETE /api/fooddelivery/addresses/:addressId
   */
  static async deleteAddress(req, res) {
    try {
      const userId = req.user.userId;
      const { addressId } = req.params;

      const result = await FoodDeliveryUserProfileService.deleteAddress(
        userId,
        addressId
      );

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Set default address
   * PUT /api/fooddelivery/addresses/:addressId/default
   */
  static async setDefaultAddress(req, res) {
    try {
      const userId = req.user.userId;
      const { addressId } = req.params;

      const result = await FoodDeliveryUserProfileService.setDefaultAddress(
        userId,
        addressId
      );

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Verify address
   * POST /api/fooddelivery/addresses/:addressId/verify
   */
  static async verifyAddress(req, res) {
    try {
      const userId = req.user.userId;
      const { addressId } = req.params;

      const result = await FoodDeliveryUserProfileService.verifyAddress(
        userId,
        addressId
      );

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Record address usage
   * POST /api/fooddelivery/addresses/:addressId/usage
   */
  static async recordAddressUsage(req, res) {
    try {
      const userId = req.user.userId;
      const { addressId } = req.params;

      const result = await FoodDeliveryUserProfileService.recordAddressUsage(
        userId,
        addressId
      );

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = FoodDeliveryUserProfileController;
