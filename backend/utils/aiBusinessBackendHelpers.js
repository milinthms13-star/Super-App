const sanitizeText = (value, maxLength = 240) =>
  String(value || "")
    .replace(/[<>`{}[\]|$]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function validateBusinessProfilePayload(payload = {}) {
  const errors = [];
  const businessName = sanitizeText(payload.businessName, 120);
  const businessType = sanitizeText(payload.businessType, 40);
  const location = sanitizeText(payload.location, 120);
  const phone = String(payload.phone || "").replace(/[^\d+]/g, "").slice(0, 15);
  const budget = toNumber(payload.budget, 0);

  if (!businessName) errors.push("businessName is required.");
  if (!businessType) errors.push("businessType is required.");
  if (!location) errors.push("location is required.");
  if (phone && phone.length < 10) errors.push("phone must be at least 10 digits when provided.");
  if (budget < 0) errors.push("budget must be zero or positive.");

  return {
    valid: errors.length === 0,
    errors,
    normalized: {
      businessName,
      businessType,
      location,
      phone,
      gstin: sanitizeText(payload.gstin, 24),
      budget,
    },
  };
}

function buildWhatsAppCampaignPrompt(payload = {}) {
  const businessName = sanitizeText(payload.businessName || "Business", 80);
  const offer = sanitizeText(payload.offer || "Special offer", 160);
  const language = sanitizeText(payload.language || "en", 8).toLowerCase();
  const cta = sanitizeText(payload.cta || "Reply now to claim.", 120);
  return {
    language,
    prompt:
      language === "ml"
        ? `Malayalam campaign for ${businessName}: offer "${offer}". Include poster line, message, and CTA "${cta}".`
        : `English campaign for ${businessName}: offer "${offer}". Include poster line, message, and CTA "${cta}".`,
  };
}

function buildReorderRisk(items = [], defaultReorderLevel = 5) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      name: sanitizeText(item.name || "", 120),
      stock: toNumber(item.stock, 0),
      reorderLevel: toNumber(item.reorderLevel, defaultReorderLevel),
    }))
    .filter((item) => item.name)
    .map((item) => ({
      ...item,
      isAtRisk: item.stock <= item.reorderLevel,
      gap: Math.max(0, item.reorderLevel - item.stock),
    }));
}

module.exports = {
  validateBusinessProfilePayload,
  buildWhatsAppCampaignPrompt,
  buildReorderRisk,
};
