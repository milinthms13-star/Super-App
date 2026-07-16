const express = require('express');
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

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
});
const rateLimiter = createModerateRateLimiter();

router.use(authenticate);
router.use(rateLimiter);

router.get('/', redisCache.cacheList('realestate:list'), async (req, res) => {
  try {
    const {
      type,
      intent,
      location,
      city,
      verified,
      postingType,
      readyToMove,
      reraOnly,
      bedrooms,
      minPrice,
      maxPrice,
      maxPricePerSqft,
      minSqft,
      sortBy,
      limit = 50,
      skip = 0,
    } = req.query;

    const properties = await realEstateStore.listRealEstateProperties({
      type,
      intent,
      location: location || city,
      verified,
      postingType,
      readyToMove,
      reraOnly,
      bedrooms: bedrooms !== undefined ? parseInt(bedrooms, 10) : undefined,
      minPrice: minPrice !== undefined ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice !== undefined ? parseFloat(maxPrice) : undefined,
      maxPricePerSqft: maxPricePerSqft !== undefined ? parseFloat(maxPricePerSqft) : undefined,
      minSqft: minSqft !== undefined ? parseFloat(minSqft) : undefined,
      sortBy,
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
    });

    res.json({
      success: true,
      data: properties,
      pagination: { limit: parseInt(limit, 10), skip: parseInt(skip, 10), total: properties.length },
    });
  } catch (error) {
    logger.error('RealEstate list:', error);
    res.status(500).json({ success: false, message: 'List failed' });
  }
});

// ─── Platform stats endpoint ──────────────────────────────────────────────────
router.get('/meta/stats', async (req, res) => {
  try {
    const all = await realEstateStore.listRealEstateProperties({ limit: 5000, skip: 0 });

    const total = all.length;
    const verified = all.filter((p) => p.verified).length;
    const withRera = all.filter((p) => p.reraNumber).length;
    const readyToMove = all.filter((p) => p.readyToMove).length;
    const forSale = all.filter((p) => p.intent === 'sale').length;
    const forRent = all.filter((p) => p.intent === 'rent').length;

    const priceValues = all.filter((p) => p.priceValue > 0).map((p) => p.priceValue);
    const avgPriceLakhs = priceValues.length
      ? Math.round(priceValues.reduce((s, v) => s + v, 0) / priceValues.length)
      : 0;

    // Price per sqft across all listings
    const ppsfValues = all
      .filter((p) => p.priceValue > 0 && p.areaSqft > 0)
      .map((p) => (p.priceValue * 100000) / p.areaSqft);
    const avgPricePerSqft = ppsfValues.length
      ? Math.round(ppsfValues.reduce((s, v) => s + v, 0) / ppsfValues.length)
      : 0;

    // Top cities by listing count
    const cityMap = {};
    all.forEach((p) => {
      const city = (p.location || 'Unknown').trim();
      cityMap[city] = (cityMap[city] || 0) + 1;
    });
    const topCities = Object.entries(cityMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([city, count]) => ({ city, count }));

    // Total leads across all listings
    const totalLeads = all.reduce((s, p) => s + (p.leads?.length || 0), 0);

    // Listings by type
    const typeMap = {};
    all.forEach((p) => {
      typeMap[p.type] = (typeMap[p.type] || 0) + 1;
    });
    const byType = Object.entries(typeMap)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));

    res.json({
      success: true,
      data: {
        total,
        verified,
        verifiedPct: total > 0 ? Math.round((verified / total) * 100) : 0,
        withRera,
        reraPct: total > 0 ? Math.round((withRera / total) * 100) : 0,
        readyToMove,
        forSale,
        forRent,
        avgPriceLakhs,
        avgPricePerSqft,
        totalLeads,
        topCities,
        byType,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('RealEstate stats:', error);
    res.status(500).json({ success: false, message: 'Stats failed' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const property = await realEstateStore.findRealEstatePropertyById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    res.json({ success: true, data: property });
  } catch (error) {
    logger.error('RealEstate detail:', error);
    res.status(500).json({ success: false, message: 'Fetch failed' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { error, value } = realEstateListingCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const property = await realEstateStore.createRealEstateProperty(value);
    res.status(201).json({ success: true, data: property });
  } catch (error) {
    logger.error('RealEstate create:', error);
    res.status(500).json({ success: false, message: 'Create failed' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { error, value } = realEstateListingUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const property = await realEstateStore.updateRealEstateProperty(req.params.id, value);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    res.json({ success: true, data: property });
  } catch (error) {
    logger.error('RealEstate update:', error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await realEstateStore.deleteRealEstateProperty(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    logger.error('RealEstate delete:', error);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

router.post('/:id/enquiries', async (req, res) => {
  try {
    const { error, value } = realEstateEnquirySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

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

router.post('/:id/messages', async (req, res) => {
  try {
    const { error, value } = realEstateMessageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

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

router.post('/:id/reviews', async (req, res) => {
  try {
    const { error, value } = realEstateReviewSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

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

router.post('/:id/reports', async (req, res) => {
  try {
    const { error, value } = realEstateReportSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

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

router.patch('/:id/moderation', authenticate, async (req, res) => {
  try {
    const { error, value } = realEstateModerationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const property = await realEstateStore.moderateRealEstateProperty(req.params.id, value);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    res.json({ success: true, data: property });
  } catch (error) {
    logger.error('RealEstate moderation:', error);
    res.status(500).json({ success: false, message: 'Moderation failed' });
  }
});

router.post('/:id/photos', upload.array('photos', 10), async (req, res) => {
  try {
    const property = await realEstateStore.findRealEstatePropertyById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

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

    await realEstateStore.updateRealEstateProperty(req.params.id, {
      mediaCount: (property.mediaCount || 0) + urls.length,
    });

    res.json({
      success: true,
      data: {
        urls,
        totalMedia: (property.mediaCount || 0) + urls.length,
      },
    });
  } catch (error) {
    logger.error('RealEstate photo upload:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

module.exports = router;
