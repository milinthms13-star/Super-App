/**
 * addressRoutes.js
 * User address management endpoints
 */

const express = require('express');
const router = express.Router();
const AddressManagementService = require('../services/AddressManagementService');
const { verifyToken } = require('../middleware/auth');

// Middleware
const validateAddress = (req, res, next) => {
  try {
    AddressManagementService.validateAddress(req.body);
    next();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET /api/user/addresses - Get all addresses
router.get('/', verifyToken, async (req, res) => {
  try {
    const addresses = await AddressManagementService.getAddresses(req.user.id);
    res.json({ success: true, data: addresses });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/addresses - Add new address
router.post('/', verifyToken, validateAddress, async (req, res) => {
  try {
    const address = await AddressManagementService.addAddress(req.user.id, req.body);
    res.status(201).json({ success: true, data: address });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/user/addresses/:addressId - Get address by ID
router.get('/:addressId', verifyToken, async (req, res) => {
  try {
    const addresses = await AddressManagementService.getAddresses(req.user.id);
    const address = addresses.find((a) => a._id.toString() === req.params.addressId);

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json({ success: true, data: address });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/user/addresses/:addressId - Update address
router.put('/:addressId', verifyToken, validateAddress, async (req, res) => {
  try {
    const address = await AddressManagementService.updateAddress(
      req.user.id,
      req.params.addressId,
      req.body
    );
    res.json({ success: true, data: address });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/user/addresses/:addressId - Delete address
router.delete('/:addressId', verifyToken, async (req, res) => {
  try {
    const address = await AddressManagementService.deleteAddress(
      req.user.id,
      req.params.addressId
    );
    res.json({ success: true, data: address });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/addresses/:addressId/default/shipping - Set as shipping default
router.post('/:addressId/default/shipping', verifyToken, async (req, res) => {
  try {
    const address = await AddressManagementService.setShippingDefault(
      req.user.id,
      req.params.addressId
    );
    res.json({ success: true, data: address });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/addresses/:addressId/default/billing - Set as billing default
router.post('/:addressId/default/billing', verifyToken, async (req, res) => {
  try {
    const address = await AddressManagementService.setBillingDefault(
      req.user.id,
      req.params.addressId
    );
    res.json({ success: true, data: address });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/user/addresses/default/shipping - Get default shipping address
router.get('/default/shipping', verifyToken, async (req, res) => {
  try {
    const address = await AddressManagementService.getShippingDefault(req.user.id);
    res.json({ success: true, data: address });
  } catch (err) {
    res.status(404).json({ error: 'No default shipping address' });
  }
});

// GET /api/user/addresses/default/billing - Get default billing address
router.get('/default/billing', verifyToken, async (req, res) => {
  try {
    const address = await AddressManagementService.getBillingDefault(req.user.id);
    res.json({ success: true, data: address });
  } catch (err) {
    res.status(404).json({ error: 'No default billing address' });
  }
});

// POST /api/user/addresses/:addressId/verify - Generate verification code
router.post('/:addressId/verify', verifyToken, async (req, res) => {
  try {
    const result = await AddressManagementService.generateVerificationCode(
      req.user.id,
      req.params.addressId
    );

    if (process.env.NODE_ENV === 'development') {
      result.code; // Log for testing
    }

    res.json({
      success: true,
      data: {
        message: 'Verification code sent',
        expiresAt: result.expiresAt
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/addresses/:addressId/confirm - Confirm verification
router.post('/:addressId/confirm', verifyToken, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Verification code required' });
    }

    const address = await AddressManagementService.verifyAddress(
      req.user.id,
      req.params.addressId,
      code
    );

    res.json({ success: true, data: address });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/user/addresses/suggestions - Get address suggestions based on IP
router.get('/suggestions', verifyToken, async (req, res) => {
  try {
    const suggestions = await AddressManagementService.getSuggestedAddresses(
      req.user.id,
      req.ip
    );
    res.json({ success: true, data: suggestions });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/user/addresses/bulk - Delete multiple addresses
router.delete('/bulk', verifyToken, async (req, res) => {
  try {
    const { addressIds } = req.body;

    if (!Array.isArray(addressIds) || addressIds.length === 0) {
      return res.status(400).json({ error: 'Address IDs required' });
    }

    const result = await AddressManagementService.deleteMultiple(req.user.id, addressIds);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
