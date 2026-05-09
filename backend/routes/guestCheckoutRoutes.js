/**
 * Guest Checkout Routes
 * POST /checkout/guest/create - Create guest checkout session
 * POST /checkout/guest/place-order - Place order as guest
 * GET /checkout/guest/:guestId/orders - Get guest orders
 * PUT /checkout/guest/:guestId/address - Update guest address
 * POST /checkout/guest/:guestId/payment - Save payment method
 * POST /auth/guest-to-user/:guestId - Convert guest to user
 * GET /checkout/guest/:guestId/conversion-url - Get conversion URL
 */

const express = require('express');
const router = express.Router();
const GuestCheckoutService = require('../services/GuestCheckoutService');
const { verifyToken } = require('../middlewares/auth');

/**
 * POST /checkout/guest/create
 * Create guest checkout session
 */
router.post('/create', async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const result = await GuestCheckoutService.createGuestSession(
      email,
      phoneNumber
    );

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /checkout/guest/:guestId/place-order
 * Place order as guest
 */
router.post('/:guestId/place-order', async (req, res) => {
  try {
    const { guestId } = req.params;
    const orderData = req.body;

    if (!orderData.items || orderData.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order must have at least one item'
      });
    }

    const result = await GuestCheckoutService.placeGuestOrder(
      guestId,
      orderData
    );

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /checkout/guest/:guestId/orders
 * Get guest orders
 */
router.get('/:guestId/orders', async (req, res) => {
  try {
    const { guestId } = req.params;

    const result = await GuestCheckoutService.getGuestOrders(guestId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /checkout/guest/:guestId/address
 * Update guest shipping address
 */
router.put('/:guestId/address', async (req, res) => {
  try {
    const { guestId } = req.params;
    const address = req.body;

    if (!address || typeof address !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Valid address object required'
      });
    }

    const result = await GuestCheckoutService.updateGuestAddress(
      guestId,
      address
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /checkout/guest/:guestId/payment
 * Save payment method for guest
 */
router.post('/:guestId/payment', async (req, res) => {
  try {
    const { guestId } = req.params;
    const paymentData = req.body;

    if (!paymentData.type) {
      return res.status(400).json({
        success: false,
        error: 'Payment type required'
      });
    }

    const result = await GuestCheckoutService.savePaymentMethod(
      guestId,
      paymentData
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /auth/guest-to-user/:guestId
 * Convert guest to registered user
 */
router.post('/convert/:guestId', async (req, res) => {
  try {
    const { guestId } = req.params;
    const userData = req.body;

    if (!userData.firstName || !userData.password) {
      return res.status(400).json({
        success: false,
        error: 'firstName and password required'
      });
    }

    const result = await GuestCheckoutService.convertGuestToUser(
      guestId,
      userData
    );

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      data: {
        ...result,
        refreshToken: undefined
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /checkout/guest/:guestId/conversion-url
 * Get conversion URL for guest
 */
router.get('/:guestId/conversion-url', async (req, res) => {
  try {
    const { guestId } = req.params;
    const { baseUrl } = req.query;

    if (!baseUrl) {
      return res.status(400).json({
        success: false,
        error: 'baseUrl query parameter required'
      });
    }

    // Note: This is a simplified endpoint. In production, you'd fetch the guest
    // and generate URL through the service
    const conversionUrl = `${baseUrl}/convert/${guestId}`;

    res.status(200).json({
      success: true,
      data: {
        guestId,
        conversionUrl,
        expiresIn: '7 days'
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
