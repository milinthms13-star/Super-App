const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Razorpay = require('razorpay');
const logger = require('./logger');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// PCI Compliance: NEVER store card details
// Use tokenization + 3DS everywhere

async function createStripePaymentIntent(amountInPaise, metadata = {}) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPaise,
      currency: 'inr',
      metadata: {
        ...metadata,
        integration_check: 'accept_a_payment' // Stripe compliance check
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    };
  } catch (error) {
    logger.error('Stripe PaymentIntent failed:', error);
    throw new Error(`Payment initialization failed: ${error.message}`);
  }
}

async function verifyStripePaymentIntent(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        payment_intent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          status: paymentIntent.status,
          customer: paymentIntent.customer || null
        }
      };
    }

    throw new Error(`Payment not completed: ${paymentIntent.status}`);
  } catch (error) {
    logger.error('Stripe verification failed:', error);
    throw error;
  }
}

async function createRazorpayPaymentIntent(amountInPaise, currency = 'INR', receipt = null) {
  try {
    const options = {
      amount: amountInPaise,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    return {
      razorpay_order_id: order.id,
      razorpay_amount: order.amount,
      razorpay_currency: order.currency
    };
  } catch (error) {
    logger.error('Razorpay order creation failed:', error);
    throw new Error(`Razorpay initialization failed: ${error.description}`);
  }
}

module.exports = {
  createStripePaymentIntent,
  verifyStripePaymentIntent,
  createRazorpayPaymentIntent
};

