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
import { useAstrologyFamilyProfiles } from "./useAstrologyFamilyProfiles";

const hasLikelyMojibake = (value = "") => /Ãƒ|Ã‚|Ã¢â‚¬|Ã¢â€š|ï¿½/i.test(String(value || ""));

const localize = (en, ml, language) => {
  if (language !== "ml") return en;
  const normalizedMl = String(ml || "").trim();
  if (!normalizedMl || hasLikelyMojibake(normalizedMl)) return en;
  return normalizedMl;
};

const REQUIRED_PROFILE_FIELDS = [
  { key: "birthDate", label: "birth date" },
  { key: "birthTime", label: "birth time" },
  { key: "birthPlace", label: "birth place" },
  { key: "gender", label: "gender" },
];

const getMissingProfileFields = (draft = {}) =>
  REQUIRED_PROFILE_FIELDS.filter(({ key }) => !String(draft?.[key] || "").trim()).map(
    ({ key }) => key
  );

const formatMissingFieldsText = (missingFields = []) => {
  if (!missingFields.length) return "";
  return missingFields
    .map((field) => REQUIRED_PROFILE_FIELDS.find((entry) => entry.key === field)?.label || field)
    .join(", ");
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
  const [restoredSavedReading, setRestoredSavedReading] = useState(null);
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
  const [assistantHistory, setAssistantHistory] = useState([]);
  const [assistantRetryQuestion, setAssistantRetryQuestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [downloadingHoroscopePeriod, setDownloadingHoroscopePeriod] = useState("");
  const [downloadRetryPeriod, setDownloadRetryPeriod] = useState("");
  const [requiredProfileFields, setRequiredProfileFields] = useState([]);

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

  const familyProfilesApi = useAstrologyFamilyProfiles({
    currentUser,
    profileApi,
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
    setRestoredSavedReading((currentReading) => {
      if (!currentReading) return currentReading;
      return currentReading.sign === selectedSign ? currentReading : null;
    });
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

  const activeReading = restoredSavedReading || reading;

  const selectedSignDetails =
    signs.find((entry) => entry.sign === selectedSign) ||
    activeReading ||
    astrologyService.getFallbackSign(selectedSign);
  const handleProfileDraftChange = profileApi.handleDraftChange;

  const heroPrediction = String(
    activeReading?.horoscope ||
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

  const missingRequiredProfileFields = getMissingProfileFields(profileApi.profileDraft);
  const hasRequiredBirthDetails = missingRequiredProfileFields.length === 0;

  useEffect(() => {
    if (personalizationBootstrapped || profileApi.profileLoading) return;
    setPersonalizedReady(hasRequiredBirthDetails);
    setPersonalizationBootstrapped(true);
  }, [hasRequiredBirthDetails, personalizationBootstrapped, profileApi.profileLoading]);

  useEffect(() => {
    if (!requiredProfileFields.length) return;
    const isSame =
      missingRequiredProfileFields.length === requiredProfileFields.length &&
      missingRequiredProfileFields.every((field, index) => field === requiredProfileFields[index]);
    if (!isSame) {
      setRequiredProfileFields(missingRequiredProfileFields);
    }
  }, [missingRequiredProfileFields, requiredProfileFields]);

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
      const missingFields = getMissingProfileFields(profileApi.profileDraft);
      const missingFieldsText = formatMissingFieldsText(missingFields);
      setRequiredProfileFields(missingFields);
      setSaveState({
        type: "error",
        message: missingFieldsText
          ? `Complete these fields in Profile before using this tab: ${missingFieldsText}.`
          : "Enter birth details in Profile and generate your prediction first.",
      });
      setActiveSection("profile");
      return;
    }
    if (nextSection === "profile") {
      setRequiredProfileFields([]);
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

  const handleRestoreSavedReading = (savedReading) => {
    if (!savedReading?.sign) return;
    const fallbackReading = astrologyService.getFallbackReading(savedReading.sign);
    const restoredReading = {
      ...fallbackReading,
      ...savedReading,
      sign: String(savedReading.sign || fallbackReading.sign).toLowerCase(),
      readingDate: savedReading.readingDate || fallbackReading.readingDate,
      generatedAt: savedReading.generatedAt || savedReading.readingDate || fallbackReading.generatedAt,
      horoscope: String(savedReading.horoscope || fallbackReading.horoscope).trim(),
    };

    setSelectedSign(restoredReading.sign);
    setRestoredSavedReading(restoredReading);
    setReadingNotice("");
    setShowFullPrediction(true);
    setActiveSection("today");
    setSaveState({
      type: "success",
      message: `Restored saved reading from ${formatSavedReadingDate(restoredReading.readingDate)}.`,
    });
  };

  const handleGenerateReport = async (quickPayload = null) => {
    const nextDraft = quickPayload || profileApi.profileDraft;
    const missingFields = getMissingProfileFields(nextDraft);
    const hasDetails = missingFields.length === 0;
    if (!hasDetails) {
      setRequiredProfileFields(missingFields);
      setSaveState({
        type: "error",
        message: `Please complete these fields first: ${formatMissingFieldsText(missingFields)}.`,
      });
      setActiveSection("profile");
      return;
    }

    const saveSuccess = currentUser?.id || currentUser?.name
      ? await profileApi.handleProfileSave({ preventDefault: () => {} })
      : true;
    if (!saveSuccess) return;

    const queuedQuestion =
      String(quickPayload?.question || "").trim() || String(question || "").trim();
    if (queuedQuestion) setAiQuestion(queuedQuestion);

    setRestoredSavedReading(null);
    setRequiredProfileFields([]);
    setActiveSection("today");
    setPersonalizedReady(true);
    setShowFullPrediction(true);
    setSaveState({
      type: "success",
      message: "Your personalized astrology preview is ready.",
    });
  };

  const askAssistantQuestion = async (rawQuestion) => {
    if (!ensureSignedIn()) return;
    const normalizedQuestion = String(rawQuestion || "").trim();
    if (!normalizedQuestion) {
      setSaveState({ type: "error", message: "Ask a question before sending." });
      return;
    }

    const requestId = nextRequestId("ai");
    setAiLoading(true);
    setAssistantRetryQuestion("");
    try {
      const answer = await astrologyService.askAstrologyAssistant(normalizedQuestion, selectedSign);
      if (!isLatestRequest("ai", requestId)) return;
      setAssistantAnswer(answer);
      setAssistantHistory((currentHistory) => [
        {
          id: `astro-ai-${requestId}-${Date.now()}`,
          question: normalizedQuestion,
          answer: String(answer?.answer || "").trim(),
          tips: Array.isArray(answer?.tips) ? answer.tips : [],
          qualityNote: String(answer?.quality?.note || "").trim(),
          createdAt: new Date().toISOString(),
        },
        ...currentHistory,
      ]);
    } catch (error) {
      if (!isLatestRequest("ai", requestId)) return;
      setAssistantRetryQuestion(normalizedQuestion);
      setSaveState({
        type: "error",
        message:
          error.message || "Unable to get assistant answer. Try Retry with your last question.",
      });
    } finally {
      if (isLatestRequest("ai", requestId)) {
        setAiLoading(false);
      }
    }
  };

  const handleAskAssistant = async () => askAssistantQuestion(aiQuestion);

  const handleRetryAssistantQuestion = async () => {
    if (!assistantRetryQuestion) return;
    setAiQuestion(assistantRetryQuestion);
    await askAssistantQuestion(assistantRetryQuestion);
  };

  const handleDownloadHoroscopeReport = async (period) => {
    if (!ensureSignedIn()) return;
    const normalizedPeriod = String(period || "year").toLowerCase();
    const requestId = nextRequestId("download");
    setDownloadingHoroscopePeriod(normalizedPeriod);
    setDownloadRetryPeriod("");

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
      setDownloadRetryPeriod(normalizedPeriod);
      setSaveState({
        type: "error",
        message: error.message || "Unable to download horoscope report. Use Retry download.",
      });
    } finally {
      if (isLatestRequest("download", requestId)) {
        setDownloadingHoroscopePeriod("");
      }
    }
  };

  const handleRetryHoroscopeDownload = async () => {
    if (!downloadRetryPeriod) return;
    await handleDownloadHoroscopeReport(downloadRetryPeriod);
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
    reading: activeReading,
    restoredSavedReading,
    loading,
    signsNotice,
    readingNotice,
    saveState,
    requiredProfileFields,
    festivals,
    panchangam,
    panchangamNotice,
    panchangamLoading,
    aiQuestion,
    setAiQuestion,
    assistantAnswer,
    assistantHistory,
    assistantRetryQuestion,
    aiLoading,
    downloadingHoroscopePeriod,
    downloadRetryPeriod,
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
    familyProfilesApi,
    handleSectionChange,
    handleQuickStartDraftChange,
    handleBirthPlaceChange,
    handleBirthTimezoneChange,
    handleNakshatraChange,
    handleQuickSave,
    handleRestoreSavedReading,
    handleGenerateReport,
    handleAskAssistant,
    handleRetryAssistantQuestion,
    handleDownloadHoroscopeReport,
    handleRetryHoroscopeDownload,
  };
};
