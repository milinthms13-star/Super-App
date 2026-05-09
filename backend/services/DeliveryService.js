/**
 * DeliveryService.js
 * Handles live tracking, delivery slots, and same-day delivery
 */

const logger = require('../config/logger');

class DeliveryService {
  /**
   * Get live tracking information
   */
  static async getLiveTracking(orderId) {
    try {
      const Order = require('../models/Order');
      const Shipment = require('../models/Shipment');

      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const shipment = await Shipment.findOne({ orderId });
      if (!shipment) {
        throw new Error('Shipment not found');
      }

      return {
        orderId,
        status: shipment.status,
        currentLocation: shipment.currentLocation || null,
        driverLocation: shipment.driverLocation || null,
        eta: shipment.estimatedDeliveryDate,
        trackingNumber: shipment.trackingNumber,
        carrier: shipment.carrier,
        lastUpdate: shipment.lastUpdate,
        updates: shipment.trackingHistory || [],
      };
    } catch (error) {
      logger.error('Error getting live tracking:', error);
      throw error;
    }
  }

  /**
   * Update shipment location (from driver app/GPS)
   */
  static async updateShipmentLocation(shipmentId, latitude, longitude, status = null) {
    try {
      const Shipment = require('../models/Shipment');

      const shipment = await Shipment.findByIdAndUpdate(
        shipmentId,
        {
          $set: {
            driverLocation: {
              type: 'Point',
              coordinates: [longitude, latitude],
              updatedAt: new Date(),
            },
            lastUpdate: new Date(),
            status: status || shipment.status,
          },
          $push: {
            trackingHistory: {
              location: { latitude, longitude },
              status: status || 'in_transit',
              timestamp: new Date(),
              message: `Package at ${latitude}, ${longitude}`,
            },
          },
        },
        { new: true }
      );

      // Broadcast to WebSocket listeners
      const io = require('../config/websocket');
      io.to(`shipment:${shipmentId}`).emit('location_update', {
        shipmentId,
        latitude,
        longitude,
        timestamp: new Date(),
      });

      logger.info(`Shipment location updated: ${shipmentId}`);
      return shipment;
    } catch (error) {
      logger.error('Error updating shipment location:', error);
      throw error;
    }
  }

  /**
   * Calculate ETA based on current location and destination
   */
  static async calculateETA(shipmentId) {
    try {
      const Shipment = require('../models/Shipment');
      const shipment = await Shipment.findById(shipmentId);

      if (!shipment) {
        throw new Error('Shipment not found');
      }

      // Using mock distance calculation
      // In production, use Google Maps API or similar
      const distance = this._calculateDistance(
        shipment.currentLocation,
        shipment.deliveryAddress
      );

      // Assume average speed of 40 km/h in urban areas
      const avgSpeed = 40;
      const estimatedHours = distance / avgSpeed;

      const eta = new Date();
      eta.setHours(eta.getHours() + Math.ceil(estimatedHours));

      await Shipment.findByIdAndUpdate(shipmentId, {
        $set: { estimatedDeliveryDate: eta },
      });

      return {
        distance: Math.round(distance),
        estimatedHours: Math.ceil(estimatedHours),
        eta,
      };
    } catch (error) {
      logger.error('Error calculating ETA:', error);
      throw error;
    }
  }

  /**
   * Get available delivery slots for zipcode and date
   */
  static async getAvailableSlots(zipcode, date) {
    try {
      const slots = [
        {
          slotId: 'slot_8_10',
          timeStart: '08:00',
          timeEnd: '10:00',
          available: true,
          capacity: 50,
          booked: 25,
        },
        {
          slotId: 'slot_10_12',
          timeStart: '10:00',
          timeEnd: '12:00',
          available: true,
          capacity: 50,
          booked: 48,
        },
        {
          slotId: 'slot_12_14',
          timeStart: '12:00',
          timeEnd: '14:00',
          available: true,
          capacity: 50,
          booked: 50,
        },
        {
          slotId: 'slot_14_16',
          timeStart: '14:00',
          timeEnd: '16:00',
          available: false,
          capacity: 50,
          booked: 50,
        },
        {
          slotId: 'slot_16_18',
          timeStart: '16:00',
          timeEnd: '18:00',
          available: true,
          capacity: 50,
          booked: 30,
        },
        {
          slotId: 'slot_18_20',
          timeStart: '18:00',
          timeEnd: '20:00',
          available: true,
          capacity: 50,
          booked: 20,
        },
      ];

      // Filter available slots (booking < capacity)
      return slots.filter(slot => slot.booked < slot.capacity);
    } catch (error) {
      logger.error('Error getting available slots:', error);
      throw error;
    }
  }

  /**
   * Book delivery slot
   */
  static async bookDeliverySlot(orderId, slotId, date) {
    try {
      const Order = require('../models/Order');
      const DeliverySlot = require('../models/DeliverySlot');

      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Create delivery slot booking
      const slotBooking = new DeliverySlot({
        orderId,
        slotId,
        date: new Date(date),
        status: 'confirmed',
        createdAt: new Date(),
      });

      await slotBooking.save();

      // Update order with selected delivery slot
      await Order.findByIdAndUpdate(orderId, {
        $set: {
          deliverySlot: {
            slotId,
            date,
            confirmedAt: new Date(),
          },
        },
      });

      logger.info(`Delivery slot booked: ${orderId}`);
      return slotBooking;
    } catch (error) {
      logger.error('Error booking delivery slot:', error);
      throw error;
    }
  }

  /**
   * Check same-day delivery eligibility
   */
  static async checkSameDayDeliveryEligibility(zipcode, items) {
    try {
      const sameDayZones = process.env.SAME_DAY_ZIPCODES?.split(',') || [
        '110001',
        '110002',
        '400001',
        '560001',
      ];

      const isEligible = sameDayZones.includes(zipcode);

      if (!isEligible) {
        return {
          eligible: false,
          reason: 'Same-day delivery not available in this area',
        };
      }

      // Check if all items are in stock
      const Product = require('../models/Product');
      let allInStock = true;

      for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product || product.stock < item.quantity) {
          allInStock = false;
          break;
        }
      }

      if (!allInStock) {
        return {
          eligible: false,
          reason: 'Some items are out of stock',
        };
      }

      // Check cutoff time (typically 2 PM)
      const now = new Date();
      const cutoffHour = parseInt(process.env.SAME_DAY_CUTOFF_HOUR || 14);

      if (now.getHours() >= cutoffHour) {
        return {
          eligible: false,
          reason: `Order must be placed before ${cutoffHour}:00 for same-day delivery`,
        };
      }

      return {
        eligible: true,
        estimatedDelivery: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        charges: 99, // Fixed same-day delivery charge
      };
    } catch (error) {
      logger.error('Error checking same-day eligibility:', error);
      throw error;
    }
  }

  /**
   * Activate same-day delivery for order
   */
  static async activateSameDayDelivery(orderId, zipcode) {
    try {
      const Order = require('../models/Order');

      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const eligibility = await this.checkSameDayDeliveryEligibility(
        zipcode,
        order.items
      );

      if (!eligibility.eligible) {
        throw new Error(eligibility.reason);
      }

      // Add same-day delivery charge
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        {
          $set: {
            sameDayDelivery: true,
            sameDayDeliveryCharge: eligibility.charges,
            estimatedDeliveryDate: eligibility.estimatedDelivery,
          },
        },
        { new: true }
      );

      logger.info(`Same-day delivery activated for order: ${orderId}`);
      return updatedOrder;
    } catch (error) {
      logger.error('Error activating same-day delivery:', error);
      throw error;
    }
  }

  /**
   * Get delivery route optimization
   */
  static async optimizeDeliveryRoute(shipmentIds) {
    try {
      // Mock implementation - in production use Google Maps API
      // This would optimize the route for multiple deliveries
      const Shipment = require('../models/Shipment');

      const shipments = await Shipment.find({ _id: { $in: shipmentIds } });

      // Simple distance-based sorting (mock)
      const optimizedRoute = shipments.sort(
        (a, b) =>
          this._calculateDistance(a.pickupAddress, a.deliveryAddress) -
          this._calculateDistance(b.pickupAddress, b.deliveryAddress)
      );

      return optimizedRoute.map((s, idx) => ({
        shipmentId: s._id,
        sequence: idx + 1,
        estimatedDistance: this._calculateDistance(
          s.pickupAddress,
          s.deliveryAddress
        ),
      }));
    } catch (error) {
      logger.error('Error optimizing delivery route:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two points (mock)
   */
  static _calculateDistance(point1, point2) {
    // Haversine formula for calculating distance between two GPS coordinates
    // This is a simplified mock implementation
    if (!point1 || !point2) return 0;

    const R = 6371; // Earth radius in km
    const dLat = (point2.latitude - point1.latitude) * (Math.PI / 180);
    const dLon = (point2.longitude - point1.longitude) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.latitude * (Math.PI / 180)) *
        Math.cos(point2.latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get delivery partner availability
   */
  static async getDeliveryPartnerAvailability(zipcode) {
    try {
      const partners = [
        {
          partnerId: 'dp_001',
          name: 'Delhivery',
          rating: 4.5,
          deliveries: 1200,
          avgDeliveryTime: '2-3 days',
          available: true,
        },
        {
          partnerId: 'dp_002',
          name: 'Fedex',
          rating: 4.7,
          deliveries: 950,
          avgDeliveryTime: '1-2 days',
          available: true,
        },
        {
          partnerId: 'dp_003',
          name: 'Blue Dart',
          rating: 4.3,
          deliveries: 2100,
          avgDeliveryTime: '2-3 days',
          available: true,
        },
      ];

      return partners;
    } catch (error) {
      logger.error('Error getting delivery partners:', error);
      throw error;
    }
  }
}

module.exports = DeliveryService;
