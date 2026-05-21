const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const fs = require('fs/promises');

const BusinessServiceOrder = require('../models/BusinessServiceOrder');
const BusinessServiceCatalog = require('../models/BusinessServiceCatalog');
const BusinessServiceInteraction = require('../models/BusinessServiceInteraction');
const PaymentService = require('../services/PaymentService');
const PaymentGateway = require('../models/PaymentGateway');
const Payment = require('../models/Payment');
const BusinessServicePaymentAudit = require('../models/BusinessServicePaymentAudit');
const GatewayIntegrations = require('../utils/GatewayIntegrations');
const { authenticate, hasAdminPrivileges } = require('../middleware/auth');
const logger = require('../utils/logger');
const BusinessServiceNotificationService = require('../services/BusinessServiceNotificationService');
const { uploadBufferToGridFS } = require('../utils/gridfs');
const { generateGSTInvoice } = require('../utils/gstInvoice');

const router = express.Router();
const isTestEnv = process.env.NODE_ENV === 'test';

const limiterConfig = (max) => ({
  windowMs: 60 * 1000,
  max: isTestEnv ? 400 : max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again shortly.',
  },
});

const generalReadLimiter = rateLimit(limiterConfig(90));
const interactionLimiter = rateLimit(limiterConfig(35));
const orderCreateLimiter = rateLimit(limiterConfig(25));
const paymentLimiter = rateLimit(limiterConfig(20));

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
  status: Joi.string().trim().valid('submitted', 'under-review', 'processing', 'pending-docs', 'completed', 'rejected').required(),
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

const interactionMessageSchema = Joi.object({
  text: Joi.string().trim().min(1).max(5000).required(),
});

const interactionCallScheduleSchema = Joi.object({
  scheduledFor: Joi.date().iso().required(),
  callProvider: Joi.string().trim().valid('zoom', 'google-meet', 'twilio', 'manual').default('manual'),
  callLink: Joi.string().trim().uri().allow('').default(''),
  callDuration: Joi.number().integer().min(5).max(240).default(30),
});

const paymentInitiateSchema = Joi.object({
  gateway: Joi.string().trim().valid('razorpay', 'stripe').default('razorpay'),
  paymentMethod: Joi.string().trim().max(60).default('upi'),
});

const paymentVerifySchema = Joi.object({
  paymentId: Joi.string().trim().required(),
  razorpay_payment_id: Joi.string().trim().allow('').optional(),
  razorpay_order_id: Joi.string().trim().allow('').optional(),
  razorpay_signature: Joi.string().trim().allow('').optional(),
  stripePaymentIntentId: Joi.string().trim().allow('').optional(),
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

const normalizeOrderStatus = (status = '') => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'documents-pending') return 'pending-docs';
  if (normalized === 'assigned-to-expert') return 'under-review';
  if (normalized === 'work-in-progress') return 'processing';
  if (normalized === 'invoice-generated') return 'completed';
  return normalized;
};

const isAdminUser = (user = {}) => hasAdminPrivileges(user);

const getIdempotencyKey = (req) =>
  String(req.headers['x-idempotency-key'] || req.headers['idempotency-key'] || '')
    .trim()
    .slice(0, 140);

const createPaymentAuditEvent = async ({
  orderId,
  paymentId = '',
  action,
  status,
  gateway = '',
  idempotencyKey = '',
  details = {},
  req,
}) => {
  const actorEmail = String(req?.user?.email || '')
    .trim()
    .toLowerCase();
  const actorRole = String(req?.user?.role || '')
    .trim()
    .toLowerCase();

  try {
    await BusinessServicePaymentAudit.create({
      orderId: String(orderId || ''),
      paymentId: String(paymentId || ''),
      action,
      status,
      actorEmail,
      actorRole,
      gateway: String(gateway || '').trim().toLowerCase(),
      idempotencyKey,
      details,
    });
  } catch (error) {
    if (error?.code === 11000 && idempotencyKey) {
      return;
    }
    logger.error('business-services payment audit create error:', error);
  }
};

const buildPaymentInitResponse = ({
  payment,
  order,
  lowerGateway,
  amount,
  paymentGatewayConfig,
  gatewayResult = {},
}) => {
  const paymentMetadata = payment?.paymentDetails?.metadata || {};
  const stripeClientSecret =
    gatewayResult.clientSecret ||
    paymentMetadata.stripeClientSecret ||
    '';

  return {
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
          stripeClientSecret,
          stripePublicKey: paymentGatewayConfig.credentials.publicKey,
        }
      : {}),
  },
};
};

const canAccessOrder = (order, user) => {
  const userEmail = String(user?.email || '').toLowerCase();
  const isCustomer = String(order.customerEmail || '').toLowerCase() === userEmail;
  const isConsultant = String(order.consultant?.assignedEmail || '').toLowerCase() === userEmail;
  const isAdmin = isAdminUser(user);
  return isCustomer || isConsultant || isAdmin;
};

const canAccessInteraction = ({ interaction, order, user }) => {
  const userEmail = String(user?.email || '').toLowerCase();
  if (!userEmail) return false;
  if (isAdminUser(user)) return true;

  const isInteractionCustomer = String(interaction?.customerEmail || '').toLowerCase() === userEmail;
  const isInteractionConsultant = String(interaction?.consultantEmail || '').toLowerCase() === userEmail;
  const isOrderCustomer = String(order?.customerEmail || '').toLowerCase() === userEmail;
  const isOrderConsultant = String(order?.consultant?.assignedEmail || '').toLowerCase() === userEmail;

  return isInteractionCustomer || isInteractionConsultant || isOrderCustomer || isOrderConsultant;
};

const deliverableStatusSchema = Joi.object({
  status: Joi.string().trim().valid('pending-review', 'approved', 'rejected').required(),
  note: Joi.string().trim().allow('').default(''),
});

const completionApproveSchema = Joi.object({
  note: Joi.string().trim().allow('').default(''),
});

// Consultant queue: GET /orders/consultant/:consultantEmail/queue
router.get('/orders/consultant/:consultantEmail/queue', authenticate, generalReadLimiter, async (req, res) => {
  try {
    const consultantEmail = String(req.params.consultantEmail || '').toLowerCase();
    if (!consultantEmail) {
      return res.status(400).json({ success: false, message: 'Consultant email required.' });
    }
    // Only allow self or admin to view
    const isSelf = (req.user?.email || '').toLowerCase() === consultantEmail;
    const isAdmin = isAdminUser(req.user);
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
router.patch('/orders/:orderId/consultant/assign', authenticate, paymentLimiter, async (req, res) => {
  try {
    const order = await BusinessServiceOrder.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const consultantEmail = req.body.consultantEmail || req.user.email;
    const consultantName = req.body.consultantName || req.user.name || '';
    // Only admin or self-assign allowed
    const isAdmin = isAdminUser(req.user);
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
router.patch('/orders/:orderId/deliverables/upload', authenticate, orderCreateLimiter, upload.array('deliverables', 5), async (req, res) => {
  try {
    const order = await BusinessServiceOrder.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const isConsultant = (order.consultant.assignedEmail || '').toLowerCase() === (req.user?.email || '').toLowerCase();
    const isAdmin = isAdminUser(req.user);
    if (!isConsultant && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    const fileArray = Array.isArray(req.files) ? req.files : [];
    for (const file of fileArray) {
      const storedFile = await uploadBufferToGridFS({
        buffer: file.buffer,
        filename: file.originalname || `${crypto.randomUUID()}.pdf`,
        contentType: file.mimetype || 'application/octet-stream',
        metadata: {
          category: 'business-services-deliverables',
          visibility: 'private',
          ownerEmail: order.customerEmail,
          uploadedBy: String(req.user.email || '').toLowerCase(),
          orderId: order._id.toString(),
        },
      });
      order.deliverables.push({
        fileId: storedFile.id,
        name: storedFile.filename,
        contentType: storedFile.contentType || file.mimetype,
        size: Number(file.size || 0),
        url: `/api/files/private/${storedFile.id}`,
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
router.get('/orders/:orderId/deliverables', authenticate, generalReadLimiter, async (req, res) => {
  try {
    const order = await BusinessServiceOrder.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const isConsultant = (order.consultant.assignedEmail || '').toLowerCase() === (req.user?.email || '').toLowerCase();
    const isCustomer = (order.customerEmail || '').toLowerCase() === (req.user?.email || '').toLowerCase();
    const isAdmin = isAdminUser(req.user);
    if (!isConsultant && !isCustomer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    return res.json({ success: true, data: { deliverables: order.deliverables || [] } });
  } catch (err) {
    logger.error('deliverables fetch error:', err);
    return res.status(500).json({ success: false, message: 'Unable to fetch deliverables.' });
  }
});

router.patch('/orders/:orderId/deliverables/:deliverableId/status', authenticate, async (req, res) => {
  try {
    const { error, value } = deliverableStatusSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const order = await BusinessServiceOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    const isAdmin = isAdminUser(req.user);
    const isCustomer = String(order.customerEmail || '').toLowerCase() === String(req.user?.email || '').toLowerCase();
    if (!isAdmin && !isCustomer) {
      return res.status(403).json({ success: false, message: 'Only customer/admin can review deliverables.' });
    }

    const deliverableId = String(req.params.deliverableId || '');
    const deliverable = order.deliverables.find((item) => {
      const fileId = String(item.fileId || '');
      const mongoId = String(item._id || '');
      return fileId === deliverableId || mongoId === deliverableId;
    });
    if (!deliverable) {
      return res.status(404).json({ success: false, message: 'Deliverable not found.' });
    }

    deliverable.status = value.status;
    deliverable.uploadedBy = deliverable.uploadedBy || req.user.email;

    order.history.push({
      status: order.status,
      changedBy: req.user.email,
      note: `Deliverable ${value.status}${value.note ? `: ${value.note}` : ''}`,
    });

    const previousStatus = normalizeOrderStatus(order.status);
    if (value.status === 'approved' && order.deliverables.every((item) => item.status === 'approved')) {
      order.status = 'completed';
      order.history.push({
        status: 'completed',
        changedBy: req.user.email,
        note: 'All deliverables approved and order marked completed.',
      });
    }

    await order.save();
    if (previousStatus !== 'completed' && order.status === 'completed') {
      BusinessServiceNotificationService.notifyOrderStatusChanged(order, previousStatus, req.user.email).catch((err) => {
        logger.error('Failed to send completion status notification:', err);
      });
      if (order.paymentStatus === 'paid') {
        BusinessServiceNotificationService.notifyInvoiceGenerated(order, '').catch((err) => {
          logger.error('Failed to send invoice generation notification:', err);
        });
      }
    }
    return res.json({ success: true, data: { order: await BusinessServiceOrder.findById(order._id).lean(), deliverable } });
  } catch (err) {
    logger.error('business-services deliverable status error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Unable to update deliverable status.' });
  }
});

router.post('/orders/:orderId/completion-approve', authenticate, paymentLimiter, async (req, res) => {
  try {
    const { error, value } = completionApproveSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const order = await BusinessServiceOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const isAdmin = isAdminUser(req.user);
    const isCustomer = String(order.customerEmail || '').toLowerCase() === String(req.user?.email || '').toLowerCase();
    if (!isAdmin && !isCustomer) {
      return res.status(403).json({ success: false, message: 'Only customer/admin can approve completion.' });
    }

    if (String(order.paymentStatus || '').toLowerCase() !== 'paid') {
      return res.status(400).json({ success: false, message: 'Complete payment before approval.' });
    }

    const hasRejectedDeliverable = (order.deliverables || []).some((item) => String(item.status || '') === 'rejected');
    if (hasRejectedDeliverable) {
      return res.status(400).json({ success: false, message: 'Rejected deliverables must be re-uploaded before approval.' });
    }

    for (const item of order.deliverables || []) {
      if (item.status !== 'approved') {
        item.status = 'approved';
      }
    }

    const previousStatus = normalizeOrderStatus(order.status);
    order.status = 'completed';
    order.approvalStatus = 'approved';
    order.approvedBy = String(req.user.email || '').toLowerCase();
    order.approvalDate = new Date();
    order.approvalNotes = String(value.note || '');
    order.history.push({
      status: 'completed',
      changedBy: req.user.email,
      note: value.note || 'Order approved by customer.',
    });
    await order.save();

    if (previousStatus !== 'completed') {
      BusinessServiceNotificationService.notifyOrderStatusChanged(order, previousStatus, req.user.email).catch((err) => {
        logger.error('Failed to send completion approval status notification:', err);
      });
    }
    BusinessServiceNotificationService.notifyInvoiceGenerated(order, '').catch((err) => {
      logger.error('Failed to send invoice generation notification on completion approval:', err);
    });

    return res.json({
      success: true,
      data: {
        order: await BusinessServiceOrder.findById(order._id).lean(),
      },
    });
  } catch (err) {
    logger.error('business-services completion approval error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Unable to approve order completion.' });
  }
});

router.post('/orders/:orderId/payments/retry', authenticate, paymentLimiter, async (req, res) => {
  try {
    const { error, value } = paymentInitiateSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const lowerGateway = String(value.gateway || 'razorpay').trim().toLowerCase();
    const lowerPaymentMethod = String(value.paymentMethod || 'upi').trim().toLowerCase();
    const idempotencyKey = getIdempotencyKey(req);

    const order = await BusinessServiceOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (String(order.customerEmail || '').toLowerCase() !== String(req.user.email || '').toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }

    if (order.paymentStatus === 'paid') {
      await createPaymentAuditEvent({
        orderId: order._id.toString(),
        paymentId: order.paymentRecordId,
        action: 'retry-payment',
        status: 'ignored-already-paid',
        gateway: lowerGateway,
        idempotencyKey,
        req,
      });
      return res.status(400).json({ success: false, message: 'Order is already paid.' });
    }

    if (idempotencyKey) {
      const duplicateEvent = await BusinessServicePaymentAudit.findOne({ idempotencyKey, action: 'retry-payment' }).lean();
      if (duplicateEvent?.status === 'initiated' && duplicateEvent?.paymentId) {
        const existingIdempotentPayment = await Payment.findOne({
          paymentId: duplicateEvent.paymentId,
          orderId: order._id.toString(),
        });
        if (existingIdempotentPayment) {
          const paymentGatewayConfig = await PaymentGateway.findOne({ gatewayName: lowerGateway, isActive: true }).select('+credentials');
          if (paymentGatewayConfig) {
            return res.json(
              buildPaymentInitResponse({
                payment: existingIdempotentPayment,
                order,
                lowerGateway,
                amount: Number(order.pricing?.priceNumber || 0),
                paymentGatewayConfig,
              })
            );
          }
        }
      }
    }

    const existingPayment = await Payment.findOne({ orderId: order._id.toString() }).sort({ createdAt: -1 });
    if (existingPayment) {
      existingPayment.status = 'failed';
      await existingPayment.save();
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
      await createPaymentAuditEvent({
        orderId: order._id.toString(),
        paymentId: payment.paymentId,
        action: 'retry-payment',
        status: 'gateway-init-failed',
        gateway: lowerGateway,
        idempotencyKey,
        details: { error: gatewayResult.error || '' },
        req,
      });
      return res.status(500).json({ success: false, message: gatewayResult.error || 'Unable to initialize payment.' });
    }

    payment.gatewayOrderId = gatewayResult.orderId || gatewayResult.transactionId;
    payment.gatewayTransactionId = gatewayResult.transactionId || gatewayResult.orderId;
    payment.status = 'initiated';
    payment.paymentDetails = {
      ...(payment.paymentDetails || {}),
      metadata: {
        ...((payment.paymentDetails && payment.paymentDetails.metadata) || {}),
        ...(lowerGateway === 'stripe' && gatewayResult.clientSecret
          ? { stripeClientSecret: gatewayResult.clientSecret }
          : {}),
      },
    };
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

    await createPaymentAuditEvent({
      orderId: order._id.toString(),
      paymentId: payment.paymentId,
      action: 'retry-payment',
      status: 'initiated',
      gateway: lowerGateway,
      idempotencyKey,
      details: {
        paymentMethod: lowerPaymentMethod,
        gatewayOrderId: payment.gatewayOrderId,
      },
      req,
    });

    return res.json(
      buildPaymentInitResponse({
        payment,
        order,
        lowerGateway,
        amount,
        paymentGatewayConfig,
        gatewayResult,
      })
    );
  } catch (err) {
    logger.error('business-services payment retry error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Unable to retry payment.' });
  }
});

router.get('/catalog', generalReadLimiter, async (_req, res) => {
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

router.post('/interactions', authenticate, interactionLimiter, async (req, res) => {
  try {
    const { error, value } = interactionCreateSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    let assignedConsultantEmail = '';
    let assignedConsultantName = '';
    if (value.orderId) {
      const order = await BusinessServiceOrder.findById(value.orderId).lean();
      assignedConsultantEmail = String(order?.consultant?.assignedEmail || '').toLowerCase();
      assignedConsultantName = String(order?.consultant?.assignedName || '');
    }

    const interaction = await BusinessServiceInteraction.create({
      customerEmail: req.user.email,
      customerName: req.user.name || '',
      consultantEmail: assignedConsultantEmail,
      consultantName: assignedConsultantName,
      interactionType: value.interactionType,
      orderId: value.orderId,
      categoryId: value.categoryId,
      serviceId: value.serviceId,
      notes: value.notes,
      metadata: value.metadata,
      status: 'submitted',
      messages: value.notes
        ? [
            {
              sender: String(req.user.email || '').toLowerCase(),
              senderRole: String(req.user.role || 'customer').toLowerCase(),
              text: value.notes,
            },
          ]
        : [],
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

router.get('/interactions', authenticate, generalReadLimiter, async (req, res) => {
  try {
    const userEmail = String(req.user?.email || '').toLowerCase();
    const query = {};
    if (req.query?.orderId) {
      query.orderId = String(req.query.orderId || '').trim();
    }

    if (!isAdminUser(req.user)) {
      query.$or = [{ customerEmail: userEmail }, { consultantEmail: userEmail }];
    }

    const interactions = await BusinessServiceInteraction.find(query).sort({ updatedAt: -1 }).lean();
    return res.json({ success: true, data: { interactions } });
  } catch (err) {
    logger.error('business-services list interactions error:', err);
    return res.status(500).json({ success: false, message: 'Unable to fetch interactions.' });
  }
});

router.get('/interactions/:interactionId/messages', authenticate, interactionLimiter, async (req, res) => {
  try {
    const interaction = await BusinessServiceInteraction.findById(req.params.interactionId);
    if (!interaction) return res.status(404).json({ success: false, message: 'Interaction not found.' });

    const order = interaction.orderId ? await BusinessServiceOrder.findById(interaction.orderId).lean() : null;
    if (!canAccessInteraction({ interaction, order, user: req.user })) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const currentUserEmail = String(req.user.email || '').toLowerCase();
    let shouldSave = false;
    for (const message of interaction.messages || []) {
      if (String(message.sender || '').toLowerCase() !== currentUserEmail && !message.readAt) {
        message.readAt = new Date();
        shouldSave = true;
      }
    }

    if (shouldSave) {
      await interaction.save();
    }

    return res.json({
      success: true,
      data: {
        interactionId: interaction._id.toString(),
        status: interaction.status,
        messages: interaction.messages || [],
      },
    });
  } catch (err) {
    logger.error('business-services get interaction messages error:', err);
    return res.status(500).json({ success: false, message: 'Unable to fetch interaction messages.' });
  }
});

router.post('/interactions/:interactionId/messages', authenticate, interactionLimiter, async (req, res) => {
  try {
    const { error, value } = interactionMessageSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const interaction = await BusinessServiceInteraction.findById(req.params.interactionId);
    if (!interaction) return res.status(404).json({ success: false, message: 'Interaction not found.' });

    const order = interaction.orderId ? await BusinessServiceOrder.findById(interaction.orderId) : null;
    if (!canAccessInteraction({ interaction, order, user: req.user })) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    if (!interaction.consultantEmail && order?.consultant?.assignedEmail) {
      interaction.consultantEmail = String(order.consultant.assignedEmail || '').toLowerCase();
      interaction.consultantName = String(order.consultant.assignedName || '');
    }

    interaction.messages.push({
      sender: String(req.user.email || '').toLowerCase(),
      senderRole: String(req.user.role || 'customer').toLowerCase(),
      text: value.text,
    });
    if (interaction.status === 'submitted' || interaction.status === 'under-review') {
      interaction.status = 'open';
    }
    interaction.resolvedAt = null;
    await interaction.save();

    return res.status(201).json({
      success: true,
      data: {
        interaction: await BusinessServiceInteraction.findById(interaction._id).lean(),
      },
    });
  } catch (err) {
    logger.error('business-services add interaction message error:', err);
    return res.status(500).json({ success: false, message: 'Unable to send interaction message.' });
  }
});

router.post('/interactions/:interactionId/schedule-call', authenticate, interactionLimiter, async (req, res) => {
  try {
    const { error, value } = interactionCallScheduleSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const interaction = await BusinessServiceInteraction.findById(req.params.interactionId);
    if (!interaction) return res.status(404).json({ success: false, message: 'Interaction not found.' });
    const order = interaction.orderId ? await BusinessServiceOrder.findById(interaction.orderId) : null;
    if (!canAccessInteraction({ interaction, order, user: req.user })) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    interaction.interactionType = interaction.interactionType === 'call' ? interaction.interactionType : 'call-request';
    interaction.scheduledFor = new Date(value.scheduledFor);
    interaction.callProvider = value.callProvider;
    interaction.callLink = value.callLink;
    interaction.callDuration = value.callDuration;
    interaction.status = 'scheduled';
    interaction.messages.push({
      sender: String(req.user.email || '').toLowerCase(),
      senderRole: String(req.user.role || 'customer').toLowerCase(),
      text: `Call scheduled for ${new Date(value.scheduledFor).toLocaleString()} (${value.callDuration} mins).`,
    });
    await interaction.save();

    return res.json({
      success: true,
      data: {
        interaction: await BusinessServiceInteraction.findById(interaction._id).lean(),
      },
    });
  } catch (err) {
    logger.error('business-services schedule interaction call error:', err);
    return res.status(500).json({ success: false, message: 'Unable to schedule call.' });
  }
});

router.post('/orders', authenticate, orderCreateLimiter, upload.array('documents', 10), async (req, res) => {
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
        size: Number(file.size || 0),
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

router.post('/orders/:orderId/payments/initiate', authenticate, paymentLimiter, async (req, res) => {
  try {
    const { error, value } = paymentInitiateSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const lowerGateway = String(value.gateway || 'razorpay').trim().toLowerCase();
    const lowerPaymentMethod = String(value.paymentMethod || 'upi').trim().toLowerCase();
    const idempotencyKey = getIdempotencyKey(req);

    const order = await BusinessServiceOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (String(order.customerEmail || '').toLowerCase() !== String(req.user.email || '').toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }

    if (order.paymentStatus === 'paid') {
      await createPaymentAuditEvent({
        orderId: order._id.toString(),
        paymentId: order.paymentRecordId,
        action: 'initiate-payment',
        status: 'ignored-already-paid',
        gateway: lowerGateway,
        idempotencyKey,
        req,
      });
      return res.status(400).json({ success: false, message: 'Order is already paid.' });
    }

    if (idempotencyKey) {
      const duplicateEvent = await BusinessServicePaymentAudit.findOne({ idempotencyKey, action: 'initiate-payment' }).lean();
      if (duplicateEvent?.status === 'initiated' && duplicateEvent?.paymentId) {
        const existingIdempotentPayment = await Payment.findOne({
          paymentId: duplicateEvent.paymentId,
          orderId: order._id.toString(),
        });
        if (existingIdempotentPayment) {
          const paymentGatewayConfig = await PaymentGateway.findOne({ gatewayName: lowerGateway, isActive: true }).select('+credentials');
          if (paymentGatewayConfig) {
            return res.json(
              buildPaymentInitResponse({
                payment: existingIdempotentPayment,
                order,
                lowerGateway,
                amount: Number(order.pricing?.priceNumber || 0),
                paymentGatewayConfig,
              })
            );
          }
        }
      }
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
      await createPaymentAuditEvent({
        orderId: order._id.toString(),
        paymentId: payment.paymentId,
        action: 'initiate-payment',
        status: 'gateway-init-failed',
        gateway: lowerGateway,
        idempotencyKey,
        details: { error: gatewayResult.error || '' },
        req,
      });
      return res.status(500).json({ success: false, message: gatewayResult.error || 'Unable to initialize payment.' });
    }

    payment.gatewayOrderId = gatewayResult.orderId || gatewayResult.transactionId;
    payment.gatewayTransactionId = gatewayResult.transactionId || gatewayResult.orderId;
    payment.status = 'initiated';
    payment.paymentDetails = {
      ...(payment.paymentDetails || {}),
      metadata: {
        ...((payment.paymentDetails && payment.paymentDetails.metadata) || {}),
        ...(lowerGateway === 'stripe' && gatewayResult.clientSecret
          ? { stripeClientSecret: gatewayResult.clientSecret }
          : {}),
      },
    };
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

    await createPaymentAuditEvent({
      orderId: order._id.toString(),
      paymentId: payment.paymentId,
      action: 'initiate-payment',
      status: 'initiated',
      gateway: lowerGateway,
      idempotencyKey,
      details: {
        paymentMethod: lowerPaymentMethod,
        gatewayOrderId: payment.gatewayOrderId,
      },
      req,
    });

    return res.json(
      buildPaymentInitResponse({
        payment,
        order,
        lowerGateway,
        amount,
        paymentGatewayConfig,
        gatewayResult,
      })
    );
  } catch (err) {
    logger.error('business-services payment initiate error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Unable to initiate payment.' });
  }
});

router.post('/orders/:orderId/payments/verify', authenticate, paymentLimiter, async (req, res) => {
  try {
    const { error, value } = paymentVerifySchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const { paymentId, razorpay_payment_id, razorpay_order_id, razorpay_signature, stripePaymentIntentId } = value;
    const idempotencyKey = getIdempotencyKey(req);

    const order = await BusinessServiceOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (String(order.customerEmail || '').toLowerCase() !== String(req.user.email || '').toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }

    const payment = await Payment.findOne({ paymentId, orderId: order._id.toString() });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found.' });

    if (order.paymentStatus === 'paid' && String(order.paymentRecordId || '') === String(paymentId || '')) {
      await createPaymentAuditEvent({
        orderId: order._id.toString(),
        paymentId,
        action: 'verify-payment',
        status: 'ignored-already-verified',
        gateway: payment.paymentGateway,
        idempotencyKey,
        req,
      });
      return res.json({ success: true, data: { order, payment } });
    }

    if (idempotencyKey) {
      const duplicateEvent = await BusinessServicePaymentAudit.findOne({ idempotencyKey, action: 'verify-payment' }).lean();
      if (duplicateEvent?.status === 'verified') {
        const existingOrder = await BusinessServiceOrder.findById(req.params.orderId);
        const existingPayment = await Payment.findOne({ paymentId, orderId: req.params.orderId });
        if (existingOrder && existingPayment) {
          return res.json({ success: true, data: { order: existingOrder, payment: existingPayment } });
        }
      }
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
        await createPaymentAuditEvent({
          orderId: order._id.toString(),
          paymentId,
          action: 'verify-payment',
          status: 'signature-mismatch',
          gateway: payment.paymentGateway,
          idempotencyKey,
          req,
        });
        return res.status(400).json({ success: false, message: 'Razorpay signature verification failed.' });
      }

      const razorpay = new (require('razorpay'))({
        key_id: gatewayConfig.credentials.apiKey,
        key_secret: gatewayConfig.credentials.apiSecret,
      });

      const paymentResult = await razorpay.payments.fetch(razorpay_payment_id);
      if (!paymentResult || paymentResult.status !== 'captured') {
        await createPaymentAuditEvent({
          orderId: order._id.toString(),
          paymentId,
          action: 'verify-payment',
          status: 'not-captured',
          gateway: payment.paymentGateway,
          idempotencyKey,
          details: { gatewayStatus: paymentResult?.status || '' },
          req,
        });
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
        await createPaymentAuditEvent({
          orderId: order._id.toString(),
          paymentId,
          action: 'verify-payment',
          status: 'not-succeeded',
          gateway: payment.paymentGateway,
          idempotencyKey,
          details: { gatewayStatus: intent?.status || '' },
          req,
        });
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
    order.status = normalizeOrderStatus(order.status) === 'submitted' ? 'under-review' : normalizeOrderStatus(order.status);
    order.paymentRecordId = payment.paymentId;
    order.paymentDetails = payment.paymentDetails || order.paymentDetails;
    order.history.push({
      status: order.status,
      changedBy: req.user.email,
      note: 'Payment verified for business service order',
    });
    await order.save();

    await createPaymentAuditEvent({
      orderId: order._id.toString(),
      paymentId,
      action: 'verify-payment',
      status: 'verified',
      gateway: payment.paymentGateway,
      idempotencyKey,
      details: {
        transactionId: payment.transactionId,
      },
      req,
    });

    BusinessServiceNotificationService.notifyPaymentReceived(order, payment.paymentDetails || {}).catch((err) => {
      logger.error('Failed to send payment received notification:', err);
    });

    return res.json({ success: true, data: { order, payment } });
  } catch (err) {
    logger.error('business-services payment verification error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Unable to verify payment.' });
  }
});

router.get('/orders/me', authenticate, generalReadLimiter, async (req, res) => {
  try {
    const orders = await getMyOrders(req);
    return res.json({ success: true, data: { orders } });
  } catch (err) {
    logger.error('business-services list orders error:', err);
    return res.status(500).json({ success: false, message: 'Unable to fetch your orders.' });
  }
});

router.get('/orders/:orderId', authenticate, generalReadLimiter, async (req, res) => {
  try {
    const order = await BusinessServiceOrder.findById(req.params.orderId).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (!canAccessOrder(order, req.user)) return res.status(403).json({ success: false, message: 'Not authorized.' });

    const interactions = await BusinessServiceInteraction.find({ orderId: req.params.orderId })
      .sort({ createdAt: 1 })
      .lean();

    return res.json({ success: true, data: { order, interactions } });
  } catch (err) {
    logger.error('business-services order detail error:', err);
    return res.status(500).json({ success: false, message: 'Unable to fetch order details.' });
  }
});

router.get('/orders/:orderId/invoice/pdf', authenticate, generalReadLimiter, async (req, res) => {
  try {
    const order = await BusinessServiceOrder.findById(req.params.orderId).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const isOwner = String(order.customerEmail || '').toLowerCase() === String(req.user.email || '').toLowerCase();
    if (!isOwner) return res.status(403).json({ success: false, message: 'Not allowed.' });
    if (String(order.paymentStatus || '').toLowerCase() !== 'paid') {
      return res.status(400).json({ success: false, message: 'Invoice is available after payment is completed.' });
    }
    if (normalizeOrderStatus(order.status) !== 'completed') {
      return res.status(400).json({ success: false, message: 'Invoice is available once your order is completed.' });
    }

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

    return res.sendFile(invoiceMeta.filePath, async (sendError) => {
      if (sendError) {
        logger.error('business-services invoice send error:', sendError);
      }
      try {
        await fs.unlink(invoiceMeta.filePath);
      } catch (cleanupError) {
        if (cleanupError?.code !== 'ENOENT') {
          logger.error('business-services invoice cleanup error:', cleanupError);
        }
      }
    });
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

router.patch('/orders/:orderId/status', authenticate, paymentLimiter, async (req, res) => {
  try {
    const { error, value } = statusUpdateSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const order = await BusinessServiceOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const normalizedRole = String(req.user?.role || 'user').toLowerCase();
    const isAdmin = isAdminUser(req.user);
    const targetStatus = normalizeOrderStatus(value.status);

    if (!isValidTransition(normalizeOrderStatus(order.status), targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from '${order.status}' to '${targetStatus}'.`,
      });
    }

    if (!isAdmin && !canUpdateStatus(normalizedRole, targetStatus)) {
      return res.status(403).json({ success: false, message: 'Your role cannot update the order to this status.' });
    }

    const prev = normalizeOrderStatus(order.status);
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
    if (targetStatus === 'completed' && order.paymentStatus === 'paid') {
      BusinessServiceNotificationService.notifyInvoiceGenerated(order, '').catch((err) => {
        logger.error('Failed to send invoice generated notification:', err);
      });
    }

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

router.patch('/orders/:orderId/consultant', authenticate, paymentLimiter, async (req, res) => {
  try {
    const { error, value } = consultantAssignmentSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const order = await BusinessServiceOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const isAdmin = isAdminUser(req.user);
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

router.get('/analytics/alerts', authenticate, generalReadLimiter, async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ success: false, message: 'Only admin can access business service alerts.' });
    }

    const windowHoursRaw = Number(req.query?.hours || 24);
    const windowHours = Number.isFinite(windowHoursRaw) ? Math.min(Math.max(windowHoursRaw, 1), 168) : 24;
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const [failedVerifications, signatureMismatches, gatewayInitFailures, paidOrderConflicts] = await Promise.all([
      BusinessServicePaymentAudit.countDocuments({
        action: 'verify-payment',
        status: { $in: ['not-captured', 'not-succeeded'] },
        createdAt: { $gte: since },
      }),
      BusinessServicePaymentAudit.countDocuments({
        action: 'verify-payment',
        status: 'signature-mismatch',
        createdAt: { $gte: since },
      }),
      BusinessServicePaymentAudit.countDocuments({
        action: { $in: ['initiate-payment', 'retry-payment'] },
        status: 'gateway-init-failed',
        createdAt: { $gte: since },
      }),
      BusinessServicePaymentAudit.countDocuments({
        action: { $in: ['initiate-payment', 'retry-payment'] },
        status: 'ignored-already-paid',
        createdAt: { $gte: since },
      }),
    ]);

    const scoreSeverity = (count, warnAt, criticalAt) => {
      if (count >= criticalAt) return 'critical';
      if (count >= warnAt) return 'warning';
      return 'healthy';
    };

    return res.json({
      success: true,
      data: {
        windowHours,
        since: since.toISOString(),
        alerts: [
          {
            key: 'failed-verifications',
            severity: scoreSeverity(failedVerifications, 3, 8),
            count: failedVerifications,
            message: 'Payment verifications not captured/succeeded.',
          },
          {
            key: 'signature-mismatches',
            severity: scoreSeverity(signatureMismatches, 2, 5),
            count: signatureMismatches,
            message: 'Payment signature mismatch events.',
          },
          {
            key: 'gateway-init-failures',
            severity: scoreSeverity(gatewayInitFailures, 2, 6),
            count: gatewayInitFailures,
            message: 'Gateway initialization failures.',
          },
          {
            key: 'paid-order-init-attempts',
            severity: scoreSeverity(paidOrderConflicts, 4, 10),
            count: paidOrderConflicts,
            message: 'Initiate/retry attempts for already paid orders.',
          },
        ],
      },
    });
  } catch (err) {
    logger.error('business-services alerts error:', err);
    return res.status(500).json({ success: false, message: 'Unable to fetch business service alerts.' });
  }
});

module.exports = router;
module.exports.__private__ = {
  parseMultipartJsonField,
  normalizeCreateOrderBody,
  normalizeOrderStatus,
  isAdminUser,
  getIdempotencyKey,
  createOrderSchema,
  statusUpdateSchema,
  paymentInitiateSchema,
  paymentVerifySchema,
};
