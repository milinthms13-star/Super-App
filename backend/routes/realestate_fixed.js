const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');
const redisCache = require('../middleware/redisCache');
const realEstateStore = require('../utils/realEstateStore');
const s3 = require('../config/s3');
const imageSecurity = require('../utils/imageSecurity');
const logger = require('../utils/logger');
const {
  realEstateListingCreateSchema,
  realEstateListingUpdateSchema,
  realEstateEnquirySchema,
  realEstateMessageSchema,
  realEstateReviewSchema,
  realEstateReportSchema,
  realEstateModerationSchema,
} = require('../utils/validators');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
});

const rateLimiter = createModerateRateLimiter();

router.use(authenticate);
router.use(rateLimiter);

// GET /api/realestate - List (cached)
router.get('/', async (req, res) => {

  try {
    const { type, intent, location, verified, limit = 50, skip = 0, sort = 'createdAt' } = req.query;
    const properties = await realEstateStore.listRealEstateProperties({
      type, intent, location, verified,
      limit: parseInt(limit), skip: parseInt(skip),
    });
    res.json({ success: true, data: properties, pagination: { limit, skip } });
  } catch (error) {
    logger.error('RealEstate list:', error);
    res.status(500).json({ success: false, message: 'List failed' });
  }
});

// POST /api/realestate - Create
router.post('/', async (req, res) => {
  try {
    const { error, value } = realEstateListingCreateSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const property = await realEstateStore.createRealEstateProperty(value);
    res.status(201).json({ success: true, data: property });
  } catch (error) {
    logger.error('RealEstate create:', error);
    res.status(500).json({ success: false, message: 'Create failed' });
  }
});

// PATCH /api/realestate/:id - Update
router.patch('/:id', async (req, res) => {
  try {
    const { error, value } = realEstateListingUpdateSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const property = await realEstateStore.updateRealEstateProperty(req.params.id, value);
    if (!property) return res.status(404).json({ success: false, message: 'Not found' });

    res.json({ success: true, data: property });
  } catch (error) {
    logger.error('RealEstate update:', error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// DELETE /api/realestate/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await realEstateStore.deleteRealEstateProperty(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    logger.error('RealEstate delete:', error);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

// POST /api/realestate/:id/enquiries
router.post('/:id/enquiries', async (req, res) => {
  try {
    const { error, value } = realEstateEnquirySchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const lead = await realEstateStore.addRealEstateLead(req.params.id, {
      ...value,
      name: req.user.name,
      email: req.user.email,
    });
    res.json({ success: true, data: lead });
  } catch (error) {
    logger.error('RealEstate enquiry:', error);
    res.status(500).json({ success: false, message: 'Enquiry failed' });
  }
});

// POST /api/realestate/:id/messages
router.post('/:id/messages', async (req, res) => {
  try {
    const { error, value } = realEstateMessageSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    await realEstateStore.addRealEstateMessage(req.params.id, {
      ...value,
      from: req.user.name,
      senderEmail: req.user.email,
    });
    res.json({ success: true, message: 'Message sent' });
  } catch (error) {
    logger.error('RealEstate message:', error);
    res.status(500).json({ success: false, message: 'Message failed' });
  }
});

// POST /api/realestate/:id/reviews
router.post('/:id/reviews', async (req, res) => {
  try {
    const { error, value } = realEstateReviewSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    await realEstateStore.addRealEstateReview(req.params.id, {
      ...value,
      author: req.user.name,
      buyerEmail: req.user.email,
    });
    res.json({ success: true, message: 'Review added' });
  } catch (error) {
    logger.error('RealEstate review:', error);
    res.status(500).json({ success: false, message: 'Review failed' });
  }
});

// POST /api/realestate/:id/reports
router.post('/:id/reports', async (req, res) => {
  try {
    const { error, value } = realEstateReportSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    await realEstateStore.addRealEstateReport(req.params.id, {
      ...value,
      reporterEmail: req.user.email,
      reporterName: req.user.name,
    });
    res.json({ success: true, message: 'Report submitted' });
  } catch (error) {
    logger.error('RealEstate report:', error);
    res.status(500).json({ success: false, message: 'Report failed' });
  }
});

// PATCH /api/realestate/:id/moderation (admin)
router.patch('/:id/moderation', authenticate, async (req, res) => {
  try {
    const { error, value } = realEstateModerationSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const property = await realEstateStore.moderateRealEstateProperty(req.params.id, value);
    if (!property) return res.status(404).json({ success: false, message: 'Not found' });

    res.json({ success: true, data: property });
  } catch (error) {
    logger.error('RealEstate moderation:', error);
    res.status(500).json({ success: false, message: 'Moderation failed' });
  }
});

// POST /api/realestate/:id/photos - S3 Uploads
router.post('/:id/photos', upload.array('photos', 10), async (req, res) => {
  try {
    const property = await realEstateStore.findRealEstatePropertyById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const urls = [];
    for (const file of req.files) {
      if (await imageSecurity.isSafe(file.buffer)) {
        const url = await s3.uploadPropertyPhoto({
          buffer: file.buffer,
          filename: `realestate-${req.params.id}-${Date.now()}-${file.originalname}`,
          metadata: { propertyId: req.params.id, userId: req.user.id },
        });
        urls.push(url);
      }
    }

    // Update mediaCount
    await realEstateStore.updateRealEstateProperty(req.params.id, {
      mediaCount: (property.mediaCount || 0) + urls.length,
    });

    res.json({ success: true, data: { urls, totalMedia: property.mediaCount + urls.length } });
  } catch (error) {
    logger.error('RealEstate photo upload:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

module.exports = router;

