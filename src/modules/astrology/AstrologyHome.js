import React, { useEffect, useMemo, useState } from "react";
import HoroscopeCard from "./HoroscopeCard";
import { astrologyService } from "../../services/astrologyService";
import { useApp } from "../../contexts/AppContext";
import { useAstrologyConsultations } from "./hooks/useAstrologyConsultations";
import { useAstrologyKundliCompatibility } from "./hooks/useAstrologyKundliCompatibility";
import { useAstrologyProfile } from "./hooks/useAstrologyProfile";
import "../../styles/Astrology.css";

const FEATURE_TABS = [
  { key: "today", label: "Daily Horoscope", labelMl: "ദൈനംദിന ഫലം" },
  { key: "kundli", label: "Birth Chart", labelMl: "ജനന ചാർട്ട്" },
  { key: "career", label: "Career", labelMl: "തൊഴിൽ" },
  { key: "finance", label: "Finance", labelMl: "ധനം" },
  { key: "match", label: "Marriage", labelMl: "വിവാഹം" },
  { key: "remedies", label: "Remedies", labelMl: "പരിഹാരങ്ങൾ" },
  { key: "panchangam", label: "Panchangam", labelMl: "പഞ്ചാംഗം" },
  { key: "ai", label: "AI Astrology", labelMl: "എഐ ജ്യോതിഷം" },
  { key: "saved", label: "Saved Reports", labelMl: "സേവ് റിപ്പോർട്ടുകൾ" },
];

const MOBILE_NAV_ITEMS = [
  { key: "today", label: "Home" },
  { key: "today", label: "Horoscope" },
  { key: "ai", label: "AI Astro" },
  { key: "remedies", label: "Remedies" },
  { key: "profile", label: "Profile" },
];

const GENDER_OPTIONS = [
  { value: "", label: "Select gender", labelMl: "ലിംഗം തിരഞ്ഞെടുക്കുക" },
  { value: "male", label: "Male", labelMl: "പുരുഷൻ" },
  { value: "female", label: "Female", labelMl: "സ്ത്രീ" },
  { value: "other", label: "Other", labelMl: "മറ്റുള്ളവർ" },
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
});

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
    profileApi.handleDraftChange("birthDate", value);
    const autoSign = detectSignFromBirthDate(value);
    if (autoSign) {
      setSelectedSign(autoSign);
    }
  };

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
      const { blob, fileName } = await astrologyService.downloadHoroscopeReport(selectedSign, normalizedPeriod);
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
              placeholder={localize("Search sign or feature...", "രാശി അല്ലെങ്കിൽ ഫീച്ചർ തിരയുക...", language)}
            />
          </form>
          <div className="astro-top-actions">
            <button type="button" className="astrology-secondary-button" onClick={() => setLanguage((prev) => (prev === "en" ? "ml" : "en"))}>
              {language === "en" ? "മലയാളം" : "English"}
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

        <article className="astrology-panel astro-hero-card">
          <div className="astro-hero-main">
            <p className="astro-hero-kicker">{selectedSignDetails?.label || "Selected sign"} | {todayDate}</p>
            <h2>{localize("Today's Horoscope", "ഇന്നത്തെ ജ്യോതിഷ ഫലം", language)}</h2>
            <p>{heroPrediction.length > 180 ? `${heroPrediction.slice(0, 180)}...` : heroPrediction}</p>
          </div>
          <div className="astro-first-panel-layout">
            <article className="astro-personal-form-card">
              <h3>{localize("Get Your Personal Astrology Reading", "നിങ്ങളുടെ വ്യക്തിഗത ജ്യോതിഷ ഫലം ലഭ്യമാക്കൂ", language)}</h3>
              <div className="astro-compact-form astro-hero-form">
                <label className="astrology-field">
                  <span>{localize("Date of birth", "ജനന തീയതി", language)}</span>
                  <input type="date" value={profileApi.profileDraft.birthDate} onChange={(event) => handleBirthDateChange(event.target.value)} />
                </label>
                <label className="astrology-field">
                  <span>{localize("Time of birth", "ജനന സമയം", language)}</span>
                  <input type="time" value={profileApi.profileDraft.birthTime} onChange={(event) => profileApi.handleDraftChange("birthTime", event.target.value)} />
                </label>
                <label className="astrology-field">
                  <span>{localize("Place of birth", "ജനന സ്ഥലം", language)}</span>
                  <input type="text" value={profileApi.profileDraft.birthPlace} onChange={(event) => profileApi.handleDraftChange("birthPlace", event.target.value)} />
                </label>
                <label className="astrology-field">
                  <span>{localize("Gender", "ലിംഗം", language)}</span>
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
                {profileApi.savingProfile ? "Generating..." : localize("Generate My Prediction", "എന്റെ ജ്യോതിഷ ഫലം സൃഷ്ടിക്കുക", language)}
              </button>
            </article>
            <article className="astro-personal-preview-card">
              <h3>{localize("Instant Preview", "തൽക്ഷണ പ്രിവ്യൂ", language)}</h3>
              <ul>
                <li><span>{localize("Rashi", "രാശി", language)}</span><strong>{getRashiFromSign(selectedSign)}</strong></li>
                <li><span>{localize("Nakshatra", "നക്ഷത്രം", language)}</span><strong>{getNakshatraFromSign(selectedSign)}</strong></li>
                <li><span>{localize("Lucky color", "ഭാഗ്യനിറം", language)}</span><strong>{getLuckyColor(selectedSign)}</strong></li>
                <li><span>{localize("Lucky number", "ഭാഗ്യസംഖ്യ", language)}</span><strong>{getLuckyNumber(selectedSign)}</strong></li>
                <li><span>{localize("Today energy", "ഇന്നത്തെ ഊർജം", language)}</span><strong>{todayEnergyScore}/10</strong></li>
              </ul>
            </article>
          </div>
          <div className="astro-quick-grid">
            <article className="astro-quick-card"><span>{localize("Lucky color", "ഭാഗ്യനിറം", language)}</span><strong>{getLuckyColor(selectedSign)}</strong></article>
            <article className="astro-quick-card"><span>{localize("Lucky number", "ഭാഗ്യസംഖ്യ", language)}</span><strong>{getLuckyNumber(selectedSign)}</strong></article>
            <article className="astro-quick-card"><span>{localize("Best time", "നല്ല സമയം", language)}</span><strong>{getGoodTime(selectedSign)}</strong></article>
            <article className="astro-quick-card"><span>{localize("Date", "തീയതി", language)}</span><strong>{todayDate}</strong></article>
          </div>
          <div className="astro-hero-actions">
            <button type="button" className="astrology-save-button" onClick={() => { setActiveSection("today"); setShowFullPrediction(true); }}>View Full Prediction</button>
            <button type="button" className="astrology-secondary-button" onClick={() => { setActiveSection("today"); setShowFullPrediction(false); }}>
              {localize("ഇന്നത്തെ ജ്യോതിഷ ഫലം കാണുക", "ഇന്നത്തെ ജ്യോതിഷ ഫലം കാണുക", language)}
            </button>
          </div>
        </article>

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
                  const allowedBeforePersonalization = new Set(["today", "kundli", "profile"]);
                  if (!personalizedReady && !allowedBeforePersonalization.has(tab.key)) {
                    setSaveState({
                      type: "error",
                      message: "Enter birth details in the first panel and generate your prediction first.",
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
                  <article className="astrology-panel astro-result-card"><h4>Panchangam</h4><ul><li>Tithi: {panchangam?.tithi || "Shukla Paksha Tritiya"}</li><li>Nakshatra: {panchangam?.nakshatra || getNakshatraFromSign(selectedSign)}</li><li>Rahu Kalam: {panchangam?.rahuKalam || "10:30 AM - 12:00 PM"}</li></ul><button type="button" className="astrology-save-button" onClick={handleQuickSave}>Save report</button></article>
                  <article className="astrology-panel astro-result-card">
                    <h4>Horoscope actions</h4>
                    <button type="button" className="astrology-save-button" onClick={handleGenerateReport}>Generate horoscope report</button>
                    <button type="button" className="astrology-secondary-button" disabled={downloadingHoroscopePeriod !== ""} onClick={() => handleDownloadHoroscopeReport("year")}>{downloadingHoroscopePeriod === "year" ? "Downloading yearly..." : "Download yearly horoscope"}</button>
                    <button type="button" className="astrology-secondary-button" disabled={downloadingHoroscopePeriod !== ""} onClick={() => handleDownloadHoroscopeReport("total")}>{downloadingHoroscopePeriod === "total" ? "Downloading total..." : "Download total horoscope"}</button>
                  </article>
                  {showFullPrediction ? <HoroscopeCard sign={selectedSignDetails} horoscope={reading} loading={loading} notice={readingNotice || signsNotice} /> : null}
                </>
              ) : (
                <article className="astrology-panel astro-result-card astro-span-2">
                  <h4>{localize("Personal details needed", "വ്യക്തിഗത വിവരങ്ങൾ ആവശ്യമാണ്", language)}</h4>
                  <p>{localize("Enter DOB, birth time, place, and gender in the first panel to unlock your personalized predictions.", "ആദ്യ പാനലിൽ ജനന തീയതി, സമയം, സ്ഥലം, ലിംഗം നൽകി വ്യക്തിഗത ജ്യോതിഷ ഫലം കാണൂ.", language)}</p>
                </article>
              )}
            </div>
          ) : null}

          {activeSection === "kundli" ? (
            <div className="astro-card-grid">
              <article className="astrology-panel astro-result-card astro-span-2">
                <h4>Birth details</h4>
                <div className="astro-compact-form">
                  <label className="astrology-field"><span>Date of birth</span><input type="date" value={profileApi.profileDraft.birthDate} onChange={(event) => profileApi.handleDraftChange("birthDate", event.target.value)} /></label>
                  <label className="astrology-field"><span>Time of birth</span><input type="time" value={profileApi.profileDraft.birthTime} onChange={(event) => profileApi.handleDraftChange("birthTime", event.target.value)} /></label>
                  <label className="astrology-field"><span>Place of birth</span><input type="text" value={profileApi.profileDraft.birthPlace} onChange={(event) => profileApi.handleDraftChange("birthPlace", event.target.value)} /></label>
                  <label className="astrology-field"><span>Gender</span><select value={profileApi.profileDraft.gender} onChange={(event) => profileApi.handleDraftChange("gender", event.target.value)}>{GENDER_OPTIONS.map((option) => <option key={option.value || "unset"} value={option.value}>{option.label}</option>)}</select></label>
                  <label className="astrology-field"><span>Topic / question</span><input type="text" value={question} onChange={(event) => setQuestion(event.target.value)} /></label>
                </div>
                <label className="astrology-field astrology-checkbox-field"><input type="checkbox" checked={detailedReport} onChange={(event) => setDetailedReport(event.target.checked)} /><span>Generate detailed personalized horoscope</span></label>
                <button type="button" className="astrology-save-button" onClick={handleGenerateReport}>Generate horoscope report</button>
              </article>
              <article className="astrology-panel astro-result-card"><h4>Kundli summary</h4><ul><li>Ascendant: {kundliApi.kundliData?.birthChart?.ascendant || profileApi.selectedProfile.lagna || "Mesha"}</li><li>Current dasha: {kundliApi.kundliData?.dasha?.current || "Venus"}</li><li>Rashi: {profileApi.selectedProfile.rashi || getRashiFromSign(selectedSign)}</li></ul></article>
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
              <article className="astrology-panel astro-result-card"><h4>Panchangam today</h4>{panchangamLoading ? <p className="astrology-inline-message">Loading...</p> : <ul><li>Tithi: {panchangam?.tithi || "Shukla Paksha Tritiya"}</li><li>Nakshatra: {panchangam?.nakshatra || "Revati"}</li><li>Rahu Kalam: {panchangam?.rahuKalam || "10:30 AM - 12:00 PM"}</li><li>Yamagandam: {panchangam?.yamagandam || "03:00 PM - 04:30 PM"}</li></ul>}{panchangamNotice ? <p className="astrology-inline-message astrology-inline-message-warning">{panchangamNotice}</p> : null}</article>
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
                  <label className="astrology-field"><span>Birth place</span><input type="text" value={profileApi.profileDraft.birthPlace} onChange={(event) => profileApi.handleDraftChange("birthPlace", event.target.value)} /></label>
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
              const allowedBeforePersonalization = new Set(["today", "kundli", "profile"]);
              if (!personalizedReady && !allowedBeforePersonalization.has(item.key)) {
                setSaveState({
                  type: "error",
                  message: "Fill DOB, time, place, and gender in the first panel first.",
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
