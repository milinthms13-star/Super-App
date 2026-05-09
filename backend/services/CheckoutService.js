/**
 * CheckoutService.js
 * Phase 5D - Orchestrates complete checkout flow
 */

const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Invoice = require('../models/Invoice');
const Subscription = require('../models/Subscription');
const crypto = require('crypto');
const logger = require('../utils/logger');

class CheckoutService {
  static instance;

  static getInstance() {
    if (!this.instance) {
      this.instance = new CheckoutService();
    }
    return this.instance;
  }

  /**
   * Validate cart items and calculate totals
   */
  async validateCartAndCalculateTotals(userId, items, couponCode = null) {
    try {
      const validationResult = {
        items: [],
        subtotal: 0,
        discounts: 0,
        taxes: 0,
        deliveryFee: 0,
        total: 0,
        appliedCoupon: null,
        errors: [],
      };

      // Validate and fetch all products
      for (const item of items) {
        const product = await Product.findById(item.productId);
        
        if (!product) {
          validationResult.errors.push(`Product ${item.productId} not found`);
          continue;
        }

        if (product.stock < item.quantity) {
          validationResult.errors.push(
            `Insufficient stock for ${product.name}. Available: ${product.stock}`
          );
          continue;
        }

        const itemPrice = product.price * item.quantity;
        validationResult.items.push({
          ...item,
          productId: product._id,
          name: product.name,
          price: product.price,
          itemTotal: itemPrice,
        });

        validationResult.subtotal += itemPrice;
      }

      if (validationResult.items.length === 0) {
        throw new Error('No valid items in cart');
      }

      // Apply coupon if provided
      if (couponCode) {
        const coupon = await Coupon.findOne({ code: couponCode });
        
        if (!coupon) {
          validationResult.errors.push('Coupon code not found');
        } else if (!coupon.isActive) {
          validationResult.errors.push('Coupon is inactive');
        } else if (coupon.expiryDate && coupon.expiryDate < new Date()) {
          validationResult.errors.push('Coupon has expired');
        } else if (coupon.minOrderValue && validationResult.subtotal < coupon.minOrderValue) {
          validationResult.errors.push(
            `Minimum order value of ₹${coupon.minOrderValue} required for this coupon`
          );
        } else {
          const discountAmount = (validationResult.subtotal * coupon.discountPercentage) / 100;
          const maxDiscount = coupon.maxDiscount || Infinity;
          
          validationResult.discounts = Math.min(discountAmount, maxDiscount);
          validationResult.appliedCoupon = {
            code: coupon.code,
            discountPercentage: coupon.discountPercentage,
            discountAmount: validationResult.discounts,
          };
        }
      }

      // Calculate taxes (GST: 5-28% depending on product category)
      validationResult.taxes = this.calculateGST(validationResult.items);

      // Calculate delivery fee (flat ₹50 + ₹10 per item for orders > ₹500)
      validationResult.deliveryFee = this.calculateDeliveryFee(validationResult.items, validationResult.subtotal);

      // Calculate final total
      validationResult.total = 
        validationResult.subtotal + 
        validationResult.taxes + 
        validationResult.deliveryFee - 
        validationResult.discounts;

      return validationResult;
    } catch (error) {
      logger.error('Error validating cart:', error);
      throw error;
    }
  }

  /**
   * Calculate GST based on product categories
   */
  calculateGST(items) {
    const gstRates = {
      'Electronics': 0.18,
      'Fashion': 0.12,
      'Home & Kitchen': 0.12,
      'Books': 0.00,
      'Food': 0.05,
      'Jewelry': 0.12,
      'Luxury': 0.28,
    };

    let totalGST = 0;

    items.forEach(item => {
      const rate = gstRates[item.category] || 0.12;
      totalGST += item.itemTotal * rate;
    });

    return Math.round(totalGST * 100) / 100;
  }

  /**
   * Calculate delivery fee
   */
  calculateDeliveryFee(items, subtotal) {
    if (subtotal > 500) {
      return 50 + (items.length * 10);
    }
    return 100;
  }

  /**
   * Create order with payment initialization
   */
  async createOrder(userId, checkoutData) {
    try {
      const {
        items,
        deliveryAddress,
        paymentMethod,
        paymentGateway,
        couponCode = null,
      } = checkoutData;

      // Validate cart
      const cartValidation = await this.validateCartAndCalculateTotals(
        userId,
        items,
        couponCode
      );

      if (cartValidation.errors.length > 0) {
        throw new Error(`Checkout validation failed: ${cartValidation.errors.join(', ')}`);
      }

      // Create order
      const order = new Order({
        userId,
        items: cartValidation.items,
        subtotal: cartValidation.subtotal,
        discountAmount: cartValidation.discounts,
        taxAmount: cartValidation.taxes,
        deliveryFee: cartValidation.deliveryFee,
        total: cartValidation.total,
        deliveryAddress,
        coupon: cartValidation.appliedCoupon,
        paymentMethod,
        paymentGateway,
        status: 'Pending Payment',
        createdAt: new Date(),
      });

      await order.save();

      logger.info(`Order created: ${order._id} for user: ${userId}`);

      return {
        orderId: order._id,
        amount: cartValidation.total,
        items: cartValidation.items,
        breakdown: {
          subtotal: cartValidation.subtotal,
          taxes: cartValidation.taxes,
          delivery: cartValidation.deliveryFee,
          discount: cartValidation.discounts,
          total: cartValidation.total,
        },
      };
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Initialize payment with gateway (Razorpay/Stripe)
   */
  async initializePayment(orderId, userId, gateway = 'razorpay') {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Create payment record
      const paymentRecord = new Payment({
        orderId: order._id.toString(),
        userId,
        amount: order.total,
        currency: 'INR',
        paymentMethod: order.paymentMethod,
        paymentGateway: gateway,
        status: 'pending',
        notes: {
          orderId: order._id.toString(),
          userId,
          userEmail: order.customerEmail,
        },
      });

      await paymentRecord.save();

      // Generate payment details based on gateway
      let paymentDetails;

      if (gateway === 'razorpay') {
        paymentDetails = await this.generateRazorpayPaymentOrder(paymentRecord, order);
      } else if (gateway === 'stripe') {
        paymentDetails = await this.generateStripePaymentIntent(paymentRecord, order);
      } else {
        throw new Error(`Unsupported payment gateway: ${gateway}`);
      }

      return {
        paymentId: paymentRecord._id,
        orderId,
        gateway,
        amount: order.total,
        currency: 'INR',
        ...paymentDetails,
      };
    } catch (error) {
      logger.error('Error initializing payment:', error);
      throw error;
    }
  }

  /**
   * Generate Razorpay order
   */
  async generateRazorpayPaymentOrder(paymentRecord, order) {
    try {
      const razorpay = require('razorpay');
      const client = new razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const options = {
        amount: Math.round(order.total * 100), // Amount in paise
        currency: 'INR',
        receipt: `order_${order._id}`,
        payment_capture: 1,
        notes: {
          orderId: order._id.toString(),
          userId: order.userId.toString(),
        },
      };

      const razorpayOrder = await client.orders.create(options);

      // Update payment record with Razorpay order ID
      paymentRecord.gatewayOrderId = razorpayOrder.id;
      paymentRecord.status = 'initiated';
      await paymentRecord.save();

      return {
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      };
    } catch (error) {
      logger.error('Error generating Razorpay order:', error);
      throw error;
    }
  }

  /**
   * Generate Stripe payment intent
   */
  async generateStripePaymentIntent(paymentRecord, order) {
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(order.total * 100), // Amount in cents
        currency: 'inr',
        metadata: {
          orderId: order._id.toString(),
          userId: order.userId.toString(),
        },
      });

      // Update payment record with Stripe details
      paymentRecord.gatewayTransactionId = paymentIntent.id;
      paymentRecord.status = 'initiated';
      await paymentRecord.save();

      return {
        stripePaymentIntentId: paymentIntent.id,
        stripeClientSecret: paymentIntent.client_secret,
        stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
      };
    } catch (error) {
      logger.error('Error generating Stripe payment intent:', error);
      throw error;
    }
  }

  /**
   * Verify payment from gateway
   */
  async verifyPayment(paymentId, verificationData) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      let isValid = false;

      if (payment.paymentGateway === 'razorpay') {
        isValid = this.verifyRazorpayPayment(payment, verificationData);
      } else if (payment.paymentGateway === 'stripe') {
        isValid = await this.verifyStripePayment(payment, verificationData);
      }

      if (!isValid) {
        payment.status = 'failed';
        payment.failureReason = 'Payment verification failed';
        await payment.save();
        throw new Error('Payment verification failed');
      }

      // Payment verified, update status
      payment.status = 'verified';
      payment.verifiedAt = new Date();
      await payment.save();

      // Update order status
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.status = 'Confirmed';
        order.paymentDetails = {
          status: 'captured',
          amount: payment.amount,
          gateway: payment.paymentGateway,
          transactionId: payment.gatewayTransactionId,
        };
        await order.save();
      }

      return { success: true, paymentId };
    } catch (error) {
      logger.error('Error verifying payment:', error);
      throw error;
    }
  }

  /**
   * Verify Razorpay payment
   */
  verifyRazorpayPayment(payment, verificationData) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = verificationData;

      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      return expectedSignature === razorpay_signature;
    } catch (error) {
      logger.error('Error verifying Razorpay payment:', error);
      return false;
    }
  }

  /**
   * Verify Stripe payment
   */
  async verifyStripePayment(payment, verificationData) {
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const { stripePaymentIntentId } = verificationData;

      const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);

      return (
        paymentIntent.status === 'succeeded' &&
        paymentIntent.amount === Math.round(payment.amount * 100)
      );
    } catch (error) {
      logger.error('Error verifying Stripe payment:', error);
      return false;
    }
  }

  /**
   * Process refund
   */
  async processRefund(orderId, reason = 'Customer requested') {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const payment = await Payment.findOne({ orderId });
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.paymentGateway === 'razorpay') {
        await this.refundViaRazorpay(payment, reason);
      } else if (payment.paymentGateway === 'stripe') {
        await this.refundViaStripe(payment, reason);
      }

      // Update order status
      order.status = 'Refunded';
      order.refundDetails = {
        reason,
        refundedAt: new Date(),
        amount: payment.amount,
      };
      await order.save();

      logger.info(`Refund processed for order: ${orderId}`);
      return { success: true, orderId };
    } catch (error) {
      logger.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Refund via Razorpay
   */
  async refundViaRazorpay(payment, reason) {
    try {
      const razorpay = require('razorpay');
      const client = new razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const refund = await client.payments.refund(payment.gatewayTransactionId, {
        amount: Math.round(payment.amount * 100),
        notes: { reason },
      });

      payment.status = 'refunded';
      payment.refundId = refund.id;
      payment.refundedAt = new Date();
      await payment.save();
    } catch (error) {
      logger.error('Error refunding via Razorpay:', error);
      throw error;
    }
  }

  /**
   * Refund via Stripe
   */
  async refundViaStripe(payment, reason) {
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      const refund = await stripe.refunds.create({
        payment_intent: payment.gatewayTransactionId,
        reason: 'requested_by_customer',
        metadata: { reason },
      });

      payment.status = 'refunded';
      payment.refundId = refund.id;
      payment.refundedAt = new Date();
      await payment.save();
    } catch (error) {
      logger.error('Error refunding via Stripe:', error);
      throw error;
    }
  }

  /**
   * Apply subscription benefits to order (if user has active subscription)
   */
  async applySubscriptionBenefits(userId, order) {
    try {
      const subscription = await Subscription.findOne({
        userId,
        status: 'active',
      });

      if (!subscription) {
        return order;
      }

      // Apply subscription discounts/benefits
      const discountPercentage = this.getSubscriptionDiscount(subscription.planTier);
      const discountAmount = (order.subtotal * discountPercentage) / 100;

      order.subscriptionDiscount = {
        tier: subscription.planTier,
        discountPercentage,
        discountAmount,
      };

      order.total -= discountAmount;

      return order;
    } catch (error) {
      logger.error('Error applying subscription benefits:', error);
      return order;
    }
  }

  /**
   * Get subscription discount based on tier
   */
  getSubscriptionDiscount(tier) {
    const discounts = {
      'free': 0,
      'silver': 5,
      'gold': 10,
      'platinum': 15,
      'vip': 20,
    };
    return discounts[tier] || 0;
  }
}

module.exports = CheckoutService.getInstance();
