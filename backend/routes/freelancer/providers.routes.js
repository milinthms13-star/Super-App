const express = require('express');
const shared = require('./shared');

const router = express.Router();

const {
  models: { FreelancerProvider, FreelancerBooking },
  auth: { authenticate, verifyAdmin },
  uploads: { kycUpload },
  schemas: { providerOnboardingSchema, reviewSchema },
  helpers: {
    logger,
    buildCode,
    getRequestUserId,
    getRequestUserPhone,
    getRequestUserName,
    sanitizeProvider,
    recalculateProviderRating,
    toNumber,
  },
} = shared;

router.post('/providers/onboard', authenticate, kycUpload.array('kycFiles', 8), async (req, res) => {
  try {
    const normalized = { ...req.body };
    if (typeof normalized.serviceAreas === 'string') {
      try {
        normalized.serviceAreas = JSON.parse(normalized.serviceAreas);
      } catch (_error) {
        normalized.serviceAreas = [];
      }
    }
    if (typeof normalized.languages === 'string') {
      try {
        normalized.languages = JSON.parse(normalized.languages);
      } catch (_error) {
        normalized.languages = [];
      }
    }

    const { error, value } = providerOnboardingSchema.validate(normalized, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const provider = await FreelancerProvider.create({
      providerCode: buildCode('FRP'),
      ownerUserId: getRequestUserId(req),
      name: value.name,
      category: value.category,
      type: value.type,
      district: value.district,
      serviceAreas: value.serviceAreas,
      language: value.language,
      languages: value.languages,
      budget: value.budget,
      availability: value.availability,
      experience: value.experience,
      responseMinutes: value.responseMinutes,
      hourlyRate: value.hourlyRate,
      gigStartsFrom: value.gigStartsFrom,
      about: value.about,
      contactPhone: value.contactPhone,
      contactEmail: value.contactEmail,
      kycStatus: 'pending',
      verificationBadges: ['KYC Pending'],
      leadCredits: 5,
      reviews: [],
      portfolio: [],
    });

    return res.status(201).json({
      success: true,
      message: 'Provider onboarding submitted. KYC review is pending.',
      data: { provider: sanitizeProvider(provider.toObject(), { includeSensitive: false }) },
    });
  } catch (error) {
    logger.error('freelancer provider onboarding error:', error);
    return res.status(500).json({ success: false, message: 'Unable to onboard provider.' });
  }
});

router.patch('/providers/:providerId/kyc', authenticate, verifyAdmin, async (req, res) => {
  try {
    const status = String(req.body.status || '').trim();
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid KYC status.' });
    }
    const provider = await FreelancerProvider.findById(req.params.providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }
    provider.kycStatus = status;
    provider.verified = status === 'approved';
    provider.verificationBadges = status === 'approved' ? ['Verified', 'KYC Approved'] : ['KYC Pending'];
    await provider.save();
    return res.json({ success: true, data: { provider: sanitizeProvider(provider.toObject(), { includeSensitive: true }) } });
  } catch (error) {
    logger.error('freelancer kyc update error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update KYC status.' });
  }
});

router.post('/providers/:providerId/reviews', authenticate, async (req, res) => {
  try {
    const { error, value } = reviewSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const provider = await FreelancerProvider.findById(req.params.providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    const requesterUserId = getRequestUserId(req);
    const requesterPhone = getRequestUserPhone(req);
    const requesterName = getRequestUserName(req);

    const bookingScope = [];
    if (requesterUserId) {
      bookingScope.push({ 'customer.userId': requesterUserId });
    }
    if (requesterPhone) {
      bookingScope.push({ 'customer.phone': requesterPhone });
    }
    if (bookingScope.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Unable to verify review ownership for this account.',
      });
    }

    const completedBooking = await FreelancerBooking.findOne({
      providerId: provider._id,
      status: 'completed',
      $or: bookingScope,
    }).select({ _id: 1, bookingCode: 1 });

    if (!completedBooking) {
      return res.status(403).json({
        success: false,
        message: 'Review is allowed only after completing a booking with this provider.',
      });
    }

    const alreadyReviewed = (provider.reviews || []).some(
      (review) => String(review.bookingCode || '').trim() === String(completedBooking.bookingCode || '').trim()
    );
    if (alreadyReviewed) {
      return res.status(409).json({
        success: false,
        message: 'A review for this completed booking already exists.',
      });
    }

    provider.reviews.push({
      ...value,
      reviewerName: requesterName || value.reviewerName,
      reviewerPhone: requesterPhone || value.reviewerPhone,
      reviewerUserId: requesterUserId,
      bookingCode: completedBooking.bookingCode,
    });
    await provider.save();
    const refreshed = await recalculateProviderRating(provider._id);
    return res.status(201).json({
      success: true,
      data: { provider: sanitizeProvider(refreshed?.toObject ? refreshed.toObject() : refreshed, { includeSensitive: false }) },
    });
  } catch (error) {
    logger.error('freelancer review create error:', error);
    return res.status(500).json({ success: false, message: 'Unable to add review.' });
  }
});

router.post('/providers/:providerId/sponsored', authenticate, verifyAdmin, async (req, res) => {
  try {
    const durationDays = Math.max(1, toNumber(req.body.durationDays, 30));
    const provider = await FreelancerProvider.findById(req.params.providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }
    const sponsoredUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    provider.plans.sponsoredListing = true;
    provider.plans.expiresAt = sponsoredUntil;
    await provider.save();
    return res.json({
      success: true,
      message: `Sponsored listing enabled for ${durationDays} days.`,
      data: { provider: sanitizeProvider(provider.toObject(), { includeSensitive: true }) },
    });
  } catch (error) {
    logger.error('freelancer sponsored update error:', error);
    return res.status(500).json({ success: false, message: 'Unable to enable sponsored listing.' });
  }
});

module.exports = router;
