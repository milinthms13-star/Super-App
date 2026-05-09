/**
 * DynamicPricingService.js
 * Phase 9: Dynamic Pricing & Surge Management
 * Implements demand-based pricing, surge pricing, and optimization algorithms
 */

class DynamicPricingService {
  /**
   * Calculate dynamic ride price
   * @param {object} rideData - Ride details (pickup, dropoff, time, distance)
   * @returns {object} - Price calculation result
   */
  static async calculateDynamicPrice(rideData) {
    try {
      const RideRequest = require('../../models/RideRequest');
      const SurgePricingEvent = require('../../models/SurgePricingEvent');

      // Base calculation
      const baseFare = await this._calculateBaseFare(rideData);
      
      // Get current surge multiplier
      const surgeMultiplier = await this._getSurgeMultiplier(rideData.pickupLocation, rideData.pickupTime);

      // Calculate demand factor
      const demandFactor = await this._calculateDemandFactor(rideData.pickupLocation, rideData.pickupTime);

      // Calculate time factor
      const timeFactor = this._calculateTimeFactor(rideData.pickupTime);

      // Calculate weather factor
      const weatherFactor = await this._calculateWeatherFactor(rideData.pickupLocation);

      // Calculate distance-based adjustments
      const distanceAdjustment = this._calculateDistanceAdjustment(rideData.distance);

      // Final price calculation
      let finalPrice = baseFare;
      finalPrice *= surgeMultiplier;
      finalPrice *= demandFactor;
      finalPrice *= timeFactor;
      finalPrice *= weatherFactor;
      finalPrice += distanceAdjustment;

      // Apply promotional discount if applicable
      let discountAmount = 0;
      if (rideData.promoCode) {
        const discountResult = await this._applyPromoCode(rideData.promoCode, finalPrice);
        discountAmount = discountResult.discountAmount;
        finalPrice -= discountAmount;
      }

      // Round to nearest rupee
      finalPrice = Math.round(finalPrice);

      // Store price calculation for analytics
      await this._storePriceCalculation({
        location: rideData.pickupLocation,
        time: rideData.pickupTime,
        baseFare,
        surgeMultiplier,
        demandFactor,
        timeFactor,
        weatherFactor,
        finalPrice,
        discountAmount
      });

      return {
        success: true,
        message: 'Dynamic price calculated successfully',
        data: {
          baseFare: Math.round(baseFare),
          surgeMultiplier: surgeMultiplier.toFixed(2),
          demandFactor: demandFactor.toFixed(2),
          timeFactor: timeFactor.toFixed(2),
          weatherFactor: weatherFactor.toFixed(2),
          distanceAdjustment: Math.round(distanceAdjustment),
          discountAmount: Math.round(discountAmount),
          finalPrice,
          priceBreakdown: {
            base: Math.round(baseFare),
            surge: Math.round(baseFare * (surgeMultiplier - 1)),
            demand: Math.round(baseFare * (demandFactor - 1)),
            timeAdjustment: Math.round(baseFare * (timeFactor - 1)),
            weatherAdjustment: Math.round(baseFare * (weatherFactor - 1)),
            discount: Math.round(discountAmount)
          },
          factors: {
            surge: surgeMultiplier > 1,
            highDemand: demandFactor > 1,
            peakTime: timeFactor > 1,
            badWeather: weatherFactor > 1
          }
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get current surge pricing status
   * @param {object} location - Location coordinates
   * @returns {object} - Surge pricing data
   */
  static async getSurgePricingStatus(location) {
    try {
      const SurgePricingEvent = require('../../models/SurgePricingEvent');
      const RideRequest = require('../../models/RideRequest');

      // Get active surge events in the area
      const activeSurge = await SurgePricingEvent.findOne({
        'affectedAreas.location': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [location.lng, location.lat]
            },
            $maxDistance: 5000 // 5km radius
          }
        },
        status: 'active'
      }).lean();

      // Calculate demand intensity
      const last30Minutes = new Date(Date.now() - 30 * 60 * 1000);
      const recentRequests = await RideRequest.countDocuments({
        'pickupLocation': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [location.lng, location.lat]
            },
            $maxDistance: 3000
          }
        },
        createdAt: { $gte: last30Minutes }
      });

      // Calculate available drivers
      const DriverProfile = require('../../models/DriverProfile');
      const availableDrivers = await DriverProfile.countDocuments({
        'currentLocation': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [location.lng, location.lat]
            },
            $maxDistance: 3000
          }
        },
        'status': 'available'
      });

      const supplyDemandRatio = availableDrivers > 0 ? recentRequests / availableDrivers : recentRequests;

      return {
        success: true,
        message: 'Surge pricing status retrieved',
        data: {
          surgeActive: !!activeSurge,
          surgeMultiplier: activeSurge?.multiplier || 1,
          surgeReason: activeSurge?.reason || 'No surge',
          recentDemand: recentRequests,
          availableSupply: availableDrivers,
          supplyDemandRatio: supplyDemandRatio.toFixed(2),
          demandLevel: this._getDemandLevel(supplyDemandRatio),
          estimatedWaitTime: Math.round(availableDrivers > 0 ? (recentRequests / availableDrivers) * 2 : 15),
          nextUpdateIn: 60 // seconds
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get pricing analytics
   * @param {object} filters - Filter parameters
   * @returns {object} - Pricing analytics
   */
  static async getPricingAnalytics(filters = {}) {
    try {
      const PriceCalculation = require('../../models/PriceCalculation');

      const query = {};
      if (filters.location) query.location = filters.location;
      if (filters.startDate) {
        query.createdAt = { $gte: new Date(filters.startDate) };
      }
      if (filters.endDate) {
        query.createdAt = query.createdAt || {};
        query.createdAt.$lte = new Date(filters.endDate);
      }

      const calculations = await PriceCalculation.find(query)
        .sort({ createdAt: -1 })
        .limit(1000)
        .lean();

      if (calculations.length === 0) {
        return { success: true, data: { message: 'No pricing data available' } };
      }

      // Calculate statistics
      const avgBaseFare = calculations.reduce((sum, c) => sum + c.baseFare, 0) / calculations.length;
      const avgFinalPrice = calculations.reduce((sum, c) => sum + c.finalPrice, 0) / calculations.length;
      const totalDiscounts = calculations.reduce((sum, c) => sum + (c.discountAmount || 0), 0);

      const surgeMoments = calculations.filter(c => c.surgeMultiplier > 1).length;
      const peakTimeMoments = calculations.filter(c => c.timeFactor > 1).length;
      const highDemandMoments = calculations.filter(c => c.demandFactor > 1).length;

      // Group by hour
      const byHour = {};
      calculations.forEach(c => {
        const hour = new Date(c.createdAt).getHours();
        if (!byHour[hour]) byHour[hour] = { count: 0, avgPrice: 0, totalPrice: 0 };
        byHour[hour].count++;
        byHour[hour].totalPrice += c.finalPrice;
      });

      Object.keys(byHour).forEach(hour => {
        byHour[hour].avgPrice = Math.round(byHour[hour].totalPrice / byHour[hour].count);
      });

      return {
        success: true,
        message: 'Pricing analytics retrieved',
        data: {
          summary: {
            dataPoints: calculations.length,
            avgBaseFare: Math.round(avgBaseFare),
            avgFinalPrice: Math.round(avgFinalPrice),
            totalDiscounts: Math.round(totalDiscounts),
            pricingEfficiency: ((avgFinalPrice / avgBaseFare) * 100).toFixed(1) + '%'
          },
          factors: {
            surgeMoments,
            surgeMomentsPct: ((surgeMoments / calculations.length) * 100).toFixed(1),
            peakTimeMoments,
            highDemandMoments
          },
          hourlyAnalysis: byHour,
          recommendations: this._getPricingRecommendations(calculations)
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Create surge pricing event (admin)
   * @param {object} eventData - Event details
   * @returns {object} - Creation result
   */
  static async createSurgePricingEvent(eventData) {
    try {
      const SurgePricingEvent = require('../../models/SurgePricingEvent');

      const event = await SurgePricingEvent.create({
        reason: eventData.reason, // 'weather', 'special_event', 'high_demand', 'manual'
        multiplier: eventData.multiplier || 1.5,
        affectedAreas: eventData.affectedAreas || [],
        startTime: eventData.startTime || new Date(),
        endTime: eventData.endTime || new Date(Date.now() + 60 * 60 * 1000),
        status: 'active',
        createdBy: eventData.createdBy,
        notes: eventData.notes || ''
      });

      return {
        success: true,
        message: 'Surge pricing event created',
        data: {
          eventId: event._id,
          multiplier: event.multiplier,
          status: event.status,
          duration: `${(event.endTime - event.startTime) / (1000 * 60)} minutes`
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get historical pricing for location
   * @param {object} location - Location coordinates
   * @param {number} days - Number of days to analyze
   * @returns {object} - Historical pricing data
   */
  static async getHistoricalPricing(location, days = 30) {
    try {
      const PriceCalculation = require('../../models/PriceCalculation');

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const historicalData = await PriceCalculation.aggregate([
        {
          $match: {
            location: location,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              hour: { $hour: '$createdAt' }
            },
            avgPrice: { $avg: '$finalPrice' },
            minPrice: { $min: '$baseFare' },
            maxPrice: { $max: '$finalPrice' },
            avgMultiplier: { $avg: '$surgeMultiplier' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1, '_id.hour': 1 } }
      ]);

      // Calculate trends
      const pricesByHour = {};
      historicalData.forEach(data => {
        const hour = data._id.hour;
        if (!pricesByHour[hour]) {
          pricesByHour[hour] = { prices: [], counts: 0 };
        }
        pricesByHour[hour].prices.push(data.avgPrice);
        pricesByHour[hour].counts += data.count;
      });

      const hourlyTrends = {};
      Object.keys(pricesByHour).forEach(hour => {
        const prices = pricesByHour[hour].prices;
        hourlyTrends[hour] = {
          avgPrice: Math.round(prices.reduce((a, b) => a + b) / prices.length),
          trend: prices.length > 1 ? (prices[prices.length - 1] - prices[0]) / prices[0] : 0,
          confidence: pricesByHour[hour].counts
        };
      });

      return {
        success: true,
        message: 'Historical pricing retrieved',
        data: {
          location,
          period: `${days} days`,
          hourlyTrends,
          dataPoints: historicalData.length,
          peakPricingHours: Object.keys(hourlyTrends)
            .sort((a, b) => hourlyTrends[b].avgPrice - hourlyTrends[a].avgPrice)
            .slice(0, 5)
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get price estimate for route
   * @param {object} routeData - Route details
   * @returns {object} - Price estimate
   */
  static async getPriceEstimate(routeData) {
    try {
      // Calculate estimated distance and time
      const distance = routeData.distance || 10; // km
      const estimatedTime = Math.ceil(distance / 30 * 60); // minutes (assuming 30km/hr avg)

      // Base calculation
      const baseFare = 50 + (distance * 15);
      const timeComponent = estimatedTime * 2;
      const totalEstimate = Math.round(baseFare + timeComponent);

      // Get current surge
      const surgeData = await this.getSurgePricingStatus(routeData.pickupLocation);
      const finalEstimate = Math.round(totalEstimate * (surgeData.data.surgeMultiplier || 1));

      return {
        success: true,
        message: 'Price estimate calculated',
        data: {
          baseFare,
          estimatedDistance: distance + ' km',
          estimatedTime: estimatedTime + ' minutes',
          estimatedFare: totalEstimate,
          surgeMultiplier: (surgeData.data.surgeMultiplier || 1).toFixed(2),
          finalEstimate,
          priceRange: {
            low: Math.round(finalEstimate * 0.9),
            high: Math.round(finalEstimate * 1.1)
          },
          note: 'Actual price may vary based on real-time demand and conditions'
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // ==================== HELPER METHODS ====================

  static async _calculateBaseFare(rideData) {
    const FLAT_FEE = 50; // ₹50 base
    const PER_KM_RATE = 15; // ₹15/km
    const PER_MIN_RATE = 2; // ₹2/min

    const distance = rideData.distance || 0;
    const estimatedTime = (distance / 30) * 60; // assuming 30 km/hr average

    return FLAT_FEE + (distance * PER_KM_RATE) + (estimatedTime * PER_MIN_RATE);
  }

  static async _getSurgeMultiplier(location, time) {
    const SurgePricingEvent = require('../../models/SurgePricingEvent');

    const activeSurge = await SurgePricingEvent.findOne({
      'affectedAreas': { $elemMatch: { location } },
      status: 'active',
      startTime: { $lte: time },
      endTime: { $gte: time }
    }).lean();

    return activeSurge ? activeSurge.multiplier : 1;
  }

  static async _calculateDemandFactor(location, time) {
    const RideRequest = require('../../models/RideRequest');

    const last30Minutes = new Date(time - 30 * 60 * 1000);
    const recentRequests = await RideRequest.countDocuments({
      'pickupLocation': {
        $near: {
          $geometry: { type: 'Point', coordinates: [location.lng, location.lat] },
          $maxDistance: 2000
        }
      },
      createdAt: { $gte: last30Minutes }
    });

    if (recentRequests > 50) return 1.5;
    if (recentRequests > 30) return 1.3;
    if (recentRequests > 10) return 1.15;
    return 1;
  }

  static _calculateTimeFactor(time) {
    const hour = new Date(time).getHours();
    const dayOfWeek = new Date(time).getDay();

    // Peak hours: 7-9 AM, 12-2 PM, 5-8 PM
    if ((hour >= 7 && hour <= 9) || (hour >= 12 && hour <= 14) || (hour >= 17 && hour <= 20)) {
      return 1.25;
    }

    // Late night: 11 PM - 5 AM
    if (hour >= 23 || hour <= 5) {
      return 1.5;
    }

    // Weekend surge
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 1.1;
    }

    return 1;
  }

  static async _calculateWeatherFactor(location) {
    // Integration point for weather API
    // For now, return 1 (no weather factor)
    return 1;
  }

  static _calculateDistanceAdjustment(distance) {
    if (distance < 5) return 0;
    if (distance > 30) return 100;
    return (distance - 5) * 5;
  }

  static async _applyPromoCode(promoCode, basePrice) {
    const PromoCode = require('../../models/PromoCode');

    const promo = await PromoCode.findOne({ code: promoCode, isActive: true }).lean();

    if (!promo || new Date(promo.expiryDate) < new Date()) {
      return { discountAmount: 0 };
    }

    let discountAmount = 0;
    if (promo.discountType === 'percentage') {
      discountAmount = (basePrice * promo.discountValue) / 100;
    } else if (promo.discountType === 'fixed') {
      discountAmount = promo.discountValue;
    }

    return {
      discountAmount: Math.min(discountAmount, basePrice * 0.5), // Max 50% discount
      promoId: promo._id
    };
  }

  static async _storePriceCalculation(data) {
    const PriceCalculation = require('../../models/PriceCalculation');
    await PriceCalculation.create(data);
  }

  static _getDemandLevel(ratio) {
    if (ratio > 3) return 'very_high';
    if (ratio > 2) return 'high';
    if (ratio > 1) return 'medium';
    return 'low';
  }

  static _getPricingRecommendations(calculations) {
    const recommendations = [];

    const surgeCount = calculations.filter(c => c.surgeMultiplier > 1.5).length;
    if (surgeCount > calculations.length * 0.3) {
      recommendations.push({
        type: 'surge_pattern',
        message: 'High surge pricing detected. Consider dynamic pricing strategy.'
      });
    }

    const discountUsage = calculations.filter(c => c.discountAmount > 0).length;
    if (discountUsage > calculations.length * 0.5) {
      recommendations.push({
        type: 'discount_usage',
        message: 'High discount usage. Review promo code strategy.'
      });
    }

    return recommendations;
  }
}

module.exports = DynamicPricingService;
