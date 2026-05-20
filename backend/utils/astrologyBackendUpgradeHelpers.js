function validateAstrologyProfileInput(body = {}) {
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.birthDate || ""))) {
    errors.push("Valid birthDate is required.");
  }
  if (!/^\d{2}:\d{2}/.test(String(body.birthTime || ""))) {
    errors.push("Valid birthTime is required.");
  }
  if (String(body.birthPlace || "").trim().length < 2) {
    errors.push("birthPlace is required.");
  }
  if (!String(body.gender || "").trim()) {
    errors.push("gender is required.");
  }
  if (String(body.question || "").length > 500) {
    errors.push("Question is too long.");
  }
  return { ok: errors.length === 0, errors };
}

function buildAstrologyReportPayload(profile = {}, plan = "free") {
  return {
    profile: {
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      birthPlace: profile.birthPlace,
      birthTimezone: profile.birthTimezone || "Asia/Kolkata",
      gender: profile.gender,
      rashi: profile.rashi,
      nakshatra: profile.nakshatra,
      lagna: profile.lagna,
    },
    plan,
    sections:
      plan === "free"
        ? ["today", "luckyTime", "oneRemedy"]
        : ["birthChart", "career", "finance", "marriage", "remedies", "pdf"],
    disclaimer: getAstrologyLegalDisclaimer(),
  };
}

function getAstrologyLegalDisclaimer() {
  return "Astrology content is for spiritual/personal guidance only and is not financial, medical, or legal advice.";
}

function astrologyRateLimitKey(req) {
  return `astro:${req.user?.id || req.ip}`;
}

module.exports = {
  validateAstrologyProfileInput,
  buildAstrologyReportPayload,
  getAstrologyLegalDisclaimer,
  astrologyRateLimitKey,
};

