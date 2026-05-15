const express = require('express');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const rateLimit = require('express-rate-limit');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const authMiddleware = require('../middleware/auth');
const AstrologyUserProfile = require('../models/AstrologyUserProfile');
const AstrologyConsultationBooking = require('../models/AstrologyConsultationBooking');
const devAstrologyStore = require('../utils/devAstrologyStore');
const NotificationService = require('../services/NotificationService');
const ABTestingService = require('../services/abTestingService');
const {
  getDailyHoroscope,
  getSignDetails,
  normalizeSign,
  zodiacSigns,
  calculateNakshatra,
  calculateBirthAstroProfile,
} = require('../utils/astrologyData');

const router = express.Router();
const { authenticate, hasAdminPrivileges } = authMiddleware;

const shouldUseDevStore = () =>
  process.env.NODE_ENV !== 'production' && mongoose.connection.readyState !== 1;
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'test_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret',
});

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

const isBookingOwner = (booking, req) => {
  if (!booking) {
    return false;
  }
  const bookingUserId = String(booking.userId || booking.user || booking.user_id || '');
  const requestUserId = String(req.user?._id || req.user?.id || '');
  return bookingUserId === requestUserId;
};

const ensureBookingAccess = (booking, req, res) => {
  if (!booking) {
    res.status(404).json({
      success: false,
      message: 'Booking not found.',
    });
    return false;
  }

  if (!isBookingOwner(booking, req)) {
    res.status(403).json({
      success: false,
      message: 'Access denied for this booking.',
    });
    return false;
  }

  return true;
};

const DEFAULT_BIRTH_TIME_ZONE = 'Asia/Kolkata';

const normalizeBirthTimeZone = (value, fallback = DEFAULT_BIRTH_TIME_ZONE) => {
  const text = sanitizeText(value, 64);
  if (!text) {
    return fallback;
  }
  if (/^[+-]\d{2}:?\d{2}$/.test(text)) {
    return text;
  }
  try {
    Intl.DateTimeFormat('en-US', { timeZone: text }).format(new Date());
    return text;
  } catch (error) {
    return fallback;
  }
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
        birthTimezone: normalizeBirthTimeZone(profile?.birthTimezone),
        nakshatra: sanitizeText(profile?.nakshatra, 40),
        rashi: sanitizeText(profile?.rashi, 40),
        lagna: sanitizeText(profile?.lagna, 40),
      };
    })
    .filter(Boolean)
    .slice(0, 16);

const normalizeKundliHistory = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const sign = normalizeSign(item?.sign);
      if (!getSignDetails(sign)) {
        return null;
      }

      const id = sanitizeText(item?.id || `kundli-${index + 1}`, 80);
      if (!id) {
        return null;
      }

      return {
        id,
        createdAt: parseOptionalDate(item?.createdAt) || new Date(),
        sign,
        profileName: sanitizeText(item?.profileName || 'Profile', 80),
        data: item?.data && typeof item.data === 'object' ? item.data : null,
      };
    })
    .filter(Boolean)
    .slice(0, 24);

const normalizeCompatibilityHistory = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const sign = normalizeSign(item?.sign);
      const partnerSign = normalizeSign(item?.partnerSign);
      if (!getSignDetails(sign) || !getSignDetails(partnerSign)) {
        return null;
      }

      const id = sanitizeText(item?.id || `compatibility-${index + 1}`, 80);
      if (!id) {
        return null;
      }

      return {
        id,
        createdAt: parseOptionalDate(item?.createdAt) || new Date(),
        sign,
        partnerSign,
        data: item?.data && typeof item.data === 'object' ? item.data : null,
      };
    })
    .filter(Boolean)
    .slice(0, 24);

const getKundliFallbackProfile = (profile = {}, defaultSign = 'aries') => {
  const sign = normalizeSign(profile?.sign || defaultSign);
  const signDetails = getSignDetails(sign) || getSignDetails(defaultSign) || zodiacSigns[0];

  return {
    sign: signDetails.sign,
    label: signDetails.label,
    birthTime: sanitizeText(profile?.birthTime || '', 16),
    birthPlace: sanitizeText(profile?.birthPlace || '', 120),
    birthTimezone: normalizeBirthTimeZone(profile?.birthTimezone),
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
    email: 'madhav.acharya@astronila.example',
    phone: '+919900000001',
    languages: ['Malayalam', 'English'],
    rating: 4.8,
    bio: 'Traditional Kerala astrology practitioner focused on practical remedies.',
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
    email: 'priya.nambiar@astronila.example',
    phone: '+919900000002',
    languages: ['Malayalam', 'English', 'Tamil'],
    rating: 4.7,
    bio: 'Consultant for kundli interpretation and nakshatra-focused counseling.',
  },
];

const cloneValue = (value) => JSON.parse(JSON.stringify(value));
const consultantState = CONSULTANTS.reduce((acc, consultant) => {
  acc[consultant.id] = cloneValue(consultant);
  return acc;
}, {});

const listConsultants = () => Object.values(consultantState).map((consultant) => cloneValue(consultant));
const getConsultantById = (consultantId) =>
  listConsultants().find((consultant) => consultant.id === sanitizeText(consultantId, 80));

const updateConsultantById = (consultantId, updates = {}) => {
  const key = sanitizeText(consultantId, 80);
  if (!consultantState[key]) {
    return null;
  }

  consultantState[key] = {
    ...consultantState[key],
    ...cloneValue(updates),
  };

  return cloneValue(consultantState[key]);
};

const addConsultantSlot = (consultantId, slotLabel) => {
  const consultant = consultantState[sanitizeText(consultantId, 80)];
  if (!consultant) {
    return null;
  }

  const normalizedLabel = sanitizeText(slotLabel, 80);
  if (!normalizedLabel) {
    return cloneValue(consultant);
  }

  const slotId =
    normalizedLabel
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 30) || `slot-${Date.now()}`;
  const exists = consultant.availableSlots.some((slot) => slot.label === normalizedLabel);
  if (!exists) {
    consultant.availableSlots.push({
      id: `${slotId}-${Date.now().toString(36).slice(-4)}`,
      label: normalizedLabel,
      date: 'custom',
    });
  }

  return cloneValue(consultant);
};

const removeConsultantSlot = (consultantId, slotLabel) => {
  const consultant = consultantState[sanitizeText(consultantId, 80)];
  if (!consultant) {
    return null;
  }

  const normalizedLabel = sanitizeText(slotLabel, 80);
  consultant.availableSlots = consultant.availableSlots.filter(
    (slot) => slot.label !== normalizedLabel && slot.id !== normalizedLabel
  );
  return cloneValue(consultant);
};

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

const listAllConsultationBookings = async () => {
  if (shouldUseDevStore()) {
    return devAstrologyStore.listAllBookings();
  }

  return AstrologyConsultationBooking.find({}).sort({ createdAt: -1 }).lean();
};

const findConsultationBookingById = async (bookingId) => {
  if (!bookingId) {
    return null;
  }

  if (shouldUseDevStore()) {
    return devAstrologyStore.findBookingById(String(bookingId));
  }

  if (!mongoose.Types.ObjectId.isValid(String(bookingId))) {
    return null;
  }

  return AstrologyConsultationBooking.findById(bookingId).lean();
};

const updateConsultationBookingById = async (bookingId, updates = {}) => {
  if (!bookingId) {
    return null;
  }

  if (shouldUseDevStore()) {
    return devAstrologyStore.updateBookingById(String(bookingId), updates);
  }

  if (!mongoose.Types.ObjectId.isValid(String(bookingId))) {
    return null;
  }

  return AstrologyConsultationBooking.findByIdAndUpdate(
    bookingId,
    { $set: updates },
    { new: true }
  ).lean();
};

const formatPeriodStart = (period) => {
  const now = new Date();
  const normalizedPeriod = sanitizeText(period, 16).toLowerCase();
  const start = new Date(now);

  if (normalizedPeriod === 'week') {
    start.setDate(now.getDate() - 7);
  } else if (normalizedPeriod === 'month') {
    start.setMonth(now.getMonth() - 1);
  } else if (normalizedPeriod === 'quarter') {
    start.setMonth(now.getMonth() - 3);
  } else if (normalizedPeriod === 'year') {
    start.setFullYear(now.getFullYear() - 1);
  } else if (normalizedPeriod === 'total') {
    start.setTime(0);
  } else {
    start.setMonth(now.getMonth() - 1);
  }

  return start;
};

const normalizeReportLanguage = (value) => (sanitizeText(value, 8).toLowerCase() === 'ml' ? 'ml' : 'en');

const HOROSCOPE_REPORT_COPY = {
  en: {
    titleYear: 'Yearly Horoscope',
    titleTotal: 'Total Horoscope',
    titleDefault: 'Horoscope Report',
    signLabel: 'Sign',
    generatedOn: 'Generated on',
    overview: 'Overview',
    monthwiseHeading: 'Month-wise predictions',
    totalAreasHeading: 'Total horoscope across life areas',
    practicalGuidance: 'Practical guidance',
    areaCareer: 'Career',
    areaLove: 'Love life',
    areaFinance: 'Finance',
    areaHealth: 'Health',
    areaFamily: 'Family and relationships',
    areaEducation: 'Learning and growth',
    areaTravel: 'Travel and movement',
    areaSpirituality: 'Spiritual and inner balance',
    areaRemedies: 'Remedies and support',
    fallbackSummary:
      'This horoscope report combines your sign energy with practical timing guidance.',
  },
  ml: {
    titleYear: 'Varshika Horoscope',
    titleTotal: 'Sampoorna Horoscope',
    titleDefault: 'Horoscope Report',
    signLabel: 'Rashi',
    generatedOn: 'Generated on',
    overview: 'Saram',
    monthwiseHeading: 'Masam prathi phala nirdeham',
    totalAreasHeading: 'Jeevitha mekhala muzhuvanulla phala vilayiruthal',
    practicalGuidance: 'Prayogika nirdeshangal',
    areaCareer: 'Thozhil',
    areaLove: 'Sneham',
    areaFinance: 'Dhanam',
    areaHealth: 'Aarogyam',
    areaFamily: 'Kudumba bandhangal',
    areaEducation: 'Padanamum valarchayum',
    areaTravel: 'Yathra',
    areaSpirituality: 'Aathmeeya samathwam',
    areaRemedies: 'Pariharam',
    fallbackSummary:
      'Ee report ningalude rashi balamum samaya marganirdeshavum onnichu tharunnu.',
  },
};

const MONTH_LABELS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ml: ['Januvari', 'Februvari', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const MONTHLY_FOCUS_LINES = {
  en: [
    'Start with clarity and disciplined planning.',
    'Strengthen communication and practical follow-through.',
    'Focus on consistency over speed.',
    'Career alignment improves through steady effort.',
    'Money decisions favor caution and structure.',
    'Relationships benefit from calm conversations.',
    'Health improves with routine and sleep discipline.',
    'Avoid overcommitment and protect your time.',
    'Learning and skill-building bring long-term gains.',
    'Review goals and remove low-value tasks.',
    'Family priorities need balanced attention.',
    'Close the year with gratitude and smart planning.',
  ],
  ml: [
    'Spashtamaya plan-ode varsham thudanguka.',
    'Sambhashanavum prayogika nadapadikalum balappetuka.',
    'Vegathayekkal sthiratha pradhanam.',
    'Thozhil margam nannayi samanvayikkum.',
    'Dhana theerumanangalil sookshmatha avashyam.',
    'Bandhangal shanthamaya samsaram kondu balappedum.',
    'Aarogyathinu nithya anushthanam sahayikkum.',
    'Adhika badhyathakal kurakkuka, samayam rakshikkuka.',
    'Puthiya padanamum skill valarchayum labhakaram.',
    'Lakshyangal punaravalokanam cheyyuka.',
    'Kudumba karyangalil samanvayam urappakkuka.',
    'Varsha avasanam nandiode puthiya plan tayyarakkuka.',
  ],
};

const buildMonthwisePredictions = (sign, language) => {
  const labels = MONTH_LABELS[language] || MONTH_LABELS.en;
  const focus = MONTHLY_FOCUS_LINES[language] || MONTHLY_FOCUS_LINES.en;
  const baseYear = new Date().getFullYear();

  return labels.map((monthLabel, monthIndex) => {
    const monthDate = new Date(Date.UTC(baseYear, monthIndex, 15));
    const reading = getDailyHoroscope(sign, monthDate);
    const openingLine = String(reading?.horoscope || '')
      .split('.')
      .map((item) => item.trim())
      .filter(Boolean)[0] || '';
    const monthFocus = focus[monthIndex] || focus[0];
    const mergedLine = openingLine ? `${monthFocus} ${openingLine}` : monthFocus;
    return `${monthLabel}: ${mergedLine}`;
  });
};

const buildTotalAreaInsights = (signDetails, language) => {
  const copy = HOROSCOPE_REPORT_COPY[language] || HOROSCOPE_REPORT_COPY.en;
  const signLabel = signDetails?.label || 'Your sign';
  const element = signDetails?.element || 'Element';

  if (language === 'ml') {
    return [
      { title: copy.areaCareer, text: `${signLabel} rashi-kku ee kalam sthirathaulla thozhil pravarthanangalil melottam kaanikunnu.` },
      { title: copy.areaLove, text: 'Sneha jeevithathil viswasamum shanthamaya samsaravum bandham balappetum.' },
      { title: copy.areaFinance, text: 'Dhana mekhayil budget anusarichu nadannal nalla samrakshanam labhikkum.' },
      { title: copy.areaHealth, text: 'Nidra, vellam, nithya vyayamam eniva paalichal aarogyam nilanirtham.' },
      { title: copy.areaFamily, text: 'Kudumba badhyathakal samanvayathode kaiyarikumbol samadhanam vardhikkum.' },
      { title: copy.areaEducation, text: 'Puthiya padanam, certification, skill upgradation ivayil nalla phalam undakum.' },
      { title: copy.areaTravel, text: 'Cheriya yathrakalum pravarthana sambandhamaya sanchaaravum upakarapradham.' },
      { title: copy.areaSpirituality, text: `${element} swabhavam samathwathode nilanirthan dhyanam, japam, nishabdha samayam sahayikkum.` },
      { title: copy.areaRemedies, text: 'Prathidinavum cheriya prarthana, danam, manasika samyam eniva anukoolamaya urja vardhippikkum.' },
    ];
  }

  return [
    { title: copy.areaCareer, text: `${signLabel} is favored for disciplined progress, consistent execution, and steady leadership choices.` },
    { title: copy.areaLove, text: 'Love life improves through clear communication, emotional patience, and shared daily routines.' },
    { title: copy.areaFinance, text: 'Financial growth is possible when spending stays structured and long-term goals are prioritized.' },
    { title: copy.areaHealth, text: 'Health remains stable with sleep discipline, hydration, and predictable activity windows.' },
    { title: copy.areaFamily, text: 'Family relationships become smoother when boundaries and responsibilities are discussed early.' },
    { title: copy.areaEducation, text: 'Learning outcomes improve through focused skill-building and consistent study habits.' },
    { title: copy.areaTravel, text: 'Travel opportunities are useful for practical outcomes, networking, and perspective refresh.' },
    { title: copy.areaSpirituality, text: `${element}-element balance improves with reflection, prayer, and mindful decisions.` },
    { title: copy.areaRemedies, text: 'Simple remedies such as gratitude, charity, and morning intention-setting remain supportive.' },
  ];
};

const ensurePdfSpace = (doc, requiredHeight = 72) => {
  if (doc.y + requiredHeight > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
};

const drawScoreBarChart = (
  doc,
  {
    title = 'Score Chart',
    rows = [],
    labelKey = 'label',
    valueKey = 'value',
    startX = 40,
    startY = 120,
    width = 500,
    barColor = '#1f7a8c',
    trackColor = '#e5e7eb',
  } = {}
) => {
  const labelWidth = 120;
  const valueWidth = 34;
  const barWidth = Math.max(120, width - labelWidth - valueWidth - 18);
  const rowHeight = 18;
  const barHeight = 9;
  const chartTop = startY + 18;

  doc.fillColor('#0f172a').fontSize(12).text(title, startX, startY, { width });

  rows.forEach((row, index) => {
    const y = chartTop + index * rowHeight;
    const label = String(row?.[labelKey] || '');
    const value = Math.max(0, Math.min(100, Number(row?.[valueKey] || 0)));
    const activeBarWidth = Math.round((value / 100) * barWidth);

    doc.fillColor('#1f2937').fontSize(9).text(label, startX, y, { width: labelWidth });
    doc
      .rect(startX + labelWidth + 6, y + 2, barWidth, barHeight)
      .fill(trackColor)
      .stroke(trackColor);
    doc
      .rect(startX + labelWidth + 6, y + 2, activeBarWidth, barHeight)
      .fill(barColor)
      .stroke(barColor);
    doc.fillColor('#1f2937').fontSize(9).text(`${value}`, startX + labelWidth + 10 + barWidth, y, {
      width: valueWidth,
      align: 'right',
    });
  });

  return chartTop + rows.length * rowHeight + 8;
};

const createYearlyScoreRows = (sign, language) => {
  const labels = MONTH_LABELS[language] || MONTH_LABELS.en;
  return labels.map((month, index) => {
    const seed = hashText(`${sign}:${index + 1}`);
    const score = 58 + (seed % 37);
    return {
      month,
      score,
      career: 54 + ((seed >> 2) % 42),
      finance: 52 + ((seed >> 3) % 43),
      relationships: 55 + ((seed >> 4) % 40),
      health: 53 + ((seed >> 5) % 41),
      spirituality: 50 + ((seed >> 6) % 45),
    };
  });
};

const buildAreaScoreRows = (signDetails, language) => {
  const copy = HOROSCOPE_REPORT_COPY[language] || HOROSCOPE_REPORT_COPY.en;
  const sign = normalizeSign(signDetails?.sign || 'aries');
  const areas = [
    copy.areaCareer,
    copy.areaFinance,
    copy.areaLove,
    copy.areaHealth,
    copy.areaFamily,
    copy.areaEducation,
    copy.areaTravel,
    copy.areaSpirituality,
    copy.areaRemedies,
  ];

  return areas.map((area, index) => {
    const seed = hashText(`${sign}:area:${index + 1}`);
    return {
      area,
      score: 57 + (seed % 39),
    };
  });
};

const buildYearlyOverview = (signDetails, language) => {
  const signLabel = signDetails?.label || 'Your sign';
  if (language === 'ml') {
    return [
      `${signLabel}-inu ee varshakaalathile mukhyamaya theme sthiratha, dhairyam, mathrukayude samavathikkalanu.`,
      'Masam prathi phala nirdeshanangalude vediyil, oru kaaryathinu adhikam pradhanam kodukkaruthu. Samaya kramam sheri aayi anusarichu nadakkuka.',
      'Quarter-wise review cheythu, budgetum sambandha samvathsaramum sthiramaayi nilanirthuka.',
    ];
  }

  return [
    `For ${signLabel}, this yearly horoscope points to steady momentum with clearly defined timing and practical priorities.`,
    'Use the month-by-month forecasts to pace decisions, avoid overcommitment, and preserve energy for the strongest windows.',
    'Review progress every quarter and adjust plans based on what feels stable rather than what feels urgent.',
  ];
};

const buildTotalOverview = (signDetails, language) => {
  const signLabel = signDetails?.label || 'Your sign';
  if (language === 'ml') {
    return [
      `${signLabel}-inu ee sampoorna horoscope jeevitha mekhakalil ninnulla duranthangalum sadhyakalum oru roadmap ayi tharunnu.`,
      'Ee reportil career, dhana, aarogyam, bandham, padanam, yathra, aathmeeya samathwam ennivaril nirdesham undu.',
      'Kurachu karyangalil balam koottuka; kuranja karyangalil sampoorna prathikaaramum samadhanavum thedikka.',
    ];
  }

  return [
    `This total horoscope gives ${signLabel} a rounded life-area roadmap with key themes for career, finances, health, relationships, learning, travel, and inner balance.`,
    'Pay attention to the areas where strength is natural and where you need extra support or structure.',
    'Use the life-area summaries as a priority map and build a simple action plan around the most important areas.',
  ];
};

const writeWrappedParagraph = (doc, text, options = {}) => {
  const {
    fontSize = 10.5,
    color = '#1f2937',
    gap = 0.35,
    width = doc.page.width - doc.page.margins.left - doc.page.margins.right,
  } = options;

  ensurePdfSpace(doc, 40);
  doc.fillColor(color).fontSize(fontSize).text(String(text || ''), {
    width,
    align: 'left',
  });
  doc.moveDown(gap);
};

const buildHoroscopePdfBuffer = (sign = 'aries', period = 'year', language = 'en') =>
  new Promise((resolve, reject) => {
    const normalizedSign = normalizeSign(sign);
    const signDetails = getSignDetails(normalizedSign) || getSignDetails('aries');
    const normalizedPeriod = String(period || 'year').toLowerCase();
    const normalizedLanguage = normalizeReportLanguage(language);
    const copy = HOROSCOPE_REPORT_COPY[normalizedLanguage] || HOROSCOPE_REPORT_COPY.en;
    const title =
      normalizedPeriod === 'year'
        ? copy.titleYear
        : normalizedPeriod === 'total'
          ? copy.titleTotal
          : copy.titleDefault;
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const generatedAt = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const baseSummary =
      String(getDailyHoroscope(normalizedSign)?.horoscope || '').trim() || copy.fallbackSummary;
    const overviewText =
      normalizedLanguage === 'ml'
        ? `${signDetails.label} rashi-yude ee visadamaaya report varshika pravrithikalum jeevitha mekhakalum vyakthamaayi vivarikkunnu. ${baseSummary}`
        : `This expanded ${title.toLowerCase()} for ${signDetails.label} is written as a practical guide for the full cycle, with clear month-by-month and life-area direction. ${baseSummary}`;

    doc.fillColor('#0f172a').fontSize(20).text(`${signDetails.label} ${title}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.fillColor('#334155').fontSize(10.5).text(`${copy.signLabel}: ${signDetails.label}`, { align: 'center' });
    doc.text(`${copy.generatedOn}: ${generatedAt}`, { align: 'center' });
    doc.moveDown(0.6);
    doc.fillColor('#0f172a').fontSize(13).text(copy.overview);
    doc.moveDown(0.25);
    writeWrappedParagraph(doc, overviewText, { fontSize: 10.5, gap: 0.5 });

    if (normalizedPeriod === 'year') {
      const monthScores = createYearlyScoreRows(normalizedSign, normalizedLanguage);
      const chartRows = monthScores.map((row) => ({ label: row.month.slice(0, 3), value: row.score }));
      const nextY = drawScoreBarChart(doc, {
        title: normalizedLanguage === 'ml' ? 'Varshika bala chart (0-100)' : 'Yearly momentum chart (0-100)',
        rows: chartRows,
        labelKey: 'label',
        valueKey: 'value',
        startY: doc.y + 4,
        width: 510,
        barColor: '#0f766e',
      });
      doc.y = nextY + 6;

      writeWrappedParagraph(
        doc,
        normalizedLanguage === 'ml'
          ? 'Chart-il ullathu masam prathi urja score aanu. 70+ masangalil puthiya thudakkangal, 60-69 masangalil sthiratha, 60-il thaazhe ullava punaravasanathinu nallathu.'
          : 'The chart shows month-wise momentum. Scores above 70 indicate expansion windows, 60-69 support stable progress, and lower ranges are best used for review and correction.',
        { gap: 0.5 }
      );

      const yearlyOverview = buildYearlyOverview(signDetails, normalizedLanguage);
      doc.addPage();
      doc.fillColor('#0f172a').fontSize(14).text(
        normalizedLanguage === 'ml' ? 'Varshika phala saaramsam' : 'Yearly Horoscope Summary'
      );
      doc.moveDown(0.35);
      yearlyOverview.forEach((line) => {
        writeWrappedParagraph(doc, line, { gap: 0.35 });
      });

      doc.addPage();
      doc.fillColor('#0f172a').fontSize(14).text(copy.monthwiseHeading);
      doc.moveDown(0.35);

      monthScores.slice(0, 6).forEach((row) => {
        ensurePdfSpace(doc, 88);
        doc.fontSize(12).fillColor('#0f172a').text(`${row.month} | Score ${row.score}/100`);
        doc.moveDown(0.15);
        writeWrappedParagraph(
          doc,
          normalizedLanguage === 'ml'
            ? `Career: ${row.career}/100 - sthiramaaya prayatnam vazhi melottam. Finance: ${row.finance}/100 - budget anusarichu nadannal labham. Relationship: ${row.relationships}/100 - samsaram shanthamayi nilanirthuka.`
            : `Career ${row.career}/100: consistent execution brings visibility. Finance ${row.finance}/100: measured decisions protect gains. Relationships ${row.relationships}/100: calm conversations improve trust and cooperation.`,
          { gap: 0.2 }
        );
        writeWrappedParagraph(
          doc,
          normalizedLanguage === 'ml'
            ? `Health ${row.health}/100 um spirituality ${row.spirituality}/100 um samathwathode kaiyarikuka. Action: ee masam oru single-priority plan ezhuthuka, weekly review cheyyuka.`
            : `Health ${row.health}/100 and spirituality ${row.spirituality}/100 suggest balancing effort with recovery. Action step: define one priority for the month and review weekly progress every Sunday.`,
          { gap: 0.45 }
        );
      });

      doc.addPage();
      doc.fillColor('#0f172a').fontSize(14).text(
        normalizedLanguage === 'ml' ? 'Second-half detailed forecast' : 'Second-half detailed forecast'
      );
      doc.moveDown(0.35);

      monthScores.slice(6).forEach((row) => {
        ensurePdfSpace(doc, 88);
        doc.fontSize(12).fillColor('#0f172a').text(`${row.month} | Score ${row.score}/100`);
        doc.moveDown(0.15);
        writeWrappedParagraph(
          doc,
          normalizedLanguage === 'ml'
            ? `Ee masam thozhilum kudumba badhyathakalum balance cheyyunnathu pradhanam. Thirumanangalil vegathayekkal sthiratha nalkuka. Financial risk kuraykkan reserve budget undakkuka.`
            : `This month favors balancing professional commitments with personal responsibilities. Choose reliability over speed in major commitments. Keep a reserve budget and avoid emotionally driven purchases.`,
          { gap: 0.2 }
        );
        writeWrappedParagraph(
          doc,
          normalizedLanguage === 'ml'
            ? 'Bandhangalil viswasam urappakkan nerittulla samsaram nadathuka. Aarogyathinu sleep cycleum regular movementum nirbandham.'
            : 'Strengthen relationships through direct communication and predictable follow-up. For health, protect sleep quality and maintain regular movement even during busy weeks.',
          { gap: 0.45 }
        );
      });

      doc.addPage();
      doc.fillColor('#0f172a').fontSize(14).text(
        normalizedLanguage === 'ml' ? 'Yearly horoscope guide' : 'How to use this yearly horoscope'
      );
      doc.moveDown(0.35);
      const yearlyUsageLines =
        normalizedLanguage === 'ml'
          ? [
              'Masam prathi phala ennathu arinjitt, oru goal-ku oru action set cheyyuka.',
              'Strong months-il expansion kaanichu, moderate months-il review sahayikkuka.',
              'Quarter-wise progress check cheythu new milestones fix cheyyuka.',
            ]
          : [
              'Set one clear action for each month and review progress weekly.',
              'Use stronger months for momentum and moderate months for review and refinement.',
              'Check progress every quarter and adjust the plan with what feels stable.',
            ];
      yearlyUsageLines.forEach((line) => {
        ensurePdfSpace(doc, 22);
        doc.fontSize(11).fillColor('#1f2937').text(`- ${line}`);
      });

      doc.addPage();
      doc.fillColor('#0f172a').fontSize(14).text(copy.practicalGuidance);
      doc.moveDown(0.35);

      const quarterCopy =
        normalizedLanguage === 'ml'
          ? [
              'Q1 (Jan-Mar): plan, routine, foundation.',
              'Q2 (Apr-Jun): communication, career execution, and savings discipline.',
              'Q3 (Jul-Sep): correction cycle, health balancing, and low-risk growth.',
              'Q4 (Oct-Dec): consolidation, relationship clarity, and next-year planning.',
            ]
          : [
              'Q1 (Jan-Mar): foundation quarter for planning, discipline, and structure.',
              'Q2 (Apr-Jun): execution quarter for communication-heavy work and visible output.',
              'Q3 (Jul-Sep): correction quarter for health, systems, and low-risk decisions.',
              'Q4 (Oct-Dec): consolidation quarter for relationships, gratitude, and next-year setup.',
            ];

      quarterCopy.forEach((line) => {
        ensurePdfSpace(doc, 22);
        doc.fontSize(11).fillColor('#1f2937').text(`- ${line}`);
      });
      doc.moveDown(0.4);

      const finalChecklist =
        normalizedLanguage === 'ml'
          ? [
              'Monthly spending tracker maintain cheyyuka.',
              '3-month career goal board update cheyyuka.',
              'Week-il 1 digital detox block set cheyyuka.',
              'Prathimasam family alignment discussion nadathuka.',
              'Quarter-end gratitude and reset ritual follow cheyyuka.',
            ]
          : [
              'Maintain a monthly spending tracker and review variance.',
              'Update a rolling 3-month career goal board.',
              'Set one weekly digital-detox focus block.',
              'Schedule a family alignment conversation each month.',
              'Close each quarter with a reset and gratitude routine.',
            ];

      writeWrappedParagraph(
        doc,
        normalizedLanguage === 'ml'
          ? 'Final Action Checklist'
          : 'Final Action Checklist',
        { fontSize: 12, color: '#0f172a', gap: 0.25 }
      );
      finalChecklist.forEach((line) => {
        ensurePdfSpace(doc, 20);
        doc.fontSize(10.5).fillColor('#1f2937').text(`- ${line}`);
      });

      doc.end();
      return;
    }

    if (normalizedPeriod === 'total') {
      const areaScores = buildAreaScoreRows(signDetails, normalizedLanguage);
      const nextY = drawScoreBarChart(doc, {
        title: normalizedLanguage === 'ml' ? 'Jeevitha mekhala score chart (0-100)' : 'Life-area clarity chart (0-100)',
        rows: areaScores.map((row) => ({ label: row.area, value: row.score })),
        labelKey: 'label',
        valueKey: 'value',
        startY: doc.y + 4,
        width: 510,
        barColor: '#7c3aed',
      });
      doc.y = nextY + 6;

      writeWrappedParagraph(
        doc,
        normalizedLanguage === 'ml'
          ? 'Ee chart jeevitha mekhala prathi balam kaanikkunnu. Uyarna score ullathil expansion nadathuka; kuranja mekhakalil disciplineum support systemum nirmmikkuka.'
          : 'This chart summarizes your long-horizon strength across major life areas. Expand where scores are high, and build systems, support, and patience where scores are moderate.',
        { gap: 0.5 }
      );

      const totalOverview = buildTotalOverview(signDetails, normalizedLanguage);
      doc.addPage();
      doc.fillColor('#0f172a').fontSize(14).text(
        normalizedLanguage === 'ml' ? 'Sampoorna horoscope overview' : 'Total Horoscope Summary'
      );
      doc.moveDown(0.35);
      totalOverview.forEach((line) => {
        writeWrappedParagraph(doc, line, { gap: 0.35 });
      });

      doc.addPage();
      doc.fillColor('#0f172a').fontSize(14).text(copy.totalAreasHeading);
      doc.moveDown(0.35);

      const areaInsights = buildTotalAreaInsights(signDetails, normalizedLanguage);
      areaInsights.forEach((insight, index) => {
        const score = areaScores[index]?.score || 65;
        ensurePdfSpace(doc, 92);
        doc.fontSize(12).fillColor('#0f172a').text(`${insight.title} (${score}/100)`);
        doc.moveDown(0.15);
        writeWrappedParagraph(doc, insight.text, { gap: 0.15 });
        writeWrappedParagraph(
          doc,
          normalizedLanguage === 'ml'
            ? 'Deep guidance: goal set cheyyuka, weekly progress check cheyyuka, emotional reaction-ne pakaram structured response follow cheyyuka.'
            : 'Deep guidance: set one measurable target, review progress weekly, and replace emotional reaction with a structured response loop.',
          { gap: 0.45 }
        );
      });

      doc.addPage();
      doc.fillColor('#0f172a').fontSize(14).text(
        normalizedLanguage === 'ml' ? '12-month total roadmap' : '12-month total roadmap'
      );
      doc.moveDown(0.3);

      const monthwise = buildMonthwisePredictions(normalizedSign, normalizedLanguage);
      monthwise.forEach((line, index) => {
        ensurePdfSpace(doc, 34);
        doc.fontSize(11).fillColor('#0f172a').text(`${index + 1}. ${line}`);
        writeWrappedParagraph(
          doc,
          normalizedLanguage === 'ml'
            ? 'Action focus: oru practical step choose cheythu 30-day consistency nilanirthuka.'
            : 'Action focus: choose one practical step and hold 30-day consistency before scaling.',
          { fontSize: 10, gap: 0.28 }
        );
      });

      doc.addPage();
      doc.fillColor('#0f172a').fontSize(14).text(copy.practicalGuidance);
      doc.moveDown(0.35);

      const totalGuidance =
        normalizedLanguage === 'ml'
          ? [
              'Core rhythm: morning planning + evening reflection.',
              'Money: 50-30-20 style budgeting with emergency buffer.',
              'Career: quarterly skill milestone and mentor check-in.',
              'Relationships: conflict-ne delay cheyyathe same day clear cheyyuka.',
              'Health: weekly movement target + sleep window discipline.',
              'Spirituality: short daily prayer/meditation and monthly silence block.',
              'Annual review: quarter-wise wins, losses, and next adjustments.',
            ]
          : [
              'Core rhythm: morning planning and evening reflection.',
              'Money system: follow a 50-30-20 budget with an emergency reserve.',
              'Career arc: maintain quarterly skill milestones and mentor checkpoints.',
              'Relationships: resolve friction quickly with same-day clarity conversations.',
              'Health stack: weekly movement targets plus consistent sleep windows.',
              'Spiritual reset: daily short prayer/meditation and one monthly silence block.',
              'Annual review loop: track wins, misses, and next-quarter adjustments.',
            ];

      totalGuidance.forEach((tip) => {
        ensurePdfSpace(doc, 22);
        doc.fontSize(11).fillColor('#1f2937').text(`- ${tip}`);
      });

      doc.end();
      return;
    }

    writeWrappedParagraph(
      doc,
      normalizedLanguage === 'ml'
        ? 'Ithu generic report aanu. Year allenkil total select cheythal visadamaaya multi-page report labhikkum.'
        : 'This is a generic report format. Select year or total to generate a detailed multi-page horoscope.',
      { gap: 0.5 }
    );
    doc.end();
  });

const buildAnalyticsMetrics = (bookings = []) => {
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((booking) => booking.status === 'completed').length;
  const cancelledBookings = bookings.filter((booking) => booking.status === 'cancelled').length;
  const confirmedBookings = bookings.filter((booking) => booking.status === 'confirmed').length;
  const totalRevenue = bookings
    .filter((booking) => booking.paymentStatus === 'completed' || booking.status === 'completed')
    .reduce((sum, booking) => sum + Number(booking.amountInr || 0), 0);

  const consultantMap = bookings.reduce((acc, booking) => {
    const key = booking.consultantId || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        consultantId: key,
        name: booking.consultantName || 'Consultant',
        bookings: 0,
        revenue: 0,
        rating: consultantState[key]?.rating || 4.5,
      };
    }

    acc[key].bookings += 1;
    if (booking.paymentStatus === 'completed' || booking.status === 'completed') {
      acc[key].revenue += Number(booking.amountInr || 0);
    }

    return acc;
  }, {});

  const bookingTrendsMap = bookings.reduce((acc, booking) => {
    const date = new Date(booking.createdAt || booking.preferredDate || Date.now())
      .toISOString()
      .slice(0, 10);
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const bookingTrends = Object.entries(bookingTrendsMap)
    .sort(([left], [right]) => (left < right ? -1 : 1))
    .slice(-10)
    .map(([date, count]) => ({ date, bookings: count }));

  return {
    totalBookings,
    completedBookings,
    cancelledBookings,
    confirmedBookings,
    totalRevenue,
    averageRating:
      Object.keys(consultantMap).length > 0
        ? Object.values(consultantMap).reduce((sum, item) => sum + Number(item.rating || 0), 0) /
          Object.keys(consultantMap).length
        : 0,
    topConsultants: Object.values(consultantMap)
      .sort((left, right) => right.bookings - left.bookings)
      .slice(0, 5),
    bookingTrends,
    userRetention: totalBookings > 0 ? Math.min(100, Math.round((confirmedBookings / totalBookings) * 100)) : 0,
    conversionRate: totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0,
    consultationRevenue: totalRevenue,
    reportRevenue: 0,
    consultationPercent: totalRevenue > 0 ? 100 : 0,
    reportPercent: 0,
    repeatRate: totalBookings > 0 ? Math.min(100, Math.round((completedBookings / totalBookings) * 100)) : 0,
    peakTime: '7-9 PM',
    avgSessionDuration: 15,
  };
};

const buildAnalyticsCsv = (metrics = {}) => {
  const rows = [
    ['metric', 'value'],
    ['totalBookings', metrics.totalBookings || 0],
    ['completedBookings', metrics.completedBookings || 0],
    ['cancelledBookings', metrics.cancelledBookings || 0],
    ['totalRevenue', metrics.totalRevenue || 0],
    ['averageRating', Number(metrics.averageRating || 0).toFixed(2)],
    ['userRetention', metrics.userRetention || 0],
  ];

  return rows.map((row) => row.join(',')).join('\n');
};

const buildAnalyticsPdfBuffer = (metrics = {}, period = 'month') =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const pdf = new PDFDocument({ size: 'A4', margin: 48 });
    pdf.on('data', (chunk) => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    pdf.fontSize(18).text('Astrology Analytics Report', { align: 'center' });
    pdf.moveDown(0.5);
    pdf.fontSize(11).text(`Period: ${period}`);
    pdf.text(`Generated: ${new Date().toLocaleString('en-IN')}`);
    pdf.moveDown();

    pdf.fontSize(12).text(`Total bookings: ${metrics.totalBookings || 0}`);
    pdf.text(`Completed bookings: ${metrics.completedBookings || 0}`);
    pdf.text(`Cancelled bookings: ${metrics.cancelledBookings || 0}`);
    pdf.text(`Total revenue: INR ${Number(metrics.totalRevenue || 0).toLocaleString('en-IN')}`);
    pdf.moveDown();
    pdf.fontSize(13).text('Top consultants');

    (metrics.topConsultants || []).forEach((consultant) => {
      pdf
        .fontSize(11)
        .text(
          `- ${consultant.name}: ${consultant.bookings} bookings, INR ${Number(
            consultant.revenue || 0
          ).toLocaleString('en-IN')}`
        );
    });

    pdf.end();
  });

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
    data: listConsultants(),
  });
});

router.get('/consultants/:consultantId', authenticate, async (req, res) => {
  const consultantId = sanitizeText(req.params.consultantId, 80);
  const consultant = getConsultantById(consultantId) || listConsultants()[0];

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
  const consultantId = sanitizeText(req.body?.consultantId || req.user?.consultantId || 'acharya-madhav', 80);
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
  const consultantId = sanitizeText(req.body?.consultantId || req.user?.consultantId || 'acharya-madhav', 80);
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
    const consultantId = sanitizeText(req.query?.consultantId || req.user?.consultantId || '', 80);
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
    const consultantId = sanitizeText(req.query?.consultantId || req.user?.consultantId || '', 80);
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

router.patch('/consultations/:bookingId/status', authenticate, async (req, res) => {
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

router.post('/consultations/:bookingId/payment/create-order', authenticate, async (req, res) => {
  try {
    const bookingId = sanitizeText(req.params.bookingId, 80);
    const booking = await findConsultationBookingById(bookingId);

    if (!ensureBookingAccess(booking, req, res)) {
      return;
    }

    const amountInr = Number(booking.amountInr || 0);
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

router.post('/consultations/:bookingId/payment/verify', authenticate, async (req, res) => {
  try {
    const bookingId = sanitizeText(req.params.bookingId, 80);
    const { orderId, paymentId, signature } = req.body || {};
    const booking = await findConsultationBookingById(bookingId);

    if (!ensureBookingAccess(booking, req, res)) {
      return;
    }

    const expectedOrderId = sanitizeText(orderId || booking.paymentOrderId, 120);
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret');
    shasum.update(`${expectedOrderId}|${paymentId}`);
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed.',
      });
    }

    const updatedBooking = await updateConsultationBookingById(booking.id || booking._id || bookingId, {
      paymentStatus: 'completed',
      paymentOrderId: expectedOrderId,
      paymentId: sanitizeText(paymentId, 120),
      paymentSignature: sanitizeText(signature, 200),
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

router.get('/consultations/:bookingId/payment', authenticate, async (req, res) => {
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
