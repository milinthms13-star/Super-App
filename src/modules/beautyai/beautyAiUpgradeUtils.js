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

export const BEAUTY_CONCERNS = [
  "Acne",
  "Dark Spots",
  "Pigmentation",
  "Dry Skin",
  "Oily Skin",
  "Dandruff",
  "Hair Fall",
  "Frizz",
];

export const DEFAULT_WEEK = Array.from({ length: 7 }, (_, index) => ({
  day: index + 1,
  completed: false,
  note: "",
  score: 0,
}));

export const buildBeautyRequest = (form, selfieMeta = {}, selfieSignals = {}) => ({
  language: form.language,
  concern: form.concern,
  selectedConcerns: Array.isArray(form.selectedConcerns) ? form.selectedConcerns : [],
  gender: String(form.gender || ""),
  age: Number(form.age || 0) || null,
  budget: form.budget,
  eventType: form.eventType,
  skinType: form.skinType,
  hairType: form.hairType,
  notes: String(form.notes || "").trim(),
  preference: "balanced",
  safety: {
    sensitiveSkin: Boolean(form.sensitiveSkin),
    knownAllergy: String(form.knownAllergy || "").trim(),
    pregnantOrBreastfeeding: Boolean(form.pregnantOrBreastfeeding),
    usingSkinMedicine: Boolean(form.usingSkinMedicine),
  },
  selfieMeta,
  selfieSignals,
});

export const getSafetyWarnings = (form = {}) => {
  const warnings = [];
  if (form.sensitiveSkin || form.skinType === "sensitive") {
    warnings.push("Patch test every new product for 24 hours before face use.");
  }
  if (form.pregnantOrBreastfeeding) {
    warnings.push("Avoid strong active ingredients unless approved by a doctor.");
  }
  if (form.usingSkinMedicine) {
    warnings.push("Do not mix skin medicines with new active products without dermatologist advice.");
  }
  if (String(form.knownAllergy || "").trim()) {
    warnings.push(`Avoid products containing: ${String(form.knownAllergy).trim()}.`);
  }
  return warnings;
};

const textByLanguage = (language, ml, en, hi = en) => {
  if (language === "ml") return ml;
  if (language === "hi") return hi;
  return en;
};

export const getMalayalamHelperPrompts = () => [
  "എന്റെ മുഖത്ത് പിമ്പിൾ ഉണ്ട്",
  "എനിക്ക് natural remedy വേണം",
  "Wedding glow plan വേണം",
];

export const getBeautyPlanFallback = (form, score = 70) => ({
  title: textByLanguage(
    form.language,
    "നിങ്ങളുടെ സുരക്ഷിത ബ്യൂട്ടി പ്ലാൻ",
    "Your Safe Beauty Plan",
    "आपका सुरक्षित ब्यूटी प्लान"
  ),
  score,
  summary: textByLanguage(
    form.language,
    "ഇത് പൊതുവായ beauty guidance ആണ്. ഗുരുതര പ്രശ്നങ്ങൾക്ക് ഡെർമറ്റോളജിസ്റ്റിനെ കാണുക.",
    "This is general beauty guidance. Consult a dermatologist for severe concerns.",
    "यह सामान्य ब्यूटी मार्गदर्शन है। गंभीर समस्या में डर्मेटोलॉजिस्ट से सलाह लें।"
  ),
  morning: [
    textByLanguage(form.language, "മൃദുവായ face wash ഉപയോഗിക്കുക", "Use a gentle face wash"),
    textByLanguage(form.language, "ലഘുവായ moisturizer ഇടുക", "Apply a light moisturizer"),
    textByLanguage(form.language, "പകൽ സമയത്ത് sunscreen നിർബന്ധം", "Use sunscreen during daytime"),
  ],
  night: [
    textByLanguage(form.language, "ഉറങ്ങുന്നതിന് മുമ്പ് മുഖം വൃത്തിയാക്കുക", "Clean your face before sleep"),
    textByLanguage(form.language, "രാത്രിയിൽ routine ലളിതമാക്കുക", "Keep your night routine simple"),
    textByLanguage(form.language, "7 ദിവസത്തിന് ശേഷം progress photo എടുക്കുക", "Take a progress photo after 7 days"),
  ],
  hair: [
    textByLanguage(form.language, "Mild shampoo routine", "Mild shampoo routine"),
    textByLanguage(form.language, "Condition hair lengths", "Condition hair lengths"),
    textByLanguage(form.language, "Consult a doctor if hair fall is severe", "Consult a doctor if hair fall is severe"),
  ],
  avoid: [
    "Do not use steroid creams without dermatologist advice.",
    "Avoid bleaching creams and unknown fairness products.",
    "Avoid any ingredient that has caused allergy before.",
  ],
  products: [
    "Gentle cleanser",
    "Non-comedogenic moisturizer",
    "SPF 30+ sunscreen",
  ],
  eventPlan: ["Follow routine daily", "Sleep 7+ hours", "Hydrate consistently"],
});

export const shareBeautyPlanWhatsApp = (plan) => {
  if (typeof window === "undefined" || !plan) return;
  const lines = [
    plan.title || "Beauty Plan",
    `Care score: ${Number(plan.score || 0)}/100`,
    "Morning:",
    ...(plan.morning || []).map((step, index) => `${index + 1}. ${step}`),
    "Night:",
    ...(plan.night || []).map((step, index) => `${index + 1}. ${step}`),
    "Avoid:",
    ...(plan.avoid || []).map((step, index) => `${index + 1}. ${step}`),
  ];
  window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
};

export const calculateProgressScore = (entries = []) => {
  if (!entries.length) return 0;
  const completed = entries.filter((entry) => entry.completed).length;
  return Math.round((completed / entries.length) * 100);
};

const buildImageDataFromFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not read selfie image."));
      image.src = String(reader.result || "");
    };
    reader.onerror = () => reject(new Error("Could not load selfie file."));
    reader.readAsDataURL(file);
  });

export const extractSelfieSignals = async (file) => {
  if (!file || typeof window === "undefined") {
    return {
      rednessScore: 0.3,
      textureScore: 0.3,
      brightnessScore: 0.5,
      confidence: 0.4,
    };
  }

  const image = await buildImageDataFromFile(file);
  const canvas = document.createElement("canvas");
  const maxWidth = 220;
  const scale = Math.min(1, maxWidth / Math.max(1, image.width));
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return {
      rednessScore: 0.3,
      textureScore: 0.3,
      brightnessScore: 0.5,
      confidence: 0.35,
    };
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);

  let brightness = 0;
  let redness = 0;
  let roughness = 0;
  let previousLuma = 0;
  const pixelCount = Math.max(1, width * height);

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    brightness += luma / 255;
    redness += Math.max(0, red - ((green + blue) / 2)) / 255;
    roughness += Math.abs(luma - previousLuma) / 255;
    previousLuma = luma;
  }

  return {
    rednessScore: Number((redness / pixelCount).toFixed(3)),
    textureScore: Number((roughness / pixelCount).toFixed(3)),
    brightnessScore: Number((brightness / pixelCount).toFixed(3)),
    confidence: 0.65,
  };
};
