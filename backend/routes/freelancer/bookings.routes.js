const express = require('express');
const crypto = require('crypto');
const shared = require('./shared');

const router = express.Router();

const {
  models: { FreelancerProvider, FreelancerBooking, FreelancerCommissionConfig, FreelancerPaymentEvent },
  auth: { authenticate, verifyAdmin, hasAdminPrivileges },
  schemas: { bookingCreateSchema, bookingStatusSchema, paymentInitSchema, cancellationSchema, refundSchema },
  limits: { bookingLimiter, paymentLimiter, otpLimiter },
  helpers: {
    logger,
    toNumber,
    hashOtp,
    buildCode,
    getRequestUserId,
    getRequestUserPhone,
    getRequestUserName,
    sanitizeBooking,
    assertBookingAccess,
    logPaymentEvent,
    logBookingEvent,
    parsePagination,
    maskPhone,
    executeIdempotentOperation,
    enforceBookingTransition,
    getIdempotencyKeyFromRequest,
    deriveActorRole,
  },
  constants: { OTP_MAX_ATTEMPTS, OTP_LOCK_MS },
} = shared;

router.post('/payments/webhook', async (req, res) => {
  try {
    const secret = String(process.env.FREELANCER_PAYMENT_WEBHOOK_SECRET || '').trim();
    const providedSignature = String(req.get('x-freelancer-signature') || '').trim();
    const eventId = String(req.get('x-freelancer-event-id') || req.body?.eventId || '').trim();
    const eventType = String(req.body?.eventType || req.body?.type || 'payment_event').trim();
    const bookingCode = String(req.body?.bookingCode || '').trim();
    const payloadString = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.body || {});

    if (!secret) {
      return res.status(503).json({ success: false, message: 'Webhook secret not configured.' });
    }

    const expectedSignature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
    const providedBuffer = Buffer.from(String(providedSignature || ''), 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const signatureMatch =
      providedBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(providedBuffer, expectedBuffer);
    if (!providedSignature || !signatureMatch) {
      return res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
    }
    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Missing webhook event id.' });
    }
    const timestampHeader = String(req.get('x-freelancer-timestamp') || '').trim();
    if (timestampHeader) {
      const timestampMs = Number(timestampHeader);
      const maxSkewMs = 10 * 60 * 1000;
      if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > maxSkewMs) {
        return res.status(400).json({ success: false, message: 'Invalid or stale webhook timestamp.' });
      }
    }

    try {
      await FreelancerPaymentEvent.create({
        eventCode: buildCode('FPE-WEBHOOK'),
        bookingCode,
        eventType,
        amount: toNumber(req.body?.amount, 0),
        status: String(req.body?.status || '').trim(),
        source: 'webhook',
        idempotencyKey: '',
        externalEventId: eventId,
        payload: req.body || {},
      });
    } catch (error) {
      if (error?.code === 11000) {
        return res.json({ success: true, reused: true });
      }
      throw error;
    }

    if (bookingCode) {
      const booking = await FreelancerBooking.findOne({ bookingCode });
      if (booking) {
        const nextStatusRaw = String(req.body?.bookingStatus || '').trim();
        if (nextStatusRaw) {
          const transition = enforceBookingTransition({ booking, nextStatus: nextStatusRaw });
          if (transition.ok) {
            booking.status = nextStatusRaw;
          }
        }

        if (req.body?.paymentStatus) {
          booking.payment.status = String(req.body.paymentStatus).trim();
        }
        booking.payment.lastTransactionRef = String(req.body?.transactionRef || booking.payment.lastTransactionRef || '');
        booking.statusTimeline.push({
          status: booking.status,
          note: `Webhook: ${eventType}`,
          changedBy: 'webhook',
          changedAt: new Date(),
        });
        await booking.save();
        logPaymentEvent(booking.bookingCode, `WEBHOOK_${eventType.toUpperCase()}`, toNumber(req.body?.amount, 0), booking.payment.status);
      }
    }

    return res.json({ success: true });
  } catch (error) {
    logger.error('freelancer payment webhook error:', error);
    return res.status(500).json({ success: false, message: 'Unable to process payment webhook.' });
  }
});

router.post('/bookings', authenticate, bookingLimiter, async (req, res) => {
  try {
    const { error, value } = bookingCreateSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const provider = await FreelancerProvider.findById(value.providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
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

    const initialStatus = value.bookingMode === 'instant' ? 'provider_assigned' : 'requested';
    const result = await executeIdempotentOperation({
      req,
      scope: 'bookings.create',
      operation: async () => {
        const booking = await FreelancerBooking.create({
          bookingCode: buildCode('FRK'),
          providerId: provider._id,
          providerName: provider.name,
          customer: {
            userId: requesterUserId,
            name: resolvedCustomerName,
            phone: resolvedCustomerPhone,
            maskedPhone: maskPhone(resolvedCustomerPhone),
          },
          serviceMode: value.serviceMode,
          bookingMode: value.bookingMode,
          schedule: value.schedule,
          notes: value.notes,
          emergency: value.emergency,
          status: initialStatus,
          providerAssignment: {
            assigned: value.bookingMode === 'instant',
            assignedAt: value.bookingMode === 'instant' ? new Date() : null,
            assignedBy: value.bookingMode === 'instant' ? 'system-auto' : '',
          },
          payment: {
            totalAmount: value.totalAmount,
            escrowAmount: 0,
            status: 'pending',
            milestones: [],
          },
          statusTimeline: [
            {
              status: initialStatus,
              note: value.emergency ? 'Emergency booking request raised.' : 'Booking created.',
              changedBy: 'customer',
              changedAt: new Date(),
            },
          ],
        });
        logBookingEvent(booking.bookingCode, 'CREATED', booking.status);
        return {
          statusCode: 201,
          body: { success: true, data: { booking: sanitizeBooking(booking.toObject(), { includeSensitive: true }) } },
        };
      },
    });
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    logger.error('freelancer booking create error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create booking.' });
  }
});

router.get('/bookings', authenticate, async (req, res) => {
  try {
    const { phone, providerId, status, page, limit } = req.query;
    const query = {};
    if (phone) query['customer.phone'] = String(phone).replace(/\D/g, '');
    if (providerId) query.providerId = providerId;
    if (status && status !== 'all') query.status = status;

    const isAdmin = hasAdminPrivileges(req.user || {});
    const requesterUserId = getRequestUserId(req);
    const requesterPhone = getRequestUserPhone(req);

    if (!isAdmin) {
      const scopedOr = [];
      if (requesterUserId) {
        scopedOr.push({ 'customer.userId': requesterUserId });
      }
      if (requesterPhone) {
        scopedOr.push({ 'customer.phone': requesterPhone });
      }

      if (providerId) {
        const provider = await FreelancerProvider.findById(providerId).select({ ownerUserId: 1 }).lean();
        if (!provider || String(provider.ownerUserId || '') !== requesterUserId) {
          return res.status(403).json({ success: false, message: 'Provider bookings are only available to provider owner or admin.' });
        }
      } else if (scopedOr.length > 0) {
        query.$or = scopedOr;
      } else {
        return res.status(403).json({ success: false, message: 'Unable to identify booking scope for this account.' });
      }
    }

    const { page: pageNumber, limit: pageLimit, skip } = parsePagination(page, limit, {
      defaultLimit: 20,
      maxLimit: 60,
    });

    const [bookings, total] = await Promise.all([
      FreelancerBooking.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageLimit).lean(),
      FreelancerBooking.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: {
        bookings: bookings.map((booking) => sanitizeBooking(booking, { includeSensitive: isAdmin })),
        pagination: {
          total,
          page: pageNumber,
          limit: pageLimit,
          pages: Math.max(1, Math.ceil(total / pageLimit)),
        },
      },
    });
  } catch (error) {
    logger.error('freelancer booking fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch bookings.' });
  }
});

router.patch('/bookings/:bookingCode/assign', authenticate, verifyAdmin, async (req, res) => {
  try {
    const booking = await FreelancerBooking.findOne({ bookingCode: req.params.bookingCode });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    const transition = enforceBookingTransition({ booking, nextStatus: 'provider_assigned' });
    if (!transition.ok) {
      return res.status(400).json({ success: false, message: transition.message });
    }

    booking.providerAssignment.assigned = true;
    booking.providerAssignment.assignedAt = new Date();
    booking.providerAssignment.assignedBy = String(req.body.assignedBy || 'consultant');
    booking.status = 'provider_assigned';
    booking.statusTimeline.push({
      status: 'provider_assigned',
      note: 'Provider assigned to booking.',
      changedBy: String(req.body.assignedBy || 'consultant'),
      changedAt: new Date(),
    });
    await booking.save();
    return res.json({
      success: true,
      data: { booking: sanitizeBooking(booking.toObject(), { includeSensitive: true }) },
    });
  } catch (error) {
    logger.error('freelancer booking assign error:', error);
    return res.status(500).json({ success: false, message: 'Unable to assign provider.' });
  }
});

router.patch('/bookings/:bookingCode/status', authenticate, async (req, res) => {
  try {
    const { error, value } = bookingStatusSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const booking = await FreelancerBooking.findOne({ bookingCode: req.params.bookingCode });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    const canAccess = await assertBookingAccess(req, booking, { allowProviderOwner: true });
    if (!canAccess) {
      return res.status(403).json({ success: false, message: 'You are not allowed to update this booking.' });
    }

    const transition = enforceBookingTransition({ booking, nextStatus: value.status });
    if (!transition.ok) {
      return res.status(400).json({ success: false, message: transition.message });
    }
    const actorRole = deriveActorRole(req.user || {});
    booking.status = value.status;
    booking.statusTimeline.push({
      status: value.status,
      note: value.note,
      changedBy: actorRole,
      changedAt: new Date(),
    });
    await booking.save();
    return res.json({
      success: true,
      data: { booking: sanitizeBooking(booking.toObject(), { includeSensitive: hasAdminPrivileges(req.user || {}) }) },
    });
  } catch (error) {
    logger.error('freelancer booking status update error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update booking status.' });
  }
});

router.post('/bookings/:bookingCode/otp/send', authenticate, otpLimiter, async (req, res) => {
  try {
    const booking = await FreelancerBooking.findOne({ bookingCode: req.params.bookingCode });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    const canAccess = await assertBookingAccess(req, booking, { allowProviderOwner: true });
    if (!canAccess) {
      return res.status(403).json({ success: false, message: 'You are not allowed to request OTP for this booking.' });
    }

    const result = await executeIdempotentOperation({
      req,
      scope: `bookings.${booking.bookingCode}.otp.send`,
      operation: async () => {
        const transition = enforceBookingTransition({ booking, nextStatus: 'otp_pending' });
        if (!transition.ok) {
          return { statusCode: 400, body: { success: false, message: transition.message } };
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        booking.otpVerification.otpCode = hashOtp(otp);
        booking.otpVerification.generatedAt = new Date();
        booking.otpVerification.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        booking.otpVerification.verified = false;
        booking.otpVerification.attempts = 0;
        booking.otpVerification.lockedUntil = null;
        booking.status = 'otp_pending';
        booking.statusTimeline.push({
          status: 'otp_pending',
          note: 'OTP generated for work-start verification.',
          changedBy: 'system',
          changedAt: new Date(),
        });
        await booking.save();

        return {
          statusCode: 200,
          body: {
            success: true,
            message: 'OTP generated for booking start verification.',
            data: {
              bookingCode: booking.bookingCode,
              expiresAt: booking.otpVerification.expiresAt,
              ...(
                process.env.NODE_ENV !== 'production' &&
                String(process.env.FREELANCER_ALLOW_DEV_OTP || '').toLowerCase() === 'true'
                  ? { devOtp: otp }
                  : {}
              ),
            },
          },
        };
      },
    });
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    logger.error('freelancer booking otp send error:', error);
    return res.status(500).json({ success: false, message: 'Unable to generate OTP.' });
  }
});

router.post('/bookings/:bookingCode/otp/verify', authenticate, otpLimiter, async (req, res) => {
  try {
    const otp = String(req.body.otp || '').trim();
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 6 digit OTP.' });
    }
    const booking = await FreelancerBooking.findOne({ bookingCode: req.params.bookingCode });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    const canAccess = await assertBookingAccess(req, booking, { allowProviderOwner: true });
    if (!canAccess) {
      return res.status(403).json({ success: false, message: 'You are not allowed to verify OTP for this booking.' });
    }
    if (!booking.otpVerification.otpCode) {
      return res.status(400).json({ success: false, message: 'OTP not generated for this booking.' });
    }
    if (booking.otpVerification.lockedUntil && booking.otpVerification.lockedUntil.getTime() > Date.now()) {
      return res.status(429).json({ success: false, message: 'OTP verification is temporarily locked. Please retry later.' });
    }
    if (booking.otpVerification.expiresAt && booking.otpVerification.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new OTP.' });
    }
    if (booking.otpVerification.otpCode !== hashOtp(otp)) {
      booking.otpVerification.attempts = toNumber(booking.otpVerification.attempts, 0) + 1;
      if (booking.otpVerification.attempts >= OTP_MAX_ATTEMPTS) {
        booking.otpVerification.lockedUntil = new Date(Date.now() + OTP_LOCK_MS);
      }
      await booking.save();
      return res.status(400).json({ success: false, message: 'OTP verification failed.' });
    }

    const transition = enforceBookingTransition({ booking, nextStatus: 'work_in_progress' });
    if (!transition.ok) {
      return res.status(400).json({ success: false, message: transition.message });
    }
    booking.otpVerification.otpCode = '';
    booking.otpVerification.attempts = 0;
    booking.otpVerification.lockedUntil = null;
    booking.otpVerification.verified = true;
    booking.otpVerification.verifiedAt = new Date();
    booking.status = 'work_in_progress';
    booking.statusTimeline.push({
      status: 'work_in_progress',
      note: 'OTP verified and work started.',
      changedBy: 'customer',
      changedAt: new Date(),
    });
    await booking.save();
    return res.json({
      success: true,
      data: { booking: sanitizeBooking(booking.toObject(), { includeSensitive: hasAdminPrivileges(req.user || {}) }) },
    });
  } catch (error) {
    logger.error('freelancer booking otp verify error:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify OTP.' });
  }
});

router.post('/bookings/:bookingCode/payments/initialize', authenticate, paymentLimiter, async (req, res) => {
  try {
    const { error, value } = paymentInitSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const booking = await FreelancerBooking.findOne({ bookingCode: req.params.bookingCode });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    const canAccess = await assertBookingAccess(req, booking, { allowProviderOwner: true });
    if (!canAccess) {
      return res.status(403).json({ success: false, message: 'You are not allowed to initialize payment for this booking.' });
    }

    const milestoneTotal = value.milestones.reduce((sum, item) => sum + toNumber(item.amount), 0);
    if (Math.abs(milestoneTotal - value.totalAmount) > 1) {
      return res.status(400).json({
        success: false,
        message: 'Milestone total should match total amount.',
      });
    }

    const result = await executeIdempotentOperation({
      req,
      scope: `bookings.${booking.bookingCode}.payments.initialize`,
      operation: async () => {
        const transition = enforceBookingTransition({ booking, nextStatus: 'payment_in_escrow' });
        if (!transition.ok) {
          return { statusCode: 400, body: { success: false, message: transition.message } };
        }

        booking.payment.totalAmount = value.totalAmount;
        booking.payment.escrowAmount = value.totalAmount;
        booking.payment.status = 'in_escrow';
        booking.payment.lastTransactionRef = buildCode('TRX');
        booking.payment.milestones = value.milestones.map((item) => ({
          title: item.title,
          amount: item.amount,
          status: 'pending',
          releasedAt: null,
        }));
        booking.status = 'payment_in_escrow';
        booking.statusTimeline.push({
          status: 'payment_in_escrow',
          note: 'Escrow payment initialized.',
          changedBy: 'customer',
          changedAt: new Date(),
        });

        await booking.save();
        logPaymentEvent(booking.bookingCode, 'ESCROW_INITIALIZED', value.totalAmount, 'in_escrow');
        await FreelancerPaymentEvent.create({
          eventCode: buildCode('FPE'),
          bookingCode: booking.bookingCode,
          eventType: 'ESCROW_INITIALIZED',
          amount: value.totalAmount,
          status: 'in_escrow',
          source: 'api',
          idempotencyKey: getIdempotencyKeyFromRequest(req),
          externalEventId: undefined,
          payload: { milestones: value.milestones },
        }).catch(() => null);
        return {
          statusCode: 200,
          body: {
            success: true,
            data: { booking: sanitizeBooking(booking.toObject(), { includeSensitive: hasAdminPrivileges(req.user || {}) }) },
          },
        };
      },
    });
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    logger.error('freelancer payment init error:', error);
    return res.status(500).json({ success: false, message: 'Unable to initialize escrow payment.' });
  }
});

router.post('/bookings/:bookingCode/payments/milestones/:index/release', authenticate, paymentLimiter, async (req, res) => {
  try {
    const index = Number(req.params.index);
    if (!Number.isInteger(index) || index < 0) {
      return res.status(400).json({ success: false, message: 'Invalid milestone index.' });
    }
    const booking = await FreelancerBooking.findOne({ bookingCode: req.params.bookingCode });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    const canAccess = await assertBookingAccess(req, booking, { allowProviderOwner: true });
    if (!canAccess) {
      return res.status(403).json({ success: false, message: 'You are not allowed to release milestones for this booking.' });
    }

    const milestone = booking.payment.milestones[index];
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found.' });
    }
    if (milestone.status === 'released') {
      return res.status(400).json({ success: false, message: 'Milestone already released.' });
    }

    milestone.status = 'released';
    milestone.releasedAt = new Date();
    const pendingExists = booking.payment.milestones.some((item) => item.status !== 'released');
    booking.payment.status = pendingExists ? 'partial_released' : 'released';
    if (!pendingExists) {
      const transition = enforceBookingTransition({ booking, nextStatus: 'completed' });
      if (!transition.ok) {
        return res.status(400).json({ success: false, message: transition.message });
      }
      booking.status = 'completed';
      booking.statusTimeline.push({
        status: 'completed',
        note: 'All milestones released and booking completed.',
        changedBy: 'customer',
        changedAt: new Date(),
      });
    }
    await booking.save();
    logPaymentEvent(booking.bookingCode, `MILESTONE_${index + 1}_RELEASED`, milestone.amount, 'released');
    return res.json({
      success: true,
      data: { booking: sanitizeBooking(booking.toObject(), { includeSensitive: hasAdminPrivileges(req.user || {}) }) },
    });
  } catch (error) {
    logger.error('freelancer milestone release error:', error);
    return res.status(500).json({ success: false, message: 'Unable to release milestone.' });
  }
});

router.post('/bookings/:bookingCode/payments/refund-request', authenticate, paymentLimiter, async (req, res) => {
  try {
    const { error, value } = refundSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const booking = await FreelancerBooking.findOne({ bookingCode: req.params.bookingCode });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    const canAccess = await assertBookingAccess(req, booking, { allowProviderOwner: false });
    if (!canAccess) {
      return res.status(403).json({ success: false, message: 'You are not allowed to request refund for this booking.' });
    }

    const result = await executeIdempotentOperation({
      req,
      scope: `bookings.${booking.bookingCode}.payments.refund_request`,
      operation: async () => {
        booking.payment.status = 'refund_requested';
        booking.statusTimeline.push({
          status: booking.status,
          note: `Refund requested: ${value.reason}`,
          changedBy: 'customer',
          changedAt: new Date(),
        });
        await booking.save();
        logPaymentEvent(booking.bookingCode, 'REFUND_REQUESTED', toNumber(booking.payment.totalAmount, 0), 'refund_requested');
        return {
          statusCode: 202,
          body: {
            success: true,
            message: 'Refund request submitted and pending review.',
            data: { booking: sanitizeBooking(booking.toObject(), { includeSensitive: hasAdminPrivileges(req.user || {}) }) },
          },
        };
      },
    });
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    logger.error('freelancer refund request error:', error);
    return res.status(500).json({ success: false, message: 'Unable to submit refund request.' });
  }
});

router.patch('/bookings/:bookingCode/cancel', authenticate, async (req, res) => {
  try {
    const { error, value } = cancellationSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const [booking, commission] = await Promise.all([
      FreelancerBooking.findOne({ bookingCode: req.params.bookingCode }),
      FreelancerCommissionConfig.findOne({ configKey: 'default' }),
    ]);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    const isAdmin = hasAdminPrivileges(req.user || {});
    const canAccess = await assertBookingAccess(req, booking, { allowProviderOwner: true });
    if (!canAccess) {
      return res.status(403).json({ success: false, message: 'You are not allowed to cancel this booking.' });
    }
    const actorRole = deriveActorRole(req.user || {});

    const transition = enforceBookingTransition({ booking, nextStatus: 'cancelled' });
    if (!transition.ok) {
      return res.status(400).json({ success: false, message: transition.message });
    }
    const result = await executeIdempotentOperation({
      req,
      scope: `bookings.${booking.bookingCode}.cancel`,
      operation: async () => {
        const penaltyPercent = toNumber(commission?.cancellationPenaltyPercent, 10);
        booking.status = 'cancelled';
        booking.cancellation.requested = true;
        booking.cancellation.requestedBy = actorRole;
        booking.cancellation.reason = value.reason;
        booking.cancellation.policyApplied = `Cancellation penalty up to ${penaltyPercent}% may apply.`;
        booking.cancellation.requestedAt = new Date();
        booking.statusTimeline.push({
          status: 'cancelled',
          note: value.reason,
          changedBy: actorRole,
          changedAt: new Date(),
        });
        await booking.save();
        return {
          statusCode: 200,
          body: {
            success: true,
            data: { booking: sanitizeBooking(booking.toObject(), { includeSensitive: isAdmin }) },
          },
        };
      },
    });
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    logger.error('freelancer cancellation error:', error);
    return res.status(500).json({ success: false, message: 'Unable to cancel booking.' });
  }
});

module.exports = router;
