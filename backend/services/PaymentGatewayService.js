const Razorpay = require('razorpay');
const Stripe = require('stripe');
const crypto = require('crypto');

const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || 'razorpay'; // 'razorpay' or 'stripe'
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

let razorpayInstance = null;
let stripeInstance = null;

const initializeRazorpay = () => {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    console.warn('[PaymentGatewayService] Razorpay credentials not configured');
    return null;
  }

  return new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
};

const initializeStripe = () => {
  if (!STRIPE_SECRET_KEY) {
    console.warn('[PaymentGatewayService] Stripe secret key not configured');
    return null;
  }

  return Stripe(STRIPE_SECRET_KEY);
};

const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    razorpayInstance = initializeRazorpay();
  }
  return razorpayInstance;
};

const getStripeInstance = () => {
  if (!stripeInstance) {
    stripeInstance = initializeStripe();
  }
  return stripeInstance;
};

/**
 * Create payment order
 */
const createPaymentOrder = async ({ amount, currency = 'INR', receipt, notes = {} }) => {
  try {
    if (PAYMENT_PROVIDER === 'razorpay') {
      const razorpay = getRazorpayInstance();
      if (!razorpay) {
        return {
          success: false,
          error: 'Razorpay not configured',
          provider: 'simulated',
          orderId: `SIM-${Date.now()}`,
          amount,
          currency,
        };
      }

      const order = await razorpay.orders.create({
        amount: amount * 100, // Razorpay expects amount in paise
        currency,
        receipt,
        notes,
      });

      return {
        success: true,
        provider: 'razorpay',
        orderId: order.id,
        amount: order.amount / 100,
        currency: order.currency,
        status: order.status,
      };
    } else if (PAYMENT_PROVIDER === 'stripe') {
      const stripe = getStripeInstance();
      if (!stripe) {
        return {
          success: false,
          error: 'Stripe not configured',
          provider: 'simulated',
          orderId: `SIM-${Date.now()}`,
          amount,
          currency,
        };
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe expects amount in cents
        currency: currency.toLowerCase(),
        metadata: { receipt, ...notes },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        provider: 'stripe',
        orderId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: paymentIntent.status,
      };
    } else {
      // Simulated payment
      return {
        success: true,
        provider: 'simulated',
        orderId: `SIM-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        amount,
        currency,
        status: 'created',
      };
    }
  } catch (error) {
    console.error('[PaymentGatewayService] Create order error:', error);
    return {
      success: false,
      error: error.message,
      provider: PAYMENT_PROVIDER,
    };
  }
};

/**
 * Verify payment signature (Razorpay)
 */
const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  try {
    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return false;
    }

    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('[PaymentGatewayService] Signature verification error:', error);
    return false;
  }
};

/**
 * Verify Stripe webhook signature
 */
const verifyStripeWebhook = (payload, signature) => {
  try {
    const stripe = getStripeInstance();
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      return null;
    }

    const event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
    return event;
  } catch (error) {
    console.error('[PaymentGatewayService] Stripe webhook verification error:', error);
    return null;
  }
};

/**
 * Capture payment
 */
const capturePayment = async ({ paymentId, amount }) => {
  try {
    if (PAYMENT_PROVIDER === 'razorpay') {
      const razorpay = getRazorpayInstance();
      if (!razorpay) {
        return {
          success: true,
          provider: 'simulated',
          paymentId,
          amount,
          status: 'captured',
        };
      }

      const payment = await razorpay.payments.capture(paymentId, amount * 100);

      return {
        success: true,
        provider: 'razorpay',
        paymentId: payment.id,
        amount: payment.amount / 100,
        status: payment.status,
        method: payment.method,
      };
    } else if (PAYMENT_PROVIDER === 'stripe') {
      const stripe = getStripeInstance();
      if (!stripe) {
        return {
          success: true,
          provider: 'simulated',
          paymentId,
          amount,
          status: 'captured',
        };
      }

      const paymentIntent = await stripe.paymentIntents.capture(paymentId);

      return {
        success: true,
        provider: 'stripe',
        paymentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        status: paymentIntent.status,
      };
    } else {
      return {
        success: true,
        provider: 'simulated',
        paymentId,
        amount,
        status: 'captured',
      };
    }
  } catch (error) {
    console.error('[PaymentGatewayService] Capture payment error:', error);
    return {
      success: false,
      error: error.message,
      provider: PAYMENT_PROVIDER,
    };
  }
};

/**
 * Refund payment
 */
const refundPayment = async ({ paymentId, amount, reason = 'requested_by_customer' }) => {
  try {
    if (PAYMENT_PROVIDER === 'razorpay') {
      const razorpay = getRazorpayInstance();
      if (!razorpay) {
        return {
          success: true,
          provider: 'simulated',
          refundId: `REFUND-SIM-${Date.now()}`,
          paymentId,
          amount,
          status: 'processed',
        };
      }

      const refund = await razorpay.payments.refund(paymentId, {
        amount: amount ? amount * 100 : undefined, // Full refund if amount not specified
        notes: { reason },
      });

      return {
        success: true,
        provider: 'razorpay',
        refundId: refund.id,
        paymentId: refund.payment_id,
        amount: refund.amount / 100,
        status: refund.status,
      };
    } else if (PAYMENT_PROVIDER === 'stripe') {
      const stripe = getStripeInstance();
      if (!stripe) {
        return {
          success: true,
          provider: 'simulated',
          refundId: `REFUND-SIM-${Date.now()}`,
          paymentId,
          amount,
          status: 'processed',
        };
      }

      const refund = await stripe.refunds.create({
        payment_intent: paymentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason,
      });

      return {
        success: true,
        provider: 'stripe',
        refundId: refund.id,
        paymentId: refund.payment_intent,
        amount: refund.amount / 100,
        status: refund.status,
      };
    } else {
      return {
        success: true,
        provider: 'simulated',
        refundId: `REFUND-SIM-${Date.now()}`,
        paymentId,
        amount,
        status: 'processed',
      };
    }
  } catch (error) {
    console.error('[PaymentGatewayService] Refund error:', error);
    return {
      success: false,
      error: error.message,
      provider: PAYMENT_PROVIDER,
    };
  }
};

/**
 * Get payment status
 */
const getPaymentStatus = async (paymentId) => {
  try {
    if (PAYMENT_PROVIDER === 'razorpay') {
      const razorpay = getRazorpayInstance();
      if (!razorpay) {
        return {
          success: true,
          provider: 'simulated',
          paymentId,
          status: 'captured',
        };
      }

      const payment = await razorpay.payments.fetch(paymentId);

      return {
        success: true,
        provider: 'razorpay',
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        createdAt: new Date(payment.created_at * 1000),
      };
    } else if (PAYMENT_PROVIDER === 'stripe') {
      const stripe = getStripeInstance();
      if (!stripe) {
        return {
          success: true,
          provider: 'simulated',
          paymentId,
          status: 'succeeded',
        };
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);

      return {
        success: true,
        provider: 'stripe',
        paymentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: paymentIntent.status,
        createdAt: new Date(paymentIntent.created * 1000),
      };
    } else {
      return {
        success: true,
        provider: 'simulated',
        paymentId,
        status: 'captured',
      };
    }
  } catch (error) {
    console.error('[PaymentGatewayService] Get payment status error:', error);
    return {
      success: false,
      error: error.message,
      provider: PAYMENT_PROVIDER,
    };
  }
};

/**
 * Create installment plan
 */
const createInstallmentPlan = async ({
  orderId,
  totalAmount,
  numberOfInstallments = 3,
  firstPaymentAmount,
  frequency = 'monthly',
  startDate,
  customerInfo,
}) => {
  try {
    if (numberOfInstallments < 2 || numberOfInstallments > 12) {
      return {
        success: false,
        error: 'Number of installments must be between 2 and 12',
      };
    }

    const now = new Date();
    const planStartDate = startDate ? new Date(startDate) : now;
    
    // Calculate installment amounts
    const firstPayment = firstPaymentAmount || Math.ceil(totalAmount / numberOfInstallments);
    const remainingAmount = totalAmount - firstPayment;
    const subsequentInstallmentAmount = Math.ceil(remainingAmount / (numberOfInstallments - 1));
    
    // Generate installment schedule
    const schedule = [];
    let currentDate = new Date(planStartDate);
    
    // First installment
    schedule.push({
      installmentNumber: 1,
      amount: firstPayment,
      dueDate: new Date(currentDate),
      status: 'pending',
      type: 'down_payment',
    });
    
    // Subsequent installments
    for (let i = 2; i <= numberOfInstallments; i++) {
      // Calculate next due date based on frequency
      if (frequency === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else if (frequency === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (frequency === 'biweekly') {
        currentDate.setDate(currentDate.getDate() + 14);
      }
      
      const installmentAmount = i === numberOfInstallments
        ? totalAmount - firstPayment - (subsequentInstallmentAmount * (numberOfInstallments - 2))
        : subsequentInstallmentAmount;
      
      schedule.push({
        installmentNumber: i,
        amount: installmentAmount,
        dueDate: new Date(currentDate),
        status: 'scheduled',
        type: 'regular',
      });
    }
    
    const planId = `PLAN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    
    return {
      success: true,
      planId,
      orderId,
      totalAmount,
      numberOfInstallments,
      frequency,
      startDate: planStartDate,
      schedule,
      customerInfo,
      status: 'active',
      createdAt: now,
    };
  } catch (error) {
    console.error('[PaymentGatewayService] Create installment plan error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Process installment payment
 */
const processInstallmentPayment = async ({ planId, installmentNumber, paymentMethod }) => {
  try {
    // In production, retrieve plan from database and process payment
    return {
      success: true,
      planId,
      installmentNumber,
      paymentId: `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      status: 'completed',
      paidAt: new Date(),
      message: `Installment ${installmentNumber} paid successfully`,
    };
  } catch (error) {
    console.error('[PaymentGatewayService] Process installment payment error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Calculate insurance co-pay amount
 */
const calculateInsuranceCoPay = async ({
  totalAmount,
  insuranceProvider,
  policyNumber,
  treatmentType,
  patientInfo,
}) => {
  try {
    // Insurance coverage rates by provider and treatment type (simplified for demo)
    const coverageRates = {
      'Star Health': {
        'consultation': 0.80, // 80% coverage
        'lab_tests': 0.70,
        'surgery': 0.85,
        'medication': 0.60,
        'emergency': 0.90,
      },
      'ICICI Lombard': {
        'consultation': 0.75,
        'lab_tests': 0.75,
        'surgery': 0.80,
        'medication': 0.50,
        'emergency': 0.85,
      },
      'Max Bupa': {
        'consultation': 0.70,
        'lab_tests': 0.65,
        'surgery': 0.75,
        'medication': 0.55,
        'emergency': 0.80,
      },
      'HDFC Ergo': {
        'consultation': 0.75,
        'lab_tests': 0.70,
        'surgery': 0.85,
        'medication': 0.60,
        'emergency': 0.90,
      },
    };
    
    const providerRates = coverageRates[insuranceProvider] || {
      'consultation': 0.50,
      'lab_tests': 0.50,
      'surgery': 0.60,
      'medication': 0.40,
      'emergency': 0.70,
    };
    
    const coverageRate = providerRates[treatmentType] || 0.50;
    const insuranceCoverage = Math.floor(totalAmount * coverageRate);
    const coPayAmount = totalAmount - insuranceCoverage;
    
    // Generate claim reference
    const claimReference = `CLM-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    
    return {
      success: true,
      claimReference,
      totalAmount,
      insuranceProvider,
      policyNumber,
      treatmentType,
      coverageRate: coverageRate * 100, // Convert to percentage
      insuranceCoverage,
      coPayAmount,
      patientResponsibility: coPayAmount,
      breakdown: {
        totalBill: totalAmount,
        insurancePays: insuranceCoverage,
        patientPays: coPayAmount,
      },
      status: 'calculated',
      calculatedAt: new Date(),
    };
  } catch (error) {
    console.error('[PaymentGatewayService] Calculate co-pay error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Process co-pay payment with insurance claim
 */
const processCoPayPayment = async ({
  claimReference,
  coPayAmount,
  paymentMethod,
  insuranceDetails,
}) => {
  try {
    // Create payment order for co-pay amount
    const paymentOrder = await createPaymentOrder({
      amount: coPayAmount,
      currency: insuranceDetails.currency || 'INR',
      receipt: claimReference,
      notes: {
        type: 'co_pay',
        claimReference,
        insuranceProvider: insuranceDetails.insuranceProvider,
        policyNumber: insuranceDetails.policyNumber,
      },
    });
    
    if (!paymentOrder.success) {
      return paymentOrder;
    }
    
    return {
      success: true,
      claimReference,
      paymentOrderId: paymentOrder.orderId,
      coPayAmount,
      insuranceCoverage: insuranceDetails.insuranceCoverage,
      totalAmount: coPayAmount + insuranceDetails.insuranceCoverage,
      status: 'payment_pending',
      message: 'Co-pay payment order created. Insurance claim will be filed after payment completion.',
    };
  } catch (error) {
    console.error('[PaymentGatewayService] Process co-pay payment error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * File insurance claim
 */
const fileInsuranceClaim = async ({
  claimReference,
  insuranceProvider,
  policyNumber,
  treatmentDetails,
  paymentProof,
  patientInfo,
}) => {
  try {
    // In production, this would integrate with insurance provider APIs
    // For demo, simulate claim filing
    
    const claimId = `CLAIM-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    
    return {
      success: true,
      claimId,
      claimReference,
      insuranceProvider,
      policyNumber,
      treatmentDetails,
      status: 'submitted',
      expectedProcessingDays: 7,
      submittedAt: new Date(),
      estimatedResolutionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      message: 'Insurance claim submitted successfully. You will receive updates via email and SMS.',
    };
  } catch (error) {
    console.error('[PaymentGatewayService] File insurance claim error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Generate invoice with detailed breakdown
 */
const generateInvoice = async ({
  orderId,
  items,
  customerInfo,
  amount,
  currency = 'INR',
  paymentBreakdown,
  installmentPlan,
}) => {
  const invoiceNumber = `INV-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const invoiceDate = new Date();
  
  // Calculate tax (GST for India)
  const taxRate = 0.18; // 18% GST
  const subtotal = amount / (1 + taxRate);
  const tax = amount - subtotal;
  
  const invoice = {
    invoiceNumber,
    invoiceDate,
    orderId,
    customerInfo,
    items: items.map(item => ({
      ...item,
      subtotal: item.quantity * item.price,
    })),
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    taxRate: taxRate * 100,
    total: amount,
    currency,
    status: 'paid',
    paymentMethod: 'online',
  };
  
  // Add payment breakdown if insurance co-pay
  if (paymentBreakdown) {
    invoice.paymentBreakdown = {
      insurancePaid: paymentBreakdown.insuranceCoverage || 0,
      patientPaid: paymentBreakdown.coPayAmount || 0,
      claimReference: paymentBreakdown.claimReference,
    };
  }
  
  // Add installment plan info
  if (installmentPlan) {
    invoice.installmentPlan = {
      planId: installmentPlan.planId,
      totalInstallments: installmentPlan.numberOfInstallments,
      paidInstallments: installmentPlan.paidCount || 1,
      nextDueDate: installmentPlan.nextDueDate,
      remainingAmount: installmentPlan.remainingAmount || 0,
    };
  }
  
  return invoice;
};

/**
 * Get refund status
 */
const getRefundStatus = async (refundId) => {
  try {
    if (PAYMENT_PROVIDER === 'razorpay') {
      const razorpay = getRazorpayInstance();
      if (!razorpay) {
        return {
          success: true,
          provider: 'simulated',
          refundId,
          status: 'processed',
        };
      }

      const refund = await razorpay.refunds.fetch(refundId);

      return {
        success: true,
        provider: 'razorpay',
        refundId: refund.id,
        paymentId: refund.payment_id,
        amount: refund.amount / 100,
        status: refund.status,
        createdAt: new Date(refund.created_at * 1000),
      };
    } else if (PAYMENT_PROVIDER === 'stripe') {
      const stripe = getStripeInstance();
      if (!stripe) {
        return {
          success: true,
          provider: 'simulated',
          refundId,
          status: 'succeeded',
        };
      }

      const refund = await stripe.refunds.retrieve(refundId);

      return {
        success: true,
        provider: 'stripe',
        refundId: refund.id,
        paymentId: refund.payment_intent,
        amount: refund.amount / 100,
        status: refund.status,
        createdAt: new Date(refund.created * 1000),
      };
    } else {
      return {
        success: true,
        provider: 'simulated',
        refundId,
        status: 'processed',
      };
    }
  } catch (error) {
    console.error('[PaymentGatewayService] Get refund status error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  createPaymentOrder,
  verifyRazorpaySignature,
  verifyStripeWebhook,
  capturePayment,
  refundPayment,
  getPaymentStatus,
  getRefundStatus,
  generateInvoice,
  createInstallmentPlan,
  processInstallmentPayment,
  calculateInsuranceCoPay,
  processCoPayPayment,
  fileInsuranceClaim,
};
