const express = require("express");
const Joi = require("joi");
const {
  listProviders,
  getProviderById,
  createBooking,
  createQuoteRequest,
  createVendor,
  listTrackingByPhone,
  listVendorDashboard,
  upsertVendorAdminStatus,
  EVENT_TYPES,
  CITIES,
  CATEGORIES,
} = require("../utils/devLocalServicesStore");
const { authenticate, verifyAdmin } = require("../middleware/auth");

const router = express.Router();

const phoneRegex = /^\+?[0-9]{8,15}$/;

const bookingSchema = Joi.object({
  providerId: Joi.string().required(),
  eventType: Joi.string().valid(...EVENT_TYPES).required(),
  eventDate: Joi.date().iso().required(),
  guests: Joi.number().integer().min(20).max(5000).required(),
  budget: Joi.number().min(1000).max(5000000).required(),
  notes: Joi.string().allow("").max(1000),
  customerName: Joi.string().min(2).max(120).required(),
  customerPhone: Joi.string().pattern(phoneRegex).required(),
  customerEmail: Joi.string().email().allow(""),
  paymentOption: Joi.string().valid("advance", "full", "quoteOnly").default("advance"),
  advanceAmount: Joi.number().min(0).default(0),
}).required();

const quoteSchema = Joi.object({
  providerId: Joi.string().required(),
  eventType: Joi.string().valid(...EVENT_TYPES).required(),
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

const isPastDate = (dateString) => {
  const eventDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate < today;
};

router.get("/meta", (_req, res) => {
  return res.json({
    success: true,
    data: {
      categories: CATEGORIES,
      cities: CITIES,
      eventTypes: EVENT_TYPES,
      sortOptions: [
        { id: "rating", label: "Rating" },
        { id: "price", label: "Price low to high" },
        { id: "response", label: "Fastest response" },
        { id: "verified", label: "Verified first" },
        { id: "nearest", label: "Nearest location" },
      ],
    },
  });
});

router.get("/providers", async (req, res) => {
  try {
    const providers = await listProviders(req.query || {});
    return res.json({ success: true, data: providers });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load providers." });
  }
});

router.get("/providers/:providerId", async (req, res) => {
  try {
    const provider = await getProviderById(req.params.providerId);
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

    const provider = await getProviderById(value.providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found." });
    }

    if (value.budget < provider.priceStart || value.budget > provider.priceMax) {
      return res.status(400).json({
        success: false,
        message: `Budget must be between ${provider.priceStart} and ${provider.priceMax} for this provider.`,
      });
    }

    const totalAmount = Number(value.budget);
    const advanceAmount =
      value.paymentOption === "advance"
        ? Math.max(1000, Math.round(totalAmount * 0.2))
        : value.paymentOption === "full"
          ? totalAmount
          : 0;

    const booking = await createBooking({
      ...value,
      providerName: provider.name,
      providerCategory: provider.category,
      providerPhone: provider.phone,
      providerWhatsapp: provider.whatsappNumber,
      payment: {
        totalAmount,
        paymentOption: value.paymentOption,
        advanceAmount,
        amountDue: Math.max(0, totalAmount - advanceAmount),
      },
    });

    return res.status(201).json({ success: true, data: booking });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to create booking request." });
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

    const provider = await getProviderById(value.providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found." });
    }

    const quote = await createQuoteRequest({
      ...value,
      providerName: provider.name,
      providerCategory: provider.category,
    });
    return res.status(201).json({ success: true, data: quote });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to create quote request." });
  }
});

router.post("/vendors", async (req, res) => {
  try {
    const { error, value } = vendorSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const categoryExists = CATEGORIES.find((entry) => entry.id === value.category);
    if (!categoryExists) {
      return res.status(400).json({ success: false, message: "Invalid category." });
    }

    const vendor = await createVendor(value);
    return res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to submit vendor onboarding." });
  }
});

router.get("/tracking", async (req, res) => {
  try {
    const phone = String(req.query.phone || "").trim();
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, message: "Valid phone is required." });
    }
    const entries = await listTrackingByPhone(phone);
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
    const dashboard = await listVendorDashboard(phone);
    if (!dashboard) {
      return res.status(404).json({ success: false, message: "Vendor dashboard not found." });
    }
    return res.json({ success: true, data: dashboard });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to fetch vendor dashboard." });
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
    const vendor = await upsertVendorAdminStatus(req.params.vendorId, payload);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found." });
    }
    return res.json({ success: true, data: vendor });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to update vendor moderation status." });
  }
});

module.exports = router;
