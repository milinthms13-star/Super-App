const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');
const multer = require('multer');
const path = require('path');

// Models
const Ride = require('../models/RideRequest');
const Driver = require('../models/Driver');
const RiderProfile = require('../models/RiderProfile');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');

// Utils
const { calculateDistance, calculateFare, getNearbyDrivers } = require('../utils/rideSharingStore');

const rateLimiter = createModerateRateLimiter();

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/ridesharing/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// ============================================================================
// RIDER ROUTES
// ============================================================================

// POST /api/ridesharing/rides/book - Book a new ride
router.post('/rides/book', authenticate, rateLimiter, async (req, res) => {
  try {
    const {
      pickup,
      destination,
      vehicleType,
      serviceType = 'regular',
      scheduledTime,
      specialRequests = [],
      paymentMethod = 'cash'
    } = req.body;

    // Calculate distance and duration (mock for now)
    const distance = calculateDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);
    const duration = Math.round(distance * 2); // Rough estimate: 2 min per km

    // Calculate fare
    const pricing = calculateFare(vehicleType, distance, duration);

    // Create ride
    const ride = new Ride({
      customerId: req.user.id,
      customerDetails: {
        name: req.user.name,
        phone: req.user.phone,
        email: req.user.email,
      },
      pickup,
      destination,
      vehicleType,
      serviceType,
      paymentMethod,
      pricing,
      distance: {
        value: distance * 1000, // meters
        text: `${distance.toFixed(1)} km`
      },
      duration: {
        value: duration * 60, // seconds
        text: `${duration} mins`
      },
      specialRequests,
      isScheduled: !!scheduledTime,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
      status: scheduledTime ? 'scheduled' : 'requested'
    });

    await ride.save();

    // Start driver search for instant rides
    if (!scheduledTime) {
      // Find nearby drivers
      const nearbyDrivers = await getNearbyDrivers(pickup.lat, pickup.lng, 5); // 5km radius

      if (nearbyDrivers.length > 0) {
        // Assign the best driver (highest rating, closest)
        const bestDriver = nearbyDrivers[0];
        ride.driverId = bestDriver._id;
        ride.driverDetails = {
          name: bestDriver.fullName,
          phone: bestDriver.phone,
          vehicleNumber: bestDriver.vehicleNumber,
          vehicleType: bestDriver.vehicleType,
          vehicleColor: bestDriver.vehicleColor,
          rating: bestDriver.rating,
          profilePhoto: bestDriver.profilePhoto,
        };
        ride.status = 'driver_assigned';
        ride.assignedAt = new Date();

        await ride.save();

        // Update driver status
        await Driver.findByIdAndUpdate(bestDriver._id, {
          availabilityStatus: 'busy',
          currentLat: pickup.lat,
          currentLng: pickup.lng
        });
      }
    }

    res.status(201).json({
      success: true,
      data: ride,
      message: scheduledTime ? 'Ride scheduled successfully' : 'Ride booked successfully'
    });

  } catch (error) {
    console.error('Book ride error:', error);
    res.status(500).json({ success: false, message: 'Failed to book ride' });
  }
});

// GET /api/ridesharing/rides/active - Get active ride for user
router.get('/rides/active', authenticate, async (req, res) => {
  try {
    const activeRide = await Ride.findOne({
      customerId: req.user.id,
      status: { $in: ['requested', 'driver_assigned', 'driver_arriving', 'driver_arrived', 'ride_started'] }
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: activeRide });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch active ride' });
  }
});

// GET /api/ridesharing/rides/history - Get ride history
router.get('/rides/history', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const rides = await Ride.find({ customerId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-otp -emergencyContacts');

    const total = await Ride.countDocuments({ customerId: req.user.id });

    res.json({
      success: true,
      data: rides,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch ride history' });
  }
});

// POST /api/ridesharing/rides/:rideId/cancel - Cancel ride
router.post('/rides/:rideId/cancel', authenticate, async (req, res) => {
  try {
    const { reason, notes } = req.body;
    const ride = await Ride.findOne({
      _id: req.params.rideId,
      customerId: req.user.id
    });

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    if (!ride.canCancel()) {
      return res.status(400).json({ success: false, message: 'Ride cannot be cancelled at this stage' });
    }

    // Calculate cancellation charges
    const cancellationCharges = ride.getCancellationCharges();

    ride.status = 'cancelled';
    ride.cancelledBy = 'customer';
    ride.cancellationReason = reason;
    ride.cancellationNotes = notes;
    ride.cancellationCharges = cancellationCharges;
    ride.cancelledAt = new Date();

    await ride.save();

    // Update driver status if assigned
    if (ride.driverId) {
      await Driver.findByIdAndUpdate(ride.driverId, {
        availabilityStatus: 'available'
      });
    }

    res.json({
      success: true,
      data: ride,
      message: 'Ride cancelled successfully'
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel ride' });
  }
});

// POST /api/ridesharing/rides/:rideId/rate - Rate and review ride
router.post('/rides/:rideId/rate', authenticate, async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    const ride = await Ride.findOne({
      _id: req.params.rideId,
      customerId: req.user.id,
      status: 'ride_completed'
    });

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found or not completed' });
    }

    ride.customerRating = {
      rating: parseInt(rating),
      feedback,
      ratedAt: new Date()
    };

    await ride.save();

    // Update driver rating
    if (ride.driverId) {
      const driverRides = await Ride.find({
        driverId: ride.driverId,
        'customerRating.rating': { $exists: true }
      });

      const avgRating = driverRides.reduce((sum, r) => sum + r.customerRating.rating, 0) / driverRides.length;

      await Driver.findByIdAndUpdate(ride.driverId, {
        rating: Math.round(avgRating * 10) / 10
      });
    }

    res.json({
      success: true,
      message: 'Rating submitted successfully'
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit rating' });
  }
});

// POST /api/ridesharing/rides/:rideId/sos - Activate SOS
router.post('/rides/:rideId/sos', authenticate, async (req, res) => {
  try {
    const ride = await Ride.findOne({
      _id: req.params.rideId,
      customerId: req.user.id,
      status: { $in: ['driver_assigned', 'driver_arriving', 'driver_arrived', 'ride_started'] }
    });

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Active ride not found' });
    }

    ride.sosActivated = true;
    ride.sosTimestamp = new Date();

    // Get rider profile for emergency contacts
    const riderProfile = await RiderProfile.findOne({ userId: req.user.id });

    if (riderProfile && riderProfile.emergencyContacts.length > 0) {
      ride.emergencyContacts = riderProfile.emergencyContacts.map(contact => ({
        name: contact.name,
        phone: contact.phone,
        notified: false
      }));
    }

    await ride.save();

    // TODO: Send SOS notifications to emergency contacts and authorities

    res.json({
      success: true,
      message: 'SOS activated. Help is on the way.',
      data: {
        sosTimestamp: ride.sosTimestamp,
        emergencyContacts: ride.emergencyContacts
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to activate SOS' });
  }
});

// ============================================================================
// DRIVER ROUTES
// ============================================================================

// POST /api/ridesharing/driver/register - Register as driver
router.post('/driver/register', authenticate, upload.fields([
  { name: 'licensePhoto', maxCount: 1 },
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'vehicleRC', maxCount: 1 },
  { name: 'vehicleInsurance', maxCount: 1 }
]), async (req, res) => {
  try {
    const driverData = {
      userId: req.user.id,
      ...req.body,
      licensePhoto: req.files.licensePhoto ? req.files.licensePhoto[0].path : null,
      profilePhoto: req.files.profilePhoto ? req.files.profilePhoto[0].path : null,
    };

    // Check if driver already exists
    const existingDriver = await Driver.findOne({ userId: req.user.id });
    if (existingDriver) {
      return res.status(400).json({ success: false, message: 'Driver profile already exists' });
    }

    const driver = new Driver(driverData);
    await driver.save();

    res.status(201).json({
      success: true,
      data: driver,
      message: 'Driver registration submitted successfully'
    });

  } catch (error) {
    console.error('Driver registration error:', error);
    res.status(500).json({ success: false, message: 'Failed to register driver' });
  }
});

// GET /api/ridesharing/driver/profile - Get driver profile
router.get('/driver/profile', authenticate, async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.user.id });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    res.json({ success: true, data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch driver profile' });
  }
});

// PUT /api/ridesharing/driver/location - Update driver location
router.put('/driver/location', authenticate, async (req, res) => {
  try {
    const { lat, lng } = req.body;

    await Driver.findOneAndUpdate(
      { userId: req.user.id },
      {
        currentLat: lat,
        currentLng: lng,
        lastLocationUpdate: new Date()
      }
    );

    res.json({ success: true, message: 'Location updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update location' });
  }
});

// PUT /api/ridesharing/driver/status - Update driver status
router.put('/driver/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    const driver = await Driver.findOneAndUpdate(
      { userId: req.user.id },
      {
        availabilityStatus: status,
        isOnline: status === 'available',
        lastActiveAt: new Date()
      },
      { new: true }
    );

    res.json({ success: true, data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// GET /api/ridesharing/driver/rides/active - Get active ride for driver
router.get('/driver/rides/active', authenticate, async (req, res) => {
  try {
    const activeRide = await Ride.findOne({
      driverId: req.user.id,
      status: { $in: ['driver_assigned', 'driver_arriving', 'driver_arrived', 'ride_started'] }
    });

    res.json({ success: true, data: activeRide });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch active ride' });
  }
});

// POST /api/ridesharing/driver/rides/:rideId/accept - Accept ride request
router.post('/driver/rides/:rideId/accept', authenticate, async (req, res) => {
  try {
    const ride = await Ride.findOne({
      _id: req.params.rideId,
      status: 'driver_assigned',
      driverId: req.user.id
    });

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found or not assigned to you' });
    }

    ride.status = 'driver_arriving';
    ride.statusHistory.push({
      status: 'driver_arriving',
      timestamp: new Date(),
      notes: 'Driver accepted the ride'
    });

    await ride.save();

    res.json({ success: true, data: ride });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to accept ride' });
  }
});

// POST /api/ridesharing/driver/rides/:rideId/arrived - Mark as arrived at pickup
router.post('/driver/rides/:rideId/arrived', authenticate, async (req, res) => {
  try {
    const ride = await Ride.findOne({
      _id: req.params.rideId,
      driverId: req.user.id
    });

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    ride.status = 'driver_arrived';
    ride.arrivedAt = new Date();
    ride.statusHistory.push({
      status: 'driver_arrived',
      timestamp: new Date(),
      notes: 'Driver arrived at pickup location'
    });

    await ride.save();

    res.json({ success: true, data: ride });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update ride status' });
  }
});

// POST /api/ridesharing/driver/rides/:rideId/start - Start the ride
router.post('/driver/rides/:rideId/start', authenticate, async (req, res) => {
  try {
    const { otp } = req.body;
    const ride = await Ride.findOne({
      _id: req.params.rideId,
      driverId: req.user.id
    });

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    if (ride.otp.rideStart !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    ride.status = 'ride_started';
    ride.startedAt = new Date();
    ride.otpVerified.rideStart = true;
    ride.statusHistory.push({
      status: 'ride_started',
      timestamp: new Date(),
      notes: 'Ride started with OTP verification'
    });

    await ride.save();

    res.json({ success: true, data: ride });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to start ride' });
  }
});

// POST /api/ridesharing/driver/rides/:rideId/complete - Complete the ride
router.post('/driver/rides/:rideId/complete', authenticate, async (req, res) => {
  try {
    const { distance, duration } = req.body;
    const ride = await Ride.findOne({
      _id: req.params.rideId,
      driverId: req.user.id,
      status: 'ride_started'
    });

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found or not started' });
    }

    // Calculate final fare based on actual distance/duration
    const actualPricing = calculateFare(ride.vehicleType, distance, duration);

    ride.status = 'ride_completed';
    ride.completedAt = new Date();
    ride.actualDistance = distance;
    ride.actualDuration = duration;
    ride.pricing = { ...ride.pricing, ...actualPricing };
    ride.statusHistory.push({
      status: 'ride_completed',
      timestamp: new Date(),
      notes: `Ride completed. Distance: ${distance}km, Duration: ${duration}min`
    });

    // Calculate driver earnings
    const platformFee = ride.pricing.totalFare * 0.20; // 20% commission
    ride.commission = {
      platformFee,
      driverEarnings: ride.pricing.totalFare - platformFee,
      taxDeducted: 0
    };

    await ride.save();

    // Update driver stats
    const driver = await Driver.findOne({ userId: req.user.id });
    if (driver) {
      driver.totalRides += 1;
      driver.completedRides += 1;
      driver.totalEarnings += ride.commission.driverEarnings;
      driver.todayEarnings += ride.commission.driverEarnings;
      driver.availabilityStatus = 'available';
      await driver.save();
    }

    res.json({ success: true, data: ride });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to complete ride' });
  }
});

// ============================================================================
// COMMON ROUTES
// ============================================================================

// GET /api/ridesharing/fare/estimate - Get fare estimate
router.get('/fare/estimate', async (req, res) => {
  try {
    const { pickupLat, pickupLng, dropLat, dropLng, vehicleType } = req.query;

    const distance = calculateDistance(
      parseFloat(pickupLat),
      parseFloat(pickupLng),
      parseFloat(dropLat),
      parseFloat(dropLng)
    );

    const duration = Math.round(distance * 2); // Rough estimate
    const pricing = calculateFare(vehicleType, distance, duration);

    res.json({
      success: true,
      data: {
        distance: `${distance.toFixed(1)} km`,
        duration: `${duration} mins`,
        pricing
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to calculate fare' });
  }
});

// GET /api/ridesharing/drivers/nearby - Get nearby drivers
router.get('/drivers/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5, vehicleType } = req.query;

    const drivers = await getNearbyDrivers(
      parseFloat(lat),
      parseFloat(lng),
      parseInt(radius),
      vehicleType
    );

    res.json({ success: true, data: drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to find nearby drivers' });
  }
});

// GET /api/ridesharing/vehicle/types - Get available vehicle types
router.get('/vehicle/types', async (req, res) => {
  try {
    const vehicleTypes = [
      {
        id: 'bike',
        name: 'Bike Taxi',
        icon: '🏍️',
        capacity: 1,
        baseFare: 28,
        perKm: 6,
        description: 'Quick rides for solo travelers'
      },
      {
        id: 'auto',
        name: 'Auto Rickshaw',
        icon: '🚗',
        capacity: 3,
        baseFare: 35,
        perKm: 12,
        description: 'Affordable rides for small groups'
      },
      {
        id: 'mini_car',
        name: 'Mini Car',
        icon: '🚙',
        capacity: 4,
        baseFare: 50,
        perKm: 15,
        description: 'Comfortable rides for families'
      },
      {
        id: 'sedan',
        name: 'Sedan',
        icon: '🚕',
        capacity: 4,
        baseFare: 80,
        perKm: 20,
        description: 'Premium rides with extra comfort'
      },
      {
        id: 'suv',
        name: 'SUV',
        icon: '🚐',
        capacity: 6,
        baseFare: 120,
        perKm: 25,
        description: 'Spacious rides for larger groups'
      }
    ];

    res.json({ success: true, data: vehicleTypes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch vehicle types' });
  }
});

// ============================================================================
// ADMIN ROUTES (Protected)
// ============================================================================

// GET /api/ridesharing/admin/rides - Get all rides (admin)
router.get('/admin/rides', authenticate, async (req, res) => {
  try {
    // TODO: Add admin role check
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const query = status ? { status } : {};
    const rides = await Ride.find(query)
      .populate('customerId', 'name phone email')
      .populate('driverId', 'fullName phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Ride.countDocuments(query);

    res.json({
      success: true,
      data: rides,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch rides' });
  }
});

// PUT /api/ridesharing/admin/drivers/:driverId/verify - Verify driver (admin)
router.put('/admin/drivers/:driverId/verify', authenticate, async (req, res) => {
  try {
    // TODO: Add admin role check
    const { status, notes } = req.body;

    const driver = await Driver.findByIdAndUpdate(
      req.params.driverId,
      {
        kycStatus: status,
        kycApprovedAt: status === 'approved' ? new Date() : null,
        adminNotes: notes
      },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    res.json({ success: true, data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update driver verification' });
  }
});

module.exports = router;
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

