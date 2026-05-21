import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import AstrologyHome from "./AstrologyHome";
import { useAstrologyHomeController } from "./hooks/useAstrologyHomeController";

jest.mock("./HoroscopeCard", () => () => <div data-testid="horoscope-card">HoroscopeCard</div>);
jest.mock("./AstrologyQuickStartPanel", () => () => <div data-testid="quick-start">QuickStart</div>);
jest.mock("./hooks/useAstrologyHomeController", () => ({
  useAstrologyHomeController: jest.fn(),
}));

const createControllerMock = (overrides = {}) => ({
  FEATURE_TABS: [
    { key: "today", label: "Today", labelMl: "Today" },
    { key: "yearly", label: "Yearly", labelMl: "Yearly" },
    { key: "ai", label: "AI", labelMl: "AI" },
  ],
  MOBILE_NAV_ITEMS: [{ key: "today", label: "Home" }, { key: "yearly", label: "Yearly" }],
  GENDER_OPTIONS: [{ value: "", label: "Select gender" }],
  BIRTH_TIMEZONE_OPTIONS: [{ value: "Asia/Kolkata", label: "IST" }],
  BIRTH_LOCATION_OPTIONS: [{ label: "Kochi, Kerala, India", timeZone: "Asia/Kolkata" }],
  NAKSHATRA_NAMES: ["Ashwini"],
  localize: (en) => en,
  formatSavedReadingDate: () => "Today",
  getNakshatraDisplayName: (value) => value || "Ashwini",
  getNakshatraFromSign: () => "Ashwini",
  getCanonicalNakshatraName: (value) => value || "Ashwini",
  getRashiFromSign: () => "Mesha",
  getRashiSummary: () => "Summary",
  getCareerAdvice: () => "Career",
  getFinanceAdvice: () => "Finance",
  getRemedyTips: () => ["Tip 1"],
  language: "en",
  setLanguage: jest.fn(),
  searchQuery: "",
  setSearchQuery: jest.fn(),
  headerMenuOpen: false,
  setHeaderMenuOpen: jest.fn(),
  activeSection: "yearly",
  setActiveSection: jest.fn(),
  showFullPrediction: true,
  personalizedReady: true,
  question: "",
  setQuestion: jest.fn(),
  detailedReport: true,
  setDetailedReport: jest.fn(),
  signs: [{ sign: "aries", label: "Aries", dateRange: "Mar 21 - Apr 19" }],
  selectedSign: "aries",
  setSelectedSign: jest.fn(),
  reading: { horoscope: "Today reading" },
  loading: false,
  signsNotice: "",
  readingNotice: "",
  saveState: { type: "", message: "" },
  festivals: [],
  panchangam: null,
  panchangamNotice: "",
  panchangamLoading: false,
  aiQuestion: "",
  setAiQuestion: jest.fn(),
  assistantAnswer: null,
  aiLoading: false,
  downloadingHoroscopePeriod: "",
  selectedSignDetails: { sign: "aries", label: "Aries", dateRange: "Mar 21 - Apr 19" },
  heroPrediction: "Prediction",
  filteredSigns: [{ sign: "aries", label: "Aries", dateRange: "Mar 21 - Apr 19" }],
  todayEnergyScore: 7,
  futureClarityMetrics: { momentum: 65, stability: 61, caution: 40 },
  actionOutcomeScenarios: [],
  futureTimelineCards: [],
  yearlyHoroscopeContent: {
    headline: "Yearly headline",
    quarterPlan: ["Q1: Plan"],
    keyWins: ["Win 1"],
    caution: "Caution",
  },
  totalLifeReadingContent: {
    headline: "Total",
    guidingPrinciple: "Principle",
    pillars: [],
  },
  squarePlanetChart: [],
  profileApi: {
    profileDraft: {
      birthDate: "",
      birthTime: "",
      birthPlace: "",
      birthTimezone: "Asia/Kolkata",
      gender: "",
      favoriteTopics: "",
      nakshatra: "",
      rashi: "",
      lagna: "",
    },
    selectedProfile: {},
    profileNotice: "",
    recentSavedReadings: [],
    handleDraftChange: jest.fn(),
    handleProfileSave: jest.fn(),
    savingProfile: false,
    familyProfiles: [],
    activeFamilyIndex: 0,
    familyDraft: {},
    handleFamilyDraftChange: jest.fn(),
    handleFamilyProfileSave: jest.fn(),
    selectFamilyProfile: jest.fn(),
    handleNewFamilyProfile: jest.fn(),
  },
  consultApi: {
    consultants: [],
    consultationHistoryLoading: false,
    consultationHistory: [],
    getStatusClassName: () => "",
    formatStatusLabel: (value) => value,
  },
  kundliApi: {
    kundliData: null,
    partnerSign: "taurus",
    setPartnerSign: jest.fn(),
    compatibility: null,
    compatibilityHistory: [],
    kundliLoading: false,
    downloadingKundli: false,
    kundliHistory: [],
    activeKundliSnapshotId: "",
    handleCompatibilitySubmit: jest.fn(),
    handleDownloadKundliReport: jest.fn(),
    handleRestoreKundliSnapshot: jest.fn(),
    handleLoadLiveKundli: jest.fn(),
  },
  handleSectionChange: jest.fn(),
  handleQuickStartDraftChange: jest.fn(),
  handleBirthPlaceChange: jest.fn(),
  handleBirthTimezoneChange: jest.fn(),
  handleNakshatraChange: jest.fn(),
  handleQuickSave: jest.fn(),
  handleGenerateReport: jest.fn(),
  handleAskAssistant: jest.fn(),
  handleDownloadHoroscopeReport: jest.fn(),
  ...overrides,
});

describe("AstrologyHome component entrypoints", () => {
  test("clicking sign chip calls setSelectedSign", () => {
    const mockController = createControllerMock();
    useAstrologyHomeController.mockReturnValue(mockController);
    render(<AstrologyHome />);
    fireEvent.click(screen.getByRole("button", { name: /Aries/i }));
    expect(mockController.setSelectedSign).toHaveBeenCalledWith("aries");
  });

  test("yearly download button delegates to controller action", () => {
    const mockController = createControllerMock();
    useAstrologyHomeController.mockReturnValue(mockController);
    render(<AstrologyHome />);
    fireEvent.click(screen.getByRole("button", { name: /Download yearly horoscope/i }));
    expect(mockController.handleDownloadHoroscopeReport).toHaveBeenCalledWith("year");
  });

  test("ai tab button delegates section transition", () => {
    const mockController = createControllerMock();
    useAstrologyHomeController.mockReturnValue(mockController);
    render(<AstrologyHome />);
    fireEvent.click(screen.getByRole("tab", { name: "AI" }));
    expect(mockController.handleSectionChange).toHaveBeenCalledWith("ai");
  });
});

