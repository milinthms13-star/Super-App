import { ASTROLOGY_PRIMARY_TABS } from "../astrologyUpgradeUtils";

export const FEATURE_TABS = ASTROLOGY_PRIMARY_TABS;

export const MOBILE_NAV_ITEMS = [
  { key: "today", label: "Home" },
  { key: "kundli", label: "Kundli" },
  { key: "ai", label: "AI Astro" },
  { key: "consult", label: "Consult" },
  { key: "profile", label: "Profile" },
];

export const GENDER_OPTIONS = [
  { value: "", label: "Select gender", labelMl: "\u0d32\u0d3f\u0d02\u0d17\u0d02 \u0d24\u0d3f\u0d30\u0d1e\u0d4d\u0d1e\u0d46\u0d1f\u0d41\u0d15\u0d4d\u0d15\u0d41\u0d15" },
  { value: "male", label: "Male", labelMl: "\u0d2a\u0d41\u0d30\u0d41\u0d37\u0d7b" },
  { value: "female", label: "Female", labelMl: "\u0d38\u0d4d\u0d24\u0d4d\u0d30\u0d40" },
  { value: "other", label: "Other", labelMl: "\u0d2e\u0d31\u0d4d\u0d31\u0d41\u0d33\u0d4d\u0d33\u0d35\u0d7c" },
];

export const DEFAULT_BIRTH_TIME_ZONE = "Asia/Kolkata";

export const BIRTH_TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "India (IST) - Asia/Kolkata" },
  { value: "Asia/Dubai", label: "UAE - Asia/Dubai" },
  { value: "Asia/Singapore", label: "Singapore - Asia/Singapore" },
  { value: "Europe/London", label: "UK - Europe/London" },
  { value: "America/New_York", label: "US Eastern - America/New_York" },
  { value: "America/Chicago", label: "US Central - America/Chicago" },
  { value: "America/Denver", label: "US Mountain - America/Denver" },
  { value: "America/Los_Angeles", label: "US Pacific - America/Los_Angeles" },
];

export const BIRTH_LOCATION_OPTIONS = [
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

