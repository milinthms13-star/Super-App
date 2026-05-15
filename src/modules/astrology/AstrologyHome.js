import React, { useEffect, useMemo, useState } from "react";
import HoroscopeCard from "./HoroscopeCard";
import { astrologyService } from "../../services/astrologyService";
import { useApp } from "../../contexts/AppContext";
import { useAstrologyConsultations } from "./hooks/useAstrologyConsultations";
import { useAstrologyKundliCompatibility } from "./hooks/useAstrologyKundliCompatibility";
import { useAstrologyProfile } from "./hooks/useAstrologyProfile";
import "../../styles/Astrology.css";

const FEATURE_TABS = [
  { key: "today", label: "Daily Horoscope", labelMl: "Dainamdina Phalam" },
  { key: "yearly", label: "Yearly Horoscope", labelMl: "Varshika Phalam" },
  { key: "total", label: "Total Life Reading", labelMl: "Jeevitha Vayanam" },
  { key: "kundli", label: "Birth Chart", labelMl: "Janana Chart" },
  { key: "career", label: "Career", labelMl: "Thozhil" },
  { key: "finance", label: "Finance", labelMl: "Dhanam" },
  { key: "match", label: "Marriage", labelMl: "Vivaham" },
  { key: "remedies", label: "Remedies", labelMl: "Pariharangal" },
  { key: "panchangam", label: "Panchangam", labelMl: "Panchangam" },
  { key: "ai", label: "AI Astrology", labelMl: "AI Jyothisham" },
  { key: "saved", label: "Saved Reports", labelMl: "Save Reports" },
];

const MOBILE_NAV_ITEMS = [
  { key: "today", label: "Home" },
  { key: "today", label: "Horoscope" },
  { key: "ai", label: "AI Astro" },
  { key: "remedies", label: "Remedies" },
  { key: "profile", label: "Profile" },
];

const GENDER_OPTIONS = [
  { value: "", label: "Select gender", labelMl: "Ã Â´Â²Ã Â´Â¿Ã Â´â€šÃ Â´â€”Ã Â´â€š Ã Â´Â¤Ã Â´Â¿Ã Â´Â°Ã Â´Å¾Ã ÂµÂÃ Â´Å¾Ã Âµâ€ Ã Â´Å¸Ã ÂµÂÃ Â´â€¢Ã ÂµÂÃ Â´â€¢Ã ÂµÂÃ Â´â€¢" },
  { value: "male", label: "Male", labelMl: "Ã Â´ÂªÃ ÂµÂÃ Â´Â°Ã ÂµÂÃ Â´Â·Ã ÂµÂ»" },
  { value: "female", label: "Female", labelMl: "Ã Â´Â¸Ã ÂµÂÃ Â´Â¤Ã ÂµÂÃ Â´Â°Ã Âµâ‚¬" },
  { value: "other", label: "Other", labelMl: "Ã Â´Â®Ã Â´Â±Ã ÂµÂÃ Â´Â±Ã ÂµÂÃ Â´Â³Ã ÂµÂÃ Â´Â³Ã Â´ÂµÃ ÂµÂ¼" },
];

const DEFAULT_BIRTH_TIME_ZONE = "Asia/Kolkata";

const BIRTH_TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "India (IST) - Asia/Kolkata" },
  { value: "Asia/Dubai", label: "UAE - Asia/Dubai" },
  { value: "Asia/Singapore", label: "Singapore - Asia/Singapore" },
  { value: "Europe/London", label: "UK - Europe/London" },
  { value: "America/New_York", label: "US Eastern - America/New_York" },
  { value: "America/Chicago", label: "US Central - America/Chicago" },
  { value: "America/Denver", label: "US Mountain - America/Denver" },
  { value: "America/Los_Angeles", label: "US Pacific - America/Los_Angeles" },
];

const BIRTH_LOCATION_OPTIONS = [
  { label: "Kollam, Kerala, India", timeZone: "Asia/Kolkata" },
  { label: "Thiruvananthapuram, Kerala, India", timeZone: "Asia/Kolkata" },
  { label: "Kochi, Kerala, India", timeZone: "Asia/Kolkata" },
  { label: "Kozhikode, Kerala, India", timeZone: "Asia/Kolkata" },
  { label: "Thrissur, Kerala, India", timeZone: "Asia/Kolkata" },
  { label: "Bengaluru, Karnataka, India", timeZone: "Asia/Kolkata" },
  { label: "Chennai, Tamil Nadu, India", timeZone: "Asia/Kolkata" },
  { label: "Dubai, UAE", timeZone: "Asia/Dubai" },
  { label: "Singapore", timeZone: "Asia/Singapore" },
  { label: "London, UK", timeZone: "Europe/London" },
  { label: "New York, USA", timeZone: "America/New_York" },
];
const getNakshatraFromSign = (sign) =>
  ({
    aries: "Ashwini",
    taurus: "Rohini",
    gemini: "Mrigashira",
    cancer: "Pushya",
    leo: "Magha",
    virgo: "Hasta",
    libra: "Chitra",
    scorpio: "Anuradha",
    sagittarius: "Mula",
    capricorn: "Shravana",
    aquarius: "Shatabhisha",
    pisces: "Revati",
  }[sign] || "Ashwini");

const getRashiFromSign = (sign) =>
  ({
    aries: "Mesha",
    taurus: "Vrishabha",
    gemini: "Mithuna",
    cancer: "Karka",
    leo: "Simha",
    virgo: "Kanya",
    libra: "Tula",
    scorpio: "Vrischika",
    sagittarius: "Dhanu",
    capricorn: "Makara",
    aquarius: "Kumbha",
    pisces: "Meena",
  }[sign] || "Mesha");

const getSignFromRashi = (rashi = "") =>
  ({
    mesha: "aries",
    vrishabha: "taurus",
    mithuna: "gemini",
    karka: "cancer",
    simha: "leo",
    kanya: "virgo",
    tula: "libra",
    vrischika: "scorpio",
    dhanu: "sagittarius",
    makara: "capricorn",
    kumbha: "aquarius",
    meena: "pisces",
  }[String(rashi || "").trim().toLowerCase()] || "");

const getLagnaFromTime = (time) => {
  if (!time) return "Mesha";
  const hour = Number(time.split(":")[0] || 6);
  if (hour < 4) return "Meena";
  if (hour < 8) return "Mesha";
  if (hour < 12) return "Vrishabha";
  if (hour < 16) return "Karkata";
  if (hour < 20) return "Simha";
  return "Tula";
};

const NAKSHATRA_NAMES = [
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

const NAKSHATRA_DISPLAY_NAMES = {
  Ashwini: { en: "Aswathy", ml: "Aswathi" },
  Bharani: { en: "Bharani", ml: "Bharani" },
  Krittika: { en: "Karthika", ml: "Karthika" },
  Rohini: { en: "Rohini", ml: "Rohini" },
  Mrigashira: { en: "Makayiram", ml: "Makayiram" },
  Ardra: { en: "Thiruvathira", ml: "Thiruvathira" },
  Punarvasu: { en: "Punartham", ml: "Punartham" },
  Pushya: { en: "Pooyam", ml: "Pooyam" },
  Ashlesha: { en: "Aayilyam", ml: "Aayilyam" },
  Magha: { en: "Makam", ml: "Makam" },
  "Purva Phalguni": { en: "Pooram", ml: "Pooram" },
  "Uttara Phalguni": { en: "Uthram", ml: "Uthram" },
  Hasta: { en: "Atham", ml: "Atham" },
  Chitra: { en: "Chithira", ml: "Chithira" },
  Swati: { en: "Chothi", ml: "Chothi" },
  Vishakha: { en: "Vishakham", ml: "Vishakham" },
  Anuradha: { en: "Anizham", ml: "Anizham" },
  Jyeshtha: { en: "Thriketta", ml: "Thriketta" },
  Mula: { en: "Moolam", ml: "Moolam" },
  "Purva Ashadha": { en: "Pooradam", ml: "Pooradam" },
  "Uttara Ashadha": { en: "Uthradam", ml: "Uthradam" },
  Shravana: { en: "Thiruvonam", ml: "Thiruvonam" },
  Dhanishta: { en: "Avittam", ml: "Avittam" },
  Shatabhisha: { en: "Chathayam", ml: "Chathayam" },
  "Purva Bhadrapada": { en: "Pooruruttathi", ml: "Pooruruttathi" },
  "Uttara Bhadrapada": { en: "Uthrattathi", ml: "Uthrattathi" },
  Revati: { en: "Revathi", ml: "Revathi" },
};

const normalizeLookupToken = (value) => String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");

const NAKSHATRA_ALIASES = {
  aswathi: "Ashwini",
  ashwathi: "Ashwini",
  aswathy: "Ashwini",
  ashwathy: "Ashwini",
  karthika: "Krittika",
  makayiram: "Mrigashira",
  thiruvathira: "Ardra",
  punartham: "Punarvasu",
  pooyam: "Pushya",
  aayilyam: "Ashlesha",
  makham: "Magha",
  pooram: "Purva Phalguni",
  uthram: "Uttara Phalguni",
  atham: "Hasta",
  chithira: "Chitra",
  chothi: "Swati",
  vishakham: "Vishakha",
  anizham: "Anuradha",
  thrikketta: "Jyeshtha",
  trikketta: "Jyeshtha",
  thriketta: "Jyeshtha",
  triketta: "Jyeshtha",
  moolam: "Mula",
  pooradam: "Purva Ashadha",
  uthradam: "Uttara Ashadha",
  thiruvonam: "Shravana",
  tiruvonam: "Shravana",
  sravana: "Shravana",
  shravan: "Shravana",
  avittam: "Dhanishta",
  chathayam: "Shatabhisha",
  pooruruttathi: "Purva Bhadrapada",
  poorattathi: "Purva Bhadrapada",
  uthrattathi: "Uttara Bhadrapada",
  revathi: "Revati",
};

const getCanonicalNakshatraName = (value) => {
  const input = String(value || "").trim();
  if (!input) return "";
  const direct = NAKSHATRA_NAMES.find((item) => item.toLowerCase() === input.toLowerCase());
  if (direct) return direct;
  const token = normalizeLookupToken(input);
  const alias = NAKSHATRA_ALIASES[token];
  if (alias) return alias;
  const fromDisplay = NAKSHATRA_NAMES.find((item) => {
    const display = NAKSHATRA_DISPLAY_NAMES[item];
    return (
      normalizeLookupToken(display?.en) === token ||
      normalizeLookupToken(display?.ml) === token
    );
  });
  return fromDisplay || input;
};

const getNakshatraDisplayName = (value, language) => {
  const canonical = getCanonicalNakshatraName(value);
  const mapped = NAKSHATRA_DISPLAY_NAMES[canonical];
  if (!mapped) return canonical;
  return language === "ml" ? mapped.ml : mapped.en;
};

const RASHI_NAMES = [
  "Mesha",
  "Vrishabha",
  "Mithuna",
  "Karka",
  "Simha",
  "Kanya",
  "Tula",
  "Vrischika",
  "Dhanu",
  "Makara",
  "Kumbha",
  "Meena",
];

const normalizeAngle = (degrees) => ((degrees % 360) + 360) % 360;
const toRadians = (degrees) => (degrees * Math.PI) / 180;
const sinDeg = (degrees) => Math.sin(toRadians(degrees));
const normalizeTimeZoneValue = (value) => String(value || "").trim() || DEFAULT_BIRTH_TIME_ZONE;
const parseUtcOffsetMinutes = (value) => {
  const match = String(value || "")
    .trim()
    .match(/^([+-])(\d{2}):?(\d{2})$/);
  if (!match) return null;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  if (![hours, minutes].every(Number.isFinite) || hours > 14 || minutes > 59) {
    return null;
  }
  return sign * (hours * 60 + minutes);
};

const isValidIanaTimeZone = (timeZone) => {
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch (error) {
    return false;
  }
};

const getTimeZoneOffsetMinutes = (utcDate, timeZone) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(utcDate);
  const partAsNumber = (type) => Number(parts.find((entry) => entry.type === type)?.value || 0);
  const year = partAsNumber("year");
  const month = partAsNumber("month");
  const day = partAsNumber("day");
  let hour = partAsNumber("hour");
  const minute = partAsNumber("minute");
  const second = partAsNumber("second");
  if (hour === 24) {
    hour = 0;
  }
  const asUtcMillis = Date.UTC(year, month - 1, day, hour, minute, second);
  return (asUtcMillis - utcDate.getTime()) / 60000;
};

const getUtcMillisFromLocalBirthDetails = (dateString, timeString, timeZone) => {
  if (!dateString) return null;
  const [year, month, day] = String(dateString).split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return null;
  const [hour = 0, minute = 0] = String(timeString || "00:00").split(":").map(Number);
  if (![hour, minute].every(Number.isFinite)) return null;
  const normalizedTimeZone = normalizeTimeZoneValue(timeZone);
  const offsetMinutes = parseUtcOffsetMinutes(normalizedTimeZone);
  if (offsetMinutes !== null) {
    return Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes * 60000;
  }
  const safeTimeZone = isValidIanaTimeZone(normalizedTimeZone)
    ? normalizedTimeZone
    : DEFAULT_BIRTH_TIME_ZONE;
  const guessUtcMillis = Date.UTC(year, month - 1, day, hour, minute);
  const firstOffsetMinutes = getTimeZoneOffsetMinutes(new Date(guessUtcMillis), safeTimeZone);
  let correctedUtcMillis = guessUtcMillis - firstOffsetMinutes * 60000;
  const secondOffsetMinutes = getTimeZoneOffsetMinutes(new Date(correctedUtcMillis), safeTimeZone);
  if (secondOffsetMinutes !== firstOffsetMinutes) {
    correctedUtcMillis = guessUtcMillis - secondOffsetMinutes * 60000;
  }
  return correctedUtcMillis;
};

const getJulianDayFromBirthDetails = (dateString, timeString, timeZone) => {
  const utcMs = getUtcMillisFromLocalBirthDetails(dateString, timeString, timeZone);
  if (!Number.isFinite(utcMs)) return null;
  const date = new Date(utcMs);
  const Y = date.getUTCFullYear();
  const M = date.getUTCMonth() + 1;
  const D =
    date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400;
  let y = Y;
  let m = M;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const jd =
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    D +
    B -
    1524.5;
  return jd;
};

const getMoonEclipticLongitude = (jd) => {
  const D = jd - 2451545.0;
  const T = D / 36525.0;
  const L0 = normalizeAngle(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841 - T * T * T * T / 65194000);
  const M = normalizeAngle(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699 - T * T * T * T / 14712000);
  const Mprime = normalizeAngle(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T * T * T / 24490000);
  const Dprime = normalizeAngle(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T * T * T / 545868 - T * T * T * T / 113065000);
  const F = normalizeAngle(93.272095 + 483202.0175233 * T - 0.0036539 * T * T - T * T * T / 3526000 + T * T * T * T / 863310000);

  let lon = L0;
  lon += 6.289 * sinDeg(M);
  lon += 1.274 * sinDeg(2 * Dprime - M);
  lon += 0.658 * sinDeg(2 * Dprime);
  lon += 0.214 * sinDeg(2 * M);
  lon += -0.186 * sinDeg(Mprime);
  lon += -0.059 * sinDeg(2 * Dprime - 2 * M);
  lon += -0.057 * sinDeg(2 * Dprime - Mprime - M);
  lon += 0.053 * sinDeg(2 * Dprime + M);
  lon += 0.046 * sinDeg(2 * Dprime - Mprime);
  lon += 0.041 * sinDeg(Mprime - M);
  lon += -0.035 * sinDeg(Dprime);
  lon += -0.031 * sinDeg(M + Mprime);
  lon += 0.015 * sinDeg(2 * F - 2 * Dprime);
  lon += 0.011 * sinDeg(2 * Dprime - 4 * M);

  return normalizeAngle(lon);
};

const getLahiriAyanamsa = (jd) => {
  const T = (jd - 2451545.0) / 36525.0;
  const ayanamsaAtJ2000 = 23.853222;
  const precessionArcSeconds = 5028.796195 * T + 1.1054348 * T * T;
  return ayanamsaAtJ2000 + precessionArcSeconds / 3600;
};

const calculateBirthAstroProfile = (birthDate, birthTime, timeZone) => {
  const jd = getJulianDayFromBirthDetails(birthDate, birthTime, timeZone);
  if (!jd) {
    return { nakshatra: "", rashi: "" };
  }
  const moonLongitude = getMoonEclipticLongitude(jd);
  const siderealMoonLongitude = normalizeAngle(moonLongitude - getLahiriAyanamsa(jd));
  const nakshatraIndex = Math.floor(siderealMoonLongitude / (360 / 27));
  const rashiIndex = Math.floor(siderealMoonLongitude / 30);
  return {
    nakshatra: NAKSHATRA_NAMES[nakshatraIndex] || "",
    rashi: RASHI_NAMES[rashiIndex] || "",
  };
};

const calculateNakshatra = (birthDate, birthTime, timeZone) => {
  const profile = calculateBirthAstroProfile(birthDate, birthTime, timeZone);
  return profile.nakshatra;
};

const detectSignFromBirthDate = (birthDate) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(birthDate || "").trim())) {
    return "";
  }

  const [, monthText, dayText] = String(birthDate).split("-");
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isFinite(month) || !Number.isFinite(day)) {
    return "";
  }

  const key = month * 100 + day;
  if (key >= 321 && key <= 419) return "aries";
  if (key >= 420 && key <= 520) return "taurus";
  if (key >= 521 && key <= 620) return "gemini";
  if (key >= 621 && key <= 722) return "cancer";
  if (key >= 723 && key <= 822) return "leo";
  if (key >= 823 && key <= 922) return "virgo";
  if (key >= 923 && key <= 1022) return "libra";
  if (key >= 1023 && key <= 1121) return "scorpio";
  if (key >= 1122 && key <= 1221) return "sagittarius";
  if (key >= 1222 || key <= 119) return "capricorn";
  if (key <= 218) return "aquarius";
  return "pisces";
};

const getLuckyColor = (sign) =>
  ({
    aries: "Red",
    taurus: "Green",
    gemini: "Light Yellow",
    cancer: "White",
    leo: "Gold",
    virgo: "Blue",
    libra: "Pink",
    scorpio: "Maroon",
    sagittarius: "Purple",
    capricorn: "Brown",
    aquarius: "Silver",
    pisces: "Sea Green",
  }[sign] || "Gold");

const getLuckyNumber = (sign) =>
  ({
    aries: 9,
    taurus: 6,
    gemini: 5,
    cancer: 2,
    leo: 1,
    virgo: 5,
    libra: 6,
    scorpio: 9,
    sagittarius: 3,
    capricorn: 8,
    aquarius: 4,
    pisces: 7,
  }[sign] || 7);

const getGoodTime = (sign) =>
  ({
    aries: "06:00 - 08:00",
    taurus: "08:30 - 10:00",
    gemini: "10:30 - 12:00",
    cancer: "16:00 - 17:30",
    leo: "12:30 - 14:00",
    virgo: "13:00 - 14:30",
    libra: "07:00 - 08:30",
    scorpio: "15:00 - 16:30",
    sagittarius: "17:00 - 18:30",
    capricorn: "06:30 - 08:00",
    aquarius: "14:30 - 16:00",
    pisces: "18:00 - 19:30",
  }[sign] || "10:30 - 12:00");

const getRashiSummary = (sign) =>
  ({
    aries: "Today is best for quick decisions backed by a family discussion.",
    taurus: "Planned progress will feel more rewarding than immediate gain.",
    gemini: "A short trip or message will open the right door.",
    cancer: "Trust small rituals to steady your day.",
    leo: "Stay warm, keep your presence generous, and avoid unnecessary conflict.",
    virgo: "Detail work is powerful now. Use it to simplify plans.",
    libra: "Balance activity with rest and let others join you.",
    scorpio: "Focus on shared values, not control.",
    sagittarius: "A creative idea can become a practical plan if you start small.",
    capricorn: "Stick to routine, especially with money and health.",
    aquarius: "A friend or sibling brings useful perspective today.",
    pisces: "A calming habit will help you stay centered through change.",
  }[sign] || "Create structure before you expand energy outward.");

const getCareerAdvice = (sign) =>
  ({
    aries: "Take lead on one pending task and close it before noon.",
    taurus: "Steady, practical work beats fast changes today.",
    gemini: "Communication and follow-ups will unlock momentum.",
    cancer: "Prioritize team trust and clear boundaries at work.",
    leo: "Use visibility wisely; support others while leading.",
    virgo: "Process improvements bring immediate gains.",
    libra: "Negotiate calmly; balance speed with precision.",
    scorpio: "Handle sensitive issues directly, without delay.",
    sagittarius: "Explore one new skill path that supports your goals.",
    capricorn: "Long-term planning and disciplined execution are favored.",
    aquarius: "Innovative suggestions will be well received.",
    pisces: "Focus windows and reduced distraction will boost output.",
  }[sign] || "Stay consistent and complete what is already open.");

const getFinanceAdvice = (sign) =>
  ({
    aries: "Avoid impulse purchases and review recurring expenses.",
    taurus: "Conservative spending helps preserve near-term stability.",
    gemini: "Track small leaks in spending and fix them first.",
    cancer: "Family-linked planning decisions can improve savings.",
    leo: "Delay non-essential upgrades for a better window.",
    virgo: "Budget reviews and structured planning work well today.",
    libra: "Balance comfort spending with clear limits.",
    scorpio: "Revisit debt and subscription commitments carefully.",
    sagittarius: "Split funds between essentials and future opportunities.",
    capricorn: "Discipline with cash flow gives better control.",
    aquarius: "Digital expense tracking will reveal patterns quickly.",
    pisces: "Use a simple savings rule to avoid emotional spending.",
  }[sign] || "Keep spending simple and aligned to your plan.");

const clampScore = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Math.round(Number(value) || 0)));

const SIGN_FOCUS_THEMES = {
  aries: {
    theme: "decisive action",
    workAction: "finish one difficult task before lunch",
    moneyAction: "delay non-essential spending for 24 hours",
    relationshipAction: "use direct but respectful words in key conversations",
  },
  taurus: {
    theme: "steady consistency",
    workAction: "follow your schedule and avoid last-minute switching",
    moneyAction: "review subscriptions and trim one leak",
    relationshipAction: "show support through practical help",
  },
  gemini: {
    theme: "clear communication",
    workAction: "send follow-up messages on pending items",
    moneyAction: "track small daily expenses before planning bigger buys",
    relationshipAction: "clarify expectations early instead of assuming",
  },
  cancer: {
    theme: "emotional stability",
    workAction: "set boundaries and protect your focus windows",
    moneyAction: "prioritize family essentials before optional spends",
    relationshipAction: "listen first, then respond calmly",
  },
  leo: {
    theme: "visible leadership",
    workAction: "lead one task and delegate one task",
    moneyAction: "postpone image-based purchases this week",
    relationshipAction: "balance confidence with appreciation",
  },
  virgo: {
    theme: "systems and precision",
    workAction: "improve one process and document it",
    moneyAction: "update your budget and set a strict cap",
    relationshipAction: "avoid overcorrecting and speak with warmth",
  },
  libra: {
    theme: "balanced choices",
    workAction: "prioritize quality over speed in one important task",
    moneyAction: "set a comfort-spend limit before shopping",
    relationshipAction: "address unresolved points diplomatically",
  },
  scorpio: {
    theme: "focused depth",
    workAction: "resolve one sensitive issue without delay",
    moneyAction: "recheck debt, dues, and payment dates",
    relationshipAction: "replace suspicion with clear questions",
  },
  sagittarius: {
    theme: "structured expansion",
    workAction: "start one new learning action tied to your goals",
    moneyAction: "split funds into essentials, growth, and reserve",
    relationshipAction: "be honest without being blunt",
  },
  capricorn: {
    theme: "discipline and long-term planning",
    workAction: "commit to a realistic milestone and complete it",
    moneyAction: "protect cash flow and avoid risky commitments",
    relationshipAction: "share plans early to prevent confusion",
  },
  aquarius: {
    theme: "innovative clarity",
    workAction: "pitch one practical improvement idea",
    moneyAction: "use a digital tracker for all transactions today",
    relationshipAction: "communicate unconventional ideas patiently",
  },
  pisces: {
    theme: "grounded intuition",
    workAction: "time-block your day to reduce distractions",
    moneyAction: "follow a fixed savings rule before spending",
    relationshipAction: "speak feelings clearly instead of hinting",
  },
};

const getSignFocusTheme = (sign) =>
  SIGN_FOCUS_THEMES[sign] || {
    theme: "steady progress",
    workAction: "complete pending priorities one by one",
    moneyAction: "keep spending aligned to essentials",
    relationshipAction: "keep communication calm and clear",
  };

const getFutureClarityMetrics = (sign, energyScore) => {
  const signWeight = {
    aries: 2,
    taurus: 4,
    gemini: 6,
    cancer: 8,
    leo: 10,
    virgo: 12,
    libra: 14,
    scorpio: 16,
    sagittarius: 18,
    capricorn: 20,
    aquarius: 22,
    pisces: 24,
  }[sign] || 11;

  const normalizedEnergy = clampScore(energyScore, 1, 10);
  const momentum = clampScore(48 + signWeight + normalizedEnergy * 2, 35, 95);
  const stability = clampScore(44 + Math.floor(signWeight / 2) + normalizedEnergy * 2, 32, 93);
  const caution = clampScore(72 - normalizedEnergy * 3 + (signWeight % 6), 12, 88);

  return { momentum, stability, caution };
};

const getActionOutcomeScenarios = (sign) => {
  const focus = getSignFocusTheme(sign);
  return [
    {
      title: "Work and Goals",
      action: focus.workAction,
      ifDone:
        "Likely outcome: stronger momentum, faster closure on pending tasks, and less pressure by evening.",
      ifSkipped:
        "Likely outcome: delay spillover into the next day and avoidable stress around unfinished priorities.",
    },
    {
      title: "Money and Decisions",
      action: focus.moneyAction,
      ifDone:
        "Likely outcome: better control over cash flow and more confidence for upcoming financial choices.",
      ifSkipped:
        "Likely outcome: impulse-led decisions may reduce flexibility later this week.",
    },
    {
      title: "Relationships and Communication",
      action: focus.relationshipAction,
      ifDone:
        "Likely outcome: cleaner conversations, improved trust, and fewer misunderstandings.",
      ifSkipped:
        "Likely outcome: small communication gaps can become bigger emotional friction.",
    },
  ];
};

const getFutureTimelineCards = (sign) => {
  const focus = getSignFocusTheme(sign);
  return [
    {
      window: "Next 48 hours",
      guidance: `Stay close to ${focus.theme}. Keep plans simple and avoid over-committing.`,
    },
    {
      window: "Next 7 days",
      guidance:
        "Consistency matters more than intensity. Small daily actions will produce visible results by week end.",
    },
    {
      window: "Next 30 days",
      guidance:
        "If you keep discipline in work, money, and communication, this period can become a clear growth cycle.",
    },
  ];
};

const ZODIAC_SIGNS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];

const ZODIAC_ALIASES = {
  mesha: "aries",
  vrishabha: "taurus",
  mithuna: "gemini",
  karka: "cancer",
  karkata: "cancer",
  simha: "leo",
  kanya: "virgo",
  tula: "libra",
  vrischika: "scorpio",
  dhanu: "sagittarius",
  makara: "capricorn",
  kumbha: "aquarius",
  meena: "pisces",
};

const normalizeZodiacKey = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (!raw) return "";
  if (ZODIAC_SIGNS.includes(raw)) return raw;
  return ZODIAC_ALIASES[raw] || "";
};

const createEmptyPlanetHouseMap = () =>
  Array.from({ length: 12 }, (_, index) => ({ house: index + 1, planets: [] }));

const derivePlanetHouseMap = (selectedSign, kundliData) => {
  const ascendantKey = normalizeZodiacKey(kundliData?.birthChart?.ascendant) || selectedSign || "aries";
  const ascendantIndex = Math.max(0, ZODIAC_SIGNS.indexOf(ascendantKey));
  const entries = createEmptyPlanetHouseMap();

  const planets = Array.isArray(kundliData?.planets) ? kundliData.planets : [];
  planets.forEach((entry) => {
    const planetName = String(entry?.planet || "").trim();
    const positionSignToken = String(entry?.position || "").split(" ").slice(-1)[0];
    const planetSignKey = normalizeZodiacKey(positionSignToken);
    if (!planetName || !planetSignKey) return;
    const planetIndex = ZODIAC_SIGNS.indexOf(planetSignKey);
    if (planetIndex < 0) return;
    const house = ((planetIndex - ascendantIndex + 12) % 12) + 1;
    entries[house - 1].planets.push(planetName);
  });

  return entries;
};

const getYearlyHoroscopeContent = (sign, year, metrics) => {
  const focus = getSignFocusTheme(sign);
  const intensity = metrics.momentum >= 70 ? "high" : metrics.momentum >= 55 ? "steady" : "measured";
  const financialWindow =
    metrics.stability >= 65
      ? "Q2 and Q4 are stronger for savings and long-term planning."
      : "Protect cashflow in Q1 and Q3, then scale gradually.";

  return {
    headline: `${year} is a ${intensity} growth year with ${focus.theme} as your anchor.`,
    quarterPlan: [
      `Q1: Build foundations through discipline and routines.`,
      `Q2: Expand with careful decisions and calculated risks.`,
      `Q3: Review health, spending, and unfinished commitments.`,
      `Q4: Consolidate gains and prepare the next yearly cycle.`,
    ],
    keyWins: [
      "Career opportunities improve when communication stays consistent.",
      "Partnerships perform better with clear expectations and boundaries.",
      financialWindow,
    ],
    caution: metrics.caution >= 60
      ? "Avoid rushed commitments in emotionally intense weeks."
      : "Use moderation and avoid overconfidence while momentum rises.",
  };
};

const getTotalLifeReadingContent = (sign, birthDate, metrics) => {
  const focus = getSignFocusTheme(sign);
  const birthYear = Number(String(birthDate || "").slice(0, 4));
  const age = Number.isFinite(birthYear) ? Math.max(18, new Date().getFullYear() - birthYear) : null;
  const stage =
    age === null
      ? "current life stage"
      : age < 30
        ? "foundation stage"
        : age < 45
          ? "expansion stage"
          : age < 60
            ? "stability and leadership stage"
            : "wisdom and legacy stage";

  return {
    headline: `Your total reading highlights ${focus.theme} as a lifelong strength in your ${stage}.`,
    pillars: [
      {
        title: "Purpose and Karma",
        text: "Progress grows when you align actions with values and stay consistent under pressure.",
      },
      {
        title: "Relationships and Family",
        text: "Emotional maturity and clear communication shape long-term harmony.",
      },
      {
        title: "Wealth and Security",
        text:
          metrics.stability >= 65
            ? "Wealth compounds through disciplined planning, not sudden risk."
            : "Stability increases when you simplify obligations and avoid reactive spending.",
      },
      {
        title: "Health and Energy",
        text:
          metrics.caution >= 60
            ? "Protect rest, digestion, and stress levels to avoid energy dips."
            : "Maintain sleep and movement rhythm to preserve sustained performance.",
      },
    ],
    guidingPrinciple: `When in doubt, choose the path that strengthens ${focus.theme} and long-term stability.`,
  };
};

const getRemedyTips = (sign) => [
  ({
    aries: "Recite Ganapathi mantra before starting major work.",
    taurus: "Offer white flowers on Friday for peace and stability.",
    gemini: "Write intentions clearly before important calls.",
    cancer: "Light a lamp in the evening and keep family space calm.",
    leo: "Chant Surya mantra and plan your day early.",
    virgo: "Donate food items and avoid overthinking minor delays.",
    libra: "Wear gentle colors and maintain emotional balance.",
    scorpio: "Avoid conflict windows and focus on constructive speech.",
    sagittarius: "Read one spiritual verse and take measured action.",
    capricorn: "Do a disciplined morning routine before money decisions.",
    aquarius: "Help a friend and keep communication clean.",
    pisces: "Practice silence for a short duration to settle mind.",
  }[sign] || "Keep routines steady for grounded results."),
  "Begin the day with a short prayer or mindful breathing.",
  "Offer a simple act of kindness before sunset.",
];

const formatSavedReadingDate = (value) => {
  if (!value) return "Today";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const createProfileDraft = (profile = null) => ({
  birthDate: profile?.birthDate || "",
  birthTime: profile?.birthTime || "",
  birthPlace: profile?.birthPlace || "",
  birthTimezone: profile?.birthTimezone || DEFAULT_BIRTH_TIME_ZONE,
  nakshatra:
    getCanonicalNakshatraName(profile?.nakshatra) ||
    calculateNakshatra(profile?.birthDate, profile?.birthTime, profile?.birthTimezone) ||
    "",
  rashi:
    profile?.rashi ||
    calculateBirthAstroProfile(profile?.birthDate, profile?.birthTime, profile?.birthTimezone).rashi ||
    "",
  lagna: profile?.lagna || getLagnaFromTime(profile?.birthTime) ||
    "",
  gender: profile?.gender || "",
  receiveDailyHoroscope: profile?.preferences?.receiveDailyHoroscope !== false,
  favoriteTopics: Array.isArray(profile?.preferences?.favoriteTopics)
    ? profile.preferences.favoriteTopics.join(", ")
    : "",
  notifications: {
    dailyHoroscope: profile?.notifications?.dailyHoroscope !== false,
    goodMuhurtam: profile?.notifications?.goodMuhurtam !== false,
    festivalReminders: profile?.notifications?.festivalReminders !== false,
    dashaAlerts: profile?.notifications?.dashaAlerts !== false,
  },
});

const createFamilyProfileDraft = (profile = null) => ({
  id: profile?.id || "",
  name: profile?.name || "",
  relation: profile?.relation || "Self",
  sign: profile?.sign || "aries",
  birthDate: profile?.birthDate || "",
  birthTime: profile?.birthTime || "",
  birthPlace: profile?.birthPlace || "",
  birthTimezone: profile?.birthTimezone || DEFAULT_BIRTH_TIME_ZONE,
});

const getDefaultFamilyProfile = (profile, userName) => ({
  id: `self-${Date.now()}`,
  name: userName || "You",
  relation: "Self",
  sign: profile?.sign || "aries",
  birthDate: profile?.birthDate || "",
  birthTime: profile?.birthTime || "",
  birthPlace: profile?.birthPlace || "",
  birthTimezone: profile?.birthTimezone || DEFAULT_BIRTH_TIME_ZONE,
  nakshatra: getCanonicalNakshatraName(profile?.nakshatra) || getNakshatraFromSign(profile?.sign || "aries"),
  rashi: profile?.rashi || getRashiFromSign(profile?.sign || "aries"),
  lagna: profile?.lagna || getLagnaFromTime(profile?.birthTime || "06:00"),
});

const localize = (en, ml, language) => (language === "ml" ? ml : en);

const AstrologyHome = () => {
  const { currentUser } = useApp();
  const [language, setLanguage] = useState("en");
  const [searchQuery, setSearchQuery] = useState("");
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("today");
  const [showFullPrediction, setShowFullPrediction] = useState(false);
  const [personalizedReady, setPersonalizedReady] = useState(false);
  const [personalizationBootstrapped, setPersonalizationBootstrapped] = useState(false);
  const [question, setQuestion] = useState("");
  const [detailedReport, setDetailedReport] = useState(true);

  const [signs, setSigns] = useState([]);
  const [selectedSign, setSelectedSign] = useState("");
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signsNotice, setSignsNotice] = useState("");
  const [readingNotice, setReadingNotice] = useState("");
  const [saveState, setSaveState] = useState({ type: "", message: "" });
  const [festivals, setFestivals] = useState([]);
  const [panchangam, setPanchangam] = useState(null);
  const [panchangamNotice, setPanchangamNotice] = useState("");
  const [panchangamLoading, setPanchangamLoading] = useState(true);
  const [aiQuestion, setAiQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [downloadingHoroscopePeriod, setDownloadingHoroscopePeriod] = useState("");

  const ensureSignedIn = () => {
    if (!currentUser?.id && !currentUser?.name) {
      setSaveState({ type: "error", message: "Please sign in to use AstroNila features." });
      return false;
    }
    return true;
  };

  const profileApi = useAstrologyProfile({
    currentUser,
    selectedSign,
    signs,
    setSelectedSign,
    setSaveState,
    ensureSignedIn,
    createProfileDraft,
    createFamilyProfileDraft,
    getDefaultFamilyProfile,
    getNakshatraFromSign,
    getRashiFromSign,
    getLagnaFromTime,
  });

  const consultApi = useAstrologyConsultations({
    activeSection,
    currentUser,
    setSaveState,
    ensureSignedIn,
  });

  const kundliApi = useAstrologyKundliCompatibility({
    activeSection,
    currentUser,
    selectedProfile: profileApi.selectedProfile,
    selectedSign,
    setSelectedSign,
    setSaveState,
    ensureSignedIn,
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const next = await astrologyService.getSigns();
        if (!active) return;
        setSigns(next);
        setSelectedSign((cur) => cur || next[0]?.sign || "aries");
        setSignsNotice("");
      } catch (error) {
        if (!active) return;
        const fallback = error.fallbackData || astrologyService.getFallbackSigns();
        setSigns(fallback);
        setSelectedSign((cur) => cur || fallback[0]?.sign || "aries");
        setSignsNotice(error.message || "Showing offline sign data.");
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedSign) return;
    let active = true;
    setLoading(true);
    const load = async () => {
      try {
        const next = await astrologyService.getDailyHoroscope(selectedSign);
        if (!active) return;
        setReading(next);
        setReadingNotice("");
      } catch (error) {
        if (!active) return;
        setReading(error.fallbackData || astrologyService.getFallbackReading(selectedSign));
        setReadingNotice(error.message || "Showing offline reading.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [selectedSign]);

  useEffect(() => {
    const load = async () => {
      try {
        setFestivals(await astrologyService.getFestivalUpdates());
      } catch (error) {
        setFestivals(error.fallbackData || []);
      }
      setPanchangamLoading(true);
      try {
        setPanchangam(await astrologyService.getPanchangam());
        setPanchangamNotice("");
      } catch (error) {
        setPanchangam(error.fallbackData || null);
        setPanchangamNotice(error.message || "Showing offline Panchangam.");
      } finally {
        setPanchangamLoading(false);
      }
    };
    void load();
  }, []);

  const selectedSignDetails =
    signs.find((entry) => entry.sign === selectedSign) ||
    reading ||
    astrologyService.getFallbackSign(selectedSign);
  const handleProfileDraftChange = profileApi.handleDraftChange;

  const heroPrediction = String(
    reading?.horoscope ||
      selectedSignDetails?.horoscope ||
      "Gentle progress comes from staying consistent with the work already in front of you."
  );

  const filteredSigns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return signs;
    return signs.filter((item) => `${item.label} ${item.sign} ${item.dateRange}`.toLowerCase().includes(q));
  }, [searchQuery, signs]);

  const todayDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const todayEnergyScore = ((getLuckyNumber(selectedSign) + new Date().getDate()) % 10) || 10;
  const futureClarityMetrics = useMemo(
    () => getFutureClarityMetrics(selectedSign, todayEnergyScore),
    [selectedSign, todayEnergyScore]
  );
  const actionOutcomeScenarios = useMemo(
    () => getActionOutcomeScenarios(selectedSign),
    [selectedSign]
  );
  const futureTimelineCards = useMemo(
    () => getFutureTimelineCards(selectedSign),
    [selectedSign]
  );
  const yearlyHoroscopeContent = useMemo(
    () => getYearlyHoroscopeContent(selectedSign, new Date().getFullYear(), futureClarityMetrics),
    [selectedSign, futureClarityMetrics]
  );
  const totalLifeReadingContent = useMemo(
    () =>
      getTotalLifeReadingContent(
        selectedSign,
        profileApi.profileDraft.birthDate || profileApi.selectedProfile?.birthDate,
        futureClarityMetrics
      ),
    [selectedSign, profileApi.profileDraft.birthDate, profileApi.selectedProfile?.birthDate, futureClarityMetrics]
  );
  const squarePlanetChart = useMemo(
    () => derivePlanetHouseMap(selectedSign, kundliApi.kundliData),
    [selectedSign, kundliApi.kundliData]
  );
  const showLegacyFirstPage = false;
  const birthAstroPreview = useMemo(
    () =>
      calculateBirthAstroProfile(
        profileApi.profileDraft.birthDate,
        profileApi.profileDraft.birthTime,
        profileApi.profileDraft.birthTimezone
      ),
    [
      profileApi.profileDraft.birthDate,
      profileApi.profileDraft.birthTime,
      profileApi.profileDraft.birthTimezone,
    ]
  );
  const hasRequiredBirthDetails = Boolean(
    profileApi.profileDraft.birthDate &&
      profileApi.profileDraft.birthTime &&
      profileApi.profileDraft.birthPlace &&
      profileApi.profileDraft.gender
  );

  useEffect(() => {
    if (personalizationBootstrapped || profileApi.profileLoading) {
      return;
    }

    setPersonalizedReady(hasRequiredBirthDetails);
    setPersonalizationBootstrapped(true);
  }, [
    hasRequiredBirthDetails,
    personalizationBootstrapped,
    profileApi.profileLoading,
  ]);

  const handleBirthDateChange = (value) => {
    handleProfileDraftChange("birthDate", value);
    const autoSign = detectSignFromBirthDate(value);
    if (autoSign) {
      setSelectedSign(autoSign);
    }
  };

  const handleBirthPlaceChange = (value) => {
    handleProfileDraftChange("birthPlace", value);
    const matched = BIRTH_LOCATION_OPTIONS.find(
      (item) => item.label.toLowerCase() === String(value || "").trim().toLowerCase()
    );
    if (matched?.timeZone) {
      handleProfileDraftChange("birthTimezone", matched.timeZone);
    }
  };

  const handleBirthTimezoneChange = (value) => {
    handleProfileDraftChange("birthTimezone", normalizeTimeZoneValue(value));
  };

  const handleNakshatraChange = (value) => {
    handleProfileDraftChange("nakshatra", getCanonicalNakshatraName(value));
  };

  useEffect(() => {
    if (!profileApi.profileDraft.birthDate || !profileApi.profileDraft.birthTime) {
      return;
    }
    const calculatedProfile = calculateBirthAstroProfile(
      profileApi.profileDraft.birthDate,
      profileApi.profileDraft.birthTime,
      profileApi.profileDraft.birthTimezone
    );
    if (
      calculatedProfile.nakshatra &&
      calculatedProfile.nakshatra !== profileApi.profileDraft.nakshatra
    ) {
      handleProfileDraftChange("nakshatra", calculatedProfile.nakshatra);
    }
    if (calculatedProfile.rashi && calculatedProfile.rashi !== profileApi.profileDraft.rashi) {
      handleProfileDraftChange("rashi", calculatedProfile.rashi);
    }
  }, [
    profileApi.profileDraft.birthDate,
    profileApi.profileDraft.birthTime,
    profileApi.profileDraft.birthTimezone,
    profileApi.profileDraft.nakshatra,
    profileApi.profileDraft.rashi,
    handleProfileDraftChange,
  ]);

  useEffect(() => {
    if (!profileApi.profileDraft.birthTime) {
      return;
    }
    const autoLagna = getLagnaFromTime(profileApi.profileDraft.birthTime);
    if (autoLagna && autoLagna !== profileApi.profileDraft.lagna) {
      handleProfileDraftChange("lagna", autoLagna);
    }
  }, [profileApi.profileDraft.birthTime, profileApi.profileDraft.lagna, handleProfileDraftChange]);

  useEffect(() => {
    if (!birthAstroPreview.rashi) {
      return;
    }
    const autoSign = getSignFromRashi(birthAstroPreview.rashi);
    if (autoSign && autoSign !== selectedSign) {
      setSelectedSign(autoSign);
    }
  }, [birthAstroPreview.rashi, selectedSign]);

  const handleQuickSave = async () => {
    if (!ensureSignedIn()) return;
    await profileApi.handleProfileSave({ preventDefault: () => {} });
  };

  const handleGenerateReport = async () => {
    if (!ensureSignedIn()) return;
    if (!hasRequiredBirthDetails) {
      setSaveState({
        type: "error",
        message: "Enter date of birth, time, place, and gender to generate your personal prediction.",
      });
      return;
    }
    await profileApi.handleProfileSave({ preventDefault: () => {} });
    if (question.trim()) setAiQuestion(question.trim());
    setActiveSection("today");
    setPersonalizedReady(true);
    setShowFullPrediction(Boolean(detailedReport));
    setSaveState({ type: "success", message: "Birth details saved. Report cards updated." });
  };

  const handleAskAssistant = async () => {
    if (!aiQuestion.trim()) {
      setSaveState({ type: "error", message: "Ask a question before sending." });
      return;
    }
    setAiLoading(true);
    setAssistantAnswer(null);
    try {
      setAssistantAnswer(await astrologyService.askAstrologyAssistant(aiQuestion, selectedSign));
    } catch (error) {
      setSaveState({ type: "error", message: error.message || "Unable to get assistant answer." });
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadHoroscopeReport = async (period) => {
    if (!ensureSignedIn()) return;
    const normalizedPeriod = String(period || "year").toLowerCase();
    setDownloadingHoroscopePeriod(normalizedPeriod);

    try {
      const { blob, fileName } = await astrologyService.downloadHoroscopeReport(
        selectedSign,
        normalizedPeriod,
        language
      );
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSaveState({ type: "success", message: `Starting ${normalizedPeriod} horoscope download.` });
    } catch (error) {
      setSaveState({ type: "error", message: error.message || "Unable to download horoscope report." });
    } finally {
      setDownloadingHoroscopePeriod("");
    }
  };

  return (
    <section className="astrology-home" lang={language === "ml" ? "ml" : "en"}>
      <div className="astrology-shell">
        <header className="astrology-panel astro-top-header">
          <div className="astro-branding">
            <div className="astro-logo">AN</div>
            <div>
              <p className="astro-brand-eyebrow">AstroNila</p>
              <h1>Astrology</h1>
            </div>
          </div>
          <form className="astro-search" onSubmit={(event) => event.preventDefault()}>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={localize("Search sign or feature...", "Ã Â´Â°Ã Â´Â¾Ã Â´Â¶Ã Â´Â¿ Ã Â´â€¦Ã Â´Â²Ã ÂµÂÃ Â´Â²Ã Âµâ€ Ã Â´â„¢Ã ÂµÂÃ Â´â€¢Ã Â´Â¿Ã ÂµÂ½ Ã Â´Â«Ã Âµâ‚¬Ã Â´Å¡Ã ÂµÂÃ Â´Å¡Ã ÂµÂ¼ Ã Â´Â¤Ã Â´Â¿Ã Â´Â°Ã Â´Â¯Ã ÂµÂÃ Â´â€¢...", language)}
            />
          </form>
          <div className="astro-top-actions">
            <button type="button" className="astrology-secondary-button" onClick={() => setLanguage((prev) => (prev === "en" ? "ml" : "en"))}>
              {language === "en" ? "Ã Â´Â®Ã Â´Â²Ã Â´Â¯Ã Â´Â¾Ã Â´Â³Ã Â´â€š" : "English"}
            </button>
            <button type="button" className="astrology-secondary-button" onClick={() => setActiveSection("profile")}>
              Profile
            </button>
            <div className="astro-menu-wrap">
              <button type="button" className="astrology-secondary-button" onClick={() => setHeaderMenuOpen((prev) => !prev)}>
                Menu
              </button>
              {headerMenuOpen ? (
                <div className="astro-menu-popover">
                  <button type="button" onClick={() => setActiveSection("consult")}>Consultations</button>
                  <button type="button" onClick={() => setActiveSection("saved")}>Saved Reports</button>
                  <a href="/dashboard">Dashboard</a>
                  <a href="/astrology-analytics">Analytics</a>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {showLegacyFirstPage ? (
        <article className="astrology-panel astro-hero-card">
          <div className="astro-hero-main">
            <p className="astro-hero-kicker">{selectedSignDetails?.label || "Selected sign"} | {todayDate}</p>
            <h2>{localize("Today's Horoscope", "Ã Â´â€¡Ã Â´Â¨Ã ÂµÂÃ Â´Â¨Ã Â´Â¤Ã ÂµÂÃ Â´Â¤Ã Âµâ€  Ã Â´Å“Ã ÂµÂÃ Â´Â¯Ã Âµâ€¹Ã Â´Â¤Ã Â´Â¿Ã Â´Â· Ã Â´Â«Ã Â´Â²Ã Â´â€š", language)}</h2>
            <p>{heroPrediction.length > 180 ? `${heroPrediction.slice(0, 180)}...` : heroPrediction}</p>
          </div>
          <div className="astro-first-panel-layout">
            <article className="astro-personal-form-card">
              <h3>{localize("Get Your Personal Astrology Reading", "Ã Â´Â¨Ã Â´Â¿Ã Â´â„¢Ã ÂµÂÃ Â´â„¢Ã Â´Â³Ã ÂµÂÃ Â´Å¸Ã Âµâ€  Ã Â´ÂµÃ ÂµÂÃ Â´Â¯Ã Â´â€¢Ã ÂµÂÃ Â´Â¤Ã Â´Â¿Ã Â´â€”Ã Â´Â¤ Ã Â´Å“Ã ÂµÂÃ Â´Â¯Ã Âµâ€¹Ã Â´Â¤Ã Â´Â¿Ã Â´Â· Ã Â´Â«Ã Â´Â²Ã Â´â€š Ã Â´Â²Ã Â´Â­Ã ÂµÂÃ Â´Â¯Ã Â´Â®Ã Â´Â¾Ã Â´â€¢Ã ÂµÂÃ Â´â€¢Ã Âµâ€š", language)}</h3>
              <div className="astro-compact-form astro-hero-form">
                <label className="astrology-field">
                  <span>{localize("Date of birth", "Ã Â´Å“Ã Â´Â¨Ã Â´Â¨ Ã Â´Â¤Ã Âµâ‚¬Ã Â´Â¯Ã Â´Â¤Ã Â´Â¿", language)}</span>
                  <input type="date" value={profileApi.profileDraft.birthDate} onChange={(event) => handleBirthDateChange(event.target.value)} />
                </label>
                <label className="astrology-field">
                  <span>{localize("Time of birth", "Ã Â´Å“Ã Â´Â¨Ã Â´Â¨ Ã Â´Â¸Ã Â´Â®Ã Â´Â¯Ã Â´â€š", language)}</span>
                  <input type="time" value={profileApi.profileDraft.birthTime} onChange={(event) => profileApi.handleDraftChange("birthTime", event.target.value)} />
                </label>
                <label className="astrology-field">
                  <span>{localize("Place of birth", "Ã Â´Å“Ã Â´Â¨Ã Â´Â¨ Ã Â´Â¸Ã ÂµÂÃ Â´Â¥Ã Â´Â²Ã Â´â€š", language)}</span>
                  <input
                    type="text"
                    list="astro-birth-place-options"
                    value={profileApi.profileDraft.birthPlace}
                    onChange={(event) => handleBirthPlaceChange(event.target.value)}
                  />
                  <datalist id="astro-birth-place-options">
                    {BIRTH_LOCATION_OPTIONS.map((option) => (
                      <option key={option.label} value={option.label} />
                    ))}
                  </datalist>
                </label>
                <label className="astrology-field">
                  <span>{localize("Birth timezone", "à´œà´¨à´¨ à´Ÿàµˆà´‚à´¸àµ‹àµº", language)}</span>
                  <select
                    value={profileApi.profileDraft.birthTimezone || DEFAULT_BIRTH_TIME_ZONE}
                    onChange={(event) => handleBirthTimezoneChange(event.target.value)}
                  >
                    {BIRTH_TIMEZONE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="astrology-field">
                  <span>{localize("Birth star (Nakshatra)", "Ã Â´Å“Ã Â´Â¨Ã Â´Â¨ Ã Â´Â¨Ã Â´â€¢Ã ÂµÂÃ Â´Â·Ã Â´Â¤Ã ÂµÂÃ Â´Â°Ã Â´â€š", language)}</span>
                  <select value={getCanonicalNakshatraName(profileApi.profileDraft.nakshatra)} onChange={(event) => handleNakshatraChange(event.target.value)}>
                    {NAKSHATRA_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {getNakshatraDisplayName(name, language)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="astrology-field">
                  <span>{localize("Gender", "Ã Â´Â²Ã Â´Â¿Ã Â´â€šÃ Â´â€”Ã Â´â€š", language)}</span>
                  <select value={profileApi.profileDraft.gender} onChange={(event) => profileApi.handleDraftChange("gender", event.target.value)}>
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option.value || "unset"} value={option.value}>
                        {localize(option.label, option.labelMl, language)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button type="button" className="astrology-save-button" onClick={handleGenerateReport} disabled={profileApi.savingProfile}>
                {profileApi.savingProfile ? "Generating..." : localize("Generate My Prediction", "Ã Â´Å½Ã Â´Â¨Ã ÂµÂÃ Â´Â±Ã Âµâ€  Ã Â´Å“Ã ÂµÂÃ Â´Â¯Ã Âµâ€¹Ã Â´Â¤Ã Â´Â¿Ã Â´Â· Ã Â´Â«Ã Â´Â²Ã Â´â€š Ã Â´Â¸Ã ÂµÆ’Ã Â´Â·Ã ÂµÂÃ Â´Å¸Ã Â´Â¿Ã Â´â€¢Ã ÂµÂÃ Â´â€¢Ã ÂµÂÃ Â´â€¢", language)}
              </button>
            </article>
            <article className="astro-personal-preview-card">
              <h3>{localize("Instant Preview", "Ã Â´Â¤Ã ÂµÂ½Ã Â´â€¢Ã ÂµÂÃ Â´Â·Ã Â´Â£ Ã Â´ÂªÃ ÂµÂÃ Â´Â°Ã Â´Â¿Ã Â´ÂµÃ ÂµÂÃ Â´Â¯Ã Âµâ€š", language)}</h3>
              <ul>
                <li><span>{localize("Rashi", "Ã Â´Â°Ã Â´Â¾Ã Â´Â¶Ã Â´Â¿", language)}</span><strong>{profileApi.profileDraft.rashi || birthAstroPreview.rashi || getRashiFromSign(selectedSign)}</strong></li>
                <li><span>{localize("Nakshatra", "Ã Â´Â¨Ã Â´â€¢Ã ÂµÂÃ Â´Â·Ã Â´Â¤Ã ÂµÂÃ Â´Â°Ã Â´â€š", language)}</span><strong>{getNakshatraDisplayName(profileApi.profileDraft.nakshatra || birthAstroPreview.nakshatra || getNakshatraFromSign(selectedSign), language)}</strong></li>
                <li><span>{localize("Lucky color", "Ã Â´Â­Ã Â´Â¾Ã Â´â€”Ã ÂµÂÃ Â´Â¯Ã Â´Â¨Ã Â´Â¿Ã Â´Â±Ã Â´â€š", language)}</span><strong>{getLuckyColor(selectedSign)}</strong></li>
                <li><span>{localize("Lucky number", "Ã Â´Â­Ã Â´Â¾Ã Â´â€”Ã ÂµÂÃ Â´Â¯Ã Â´Â¸Ã Â´â€šÃ Â´â€“Ã ÂµÂÃ Â´Â¯", language)}</span><strong>{getLuckyNumber(selectedSign)}</strong></li>
                <li><span>{localize("Today energy", "Ã Â´â€¡Ã Â´Â¨Ã ÂµÂÃ Â´Â¨Ã Â´Â¤Ã ÂµÂÃ Â´Â¤Ã Âµâ€  Ã Â´Å Ã ÂµÂ¼Ã Â´Å“Ã Â´â€š", language)}</span><strong>{todayEnergyScore}/10</strong></li>
              </ul>
            </article>
          </div>
          <div className="astro-quick-grid">
            <article className="astro-quick-card"><span>{localize("Lucky color", "Ã Â´Â­Ã Â´Â¾Ã Â´â€”Ã ÂµÂÃ Â´Â¯Ã Â´Â¨Ã Â´Â¿Ã Â´Â±Ã Â´â€š", language)}</span><strong>{getLuckyColor(selectedSign)}</strong></article>
            <article className="astro-quick-card"><span>{localize("Lucky number", "Ã Â´Â­Ã Â´Â¾Ã Â´â€”Ã ÂµÂÃ Â´Â¯Ã Â´Â¸Ã Â´â€šÃ Â´â€“Ã ÂµÂÃ Â´Â¯", language)}</span><strong>{getLuckyNumber(selectedSign)}</strong></article>
            <article className="astro-quick-card"><span>{localize("Best time", "Ã Â´Â¨Ã Â´Â²Ã ÂµÂÃ Â´Â² Ã Â´Â¸Ã Â´Â®Ã Â´Â¯Ã Â´â€š", language)}</span><strong>{getGoodTime(selectedSign)}</strong></article>
            <article className="astro-quick-card"><span>{localize("Date", "Ã Â´Â¤Ã Âµâ‚¬Ã Â´Â¯Ã Â´Â¤Ã Â´Â¿", language)}</span><strong>{todayDate}</strong></article>
          </div>
          <div className="astro-hero-actions">
            <button type="button" className="astrology-save-button" onClick={() => { setActiveSection("today"); setShowFullPrediction(true); }}>View Full Prediction</button>
            <button type="button" className="astrology-secondary-button" onClick={() => { setActiveSection("today"); setShowFullPrediction(false); }}>
              {localize("Today's Horoscope", "à´‡à´¨àµà´¨à´¤àµà´¤àµ† à´œàµà´¯àµ‹à´¤à´¿à´· à´«à´²à´‚ à´•à´¾à´£àµà´•", language)}
            </button>
          </div>
        </article>
        ) : null}

        <section className="astrology-panel astro-zodiac-strip">
          <div className="astro-zodiac-chips">
            {(filteredSigns.length ? filteredSigns : signs).map((item) => (
              <button key={item.sign} type="button" className={`astro-zodiac-chip ${selectedSign === item.sign ? "is-active" : ""}`} onClick={() => setSelectedSign(item.sign)}>
                <strong>{item.label}</strong>
                <span>{item.dateRange}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="astrology-panel astro-tab-panel">
          <div className="astro-feature-tabs" role="tablist">
            {FEATURE_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                className={`astro-tab-button ${activeSection === tab.key ? "is-active" : ""}`}
                onClick={() => {
                  const allowedBeforePersonalization = new Set(["today", "yearly", "total", "kundli", "profile"]);
                  if (!personalizedReady && !allowedBeforePersonalization.has(tab.key)) {
                    setSaveState({
                      type: "error",
                      message: "Enter birth details in the Kundli or Profile tab and generate your prediction first.",
                    });
                    setActiveSection("today");
                    return;
                  }
                  setActiveSection(tab.key);
                }}
              >
                {localize(tab.label, tab.labelMl, language)}
              </button>
            ))}
          </div>
          {(readingNotice || signsNotice || saveState.message || profileApi.profileNotice) ? (
            <div className="astro-inline-messages">
              {readingNotice || signsNotice ? <p className="astrology-inline-message astrology-inline-message-warning">{readingNotice || signsNotice}</p> : null}
              {profileApi.profileNotice ? <p className="astrology-inline-message astrology-inline-message-warning">{profileApi.profileNotice}</p> : null}
              {saveState.message ? <p className={`astrology-inline-message ${saveState.type === "error" ? "astrology-inline-message-error" : "astrology-inline-message-success"}`}>{saveState.message}</p> : null}
            </div>
          ) : null}

          {activeSection === "today" ? (
            <div className="astro-card-grid">
              {personalizedReady ? (
                <>
                  <article className="astrology-panel astro-result-card"><h4>Summary</h4><p>{heroPrediction}</p></article>
                  <article className="astrology-panel astro-result-card"><h4>Today's guidance</h4><p>{getRashiSummary(selectedSign)}</p></article>
                  <article className="astrology-panel astro-result-card"><h4>Career advice</h4><p>{getCareerAdvice(selectedSign)}</p></article>
                  <article className="astrology-panel astro-result-card"><h4>Finance advice</h4><p>{getFinanceAdvice(selectedSign)}</p></article>
                  <article className="astrology-panel astro-result-card"><h4>Remedies</h4><ul>{getRemedyTips(selectedSign).map((tip) => <li key={tip}>{tip}</li>)}</ul></article>
                  <article className="astrology-panel astro-result-card">
                    <h4>Panchangam</h4>
                    <ul>
                      <li>Tithi: {panchangam?.tithi || "Shukla Paksha Tritiya"}</li>
                      <li>Nakshatra: {getNakshatraDisplayName(panchangam?.nakshatra || profileApi.profileDraft.nakshatra || getNakshatraFromSign(selectedSign), language)}</li>
                      <li>Rahu Kalam: {panchangam?.rahuKalam || "10:30 AM - 12:00 PM"}</li>
                    </ul>
                    <button type="button" className="astrology-save-button" onClick={handleQuickSave}>Save report</button>
                  </article>
                  <article className="astrology-panel astro-result-card astro-span-2 astro-future-clarity-card">
                    <h4>Future clarity dashboard</h4>
                    <p>Use this directional map for planning. If you act with consistency, outcomes usually improve in the same cycle.</p>
                    <div className="astro-future-metric-grid">
                      <div className="astro-future-metric-card">
                        <span>Momentum</span>
                        <strong>{futureClarityMetrics.momentum}%</strong>
                        <div className="astro-future-meter"><span style={{ width: `${futureClarityMetrics.momentum}%` }} /></div>
                      </div>
                      <div className="astro-future-metric-card">
                        <span>Stability</span>
                        <strong>{futureClarityMetrics.stability}%</strong>
                        <div className="astro-future-meter"><span style={{ width: `${futureClarityMetrics.stability}%` }} /></div>
                      </div>
                      <div className="astro-future-metric-card">
                        <span>Caution</span>
                        <strong>{futureClarityMetrics.caution}%</strong>
                        <div className="astro-future-meter is-caution"><span style={{ width: `${futureClarityMetrics.caution}%` }} /></div>
                      </div>
                    </div>
                  </article>
                  <article className="astrology-panel astro-result-card astro-span-2">
                    <h4>If you do this, this is likely to happen</h4>
                    <div className="astro-outcome-grid">
                      {actionOutcomeScenarios.map((scenario) => (
                        <article key={scenario.title} className="astro-outcome-card">
                          <h5>{scenario.title}</h5>
                          <p className="astro-outcome-action"><strong>Action:</strong> {scenario.action}</p>
                          <p><span className="astro-outcome-badge is-positive">Likely if done</span>{scenario.ifDone}</p>
                          <p><span className="astro-outcome-badge is-warning">If ignored</span>{scenario.ifSkipped}</p>
                        </article>
                      ))}
                    </div>
                  </article>
                  <article className="astrology-panel astro-result-card astro-span-2">
                    <h4>Future timeline</h4>
                    <div className="astro-timeline-grid">
                      {futureTimelineCards.map((item) => (
                        <article key={item.window} className="astro-timeline-card">
                          <strong>{item.window}</strong>
                          <p>{item.guidance}</p>
                        </article>
                      ))}
                    </div>
                  </article>
                  <article className="astrology-panel astro-result-card">
                    <h4>Horoscope actions</h4>
<button type="button" className="astrology-save-button" onClick={handleGenerateReport}>Generate horoscope report</button>
                    <button
                      type="button"
                      className="astrology-secondary-button"
                      disabled={downloadingHoroscopePeriod !== ""}
                      onClick={() => handleDownloadHoroscopeReport("year")}
                    >
                      {downloadingHoroscopePeriod === "year"
                        ? "Downloading yearly..."
                        : "Download yearly horoscope"}
                    </button>
                    <button
                      type="button"
                      className="astrology-secondary-button"
                      disabled={downloadingHoroscopePeriod !== ""}
                      onClick={() => handleDownloadHoroscopeReport("total")}
                    >
                      {downloadingHoroscopePeriod === "total"
                        ? "Downloading total..."
                        : "Download total horoscope"}
                    </button>
                  </article>
                  {showFullPrediction ? (
                    <HoroscopeCard
                      sign={selectedSignDetails}
                      horoscope={reading}
                      loading={loading}
                      notice={readingNotice || signsNotice}
                      energyScore={todayEnergyScore}
                      futureTimeline={futureTimelineCards}
                      actionScenarios={actionOutcomeScenarios}
                    />
                  ) : null}
                </>
              ) : (
                <article className="astrology-panel astro-result-card astro-span-2">
                  <h4>{localize("Personal details needed", "Ã Â´ÂµÃ ÂµÂÃ Â´Â¯Ã Â´â€¢Ã ÂµÂÃ Â´Â¤Ã Â´Â¿Ã Â´â€”Ã Â´Â¤ Ã Â´ÂµÃ Â´Â¿Ã Â´ÂµÃ Â´Â°Ã Â´â„¢Ã ÂµÂÃ Â´â„¢Ã ÂµÂ¾ Ã Â´â€ Ã Â´ÂµÃ Â´Â¶Ã ÂµÂÃ Â´Â¯Ã Â´Â®Ã Â´Â¾Ã Â´Â£Ã ÂµÂ", language)}</h4>
                  <p>{localize("Enter DOB, birth time, place, and gender in the Kundli or Profile tab to unlock personalized predictions.", "Ã Â´â€ Ã Â´Â¦Ã ÂµÂÃ Â´Â¯ Ã Â´ÂªÃ Â´Â¾Ã Â´Â¨Ã Â´Â²Ã Â´Â¿Ã ÂµÂ½ Ã Â´Å“Ã Â´Â¨Ã Â´Â¨ Ã Â´Â¤Ã Âµâ‚¬Ã Â´Â¯Ã Â´Â¤Ã Â´Â¿, Ã Â´Â¸Ã Â´Â®Ã Â´Â¯Ã Â´â€š, Ã Â´Â¸Ã ÂµÂÃ Â´Â¥Ã Â´Â²Ã Â´â€š, Ã Â´Â²Ã Â´Â¿Ã Â´â€šÃ Â´â€”Ã Â´â€š Ã Â´Â¨Ã ÂµÂ½Ã Â´â€¢Ã Â´Â¿ Ã Â´ÂµÃ ÂµÂÃ Â´Â¯Ã Â´â€¢Ã ÂµÂÃ Â´Â¤Ã Â´Â¿Ã Â´â€”Ã Â´Â¤ Ã Â´Å“Ã ÂµÂÃ Â´Â¯Ã Âµâ€¹Ã Â´Â¤Ã Â´Â¿Ã Â´Â· Ã Â´Â«Ã Â´Â²Ã Â´â€š Ã Â´â€¢Ã Â´Â¾Ã Â´Â£Ã Âµâ€š.", language)}</p>
                </article>
              )}
            </div>
          ) : null}

          {activeSection === "yearly" ? (
            <div className="astro-card-grid">
              <article className="astrology-panel astro-result-card astro-span-2 astro-yearly-card">
                <h4>{new Date().getFullYear()} yearly horoscope</h4>
                <p>{yearlyHoroscopeContent.headline}</p>
                <div className="astro-yearly-pillars">
                  {yearlyHoroscopeContent.quarterPlan.map((line) => (
                    <div key={line} className="astro-yearly-pillar">
                      <strong>{line.split(":")[0]}</strong>
                      <p>{line.split(":").slice(1).join(":").trim()}</p>
                    </div>
                  ))}
                </div>
              </article>
              <article className="astrology-panel astro-result-card">
                <h4>Yearly opportunities</h4>
                <ul>
                  {yearlyHoroscopeContent.keyWins.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className="astrology-panel astro-result-card">
                <h4>Yearly caution</h4>
                <p>{yearlyHoroscopeContent.caution}</p>
                <button
                  type="button"
                  className="astrology-secondary-button"
                  disabled={downloadingHoroscopePeriod !== ""}
                  onClick={() => handleDownloadHoroscopeReport("year")}
                >
                  {downloadingHoroscopePeriod === "year" ? "Downloading yearly..." : "Download yearly horoscope"}
                </button>
              </article>
            </div>
          ) : null}

          {activeSection === "total" ? (
            <div className="astro-card-grid">
              <article className="astrology-panel astro-result-card astro-span-2 astro-total-card">
                <h4>Total life reading</h4>
                <p>{totalLifeReadingContent.headline}</p>
                <strong className="astro-total-guiding-principle">{totalLifeReadingContent.guidingPrinciple}</strong>
              </article>
              {totalLifeReadingContent.pillars.map((pillar) => (
                <article key={pillar.title} className="astrology-panel astro-result-card">
                  <h4>{pillar.title}</h4>
                  <p>{pillar.text}</p>
                </article>
              ))}
              <article className="astrology-panel astro-result-card astro-span-2">
                <h4>Total report actions</h4>
                <div className="astrology-inline-actions">
                  <button type="button" className="astrology-save-button" onClick={handleGenerateReport}>
                    Refresh total reading
                  </button>
                  <button
                    type="button"
                    className="astrology-secondary-button"
                    disabled={downloadingHoroscopePeriod !== ""}
                    onClick={() => handleDownloadHoroscopeReport("total")}
                  >
                    {downloadingHoroscopePeriod === "total" ? "Downloading total..." : "Download total horoscope"}
                  </button>
                </div>
              </article>
            </div>
          ) : null}

          {activeSection === "kundli" ? (
            <div className="astro-card-grid">
              <article className="astrology-panel astro-result-card astro-span-2">
                <h4>Birth details</h4>
                <div className="astro-compact-form">
                  <label className="astrology-field"><span>Date of birth</span><input type="date" value={profileApi.profileDraft.birthDate} onChange={(event) => profileApi.handleDraftChange("birthDate", event.target.value)} /></label>
                  <label className="astrology-field"><span>Time of birth</span><input type="time" value={profileApi.profileDraft.birthTime} onChange={(event) => profileApi.handleDraftChange("birthTime", event.target.value)} /></label>
                  <label className="astrology-field"><span>Place of birth</span><input type="text" list="astro-birth-place-options-kundli" value={profileApi.profileDraft.birthPlace} onChange={(event) => handleBirthPlaceChange(event.target.value)} /><datalist id="astro-birth-place-options-kundli">{BIRTH_LOCATION_OPTIONS.map((option) => <option key={option.label} value={option.label} />)}</datalist></label>
                  <label className="astrology-field"><span>Birth timezone</span><select value={profileApi.profileDraft.birthTimezone || DEFAULT_BIRTH_TIME_ZONE} onChange={(event) => handleBirthTimezoneChange(event.target.value)}>{BIRTH_TIMEZONE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                  <label className="astrology-field"><span>Birth star (Nakshatra)</span><select value={getCanonicalNakshatraName(profileApi.profileDraft.nakshatra)} onChange={(event) => handleNakshatraChange(event.target.value)}>{NAKSHATRA_NAMES.map((name) => <option key={name} value={name}>{getNakshatraDisplayName(name, language)}</option>)}</select></label>
                  <label className="astrology-field"><span>Gender</span><select value={profileApi.profileDraft.gender} onChange={(event) => profileApi.handleDraftChange("gender", event.target.value)}>{GENDER_OPTIONS.map((option) => <option key={option.value || "unset"} value={option.value}>{option.label}</option>)}</select></label>
                  <label className="astrology-field"><span>Topic / question</span><input type="text" value={question} onChange={(event) => setQuestion(event.target.value)} /></label>
                </div>
                <label className="astrology-field astrology-checkbox-field"><input type="checkbox" checked={detailedReport} onChange={(event) => setDetailedReport(event.target.checked)} /><span>Generate detailed personalized horoscope</span></label>
                <button type="button" className="astrology-save-button" onClick={handleGenerateReport}>Generate horoscope report</button>
              </article>
              <article className="astrology-panel astro-result-card"><h4>Kundli summary</h4><ul><li>Ascendant: {kundliApi.kundliData?.birthChart?.ascendant || profileApi.selectedProfile.lagna || "Mesha"}</li><li>Current dasha: {kundliApi.kundliData?.dasha?.current || "Venus"}</li><li>Rashi: {profileApi.selectedProfile.rashi || getRashiFromSign(selectedSign)}</li></ul></article>
              <article className="astrology-panel astro-result-card">
                <h4>Planetary square chart</h4>
                <div className="astro-square-chart">
                  {[12, 1, 2, 3, 11, 4, 10, 5, 9, 8, 7, 6].map((house) => {
                    const houseData = squarePlanetChart.find((item) => item.house === house) || { planets: [] };
                    return (
                      <div key={house} className="astro-square-cell">
                        <span>H{house}</span>
                        <strong>{houseData.planets.join(", ") || "-"}</strong>
                      </div>
                    );
                  })}
                  <div className="astro-square-center">
                    <span>Ascendant</span>
                    <strong>{kundliApi.kundliData?.birthChart?.ascendant || profileApi.selectedProfile.lagna || "Mesha"}</strong>
                  </div>
                </div>
              </article>
              <article className="astrology-panel astro-result-card">
                <h4>Actions</h4>
                <button
                  type="button"
                  className="astrology-save-button"
                  disabled={kundliApi.downloadingKundli || kundliApi.kundliLoading || downloadingHoroscopePeriod !== ""}
                  onClick={kundliApi.handleDownloadKundliReport}
                >
                  {kundliApi.downloadingKundli ? "Downloading..." : "Download Kundli PDF report"}
                </button>
                <button
                  type="button"
                  className="astrology-secondary-button"
                  disabled={downloadingHoroscopePeriod !== ""}
                  onClick={() => handleDownloadHoroscopeReport("year")}
                >
                  {downloadingHoroscopePeriod === "year" ? "Downloading yearly..." : "Download yearly horoscope"}
                </button>
                <button
                  type="button"
                  className="astrology-secondary-button"
                  disabled={downloadingHoroscopePeriod !== ""}
                  onClick={() => handleDownloadHoroscopeReport("total")}
                >
                  {downloadingHoroscopePeriod === "total" ? "Downloading total..." : "Download total horoscope"}
                </button>
                {kundliApi.activeKundliSnapshotId ? <button type="button" className="astrology-secondary-button" onClick={kundliApi.handleLoadLiveKundli}>Use live generation</button> : null}
              </article>
            </div>
          ) : null}

          {activeSection === "career" ? <div className="astro-card-grid"><article className="astrology-panel astro-result-card"><h4>Career forecast</h4><p>{getCareerAdvice(selectedSign)}</p></article></div> : null}
          {activeSection === "finance" ? <div className="astro-card-grid"><article className="astrology-panel astro-result-card"><h4>Finance forecast</h4><p>{getFinanceAdvice(selectedSign)}</p></article></div> : null}

          {activeSection === "match" ? (
            <div className="astro-card-grid">
              <article className="astrology-panel astro-result-card astro-span-2">
                <h4>Marriage compatibility</h4>
                <div className="astrology-form-grid">
                  <label className="astrology-field"><span>Your sign</span><select value={selectedSign} onChange={(event) => setSelectedSign(event.target.value)}>{signs.map((item) => <option key={item.sign} value={item.sign}>{item.label}</option>)}</select></label>
                  <label className="astrology-field"><span>Partner sign</span><select value={kundliApi.partnerSign} onChange={(event) => kundliApi.setPartnerSign(event.target.value)}>{signs.map((item) => <option key={item.sign} value={item.sign}>{item.label}</option>)}</select></label>
                </div>
                <button type="button" className="astrology-save-button" onClick={kundliApi.handleCompatibilitySubmit}>Check porutham</button>
              </article>
              {kundliApi.compatibility ? <article className="astrology-panel astro-result-card"><h4>Score</h4><p>{kundliApi.compatibility.summary}</p><strong>{Number(kundliApi.compatibility.score || 0)}%</strong></article> : null}
            </div>
          ) : null}

          {activeSection === "remedies" ? <div className="astro-card-grid"><article className="astrology-panel astro-result-card"><h4>Remedies</h4><ul>{getRemedyTips(selectedSign).map((tip) => <li key={tip}>{tip}</li>)}</ul></article></div> : null}

          {activeSection === "panchangam" ? (
            <div className="astro-card-grid">
              <article className="astrology-panel astro-result-card"><h4>Panchangam today</h4>{panchangamLoading ? <p className="astrology-inline-message">Loading...</p> : <ul><li>Tithi: {panchangam?.tithi || "Shukla Paksha Tritiya"}</li><li>Nakshatra: {getNakshatraDisplayName(panchangam?.nakshatra || "Revati", language)}</li><li>Rahu Kalam: {panchangam?.rahuKalam || "10:30 AM - 12:00 PM"}</li><li>Yamagandam: {panchangam?.yamagandam || "03:00 PM - 04:30 PM"}</li></ul>}{panchangamNotice ? <p className="astrology-inline-message astrology-inline-message-warning">{panchangamNotice}</p> : null}</article>
              <article className="astrology-panel astro-result-card"><h4>Festival updates</h4>{festivals.length ? <ul>{festivals.map((festival) => <li key={festival.name}><strong>{festival.name}</strong> - {festival.date}</li>)}</ul> : <p>No festival updates.</p>}</article>
            </div>
          ) : null}

          {activeSection === "ai" ? (
            <div className="astro-card-grid">
              <article className="astrology-panel astro-result-card astro-span-2">
                <h4>Ask AI Astrology</h4>
                <label className="astrology-field"><span>Your question</span><textarea rows={4} value={aiQuestion} onChange={(event) => setAiQuestion(event.target.value)} /></label>
                <button type="button" className="astrology-save-button" onClick={handleAskAssistant}>{aiLoading ? "Thinking..." : "Ask now"}</button>
              </article>
              {assistantAnswer ? <article className="astrology-panel astro-result-card astro-span-2"><h4>Answer</h4><p>{assistantAnswer.answer}</p>{assistantAnswer.tips?.length ? <ul>{assistantAnswer.tips.map((tip, index) => <li key={`${tip}-${index}`}>{tip}</li>)}</ul> : null}</article> : null}
            </div>
          ) : null}

          {activeSection === "saved" ? (
            <div className="astro-card-grid">
              <article className="astrology-panel astro-result-card"><h4>Saved daily reports</h4>{profileApi.recentSavedReadings.length ? <div className="astrology-mini-history-list">{profileApi.recentSavedReadings.map((item) => <button key={`${item.sign}-${item.readingDate}`} type="button" className="astrology-mini-history-item" onClick={() => { setSelectedSign(item.sign); setActiveSection("today"); }}><strong>{astrologyService.getFallbackSign(item.sign).label}</strong><span>{formatSavedReadingDate(item.readingDate)}</span></button>)}</div> : <p className="astrology-history-empty">No saved daily reports.</p>}</article>
              <article className="astrology-panel astro-result-card"><h4>Saved Kundli</h4>{kundliApi.kundliHistory.length ? <div className="astrology-mini-history-list">{kundliApi.kundliHistory.slice(0, 6).map((item) => <button key={item.id} type="button" className="astrology-mini-history-item" onClick={() => { kundliApi.handleRestoreKundliSnapshot(item); setActiveSection("kundli"); }}><strong>{item.profileName || "Profile"}</strong><span>{formatSavedReadingDate(item.createdAt)}</span></button>)}</div> : <p className="astrology-history-empty">No saved Kundli reports.</p>}</article>
            </div>
          ) : null}

          {activeSection === "profile" ? (
            <div className="astro-card-grid">
              <article className="astrology-panel astro-result-card astro-span-2">
                <h4>Profile settings</h4>
                <div className="astro-compact-form">
                  <label className="astrology-field"><span>Birth date</span><input type="date" value={profileApi.profileDraft.birthDate} onChange={(event) => profileApi.handleDraftChange("birthDate", event.target.value)} /></label>
                  <label className="astrology-field"><span>Birth time</span><input type="time" value={profileApi.profileDraft.birthTime} onChange={(event) => profileApi.handleDraftChange("birthTime", event.target.value)} /></label>
                  <label className="astrology-field"><span>Birth place</span><input type="text" list="astro-birth-place-options-profile" value={profileApi.profileDraft.birthPlace} onChange={(event) => handleBirthPlaceChange(event.target.value)} /><datalist id="astro-birth-place-options-profile">{BIRTH_LOCATION_OPTIONS.map((option) => <option key={option.label} value={option.label} />)}</datalist></label>
                  <label className="astrology-field"><span>Birth timezone</span><select value={profileApi.profileDraft.birthTimezone || DEFAULT_BIRTH_TIME_ZONE} onChange={(event) => handleBirthTimezoneChange(event.target.value)}>{BIRTH_TIMEZONE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                  <label className="astrology-field"><span>Gender</span><select value={profileApi.profileDraft.gender} onChange={(event) => profileApi.handleDraftChange("gender", event.target.value)}>{GENDER_OPTIONS.map((option) => <option key={option.value || "unset"} value={option.value}>{option.label}</option>)}</select></label>
                  <label className="astrology-field"><span>Favorite topics</span><input type="text" value={profileApi.profileDraft.favoriteTopics} onChange={(event) => profileApi.handleDraftChange("favoriteTopics", event.target.value)} /></label>
                </div>
                <button type="button" className="astrology-save-button" onClick={handleQuickSave}>Save profile</button>
              </article>
            </div>
          ) : null}

          {activeSection === "consult" ? (
            <div className="astro-card-grid">
              {consultApi.consultants.map((consultant) => {
                const key = consultant.id || consultant.name;
                return (
                  <article key={key} className="astrology-panel astro-result-card">
                    <h4>{consultant.name}</h4>
                    <p>{consultant.specialty}</p>
                    <p>{consultant.rate}</p>
                    <label className="astrology-field">
                      <span>Choose slot</span>
                      <select value={consultApi.consultationSlots[key] || ""} onChange={(event) => consultApi.handleConsultationSlotChange(key, event.target.value)}>
                        {consultant.availableSlots.map((slot) => <option key={slot.id} value={slot.id}>{slot.label}</option>)}
                      </select>
                    </label>
                    <button type="button" className="astrology-save-button" disabled={consultApi.bookingLoadingId === key} onClick={() => consultApi.handleBookConsultation(consultant)}>{consultApi.bookingLoadingId === key ? "Booking..." : "Book consultation"}</button>
                  </article>
                );
              })}
              {consultApi.lastBooking ? <article className="astrology-panel astro-result-card astro-span-2"><h4>Latest booking</h4><p>Code: {consultApi.lastBooking.confirmationCode}</p><p>Consultant: {consultApi.lastBooking.consultantName}</p><button type="button" className="astrology-secondary-button" disabled={consultApi.paymentRefreshLoadingId === consultApi.lastBooking.id} onClick={() => consultApi.handleRefreshPaymentStatus(consultApi.lastBooking)}>Refresh payment</button></article> : null}
            </div>
          ) : null}
        </section>
      </div>
      <nav className="astro-mobile-nav" aria-label="Astrology quick navigation">
        {MOBILE_NAV_ITEMS.map((item, index) => (
          <button
            key={`${item.key}-${index}`}
            type="button"
            className={`astro-mobile-nav-button ${activeSection === item.key ? "is-active" : ""}`}
            onClick={() => {
              const allowedBeforePersonalization = new Set(["today", "yearly", "total", "kundli", "profile"]);
              if (!personalizedReady && !allowedBeforePersonalization.has(item.key)) {
                setSaveState({
                  type: "error",
                  message: "Fill DOB, time, place, and gender in Kundli or Profile first.",
                });
                setActiveSection("today");
                return;
              }
              setActiveSection(item.key);
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </section>
  );
};

export default AstrologyHome;



