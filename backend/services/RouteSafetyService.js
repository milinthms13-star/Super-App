/**
 * RouteSafetyService.js
 * Route optimization with safety features and unsafe area detection
 */

const RideRequest = require('../models/RideRequest');
const notificationService = require('./notificationService');

class RouteSafetyService {
  // Database of unsafe areas (example structure)
  UNSAFE_AREAS = [
    // Format: { name, lat, lng, radius_km, crime_rate, daytime_safe }
    // This would come from external database or crime API
  ];

  WELL_LIT_ROUTES = [
    // Major highways and main roads
  ];

  /**
   * 1. Check route safety
   */
  async checkRouteSafety(pickupLat, pickupLng, dropoffLat, dropoffLng, time = 'night') {
    try {
      const safetyReport = {
        pickupLocation: { lat: pickupLat, lng: pickupLng },
        dropoffLocation: { lat: dropoffLat, lng: dropoffLng },
        time,
        risks: [],
        recommendations: [],
        safetyScore: 100,
      };

      // Check if pickup location is safe
      const pickupRisk = this.checkLocationSafety(pickupLat, pickupLng, time);
      if (pickupRisk) {
        safetyReport.risks.push({
          type: 'pickup_location',
          description: pickupRisk.description,
          severity: pickupRisk.severity,
        });
        safetyReport.safetyScore -= 15;
      }

      // Check if dropoff location is safe
      const dropoffRisk = this.checkLocationSafety(dropoffLat, dropoffLng, time);
      if (dropoffRisk) {
        safetyReport.risks.push({
          type: 'dropoff_location',
          description: dropoffRisk.description,
          severity: dropoffRisk.severity,
        });
        safetyReport.safetyScore -= 15;
      }

      // Generate alternative safe routes
      if (safetyReport.risks.length > 0) {
        safetyReport.recommendations = await this.generateSafeAlternatives(
          pickupLat,
          pickupLng,
          dropoffLat,
          dropoffLng,
          time
        );
      }

      // Add general safety tips
      if (time === 'night') {
        safetyReport.recommendations.push({
          type: 'tip',
          message: 'Consider sharing your live location with a trusted contact',
        });
        safetyReport.recommendations.push({
          type: 'tip',
          message: 'Keep emergency contacts readily available',
        });
      }

      return {
        success: true,
        safetyReport,
        safeRoute: safetyReport.safetyScore >= 70,
      };
    } catch (error) {
      console.error('Error checking route safety:', error);
      throw new Error(`Failed to check route safety: ${error.message}`);
    }
  }

  /**
   * 2. Mark unsafe route
   */
  async markUnsafeRoute(latitude, longitude, description, severity = 'medium') {
    try {
      // Save to unsafe areas database
      const unsafeArea = {
        latitude,
        longitude,
        description,
        severity,
        reportedAt: new Date(),
        reportCount: 1,
      };

      // In production, save to database
      // For now, log it
      console.log('Unsafe area marked:', unsafeArea);

      // Alert nearby drivers/riders
      await this.alertNearbyUsers(latitude, longitude, description);

      return {
        success: true,
        message: 'Unsafe route reported successfully',
        areaId: Math.random().toString(36).substr(2, 9),
      };
    } catch (error) {
      console.error('Error marking unsafe route:', error);
      throw new Error(`Failed to mark unsafe route: ${error.message}`);
    }
  }

  /**
   * 3. Get route optimization for safe travel
   */
  async optimizeSafeRoute(pickupLat, pickupLng, dropoffLat, dropoffLng, rideId = null) {
    try {
      // This would integrate with Google Maps API
      const optimizedRoute = {
        primaryRoute: {
          distance: this.calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng),
          duration: '15-20 mins',
          polyline: 'encoded_polyline_string',
          wellLitRoads: true,
          safetyScore: 85,
        },
        alternativeRoutes: [
          {
            distance: '2.1 km',
            duration: '16-21 mins',
            polyline: 'alternate_polyline_string',
            wellLitRoads: true,
            safetyScore: 90,
            description: 'Via Main Highway (Better lighting)',
          },
          {
            distance: '1.9 km',
            duration: '14-19 mins',
            polyline: 'alternate_polyline_string_2',
            wellLitRoads: false,
            safetyScore: 60,
            description: 'Via Local Roads (Avoid if possible)',
          },
        ],
        recommendedRoute: 'primary',
        safetyTips: [
          'Stick to well-lit areas',
          'Avoid isolated streets late at night',
          'Keep emergency contacts handy',
        ],
      };

      // Save route preference to ride
      if (rideId) {
        await RideRequest.findByIdAndUpdate(
          rideId,
          {
            preferredRoute: optimizedRoute.primaryRoute,
            safetyLevel: optimizedRoute.primaryRoute.safetyScore,
          },
          { new: true }
        );
      }

      return {
        success: true,
        route: optimizedRoute,
      };
    } catch (error) {
      console.error('Error optimizing route:', error);
      throw new Error(`Failed to optimize route: ${error.message}`);
    }
  }

  /**
   * 4. Daytime route preference
   */
  async suggestDaytimeRoute(pickupLat, pickupLng, dropoffLat, dropoffLng) {
    try {
      const suggestions = {
        currentTime: new Date(),
        isDaytime: this.isDaytime(new Date()),
        recommendations: [],
        rideType: [],
      };

      const isDaytime = suggestions.isDaytime;

      if (!isDaytime) {
        suggestions.recommendations.push({
          type: 'timing',
          message: 'Night ride detected. Consider rescheduling to daytime if possible.',
          severity: 'medium',
        });

        suggestions.recommendations.push({
          type: 'safety',
          message: 'Ensure your trip is shared with trusted contacts',
        });

        // Recommend higher visibility ride types
        suggestions.rideType = [
          {
            type: 'sedan',
            reason: 'More visible to other vehicles',
            safetyRating: 4.5,
          },
          {
            type: 'suv',
            reason: 'Better visibility and safety features',
            safetyRating: 4.7,
          },
        ];
      } else {
        suggestions.recommendations.push({
          type: 'safety',
          message: 'Daytime ride is safer. Normal precautions recommended.',
        });

        suggestions.rideType = [
          { type: 'bike', reason: 'Economical option during day', safetyRating: 4.0 },
          { type: 'auto', reason: 'Popular and safe during daytime', safetyRating: 4.2 },
          { type: 'minicab', reason: 'Comfort and safety combined', safetyRating: 4.3 },
        ];
      }

      return {
        success: true,
        suggestions,
      };
    } catch (error) {
      console.error('Error suggesting daytime route:', error);
      throw new Error(`Failed to suggest route: ${error.message}`);
    }
  }

  /**
   * 5. Get high-crime areas to avoid
   */
  async getHighCrimeAreas(latitude, longitude, radius = 2) {
    try {
      // In production, query from database or external API
      const crimeAreas = [
        // Example structure
        // {
        //   name: 'Area Name',
        //   lat: 10.123,
        //   lng: 76.123,
        //   radius: 0.5,
        //   crimeRate: 'high',
        //   reportCount: 15,
        //   lastIncident: '2024-05-01'
        // }
      ];

      // Filter areas within specified radius
      const nearbyAreas = crimeAreas.filter((area) =>
        this.isWithinRadius(latitude, longitude, area.lat, area.lng, radius)
      );

      return {
        success: true,
        crimeAreas: nearbyAreas,
        count: nearbyAreas.length,
        recommendations: nearbyAreas.length > 0 ? this.getAvoidanceRecommendations(nearbyAreas) : [],
      };
    } catch (error) {
      console.error('Error fetching crime areas:', error);
      throw new Error(`Failed to fetch crime areas: ${error.message}`);
    }
  }

  // Helper methods

  /**
   * Helper: Check location safety
   */
  checkLocationSafety(lat, lng, time) {
    // Check if location is in unsafe areas
    const unsafeArea = this.UNSAFE_AREAS.find((area) =>
      this.isWithinRadius(lat, lng, area.lat, area.lng, area.radius_km)
    );

    if (unsafeArea) {
      // Check if it's daytime safe
      if (time === 'night' && !unsafeArea.daytime_safe) {
        return {
          description: `Located in high-crime area: ${unsafeArea.name}`,
          severity: 'high',
        };
      }
    }

    return null;
  }

  /**
   * Helper: Generate safe alternatives
   */
  async generateSafeAlternatives(lat1, lng1, lat2, lng2, time) {
    return [
      {
        type: 'route',
        description: 'Recommended route via main highway with good lighting',
        benefit: 'Well-lit and populated roads',
      },
      {
        type: 'timing',
        description: 'Schedule your trip for earlier in the day',
        benefit: 'Better visibility and more people around',
      },
      {
        type: 'share',
        description: 'Share your live location with trusted contacts',
        benefit: 'Someone will know your whereabouts',
      },
    ];
  }

  /**
   * Helper: Alert nearby users
   */
  async alertNearbyUsers(latitude, longitude, description) {
    try {
      // Find riders/drivers near this location
      // Send notification about the unsafe area
      console.log(`Notifying users near ${latitude}, ${longitude} about: ${description}`);
    } catch (error) {
      console.error('Error alerting users:', error);
    }
  }

  /**
   * Helper: Calculate distance between two points
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2); // km
  }

  /**
   * Helper: Check if coordinates within radius
   */
  isWithinRadius(lat1, lng1, lat2, lng2, radiusKm) {
    const distance = this.calculateDistance(lat1, lng1, lat2, lng2);
    return parseFloat(distance) <= radiusKm;
  }

  /**
   * Helper: Check if current time is daytime
   */
  isDaytime(date = new Date()) {
    const hour = date.getHours();
    return hour >= 6 && hour < 18; // 6 AM to 6 PM
  }

  /**
   * Helper: Get avoidance recommendations
   */
  getAvoidanceRecommendations(areas) {
    return [
      {
        type: 'route',
        message: `Avoid ${areas.map((a) => a.name).join(', ')} due to high crime rate`,
      },
      {
        type: 'timing',
        message: 'Consider traveling during daytime hours',
      },
      {
        type: 'share',
        message: 'Share your live trip with emergency contacts',
      },
    ];
  }
}

module.exports = new RouteSafetyService();
