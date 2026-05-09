/**
 * deliveryRoutes.js
 * API endpoints for live tracking, delivery slots, and same-day delivery
 */

const express = require('express');
const router = express.Router();
const DeliveryService = require('../services/DeliveryService');
const { verifyToken } = require('../middlewares/authMiddleware');
const logger = require('../config/logger');

/**
 * GET /api/delivery/tracking/:orderId
 * Get live tracking information
 */
router.get('/tracking/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const tracking = await DeliveryService.getLiveTracking(orderId);

    res.json({
      success: true,
      data: tracking,
    });
  } catch (error) {
    logger.error('Get live tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tracking information',
      error: error.message,
    });
  }
});

/**
 * POST /api/delivery/tracking/update
 * Update shipment location (from delivery partner)
 */
router.post('/tracking/update', verifyToken, async (req, res) => {
  try {
    const { shipmentId, latitude, longitude, status } = req.body;

    if (!shipmentId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Shipment ID, latitude, and longitude are required',
      });
    }

    const updated = await DeliveryService.updateShipmentLocation(
      shipmentId,
      latitude,
      longitude,
      status
    );

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('Update shipment location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message,
    });
  }
});

/**
 * GET /api/delivery/eta/:shipmentId
 * Calculate ETA for shipment
 */
router.get('/eta/:shipmentId', async (req, res) => {
  try {
    const { shipmentId } = req.params;

    const eta = await DeliveryService.calculateETA(shipmentId);

    res.json({
      success: true,
      data: eta,
    });
  } catch (error) {
    logger.error('Calculate ETA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate ETA',
      error: error.message,
    });
  }
});

/**
 * GET /api/delivery/slots
 * Get available delivery slots
 */
router.get('/slots', async (req, res) => {
  try {
    const { zipcode, date } = req.query;

    if (!zipcode || !date) {
      return res.status(400).json({
        success: false,
        message: 'Zipcode and date are required',
      });
    }

    const slots = await DeliveryService.getAvailableSlots(zipcode, date);

    res.json({
      success: true,
      data: slots,
    });
  } catch (error) {
    logger.error('Get available slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available slots',
      error: error.message,
    });
  }
});

/**
 * POST /api/delivery/book-slot
 * Book delivery slot
 */
router.post('/book-slot', verifyToken, async (req, res) => {
  try {
    const { orderId, slotId, date } = req.body;

    if (!orderId || !slotId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, slot ID, and date are required',
      });
    }

    const booked = await DeliveryService.bookDeliverySlot(orderId, slotId, date);

    res.json({
      success: true,
      data: booked,
      message: 'Delivery slot booked successfully',
    });
  } catch (error) {
    logger.error('Book delivery slot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to book delivery slot',
      error: error.message,
    });
  }
});

/**
 * GET /api/delivery/same-day/check
 * Check same-day delivery eligibility
 */
router.get('/same-day/check', async (req, res) => {
  try {
    const { zipcode } = req.query;
    const { items } = req.body || { items: [] };

    if (!zipcode) {
      return res.status(400).json({
        success: false,
        message: 'Zipcode is required',
      });
    }

    const eligibility = await DeliveryService.checkSameDayDeliveryEligibility(
      zipcode,
      items
    );

    res.json({
      success: true,
      data: eligibility,
    });
  } catch (error) {
    logger.error('Check same-day eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check same-day eligibility',
      error: error.message,
    });
  }
});

/**
 * POST /api/delivery/same-day/activate
 * Activate same-day delivery
 */
router.post('/same-day/activate', verifyToken, async (req, res) => {
  try {
    const { orderId, zipcode } = req.body;

    if (!orderId || !zipcode) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and zipcode are required',
      });
    }

    const activated = await DeliveryService.activateSameDayDelivery(
      orderId,
      zipcode
    );

    res.json({
      success: true,
      data: activated,
      message: 'Same-day delivery activated',
    });
  } catch (error) {
    logger.error('Activate same-day delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate same-day delivery',
      error: error.message,
    });
  }
});

/**
 * POST /api/delivery/optimize-route
 * Optimize delivery route
 */
router.post('/optimize-route', async (req, res) => {
  try {
    const { shipmentIds } = req.body;

    if (!shipmentIds || !Array.isArray(shipmentIds)) {
      return res.status(400).json({
        success: false,
        message: 'Shipment IDs array is required',
      });
    }

    const optimized = await DeliveryService.optimizeDeliveryRoute(shipmentIds);

    res.json({
      success: true,
      data: optimized,
    });
  } catch (error) {
    logger.error('Optimize route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to optimize route',
      error: error.message,
    });
  }
});

/**
 * GET /api/delivery/partners
 * Get available delivery partners
 */
router.get('/partners', async (req, res) => {
  try {
    const { zipcode } = req.query;

    if (!zipcode) {
      return res.status(400).json({
        success: false,
        message: 'Zipcode is required',
      });
    }

    const partners = await DeliveryService.getDeliveryPartnerAvailability(zipcode);

    res.json({
      success: true,
      data: partners,
    });
  } catch (error) {
    logger.error('Get delivery partners error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get delivery partners',
      error: error.message,
    });
  }
});

module.exports = router;
