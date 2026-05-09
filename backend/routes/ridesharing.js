const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');
const {
  getNearbyDrivers,
  createRideRequest,
  getRideRequests,
  updateDriverLocation,
  assignDriverToRide,
  completeRide,
} = require('../utils/rideSharingStore');
const RideRequest = require('../models/RideRequest');


const rateLimiter = createModerateRateLimiter();

// POST /api/ridesharing/request
router.post('/request', authenticate, rateLimiter, async (req, res) => {
  try {
    const rideData = {
      ...req.body,
      customerId: req.user.id,
    };
    const ride = await createRideRequest(rideData);
    res.status(201).json({ success: true, data: ride });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/ridesharing/drivers/nearby
router.get('/drivers/nearby', authenticate, async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    const drivers = await getNearbyDrivers(Number(lat), Number(lng), Number(radius));
    res.json({ success: true, data: drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/ridesharing/requests
router.get('/requests', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await getRideRequests(status);
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/ridesharing/driver/location
router.put('/driver/location', authenticate, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    // Assume req.user.driverId or logic
    const driverId = req.user.driverId || req.user.id; // Adjust
    const driver = await updateDriverLocation(driverId, lat, lng);
    res.json({ success: true, data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ridesharing/rides (frontend contract)
router.post('/rides', authenticate, rateLimiter, async (req, res) => {
  try {
    const rideData = {
      ...req.body,
      customerId: req.user.id,
      // backend model expects vehicleType
      vehicleType: req.body.rideType || req.body.vehicleType || req.body.vehicle_type || req.body.rideTypeId,
      estimatedFare: Number(req.body.estimatedFare || req.body.fare || 0) || 0,
      pickup: req.body.pickup,
      destination: req.body.dropoff || req.body.destination,
    };

    if (!rideData.pickup?.address) {
      return res.status(400).json({ success: false, message: 'pickup.address is required' });
    }
    if (!rideData.destination?.address) {
      return res.status(400).json({ success: false, message: 'dropoff.address is required' });
    }

    const ride = await createRideRequest(rideData);
    res.status(201).json({ success: true, data: ride });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/ridesharing/rides/:rideId/accept (frontend contract)
router.post('/rides/:rideId/accept', authenticate, async (req, res) => {
  try {
    const { rideId } = req.params;
    const driverId = req.user.driverId || req.user.id;

    const ride = await assignDriverToRide(rideId, driverId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    res.json({ success: true, data: ride });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/ridesharing/location (frontend contract)
router.post('/location', authenticate, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const driverId = req.user.driverId || req.user.id;
    const driver = await updateDriverLocation(driverId, lat, lng);
    res.json({ success: true, data: driver });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/ridesharing/my-rides (frontend contract)
router.get('/my-rides', authenticate, async (req, res) => {
  try {
    // Minimal implementation: return rides where user is the customer or assigned driver.
    const userId = req.user.id;
    const rides = await RideRequest.find({ $or: [{ customerId: userId }, { driverId: userId }] })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: rides });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ridesharing/rides/:rideId/complete (frontend contract)
router.post('/rides/:rideId/complete', authenticate, async (req, res) => {
  try {
    const { rideId } = req.params;
    const ride = await completeRide(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }
    res.json({ success: true, data: ride });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;

