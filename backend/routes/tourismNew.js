const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const tourismAuth = require('../middleware/tourismAuth');
const tourismImageUpload = require('../middleware/tourismImageUpload');
const TourismPackage = require('../models/TourismPackage');
const TourismVendor = require('../models/TourismVendor');
const TourismBooking = require('../models/TourismBooking');
const TourismReview = require('../models/TourismReview');
const TourismLead = require('../models/TourismLead');
const TourismPayment = require('../models/TourismPayment');
const TourismComplaint = require('../models/TourismComplaint');
const TourismCoupon = require('../models/TourismCoupon');
const TourismPaymentService = require('../services/TourismPaymentService');
const TourismNotificationService = require('../services/TourismNotificationService');
const TourismInvoiceService = require('../services/TourismInvoiceService');
const logger = require('../utils/logger');

const { authenticate, hasAdminPrivileges } = authMiddleware;

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * GET /api/tourism/bootstrap
 * Get initial data for marketplace
 */
router.get('/bootstrap', async (req, res) => {
  try {
    const { email, vendorId } = req.query;

    // Get approved packages
    const packagesQuery = { approvalStatus: 'approved', isActive: true };
    const packages = await TourismPackage.find(packagesQuery)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Get reviews
    const reviews = await TourismReview.find({ isVisible: true })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Get active coupons
    const coupons = await TourismCoupon.find({
      isActive: true,
      isPublic: true,
      $or: [
        { validUntil: { $exists: false } },
        { validUntil: { $gte: new Date() } }
      ]
    }).lean();

    // Get vendors (basic info only)
    const vendors = await TourismVendor.find({ isActive: true })
      .select('name email phone verificationBadge approvalStatus kycStatus rating')
      .lean();

    // Get complaints (public view)
    const complaints = await TourismComplaint.find({ status: { $in: ['open', 'in_progress'] } })
      .select('packageId issue category status createdAt')
      .limit(10)
      .lean();

    // Get user bookings if email provided
    let bookings = [];
    if (email) {
      bookings = await TourismBooking.find({
        customerEmail: email.toLowerCase().trim()
      })
        .sort({ createdAt: -1 })
        .lean();
    }

    // Get vendor leads if vendorId provided
    let leads = [];
    if (vendorId && mongoose.Types.ObjectId.isValid(vendorId)) {
      leads = await TourismLead.find({ vendorId })
        .sort({ createdAt: -1 })
        .lean();
    }

    res.json({
      success: true,
      data: {
        packages,
        reviews,
        coupons,
        vendors,
        complaints,
        bookings,
        leads,
      },
    });
  } catch (error) {
    logger.error('Error in bootstrap:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading marketplace data',
    });
  }
});

/**
 * GET /api/tourism/packages
 * Get all approved packages with filters
 */
router.get('/packages', async (req, res) => {
  try {
    const {
      category,
      destination,
      travelerType,
      minPrice,
      maxPrice,
      minDays,
      maxDays,
      hotelCategory,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const query = { approvalStatus: 'approved', isActive: true };

    if (category && category !== 'All') query.category = category;
    if (destination && destination !== 'All destinations') query.destination = destination;
    if (travelerType && travelerType !== 'Any') query.travelerType = travelerType;
    if (minPrice) query.startPrice = { ...query.startPrice, $gte: Number(minPrice) };
    if (maxPrice) query.startPrice = { ...query.startPrice, $lte: Number(maxPrice) };
    if (minDays) query.durationDays = { ...query.durationDays, $gte: Number(minDays) };
    if (maxDays) query.durationDays = { ...query.durationDays, $lte: Number(maxDays) };
    if (hotelCategory && hotelCategory !== 'all') query.hotelCategory = hotelCategory;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const packages = await TourismPackage.find(query)
      .sort({ rating: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await TourismPackage.countDocuments(query);

    res.json({
      success: true,
      data: {
        packages,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching packages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching packages',
    });
  }
});

/**
 * GET /api/tourism/packages/:id
 * Get single package details
 */
router.get('/packages/:id', async (req, res) => {
  try {
    const pkg = await TourismPackage.findById(req.params.id);
    
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    // Increment view count
    await pkg.incrementViews();

    // Get reviews for this package
    const reviews = await TourismReview.find({
      packageId: pkg._id,
      isVisible: true,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: {
        package: pkg,
        reviews,
      },
    });
  } catch (error) {
    logger.error('Error fetching package:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching package details',
    });
  }
});

/**
 * POST /api/tourism/custom-requests
 * Create custom package request
 */
router.post('/custom-requests', async (req, res) => {
  try {
    const {
      travelerName,
      phone,
      travelerEmail,
      travelerType,
      destination,
      pickupCity,
      hotelCategory,
      startDate,
      days,
      estimatedBudget,
      preferences,
    } = req.body;

    if (!travelerName || !phone || !destination) {
      return res.status(400).json({
        success: false,
        message: 'travelerName, phone, and destination are required',
      });
    }

    const lead = new TourismLead({
      travelerName: travelerName.trim(),
      travelerPhone: phone.trim(),
      travelerEmail: travelerEmail?.trim().toLowerCase(),
      travelerType: travelerType || 'Family',
      destination: destination.trim(),
      pickupCity,
      hotelCategory,
      startDate,
      days: Number(days) || 3,
      budget: Number(estimatedBudget) || 0,
      estimatedBudget: Number(estimatedBudget) || 0,
      status: 'new',
      source: 'custom_request',
      note: preferences?.trim(),
      priority: Number(estimatedBudget) >= 50000 ? 'hot' : 'normal',
    });

    await lead.save();

    // Find matching vendors and notify
    const vendors = await TourismVendor.find({
      isActive: true,
      kycStatus: 'verified',
      approvalStatus: 'approved',
    }).limit(3);

    // Send notifications to vendors asynchronously
    vendors.forEach(vendor => {
      TourismNotificationService.sendVendorLeadNotification(vendor, lead).catch(err => {
        logger.error('Error sending vendor notification:', err);
      });
    });

    res.status(201).json({
      success: true,
      data: { lead },
      message: 'Custom request submitted successfully',
    });
  } catch (error) {
    logger.error('Error creating custom request:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting custom request',
    });
  }
});

/**
 * POST /api/tourism/planner/itinerary
 * Generate AI itinerary
 */
router.post('/planner/itinerary', async (req, res) => {
  try {
    const { destination, days, travelerType, budget } = req.body;

    // Simple itinerary generation logic
    const itinerary = {
      destination: destination || 'Kerala',
      days: Math.min(10, Math.max(1, Number(days) || 3)),
      travelerType: travelerType || 'Family',
      confidence: destination ? 92 : 75,
      budgetSummary: {
        totalBudget: Number(budget) || 0,
        perDayBudget: days > 0 ? Math.round((Number(budget) || 0) / days) : 0,
        recommendation: budget > 0 
          ? `Allocate around ₹${Math.round((Number(budget) || 0) / days).toLocaleString('en-IN')} per day`
          : 'Set a budget for better recommendations',
      },
      dayPlan: Array.from({ length: Math.min(10, Number(days) || 3) }).map((_, idx) => ({
        day: idx + 1,
        title: `Day ${idx + 1}`,
        summary: `Exploring ${destination || 'Kerala'}`,
        details: ['Morning: Local attractions', 'Afternoon: Sightseeing', 'Evening: Leisure'],
      })),
    };

    res.json({
      success: true,
      data: itinerary,
    });
  } catch (error) {
    logger.error('Error generating itinerary:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating itinerary',
    });
  }
});

// ============================================================================
// BOOKING ROUTES
// ============================================================================

/**
 * POST /api/tourism/bookings
 * Create a new booking
 */
router.post('/bookings', async (req, res) => {
  try {
    const {
      packageId,
      customerName,
      customerEmail,
      customerPhone,
      travelerCount,
      pickupCity,
      hotelCategory,
      travelDate,
      bookingNote,
      paymentType,
      couponCode,
    } = req.body;

    // Validation
    if (!packageId || !customerName || !customerEmail || !customerPhone || !travelDate || !pickupCity || !hotelCategory) {
      return res.status(400).json({
        success: false,
        message: 'Required fields missing',
      });
    }

    // Get package
    const pkg = await TourismPackage.findById(packageId);
    if (!pkg || pkg.approvalStatus !== 'approved') {
      return res.status(404).json({
        success: false,
        message: 'Package not found or not available',
      });
    }

    // Calculate totals
    const quantity = Math.max(1, Number(travelerCount) || 1);
    const baseAmount = pkg.startPrice;
    const totalAmount = baseAmount * quantity;
    let discountAmount = 0;
    let appliedCoupon = null;

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await TourismCoupon.findOne({
        code: couponCode.toUpperCase().trim(),
        isActive: true,
      });

      if (coupon) {
        const validation = coupon.isValid(totalAmount, packageId, pkg.vendorId);
        if (validation.valid) {
          discountAmount = coupon.calculateDiscount(totalAmount);
          appliedCoupon = coupon;
        }
      }
    }

    const chargeableAmount = Math.max(0, totalAmount - discountAmount);
    const normalizedPaymentType = paymentType === 'full' ? 'full' : 'advance';
    const payableAmount = normalizedPaymentType === 'full' 
      ? chargeableAmount 
      : Math.round(chargeableAmount * 0.3);

    // Create booking
    const booking = new TourismBooking({
      packageId: pkg._id,
      packageTitle: pkg.title,
      vendorId: pkg.vendorId,
      vendorName: pkg.vendor,
      userId: req.user?._id,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerPhone: customerPhone.trim(),
      travelerCount: quantity,
      pickupCity,
      hotelCategory,
      travelDate,
      bookingNote: bookingNote?.trim(),
      bookingStatus: 'pending',
      amountSummary: {
        baseAmount,
        travelerCount: quantity,
        totalAmount,
        discountAmount,
        chargeableAmount,
        payableAmount,
        paymentType: normalizedPaymentType,
        couponCode: appliedCoupon?.code,
      },
      paymentDetails: {
        paymentType: normalizedPaymentType,
        payableAmount,
        discountAmount,
        status: 'pending',
        currency: 'INR',
      },
      refundRules: pkg.cancellationPolicy,
    });

    await booking.save();

    // Increment coupon usage
    if (appliedCoupon) {
      await appliedCoupon.incrementUsage();
    }

    // Create lead for vendor
    const lead = new TourismLead({
      packageId: pkg._id,
      packageTitle: pkg.title,
      vendorId: pkg.vendorId,
      travelerName: customerName,
      travelerPhone: customerPhone,
      travelerEmail: customerEmail,
      destination: pkg.destination,
      budget: baseAmount,
      status: 'new',
      source: 'direct_booking',
      note: bookingNote || 'Direct booking from marketplace',
    });

    await lead.save();

    // Update package booking count
    pkg.bookingsCount = (pkg.bookingsCount || 0) + 1;
    await pkg.save();

    // Send booking confirmation
    TourismNotificationService.sendBookingConfirmation(booking).catch(err => {
      logger.error('Error sending booking confirmation:', err);
    });

    res.status(201).json({
      success: true,
      data: { booking },
      message: 'Booking created successfully',
    });
  } catch (error) {
    logger.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
    });
  }
});

/**
 * GET /api/tourism/bookings
 * Get bookings by email or phone
 */
router.get('/bookings', async (req, res) => {
  try {
    const { email, phone } = req.query;
    const query = {};

    if (email) {
      query.customerEmail = email.toLowerCase().trim();
    }
    if (phone) {
      query.customerPhone = phone.trim();
    }

    const bookings = await TourismBooking.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: { bookings },
    });
  } catch (error) {
    logger.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
    });
  }
});

/**
 * GET /api/tourism/bookings/my
 * Get authenticated user's bookings
 */
router.get('/bookings/my', authenticate, async (req, res) => {
  try {
    const userEmail = String(req.user.email || '').toLowerCase().trim();
    const userPhone = String(req.user.phone || '').replace(/\D/g, '');

    const query = {
      $or: [
        { customerEmail: userEmail },
        { userId: req.user._id },
      ],
    };

    if (userPhone) {
      query.$or.push({ customerPhone: { $regex: userPhone.slice(-10) } });
    }

    const bookings = await TourismBooking.find(query)
      .populate('packageId', 'title destination imageGallery')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    logger.error('Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your bookings',
    });
  }
});

/**
 * PATCH /api/tourism/bookings/:bookingId/status
 * Update booking status
 */
router.patch('/bookings/:bookingId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'paid', 'cancelled', 'completed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const booking = await TourismBooking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const oldStatus = booking.bookingStatus;
    await booking.addStatusHistory(status, 'user', 'Status updated');

    // Send notification
    TourismNotificationService.sendBookingStatusUpdate(booking, oldStatus, status).catch(err => {
      logger.error('Error sending status update:', err);
    });

    res.json({
      success: true,
      data: { booking },
      message: 'Booking status updated',
    });
  } catch (error) {
    logger.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking status',
    });
  }
});

// ============================================================================
// PAYMENT ROUTES
// ============================================================================

/**
 * POST /api/tourism/payments/intent
 * Create payment intent
 */
router.post('/payments/intent', async (req, res) => {
  try {
    const { bookingId, amount, paymentType } = req.body;

    if (!bookingId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid bookingId and amount are required',
      });
    }

    const booking = await TourismBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const paymentOrder = await TourismPaymentService.createPaymentOrder(
      bookingId,
      amount,
      { paymentType: paymentType || 'advance' }
    );

    res.json({
      success: true,
      data: paymentOrder,
    });
  } catch (error) {
    logger.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment order',
    });
  }
});

/**
 * POST /api/tourism/payments/verify
 * Verify and capture payment
 */
router.post('/payments/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment details incomplete',
      });
    }

    const result = await TourismPaymentService.capturePayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    // Send payment receipt
    TourismNotificationService.sendPaymentReceipt(result.booking, result.payment).catch(err => {
      logger.error('Error sending payment receipt:', err);
    });

    // Generate invoice
    TourismInvoiceService.generateInvoice(result.booking, result.payment).catch(err => {
      logger.error('Error generating invoice:', err);
    });

    res.json({
      success: true,
      data: result,
      message: 'Payment verified successfully',
    });
  } catch (error) {
    logger.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
    });
  }
});

/**
 * POST /api/tourism/payments/webhook
 * Razorpay webhook handler
 */
router.post('/payments/webhook', async (req, res) => {
  try {
    const event = req.headers['x-razorpay-event'];
    const payload = req.body;

    await TourismPaymentService.handleWebhook(event, payload);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error handling webhook:', error);
    res.status(500).json({ success: false });
  }
});

// ============================================================================
// REVIEW ROUTES
// ============================================================================

/**
 * POST /api/tourism/reviews
 * Submit a review
 */
router.post('/reviews', async (req, res) => {
  try {
    const { packageId, reviewerName, rating, comment, bookingId } = req.body;

    if (!packageId || !reviewerName || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'packageId, reviewerName, rating, and comment are required',
      });
    }

    const review = new TourismReview({
      packageId,
      bookingId,
      userId: req.user?._id,
      reviewerName: reviewerName.trim(),
      reviewerEmail: req.user?.email,
      rating: Math.min(5, Math.max(1, Number(rating))),
      comment: comment.trim(),
    });

    await review.save();

    // Package rating will be auto-updated via post-save hook

    res.status(201).json({
      success: true,
      data: { review },
      message: 'Review submitted successfully',
    });
  } catch (error) {
    logger.error('Error submitting review:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting review',
    });
  }
});

/**
 * POST /api/tourism/reviews/:reviewId/images
 * Upload review images
 */
router.post('/reviews/:reviewId/images', tourismImageUpload.uploadReviewImages, async (req, res) => {
  try {
    const review = await TourismReview.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    const imageUrls = req.files.map(file => tourismImageUpload.getFileUrl(req, file.filename));
    review.images.push(...imageUrls);
    await review.save();

    res.json({
      success: true,
      data: { review },
      message: 'Images uploaded successfully',
    });
  } catch (error) {
    logger.error('Error uploading review images:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading images',
    });
  }
});

// ============================================================================
// COMPLAINT ROUTES
// ============================================================================

/**
 * POST /api/tourism/packages/:packageId/report
 * Report package issue
 */
router.post('/packages/:packageId/report', async (req, res) => {
  try {
    const { reason, contact, category, severity } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Issue description is required',
      });
    }

    const pkg = await TourismPackage.findById(req.params.packageId);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    const complaint = new TourismComplaint({
      packageId: pkg._id,
      vendorId: pkg.vendorId,
      userId: req.user?._id,
      customerName: req.user?.name,
      customerEmail: req.user?.email,
      customerPhone: contact,
      issue: reason.trim(),
      category: category || 'other',
      severity: severity || 'medium',
      status: 'open',
      contact,
    });

    await complaint.save();
    await complaint.addEscalation('Complaint opened', 'Customer reported issue');

    res.status(201).json({
      success: true,
      data: { complaint },
      message: 'Complaint submitted successfully',
    });
  } catch (error) {
    logger.error('Error reporting package:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting complaint',
    });
  }
});

// ============================================================================
// VENDOR ROUTES
// ============================================================================

/**
 * GET /api/tourism/vendor/packages
 * Get vendor's packages
 */
router.get('/vendor/packages', authenticate, tourismAuth.isTourismVendor, async (req, res) => {
  try {
    const packages = await TourismPackage.find({ vendorId: req.tourismVendor._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: { packages },
    });
  } catch (error) {
    logger.error('Error fetching vendor packages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching packages',
    });
  }
});

/**
 * POST /api/tourism/vendor/packages
 * Create new package
 */
router.post('/vendor/packages', authenticate, tourismAuth.isTourismVendor, async (req, res) => {
  try {
    const {
      title,
      destination,
      category,
      travelerType,
      durationDays,
      startPrice,
      pickupCities,
      hotelCategory,
      tags,
      inclusions,
      exclusions,
      cancellationPolicy,
      childPricing,
      gstAndServiceCharge,
      availableDates,
      mapHighlights,
      itinerary,
      imageGallery,
      seasonalPricing,
    } = req.body;

    if (!title || !destination || !startPrice) {
      return res.status(400).json({
        success: false,
        message: 'title, destination, and startPrice are required',
      });
    }

    const pkg = new TourismPackage({
      title: title.trim(),
      destination: destination.trim(),
      category: category || 'Nature',
      travelerType: travelerType || 'Family',
      durationDays: Number(durationDays) || 3,
      startPrice: Number(startPrice),
      pickupCities: pickupCities || [],
      hotelCategory: hotelCategory || '3-star',
      vendorId: req.tourismVendor._id,
      vendor: req.tourismVendor.name,
      vendorVerified: req.tourismVendor.verificationBadge,
      tags: tags || [],
      inclusions: inclusions || [],
      exclusions: exclusions || [],
      cancellationPolicy: cancellationPolicy || 'Standard cancellation policy',
      childPricing: childPricing || '0-5 years free, 6-11 years 50%',
      gstAndServiceCharge: gstAndServiceCharge || '5% GST + 2% service charge',
      availableDates: availableDates || [],
      mapHighlights,
      itinerary: itinerary || [],
      imageGallery: imageGallery || [],
      seasonalPricing: seasonalPricing || [],
      approvalStatus: 'pending',
      kycStatus: req.tourismVendor.kycStatus,
      commissionPercent: req.tourismVendor.commissionRate || 8,
    });

    await pkg.save();

    res.status(201).json({
      success: true,
      data: { package: pkg },
      message: 'Package created and sent for approval',
    });
  } catch (error) {
    logger.error('Error creating package:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating package',
    });
  }
});

/**
 * PATCH /api/tourism/vendor/packages/:packageId
 * Update package
 */
router.patch('/vendor/packages/:packageId', authenticate, tourismAuth.canManagePackage, async (req, res) => {
  try {
    const updates = req.body;
    delete updates.vendorId;
    delete updates.vendor;
    delete updates._id;

    // If package was approved, changing it requires re-approval
    if (req.package.approvalStatus === 'approved') {
      updates.approvalStatus = 'pending';
    }

    Object.assign(req.package, updates);
    await req.package.save();

    res.json({
      success: true,
      data: { package: req.package },
      message: 'Package updated successfully',
    });
  } catch (error) {
    logger.error('Error updating package:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating package',
    });
  }
});

/**
 * DELETE /api/tourism/vendor/packages/:packageId
 * Delete package
 */
router.delete('/vendor/packages/:packageId', authenticate, tourismAuth.canManagePackage, async (req, res) => {
  try {
    req.package.isActive = false;
    await req.package.save();

    res.json({
      success: true,
      message: 'Package deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting package:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting package',
    });
  }
});

/**
 * POST /api/tourism/vendor/packages/:packageId/images
 * Upload package images
 */
router.post('/vendor/packages/:packageId/images', 
  authenticate, 
  tourismAuth.canManagePackage,
  tourismImageUpload.uploadPackageGallery,
  async (req, res) => {
    try {
      const imageUrls = req.files.map(file => tourismImageUpload.getFileUrl(req, file.filename));
      req.package.imageGallery.push(...imageUrls);
      await req.package.save();

      res.json({
        success: true,
        data: { package: req.package },
        message: 'Images uploaded successfully',
      });
    } catch (error) {
      logger.error('Error uploading package images:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading images',
      });
    }
  }
);

/**
 * GET /api/tourism/vendor/leads
 * Get vendor's leads
 */
router.get('/vendor/leads', authenticate, tourismAuth.isTourismVendor, async (req, res) => {
  try {
    const { status } = req.query;
    const query = { vendorId: req.tourismVendor._id };

    if (status) {
      query.status = status;
    }

    const leads = await TourismLead.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: { leads },
    });
  } catch (error) {
    logger.error('Error fetching vendor leads:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leads',
    });
  }
});

/**
 * PATCH /api/tourism/vendor/leads/:leadId
 * Update lead status
 */
router.patch('/vendor/leads/:leadId', authenticate, tourismAuth.isTourismVendor, async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['new', 'contacted', 'proposal_shared', 'negotiation', 'confirmed', 'lost'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const lead = await TourismLead.findOne({
      _id: req.params.leadId,
      vendorId: req.tourismVendor._id,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    await lead.addStatusHistory(status, note);

    res.json({
      success: true,
      data: { lead },
      message: 'Lead updated successfully',
    });
  } catch (error) {
    logger.error('Error updating lead:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating lead',
    });
  }
});

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * GET /api/tourism/admin/queues
 * Get admin review queues
 */
router.get('/admin/queues', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const [
      packageApprovalQueue,
      vendorApprovalQueue,
      kycQueue,
      riskFlags,
      refundApprovalQueue,
      complaints,
      featuredPackages,
    ] = await Promise.all([
      TourismPackage.find({ approvalStatus: 'pending' }).lean(),
      TourismVendor.find({ approvalStatus: 'pending' }).lean(),
      TourismVendor.find({ kycStatus: 'pending' }).lean(),
      TourismPackage.find({ fraudRisk: { $in: ['medium', 'high'] } }).lean(),
      TourismBooking.find({ 
        bookingStatus: 'cancelled',
        refundStatus: { $in: ['pending', 'processing'] }
      }).lean(),
      TourismComplaint.find({ status: { $in: ['open', 'in_progress'] } }).lean(),
      TourismPackage.find({ approvalStatus: 'approved', isActive: true })
        .sort({ rating: -1, bookingsCount: -1 })
        .limit(6)
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        packageApprovalQueue,
        vendorApprovalQueue,
        kycQueue,
        riskFlags,
        refundApprovalQueue,
        complaints,
        featuredPackages,
      },
    });
  } catch (error) {
    logger.error('Error fetching admin queues:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin data',
    });
  }
});

/**
 * PATCH /api/tourism/admin/vendors/:vendorId
 * Update vendor approval/KYC status
 */
router.patch('/admin/vendors/:vendorId', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { approvalStatus, kycStatus, riskFlag } = req.body;
    const vendor = await TourismVendor.findById(req.params.vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    if (approvalStatus) vendor.approvalStatus = approvalStatus;
    if (kycStatus) vendor.kycStatus = kycStatus;
    if (riskFlag) vendor.riskFlag = riskFlag;

    await vendor.updateVerificationBadge();

    // Update all vendor's packages
    await TourismPackage.updateMany(
      { vendorId: vendor._id },
      {
        vendorVerified: vendor.verificationBadge,
        kycStatus: vendor.kycStatus,
      }
    );

    res.json({
      success: true,
      data: { vendor },
      message: 'Vendor updated successfully',
    });
  } catch (error) {
    logger.error('Error updating vendor:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating vendor',
    });
  }
});

/**
 * PATCH /api/tourism/admin/packages/:packageId
 * Update package approval status
 */
router.patch('/admin/packages/:packageId', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { approvalStatus, fraudRisk } = req.body;
    const pkg = await TourismPackage.findById(req.params.packageId);

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    if (approvalStatus) pkg.approvalStatus = approvalStatus;
    if (fraudRisk) pkg.fraudRisk = fraudRisk;

    await pkg.save();

    res.json({
      success: true,
      data: { package: pkg },
      message: 'Package updated successfully',
    });
  } catch (error) {
    logger.error('Error updating package:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating package',
    });
  }
});

/**
 * GET /api/tourism/admin/bookings
 * Get all bookings (admin)
 */
router.get('/admin/bookings', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { status, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status) {
      query.bookingStatus = status;
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { packageTitle: searchRegex },
        { customerName: searchRegex },
        { customerEmail: searchRegex },
        { customerPhone: searchRegex },
        { confirmationNumber: searchRegex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const bookings = await TourismBooking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('packageId', 'title destination')
      .lean();

    const total = await TourismBooking.countDocuments(query);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Error fetching admin bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
    });
  }
});

/**
 * PUT /api/tourism/admin/bookings/:bookingId/status
 * Update booking status (admin)
 */
router.put('/admin/bookings/:bookingId/status', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { status, adminNote } = req.body;
    const booking = await TourismBooking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const oldStatus = booking.bookingStatus;
    await booking.addStatusHistory(status, req.user.email, adminNote);

    if (adminNote) {
      booking.adminNote = adminNote;
      await booking.save();
    }

    // Send notification
    TourismNotificationService.sendBookingStatusUpdate(booking, oldStatus, status).catch(err => {
      logger.error('Error sending status update:', err);
    });

    res.json({
      success: true,
      data: booking,
      message: 'Booking status updated',
    });
  } catch (error) {
    logger.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking status',
    });
  }
});

module.exports = router;

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

const TourismAnalyticsService = require('../services/TourismAnalyticsService');

/**
 * GET /api/tourism/analytics/dashboard
 * Get overall analytics dashboard
 */
router.get('/analytics/dashboard', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { startDate, endDate } = req.query;
    const metrics = await TourismAnalyticsService.getDashboardMetrics({ startDate, endDate });

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Error fetching dashboard analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
    });
  }
});

/**
 * GET /api/tourism/analytics/vendor/:vendorId
 * Get vendor-specific analytics
 */
router.get('/analytics/vendor/:vendorId', authenticate, tourismAuth.isTourismVendorOrAdmin, async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { startDate, endDate } = req.query;

    // Verify vendor access
    if (!req.isAdmin && req.tourismVendor._id.toString() !== vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const analytics = await TourismAnalyticsService.getVendorAnalytics(vendorId, { startDate, endDate });

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error fetching vendor analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor analytics',
    });
  }
});

/**
 * GET /api/tourism/analytics/bookings
 * Get booking analytics
 */
router.get('/analytics/bookings', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { startDate, endDate } = req.query;
    const analytics = await TourismAnalyticsService.getBookingAnalytics({ startDate, endDate });

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error fetching booking analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking analytics',
    });
  }
});

/**
 * GET /api/tourism/analytics/revenue
 * Get revenue analytics
 */
router.get('/analytics/revenue', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { startDate, endDate } = req.query;
    const analytics = await TourismAnalyticsService.getRevenueAnalytics({ startDate, endDate });

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error fetching revenue analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching revenue analytics',
    });
  }
});

/**
 * GET /api/tourism/analytics/popular-packages
 * Get popular packages
 */
router.get('/analytics/popular-packages', async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;
    const packages = await TourismAnalyticsService.getPopularPackages(Number(limit), { startDate, endDate });

    res.json({
      success: true,
      data: packages,
    });
  } catch (error) {
    logger.error('Error fetching popular packages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching popular packages',
    });
  }
});

// ============================================================================
// AUDIT LOG ROUTES
// ============================================================================

/**
 * GET /api/tourism/audit/bookings/:bookingId
 * Get booking audit trail
 */
router.get('/audit/bookings/:bookingId', authenticate, async (req, res) => {
  try {
    const booking = await TourismBooking.findById(req.params.bookingId)
      .select('statusHistory customerName packageTitle bookingStatus confirmationNumber')
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check access
    const userEmail = String(req.user.email || '').toLowerCase().trim();
    const isAdmin = hasAdminPrivileges(req.user);
    const isOwner = userEmail === String(booking.customerEmail || '').toLowerCase().trim();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: {
        bookingId: booking._id,
        confirmationNumber: booking.confirmationNumber,
        packageTitle: booking.packageTitle,
        currentStatus: booking.bookingStatus,
        history: booking.statusHistory || [],
      },
    });
  } catch (error) {
    logger.error('Error fetching booking audit:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit trail',
    });
  }
});

/**
 * GET /api/tourism/audit/leads/:leadId
 * Get lead audit trail
 */
router.get('/audit/leads/:leadId', authenticate, tourismAuth.isTourismVendorOrAdmin, async (req, res) => {
  try {
    const lead = await TourismLead.findById(req.params.leadId)
      .select('statusHistory travelerName destination status')
      .lean();

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    // Check vendor access
    if (!req.isAdmin && lead.vendorId.toString() !== req.tourismVendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: {
        leadId: lead._id,
        travelerName: lead.travelerName,
        destination: lead.destination,
        currentStatus: lead.status,
        history: lead.statusHistory || [],
      },
    });
  } catch (error) {
    logger.error('Error fetching lead audit:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit trail',
    });
  }
});

/**
 * GET /api/tourism/audit/complaints/:complaintId
 * Get complaint audit trail
 */
router.get('/audit/complaints/:complaintId', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const complaint = await TourismComplaint.findById(req.params.complaintId)
      .select('issue status escalationTimeline internalNotes')
      .lean();

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    res.json({
      success: true,
      data: {
        complaintId: complaint._id,
        issue: complaint.issue,
        currentStatus: complaint.status,
        escalationTimeline: complaint.escalationTimeline || [],
        internalNotes: complaint.internalNotes || [],
      },
    });
  } catch (error) {
    logger.error('Error fetching complaint audit:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit trail',
    });
  }
});

/**
 * GET /api/tourism/audit/admin-actions
 * Get admin action logs
 */
router.get('/audit/admin-actions', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { page = 1, limit = 50, type } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Get recent bookings with status changes
    const bookingLogs = await TourismBooking.find({
      'statusHistory.1': { $exists: true }, // Has at least 2 status changes
    })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('confirmationNumber statusHistory packageTitle updatedAt')
      .lean();

    // Get recent vendor updates
    const vendorLogs = await TourismVendor.find({
      updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
    })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('name approvalStatus kycStatus updatedAt')
      .lean();

    // Get recent package updates
    const packageLogs = await TourismPackage.find({
      updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('title approvalStatus fraudRisk updatedAt')
      .lean();

    const logs = [
      ...bookingLogs.map(b => ({
        type: 'booking',
        id: b._id,
        reference: b.confirmationNumber,
        title: b.packageTitle,
        changes: b.statusHistory.length,
        lastChange: b.statusHistory[b.statusHistory.length - 1],
        updatedAt: b.updatedAt,
      })),
      ...vendorLogs.map(v => ({
        type: 'vendor',
        id: v._id,
        reference: v.name,
        approvalStatus: v.approvalStatus,
        kycStatus: v.kycStatus,
        updatedAt: v.updatedAt,
      })),
      ...packageLogs.map(p => ({
        type: 'package',
        id: p._id,
        reference: p.title,
        approvalStatus: p.approvalStatus,
        fraudRisk: p.fraudRisk,
        updatedAt: p.updatedAt,
      })),
    ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({
      success: true,
      data: {
        logs: logs.slice(0, Number(limit)),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: logs.length,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching admin action logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin logs',
    });
  }
});
