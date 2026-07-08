const axios = require('axios');
const NodeGeocoder = require('node-geocoder');
const { cacheService } = require('./cacheService');
const { errorTrackingService } = require('./errorTrackingService');

class LocationService {
  constructor() {
    this.geocoder = NodeGeocoder({
      provider: 'openstreetmap',
      httpAdapter: 'https',
      apiKey: process.env.GEOCODING_API_KEY || null,
      formatter: null
    });

    // Backup geocoder with Google Maps
    this.googleGeocoder = process.env.GOOGLE_MAPS_API_KEY ? NodeGeocoder({
      provider: 'google',
      httpAdapter: 'https',
      apiKey: process.env.GOOGLE_MAPS_API_KEY,
      formatter: null
    }) : null;
  }

  /**
   * Geocode an address to coordinates
   * @param {string} address - Address string
   * @returns {Promise<{lat: number, lng: number, formattedAddress: string}>}
   */
  async geocode(address) {
    if (!address) {
      throw new Error('Address is required for geocoding');
    }

    try {
      // Check cache first
      const cacheKey = `geocode:${address.toLowerCase().trim()}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      // Try primary geocoder
      let results = await this.geocoder.geocode(address);
      
      // If no results and Google is available, try Google
      if ((!results || results.length === 0) && this.googleGeocoder) {
        results = await this.googleGeocoder.geocode(address);
      }

      if (!results || results.length === 0) {
        throw new Error('No results found for address');
      }

      const location = {
        lat: results[0].latitude,
        lng: results[0].longitude,
        formattedAddress: results[0].formattedAddress || address,
        city: results[0].city,
        state: results[0].state || results[0].administrativeLevels?.level1long,
        country: results[0].country,
        zipcode: results[0].zipcode
      };

      // Cache for 30 days (addresses don't change often)
      await cacheService.set(cacheKey, location, 30 * 24 * 60 * 60);

      return location;
    } catch (error) {
      errorTrackingService.captureError(error, { address, context: 'geocode' });
      throw new Error(`Geocoding failed: ${error.message}`);
    }
  }

  /**
   * Reverse geocode coordinates to address
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<string>}
   */
  async reverseGeocode(lat, lng) {
    try {
      const cacheKey = `reverse:${lat}:${lng}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      let results = await this.geocoder.reverse({ lat, lon: lng });
      
      if ((!results || results.length === 0) && this.googleGeocoder) {
        results = await this.googleGeocoder.reverse({ lat, lon: lng });
      }

      if (!results || results.length === 0) {
        throw new Error('No results found for coordinates');
      }

      const address = results[0].formattedAddress;
      await cacheService.set(cacheKey, address, 30 * 24 * 60 * 60);

      return address;
    } catch (error) {
      errorTrackingService.captureError(error, { lat, lng, context: 'reverse-geocode' });
      throw new Error(`Reverse geocoding failed: ${error.message}`);
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - Latitude of point 1
   * @param {number} lon1 - Longitude of point 1
   * @param {number} lat2 - Latitude of point 2
   * @param {number} lon2 - Longitude of point 2
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
      Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get nearby locations within a radius
   * @param {number} lat - Center latitude
   * @param {number} lng - Center longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {Object} GeoJSON query object for MongoDB
   */
  getNearbyQuery(lat, lng, radiusKm) {
    // Convert km to meters for MongoDB
    const radiusMeters = radiusKm * 1000;

    return {
      coordinates: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat] // Note: MongoDB uses [lng, lat]
          },
          $maxDistance: radiusMeters
        }
      }
    };
  }

  /**
   * Get bounding box for a location
   * @param {number} lat - Center latitude
   * @param {number} lng - Center longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {Object} Bounding box coordinates
   */
  getBoundingBox(lat, lng, radiusKm) {
    const latDelta = radiusKm / 111.32; // 1 degree lat ≈ 111.32 km
    const lngDelta = radiusKm / (111.32 * Math.cos(this.toRadians(lat)));

    return {
      minLat: lat - latDelta,
      maxLat: lat + latDelta,
      minLng: lng - lngDelta,
      maxLng: lng + lngDelta
    };
  }

  /**
   * Get city suggestions based on partial input
   * @param {string} query - Partial city name
   * @param {number} limit - Maximum number of suggestions
   * @returns {Promise<Array>} Array of city suggestions
   */
  async getCitySuggestions(query, limit = 10) {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const cacheKey = `city-suggest:${query.toLowerCase()}:${limit}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      // Using OpenStreetMap Nominatim for city suggestions
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          addressdetails: 1,
          limit,
          featuretype: 'city'
        },
        headers: {
          'User-Agent': 'MatrimonialApp/1.0'
        }
      });

      const suggestions = response.data.map(item => ({
        name: item.display_name,
        city: item.address?.city || item.address?.town || item.address?.village,
        state: item.address?.state,
        country: item.address?.country,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      })).filter(s => s.city);

      // Cache for 7 days
      await cacheService.set(cacheKey, suggestions, 7 * 24 * 60 * 60);

      return suggestions;
    } catch (error) {
      errorTrackingService.captureError(error, { query, context: 'city-suggestions' });
      return [];
    }
  }

  /**
   * Get popular cities for a country
   * @param {string} country - Country name or code
   * @returns {Promise<Array>} Array of popular cities
   */
  async getPopularCities(country = 'India') {
    try {
      const cacheKey = `popular-cities:${country.toLowerCase()}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      // Define popular cities for different countries
      const popularCitiesByCountry = {
        'india': [
          { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
          { name: 'Delhi', state: 'Delhi', lat: 28.7041, lng: 77.1025 },
          { name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
          { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
          { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
          { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
          { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
          { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
          { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
          { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 }
        ],
        'usa': [
          { name: 'New York', state: 'New York', lat: 40.7128, lng: -74.0060 },
          { name: 'Los Angeles', state: 'California', lat: 34.0522, lng: -118.2437 },
          { name: 'Chicago', state: 'Illinois', lat: 41.8781, lng: -87.6298 },
          { name: 'Houston', state: 'Texas', lat: 29.7604, lng: -95.3698 },
          { name: 'Phoenix', state: 'Arizona', lat: 33.4484, lng: -112.0740 }
        ],
        'uk': [
          { name: 'London', state: 'England', lat: 51.5074, lng: -0.1278 },
          { name: 'Manchester', state: 'England', lat: 53.4808, lng: -2.2426 },
          { name: 'Birmingham', state: 'England', lat: 52.4862, lng: -1.8904 },
          { name: 'Glasgow', state: 'Scotland', lat: 55.8642, lng: -4.2518 }
        ]
      };

      const cities = popularCitiesByCountry[country.toLowerCase()] || popularCitiesByCountry['india'];

      // Cache for 30 days
      await cacheService.set(cacheKey, cities, 30 * 24 * 60 * 60);

      return cities;
    } catch (error) {
      errorTrackingService.captureError(error, { country, context: 'popular-cities' });
      return [];
    }
  }

  /**
   * Validate coordinates
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {boolean}
   */
  isValidCoordinates(lat, lng) {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  /**
   * Convert location string to coordinates
   * @param {string} location - Location string (city, state, country)
   * @returns {Promise<{lat: number, lng: number}>}
   */
  async locationToCoordinates(location) {
    if (!location) return null;

    try {
      const result = await this.geocode(location);
      return { lat: result.lat, lng: result.lng };
    } catch (error) {
      errorTrackingService.captureError(error, { location, context: 'location-to-coordinates' });
      return null;
    }
  }

  /**
   * Get distance text (human readable)
   * @param {number} distanceKm - Distance in kilometers
   * @returns {string}
   */
  getDistanceText(distanceKm) {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} meters`;
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)} km`;
    } else {
      return `${Math.round(distanceKm)} km`;
    }
  }

  /**
   * Get profiles within radius (for use with MongoDB aggregation)
   * @param {number} lat - Center latitude
   * @param {number} lng - Center longitude
   * @param {number} radiusKm - Radius in kilometers
   * @param {Object} additionalFilters - Additional query filters
   * @returns {Array} MongoDB aggregation pipeline
   */
  getGeoNearPipeline(lat, lng, radiusKm, additionalFilters = {}) {
    const radiusMeters = radiusKm * 1000;

    const pipeline = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          distanceField: 'distance',
          maxDistance: radiusMeters,
          spherical: true,
          distanceMultiplier: 0.001 // Convert to kilometers
        }
      }
    ];

    // Add additional filters if provided
    if (Object.keys(additionalFilters).length > 0) {
      pipeline.push({ $match: additionalFilters });
    }

    return pipeline;
  }
}

// Singleton instance
const locationService = new LocationService();

module.exports = { locationService, LocationService };
