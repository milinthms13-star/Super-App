export const BEAUTY_LANGUAGES = [
  { value: "ml", label: "Malayalam" },
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
];

export const BEAUTY_EVENTS = [
  { value: "daily-glow", label: "Daily glow" },
  { value: "bridal", label: "Bridal glow" },
  { value: "festival", label: "Festival look" },
  { value: "interview", label: "Interview look" },
  { value: "college", label: "College fresh look" },
  { value: "teen-acne", label: "Teen acne care" },
  { value: "men-grooming", label: "Men grooming" },
];

export const buildBeautyRequest = (form) => ({
  language: form.language,
  concern: form.concern,
  budget: form.budget,
  eventType: form.eventType,
  skinType: form.skinType,
  notes: form.notes?.trim(),
  safety: {
    sensitiveSkin: Boolean(form.sensitiveSkin),
    knownAllergy: form.knownAllergy?.trim(),
    pregnantOrBreastfeeding: Boolean(form.pregnantOrBreastfeeding),
    usingSkinMedicine: Boolean(form.usingSkinMedicine),
  },
});

export const getSafetyWarnings = (form) => {
  const warnings = [];
  if (form.sensitiveSkin || form.skinType === "sensitive") {
    warnings.push("Patch test every new product for 24 hours before applying on face.");
  }
  if (form.pregnantOrBreastfeeding) {
    warnings.push("Avoid strong actives unless approved by a doctor.");
  }
  if (form.usingSkinMedicine) {
    warnings.push("Do not mix acne/skin medicines with new actives without dermatologist advice.");
  }
  if (form.knownAllergy?.trim()) {
    warnings.push(`Avoid products containing: ${form.knownAllergy.trim()}.`);
  }
  return warnings;
};

const text = (language, ml, en, hi = en) => {
  if (language === "ml") return ml;
  if (language === "hi") return hi;
  return en;
};

export const getBeautyPlanFallback = (form) => {
  const isMalayalam = form.language === "ml";
  const title = text(
    form.language,
    "നിങ്ങളുടെ സുരക്ഷിത ബ്യൂട്ടി പ്ലാൻ",
    "Your Safe Beauty Plan",
    "आपका सुरक्षित ब्यूटी प्लान"
  );

  const acneMorning = text(
    form.language,
    "മൃദുവായ face wash ഉപയോഗിക്കുക",
    "Use a gentle face wash",
    "जेंटल फेस वॉश इस्तेमाल करें"
  );

  return {
    title,
    score: form.selfie ? 78 : 68,
    summary: isMalayalam
      ? "ഇത് പൊതുവായ beauty guidance ആണ്. serious skin issue ഉണ്ടെങ്കിൽ dermatologist നെ കാണുക."
      : "This is general beauty guidance. Consult a dermatologist for serious skin concerns.",
    morning: [
      acneMorning,
      text(form.language, "ലഘുവായ moisturizer ഇടുക", "Apply light moisturizer", "हल्का मॉइस्चराइज़र लगाएं"),
      text(form.language, "പകൽ sunscreen നിർബന്ധം", "Use sunscreen during daytime", "दिन में सनस्क्रीन लगाएं"),
    ],
    night: [
      text(form.language, "Makeup/വെളിയിലത്തെ dust നീക്കം ചെയ്യുക", "Clean face before sleep", "सोने से पहले चेहरा साफ करें"),
      text(form.language, "Heavy cream ഒഴിവാക്കി simple routine പാലിക്കുക", "Keep routine simple and non-heavy", "रूटीन सिंपल रखें"),
      text(form.language, "7 ദിവസം progress photo എടുക്കുക", "Take progress photo after 7 days", "7 दिन बाद प्रोग्रेस फोटो लें"),
    ],
    avoid: [
      text(form.language, "Steroid cream doctor advice ഇല്ലാതെ ഉപയോഗിക്കരുത്", "Do not use steroid creams without doctor advice", "डॉक्टर सलाह बिना स्टेरॉयड क्रीम न लगाएं"),
      text(form.language, "Unknown fairness/bleaching cream ഒഴിവാക്കുക", "Avoid unknown fairness/bleaching creams", "अनजान फेयरनेस/ब्लीच क्रीम से बचें"),
      text(form.language, "Allergy ഉള്ള ingredient ഒഴിവാക്കുക", "Avoid ingredients you are allergic to", "एलर्जी वाले ingredients से बचें"),
    ],
    products: [
      { name: "Gentle cleanser", type: "cleanser" },
      { name: "Non-comedogenic moisturizer", type: "moisturizer" },
      { name: "SPF 30+ sunscreen", type: "sunscreen" },
    ],
  };
};

export const shareBeautyPlanWhatsApp = (plan) => {
  const lines = [
    plan.title,
    `Care score: ${plan.score}/100`,
    "Morning:",
    ...plan.morning.map((step, index) => `${index + 1}. ${step}`),
    "Night:",
    ...plan.night.map((step, index) => `${index + 1}. ${step}`),
  ];
  window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
};

export const calculateProgressScore = (entries = []) => {
  if (!entries.length) return 0;
  const completed = entries.filter((entry) => entry.completed).length;
  return Math.round((completed / entries.length) * 100);
};
