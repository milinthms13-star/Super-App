/**
 * Vendor Controller - Phase 9 Feature E
 * REST endpoints for vendor management and operations
 */

const VendorService = require('../services/VendorService');

class VendorController {
  /**
   * POST /api/phase9/vendors
   * Create vendor
   */
  static async createVendor(req, res) {
    try {
      const vendorData = req.body;

      if (!vendorData.restaurantName || !vendorData.address) {
        return res.status(400).json({
          success: false,
          message: 'restaurantName and address are required',
        });
      }

      const result = await VendorService.createVendor(vendorData);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/phase9/vendors/:vendorId/ratings
   * Update vendor ratings
   */
  static async updateRatings(req, res) {
    try {
      const { vendorId } = req.params;
      const ratingData = req.body;

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'vendorId is required',
        });
      }

      const result = await VendorService.updateRatings(vendorId, ratingData);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/vendors/:vendorId/is-open
   * Check if vendor is open
   */
  static async isVendorOpen(req, res) {
    try {
      const { vendorId } = req.params;

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'vendorId is required',
        });
      }

      const result = await VendorService.isVendorOpen(vendorId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/vendors/nearby
   * Get vendors nearby
   */
  static async getVendorsNearby(req, res) {
    try {
      const { latitude, longitude, radius } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
        });
      }

      const result = await VendorService.getVendorsNearby(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(radius) || 5
      );
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/vendors/search/cuisine/:cuisine
   * Search by cuisine
   */
  static async searchByCuisine(req, res) {
    try {
      const { cuisine } = req.params;
      const { limit } = req.query;

      if (!cuisine) {
        return res.status(400).json({
          success: false,
          message: 'Cuisine is required',
        });
      }

      const result = await VendorService.searchByCuisine(cuisine, parseInt(limit) || 20);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/vendors/search/:searchTerm
   * Search by name
   */
  static async searchByName(req, res) {
    try {
      const { searchTerm } = req.params;
      const { limit } = req.query;

      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          message: 'Search term is required',
        });
      }

      const result = await VendorService.searchByName(searchTerm, parseInt(limit) || 20);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/vendors/featured
   * Get featured vendors
   */
  static async getFeaturedVendors(req, res) {
    try {
      const { limit } = req.query;

      const result = await VendorService.getFeaturedVendors(parseInt(limit) || 20);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/phase9/vendors/:vendorId/delivery-check
   * Check if vendor can deliver to area
   */
  static async canDeliverTo(req, res) {
    try {
      const { vendorId } = req.params;
      const { deliveryArea } = req.body;

      if (!vendorId || !deliveryArea) {
        return res.status(400).json({
          success: false,
          message: 'vendorId and deliveryArea are required',
        });
      }

      const result = await VendorService.canDeliverTo(vendorId, deliveryArea);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/vendors/:vendorId/details
   * Get vendor details
   */
  static async getVendorDetails(req, res) {
    try {
      const { vendorId } = req.params;

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'vendorId is required',
        });
      }

      const result = await VendorService.getVendorDetails(vendorId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/phase9/vendors/:vendorId/compliance
   * Verify compliance
   */
  static async verifyCompliance(req, res) {
    try {
      const { vendorId } = req.params;

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'vendorId is required',
        });
      }

      const result = await VendorService.verifyCompliance(vendorId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = VendorController;
