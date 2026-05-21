const express = require('express');
const shared = require('./shared');

const router = express.Router();

const {
  models: { FreelancerProvider, FreelancerJob, FreelancerBid, FreelancerCommissionConfig },
  auth: { authenticate, hasAdminPrivileges },
  uploads: { attachmentUpload },
  schemas: { jobCreateSchema, bidCreateSchema, leadPurchaseSchema },
  helpers: {
    logger,
    toNumber,
    buildCode,
    sanitizeJob,
    getRequestUserId,
    getRequestUserPhone,
    getRequestUserName,
    canManageProvider,
    runInTransaction,
    executeIdempotentOperation,
  },
} = shared;

router.post('/jobs', authenticate, attachmentUpload.array('attachments', 8), async (req, res) => {
  try {
    const normalized = {
      ...req.body,
      minBudget: toNumber(req.body.minBudget),
      maxBudget: toNumber(req.body.maxBudget),
    };

    const { error, value } = jobCreateSchema.validate(normalized, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    if (value.maxBudget < value.minBudget) {
      return res.status(400).json({ success: false, message: 'Max budget should be greater than min budget.' });
    }
    if (new Date(value.deadline).getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: 'Deadline should be in the future.' });
    }

    const requesterUserId = getRequestUserId(req);
    const requesterPhone = getRequestUserPhone(req);
    const requesterName = getRequestUserName(req);
    const providedPhone = String(value.customerPhone || '').replace(/\D/g, '');
    if (requesterPhone && providedPhone && requesterPhone !== providedPhone) {
      return res.status(403).json({
        success: false,
        message: 'customerPhone must match the authenticated account phone number.',
      });
    }
    const resolvedCustomerPhone = requesterPhone || providedPhone;
    if (!/^\d{10}$/.test(resolvedCustomerPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Authenticated account must include a valid 10 digit phone number.',
      });
    }
    const resolvedCustomerName = requesterName || String(value.customerName || '').trim();

    const attachments = (req.files || []).map((file) => ({
      originalName: file.originalname,
      filename: file.filename,
      path: `/uploads/freelancer/attachments/${file.filename}`,
      mimeType: file.mimetype,
      size: file.size,
    }));

    const result = await executeIdempotentOperation({
      req,
      scope: 'jobs.create',
      operation: async () => {
        const job = await FreelancerJob.create({
          jobCode: buildCode('FRJ'),
          title: value.title,
          category: value.category,
          location: value.location,
          requirements: value.requirements,
          serviceType: value.serviceType,
          urgency: value.urgency,
          minBudget: value.minBudget,
          maxBudget: value.maxBudget,
          deadline: new Date(value.deadline),
          attachments,
          createdBy: {
            userId: requesterUserId,
            customerName: resolvedCustomerName,
            customerPhone: resolvedCustomerPhone,
            maskedPhone: `******${String(resolvedCustomerPhone).slice(-4)}`,
          },
          status: 'open',
          bidCount: 0,
        });
        return {
          statusCode: 201,
          body: { success: true, data: { job: sanitizeJob(job.toObject(), { includeSensitive: true }) } },
        };
      },
    });
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    logger.error('freelancer job create error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create job post.' });
  }
});

router.post('/jobs/:jobId/bids', authenticate, async (req, res) => {
  try {
    const { error, value } = bidCreateSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const [job, provider] = await Promise.all([
      FreelancerJob.findById(req.params.jobId),
      FreelancerProvider.findById(value.providerId),
    ]);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }
    if (job.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Bids can be submitted only for open jobs.' });
    }
    if (!canManageProvider(req, provider)) {
      return res.status(403).json({ success: false, message: 'You can only bid using your own provider profile.' });
    }

    const result = await executeIdempotentOperation({
      req,
      scope: `jobs.${String(job._id)}.bids.create`,
      operation: async () => {
        const transactionResult = await runInTransaction(async (session) => {
          const duplicateBid = await FreelancerBid.findOne({ jobId: job._id, providerId: provider._id }).session(session);
          if (duplicateBid) {
            return { duplicate: true };
          }

          const bid = await FreelancerBid.create(
            [{
              bidCode: buildCode('FRB'),
              jobId: job._id,
              jobCode: job.jobCode,
              providerId: provider._id,
              providerName: provider.name,
              amount: value.amount,
              timelineDays: value.timelineDays,
              coverLetter: value.coverLetter,
              status: 'submitted',
            }],
            { session }
          );

          await FreelancerJob.updateOne({ _id: job._id }, { $inc: { bidCount: 1 } }, { session });
          return { bid: bid[0] };
        });

        if (transactionResult.duplicate) {
          return { statusCode: 409, body: { success: false, message: 'Provider already submitted a bid for this job.' } };
        }
        return { statusCode: 201, body: { success: true, data: { bid: transactionResult.bid } } };
      },
    });
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    logger.error('freelancer bid create error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create bid.' });
  }
});

router.get('/jobs/:jobId/bids', authenticate, async (req, res) => {
  try {
    const job = await FreelancerJob.findById(req.params.jobId).lean();
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    const isAdmin = hasAdminPrivileges(req.user || {});
    const requesterUserId = getRequestUserId(req);
    const isJobOwner = requesterUserId && String(job.createdBy?.userId || '') === requesterUserId;

    if (!isAdmin && !isJobOwner) {
      return res.status(403).json({ success: false, message: 'Only job owner or admin can view bids.' });
    }

    const bids = await FreelancerBid.find({ jobId: req.params.jobId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: { bids } });
  } catch (error) {
    logger.error('freelancer bids fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch bids.' });
  }
});

router.post('/jobs/:jobId/lead-purchase', authenticate, async (req, res) => {
  try {
    const { error, value } = leadPurchaseSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const provider = await FreelancerProvider.findById(value.providerId);
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found.' });
    if (!canManageProvider(req, provider)) {
      return res.status(403).json({ success: false, message: 'You can only purchase leads for your own provider profile.' });
    }

    const result = await executeIdempotentOperation({
      req,
      scope: `jobs.${String(req.params.jobId)}.lead_purchase`,
      operation: async () => {
        const transactionResult = await runInTransaction(async (session) => {
          const [job, providerDoc, commission] = await Promise.all([
            FreelancerJob.findById(req.params.jobId).session(session),
            FreelancerProvider.findById(value.providerId).session(session),
            FreelancerCommissionConfig.findOne({ configKey: 'default' }).session(session),
          ]);

          if (!job) return { error: { code: 404, message: 'Job not found.' } };
          if (!providerDoc) return { error: { code: 404, message: 'Provider not found.' } };
          if (job.status !== 'open') {
            return { error: { code: 400, message: 'Leads can be purchased only for open jobs.' } };
          }
          if (providerDoc.kycStatus !== 'approved') {
            return { error: { code: 403, message: 'Provider KYC approval is required for lead purchase.' } };
          }

          const alreadyPurchased = (providerDoc.leadPurchaseHistory || []).some(
            (entry) => String(entry.jobId || '') === String(job.jobCode || '')
          );
          if (alreadyPurchased) {
            return { error: { code: 409, message: 'Lead already purchased for this job.' } };
          }

          if (toNumber(providerDoc.leadCredits, 0) <= 0) {
            return { error: { code: 402, message: 'Insufficient lead credits. Please upgrade your plan.' } };
          }

          const leadFee = toNumber(commission?.leadPurchaseFee, 300);
          providerDoc.leadCredits = Math.max(0, toNumber(providerDoc.leadCredits, 0) - 1);
          providerDoc.leadPurchaseHistory.push({
            jobId: job.jobCode,
            amount: leadFee,
            purchasedAt: new Date(),
          });
          await providerDoc.save({ session });

          const duplicateOnJob = (job.leadPurchases || []).some(
            (entry) => String(entry.providerId || '') === String(providerDoc._id)
          );
          if (!duplicateOnJob) {
            job.leadPurchases.push({
              providerId: providerDoc._id,
              amount: leadFee,
              purchasedAt: new Date(),
            });
            await job.save({ session });
          }

          return {
            data: {
              leadFee,
              jobCode: job.jobCode,
              providerName: providerDoc.name,
              remainingLeadCredits: providerDoc.leadCredits,
            },
          };
        });

        if (transactionResult.error) {
          return { statusCode: transactionResult.error.code, body: { success: false, message: transactionResult.error.message } };
        }
        return {
          statusCode: 201,
          body: {
            success: true,
            message: `Lead purchased for ${transactionResult.data.jobCode}.`,
            data: transactionResult.data,
          },
        };
      },
    });
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    logger.error('freelancer lead purchase error:', error);
    return res.status(500).json({ success: false, message: 'Unable to purchase lead.' });
  }
});

module.exports = router;
