/**
 * BillPay Routes
 * Complete bill payment API with Razorpay integration, authentication, and rate limiting
 */

const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const Razorpay = require("razorpay");
const { authenticate, verifyAdmin } = require("../middleware/auth");
const billpayService = require("../services/billpayService");
const {
  validateBillDiscovery,
  validatePaymentAmount,
  validatePaymentMethod,
  validateOTP,
  validateDisputeInput,
  validateMandateSetup,
} = require("../middleware/billpayValidation");

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "test_key",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "test_secret",
});

// Rate limiting middleware
const paymentRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: "Too many payment attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const discoveryRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour
  message: "Too many discovery attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const disputeRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5, // 5 disputes per day
  message: "Too many disputes filed. Please try again tomorrow.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * GET /billpay/bills
 * Fetch all bills for authenticated user
 */
router.get("/bills", authenticate, async (req, res) => {
  try {
    const bills = await billpayService.getUserBills(req.user._id);
    res.json({
      success: true,
      count: bills.length,
      bills,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /billpay/bills/:billId/autopay
 * Enable/disable autopay on a bill
 */
router.patch("/bills/:billId/autopay", authenticate, async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ success: false, error: "enabled must be boolean" });
    }

    const bill = await billpayService.updateBillAutopay(req.user._id, req.params.billId, enabled);
    res.json({
      success: true,
      message: `Autopay ${bill.autopayEnabled ? "enabled" : "disabled"} successfully`,
      bill,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /billpay/discover
 * Discover bill by mobile number or consumer ID
 */
router.post(
  "/discover",
  authenticate,
  discoveryRateLimit,
  validateBillDiscovery,
  async (req, res) => {
    try {
      const { identifierType, identifierValue, preferredCategory } = req.body;

      const result = await billpayService.discoverBill(
        req.user._id,
        identifierType,
        identifierValue,
        preferredCategory
      );

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /billpay/pay/create-order
 * Create Razorpay order for payment
 */
router.post(
  "/pay/create-order",
  authenticate,
  paymentRateLimit,
  validatePaymentAmount,
  validatePaymentMethod,
  async (req, res) => {
    try {
      const { billId, amount } = req.body;

      // Get order data from service
      const orderData = await billpayService.createPaymentOrder(
        req.user._id,
        billId,
        amount
      );

      // Create Razorpay order
      const razorpayOrder = await razorpay.orders.create(orderData);

      res.json({
        success: true,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || "test_key",
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /billpay/pay/verify
 * Verify payment signature and record transaction
 */
router.post(
  "/pay/verify",
  authenticate,
  validateOTP,
  async (req, res) => {
    try {
      const {
        orderId,
        paymentId,
        signature,
        billId,
        amount,
        method,
        authMode,
      } = req.body;

      // Verify signature
      await billpayService.verifyPaymentSignature(orderId, paymentId, signature);

      // Record payment
      const paymentResult = await billpayService.recordPayment(req.user._id, billId, amount, {
        method,
        authMode,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({
        success: true,
        message: "Payment successful",
        ...paymentResult,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /billpay/history
 * Fetch payment history with pagination
 */
router.get("/history", authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const history = await billpayService.getTransactionHistory(
      req.user._id,
      limit,
      offset
    );

    res.json({
      success: true,
      ...history,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /billpay/receipts/:transactionId
 * Download receipt details
 */
router.get("/receipts/:transactionId", authenticate, async (req, res) => {
  try {
    const receipt = await billpayService.getReceipt(
      req.user._id,
      req.params.transactionId
    );

    res.json({
      success: true,
      receipt,
    });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

/**
 * POST /billpay/disputes
 * File a dispute
 */
router.post(
  "/disputes",
  authenticate,
  disputeRateLimit,
  validateDisputeInput,
  async (req, res) => {
    try {
      const { transactionId, type, description } = req.body;

      const dispute = await billpayService.fileDispute(
        req.user._id,
        transactionId,
        type,
        description
      );

      res.json({
        success: true,
        message: "Dispute filed successfully",
        dispute,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /billpay/disputes
 * Fetch user's disputes with pagination
 */
router.get("/disputes", authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const disputes = await billpayService.getUserDisputes(
      req.user._id,
      limit,
      offset
    );

    res.json({
      success: true,
      ...disputes,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /billpay/mandates
 * Set up autopay mandate
 */
router.post(
  "/mandates",
  authenticate,
  validateMandateSetup,
  async (req, res) => {
    try {
      const { billId, maxAmount, frequency, paymentMethod } = req.body;

      const mandate = await billpayService.setupMandate(
        req.user._id,
        billId,
        maxAmount,
        frequency,
        paymentMethod
      );

      res.json({
        success: true,
        message: "Mandate set up successfully",
        mandate,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /billpay/mandates
 * Fetch user's active mandates
 */
router.get("/mandates", authenticate, async (req, res) => {
  try {
    const mandates = await billpayService.getUserMandates(req.user._id);

    res.json({
      success: true,
      count: mandates.length,
      mandates,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /billpay/mandates/:mandateId
 * Update mandate status (pause, resume, cancel)
 */
router.patch("/mandates/:mandateId", authenticate, async (req, res) => {
  try {
    const { status, reason, maxAmount } = req.body;

    const mandate = await billpayService.updateMandateStatus(
      req.user._id,
      req.params.mandateId,
      status,
      reason,
      maxAmount
    );

    res.json({
      success: true,
      message: status
        ? `Mandate ${status.toLowerCase()} successfully`
        : "Mandate updated successfully",
      mandate,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /billpay/admin/analytics
 * Admin analytics dashboard (admin role required)
 */
router.get("/admin/analytics", authenticate, verifyAdmin, async (req, res) => {
  try {
    const dateRange = req.query.dateRange || "thisMonth";
    const analytics = await billpayService.getAdminAnalytics(dateRange);

    res.json({
      success: true,
      ...analytics,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Health check endpoint
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "BillPay API is operational",
    timestamp: new Date(),
  });
});

module.exports = router;
