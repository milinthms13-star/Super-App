import React, { useEffect, useMemo, useState } from "react";
import HoroscopeCard from "./HoroscopeCard";
import { astrologyService } from "../../services/astrologyService";
import { useApp } from "../../contexts/AppContext";
import "../../styles/Astrology.css";

const parseFavoriteTopics = (value = "") =>
  String(value || "")
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean);

const formatSavedReadingDate = (value) => {
  if (!value) {
    return "Today";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const ASTRO_SECTIONS = [
  {
    key: "today",
    label: "Today",
    labelMl: "ഇന്ന്",
    description: "Daily predictions, timing, and live Kerala-style guidance.",
    descriptionMl: "ദിവസേന പ്രവചനങ്ങൾ, സമയ നിർദേശങ്ങൾ, ജീവിച്ചിരിക്കുന്ന കേരള ശൈലിയുടെ മാർഗനിർദ്ദേശം.",
  },
  {
    key: "profile",
    label: "Profile",
    labelMl: "പ്രൊഫൈൽ",
    description: "Save and manage family birth profiles.",
    descriptionMl: "കുടുംബ ജന്മ പ്രൊഫൈലുകൾ സംരക്ഷിച്ച് നിയന്ത്രിക്കുക.",
  },
  {
    key: "rashi",
    label: "Rashi/Nakshatra",
    labelMl: "രാശി/നക്ഷത്രം",
    description: "Detailed rashi and nakshatra insights.",
    descriptionMl: "രാശി, നക്ഷത്രം സംബന്ധിച്ച വിശദമായ അറിവുകൾ.",
  },
  {
    key: "kundli",
    label: "Kundli",
    labelMl: "കുണ്ടലി",
    description: "Birth chart, navamsa and dasha summaries.",
    descriptionMl: "ജന്മ ചാർട്ട്, നവംശം, ദശാ സംഗ്രഹങ്ങൾ.",
  },
  {
    key: "match",
    label: "Marriage Match",
    labelMl: "വിവാഹ പൊരുത്തം",
    description: "Check compatibility for porutham and prosperity.",
    descriptionMl: "പൊരുത്തം, സമൃദ്ധി എന്നിവയുടെ അനുയോജ്യത പരിശോധിക്കുക.",
  },
  {
    key: "panchangam",
    label: "Panchangam",
    labelMl: "പഞ്ചാംഗം",
    description: "Festival timing, tithi, and auspicious hours.",
    descriptionMl: "ഉത്സവ സമയങ്ങൾ, തിഥി, ശുഭ സമയങ്ങൾ.",
  },
  {
    key: "remedies",
    label: "Remedies",
    labelMl: "ശമനങ്ങൾ",
    description: "Personalized mantras, temples, and parishads.",
    descriptionMl: "വ്യക്തിഗത മന്ത്രങ്ങൾ, ക്ഷേത്ര നിർദേശങ്ങൾ, പരിഷദുകൾ.",
  },
  {
    key: "consult",
    label: "Talk to Astrologer",
    labelMl: "ജ്യോതിഷനുമായി സംവദിക്കുക",
    description: "Book paid consultations with Kerala specialists.",
    descriptionMl: "കേരള വിദഗ്ധരുമായി പണം അടച്ച് 상담ം ബുക്ക് ചെയ്യുക.",
  },
  {
    key: "ai",
    label: "AI Assistant",
    labelMl: "എ.ഐ. സഹായി",
    description: "Ask a specific astrology question and receive guidance.",
    descriptionMl: "ഒരു വ്യക്തമായ ജ്യോതിഷ ചോദ്യമുയർത്തി മാർഗനിർദ്ദേശം നേടുക.",
  },
];

const getNakshatraFromSign = (sign) => {
  const map = {
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
  };

  return map[sign] || "Ashwini";
};

const getRashiFromSign = (sign) => {
  const map = {
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
  };

  return map[sign] || "Mesha";
};

const getLagnaFromTime = (time) => {
  if (!time) {
    return "Mesha";
  }

  const hour = Number(time.split(":")[0] || 6);
  if (hour < 4) return "Meena";
  if (hour < 8) return "Mesha";
  if (hour < 12) return "Vrishabha";
  if (hour < 16) return "Karkata";
  if (hour < 20) return "Simha";
  return "Tula";
};

const getLuckyColor = (sign) => {
  const map = {
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
  };

  return map[sign] || "Gold";
};

const getLuckyNumber = (sign) => {
  const map = {
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
  };

  return map[sign] || 7;
};

const getGoodTime = (sign) => {
  const map = {
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
  };

  return map[sign] || "10:30 - 12:00";
};

const getAvoidTime = (sign) => {
  const map = {
    aries: "13:00 - 14:30",
    taurus: "16:30 - 18:00",
    gemini: "18:30 - 20:00",
    cancer: "11:00 - 12:30",
    leo: "09:00 - 10:30",
    virgo: "15:30 - 17:00",
    libra: "12:00 - 13:30",
    scorpio: "08:00 - 09:30",
    sagittarius: "11:30 - 13:00",
    capricorn: "17:30 - 19:00",
    aquarius: "10:00 - 11:30",
    pisces: "14:00 - 15:30",
  };

  return map[sign] || "03:00 - 04:30";
};

const getRashiSummary = (sign) => {
  const map = {
    aries: "Today is best for quick decisions backed by a family discussion.",
    taurus: "Planned progress will feel more rewarding than immediate gain.",
    gemini: "A short trip or message will open the right door.",
    cancer: "Trust small rituals to steady your day.",
    leo: "Stay warm, keep your presence generous, and avoid unnecessary conflict.",
    virgo: "Detail work is powerful now - use it to simplify plans.",
    libra: "Balance activity with rest and let others join you.",
    scorpio: "Focus on shared values, not control.",
    sagittarius: "A creative idea can become a practical plan if you start small.",
    capricorn: "Stick to routine, especially with money and health.",
    aquarius: "A friend or sibling brings useful perspective today.",
    pisces: "A calming habit will help you stay centered through change.",
  };

  return map[sign] || "Create structure before you expand energy outward.";
};

const getNakshatraReminder = (nakshatra) =>
  `For ${nakshatra}, favor supportive actions, brief rituals, and sincere conversation.`;

const getDefaultFamilyProfile = (profile, userName) => ({
  id: `self-${Date.now()}`,
  name: userName || "You",
  relation: "Self",
  sign: profile?.sign || "aries",
  birthDate: profile?.birthDate || "",
  birthTime: profile?.birthTime || "",
  birthPlace: profile?.birthPlace || "",
  nakshatra: profile?.nakshatra || getNakshatraFromSign(profile?.sign || "aries"),
  rashi: profile?.rashi || getRashiFromSign(profile?.sign || "aries"),
  lagna: profile?.lagna || getLagnaFromTime(profile?.birthTime || "06:00"),
});

const createProfileDraft = (profile = null) => ({
  birthDate: profile?.birthDate || "",
  birthTime: profile?.birthTime || "",
  birthPlace: profile?.birthPlace || "",
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
});

const localize = (en, ml, language) => {
  if (language !== "ml") {
    return en;
  }

  if (!ml || typeof ml !== "string") {
    return en;
  }

  const hasMalayalam = /[\u0D00-\u0D7F]/.test(ml);
  if (!hasMalayalam) {
    return en;
  }

  // Prevent placeholder content from showing up as "????".
  // If the Malayalam string contains '?' (common placeholder), fall back to English.
  if (ml.includes("?")) {
    return en;
  }

  return ml;
};

const loadRazorpaySdk = () =>
  new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const AstrologyHome = () => {
  const { currentUser } = useApp();
  const [language, setLanguage] = useState("en");
  const [signs, setSigns] = useState([]);
  const [selectedSign, setSelectedSign] = useState("");
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signsNotice, setSignsNotice] = useState("");
  const [readingNotice, setReadingNotice] = useState("");
  const [profile, setProfile] = useState(null);
  const [profileDraft, setProfileDraft] = useState(() => createProfileDraft());
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileNotice, setProfileNotice] = useState("");
  const [saveState, setSaveState] = useState({ type: "", message: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [activeSection, setActiveSection] = useState("today");
  const [familyProfiles, setFamilyProfiles] = useState([]);
  const [activeFamilyIndex, setActiveFamilyIndex] = useState(0);
  const [familyDraft, setFamilyDraft] = useState(() => createFamilyProfileDraft());
  const [partnerSign, setPartnerSign] = useState("taurus");
  const [compatibility, setCompatibility] = useState(null);
  const [consultants, setConsultants] = useState([]);
  const [festivals, setFestivals] = useState([]);
  const [panchangam, setPanchangam] = useState(null);
  const [panchangamNotice, setPanchangamNotice] = useState("");
  const [panchangamLoading, setPanchangamLoading] = useState(true);
  const [aiQuestion, setAiQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [kundliData, setKundliData] = useState(null);
  const [kundliLoading, setKundliLoading] = useState(false);
  const [downloadingKundli, setDownloadingKundli] = useState(false);
  const [consultationSlots, setConsultationSlots] = useState({});
  const [bookingLoadingId, setBookingLoadingId] = useState("");
  const [lastBooking, setLastBooking] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const selectedProfile = familyProfiles[activeFamilyIndex] || familyProfiles[0] || {};

  useEffect(() => {
    let active = true;

    const loadSigns = async () => {
      try {
        const nextSigns = await astrologyService.getSigns();
        if (!active) {
          return;
        }

        setSigns(nextSigns);
        setSelectedSign((currentSign) => currentSign || nextSigns[0]?.sign || "aries");
        setSignsNotice("");
      } catch (loadError) {
        if (!active) {
          return;
        }

        const fallbackSigns = loadError.fallbackData || astrologyService.getFallbackSigns();
        setSigns(fallbackSigns);
        setSignsNotice(
          loadError.message ||
            "Live astrology signs are unavailable right now. Built-in sign data is being shown."
        );
        setSelectedSign((currentSign) => currentSign || fallbackSigns[0]?.sign || "aries");
      }
    };

    loadSigns();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setProfileLoading(true);

      try {
        const nextProfile = await astrologyService.getProfile();
        if (!active) {
          return;
        }

        setProfile(nextProfile);
        setProfileDraft(createProfileDraft(nextProfile));
        setProfileNotice("");

        const initialFamily = Array.isArray(nextProfile?.familyProfiles) && nextProfile.familyProfiles.length
          ? nextProfile.familyProfiles.map((item) => ({
              ...item,
              nakshatra: item.nakshatra || getNakshatraFromSign(item.sign),
              rashi: item.rashi || getRashiFromSign(item.sign),
              lagna: item.lagna || getLagnaFromTime(item.birthTime),
            }))
          : [getDefaultFamilyProfile(nextProfile, currentUser?.name)];

        setFamilyProfiles(initialFamily);
        setActiveFamilyIndex(0);
        setFamilyDraft(createFamilyProfileDraft(initialFamily[0]));

        if (nextProfile?.sign) {
          setSelectedSign(nextProfile.sign);
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        setProfile(null);
        setProfileDraft(createProfileDraft());
        const defaultProfiles = [getDefaultFamilyProfile(null, currentUser?.name)];
        setFamilyProfiles(defaultProfiles);
        setActiveFamilyIndex(0);
        setFamilyDraft(createFamilyProfileDraft(defaultProfiles[0]));
        setProfileNotice(loadError.message || "Unable to load your astrology profile.");
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [currentUser?.name]);

  useEffect(() => {
    if (!selectedSign) {
      return;
    }

    let active = true;
    setLoading(true);

    const loadReading = async () => {
      try {
        const nextReading = await astrologyService.getDailyHoroscope(selectedSign);
        if (!active) {
          return;
        }

        setReading(nextReading);
        setReadingNotice("");
      } catch (loadError) {
        if (!active) {
          return;
        }

        setReading(loadError.fallbackData || astrologyService.getFallbackReading(selectedSign));
        setReadingNotice(
          loadError.message ||
            "Live astrology is unavailable right now. Showing an offline reading instead."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadReading();

    return () => {
      active = false;
    };
  }, [selectedSign]);

  useEffect(() => {
    const loadConsultants = async () => {
      try {
        const nextConsultants = await astrologyService.getConsultants();
        setConsultants(nextConsultants);
        setConsultationSlots(
          nextConsultants.reduce((acc, consultant) => {
            const firstSlotId = consultant?.availableSlots?.[0]?.id || "";
            return {
              ...acc,
              [consultant.id || consultant.name]: firstSlotId,
            };
          }, {})
        );
      } catch (error) {
        const fallbackConsultants = error.fallbackData || [];
        setConsultants(fallbackConsultants);
        setConsultationSlots(
          fallbackConsultants.reduce((acc, consultant) => {
            const firstSlotId = consultant?.availableSlots?.[0]?.id || "";
            return {
              ...acc,
              [consultant.id || consultant.name]: firstSlotId,
            };
          }, {})
        );
      }
    };

    const loadFestivals = async () => {
      try {
        const nextFestivals = await astrologyService.getFestivalUpdates();
        setFestivals(nextFestivals);
      } catch (error) {
        setFestivals(error.fallbackData || []);
      }
    };

    const loadPanchangam = async () => {
      setPanchangamLoading(true);
      setPanchangamNotice("");

      try {
        const data = await astrologyService.getPanchangam();
        setPanchangam(data);
      } catch (error) {
        setPanchangam(error.fallbackData || null);
        setPanchangamNotice(
          error?.message || "Unable to fetch Panchangam details. Showing offline data."
        );
      } finally {
        setPanchangamLoading(false);
      }
    };

    loadConsultants();
    loadFestivals();
    loadPanchangam();
  }, []);

  useEffect(() => {
    if (activeSection !== "kundli") {
      return;
    }

    let active = true;
    setKundliLoading(true);

    const loadKundliData = async () => {
      try {
        const kundli = await astrologyService.getKundliData({
          ...selectedProfile,
          sign: selectedProfile.sign || selectedSign,
        });
        if (!active) {
          return;
        }
        setKundliData(kundli);
      } catch (error) {
        if (!active) {
          return;
        }
        setKundliData(error.fallbackData || null);
        setSaveState({
          type: "error",
          message: error.message || "Unable to load Kundli details.",
        });
      } finally {
        if (active) {
          setKundliLoading(false);
        }
      }
    };

    loadKundliData();

    return () => {
      active = false;
    };
  }, [activeSection, selectedProfile, selectedSign]);

  const selectedSignDetails =
    signs.find((entry) => entry.sign === selectedSign) ||
    reading ||
    astrologyService.getFallbackSign(selectedSign);

  const cardNotice = readingNotice || signsNotice;

  const recentSavedReadings = useMemo(
    () =>
      [...(profile?.savedReadings || [])]
        .sort((left, right) => new Date(right.readingDate) - new Date(left.readingDate))
        .slice(0, 4),
    [profile?.savedReadings]
  );

  const handleDraftChange = (field, value) => {
    setProfileDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
    setSaveState({ type: "", message: "" });
  };

  const handleFamilyDraftChange = (field, value) => {
    setFamilyDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    if (!requireLogin()) {
      return;
    }

    setSavingProfile(true);
    setSaveState({ type: "", message: "" });

    try {
      const updatedProfile = await astrologyService.updateProfile({
        sign: selectedSign || signs[0]?.sign || "aries",
        birthDate: profileDraft.birthDate,
        birthTime: profileDraft.birthTime,
        birthPlace: profileDraft.birthPlace,
        preferences: {
          receiveDailyHoroscope: profileDraft.receiveDailyHoroscope,
          favoriteTopics: parseFavoriteTopics(profileDraft.favoriteTopics),
        },
        notifications: profileDraft.notifications,
        familyProfiles,
      });

      setProfile(updatedProfile);
      setProfileDraft(createProfileDraft(updatedProfile));
      setSelectedSign(updatedProfile.sign || selectedSign);
      setProfileNotice("");
      setSaveState({
        type: "success",
        message:
          "Your astrology profile was saved, and today's reading is now stored in your recent history.",
      });
    } catch (saveError) {
      setSaveState({
        type: "error",
        message: saveError.message || "Unable to save your astrology profile.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleNewFamilyProfile = () => {
    setFamilyDraft(createFamilyProfileDraft());
    setActiveFamilyIndex(familyProfiles.length);
  };

  const selectFamilyProfile = (index) => {
    setActiveFamilyIndex(index);
    setFamilyDraft(createFamilyProfileDraft(familyProfiles[index]));
  };

  const requireLogin = () => {
    if (!currentUser?.id && !currentUser?.name) {
      setSaveState({
        type: "error",
        message: "Please sign in to use AstroNila features.",
      });
      return false;
    }
    return true;
  };

  const handleFamilyProfileSave = async () => {
    const updatedProfileItem = {
      id: familyDraft.id || `profile-${Date.now()}`,
      name: familyDraft.name || "Family Member",
      relation: familyDraft.relation || "Relative",
      sign: familyDraft.sign || "aries",
      birthDate: familyDraft.birthDate,
      birthTime: familyDraft.birthTime,
      birthPlace: familyDraft.birthPlace,
      nakshatra: getNakshatraFromSign(familyDraft.sign),
      rashi: getRashiFromSign(familyDraft.sign),
      lagna: getLagnaFromTime(familyDraft.birthTime),
    };

    const nextProfiles = [...familyProfiles];
    if (activeFamilyIndex >= 0 && activeFamilyIndex < nextProfiles.length) {
      nextProfiles[activeFamilyIndex] = updatedProfileItem;
    } else {
      nextProfiles.push(updatedProfileItem);
    }

    setFamilyProfiles(nextProfiles);
    setActiveFamilyIndex(nextProfiles.findIndex((item) => item.id === updatedProfileItem.id));
    setFamilyDraft(createFamilyProfileDraft(updatedProfileItem));

    try {
      const updatedProfile = await astrologyService.updateProfile({
        ...profile,
        familyProfiles: nextProfiles,
      });
      setProfile(updatedProfile);
      setProfileNotice("");
      setSaveState({
        type: "success",
        message: "Family profile saved successfully.",
      });
    } catch (saveError) {
      setSaveState({
        type: "error",
        message: saveError.message || "Unable to save family profile.",
      });
    }
  };

  const handleCompatibilitySubmit = async () => {
    try {
      const result = await astrologyService.getCompatibility(selectedSign, partnerSign);
      setCompatibility(result);
      setSaveState({ type: "success", message: "Compatibility calculated successfully." });
    } catch (error) {
      setCompatibility(null);
      setSaveState({
        type: "error",
        message: error.message || "Unable to calculate compatibility.",
      });
    }
  };

  const handleAskAssistant = async () => {
    if (!aiQuestion.trim()) {
      setSaveState({ type: "error", message: "Ask a question before sending." });
      return;
    }

    setAiLoading(true);
    setAssistantAnswer(null);
    setSaveState({ type: "", message: "" });

    try {
      const answer = await astrologyService.askAstrologyAssistant(aiQuestion, selectedSign);
      setAssistantAnswer(answer);
    } catch (error) {
      setSaveState({
        type: "error",
        message: error.message || "Unable to get an astrology assistant response.",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadKundliReport = async () => {
    if (!requireLogin()) {
      return;
    }

    setDownloadingKundli(true);
    setSaveState({ type: "", message: "" });

    try {
      const { blob, fileName } = await astrologyService.downloadKundliReport({
        ...selectedProfile,
        sign: selectedProfile.sign || selectedSign,
        name: selectedProfile.name || currentUser?.name || "Astrology User",
      });

      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName || "kundli-report.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);

      setSaveState({
        type: "success",
        message: "Kundli PDF report downloaded successfully.",
      });
    } catch (error) {
      setSaveState({
        type: "error",
        message: error.message || "Unable to download Kundli PDF report.",
      });
    } finally {
      setDownloadingKundli(false);
    }
  };

  const handleConsultationSlotChange = (consultantKey, slotId) => {
    setConsultationSlots((currentSlots) => ({
      ...currentSlots,
      [consultantKey]: slotId,
    }));
  };

  const handleBookConsultation = async (consultant) => {
    if (!requireLogin()) {
      return;
    }

    const consultantKey = consultant.id || consultant.name;
    const slotId = consultationSlots[consultantKey] || consultant?.availableSlots?.[0]?.id;

    if (!slotId) {
      setSaveState({
        type: "error",
        message: "Please choose an available slot before booking.",
      });
      return;
    }

    setBookingLoadingId(consultantKey);
    setSaveState({ type: "", message: "" });

    try {
      const booking = await astrologyService.createConsultationBooking({
        consultantId: consultant.id,
        slotId,
      });

      setLastBooking(booking);
      setPaymentOrder(null);
      setSaveState({
        type: "success",
        message: `Consultation booked: ${booking.confirmationCode}`,
      });
    } catch (error) {
      setSaveState({
        type: "error",
        message: error.message || "Unable to book consultation.",
      });
    } finally {
      setBookingLoadingId("");
    }
  };

  const handleCreateConsultationPaymentOrder = async () => {
    if (!lastBooking?.id) {
      return;
    }

    setPaymentLoading(true);
    setSaveState({ type: "", message: "" });

    try {
      const order = await astrologyService.createConsultationPaymentOrder(lastBooking.id);
      setPaymentOrder(order);
      const isRazorpayReady = await loadRazorpaySdk();

      if (!isRazorpayReady || !window.Razorpay) {
        setSaveState({
          type: "success",
          message: `Payment order created: ${order.orderId}. Complete payment in your gateway console.`,
        });
        return;
      }

      const paymentOptions = {
        key: order.keyId,
        amount: Number(order.amountInr || 0) * 100,
        currency: order.currency || "INR",
        name: "AstroNila",
        description: "Consultation booking payment",
        order_id: order.orderId,
        prefill: {
          name: currentUser?.name || "Astrology User",
          email: currentUser?.email || "",
        },
        handler: async (response) => {
          try {
            const verifiedBooking = await astrologyService.verifyConsultationPayment(lastBooking.id, {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            setLastBooking(verifiedBooking);
            setSaveState({
              type: "success",
              message: `Payment verified: ${verifiedBooking.confirmationCode}`,
            });
          } catch (verificationError) {
            setSaveState({
              type: "error",
              message: verificationError.message || "Payment verification failed.",
            });
          }
        },
        modal: {
          ondismiss: () => {
            setSaveState({
              type: "warning",
              message: "Payment window closed before completion.",
            });
          },
        },
      };

      const razorpay = new window.Razorpay(paymentOptions);
      razorpay.open();
    } catch (error) {
      setSaveState({
        type: "error",
        message: error.message || "Unable to create payment order.",
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <section className="astrology-home">
      <div className="astrology-shell">
        <header className="astrology-hero">
          <span className="astrology-kicker">{localize("modules.astrology", "AstroNila", language)}</span>
          <h1>{localize("astrology.title", "Daily horoscope with a Kerala-first feel", language)}</h1>
          <p>
            {localize(
              "astrology.subtitle",
              "Choose your sign to see today's energy, timing, and a grounded next step.",
              language
            )}
          </p>
        </header>

        <div className="astrology-layout">
          <aside className="astrology-sidebar">
            <div className="astrology-panel astrology-selector">
              <h2>{localize("astrology.selectSign", "Select your sign", language)}</h2>
              <div className="astrology-sign-grid">
                {signs.map((sign) => (
                  <button
                    key={sign.sign}
                    type="button"
                    className={`astrology-sign-button ${
                      selectedSign === sign.sign ? "is-active" : ""
                    }`}
                    onClick={() => setSelectedSign(sign.sign)}
                  >
                    <span className="astrology-sign-name">{sign.label}</span>
                    <span className="astrology-sign-range">{sign.dateRange}</span>
                  </button>
                ))}
              </div>
            </div>

            <form className="astrology-panel astrology-profile" onSubmit={handleProfileSave}>
              <div className="astrology-profile-header">
                <div>
                  <span className="astrology-note-label">Profile</span>
                  <h2>{localize("Save your astrology details", "നിങ്ങളുടെ ജ്യോതിഷ വിവരങ്ങൾ സംരക്ഷിക്കുക", language)}</h2>
                </div>
                <span className="astrology-profile-chip">
                  {selectedSignDetails?.label || "Sign"}
                </span>
              </div>

              <p className="astrology-profile-copy">
                {localize(
                  `Save your preferred sign, birth details, and favorite topics for ${currentUser?.name || "your account"}.`,
                  `നിങ്ങളുടെ ഇഷ്ടചിഹ്നം, ജനന വിവരങ്ങൾ, ഇഷ്ട വിഷയങ്ങൾ എന്നിവ ${currentUser?.name || "നിങ്ങളുടെ അക്കൗണ്ട്"} എന്നതിനായി സംരക്ഷിക്കുക.`,
                  language
                )}
              </p>

              {profileLoading ? (
                <p className="astrology-inline-message">{localize("Loading your saved profile...", "നിങ്ങളുടെ സംരക്ഷിച്ച പ്രൊഫൈൽ ലോഡ് ചെയ്യപ്പെടുന്നു...", language)}</p>
              ) : null}
              {profileNotice ? (
                <p className="astrology-inline-message astrology-inline-message-warning">
                  {profileNotice}
                </p>
              ) : null}
              {saveState.message ? (
                <p
                  className={`astrology-inline-message ${
                    saveState.type === "error"
                      ? "astrology-inline-message-error"
                      : "astrology-inline-message-success"
                  }`}
                >
                  {saveState.message}
                </p>
              ) : null}

              <div className="astrology-form-grid">
                <label className="astrology-field">
                  <span>{localize("Birth date", "ജന്മ തീയതി", language)}</span>
                  <input
                    type="date"
                    value={profileDraft.birthDate}
                    onChange={(event) => handleDraftChange("birthDate", event.target.value)}
                  />
                </label>

                <label className="astrology-field">
                  <span>{localize("Birth time", "ജന്മ സമയം", language)}</span>
                  <input
                    type="time"
                    value={profileDraft.birthTime}
                    onChange={(event) => handleDraftChange("birthTime", event.target.value)}
                  />
                </label>
              </div>

              <label className="astrology-field">
                <span>{localize("Birth place", "ജന്മ സ്ഥലം", language)}</span>
                <input
                  type="text"
                  value={profileDraft.birthPlace}
                  onChange={(event) => handleDraftChange("birthPlace", event.target.value)}
                  placeholder={localize("Kochi, Kerala", "കൊച്ചി, കേരളം", language)}
                />
              </label>

              <label className="astrology-field">
                <span>{localize("Favorite topics", "ഇഷ്ട വിഷയങ്ങൾ", language)}</span>
                <input
                  type="text"
                  value={profileDraft.favoriteTopics}
                  onChange={(event) => handleDraftChange("favoriteTopics", event.target.value)}
                  placeholder={localize(
                    "career, relationships, finance",
                    "തൊഴിൽ, ബന്ധങ്ങൾ, ധനം",
                    language
                  )}
                />
              </label>

              <label className="astrology-field astrology-checkbox-field">
                <input
                  type="checkbox"
                  checked={profileDraft.receiveDailyHoroscope}
                  onChange={(event) =>
                    handleDraftChange("receiveDailyHoroscope", event.target.checked)
                  }
                />
                <span>{localize("Keep daily horoscope reminders enabled for this profile.", "ഈ പ്രൊഫൈലിനായി ദിന ഹോറോസ്കോപ് ഓർമ്മപ്പെടുത്തലുകൾ സജീവമാക്കുക.", language)}</span>
              </label>

              <button type="submit" className="astrology-save-button" disabled={savingProfile}>
                {savingProfile
                  ? localize("Saving...", "സംരക്ഷിക്കുന്നു...", language)
                  : localize("Save profile and today's reading", "പ്രൊഫൈൽ സംരക്ഷിച്ച് ഇന്നത്തെ വായനയും", language)}
              </button>

              <div className="astrology-history">
                <div className="astrology-history-header">
                  <h3>{localize("Recent saved readings", "സമീപകാലത്ത് സംരക്ഷിച്ച വായനകൾ", language)}</h3>
                  <span>{recentSavedReadings.length}</span>
                </div>

                {recentSavedReadings.length > 0 ? (
                  recentSavedReadings.map((savedReading) => (
                    <button
                      key={`${savedReading.sign}-${savedReading.readingDate}`}
                      type="button"
                      className="astrology-history-item"
                      onClick={() => setSelectedSign(savedReading.sign)}
                    >
                      <div className="astrology-history-meta">
                        <strong>
                          {astrologyService.getFallbackSign(savedReading.sign).label}
                        </strong>
                        <span>{formatSavedReadingDate(savedReading.readingDate)}</span>
                      </div>
                      <p>{savedReading.horoscope}</p>
                    </button>
                  ))
                ) : (
                  <p className="astrology-history-empty">
                    {localize(
                      "Save your profile once to keep a small history of recent readings here.",
                      "സമീപകാല വായനകളുടെ ചെറിയ ചരിത്രം ഇവിടെ സൂക്ഷിക്കാൻ ഒരിക്കൽ പ്രൊഫൈൽ സംരക്ഷിക്കുക.",
                      language
                    )}
                  </p>
                )}
              </div>
            </form>
          </aside>

          <main className="astrology-main">
            <div className="astrology-board">
              <div className="astrology-top-grid">
                <div className="astrology-panel astrology-welcome-card">
                  <div className="astrology-welcome-header">
                    <div>
                      <span className="astrology-note-label">
                        {localize("Kerala first", "കേരളം മുൻനിർത്തി", language)}
                      </span>
                      <h2>
                        {localize(
                          "Personalized astrology for every family member",
                          "ഓരോ കുടുംബാംഗത്തിനും വ്യക്തിഗത ജ്യോതിഷം",
                          language
                        )}
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="astrology-language-button"
                      onClick={() => setLanguage((lang) => (lang === "en" ? "ml" : "en"))}
                    >
                      {language === "en" ? "മലയാളം" : "English"}
                    </button>
                  </div>

                  <p>
                    {localize(
                      "Malayalam content, festival updates, Panchangam timings, and matched remedies for your sign.",
                      "മലയാളം ഉള്ളടക്കം, ഉത്സവ അപ്ഡേറ്റുകൾ, പഞ്ചാംഗ സമയങ്ങൾ, നിങ്ങളുടെ രാശിക്ക് പൊരുത്തമുള്ള പരിഹാരങ്ങൾ.",
                      language
                    )}
                  </p>
                </div>

                <div className="astrology-panel astrology-highlights-card">
                  <h3>{localize("Quick insights", "തൽസമയ ഉള്ളക്കാഴ്ചകൾ", language)}</h3>
                  <div className="astrology-metrics-grid">
                    <div className="astrology-metric-card">
                      <span>{localize("Lucky color", "ഭാഗ്യനിറം", language)}</span>
                      <strong>{getLuckyColor(selectedSign)}</strong>
                    </div>
                    <div className="astrology-metric-card">
                      <span>{localize("Lucky number", "ഭാഗ്യസംഖ്യ", language)}</span>
                      <strong>{getLuckyNumber(selectedSign)}</strong>
                    </div>
                    <div className="astrology-metric-card">
                      <span>{localize("Good time", "നല്ല സമയം", language)}</span>
                      <strong>{getGoodTime(selectedSign)}</strong>
                    </div>
                    <div className="astrology-metric-card">
                      <span>{localize("Avoid time", "തള്ളേണ്ട സമയം", language)}</span>
                      <strong>{getAvoidTime(selectedSign)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <HoroscopeCard
                sign={selectedSignDetails}
                horoscope={reading}
                loading={loading}
                notice={cardNotice}
              />

              <div className="astrology-nav-grid">
                {ASTRO_SECTIONS.map((sectionItem) => (
                  <button
                    key={sectionItem.key}
                    type="button"
                    className={`astrology-section-card ${
                      activeSection === sectionItem.key ? "is-active" : ""
                    }`}
                    onClick={() => setActiveSection(sectionItem.key)}
                  >
                    <strong>{localize(sectionItem.label, sectionItem.labelMl, language)}</strong>
                    <span>{localize(sectionItem.description, sectionItem.descriptionMl, language)}</span>
                  </button>
                ))}
              </div>

              <div className="astrology-panel astrology-section-content">
                {activeSection === "today" ? (
                  <>
                    <div className="astrology-detail-grid">
                      <article className="astrology-panel astrology-detail-card">
                        <h3>{localize("Today's Rashi phalam", "ഇന്നത്തെ രാശി ഫലം", language)}</h3>
                        <p>{getRashiSummary(selectedSign)}</p>
                      </article>
                      <article className="astrology-panel astrology-detail-card">
                        <h3>{localize("Nakshatra guidance", "നക്ഷത്ര മാർഗനിർദ്ദേശം", language)}</h3>
                        <p>{getNakshatraReminder(selectedSignDetails?.nakshatra || getNakshatraFromSign(selectedSign))}</p>
                      </article>
                    </div>
                    <div className="astrology-detail-grid">
                      <article className="astrology-panel astrology-detail-card">
                        <h3>{localize("Panchangam snapshot", "പഞ്ചാംഗം അവലോകനം", language)}</h3>
                        <ul>
                          <li>{localize("Tithi", "തിഥി", language)} : {panchangam?.tithi || "Shukla Paksha Tritiya"}</li>
                          <li>{localize("Nakshatra", "നക്ഷത്രം", language)} : {panchangam?.nakshatra || selectedSignDetails?.nakshatra || getNakshatraFromSign(selectedSign)}</li>
                          <li>{localize("Rahu Kalam", "റാഹു കാലം", language)} : {panchangam?.rahuKalam || "10:30 AM - 12:00 PM"}</li>
                          <li>{localize("Yamagandam", "യമഗന്ധം", language)} : {panchangam?.yamagandam || "03:00 PM - 04:30 PM"}</li>
                        </ul>
                      </article>
                      <article className="astrology-panel astrology-detail-card">
                        <h3>{localize("Kerala festival note", "കേരള ഉത്സവ കുറിപ്പ്", language)}</h3>
                        <p>{
                          festivals[0]?.note ||
                          localize(
                            "Vishu is ideal for new plans and family puja.",
                            "വിഷു പുതിയ പദ്ധതികൾക്കും കുടുംബ പൂജയ്ക്കും അനുയോജ്യമാണ്.",
                            language
                          )
                        }</p>
                      </article>
                    </div>
                  </>
                ) : activeSection === "profile" ? (
                  <>
                    <div className="astrology-section-heading">
                      <h3>{localize("Family profiles", "കുടുംബ പ്രൊഫൈലുകൾ", language)}</h3>
                      <button type="button" className="astrology-secondary-button" onClick={handleNewFamilyProfile}>
                        {localize("Add profile", "പ്രൊഫൈൽ ചേർക്കുക", language)}
                      </button>
                    </div>
                    <div className="astrology-profile-grid">
                      <aside className="astrology-panel astrology-profile-list">
                        <h4>{localize("Saved profiles", "സേവ് ചെയ്ത പ്രൊഫൈലുകൾ", language)}</h4>
                        <div className="astrology-profile-list-items">
                          {familyProfiles.map((item, index) => (
                            <button
                              key={item.id}
                              type="button"
                              className={`astrology-profile-card ${activeFamilyIndex === index ? "is-active" : ""}`}
                              onClick={() => selectFamilyProfile(index)}
                            >
                              <strong>{item.name}</strong>
                              <span>{item.relation}</span>
                              <small>{item.sign.toUpperCase()}</small>
                            </button>
                          ))}
                        </div>
                      </aside>

                      <section className="astrology-panel astrology-profile-editor">
                        <h4>{localize("Edit family profile", "കുടുംബ പ്രൊഫൈൽ തിരുത്തുക", language)}</h4>
                        <div className="astrology-form-grid">
                          <label className="astrology-field">
                            <span>{localize("Name", "നാമം", language)}</span>
                            <input
                              type="text"
                              value={familyDraft.name}
                              onChange={(event) => handleFamilyDraftChange("name", event.target.value)}
                            />
                          </label>
                          <label className="astrology-field">
                            <span>{localize("Relation", "ബന്ധം", language)}</span>
                            <input
                              type="text"
                              value={familyDraft.relation}
                              onChange={(event) => handleFamilyDraftChange("relation", event.target.value)}
                            />
                          </label>
                        </div>
                        <div className="astrology-form-grid">
                          <label className="astrology-field">
                            <span>{localize("Sign", "രാശി", language)}</span>
                            <select
                              value={familyDraft.sign}
                              onChange={(event) => handleFamilyDraftChange("sign", event.target.value)}
                            >
                              {signs.map((sign) => (
                                <option key={sign.sign} value={sign.sign}>
                                  {sign.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="astrology-field">
                            <span>{localize("Birth date", "ജന്മ തീയതി", language)}</span>
                            <input
                              type="date"
                              value={familyDraft.birthDate}
                              onChange={(event) => handleFamilyDraftChange("birthDate", event.target.value)}
                            />
                          </label>
                        </div>
                        <div className="astrology-form-grid">
                          <label className="astrology-field">
                            <span>{localize("Birth time", "ജന്മ സമയം", language)}</span>
                            <input
                              type="time"
                              value={familyDraft.birthTime}
                              onChange={(event) => handleFamilyDraftChange("birthTime", event.target.value)}
                            />
                          </label>
                          <label className="astrology-field">
                            <span>{localize("Birth place", "ജന്മ സ്ഥലം", language)}</span>
                            <input
                              type="text"
                              value={familyDraft.birthPlace}
                              onChange={(event) => handleFamilyDraftChange("birthPlace", event.target.value)}
                              placeholder={localize("Trivandrum, Kerala", "തിരുവനന്തപുരം, കേരളം", language)}
                            />
                          </label>
                        </div>
                        <button type="button" className="astrology-save-button" onClick={handleFamilyProfileSave}>
                          {localize("Save family profile", "കുടുംബ പ്രൊഫൈൽ സംരക്ഷിക്കുക", language)}
                        </button>
                      </section>
                    </div>
                  </>
                ) : activeSection === "rashi" ? (
                  <div className="astrology-detail-grid">
                    <article className="astrology-panel astrology-detail-card">
                      <h3>{localize("Rashi overview", "രാശി അവലോകനം", language)}</h3>
                      <p>{getRashiSummary(selectedSign)}</p>
                      <ul>
                        <li>{localize("Rashi", "രാശി", language)} : {getRashiFromSign(selectedSign)}</li>
                        <li>{localize("Nakshatra", "നക്ഷത്രം", language)} : {getNakshatraFromSign(selectedSign)}</li>
                        <li>{localize("Lagna", "ലഗ്നം", language)} : {getLagnaFromTime(profileDraft.birthTime)}</li>
                      </ul>
                    </article>
                    <article className="astrology-panel astrology-detail-card">
                      <h3>{localize("Energy focus", "ഊർജ്ജ കേന്ദ്രീകരണം", language)}</h3>
                      <p>{localize("This week is ideal for resetting habits and opening conversation with elders.", "ഈ ആഴ്ച പതിവുകൾ പുനഃക്രമീകരിക്കാനും മുതിർന്നവരുമായി സംഭാഷണം ആരംഭിക്കാനും അനുയോജ്യമാണ്.", language)}</p>
                    </article>
                  </div>
                ) : activeSection === "kundli" ? (
                  <div className="astrology-detail-grid">
                    <article className="astrology-panel astrology-detail-card">
                      <h3>{localize("Kundli summary", "കുണ്ടലി സംഗ്രഹം", language)}</h3>
                      <p>{localize("Your birth chart is anchored in strong family support and creative momentum.", "നിങ്ങളുടെ ജനന ചാർട്ട് ശക്തമായ കുടുംബ പിന്തുണയിലും സൃഷ്ടിപരമായ പ്രേരണയിലും ആധാരമുണ്ട്.", language)}</p>
                      <ul>
                        <li>{localize("Ascendant", "ലഗ്നം", language)} : {selectedProfile.lagna || "Mesha"}</li>
                        <li>{localize("Current Dasha", "നിലവിലെ ദശ", language)} : Venus</li>
                        <li>{localize("Navamsa power", "നവാംശ ശക്തി", language)} : {localize("Stable and supportive", "സ്ഥിരവും പിന്തുണയുള്ളതും", language)}</li>
                      </ul>
                    </article>
                    <article className="astrology-panel astrology-detail-card">
                      <h3>{localize("Next step", "അടുത്ത പടി", language)}</h3>
                      <p>{localize("Use this week for steady planning and a small temple visit to deepen your focus.", "ഈ ആഴ്ച സ്ഥിരതയുള്ള പദ്ധതിയിടലിനും ശ്രദ്ധതീവ്രമനയ്ക്കും ഒരു ചെറിയ ക്ഷേത്ര സന്ദർശനത്തിനുമാണ് ഉപയോഗിക്കുന്നത്.", language)}</p>
                      <button
                        type="button"
                        className="astrology-save-button"
                        disabled={kundliLoading || downloadingKundli}
                        onClick={handleDownloadKundliReport}
                      >
                        {downloadingKundli
                          ? localize("Downloading...", "ഡൗൺലോഡ് ചെയ്യുന്നു...", language)
                          : localize("Download PDF report", "PDF റിപ്പോർട്ട് ഡൗൺലോഡ് ചെയ്യുക", language)}
                      </button>
                    </article>
                  </div>
                ) : activeSection === "match" ? (
                  <div className="astrology-detail-grid">
                    <article className="astrology-panel astrology-detail-card">
                      <h3>{localize("Marriage compatibility", "വിവാഹ പൊരുത്തം", language)}</h3>
                      <p>{localize("Compare two signs for emotional and financial harmony.", "രൗദ്രവും ധനപരവുമായ ഐക്യത്തിനായി രണ്ട് രാശികൾ താരതമ്യപ്പെടുത്തുക.", language)}</p>
                      <div className="astrology-form-grid">
                        <label className="astrology-field">
                          <span>{localize("Your sign", "നിങ്ങളുടെ രാശി", language)}</span>
                          <select value={selectedSign} onChange={(event) => setSelectedSign(event.target.value)}>
                            {signs.map((sign) => (
                              <option key={sign.sign} value={sign.sign}>
                                {sign.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="astrology-field">
                          <span>{localize("Partner sign", "പങ്കാളിയുടെ രാശി", language)}</span>
                          <select value={partnerSign} onChange={(event) => setPartnerSign(event.target.value)}>
                            {signs.map((sign) => (
                              <option key={sign.sign} value={sign.sign}>
                                {sign.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <button type="button" className="astrology-save-button" onClick={handleCompatibilitySubmit}>
                        {localize("Check porutham", "പൊരുത്തം പരിശോധിക്കുക", language)}
                      </button>
                    </article>
                    {compatibility ? (
                      <article className="astrology-panel astrology-detail-card">
                        <h3>{localize("Compatibility score", "പൊരുത്ത സ്കോർ", language)}</h3>
                        <p>{compatibility.summary}</p>
                        <strong>{compatibility.score}%</strong>
                        <p>{compatibility.keyMatch}</p>
                      </article>
                    ) : null}
                  </div>
                ) : activeSection === "panchangam" ? (
                  <div className="astrology-detail-grid">
                    <article className="astrology-panel astrology-detail-card">
                      <h3>{localize("Panchangam today", "ഇന്നത്തെ പഞ്ചാംഗം", language)}</h3>

                      {panchangamNotice ? (
                        <p className="astrology-inline-message astrology-inline-message-warning">
                          {panchangamNotice}
                        </p>
                      ) : null}

                      {panchangamLoading ? (
                        <p className="astrology-inline-message">{localize("Loading Panchangam...", "ലോഡ് ചെയ്യുന്നു...", language)}</p>
                      ) : null}

                      {!panchangamLoading ? (
                        <ul>
                          <li>
                            {localize("Tithi", "തിഥി", language)} :{" "}
                            {panchangam?.tithi || "Shukla Paksha Tritiya"}
                          </li>
                          <li>
                            {localize("Nakshatra", "നക്ഷത്രം", language)} :{" "}
                            {panchangam?.nakshatra || "Revati"}
                          </li>
                          <li>
                            {localize("Rahu Kalam", "റാഹു കാലം", language)} :{" "}
                            {panchangam?.rahuKalam || "10:30 AM - 12:00 PM"}
                          </li>
                          <li>
                            {localize("Yamagandam", "യമഗന്ധം", language)} :{" "}
                            {panchangam?.yamagandam || "03:00 PM - 04:30 PM"}
                          </li>
                          <li>
                            {localize("Gulika", "ഗുളിക", language)} :{" "}
                            {panchangam?.gulika || "07:30 AM - 09:00 AM"}
                          </li>
                        </ul>
                      ) : null}
                    </article>

                    <article className="astrology-panel astrology-detail-card">
                      <h3>{localize("Festival reminders", "ഉത്സവ ഓർമ്മപ്പെടുത്തലുകൾ", language)}</h3>
                      <ul>
                        {festivals.map((festival) => (
                          <li key={festival.name}>
                            <strong>{festival.name}</strong> - {festival.date}
                            <p>{festival.note}</p>
                          </li>
                        ))}
                      </ul>
                    </article>
                  </div>
                ) : activeSection === "remedies" ? (
                  <div className="astrology-detail-grid">
                    <article className="astrology-panel astrology-detail-card">
                      <h3>{localize("Remedies for strength", "ശക്തിക്കായുള്ള പരിഹാരങ്ങൾ", language)}</h3>
                      <ul>
                        <li>{localize("Recite the Ganapathi mantra before sunrise.", "ഉദയം മുൻപ് ഗണപതി മന്ത്രം ജപിക്കുക.", language)}</li>
                        <li>{localize("Offer yellow flowers to Vishnu on Thursdays.", "വ്യാഴാഴ്ച വിസ്ംനുവിന് മഞ്ഞ പുഷ്പങ്ങൾ അർപ്പിക്കുക.", language)}</li>
                        <li>{localize("Donate rice or coconut oil this week.", "ഈ ആഴ്ച അരിയും തേങ്ങെണ്ണവും ദാനം ചെയ്യുക.", language)}</li>
                      </ul>
                    </article>
                    <article className="astrology-panel astrology-detail-card">
                      <h3>{localize("Temple guidance", "ക്ഷേത്ര മാർഗനിർദ്ദേശം", language)}</h3>
                      <p>{localize("Visit Guruvayur for peace, or perform a local vratam on Saturday.", "ശാന്തിക്കായി ഗുരുവായൂരിലേക്ക് പോകാം, അല്ലെങ്കിൽ ശനിയാഴ്ച അടുത്തുള്ള ഒരു വ്രതം നിർവ്വഹിക്കാം.", language)}</p>
                    </article>
                  </div>
                ) : activeSection === "consult" ? (
                  <div className="astrology-detail-grid">
                    {consultants.map((consultant) => {
                      const consultantKey = consultant.id || consultant.name;
                      return (
                        <article key={consultantKey} className="astrology-panel astrology-detail-card">
                          <h3>{consultant.name}</h3>
                          <p>{consultant.specialty}</p>
                          <p>{consultant.rate}</p>
                          <p>{consultant.availability}</p>
                          <label className="astrology-field">
                            <span>{localize("Choose a slot", "സ്ലോട്ട് തിരഞ്ഞെടുക്കുക", language)}</span>
                            <select
                              value={consultationSlots[consultantKey] || ""}
                              onChange={(event) => handleConsultationSlotChange(consultantKey, event.target.value)}
                            >
                              {consultant.availableSlots.map((slot) => (
                                <option key={slot.id} value={slot.id}>
                                  {slot.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="button"
                            className="astrology-save-button"
                            disabled={bookingLoadingId === consultantKey}
                            onClick={() => handleBookConsultation(consultant)}
                          >
                            {bookingLoadingId === consultantKey
                              ? localize("Booking...", "ബുക്കിംഗ് പൂർത്തിയാക്കുന്നു...", language)
                              : localize("Book consultation", "സഹായിയെ വിളിക്കുക", language)}
                          </button>
                        </article>
                      );
                    })}
                    {lastBooking ? (
                      <article className="astrology-panel astrology-detail-card astrology-booking-confirmation">
                        <h3>{localize("Booking confirmed", "ബുക്കിംഗ് സ്ഥിരീകരിച്ചു", language)}</h3>
                        <p>
                          {localize("Confirmation code", "സ്ഥിരീകരണ കോഡ്", language)}: {lastBooking.confirmationCode}
                        </p>
                        <p>
                          {localize("Consultant", "സലാഹകൻ", language)}: {lastBooking.consultantName}
                        </p>
                        <p>
                          {localize("Slot", "സ്ലോട്ട്", language)}: {lastBooking.slot}
                        </p>
                        <p>
                          {localize("Payment status", "പേയ്മെന്റ് നില", language)}: {lastBooking.paymentStatus || "pending"}
                        </p>
                        <button
                          type="button"
                          className="astrology-save-button"
                          onClick={handleCreateConsultationPaymentOrder}
                          disabled={paymentLoading}
                        >
                          {paymentLoading
                            ? localize("Preparing payment...", "പേയ്മെന്റ് തയ്യാറാക്കുന്നു...", language)
                            : localize("Pay now", "ഇപ്പോൾ പേയ് ചെയ്യുക", language)}
                        </button>
                        {paymentOrder ? (
                          <p>
                            {localize("Order ID", "ഓർഡർ ഐഡി", language)}: {paymentOrder.orderId}
                          </p>
                        ) : null}
                      </article>
                    ) : null}
                  </div>
                ) : activeSection === "ai" ? (
                  <div className="astrology-ai-panel">
                    <label className="astrology-field">
                      <span>{localize("Ask your astrology assistant", "നിങ്ങളുടെ ജ്യോതിഷ സഹായിയോട് ചോദിക്കുക", language)}</span>
                      <textarea
                        rows={5}
                        value={aiQuestion}
                        onChange={(event) => setAiQuestion(event.target.value)}
                        placeholder={localize(
                          "What should I focus on this week?",
                          "ഈ ആഴ്ച ഞാൻ ഏതിന്മേൽ ശ്രദ്ധ കേന്ദ്രീകരിക്കണം?",
                          language
                        )}
                      />
                    </label>
                    <button type="button" className="astrology-save-button" onClick={handleAskAssistant}>
                      {aiLoading
                        ? localize("Thinking...", "ചിന്തിക്കുന്നു...", language)
                        : localize("Ask now", "ഇപ്പോൾ ചോദിക്കുക", language)}
                    </button>
                    {assistantAnswer ? (
                      <article className="astrology-panel astrology-detail-card">
                        <h3>{localize("Assistant answer", "സഹായിയുടെ ഉത്തരമ", language)}</h3>
                        <p>{assistantAnswer.answer}</p>
                        {assistantAnswer.tips?.length ? (
                          <ul>
                            {assistantAnswer.tips.map((tip, index) => (
                              <li key={index}>{tip}</li>
                            ))}
                          </ul>
                        ) : null}
                      </article>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </main>
        </div>
      </div>
    </section>
  );
};

export default AstrologyHome;
