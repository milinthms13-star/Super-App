const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    const role = String(req.headers['x-user-role'] || 'user').trim().toLowerCase();
    const userId = String(req.headers['x-user-id'] || '507f1f77bcf86cd799439011');
    req.user = {
      _id: userId,
      id: userId,
      role,
      email: String(req.headers['x-user-email'] || 'hotel.user@example.com').trim().toLowerCase(),
      name: String(req.headers['x-user-name'] || 'Hotel User'),
      isAdmin: role === 'admin',
    };
    next();
  },
  verifyAdmin: (req, res, next) => {
    if (String(req.user?.role || '').toLowerCase() === 'admin') return next();
    return res.status(403).json({ success: false, message: 'Forbidden' });
  },
}));

const hotelbookingRouter = require('./hotelbooking');
const HotelProperty = require('../models/HotelProperty');
const HotelBooking = require('../models/HotelBooking');
const HotelReview = require('../models/HotelReview');
const HotelCommissionSetting = require('../models/HotelCommissionSetting');
const HotelBookingIdempotencyKey = require('../models/HotelBookingIdempotencyKey');
const HotelPartnerPayout = require('../models/HotelPartnerPayout');

describe('hotelbooking routes integration', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    let resolvedMongoUri = process.env.MONGO_TEST_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
    if (!resolvedMongoUri) {
      mongoServer = await MongoMemoryServer.create();
      resolvedMongoUri = mongoServer.getUri();
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(resolvedMongoUri, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
      });
    }

    app = express();
    app.use(express.json());
    app.use('/api/hotelbooking', hotelbookingRouter);
  });

  beforeEach(async () => {
    await Promise.all([
      HotelProperty.deleteMany({}),
      HotelBooking.deleteMany({}),
      HotelReview.deleteMany({}),
      HotelCommissionSetting.deleteMany({}),
      HotelBookingIdempotencyKey.deleteMany({}),
      HotelPartnerPayout.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  const createApprovedProperty = async ({
    ownerId = '507f1f77bcf86cd799439099',
    totalInventory = 3,
    availableRooms = 3,
    listingType = 'standard',
  } = {}) => {
    return HotelProperty.create({
      ownerId,
      businessName: 'Kerala Lake Stay',
      propertyType: 'Hotel',
      location: 'Alleppey',
      phone: '9876543210',
      email: 'owner@example.com',
      description: 'A scenic stay.',
      amenities: ['WiFi'],
      images: [],
      rooms: [
        {
          type: 'Deluxe',
          capacity: 2,
          bedType: 'Double',
          basePrice: 2000,
          totalInventory,
          availableRooms,
          amenities: [],
          cancellationPolicy: 'Flexible',
        },
      ],
      pricePerNight: 2000,
      availableRooms,
      rating: 0,
      reviews: 0,
      verified: true,
      status: 'Approved',
      listingType,
      commissionRate: 0,
    });
  };

  test('booking create supports idempotency and cancellation restores inventory once', async () => {
    const property = await createApprovedProperty({ totalInventory: 3, availableRooms: 3 });

    const payload = {
      hotelId: String(property._id),
      hotelName: property.businessName,
      location: property.location,
      roomType: 'Deluxe',
      guestName: 'Akhil',
      guestEmail: 'akhil@example.com',
      guestPhone: '9999999999',
      checkInDate: '2026-06-10',
      checkOutDate: '2026-06-12',
      numberOfGuests: 2,
      numberOfRooms: 1,
      pricePerNight: 2000,
      specialRequests: 'Quiet room',
    };

    const first = await request(app)
      .post('/api/hotelbooking/bookings')
      .set('x-idempotency-key', 'hotel-idem-1')
      .send(payload)
      .expect(201);
    const firstBookingId = first.body?.data?.booking?._id;

    const second = await request(app)
      .post('/api/hotelbooking/bookings')
      .set('x-idempotency-key', 'hotel-idem-1')
      .send(payload)
      .expect(201);
    const secondBookingId = second.body?.data?.booking?._id;

    expect(secondBookingId).toBe(firstBookingId);
    expect(await HotelBooking.countDocuments({})).toBe(1);

    let updatedProperty = await HotelProperty.findById(property._id).lean();
    expect(updatedProperty.availableRooms).toBe(2);
    expect(updatedProperty.rooms[0].availableRooms).toBe(2);

    await request(app)
      .post(`/api/hotelbooking/bookings/${firstBookingId}/cancel`)
      .send({ cancellationReason: 'Plan changed' })
      .expect(200);

    await request(app)
      .post(`/api/hotelbooking/bookings/${firstBookingId}/cancel`)
      .send({ cancellationReason: 'Second retry' })
      .expect(200);

    updatedProperty = await HotelProperty.findById(property._id).lean();
    expect(updatedProperty.availableRooms).toBe(3);
    expect(updatedProperty.rooms[0].availableRooms).toBe(3);
  });

  test('partner reject booking restores inventory', async () => {
    const ownerId = '507f1f77bcf86cd799439099';
    const property = await createApprovedProperty({ ownerId, totalInventory: 2, availableRooms: 1 });

    const booking = await HotelBooking.create({
      userId: '507f1f77bcf86cd799439011',
      partnerId: ownerId,
      propertyId: property._id,
      hotelName: property.businessName,
      location: property.location,
      roomType: 'Deluxe',
      guestName: 'Guest',
      guestEmail: 'guest@example.com',
      guestPhone: '9999999999',
      checkInDate: new Date('2026-06-10'),
      checkOutDate: new Date('2026-06-12'),
      numberOfNights: 2,
      numberOfGuests: 2,
      numberOfRooms: 1,
      pricePerNight: 2000,
      totalPrice: 4000,
      gst: 200,
      finalTotal: 4200,
      bookingStatus: 'Pending',
      status: 'pending',
    });

    await request(app)
      .put(`/api/hotelbooking/partner/bookings/${booking._id}/status`)
      .set('x-user-id', ownerId)
      .set('x-user-role', 'user')
      .send({ bookingStatus: 'Rejected', partnerNote: 'No rooms available' })
      .expect(200);

    const refreshedProperty = await HotelProperty.findById(property._id).lean();
    expect(refreshedProperty.availableRooms).toBe(2);
    expect(refreshedProperty.rooms[0].availableRooms).toBe(2);
  });

  test('review requires completed stay and prevents duplicate review per booking', async () => {
    const property = await createApprovedProperty();
    const booking = await HotelBooking.create({
      userId: '507f1f77bcf86cd799439011',
      partnerId: '507f1f77bcf86cd799439099',
      propertyId: property._id,
      hotelName: property.businessName,
      location: property.location,
      roomType: 'Deluxe',
      guestName: 'Guest',
      guestEmail: 'guest@example.com',
      guestPhone: '9999999999',
      checkInDate: new Date('2026-06-10'),
      checkOutDate: new Date('2026-06-12'),
      numberOfNights: 2,
      numberOfGuests: 2,
      numberOfRooms: 1,
      pricePerNight: 2000,
      totalPrice: 4000,
      gst: 200,
      finalTotal: 4200,
      bookingStatus: 'Pending',
      status: 'pending',
    });

    await request(app)
      .post(`/api/hotelbooking/bookings/${booking._id}/review`)
      .send({ rating: 4, comment: 'Nice stay' })
      .expect(409);

    booking.bookingStatus = 'Completed';
    booking.status = 'completed';
    await booking.save();

    await request(app)
      .post(`/api/hotelbooking/bookings/${booking._id}/review`)
      .send({ rating: 5, comment: 'Great stay' })
      .expect(201);

    await request(app)
      .post(`/api/hotelbooking/bookings/${booking._id}/review`)
      .send({ rating: 4, comment: 'Second review should fail' })
      .expect(409);
  });

  test('partner payout request/list/settle flow works for eligible bookings', async () => {
    const ownerId = '507f1f77bcf86cd799439099';
    const property = await createApprovedProperty({ ownerId });
    const bookings = await Promise.all(
      Array.from({ length: 10 }).map((_, idx) =>
        HotelBooking.create({
          userId: '507f1f77bcf86cd799439011',
          partnerId: ownerId,
          propertyId: property._id,
          hotelName: property.businessName,
          location: property.location,
          roomType: 'Deluxe',
          guestName: `Guest ${idx + 1}`,
          guestEmail: `guest${idx + 1}@example.com`,
          guestPhone: `99999999${String(idx).padStart(2, '0')}`,
          checkInDate: new Date('2026-06-10'),
          checkOutDate: new Date('2026-06-12'),
          numberOfNights: 2,
          numberOfGuests: 2,
          numberOfRooms: 1,
          pricePerNight: 2000,
          totalPrice: 4000,
          gst: 200,
          finalTotal: 4200,
          bookingStatus: 'Confirmed',
          status: 'confirmed',
        })
      )
    );

    const requestPayout = await request(app)
      .post('/api/hotelbooking/partner/payouts/request')
      .set('x-user-id', ownerId)
      .send({
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        bookings: 10,
        grossAmount: 42000,
        commission: 4200,
        netAmount: 37800,
        bookingIds: bookings.map((booking) => String(booking._id)),
      })
      .expect(201);

    const payoutId = requestPayout.body?.data?._id;

    const list = await request(app)
      .get(`/api/hotelbooking/partner/payouts/${ownerId}`)
      .set('x-user-id', ownerId)
      .expect(200);
    expect(Array.isArray(list.body.data)).toBe(true);
    expect(list.body.data.length).toBe(1);

    const settle = await request(app)
      .post(`/api/hotelbooking/partner/payouts/${payoutId}/settle`)
      .set('x-user-id', '507f1f77bcf86cd799439001')
      .set('x-user-role', 'admin')
      .expect(200);
    expect(settle.body.data.status).toBe('paid');
  });

  test('partner payout request rejects when fewer than 10 eligible bookings are provided', async () => {
    const ownerId = '507f1f77bcf86cd799439099';
    const property = await createApprovedProperty({ ownerId });
    const booking = await HotelBooking.create({
      userId: '507f1f77bcf86cd799439011',
      partnerId: ownerId,
      propertyId: property._id,
      hotelName: property.businessName,
      location: property.location,
      roomType: 'Deluxe',
      guestName: 'Guest',
      guestEmail: 'guest@example.com',
      guestPhone: '9999999999',
      checkInDate: new Date('2026-06-10'),
      checkOutDate: new Date('2026-06-12'),
      numberOfNights: 2,
      numberOfGuests: 2,
      numberOfRooms: 1,
      pricePerNight: 2000,
      totalPrice: 4000,
      gst: 200,
      finalTotal: 4200,
      bookingStatus: 'Confirmed',
      status: 'confirmed',
    });

    const response = await request(app)
      .post('/api/hotelbooking/partner/payouts/request')
      .set('x-user-id', ownerId)
      .send({
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        bookings: 1,
        grossAmount: 4200,
        commission: 420,
        netAmount: 3780,
        bookingIds: [String(booking._id)],
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(String(response.body.message || '').toLowerCase()).toContain('at least 10');
  });

  test('admin stats use commission settings and listing tier rates', async () => {
    const ownerId = '507f1f77bcf86cd799439099';
    const property = await createApprovedProperty({
      ownerId,
      listingType: 'premium',
      totalInventory: 4,
      availableRooms: 4,
    });

    await HotelCommissionSetting.create({
      key: 'hotelbooking.default',
      defaultRate: 10,
      basicRate: 8,
      featuredRate: 12,
      premiumRate: 20,
    });

    await HotelBooking.create({
      userId: '507f1f77bcf86cd799439011',
      partnerId: ownerId,
      propertyId: property._id,
      hotelName: property.businessName,
      location: property.location,
      roomType: 'Deluxe',
      guestName: 'Guest',
      guestEmail: 'guest@example.com',
      guestPhone: '9999999999',
      checkInDate: new Date('2026-06-10'),
      checkOutDate: new Date('2026-06-12'),
      numberOfNights: 2,
      numberOfGuests: 2,
      numberOfRooms: 1,
      pricePerNight: 2000,
      totalPrice: 4000,
      gst: 200,
      finalTotal: 1000,
      bookingStatus: 'Completed',
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const stats = await request(app)
      .get('/api/hotelbooking/admin/stats')
      .set('x-user-role', 'admin')
      .set('x-user-id', '507f1f77bcf86cd799439001')
      .expect(200);

    expect(stats.body.success).toBe(true);
    expect(stats.body.data.commissionEarned).toBe(200);
  });

  test('inventory calendar computes date-wise availability from overlapping bookings', async () => {
    const property = await createApprovedProperty({ totalInventory: 3, availableRooms: 3 });
    await HotelBooking.create({
      userId: '507f1f77bcf86cd799439011',
      partnerId: '507f1f77bcf86cd799439099',
      propertyId: property._id,
      hotelName: property.businessName,
      location: property.location,
      roomType: 'Deluxe',
      guestName: 'Guest',
      guestEmail: 'guest@example.com',
      guestPhone: '9999999999',
      checkInDate: new Date('2026-06-10'),
      checkOutDate: new Date('2026-06-12'),
      numberOfNights: 2,
      numberOfGuests: 2,
      numberOfRooms: 2,
      pricePerNight: 2000,
      totalPrice: 4000,
      gst: 200,
      finalTotal: 4200,
      bookingStatus: 'Confirmed',
      status: 'confirmed',
    });

    const calendar = await request(app)
      .get(`/api/hotelbooking/hotels/${property._id}/inventory-calendar?startDate=2026-06-09&endDate=2026-06-13`)
      .expect(200);

    const room = calendar.body?.data?.rooms?.[0];
    expect(room.roomType).toBe('Deluxe');
    const day = room.days.find((item) => item.date === '2026-06-10');
    expect(day.bookedRooms).toBe(2);
    expect(day.availableRooms).toBe(1);
  });
});
