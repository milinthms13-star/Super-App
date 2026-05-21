import { DEFAULT_BIRTH_TIME_ZONE } from "../data/astrologyConstants";
import {
  getCanonicalNakshatraName,
  getLagnaFromTime,
  getNakshatraFromSign,
  getRashiFromSign,
  getSignFromRashi,
  NAKSHATRA_NAMES,
  RASHI_NAMES,
} from "./zodiacMapping";
import { calculateBirthAstroProfile, calculateNakshatra } from "./astroMath";

export const createProfileDraft = (profile = null) => ({
  birthDate: profile?.birthDate || "",
  birthTime: profile?.birthTime || "",
  birthPlace: profile?.birthPlace || "",
  birthTimezone: profile?.birthTimezone || DEFAULT_BIRTH_TIME_ZONE,
  nakshatra:
    getCanonicalNakshatraName(profile?.nakshatra) ||
    calculateNakshatra(
      profile?.birthDate,
      profile?.birthTime,
      profile?.birthTimezone,
      NAKSHATRA_NAMES,
      RASHI_NAMES
    ) ||
    "",
  rashi:
    profile?.rashi ||
    calculateBirthAstroProfile(
      profile?.birthDate,
      profile?.birthTime,
      profile?.birthTimezone,
      NAKSHATRA_NAMES,
      RASHI_NAMES
    ).rashi ||
    "",
  lagna: profile?.lagna || getLagnaFromTime(profile?.birthTime) || "",
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

export const createFamilyProfileDraft = (profile = null) => ({
  id: profile?.id || "",
  name: profile?.name || "",
  relation: profile?.relation || "Self",
  sign: profile?.sign || "aries",
  birthDate: profile?.birthDate || "",
  birthTime: profile?.birthTime || "",
  birthPlace: profile?.birthPlace || "",
  birthTimezone: profile?.birthTimezone || DEFAULT_BIRTH_TIME_ZONE,
});

export const getDefaultFamilyProfile = (profile, userName) => ({
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

export const formatSavedReadingDate = (value) => {
  if (!value) return "Today";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const getAutoSignFromRashi = (rashi) => getSignFromRashi(rashi);
