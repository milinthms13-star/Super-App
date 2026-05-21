const express = require('express');
const Joi = require('joi');
const { authenticate, verifyAdmin } = require('../middleware/auth');
const HotelProperty = require('../models/HotelProperty');
const HotelBooking = require('../models/HotelBooking');
const HotelReview = require('../models/HotelReview');
const HotelCommissionSetting = require('../models/HotelCommissionSetting');

const router = express.Router();

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

const normalizeUserId = (req) => req.user?._id || req.user?.id || null;

const calculateNights = (checkInDate, checkOutDate) => {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const diff = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
};

const calculateBasePriceFromRooms = (rooms = []) => {
  if (!Array.isArray(rooms) || rooms.length === 0) return 0;
  const positivePrices = rooms
    .map((room) => Number(room.basePrice || 0))
    .filter((price) => Number.isFinite(price) && price > 0);
  return positivePrices.length ? Math.min(...positivePrices) : 0;
};

const mapHotelForClient = (hotel = {}) => ({
  _id: hotel._id,
  id: String(hotel._id || ''),
  businessName: hotel.businessName,
  name: hotel.businessName,
  location: hotel.location,
  city: hotel.city,
  type: hotel.propertyType,
  propertyType: hotel.propertyType,
  phone: hotel.phone,
  email: hotel.email,
  description: hotel.description,
  images: hotel.images || [],
  amenities: hotel.amenities || [],
  rooms: hotel.rooms || [],
  pricePerNight: Number(hotel.pricePerNight || 0),
  price: Number(hotel.pricePerNight || 0),
  availableRooms: Number(hotel.availableRooms || 0),
  rating: Number(hotel.rating || 0),
  reviews: Number(hotel.reviews || 0),
  verified: Boolean(hotel.verified || hotel.status === 'Approved'),
  status: hotel.status,
  isFeatured: Boolean(hotel.isFeatured),
  submittedDate: hotel.createdAt,
  createdAt: hotel.createdAt,
});

const mapBookingForClient = (booking = {}) => ({
  _id: booking._id,
  id: String(booking._id || ''),
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
  partnerNote: booking.partnerNote,
  adminNote: booking.adminNote,
  createdAt: booking.createdAt,
});

const updateHotelRoomAvailability = (hotel, roomType, requestedRooms) => {
  const selectedRoom = (hotel.rooms || []).find((room) => String(room.type || '').trim().toLowerCase() === String(roomType || '').trim().toLowerCase());
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
  hotel.availableRooms = (hotel.rooms || []).reduce((sum, room) => {
    const roomAvailable = Number.isFinite(room.availableRooms)
      ? Number(room.availableRooms)
      : Number(room.totalInventory || 0);
    return sum + Math.max(0, roomAvailable);
  }, 0);

  return { hotel, selectedRoom };
};

const updatePartnerBookingStatus = async (req, res, bookingStatus, partnerNote = '') => {
  try {
    const booking = await HotelBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    const property = await HotelProperty.findById(booking.propertyId).lean();
    if (!property || String(property.ownerId || '') !== String(normalizeUserId(req) || '')) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }

    if (bookingStatus) {
      booking.bookingStatus = bookingStatus;
      booking.status = bookingStatusMap[bookingStatus] || booking.status;
    }
    if (partnerNote) booking.partnerNote = String(partnerNote).trim();
    await booking.save();

    return res.json({ success: true, data: mapBookingForClient(booking.toObject()), booking: mapBookingForClient(booking.toObject()) });
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
      query.$or = [
        { businessName: new RegExp(destination, 'i') },
        { location: new RegExp(destination, 'i') },
        { city: new RegExp(destination, 'i') },
      ];
    }
    if (type) query.propertyType = type;
    if (minPrice || maxPrice) {
      query.pricePerNight = {};
      if (minPrice) query.pricePerNight.$gte = minPrice;
      if (maxPrice) query.pricePerNight.$lte = maxPrice;
    }

    const hotels = await HotelProperty.find(query)
      .sort({ isFeatured: -1, rating: -1, createdAt: -1 })
      .lean();
    return res.json({ success: true, data: hotels.map(mapHotelForClient) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load hotels.' });
  }
});

router.get('/hotels/:id', async (req, res) => {
  try {
    const hotel = await HotelProperty.findById(req.params.id).lean();
    if (!hotel) {
      return res.status(404).json({ success: false, message: 'Hotel not found.' });
    }

    return res.json({ success: true, data: mapHotelForClient(hotel) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load hotel details.' });
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
    const availableRooms = rooms.reduce((sum, room) => sum + Number(room.availableRooms || 0), 0);

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
    const hotels = await HotelProperty.find({ ownerId: normalizeUserId(req) })
      .sort({ createdAt: -1 })
      .lean();
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
    hotel.availableRooms = rooms.reduce((sum, room) => sum + Number(room.availableRooms || 0), 0);
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

    const property = await HotelProperty.findById(value.hotelId);
    if (!property) return res.status(404).json({ success: false, message: 'Hotel not found.' });
    if (property.status !== 'Approved') {
      return res.status(409).json({ success: false, message: 'Hotel is not available for booking.' });
    }

    const checkInDate = new Date(value.checkInDate);
    const checkOutDate = new Date(value.checkOutDate);
    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid check-in or check-out date.' });
    }
    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ success: false, message: 'Check-out must be after check-in.' });
    }

    const requestedRooms = Number(value.numberOfRooms || 1);
    if (requestedRooms > Number(property.availableRooms || 0)) {
      return res.status(409).json({ success: false, message: 'Requested rooms are not available.' });
    }

    const selectedRoom = (property.rooms || []).find((room) => String(room.type || '').trim().toLowerCase() === String(value.roomType || '').trim().toLowerCase());
    if (!selectedRoom) {
      return res.status(400).json({ success: false, message: 'Selected room type is invalid for this hotel.' });
    }

    const availabilityResult = updateHotelRoomAvailability(property, value.roomType, requestedRooms);
    if (availabilityResult?.error) {
      return res.status(409).json({ success: false, message: availabilityResult.error });
    }

    const pricePerNight = selectedRoom?.basePrice || Number(value.pricePerNight || property.pricePerNight || 0);
    const numberOfNights = calculateNights(checkInDate, checkOutDate);
    const totalPrice = Math.round(pricePerNight * numberOfNights * requestedRooms);
    const gst = Math.round(totalPrice * 0.05);
    const finalTotal = totalPrice + gst;

    await property.save();

    const created = await HotelBooking.create({
      userId: normalizeUserId(req),
      partnerId: property.ownerId,
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
    });

    return res.status(201).json({
      success: true,
      data: { booking: mapBookingForClient(created.toObject()) },
      message: 'Booking submitted successfully.',
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to submit booking.' });
  }
});

router.get('/bookings/my', authenticate, async (req, res) => {
  try {
    const bookings = await HotelBooking.find({ userId: normalizeUserId(req) }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: bookings.map(mapBookingForClient), bookings: bookings.map(mapBookingForClient) });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to load bookings.' });
  }
});

router.post('/bookings/:id/cancel', authenticate, async (req, res) => {
  try {
    const booking = await HotelBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    const isOwner = String(booking.userId || '') === String(normalizeUserId(req) || '');
    if (!isOwner && !(req.user && (req.user.role === 'admin' || req.user.isAdmin))) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }

    booking.bookingStatus = 'Cancelled';
    booking.status = 'cancelled';
    booking.cancellationReason = String(req.body?.cancellationReason || 'Cancelled by user').trim();
    await booking.save();

    return res.json({ success: true, data: { booking: mapBookingForClient(booking.toObject()) } });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to cancel booking.' });
  }
});

router.get('/partner/bookings', authenticate, async (req, res) => {
  try {
    const owned = await HotelProperty.find({ ownerId: normalizeUserId(req) }).select('_id').lean();
    const propertyIds = owned.map((item) => item._id);
    const bookings = await HotelBooking.find({ propertyId: { $in: propertyIds } })
      .sort({ createdAt: -1 })
      .lean();
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

router.post('/bookings/:id/review', authenticate, async (req, res) => {
  try {
    const payload = { ...(req.body || {}), bookingId: req.body?.bookingId || req.params.id };
    const { error, value } = reviewSchema.validate(payload, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const booking = await HotelBooking.findById(value.bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    const isOwner = String(booking.userId || '') === String(normalizeUserId(req) || '');
    if (!isOwner) return res.status(403).json({ success: false, message: 'Not allowed.' });

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
    return res.json({ success: true, data: hotels.map((item) => ({ ...mapHotelForClient(item), images: (item.images || []).length, rooms: (item.rooms || []).length })) });
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
    const [totalHotels, pendingApprovals, totalPartners, activeBookings, monthlyBookings, paidOrConfirmed] =
      await Promise.all([
        HotelProperty.countDocuments({}),
        HotelProperty.countDocuments({ status: 'Pending' }),
        HotelProperty.distinct('ownerId').then((rows) => rows.filter(Boolean).length),
        HotelBooking.countDocuments({ bookingStatus: { $in: ['Pending', 'Confirmed', 'Checked In'] } }),
        HotelBooking.find({
          createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        }).lean(),
        HotelBooking.find({ bookingStatus: { $in: ['Confirmed', 'Checked In', 'Completed'] } }).lean(),
      ]);

    const monthlyRevenue = monthlyBookings.reduce((sum, booking) => sum + Number(booking.finalTotal || 0), 0);
    const commissionEarned = paidOrConfirmed.reduce((sum, booking) => sum + Number(booking.finalTotal || 0) * 0.1, 0);

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
    const updated = await HotelCommissionSetting.findOneAndUpdate(
      { key },
      { key, ...value },
      { upsert: true, new: true }
    );
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
    const key = 'hotelbooking.default';
    const setting = await HotelCommissionSetting.findOne({ key }).lean();
    return res.json({
      success: true,
      data: setting
        ? {
            defaultRate: setting.defaultRate,
            basicRate: setting.basicRate,
            featuredRate: setting.featuredRate,
            premiumRate: setting.premiumRate,
          }
        : {
        defaultRate: 10,
        basicRate: 8,
        featuredRate: 12,
        premiumRate: 15,
      },
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
