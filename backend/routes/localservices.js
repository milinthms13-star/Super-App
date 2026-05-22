const express = require("express");
const Joi = require("joi");
const localServicesService = require("../services/localServicesService");
const { authenticate, verifyAdmin } = require("../middleware/auth");

const router = express.Router();

const phoneRegex = /^\+?[0-9]{8,15}$/;

const bookingSchema = Joi.object({
  providerId: Joi.string().required(),
  eventType: Joi.string().valid(...localServicesService.EVENT_TYPES).required(),
  eventDate: Joi.date().iso().required(),
  guests: Joi.number().integer().min(20).max(5000).required(),
  budget: Joi.number().min(1000).max(5000000).required(),
  notes: Joi.string().allow("").max(1000),
  customerName: Joi.string().min(2).max(120).required(),
  customerPhone: Joi.string().pattern(phoneRegex).required(),
  customerEmail: Joi.string().email().allow(""),
  paymentOption: Joi.string().valid("advance", "full", "quoteOnly").default("advance"),
}).required();

const quoteSchema = Joi.object({
  providerId: Joi.string().required(),
  eventType: Joi.string().valid(...localServicesService.EVENT_TYPES).required(),
  eventDate: Joi.date().iso().required(),
  guests: Joi.number().integer().min(20).max(5000).required(),
  budget: Joi.number().min(1000).max(5000000).required(),
  notes: Joi.string().allow("").max(1000),
  customerName: Joi.string().min(2).max(120).required(),
  customerPhone: Joi.string().pattern(phoneRegex).required(),
  customerEmail: Joi.string().email().allow(""),
}).required();

const vendorSchema = Joi.object({
  businessName: Joi.string().min(2).max(180).required(),
  category: Joi.string().required(),
  city: Joi.string().required(),
  phone: Joi.string().pattern(phoneRegex).required(),
  whatsappNumber: Joi.string().pattern(phoneRegex).allow(""),
  packageName: Joi.string().min(2).max(180).required(),
  packagePrice: Joi.number().min(1000).required(),
  portfolioItems: Joi.number().integer().min(0).max(1000).default(0),
  verificationDone: Joi.boolean().default(false),
  serviceAreas: Joi.array().items(Joi.string().max(80)).default([]),
}).required();

const packageRequestSchema = Joi.object({
  eventType: Joi.string().valid(...localServicesService.EVENT_TYPES).required(),
  eventDate: Joi.date().iso().required(),
  items: Joi.array().items(Joi.string().trim()).min(1).required(),
  budget: Joi.number().min(1000).required(),
  customerPhone: Joi.string().pattern(phoneRegex).required(),
  notes: Joi.string().allow("").max(1000),
}).required();

const isPastDate = (dateString) => {
  const eventDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate < today;
};

router.get("/meta", async (_req, res) => {
  try {
    const data = await localServicesService.getMeta();
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load metadata." });
  }
});

router.get("/providers", async (req, res) => {
  try {
    const providers = await localServicesService.listProviders(req.query || {});
    return res.json({ success: true, data: providers });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load providers." });
  }
});

router.get("/providers/:providerId", async (req, res) => {
  try {
    const provider = await localServicesService.getProviderById(req.params.providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found." });
    }
    return res.json({ success: true, data: provider });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load provider details." });
  }
});

router.post("/bookings", async (req, res) => {
  try {
    const { error, value } = bookingSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    if (isPastDate(value.eventDate)) {
      return res.status(400).json({ success: false, message: "Past dates are not allowed." });
    }

    const booking = await localServicesService.createBooking(value);
    return res.status(201).json({ success: true, data: booking });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to create booking request." });
  }
});

router.post("/quotes", async (req, res) => {
  try {
    const { error, value } = quoteSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    if (isPastDate(value.eventDate)) {
      return res.status(400).json({ success: false, message: "Past dates are not allowed." });
    }

    const quote = await localServicesService.createQuoteRequest(value);
    return res.status(201).json({ success: true, data: quote });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to create quote request." });
  }
});

router.post("/vendors", async (req, res) => {
  try {
    const { error, value } = vendorSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const vendor = await localServicesService.createVendor({
      ...value,
      createdByUserId: req.user?.id || "",
    });
    return res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to submit vendor onboarding." });
  }
});

router.post("/package-requests", async (req, res) => {
  try {
    const { error, value } = packageRequestSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    if (isPastDate(value.eventDate)) {
      return res.status(400).json({ success: false, message: "Past dates are not allowed." });
    }

    const request = await localServicesService.createPackageRequest(value);
    return res.status(201).json({ success: true, data: request });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to create package request." });
  }
});

router.get("/tracking", async (req, res) => {
  try {
    const phone = String(req.query.phone || "").trim();
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, message: "Valid phone is required." });
    }
    const entries = await localServicesService.listTrackingByPhone(phone);
    return res.json({ success: true, data: entries });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to fetch request tracking." });
  }
});

router.get("/vendor-dashboard", async (req, res) => {
  try {
    const phone = String(req.query.phone || "").trim();
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, message: "Valid vendor phone is required." });
    }
    const dashboard = await localServicesService.listVendorDashboard(phone);
    if (!dashboard) {
      return res.status(404).json({ success: false, message: "Vendor dashboard not found." });
    }
    return res.json({ success: true, data: dashboard });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to fetch vendor dashboard." });
  }
});

router.get("/admin/vendors", authenticate, verifyAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || "all").trim();
    const vendors = await localServicesService.listVendorApplications({ status });
    return res.json({ success: true, data: vendors });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to fetch vendor applications." });
  }
});

router.patch("/admin/vendors/:vendorId", authenticate, verifyAdmin, async (req, res) => {
  try {
    const payload = {
      approvalStatus: req.body.approvalStatus,
      featured: Boolean(req.body.featured),
      commissionPercent: Number(req.body.commissionPercent || 0),
      moderationNote: String(req.body.moderationNote || "").trim(),
    };
    const vendor = await localServicesService.upsertVendorAdminStatus(req.params.vendorId, payload);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found." });
    }
    return res.json({ success: true, data: vendor });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to update vendor moderation status." });
  }
});

module.exports = router;
