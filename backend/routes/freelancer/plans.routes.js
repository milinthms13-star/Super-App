const express = require('express');
const shared = require('./shared');

const router = express.Router();

const {
  models: { FreelancerProvider, FreelancerPlanPurchase },
  auth: { authenticate, verifyAdmin, hasAdminPrivileges },
  constants: { SUBSCRIPTION_PLANS },
  schemas: { planPurchaseSchema },
  helpers: {
    logger,
    buildCode,
    getPlanById,
    canManageProvider,
    applyPlanActivation,
    sanitizeProvider,
    runInTransaction,
    getRequestUserId,
    executeIdempotentOperation,
  },
} = shared;

router.get('/plans', async (_req, res) => {
  return res.json({ success: true, data: { plans: SUBSCRIPTION_PLANS } });
});

router.post('/plans/purchase', authenticate, async (req, res) => {
  try {
    const { error, value } = planPurchaseSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const provider = await FreelancerProvider.findById(value.providerId);
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found.' });
    if (!canManageProvider(req, provider)) {
      return res.status(403).json({ success: false, message: 'You can only purchase plans for your own provider profile.' });
    }

    const selectedPlan = getPlanById(value.planId);
    if (!selectedPlan) {
      return res.status(400).json({ success: false, message: 'Selected plan is invalid.' });
    }
    if (selectedPlan.price > 0 && !String(value.paymentReference || '').trim()) {
      return res.status(400).json({ success: false, message: 'Payment reference is required for paid plans.' });
    }
    const result = await executeIdempotentOperation({
      req,
      scope: `providers.${String(provider._id)}.plans.purchase`,
      operation: async () => {
        const startsAt = new Date();
        const endsAt = new Date(startsAt.getTime() + selectedPlan.durationDays * 24 * 60 * 60 * 1000);
        const isFreePlan = selectedPlan.price <= 0;
        const purchase = await FreelancerPlanPurchase.create({
          purchaseCode: buildCode('FRP-PLAN'),
          providerId: provider._id,
          providerName: provider.name,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: selectedPlan.price,
          durationDays: selectedPlan.durationDays,
          status: isFreePlan ? 'active' : 'pending',
          paymentStatus: isFreePlan ? 'paid' : 'pending',
          paymentReference: value.paymentReference,
          startsAt,
          endsAt,
          creditGranted: false,
        });

        if (isFreePlan) {
          await runInTransaction(async (session) => {
            await applyPlanActivation(provider, purchase, { session });
          });
        }

        return {
          statusCode: 201,
          body: {
            success: true,
            message: isFreePlan
              ? 'Plan activated and lead credits updated.'
              : 'Plan purchase created. Activation will happen after payment confirmation.',
            data: { purchase, provider: sanitizeProvider(provider.toObject(), { includeSensitive: true }) },
          },
        };
      },
    });
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    logger.error('freelancer plan purchase error:', error);
    return res.status(500).json({ success: false, message: 'Unable to purchase plan.' });
  }
});

router.patch('/plans/purchases/:purchaseCode/activate', authenticate, verifyAdmin, async (req, res) => {
  try {
    const purchase = await FreelancerPlanPurchase.findOne({ purchaseCode: String(req.params.purchaseCode || '').toUpperCase() });
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Plan purchase not found.' });
    }

    const provider = await FreelancerProvider.findById(purchase.providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    const activated = await runInTransaction(async (session) => applyPlanActivation(provider, purchase, { session }));
    if (!activated) {
      return res.status(409).json({ success: false, message: 'Plan purchase was already activated.' });
    }

    return res.json({
      success: true,
      message: 'Plan purchase activated successfully.',
      data: {
        purchase,
        provider: sanitizeProvider(provider.toObject(), { includeSensitive: true }),
      },
    });
  } catch (error) {
    logger.error('freelancer plan activation error:', error);
    return res.status(500).json({ success: false, message: 'Unable to activate plan purchase.' });
  }
});

router.get('/plans/purchases', authenticate, async (req, res) => {
  try {
    const query = req.query.providerId ? { providerId: req.query.providerId } : {};
    const isAdmin = hasAdminPrivileges(req.user || {});
    if (!isAdmin) {
      if (!query.providerId) {
        return res.status(400).json({ success: false, message: 'providerId is required for non-admin users.' });
      }
      const provider = await FreelancerProvider.findById(query.providerId).select({ ownerUserId: 1 }).lean();
      if (!provider || String(provider.ownerUserId || '') !== getRequestUserId(req)) {
        return res.status(403).json({ success: false, message: 'You can only view purchases for your own provider profile.' });
      }
    }
    const purchases = await FreelancerPlanPurchase.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: { purchases } });
  } catch (error) {
    logger.error('freelancer plan purchases fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch plan purchases.' });
  }
});

module.exports = router;
