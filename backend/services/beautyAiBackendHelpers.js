const LANGUAGE_NAMES = {
  ml: "Malayalam",
  en: "English",
  hi: "Hindi",
};

const EVENT_LABELS = {
  "daily-glow": "Daily glow",
  bridal: "Bridal glow",
  festival: "Festival look",
  interview: "Interview look",
  college: "College fresh look",
  "teen-acne": "Teen acne care",
  "men-grooming": "Men grooming",
};

const normalizeText = (value = "") => String(value || "").trim();

const summarizeSafety = (safety = {}) => {
  const notes = [];

  if (safety.sensitiveSkin) {
    notes.push("sensitive skin");
  }
  if (safety.pregnantOrBreastfeeding) {
    notes.push("pregnant or breastfeeding");
  }
  if (safety.usingSkinMedicine) {
    notes.push("already using skin medicine");
  }
  if (normalizeText(safety.knownAllergy)) {
    notes.push(`known allergy: ${normalizeText(safety.knownAllergy)}`);
  }

  return notes.join("; ");
};

const validateBeautyPayload = (payload = {}) => {
  const errors = [];

  if (!normalizeText(payload.concern)) errors.push("Concern is required.");
  if (!normalizeText(payload.skinType)) errors.push("Skin type is required.");
  if (!normalizeText(payload.budget)) errors.push("Budget is required.");
  if (!normalizeText(payload.eventType)) errors.push("Event type is required.");
  if (!normalizeText(payload.language)) errors.push("Language is required.");

  if (payload.notes && String(payload.notes).length > 800) {
    errors.push("Notes too long.");
  }

  const allergy = normalizeText(payload?.safety?.knownAllergy);
  if (allergy.length > 120) {
    errors.push("Allergy details too long.");
  }

  return { ok: errors.length === 0, errors };
};

const buildBeautyPrompt = (payload = {}) => {
  const language = LANGUAGE_NAMES[payload.language] || LANGUAGE_NAMES.en;
  const eventLabel = EVENT_LABELS[payload.eventType] || "Custom beauty event";
  const safety = summarizeSafety(payload.safety);
  const selfieSignals = payload.selfieSignals || {};

  return [
    `Create a safe skincare and grooming plan in ${language}.`,
    `Concern: ${normalizeText(payload.concern) || "general-care"}`,
    `Skin type: ${normalizeText(payload.skinType) || "normal"}`,
    `Budget: ${normalizeText(payload.budget) || "medium"}`,
    `Event: ${eventLabel}`,
    `User notes: ${normalizeText(payload.notes) || "none"}`,
    `Safety: ${safety || "no special safety flags"}`,
    `Image signals (non-medical): redness=${Number(selfieSignals.rednessScore || 0).toFixed(2)}, texture=${Number(selfieSignals.textureScore || 0).toFixed(2)}, brightness=${Number(selfieSignals.brightnessScore || 0).toFixed(2)}`,
    "Rules:",
    "- Do not prescribe medicines.",
    "- Do not recommend steroid creams, bleaching creams, or unknown fairness creams.",
    "- Include morning routine, night routine, avoid list, product categories, and event timeline tips.",
    "- Add dermatologist escalation note for severe acne, allergy, infection, pregnancy, or current medicine use.",
    "Return JSON with fields: title, score, summary, morning[], night[], avoid[], products[].",
  ].join("\n");
};

module.exports = {
  buildBeautyPrompt,
  validateBeautyPayload,
};
