const stripeSdk = require('stripe');
const Razorpay = require('razorpay');
const logger = require('./logger');

const getStripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured.');
  }

  return stripeSdk(process.env.STRIPE_SECRET_KEY);
};

const getRazorpayClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay is not configured.');
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const buildPaymentSecurityProfile = (gateway = '') => ({
  gateway,
  tokenized: true,
  tokenizationMode:
    gateway === 'stripe'
      ? 'stripe-hosted-checkout'
      : gateway === 'razorpay'
        ? 'razorpay-hosted-checkout'
        : gateway === 'wallet'
          ? 'wallet-balance'
          : 'hosted-checkout',
  threeDSecure: ['cash_on_delivery', 'wallet'].includes(gateway) ? 'not_applicable' : 'required',
  cardDataStored: false,
  pciScope: 'saq-a-like-hosted-checkout',
});

async function createStripePaymentIntent(amountInPaise, metadata = {}) {
  try {
    const stripe = getStripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPaise,
      currency: 'inr',
      metadata: {
        ...metadata,
        tokenized: 'true',
      },
      automatic_payment_methods: {
        enabled: true,
      },
      payment_method_options: {
        card: {
          request_three_d_secure: 'any',
        },
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      securityProfile: buildPaymentSecurityProfile('stripe'),
    };
  } catch (error) {
    logger.error('Stripe PaymentIntent failed:', error);
    throw new Error(`Payment initialization failed: ${error.message}`);
  }
}

async function verifyStripePaymentIntent(paymentIntentId) {
  try {
    const stripe = getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      success: paymentIntent.status === 'succeeded',
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        status: paymentIntent.status,
        customer: paymentIntent.customer || null,
      },
      securityProfile: buildPaymentSecurityProfile('stripe'),
    };
  } catch (error) {
    logger.error('Stripe verification failed:', error);
    throw error;
  }
}

async function createRazorpayPaymentIntent(amountInPaise, currency = 'INR', receipt = null, notes = {}) {
  try {
    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: {
        ...notes,
        tokenized: 'true',
      },
    });

    return {
      razorpayOrderId: order.id,
      razorpayAmount: order.amount,
      razorpayCurrency: order.currency,
      securityProfile: buildPaymentSecurityProfile('razorpay'),
    };
  } catch (error) {
    logger.error('Razorpay order creation failed:', error);
    throw new Error(`Razorpay initialization failed: ${error.description || error.message}`);
  }
}

module.exports = {
  buildPaymentSecurityProfile,
  createRazorpayPaymentIntent,
  createStripePaymentIntent,
  verifyStripePaymentIntent,
};
