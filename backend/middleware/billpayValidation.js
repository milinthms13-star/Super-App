/**
 * BillPay Validation Middleware
 * Server-side input validation for all billpay operations
 */

const validateBillDiscovery = (req, res, next) => {
  const { identifierType, identifierValue, preferredCategory } = req.body;

  if (!identifierType || !["Mobile Number", "Consumer ID"].includes(identifierType)) {
    return res.status(400).json({ error: "Invalid identifier type" });
  }

  if (!identifierValue || typeof identifierValue !== "string") {
    return res.status(400).json({ error: "Identifier value required" });
  }

  const trimmed = identifierValue.trim();

  if (identifierType === "Mobile Number") {
    if (!/^[6-9]\d{9}$/.test(trimmed)) {
      return res.status(400).json({ error: "Invalid Indian mobile number format" });
    }
  } else if (identifierType === "Consumer ID") {
    if (!/^[A-Z0-9\-]{3,50}$/.test(trimmed)) {
      return res.status(400).json({ error: "Invalid consumer ID format (3-50 alphanumeric)" });
    }
  }

  if (preferredCategory && typeof preferredCategory !== "string") {
    return res.status(400).json({ error: "Invalid category" });
  }

  req.body.identifierValue = trimmed;
  next();
};

const validatePaymentAmount = (req, res, next) => {
  const { amount } = req.body;

  if (!amount || typeof amount !== "number") {
    return res.status(400).json({ error: "Valid amount required" });
  }

  if (amount < 1 || amount > 100000) {
    return res.status(400).json({ error: "Amount must be between ₹1 and ₹100,000" });
  }

  if (!Number.isInteger(amount * 100)) {
    return res.status(400).json({ error: "Amount must have maximum 2 decimal places" });
  }

  next();
};

const validatePaymentMethod = (req, res, next) => {
  const { method, authMode } = req.body;
  const validMethods = ["UPI", "Card", "NetBanking", "Wallet"];
  const validAuthModes = ["PIN + OTP", "Biometric + OTP"];

  if (!method || !validMethods.includes(method)) {
    return res.status(400).json({ error: `Invalid payment method. Must be one of: ${validMethods.join(", ")}` });
  }

  if (!authMode || !validAuthModes.includes(authMode)) {
    return res.status(400).json({ error: `Invalid auth mode. Must be one of: ${validAuthModes.join(", ")}` });
  }

  next();
};

const validateOTP = (req, res, next) => {
  const { otp, pin, biometricConfirmed } = req.body;

  if (!otp || !/^\d{6}$/.test(otp.toString())) {
    return res.status(400).json({ error: "OTP must be 6 digits" });
  }

  const authMode = req.body.authMode || "PIN + OTP";

  if (authMode === "PIN + OTP") {
    if (!pin || !/^\d{4,6}$/.test(pin.toString())) {
      return res.status(400).json({ error: "PIN must be 4-6 digits" });
    }
  }

  if (authMode === "Biometric + OTP") {
    if (!biometricConfirmed) {
      return res.status(400).json({ error: "Biometric confirmation required" });
    }
  }

  next();
};

const validateDisputeInput = (req, res, next) => {
  const { type, description } = req.body;
  const validTypes = [
    "Paid but bill not updated",
    "Wrong amount",
    "Refund delay",
    "Duplicate payment",
    "Other",
  ];

  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid dispute type. Must be one of: ${validTypes.join(", ")}` });
  }

  if (!description || typeof description !== "string") {
    return res.status(400).json({ error: "Dispute description required" });
  }

  if (description.trim().length < 20) {
    return res.status(400).json({ error: "Description must be at least 20 characters" });
  }

  if (description.length > 1000) {
    return res.status(400).json({ error: "Description must not exceed 1000 characters" });
  }

  req.body.description = description.trim();
  next();
};

const validateMandateSetup = (req, res, next) => {
  const { maxAmount, frequency, paymentMethod } = req.body;
  const validFrequencies = ["Monthly", "Quarterly", "Half-Yearly", "Yearly", "On-Demand"];
  const validMethods = ["UPI", "Card", "NetBanking", "Wallet"];

  if (!maxAmount || typeof maxAmount !== "number") {
    return res.status(400).json({ error: "Valid max amount required" });
  }

  if (maxAmount < 1 || maxAmount > 100000) {
    return res.status(400).json({ error: "Max amount must be between ₹1 and ₹100,000" });
  }

  if (!frequency || !validFrequencies.includes(frequency)) {
    return res.status(400).json({ error: `Invalid frequency. Must be one of: ${validFrequencies.join(", ")}` });
  }

  if (!paymentMethod || !validMethods.includes(paymentMethod)) {
    return res.status(400).json({ error: `Invalid payment method. Must be one of: ${validMethods.join(", ")}` });
  }

  next();
};

const validateBillNickname = (nickname) => {
  if (!nickname || typeof nickname !== "string") {
    throw new Error("Nickname required");
  }

  if (nickname.trim().length === 0) {
    throw new Error("Nickname cannot be empty");
  }

  if (nickname.length > 100) {
    throw new Error("Nickname must not exceed 100 characters");
  }

  // Check for malicious patterns
  if (/<script|javascript:|onerror|onclick|<iframe/i.test(nickname)) {
    throw new Error("Invalid characters in nickname");
  }

  return nickname.trim();
};

const validateConsumerId = (consumerId) => {
  if (!consumerId || typeof consumerId !== "string") {
    throw new Error("Consumer ID required");
  }

  if (!/^[A-Z0-9\-]{3,50}$/.test(consumerId.trim())) {
    throw new Error("Invalid consumer ID format");
  }

  return consumerId.trim();
};

const validateMobileNumber = (mobile) => {
  if (!mobile || typeof mobile !== "string") {
    throw new Error("Mobile number required");
  }

  if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
    throw new Error("Invalid Indian mobile number");
  }

  return mobile.trim();
};

module.exports = {
  validateBillDiscovery,
  validatePaymentAmount,
  validatePaymentMethod,
  validateOTP,
  validateDisputeInput,
  validateMandateSetup,
  validateBillNickname,
  validateConsumerId,
  validateMobileNumber,
};
