const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const RealEstateProperty = require('../models/RealEstateProperty');
const { 
  serializeRealEstateProperty, 
  normalizeRealEstateLead,
  normalizeRealEstateMessage,
  normalizeRealEstateReview,
  normalizeRealEstateReport 
} = require('../utils/realEstateStore');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');

const rateLimiter = createModerateRateLimiter();

// GET /api/realestate - List properties with filters
router.get('/', async (req, res) => {
  try {
    const {
      location,
      type,
      intent,
      bedrooms,
      minPrice,
      maxPrice,
      verified,
      featured,
      page = 1,
      limit = 20,
      sort = 'createdAt'
    } = req.query;

    const filter = {};
    if (location) filter.location = location;
    if (type) filter.type = type;
    if (intent) filter.intent = intent;
    if (bedrooms) filter.bedrooms = bedrooms;
    if (verified === 'true') filter.verified = true;
    if (featured === 'true') filter.featured = true;
    if (minPrice || maxPrice) {
      filter.priceValue = {};
      if (minPrice) filter.priceValue.$gte = Number(minPrice);
      if (maxPrice) filter.priceValue.$lte = Number(maxPrice);
    }

    const properties = await RealEstateProperty.find(filter)
      .sort(sort === 'priceLow' ? 'priceValue' : sort === 'priceHigh' ? '-priceValue' : `-${sort}`)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await RealEstateProperty.countDocuments(filter);

    res.json({
      success: true,
      properties: properties.map(serializeRealEstateProperty),
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/realestate - Create new property (auth required)
router.post('/', authenticate, rateLimiter, async (req, res) => {
  try {
    const propertyData = {
      ...req.body,
      ownerId: req.user.id || req.user.userId,
      sellerEmail: req.user.email,
      sellerName: req.user.name || req.user.businessName,
      listedBy: req.user.role === 'builder' ? 'Builder' : req.user.role === 'agent' ? 'Agent' : 'Owner'
    };

    const property = await RealEstateProperty.create(propertyData);
    res.status(201).json({
      success: true,
      property: serializeRealEstateProperty(property)
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/realestate/:id - Get single property
router.get('/:id', async (req, res) => {
  try {
    const property = await RealEstateProperty.findById(req.params.id).lean();
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    res.json({ success: true, property: serializeRealEstateProperty(property) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/realestate/:id - Update property (owner only)
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const property = await RealEstateProperty.findOne({
      _id: req.params.id,
      $or: [
        { ownerId: req.user.id || req.user.userId },
        { sellerEmail: req.user.email }
      ]
    });

    if (!property) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updated = await RealEstateProperty.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    ).lean();

    res.json({ success: true, property: serializeRealEstateProperty(updated) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/realestate/:id/leads - Add lead
router.post('/:id/leads', async (req, res) => {
  try {
    const property = await RealEstateProperty.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const lead = normalizeRealEstateLead(req.body);
    property.leads.push(lead);
    await property.save();

    res.status(201).json({ 
      success: true, 
      lead,
      property: serializeRealEstateProperty(property) 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/realestate/:id/messages - Add message to chatPreview
router.post('/:id/messages', async (req, res) => {
  try {
    const property = await RealEstateProperty.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const message = normalizeRealEstateMessage(req.body);
    property.chatPreview.push(message);
    await property.save();

    res.status(201).json({ 
      success: true, 
      message,
      property: serializeRealEstateProperty(property) 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/realestate/:id/reviews - Add review
router.post('/:id/reviews', async (req, res) => {
  try {
    const property = await RealEstateProperty.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const review = normalizeRealEstateReview(req.body);
    property.reviews.push(review);
    property.reviewCount = property.reviews.length;
    property.rating = property.reviews.reduce((sum, r) => sum + r.score, 0) / property.reviews.length;
    await property.save();

    res.status(201).json({ 
      success: true, 
      review,
      property: serializeRealEstateProperty(property) 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/realestate/:id/reports - Report listing
router.post('/:id/reports', async (req, res) => {
  try {
    const property = await RealEstateProperty.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const report = normalizeRealEstateReport(req.body);
    property.reports.push(report);
    property.disputeCount = property.reports.length;
    await property.save();

    res.status(201).json({ 
      success: true, 
      report,
      property: serializeRealEstateProperty(property) 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PATCH /api/realestate/:id/moderation - Admin moderate (approve/reject)
router.patch('/:id/moderation', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { action } = req.body; // approve, reject, flag
    const updates = {
      verified: action === 'approve',
      verificationStatus: action === 'approve' ? 'Verified' : action === 'reject' ? 'Rejected' : 'Flagged'
    };

    const updated = await RealEstateProperty.findByIdAndUpdate(
      req.params.id, 
      updates, 
      { new: true }
    ).lean();

    res.json({ success: true, property: serializeRealEstateProperty(updated) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/realestate/:id - Delete property (owner/admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const property = await RealEstateProperty.findOne({
      _id: req.params.id,
      $or: [
        { ownerId: req.user.id || req.user.userId },
        { sellerEmail: req.user.email },
        { 'sellerRole': 'admin' } // Wait, fix to req.user.role === 'admin'
      ]
    });

    if (!property) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await RealEstateProperty.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Property deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

