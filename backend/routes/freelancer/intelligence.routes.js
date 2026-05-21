const express = require('express');
const shared = require('./shared');

const router = express.Router();

const {
  models: { FreelancerProvider, FreelancerReport },
  auth: { authenticate },
  constants: { DIGITAL_CATEGORIES },
  schemas: { reportSchema, quoteSchema },
  helpers: { logger, toNumber, sanitizeProvider, buildCode, executeIdempotentOperation },
} = shared;

router.post('/reports', authenticate, async (req, res) => {
  try {
    const { error, value } = reportSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const result = await executeIdempotentOperation({
      req,
      scope: `reports.${value.targetType}.${value.targetId}`,
      operation: async () => {
        const report = await FreelancerReport.create({
          reportCode: buildCode('FRR'),
          targetType: value.targetType,
          targetId: value.targetId,
          reportedByName: value.reportedByName,
          reportedByPhone: value.reportedByPhone,
          reason: value.reason,
          details: value.details,
          status: 'open',
        });
        return { statusCode: 201, body: { success: true, data: { report } } };
      },
    });
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    logger.error('freelancer report create error:', error);
    return res.status(500).json({ success: false, message: 'Unable to submit report.' });
  }
});

router.post('/ai/quote', async (req, res) => {
  try {
    const { error, value } = quoteSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const categoryFactor = DIGITAL_CATEGORIES.includes(value.category) ? 1.4 : 1.1;
    const urgencyFactor =
      value.urgency === 'emergency' ? 1.45 : value.urgency === 'high' ? 1.25 : value.urgency === 'medium' ? 1.1 : 1;
    const skillFactor =
      value.skillLevel === 'expert' ? 1.5 : value.skillLevel === 'senior' ? 1.3 : value.skillLevel === 'mid' ? 1.12 : 1;
    const locationFactor = ['Trivandrum', 'Kottayam'].includes(value.location) ? 1.15 : 1.05;
    const scopeFactor = Math.max(1, Math.min(2.4, value.scope.length / 500));
    const baseline = Math.max(1000, toNumber(value.budget, 0) || 5000);

    const recommendedBudget = baseline * categoryFactor * urgencyFactor * skillFactor * locationFactor * scopeFactor;
    const minEstimate = Math.max(1000, Math.round(recommendedBudget * 0.85));
    const maxEstimate = Math.round(recommendedBudget * 1.18);
    const recommendedDays = Math.max(
      1,
      Math.round((scopeFactor * 4 + (value.skillLevel === 'expert' ? 2 : 4)) * (value.urgency === 'emergency' ? 0.6 : 1))
    );

    const matchedProviders = await FreelancerProvider.find({
      category: value.category,
      district: value.location,
      type: value.serviceType,
      isActive: true,
    })
      .sort({ rating: -1, responseMinutes: 1 })
      .limit(5)
      .lean();

    return res.json({
      success: true,
      data: {
        priceRange: {
          min: minEstimate,
          max: maxEstimate,
        },
        recommendedTimelineDays: {
          min: Math.max(1, recommendedDays - 1),
          max: recommendedDays + 2,
        },
        logic: {
          categoryFactor,
          urgencyFactor,
          skillFactor,
          locationFactor,
          scopeFactor,
        },
        recommendedSkills:
          value.skillLevel === 'expert'
            ? ['Technical specialist', 'Architectural review', 'QA handoff']
            : ['Core specialist', 'Execution support', 'QA review'],
        matchedProviders: matchedProviders.map((provider) => sanitizeProvider(provider)),
      },
    });
  } catch (error) {
    logger.error('freelancer ai quote error:', error);
    return res.status(500).json({ success: false, message: 'Unable to generate AI quote.' });
  }
});

module.exports = router;
