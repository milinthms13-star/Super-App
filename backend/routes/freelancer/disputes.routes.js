const express = require('express');
const shared = require('./shared');

const router = express.Router();

const {
  models: { FreelancerBooking, FreelancerDispute, FreelancerProvider },
  auth: { authenticate, verifyAdmin, hasAdminPrivileges },
  uploads: { disputeProofUpload },
  schemas: { disputeCreateSchema, disputeResolveSchema },
  helpers: {
    logger,
    buildCode,
    sanitizeBooking,
    assertBookingAccess,
    logDisputeEvent,
    parsePagination,
    getRequestUserId,
    getRequestUserPhone,
    getRequestUserName,
    enforceBookingTransition,
    executeIdempotentOperation,
    deriveActorRole,
  },
} = shared;

router.post('/bookings/:bookingCode/disputes', authenticate, disputeProofUpload.array('proofs', 8), async (req, res) => {
  try {
    const { error, value } = disputeCreateSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const booking = await FreelancerBooking.findOne({ bookingCode: req.params.bookingCode });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    const canAccess = await assertBookingAccess(req, booking, { allowProviderOwner: true });
    if (!canAccess) {
      return res.status(403).json({ success: false, message: 'You are not allowed to open dispute for this booking.' });
    }

    const actorRole = deriveActorRole(req.user || {});
    const requesterName = getRequestUserName(req);

    const result = await executeIdempotentOperation({
      req,
      scope: `bookings.${booking.bookingCode}.disputes.create`,
      operation: async () => {
        const transition = enforceBookingTransition({ booking, nextStatus: 'disputed' });
        if (!transition.ok) {
          return { statusCode: 400, body: { success: false, message: transition.message } };
        }

        const dispute = await FreelancerDispute.create({
          disputeCode: buildCode('FRD'),
          bookingId: booking._id,
          bookingCode: booking.bookingCode,
          raisedByRole: actorRole,
          raisedByName: requesterName || value.raisedByName,
          raisedAgainstRole: value.raisedAgainstRole,
          reason: value.reason,
          details: value.details,
          proofs: (req.files || []).map((file) => ({
            originalName: file.originalname,
            filename: file.filename,
            path: `/uploads/freelancer/proofs/${file.filename}`,
            mimeType: file.mimetype,
            size: file.size,
          })),
          status: 'open',
        });

        booking.status = 'disputed';
        booking.statusTimeline.push({
          status: 'disputed',
          note: value.reason,
          changedBy: actorRole,
          changedAt: new Date(),
        });
        await booking.save();
        logDisputeEvent(dispute.disputeCode, 'DISPUTE_CREATED', 'open');

        return { statusCode: 201, body: { success: true, data: { dispute } } };
      },
    });
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    logger.error('freelancer dispute create error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create dispute.' });
  }
});

router.get('/disputes', authenticate, async (req, res) => {
  try {
    const { status = 'open', providerId, bookingCode, page, limit } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (bookingCode) query.bookingCode = String(bookingCode).trim();

    const isAdmin = hasAdminPrivileges(req.user || {});
    if (!isAdmin) {
      const requesterUserId = getRequestUserId(req);
      const requesterPhone = getRequestUserPhone(req);
      const bookingQuery = {};
      if (providerId) {
        if (!requesterUserId) {
          return res.status(403).json({ success: false, message: 'Unable to identify dispute scope for this account.' });
        }
        const provider = await FreelancerProvider.findById(providerId).select({ ownerUserId: 1 }).lean();
        if (!provider || String(provider.ownerUserId || '') !== requesterUserId) {
          return res.status(403).json({ success: false, message: 'Provider disputes are only available to provider owner or admin.' });
        }
        bookingQuery.providerId = providerId;
      } else {
        const scopedOr = [];
        if (requesterUserId) scopedOr.push({ 'customer.userId': requesterUserId });
        if (requesterPhone) scopedOr.push({ 'customer.phone': requesterPhone });
        if (scopedOr.length === 0) {
          return res.status(403).json({ success: false, message: 'Unable to identify dispute scope for this account.' });
        }
        bookingQuery.$or = scopedOr;
      }

      if (Object.keys(bookingQuery).length === 0) {
        return res.status(403).json({ success: false, message: 'Unable to identify dispute scope for this account.' });
      }

      const bookings = await FreelancerBooking.find(bookingQuery).select({ _id: 1 }).lean();
      const bookingIds = bookings.map((booking) => booking._id);
      if (bookingIds.length === 0) {
        return res.json({ success: true, data: { disputes: [], pagination: { total: 0, page: 1, limit: 20, pages: 1 } } });
      }
      query.bookingId = { $in: bookingIds };
    }

    const { page: pageNumber, limit: pageLimit, skip } = parsePagination(page, limit, { defaultLimit: 20, maxLimit: 60 });
    const [disputes, total] = await Promise.all([
      FreelancerDispute.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageLimit).lean(),
      FreelancerDispute.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: {
        disputes,
        pagination: {
          total,
          page: pageNumber,
          limit: pageLimit,
          pages: Math.max(1, Math.ceil(total / pageLimit)),
        },
      },
    });
  } catch (error) {
    logger.error('freelancer disputes fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch disputes.' });
  }
});

router.patch('/disputes/:disputeCode/resolve', authenticate, verifyAdmin, async (req, res) => {
  try {
    const { error, value } = disputeResolveSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const dispute = await FreelancerDispute.findOne({ disputeCode: req.params.disputeCode });
    if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found.' });

    const result = await executeIdempotentOperation({
      req,
      scope: `disputes.${dispute.disputeCode}.resolve`,
      operation: async () => {
        dispute.status = value.status;
        dispute.resolution.action = value.action;
        dispute.resolution.note = value.note;
        dispute.resolution.resolvedBy = value.resolvedBy;
        dispute.resolution.resolvedAt = new Date();
        await dispute.save();
        logDisputeEvent(dispute.disputeCode, 'DISPUTE_RESOLVED', value.status);

        const booking = await FreelancerBooking.findById(dispute.bookingId);
        if (booking && value.status === 'resolved') {
          const transition = enforceBookingTransition({ booking, nextStatus: 'work_in_progress' });
          if (!transition.ok) {
            return { statusCode: 400, body: { success: false, message: transition.message } };
          }
          booking.status = 'work_in_progress';
          booking.statusTimeline.push({
            status: 'work_in_progress',
            note: `Dispute resolved: ${value.action}`,
            changedBy: value.resolvedBy,
            changedAt: new Date(),
          });
          await booking.save();
        }

        return {
          statusCode: 200,
          body: {
            success: true,
            data: {
              dispute,
              booking: booking ? sanitizeBooking(booking.toObject(), { includeSensitive: true }) : null,
            },
          },
        };
      },
    });
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    logger.error('freelancer dispute resolve error:', error);
    return res.status(500).json({ success: false, message: 'Unable to resolve dispute.' });
  }
});

module.exports = router;
