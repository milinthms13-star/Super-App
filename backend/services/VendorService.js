/**
 * Vendor Management Service - Phase 9 Feature E
 * Restaurant catalog, ratings, certifications, operations management
 */

const Vendor = require('../models/Vendor');

class VendorService {
  /**
   * Create vendor profile
   */
  static async createVendor(vendorData) {
    try {
      const vendorId = `VENDOR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const vendor = new Vendor({
        vendorId,
        restaurantName: vendorData.restaurantName,
        cuisine: vendorData.cuisine || [],
        location: vendorData.location,
        email: vendorData.email,
        phoneNumber: vendorData.phoneNumber,
        status: 'on_boarding',
        onboardingStatus: 'incomplete',
      });

      await vendor.save();

      return {
        success: true,
        data: vendor,
        message: 'Vendor created',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Update vendor ratings
   */
  static async updateRatings(vendorId, ratingUpdate) {
    try {
      const vendor = await Vendor.findOne({ vendorId });
      if (!vendor) {
        return { success: false, message: 'Vendor not found' };
      }

      vendor.ratings.overallRating = ratingUpdate.overallRating;
      vendor.ratings.foodQuality = ratingUpdate.foodQuality || vendor.ratings.foodQuality;
      vendor.ratings.delivery = ratingUpdate.delivery || vendor.ratings.delivery;
      vendor.ratings.cleanliness = ratingUpdate.cleanliness || vendor.ratings.cleanliness;
      vendor.ratings.totalRatings += 1;

      await vendor.save();

      return {
        success: true,
        data: {
          vendorId,
          overallRating: vendor.ratings.overallRating,
          totalRatings: vendor.ratings.totalRatings,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Check if vendor is open
   */
  static async isVendorOpen(vendorId) {
    try {
      const vendor = await Vendor.findOne({ vendorId });
      if (!vendor) {
        return { success: false, message: 'Vendor not found' };
      }

      const isOpen = vendor.isOpenNow();

      return {
        success: true,
        data: {
          vendorId,
          isOpen,
          status: vendor.status,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get vendors near location
   */
  static async getVendorsNearby(latitude, longitude, radiusKm = 5, limit = 20) {
    try {
      const vendors = await Vendor.find({
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: radiusKm * 1000,
          },
        },
        status: 'active',
      })
        .limit(limit)
        .sort({ 'ratings.overallRating': -1 });

      return {
        success: true,
        data: vendors,
        message: `Found ${vendors.length} vendors nearby`,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Search vendors by cuisine
   */
  static async searchByCuisine(cuisine, city, limit = 20) {
    try {
      const vendors = await Vendor.find({
        cuisine: { $in: [cuisine] },
        'location.city': city,
        status: 'active',
      })
        .limit(limit)
        .sort({ 'ratings.overallRating': -1 });

      return {
        success: true,
        data: vendors,
        message: `${vendors.length} ${cuisine} restaurants in ${city}`,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Search vendors by name
   */
  static async searchByName(searchTerm, limit = 20) {
    try {
      const vendors = await Vendor.find({
        $text: { $search: searchTerm },
        status: 'active',
      })
        .limit(limit)
        .sort({ 'ratings.overallRating': -1 });

      return {
        success: true,
        data: vendors,
        message: `Found ${vendors.length} vendors`,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get featured vendors
   */
  static async getFeaturedVendors(city, limit = 10) {
    try {
      const vendors = await Vendor.find({
        isFeatured: true,
        'location.city': city,
        status: 'active',
        featuredUntil: { $gte: new Date() },
      })
        .limit(limit)
        .sort({ priority: -1 });

      return {
        success: true,
        data: vendors,
        message: `${vendors.length} featured vendors`,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Check delivery capability
   */
  static async canDeliverTo(vendorId, deliveryArea) {
    try {
      const vendor = await Vendor.findOne({ vendorId });
      if (!vendor) {
        return { success: false, message: 'Vendor not found' };
      }

      const canDeliver = vendor.canDeliverTo(deliveryArea);

      return {
        success: true,
        data: {
          canDeliver,
          vendorId,
          deliveryArea,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get vendor details
   */
  static async getVendorDetails(vendorId) {
    try {
      const vendor = await Vendor.findOne({ vendorId });
      if (!vendor) {
        return { success: false, message: 'Vendor not found' };
      }

      return {
        success: true,
        data: {
          vendorId: vendor.vendorId,
          restaurantName: vendor.restaurantName,
          cuisine: vendor.cuisine,
          ratings: vendor.ratings,
          location: vendor.location,
          operatingHours: vendor.operatingHours,
          performance: vendor.performance,
          isOpen: vendor.isOpenNow(),
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Verify vendor compliance
   */
  static async verifyCompliance(vendorId) {
    try {
      const vendor = await Vendor.findOne({ vendorId });
      if (!vendor) {
        return { success: false, message: 'Vendor not found' };
      }

      const hasValidCertifications = vendor.certifications.some((c) => {
        const expiryDate = new Date(c.expiryDate);
        return expiryDate > new Date();
      });

      return {
        success: true,
        data: {
          vendorId,
          isCompliant: vendor.complianceStatus === 'compliant',
          hygieneScore: vendor.hygieneScore,
          certifications: vendor.certifications,
          hasValidCertifications,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }
}

module.exports = VendorService;
