const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const crypto = require('crypto');
const BusinessServiceOrder = require('../models/BusinessServiceOrder');
const BusinessServiceCatalog = require('../models/BusinessServiceCatalog');
const BusinessServiceInteraction = require('../models/BusinessServiceInteraction');
const PaymentService = require('../services/PaymentService');
const PaymentGateway = require('../models/PaymentGateway');
const Payment = require('../models/Payment');
const GatewayIntegrations = require('../utils/GatewayIntegrations');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const { uploadBufferToGridFS } = require('../utils/gridfs');
const { generateGSTInvoice } = require('../utils/gstInvoice');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];
    // pdfkit + UI accept also .jpeg/.png; content-type can vary.
    const extOk = /\.(pdf|jpe?g|png)$/i.test(file.originalname || '');
    if (allowed.includes(file.mimetype) || extOk) return cb(null, true);
    return cb(new Error('Only PDF or JPG/PNG documents are allowed.'));
  },
});

const createOrderSchema = Joi.object({
  categoryId: Joi.string().trim().required(),
  categoryName: Joi.string().trim().allow('').default(''),
  serviceId: Joi.string().trim().required(),
  serviceName: Joi.string().trim().allow('').default(''),
  isStarterPackage: Joi.boolean().default(false),

  pricing: Joi.object({
    priceText: Joi.string().trim().allow('').default(''),
    priceNumber: Joi.number().min(0).default(0),
    durationText: Joi.string().trim().allow('').default(''),
  }).required(),

  formData: Joi.object().required(),
  requirements: Joi.string().trim().allow('').default(''),
  estimatedCompletion: Joi.date().iso().allow(null).optional(),
  // optional: uploaded docs will come from files
});

const statusUpdateSchema = Joi.object({
  status: Joi.string().trim().valid('submitted', 'under-review', 'processing', 'completed').required(),
  note: Joi.string().trim().allow('').default(''),
});

const interactionCreateSchema = Joi.object({
  interactionType: Joi.string()
    .trim()
    .valid('chat-request', 'call-request', 'consultation-request', 'vendor-contact-request')
    .required(),
  orderId: Joi.string().trim().allow('').default(''),
  categoryId: Joi.string().trim().allow('').default(''),
  serviceId: Joi.string().trim().allow('').default(''),
  notes: Joi.string().trim().allow('').default(''),
  metadata: Joi.object().unknown(true).default({}),
});

const parseMultipartJsonField = (value, fieldName) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const parseError = new Error(`${fieldName} must be a valid JSON object.`);
    parseError.statusCode = 400;
    throw parseError;
  }
};

const normalizeCreateOrderBody = (body = {}) => {
  const normalizedBody = { ...body };
  normalizedBody.pricing = parseMultipartJsonField(normalizedBody.pricing, 'pricing');
  normalizedBody.formData = parseMultipartJsonField(normalizedBody.formData, 'formData');
  if (normalizedBody.estimatedCompletion === '') {
    normalizedBody.estimatedCompletion = null;
  }
  return normalizedBody;
};

const getMyOrders = async (req) => {
  return BusinessServiceOrder.find({ customerEmail: req.user.email })
    .sort({ createdAt: -1 })
    .lean();
};

router.get('/catalog', async (_req, res) => {
  try {
    const catalog = await BusinessServiceCatalog.findOne({ key: 'default' }).lean();
    if (!catalog) {
      return res.status(404).json({
        success: false,
        message: 'Business services catalog is not configured in DB.',
      });
    }

    return res.json({
      success: true,
      data: {
        catalog,
      },
    });
  } catch (err) {
    logger.error('business-services get catalog error:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch business services catalog.',
    });
  }
});

router.post('/interactions', authenticate, async (req, res) => {
  try {
    const { error, value } = interactionCreateSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const interaction = await BusinessServiceInteraction.create({
      customerEmail: req.user.email,
      customerName: req.user.name || '',
      interactionType: value.interactionType,
      orderId: value.orderId,
      categoryId: value.categoryId,
      serviceId: value.serviceId,
      notes: value.notes,
      metadata: value.metadata,
      status: 'submitted',
    });

    return res.status(201).json({
      success: true,
      data: { interaction },
    });
  } catch (err) {
    logger.error('business-services create interaction error:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to create interaction request.',
    });
  }
});

router.post(
  '/orders',
  authenticate,
  upload.array('documents', 10),
  async (req, res) => {
    try {
      const normalizedBody = normalizeCreateOrderBody(req.body);
      const { error, value } = createOrderSchema.validate(normalizedBody, { stripUnknown: true });
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      const fileArray = Array.isArray(req.files) ? req.files : [];
      const uploadedDocs = [];
      for (const file of fileArray) {
        const storedFile = await uploadBufferToGridFS({
          buffer: file.buffer,
          filename: file.originalname || `${crypto.randomUUID()}.pdf`,
          contentType: file.mimetype || 'application/octet-stream',
          metadata: {
            category: 'business-services-docs',
            visibility: 'private',
            ownerEmail: req.user.email,
            scanned: false,
          },
        });

        uploadedDocs.push({
          fileId: storedFile.id,
          name: storedFile.filename,
          contentType: storedFile.contentType,
          size: fileArray.find((f) => f.originalname === file.originalname)?.size || 0,
          url: `/api/files/private/${storedFile.id}`, // client can stream via GET /api/files/private/:fileId
          uploadedAt: new Date(),
        });
      }

      const order = await BusinessServiceOrder.create({
        customerEmail: req.user.email,
        customerName: req.user.name || '',
        categoryId: value.categoryId,
        categoryName: value.categoryName,
        serviceId: value.serviceId,
        serviceName: value.serviceName,
        isStarterPackage: Boolean(value.isStarterPackage),
        pricing: value.pricing,
        status: 'submitted',
        paymentStatus: 'pending',
        paymentGateway: '',
        paymentMethod: '',
        paymentRecordId: '',
        paymentDetails: {},
        orderDate: new Date(),
        estimatedCompletion: value.estimatedCompletion ? new Date(value.estimatedCompletion) : null,
        formData: value.formData,
        requirements: value.requirements,
        documents: uploadedDocs,
        consultant: { assignedEmail: '', assignedName: '' },
        history: [
          {
            status: 'submitted',
            changedBy: req.user.email,
            note: 'Order submitted by customer',
          },
        ],
      });

      return res.status(201).json({ success: true, data: { order } });
    } catch (err) {
      if (err?.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      logger.error('business-services create order error:', err);
      return res.status(500).json({
        success: false,
        message: err?.message || 'Unable to create order.',
      });
    }
  }
);

router.post('/orders/:orderId/payments/initiate', authenticate, async (req, res) => {
  try {
    const { gateway = 'razorpay', paymentMethod = 'upi' } = req.body;
    const lowerGateway = String(gateway || 'razorpay').trim().toLowerCase();
    const lowerPaymentMethod = String(paymentMethod || 'upi').trim().toLowerCase();

    const order = await BusinessServiceOrder.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (String(order.customerEmail || '').toLowerCase() !== String(req.user.email || '').toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }

    const amount = Number(order.pricing?.priceNumber || 0);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount.' });
    }

    const payment = await PaymentService.createPayment({
      orderId: order._id.toString(),
      userId: req.user.id || req.user._id || req.user.email,
      amount,
      currency: 'INR',
      paymentMethod: lowerPaymentMethod,
      paymentGateway: lowerGateway,
      metadata: {
        orderType: 'business-services',
        serviceId: order.serviceId,
        serviceName: order.serviceName,
      },
    });

    const paymentGatewayConfig = await PaymentGateway.findOne({ gatewayName: lowerGateway, isActive: true }).select('+credentials');
    if (!paymentGatewayConfig) {
      return res.status(400).json({ success: false, message: `Payment gateway ${lowerGateway} is not configured.` });
    }

    const gatewayResult = await GatewayIntegrations.executeGatewayAction(paymentGatewayConfig, 'process', {
      orderId: order._id.toString(),
      amount,
      currency: 'INR',
      paymentMethod: lowerPaymentMethod,
      metadata: {
        businessServiceOrderId: order._id.toString(),
        customerEmail: req.user.email,
      },
    });

    if (!gatewayResult.success) {
      return res.status(500).json({ success: false, message: gatewayResult.error || 'Unable to initialize payment.' });
    }

    payment.gatewayOrderId = gatewayResult.orderId || gatewayResult.transactionId;
    payment.gatewayTransactionId = gatewayResult.transactionId || gatewayResult.orderId;
    payment.status = 'initiated';
    await payment.save();

    order.paymentStatus = 'pending';
    order.paymentGateway = lowerGateway;
    order.paymentMethod = lowerPaymentMethod;
    order.paymentRecordId = payment.paymentId;
    order.paymentDetails = {
      paymentId: payment.paymentId,
      gatewayOrderId: payment.gatewayOrderId,
      gatewayTransactionId: payment.gatewayTransactionId,
    };
    await order.save();

    return res.json({
      success: true,
      data: {
        paymentId: payment.paymentId,
        orderId: order._id.toString(),
        gateway: lowerGateway,
        amount,
        currency: 'INR',
        gatewayOrderId: payment.gatewayOrderId,
        gatewayTransactionId: payment.gatewayTransactionId,
        ...(lowerGateway === 'razorpay' ? { razorpayKeyId: paymentGatewayConfig.credentials.apiKey } : {}),
        ...(lowerGateway === 'stripe'
          ? {
              stripeClientSecret: gatewayResult.clientSecret,
              stripePublicKey: paymentGatewayConfig.credentials.publicKey,
            }
          : {}),
      },
    });
  } catch (err) {
    logger.error('business-services payment initiate error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Unable to initiate payment.' });
  }
});

router.post('/orders/:orderId/payments/verify', authenticate, async (req, res) => {
  try {
    const { paymentId, razorpay_payment_id, razorpay_order_id, razorpay_signature, stripePaymentIntentId } = req.body;
    const order = await BusinessServiceOrder.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (String(order.customerEmail || '').toLowerCase() !== String(req.user.email || '').toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }

    const payment = await Payment.findOne({ paymentId, orderId: order._id.toString() });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    const gatewayConfig = await PaymentGateway.findOne({ gatewayName: payment.paymentGateway, isActive: true }).select('+credentials');
    if (!gatewayConfig) {
      return res.status(400).json({ success: false, message: `Payment gateway ${payment.paymentGateway} is not configured.` });
    }

    let verified = false;
    if (payment.paymentGateway === 'razorpay') {
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Missing Razorpay verification fields.' });
      }

      const expectedSignature = crypto
        .createHmac('sha256', gatewayConfig.credentials.apiSecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Razorpay signature verification failed.' });
      }

      const razorpay = new (require('razorpay'))({
        key_id: gatewayConfig.credentials.apiKey,
        key_secret: gatewayConfig.credentials.apiSecret,
      });

      const paymentResult = await razorpay.payments.fetch(razorpay_payment_id);
      if (!paymentResult || paymentResult.status !== 'captured') {
        return res.status(400).json({ success: false, message: 'Payment not captured yet.' });
      }

      payment.gatewayTransactionId = razorpay_payment_id;
      payment.gatewayOrderId = razorpay_order_id;
      payment.status = 'captured';
      payment.transactionId = paymentResult.id;
      payment.paymentDetails = {
        ...payment.paymentDetails,
        razorpayStatus: paymentResult.status,
        razorpayMethod: paymentResult.method,
      };
      await payment.save();
      verified = true;
    } else if (payment.paymentGateway === 'stripe') {
      if (!stripePaymentIntentId) {
        return res.status(400).json({ success: false, message: 'Missing Stripe payment intent ID.' });
      }

      const stripe = require('stripe')(gatewayConfig.credentials.apiKey);
      const intent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
      if (!intent || intent.status !== 'succeeded') {
        return res.status(400).json({ success: false, message: 'Stripe payment not successful.' });
      }

      payment.gatewayTransactionId = stripePaymentIntentId;
      payment.status = 'captured';
      payment.transactionId = intent.id;
      payment.paymentDetails = {
        ...payment.paymentDetails,
        stripeStatus: intent.status,
      };
      await payment.save();
      verified = true;
    } else {
      return res.status(400).json({ success: false, message: `Unsupported payment gateway: ${payment.paymentGateway}` });
    }

    if (verified) {
      order.paymentStatus = 'paid';
      order.status = order.status === 'submitted' ? 'Confirmed' : order.status;
      order.paymentRecordId = payment.paymentId;
      order.paymentDetails = payment.paymentDetails || order.paymentDetails;
      order.history.push({
        status: order.status,
        changedBy: req.user.email,
        note: 'Payment verified for business service order',
      });
      await order.save();

      return res.json({ success: true, data: { order, payment } });
    }

    return res.status(500).json({ success: false, message: 'Unable to verify payment.' });
  } catch (err) {
    logger.error('business-services payment verification error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Unable to verify payment.' });
  }
});

router.get('/orders/me', authenticate, async (req, res) => {
  try {
    const orders = await getMyOrders(req);

    return res.json({
      success: true,
      data: {
        orders,
      },
    });
  } catch (err) {
    logger.error('business-services list orders error:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch your orders.',
    });
  }
});

router.get('/orders/:orderId/invoice/pdf', authenticate, async (req, res) => {
  try {
    const order = await BusinessServiceOrder.findById(req.params.orderId).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const isOwner = String(order.customerEmail || '').toLowerCase() === String(req.user.email || '').toLowerCase();
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }

    // Create a simple invoice PDF using gstInvoice generator
    // It uses "order.items" in invoice rows; we’ll pass a minimal structure.
    const syntheticOrder = {
      id: order._id.toString(),
      amount: order.pricing?.priceNumber || 0,
      items: [
        {
          name: order.serviceName || 'Business Service',
          category: order.categoryName || 'default',
          quantity: 1,
          price: order.pricing?.priceNumber || 0,
        },
      ],
      customerName: order.customerName || '',
      customerEmail: order.customerEmail || '',
      deliveryAddress: order.formData?.address || order.requirements?.slice(0, 120) || '',
      sellerFulfillments: [
        {
          businessName: 'Malabar Bazaar',
          sellerName: 'Malabar Bazaar',
          sellerEmail: 'admin@malabarbazaar.com',
        },
      ],
    };

    const invoiceMeta = await generateGSTInvoice(syntheticOrder, {
      invoiceId: `BS-${order._id.toString().slice(-6).toUpperCase()}`,
      customerGSTIN: order.formData?.gstin || '',
    });

    // Stream file from disk
    return res.sendFile(invoiceMeta.filePath);
  } catch (err) {
    logger.error('business-services invoice pdf error:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to generate invoice PDF.',
    });
  }
});

router.patch('/orders/:orderId/status', authenticate, async (req, res) => {
  try {
    const { error, value } = statusUpdateSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // NOTE: This repo uses roles in many places; for now enforce admin by email heuristic.
    const isAdmin = req.user?.role === 'admin' || (req.user?.email || '').toLowerCase() === 'mgdhanyamohan@gmail.com';
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only admin can update status.' });
    }

    const order = await BusinessServiceOrder.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const prev = order.status;
    order.status = value.status;
    order.history.push({
      status: value.status,
      changedBy: req.user.email,
      note: value.note,
    });

    await order.save();

    return res.json({
      success: true,
      data: {
        order: await BusinessServiceOrder.findById(order._id).lean(),
        previousStatus: prev,
        nextStatus: value.status,
      },
    });
  } catch (err) {
    logger.error('business-services status update error:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Unable to update status.',
    });
  }
});

module.exports = router;
module.exports.__private__ = {
  parseMultipartJsonField,
  normalizeCreateOrderBody,
  createOrderSchema,
  statusUpdateSchema,
};
