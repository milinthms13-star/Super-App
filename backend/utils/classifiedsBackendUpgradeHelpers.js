const HIGH_RISK_CATEGORIES = new Set([
  "Jobs",
  "Properties",
  "Rentals",
  "Vehicles",
  "Business for Sale",
  "Pets",
]);

const SUSPICIOUS_PATTERNS = [
  /advance\s*payment/i,
  /registration\s*fee/i,
  /guaranteed\s*job/i,
  /telegram\s*only/i,
  /otp/i,
  /remote\s*access/i,
  /bank\s*password/i,
  /crypto\s*only/i,
];

const calculateClassifiedRiskScore = (listing = {}) => {
  const text = `${listing.title || ""} ${listing.description || ""}`;
  let score = 0;
  const flags = [];

  if (HIGH_RISK_CATEGORIES.has(listing.category)) {
    score += 20;
    flags.push("HIGH_RISK_CATEGORY");
  }
  if (!listing.image && !listing.mediaCount && !(listing.mediaGallery || []).length) {
    score += 15;
    flags.push("NO_MEDIA");
  }
  if (!listing.phone && !listing.contactPhone) {
    score += 10;
    flags.push("NO_PHONE");
  }
  SUSPICIOUS_PATTERNS.forEach((pattern) => {
    if (pattern.test(text)) {
      score += 25;
      flags.push(`TEXT_${pattern.source}`.slice(0, 40));
    }
  });

  const normalizedScore = Math.min(100, score);
  return {
    score: normalizedScore,
    flags,
    moderationStatus: normalizedScore >= 50 ? "pending" : "approved",
    safetyLabel: normalizedScore >= 70 ? "High risk" : normalizedScore >= 35 ? "Review needed" : "Normal",
  };
};

const sanitizeClassifiedContact = (contact = {}) => ({
  phone: String(contact.phone || contact.contactPhone || "").replace(/[^0-9+]/g, "").slice(0, 15),
  email: String(contact.email || "").trim().toLowerCase().slice(0, 120),
  whatsappNumber: String(contact.whatsappNumber || "").replace(/[^0-9+]/g, "").slice(0, 15),
});

const buildClassifiedLeadPriority = (listing = {}) => {
  const price = Number(listing.price || 0);
  const score =
    (price >= 100000 ? 25 : price >= 25000 ? 15 : 5) +
    Math.min(25, Number(listing.chats || 0) * 5) +
    Math.min(20, Number(listing.favorites || 0) * 3) +
    Math.min(15, Number(listing.views || 0) / 20) +
    (HIGH_RISK_CATEGORIES.has(listing.category) ? 15 : 0);

  if (score >= 65) return { level: "hot", label: "Hot lead", score: Math.round(score) };
  if (score >= 35) return { level: "warm", label: "Warm lead", score: Math.round(score) };
  return { level: "normal", label: "Normal", score: Math.round(score) };
};

module.exports = {
  calculateClassifiedRiskScore,
  sanitizeClassifiedContact,
  buildClassifiedLeadPriority,
};
