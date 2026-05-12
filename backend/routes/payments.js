const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const AstrologyConsultationBooking = require('../models/AstrologyConsultationBooking');

const router = express.Router();

// Initialize Razorpay with keys from environment
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'test_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret',
});

// Create payment order
router.post('/payment/create-order', authenticate, async (req, res) => {
  try {
    const { bookingId, consultantId, amountInr } = req.body;

    if (!bookingId || !amountInr || amountInr < 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking or amount.',
      });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amountInr * 100, // Convert to paise
      currency: 'INR',
      receipt: `booking-${bookingId}`,
      notes: {
        bookingId,
        consultantId,
        userId: String(req.user._id || req.user.id),
      },
    });

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        amountInr,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID || 'test_key',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to create payment order.',
    });
  }
});

// Verify payment signature
router.post('/payment/verify', authenticate, async (req, res) => {
  try {
    const { orderId, paymentId, signature, bookingId } = req.body;
    const userId = String(req.user._id || req.user.id);

    // Verify signature
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret');
    shasum.update(`${orderId}|${paymentId}`);
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed.',
      });
    }

    // Update booking with payment status
    const booking = await AstrologyConsultationBooking.findByIdAndUpdate(
      bookingId,
      {
        paymentStatus: 'completed',
        paymentId,
        paymentDate: new Date(),
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Payment verified successfully.',
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to verify payment.',
    });
  }
});

// Get payment status
router.get('/payment/:bookingId', authenticate, async (req, res) => {
  try {
    const booking = await AstrologyConsultationBooking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        bookingId: booking._id,
        paymentStatus: booking.paymentStatus || 'pending',
        amountInr: booking.amountInr,
        paymentId: booking.paymentId || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to fetch payment status.',
    });
  }
});

module.exports = router;
