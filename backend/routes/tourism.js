const express = require('express');
const { createId, readTourismData, updateTourismData } = require('../utils/tourismStore');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const { authenticate, hasAdminPrivileges } = authMiddleware;

const BOOKING_STATUSES = new Set(['pending', 'confirmed', 'paid', 'cancelled']);
const LEAD_STATUSES = new Set(['new', 'contacted', 'proposal_shared', 'negotiation', 'confirmed', 'lost']);
const APPROVAL_STATUSES = new Set(['pending', 'approved', 'rejected']);
const KYC_STATUSES = new Set(['pending', 'verified', 'rejected']);

const toNormalizedText = (value = '') => String(value || '').trim();
const toNormalizedEmail = (value = '') => String(value || '').trim().toLowerCase();
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const DESTINATION_PLANNER_LIBRARY = {
  Munnar: {
    attractions: ['Top Station', 'Mattupetty Dam', 'Tea Museum', 'Echo Point'],
    food: ['Kerala meals', 'Cardamom tea', 'Malabar snacks'],
    stays: ['Tea estate stay', '4-star hill resort', 'Nature homestay'],
  },
  Alleppey: {
    attractions: ['Punnamada Lake', 'Kuttanad canals', 'Village boat route', 'Beach sunset'],
    food: ['Houseboat seafood', 'Karimeen dishes', 'Traditional sadya'],
    stays: ['Premium houseboat', 'Backwater resort', 'Family homestay'],
  },
  Wayanad: {
    attractions: ['Edakkal Caves', 'Banasura Dam', 'Pookode Lake', 'Soochipara Falls'],
    food: ['Malabar biryani', 'Spice tea', 'Tribal food tasting'],
    stays: ['Jungle resort', 'Coffee estate stay', 'Budget cottage'],
  },
  Kovalam: {
    attractions: ['Lighthouse Beach', 'Hawa Beach', 'Vizhinjam harbor', 'Coastal viewpoints'],
    food: ['Beachside seafood', 'Fish curry meals', 'Fresh juices'],
    stays: ['Beach resort', 'Sea-view hotel', 'Budget stay'],
  },
};

const buildPlannerResponse = (payload = {}) => {
  const destination = toNormalizedText(payload.destination || 'Munnar');
  const travelerType = toNormalizedText(payload.travelerType || 'Family');
  const days = Math.min(10, Math.max(1, toNumber(payload.days, 3)));
  const budget = Math.max(0, toNumber(payload.budget, 0));
  const library = DESTINATION_PLANNER_LIBRARY[destination] || DESTINATION_PLANNER_LIBRARY.Munnar;

  const dayPlan = Array.from({ length: days }).map((_, index) => {
    const attraction = library.attractions[index % library.attractions.length];
    const food = library.food[index % library.food.length];
    const stay = library.stays[index % library.stays.length];
    return {
      day: index + 1,
      summary: `${attraction} with ${food}`,
      details: [
        `Morning: ${attraction}`,
        `Afternoon: Local food and nearby exploration`,
        `Evening: Rest at ${stay}`,
      ],
    };
  });

  const perDayBudget = days > 0 ? Math.round(budget / days) : 0;

  return {
    destination,
    travelerType,
    days,
    confidence: destination ? 92 : 75,
    budgetSummary: {
      totalBudget: budget,
      perDayBudget,
      recommendation:
        budget > 0
          ? `Allocate around INR ${perDayBudget.toLocaleString('en-IN')} per day including local commute and meals.`
          : 'Set a budget for tighter recommendations.',
    },
    nearby: library,
    dayPlan,
  };
};

const EXTERNAL_BOOKING_STATUS_TO_INTERNAL = {
  'new enquiry': 'pending',
  contacted: 'pending',
  'payment pending': 'pending',
  confirmed: 'confirmed',
  completed: 'paid',
  cancelled: 'cancelled',
};

const INTERNAL_BOOKING_STATUS_TO_EXTERNAL = {
  pending: 'New Enquiry',
  confirmed: 'Confirmed',
  paid: 'Completed',
  cancelled: 'Cancelled',
};

const normalizePhoneDigits = (value = '') => String(value || '').replace(/\D/g, '');

const mapIncomingBookingStatus = (status = '') => {
  const normalized = String(status || '').trim().toLowerCase();
  if (BOOKING_STATUSES.has(normalized)) return normalized;
  return EXTERNAL_BOOKING_STATUS_TO_INTERNAL[normalized] || '';
};

const toTourismBookingView = (booking = {}) => {
  const guests = Number(booking.travelerCount || booking.guests || 1);
  const baseAmount = Number(
    booking.amountSummary?.baseAmount ||
      booking.totalAmount ||
      booking.estimatedBudget ||
      0
  );
  const payableAmount = Number(
    booking.amountSummary?.payableAmount ||
      booking.totalAmount ||
      0
  );
  const status = String(booking.bookingStatus || 'pending').toLowerCase();

  return {
    ...booking,
    packageTitle: booking.packageTitle || booking.title || 'Tour package',
    destination: booking.destination || '',
    name: booking.customerName || booking.travelerName || '',
    phone: booking.customerPhone || booking.travelerPhone || '',
    travelDate: booking.travelDate || booking.startDate || '',
    guests,
    pickup: booking.pickupCity || booking.pickup || '',
    totalAmount: baseAmount || payableAmount,
    status: INTERNAL_BOOKING_STATUS_TO_EXTERNAL[status] || 'New Enquiry',
  };
};

const buildBookingTotals = (baseAmount, travelerCount, paymentType, couponCode, coupons) => {
  const normalizedPaymentType = paymentType === 'full' ? 'full' : 'advance';
  const quantity = Math.max(1, Number(travelerCount || 1));
  const totalBase = Math.max(0, Number(baseAmount || 0)) * quantity;
  const appliedCoupon = (Array.isArray(coupons) ? coupons : []).find(
    (coupon) => String(coupon.code || '').toUpperCase() === String(couponCode || '').toUpperCase()
  );
  const discountAmount =
    appliedCoupon && totalBase >= toNumber(appliedCoupon.minAmount, 0)
      ? Math.round((totalBase * toNumber(appliedCoupon.discountPercent, 0)) / 100)
      : 0;
  const chargeableAmount = Math.max(0, totalBase - discountAmount);
  const payableAmount = normalizedPaymentType === 'full' ? chargeableAmount : Math.round(chargeableAmount * 0.3);

  return {
    paymentType: normalizedPaymentType,
    travelerCount: quantity,
    totalAmount: totalBase,
    discountAmount,
    chargeableAmount,
    payableAmount,
    couponCode: appliedCoupon ? appliedCoupon.code : '',
  };
};

router.post('/custom-requests', async (req, res) => {
  const payload = req.body || {};
  const travelerName = toNormalizedText(payload.travelerName);
  const phone = toNormalizedText(payload.phone).replace(/\D/g, '');
  const destination = toNormalizedText(payload.destination);

  if (!travelerName || phone.length < 10 || !destination) {
    return res.status(400).json({
      success: false,
      message: 'travelerName, phone, and destination are required.',
    });
  }

  const now = new Date().toISOString();
  const lead = {
    id: createId('lead'),
    packageId: '',
    packageTitle: 'Custom request',
    vendorId: toNormalizedText(payload.vendorId || ''),
    travelerName,
    travelerPhone: phone,
    travelerType: toNormalizedText(payload.travelerType || 'Family'),
    destination,
    pickupCity: toNormalizedText(payload.pickupCity),
    hotelCategory: toNormalizedText(payload.hotelCategory),
    startDate: toNormalizedText(payload.startDate),
    days: Math.max(1, toNumber(payload.days, 3)),
    budget: Math.max(0, toNumber(payload.estimatedBudget, 0)),
    estimatedBudget: Math.max(0, toNumber(payload.estimatedBudget, 0)),
    status: 'new',
    source: 'custom_request',
    note: toNormalizedText(payload.preferences || ''),
    priority: toNumber(payload.estimatedBudget, 0) >= 50000 ? 'hot' : 'normal',
    createdAt: now,
    updatedAt: now,
  };

  await updateTourismData((current) => ({
    ...current,
    leads: [lead, ...(Array.isArray(current.leads) ? current.leads : [])],
  }));

  return res.status(201).json({ success: true, data: { lead } });
});

router.post('/payments/intent', async (req, res) => {
  const bookingId = toNormalizedText(req.body?.bookingId);
  const amount = toNumber(req.body?.amount, 0);
  const paymentType = toNormalizedText(req.body?.paymentType || 'advance').toLowerCase();

  if (!bookingId || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Valid bookingId and amount are required.',
    });
  }

  const now = new Date().toISOString();
  const paymentIntent = {
    id: createId('pay'),
    bookingId,
    provider: 'manual_or_gateway_pending',
    orderId: `TOUR-PAY-${Date.now()}`,
    amount,
    paymentType: paymentType === 'full' ? 'full' : 'advance',
    status: 'created',
    createdAt: now,
    updatedAt: now,
  };

  await updateTourismData((current) => {
    const nextPayments = [paymentIntent, ...(Array.isArray(current.payments) ? current.payments : [])];
    const nextBookings = (Array.isArray(current.bookings) ? current.bookings : []).map((booking) => {
      if (String(booking.id) !== bookingId) return booking;
      return {
        ...booking,
        paymentDetails: {
          ...booking.paymentDetails,
          status: 'pending',
          paymentIntentId: paymentIntent.id,
          payableAmount: amount,
          paymentType: paymentIntent.paymentType,
        },
        updatedAt: now,
      };
    });
    return { ...current, payments: nextPayments, bookings: nextBookings };
  });

  return res.json({
    success: true,
    data: paymentIntent,
  });
});

router.post('/payments/confirm', async (req, res) => {
  const bookingId = toNormalizedText(req.body?.bookingId);
  const reference = toNormalizedText(req.body?.reference || `PAY-${Date.now()}`);
  const amount = toNumber(req.body?.amount, 0);
  if (!bookingId || amount <= 0) {
    return res.status(400).json({ success: false, message: 'bookingId and amount are required.' });
  }

  let updatedBooking = null;
  const payment = {
    id: createId('pay'),
    bookingId,
    provider: 'manual_payment',
    reference,
    amount,
    status: 'paid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await updateTourismData((current) => {
    const nextPayments = [payment, ...(Array.isArray(current.payments) ? current.payments : [])];
    const nextBookings = (Array.isArray(current.bookings) ? current.bookings : []).map((booking) => {
      if (String(booking.id) !== bookingId) return booking;
      updatedBooking = {
        ...booking,
        bookingStatus: 'paid',
        paymentDetails: {
          ...booking.paymentDetails,
          status: 'paid',
          paidAmount: amount,
          reference,
        },
        updatedAt: new Date().toISOString(),
      };
      return updatedBooking;
    });
    return { ...current, payments: nextPayments, bookings: nextBookings };
  });

  if (!updatedBooking) {
    return res.status(404).json({ success: false, message: 'Booking not found.' });
  }

  return res.json({ success: true, data: { payment, booking: updatedBooking } });
});

router.post('/planner/itinerary', (req, res) => {
  try {
    const itinerary = buildPlannerResponse(req.body || {});
    return res.json({
      success: true,
      data: itinerary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to generate itinerary right now.',
    });
  }
});

router.post('/packages/:packageId/report', async (req, res) => {
  const packageId = toNormalizedText(req.params.packageId);
  const reason = toNormalizedText(req.body?.reason || 'Package issue reported');
  const contact = toNormalizedText(req.body?.contact || '');

  if (!packageId) {
    return res.status(400).json({
      success: false,
      message: 'packageId is required.',
    });
  }

  const now = new Date().toISOString();
  const complaint = {
    id: createId('cmp'),
    bookingId: '',
    packageId,
    vendorId: '',
    issue: reason,
    contact,
    status: 'open',
    escalationTimeline: [{ at: now, event: 'Complaint opened' }],
    createdAt: now,
    updatedAt: now,
  };

  await updateTourismData((current) => ({
    ...current,
    complaints: [complaint, ...(Array.isArray(current.complaints) ? current.complaints : [])],
  }));

  return res.status(201).json({ success: true, data: { complaint } });
});

router.get('/bootstrap', async (req, res) => {
  const data = await readTourismData();
  const email = toNormalizedEmail(req.query.email);
  const vendorId = toNormalizedText(req.query.vendorId);

  return res.json({
    success: true,
    data: {
      packages: data.packages,
      reviews: data.reviews,
      coupons: data.coupons,
      vendors: data.vendors,
      complaints: data.complaints,
      bookings: email
        ? data.bookings.filter((booking) => booking.customerEmail === email)
        : data.bookings,
      leads: vendorId ? data.leads.filter((lead) => lead.vendorId === vendorId) : data.leads,
    },
  });
});

router.get('/bookings', async (req, res) => {
  const data = await readTourismData();
  const email = toNormalizedEmail(req.query.email);
  const phone = toNormalizedText(req.query.phone);
  const bookings = data.bookings.filter((booking) => {
    if (email && booking.customerEmail !== email) {
      return false;
    }
    if (phone && booking.customerPhone !== phone) {
      return false;
    }
    return true;
  });
  return res.json({ success: true, data: { bookings } });
});

router.get('/bookings/my', authenticate, async (req, res) => {
  try {
    const data = await readTourismData();
    const userEmail = toNormalizedEmail(req.user?.email || '');
    const userPhoneDigits = normalizePhoneDigits(req.user?.phone || '');

    const bookings = data.bookings.filter((booking) => {
      const bookingEmail = toNormalizedEmail(booking.customerEmail || '');
      const bookingPhoneDigits = normalizePhoneDigits(booking.customerPhone || '');
      if (userEmail && bookingEmail && bookingEmail === userEmail) return true;
      if (userPhoneDigits && bookingPhoneDigits && bookingPhoneDigits.endsWith(userPhoneDigits.slice(-10))) return true;
      return false;
    });

    return res.json({
      success: true,
      data: bookings.map(toTourismBookingView),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to load your tourism bookings.',
    });
  }
});

router.post('/bookings', async (req, res) => {
  const payload = req.body || {};
  const packageId = toNormalizedText(payload.packageId);
  const customerName = toNormalizedText(payload.customerName);
  const customerEmail = toNormalizedEmail(payload.customerEmail);
  const customerPhone = toNormalizedText(payload.customerPhone);
  const travelerCount = toNumber(payload.travelerCount, 1);
  const pickupCity = toNormalizedText(payload.pickupCity);
  const hotelCategory = toNormalizedText(payload.hotelCategory);
  const travelDate = toNormalizedText(payload.travelDate);
  const bookingNote = toNormalizedText(payload.bookingNote);
  const paymentType = toNormalizedText(payload.paymentType || 'advance').toLowerCase();
  const couponCode = toNormalizedText(payload.couponCode);

  if (!packageId || !customerName || !customerEmail || !customerPhone || !travelDate || !pickupCity || !hotelCategory) {
    return res.status(400).json({
      success: false,
      message: 'packageId, customerName, customerEmail, customerPhone, travelDate, pickupCity, and hotelCategory are required.',
    });
  }

  if (!/^\S+@\S+\.\S+$/.test(customerEmail)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address.',
    });
  }

  const data = await readTourismData();
  const selectedPackage = data.packages.find((pkg) => String(pkg.id) === packageId);
  if (!selectedPackage) {
    return res.status(404).json({
      success: false,
      message: 'Package not found.',
    });
  }

  const totals = buildBookingTotals(
    toNumber(selectedPackage.startPrice, 0),
    travelerCount,
    paymentType,
    couponCode,
    data.coupons
  );
  const now = new Date().toISOString();
  const booking = {
    id: createId('bk'),
    packageId: selectedPackage.id,
    packageTitle: selectedPackage.title,
    vendorId: selectedPackage.vendorId,
    vendorName: selectedPackage.vendor,
    travelerCount: Math.max(1, travelerCount),
    customerName,
    customerEmail,
    customerPhone,
    pickupCity,
    hotelCategory,
    travelDate,
    bookingNote,
    bookingStatus: 'pending',
    amountSummary: {
      baseAmount: toNumber(selectedPackage.startPrice, 0),
      travelerCount: totals.travelerCount,
      totalAmount: totals.totalAmount,
      discountAmount: totals.discountAmount,
      chargeableAmount: totals.chargeableAmount,
      payableAmount: totals.payableAmount,
      paymentType: totals.paymentType,
      couponCode: totals.couponCode,
      gstAndServiceCharge: selectedPackage.gstAndServiceCharge || '',
    },
    paymentDetails: {
      paymentType: totals.paymentType,
      payableAmount: totals.payableAmount,
      discountAmount: totals.discountAmount,
      status: 'pending',
      currency: 'INR',
    },
    refundRules:
      selectedPackage.cancellationPolicy ||
      'Cancellation timelines apply as per package policy. Refunds are processed within 7 working days.',
    createdAt: now,
    updatedAt: now,
  };

  await updateTourismData((current) => ({
    ...current,
    bookings: [booking, ...(Array.isArray(current.bookings) ? current.bookings : [])],
    leads: [
      {
        id: createId('lead'),
        packageId: selectedPackage.id,
        vendorId: selectedPackage.vendorId,
        travelerName: customerName,
        travelerPhone: customerPhone,
        budget: toNumber(selectedPackage.startPrice, 0),
        status: 'new',
        note: bookingNote || 'Booking enquiry created from marketplace flow.',
        createdAt: now,
        updatedAt: now,
      },
      ...(Array.isArray(current.leads) ? current.leads : []),
    ],
  }));

  return res.status(201).json({
    success: true,
    data: { booking },
  });
});

router.patch('/bookings/:bookingId/status', async (req, res) => {
  const status = mapIncomingBookingStatus(req.body?.status);
  if (!status || !BOOKING_STATUSES.has(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Allowed: pending, confirmed, paid, cancelled.',
    });
  }

  let updatedBooking = null;
  await updateTourismData((current) => {
    const nextBookings = (Array.isArray(current.bookings) ? current.bookings : []).map((booking) => {
      if (String(booking.id) !== String(req.params.bookingId)) {
        return booking;
      }
      updatedBooking = {
        ...booking,
        bookingStatus: status,
        updatedAt: new Date().toISOString(),
      };
      return updatedBooking;
    });
    return { ...current, bookings: nextBookings };
  });

  if (!updatedBooking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found.',
    });
  }

  return res.json({
    success: true,
    data: { booking: updatedBooking },
  });
});

router.get('/admin/bookings', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.',
      });
    }

    const data = await readTourismData();
    const search = toNormalizedText(req.query.search || '').toLowerCase();
    const requestedStatus = mapIncomingBookingStatus(req.query.status);

    let bookings = Array.isArray(data.bookings) ? data.bookings : [];
    if (requestedStatus) {
      bookings = bookings.filter((booking) => String(booking.bookingStatus || '').toLowerCase() === requestedStatus);
    }
    if (search) {
      bookings = bookings.filter((booking) => {
        const haystack = [
          booking.packageTitle,
          booking.destination,
          booking.customerName,
          booking.customerPhone,
          booking.customerEmail,
          booking.pickupCity,
        ]
          .map((value) => String(value || '').toLowerCase())
          .join(' ');
        return haystack.includes(search);
      });
    }

    return res.json({
      success: true,
      data: bookings.map(toTourismBookingView),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to load admin tourism bookings.',
    });
  }
});

router.put('/admin/bookings/:bookingId/status', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.',
      });
    }

    const status = mapIncomingBookingStatus(req.body?.status);
    if (!status || !BOOKING_STATUSES.has(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed: New Enquiry, Contacted, Payment Pending, Confirmed, Completed, Cancelled.',
      });
    }

    const vendorId = toNormalizedText(req.body?.vendorId || '');
    const adminNote = toNormalizedText(req.body?.adminNote || '');

    let updatedBooking = null;
    await updateTourismData((current) => {
      const nextBookings = (Array.isArray(current.bookings) ? current.bookings : []).map((booking) => {
        if (String(booking.id) !== String(req.params.bookingId)) {
          return booking;
        }
        updatedBooking = {
          ...booking,
          bookingStatus: status,
          vendorId: vendorId || booking.vendorId || '',
          adminNote: adminNote || booking.adminNote || '',
          updatedAt: new Date().toISOString(),
        };
        return updatedBooking;
      });
      return { ...current, bookings: nextBookings };
    });

    if (!updatedBooking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    return res.json({
      success: true,
      data: toTourismBookingView(updatedBooking),
      message: 'Booking status updated',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to update booking status.',
    });
  }
});

router.post('/reviews', async (req, res) => {
  const packageId = toNormalizedText(req.body?.packageId);
  const reviewerName = toNormalizedText(req.body?.reviewerName);
  const comment = toNormalizedText(req.body?.comment);
  const rating = Math.min(5, Math.max(1, toNumber(req.body?.rating, 5)));

  if (!packageId || !reviewerName || !comment) {
    return res.status(400).json({
      success: false,
      message: 'packageId, reviewerName, and comment are required.',
    });
  }

  const review = {
    id: createId('review'),
    packageId,
    reviewerName,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  };

  await updateTourismData((current) => {
    const nextReviews = [review, ...(Array.isArray(current.reviews) ? current.reviews : [])];
    const nextPackages = (Array.isArray(current.packages) ? current.packages : []).map((pkg) => {
      if (String(pkg.id) !== packageId) {
        return pkg;
      }
      const packageReviews = nextReviews.filter((item) => String(item.packageId) === packageId);
      const avgRating =
        packageReviews.length > 0
          ? packageReviews.reduce((sum, item) => sum + toNumber(item.rating, 0), 0) / packageReviews.length
          : toNumber(pkg.rating, 0);
      return {
        ...pkg,
        rating: Number(avgRating.toFixed(1)),
        reviewsCount: packageReviews.length,
        updatedAt: new Date().toISOString(),
      };
    });
    return {
      ...current,
      reviews: nextReviews,
      packages: nextPackages,
    };
  });

  return res.status(201).json({
    success: true,
    data: { review },
  });
});

router.get('/vendor/packages', async (req, res) => {
  const vendorId = toNormalizedText(req.query.vendorId);
  if (!vendorId) {
    return res.status(400).json({
      success: false,
      message: 'vendorId query is required.',
    });
  }
  const data = await readTourismData();
  return res.json({
    success: true,
    data: {
      packages: data.packages.filter((pkg) => String(pkg.vendorId) === vendorId),
    },
  });
});

router.post('/vendor/packages', async (req, res) => {
  const payload = req.body || {};
  const vendorId = toNormalizedText(payload.vendorId);
  const title = toNormalizedText(payload.title);
  const destination = toNormalizedText(payload.destination);
  if (!vendorId || !title || !destination) {
    return res.status(400).json({
      success: false,
      message: 'vendorId, title, and destination are required.',
    });
  }

  const data = await readTourismData();
  const vendor = data.vendors.find((item) => String(item.id) === vendorId);
  if (!vendor) {
    return res.status(404).json({
      success: false,
      message: 'Vendor not found.',
    });
  }

  const now = new Date().toISOString();
  const packageRecord = {
    id: createId('pkg'),
    title,
    destination,
    category: toNormalizedText(payload.category || 'Nature'),
    travelerType: toNormalizedText(payload.travelerType || 'Family'),
    durationDays: Math.max(1, toNumber(payload.durationDays, 2)),
    startPrice: Math.max(1000, toNumber(payload.startPrice, 10000)),
    rating: 0,
    reviewsCount: 0,
    pickupCities: Array.isArray(payload.pickupCities) ? payload.pickupCities : [],
    hotelCategory: toNormalizedText(payload.hotelCategory || '3-star'),
    vendorId,
    vendor: vendor.name,
    vendorVerified: Boolean(vendor.verificationBadge),
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    inclusions: Array.isArray(payload.inclusions) ? payload.inclusions : [],
    exclusions: Array.isArray(payload.exclusions) ? payload.exclusions : [],
    cancellationPolicy: toNormalizedText(payload.cancellationPolicy),
    childPricing: toNormalizedText(payload.childPricing),
    gstAndServiceCharge: toNormalizedText(payload.gstAndServiceCharge),
    availableDates: Array.isArray(payload.availableDates) ? payload.availableDates : [],
    mapHighlights: toNormalizedText(payload.mapHighlights),
    itinerary: Array.isArray(payload.itinerary) ? payload.itinerary : [],
    imageGallery: Array.isArray(payload.imageGallery) ? payload.imageGallery : [],
    seasonalPricing: Array.isArray(payload.seasonalPricing) ? payload.seasonalPricing : [],
    approvalStatus: 'pending',
    commissionPercent: toNumber(payload.commissionPercent, 8),
    fraudRisk: toNormalizedText(payload.fraudRisk || 'low'),
    kycStatus: vendor.kycStatus || 'pending',
    createdAt: now,
    updatedAt: now,
  };

  await updateTourismData((current) => ({
    ...current,
    packages: [packageRecord, ...(Array.isArray(current.packages) ? current.packages : [])],
  }));

  return res.status(201).json({
    success: true,
    data: { package: packageRecord },
  });
});

router.patch('/vendor/packages/:packageId', async (req, res) => {
  const payload = req.body || {};
  const vendorId = toNormalizedText(payload.vendorId);
  if (!vendorId) {
    return res.status(400).json({
      success: false,
      message: 'vendorId is required.',
    });
  }

  let updatedPackage = null;
  await updateTourismData((current) => {
    const nextPackages = (Array.isArray(current.packages) ? current.packages : []).map((pkg) => {
      if (String(pkg.id) !== String(req.params.packageId)) {
        return pkg;
      }
      if (String(pkg.vendorId) !== vendorId) {
        return pkg;
      }
      updatedPackage = {
        ...pkg,
        ...payload,
        id: pkg.id,
        vendorId: pkg.vendorId,
        vendor: pkg.vendor,
        approvalStatus: pkg.approvalStatus === 'approved' ? 'approved' : 'pending',
        updatedAt: new Date().toISOString(),
      };
      return updatedPackage;
    });
    return { ...current, packages: nextPackages };
  });

  if (!updatedPackage) {
    return res.status(404).json({
      success: false,
      message: 'Package not found or vendor mismatch.',
    });
  }

  return res.json({
    success: true,
    data: { package: updatedPackage },
  });
});

router.delete('/vendor/packages/:packageId', async (req, res) => {
  const vendorId = toNormalizedText(req.query.vendorId || req.body?.vendorId);
  if (!vendorId) {
    return res.status(400).json({
      success: false,
      message: 'vendorId is required.',
    });
  }

  let deleted = false;
  await updateTourismData((current) => {
    const nextPackages = (Array.isArray(current.packages) ? current.packages : []).filter((pkg) => {
      if (String(pkg.id) === String(req.params.packageId) && String(pkg.vendorId) === vendorId) {
        deleted = true;
        return false;
      }
      return true;
    });
    return { ...current, packages: nextPackages };
  });

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: 'Package not found or vendor mismatch.',
    });
  }

  return res.json({
    success: true,
    message: 'Package deleted successfully.',
  });
});

router.get('/vendor/leads', async (req, res) => {
  const vendorId = toNormalizedText(req.query.vendorId);
  if (!vendorId) {
    return res.status(400).json({
      success: false,
      message: 'vendorId query is required.',
    });
  }

  const data = await readTourismData();
  return res.json({
    success: true,
    data: { leads: data.leads.filter((lead) => String(lead.vendorId) === vendorId) },
  });
});

router.patch('/vendor/leads/:leadId', async (req, res) => {
  const vendorId = toNormalizedText(req.body?.vendorId);
  const status = toNormalizedText(req.body?.status).toLowerCase();
  if (!vendorId || !LEAD_STATUSES.has(status)) {
    return res.status(400).json({
      success: false,
      message: 'vendorId and a valid lead status are required.',
    });
  }

  let updatedLead = null;
  await updateTourismData((current) => {
    const nextLeads = (Array.isArray(current.leads) ? current.leads : []).map((lead) => {
      if (String(lead.id) !== String(req.params.leadId)) {
        return lead;
      }
      if (String(lead.vendorId) !== vendorId) {
        return lead;
      }
      updatedLead = {
        ...lead,
        status,
        updatedAt: new Date().toISOString(),
      };
      return updatedLead;
    });
    return { ...current, leads: nextLeads };
  });

  if (!updatedLead) {
    return res.status(404).json({
      success: false,
      message: 'Lead not found or vendor mismatch.',
    });
  }

  return res.json({
    success: true,
    data: { lead: updatedLead },
  });
});

router.get('/admin/queues', async (req, res) => {
  const data = await readTourismData();
  const packageApprovalQueue = data.packages.filter((pkg) => pkg.approvalStatus !== 'approved');
  const vendorApprovalQueue = data.vendors.filter((vendor) => vendor.approvalStatus !== 'approved');
  const kycQueue = data.vendors.filter((vendor) => vendor.kycStatus !== 'verified');
  const riskFlags = data.packages.filter((pkg) => String(pkg.fraudRisk || '').toLowerCase() !== 'low');
  const refundApprovalQueue = data.bookings.filter((booking) => booking.bookingStatus === 'cancelled');
  const complaints = data.complaints;

  return res.json({
    success: true,
    data: {
      packageApprovalQueue,
      vendorApprovalQueue,
      kycQueue,
      riskFlags,
      refundApprovalQueue,
      complaints,
      featuredPackages: data.packages.filter((pkg) => pkg.approvalStatus === 'approved').slice(0, 6),
    },
  });
});

router.patch('/admin/vendors/:vendorId', async (req, res) => {
  const approvalStatus = toNormalizedText(req.body?.approvalStatus).toLowerCase();
  const kycStatus = toNormalizedText(req.body?.kycStatus).toLowerCase();
  const riskFlag = toNormalizedText(req.body?.riskFlag).toLowerCase();

  if (!APPROVAL_STATUSES.has(approvalStatus) || !KYC_STATUSES.has(kycStatus)) {
    return res.status(400).json({
      success: false,
      message: 'approvalStatus and kycStatus must be valid values.',
    });
  }

  let updatedVendor = null;
  await updateTourismData((current) => {
    const nextVendors = (Array.isArray(current.vendors) ? current.vendors : []).map((vendor) => {
      if (String(vendor.id) !== String(req.params.vendorId)) {
        return vendor;
      }
      updatedVendor = {
        ...vendor,
        approvalStatus,
        kycStatus,
        riskFlag: riskFlag || vendor.riskFlag || 'low',
        verificationBadge: approvalStatus === 'approved' && kycStatus === 'verified',
      };
      return updatedVendor;
    });

    const nextPackages = (Array.isArray(current.packages) ? current.packages : []).map((pkg) =>
      String(pkg.vendorId) === String(req.params.vendorId)
        ? {
            ...pkg,
            vendorVerified:
              updatedVendor?.approvalStatus === 'approved' && updatedVendor?.kycStatus === 'verified',
            kycStatus: updatedVendor?.kycStatus || pkg.kycStatus,
          }
        : pkg
    );

    return {
      ...current,
      vendors: nextVendors,
      packages: nextPackages,
    };
  });

  if (!updatedVendor) {
    return res.status(404).json({
      success: false,
      message: 'Vendor not found.',
    });
  }

  return res.json({
    success: true,
    data: { vendor: updatedVendor },
  });
});

router.patch('/admin/packages/:packageId', async (req, res) => {
  const approvalStatus = toNormalizedText(req.body?.approvalStatus).toLowerCase();
  const fraudRisk = toNormalizedText(req.body?.fraudRisk).toLowerCase();
  if (!APPROVAL_STATUSES.has(approvalStatus)) {
    return res.status(400).json({
      success: false,
      message: 'approvalStatus must be pending, approved, or rejected.',
    });
  }

  let updatedPackage = null;
  await updateTourismData((current) => {
    const nextPackages = (Array.isArray(current.packages) ? current.packages : []).map((pkg) => {
      if (String(pkg.id) !== String(req.params.packageId)) {
        return pkg;
      }
      updatedPackage = {
        ...pkg,
        approvalStatus,
        fraudRisk: fraudRisk || pkg.fraudRisk || 'low',
        updatedAt: new Date().toISOString(),
      };
      return updatedPackage;
    });
    return { ...current, packages: nextPackages };
  });

  if (!updatedPackage) {
    return res.status(404).json({
      success: false,
      message: 'Package not found.',
    });
  }

  return res.json({
    success: true,
    data: { package: updatedPackage },
  });
});

module.exports = router;
