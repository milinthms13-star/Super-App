const OrderTracking = require('../models/FoodDeliveryOrderTracking');
const FoodDeliveryOrder = require('../models/FoodDeliveryOrder');
const FoodDeliveryRestaurant = require('../models/FoodDeliveryRestaurant');
const FoodDeliveryAddress = require('../models/FoodDeliveryAddress');

class OrderTrackingService {
  /**
   * Start tracking an order
   */
  static async startTracking(orderId, deliveryPersonId, deliveryPersonDetails) {
    try {
      // Fetch order and restaurant details
      const order = await FoodDeliveryOrder.findById(orderId).populate('restaurantId');
      if (!order) {
        throw new Error('Order not found');
      }

      // Fetch restaurant location
      const restaurant = await FoodDeliveryRestaurant.findById(order.restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // Check if tracking already exists
      let tracking = await OrderTracking.findOne({ orderId });
      if (tracking) {
        throw new Error('Tracking already started for this order');
      }

      // Create new tracking record
      tracking = new OrderTracking({
        orderId,
        userId: order.userId,
        restaurantId: order.restaurantId,
        deliveryPersonId,
        deliveryPersonName: deliveryPersonDetails.name,
        deliveryPersonPhone: deliveryPersonDetails.phone,
        deliveryPersonImage: deliveryPersonDetails.image,
        vehicleType: deliveryPersonDetails.vehicleType,
        vehicleNumber: deliveryPersonDetails.vehicleNumber,
        riderRating: deliveryPersonDetails.rating,

        // Restaurant location
        restaurantLocation: {
          latitude: restaurant.location.coordinates[1],
          longitude: restaurant.location.coordinates[0],
          address: restaurant.address,
        },

        // Delivery location
        deliveryLocation: {
          latitude: order.deliveryAddress.coordinates[1],
          longitude: order.deliveryAddress.coordinates[0],
          address: `${order.deliveryAddress.streetAddress}, ${order.deliveryAddress.city}`,
        },

        status: 'on_way',
        isTracking: true,
      });

      // Calculate initial ETA
      const distance = this._calculateDistance(
        restaurant.location.coordinates[1],
        restaurant.location.coordinates[0],
        order.deliveryAddress.coordinates[1],
        order.deliveryAddress.coordinates[0]
      );

      tracking.totalDistance = distance;
      tracking.distanceToDelivery = distance;

      // Save tracking
      await tracking.save();

      return tracking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update rider's current location
   */
  static async updateRiderLocation(trackingId, latitude, longitude, accuracy = null, speed = null) {
    try {
      const tracking = await OrderTracking.findById(trackingId);
      if (!tracking) {
        throw new Error('Tracking not found');
      }

      // Update location
      tracking.updateCurrentLocation(latitude, longitude, accuracy);

      // Calculate distance to delivery
      const distanceToDelivery = this._calculateDistance(
        latitude,
        longitude,
        tracking.deliveryLocation.latitude,
        tracking.deliveryLocation.longitude
      );

      tracking.distanceToDelivery = distanceToDelivery;

      // Calculate distance from restaurant
      const distanceFromRestaurant = this._calculateDistance(
        tracking.restaurantLocation.latitude,
        tracking.restaurantLocation.longitude,
        latitude,
        longitude
      );

      tracking.distanceFromRestaurant = distanceFromRestaurant;

      // Update status based on proximity
      if (distanceToDelivery < 0.5 && tracking.status !== 'arrived') {
        tracking.status = 'arrived';
        tracking.addNotification('arrived', 'Delivery person has arrived at your location');
      } else if (distanceToDelivery < 2 && tracking.status === 'on_way') {
        tracking.status = 'nearby';
        tracking.addNotification('arrival_soon', 'Delivery person is nearby');
      }

      // Recalculate ETA
      const averageSpeed = speed || 25; // default 25 km/h
      tracking.calculateETAtoDelivery(averageSpeed);

      await tracking.save();

      return tracking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current tracking status
   */
  static async getTrackingStatus(trackingId) {
    try {
      const tracking = await OrderTracking.findById(trackingId)
        .select('-locationHistory')
        .lean();

      if (!tracking) {
        throw new Error('Tracking not found');
      }

      return tracking.toSummary ? tracking.toSummary() : tracking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get tracking by order ID
   */
  static async getTrackingByOrderId(orderId) {
    try {
      const tracking = await OrderTracking.findOne({ orderId })
        .select('-locationHistory')
        .lean();

      if (!tracking) {
        throw new Error('Tracking not found for this order');
      }

      return tracking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all active trackings for a delivery person
   */
  static async getDeliveryPersonActiveTrackings(deliveryPersonId) {
    try {
      const trackings = await OrderTracking.find({
        deliveryPersonId,
        isTracking: true,
        status: { $ne: 'completed' },
      })
        .select('-locationHistory')
        .lean();

      return trackings;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all trackings for a customer
   */
  static async getCustomerTrackings(userId, limit = 10, skip = 0) {
    try {
      const trackings = await OrderTracking.find({ userId, isTracking: true })
        .populate('orderId', 'orderId status')
        .select('-locationHistory')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return trackings;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark delivery as picked up from restaurant
   */
  static async markPickedUp(trackingId) {
    try {
      const tracking = await OrderTracking.findById(trackingId);
      if (!tracking) {
        throw new Error('Tracking not found');
      }

      tracking.pickedUpAt = new Date();
      tracking.status = 'on_way';
      tracking.addNotification('location_update', 'Your order has been picked up from the restaurant');

      await tracking.save();

      return tracking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark delivery as completed
   */
  static async markDelivered(trackingId, notes = '') {
    try {
      const tracking = await OrderTracking.findById(trackingId);
      if (!tracking) {
        throw new Error('Tracking not found');
      }

      tracking.status = 'completed';
      tracking.actualDeliveryTime = new Date();
      tracking.deliveryNotes = notes;
      tracking.isTracking = false;

      // Calculate if delayed
      if (tracking.estimatedDeliveryTime && tracking.actualDeliveryTime > tracking.estimatedDeliveryTime) {
        const delayMinutes = Math.round(
          (tracking.actualDeliveryTime - tracking.estimatedDeliveryTime) / (1000 * 60)
        );
        tracking.delayReason = `Delivered ${delayMinutes} minutes late`;
      }

      tracking.addNotification('location_update', 'Your order has been delivered');

      await tracking.save();

      return tracking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle delivery failure
   */
  static async markDeliveryFailed(trackingId, reason) {
    try {
      const tracking = await OrderTracking.findById(trackingId);
      if (!tracking) {
        throw new Error('Tracking not found');
      }

      tracking.status = 'failed';
      tracking.isTracking = false;
      tracking.delayReason = reason;
      tracking.addNotification('location_update', `Delivery failed: ${reason}`);

      await tracking.save();

      return tracking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Report delivery issue
   */
  static async reportIssue(trackingId, issueType, description, severity = 'medium') {
    try {
      const tracking = await OrderTracking.findById(trackingId);
      if (!tracking) {
        throw new Error('Tracking not found');
      }

      tracking.reportIssue(issueType, description, severity);
      await tracking.save();

      return tracking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get route history
   */
  static async getRouteHistory(trackingId) {
    try {
      const tracking = await OrderTracking.findById(trackingId)
        .select('locationHistory')
        .lean();

      if (!tracking) {
        throw new Error('Tracking not found');
      }

      return tracking.locationHistory || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Start emergency call
   */
  static async startEmergencyCall(trackingId) {
    try {
      const tracking = await OrderTracking.findById(trackingId);
      if (!tracking) {
        throw new Error('Tracking not found');
      }

      tracking.startEmergencyCall();
      await tracking.save();

      return tracking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * End emergency call
   */
  static async endEmergencyCall(trackingId) {
    try {
      const tracking = await OrderTracking.findById(trackingId);
      if (!tracking) {
        throw new Error('Tracking not found');
      }

      tracking.endEmergencyCall();
      await tracking.save();

      return tracking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get nearby orders (within radius)
   */
  static async getNearbyOrders(latitude, longitude, radiusKm = 2) {
    try {
      // Using MongoDB geospatial query
      const trackings = await OrderTracking.find({
        isTracking: true,
        status: { $ne: 'completed' },
        'currentLocation.latitude': {
          $gte: latitude - radiusKm / 111,
          $lte: latitude + radiusKm / 111,
        },
        'currentLocation.longitude': {
          $gte: longitude - radiusKm / (111 * Math.cos((latitude * Math.PI) / 180)),
          $lte: longitude + radiusKm / (111 * Math.cos((latitude * Math.PI) / 180)),
        },
      })
        .select('-locationHistory')
        .lean();

      return trackings;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Stop tracking (order completed or cancelled)
   */
  static async stopTracking(trackingId) {
    try {
      const tracking = await OrderTracking.findById(trackingId);
      if (!tracking) {
        throw new Error('Tracking not found');
      }

      tracking.isTracking = false;
      await tracking.save();

      return tracking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calculate distance using Haversine formula
   */
  static _calculateDistance(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;

    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100; // Round to 2 decimals
  }

  /**
   * Get tracking analytics (for admin)
   */
  static async getTrackingAnalytics(restaurantId, dateRange = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      const analytics = await OrderTracking.aggregate([
        {
          $match: {
            restaurantId: mongoose.Types.ObjectId(restaurantId),
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgDistance: { $avg: '$totalDistance' },
            avgDeliveryTime: {
              $avg: {
                $divide: [
                  { $subtract: ['$actualDeliveryTime', '$pickedUpAt'] },
                  60000, // convert to minutes
                ],
              },
            },
          },
        },
      ]);

      return analytics;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = OrderTrackingService;
