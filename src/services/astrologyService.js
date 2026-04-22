import axios from "axios";
import { API_BASE_URL } from "../utils/api";

const FALLBACK_SIGNS = [
  {
    sign: "aries",
    label: "Aries",
    dateRange: "Mar 21 - Apr 19",
    element: "Fire",
    color: "#d66d4b",
    horoscope:
      "Start with the task that needs courage, not the one that feels easiest.",
  },
  {
    sign: "taurus",
    label: "Taurus",
    dateRange: "Apr 20 - May 20",
    element: "Earth",
    color: "#6c8f4e",
    horoscope:
      "Steady choices keep everything grounded. Protect your routines today.",
  },
  {
    sign: "gemini",
    label: "Gemini",
    dateRange: "May 21 - Jun 20",
    element: "Air",
    color: "#c38f1f",
    horoscope:
      "A conversation clears confusion faster than overthinking ever will.",
  },
  {
    sign: "cancer",
    label: "Cancer",
    dateRange: "Jun 21 - Jul 22",
    element: "Water",
    color: "#4f7db8",
    horoscope:
      "Make room for calm before reacting. Your intuition works best in quiet.",
  },
  {
    sign: "leo",
    label: "Leo",
    dateRange: "Jul 23 - Aug 22",
    element: "Fire",
    color: "#d89a1a",
    horoscope:
      "Confidence rises when you stop waiting for perfect timing and begin.",
  },
  {
    sign: "virgo",
    label: "Virgo",
    dateRange: "Aug 23 - Sep 22",
    element: "Earth",
    color: "#79833a",
    horoscope:
      "Small cleanups today create surprising momentum for the rest of the week.",
  },
  {
    sign: "libra",
    label: "Libra",
    dateRange: "Sep 23 - Oct 22",
    element: "Air",
    color: "#b56e98",
    horoscope:
      "Choose the balanced option, but do not confuse balance with delay.",
  },
  {
    sign: "scorpio",
    label: "Scorpio",
    dateRange: "Oct 23 - Nov 21",
    element: "Water",
    color: "#8f3042",
    horoscope:
      "Trust your instincts, then back them with one practical next step.",
  },
  {
    sign: "sagittarius",
    label: "Sagittarius",
    dateRange: "Nov 22 - Dec 21",
    element: "Fire",
    color: "#cf7c2d",
    horoscope:
      "Try the new idea in a lightweight way before committing fully.",
  },
  {
    sign: "capricorn",
    label: "Capricorn",
    dateRange: "Dec 22 - Jan 19",
    element: "Earth",
    color: "#55653a",
    horoscope:
      "Consistency is your advantage today. Build structure around what matters most.",
  },
  {
    sign: "aquarius",
    label: "Aquarius",
    dateRange: "Jan 20 - Feb 18",
    element: "Air",
    color: "#4a82c2",
    horoscope:
      "Your unusual perspective can solve a problem others are circling around.",
  },
  {
    sign: "pisces",
    label: "Pisces",
    dateRange: "Feb 19 - Mar 20",
    element: "Water",
    color: "#5d7fc6",
    horoscope:
      "Protect your focus and let reflection guide your decisions instead of pressure.",
  },
];

const bySign = (value = "") =>
  FALLBACK_SIGNS.find((entry) => entry.sign === String(value || "").trim().toLowerCase()) ||
  FALLBACK_SIGNS[0];

const normalizeSignPayload = (payload = {}) => {
  const fallback = bySign(payload.sign || payload.label);

  return {
    ...fallback,
    ...payload,
    sign: String(payload.sign || fallback.sign).trim().toLowerCase(),
    label: String(payload.label || fallback.label).trim(),
    dateRange: String(payload.dateRange || fallback.dateRange).trim(),
    element: String(payload.element || fallback.element).trim(),
    color: String(payload.color || fallback.color).trim(),
    horoscope: String(payload.horoscope || fallback.horoscope).trim(),
  };
};

export const astrologyService = {
  async getSigns() {
    try {
      const response = await axios.get(`${API_BASE_URL}/astrology/signs`);
      if (!response.data?.success || !Array.isArray(response.data.data)) {
        return FALLBACK_SIGNS;
      }

      return response.data.data.map(normalizeSignPayload);
    } catch (error) {
      return FALLBACK_SIGNS;
    }
  },

  async getDailyHoroscope(sign) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/astrology/daily/${encodeURIComponent(String(sign || "").toLowerCase())}`
      );

      if (!response.data?.success || !response.data?.data) {
        return normalizeSignPayload(bySign(sign));
      }

      return normalizeSignPayload(response.data.data);
    } catch (error) {
      return normalizeSignPayload(bySign(sign));
    }
  },

  getFallbackSign(sign) {
    return normalizeSignPayload(bySign(sign));
  },
};
