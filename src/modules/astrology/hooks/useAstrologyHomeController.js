import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../../contexts/AppContext";
import { astrologyService } from "../../../services/astrologyService";
import {
  BIRTH_LOCATION_OPTIONS,
  BIRTH_TIMEZONE_OPTIONS,
  FEATURE_TABS,
  GENDER_OPTIONS,
  MOBILE_NAV_ITEMS,
} from "../data/astrologyConstants";
import {
  calculateBirthAstroProfile,
  normalizeTimeZoneValue,
} from "../domain/astroMath";
import {
  derivePlanetHouseMap,
  detectSignFromBirthDate,
  getActionOutcomeScenarios,
  getCanonicalNakshatraName,
  getCareerAdvice,
  getFinanceAdvice,
  getFutureClarityMetrics,
  getFutureTimelineCards,
  getLagnaFromTime,
  getNakshatraDisplayName,
  getNakshatraFromSign,
  getRashiFromSign,
  getRashiSummary,
  getRemedyTips,
  getTodayEnergyScore,
  getTotalLifeReadingContent,
  getYearlyHoroscopeContent,
  HEURISTIC_PREVIEW_FLAGS,
  NAKSHATRA_NAMES,
  RASHI_NAMES,
} from "../domain/zodiacMapping";
import {
  createFamilyProfileDraft,
  createProfileDraft,
  formatSavedReadingDate,
  getAutoSignFromRashi,
  getDefaultFamilyProfile,
} from "../domain/profileDrafts";
import { useAstrologyConsultations } from "./useAstrologyConsultations";
import { useAstrologyKundliCompatibility } from "./useAstrologyKundliCompatibility";
import { useAstrologyProfile } from "./useAstrologyProfile";

const hasLikelyMojibake = (value = "") => /Ãƒ|Ã‚|Ã¢â‚¬|Ã¢â€š|ï¿½/i.test(String(value || ""));

const localize = (en, ml, language) => {
  if (language !== "ml") return en;
  const normalizedMl = String(ml || "").trim();
  if (!normalizedMl || hasLikelyMojibake(normalizedMl)) return en;
  return normalizedMl;
};

export const useAstrologyHomeController = () => {
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

  const mountedRef = useRef(true);
  const requestSeqRef = useRef({
    signs: 0,
    reading: 0,
    panchangam: 0,
    ai: 0,
    download: 0,
  });

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  const nextRequestId = (key) => {
    requestSeqRef.current[key] = (requestSeqRef.current[key] || 0) + 1;
    return requestSeqRef.current[key];
  };

  const isLatestRequest = (key, requestId) =>
    mountedRef.current && requestSeqRef.current[key] === requestId;

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
    const requestId = nextRequestId("signs");
    const load = async () => {
      try {
        const next = await astrologyService.getSigns();
        if (!isLatestRequest("signs", requestId)) return;
        setSigns(next);
        setSelectedSign((cur) => cur || next[0]?.sign || "aries");
        setSignsNotice("");
      } catch (error) {
        if (!isLatestRequest("signs", requestId)) return;
        const fallback = error.fallbackData || astrologyService.getFallbackSigns();
        setSigns(fallback);
        setSelectedSign((cur) => cur || fallback[0]?.sign || "aries");
        setSignsNotice(error.message || "Showing offline sign data.");
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!selectedSign) return;
    const requestId = nextRequestId("reading");
    setLoading(true);
    const load = async () => {
      try {
        const next = await astrologyService.getDailyHoroscope(selectedSign);
        if (!isLatestRequest("reading", requestId)) return;
        setReading(next);
        setReadingNotice("");
      } catch (error) {
        if (!isLatestRequest("reading", requestId)) return;
        setReading(error.fallbackData || astrologyService.getFallbackReading(selectedSign));
        setReadingNotice(error.message || "Showing offline reading.");
      } finally {
        if (isLatestRequest("reading", requestId)) {
          setLoading(false);
        }
      }
    };
    void load();
  }, [selectedSign]);

  useEffect(() => {
    const requestId = nextRequestId("panchangam");
    const load = async () => {
      try {
        const festivalData = await astrologyService.getFestivalUpdates();
        if (!isLatestRequest("panchangam", requestId)) return;
        setFestivals(festivalData);
      } catch (error) {
        if (!isLatestRequest("panchangam", requestId)) return;
        setFestivals(error.fallbackData || []);
      }

      if (!isLatestRequest("panchangam", requestId)) return;
      setPanchangamLoading(true);
      try {
        const panchangamData = await astrologyService.getPanchangam();
        if (!isLatestRequest("panchangam", requestId)) return;
        setPanchangam(panchangamData);
        setPanchangamNotice("");
      } catch (error) {
        if (!isLatestRequest("panchangam", requestId)) return;
        setPanchangam(error.fallbackData || null);
        setPanchangamNotice(error.message || "Showing offline Panchangam.");
      } finally {
        if (isLatestRequest("panchangam", requestId)) {
          setPanchangamLoading(false);
        }
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
    return signs.filter((item) =>
      `${item.label} ${item.sign} ${item.dateRange}`.toLowerCase().includes(q)
    );
  }, [searchQuery, signs]);

  const todayEnergyScore = getTodayEnergyScore(selectedSign, new Date());
  const futureClarityMetrics = useMemo(
    () => getFutureClarityMetrics(selectedSign, todayEnergyScore),
    [selectedSign, todayEnergyScore]
  );
  const actionOutcomeScenarios = useMemo(
    () => getActionOutcomeScenarios(selectedSign),
    [selectedSign]
  );
  const futureTimelineCards = useMemo(() => getFutureTimelineCards(selectedSign), [selectedSign]);
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
  const birthAstroPreview = useMemo(
    () =>
      calculateBirthAstroProfile(
        profileApi.profileDraft.birthDate,
        profileApi.profileDraft.birthTime,
        profileApi.profileDraft.birthTimezone,
        NAKSHATRA_NAMES,
        RASHI_NAMES
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
    if (personalizationBootstrapped || profileApi.profileLoading) return;
    setPersonalizedReady(hasRequiredBirthDetails);
    setPersonalizationBootstrapped(true);
  }, [hasRequiredBirthDetails, personalizationBootstrapped, profileApi.profileLoading]);

  const handleBirthDateChange = (value) => {
    handleProfileDraftChange("birthDate", value);
    const autoSign = detectSignFromBirthDate(value);
    if (autoSign) setSelectedSign(autoSign);
  };

  const handleSectionChange = (nextSection) => {
    const allowedBeforePersonalization = new Set([
      "today",
      "yearly",
      "total",
      "kundli",
      "profile",
      "consult",
    ]);
    if (!personalizedReady && !allowedBeforePersonalization.has(nextSection)) {
      setSaveState({
        type: "error",
        message: "Enter birth details in the Kundli or Profile tab and generate your prediction first.",
      });
      setActiveSection("today");
      return;
    }
    setActiveSection(nextSection);
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

  const handleQuickStartDraftChange = (field, value) => {
    if (field === "birthDate") return handleBirthDateChange(value);
    if (field === "birthPlace") return handleBirthPlaceChange(value);
    if (field === "birthTimezone") return handleBirthTimezoneChange(value);
    if (field === "nakshatra") return handleNakshatraChange(value);
    handleProfileDraftChange(field, value);
  };

  useEffect(() => {
    if (!profileApi.profileDraft.birthDate || !profileApi.profileDraft.birthTime) return;
    const calculatedProfile = calculateBirthAstroProfile(
      profileApi.profileDraft.birthDate,
      profileApi.profileDraft.birthTime,
      profileApi.profileDraft.birthTimezone,
      NAKSHATRA_NAMES,
      RASHI_NAMES
    );
    if (calculatedProfile.nakshatra && calculatedProfile.nakshatra !== profileApi.profileDraft.nakshatra) {
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
    if (!profileApi.profileDraft.birthTime) return;
    const autoLagna = getLagnaFromTime(profileApi.profileDraft.birthTime);
    if (autoLagna && autoLagna !== profileApi.profileDraft.lagna) {
      handleProfileDraftChange("lagna", autoLagna);
    }
  }, [profileApi.profileDraft.birthTime, profileApi.profileDraft.lagna, handleProfileDraftChange]);

  useEffect(() => {
    if (!birthAstroPreview.rashi) return;
    const autoSign = getAutoSignFromRashi(birthAstroPreview.rashi);
    if (autoSign && autoSign !== selectedSign) {
      setSelectedSign(autoSign);
    }
  }, [birthAstroPreview.rashi, selectedSign]);

  const handleQuickSave = async () => {
    if (!ensureSignedIn()) return;
    await profileApi.handleProfileSave({ preventDefault: () => {} });
  };

  const handleGenerateReport = async (quickPayload = null) => {
    const hasDetails = quickPayload
      ? Boolean(
          quickPayload.birthDate &&
            quickPayload.birthTime &&
            quickPayload.birthPlace &&
            quickPayload.gender
        )
      : hasRequiredBirthDetails;
    if (!hasDetails) {
      setSaveState({
        type: "error",
        message: "Please enter DOB, birth time, birth place and gender first.",
      });
      return;
    }

    const saveSuccess = currentUser?.id || currentUser?.name
      ? await profileApi.handleProfileSave({ preventDefault: () => {} })
      : true;
    if (!saveSuccess) return;

    const queuedQuestion =
      String(quickPayload?.question || "").trim() || String(question || "").trim();
    if (queuedQuestion) setAiQuestion(queuedQuestion);

    setActiveSection("today");
    setPersonalizedReady(true);
    setShowFullPrediction(true);
    setSaveState({
      type: "success",
      message: "Your personalized astrology preview is ready.",
    });
  };

  const handleAskAssistant = async () => {
    if (!ensureSignedIn()) return;
    if (!aiQuestion.trim()) {
      setSaveState({ type: "error", message: "Ask a question before sending." });
      return;
    }

    const requestId = nextRequestId("ai");
    setAiLoading(true);
    setAssistantAnswer(null);
    try {
      const answer = await astrologyService.askAstrologyAssistant(aiQuestion, selectedSign);
      if (!isLatestRequest("ai", requestId)) return;
      setAssistantAnswer(answer);
    } catch (error) {
      if (!isLatestRequest("ai", requestId)) return;
      setSaveState({ type: "error", message: error.message || "Unable to get assistant answer." });
    } finally {
      if (isLatestRequest("ai", requestId)) {
        setAiLoading(false);
      }
    }
  };

  const handleDownloadHoroscopeReport = async (period) => {
    if (!ensureSignedIn()) return;
    const normalizedPeriod = String(period || "year").toLowerCase();
    const requestId = nextRequestId("download");
    setDownloadingHoroscopePeriod(normalizedPeriod);

    try {
      const { blob, fileName } = await astrologyService.downloadHoroscopeReport(
        selectedSign,
        normalizedPeriod,
        language
      );
      if (!isLatestRequest("download", requestId)) return;
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
      if (!isLatestRequest("download", requestId)) return;
      setSaveState({ type: "error", message: error.message || "Unable to download horoscope report." });
    } finally {
      if (isLatestRequest("download", requestId)) {
        setDownloadingHoroscopePeriod("");
      }
    }
  };

  return {
    FEATURE_TABS,
    MOBILE_NAV_ITEMS,
    GENDER_OPTIONS,
    BIRTH_TIMEZONE_OPTIONS,
    BIRTH_LOCATION_OPTIONS,
    NAKSHATRA_NAMES,
    HEURISTIC_PREVIEW_FLAGS,
    localize,
    formatSavedReadingDate,
    getNakshatraDisplayName,
    getNakshatraFromSign,
    getCanonicalNakshatraName,
    getRashiFromSign,
    getRashiSummary,
    getCareerAdvice,
    getFinanceAdvice,
    getRemedyTips,
    language,
    setLanguage,
    searchQuery,
    setSearchQuery,
    headerMenuOpen,
    setHeaderMenuOpen,
    activeSection,
    setActiveSection,
    showFullPrediction,
    setShowFullPrediction,
    personalizedReady,
    setPersonalizedReady,
    question,
    setQuestion,
    detailedReport,
    setDetailedReport,
    signs,
    selectedSign,
    setSelectedSign,
    reading,
    loading,
    signsNotice,
    readingNotice,
    saveState,
    festivals,
    panchangam,
    panchangamNotice,
    panchangamLoading,
    aiQuestion,
    setAiQuestion,
    assistantAnswer,
    aiLoading,
    downloadingHoroscopePeriod,
    selectedSignDetails,
    heroPrediction,
    filteredSigns,
    todayEnergyScore,
    futureClarityMetrics,
    actionOutcomeScenarios,
    futureTimelineCards,
    yearlyHoroscopeContent,
    totalLifeReadingContent,
    squarePlanetChart,
    birthAstroPreview,
    hasRequiredBirthDetails,
    profileApi,
    consultApi,
    kundliApi,
    handleSectionChange,
    handleQuickStartDraftChange,
    handleBirthPlaceChange,
    handleBirthTimezoneChange,
    handleNakshatraChange,
    handleQuickSave,
    handleGenerateReport,
    handleAskAssistant,
    handleDownloadHoroscopeReport,
  };
};
