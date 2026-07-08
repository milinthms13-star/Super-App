const Razorpay = require('razorpay');
const crypto = require('crypto');
const TourismPayment = require('../models/TourismPayment');
const TourismBooking = require('../models/TourismBooking');
const logger = require('../utils/logger');

class TourismPaymentService {
  constructor() {
    this.razorpay = null;
    this.initRazorpay();
  }

  initRazorpay() {
    const keyId = String(process.env.RAZORPAY_KEY_ID || '').trim();
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || '').trim();

    if (keyId && keySecret) {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      logger.info('Razorpay initialized for Tourism Payment Service');
    } else {
      logger.warn('Razorpay credentials not found. Payment features will be limited.');
    }
  }

  /**
   * Create a payment order
   */
  async createPaymentOrder(bookingId, amount, metadata = {}) {
    try {
      if (!this.razorpay) {
        throw new Error('Razorpay not initialized');
      }

      const booking = await TourismBooking.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Create Razorpay order
      const orderOptions = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'INR',
        receipt: `tourism_${bookingId}_${Date.now()}`,
        notes: {
          bookingId: bookingId.toString(),
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          packageTitle: booking.packageTitle,
          ...metadata,
        },
      };

      const razorpayOrder = await this.razorpay.orders.create(orderOptions);

      // Create payment record in database
      const payment = new TourismPayment({
        bookingId,
        orderId: razorpayOrder.receipt,
        providerOrderId: razorpayOrder.id,
        provider: 'razorpay',
        amount,
        currency: 'INR',
        paymentType: metadata.paymentType || 'advance',
        status: 'created',
        metadata: {
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
          packageTitle: booking.packageTitle,
          travelDate: booking.travelDate,
        },
      });

      await payment.save();

      logger.info(`Payment order created: ${payment.orderId} for booking ${bookingId}`);

      return {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        paymentId: payment._id,
      };
    } catch (error) {
      logger.error('Error creating payment order:', error);
      throw error;
    }
  }

  /**
   * Verify payment signature
   */
  verifyPaymentSignature(orderId, paymentId, signature) {
    try {
      const keySecret = String(process.env.RAZORPAY_KEY_SECRET || '').trim();
      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      logger.error('Error verifying payment signature:', error);
      return false;
    }
  }

  /**
   * Capture payment and update booking
   */
  async capturePayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
      // Verify signature
      const isValid = this.verifyPaymentSignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );

      if (!isValid) {
        throw new Error('Invalid payment signature');
      }

      // Find payment record
      const payment = await TourismPayment.findOne({ providerOrderId: razorpayOrderId });
      if (!payment) {
        throw new Error('Payment record not found');
      }

      // Update payment status
      await payment.markSuccess(razorpayPaymentId, razorpaySignature);

      // Update booking
      const booking = await TourismBooking.findById(payment.bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      await booking.markPaymentCompleted(payment.amount, razorpayPaymentId);
      await booking.addStatusHistory('paid', 'system', 'Payment captured successfully');

      logger.info(`Payment captured successfully for booking ${booking._id}`);

      return {
        success: true,
        payment,
        booking,
      };
    } catch (error) {
      logger.error('Error capturing payment:', error);
      throw error;
    }
  }

  /**
   * Handle payment failure
   */
  async handlePaymentFailure(orderId, reason) {
    try {
      const payment = await TourismPayment.findOne({ providerOrderId: orderId });
      if (payment) {
        await payment.markFailed(reason);
        logger.info(`Payment marked as failed: ${payment.orderId}`);
      }
    } catch (error) {
      logger.error('Error handling payment failure:', error);
    }
  }

  /**
   * Create refund
   */
  async createRefund(paymentId, amount, reason) {
    try {
      if (!this.razorpay) {
        throw new Error('Razorpay not initialized');
      }

      const payment = await TourismPayment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'success') {
        throw new Error('Can only refund successful payments');
      }

      // Create refund in Razorpay
      const refund = await this.razorpay.payments.refund(payment.providerPaymentId, {
        amount: Math.round(amount * 100),
        notes: {
          reason,
          bookingId: payment.bookingId.toString(),
        },
      });

      // Update payment record
      await payment.processRefund(amount, refund.id);

      // Update booking
      const booking = await TourismBooking.findById(payment.bookingId);
      if (booking) {
        await booking.initiateRefund(amount, reason);
        booking.refundStatus = 'completed';
        booking.refundedAt = new Date();
        await booking.save();
      }

      logger.info(`Refund processed: ${refund.id} for payment ${paymentId}`);

      return {
        success: true,
        refund,
        payment,
      };
    } catch (error) {
      logger.error('Error creating refund:', error);
      throw error;
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(paymentId) {
    try {
      const payment = await TourismPayment.findById(paymentId).populate('bookingId');
      return payment;
    } catch (error) {
      logger.error('Error fetching payment details:', error);
      throw error;
    }
  }

  /**
   * Manual payment entry (for cash/bank transfer)
   */
  async recordManualPayment(bookingId, amount, paymentMethod, reference, notes) {
    try {
      const booking = await TourismBooking.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Create payment record
      const payment = new TourismPayment({
        bookingId,
        provider: 'manual',
        amount,
        currency: 'INR',
        paymentType: amount >= booking.amountSummary.totalAmount ? 'full' : 'advance',
        paymentMethod,
        status: 'success',
        reference,
        notes,
        capturedAt: new Date(),
        metadata: {
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
          packageTitle: booking.packageTitle,
          travelDate: booking.travelDate,
        },
      });

      await payment.save();

      // Update booking
      await booking.markPaymentCompleted(amount, reference);
      await booking.addStatusHistory('paid', 'admin', `Manual payment recorded: ${paymentMethod}`);

      logger.info(`Manual payment recorded: ${payment.orderId} for booking ${bookingId}`);

      return {
        success: true,
        payment,
        booking,
      };
    } catch (error) {
      logger.error('Error recording manual payment:', error);
      throw error;
    }
  }

  /**
   * Webhook handler for Razorpay events
   */
  async handleWebhook(event, payload) {
    try {
      logger.info(`Processing Razorpay webhook: ${event}`);

      switch (event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(payload);
          break;
        case 'payment.failed':
          await this.handlePaymentFailedWebhook(payload);
          break;
        case 'refund.created':
          await this.handleRefundCreated(payload);
          break;
        default:
          logger.info(`Unhandled webhook event: ${event}`);
      }
    } catch (error) {
      logger.error('Error handling webhook:', error);
      throw error;
    }
  }

  async handlePaymentCaptured(payload) {
    const { order_id, id: payment_id } = payload.payment.entity;
    const payment = await TourismPayment.findOne({ providerOrderId: order_id });
    
    if (payment && payment.status !== 'success') {
      await payment.markSuccess(payment_id, '');
      
      const booking = await TourismBooking.findById(payment.bookingId);
      if (booking) {
        await booking.markPaymentCompleted(payment.amount, payment_id);
      }
    }
  }

  async handlePaymentFailedWebhook(payload) {
    const { order_id } = payload.payment.entity;
    const payment = await TourismPayment.findOne({ providerOrderId: order_id });
    
    if (payment) {
      await payment.markFailed(payload.payment.entity.error_description);
    }
  }

  async handleRefundCreated(payload) {
    const { payment_id, id: refund_id, amount } = payload.refund.entity;
    const payment = await TourismPayment.findOne({ providerPaymentId: payment_id });
    
    if (payment && payment.status !== 'refunded') {
      await payment.processRefund(amount / 100, refund_id);
    }
  }
}

module.exports = new TourismPaymentService();
