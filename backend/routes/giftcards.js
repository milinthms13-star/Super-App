const express = require('express');
const router = express.Router();
const GiftCard = require('../models/GiftCard');
const Wallet = require('../models/Wallet');
const { authenticate } = require('../middleware/auth');

// Generate unique gift card code
const generateGiftCardCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Create/Issue a gift card
router.post('/create', authenticate, async (req, res) => {
  try {
    const {
      denomination,
      recipientEmail,
      recipientName,
      giftMessage,
      designTemplate,
      designImage,
    } = req.body;

    if (!denomination || !recipientEmail || !recipientName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Validate denomination
    const validDenominations = [500, 1000, 2500, 5000, 10000];
    if (!validDenominations.includes(denomination)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid denomination',
      });
    }

    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year validity

    const giftCard = new GiftCard({
      cardCode: generateGiftCardCode(),
      issuedBy: req.user.email,
      denomination,
      balance: denomination,
      originalBalance: denomination,
      recipientEmail: recipientEmail.toLowerCase(),
      recipientName,
      senderEmail: req.user.email,
      senderName: req.user.name,
      giftMessage: giftMessage || '',
      designTemplate: designTemplate || 'Classic',
      designImage: designImage || '',
      expiryDate,
    });

    await giftCard.save();

    res.json({
      success: true,
      message: 'Gift card created successfully',
      data: giftCard,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating gift card',
      error: error.message,
    });
  }
});

// Get gift cards sent by user
router.get('/sent', authenticate, async (req, res) => {
  try {
    const giftCards = await GiftCard.find({ senderEmail: req.user.email }).sort({
      issuedAt: -1,
    });

    res.json({
      success: true,
      data: giftCards,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching sent gift cards',
      error: error.message,
    });
  }
});

// Get gift cards received by user
router.get('/received', authenticate, async (req, res) => {
  try {
    const giftCards = await GiftCard.find({
      recipientEmail: req.user.email,
    }).sort({
      issuedAt: -1,
    });

    res.json({
      success: true,
      data: giftCards,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching received gift cards',
      error: error.message,
    });
  }
});

// Redeem gift card
router.post('/redeem', authenticate, async (req, res) => {
  try {
    const { cardCode } = req.body;

    if (!cardCode) {
      return res.status(400).json({
        success: false,
        message: 'Gift card code is required',
      });
    }

    const giftCard = await GiftCard.findOne({
      cardCode: cardCode.toUpperCase(),
    });

    if (!giftCard) {
      return res.status(404).json({
        success: false,
        message: 'Gift card not found',
      });
    }

    if (giftCard.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: `Gift card is ${giftCard.status}`,
      });
    }

    if (new Date() > giftCard.expiryDate) {
      giftCard.status = 'Expired';
      await giftCard.save();
      return res.status(400).json({
        success: false,
        message: 'Gift card has expired',
      });
    }

    if (giftCard.balance <= 0) {
      giftCard.status = 'Used';
      await giftCard.save();
      return res.status(400).json({
        success: false,
        message: 'Gift card has no balance',
      });
    }

    // Add to wallet
    let wallet = await Wallet.findOne({ userEmail: req.user.email });
    if (!wallet) {
      wallet = new Wallet({
        userEmail: req.user.email,
        userName: req.user.name,
      });
    }

    const redeemAmount = giftCard.balance;
    wallet.balance += redeemAmount;
    wallet.transactions.push({
      transactionId: `gc-${Date.now()}`,
      type: 'Credit',
      amount: redeemAmount,
      description: `Gift card redemption: ${giftCard.cardCode}`,
      status: 'Completed',
    });

    giftCard.balance = 0;
    giftCard.status = 'Used';
    giftCard.activatedAt = new Date();
    giftCard.recipientEmail = req.user.email;

    await wallet.save();
    await giftCard.save();

    res.json({
      success: true,
      message: 'Gift card redeemed successfully',
      data: {
        amount: redeemAmount,
        giftCard,
        wallet,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error redeeming gift card',
      error: error.message,
    });
  }
});

// Transfer gift card to another user
router.post('/transfer', authenticate, async (req, res) => {
  try {
    const { cardCode, toEmail, message } = req.body;

    if (!cardCode || !toEmail) {
      return res.status(400).json({
        success: false,
        message: 'Gift card code and recipient email are required',
      });
    }

    const giftCard = await GiftCard.findOne({
      cardCode: cardCode.toUpperCase(),
    });

    if (!giftCard) {
      return res.status(404).json({
        success: false,
        message: 'Gift card not found',
      });
    }

    if (!giftCard.canBeTransferred) {
      return res.status(400).json({
        success: false,
        message: 'This gift card cannot be transferred',
      });
    }

    if (giftCard.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: `Gift card is ${giftCard.status}`,
      });
    }

    giftCard.transferHistory.push({
      fromEmail: req.user.email,
      toEmail: toEmail.toLowerCase(),
      transferredAt: new Date(),
      transferMessage: message || '',
    });

    giftCard.recipientEmail = toEmail.toLowerCase();
    await giftCard.save();

    res.json({
      success: true,
      message: 'Gift card transferred successfully',
      data: giftCard,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error transferring gift card',
      error: error.message,
    });
  }
});

// Get gift card details
router.get('/:cardCode', async (req, res) => {
  try {
    const giftCard = await GiftCard.findOne({
      cardCode: req.params.cardCode.toUpperCase(),
    });

    if (!giftCard) {
      return res.status(404).json({
        success: false,
        message: 'Gift card not found',
      });
    }

    res.json({
      success: true,
      data: giftCard,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching gift card',
      error: error.message,
    });
  }
});

module.exports = router;
