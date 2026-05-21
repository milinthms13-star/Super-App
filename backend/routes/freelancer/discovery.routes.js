const express = require('express');
const shared = require('./shared');

const router = express.Router();

const {
  models: { FreelancerProvider, FreelancerJob, FreelancerBooking },
  auth: { optionalToken, authenticate, hasAdminPrivileges },
  constants: {
    DISTRICTS,
    LANGUAGES,
    DIGITAL_CATEGORIES,
    LOCAL_CATEGORIES,
    VERIFICATION_TYPES,
    SUBSCRIPTION_PLANS,
    EMERGENCY_SERVICES,
  },
  helpers: {
    logger,
    sanitizeProvider,
    sanitizeJob,
    parsePagination,
    bootstrapFreelancerModule,
    getRequestUserId,
    canManageProvider,
    escapeRegex,
    deriveFreelancerCapabilities,
  },
} = shared;

router.get('/me/capabilities', authenticate, async (req, res) => {
  return res.json({
    success: true,
    data: {
      capabilities: deriveFreelancerCapabilities(req.user || {}),
    },
  });
});

router.get('/bootstrap', async (_req, res) => {
  try {
    await bootstrapFreelancerModule();
    const [providerCount, jobCount, bookingCount] = await Promise.all([
      FreelancerProvider.countDocuments({ isActive: true }),
      FreelancerJob.countDocuments({ status: { $ne: 'cancelled' } }),
      FreelancerBooking.countDocuments(),
    ]);

    return res.json({
      success: true,
      data: {
        constants: {
          districts: DISTRICTS,
          languages: LANGUAGES,
          digitalCategories: DIGITAL_CATEGORIES,
          localCategories: LOCAL_CATEGORIES,
          verificationTypes: VERIFICATION_TYPES,
          subscriptionPlans: SUBSCRIPTION_PLANS,
          emergencyServices: EMERGENCY_SERVICES,
        },
        counters: { providerCount, jobCount, bookingCount },
      },
    });
  } catch (error) {
    logger.error('freelancer bootstrap error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load freelancer bootstrap data.' });
  }
});

router.get('/providers', optionalToken, async (req, res) => {
  try {
    await bootstrapFreelancerModule();
    const {
      search = '',
      category,
      location,
      rating,
      experience,
      language,
      budget,
      availability,
      serviceType,
      verifiedOnly,
      responseSpeed,
      sortBy = 'rating',
      page,
      limit,
    } = req.query;

    const query = { isActive: true };
    if (category && category !== 'all') query.category = category;
    if (location && location !== 'all') query.district = location;
    if (language && language !== 'all') query.languages = language;
    if (budget && budget !== 'all') query.budget = budget;
    if (availability && availability !== 'all') query.availability = availability;
    if (serviceType && serviceType !== 'all') query.type = serviceType;
    if (String(verifiedOnly) === 'true') query.verified = true;

    const normalizedSearch = String(search || '').trim();
    if (normalizedSearch) {
      const safeSearch = escapeRegex(normalizedSearch);
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { category: { $regex: safeSearch, $options: 'i' } },
        { district: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    if (rating === '4.5+') query.rating = { ...(query.rating || {}), $gte: 4.5 };
    if (rating === '4.8+') query.rating = { ...(query.rating || {}), $gte: 4.8 };

    if (experience === '1-3') query.experience = { $gte: 1, $lte: 3 };
    if (experience === '4-7') query.experience = { $gte: 4, $lte: 7 };
    if (experience === '8+') query.experience = { $gte: 8 };

    if (responseSpeed === 'under-15') query.responseMinutes = { $lte: 15 };
    if (responseSpeed === 'under-30') query.responseMinutes = { $lte: 30 };

    const sortSpec =
      sortBy === 'price-low'
        ? { hourlyRate: 1, rating: -1 }
        : sortBy === 'price-high'
          ? { hourlyRate: -1, rating: -1 }
          : sortBy === 'response'
            ? { responseMinutes: 1, rating: -1 }
            : { rating: -1, responseMinutes: 1 };

    const { page: pageNumber, limit: pageLimit, skip } = parsePagination(page, limit, {
      defaultLimit: 18,
      maxLimit: 60,
    });

    const [providers, total] = await Promise.all([
      FreelancerProvider.find(query).sort(sortSpec).skip(skip).limit(pageLimit).lean(),
      FreelancerProvider.countDocuments(query),
    ]);
    const includeSensitive = hasAdminPrivileges(req.user || {});
    const sanitizedProviders = providers.map((provider) =>
      sanitizeProvider(provider, { includeSensitive })
    );

    return res.json({
      success: true,
      data: {
        providers: sanitizedProviders,
        pagination: {
          total,
          page: pageNumber,
          limit: pageLimit,
          pages: Math.max(1, Math.ceil(total / pageLimit)),
        },
      },
    });
  } catch (error) {
    logger.error('freelancer providers fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch providers.' });
  }
});

router.get('/providers/:providerId', optionalToken, async (req, res) => {
  try {
    const provider = await FreelancerProvider.findById(req.params.providerId).lean();
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    const includeSensitive = canManageProvider(req, provider) || String(provider.ownerUserId || '') === getRequestUserId(req);
    return res.json({ success: true, data: { provider: sanitizeProvider(provider, { includeSensitive }) } });
  } catch (error) {
    logger.error('freelancer provider detail error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch provider profile.' });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    const { category, location, status = 'open', page, limit } = req.query;
    const query = {};
    if (category && category !== 'all') query.category = category;
    if (location && location !== 'all') query.location = location;
    if (status && status !== 'all') query.status = status;

    const { page: pageNumber, limit: pageLimit, skip } = parsePagination(page, limit, {
      defaultLimit: 20,
      maxLimit: 50,
    });

    const [jobs, total] = await Promise.all([
      FreelancerJob.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageLimit).lean(),
      FreelancerJob.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: {
        jobs: jobs.map((job) => sanitizeJob(job)),
        pagination: {
          total,
          page: pageNumber,
          limit: pageLimit,
          pages: Math.max(1, Math.ceil(total / pageLimit)),
        },
      },
    });
  } catch (error) {
    logger.error('freelancer jobs fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch jobs.' });
  }
});

module.exports = router;
