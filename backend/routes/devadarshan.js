const express = require('express');
const Joi = require('joi');
const crypto = require('crypto');
const DevadarshanTemple = require('../models/DevadarshanTemple');
const DevadarshanEvent = require('../models/DevadarshanEvent');
const DevadarshanBooking = require('../models/DevadarshanBooking');
const DevadarshanDonation = require('../models/DevadarshanDonation');
const DevadarshanUserState = require('../models/DevadarshanUserState');
const PaymentService = require('../services/PaymentService');
const PaymentGateway = require('../models/PaymentGateway');
const Payment = require('../models/Payment');
const GatewayIntegrations = require('../utils/GatewayIntegrations');
const { authenticate, verifyAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

const ADMIN_EMAIL = 'mgdhanyamohan@gmail.com';
const PAYMENT_GATEWAYS = ['razorpay', 'stripe'];
const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
const DONATION_CATEGORIES = ['Annadanam', 'Temple Maintenance', 'Festival Fund', 'Special Seva Donation'];
const BOOKING_STATUS_TRANSITIONS = {
  Pending: new Set(['Confirmed', 'Cancelled']),
  Confirmed: new Set(['Completed', 'Cancelled']),
  Completed: new Set([]),
  Cancelled: new Set([]),
};

const DEFAULT_PROFILE = {
  primaryNakshatra: '',
  preferredPooja: 'Archana',
  phone: '',
  reminderBirthday: true,
  reminderMonthly: true,
  reminderYearly: true,
};

const TEMPLE_SEED = [
  {
    templeId: 'tmp-padmanabha',
    name: 'Sree Padmanabhaswamy Temple',
    district: 'Thiruvananthapuram',
    deity: 'Lord Vishnu',
    templeType: 'Ancient Temple',
    timings: '03:30 AM - 12:00 PM, 05:00 PM - 07:20 PM',
    contact: '+91 471 2450 233',
    officialContact: 'admin@padmanabha-temple.org',
    festivals: ['Alpashy Festival', 'Painkuni Festival', 'Ekadashi'],
    photos: ['Sanctum Entrance', 'East Fort View'],
    mapUrl: 'https://maps.google.com/?q=Padmanabhaswamy+Temple',
    rules: 'No mobile phones inside sanctum. Men in mundu, women in traditional attire.',
    dressCode: 'Traditional Kerala attire mandatory',
    distanceKm: 3,
    popularity: 5,
    verified: true,
    liveDarshanUrl: 'https://www.youtube.com/results?search_query=padmanabhaswamy+temple+live',
    poojas: [
      { name: 'Archana', price: 50, prasadamSupported: true },
      { name: 'Pushpanjali', price: 75, prasadamSupported: true },
      { name: 'Neyvilakku', price: 100, prasadamSupported: false },
    ],
  },
  {
    templeId: 'tmp-ganapathy-kottarakara',
    name: 'Kottarakkara Mahaganapathy Temple',
    district: 'Kollam',
    deity: 'Lord Ganesha',
    templeType: 'Maha Ganapathy Temple',
    timings: '04:00 AM - 11:00 AM, 05:00 PM - 08:00 PM',
    contact: '+91 474 2450 022',
    officialContact: 'office@kottarakaraganapathy.in',
    festivals: ['Vinayaka Chaturthi', 'Pradosham', 'Ulsavam'],
    photos: ['Main Sreekovil', 'Temple Deepasthambham'],
    mapUrl: 'https://maps.google.com/?q=Kottarakkara+Mahaganapathy+Temple',
    rules: 'Queue discipline mandatory. Outside food not allowed.',
    dressCode: 'Decent traditional wear',
    distanceKm: 27,
    popularity: 4,
    verified: true,
    liveDarshanUrl: 'https://www.youtube.com/results?search_query=kottarakkara+mahaganapathy+temple+live',
    poojas: [
      { name: 'Ganapathy Homam', price: 600, prasadamSupported: true },
      { name: 'Archana', price: 50, prasadamSupported: true },
      { name: 'Neyvilakku', price: 120, prasadamSupported: false },
    ],
  },
  {
    templeId: 'tmp-guruvayur',
    name: 'Guruvayur Sri Krishna Temple',
    district: 'Thrissur',
    deity: 'Lord Krishna',
    templeType: 'Krishna Temple',
    timings: '03:00 AM - 01:00 PM, 04:30 PM - 09:30 PM',
    contact: '+91 487 2556 333',
    officialContact: 'info@guruvayurdevaswom.nic.in',
    festivals: ['Guruvayur Ekadashi', 'Krishnashtami', 'Ulsavam'],
    photos: ['Temple Entrance', 'Dwajasthambam'],
    mapUrl: 'https://maps.google.com/?q=Guruvayur+Temple',
    rules: 'Darshan queue tokens may be required during peak season.',
    dressCode: 'Traditional strict dress code',
    distanceKm: 92,
    popularity: 5,
    verified: true,
    liveDarshanUrl: 'https://www.youtube.com/results?search_query=guruvayur+live+darshan',
    poojas: [
      { name: 'Pushpanjali', price: 100, prasadamSupported: true },
      { name: 'Palpayasam', price: 80, prasadamSupported: true },
      { name: 'Special Darshan', price: 500, prasadamSupported: false },
    ],
  },
  {
    templeId: 'tmp-ettumanoor',
    name: 'Ettumanoor Mahadeva Temple',
    district: 'Kottayam',
    deity: 'Lord Shiva',
    templeType: 'Mahadeva Temple',
    timings: '04:00 AM - 12:00 PM, 05:00 PM - 08:00 PM',
    contact: '+91 481 2532 555',
    officialContact: 'ettumanoordevaswom@kerala.gov.in',
    festivals: ['Ezharaponnana', 'Shivaratri', 'Pradosham'],
    photos: ['Temple Front', 'Festival Procession'],
    mapUrl: 'https://maps.google.com/?q=Ettumanoor+Mahadeva+Temple',
    rules: 'Photography restricted inside temple premises.',
    dressCode: 'Mundu / saree preferred',
    distanceKm: 61,
    popularity: 4,
    verified: true,
    liveDarshanUrl: 'https://www.youtube.com/results?search_query=ettumanoor+mahadeva+temple+live',
    poojas: [
      { name: 'Mrityunjaya Homam', price: 900, prasadamSupported: true },
      { name: 'Archana', price: 40, prasadamSupported: true },
      { name: 'Rudrabhishekam', price: 1200, prasadamSupported: false },
    ],
  },
  {
    templeId: 'tmp-chottanikkara',
    name: 'Chottanikkara Bhagavathy Temple',
    district: 'Ernakulam',
    deity: 'Bhagavathy',
    templeType: 'Devi Temple',
    timings: '04:00 AM - 12:00 PM, 04:00 PM - 08:00 PM',
    contact: '+91 484 2711 037',
    officialContact: 'helpdesk@chottanikkaratemple.in',
    festivals: ['Makom Thozhal', 'Navaratri', 'Pradosham'],
    photos: ['Temple Gopuram', 'Deeparadhana View'],
    mapUrl: 'https://maps.google.com/?q=Chottanikkara+Temple',
    rules: 'Separate queue for women/elderly during special days.',
    dressCode: 'Traditional attire encouraged',
    distanceKm: 74,
    popularity: 5,
    verified: true,
    liveDarshanUrl: 'https://www.youtube.com/results?search_query=chottanikkara+live',
    poojas: [
      { name: 'Archana', price: 60, prasadamSupported: true },
      { name: 'Pushpanjali', price: 120, prasadamSupported: true },
      { name: 'Neyvilakku', price: 150, prasadamSupported: false },
    ],
  },
];

const FESTIVAL_SEED = [
  { eventId: 'evt-001', templeId: 'tmp-guruvayur', title: 'Guruvayur Ekadashi', type: 'Ekadashi', date: '2026-11-20', details: 'Full-day special pooja, deepam, and bhajanam.' },
  { eventId: 'evt-002', templeId: 'tmp-ettumanoor', title: 'Shivaratri Special', type: 'Shivaratri', date: '2026-02-15', details: 'All-night Shiva pooja and cultural programs.' },
  { eventId: 'evt-003', templeId: 'tmp-chottanikkara', title: 'Navaratri Utsavam', type: 'Navaratri', date: '2026-10-10', details: 'Nine-day pooja, vidyarambham support.' },
  { eventId: 'evt-004', templeId: 'tmp-padmanabha', title: 'Painkuni Festival', type: 'Ulsavam', date: '2026-03-25', details: 'Traditional procession and special offerings.' },
  { eventId: 'evt-005', templeId: 'tmp-ganapathy-kottarakara', title: 'Pradosham Pooja', type: 'Pradosham', date: '2026-06-03', details: 'Evening special pooja with prasadam.' },
];

const bookingCreateSchema = Joi.object({
  templeId: Joi.string().trim().required(),
  poojaType: Joi.string().trim().required(),
  devoteeName: Joi.string().trim().required(),
  familyMember: Joi.string().trim().allow('').default(''),
  nakshatra: Joi.string().trim().allow('').default(''),
  bookingDate: Joi.string().trim().required(),
  quantity: Joi.number().integer().min(1).default(1),
  prasadamOption: Joi.string().trim().allow('').default('No prasadam'),
  deliveryMode: Joi.string().trim().allow('').default('Temple Pickup'),
  deliveryAddress: Joi.string().trim().allow('').default(''),
  paymentMethod: Joi.string().trim().allow('').default('UPI'),
  notes: Joi.string().trim().allow('').default(''),
});

const donationCreateSchema = Joi.object({
  templeId: Joi.string().trim().required(),
  category: Joi.string().trim().valid(...DONATION_CATEGORIES).required(),
  amount: Joi.number().positive().required(),
  purpose: Joi.string().trim().allow('').default(''),
  paymentMethod: Joi.string().trim().allow('').default('UPI'),
});

const addFamilyMemberSchema = Joi.object({
  name: Joi.string().trim().required(),
  nakshatra: Joi.string().trim().required(),
});

const profileSchema = Joi.object({
  primaryNakshatra: Joi.string().trim().allow('').default(''),
  preferredPooja: Joi.string().trim().allow('').default('Archana'),
  phone: Joi.string().trim().allow('').default(''),
  reminderBirthday: Joi.boolean().default(true),
  reminderMonthly: Joi.boolean().default(true),
  reminderYearly: Joi.boolean().default(true),
});

const adminTempleSchema = Joi.object({
  name: Joi.string().trim().required(),
  district: Joi.string().trim().required(),
  deity: Joi.string().trim().required(),
  contact: Joi.string().trim().allow('').default(''),
  timings: Joi.string().trim().allow('').default('04:00 AM - 12:00 PM, 05:00 PM - 08:00 PM'),
  dressCode: Joi.string().trim().allow('').default('Traditional attire preferred'),
  poojaName: Joi.string().trim().allow('').default('Archana'),
  poojaPrice: Joi.number().min(1).default(50),
});

const adminEventSchema = Joi.object({
  templeId: Joi.string().trim().required(),
  title: Joi.string().trim().required(),
  type: Joi.string().trim().required(),
  date: Joi.string().trim().required(),
  details: Joi.string().trim().allow('').default('Temple event update'),
});

const adminStatusSchema = Joi.object({
  status: Joi.string().trim().valid(...BOOKING_STATUSES).required(),
});

const paymentInitiateSchema = Joi.object({
  gateway: Joi.string().trim().lowercase().valid(...PAYMENT_GATEWAYS).default('razorpay'),
  paymentMethod: Joi.string().trim().allow('').default('upi'),
});

const isAdminUser = (user = {}) => {
  const email = String(user.email || '').trim().toLowerCase();
  const roles = Array.isArray(user.roles) ? user.roles : [];
  return user.role === 'admin' || user.isAdmin === true || roles.includes('admin') || email === ADMIN_EMAIL;
};

const generateId = (prefix) => `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
const nowIso = () => new Date().toISOString();

const canTransitionBookingStatus = (currentStatus = 'Pending', nextStatus = 'Pending') => {
  const normalizedCurrent = String(currentStatus || 'Pending').trim();
  const normalizedNext = String(nextStatus || 'Pending').trim();
  if (normalizedCurrent === normalizedNext) {
    return true;
  }

  const allowedTransitions = BOOKING_STATUS_TRANSITIONS[normalizedCurrent];
  if (!allowedTransitions) {
    return false;
  }

  return allowedTransitions.has(normalizedNext);
};

const addBookingTimelineEntry = (booking, status, by = 'system', note = '') => {
  if (!booking) {
    return;
  }

  if (!Array.isArray(booking.statusTimeline)) {
    booking.statusTimeline = [];
  }

  const normalizedStatus = String(status || booking.status || '').trim();
  if (!normalizedStatus) {
    return;
  }

  const normalizedNote = String(note || '').trim();
  const latestEntry = booking.statusTimeline[booking.statusTimeline.length - 1];
  if (
    latestEntry &&
    String(latestEntry.status || '').trim() === normalizedStatus &&
    String(latestEntry.note || '').trim() === normalizedNote
  ) {
    return;
  }

  booking.statusTimeline.push({
    status: normalizedStatus,
    at: nowIso(),
    by: String(by || 'system').trim(),
    note: normalizedNote,
  });
};

const createBookingReceiptText = (booking) =>
  [
    'DEVADARSHAN RECEIPT',
    `Receipt No: ${booking.receiptNumber || 'N/A'}`,
    `Booking ID: ${booking.bookingCode || 'N/A'}`,
    `Temple: ${booking.templeName || 'N/A'}`,
    `Pooja: ${booking.poojaType || 'N/A'}`,
    `Devotee: ${booking.devoteeName || 'N/A'}`,
    `Nakshatra: ${booking.nakshatra || 'N/A'}`,
    `Booking Date: ${booking.bookingDate || 'N/A'}`,
    `Payment: ${booking.paymentMethod || 'N/A'} (${booking.paymentStatus || 'N/A'})`,
    `Amount: INR ${Number(booking.amount || 0).toLocaleString('en-IN')}`,
    `Transaction Ref: ${booking.transactionRef || 'N/A'}`,
    `Admin Approval: ${booking.adminApprovalStatus || 'N/A'}`,
    `Status: ${booking.status || 'N/A'}`,
  ].join('\n');

const createDonationReceiptText = (donation) =>
  [
    'DEVADARSHAN DONATION RECEIPT',
    `Receipt No: ${donation.receiptNumber || 'N/A'}`,
    `Donation ID: ${donation.donationCode || 'N/A'}`,
    `Temple: ${donation.templeName || 'N/A'}`,
    `Category: ${donation.category || 'N/A'}`,
    `Purpose: ${donation.purpose || 'N/A'}`,
    `Amount: INR ${Number(donation.amount || 0).toLocaleString('en-IN')}`,
    `Payment: ${donation.paymentMethod || 'N/A'} (${donation.paymentStatus || 'N/A'})`,
    `Transaction Ref: ${donation.transactionRef || 'N/A'}`,
    `Date: ${donation.createdDate || donation.createdAt || 'N/A'}`,
  ].join('\n');

const ensureSeedData = async () => {
  const templeCount = await DevadarshanTemple.countDocuments();
  if (templeCount === 0) {
    await DevadarshanTemple.insertMany(TEMPLE_SEED);
  }

  const eventCount = await DevadarshanEvent.countDocuments();
  if (eventCount === 0) {
    await DevadarshanEvent.insertMany(FESTIVAL_SEED);
  }
};

const getOrCreateState = async (userEmail) => {
  const normalizedEmail = String(userEmail || '').trim().toLowerCase();
  let state = await DevadarshanUserState.findOne({ userEmail: normalizedEmail });
  if (!state) {
    state = await DevadarshanUserState.create({
      userEmail: normalizedEmail,
      favoriteTempleIds: [],
      notifyEventIds: [],
      savedLiveTempleIds: [],
      profile: DEFAULT_PROFILE,
      familyMembers: [],
      notifications: [],
    });
  }
  return state;
};

const addStateNotification = async (state, message) => {
  state.notifications.unshift({
    id: generateId('NTF'),
    message: String(message || '').trim(),
    createdAt: new Date().toISOString(),
  });

  if (state.notifications.length > 50) {
    state.notifications = state.notifications.slice(0, 50);
  }

  await state.save();
};

const buildBootstrapPayload = async (req) => {
  await ensureSeedData();
  const userEmail = String(req.user.email || '').trim().toLowerCase();
  const adminView = isAdminUser(req.user);

  const [temples, festivalEvents, state, bookings, donations] = await Promise.all([
    DevadarshanTemple.find({}).sort({ name: 1 }).lean(),
    DevadarshanEvent.find({}).sort({ date: 1 }).lean(),
    getOrCreateState(userEmail),
    DevadarshanBooking.find(adminView ? {} : { customerEmail: userEmail }).sort({ createdAt: -1 }).lean(),
    DevadarshanDonation.find(adminView ? {} : { customerEmail: userEmail }).sort({ createdAt: -1 }).lean(),
  ]);

  return {
    temples: temples.map((item) => ({ ...item, id: item.templeId })),
    festivalEvents: festivalEvents.map((item) => ({ ...item, id: item.eventId })),
    bookings: bookings.map((item) => ({ ...item, id: item.bookingCode })),
    donations: donations.map((item) => ({ ...item, id: item.donationCode, createdAt: item.createdDate || item.createdAt })),
    favoriteTempleIds: state.favoriteTempleIds || [],
    notifyEventIds: state.notifyEventIds || [],
    savedLiveTempleIds: state.savedLiveTempleIds || [],
    profile: state.profile || DEFAULT_PROFILE,
    familyMembers: state.familyMembers || [],
    notifications: state.notifications || [],
  };
};

router.get('/bootstrap', authenticate, async (req, res) => {
  try {
    const payload = await buildBootstrapPayload(req);
    return res.json({ success: true, data: payload });
  } catch (error) {
    logger.error('devadarshan bootstrap error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load Devadarshan data.' });
  }
});

router.post('/preferences/favorites/:templeId/toggle', authenticate, async (req, res) => {
  try {
    const state = await getOrCreateState(req.user.email);
    const templeId = String(req.params.templeId || '').trim();
    if (!templeId) {
      return res.status(400).json({ success: false, message: 'Temple id is required.' });
    }

    const isEnabled = state.favoriteTempleIds.includes(templeId);
    state.favoriteTempleIds = isEnabled
      ? state.favoriteTempleIds.filter((item) => item !== templeId)
      : [templeId, ...state.favoriteTempleIds];
    await state.save();

    return res.json({
      success: true,
      data: {
        favoriteTempleIds: state.favoriteTempleIds,
        enabled: !isEnabled,
      },
    });
  } catch (error) {
    logger.error('devadarshan toggle favorite error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update favorites.' });
  }
});

router.post('/preferences/events/:eventId/toggle', authenticate, async (req, res) => {
  try {
    const state = await getOrCreateState(req.user.email);
    const eventId = String(req.params.eventId || '').trim();
    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event id is required.' });
    }

    const isEnabled = state.notifyEventIds.includes(eventId);
    state.notifyEventIds = isEnabled
      ? state.notifyEventIds.filter((item) => item !== eventId)
      : [eventId, ...state.notifyEventIds];
    await state.save();

    return res.json({
      success: true,
      data: {
        notifyEventIds: state.notifyEventIds,
        enabled: !isEnabled,
      },
    });
  } catch (error) {
    logger.error('devadarshan toggle event notification error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update reminders.' });
  }
});

router.post('/preferences/live/:templeId/toggle', authenticate, async (req, res) => {
  try {
    const state = await getOrCreateState(req.user.email);
    const templeId = String(req.params.templeId || '').trim();
    if (!templeId) {
      return res.status(400).json({ success: false, message: 'Temple id is required.' });
    }

    const isEnabled = state.savedLiveTempleIds.includes(templeId);
    state.savedLiveTempleIds = isEnabled
      ? state.savedLiveTempleIds.filter((item) => item !== templeId)
      : [templeId, ...state.savedLiveTempleIds];
    await state.save();

    return res.json({
      success: true,
      data: {
        savedLiveTempleIds: state.savedLiveTempleIds,
        enabled: !isEnabled,
      },
    });
  } catch (error) {
    logger.error('devadarshan toggle live saved error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update live list.' });
  }
});

router.post('/profile', authenticate, async (req, res) => {
  try {
    const { error, value } = profileSchema.validate(req.body || {}, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const state = await getOrCreateState(req.user.email);
    state.profile = value;
    await state.save();

    return res.json({ success: true, data: { profile: state.profile } });
  } catch (err) {
    logger.error('devadarshan save profile error:', err);
    return res.status(500).json({ success: false, message: 'Unable to save profile.' });
  }
});

router.post('/family', authenticate, async (req, res) => {
  try {
    const { error, value } = addFamilyMemberSchema.validate(req.body || {}, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const state = await getOrCreateState(req.user.email);
    const member = {
      id: generateId('FAM'),
      name: value.name,
      nakshatra: value.nakshatra,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    state.familyMembers.unshift(member);
    await addStateNotification(state, `Family profile added: ${member.name} (${member.nakshatra}).`);

    return res.status(201).json({
      success: true,
      data: {
        familyMembers: state.familyMembers,
        member,
      },
    });
  } catch (err) {
    logger.error('devadarshan add family error:', err);
    return res.status(500).json({ success: false, message: 'Unable to add family member.' });
  }
});

router.delete('/family/:memberId', authenticate, async (req, res) => {
  try {
    const state = await getOrCreateState(req.user.email);
    const memberId = String(req.params.memberId || '').trim();
    state.familyMembers = (state.familyMembers || []).filter((item) => item.id !== memberId);
    await state.save();
    return res.json({ success: true, data: { familyMembers: state.familyMembers } });
  } catch (err) {
    logger.error('devadarshan remove family error:', err);
    return res.status(500).json({ success: false, message: 'Unable to remove family member.' });
  }
});

router.post('/bookings', authenticate, async (req, res) => {
  try {
    const { error, value } = bookingCreateSchema.validate(req.body || {}, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const temple = await DevadarshanTemple.findOne({ templeId: value.templeId }).lean();
    if (!temple) {
      return res.status(400).json({ success: false, message: 'Selected temple is not valid.' });
    }

    const pooja = (temple.poojas || []).find((item) => item.name === value.poojaType);
    if (!pooja) {
      return res.status(400).json({ success: false, message: 'Selected pooja is not available for this temple.' });
    }

    const bookingDate = new Date(value.bookingDate);
    if (Number.isNaN(bookingDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Booking date is invalid.' });
    }
    if (bookingDate.getTime() < Date.now() - 86400000) {
      return res.status(400).json({ success: false, message: 'Booking date must be today or later.' });
    }

    const quantity = Math.max(1, Number(value.quantity || 1));
    const bookingCode = generateId('BK');
    const initialStatus = temple.verified ? 'Confirmed' : 'Pending';
    const booking = await DevadarshanBooking.create({
      bookingCode,
      customerEmail: req.user.email,
      customerName: req.user.name || '',
      templeId: temple.templeId,
      templeName: temple.name,
      poojaType: value.poojaType,
      devoteeName: value.devoteeName,
      familyMember: value.familyMember,
      nakshatra: value.nakshatra,
      bookingDate: value.bookingDate,
      quantity,
      amount: Number(pooja.price || 0) * quantity,
      prasadamOption: value.prasadamOption,
      deliveryMode: value.deliveryMode,
      deliveryAddress: value.deliveryMode === 'Local Delivery' ? value.deliveryAddress : '',
      notes: value.notes,
      paymentMethod: value.paymentMethod,
      paymentStatus: 'Pending',
      transactionRef: generateId('TXN'),
      receiptNumber: generateId('RCPT'),
      adminApprovalStatus: temple.verified ? 'Auto Approved (Verified Temple)' : 'Pending Admin Approval',
      status: initialStatus,
      refundStatus: 'Not Requested',
      statusTimeline: [
        {
          status: 'Pending',
          at: nowIso(),
          by: 'system',
          note: 'Booking request submitted.',
        },
        ...(initialStatus === 'Confirmed'
          ? [
              {
                status: 'Confirmed',
                at: nowIso(),
                by: 'system',
                note: 'Auto approved for verified temple.',
              },
            ]
          : []),
      ],
    });

    const state = await getOrCreateState(req.user.email);
    await addStateNotification(state, `Booking ${booking.bookingCode} created for ${booking.poojaType} at ${booking.templeName}.`);

    return res.status(201).json({ success: true, data: { booking: { ...booking.toObject(), id: booking.bookingCode } } });
  } catch (err) {
    logger.error('devadarshan create booking error:', err);
    return res.status(500).json({ success: false, message: 'Unable to create booking.' });
  }
});

router.patch('/bookings/:bookingCode/cancel', authenticate, async (req, res) => {
  try {
    const bookingCode = String(req.params.bookingCode || '').trim();
    const booking = await DevadarshanBooking.findOne({ bookingCode });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const isOwner = String(booking.customerEmail || '').toLowerCase() === String(req.user.email || '').toLowerCase();
    if (!isOwner && !isAdminUser(req.user)) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }

    if (!canTransitionBookingStatus(booking.status, 'Cancelled')) {
      return res.status(409).json({
        success: false,
        message: `Booking cannot be cancelled once it is ${booking.status}.`,
      });
    }

    booking.status = 'Cancelled';
    booking.adminApprovalStatus = isAdminUser(req.user) ? 'Cancelled by admin' : 'Cancelled by user';
    if (booking.paymentStatus === 'Paid') {
      booking.refundStatus = 'Requested';
      booking.refundAmount = Number(booking.amount || 0);
    }
    addBookingTimelineEntry(
      booking,
      'Cancelled',
      isAdminUser(req.user) ? 'admin' : 'user',
      booking.paymentStatus === 'Paid' ? 'Cancellation requested after payment. Refund initiated for review.' : 'Booking cancelled before payment.'
    );
    await booking.save();

    const state = await getOrCreateState(booking.customerEmail);
    await addStateNotification(
      state,
      booking.paymentStatus === 'Paid'
        ? `Booking ${booking.bookingCode} cancelled. Refund request is now under review.`
        : `Booking ${booking.bookingCode} cancelled.`
    );

    return res.json({ success: true, data: { booking: { ...booking.toObject(), id: booking.bookingCode } } });
  } catch (err) {
    logger.error('devadarshan cancel booking error:', err);
    return res.status(500).json({ success: false, message: 'Unable to cancel booking.' });
  }
});

router.get('/bookings/:bookingCode/timeline', authenticate, async (req, res) => {
  try {
    const bookingCode = String(req.params.bookingCode || '').trim();
    const booking = await DevadarshanBooking.findOne({ bookingCode }).lean();
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const isOwner = String(booking.customerEmail || '').toLowerCase() === String(req.user.email || '').toLowerCase();
    if (!isOwner && !isAdminUser(req.user)) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }

    const timeline = Array.isArray(booking.statusTimeline) ? booking.statusTimeline : [];
    return res.json({
      success: true,
      data: {
        bookingCode: booking.bookingCode,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        refundStatus: booking.refundStatus || 'Not Requested',
        timeline,
      },
    });
  } catch (error) {
    logger.error('devadarshan booking timeline error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load booking timeline.' });
  }
});

router.get('/bookings/:bookingCode/receipt', authenticate, async (req, res) => {
  try {
    const bookingCode = String(req.params.bookingCode || '').trim();
    const booking = await DevadarshanBooking.findOne({ bookingCode }).lean();
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const isOwner = String(booking.customerEmail || '').toLowerCase() === String(req.user.email || '').toLowerCase();
    if (!isOwner && !isAdminUser(req.user)) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }

    const receiptText = createBookingReceiptText(booking);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${booking.receiptNumber || booking.bookingCode}.txt"`);
    return res.send(receiptText);
  } catch (error) {
    logger.error('devadarshan booking receipt error:', error);
    return res.status(500).json({ success: false, message: 'Unable to generate booking receipt.' });
  }
});

router.post('/bookings/:bookingCode/payments/initiate', authenticate, async (req, res) => {
  try {
    const { error, value } = paymentInitiateSchema.validate(req.body || {}, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const bookingCode = String(req.params.bookingCode || '').trim();
    const booking = await DevadarshanBooking.findOne({ bookingCode });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (String(booking.customerEmail || '').toLowerCase() !== String(req.user.email || '').toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }

    if (booking.status === 'Cancelled') {
      return res.status(409).json({ success: false, message: 'Cancelled bookings cannot be paid.' });
    }

    if (booking.paymentStatus === 'Paid') {
      return res.status(409).json({ success: false, message: 'Booking is already paid.' });
    }

    const amount = Number(booking.amount || 0);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid booking amount.' });
    }

    const payment = await PaymentService.createPayment({
      orderId: booking._id.toString(),
      userId: req.user.id || req.user._id || req.user.email,
      amount,
      currency: 'INR',
      paymentMethod: value.paymentMethod,
      paymentGateway: value.gateway,
      metadata: {
        orderType: 'devadarshan-booking',
        bookingCode: booking.bookingCode,
        templeId: booking.templeId,
      },
    });

    const paymentGatewayConfig = await PaymentGateway.findOne({ gatewayName: value.gateway, isActive: true }).select('+credentials');
    if (!paymentGatewayConfig) {
      return res.status(400).json({ success: false, message: `Payment gateway ${value.gateway} is not configured.` });
    }

    const gatewayResult = await GatewayIntegrations.executeGatewayAction(paymentGatewayConfig, 'process', {
      orderId: booking._id.toString(),
      amount,
      currency: 'INR',
      paymentMethod: value.paymentMethod,
      metadata: {
        bookingCode: booking.bookingCode,
        customerEmail: req.user.email,
      },
    });

    if (!gatewayResult.success) {
      return res.status(500).json({ success: false, message: gatewayResult.error || 'Unable to initialize payment.' });
    }

    payment.gatewayOrderId = gatewayResult.orderId || gatewayResult.transactionId;
    payment.gatewayTransactionId = gatewayResult.transactionId || gatewayResult.orderId;
    payment.status = 'initiated';
    await payment.save();

    booking.paymentGateway = value.gateway;
    booking.paymentMethod = value.paymentMethod;
    booking.paymentStatus = 'Pending';
    booking.paymentRecordId = payment.paymentId;
    booking.paymentDetails = {
      paymentId: payment.paymentId,
      gatewayOrderId: payment.gatewayOrderId,
      gatewayTransactionId: payment.gatewayTransactionId,
    };
    await booking.save();

    return res.json({
      success: true,
      data: {
        paymentId: payment.paymentId,
        bookingCode: booking.bookingCode,
        gateway: value.gateway,
        amount,
        currency: 'INR',
        gatewayOrderId: payment.gatewayOrderId,
        gatewayTransactionId: payment.gatewayTransactionId,
        ...(value.gateway === 'razorpay' ? { razorpayKeyId: paymentGatewayConfig.credentials.apiKey } : {}),
        ...(value.gateway === 'stripe'
          ? {
              stripeClientSecret: gatewayResult.clientSecret,
              stripePublicKey: paymentGatewayConfig.credentials.publicKey,
            }
          : {}),
      },
    });
  } catch (err) {
    logger.error('devadarshan initiate payment error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Unable to start payment.' });
  }
});

router.post('/bookings/:bookingCode/payments/verify', authenticate, async (req, res) => {
  try {
    const bookingCode = String(req.params.bookingCode || '').trim();
    const booking = await DevadarshanBooking.findOne({ bookingCode });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (String(booking.customerEmail || '').toLowerCase() !== String(req.user.email || '').toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }

    if (booking.status === 'Cancelled') {
      return res.status(409).json({
        success: false,
        message: 'This booking is cancelled. Payment verification is blocked.',
      });
    }

    const { paymentId, razorpay_payment_id, razorpay_order_id, razorpay_signature, stripePaymentIntentId } = req.body || {};
    const payment = await Payment.findOne({ paymentId, orderId: booking._id.toString() });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    if (booking.paymentStatus === 'Paid' && payment.status === 'captured') {
      return res.json({
        success: true,
        data: {
          booking: { ...booking.toObject(), id: booking.bookingCode },
          payment,
          idempotent: true,
        },
      });
    }

    const gatewayConfig = await PaymentGateway.findOne({ gatewayName: payment.paymentGateway, isActive: true }).select('+credentials');
    if (!gatewayConfig) {
      return res.status(400).json({ success: false, message: `Payment gateway ${payment.paymentGateway} is not configured.` });
    }

    let verified = false;

    if (payment.paymentGateway === 'razorpay') {
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Missing Razorpay verification fields.' });
      }

      const expectedSignature = crypto
        .createHmac('sha256', gatewayConfig.credentials.apiSecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Razorpay signature verification failed.' });
      }

      const razorpay = new (require('razorpay'))({
        key_id: gatewayConfig.credentials.apiKey,
        key_secret: gatewayConfig.credentials.apiSecret,
      });

      const paymentResult = await razorpay.payments.fetch(razorpay_payment_id);
      if (!paymentResult || paymentResult.status !== 'captured') {
        return res.status(400).json({ success: false, message: 'Payment not captured yet.' });
      }

      payment.gatewayTransactionId = razorpay_payment_id;
      payment.gatewayOrderId = razorpay_order_id;
      payment.status = 'captured';
      payment.transactionId = paymentResult.id;
      payment.paymentDetails = {
        ...payment.paymentDetails,
        razorpayStatus: paymentResult.status,
        razorpayMethod: paymentResult.method,
      };
      await payment.save();
      verified = true;
    } else if (payment.paymentGateway === 'stripe') {
      if (!stripePaymentIntentId) {
        return res.status(400).json({ success: false, message: 'Missing Stripe payment intent ID.' });
      }

      const stripe = require('stripe')(gatewayConfig.credentials.apiKey);
      const intent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
      if (!intent || intent.status !== 'succeeded') {
        return res.status(400).json({ success: false, message: 'Stripe payment not successful.' });
      }

      payment.gatewayTransactionId = stripePaymentIntentId;
      payment.status = 'captured';
      payment.transactionId = intent.id;
      payment.paymentDetails = {
        ...payment.paymentDetails,
        stripeStatus: intent.status,
      };
      await payment.save();
      verified = true;
    } else {
      return res.status(400).json({ success: false, message: `Unsupported payment gateway: ${payment.paymentGateway}` });
    }

    if (!verified) {
      return res.status(500).json({ success: false, message: 'Unable to verify payment.' });
    }

    booking.paymentStatus = 'Paid';
    booking.paymentRecordId = payment.paymentId;
    booking.paymentDetails = payment.paymentDetails || booking.paymentDetails;
    if (booking.status === 'Pending' && canTransitionBookingStatus(booking.status, 'Confirmed')) {
      booking.status = 'Confirmed';
      booking.adminApprovalStatus = 'Approved by payment';
      addBookingTimelineEntry(booking, 'Confirmed', 'payment', 'Payment verified and booking confirmed.');
    }
    addBookingTimelineEntry(booking, booking.status, 'payment', `Payment captured via ${payment.paymentGateway}.`);
    await booking.save();

    const state = await getOrCreateState(booking.customerEmail);
    await addStateNotification(state, `Payment received for booking ${booking.bookingCode}. Receipt ${booking.receiptNumber} is ready.`);

    return res.json({
      success: true,
      data: {
        booking: { ...booking.toObject(), id: booking.bookingCode },
        payment,
      },
    });
  } catch (err) {
    logger.error('devadarshan verify payment error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Unable to verify payment.' });
  }
});

router.post('/donations', authenticate, async (req, res) => {
  try {
    const { error, value } = donationCreateSchema.validate(req.body || {}, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const temple = await DevadarshanTemple.findOne({ templeId: value.templeId }).lean();
    if (!temple) {
      return res.status(400).json({ success: false, message: 'Selected temple is not valid.' });
    }

    const donation = await DevadarshanDonation.create({
      donationCode: generateId('DN'),
      customerEmail: req.user.email,
      customerName: req.user.name || '',
      templeId: temple.templeId,
      templeName: temple.name,
      category: value.category,
      amount: Number(value.amount || 0),
      purpose: value.purpose,
      paymentMethod: value.paymentMethod,
      paymentStatus: 'Paid',
      paymentReference: generateId('PAYREF'),
      transactionRef: generateId('TXN'),
      receiptNumber: generateId('DRCPT'),
      receiptGeneratedAt: nowIso(),
      createdDate: new Date().toISOString().slice(0, 10),
    });

    const state = await getOrCreateState(req.user.email);
    await addStateNotification(state, `Donation ${donation.receiptNumber} received for ${donation.category}.`);

    return res.status(201).json({
      success: true,
      data: {
        donation: {
          ...donation.toObject(),
          id: donation.donationCode,
          createdAt: donation.createdDate,
        },
      },
    });
  } catch (err) {
    logger.error('devadarshan create donation error:', err);
    return res.status(500).json({ success: false, message: 'Unable to complete donation.' });
  }
});

router.get('/donations/:donationCode/receipt', authenticate, async (req, res) => {
  try {
    const donationCode = String(req.params.donationCode || '').trim();
    const donation = await DevadarshanDonation.findOne({ donationCode }).lean();
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }

    const isOwner = String(donation.customerEmail || '').toLowerCase() === String(req.user.email || '').toLowerCase();
    if (!isOwner && !isAdminUser(req.user)) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }

    const receiptText = createDonationReceiptText(donation);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${donation.receiptNumber || donation.donationCode}.txt"`);
    return res.send(receiptText);
  } catch (error) {
    logger.error('devadarshan donation receipt error:', error);
    return res.status(500).json({ success: false, message: 'Unable to generate donation receipt.' });
  }
});

router.post('/admin/temples', authenticate, verifyAdmin, async (req, res) => {
  try {
    const { error, value } = adminTempleSchema.validate(req.body || {}, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const temple = await DevadarshanTemple.create({
      templeId: generateId('tmp'),
      name: value.name,
      district: value.district,
      deity: value.deity,
      templeType: 'Temple',
      timings: value.timings,
      contact: value.contact || 'Not updated',
      officialContact: value.contact || 'Not updated',
      festivals: ['Temple Special Pooja'],
      photos: ['Temple Photo'],
      mapUrl: 'https://maps.google.com',
      rules: 'Follow temple rules and queue discipline.',
      dressCode: value.dressCode,
      distanceKm: 99,
      popularity: 3,
      verified: false,
      liveDarshanUrl: 'https://www.youtube.com',
      poojas: [{ name: value.poojaName || 'Archana', price: Number(value.poojaPrice || 50), prasadamSupported: true }],
      createdByEmail: req.user.email || '',
    });

    return res.status(201).json({ success: true, data: { temple: { ...temple.toObject(), id: temple.templeId } } });
  } catch (err) {
    logger.error('devadarshan admin add temple error:', err);
    return res.status(500).json({ success: false, message: 'Unable to add temple.' });
  }
});

router.post('/admin/events', authenticate, verifyAdmin, async (req, res) => {
  try {
    const { error, value } = adminEventSchema.validate(req.body || {}, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const temple = await DevadarshanTemple.findOne({ templeId: value.templeId }).lean();
    if (!temple) {
      return res.status(400).json({ success: false, message: 'Temple does not exist.' });
    }

    const eventRecord = await DevadarshanEvent.create({
      eventId: generateId('evt'),
      templeId: value.templeId,
      title: value.title,
      type: value.type,
      date: value.date,
      details: value.details,
      createdByEmail: req.user.email || '',
    });

    return res.status(201).json({ success: true, data: { event: { ...eventRecord.toObject(), id: eventRecord.eventId } } });
  } catch (err) {
    logger.error('devadarshan admin add event error:', err);
    return res.status(500).json({ success: false, message: 'Unable to publish event.' });
  }
});

router.patch('/admin/temples/:templeId/verify', authenticate, verifyAdmin, async (req, res) => {
  try {
    const templeId = String(req.params.templeId || '').trim();
    const temple = await DevadarshanTemple.findOne({ templeId });
    if (!temple) {
      return res.status(404).json({ success: false, message: 'Temple not found.' });
    }

    temple.verified = !temple.verified;
    await temple.save();

    return res.json({ success: true, data: { temple: { ...temple.toObject(), id: temple.templeId } } });
  } catch (err) {
    logger.error('devadarshan toggle temple verification error:', err);
    return res.status(500).json({ success: false, message: 'Unable to update verification.' });
  }
});

router.patch('/admin/bookings/:bookingCode/status', authenticate, verifyAdmin, async (req, res) => {
  try {
    const { error, value } = adminStatusSchema.validate(req.body || {}, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const booking = await DevadarshanBooking.findOne({ bookingCode: String(req.params.bookingCode || '').trim() });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (!canTransitionBookingStatus(booking.status, value.status)) {
      return res.status(409).json({
        success: false,
        message: `Booking status cannot move from ${booking.status} to ${value.status}.`,
      });
    }

    booking.status = value.status;
    if (value.status === 'Confirmed') {
      booking.adminApprovalStatus = 'Approved by Admin';
    }
    if (value.status === 'Completed') {
      booking.refundStatus = 'Not Requested';
    }
    addBookingTimelineEntry(booking, value.status, 'admin', 'Status updated by admin.');
    await booking.save();

    const state = await getOrCreateState(booking.customerEmail);
    await addStateNotification(state, `Booking ${booking.bookingCode} status updated to ${booking.status}.`);

    return res.json({ success: true, data: { booking: { ...booking.toObject(), id: booking.bookingCode } } });
  } catch (err) {
    logger.error('devadarshan admin update booking status error:', err);
    return res.status(500).json({ success: false, message: 'Unable to update booking status.' });
  }
});

module.exports = router;
module.exports.__private__ = {
  generateId,
  bookingCreateSchema,
  donationCreateSchema,
  profileSchema,
  addFamilyMemberSchema,
  adminTempleSchema,
  adminEventSchema,
  adminStatusSchema,
  paymentInitiateSchema,
  isAdminUser,
  canTransitionBookingStatus,
  createBookingReceiptText,
  createDonationReceiptText,
};
