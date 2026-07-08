const express = require('express');
const router = express.Router();
const MatrimonialProfile = require('../models/MatrimonialProfile');
const { locationService } = require('../services/locationService');
const { cacheService } = require('../services/cacheService');
const { errorTrackingService } = require('../services/errorTrackingService');
const auth = require('../middleware/auth');

// Search profiles by location with radius
router.get('/search/nearby', auth, async (req, res) => {
  try {
    const {
      lat,
      lng,
      radius = 50, // Default 50 km
      page = 1,
      limit = 20,
      minAge,
      maxAge,
      gender,
      religion,
      education,
      maritalStatus,
      sortBy = 'distance' // distance, age, lastActive
    } = req.query;

    // Validate coordinates
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    if (!locationService.isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    if (radiusKm <= 0 || radiusKm > 500) {
      return res.status(400).json({ error: 'Radius must be between 1 and 500 km' });
    }

    // Build cache key
    const cacheKey = `nearby:${latitude}:${longitude}:${radiusKm}:${page}:${limit}:${minAge}:${maxAge}:${gender}:${religion}:${education}:${maritalStatus}:${sortBy}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json(cached);

    // Build additional filters
    const filters = { profileStatus: 'approved' };
    if (minAge) filters.age = { ...filters.age, $gte: parseInt(minAge) };
    if (maxAge) filters.age = { ...filters.age, $lte: parseInt(maxAge) };
    if (gender) filters.gender = gender;
    if (religion) filters.religion = religion;
    if (education) filters.education = new RegExp(education, 'i');
    if (maritalStatus) filters.maritalStatus = maritalStatus;

    // Exclude current user's profile
    filters.userId = { $ne: req.user.id };

    // Get geospatial pipeline
    const pipeline = locationService.getGeoNearPipeline(latitude, longitude, radiusKm, filters);

    // Add sorting
    if (sortBy === 'age') {
      pipeline.push({ $sort: { age: 1 } });
    } else if (sortBy === 'lastActive') {
      pipeline.push({ $sort: { lastActive: -1 } });
    }
    // Default is distance (already sorted by $geoNear)

    // Add pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    // Execute aggregation
    const profiles = await MatrimonialProfile.aggregate(pipeline);

    // Get total count for pagination
    const countPipeline = locationService.getGeoNearPipeline(latitude, longitude, radiusKm, filters);
    countPipeline.push({ $count: 'total' });
    const countResult = await MatrimonialProfile.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    const result = {
      profiles: profiles.map(profile => ({
        ...profile,
        distanceText: locationService.getDistanceText(profile.distance)
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      center: { lat: latitude, lng: longitude },
      radius: radiusKm
    };

    // Cache for 5 minutes
    await cacheService.set(cacheKey, result, 300);

    res.json(result);
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'nearby-search' });
    res.status(500).json({ error: 'Failed to search nearby profiles' });
  }
});

// Search by city/location name
router.get('/search/by-location', auth, async (req, res) => {
  try {
    const {
      location,
      radius = 50,
      page = 1,
      limit = 20,
      ...filters
    } = req.query;

    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    // Geocode the location
    const coordinates = await locationService.geocode(location);

    if (!coordinates) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Use the nearby search with geocoded coordinates
    req.query.lat = coordinates.lat;
    req.query.lng = coordinates.lng;
    req.query.radius = radius;
    req.query.page = page;
    req.query.limit = limit;

    // Forward to nearby search
    return router.handle(
      Object.assign(req, {
        url: '/search/nearby',
        query: { ...req.query, ...filters }
      }),
      res
    );
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, location: req.query.location, context: 'location-search' });
    res.status(500).json({ error: 'Failed to search by location' });
  }
});

// Get city suggestions for autocomplete
router.get('/cities/suggestions', auth, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestions = await locationService.getCitySuggestions(q, parseInt(limit));

    res.json({ suggestions });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, query: req.query.q, context: 'city-suggestions' });
    res.status(500).json({ error: 'Failed to get city suggestions' });
  }
});

// Get popular cities
router.get('/cities/popular', auth, async (req, res) => {
  try {
    const { country = 'India' } = req.query;

    const cities = await locationService.getPopularCities(country);

    res.json({ cities });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'popular-cities' });
    res.status(500).json({ error: 'Failed to get popular cities' });
  }
});

// Geocode an address
router.post('/geocode', auth, async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const result = await locationService.geocode(address);

    res.json(result);
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, address: req.body.address, context: 'geocode' });
    res.status(500).json({ error: 'Failed to geocode address' });
  }
});

// Reverse geocode coordinates to address
router.post('/reverse-geocode', auth, async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (!locationService.isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const address = await locationService.reverseGeocode(latitude, longitude);

    res.json({ address });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'reverse-geocode' });
    res.status(500).json({ error: 'Failed to reverse geocode coordinates' });
  }
});

// Calculate distance between two profiles
router.get('/distance/:profileId1/:profileId2', auth, async (req, res) => {
  try {
    const { profileId1, profileId2 } = req.params;

    const [profile1, profile2] = await Promise.all([
      MatrimonialProfile.findById(profileId1).select('coordinates'),
      MatrimonialProfile.findById(profileId2).select('coordinates')
    ]);

    if (!profile1 || !profile2) {
      return res.status(404).json({ error: 'One or both profiles not found' });
    }

    if (!profile1.coordinates || !profile2.coordinates) {
      return res.status(400).json({ error: 'One or both profiles do not have coordinates' });
    }

    const [lng1, lat1] = profile1.coordinates.coordinates;
    const [lng2, lat2] = profile2.coordinates.coordinates;

    const distanceKm = locationService.calculateDistance(lat1, lng1, lat2, lng2);

    res.json({
      distanceKm,
      distanceText: locationService.getDistanceText(distanceKm)
    });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'calculate-distance' });
    res.status(500).json({ error: 'Failed to calculate distance' });
  }
});

// Update profile coordinates
router.patch('/update-coordinates', auth, async (req, res) => {
  try {
    const { lat, lng, location } = req.body;

    let latitude, longitude;

    if (lat && lng) {
      // Use provided coordinates
      latitude = parseFloat(lat);
      longitude = parseFloat(lng);

      if (!locationService.isValidCoordinates(latitude, longitude)) {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }
    } else if (location) {
      // Geocode location string
      const coords = await locationService.geocode(location);
      latitude = coords.lat;
      longitude = coords.lng;
    } else {
      return res.status(400).json({ error: 'Either coordinates or location is required' });
    }

    // Update profile
    const profile = await MatrimonialProfile.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          'coordinates.type': 'Point',
          'coordinates.coordinates': [longitude, latitude] // MongoDB uses [lng, lat]
        }
      },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Clear profile cache
    await cacheService.delete(`profile:${profile._id}`);

    res.json({
      success: true,
      coordinates: {
        lat: latitude,
        lng: longitude
      }
    });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'update-coordinates' });
    res.status(500).json({ error: 'Failed to update coordinates' });
  }
});

// Get location statistics
router.get('/stats/by-location', auth, async (req, res) => {
  try {
    const cacheKey = 'location-stats';
    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json(cached);

    // Get profile count by city
    const cityStats = await MatrimonialProfile.aggregate([
      { $match: { profileStatus: 'approved' } },
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 }
    ]);

    // Get profile count by state (extract from location)
    const stateStats = await MatrimonialProfile.aggregate([
      { $match: { profileStatus: 'approved', location: { $exists: true } } },
      {
        $project: {
          state: {
            $arrayElemAt: [
              { $split: ['$location', ','] },
              -2
            ]
          }
        }
      },
      {
        $group: {
          _id: { $trim: { input: '$state' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 30 }
    ]);

    const stats = {
      topCities: cityStats.map(s => ({ city: s._id, count: s.count })),
      topStates: stateStats.map(s => ({ state: s._id, count: s.count }))
    };

    // Cache for 1 hour
    await cacheService.set(cacheKey, stats, 3600);

    res.json(stats);
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'location-stats' });
    res.status(500).json({ error: 'Failed to get location statistics' });
  }
});

// Get profiles in a bounding box (for map view)
router.get('/search/in-bounds', auth, async (req, res) => {
  try {
    const { minLat, maxLat, minLng, maxLng, limit = 100 } = req.query;

    if (!minLat || !maxLat || !minLng || !maxLng) {
      return res.status(400).json({ error: 'Bounding box coordinates are required' });
    }

    const profiles = await MatrimonialProfile.find({
      profileStatus: 'approved',
      userId: { $ne: req.user.id },
      'coordinates.coordinates.1': { $gte: parseFloat(minLat), $lte: parseFloat(maxLat) },
      'coordinates.coordinates.0': { $gte: parseFloat(minLng), $lte: parseFloat(maxLng) }
    })
      .select('name age gender location coordinates photoUrl profession')
      .limit(parseInt(limit));

    res.json({ profiles, count: profiles.length });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'bounds-search' });
    res.status(500).json({ error: 'Failed to search profiles in bounds' });
  }
});

module.exports = router;
