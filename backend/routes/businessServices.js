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
const BusinessServiceNotificationService = require('../services/BusinessServiceNotificationService');
const { uploadBufferToGridFS } = require('../utils/gridfs');
const { generateGSTInvoice } = require('../utils/gstInvoice');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
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

// Consultant queue: GET /orders/consultant/:consultantEmail/queue
router.get('/orders/consultant/:consultantEmail/queue', authenticate, async (req, res) => {
  try {
    const consultantEmail = String(req.params.consultantEmail || '').toLowerCase();
    if (!consultantEmail) {
      return res.status(400).json({ success: false, message: 'Consultant email required.' });
    }
    // Only allow self or admin to view
    const isSelf = (req.user?.email || '').toLowerCase() === consultantEmail;
    const isAdmin = req.user?.role === 'admin' || (req.user?.email || '').toLowerCase() === 'mgdhanyamohan@gmail.com';
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    const orders = await BusinessServiceOrder.find({ 'consultant.assignedEmail': consultantEmail }).sort({ orderDate: 1 });
    return res.json({ success: true, data: { orders } });
  } catch (err) {
    logger.error('consultant queue error:', err);
    return res.status(500).json({ success: false, message: 'Unable to fetch consultant queue.' });
  }
});

// Consultant assign: PATCH /orders/:orderId/consultant/assign
router.patch('/orders/:orderId/consultant/assign', authenticate, async (req, res) => {
  try {
    const order = await BusinessServiceOrder.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const consultantEmail = req.body.consultantEmail || req.user.email;
    const consultantName = req.body.consultantName || req.user.name || '';
    // Only admin or self-assign allowed
    const isAdmin = req.user?.role === 'admin' || (req.user?.email || '').toLowerCase() === 'mgdhanyamohan@gmail.com';
    if (!isAdmin && consultantEmail.toLowerCase() !== (req.user?.email || '').toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Not authorized to assign.' });
    }
    order.consultant.assignedEmail = consultantEmail.toLowerCase();
    order.consultant.assignedName = consultantName;
    order.history.push({
      status: order.status,
      changedBy: req.user.email,
      note: `Consultant assigned: ${consultantName}`,
    });
    await order.save();
    BusinessServiceNotificationService.notifyConsultantAssignment(order, consultantEmail, consultantName).catch(() => {});
    return res.json({ success: true, data: { order } });
  } catch (err) {
    logger.error('consultant assign error:', err);
    return res.status(500).json({ success: false, message: 'Unable to assign consultant.' });
  }
});

// Deliverables upload: PATCH /orders/:orderId/deliverables/upload
router.patch('/orders/:orderId/deliverables/upload', authenticate, upload.array('deliverables', 5), async (req, res) => {
  try {
    const order = await BusinessServiceOrder.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const isConsultant = (order.consultant.assignedEmail || '').toLowerCase() === (req.user?.email || '').toLowerCase();
    const isAdmin = req.user?.role === 'admin' || (req.user?.email || '').toLowerCase() === 'mgdhanyamohan@gmail.com';
    if (!isConsultant && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    const fileArray = Array.isArray(req.files) ? req.files : [];
    for (const file of fileArray) {
      order.deliverables.push({
        fileId: crypto.randomUUID(),
        name: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        url: `/api/files/private/${crypto.randomUUID()}`,
        uploadedBy: req.user.email,
        uploadedAt: new Date(),
        status: 'pending-review',
      });
    }
    order.history.push({
      status: order.status,
      changedBy: req.user.email,
      note: `Deliverables uploaded (${fileArray.length})`,
    });
    await order.save();
    BusinessServiceNotificationService.notifyDeliverablesUploaded(order, req.user.name || '').catch(() => {});
    return res.json({ success: true, data: { order } });
  } catch (err) {
    logger.error('deliverables upload error:', err);
    return res.status(500).json({ success: false, message: 'Unable to upload deliverables.' });
  }
});

// Deliverables fetch: GET /orders/:orderId/deliverables
router.get('/orders/:orderId/deliverables', authenticate, async (req, res) => {
  try {
    const order = await BusinessServiceOrder.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const isConsultant = (order.consultant.assignedEmail || '').toLowerCase() === (req.user?.email || '').toLowerCase();
    const isCustomer = (order.customerEmail || '').toLowerCase() === (req.user?.email || '').toLowerCase();
    const isAdmin = req.user?.role === 'admin' || (req.user?.email || '').toLowerCase() === 'mgdhanyamohan@gmail.com';
    if (!isConsultant && !isCustomer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    return res.json({ success: true, data: { deliverables: order.deliverables || [] } });
  } catch (err) {
    logger.error('deliverables fetch error:', err);
    return res.status(500).json({ success: false, message: 'Unable to fetch deliverables.' });
  }
});

router.get('/catalog', async (_req, res) => {
  try {
    const catalog = await BusinessServiceCatalog.findOne({ key: 'default' }).lean();
    if (!catalog) {
      return res.status(404).json({ success: false, message: 'Business services catalog is not configured in DB.' });
    }
    return res.json({ success: true, data: { catalog } });
  } catch (err) {
    logger.error('business-services get catalog error:', err);
    return res.status(500).json({ success: false, message: 'Unable to fetch business services catalog.' });
  }
});

router.post('/interactions', authenticate, async (req, res) => {
  try {
    const { error, value } = interactionCreateSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
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

    if (value.orderId) {
      BusinessServiceOrder.findById(value.orderId)
        .then((order) => {
          if (order && order.consultant?.assignedEmail) {
            BusinessServiceNotificationService.notifyInteractionCreated(interaction, order).catch((err) => {
              logger.error('Failed to send interaction notification:', err);
            });
          }
        })
        .catch((err) => {
          logger.error('Failed to fetch order for interaction notification:', err);
        });
    }

    return res.status(201).json({ success: true, data: { interaction } });
  } catch (err) {
    logger.error('business-services create interaction error:', err);
    return res.status(500).json({ success: false, message: 'Unable to create interaction request.' });
  }
});

router.post('/orders', authenticate, upload.array('documents', 10), async (req, res) => {
  try {
    const normalizedBody = normalizeCreateOrderBody(req.body);
    const { error, value } = createOrderSchema.validate(normalizedBody, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
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
        url: `/api/files/private/${storedFile.id}`,
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

    BusinessServiceNotificationService.notifyOrderCreated(order).catch((err) => {
      logger.error('Failed to send order creation notification:', err);
    });

    return res.status(201).json({ success: true, data: { order } });
  } catch (err) {
    if (err?.statusCode === 400) {
      return res.status(400).json({ success: false, message: err.message });
    }
    logger.error('business-services create order error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Unable to create order.' });
  }
});

router.post('/orders/:orderId/payments/initiate', authenticate, async (req, res) => {
  try {
    const { gateway = 'razorpay', paymentMethod = 'upi' } = req.body;
    const lowerGateway = String(gateway || 'razorpay').trim().toLowerCase();
    const lowerPaymentMethod = String(paymentMethod || 'upi').trim().toLowerCase();

    const order = await BusinessServiceOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (String(order.customerEmail || '').toLowerCase() !== String(req.user.email || '').toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }

    const amount = Number(order.pricing?.priceNumber || 0);
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid payment amount.' });

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
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (String(order.customerEmail || '').toLowerCase() !== String(req.user.email || '').toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }

    const payment = await Payment.findOne({ paymentId, orderId: order._id.toString() });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found.' });

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

    if (!verified) return res.status(500).json({ success: false, message: 'Unable to verify payment.' });

    order.paymentStatus = 'paid';
    order.status = order.status === 'submitted' ? 'under-review' : order.status;
    order.paymentRecordId = payment.paymentId;
    order.paymentDetails = payment.paymentDetails || order.paymentDetails;
    order.history.push({
      status: order.status,
      changedBy: req.user.email,
      note: 'Payment verified for business service order',
    });
    await order.save();

    BusinessServiceNotificationService.notifyPaymentReceived(order, payment.paymentDetails || {}).catch((err) => {
      logger.error('Failed to send payment received notification:', err);
    });

    return res.json({ success: true, data: { order, payment } });
  } catch (err) {
    logger.error('business-services payment verification error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Unable to verify payment.' });
  }
});

router.get('/orders/me', authenticate, async (req, res) => {
  try {
    const orders = await getMyOrders(req);
    return res.json({ success: true, data: { orders } });
  } catch (err) {
    logger.error('business-services list orders error:', err);
    return res.status(500).json({ success: false, message: 'Unable to fetch your orders.' });
  }
});

router.get('/orders/:orderId/invoice/pdf', authenticate, async (req, res) => {
  try {
    const order = await BusinessServiceOrder.findById(req.params.orderId).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const isOwner = String(order.customerEmail || '').toLowerCase() === String(req.user.email || '').toLowerCase();
    if (!isOwner) return res.status(403).json({ success: false, message: 'Not allowed.' });

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
        { businessName: 'Malabar Bazaar', sellerName: 'Malabar Bazaar', sellerEmail: 'admin@malabarbazaar.com' },
      ],
    };

    const invoiceMeta = await generateGSTInvoice(syntheticOrder, {
      invoiceId: `BS-${order._id.toString().slice(-6).toUpperCase()}`,
      customerGSTIN: order.formData?.gstin || '',
    });

    return res.sendFile(invoiceMeta.filePath);
  } catch (err) {
    logger.error('business-services invoice pdf error:', err);
    return res.status(500).json({ success: false, message: 'Unable to generate invoice PDF.' });
  }
});

const STATUS_TRANSITIONS = {
  submitted: ['under-review', 'rejected'],
  'under-review': ['processing', 'rejected', 'pending-docs'],
  processing: ['completed', 'rejected', 'pending-docs'],
  'pending-docs': ['under-review', 'rejected'],
  completed: [],
  rejected: [],
};

const rolePermissions = {
  admin: ['under-review', 'processing', 'completed', 'rejected', 'pending-docs'],
  consultant: ['processing', 'pending-docs'],
  user: [],
};

const isValidTransition = (from, to) => {
  const allowed = STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
};

const canUpdateStatus = (role, targetStatus) => {
  const allowed = rolePermissions[role] || [];
  return allowed.includes(targetStatus);
};

router.patch('/orders/:orderId/status', authenticate, async (req, res) => {
  try {
    const { error, value } = statusUpdateSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const order = await BusinessServiceOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const normalizedRole = String(req.user?.role || 'user').toLowerCase();
    const isAdmin = normalizedRole === 'admin' || (req.user?.email || '').toLowerCase() === 'mgdhanyamohan@gmail.com';
    const targetStatus = value.status;

    if (!isValidTransition(order.status, targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from '${order.status}' to '${targetStatus}'.`,
      });
    }

    if (!isAdmin && !canUpdateStatus(normalizedRole, targetStatus)) {
      return res.status(403).json({ success: false, message: 'Your role cannot update the order to this status.' });
    }

    const prev = order.status;
    order.status = targetStatus;
    order.history.push({
      status: targetStatus,
      changedBy: req.user.email,
      note: value.note,
    });

    await order.save();

    BusinessServiceNotificationService.notifyOrderStatusChanged(order, prev, req.user.email).catch((err) => {
      logger.error('Failed to send status change notification:', err);
    });

    return res.json({
      success: true,
      data: {
        order: await BusinessServiceOrder.findById(order._id).lean(),
        previousStatus: prev,
        nextStatus: targetStatus,
      },
    });
  } catch (err) {
    logger.error('business-services status update error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Unable to update status.' });
  }
});

const consultantAssignmentSchema = Joi.object({
  consultantEmail: Joi.string().email().required(),
  consultantName: Joi.string().trim().allow('').default(''),
  note: Joi.string().trim().allow('').default(''),
});

router.patch('/orders/:orderId/consultant', authenticate, async (req, res) => {
  try {
    const { error, value } = consultantAssignmentSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const order = await BusinessServiceOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const normalizedRole = String(req.user?.role || 'user').toLowerCase();
    const isAdmin = normalizedRole === 'admin' || (req.user?.email || '').toLowerCase() === 'mgdhanyamohan@gmail.com';
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Only admin can assign consultants.' });

    const prevConsultant = { ...order.consultant };
    order.consultant = { assignedEmail: value.consultantEmail, assignedName: value.consultantName };

    order.history.push({
      status: order.status,
      changedBy: req.user.email,
      note: `Consultant assigned: ${value.consultantName} (${value.consultantEmail}) - ${value.note}`,
    });

    await order.save();

    BusinessServiceNotificationService.notifyConsultantAssignment(order, value.consultantEmail, value.consultantName).catch((err) => {
      logger.error('Failed to send consultant assignment notification:', err);
    });

    return res.json({
      success: true,
      data: {
        order: await BusinessServiceOrder.findById(order._id).lean(),
        previousConsultant: prevConsultant,
        newConsultant: order.consultant,
      },
    });
  } catch (err) {
    logger.error('business-services consultant assignment error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Unable to assign consultant.' });
  }
});

module.exports = router;
module.exports.__private__ = {
  parseMultipartJsonField,
  normalizeCreateOrderBody,
  createOrderSchema,
  statusUpdateSchema,
};
