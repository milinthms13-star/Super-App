/**
 * MultiRegionService.js
 * Phase 9: Multi-Region & Expansion Management
 * Manages multi-region operations, cross-region pricing, and regional compliance
 */

class MultiRegionService {
  /**
   * Get all available regions
   * @returns {object} - List of regions
   */
  static async getAvailableRegions() {
    try {
      const Region = require('../../models/Region');

      const regions = await Region.find({ isActive: true })
        .sort({ name: 1 })
        .lean();

      return {
        success: true,
        message: 'Available regions retrieved',
        data: {
          regions,
          totalRegions: regions.length,
          activeRegions: regions.filter(r => r.status === 'active').length,
          expandingRegions: regions.filter(r => r.status === 'expanding').length
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get region details
   * @param {string} regionId - Region ID
   * @returns {object} - Region details with metrics
   */
  static async getRegionDetails(regionId) {
    try {
      const Region = require('../../models/Region');
      const RideRequest = require('../../models/RideRequest');
      const DriverProfile = require('../../models/DriverProfile');

      const region = await Region.findById(regionId).lean();

      if (!region) {
        return { success: false, message: 'Region not found' };
      }

      // Get region statistics
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const ridesInRegion = await RideRequest.countDocuments({
        'pickupLocation': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [region.center.lng, region.center.lat]
            },
            $maxDistance: region.radiusKm * 1000
          }
        },
        createdAt: { $gte: last30Days }
      });

      const driversInRegion = await DriverProfile.countDocuments({
        'currentLocation': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [region.center.lng, region.center.lat]
            },
            $maxDistance: region.radiusKm * 1000
          }
        },
        status: 'active'
      });

      const completedRides = await RideRequest.countDocuments({
        'pickupLocation': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [region.center.lng, region.center.lat]
            },
            $maxDistance: region.radiusKm * 1000
          }
        },
        status: 'completed',
        createdAt: { $gte: last30Days }
      });

      return {
        success: true,
        message: 'Region details retrieved',
        data: {
          region,
          metrics: {
            ridesInLast30Days: ridesInRegion,
            activeDrivers: driversInRegion,
            completedRides,
            avgRideCompletionRate: ridesInRegion > 0 ? ((completedRides / ridesInRegion) * 100).toFixed(1) : 0,
            supplyDemandRatio: driversInRegion > 0 ? (ridesInRegion / driversInRegion).toFixed(2) : 'N/A'
          },
          compliance: region.compliance || {},
          regulations: region.regulations || []
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get cross-region pricing rules
   * @param {object} routeData - Route with regions
   * @returns {object} - Pricing applicable for route
   */
  static async getCrossRegionPricing(routeData) {
    try {
      const Region = require('../../models/Region');
      const RegionalPricingRule = require('../../models/RegionalPricingRule');

      // Determine which regions the route spans
      const pickupRegion = await this._getRegionForLocation(routeData.pickupLocation);
      const dropoffRegion = await this._getRegionForLocation(routeData.dropoffLocation);

      // Get pricing rules
      let pricingRules = [];

      if (pickupRegion && dropoffRegion) {
        if (pickupRegion._id.equals(dropoffRegion._id)) {
          // Intra-region pricing
          pricingRules = await RegionalPricingRule.find({
            region: pickupRegion._id,
            type: 'intra_region'
          }).lean();
        } else {
          // Inter-region pricing
          pricingRules = await RegionalPricingRule.find({
            $or: [
              { fromRegion: pickupRegion._id, toRegion: dropoffRegion._id },
              { fromRegion: dropoffRegion._id, toRegion: pickupRegion._id }
            ],
            type: 'inter_region'
          }).lean();
        }
      }

      // Calculate price with region adjustments
      const basePrice = 50 + (routeData.distance * 15);
      let regionalAdjustment = 1;
      let applicableRules = [];

      pricingRules.forEach(rule => {
        if (rule.applicableTime && this._isCurrentTimeInRange(rule.applicableTime)) {
          regionalAdjustment *= rule.multiplier;
          applicableRules.push(rule.description);
        }
      });

      const finalPrice = Math.round(basePrice * regionalAdjustment);

      return {
        success: true,
        message: 'Cross-region pricing calculated',
        data: {
          pickupRegion: pickupRegion?.name || 'Unknown',
          dropoffRegion: dropoffRegion?.name || 'Unknown',
          basePrice,
          regionalAdjustment: regionalAdjustment.toFixed(2),
          finalPrice,
          applicableRules,
          crossRegion: !pickupRegion?._id.equals(dropoffRegion?._id),
          specialCharges: this._getSpecialCharges(pickupRegion, dropoffRegion)
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Check regional compliance for a trip
   * @param {string} regionId - Region ID
   * @param {object} tripData - Trip details
   * @returns {object} - Compliance status
   */
  static async checkRegionalCompliance(regionId, tripData) {
    try {
      const Region = require('../../models/Region');

      const region = await Region.findById(regionId).lean();

      if (!region || !region.compliance) {
        return { success: true, data: { compliant: true, warnings: [] } };
      }

      const warnings = [];
      const errors = [];

      // Check driver requirements
      if (region.compliance.driverLicenseRequired) {
        if (!tripData.driverLicenseVerified) {
          errors.push('Driver license verification required in this region');
        }
      }

      // Check vehicle requirements
      if (region.compliance.vehicleInsuranceRequired) {
        if (!tripData.vehicleInsuranceValid) {
          errors.push('Vehicle insurance verification required');
        }
      }

      // Check documentation
      if (region.compliance.documentationRequired) {
        if (!tripData.documentsUploaded || tripData.documentsUploaded < 3) {
          errors.push('Additional documentation required');
        }
      }

      // Check regulatory limits (max fare, min ride time, etc)
      if (region.compliance.maxFareLimit && tripData.fare > region.compliance.maxFareLimit) {
        warnings.push(`Fare exceeds regional limit of ₹${region.compliance.maxFareLimit}`);
      }

      if (region.compliance.curfewHours) {
        const currentHour = new Date().getHours();
        if (currentHour >= region.compliance.curfewHours.start || 
            currentHour < region.compliance.curfewHours.end) {
          warnings.push(`Operating during restricted hours (${region.compliance.curfewHours.start}:00 - ${region.compliance.curfewHours.end}:00)`);
        }
      }

      return {
        success: true,
        message: 'Regional compliance checked',
        data: {
          regionName: region.name,
          compliant: errors.length === 0,
          errors,
          warnings,
          requiredCompliances: region.compliance,
          status: errors.length > 0 ? 'non-compliant' : (warnings.length > 0 ? 'warning' : 'compliant')
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get regional driver requirements
   * @param {string} regionId - Region ID
   * @returns {object} - Driver requirements for region
   */
  static async getRegionalDriverRequirements(regionId) {
    try {
      const Region = require('../../models/Region');

      const region = await Region.findById(regionId).lean();

      if (!region) {
        return { success: false, message: 'Region not found' };
      }

      return {
        success: true,
        message: 'Regional driver requirements retrieved',
        data: {
          region: region.name,
          requirements: {
            licenseType: region.driverRequirements?.licenseType || 'Commercial',
            minimumAge: region.driverRequirements?.minimumAge || 21,
            maximumAge: region.driverRequirements?.maximumAge || 65,
            experienceYears: region.driverRequirements?.experienceYears || 1,
            documentsRequired: region.driverRequirements?.documents || [
              'Valid driving license',
              'Vehicle registration',
              'Insurance certificate',
              'Pollution certificate',
              'Background verification'
            ],
            certifications: region.driverRequirements?.certifications || ['Safety training'],
            backgroundCheckRequired: region.driverRequirements?.backgroundCheckRequired || true,
            approvalTime: region.driverRequirements?.approvalTime || '5-7 business days'
          },
          penalties: {
            documentExpiration: 'Account suspension',
            complianceViolation: 'Fine + temporary ban',
            safetyViolation: 'Permanent ban'
          }
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get multi-region user settings
   * @param {string} userId - User ID
   * @returns {object} - Multi-region settings
   */
  static async getMultiRegionUserSettings(userId) {
    try {
      const UserProfile = require('../../models/UserProfile');
      const MultiRegionSettings = require('../../models/MultiRegionSettings');

      const user = await UserProfile.findById(userId).lean();
      const settings = await MultiRegionSettings.findOne({ userId }).lean();

      return {
        success: true,
        message: 'Multi-region settings retrieved',
        data: {
          homeRegion: user?.city || 'Unknown',
          frequentRegions: settings?.frequentRegions || [],
          crossRegionRidesCount: settings?.crossRegionRidesCount || 0,
          preferredRegionLanguage: settings?.preferredLanguage || 'English',
          regionalPaymentMethods: settings?.paymentMethods || ['Wallet', 'Card'],
          regionalCurrency: settings?.currency || 'INR',
          maxCrossRegionDistance: settings?.maxCrossRegionDistance || 150,
          autoAcceptAcrossRegions: settings?.autoAcceptAcrossRegions || false
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get region expansion statistics
   * @returns {object} - Expansion metrics
   */
  static async getExpansionStatistics() {
    try {
      const Region = require('../../models/Region');
      const RideRequest = require('../../models/RideRequest');
      const UserProfile = require('../../models/UserProfile');
      const DriverProfile = require('../../models/DriverProfile');

      const allRegions = await Region.find().lean();

      const regionStats = [];
      for (const region of allRegions) {
        const users = await UserProfile.countDocuments({ city: region.name });
        const drivers = await DriverProfile.countDocuments({
          'currentLocation': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [region.center.lng, region.center.lat]
              },
              $maxDistance: region.radiusKm * 1000
            }
          }
        });

        const monthlyRides = await RideRequest.countDocuments({
          'pickupLocation': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [region.center.lng, region.center.lat]
              },
              $maxDistance: region.radiusKm * 1000
            }
          },
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        });

        regionStats.push({
          region: region.name,
          status: region.status,
          users,
          drivers,
          monthlyRides,
          launchDate: region.launchDate,
          growthPercentage: region.growthPercentage || 0
        });
      }

      const totalUsers = regionStats.reduce((sum, r) => sum + r.users, 0);
      const totalDrivers = regionStats.reduce((sum, r) => sum + r.drivers, 0);
      const totalRides = regionStats.reduce((sum, r) => sum + r.monthlyRides, 0);

      return {
        success: true,
        message: 'Expansion statistics retrieved',
        data: {
          overview: {
            totalRegions: allRegions.length,
            activeRegions: allRegions.filter(r => r.status === 'active').length,
            expandingRegions: allRegions.filter(r => r.status === 'expanding').length,
            totalUsers,
            totalDrivers,
            monthlyRides: totalRides
          },
          regionStats,
          topRegions: regionStats.sort((a, b) => b.monthlyRides - a.monthlyRides).slice(0, 5),
          expansionOpportunities: this._identifyExpansionOpportunities(regionStats)
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Verify cross-region document validity
   * @param {string} userId - User ID
   * @param {string} targetRegionId - Target region ID
   * @returns {object} - Document validity status
   */
  static async verifyCrossRegionDocuments(userId, targetRegionId) {
    try {
      const UserProfile = require('../../models/UserProfile');
      const Region = require('../../models/Region');

      const user = await UserProfile.findById(userId).lean();
      const targetRegion = await Region.findById(targetRegionId).lean();

      if (!targetRegion) {
        return { success: false, message: 'Region not found' };
      }

      const docStatus = {
        licenseValid: user?.drivingLicense?.expiryDate ? new Date(user.drivingLicense.expiryDate) > new Date() : false,
        insuranceValid: user?.vehicleInsurance?.expiryDate ? new Date(user.vehicleInsurance.expiryDate) > new Date() : false,
        registrationValid: user?.vehicleRegistration?.expiryDate ? new Date(user.vehicleRegistration.expiryDate) > new Date() : false,
        backgroundCheckValid: user?.backgroundCheck?.completedDate ? 
          (Date.now() - new Date(user.backgroundCheck.completedDate)) < (365 * 24 * 60 * 60 * 1000) : false
      };

      const allValid = Object.values(docStatus).every(status => status);

      // Check region-specific requirements
      const additionalRequirements = [];
      if (targetRegion.compliance?.additionalVerification) {
        additionalRequirements.push(...targetRegion.compliance.additionalVerification);
      }

      return {
        success: true,
        message: 'Document verification completed',
        data: {
          userId,
          targetRegion: targetRegion.name,
          documentsValid: allValid,
          documentStatus: docStatus,
          additionalRequirements,
          eligibleForCrossRegion: allValid,
          nextVerificationDue: this._calculateNextVerificationDate(user)
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // ==================== HELPER METHODS ====================

  static async _getRegionForLocation(location) {
    const Region = require('../../models/Region');

    return await Region.findOne({
      'boundaries': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [location.lng, location.lat]
          }
        }
      }
    }).lean();
  }

  static _isCurrentTimeInRange(timeRange) {
    const now = new Date();
    const currentHour = now.getHours();
    return currentHour >= timeRange.start && currentHour < timeRange.end;
  }

  static _getSpecialCharges(pickupRegion, dropoffRegion) {
    const charges = [];

    if (pickupRegion?.name === 'Delhi' || dropoffRegion?.name === 'Delhi') {
      charges.push({ type: 'congestion_charge', amount: 50 });
    }

    return charges;
  }

  static _identifyExpansionOpportunities(regionStats) {
    return regionStats
      .filter(r => r.monthlyRides > 1000 && r.status === 'active')
      .map(r => ({
        opportunity: `High demand in ${r.region}`,
        recommendation: 'Increase driver supply',
        priority: 'high'
      }));
  }

  static _calculateNextVerificationDate(user) {
    if (!user?.backgroundCheck?.completedDate) return 'Not verified';

    const nextDate = new Date(user.backgroundCheck.completedDate);
    nextDate.setFullYear(nextDate.getFullYear() + 1);
    return nextDate.toISOString().split('T')[0];
  }
}

module.exports = MultiRegionService;
