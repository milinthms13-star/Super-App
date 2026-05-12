const express = require('express');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const rateLimit = require('express-rate-limit');

const { authenticate } = require('../middleware/auth');
const AstrologyUserProfile = require('../models/AstrologyUserProfile');
const AstrologyConsultationBooking = require('../models/AstrologyConsultationBooking');
const devAstrologyStore = require('../utils/devAstrologyStore');
const {
  getDailyHoroscope,
  getSignDetails,
  normalizeSign,
  zodiacSigns,
} = require('../utils/astrologyData');

const router = express.Router();

const shouldUseDevStore = () =>
  process.env.NODE_ENV !== 'production' && mongoose.connection.readyState !== 1;

const assistantLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many assistant requests. Please try again in a minute.',
  },
});

const compatibilityLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many compatibility checks. Please try again shortly.',
  },
});

const sanitizeText = (value, maxLength = 240) =>
  String(value || '')
    .replace(/[<>`{}[\]|$]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const parseOptionalDate = (value) => {
  if (!value) {
    return undefined;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
};

const normalizeFavoriteTopics = (topics) =>
  (Array.isArray(topics) ? topics : [])
    .map((topic) => sanitizeText(topic, 40))
    .filter(Boolean)
    .slice(0, 12);

const normalizeSavedReading = (reading) => {
  const sign = normalizeSign(reading?.sign);
  const signDetails = getSignDetails(sign);
  const horoscope = sanitizeText(reading?.horoscope, 1000);

  if (!signDetails || !horoscope) {
    return null;
  }

  return {
    sign,
    horoscope,
    readingDate: parseOptionalDate(reading?.readingDate || reading?.generatedAt || new Date()) || new Date(),
  };
};

const mergeSavedReadings = (existingReadings = [], nextReading) => {
  const normalizedExisting = (Array.isArray(existingReadings) ? existingReadings : [])
    .map((reading) => normalizeSavedReading(reading))
    .filter(Boolean);
  const normalizedNext = normalizeSavedReading(nextReading);

  if (!normalizedNext) {
    return normalizedExisting;
  }

  const nextDayKey = normalizedNext.readingDate.toISOString().slice(0, 10);
  const dedupedReadings = normalizedExisting.filter((reading) => {
    const existingDayKey = new Date(reading.readingDate).toISOString().slice(0, 10);
    return !(reading.sign === normalizedNext.sign && existingDayKey === nextDayKey);
  });

  return [normalizedNext, ...dedupedReadings]
    .sort((left, right) => new Date(right.readingDate) - new Date(left.readingDate))
    .slice(0, 14);
};

const normalizeBoolean = (value, fallback = true) =>
  typeof value === 'boolean' ? value : fallback;

const normalizeFamilyProfiles = (profiles = []) =>
  (Array.isArray(profiles) ? profiles : [])
    .map((profile, index) => {
      const sign = normalizeSign(profile?.sign);
      if (!getSignDetails(sign)) {
        return null;
      }

      const id = sanitizeText(profile?.id || profile?.name || `profile-${index + 1}`, 64);
      const name = sanitizeText(profile?.name || 'Family Member', 80);
      const relation = sanitizeText(profile?.relation || 'Relative', 40);

      if (!id || !name) {
        return null;
      }

      return {
        id,
        name,
        relation,
        sign,
        birthDate: parseOptionalDate(profile?.birthDate),
        birthTime: sanitizeText(profile?.birthTime, 16),
        birthPlace: sanitizeText(profile?.birthPlace, 120),
        nakshatra: sanitizeText(profile?.nakshatra, 40),
        rashi: sanitizeText(profile?.rashi, 40),
        lagna: sanitizeText(profile?.lagna, 40),
      };
    })
    .filter(Boolean)
    .slice(0, 16);

const getKundliFallbackProfile = (profile = {}, defaultSign = 'aries') => {
  const sign = normalizeSign(profile?.sign || defaultSign);
  const signDetails = getSignDetails(sign) || getSignDetails(defaultSign) || zodiacSigns[0];

  return {
    sign: signDetails.sign,
    label: signDetails.label,
    birthTime: sanitizeText(profile?.birthTime || '', 16),
    birthPlace: sanitizeText(profile?.birthPlace || '', 120),
    lagna: sanitizeText(profile?.lagna || 'Mesha', 40),
    nakshatra: sanitizeText(profile?.nakshatra || 'Ashwini', 40),
  };
};

const buildKundliData = (profile = {}, fallbackSign = 'aries') => {
  const normalizedProfile = getKundliFallbackProfile(profile, fallbackSign);
  const signDetails = getSignDetails(normalizedProfile.sign) || zodiacSigns[0];
  const generatedAt = new Date().toISOString();

  return {
    sign: signDetails.sign,
    label: signDetails.label,
    generatedAt,
    birthChart: {
      ascendant: normalizedProfile.lagna,
      sun: signDetails.label,
      moon: normalizedProfile.nakshatra,
      mars: 'Gemini',
      mercury: 'Taurus',
      venus: 'Cancer',
      jupiter: 'Leo',
      saturn: 'Aquarius',
    },
    navamsa: {
      lord: signDetails.element === 'Fire' ? 'Sun' : signDetails.element === 'Water' ? 'Moon' : 'Mercury',
      balance: `${signDetails.label} charts currently support consistency, communication, and family stability.`,
    },
    dasha: {
      current: 'Venus',
      next: 'Mars',
      summary:
        'This period favors practical action with emotional balance. Plan steadily and avoid impulsive commitments.',
    },
    planets: [
      { planet: 'Sun', position: '10° Aries' },
      { planet: 'Moon', position: '22° Cancer' },
      { planet: 'Mars', position: '05° Gemini' },
      { planet: 'Mercury', position: '18° Taurus' },
      { planet: 'Jupiter', position: '13° Leo' },
      { planet: 'Saturn', position: '02° Aquarius' },
    ],
    remedies: [
      'Start the morning with a short prayer or breathing ritual.',
      'Use one focused 30-minute planning block daily.',
      'Offer support to a family elder or mentor this week.',
    ],
  };
};

const buildKundliPdfBuffer = (kundliData, profileName = 'Astrology User') =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const pdf = new PDFDocument({ size: 'A4', margin: 48 });

    pdf.on('data', (chunk) => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    pdf.fontSize(18).text('Kundli Report', { align: 'center' });
    pdf.moveDown(0.5);
    pdf
      .fontSize(10)
      .fillColor('#555555')
      .text(`Generated: ${new Date(kundliData.generatedAt || Date.now()).toLocaleString('en-IN')}`, {
        align: 'center',
      });
    pdf.fillColor('#111111');
    pdf.moveDown();

    pdf.fontSize(12).text(`Name: ${profileName}`);
    pdf.text(`Sign: ${kundliData.label || kundliData.sign}`);
    pdf.text(`Ascendant: ${kundliData.birthChart?.ascendant || 'Mesha'}`);
    pdf.moveDown();

    pdf.fontSize(13).text('Dasha');
    pdf
      .fontSize(11)
      .text(`Current: ${kundliData.dasha?.current || '-'}`)
      .text(`Next: ${kundliData.dasha?.next || '-'}`)
      .text(`${kundliData.dasha?.summary || ''}`);
    pdf.moveDown();

    pdf.fontSize(13).text('Planetary Positions');
    (Array.isArray(kundliData.planets) ? kundliData.planets : []).forEach((item) => {
      pdf.fontSize(11).text(`- ${item.planet}: ${item.position}`);
    });
    pdf.moveDown();

    pdf.fontSize(13).text('Recommendations');
    (Array.isArray(kundliData.remedies) ? kundliData.remedies : []).forEach((tip) => {
      pdf.fontSize(11).text(`- ${tip}`);
    });

    pdf.end();
  });

const hashText = (value = '') => {
  let hash = 0;
  const text = String(value || '');

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash;
};

const buildCompatibility = (sign, partnerSign) => {
  const left = getSignDetails(sign);
  const right = getSignDetails(partnerSign);
  const seed = hashText(`${left.sign}:${right.sign}`);
  const score = 58 + (seed % 39);

  const summary =
    score >= 80
      ? `${left.label} and ${right.label} show strong compatibility for communication and long-term planning.`
      : score >= 68
        ? `${left.label} and ${right.label} are reasonably aligned, with better outcomes through patience and financial clarity.`
        : `${left.label} and ${right.label} can work well with conscious effort around emotional timing and expectations.`;

  const keyMatch =
    score >= 80
      ? 'Porutham: Strong. Shared values and stable growth indicators are positive.'
      : score >= 68
        ? 'Porutham: Moderate. Emotional rhythm is good, with room for practical alignment.'
        : 'Porutham: Developing. Build trust through routine and transparent communication.';

  return {
    score,
    summary,
    keyMatch,
  };
};

const CONSULTANTS = [
  {
    id: 'acharya-madhav',
    name: 'Madhav Acharya',
    specialty: 'Kerala Jathakam, Matchmaking, Remedies',
    rate: '₹1,200 / 15 min',
    amountInr: 1200,
    availability: 'Today 4:00 PM - 7:00 PM',
    availableSlots: [
      { id: 'today-1600', label: 'Today 4:00 PM', date: 'today' },
      { id: 'today-1730', label: 'Today 5:30 PM', date: 'today' },
      { id: 'today-1900', label: 'Today 7:00 PM', date: 'today' },
    ],
  },
  {
    id: 'nambiar-priya',
    name: 'Priya Nambiar',
    specialty: 'Kundli, Nakshatra counseling, Blessings rituals',
    rate: '₹950 / 15 min',
    amountInr: 950,
    availability: 'Tomorrow 10:00 AM - 1:00 PM',
    availableSlots: [
      { id: 'tomorrow-1000', label: 'Tomorrow 10:00 AM', date: 'tomorrow' },
      { id: 'tomorrow-1130', label: 'Tomorrow 11:30 AM', date: 'tomorrow' },
      { id: 'tomorrow-1300', label: 'Tomorrow 1:00 PM', date: 'tomorrow' },
    ],
  },
];

const getConsultantById = (consultantId) =>
  CONSULTANTS.find((consultant) => consultant.id === sanitizeText(consultantId, 80));

const getPanchangamData = () => ({
  tithi: 'Shukla Paksha Tritiya',
  nakshatra: 'Revati',
  yoga: 'Siddha',
  karana: 'Bava',
  sunrise: '06:02 AM',
  sunset: '06:40 PM',
  rahuKalam: '10:30 AM - 12:00 PM',
  yamagandam: '03:00 PM - 04:30 PM',
  gulika: '07:30 AM - 09:00 AM',
  updatedAt: new Date().toISOString(),
});

const getFestivalData = () => [
  {
    name: 'Vishu',
    date: 'Apr 14',
    note: 'Kerala new year; ideal for family puja and new beginnings.',
  },
  {
    name: 'Navaratri',
    date: 'Oct 1 - Oct 10',
    note: 'A strong period for discipline, protection prayers, and focused intentions.',
  },
  {
    name: 'Karkidaka Vavu',
    date: 'Jul 23',
    note: 'Traditionally observed for ancestral remembrance and spiritual grounding.',
  },
];

const findProfileByUserId = async (userId) => {
  if (shouldUseDevStore()) {
    return devAstrologyStore.findProfile(userId);
  }

  return AstrologyUserProfile.findOne({ userId }).lean();
};

const saveProfileByUserId = async (userId, profile) => {
  if (shouldUseDevStore()) {
    return devAstrologyStore.saveProfile({
      ...profile,
      userId,
    });
  }

  return AstrologyUserProfile.findOneAndUpdate(
    { userId },
    { $set: profile },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  ).lean();
};

const saveConsultationBooking = async (booking) => {
  if (shouldUseDevStore()) {
    return devAstrologyStore.createBooking(booking);
  }

  const created = await AstrologyConsultationBooking.create(booking);
  return created.toObject();
};

const listConsultationBookings = async (userId) => {
  if (shouldUseDevStore()) {
    return devAstrologyStore.listBookings(userId);
  }

  return AstrologyConsultationBooking.find({ userId }).sort({ createdAt: -1 }).lean();
};

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

router.get('/panchangam', (req, res) => {
  return res.json({
    success: true,
    data: getPanchangamData(),
  });
});

router.get('/festivals', (req, res) => {
  return res.json({
    success: true,
    data: getFestivalData(),
  });
});

router.post('/kundli', authenticate, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const profile = await findProfileByUserId(userId);
    const fallbackSign = normalizeSign(req.body?.profile?.sign || profile?.sign || 'aries');
    const kundliData = buildKundliData(req.body?.profile || profile || {}, fallbackSign);

    return res.json({
      success: true,
      data: kundliData,
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

router.post('/compatibility', compatibilityLimiter, (req, res) => {
  const sign = normalizeSign(req.body?.sign);
  const partnerSign = normalizeSign(req.body?.partnerSign);

  if (!getSignDetails(sign) || !getSignDetails(partnerSign)) {
    return res.status(400).json({
      success: false,
      message: 'Both sign and partnerSign must be valid zodiac signs.',
    });
  }

  return res.json({
    success: true,
    data: buildCompatibility(sign, partnerSign),
  });
});

router.post('/assistant', assistantLimiter, (req, res) => {
  const sign = normalizeSign(req.body?.sign || 'aries');
  const signDetails = getSignDetails(sign) || zodiacSigns[0];
  const question = sanitizeText(req.body?.question, 500);

  if (!question || question.length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a meaningful question for the assistant.',
    });
  }

  return res.json({
    success: true,
    data: {
      answer: `For ${signDetails.label}, prioritize clear routines and family harmony. Your question suggests focusing on one practical step each day.`,
      tips: [
        'Begin the day with a short calm routine before major decisions.',
        'Use a fixed time window for financial planning and communication.',
        `For ${signDetails.label}, patience and consistency improve outcomes this week.`,
      ],
      sign: signDetails.sign,
    },
  });
});

router.get('/consultants', (req, res) => {
  return res.json({
    success: true,
    data: CONSULTANTS,
  });
});

router.post('/consultations/book', authenticate, async (req, res) => {
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
      status: 'confirmed',
      confirmationCode,
      amountInr: consultant.amountInr,
      currency: 'INR',
    };

    const booking = await saveConsultationBooking(bookingPayload);

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

router.__testables = {
  mergeSavedReadings,
  normalizeSavedReading,
  shouldUseDevStore,
  sanitizeText,
  buildCompatibility,
};

module.exports = router;
