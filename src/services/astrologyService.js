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

const formatReadingDate = (value) => {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())) {
    return String(value).trim();
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toISOString().slice(0, 10);
};

const formatDateInputValue = (value) => {
  if (!value) {
    return "";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toISOString().slice(0, 10);
};

const getTodayReadingDate = () => formatReadingDate(new Date().toISOString());

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

const normalizeReadingPayload = (payload = {}) => {
  const signPayload = normalizeSignPayload(payload);

  return {
    ...signPayload,
    generatedAt: payload.generatedAt ? new Date(payload.generatedAt).toISOString() : "",
    readingDate: formatReadingDate(payload.readingDate || payload.generatedAt) || getTodayReadingDate(),
  };
};

const normalizeProfileItem = (item = {}) => ({
  id: String(item.id || item.name || `profile-${Math.random().toString(36).slice(2)}`),
  name: String(item.name || "You").trim(),
  relation: String(item.relation || "Self").trim(),
  sign: String(item.sign || "aries").trim().toLowerCase(),
  birthDate: formatDateInputValue(item.birthDate),
  birthTime: String(item.birthTime || "").trim(),
  birthPlace: String(item.birthPlace || "").trim(),
  birthTimezone: String(item.birthTimezone || "Asia/Kolkata").trim(),
  nakshatra: String(item.nakshatra || "Ashwini").trim(),
  rashi: String(item.rashi || "Mesha").trim(),
  lagna: String(item.lagna || "Mesha").trim(),
});

const normalizeKundliHistoryItem = (item = {}) => ({
  id: String(item.id || `kundli-${Math.random().toString(36).slice(2)}`),
  createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
  sign: String(item.sign || "aries").trim().toLowerCase(),
  profileName: String(item.profileName || "Profile").trim(),
  data: item?.data && typeof item.data === "object" ? item.data : null,
});

const normalizeCompatibilityHistoryItem = (item = {}) => ({
  id: String(item.id || `compatibility-${Math.random().toString(36).slice(2)}`),
  createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
  sign: String(item.sign || "aries").trim().toLowerCase(),
  partnerSign: String(item.partnerSign || "taurus").trim().toLowerCase(),
  data: item?.data && typeof item.data === "object" ? item.data : null,
});

const normalizeProfilePayload = (payload = {}) => ({
  sign: String(payload.sign || "").trim().toLowerCase(),
  birthDate: formatDateInputValue(payload.birthDate),
  birthTime: String(payload.birthTime || "").trim(),
  birthPlace: String(payload.birthPlace || "").trim(),
  birthTimezone: String(payload.birthTimezone || "Asia/Kolkata").trim(),
  nakshatra: String(payload.nakshatra || "").trim(),
  rashi: String(payload.rashi || "").trim(),
  lagna: String(payload.lagna || "").trim(),
  gender: String(payload.gender || "").trim().toLowerCase(),
  preferences: {
    receiveDailyHoroscope: payload?.preferences?.receiveDailyHoroscope !== false,
    favoriteTopics: Array.isArray(payload?.preferences?.favoriteTopics)
      ? payload.preferences.favoriteTopics
          .map((topic) => String(topic || "").trim())
          .filter(Boolean)
      : [],
  },
  notifications: {
    dailyHoroscope: payload?.notifications?.dailyHoroscope !== false,
    goodMuhurtam: payload?.notifications?.goodMuhurtam !== false,
    festivalReminders: payload?.notifications?.festivalReminders !== false,
    dashaAlerts: payload?.notifications?.dashaAlerts !== false,
  },
  familyProfiles: Array.isArray(payload.familyProfiles)
    ? payload.familyProfiles.map(normalizeProfileItem)
    : [],
  savedReadings: Array.isArray(payload.savedReadings)
    ? payload.savedReadings.map((reading) => normalizeReadingPayload(reading))
    : [],
  kundliHistory: Array.isArray(payload.kundliHistory)
    ? payload.kundliHistory.map((item) => normalizeKundliHistoryItem(item))
    : [],
  compatibilityHistory: Array.isArray(payload.compatibilityHistory)
    ? payload.compatibilityHistory.map((item) => normalizeCompatibilityHistoryItem(item))
    : [],
  updatedAt: payload.updatedAt || "",
});

const normalizeConsultantPayload = (payload = {}) => ({
  id: String(payload.id || payload.name || `consultant-${Math.random().toString(36).slice(2)}`).trim(),
  name: String(payload.name || "Astrology Consultant").trim(),
  specialty: String(payload.specialty || "General consultation").trim(),
  rate: String(payload.rate || "₹1,000 / 15 min").trim(),
  amountInr: Number(payload.amountInr) > 0 ? Number(payload.amountInr) : 1000,
  availability: String(payload.availability || "Today").trim(),
  availableSlots: Array.isArray(payload.availableSlots)
    ? payload.availableSlots
        .map((slot, index) => ({
          id: String(slot?.id || `${payload.id || "slot"}-${index + 1}`).trim(),
          label: String(slot?.label || slot?.slot || "").trim(),
          date: String(slot?.date || "").trim(),
        }))
        .filter((slot) => slot.id && slot.label)
    : [],
});

const normalizeConsultationBooking = (payload = {}) => ({
  id: String(payload.id || payload._id || payload.confirmationCode || "").trim(),
  consultantId: String(payload.consultantId || "").trim(),
  consultantName: String(payload.consultantName || "").trim(),
  slot: String(payload.slot || "").trim(),
  preferredDate: formatDateInputValue(payload.preferredDate) || "",
  status: String(payload.status || "confirmed").trim(),
  confirmationCode: String(payload.confirmationCode || "").trim(),
  amountInr: Number(payload.amountInr) > 0 ? Number(payload.amountInr) : 0,
  currency: String(payload.currency || "INR").trim(),
  paymentStatus: String(payload.paymentStatus || "pending").trim(),
  paymentOrderId: String(payload.paymentOrderId || "").trim(),
  paymentId: String(payload.paymentId || "").trim(),
  createdAt: payload.createdAt || "",
});

const extractFileNameFromContentDisposition = (contentDisposition = "") => {
  const headerValue = String(contentDisposition || "");
  const fileNameMatch = headerValue.match(/filename="?([^";]+)"?/i);
  return fileNameMatch?.[1] || `kundli-report-${new Date().toISOString().slice(0, 10)}.pdf`;
};

const buildServiceError = (error, fallbackData, defaultMessage) => {
  const nextError = new Error(
    error?.response?.data?.message || error?.message || defaultMessage || "Astrology request failed."
  );
  nextError.fallbackData = fallbackData;
  nextError.cause = error;
  return nextError;
};

export const astrologyService = {
  getFallbackSigns() {
    return FALLBACK_SIGNS.map((entry) => normalizeSignPayload(entry));
  },

  getFallbackSign(sign) {
    return normalizeSignPayload(bySign(sign));
  },

  getFallbackReading(sign) {
    return normalizeReadingPayload({
      ...bySign(sign),
      generatedAt: new Date().toISOString(),
      readingDate: getTodayReadingDate(),
    });
  },

  async getSigns() {
    const fallbackSigns = this.getFallbackSigns();

    try {
      const response = await axios.get(`${API_BASE_URL}/astrology/signs`);
      if (!response.data?.success || !Array.isArray(response.data.data)) {
        throw new Error("Live astrology signs could not be loaded.");
      }

      return response.data.data.map(normalizeSignPayload);
    } catch (error) {
      throw buildServiceError(
        error,
        fallbackSigns,
        "Live astrology signs could not be loaded."
      );
    }
  },

  async getDailyHoroscope(sign) {
    const fallbackReading = this.getFallbackReading(sign);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/astrology/daily/${encodeURIComponent(String(sign || "").toLowerCase())}`
      );

      if (!response.data?.success || !response.data?.data) {
        throw new Error("Live astrology is unavailable right now.");
      }

      return normalizeReadingPayload(response.data.data);
    } catch (error) {
      throw buildServiceError(
        error,
        fallbackReading,
        "Live astrology is unavailable right now."
      );
    }
  },

  async getProfile() {
    try {
      const response = await axios.get(`${API_BASE_URL}/astrology/profile`);

      if (!response.data?.success) {
        throw new Error("Unable to load your astrology profile.");
      }

      return response.data.data ? normalizeProfilePayload(response.data.data) : null;
    } catch (error) {
      throw buildServiceError(error, null, "Unable to load your astrology profile.");
    }
  },

  async updateProfile(payload = {}) {
    const normalizedPayload = {
      sign: String(payload.sign || "").trim().toLowerCase(),
      birthDate: payload.birthDate || undefined,
      birthTime: String(payload.birthTime || "").trim(),
      birthPlace: String(payload.birthPlace || "").trim(),
      birthTimezone: String(payload.birthTimezone || "Asia/Kolkata").trim(),
      nakshatra: String(payload.nakshatra || "").trim(),
      rashi: String(payload.rashi || "").trim(),
      lagna: String(payload.lagna || "").trim(),
      gender: String(payload.gender || "").trim().toLowerCase(),
      preferences: {
        receiveDailyHoroscope: payload?.preferences?.receiveDailyHoroscope !== false,
        favoriteTopics: Array.isArray(payload?.preferences?.favoriteTopics)
          ? payload.preferences.favoriteTopics
              .map((topic) => String(topic || "").trim())
              .filter(Boolean)
          : [],
      },
      notifications: {
        dailyHoroscope: payload?.notifications?.dailyHoroscope !== false,
        goodMuhurtam: payload?.notifications?.goodMuhurtam !== false,
        festivalReminders: payload?.notifications?.festivalReminders !== false,
        dashaAlerts: payload?.notifications?.dashaAlerts !== false,
      },
      familyProfiles: Array.isArray(payload.familyProfiles)
        ? payload.familyProfiles.map(normalizeProfileItem)
        : [],
    };

    try {
      const response = await axios.put(`${API_BASE_URL}/astrology/profile`, normalizedPayload);

      if (!response.data?.success || !response.data?.data) {
        throw new Error("Unable to save your astrology profile.");
      }

      return normalizeProfilePayload(response.data.data);
    } catch (error) {
      throw buildServiceError(error, null, "Unable to save your astrology profile.");
    }
  },

  async updateProfileHistory(payload = {}) {
    const nextPayload = {};

    if (payload?.kundliHistory !== undefined) {
      nextPayload.kundliHistory = Array.isArray(payload.kundliHistory)
        ? payload.kundliHistory.map((item) => normalizeKundliHistoryItem(item))
        : [];
    }

    if (payload?.compatibilityHistory !== undefined) {
      nextPayload.compatibilityHistory = Array.isArray(payload.compatibilityHistory)
        ? payload.compatibilityHistory.map((item) => normalizeCompatibilityHistoryItem(item))
        : [];
    }

    if (!Object.keys(nextPayload).length) {
      return this.getProfile();
    }

    try {
      const response = await axios.put(`${API_BASE_URL}/astrology/profile`, nextPayload);

      if (!response.data?.success || !response.data?.data) {
        throw new Error("Unable to save astrology history.");
      }

      return normalizeProfilePayload(response.data.data);
    } catch (error) {
      throw buildServiceError(error, null, "Unable to save astrology history.");
    }
  },

  async getPanchangam() {
    const fallback = {
      tithi: "Shukla Paksha Tritiya",
      nakshatra: "Revati",
      yoga: "Siddha",
      karana: "Bava",
      sunrise: "06:02 AM",
      sunset: "06:40 PM",
      rahuKalam: "10:30 AM - 12:00 PM",
      yamagandam: "03:00 PM - 04:30 PM",
      gulika: "07:30 AM - 09:00 AM",
    };

    try {
      const response = await axios.get(`${API_BASE_URL}/astrology/panchangam`);
      if (!response.data?.success || !response.data?.data) {
        throw new Error("Unable to fetch Panchangam details.");
      }
      return response.data.data;
    } catch (error) {
      throw buildServiceError(error, fallback, "Unable to fetch Panchangam details.");
    }
  },

  async getFestivalUpdates() {
    const fallback = [
      {
        name: "Vishu",
        date: "Apr 14",
        note: "Kerala new year; perfect for family puja and new beginnings.",
      },
      {
        name: "Navaratri",
        date: "Oct 1 - Oct 10",
        note: "Focus on protective rituals and strength-building prayers.",
      },
      {
        name: "Karkidaka Vavu",
        date: "Jul 23",
        note: "Time for ancestral offerings and spiritual renewal.",
      },
    ];

    try {
      const response = await axios.get(`${API_BASE_URL}/astrology/festivals`);
      if (!response.data?.success || !Array.isArray(response.data?.data)) {
        throw new Error("Unable to fetch festival updates.");
      }
      return response.data.data;
    } catch (error) {
      throw buildServiceError(error, fallback, "Unable to fetch festival updates.");
    }
  },

  async getKundliData(profile = {}) {
    const fallback = {
      birthChart: {
        ascendant: profile.lagna || "Mesha",
        sun: profile.sign || "Aries",
        moon: profile.nakshatra || "Ashwini",
        mars: "Gemini",
        mercury: "Taurus",
        venus: "Cancer",
        jupiter: "Leo",
      },
      navamsa: {
        lord: "Sun",
        balance: "Strong creative support for family and career.",
      },
      dasha: {
        current: "Venus",
        next: "Mars",
        summary: "A period of relationship focus with potential growth through discipline.",
      },
      planets: [
        { planet: "Sun", position: "10° Aries" },
        { planet: "Moon", position: "22° Cancer" },
        { planet: "Mars", position: "05° Gemini" },
        { planet: "Mercury", position: "18° Taurus" },
      ],
      remedies: [
        "Begin the day with focused breathing and prayer.",
        "Make one practical plan for the week and follow through.",
        "Support family harmony with calm communication.",
      ],
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/astrology/kundli`, { profile });
      if (!response.data?.success || !response.data?.data) {
        throw new Error("Unable to generate Kundli.");
      }
      return response.data.data;
    } catch (error) {
      throw buildServiceError(error, fallback, "Unable to generate Kundli.");
    }
  },

  async getCompatibility(sign, partnerSign) {
    const fallback = {
      score: 76,
      summary:
        "Your signs have strong emotional alignment, with small adjustments needed around timing and finances.",
      keyMatch: "Rasi Porutham: Sama, Gana Porutham: Maitra, Vasya Porutham: Anuradha",
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/astrology/compatibility`, {
        sign,
        partnerSign,
      });
      if (!response.data?.success || !response.data?.data) {
        throw new Error("Unable to calculate compatibility.");
      }
      return response.data.data;
    } catch (error) {
      throw buildServiceError(error, fallback, "Unable to calculate compatibility.");
    }
  },

  async askAstrologyAssistant(question, sign) {
    const fallback = {
      answer:
        "A balanced routine, a respectful family atmosphere, and small temple offerings help steady current planetary energies.",
      tips: [
        "Start the day with a short prayer or breathing exercise.",
        "Wear copper or green for calm energy this week.",
      ],
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/astrology/assistant`, {
        question,
        sign,
      });
      if (!response.data?.success || !response.data?.data) {
        throw new Error("Unable to answer your astrology question.");
      }
      return response.data.data;
    } catch (error) {
      throw buildServiceError(error, fallback, "Unable to answer your astrology question.");
    }
  },

  async getConsultants() {
    const fallback = [
      {
        id: "acharya-madhav",
        name: "Madhav Acharya",
        specialty: "Kerala Jathakam, Matchmaking, Remedies",
        rate: "₹1,200 / 15 min",
        amountInr: 1200,
        availability: "Today 4:00 PM - 7:00 PM",
        availableSlots: [
          { id: "today-1600", label: "Today 4:00 PM", date: "today" },
          { id: "today-1730", label: "Today 5:30 PM", date: "today" },
        ],
      },
      {
        id: "nambiar-priya",
        name: "Priya Nambiar",
        specialty: "Kundli, Nakshatra counseling, Blessings rituals",
        rate: "₹950 / 15 min",
        amountInr: 950,
        availability: "Tomorrow 10:00 AM - 1:00 PM",
        availableSlots: [
          { id: "tomorrow-1000", label: "Tomorrow 10:00 AM", date: "tomorrow" },
          { id: "tomorrow-1130", label: "Tomorrow 11:30 AM", date: "tomorrow" },
        ],
      },
    ];

    try {
      const response = await axios.get(`${API_BASE_URL}/astrology/consultants`);
      if (!response.data?.success || !Array.isArray(response.data?.data)) {
        throw new Error("Unable to load astrologer profiles.");
      }
      return response.data.data.map(normalizeConsultantPayload);
    } catch (error) {
      throw buildServiceError(
        error,
        fallback.map(normalizeConsultantPayload),
        "Unable to load astrologer profiles."
      );
    }
  },

  async downloadKundliReport(profile = {}) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/astrology/kundli/report`,
        { profile },
        {
          responseType: "blob",
        }
      );

      const fileName = extractFileNameFromContentDisposition(
        response.headers?.["content-disposition"]
      );

      return {
        blob: response.data,
        fileName,
      };
    } catch (error) {
      throw buildServiceError(error, null, "Unable to download Kundli PDF report.");
    }
  },

  async downloadHoroscopeReport(sign = "aries", period = "year") {
    try {
      const response = await axios.get(`${API_BASE_URL}/astrology/horoscope/report`, {
        params: {
          sign,
          period,
        },
        responseType: "blob",
      });

      const fileName = extractFileNameFromContentDisposition(
        response.headers?.["content-disposition"]
      );

      return {
        blob: response.data,
        fileName,
      };
    } catch (error) {
      throw buildServiceError(error, null, "Unable to download horoscope PDF report.");
    }
  },

  async createConsultationBooking(payload = {}) {
    const normalizedPayload = {
      consultantId: String(payload.consultantId || "").trim(),
      slotId: String(payload.slotId || "").trim(),
      preferredDate: payload.preferredDate || new Date().toISOString(),
      notes: String(payload.notes || "").trim(),
    };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/astrology/consultations/book`,
        normalizedPayload
      );

      if (!response.data?.success || !response.data?.data) {
        throw new Error("Unable to create consultation booking.");
      }

      return normalizeConsultationBooking(response.data.data);
    } catch (error) {
      throw buildServiceError(error, null, "Unable to create consultation booking.");
    }
  },

  async getConsultationHistory() {
    try {
      const response = await axios.get(`${API_BASE_URL}/astrology/consultations`);

      if (!response.data?.success || !Array.isArray(response.data?.data)) {
        throw new Error("Unable to load consultation history.");
      }

      return response.data.data.map(normalizeConsultationBooking);
    } catch (error) {
      throw buildServiceError(error, [], "Unable to load consultation history.");
    }
  },

  async updateConsultationBookingStatus(bookingId, status) {
    const normalizedBookingId = String(bookingId || "").trim();
    const normalizedStatus = String(status || "").trim();
    if (!normalizedBookingId) {
      throw new Error("Booking id is required to update consultation status.");
    }
    if (!normalizedStatus) {
      throw new Error("Status value is required to update consultation status.");
    }

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/astrology/consultations/${encodeURIComponent(
          normalizedBookingId
        )}/status`,
        {
          status: normalizedStatus,
        }
      );

      if (!response.data?.success || !response.data?.data) {
        throw new Error("Unable to update consultation status.");
      }

      return normalizeConsultationBooking(response.data.data);
    } catch (error) {
      throw buildServiceError(error, null, "Unable to update consultation status.");
    }
  },

  async createConsultationPaymentOrder(bookingId) {
    const normalizedBookingId = String(bookingId || "").trim();
    if (!normalizedBookingId) {
      throw new Error("Booking id is required to create a payment order.");
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/astrology/consultations/${encodeURIComponent(
          normalizedBookingId
        )}/payment/create-order`
      );

      if (!response.data?.success || !response.data?.data) {
        throw new Error("Unable to create consultation payment order.");
      }

      return response.data.data;
    } catch (error) {
      throw buildServiceError(error, null, "Unable to create consultation payment order.");
    }
  },

  async verifyConsultationPayment(bookingId, payload = {}) {
    const normalizedBookingId = String(bookingId || "").trim();
    if (!normalizedBookingId) {
      throw new Error("Booking id is required to verify payment.");
    }

    const normalizedPayload = {
      orderId: String(payload.orderId || "").trim(),
      paymentId: String(payload.paymentId || "").trim(),
      signature: String(payload.signature || "").trim(),
    };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/astrology/consultations/${encodeURIComponent(
          normalizedBookingId
        )}/payment/verify`,
        normalizedPayload
      );

      if (!response.data?.success || !response.data?.data) {
        throw new Error("Unable to verify consultation payment.");
      }

      return normalizeConsultationBooking(response.data.data);
    } catch (error) {
      throw buildServiceError(error, null, "Unable to verify consultation payment.");
    }
  },

  async getConsultationPaymentStatus(bookingId) {
    const normalizedBookingId = String(bookingId || "").trim();
    if (!normalizedBookingId) {
      throw new Error("Booking id is required to load payment status.");
    }

    try {
      const response = await axios.get(
        `${API_BASE_URL}/astrology/consultations/${encodeURIComponent(
          normalizedBookingId
        )}/payment`
      );

      if (!response.data?.success || !response.data?.data) {
        throw new Error("Unable to load consultation payment status.");
      }

      return response.data.data;
    } catch (error) {
      throw buildServiceError(error, null, "Unable to load consultation payment status.");
    }
  },
};
