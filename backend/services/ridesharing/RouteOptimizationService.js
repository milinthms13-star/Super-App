/**
 * RouteOptimizationService.js
 * Google Maps integration for route optimization and ETA calculation
 */

const axios = require('axios');
const NodeGeocoder = require('node-geocoder');

class RouteOptimizationService {
  constructor() {
    this.mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.mapsBaseUrl = 'https://maps.googleapis.com/maps/api';

    // Initialize geocoder
    this.geocoder = NodeGeocoder({
      provider: 'google',
      apiKey: this.mapsApiKey,
      timeout: 5000,
    });

    if (!this.mapsApiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY not configured');
    }
  }

  /**
   * Calculate optimal route between pickup and dropoff
   * @param {Object} pickup - {lat, lng}
   * @param {Object} dropoff - {lat, lng}
   * @param {String} mode - 'driving' | 'transit' | 'walking' (default: 'driving')
   * @returns {Promise<Object>} - {distance, duration, polyline, steps, trafficCondition}
   */
  async calculateOptimalRoute(pickup, dropoff, mode = 'driving') {
    try {
      if (!this.validateCoordinates(pickup) || !this.validateCoordinates(dropoff)) {
        throw new Error('Invalid pickup or dropoff coordinates');
      }

      const response = await axios.get(`${this.mapsBaseUrl}/directions/json`, {
        params: {
          origin: `${pickup.lat},${pickup.lng}`,
          destination: `${dropoff.lat},${dropoff.lng}`,
          mode: mode,
          key: this.mapsApiKey,
          alternatives: true, // Get multiple routes
          traffic_model: 'best_guess',
          departure_time: 'now',
        },
        timeout: 10000,
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }

      const routes = response.data.routes;
      if (!routes || routes.length === 0) {
        throw new Error('No routes found for given coordinates');
      }

      // Get the primary route
      const primaryRoute = routes[0];
      const leg = primaryRoute.legs[0];

      return {
        success: true,
        primaryRoute: {
          distance: leg.distance.text,
          distanceMeters: leg.distance.value,
          duration: leg.duration.text,
          durationSeconds: leg.duration.value,
          durationInTraffic: leg.duration_in_traffic ? leg.duration_in_traffic.text : leg.duration.text,
          durationInTrafficSeconds: leg.duration_in_traffic ? leg.duration_in_traffic.value : leg.duration.value,
          polyline: primaryRoute.overview_polyline.points,
          steps: this.formatSteps(leg.steps),
          startAddress: leg.start_address,
          endAddress: leg.end_address,
        },
        alternativeRoutes: routes.slice(1, 3).map(route => ({
          distance: route.legs[0].distance.value,
          duration: route.legs[0].duration.value,
          polyline: route.overview_polyline.points,
        })),
        trafficCondition: this.assessTrafficCondition(leg.duration_in_traffic, leg.duration),
      };
    } catch (error) {
      console.error('Error calculating optimal route:', error);
      throw new Error(`Route optimization failed: ${error.message}`);
    }
  }

  /**
   * Calculate ETA with real-time traffic
   * @param {Object} currentLocation - {lat, lng}
   * @param {Object} destination - {lat, lng}
   * @param {String} departureTime - ISO timestamp or 'now'
   * @returns {Promise<Object>} - {eta, etaDate, remainingDistance, remainingTime}
   */
  async calculateETAWithTraffic(currentLocation, destination, departureTime = 'now') {
    try {
      const routeData = await this.calculateOptimalRoute(currentLocation, destination);

      const etaSeconds = routeData.primaryRoute.durationInTrafficSeconds;
      const etaDate = new Date(Date.now() + etaSeconds * 1000);

      return {
        success: true,
        eta: this.formatTimeRemaining(etaSeconds),
        etaDate: etaDate.toISOString(),
        remainingDistance: routeData.primaryRoute.distanceMeters,
        remainingTime: etaSeconds,
        distanceText: routeData.primaryRoute.distance,
        durationText: routeData.primaryRoute.durationInTraffic,
        trafficCondition: routeData.trafficCondition,
        confidence: 0.85, // Traffic prediction confidence
      };
    } catch (error) {
      console.error('Error calculating ETA:', error);
      throw new Error(`ETA calculation failed: ${error.message}`);
    }
  }

  /**
   * Get multiple route options for comparison
   * @param {Object} pickup - {lat, lng}
   * @param {Object} dropoff - {lat, lng}
   * @returns {Promise<Array>} - Array of route options
   */
  async getMultipleRouteOptions(pickup, dropoff) {
    try {
      const response = await axios.get(`${this.mapsBaseUrl}/directions/json`, {
        params: {
          origin: `${pickup.lat},${pickup.lng}`,
          destination: `${dropoff.lat},${dropoff.lng}`,
          mode: 'driving',
          key: this.mapsApiKey,
          alternatives: true,
          traffic_model: 'best_guess',
          departure_time: 'now',
        },
        timeout: 10000,
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }

      return response.data.routes.map((route, index) => {
        const leg = route.legs[0];
        return {
          id: index,
          distance: leg.distance.value,
          distanceText: leg.distance.text,
          duration: leg.duration.value,
          durationText: leg.duration.text,
          durationInTraffic: leg.duration_in_traffic ? leg.duration_in_traffic.value : leg.duration.value,
          durationInTrafficText: leg.duration_in_traffic ? leg.duration_in_traffic.text : leg.duration.text,
          polyline: route.overview_polyline.points,
          trafficCondition: this.assessTrafficCondition(leg.duration_in_traffic, leg.duration),
          isRecommended: index === 0,
        };
      });
    } catch (error) {
      console.error('Error getting multiple route options:', error);
      throw new Error(`Failed to get route options: ${error.message}`);
    }
  }

  /**
   * Find nearest pickup point suggestion
   * @param {Object} userLocation - {lat, lng}
   * @param {Number} radius - Search radius in meters (default: 500)
   * @returns {Promise<Array>} - Array of nearby pickup suggestions
   */
  async suggestNearestPickupPoint(userLocation, radius = 500) {
    try {
      const response = await axios.get(`${this.mapsBaseUrl}/place/nearbysearch/json`, {
        params: {
          location: `${userLocation.lat},${userLocation.lng}`,
          radius: radius,
          type: 'transit_station', // or 'parking', 'restaurant', etc.
          key: this.mapsApiKey,
        },
        timeout: 10000,
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }

      return (response.data.results || []).slice(0, 5).map(place => ({
        id: place.place_id,
        name: place.name,
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        },
        address: place.vicinity,
        rating: place.rating || null,
        types: place.types || [],
        distance: this.calculateDistance(userLocation, place.geometry.location),
      }));
    } catch (error) {
      console.error('Error suggesting pickup points:', error);
      throw new Error(`Failed to suggest pickup points: ${error.message}`);
    }
  }

  /**
   * Reverse geocode coordinates to address
   * @param {Object} location - {lat, lng}
   * @returns {Promise<String>} - Address string
   */
  async reverseGeocode(location) {
    try {
      const response = await axios.get(`${this.mapsBaseUrl}/geocode/json`, {
        params: {
          latlng: `${location.lat},${location.lng}`,
          key: this.mapsApiKey,
        },
        timeout: 10000,
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Geocoding failed: ${response.data.status}`);
      }

      return response.data.results[0]?.formatted_address || 'Unknown location';
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      throw new Error(`Reverse geocoding failed: ${error.message}`);
    }
  }

  /**
   * Forward geocode address to coordinates
   * @param {String} address - Street address
   * @returns {Promise<Object>} - {lat, lng}
   */
  async forwardGeocode(address) {
    try {
      const response = await axios.get(`${this.mapsBaseUrl}/geocode/json`, {
        params: {
          address: address,
          key: this.mapsApiKey,
        },
        timeout: 10000,
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Geocoding failed: ${response.data.status}`);
      }

      const location = response.data.results[0]?.geometry?.location;
      if (!location) {
        throw new Error('Location not found');
      }

      return {
        lat: location.lat,
        lng: location.lng,
        formattedAddress: response.data.results[0].formatted_address,
      };
    } catch (error) {
      console.error('Error forward geocoding:', error);
      throw new Error(`Forward geocoding failed: ${error.message}`);
    }
  }

  /**
   * Get traffic layer data for a region
   * @param {Object} center - {lat, lng}
   * @param {Number} radius - In kilometers (default: 2)
   * @returns {Promise<Object>} - Traffic data
   */
  async getTrafficData(center, radius = 2) {
    try {
      const response = await axios.get(`${this.mapsBaseUrl}/distancematrix/json`, {
        params: {
          origins: `${center.lat},${center.lng}`,
          destinations: [
            `${center.lat},${center.lng}`,
            `${center.lat + 0.01},${center.lng}`,
            `${center.lat - 0.01},${center.lng}`,
            `${center.lat},${center.lng + 0.01}`,
            `${center.lat},${center.lng - 0.01}`,
          ].join('|'),
          mode: 'driving',
          key: this.mapsApiKey,
          traffic_model: 'best_guess',
          departure_time: 'now',
        },
        timeout: 10000,
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Traffic data API error: ${response.data.status}`);
      }

      return {
        success: true,
        center: center,
        radius: radius,
        trafficConditions: response.data.rows[0].elements.map((element, idx) => ({
          direction: ['center', 'east', 'west', 'north', 'south'][idx],
          condition: this.assessTrafficCondition(
            element.duration_in_traffic,
            element.duration
          ),
        })),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting traffic data:', error);
      throw new Error(`Failed to get traffic data: ${error.message}`);
    }
  }

  /**
   * Helper: Format navigation steps
   * @private
   */
  formatSteps(steps) {
    return steps.map(step => ({
      instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
      distance: step.distance.value,
      duration: step.duration.value,
      maneuver: step.maneuver || 'continue',
      startLocation: step.start_location,
      endLocation: step.end_location,
    }));
  }

  /**
   * Helper: Assess traffic condition
   * @private
   */
  assessTrafficCondition(trafficDuration, normalDuration) {
    if (!trafficDuration || !normalDuration) {
      return 'normal';
    }

    const ratio = trafficDuration.value / normalDuration.value;
    if (ratio <= 1.1) return 'light';
    if (ratio <= 1.5) return 'moderate';
    if (ratio <= 2) return 'heavy';
    return 'severe';
  }

  /**
   * Helper: Validate coordinates
   * @private
   */
  validateCoordinates(coords) {
    return coords && 
           typeof coords.lat === 'number' && 
           typeof coords.lng === 'number' &&
           coords.lat >= -90 && coords.lat <= 90 &&
           coords.lng >= -180 && coords.lng <= 180;
  }

  /**
   * Helper: Calculate distance between two points in km
   * @private
   */
  calculateDistance(from, to) {
    const R = 6371; // Earth's radius in km
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Helper: Format time remaining
   * @private
   */
  formatTimeRemaining(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  }
}

module.exports = new RouteOptimizationService();
