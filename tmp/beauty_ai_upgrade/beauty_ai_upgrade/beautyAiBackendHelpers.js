const LANGUAGE_NAMES = { ml: "Malayalam", en: "English", hi: "Hindi" };

const safetyPrefix = (safety = {}) => {
  const notes = [];
  if (safety.sensitiveSkin) notes.push("user has sensitive skin");
  if (safety.pregnantOrBreastfeeding) notes.push("user is pregnant or breastfeeding; avoid strong actives");
  if (safety.usingSkinMedicine) notes.push("user is already using skin medicine; avoid mixing active ingredients");
  if (safety.knownAllergy) notes.push(`known allergy: ${safety.knownAllergy}`);
  return notes.join("; ");
};

function buildBeautyPrompt(payload) {
  const language = LANGUAGE_NAMES[payload.language] || "English";
  return `Create a safe, child-friendly if teen, non-medical beauty/skincare plan in ${language}.
Concern: ${payload.concern}
Skin type: ${payload.skinType}
Budget: ${payload.budget}
Event: ${payload.eventType}
User notes: ${payload.notes || "none"}
Safety: ${safetyPrefix(payload.safety) || "no special safety flags"}
Rules:
- Do not prescribe medicines.
- Do not recommend steroid, bleaching, unknown fairness creams.
- Include morning routine, night routine, avoid list, product category suggestions.
- Mention dermatologist advice for severe acne, allergy, infection, pregnancy, or medicine use.
Return JSON with title, score, summary, morning[], night[], avoid[], products[].`;
}

function validateBeautyPayload(payload = {}) {
  const errors = [];
  if (!payload.concern) errors.push("Concern is required");
  if (!payload.skinType) errors.push("Skin type is required");
  if (payload.notes && payload.notes.length > 800) errors.push("Notes too long");
  if (payload.safety?.knownAllergy && payload.safety.knownAllergy.length > 120) errors.push("Allergy text too long");
  return { ok: errors.length === 0, errors };
}

module.exports = { buildBeautyPrompt, validateBeautyPayload };
