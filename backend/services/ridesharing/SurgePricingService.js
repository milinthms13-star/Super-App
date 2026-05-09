/**
 * SurgePricingService.js
 * Phase 5: Advanced Surge Pricing Engine
 * Demand-based, time-based, location-based, and event-based dynamic pricing
 */

const RideRequest = require('../../models/RideRequest');
const DriverProfile = require('../../models/DriverProfile');

class SurgePricingService {
  /**
   * Demand index based on multiple factors
   * Returns a value from 0 to 5+ indicating demand level
   */
  static async calculateDemandIndex(lat, lng, rideType, time = new Date()) {
    try {
      const hour = time.getHours();
      const dayOfWeek = time.getDay();
      const timeKey = `${hour}:${Math.floor(time.getMinutes() / 15) * 15}`;

      // Get active ride requests in the area (5km radius)
      const activeRequests = await RideRequest.countDocuments({
        'pickup.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)],
            },
            $maxDistance: 5000, // 5km
          },
        },
        status: { $in: ['requested', 'assigned'] },
        rideType,
      });

      // Get available drivers in the area
      const availableDrivers = await DriverProfile.countDocuments({
        currentLocation: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)],
            },
            $maxDistance: 5000,
          },
        },
        availabilityStatus: 'available',
        vehicleType: rideType,
      });

      // Supply-demand ratio
      const demandRatio = availableDrivers > 0 ? activeRequests / availableDrivers : activeRequests;

      // Base demand index from historical patterns
      const baseIndex = this.getHistoricalDemandIndex(hour, dayOfWeek);

      // Time-based multipliers
      const timeMultiplier = this.getTimeMultiplier(hour, dayOfWeek);

      // Calculate final demand index
      const demandIndex = (baseIndex + demandRatio) * timeMultiplier;

      return {
        demandIndex: Math.round(demandIndex * 100) / 100,
        activeRequests,
        availableDrivers,
        demandRatio: Math.round(demandRatio * 100) / 100,
        baseIndex,
        timeMultiplier,
      };
    } catch (error) {
      console.error('Error calculating demand index:', error);
      return {
        demandIndex: 1.0,
        activeRequests: 0,
        availableDrivers: 0,
        demandRatio: 0,
        baseIndex: 1.0,
        timeMultiplier: 1.0,
      };
    }
  }

  /**
   * Historical demand index based on time patterns
   * Peak hours: 7-10am, 12-2pm, 6-9pm
   */
  static getHistoricalDemandIndex(hour, dayOfWeek) {
    const peakHours = {
      7: 1.8,
      8: 2.0,
      9: 1.9,
      12: 1.7,
      13: 1.8,
      18: 1.9,
      19: 2.1,
      20: 2.0,
    };

    if (peakHours[hour]) {
      return peakHours[hour];
    }

    // Off-peak hours
    if ((hour >= 10 && hour < 12) || (hour >= 14 && hour < 18)) {
      return 1.2;
    }

    // Night hours (lower demand)
    if (hour >= 22 || hour < 6) {
      return 0.8;
    }

    // Morning/evening transitions
    return 1.0;
  }

  /**
   * Time-based multiplier
   * Considers day of week, holidays, special events
   */
  static getTimeMultiplier(hour, dayOfWeek) {
    let multiplier = 1.0;

    // Weekend surge (Friday-Sunday)
    if (dayOfWeek >= 5) {
      multiplier *= 1.2;
    }

    // Late night surge (11pm-5am)
    if (hour >= 23 || hour < 5) {
      multiplier *= 1.3;
    }

    // Early morning surge (5-6am)
    if (hour >= 5 && hour < 6) {
      multiplier *= 1.15;
    }

    return multiplier;
  }

  /**
   * Location-based surge multiplier
   * Airport, mall, events venues get premium pricing
   */
  static async getLocationMultiplier(lat, lng) {
    try {
      // Define hotspots (could be stored in database)
      const hotspots = [
        {
          name: 'Airport',
          lat: 12.4381,
          lng: 76.0122,
          radius: 2000,
          multiplier: 1.5,
        },
        {
          name: 'Main Shopping Mall',
          lat: 12.457,
          lng: 76.0123,
          radius: 1000,
          multiplier: 1.3,
        },
        {
          name: 'Central Business District',
          lat: 12.4601,
          lng: 76.0122,
          radius: 3000,
          multiplier: 1.25,
        },
      ];

      for (const hotspot of hotspots) {
        const distance = this.calculateDistance(lat, lng, hotspot.lat, hotspot.lng);
        if (distance <= hotspot.radius / 1000) {
          return hotspot.multiplier;
        }
      }

      return 1.0; // No special location
    } catch (error) {
      console.error('Error getting location multiplier:', error);
      return 1.0;
    }
  }

  /**
   * Weather-based surge multiplier
   * Rain, snow, storms increase demand and fares
   */
  static async getWeatherMultiplier(lat, lng) {
    try {
      // In production, integrate with weather API
      // For now, return static multiplier
      // Example: fetch from OpenWeatherMap API
      const weatherCondition = await this.getWeatherCondition(lat, lng);

      const weatherMultipliers = {
        clear: 1.0,
        cloudy: 1.0,
        rain: 1.25,
        heavy_rain: 1.5,
        storm: 1.75,
        snow: 1.8,
        fog: 1.2,
      };

      return weatherMultipliers[weatherCondition] || 1.0;
    } catch (error) {
      console.error('Error getting weather multiplier:', error);
      return 1.0;
    }
  }

  /**
   * Get weather condition from cache or API
   * In production, integrate with OpenWeatherMap or similar
   */
  static async getWeatherCondition(lat, lng) {
    // Placeholder: In production, call weather API
    // const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${API_KEY}`);
    // const data = await response.json();
    // return data.weather[0].main.toLowerCase();

    return 'clear'; // Default
  }

  /**
   * Event-based surge pricing
   * Special multiplier for festivals, concerts, sports events
   */
  static async getEventMultiplier(lat, lng, date = new Date()) {
    try {
      const events = [
        {
          name: 'Summer Festival',
          date: '2026-05-25',
          lat: 12.4,
          lng: 76.0,
          radius: 5000,
          multiplier: 2.0,
        },
        {
          name: 'Cricket Match',
          date: '2026-05-20',
          lat: 12.45,
          lng: 76.01,
          radius: 3000,
          multiplier: 1.8,
        },
      ];

      const dateStr = date.toISOString().split('T')[0];

      for (const event of events) {
        if (event.date === dateStr) {
          const distance = this.calculateDistance(lat, lng, event.lat, event.lng);
          if (distance <= event.radius / 1000) {
            return event.multiplier;
          }
        }
      }

      return 1.0; // No special events
    } catch (error) {
      console.error('Error getting event multiplier:', error);
      return 1.0;
    }
  }

  /**
   * Calculate surge multiplier from all factors
   * Combines demand, time, location, weather, and events
   */
  static async calculateSurgeMultiplier(lat, lng, rideType, time = new Date()) {
    try {
      // Get all multipliers
      const demandData = await this.calculateDemandIndex(lat, lng, rideType, time);
      const locationMult = await this.getLocationMultiplier(lat, lng);
      const weatherMult = await this.getWeatherMultiplier(lat, lng);
      const eventMult = await this.getEventMultiplier(lat, lng, time);

      // Base surge from demand index (capped at 3.0)
      let surgeMult = Math.min(3.0, demandData.demandIndex);

      // Apply other multipliers
      surgeMult *= locationMult;
      surgeMult *= weatherMult;
      surgeMult *= eventMult;

      // Cap surge multiplier at 5.0 (max 500% price increase)
      surgeMult = Math.min(5.0, surgeMult);

      return {
        surgeFactor: Math.round(surgeMult * 100) / 100,
        baseSurge: demandData.demandIndex,
        locationMult,
        weatherMult,
        eventMult,
        demandData,
      };
    } catch (error) {
      console.error('Error calculating surge multiplier:', error);
      return {
        surgeFactor: 1.0,
        baseSurge: 1.0,
        locationMult: 1.0,
        weatherMult: 1.0,
        eventMult: 1.0,
        demandData: {
          demandIndex: 1.0,
          activeRequests: 0,
          availableDrivers: 0,
        },
      };
    }
  }

  /**
   * Calculate final fare with surge pricing
   */
  static async calculateSurgedFare(pickupLat, pickupLng, dropoffLat, dropoffLng, rideType, baseFare) {
    try {
      const surgeData = await this.calculateSurgeMultiplier(
        pickupLat,
        pickupLng,
        rideType
      );

      const surgedFare = Math.round(baseFare * surgeData.surgeFactor * 100) / 100;

      return {
        baseFare,
        surgeFactor: surgeData.surgeFactor,
        surgedFare,
        breakdown: {
          baseFare,
          surgeAmount: Math.round((surgedFare - baseFare) * 100) / 100,
          demandFactor: surgeData.baseSurge,
          locationFactor: surgeData.locationMult,
          weatherFactor: surgeData.weatherMult,
          eventFactor: surgeData.eventMult,
        },
      };
    } catch (error) {
      throw new Error(`Error calculating surged fare: ${error.message}`);
    }
  }

  /**
   * Notify users about upcoming surge
   * Used in UI to show surge warnings
   */
  static async getSurgeWarning(lat, lng, rideType) {
    try {
      const surgeData = await this.calculateSurgeMultiplier(lat, lng, rideType);
      const surgeFactor = surgeData.surgeFactor;

      if (surgeFactor < 1.1) {
        return {
          isSurging: false,
          message: 'Normal pricing',
          multiplier: surgeFactor,
        };
      }

      if (surgeFactor < 1.25) {
        return {
          isSurging: true,
          severity: 'low',
          message: `Slight surge (${Math.round((surgeFactor - 1) * 100)}% increase)`,
          multiplier: surgeFactor,
        };
      }

      if (surgeFactor < 1.5) {
        return {
          isSurging: true,
          severity: 'medium',
          message: `Moderate surge (${Math.round((surgeFactor - 1) * 100)}% increase)`,
          multiplier: surgeFactor,
        };
      }

      return {
        isSurging: true,
        severity: 'high',
        message: `High surge pricing (${Math.round((surgeFactor - 1) * 100)}% increase)`,
        multiplier: surgeFactor,
        recommendation:
          'High demand. Consider booking later or using a different ride type.',
      };
    } catch (error) {
      console.error('Error getting surge warning:', error);
      return {
        isSurging: false,
        message: 'Unable to determine surge status',
        multiplier: 1.0,
      };
    }
  }

  /**
   * Store pricing history for analytics
   */
  static async recordPriceSnapshot(lat, lng, rideType, fareData) {
    try {
      // In production, store to database for analytics
      // db.priceHistory.insertOne({
      //   lat, lng, rideType, ...fareData,
      //   recordedAt: new Date()
      // })

      console.log('Price snapshot recorded:', {
        location: { lat, lng },
        rideType,
        fare: fareData.surgedFare,
        surge: fareData.surgeFactor,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('Error recording price snapshot:', error);
      return false;
    }
  }

  /**
   * Calculate distance using haversine formula
   */
  static calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

module.exports = SurgePricingService;
