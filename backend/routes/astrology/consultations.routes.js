const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const authMiddleware = require('../../middleware/auth');
const NotificationService = require('../../services/NotificationService');
const {
  sanitizeText,
  parseOptionalDate,
  isBookingOwner,
  hasConsultantAccess,
  ensureConsultantScopeAccess,
  ensureBookingAccess,
  getConsultantByIdPersistent,
  seedAstrologyConsultantsIfNeeded,
  listConsultantsPersistent,
  updateConsultantByIdPersistent,
  addConsultantSlotPersistent,
  removeConsultantSlotPersistent,
  saveConsultationBookingWithLock,
  listConsultationBookings,
  listAllConsultationBookings,
  findConsultationBookingById,
  updateConsultationBookingByIdWithLocks,
  findBookingBySlotLock,
  buildBookingIdempotencyKey,
  toBookingDayKey,
  recordAstrologyOperationalEvent,
  bookingLimiter,
} = require('../../services/astrologyBackendService');

const router = express.Router();
const { authenticate, hasAdminPrivileges } = authMiddleware;

const MIN_BOOKING_LEAD_TIME_MS = 5 * 60 * 1000;
const ACTIVE_BOOKING_STATUSES = new Set(['pending', 'pending_payment', 'confirmed', 'completed']);

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  return res.status(400).json({
    success: false,
    message: 'Invalid request payload.',
    errors: errors.array().map((entry) => ({
      field: entry.path,
      message: entry.msg,
    })),
  });
};

const consultantIdParamValidators = [
  param('consultantId').exists().isString().isLength({ min: 3, max: 80 }),
  validateRequest,
];

const consultantSlotActionValidators = [
  body('consultantId').optional().isString().isLength({ min: 3, max: 80 }),
  body('slotTime').optional().isString().isLength({ min: 2, max: 80 }),
  body('slotLabel').optional().isString().isLength({ min: 2, max: 80 }),
  body('slotId').optional().isString().isLength({ min: 2, max: 80 }),
  body().custom((value, { req }) => {
    return Boolean(req.body?.slotTime || req.body?.slotLabel || req.body?.slotId);
  }).withMessage('slotTime, slotLabel, or slotId is required.'),
  validateRequest,
];

const consultationBookingValidators = [
  body('consultantId').exists().isString().isLength({ min: 3, max: 80 }),
  body('slotId').exists().isString().isLength({ min: 2, max: 80 }),
  body('preferredDate').optional().isISO8601(),
  body('notes').optional().isString().isLength({ max: 280 }),
  validateRequest,
];

const consultationStatusValidators = [
  param('bookingId').isString().isLength({ min: 8, max: 80 }),
  body('status').exists().isIn(['confirmed', 'pending', 'pending_payment', 'completed', 'cancelled']),
  validateRequest,
];

const consultantQueryValidators = [
  query('consultantId').optional().isString().isLength({ min: 3, max: 80 }),
  validateRequest,
];

const toPublicConsultantPayload = (consultant = {}) => ({
  id: sanitizeText(consultant.id || consultant.consultantId, 80),
  name: sanitizeText(consultant.name, 120),
  specialty: sanitizeText(consultant.specialty, 240),
  rate: sanitizeText(consultant.rate, 60),
  amountInr: Number(consultant.amountInr || 0),
  availability: sanitizeText(consultant.availability, 120),
  availableSlots: Array.isArray(consultant.availableSlots)
    ? consultant.availableSlots
        .map((slot) => ({
          id: sanitizeText(slot?.id, 80),
          label: sanitizeText(slot?.label, 80),
          date: sanitizeText(slot?.date, 40),
        }))
        .filter((slot) => slot.id && slot.label)
    : [],
  languages: Array.isArray(consultant.languages)
    ? consultant.languages.map((entry) => sanitizeText(entry, 40)).filter(Boolean)
    : [],
  rating: Number(consultant.rating || 0),
  bio: sanitizeText(consultant.bio, 500),
});

/**
 * GET /api/astrology/consultations/consultants
 * Get list of all consultants
 */
router.get('/consultants', async (req, res) => {
  try {
    await seedAstrologyConsultantsIfNeeded();
    const consultants = await listConsultantsPersistent();
    return res.json({
      success: true,
      data: consultants.map((consultant) => toPublicConsultantPayload(consultant)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to load consultants.',
    });
  }
});

/**
 * GET /api/astrology/consultations/consultants/:consultantId
 * Get specific consultant details
 */
router.get('/consultants/:consultantId', authenticate, consultantIdParamValidators, async (req, res) => {
  const consultantId = sanitizeText(req.params.consultantId, 80);
  if (!ensureConsultantScopeAccess(req, res, consultantId)) {
    return;
  }
  const consultant = await getConsultantByIdPersistent(consultantId);

  if (!consultant) {
    return res.status(404).json({
      success: false,
      message: 'Consultant not found.',
    });
  }

  return res.json({
    success: true,
    data: consultant,
  });
});

/**
 * PUT /api/astrology/consultations/consultants/:consultantId
 * Update consultant details
 */
router.put('/consultants/:consultantId', authenticate, consultantIdParamValidators, async (req, res) => {
  const consultantId = sanitizeText(req.params.consultantId, 80);
  if (!ensureConsultantScopeAccess(req, res, consultantId)) {
    return;
  }
  const payload = req.body || {};
  const consultantUpdates = {};

  if (payload.bio !== undefined) {
    consultantUpdates.bio = sanitizeText(payload.bio, 500);
  }

  if (Array.isArray(payload.specialties)) {
    consultantUpdates.specialty = payload.specialties
      .map((item) => sanitizeText(item, 60))
      .filter(Boolean)
      .join(', ');
  }

  if (Array.isArray(payload.languages)) {
    consultantUpdates.languages = payload.languages.map((item) => sanitizeText(item, 40)).filter(Boolean);
  }

  if (Number(payload.rate) > 0) {
    consultantUpdates.rate = `₹${Number(payload.rate).toLocaleString('en-IN')} / 15 min`;
    consultantUpdates.amountInr = Number(payload.rate);
  }

  const consultant = await updateConsultantByIdPersistent(consultantId, {
    ...consultantUpdates,
  });

  if (!consultant) {
    return res.status(404).json({
      success: false,
      message: 'Consultant not found.',
    });
  }

  return res.json({
    success: true,
    data: consultant,
  });
});

/**
 * POST /api/astrology/consultations/consultants/add-slot
 * Add available slot to consultant
 */
router.post('/consultants/add-slot', authenticate, consultantSlotActionValidators, async (req, res) => {
  const consultantId = sanitizeText(req.body?.consultantId || req.user?.consultantId || req.user?.id || '', 80);
  if (!ensureConsultantScopeAccess(req, res, consultantId)) {
    return;
  }
  const slotLabel = sanitizeText(req.body?.slotTime || req.body?.slotLabel, 80);
  const consultant = await addConsultantSlotPersistent(consultantId, slotLabel);

  if (!consultant) {
    return res.status(404).json({
      success: false,
      message: 'Consultant not found.',
    });
  }

  return res.json({
    success: true,
    data: consultant,
  });
});

/**
 * DELETE /api/astrology/consultations/consultants/remove-slot
 * Remove available slot from consultant
 */
router.delete('/consultants/remove-slot', authenticate, consultantSlotActionValidators, async (req, res) => {
  const consultantId = sanitizeText(req.body?.consultantId || req.user?.consultantId || req.user?.id || '', 80);
  if (!ensureConsultantScopeAccess(req, res, consultantId)) {
    return;
  }
  const slotLabel = sanitizeText(req.body?.slotTime || req.body?.slotId || '', 80);
  const consultant = await removeConsultantSlotPersistent(consultantId, slotLabel);

  if (!consultant) {
    return res.status(404).json({
      success: false,
      message: 'Consultant not found.',
    });
  }

  return res.json({
    success: true,
    data: consultant,
  });
});

/**
 * POST /api/astrology/consultations/book
 * Create new consultation booking
 */
router.post('/book', authenticate, bookingLimiter, consultationBookingValidators, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const consultant = await getConsultantByIdPersistent(req.body?.consultantId);

    if (!consultant) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consultant selection.',
      });
    }

    const requestedSlotId = sanitizeText(req.body?.slotId || req.body?.slot, 80);
    const chosenSlot = consultant.availableSlots.find((slot) => slot.id === requestedSlotId);

    if (!chosenSlot) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consultation slot selection.',
      });
    }

    const preferredDateInput = req.body?.preferredDate;
    const preferredDate =
      preferredDateInput !== undefined ? parseOptionalDate(preferredDateInput) : new Date();
    if (preferredDateInput !== undefined && !preferredDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid preferredDate value.',
      });
    }
    const scheduledDate = preferredDate || new Date();
    if (scheduledDate.getTime() < Date.now() - MIN_BOOKING_LEAD_TIME_MS) {
      return res.status(400).json({
        success: false,
        message: 'preferredDate cannot be in the past.',
      });
    }
    const notes = sanitizeText(req.body?.notes, 280);
    const bookingDayKey = toBookingDayKey(scheduledDate);
    const slotLockPreview = await findBookingBySlotLock({
      consultantId: consultant.id,
      slot: chosenSlot.label,
      preferredDate: scheduledDate,
    });
    if (slotLockPreview && String(slotLockPreview.userId || '') !== userId) {
      await recordAstrologyOperationalEvent({
        category: 'booking',
        eventType: 'slot_conflict_detected',
        severity: 'warn',
        message: 'Slot booking conflict detected before booking create.',
        consultantId: consultant.id,
        bookingId: String(slotLockPreview.id || slotLockPreview._id || ''),
        userId,
        metadata: {
          slotId: requestedSlotId,
          slotLabel: chosenSlot.label,
          bookingDayKey,
        },
      });
      return res.status(409).json({
        success: false,
        message: 'Selected consultation slot is no longer available.',
      });
    }

    const confirmationCode = `ASTRO-${Date.now().toString(36).toUpperCase()}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    const bookingPayload = {
      userId,
      consultantId: consultant.id,
      consultantName: consultant.name,
      slotId: chosenSlot.id,
      slot: chosenSlot.label,
      preferredDate: scheduledDate,
      notes,
      status: consultant.amountInr > 0 ? 'pending_payment' : 'confirmed',
      confirmationCode,
      amountInr: consultant.amountInr,
      currency: 'INR',
      paymentStatus: 'pending',
    };

    const idempotencyKey = sanitizeText(
      req.headers['x-idempotency-key'] ||
        buildBookingIdempotencyKey({
          userId,
          consultantId: consultant.id,
          slot: chosenSlot.label,
          preferredDateDay: bookingDayKey,
        }),
      240
    );
    const bookingResult = await saveConsultationBookingWithLock(bookingPayload, { idempotencyKey });
    const booking = bookingResult.booking;
    if (bookingResult.conflict && String(booking?.userId || '') !== userId) {
      await recordAstrologyOperationalEvent({
        category: 'booking',
        eventType: 'slot_conflict_detected',
        severity: 'warn',
        message: 'Slot lock conflict blocked at DB layer.',
        consultantId: consultant.id,
        bookingId: String(booking?.id || booking?._id || ''),
        userId,
        metadata: {
          slotId: chosenSlot.id,
          slotLabel: chosenSlot.label,
          bookingDayKey,
        },
      });
      return res.status(409).json({
        success: false,
        message: 'Selected consultation slot is no longer available.',
      });
    }
    if (bookingResult.reused && String(booking?.userId || '') === userId) {
      return res.status(200).json({
        success: true,
        data: booking,
        message: 'Existing active booking found for this slot.',
      });
    }

    // 30-min reminder integration
    try {
      const Reminder = require('../../models/Reminder');
      const reminderDueDate = scheduledDate;

      await Reminder.create({
        userId,
        title: 'AstroNila Consultation Reminder',
        description: `Your astrology consultation with ${consultant.name} starts in 30 minutes.`,
        category: 'Personal',
        priority: 'Medium',
        dueDate: reminderDueDate,
        dueTime: undefined,
        completed: false,
        status: 'Reminder scheduled',
        reminders: ['Email', 'In-app'],
        reminderBeforeOffsets: [30],
        email: sanitizeText(req.user?.email || '', 200),
        notificationLog: [],
        notificationCount: 0,
        data: {
          bookingId: booking.id || booking._id || '',
          confirmationCode,
          consultantId: consultant.id,
        },
      });
    } catch (_reminderError) {
      // Booking must not fail due to reminder creation issues
    }

    const bookingNotificationData = {
      userEmail: req.user?.email || '',
      userName: sanitizeText(req.user?.name || 'User', 80),
      consultantName: consultant.name,
      slotTime: chosenSlot.label,
      confirmationCode,
      phoneNumber: sanitizeText(req.user?.phone || req.user?.mobile || '', 20),
      consultantEmail: consultant.email,
      bookingCode: confirmationCode,
    };

    await Promise.allSettled([
      NotificationService.sendBookingConfirmationEmail(bookingNotificationData),
      NotificationService.sendBookingConfirmationSMS(bookingNotificationData),
      NotificationService.notifyConsultantOfBooking({
        consultantEmail: consultant.email,
        consultantName: consultant.name,
        userName: bookingNotificationData.userName,
        slotTime: chosenSlot.label,
        bookingCode: confirmationCode,
      }),
    ]);

    return res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to create consultation booking.',
    });
  }
});

/**
 * GET /api/astrology/consultations
 * Get user's consultation bookings
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const bookings = await listConsultationBookings(userId);

    return res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to load consultation history.',
    });
  }
});

/**
 * GET /api/astrology/consultations/consultant-bookings
 * Get consultant's bookings (admin or consultant only)
 */
router.get('/consultant-bookings', authenticate, consultantQueryValidators, async (req, res) => {
  try {
    const requestedConsultantId = sanitizeText(req.query?.consultantId || '', 80);
    const consultantId = hasAdminPrivileges(req.user)
      ? requestedConsultantId
      : sanitizeText(requestedConsultantId || req.user?.consultantId || req.user?.id || '', 80);
    if (!ensureConsultantScopeAccess(req, res, consultantId)) {
      return;
    }
    const allBookings = await listAllConsultationBookings();
    const scopedBookings = consultantId
      ? allBookings.filter((booking) => booking.consultantId === consultantId)
      : allBookings;

    return res.json({
      success: true,
      data: scopedBookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to load consultant bookings.',
    });
  }
});

/**
 * GET /api/astrology/consultations/consultant-earnings
 * Get consultant's earnings (admin or consultant only)
 */
router.get('/consultant-earnings', authenticate, consultantQueryValidators, async (req, res) => {
  try {
    const requestedConsultantId = sanitizeText(req.query?.consultantId || '', 80);
    const consultantId = hasAdminPrivileges(req.user)
      ? requestedConsultantId
      : sanitizeText(requestedConsultantId || req.user?.consultantId || req.user?.id || '', 80);
    if (!ensureConsultantScopeAccess(req, res, consultantId)) {
      return;
    }
    const allBookings = await listAllConsultationBookings();
    const scopedBookings = consultantId
      ? allBookings.filter((booking) => booking.consultantId === consultantId)
      : allBookings;

    const completed = scopedBookings.filter(
      (booking) => booking.status === 'completed' || booking.paymentStatus === 'completed'
    );
    const total = completed.reduce((sum, booking) => sum + Number(booking.amountInr || 0), 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const month = completed
      .filter((booking) => new Date(booking.createdAt || booking.preferredDate || Date.now()) >= monthStart)
      .reduce((sum, booking) => sum + Number(booking.amountInr || 0), 0);

    return res.json({
      success: true,
      data: {
        total,
        month,
        bookings: completed.length,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to load consultant earnings.',
    });
  }
});

/**
 * PATCH /api/astrology/consultations/:bookingId/status
 * Update booking status
 */
router.patch(
  '/:bookingId/status',
  authenticate,
  bookingLimiter,
  consultationStatusValidators,
  async (req, res) => {
  try {
    const bookingId = sanitizeText(req.params.bookingId, 80);
    const nextStatus = sanitizeText(req.body?.status, 20);
    const allowedStatuses = new Set(['confirmed', 'pending', 'pending_payment', 'completed', 'cancelled']);

    if (!allowedStatuses.has(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking status value.',
      });
    }

    const existingBooking = await findConsultationBookingById(bookingId);
    if (!existingBooking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    const requesterIsAdmin = hasAdminPrivileges(req.user);
    const requesterIsOwner = isBookingOwner(existingBooking, req);
    const requesterCanManageConsultant = hasConsultantAccess(req, existingBooking.consultantId);
    if (!requesterIsAdmin && !requesterCanManageConsultant && !requesterIsOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for this booking.',
      });
    }
    if (!requesterIsAdmin && !requesterCanManageConsultant && requesterIsOwner && nextStatus !== 'cancelled') {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own booking.',
      });
    }

    const booking = await updateConsultationBookingByIdWithLocks(bookingId, { status: nextStatus });
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    return res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to update booking status.',
    });
  }
});

module.exports = router;
