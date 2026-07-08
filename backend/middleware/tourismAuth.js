const TourismVendor = require('../models/TourismVendor');
const TourismBooking = require('../models/TourismBooking');
const logger = require('../utils/logger');

/**
 * Check if user is a tourism vendor
 */
const isTourismVendor = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const vendor = await TourismVendor.findOne({
      userId: req.user._id,
      isActive: true,
      isSuspended: false,
    });

    if (!vendor) {
      return res.status(403).json({
        success: false,
        message: 'Tourism vendor access required',
      });
    }

    req.tourismVendor = vendor;
    next();
  } catch (error) {
    logger.error('Error checking tourism vendor:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying vendor access',
    });
  }
};

/**
 * Check if user is vendor or admin
 */
const isTourismVendorOrAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check if admin
    const userRole = String(req.user.role || req.user.registrationType || '').toLowerCase();
    if (userRole === 'admin') {
      req.isAdmin = true;
      return next();
    }

    // Check if vendor
    const vendor = await TourismVendor.findOne({
      userId: req.user._id,
      isActive: true,
      isSuspended: false,
    });

    if (!vendor) {
      return res.status(403).json({
        success: false,
        message: 'Tourism vendor or admin access required',
      });
    }

    req.tourismVendor = vendor;
    next();
  } catch (error) {
    logger.error('Error checking vendor or admin access:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying access',
    });
  }
};

/**
 * Check if user owns the booking
 */
const isBookingOwner = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const bookingId = req.params.bookingId || req.params.id;
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID required',
      });
    }

    const booking = await TourismBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if user is the booking owner
    const userEmail = String(req.user.email || '').toLowerCase().trim();
    const bookingEmail = String(booking.customerEmail || '').toLowerCase().trim();
    
    const userPhone = String(req.user.phone || '').replace(/\D/g, '');
    const bookingPhone = String(booking.customerPhone || '').replace(/\D/g, '');

    const isOwner = (userEmail && bookingEmail && userEmail === bookingEmail) ||
                    (userPhone && bookingPhone && userPhone.endsWith(bookingPhone.slice(-10))) ||
                    (booking.userId && req.user._id.toString() === booking.userId.toString());

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this booking.',
      });
    }

    req.booking = booking;
    next();
  } catch (error) {
    logger.error('Error checking booking ownership:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying booking ownership',
    });
  }
};

/**
 * Check if user can manage the package (vendor owner or admin)
 */
const canManagePackage = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Admin can manage all packages
    const userRole = String(req.user.role || req.user.registrationType || '').toLowerCase();
    if (userRole === 'admin') {
      req.isAdmin = true;
      return next();
    }

    // Check if vendor owns the package
    const packageId = req.params.packageId || req.params.id;
    const TourismPackage = require('../models/TourismPackage');
    const pkg = await TourismPackage.findById(packageId);

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    const vendor = await TourismVendor.findOne({
      userId: req.user._id,
      isActive: true,
      isSuspended: false,
    });

    if (!vendor || pkg.vendorId.toString() !== vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this package.',
      });
    }

    req.tourismVendor = vendor;
    req.package = pkg;
    next();
  } catch (error) {
    logger.error('Error checking package management access:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying package access',
    });
  }
};

/**
 * Check if user is verified vendor
 */
const isVerifiedVendor = async (req, res, next) => {
  try {
    if (!req.tourismVendor) {
      const vendor = await TourismVendor.findOne({
        userId: req.user._id,
        isActive: true,
        isSuspended: false,
      });

      if (!vendor) {
        return res.status(403).json({
          success: false,
          message: 'Tourism vendor access required',
        });
      }

      req.tourismVendor = vendor;
    }

    if (req.tourismVendor.kycStatus !== 'verified' || req.tourismVendor.approvalStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Vendor verification required. Please complete KYC and wait for approval.',
        kycStatus: req.tourismVendor.kycStatus,
        approvalStatus: req.tourismVendor.approvalStatus,
      });
    }

    next();
  } catch (error) {
    logger.error('Error checking verified vendor:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying vendor status',
    });
  }
};

module.exports = {
  isTourismVendor,
  isTourismVendorOrAdmin,
  isBookingOwner,
  canManagePackage,
  isVerifiedVendor,
};
