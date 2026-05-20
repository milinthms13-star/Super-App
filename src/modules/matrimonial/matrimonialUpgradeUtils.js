export const MATRIMONIAL_PRIVACY_DEFAULTS = {
  hidePhone: true,
  hideEmail: true,
  showPhotoTo: "verified_matches",
  contactVisibility: "premium_required",
  allowWhatsappAfterInterestAccepted: true,
};

export const calculateMatrimonialTrustScore = (profile = {}) => {
  const checks = [
    profile.kycStatus === "verified" || profile.verified,
    profile.photoUrl || profile.photo,
    profile.phoneVerified || profile.phone,
    profile.emailVerified || profile.email,
    profile.horoscope?.birthDate || profile.dob,
    profile.familyDetails && String(profile.familyDetails).length > 40,
    profile.education,
    profile.profession,
  ];

  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const label = score >= 80 ? "High trust" : score >= 55 ? "Good trust" : "Needs verification";
  return { score, label };
};

export const buildMatrimonialWhatsAppMessage = (profile) => {
  const name = profile?.name || "your profile";
  const location = profile?.location ? ` from ${profile.location}` : "";
  return encodeURIComponent(
    `Hi, I saw ${name}${location} on NilaHub SoulMatch. We are interested to know more if your family is comfortable.`
  );
};

export const openMatrimonialWhatsApp = (phone, profile) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return false;
  const localNumber = digits.length === 10 ? `91${digits}` : digits;
  window.open(
    `https://wa.me/${localNumber}?text=${buildMatrimonialWhatsAppMessage(profile)}`,
    "_blank",
    "noopener,noreferrer"
  );
  return true;
};

export const getMatchVerdict = (score = 0) => {
  if (score >= 85) return { label: "Excellent match", tone: "excellent" };
  if (score >= 70) return { label: "Strong match", tone: "strong" };
  if (score >= 50) return { label: "Possible match", tone: "possible" };
  return { label: "Low match", tone: "low" };
};

export const validateMatrimonialInterestNote = (note = "") => {
  const cleaned = String(note || "").trim();
  if (cleaned.length > 300) return "Interest note must be below 300 characters.";
  const riskyTerms = [/money/i, /urgent transfer/i, /crypto/i, /gift card/i, /loan/i];
  if (riskyTerms.some((pattern) => pattern.test(cleaned))) {
    return "Avoid money or transaction requests in matrimonial messages.";
  }
  return "";
};
