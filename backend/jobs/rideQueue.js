const Queue = require('bull');
const Redis = require('ioredis');
const logger = require('../utils/logger');
const Driver = require('../models/Driver');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const rideQueue = new Queue('ridesharing', redisUrl, {
  defaultJobOptions: { removeOnComplete: 100, removeOnFail: 50 },
});

rideQueue.process('match-driver', async (job) => {
  const { rideId, pickupLat, pickupLng, radiusKm = 5 } = job.data;

  logger.info(`Matching driver for ride ${rideId}`, { pickupLat, pickupLng, radiusKm });

  // Find nearby drivers
  const nearbyDrivers = await Driver.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [pickupLng, pickupLat] },
        distanceField: "distanceKm",
        maxDistance: radiusKm * 1000,
        spherical: true,
      }
    },
    { $match: { isOnline: true, status: "available" } },
    { $sort: { rating: -1, distanceKm: 1 } },
    { $limit: 3 }
  ]);

  if (nearbyDrivers.length === 0) {
    return { status: "no-drivers", assignedDriverId: null };
  }

  const assignedDriver = nearbyDrivers[0];
  logger.info(`Assigned driver ${assignedDriver.name} for ride ${rideId}`);

  // Update driver status & emit WebSocket
  await Driver.findByIdAndUpdate(assignedDriver._id, {
    status: "assigned",
    currentRideId: rideId
  });

  const io = require('../config/websocket').io;
  io.to(rideId).emit('ride:driver-assigned', {
    driverId: assignedDriver._id,
    driverName: assignedDriver.name,
    etaMinutes: Math.round(assignedDriver.distanceKm * 2.5), // ~2.5 min/km
  });

  return { 
    status: "driver-assigned", 
    assignedDriverId: assignedDriver._id,
    etaMinutes: Math.round(assignedDriver.distanceKm * 2.5),
    driversContacted: nearbyDrivers.length
  };
});

rideQueue.process('update-location', async (job) => {
  const { driverId, lat, lng } = job.data;
  
  await Driver.findByIdAndUpdate(driverId, {
    currentLat: lat,
    currentLng: lng,
    lastLocationUpdate: new Date()
  });

  logger.info(`Driver ${driverId} location updated: ${lat},${lng}`);
  return { success: true };
});

module.exports = rideQueue;

