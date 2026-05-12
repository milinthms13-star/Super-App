const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const crypto = require('crypto');
const BusinessServiceOrder = require('../models/BusinessServiceOrder');
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

const getMyOrders = async (req) => {
  return BusinessServiceOrder.find({ customerEmail: req.user.email })
    .sort({ createdAt: -1 })
    .lean();
};

router.post(
  '/orders',
  authenticate,
  upload.array('documents', 10),
  async (req, res) => {
    try {
      const { error, value } = createOrderSchema.validate(req.body, { stripUnknown: true });
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
      logger.error('business-services create order error:', err);
      return res.status(500).json({
        success: false,
        message: err?.message || 'Unable to create order.',
      });
    }
  }
);

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
