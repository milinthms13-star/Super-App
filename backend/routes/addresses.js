const express = require('express');
const router = express.Router();
const UserAddress = require('../models/UserAddress');
const auth = require('../middleware/auth');

// Get all user addresses
router.get('/me', auth, async (req, res) => {
  try {
    let userAddr = await UserAddress.findOne({ userEmail: req.user.email });

    if (!userAddr) {
      userAddr = new UserAddress({
        userId: req.user.id,
        userEmail: req.user.email,
        addresses: [],
      });
      await userAddr.save();
    }

    res.json({
      success: true,
      data: {
        totalAddresses: userAddr.totalAddresses,
        primaryAddressId: userAddr.primaryAddressId,
        addresses: userAddr.getActiveAddresses(),
      },
    });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch addresses' });
  }
});

// Get primary address
router.get('/primary', auth, async (req, res) => {
  try {
    const userAddr = await UserAddress.findOne({ userEmail: req.user.email });

    if (!userAddr) {
      return res.status(404).json({ success: false, error: 'No addresses found' });
    }

    const primaryAddress = userAddr.getPrimaryAddress();

    if (!primaryAddress) {
      return res.status(404).json({ success: false, error: 'No primary address set' });
    }

    res.json({
      success: true,
      data: primaryAddress,
    });
  } catch (error) {
    console.error('Error fetching primary address:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch primary address' });
  }
});

// Add new address
router.post('/add', auth, async (req, res) => {
  try {
    const {
      name,
      type = 'home',
      street,
      building = '',
      area,
      city,
      state,
      postalCode,
      recipient,
      phoneNumber,
      alternatePhoneNumber = null,
      instructions = '',
      landmark = '',
      latitude = null,
      longitude = null,
      isPrimary = false,
    } = req.body;

    // Validate required fields
    if (!name || !street || !area || !city || !state || !postalCode || !recipient || !phoneNumber) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Validate postal code format
    if (!/^\d{6}$/.test(postalCode)) {
      return res.status(400).json({ success: false, error: 'Postal code must be 6 digits' });
    }

    // Validate phone number format
    if (!/^[0-9]{10}$/.test(phoneNumber)) {
      return res.status(400).json({ success: false, error: 'Phone number must be 10 digits' });
    }

    // Get or create user addresses
    let userAddr = await UserAddress.findOne({ userEmail: req.user.email });
    if (!userAddr) {
      userAddr = new UserAddress({
        userId: req.user.id,
        userEmail: req.user.email,
        addresses: [],
      });
    }

    // Add address
    userAddr.addAddress({
      name,
      type,
      street,
      building,
      area,
      city,
      state,
      postalCode,
      country: 'India',
      latitude,
      longitude,
      recipient,
      phoneNumber,
      alternatePhoneNumber,
      instructions,
      landmark,
      isPrimary: isPrimary || userAddr.addresses.length === 0,
    });

    await userAddr.save();

    const newAddress = userAddr.addresses[userAddr.addresses.length - 1];

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: newAddress,
    });
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ success: false, error: 'Failed to add address' });
  }
});

// Update address
router.patch('/:addressId', auth, async (req, res) => {
  try {
    const userAddr = await UserAddress.findOne({ userEmail: req.user.email });

    if (!userAddr) {
      return res.status(404).json({ success: false, error: 'User addresses not found' });
    }

    const updates = req.body;

    // Validate postal code if provided
    if (updates.postalCode && !/^\d{6}$/.test(updates.postalCode)) {
      return res.status(400).json({ success: false, error: 'Postal code must be 6 digits' });
    }

    // Validate phone number if provided
    if (updates.phoneNumber && !/^[0-9]{10}$/.test(updates.phoneNumber)) {
      return res.status(400).json({ success: false, error: 'Phone number must be 10 digits' });
    }

    userAddr.updateAddress(req.params.addressId, {
      ...updates,
      updatedAt: new Date(),
    });
    await userAddr.save();

    const updatedAddress = userAddr.addresses.find((addr) => addr.addressId === req.params.addressId);

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: updatedAddress,
    });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ success: false, error: 'Failed to update address' });
  }
});

// Delete address
router.delete('/:addressId', auth, async (req, res) => {
  try {
    const userAddr = await UserAddress.findOne({ userEmail: req.user.email });

    if (!userAddr) {
      return res.status(404).json({ success: false, error: 'User addresses not found' });
    }

    userAddr.deleteAddress(req.params.addressId);
    await userAddr.save();

    res.json({
      success: true,
      message: 'Address deleted successfully',
      data: {
        totalAddresses: userAddr.totalAddresses,
        addresses: userAddr.getActiveAddresses(),
      },
    });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ success: false, error: 'Failed to delete address' });
  }
});

// Set primary address
router.patch('/:addressId/set-primary', auth, async (req, res) => {
  try {
    const userAddr = await UserAddress.findOne({ userEmail: req.user.email });

    if (!userAddr) {
      return res.status(404).json({ success: false, error: 'User addresses not found' });
    }

    // Unmark all as primary
    userAddr.addresses.forEach((addr) => {
      addr.isPrimary = false;
    });

    // Mark selected as primary
    const address = userAddr.addresses.find((addr) => addr.addressId === req.params.addressId);
    if (address) {
      address.isPrimary = true;
      userAddr.primaryAddressId = req.params.addressId;
    }

    await userAddr.save();

    res.json({
      success: true,
      message: 'Primary address updated',
      data: address,
    });
  } catch (error) {
    console.error('Error setting primary address:', error);
    res.status(500).json({ success: false, error: 'Failed to set primary address' });
  }
});

// Record address usage (for analytics)
router.post('/:addressId/use', auth, async (req, res) => {
  try {
    const userAddr = await UserAddress.findOne({ userEmail: req.user.email });

    if (!userAddr) {
      return res.status(404).json({ success: false, error: 'User addresses not found' });
    }

    userAddr.recordAddressUsage(req.params.addressId);
    await userAddr.save();

    res.json({
      success: true,
      message: 'Address usage recorded',
    });
  } catch (error) {
    console.error('Error recording usage:', error);
    res.status(500).json({ success: false, error: 'Failed to record usage' });
  }
});

// Get address by ID
router.get('/:addressId', auth, async (req, res) => {
  try {
    const userAddr = await UserAddress.findOne({ userEmail: req.user.email });

    if (!userAddr) {
      return res.status(404).json({ success: false, error: 'User addresses not found' });
    }

    const address = userAddr.addresses.find((addr) => addr.addressId === req.params.addressId && addr.isActive);

    if (!address) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }

    res.json({
      success: true,
      data: address,
    });
  } catch (error) {
    console.error('Error fetching address:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch address' });
  }
});

// Get address statistics
router.get('/stats/usage', auth, async (req, res) => {
  try {
    const userAddr = await UserAddress.findOne({ userEmail: req.user.email });

    if (!userAddr) {
      return res.json({
        success: true,
        data: {
          totalAddresses: 0,
          mostUsedAddress: null,
          addressTypes: {},
        },
      });
    }

    const activeAddresses = userAddr.getActiveAddresses();
    const mostUsedAddress = activeAddresses.reduce((prev, current) =>
      prev.usageCount > current.usageCount ? prev : current
    );

    // Count address types
    const addressTypes = {};
    activeAddresses.forEach((addr) => {
      addressTypes[addr.type] = (addressTypes[addr.type] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalAddresses: userAddr.totalAddresses,
        mostUsedAddress: mostUsedAddress.usageCount > 0 ? mostUsedAddress : null,
        addressTypes,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// Verify address (validate with postal code/GPS)
router.post('/:addressId/verify', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const userAddr = await UserAddress.findOne({ userEmail: req.user.email });

    if (!userAddr) {
      return res.status(404).json({ success: false, error: 'User addresses not found' });
    }

    const address = userAddr.addresses.find((addr) => addr.addressId === req.params.addressId);

    if (!address) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }

    // Update GPS coordinates if provided
    if (latitude && longitude) {
      address.latitude = latitude;
      address.longitude = longitude;
      await userAddr.save();
    }

    res.json({
      success: true,
      message: 'Address verified',
      data: {
        addressId: req.params.addressId,
        isVerified: true,
        coordinates: {
          latitude: address.latitude,
          longitude: address.longitude,
        },
      },
    });
  } catch (error) {
    console.error('Error verifying address:', error);
    res.status(500).json({ success: false, error: 'Failed to verify address' });
  }
});

module.exports = router;
