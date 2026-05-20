const MONEY_SCAM_PATTERNS = [
  /urgent\s+(money|transfer|payment)/i,
  /send\s+(money|cash|upi|crypto|gift card)/i,
  /western union|gift card|crypto|bitcoin/i,
  /medical emergency.*money/i,
];

function calculateProfileRiskScore(profile = {}) {
  let risk = 0;
  const text = `${profile.bio || ""} ${profile.familyDetails || ""} ${profile.profession || ""}`;

  if (!profile.photoUrl && !profile.photo) risk += 15;
  if (!profile.phoneVerified && !profile.phone) risk += 20;
  if (!profile.emailVerified && !profile.email) risk += 10;
  if (!profile.familyDetails || String(profile.familyDetails).length < 40) risk += 15;
  if (MONEY_SCAM_PATTERNS.some((pattern) => pattern.test(text))) risk += 40;
  if (Number(profile.reportCount || 0) >= 2) risk += 30;

  return Math.min(100, risk);
}

function getProfileModerationStatus(profile = {}) {
  const riskScore = calculateProfileRiskScore(profile);
  if (riskScore >= 70) return { status: "hold_for_review", riskScore };
  if (riskScore >= 40) return { status: "manual_check", riskScore };
  return { status: "approved", riskScore };
}

function validateMatrimonialContactRequest({ requester, targetProfile, interestAccepted }) {
  if (!requester) return { ok: false, message: "Login required." };
  if (!targetProfile) return { ok: false, message: "Profile not found." };
  if (targetProfile.privacy?.hidePhone && !interestAccepted) {
    return { ok: false, message: "Contact visible only after accepted interest." };
  }
  if (targetProfile.contactVisibility === "premium_required" && !requester.hasMatrimonialPremium) {
    return { ok: false, message: "Premium plan required to view contact." };
  }
  return { ok: true };
}

function sanitizeMatrimonialMessage(message = "") {
  return String(message).replace(/<[^>]*>/g, "").replace(/[<>]/g, "").trim().slice(0, 500);
}

module.exports = {
  calculateProfileRiskScore,
  getProfileModerationStatus,
  validateMatrimonialContactRequest,
  sanitizeMatrimonialMessage,
};
