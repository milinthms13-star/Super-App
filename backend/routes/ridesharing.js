const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');
const { getNearbyDrivers, createRideRequest, getRideRequests, updateDriverLocation } = require('../utils/rideSharingStore');
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

module.exports = router;
