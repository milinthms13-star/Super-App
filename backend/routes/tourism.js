const express = require('express');
const { createId, readTourismData, updateTourismData } = require('../utils/tourismStore');

const router = express.Router();

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

const buildBookingTotals = (baseAmount, paymentType, couponCode, coupons) => {
  const normalizedPaymentType = paymentType === 'full' ? 'full' : 'advance';
  const appliedCoupon = (Array.isArray(coupons) ? coupons : []).find(
    (coupon) => String(coupon.code || '').toUpperCase() === String(couponCode || '').toUpperCase()
  );
  const discountAmount =
    appliedCoupon && baseAmount >= toNumber(appliedCoupon.minAmount, 0)
      ? Math.round((baseAmount * toNumber(appliedCoupon.discountPercent, 0)) / 100)
      : 0;
  const chargeableAmount = Math.max(0, baseAmount - discountAmount);
  const payableAmount = normalizedPaymentType === 'full' ? chargeableAmount : Math.round(chargeableAmount * 0.3);
  return {
    paymentType: normalizedPaymentType,
    discountAmount,
    chargeableAmount,
    payableAmount,
    couponCode: appliedCoupon ? appliedCoupon.code : '',
  };
};

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

  const totals = buildBookingTotals(toNumber(selectedPackage.startPrice, 0), paymentType, couponCode, data.coupons);
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
      ...totals,
      gstAndServiceCharge: selectedPackage.gstAndServiceCharge || '',
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
  const status = toNormalizedText(req.body?.status).toLowerCase();
  if (!BOOKING_STATUSES.has(status)) {
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
