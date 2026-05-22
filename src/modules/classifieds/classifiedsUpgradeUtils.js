export const CLASSIFIEDS_HIGH_RISK_CATEGORIES = new Set([
  "Jobs",
  "Properties",
  "Rentals",
  "Vehicles",
  "Business for Sale",
  "Pets",
]);

export const normalizePhoneForIndia = (phone = "") => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("91") ? digits : `91${digits}`;
};

export const getListingTrustScore = (listing = {}) => {
  const signals = [
    Boolean(listing.verified),
    Number(listing.sellerRating || listing.sellerTotalRating || listing.averageRating || 0) >= 4,
    Boolean(listing.originalReceipt),
    Boolean(listing.warranty),
    Boolean(listing.sellerVerificationLevel && listing.sellerVerificationLevel !== "unverified"),
    Boolean((listing.mediaGallery || []).length || listing.image),
  ];
  const score = signals.filter(Boolean).length;
  return {
    score,
    label: score >= 5 ? "High trust" : score >= 3 ? "Good trust" : "Verify before payment",
    level: score >= 5 ? "high" : score >= 3 ? "good" : "pending",
  };
};

export const getListingRiskWarnings = (listing = {}) => {
  const warnings = [];
  const text = `${listing.title || ""} ${listing.description || ""}`.toLowerCase();

  if (CLASSIFIEDS_HIGH_RISK_CATEGORIES.has(listing.category)) {
    warnings.push("High-risk category. Verify documents and avoid advance payment.");
  }
  if (/advance payment|registration fee|telegram only|whatsapp only|guaranteed job|otp|remote access/i.test(text)) {
    warnings.push("Possible scam keywords detected. Proceed only after verification.");
  }
  if (!listing.image && !(listing.mediaGallery || []).length) {
    warnings.push("No photos available. Ask for real photos before visiting or paying.");
  }
  if (!listing.verified) {
    warnings.push("Seller/listing is not verified yet.");
  }
  return warnings;
};

export const buildWhatsAppListingMessage = (listing = {}) =>
  `Hi, I saw your listing on MGRAND HUB Classifieds: ${listing.title || "listing"}. Is it available? Location: ${
    listing.location || "not mentioned"
  }.`;

export const getListingLeadPriority = (listing = {}) => {
  const price = Number(listing.price || 0);
  const views = Number(listing.views || 0);
  const chats = Number(listing.chats || 0);
  const favorites = Number(listing.favorites || 0);
  const isHighRisk = CLASSIFIEDS_HIGH_RISK_CATEGORIES.has(listing.category);

  const score =
    (price >= 50000 ? 25 : 10) +
    Math.min(25, chats * 5) +
    Math.min(20, favorites * 3) +
    Math.min(15, views / 20) +
    (isHighRisk ? 15 : 0);

  if (score >= 65) return { label: "Hot lead", level: "hot", score: Math.round(score) };
  if (score >= 35) return { label: "Warm lead", level: "warm", score: Math.round(score) };
  return { label: "Normal", level: "normal", score: Math.round(score) };
};

export const validateClassifiedsForm = (form = {}) => {
  const errors = {};
  if (!String(form.title || "").trim() || String(form.title || "").trim().length < 8) {
    errors.title = "Enter a clear title with at least 8 characters.";
  }
  if (!String(form.description || "").trim() || String(form.description || "").trim().length < 25) {
    errors.description = "Add condition, reason, and exact details.";
  }
  if (!Number(form.price) || Number(form.price) < 1) {
    errors.price = "Enter a valid price.";
  }
  if (!String(form.location || "").trim()) {
    errors.location = "Enter locality or district.";
  }
  if (
    CLASSIFIEDS_HIGH_RISK_CATEGORIES.has(form.category) &&
    !String(form.phone || form.contactPhone || "").trim()
  ) {
    errors.phone = "Phone verification is recommended for this category.";
  }
  return { isValid: Object.keys(errors).length === 0, errors };
};
