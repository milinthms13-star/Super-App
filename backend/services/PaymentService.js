const crypto = require('crypto');
const Razorpay = require('razorpay');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

// Create Razorpay order
const createRazorpayOrder = async ({ amount, currency = 'INR', notes = {} }) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }

    const options = {
      amount: Math.round(amount * 100), // Amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
      notes,
    };

    const order = await razorpayInstance.orders.create(options);

    return {
      paymentId: `payment-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      orderId: order.receipt,
      razorpayOrderId: order.id,
      amount,
      currency,
      notes,
    };
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw new Error(`Failed to create payment order: ${error.message}`);
  }
};

// Verify Razorpay signature
const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay key secret not configured');
    }

    const text = `${orderId}|${paymentId}`;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    return generated_signature === signature;
  } catch (error) {
    console.error('Razorpay signature verification error:', error);
    return false;
  }
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpaySignature,
};
