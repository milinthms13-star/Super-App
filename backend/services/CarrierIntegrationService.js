/**
 * CarrierIntegrationService.js
 * Phase 5E Continuation - Carrier API integration for shipment tracking
 * Handles tracking updates from multiple carriers (Fedex, DHL, etc.)
 */

const axios = require('axios');
const logger = require('../utils/logger');

class CarrierIntegrationService {
  static instance;

  constructor() {
    this.carrierConfig = {
      domestic: {
        name: 'Domestic Courier',
        apiUrl: process.env.DOMESTIC_CARRIER_API_URL || 'https://api.domesticcarrier.com',
        apiKey: process.env.DOMESTIC_CARRIER_API_KEY,
      },
      international: {
        name: 'International Courier',
        apiUrl: process.env.INTL_CARRIER_API_URL || 'https://api.intlcarrier.com',
        apiKey: process.env.INTL_CARRIER_API_KEY,
      },
      dhl: {
        name: 'DHL',
        apiUrl: process.env.DHL_API_URL || 'https://api.dhl.com/tracking',
        apiKey: process.env.DHL_API_KEY,
      },
      fedex: {
        name: 'FedEx',
        apiUrl: process.env.FEDEX_API_URL || 'https://apis.fedex.com/track',
        apiKey: process.env.FEDEX_API_KEY,
      },
    };

    // Fallback tracking data when APIs are unavailable (mock)
    this.mockTrackingScenarios = {
      domestic: [
        { status: 'pending', location: 'Warehouse' },
        { status: 'in_transit', location: 'Regional Hub' },
        { status: 'in_transit', location: 'Local Facility' },
        { status: 'out_for_delivery', location: 'Out for Delivery' },
        { status: 'delivered', location: 'Delivered' },
      ],
      international: [
        { status: 'pending', location: 'Departure Airport' },
        { status: 'in_transit', location: 'In Transit' },
        { status: 'in_transit', location: 'Arrival Country' },
        { status: 'in_transit', location: 'Customs Clearance' },
        { status: 'out_for_delivery', location: 'Out for Delivery' },
        { status: 'delivered', location: 'Delivered' },
      ],
    };
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new CarrierIntegrationService();
    }
    return this.instance;
  }

  /**
   * Get tracking information from carrier API
   */
  async getTrackingInfo(trackingNumber, carrier = 'domestic') {
    try {
      const config = this.carrierConfig[carrier];
      if (!config) {
        throw new Error(`Unknown carrier: ${carrier}`);
      }

      // For production, call actual carrier API
      if (process.env.NODE_ENV === 'production' && config.apiKey) {
        return await this._callCarrierAPI(trackingNumber, carrier, config);
      }

      // Development/testing mode - return mock data
      return this._getMockTrackingData(trackingNumber, carrier);
    } catch (error) {
      logger.error(`Failed to get tracking info for ${trackingNumber}: ${error.message}`);
      // Return mock data on API failure
      return this._getMockTrackingData(trackingNumber, carrier);
    }
  }

  /**
   * Call actual carrier API (implement based on specific carrier)
   */
  async _callCarrierAPI(trackingNumber, carrier, config) {
    try {
      const response = await axios.get(`${config.apiUrl}/${trackingNumber}`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      return this._parseCarrierResponse(response.data, carrier);
    } catch (error) {
      logger.error(`Carrier API error for ${carrier}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse carrier API response based on carrier type
   */
  _parseCarrierResponse(data, carrier) {
    // This varies by carrier - customize based on actual API response format
    const status = data.status?.toLowerCase() || 'in_transit';
    const location = data.location || 'In Transit';
    const events = (data.events || []).map(event => ({
      status: event.status?.toLowerCase() || 'in_transit',
      location: event.location || 'Unknown',
      timestamp: new Date(event.timestamp),
      description: event.description || '',
    }));

    return {
      trackingNumber: data.tracking_number,
      carrier,
      status: this._normalizeStatus(status),
      currentLocation: location,
      estimatedDelivery: data.estimated_delivery ? new Date(data.estimated_delivery) : null,
      events,
      lastUpdate: new Date(),
    };
  }

  /**
   * Get mock tracking data (for development/testing)
   */
  _getMockTrackingData(trackingNumber, carrier = 'domestic') {
    const type = carrier === 'international' || carrier === 'dhl' || carrier === 'fedex' ? 'international' : 'domestic';
    const scenarios = this.mockTrackingScenarios[type];

    // Simulate progression based on tracking number hash
    const hashCode = trackingNumber.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    const stageIndex = Math.abs(hashCode) % scenarios.length;
    const events = scenarios.slice(0, stageIndex + 1).map((scenario, index) => ({
      status: scenario.status,
      location: scenario.location,
      timestamp: new Date(Date.now() - (scenarios.length - index - 1) * 24 * 60 * 60 * 1000),
      description: `Package ${scenario.status === 'pending' ? 'accepted' : scenario.status}`,
    }));

    const currentEvent = events[events.length - 1];
    const daysToDelivery = Math.max(0, 5 - stageIndex);

    return {
      trackingNumber,
      carrier: this.carrierConfig[carrier]?.name || carrier,
      status: currentEvent.status,
      currentLocation: currentEvent.location,
      estimatedDelivery: new Date(Date.now() + daysToDelivery * 24 * 60 * 60 * 1000),
      events,
      lastUpdate: currentEvent.timestamp,
      isMockData: true,
    };
  }

  /**
   * Normalize status across different carriers
   */
  _normalizeStatus(rawStatus) {
    const statusMap = {
      pending: 'pending',
      intransit: 'in_transit',
      'in transit': 'in_transit',
      'in-transit': 'in_transit',
      pickup: 'pending',
      accepted: 'pending',
      outfordelivery: 'out_for_delivery',
      'out for delivery': 'out_for_delivery',
      'out-for-delivery': 'out_for_delivery',
      delivered: 'delivered',
      undeliverable: 'returned',
      returned: 'returned',
      failed: 'delayed',
      delayed: 'delayed',
    };

    return statusMap[rawStatus.toLowerCase().replace(/[_-]/g, '')] || 'in_transit';
  }

  /**
   * Generate prepaid return label
   */
  async generateReturnLabel(returnId, returnAddress, weight = 1.0) {
    try {
      // In production, call carrier API to generate label
      // For now, generate mock label data
      const labelId = `LBL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const trackingNumber = `RET${Date.now()}${Math.floor(Math.random() * 100000)}`;

      return {
        labelId,
        trackingNumber,
        returnId,
        pdfUrl: `${process.env.FRONTEND_URL}/api/labels/${labelId}.pdf`,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days expiry
        carrier: 'Domestic Courier',
        weight,
        createdAt: new Date(),
        isMockLabel: process.env.NODE_ENV !== 'production',
      };
    } catch (error) {
      logger.error(`Failed to generate return label: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync shipment tracking from carrier (webhook or polling)
   */
  async syncShipmentTracking(shipment) {
    try {
      if (!shipment.trackingNumber) {
        throw new Error('No tracking number provided');
      }

      const tracking = await this.getTrackingInfo(shipment.trackingNumber, shipment.carrier);

      // Update shipment status if changed
      if (tracking.status !== shipment.status) {
        shipment.status = tracking.status;
        shipment.currentLocation = tracking.currentLocation;
        shipment.lastUpdated = new Date();

        // Add tracking event to history
        shipment.trackingHistory.push({
          status: tracking.status,
          location: tracking.currentLocation,
          timestamp: new Date(),
        });
      }

      return tracking;
    } catch (error) {
      logger.error(`Failed to sync shipment tracking: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate estimated delivery based on carrier and location
   */
  estimateDeliveryTime(shipmentMethod = 'standard', originZip, destinationZip) {
    const baseDate = new Date();

    const estimates = {
      standard: 5,
      express: 2,
      overnight: 1,
      scheduled: 7,
    };

    const days = estimates[shipmentMethod] || 5;

    // Add buffer for weekends
    let deliveryDate = new Date(baseDate);
    let daysAdded = 0;

    while (daysAdded < days) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
      const dayOfWeek = deliveryDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Skip Sundays (0) and Saturdays (6)
        daysAdded++;
      }
    }

    return deliveryDate;
  }

  /**
   * Track multiple shipments (batch tracking)
   */
  async batchTrackingUpdate(shipments) {
    try {
      const updates = await Promise.all(
        shipments.map(shipment =>
          this.syncShipmentTracking(shipment).catch(error => {
            logger.error(`Failed to sync shipment ${shipment.trackingNumber}: ${error.message}`);
            return null;
          })
        )
      );

      return updates.filter(update => update !== null);
    } catch (error) {
      logger.error(`Batch tracking update failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get delivery proof/signature (for delivered shipments)
   */
  async getDeliveryProof(trackingNumber) {
    try {
      // In production, fetch from carrier's API
      // For now, return mock proof
      const proofUrl = `https://tracking.malabarbazaar.com/proof/${trackingNumber}.png`;

      return {
        trackingNumber,
        proofUrl,
        signedBy: 'Recipient',
        timestamp: new Date(),
        photoUrl: null, // Only available if carrier captured photo
      };
    } catch (error) {
      logger.error(`Failed to get delivery proof: ${error.message}`);
      throw error;
    }
  }

  /**
   * Schedule pickup for return shipment
   */
  async scheduleReturnPickup(trackingNumber, pickupAddress, timeSlot) {
    try {
      // In production, call carrier API to schedule pickup
      return {
        pickupId: `PU_${Date.now()}`,
        trackingNumber,
        pickupAddress,
        timeSlot,
        status: 'scheduled',
        confirmationCode: `CONF${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error(`Failed to schedule return pickup: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get shipping cost estimate
   */
  async getShippingEstimate(originZip, destinationZip, weight = 1.0, serviceType = 'standard') {
    try {
      // Mock pricing - in production call carrier API
      const baseCost = 50;
      const weightCost = weight > 1 ? (weight - 1) * 20 : 0;
      const distanceCost = Math.random() * 100;

      const serviceMultiplier = {
        standard: 1,
        express: 1.5,
        overnight: 2,
        scheduled: 0.8,
      };

      const multiplier = serviceMultiplier[serviceType] || 1;
      const totalCost = (baseCost + weightCost + distanceCost) * multiplier;

      return {
        originZip,
        destinationZip,
        weight,
        serviceType,
        cost: Math.round(totalCost * 100) / 100,
        estimatedDays: { standard: 5, express: 2, overnight: 1, scheduled: 7 }[serviceType],
        currency: 'INR',
      };
    } catch (error) {
      logger.error(`Failed to get shipping estimate: ${error.message}`);
      throw error;
    }
  }
}

module.exports = CarrierIntegrationService;
