const Driver = require('../models/Driver');
const RideRequest = require('../models/RideRequest');

// Dev store
let mockDrivers = [];
let mockRides = [];

const initializeDevData = async () => {
  mockDrivers = await Driver.find({}).limit(10);
  if (mockDrivers.length === 0) {
    // Create sample drivers if none
    console.log('No drivers found - create manually');
  }
};

const getNearbyDrivers = (lat, lng, radius = 5) => {
  return Driver.find({
    'currentLat': { $gte: lat - radius/111, $lte: lat + radius/111 },
    'currentLng': { $gte: lng - radius/111, $lte: lng + radius/111 },
    isOnline: true,
  }).sort({ rating: -1 });
};

const createRideRequest = (rideData) => {
  const ride = new RideRequest(rideData);
  return ride.save();
};

const getRideRequests = (status) => RideRequest.find(status ? { status } : {});

const updateDriverLocation = (driverId, lat, lng) => {
  return Driver.findByIdAndUpdate(driverId, { currentLat: lat, currentLng: lng }, { new: true });
};

module.exports = {
  initializeDevData,
  getNearbyDrivers,
  createRideRequest,
  getRideRequests,
  updateDriverLocation,
};

