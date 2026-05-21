const express = require('express');
const crypto = require('crypto');
const logger = require('../utils/logger');

const authMiddleware = require('../middleware/auth');
const NotificationService = require('../services/NotificationService');
const ABTestingService = require('../services/abTestingService');
const astrologyProviderService = require('../services/astrologyProviderService');
const {
  validateAstrologyProfileInput,
  buildAstrologyReportPayload,
  getAstrologyLegalDisclaimer,
} = require('../utils/astrologyBackendUpgradeHelpers');
const {
  shouldUseDevStore,
  sanitizeText,
  parseOptionalDate,
  isBookingOwner,
  getRequestUserId,
  isConsultantUser,
  getConsultantIdsForUser,
  hasConsultantAccess,
  ensureConsultantScopeAccess,
  ensureBookingAccess,
  DEFAULT_BIRTH_TIME_ZONE,
  normalizeBirthTimeZone,
  normalizeFavoriteTopics,
  normalizeSavedReading,
  mergeSavedReadings,
  normalizeBoolean,
  normalizeFamilyProfiles,
  normalizeKundliHistory,
  normalizeCompatibilityHistory,
  getKundliFallbackProfile,
  buildKundliData,
  buildKundliPdfBuffer,
  hashText,
  buildCompatibility,
  listConsultants,
  getConsultantById,
  updateConsultantById,
  addConsultantSlot,
  removeConsultantSlot,
  getPanchangamData,
  getFestivalData,
  findProfileByUserId,
  saveProfileByUserId,
  saveConsultationBooking,
  listConsultationBookings,
  listAllConsultationBookings,
  findConsultationBookingById,
  updateConsultationBookingById,
  findConsultationBookingByPaymentOrderId,
  formatPeriodStart,
  normalizeReportLanguage,
  buildMonthwisePredictions,
  buildTotalAreaInsights,
  ensurePdfSpace,
  drawScoreBarChart,
  buildAnalyticsMetrics,
  buildAnalyticsCsv,
  buildAnalyticsPdfBuffer,
  buildHoroscopePdfBuffer,
  razorpay,
  assistantLimiter,
  compatibilityLimiter,
  bookingLimiter,
  paymentLimiter,
  zodiacSigns,
  getDailyHoroscope,
  getSignDetails,
  normalizeSign,
  calculateNakshatra,
  calculateBirthAstroProfile,
} = require('../services/astrologyBackendService');

const router = express.Router();
const { authenticate, hasAdminPrivileges } = authMiddleware;

router.get('/signs', (req, res) => {
  res.json({
    success: true,
    data: zodiacSigns,
  });
});

router.get('/daily/:sign', (req, res) => {
  const dailyReading = getDailyHoroscope(req.params.sign);

  if (!dailyReading) {
    return res.status(400).json({
      success: false,
      message: 'Invalid zodiac sign',
    });
  }

  return res.json({
    success: true,
    data: dailyReading,
  });
});

router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const profile = await findProfileByUserId(userId);

    return res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const existingProfile = await findProfileByUserId(userId);
    const sign = normalizeSign(req.body?.sign || existingProfile?.sign || 'aries');
    const signDetails = getSignDetails(sign);

    if (!signDetails) {
      return res.status(400).json({
        success: false,
        message: 'Invalid zodiac sign',
      });
    }

    const birthDate =
      req.body?.birthDate !== undefined
        ? parseOptionalDate(req.body.birthDate)
        : parseOptionalDate(existingProfile?.birthDate);
    const favoriteTopics =
      req.body?.preferences?.favoriteTopics !== undefined
        ? normalizeFavoriteTopics(req.body.preferences.favoriteTopics)
        : normalizeFavoriteTopics(existingProfile?.preferences?.favoriteTopics);
    const receiveDailyHoroscope = normalizeBoolean(
      req.body?.preferences?.receiveDailyHoroscope,
      normalizeBoolean(existingProfile?.preferences?.receiveDailyHoroscope, true)
    );
    const dailyReading = getDailyHoroscope(sign);

    const birthDateValue =
      req.body?.birthDate !== undefined
        ? req.body.birthDate
        : existingProfile?.birthDate;
    const birthTimeValue =
      req.body?.birthTime !== undefined
        ? req.body.birthTime
        : existingProfile?.birthTime;
    const birthTimezoneValue =
      req.body?.birthTimezone !== undefined
        ? req.body.birthTimezone
        : existingProfile?.birthTimezone;
    const normalizedBirthTimezone = normalizeBirthTimeZone(
      birthTimezoneValue,
      normalizeBirthTimeZone(existingProfile?.birthTimezone, DEFAULT_BIRTH_TIME_ZONE)
    );
    const explicitNakshatra =
      req.body?.nakshatra !== undefined
        ? sanitizeText(req.body.nakshatra, 40)
        : undefined;
    const explicitRashi =
      req.body?.rashi !== undefined
        ? sanitizeText(req.body.rashi, 40)
        : undefined;
    const explicitLagna =
      req.body?.lagna !== undefined
        ? sanitizeText(req.body.lagna, 40)
        : undefined;
    const autoBirthProfile =
      birthDateValue && birthTimeValue
        ? calculateBirthAstroProfile(birthDateValue, birthTimeValue, {
            timeZone: normalizedBirthTimezone,
          })
        : undefined;
    const calculatedNakshatra =
      explicitNakshatra ||
      autoBirthProfile?.nakshatra ||
      (birthDateValue && birthTimeValue
        ? calculateNakshatra(birthDateValue, birthTimeValue, {
            timeZone: normalizedBirthTimezone,
          })
        : undefined);
    const calculatedRashi = explicitRashi || autoBirthProfile?.rashi;

    const nextProfile = {
      userId,
      sign,
      birthDate,
      birthTime:
        req.body?.birthTime !== undefined
          ? sanitizeText(req.body.birthTime, 16)
          : sanitizeText(existingProfile?.birthTime, 16),
      birthPlace:
        req.body?.birthPlace !== undefined
          ? sanitizeText(req.body.birthPlace, 120)
          : sanitizeText(existingProfile?.birthPlace, 120),
      birthTimezone: normalizedBirthTimezone,
      nakshatra:
        explicitNakshatra !== undefined
          ? explicitNakshatra
          : sanitizeText(calculatedNakshatra || existingProfile?.nakshatra || 'Ashwini', 40),
      rashi: sanitizeText(calculatedRashi || existingProfile?.rashi || '', 40),
      lagna: sanitizeText(explicitLagna || existingProfile?.lagna || '', 40),
      gender:
        req.body?.gender !== undefined
          ? sanitizeText(req.body.gender, 30).toLowerCase()
          : sanitizeText(existingProfile?.gender, 30).toLowerCase(),
      preferences: {
        receiveDailyHoroscope,
        favoriteTopics,
      },
      notifications: {
        dailyHoroscope: normalizeBoolean(
          req.body?.notifications?.dailyHoroscope,
          normalizeBoolean(existingProfile?.notifications?.dailyHoroscope, true)
        ),
        goodMuhurtam: normalizeBoolean(
          req.body?.notifications?.goodMuhurtam,
          normalizeBoolean(existingProfile?.notifications?.goodMuhurtam, true)
        ),
        festivalReminders: normalizeBoolean(
          req.body?.notifications?.festivalReminders,
          normalizeBoolean(existingProfile?.notifications?.festivalReminders, true)
        ),
        dashaAlerts: normalizeBoolean(
          req.body?.notifications?.dashaAlerts,
          normalizeBoolean(existingProfile?.notifications?.dashaAlerts, true)
        ),
      },
      familyProfiles:
        req.body?.familyProfiles !== undefined
          ? normalizeFamilyProfiles(req.body.familyProfiles)
          : normalizeFamilyProfiles(existingProfile?.familyProfiles),
      savedReadings: mergeSavedReadings(existingProfile?.savedReadings, dailyReading),
      kundliHistory:
        req.body?.kundliHistory !== undefined
          ? normalizeKundliHistory(req.body.kundliHistory)
          : normalizeKundliHistory(existingProfile?.kundliHistory),
      compatibilityHistory:
        req.body?.compatibilityHistory !== undefined
          ? normalizeCompatibilityHistory(req.body.compatibilityHistory)
          : normalizeCompatibilityHistory(existingProfile?.compatibilityHistory),
    };

    const profile = await saveProfileByUserId(userId, nextProfile);

    return res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

router.get('/panchangam', async (req, res) => {
  const result = await astrologyProviderService.getPanchangam({
    date: req.query?.date || '',
    timezone: req.query?.timezone || 'Asia/Kolkata',
    fallbackData: getPanchangamData(),
  });
  logger.info(`Astrology panchangam served from ${result.meta.source}`);
  return res.json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

router.get('/festivals', async (req, res) => {
  const result = await astrologyProviderService.getFestivals({
    region: req.query?.region || 'IN-KL',
    month: req.query?.month || '',
    year: req.query?.year || '',
    fallbackData: getFestivalData(),
  });
  logger.info(`Astrology festivals served from ${result.meta.source}`);
  return res.json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

router.post('/kundli', authenticate, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const profile = await findProfileByUserId(userId);
    const payloadProfile = req.body?.profile || profile || {};
    const fallbackSign = normalizeSign(payloadProfile?.sign || profile?.sign || 'aries');
    const inputValidation = validateAstrologyProfileInput(payloadProfile);

    if (!inputValidation.ok) {
      return res.status(400).json({
        success: false,
        message: inputValidation.errors[0] || 'Invalid birth profile details.',
        errors: inputValidation.errors,
      });
    }

    const kundliData = buildKundliData(payloadProfile, fallbackSign);
    const reportPayload = buildAstrologyReportPayload(payloadProfile, 'free');

    return res.json({
      success: true,
      data: kundliData,
      meta: {
        reportPayload,
        disclaimer: getAstrologyLegalDisclaimer(),
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to generate Kundli.',
    });
  }
});

router.post('/kundli/report', authenticate, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const profile = await findProfileByUserId(userId);
    const payloadProfile = req.body?.profile || {};
    const fallbackSign = normalizeSign(payloadProfile?.sign || profile?.sign || 'aries');
    const kundliData = buildKundliData(payloadProfile, fallbackSign);
    const profileName = sanitizeText(payloadProfile?.name || req.user?.name || 'Astrology User', 80);
    const pdfBuffer = await buildKundliPdfBuffer(kundliData, profileName);
    const reportDate = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="kundli-report-${reportDate}.pdf"`);
    res.setHeader('Content-Length', String(pdfBuffer.length));
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to generate Kundli PDF report.',
    });
  }
});

router.post('/compatibility', compatibilityLimiter, async (req, res) => {
  const sign = normalizeSign(req.body?.sign);
  const partnerSign = normalizeSign(req.body?.partnerSign);

  if (!getSignDetails(sign) || !getSignDetails(partnerSign)) {
    return res.status(400).json({
      success: false,
      message: 'Both sign and partnerSign must be valid zodiac signs.',
    });
  }

  const fallbackData = buildCompatibility(sign, partnerSign);
  const result = await astrologyProviderService.getCompatibility({
    sign,
    partnerSign,
    fallbackData,
  });

  return res.json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

router.post('/assistant', assistantLimiter, async (req, res) => {
  const sign = normalizeSign(req.body?.sign || 'aries');
  const signDetails = getSignDetails(sign) || zodiacSigns[0];
  const question = sanitizeText(req.body?.question, 500);

  if (!question || question.length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a meaningful question for the assistant.',
    });
  }

  const fallbackData = {
    answer: `For ${signDetails.label}, prioritize clear routines and family harmony. Your question suggests focusing on one practical step each day.`,
    tips: [
      'Begin the day with a short calm routine before major decisions.',
      'Use a fixed time window for financial planning and communication.',
      `For ${signDetails.label}, patience and consistency improve outcomes this week.`,
    ],
    sign: signDetails.sign,
    quality: {
      source: 'template-engine',
      guidanceOnly: true,
      isSynthetic: true,
      note: 'Assistant response is currently guidance-oriented template output.',
    },
  };
  const result = await astrologyProviderService.getAssistantReply({
    sign: signDetails.sign,
    question,
    fallbackData,
  });

  return res.json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

router.get('/consultants', (req, res) => {
  return res.json({
    success: true,
    data: listConsultants(),
  });
});

router.get('/consultants/:consultantId', authenticate, async (req, res) => {
  const consultantId = sanitizeText(req.params.consultantId, 80);
  if (!ensureConsultantScopeAccess(req, res, consultantId)) {
    return;
  }
  const consultant = getConsultantById(consultantId);

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

router.put('/consultants/:consultantId', authenticate, async (req, res) => {
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

  const consultant = updateConsultantById(consultantId, {
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

router.post('/consultants/add-slot', authenticate, async (req, res) => {
  const consultantId = sanitizeText(req.body?.consultantId || req.user?.consultantId || req.user?.id || '', 80);
  if (!ensureConsultantScopeAccess(req, res, consultantId)) {
    return;
  }
  const slotLabel = sanitizeText(req.body?.slotTime || req.body?.slotLabel, 80);
  const consultant = addConsultantSlot(consultantId, slotLabel);

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

router.delete('/consultants/remove-slot', authenticate, async (req, res) => {
  const consultantId = sanitizeText(req.body?.consultantId || req.user?.consultantId || req.user?.id || '', 80);
  if (!ensureConsultantScopeAccess(req, res, consultantId)) {
    return;
  }
  const slotLabel = sanitizeText(req.body?.slotTime || req.body?.slotId || '', 80);
  const consultant = removeConsultantSlot(consultantId, slotLabel);

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

router.post('/consultations/book', authenticate, bookingLimiter, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const consultant = getConsultantById(req.body?.consultantId);

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

    const preferredDate = parseOptionalDate(req.body?.preferredDate || new Date());
    const notes = sanitizeText(req.body?.notes, 280);
    const confirmationCode = `ASTRO-${Date.now().toString(36).toUpperCase()}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    const bookingPayload = {
      userId,
      consultantId: consultant.id,
      consultantName: consultant.name,
      slot: chosenSlot.label,
      preferredDate: preferredDate || new Date(),
      notes,
      status: consultant.amountInr > 0 ? 'pending_payment' : 'confirmed',
      confirmationCode,
      amountInr: consultant.amountInr,
      currency: 'INR',
      paymentStatus: 'pending',
    };

    const booking = await saveConsultationBooking(bookingPayload);

    // 30-min reminder integration with the existing Reminder schedulers
    // (EmailReminderScheduler / In-app reminder delivery via reminders pipeline)
    try {
      const Reminder = require('../models/Reminder');

      const reminderDueDate = preferredDate || new Date();

      const reminder = await Reminder.create({
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
        // Helps dedupe/resume later if you extend reminder handling
        data: {
          bookingId: booking.id || booking._id || '',
          confirmationCode,
          consultantId: consultant.id,
        },
      });

      // Keep reference (non-critical)
      // eslint-disable-next-line no-unused-vars
      reminder;
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

router.get('/consultations/consultant-bookings', authenticate, async (req, res) => {
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

router.get('/consultations/consultant-earnings', authenticate, async (req, res) => {
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

router.patch('/consultations/:bookingId/status', authenticate, bookingLimiter, async (req, res) => {
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

    const booking = await updateConsultationBookingById(bookingId, { status: nextStatus });
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

router.get('/consultations', authenticate, async (req, res) => {
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

router.post('/consultations/:bookingId/payment/create-order', authenticate, paymentLimiter, async (req, res) => {
  try {
    const bookingId = sanitizeText(req.params.bookingId, 80);
    const booking = await findConsultationBookingById(bookingId);

    if (!ensureBookingAccess(booking, req, res)) {
      return;
    }

    const amountInr = Number(booking.amountInr || 0);
    if (String(booking.status || '').toLowerCase() === 'cancelled') {
      return res.status(409).json({
        success: false,
        message: 'Cannot create payment order for a cancelled booking.',
      });
    }
    if (String(booking.paymentStatus || '').toLowerCase() === 'completed') {
      return res.status(409).json({
        success: false,
        message: 'Payment is already completed for this booking.',
        data: booking,
      });
    }
    if (amountInr < 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking amount for payment.',
      });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amountInr * 100),
      currency: 'INR',
      receipt: `astro-${booking.confirmationCode || bookingId}`,
      notes: {
        bookingId: String(booking.id || booking._id || bookingId),
        consultantId: booking.consultantId,
        userId: String(req.user._id || req.user.id),
      },
    });

    await updateConsultationBookingById(booking.id || booking._id || bookingId, {
      paymentOrderId: order.id,
      paymentStatus: 'pending',
      status: 'pending_payment',
    });

    return res.json({
      success: true,
      data: {
        bookingId: booking.id || booking._id || bookingId,
        orderId: order.id,
        amountInr,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID || 'test_key',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to create payment order.',
    });
  }
});

router.post('/consultations/:bookingId/payment/verify', authenticate, paymentLimiter, async (req, res) => {
  try {
    const bookingId = sanitizeText(req.params.bookingId, 80);
    const { orderId, paymentId, signature } = req.body || {};
    const booking = await findConsultationBookingById(bookingId);

    if (!ensureBookingAccess(booking, req, res)) {
      return;
    }
    const normalizedPaymentId = sanitizeText(paymentId, 120);
    const normalizedSignature = sanitizeText(signature, 200);
    if (!normalizedPaymentId || !normalizedSignature) {
      return res.status(400).json({
        success: false,
        message: 'paymentId and signature are required for verification.',
      });
    }

    if (
      String(booking.paymentStatus || '').toLowerCase() === 'completed' &&
      booking.paymentId &&
      String(booking.paymentId) === normalizedPaymentId
    ) {
      return res.json({
        success: true,
        data: booking,
      });
    }

    const expectedOrderId = sanitizeText(orderId || booking.paymentOrderId, 120);
    if (!expectedOrderId) {
      return res.status(400).json({
        success: false,
        message: 'orderId is required for verification.',
      });
    }
    if (booking.paymentOrderId && expectedOrderId !== String(booking.paymentOrderId)) {
      return res.status(400).json({
        success: false,
        message: 'Provided orderId does not match booking payment order.',
      });
    }
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret');
    shasum.update(`${expectedOrderId}|${normalizedPaymentId}`);
    const digest = shasum.digest('hex');

    if (digest !== normalizedSignature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed.',
      });
    }

    const updatedBooking = await updateConsultationBookingById(booking.id || booking._id || bookingId, {
      paymentStatus: 'completed',
      paymentOrderId: expectedOrderId,
      paymentId: normalizedPaymentId,
      paymentSignature: normalizedSignature,
      paymentDate: new Date(),
      status: booking.status === 'cancelled' ? 'cancelled' : 'confirmed',
    });

    return res.json({
      success: true,
      data: updatedBooking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to verify payment.',
    });
  }
});

router.get('/consultations/:bookingId/payment', authenticate, paymentLimiter, async (req, res) => {
  try {
    const bookingId = sanitizeText(req.params.bookingId, 80);
    const booking = await findConsultationBookingById(bookingId);

    if (!ensureBookingAccess(booking, req, res)) {
      return;
    }

    return res.json({
      success: true,
      data: {
        bookingId: booking.id || booking._id || bookingId,
        paymentStatus: booking.paymentStatus || 'pending',
        bookingStatus: booking.status || 'pending_payment',
        paymentOrderId: booking.paymentOrderId || '',
        paymentId: booking.paymentId || '',
        amountInr: Number(booking.amountInr || 0),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to fetch payment status.',
    });
  }
});

router.post('/payment/webhook/razorpay', async (req, res) => {
  try {
    const signatureHeader = sanitizeText(
      req.headers['x-razorpay-signature'] || req.headers['X-Razorpay-Signature'],
      256
    );
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || 'test_secret';

    const rawBodyBuffer =
      Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(
            typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}),
            'utf8'
          );
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBodyBuffer)
      .digest('hex');

    if (!signatureHeader || computedSignature !== signatureHeader) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Razorpay webhook signature.',
      });
    }

    const payloadText = rawBodyBuffer.toString('utf8');
    const eventPayload = payloadText ? JSON.parse(payloadText) : {};
    const eventName = sanitizeText(eventPayload?.event, 80).toLowerCase();
    const paymentEntity = eventPayload?.payload?.payment?.entity || {};
    const orderEntity = eventPayload?.payload?.order?.entity || {};

    const webhookOrderId = sanitizeText(
      paymentEntity?.order_id || paymentEntity?.orderId || orderEntity?.id || '',
      120
    );
    const webhookPaymentId = sanitizeText(paymentEntity?.id || paymentEntity?.payment_id || '', 120);
    const webhookNotes = paymentEntity?.notes && typeof paymentEntity.notes === 'object' ? paymentEntity.notes : {};
    const notesBookingId = sanitizeText(webhookNotes?.bookingId || webhookNotes?.booking_id || '', 80);

    let booking = notesBookingId ? await findConsultationBookingById(notesBookingId) : null;
    if (!booking && webhookOrderId) {
      booking = await findConsultationBookingByPaymentOrderId(webhookOrderId);
    }

    if (!booking) {
      logger.warn(`Astrology webhook ignored: no booking mapped for event=${eventName} orderId=${webhookOrderId}`);
      return res.status(202).json({
        success: true,
        message: 'Webhook received. No matching booking found.',
      });
    }

    const normalizedEvent = eventName || 'unknown';
    const bookingId = booking.id || booking._id;
    const updates = {};
    if (webhookOrderId) {
      updates.paymentOrderId = webhookOrderId;
    }
    if (webhookPaymentId) {
      updates.paymentId = webhookPaymentId;
    }

    if (normalizedEvent === 'payment.captured' || normalizedEvent === 'payment.authorized') {
      updates.paymentStatus = 'completed';
      updates.paymentDate = new Date();
      updates.status = String(booking.status || '').toLowerCase() === 'cancelled' ? 'cancelled' : 'confirmed';
    } else if (normalizedEvent === 'payment.failed') {
      updates.paymentStatus = 'failed';
      if (String(booking.status || '').toLowerCase() !== 'cancelled') {
        updates.status = 'pending_payment';
      }
    } else if (normalizedEvent === 'order.paid') {
      updates.paymentStatus = 'completed';
      updates.paymentDate = new Date();
      updates.status = String(booking.status || '').toLowerCase() === 'cancelled' ? 'cancelled' : 'confirmed';
    } else {
      updates.paymentStatus = booking.paymentStatus || 'pending';
      updates.status = booking.status || 'pending_payment';
    }

    const updatedBooking = await updateConsultationBookingById(bookingId, updates);
    logger.info(
      `Astrology webhook reconciled booking=${bookingId} event=${normalizedEvent} paymentStatus=${updates.paymentStatus}`
    );

    return res.json({
      success: true,
      data: updatedBooking || booking,
    });
  } catch (error) {
    logger.error(`Astrology webhook reconciliation failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Unable to process webhook.',
    });
  }
});

router.get('/analytics/dashboard', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.',
      });
    }

    const startDate = formatPeriodStart(req.query?.period || 'month');
    const allBookings = await listAllConsultationBookings();
    const filteredBookings = allBookings.filter(
      (booking) => new Date(booking.createdAt || booking.preferredDate || Date.now()) >= startDate
    );
    const metrics = buildAnalyticsMetrics(filteredBookings);

    return res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to load analytics dashboard.',
    });
  }
});

router.get('/analytics/report', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.',
      });
    }

    const period = sanitizeText(req.query?.period || 'month', 16);
    const format = sanitizeText(req.query?.format || 'pdf', 8).toLowerCase();
    const startDate = formatPeriodStart(period);
    const allBookings = await listAllConsultationBookings();
    const filteredBookings = allBookings.filter(
      (booking) => new Date(booking.createdAt || booking.preferredDate || Date.now()) >= startDate
    );
    const metrics = buildAnalyticsMetrics(filteredBookings);

    if (format === 'csv') {
      const csvBuffer = Buffer.from(buildAnalyticsCsv(metrics), 'utf8');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="astrology-report-${period}.csv"`);
      return res.send(csvBuffer);
    }

    const pdfBuffer = await buildAnalyticsPdfBuffer(metrics, period);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="astrology-report-${period}.pdf"`);
    res.setHeader('Content-Length', String(pdfBuffer.length));
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to generate analytics report.',
    });
  }
});

router.get('/horoscope/report', authenticate, async (req, res) => {
  try {
    const period = sanitizeText(String(req.query?.period || 'year'), 16).toLowerCase();
    const sign = normalizeSign(String(req.query?.sign || 'aries'));
    const language = normalizeReportLanguage(req.query?.language || 'en');
    const pdfBuffer = await buildHoroscopePdfBuffer(sign, period, language);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="horoscope-report-${sign}-${period}-${language}.pdf"`);
    res.setHeader('Content-Length', String(pdfBuffer.length));
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to generate horoscope report.',
    });
  }
});

router.get('/experiments/variants', authenticate, async (req, res) => {
  const userId = String(req.user._id || req.user.id);
  const result = await ABTestingService.getUserVariants(userId);

  if (!result.success) {
    return res.status(500).json({
      success: false,
      message: result.error || 'Unable to assign experiment variants.',
    });
  }

  return res.json({
    success: true,
    data: result.variants,
  });
});

router.post('/experiments/track', authenticate, async (req, res) => {
  const userId = String(req.user._id || req.user.id);
  const experimentName = sanitizeText(req.body?.experimentName, 64);
  const eventType = sanitizeText(req.body?.eventType, 32);
  const eventData = req.body?.eventData && typeof req.body.eventData === 'object' ? req.body.eventData : {};

  const result = await ABTestingService.trackEvent(userId, experimentName, eventType, eventData);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.error || 'Unable to track experiment event.',
    });
  }

  return res.json({
    success: true,
    data: result,
  });
});

router.get('/experiments/results/:experimentName', authenticate, async (req, res) => {
  if (!hasAdminPrivileges(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.',
    });
  }

  const experimentName = sanitizeText(req.params.experimentName, 64);
  const result = await ABTestingService.getExperimentResults(experimentName);

  if (!result.success) {
    return res.status(500).json({
      success: false,
      message: result.error || 'Unable to load experiment results.',
    });
  }

  return res.json({
    success: true,
    data: result,
  });
});

router.get('/experiments', authenticate, async (req, res) => {
  if (!hasAdminPrivileges(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.',
    });
  }

  const result = await ABTestingService.getActiveExperiments();
  if (!result.success) {
    return res.status(500).json({
      success: false,
      message: result.error || 'Unable to load active experiments.',
    });
  }

  return res.json({
    success: true,
    data: result,
  });
});

router.__testables = {
  mergeSavedReadings,
  normalizeSavedReading,
  shouldUseDevStore,
  sanitizeText,
  buildCompatibility,
};

module.exports = router;
