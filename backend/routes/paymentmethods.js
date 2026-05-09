const express = require('express');
const router = express.Router();
const SavedPaymentMethod = require('../models/SavedPaymentMethod');
const auth = require('../middleware/auth');

// Get all saved payment methods for user
router.get('/me', auth, async (req, res) => {
  try {
    const methods = await SavedPaymentMethod.findByEmail(req.user.email);

    const maskedMethods = methods.map((method) => method.getMaskedDetails());

    res.json({
      success: true,
      data: {
        totalMethods: maskedMethods.length,
        methods: maskedMethods,
      },
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payment methods' });
  }
});

// Get default payment method
router.get('/default', auth, async (req, res) => {
  try {
    const method = await SavedPaymentMethod.findDefaultForEmail(req.user.email);

    if (!method) {
      return res.status(404).json({ success: false, error: 'No default payment method set' });
    }

    res.json({
      success: true,
      data: method.getMaskedDetails(),
    });
  } catch (error) {
    console.error('Error fetching default method:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch default method' });
  }
});

// Save a new payment method
router.post('/add', auth, async (req, res) => {
  try {
    const { name, type, cardData, upiData, netbankingData, walletData, isDefault = false } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, error: 'Name and type are required' });
    }

    // Check if this would be first method
    const existingMethods = await SavedPaymentMethod.findByEmail(req.user.email);
    const shouldBeDefault = existingMethods.length === 0 || isDefault;

    // Create new payment method
    const newMethod = new SavedPaymentMethod({
      userId: req.user.id,
      userEmail: req.user.email,
      name,
      type,
      isDefault: shouldBeDefault,
    });

    // Add type-specific data
    if (type === 'card' && cardData) {
      newMethod.card = {
        last4: cardData.last4,
        brand: cardData.brand,
        expiryMonth: cardData.expiryMonth,
        expiryYear: cardData.expiryYear,
        holderName: cardData.holderName,
        tokenId: cardData.tokenId, // From payment gateway
      };
    } else if (type === 'upi' && upiData) {
      newMethod.upi = {
        upiId: upiData.upiId,
        name: upiData.name,
        tokenId: upiData.tokenId,
      };
    } else if (type === 'netbanking' && netbankingData) {
      newMethod.netbanking = {
        bankName: netbankingData.bankName,
        tokenId: netbankingData.tokenId,
        accountName: netbankingData.accountName,
      };
    } else if (type === 'wallet' && walletData) {
      newMethod.wallet = {
        walletProvider: walletData.provider,
        accountEmail: walletData.email,
        tokenId: walletData.tokenId,
      };
    }

    // If marking as default, unmark others
    if (shouldBeDefault) {
      await SavedPaymentMethod.markOthersAsNonDefault(req.user.email, newMethod.methodId);
    }

    await newMethod.save();

    res.status(201).json({
      success: true,
      message: 'Payment method saved',
      data: newMethod.getMaskedDetails(),
    });
  } catch (error) {
    console.error('Error saving payment method:', error);
    res.status(500).json({ success: false, error: 'Failed to save payment method' });
  }
});

// Update payment method
router.patch('/:methodId', auth, async (req, res) => {
  try {
    const method = await SavedPaymentMethod.findOne({
      methodId: req.params.methodId,
      userEmail: req.user.email,
    });

    if (!method) {
      return res.status(404).json({ success: false, error: 'Payment method not found' });
    }

    const { name, isDefault } = req.body;

    if (name) method.name = name;

    if (isDefault) {
      method.markAsDefault();
      await SavedPaymentMethod.markOthersAsNonDefault(req.user.email, req.params.methodId);
    }

    await method.save();

    res.json({
      success: true,
      message: 'Payment method updated',
      data: method.getMaskedDetails(),
    });
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({ success: false, error: 'Failed to update payment method' });
  }
});

// Set as default
router.patch('/:methodId/set-default', auth, async (req, res) => {
  try {
    const method = await SavedPaymentMethod.findOne({
      methodId: req.params.methodId,
      userEmail: req.user.email,
    });

    if (!method) {
      return res.status(404).json({ success: false, error: 'Payment method not found' });
    }

    method.markAsDefault();
    await SavedPaymentMethod.markOthersAsNonDefault(req.user.email, req.params.methodId);
    await method.save();

    res.json({
      success: true,
      message: 'Default payment method updated',
      data: method.getMaskedDetails(),
    });
  } catch (error) {
    console.error('Error setting default:', error);
    res.status(500).json({ success: false, error: 'Failed to set default payment method' });
  }
});

// Delete payment method
router.delete('/:methodId', auth, async (req, res) => {
  try {
    const method = await SavedPaymentMethod.findOne({
      methodId: req.params.methodId,
      userEmail: req.user.email,
    });

    if (!method) {
      return res.status(404).json({ success: false, error: 'Payment method not found' });
    }

    method.isActive = false;
    await method.save();

    res.json({
      success: true,
      message: 'Payment method deleted',
    });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({ success: false, error: 'Failed to delete payment method' });
  }
});

// Record usage of payment method
router.post('/:methodId/use', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    const method = await SavedPaymentMethod.findOne({
      methodId: req.params.methodId,
      userEmail: req.user.email,
    });

    if (!method) {
      return res.status(404).json({ success: false, error: 'Payment method not found' });
    }

    method.recordUsage(orderId);
    await method.save();

    res.json({
      success: true,
      message: 'Usage recorded',
      data: method.getMaskedDetails(),
    });
  } catch (error) {
    console.error('Error recording usage:', error);
    res.status(500).json({ success: false, error: 'Failed to record usage' });
  }
});

// Record failed attempt
router.post('/:methodId/failed', auth, async (req, res) => {
  try {
    const method = await SavedPaymentMethod.findOne({
      methodId: req.params.methodId,
      userEmail: req.user.email,
    });

    if (!method) {
      return res.status(404).json({ success: false, error: 'Payment method not found' });
    }

    method.recordFailedAttempt();
    await method.save();

    if (method.isLocked) {
      return res.json({
        success: true,
        message: 'Payment method locked due to multiple failed attempts',
        isLocked: true,
      });
    }

    res.json({
      success: true,
      message: 'Failed attempt recorded',
      remainingAttempts: method.maxFailedAttempts - method.failedAttempts,
    });
  } catch (error) {
    console.error('Error recording failed attempt:', error);
    res.status(500).json({ success: false, error: 'Failed to record attempt' });
  }
});

// Unlock locked payment method (admin or user verification)
router.post('/:methodId/unlock', auth, async (req, res) => {
  try {
    const method = await SavedPaymentMethod.findOne({
      methodId: req.params.methodId,
      userEmail: req.user.email,
    });

    if (!method) {
      return res.status(404).json({ success: false, error: 'Payment method not found' });
    }

    method.unlock();
    await method.save();

    res.json({
      success: true,
      message: 'Payment method unlocked',
      data: method.getMaskedDetails(),
    });
  } catch (error) {
    console.error('Error unlocking method:', error);
    res.status(500).json({ success: false, error: 'Failed to unlock payment method' });
  }
});

// Link payment method to address
router.post('/:methodId/link-address', auth, async (req, res) => {
  try {
    const { addressId } = req.body;

    if (!addressId) {
      return res.status(400).json({ success: false, error: 'Address ID required' });
    }

    const method = await SavedPaymentMethod.findOne({
      methodId: req.params.methodId,
      userEmail: req.user.email,
    });

    if (!method) {
      return res.status(404).json({ success: false, error: 'Payment method not found' });
    }

    // Check if already linked
    const existing = method.linkedAddresses.find((link) => link.addressId === addressId);

    if (!existing) {
      method.linkedAddresses.push({
        addressId,
        linkedAt: new Date(),
      });
    }

    await method.save();

    res.json({
      success: true,
      message: 'Address linked to payment method',
    });
  } catch (error) {
    console.error('Error linking address:', error);
    res.status(500).json({ success: false, error: 'Failed to link address' });
  }
});

// Get payment method statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const methods = await SavedPaymentMethod.findByEmail(req.user.email);

    const stats = {
      totalMethods: methods.length,
      byType: {},
      mostUsed: null,
      lockedMethods: 0,
      expiredCards: 0,
    };

    let mostUsedMethod = null;
    let maxUsage = 0;

    methods.forEach((method) => {
      // Count by type
      stats.byType[method.type] = (stats.byType[method.type] || 0) + 1;

      // Track most used
      if (method.usageCount > maxUsage) {
        maxUsage = method.usageCount;
        mostUsedMethod = method;
      }

      // Count locked
      if (method.isLocked) stats.lockedMethods += 1;

      // Count expired cards
      if (method.type === 'card' && method.isCardExpired()) {
        stats.expiredCards += 1;
      }
    });

    if (mostUsedMethod) {
      stats.mostUsed = {
        name: mostUsedMethod.name,
        usageCount: mostUsedMethod.usageCount,
      };
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
