const crypto = require('crypto');
const express = require('express');
const Joi = require('joi');
const mongoose = require('mongoose');
const { authenticate, verifyAdmin } = require('../middleware/auth');
const HotelProperty = require('../models/HotelProperty');
const HotelBooking = require('../models/HotelBooking');
const HotelReview = require('../models/HotelReview');
const HotelCommissionSetting = require('../models/HotelCommissionSetting');
const HotelBookingIdempotencyKey = require('../models/HotelBookingIdempotencyKey');
const HotelPartnerPayout = require('../models/HotelPartnerPayout');
const { generateHotelConciergeResponse } = require('../services/hotelAiConciergeService');

const router = express.Router();

const DEFAULT_COMMISSION_SETTINGS = {
  defaultRate: 10,
  basicRate: 8,
  featuredRate: 12,
  premiumRate: 15,
};

const bookingStatusMap = {
  Pending: 'pending',
  Confirmed: 'confirmed',
  'Checked In': 'confirmed',
  Completed: 'completed',
  Cancelled: 'cancelled',
  Rejected: 'cancelled',
};

const hotelSchema = Joi.object({
  businessName: Joi.string().trim().required(),
  propertyType: Joi.string().trim().required(),
  location: Joi.string().trim().required(),
  address: Joi.string().trim().allow('').default(''),
  city: Joi.string().trim().allow('').default(''),
  pincode: Joi.string().trim().allow('').default(''),
  phone: Joi.string().trim().allow('').default(''),
  email: Joi.string().trim().allow('').default(''),
  description: Joi.string().trim().allow('').default(''),
  amenities: Joi.array().items(Joi.string().trim()).default([]),
  images: Joi.array().items(Joi.string().trim()).default([]),
  rooms: Joi.array()
    .items(
      Joi.object({
        type: Joi.string().trim().required(),
        capacity: Joi.number().integer().min(1).default(1),
        bedType: Joi.string().trim().default('Double'),
        basePrice: Joi.number().min(0).default(0),
        totalInventory: Joi.number().integer().min(0).default(1),
        availableRooms: Joi.number().integer().min(0).default(1),
        amenities: Joi.array().items(Joi.string().trim()).default([]),
        cancellationPolicy: Joi.string().trim().default('Flexible'),
      })
    )
    .default([]),
});

const bookingSchema = Joi.object({
  hotelId: Joi.string().trim().required(),
  hotelName: Joi.string().trim().allow('').default(''),
  location: Joi.string().trim().allow('').default(''),
  roomType: Joi.string().trim().allow('').default('Standard'),
  guestName: Joi.string().trim().required(),
  guestEmail: Joi.string().trim().allow('').default(''),
  guestPhone: Joi.string().trim().required(),
  checkInDate: Joi.string().trim().required(),
  checkOutDate: Joi.string().trim().required(),
  numberOfGuests: Joi.number().integer().min(1).default(1),
  numberOfRooms: Joi.number().integer().min(1).default(1),
  pricePerNight: Joi.number().min(0).default(0),
  specialRequests: Joi.string().trim().allow('').default(''),
});

const reviewSchema = Joi.object({
  bookingId: Joi.string().trim().required(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().trim().allow('').default(''),
  photos: Joi.array().items(Joi.string().trim()).default([]),
});

const commissionSchema = Joi.object({
  defaultRate: Joi.number().min(0).max(100).required(),
  basicRate: Joi.number().min(0).max(100).required(),
  featuredRate: Joi.number().min(0).max(100).required(),
  premiumRate: Joi.number().min(0).max(100).required(),
});

const payoutRequestSchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  bookings: Joi.number().integer().min(1).required(),
  grossAmount: Joi.number().min(0).required(),
  commission: Joi.number().min(0).required(),
  netAmount: Joi.number().min(0).required(),
  bookingIds: Joi.array().items(Joi.string().trim()).min(1).required(),
  notes: Joi.string().trim().allow('').default(''),
});

const aiConciergeSchema = Joi.object({
  question: Joi.string().trim().min(2).required(),
  context: Joi.object({
    destination: Joi.string().trim().allow(''),
    location: Joi.string().trim().allow(''),
    checkInDate: Joi.string().trim().allow(''),
    checkOutDate: Joi.string().trim().allow(''),
    guests: Joi.number().integer().min(1),
    budget: Joi.number().min(0),
    preferences: Joi.array().items(Joi.string().trim()),
  })
    .unknown(true)
    .default({}),
});

const normalizeUserId = (req) => {
  const raw = req.user?._id || req.user?.id || null;
  return raw ? String(raw) : null;
};

const normalizeRoomType = (value = '') => String(value || '').trim().toLowerCase();

const escapeRegExp = (value = '') => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeIdempotencyKey = (value = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return trimmed.slice(0, 128);
};

const getRequestIdempotencyKey = (req) =>
  normalizeIdempotencyKey(
    req.headers['x-idempotency-key'] || req.headers['idempotency-key'] || req.body?.idempotencyKey || ''
  );

const buildIdempotencyRequestHash = (req, extra = {}) => {
  const payload = JSON.stringify({
    body: req.body || {},
    params: req.params || {},
    query: req.query || {},
    extra,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
};

const getIdempotencyRecordExpiry = () => new Date(Date.now() + 1000 * 60 * 60 * 48);

const findIdempotencyRecord = async ({ userId, key, method, routeKey }) => {
  if (!userId || !key) return null;
  const record = await HotelBookingIdempotencyKey.findOne({ userId, key, method, routeKey }).lean();
  if (!record) return null;

  const expiresAt = new Date(record.expiresAt || 0);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    await HotelBookingIdempotencyKey.deleteOne({ _id: record._id });
    return null;
  }

  return record;
};

const saveIdempotencyRecord = async ({ userId, key, method, routeKey, requestHash, statusCode, responseBody }) => {
  if (!userId || !key) return;
  await HotelBookingIdempotencyKey.findOneAndUpdate(
    { userId, key, method, routeKey },
    {
      userId,
      key,
      method,
      routeKey,
      requestHash,
      statusCode,
      responseBody,
      expiresAt: getIdempotencyRecordExpiry(),
    },
    { upsert: true, new: true }
  );
};

const calculateNights = (checkInDate, checkOutDate) => {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const diff = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
};

const calculateBasePriceFromRooms = (rooms = []) => {
  if (!Array.isArray(rooms) || rooms.length === 0) return 0;
  const positivePrices = rooms
    .map((room) => Number(room.basePrice || room.price || 0))
    .filter((price) => Number.isFinite(price) && price > 0);
  return positivePrices.length ? Math.min(...positivePrices) : 0;
};

const calculateTotalAvailableRooms = (rooms = []) => {
  return rooms.reduce((sum, room) => {
    const roomAvailable = Number.isFinite(room.availableRooms)
      ? Number(room.availableRooms)
      : Number(room.totalInventory || 0);
    return sum + Math.max(0, roomAvailable);
  }, 0);
};

const mapRoomForClient = (room = {}) => {
  const basePrice = Number(room.basePrice || room.price || 0);
  const availableRooms = Number.isFinite(room.availableRooms)
    ? Number(room.availableRooms)
    : Number(room.totalInventory || 0);
  return {
    ...room,
    basePrice,
    price: basePrice,
    availableRooms,
    available: availableRooms > 0,
  };
};

const mapHotelForClient = (hotel = {}) => {
  const rooms = Array.isArray(hotel.rooms) ? hotel.rooms.map(mapRoomForClient) : [];
  const phone = String(hotel.phone || '').trim();
  return {
    _id: hotel._id,
    id: String(hotel._id || ''),
    businessName: hotel.businessName,
    name: hotel.businessName,
    location: hotel.location,
    city: hotel.city,
    type: hotel.propertyType,
    propertyType: hotel.propertyType,
    phone,
    email: hotel.email,
    contact: {
      phone,
      whatsapp: phone,
    },
    description: hotel.description,
    images: hotel.images || [],
    amenities: hotel.amenities || [],
    rooms,
    pricePerNight: Number(hotel.pricePerNight || 0),
    price: Number(hotel.pricePerNight || 0),
    availableRooms: Number(hotel.availableRooms || 0),
    rating: Number(hotel.rating || 0),
    reviews: Number(hotel.reviews || 0),
    verified: Boolean(hotel.verified || hotel.status === 'Approved'),
    listingType: hotel.listingType || 'standard',
    commissionRate: Number(hotel.commissionRate || 0),
    status: hotel.status,
    isFeatured: Boolean(hotel.isFeatured),
    submittedDate: hotel.createdAt,
    createdAt: hotel.createdAt,
  };
};

const mapBookingForClient = (booking = {}) => ({
  _id: booking._id,
  id: String(booking._id || ''),
  userId: booking.userId,
  partnerId: booking.partnerId,
  propertyId: booking.propertyId,
  hotelName: booking.hotelName,
  location: booking.location,
  roomType: booking.roomType,
  guestName: booking.guestName,
  guestEmail: booking.guestEmail,
  guestPhone: booking.guestPhone,
  checkInDate: booking.checkInDate,
  checkOutDate: booking.checkOutDate,
  numberOfNights: booking.numberOfNights,
  numberOfGuests: booking.numberOfGuests,
  numberOfRooms: booking.numberOfRooms,
  pricePerNight: booking.pricePerNight,
  totalPrice: booking.totalPrice,
  gst: booking.gst,
  finalTotal: booking.finalTotal,
  specialRequests: booking.specialRequests,
  paymentStatus: booking.paymentStatus,
  bookingStatus: booking.bookingStatus,
  status: booking.status,
  cancellationReason: booking.cancellationReason,
  inventoryRestoredAt: booking.inventoryRestoredAt,
  partnerNote: booking.partnerNote,
  adminNote: booking.adminNote,
  createdAt: booking.createdAt,
});

const mapPayoutForClient = (payout = {}) => ({
  _id: payout._id,
  id: String(payout._id || ''),
  partnerId: payout.partnerId,
  startDate: payout.startDate,
  endDate: payout.endDate,
  bookings: payout.bookings,
  grossAmount: payout.grossAmount,
  commission: payout.commission,
  netAmount: payout.netAmount,
  bookingIds: payout.bookingIds || [],
  status: payout.status,
  notes: payout.notes || '',
  settledAt: payout.settledAt,
  settledBy: payout.settledBy || '',
  createdAt: payout.createdAt,
});

const updateHotelRoomAvailability = (hotel, roomType, requestedRooms) => {
  const selectedRoom = (hotel.rooms || []).find(
    (room) => normalizeRoomType(room.type) === normalizeRoomType(roomType)
  );
  if (!selectedRoom) {
    return { error: 'Selected room type is not available for this hotel.' };
  }

  const availableRooms = Number.isFinite(selectedRoom.availableRooms)
    ? Number(selectedRoom.availableRooms)
    : Number(selectedRoom.totalInventory || 0);

  if (requestedRooms > availableRooms) {
    return { error: 'Requested rooms are not available.' };
  }

  selectedRoom.availableRooms = Math.max(0, availableRooms - requestedRooms);
  hotel.availableRooms = calculateTotalAvailableRooms(hotel.rooms || []);
  return { hotel, selectedRoom };
};

const restoreHotelRoomAvailability = (hotel, roomType, roomsToRestore) => {
  const selectedRoom = (hotel.rooms || []).find(
    (room) => normalizeRoomType(room.type) === normalizeRoomType(roomType)
  );
  if (!selectedRoom) {
    return { error: 'Selected room type is not available for this hotel.' };
  }

  const currentAvailable = Number.isFinite(selectedRoom.availableRooms)
    ? Number(selectedRoom.availableRooms)
    : Number(selectedRoom.totalInventory || 0);
  const totalInventory = Number.isFinite(selectedRoom.totalInventory)
    ? Number(selectedRoom.totalInventory)
    : currentAvailable;

  selectedRoom.availableRooms = Math.min(totalInventory, Math.max(0, currentAvailable + Number(roomsToRestore || 0)));
  hotel.availableRooms = calculateTotalAvailableRooms(hotel.rooms || []);
  return { hotel, selectedRoom };
};

const getEffectiveCommissionSettings = async () => {
  const setting = await HotelCommissionSetting.findOne({ key: 'hotelbooking.default' }).lean();
  return {
    ...DEFAULT_COMMISSION_SETTINGS,
    ...(setting || {}),
  };
};

const getCommissionRateForProperty = (property = {}, settings = DEFAULT_COMMISSION_SETTINGS) => {
  const directRate = Number(property?.commissionRate);
  if (Number.isFinite(directRate) && directRate > 0) {
    return directRate;
  }

  const listingType = String(property?.listingType || '').trim().toLowerCase();
  if (listingType === 'premium') return Number(settings.premiumRate || settings.defaultRate || 0);
  if (listingType === 'featured' || property?.isFeatured) return Number(settings.featuredRate || settings.defaultRate || 0);
  if (listingType === 'standard') return Number(settings.basicRate || settings.defaultRate || 0);
  return Number(settings.defaultRate || 0);
};

const isTransactionUnsupportedError = (error) => {
  const text = String(error?.message || '').toLowerCase();
  return (
    text.includes('transaction numbers are only allowed') ||
    text.includes('replica set') ||
    text.includes('transactions are not supported')
  );
};

const executeWithOptionalTransaction = async (executor) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    let result = null;
    await session.withTransaction(async () => {
      result = await executor(session);
    });
    return result;
  } catch (error) {
    if (session && isTransactionUnsupportedError(error)) {
      return executor(null);
    }
    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

const updatePartnerBookingStatus = async (req, res, bookingStatus, partnerNote = '') => {
  try {
    const nextBookingStatus = String(bookingStatus || '').trim();
    const response = await executeWithOptionalTransaction(async (session) => {
      const booking = await HotelBooking.findById(req.params.id).session(session || null);
      if (!booking) return { statusCode: 404, body: { success: false, message: 'Booking not found.' } };

      const property = await HotelProperty.findById(booking.propertyId).session(session || null);
      if (!property || String(property.ownerId || '') !== String(normalizeUserId(req) || '')) {
        return { statusCode: 403, body: { success: false, message: 'Not allowed.' } };
      }

      const previousBookingStatus = booking.bookingStatus;
      const transitioningToRejected =
        nextBookingStatus === 'Rejected' && !['Rejected', 'Cancelled'].includes(previousBookingStatus);

      if (nextBookingStatus) {
        booking.bookingStatus = nextBookingStatus;
        booking.status = bookingStatusMap[nextBookingStatus] || booking.status;
      }
      if (partnerNote) booking.partnerNote = String(partnerNote).trim();

      if (transitioningToRejected && !booking.inventoryRestoredAt) {
        const restoreResult = restoreHotelRoomAvailability(property, booking.roomType, booking.numberOfRooms || 1);
        if (!restoreResult.error) {
          booking.inventoryRestoredAt = new Date();
          await property.save({ session: session || undefined });
        }
      }

      await booking.save({ session: session || undefined });
      return {
        statusCode: 200,
        body: {
          success: true,
          data: mapBookingForClient(booking.toObject()),
          booking: mapBookingForClient(booking.toObject()),
        },
      };
    });

    return res.status(response.statusCode).json(response.body);
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to update booking status.' });
  }
};

router.get('/hotels', async (req, res) => {
  try {
    const destination = String(req.query.destination || '').trim();
    const type = String(req.query.type || '').trim();
    const minPrice = Number(req.query.minPrice || 0);
    const maxPrice = Number(req.query.maxPrice || 0);

    const query = { status: 'Approved' };
    if (destination) {
      const safeDestination = escapeRegExp(destination).slice(0, 80);
      const destinationRegex = new RegExp(safeDestination, 'i');
      query.$or = [
        { businessName: destinationRegex },
        { location: destinationRegex },
        { city: destinationRegex },
      ];
    }
    if (type) query.propertyType = type;
    if (minPrice || maxPrice) {
      query.pricePerNight = {};
      if (minPrice) query.pricePerNight.$gte = minPrice;
      if (maxPrice) query.pricePerNight.$lte = maxPrice;
    }

    const hotels = await HotelProperty.find(query).sort({ isFeatured: -1, rating: -1, createdAt: -1 }).lean();
    return res.json({ success: true, data: hotels.map(mapHotelForClient) });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to load hotels.' });
  }
});

router.get('/hotels/:id', async (req, res) => {
  try {
    const hotel = await HotelProperty.findById(req.params.id).lean();
    if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found.' });
    return res.json({ success: true, data: mapHotelForClient(hotel) });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to load hotel details.' });
  }
});

router.get('/hotels/:id/inventory-calendar', async (req, res) => {
  try {
    const startDate = new Date(String(req.query.startDate || '').trim());
    const endDate = new Date(String(req.query.endDate || '').trim());

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      return res.status(400).json({ success: false, message: 'Invalid startDate or endDate.' });
    }

    const dayCount = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (dayCount > 90) {
      return res.status(400).json({ success: false, message: 'Maximum range is 90 days.' });
    }

    const hotel = await HotelProperty.findById(req.params.id).lean();
    if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found.' });

    const overlappingBookings = await HotelBooking.find({
      propertyId: hotel._id,
      bookingStatus: { $nin: ['Cancelled', 'Rejected'] },
      checkInDate: { $lt: endDate },
      checkOutDate: { $gt: startDate },
    })
      .select('roomType numberOfRooms checkInDate checkOutDate bookingStatus')
      .lean();

    const roomCalendars = (hotel.rooms || []).map((room) => {
      const roomType = room.type;
      const totalInventory = Number(room.totalInventory || room.availableRooms || 0);
      const days = [];

      for (let cursor = new Date(startDate); cursor < endDate; cursor.setDate(cursor.getDate() + 1)) {
        const dayStart = new Date(cursor);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const bookedRooms = overlappingBookings
          .filter((booking) => normalizeRoomType(booking.roomType) === normalizeRoomType(roomType))
          .filter((booking) => booking.checkInDate < dayEnd && booking.checkOutDate > dayStart)
          .reduce((sum, booking) => sum + Number(booking.numberOfRooms || 1), 0);

        days.push({
          date: dayStart.toISOString().split('T')[0],
          bookedRooms,
          availableRooms: Math.max(0, totalInventory - bookedRooms),
        });
      }

      return { roomType, totalInventory, days };
    });

    return res.json({
      success: true,
      data: {
        hotelId: String(hotel._id),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        rooms: roomCalendars,
      },
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to load inventory calendar.' });
  }
});

router.post('/hotels', authenticate, async (req, res) => {
  try {
    const { error, value } = hotelSchema.validate(req.body || {}, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const rooms = (value.rooms || []).map((room) => ({
      ...room,
      availableRooms: Number.isFinite(room.availableRooms) ? room.availableRooms : room.totalInventory,
    }));
    const calculatedPrice = calculateBasePriceFromRooms(rooms);
    const availableRooms = calculateTotalAvailableRooms(rooms);

    const created = await HotelProperty.create({
      ownerId: normalizeUserId(req),
      ...value,
      rooms,
      pricePerNight: calculatedPrice,
      availableRooms,
      status: 'Pending',
      verified: false,
    });

    return res.status(201).json({
      success: true,
      data: mapHotelForClient(created.toObject()),
      message: 'Property submitted for admin approval.',
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to create hotel.' });
  }
});

router.get('/partner/hotels', authenticate, async (req, res) => {
  try {
    const hotels = await HotelProperty.find({ ownerId: normalizeUserId(req) }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: hotels.map(mapHotelForClient) });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to load partner hotels.' });
  }
});

router.put('/partner/hotels/:id', authenticate, async (req, res) => {
  try {
    const hotel = await HotelProperty.findById(req.params.id);
    if (!hotel) return res.status(404).json({ success: false, message: 'Property not found.' });
    if (String(hotel.ownerId || '') !== String(normalizeUserId(req) || '')) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }

    const { error, value } = hotelSchema.validate(req.body || {}, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const rooms = (value.rooms || []).map((room) => ({
      ...room,
      availableRooms: Number.isFinite(room.availableRooms) ? room.availableRooms : room.totalInventory,
    }));
    hotel.businessName = value.businessName;
    hotel.propertyType = value.propertyType;
    hotel.location = value.location;
    hotel.address = value.address;
    hotel.city = value.city;
    hotel.pincode = value.pincode;
    hotel.phone = value.phone;
    hotel.email = value.email;
    hotel.description = value.description;
    hotel.amenities = value.amenities;
    hotel.images = value.images;
    hotel.rooms = rooms;
    hotel.pricePerNight = calculateBasePriceFromRooms(rooms);
    hotel.availableRooms = calculateTotalAvailableRooms(rooms);
    await hotel.save();

    return res.json({ success: true, data: mapHotelForClient(hotel.toObject()) });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to update hotel.' });
  }
});

router.post('/bookings', authenticate, async (req, res) => {
  try {
    const { error, value } = bookingSchema.validate(req.body || {}, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const userId = normalizeUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const routeKey = 'hotelbooking.bookings.create';
    const method = 'POST';
    const idempotencyKey = getRequestIdempotencyKey(req);
    const requestHash = buildIdempotencyRequestHash(req, { routeKey, userId });

    if (idempotencyKey) {
      const existing = await findIdempotencyRecord({ userId, key: idempotencyKey, method, routeKey });
      if (existing) {
        if (existing.requestHash !== requestHash) {
          return res.status(409).json({
            success: false,
            message: 'Idempotency key reuse conflict: request payload changed.',
          });
        }
        return res.status(existing.statusCode || 201).json(existing.responseBody || {});
      }
    }

    const response = await executeWithOptionalTransaction(async (session) => {
      const property = await HotelProperty.findById(value.hotelId).session(session || null);
      if (!property) return { statusCode: 404, body: { success: false, message: 'Hotel not found.' } };
      if (property.status !== 'Approved') {
        return { statusCode: 409, body: { success: false, message: 'Hotel is not available for booking.' } };
      }

      const checkInDate = new Date(value.checkInDate);
      const checkOutDate = new Date(value.checkOutDate);
      if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
        return { statusCode: 400, body: { success: false, message: 'Invalid check-in or check-out date.' } };
      }
      if (checkOutDate <= checkInDate) {
        return { statusCode: 400, body: { success: false, message: 'Check-out must be after check-in.' } };
      }

      const requestedRooms = Number(value.numberOfRooms || 1);
      if (requestedRooms > Number(property.availableRooms || 0)) {
        return { statusCode: 409, body: { success: false, message: 'Requested rooms are not available.' } };
      }

      const selectedRoom = (property.rooms || []).find(
        (room) => normalizeRoomType(room.type) === normalizeRoomType(value.roomType)
      );
      if (!selectedRoom) {
        return {
          statusCode: 400,
          body: { success: false, message: 'Selected room type is invalid for this hotel.' },
        };
      }

      const availabilityResult = updateHotelRoomAvailability(property, value.roomType, requestedRooms);
      if (availabilityResult?.error) {
        return { statusCode: 409, body: { success: false, message: availabilityResult.error } };
      }

      const pricePerNight = Number(selectedRoom?.basePrice || value.pricePerNight || property.pricePerNight || 0);
      const numberOfNights = calculateNights(checkInDate, checkOutDate);
      const totalPrice = Math.round(pricePerNight * numberOfNights * requestedRooms);
      const gst = Math.round(totalPrice * 0.05);
      const finalTotal = totalPrice + gst;

      await property.save({ session: session || undefined });

      const createdRows = await HotelBooking.create(
        [
          {
            userId,
            partnerId: String(property.ownerId || ''),
            propertyId: property._id,
            hotelName: property.businessName,
            location: property.location,
            roomType: value.roomType,
            guestName: value.guestName,
            guestEmail: value.guestEmail,
            guestPhone: value.guestPhone,
            checkInDate,
            checkOutDate,
            numberOfNights,
            numberOfGuests: value.numberOfGuests,
            numberOfRooms: requestedRooms,
            pricePerNight,
            totalPrice,
            gst,
            finalTotal,
            specialRequests: value.specialRequests,
            paymentStatus: 'Pending',
            bookingStatus: 'Pending',
            status: 'pending',
          },
        ],
        { session: session || undefined }
      );

      const created = createdRows[0];
      return {
        statusCode: 201,
        body: {
          success: true,
          data: { booking: mapBookingForClient(created.toObject()) },
          message: 'Booking submitted successfully.',
        },
      };
    });

    if (idempotencyKey && response.statusCode >= 200 && response.statusCode < 300) {
      await saveIdempotencyRecord({
        userId,
        key: idempotencyKey,
        method,
        routeKey,
        requestHash,
        statusCode: response.statusCode,
        responseBody: response.body,
      });
    }

    return res.status(response.statusCode).json(response.body);
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to submit booking.' });
  }
});

router.get('/bookings/my', authenticate, async (req, res) => {
  try {
    const bookings = await HotelBooking.find({ userId: normalizeUserId(req) }).sort({ createdAt: -1 }).lean();
    const mapped = bookings.map(mapBookingForClient);
    return res.json({ success: true, data: mapped, bookings: mapped });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to load bookings.' });
  }
});

router.post('/bookings/:id/cancel', authenticate, async (req, res) => {
  try {
    const response = await executeWithOptionalTransaction(async (session) => {
      const booking = await HotelBooking.findById(req.params.id).session(session || null);
      if (!booking) return { statusCode: 404, body: { success: false, message: 'Booking not found.' } };

      const currentUserId = String(normalizeUserId(req) || '');
      const isOwner = String(booking.userId || '') === currentUserId;
      const isAdmin = Boolean(req.user && (req.user.role === 'admin' || req.user.isAdmin));
      if (!isOwner && !isAdmin) return { statusCode: 403, body: { success: false, message: 'Not allowed.' } };

      const alreadyFinal = ['Cancelled', 'Rejected'].includes(String(booking.bookingStatus || ''));
      if (!alreadyFinal && !booking.inventoryRestoredAt) {
        const property = await HotelProperty.findById(booking.propertyId).session(session || null);
        if (property) {
          const restoreResult = restoreHotelRoomAvailability(property, booking.roomType, booking.numberOfRooms || 1);
          if (!restoreResult.error) {
            booking.inventoryRestoredAt = new Date();
            await property.save({ session: session || undefined });
          }
        }
      }

      booking.bookingStatus = 'Cancelled';
      booking.status = 'cancelled';
      booking.cancellationReason = String(req.body?.cancellationReason || 'Cancelled by user').trim();
      await booking.save({ session: session || undefined });

      return {
        statusCode: 200,
        body: { success: true, data: { booking: mapBookingForClient(booking.toObject()) } },
      };
    });

    return res.status(response.statusCode).json(response.body);
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to cancel booking.' });
  }
});

router.get('/partner/bookings', authenticate, async (req, res) => {
  try {
    const owned = await HotelProperty.find({ ownerId: normalizeUserId(req) }).select('_id').lean();
    const propertyIds = owned.map((item) => item._id);
    const bookings = await HotelBooking.find({ propertyId: { $in: propertyIds } }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: bookings.map(mapBookingForClient) });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to load partner bookings.' });
  }
});

router.put('/partner/bookings/:id/status', authenticate, async (req, res) => {
  const nextStatus = String(req.body?.bookingStatus || '').trim();
  const partnerNote = String(req.body?.partnerNote || '').trim();
  return updatePartnerBookingStatus(req, res, nextStatus, partnerNote);
});

router.post('/partner/booking-requests/:id/approve', authenticate, async (req, res) => {
  return updatePartnerBookingStatus(req, res, 'Confirmed', req.body?.partnerNote || 'Approved by partner.');
});

router.post('/partner/booking-requests/:id/reject', authenticate, async (req, res) => {
  return updatePartnerBookingStatus(req, res, 'Rejected', req.body?.partnerNote || 'Rejected by partner.');
});

router.get('/partner/payouts/:partnerId', authenticate, async (req, res) => {
  try {
    const currentUserId = String(normalizeUserId(req) || '');
    const requestedPartnerId = String(req.params.partnerId || '');
    const isAdmin = Boolean(req.user && (req.user.role === 'admin' || req.user.isAdmin));

    if (!isAdmin && requestedPartnerId !== currentUserId) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }

    const payouts = await HotelPartnerPayout.find({ partnerId: requestedPartnerId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: payouts.map(mapPayoutForClient) });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to load payouts.' });
  }
});

router.post('/partner/payouts/request', authenticate, async (req, res) => {
  try {
    const { error, value } = payoutRequestSchema.validate(req.body || {}, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const partnerId = normalizeUserId(req);
    const bookingIds = (value.bookingIds || []).filter(Boolean);

    const eligibleCount = await HotelBooking.countDocuments({
      _id: { $in: bookingIds },
      partnerId,
      bookingStatus: { $in: ['Confirmed', 'Checked In', 'Completed'] },
    });

    if (eligibleCount !== bookingIds.length) {
      return res.status(400).json({ success: false, message: 'Some bookings are not eligible for payout.' });
    }
    if (eligibleCount < 10) {
      return res.status(400).json({
        success: false,
        message: 'At least 10 eligible bookings are required to request payout.',
      });
    }

    const created = await HotelPartnerPayout.create({
      partnerId,
      startDate: value.startDate,
      endDate: value.endDate,
      bookings: value.bookings,
      grossAmount: Math.round(Number(value.grossAmount || 0)),
      commission: Math.round(Number(value.commission || 0)),
      netAmount: Math.round(Number(value.netAmount || 0)),
      bookingIds,
      status: 'pending',
      notes: value.notes,
    });

    return res.status(201).json({ success: true, data: mapPayoutForClient(created.toObject()) });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to create payout request.' });
  }
});

router.post('/partner/payouts/:id/settle', authenticate, verifyAdmin, async (req, res) => {
  try {
    const payout = await HotelPartnerPayout.findById(req.params.id);
    if (!payout) return res.status(404).json({ success: false, message: 'Payout not found.' });
    const currentUserId = String(normalizeUserId(req) || '');

    payout.status = 'paid';
    payout.settledAt = new Date();
    payout.settledBy = currentUserId;
    await payout.save();

    return res.json({ success: true, data: mapPayoutForClient(payout.toObject()) });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to settle payout.' });
  }
});

router.post('/bookings/:id/review', authenticate, async (req, res) => {
  try {
    const payload = { ...(req.body || {}), bookingId: req.body?.bookingId || req.params.id };
    const { error, value } = reviewSchema.validate(payload, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const booking = await HotelBooking.findById(value.bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    const isOwner = String(booking.userId || '') === String(normalizeUserId(req) || '');
    if (!isOwner) return res.status(403).json({ success: false, message: 'Not allowed.' });
    if (!['Completed'].includes(String(booking.bookingStatus || ''))) {
      return res.status(409).json({ success: false, message: 'Review is allowed only after the stay is completed.' });
    }

    const alreadyReviewed = await HotelReview.findOne({ bookingId: booking._id }).lean();
    if (alreadyReviewed) {
      return res.status(409).json({ success: false, message: 'A review already exists for this booking.' });
    }

    const review = await HotelReview.create({
      userId: normalizeUserId(req),
      propertyId: booking.propertyId,
      bookingId: booking._id,
      guestName: booking.guestName || 'Guest',
      rating: value.rating,
      comment: value.comment,
      photos: value.photos,
      status: 'Published',
    });

    const aggregate = await HotelReview.aggregate([
      { $match: { propertyId: booking.propertyId, status: 'Published' } },
      { $group: { _id: '$propertyId', avgRating: { $avg: '$rating' }, total: { $sum: 1 } } },
    ]);

    if (aggregate[0]) {
      await HotelProperty.findByIdAndUpdate(booking.propertyId, {
        rating: Number(aggregate[0].avgRating.toFixed(2)),
        reviews: aggregate[0].total,
      });
    }

    return res.status(201).json({ success: true, data: review });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to submit review.' });
  }
});

router.get('/hotels/:id/reviews', async (req, res) => {
  try {
    const reviews = await HotelReview.find({ propertyId: req.params.id, status: 'Published' })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.json({ success: true, data: reviews });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to load reviews.' });
  }
});

router.post('/ai/concierge', async (req, res) => {
  try {
    const { error, value } = aiConciergeSchema.validate(req.body || {}, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const result = await generateHotelConciergeResponse({
      question: value.question,
      context: value.context || {},
    });

    return res.json({ success: true, data: result });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to generate concierge response.' });
  }
});

router.get('/admin/hotels', authenticate, verifyAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || '').trim();
    const query = status ? { status } : {};
    const hotels = await HotelProperty.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: hotels.map(mapHotelForClient) });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to load hotels.' });
  }
});

router.get('/admin/hotels/pending', authenticate, verifyAdmin, async (_req, res) => {
  try {
    const hotels = await HotelProperty.find({ status: 'Pending' }).sort({ createdAt: -1 }).lean();
    return res.json({
      success: true,
      data: hotels.map((item) => ({
        ...mapHotelForClient(item),
        images: (item.images || []).length,
        rooms: (item.rooms || []).length,
      })),
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to load pending hotels.' });
  }
});

router.get('/admin/hotels/verified', authenticate, verifyAdmin, async (_req, res) => {
  try {
    const bookingsByProperty = await HotelBooking.aggregate([
      { $match: { bookingStatus: { $in: ['Confirmed', 'Checked In', 'Completed'] } } },
      { $group: { _id: '$propertyId', bookings: { $sum: 1 }, revenue: { $sum: '$finalTotal' } } },
    ]);

    const metricsMap = bookingsByProperty.reduce((map, item) => {
      map[String(item._id)] = item;
      return map;
    }, {});

    const hotels = await HotelProperty.find({ status: 'Approved' }).sort({ createdAt: -1 }).lean();
    return res.json({
      success: true,
      data: hotels.map((item) => ({
        ...mapHotelForClient(item),
        bookings: metricsMap[String(item._id)]?.bookings || 0,
        revenue: Math.round(metricsMap[String(item._id)]?.revenue || 0),
      })),
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to load verified hotels.' });
  }
});

router.put('/admin/hotels/:id/status', authenticate, verifyAdmin, async (req, res) => {
  try {
    const updates = {};
    if (req.body?.status) updates.status = String(req.body.status).trim();
    if (typeof req.body?.isFeatured !== 'undefined') updates.isFeatured = Boolean(req.body.isFeatured);
    if (typeof req.body?.verified !== 'undefined') updates.verified = Boolean(req.body.verified);
    if (req.body?.adminNote) updates.adminNote = String(req.body.adminNote).trim();
    if (typeof req.body?.commissionRate !== 'undefined') updates.commissionRate = Number(req.body.commissionRate || 0);
    if (req.body?.listingType) updates.listingType = String(req.body.listingType).trim().toLowerCase();

    const hotel = await HotelProperty.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found.' });
    return res.json({ success: true, data: mapHotelForClient(hotel.toObject()), message: 'Hotel updated.' });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to update hotel.' });
  }
});

router.post('/admin/hotels/:id/verify', authenticate, verifyAdmin, async (req, res) => {
  try {
    const hotel = await HotelProperty.findByIdAndUpdate(
      req.params.id,
      { status: 'Approved', verified: true },
      { new: true }
    );
    if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found.' });
    return res.json({ success: true, data: mapHotelForClient(hotel.toObject()), message: 'Hotel approved.' });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to verify hotel.' });
  }
});

router.post('/admin/hotels/:id/reject', authenticate, verifyAdmin, async (req, res) => {
  try {
    const hotel = await HotelProperty.findByIdAndUpdate(
      req.params.id,
      { status: 'Rejected', verified: false },
      { new: true }
    );
    if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found.' });
    return res.json({ success: true, data: mapHotelForClient(hotel.toObject()), message: 'Hotel rejected.' });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to reject hotel.' });
  }
});

router.get('/admin/stats', authenticate, verifyAdmin, async (_req, res) => {
  try {
    const [totalHotels, pendingApprovals, totalPartners, activeBookings, monthlyBookings, paidOrConfirmed, settings] =
      await Promise.all([
        HotelProperty.countDocuments({}),
        HotelProperty.countDocuments({ status: 'Pending' }),
        HotelProperty.distinct('ownerId').then((rows) => rows.filter(Boolean).length),
        HotelBooking.countDocuments({ bookingStatus: { $in: ['Pending', 'Confirmed', 'Checked In'] } }),
        HotelBooking.find({
          createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        }).lean(),
        HotelBooking.find({ bookingStatus: { $in: ['Confirmed', 'Checked In', 'Completed'] } }).lean(),
        getEffectiveCommissionSettings(),
      ]);

    const monthlyRevenue = monthlyBookings.reduce((sum, booking) => sum + Number(booking.finalTotal || 0), 0);
    const propertyIds = [...new Set(paidOrConfirmed.map((booking) => String(booking.propertyId || '')).filter(Boolean))];
    const properties = await HotelProperty.find({ _id: { $in: propertyIds } })
      .select('_id commissionRate listingType isFeatured')
      .lean();
    const propertyMap = properties.reduce((acc, property) => {
      acc[String(property._id)] = property;
      return acc;
    }, {});

    const commissionEarned = paidOrConfirmed.reduce((sum, booking) => {
      const property = propertyMap[String(booking.propertyId || '')] || {};
      const rate = getCommissionRateForProperty(property, settings);
      return sum + Number(booking.finalTotal || 0) * (rate / 100);
    }, 0);

    return res.json({
      success: true,
      data: {
        totalHotels,
        activeBookings,
        monthlyRevenue: Math.round(monthlyRevenue),
        commissionEarned: Math.round(commissionEarned),
        pendingApprovals,
        totalPartners,
      },
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to load stats.' });
  }
});

router.put('/admin/commission', authenticate, verifyAdmin, async (req, res) => {
  try {
    const { error, value } = commissionSchema.validate(req.body || {}, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const key = 'hotelbooking.default';
    const updated = await HotelCommissionSetting.findOneAndUpdate({ key }, { key, ...value }, { upsert: true, new: true });
    return res.json({
      success: true,
      data: {
        defaultRate: updated.defaultRate,
        basicRate: updated.basicRate,
        featuredRate: updated.featuredRate,
        premiumRate: updated.premiumRate,
      },
      message: 'Commission settings updated.',
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to update commission settings.' });
  }
});

router.get('/admin/commission', authenticate, verifyAdmin, async (_req, res) => {
  try {
    const setting = await HotelCommissionSetting.findOne({ key: 'hotelbooking.default' }).lean();
    return res.json({
      success: true,
      data: setting
        ? {
            defaultRate: setting.defaultRate,
            basicRate: setting.basicRate,
            featuredRate: setting.featuredRate,
            premiumRate: setting.premiumRate,
          }
        : DEFAULT_COMMISSION_SETTINGS,
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to load commission settings.' });
  }
});

module.exports = router;
module.exports.__private__ = {
  hotelSchema,
  bookingSchema,
  reviewSchema,
  commissionSchema,
  calculateNights,
};
