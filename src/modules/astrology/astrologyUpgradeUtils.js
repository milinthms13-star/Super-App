export const ASTROLOGY_PRIMARY_TABS = [
  { key: "today", label: "Today", labelMl: "\u0d07\u0d28\u0d4d\u0d28\u0d4d", icon: "1" },
  { key: "kundli", label: "Birth Chart", labelMl: "\u0d1c\u0d28\u0d28 \u0d1a\u0d3e\u0d7c\u0d1f\u0d4d\u0d1f\u0d4d", icon: "2" },
  { key: "finance", label: "Finance", labelMl: "\u0d27\u0d28\u0d02", icon: "3" },
  { key: "career", label: "Career", labelMl: "\u0d24\u0d4a\u0d34\u0d3f\u0d7d", icon: "4" },
  { key: "match", label: "Marriage", labelMl: "\u0d35\u0d3f\u0d35\u0d3e\u0d39\u0d02", icon: "5" },
  { key: "remedies", label: "Remedies", labelMl: "\u0d2a\u0d30\u0d3f\u0d39\u0d3e\u0d30\u0d02", icon: "6" },
  { key: "consult", label: "Consult", labelMl: "\u0d15\u0d7a\u0d7e\u0d38\u0d7c\u0d1f\u0d4d", icon: "7" },
  { key: "ai", label: "Ask AI", labelMl: "AI \u0d1a\u0d4b\u0d26\u0d3f\u0d15\u0d4d\u0d15\u0d42", icon: "8" },
  { key: "saved", label: "Saved", labelMl: "\u0d38\u0d47\u0d35\u0d4d \u0d1a\u0d46\u0d2f\u0d4d\u0d24\u0d24\u0d4d", icon: "9" },
];

const RASHI_BY_MONTH = [
  "Capricorn",
  "Aquarius",
  "Pisces",
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
];

const NAKSHATRAS = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
];

export function getAstrologyMissingFields(profile = {}) {
  const missing = [];
  if (!profile.birthDate) missing.push("DOB");
  if (!profile.birthTime) missing.push("Birth time");
  if (!profile.birthPlace) missing.push("Birth place");
  if (!profile.gender) missing.push("Gender");
  return missing;
}

export function normalizeAstrologyProfilePayload(profile = {}) {
  return {
    birthDate: String(profile.birthDate || "").trim(),
    birthTime: String(profile.birthTime || "").trim(),
    birthPlace: String(profile.birthPlace || "").trim(),
    birthTimezone: String(profile.birthTimezone || "Asia/Kolkata").trim(),
    gender: String(profile.gender || "").trim(),
    nakshatra: String(profile.nakshatra || "").trim(),
    rashi: String(profile.rashi || "").trim(),
    lagna: String(profile.lagna || "").trim(),
  };
}

export function buildAstrologyPreview(profile = {}, selectedSign = "aries") {
  const date = new Date(profile.birthDate || Date.now());
  const monthIndex = Number.isFinite(date.getMonth()) ? date.getMonth() : 0;
  const day = Number.isFinite(date.getDate()) ? date.getDate() : 1;
  const hour = Number(String(profile.birthTime || "06:00").split(":")[0] || 6);
  const nakshatraIndex = Math.abs(monthIndex * 2 + day + hour) % NAKSHATRAS.length;

  return {
    rashi: profile.rashi || RASHI_BY_MONTH[monthIndex] || selectedSign,
    nakshatra: profile.nakshatra || NAKSHATRAS[nakshatraIndex],
    lagna: profile.lagna || getLagnaFromHour(hour),
    luckyColor: getLuckyColor(selectedSign),
    bestTime: hour < 12 ? "7:30 AM - 9:00 AM" : "6:00 PM - 7:30 PM",
  };
}

function getLagnaFromHour(hour) {
  const signs = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
  ];
  return signs[Math.abs(Math.floor(hour / 2)) % signs.length];
}

function getLuckyColor(sign = "aries") {
  const colors = {
    aries: "Red",
    taurus: "Green",
    gemini: "Yellow",
    cancer: "White",
    leo: "Gold",
    virgo: "Light green",
    libra: "Pink",
    scorpio: "Maroon",
    sagittarius: "Saffron",
    capricorn: "Blue",
    aquarius: "Purple",
    pisces: "Sea green",
  };
  return colors[String(sign).toLowerCase()] || "Gold";
}

export function getAstrologyUpsellMessage(language = "en") {
  if (language === "ml") {
    return "à´«àµà´°àµ€ à´ªàµà´°à´¿à´µàµà´¯àµ‚à´•àµà´•àµ à´¶àµ‡à´·à´‚ à´œà´¨à´¨à´šà´¾àµ¼à´Ÿàµà´Ÿàµ, à´§à´¨à´«à´²à´‚, à´µà´¿à´µà´¾à´¹ à´ªàµŠà´°àµà´¤àµà´¤à´‚, à´ªà´°à´¿à´¹à´¾à´°à´™àµà´™àµ¾ à´Žà´¨àµà´¨à´¿à´µ à´µà´¿à´¶à´¦à´®à´¾à´¯à´¿ à´ªàµ†à´¯àµà´¡àµ à´±à´¿à´ªàµà´ªàµ‹àµ¼à´Ÿàµà´Ÿà´¾à´¯à´¿ à´…àµºà´²àµ‹à´•àµà´•àµ à´šàµ†à´¯àµà´¯à´¾à´‚.";
  }
  return "After the free preview, unlock detailed birth chart, finance reading, marriage match and remedies as a paid report.";
}

export function buildAstrologyPaymentPlans() {
  return [
    { id: "daily", title: "Daily Premium", price: 49, features: ["Today reading", "Lucky time", "Remedy"] },
    {
      id: "full",
      title: "Full Life Report",
      price: 299,
      features: ["Birth chart", "Finance", "Career", "Marriage", "PDF"],
    },
    {
      id: "consult",
      title: "Astrologer Consult",
      price: 799,
      features: ["30 min call", "Personal remedies", "Follow-up note"],
    },
  ];
}


