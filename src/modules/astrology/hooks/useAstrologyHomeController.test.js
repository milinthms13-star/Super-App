import { act, renderHook, waitFor } from "@testing-library/react";
import { useAstrologyHomeController } from "./useAstrologyHomeController";
import { astrologyService } from "../../../services/astrologyService";

jest.mock("../../../contexts/AppContext", () => ({
  useApp: () => ({
    currentUser: { id: "user-1", name: "Tester" },
  }),
}));

const mockProfileApi = {
  profileDraft: {
    birthDate: "",
    birthTime: "",
    birthPlace: "",
    birthTimezone: "Asia/Kolkata",
    gender: "",
    nakshatra: "",
    rashi: "",
    lagna: "",
  },
  profileLoading: false,
  profileNotice: "",
  savingProfile: false,
  selectedProfile: {},
  recentSavedReadings: [],
  familyProfiles: [],
  activeFamilyIndex: 0,
  familyDraft: {},
  handleDraftChange: jest.fn(),
  handleProfileSave: jest.fn().mockResolvedValue(true),
};

jest.mock("./useAstrologyProfile", () => ({
  useAstrologyProfile: () => mockProfileApi,
}));

jest.mock("./useAstrologyConsultations", () => ({
  useAstrologyConsultations: () => ({
    consultants: [],
    consultationHistoryLoading: false,
    consultationHistory: [],
    getStatusClassName: () => "",
    formatStatusLabel: (value) => value,
  }),
}));

jest.mock("./useAstrologyKundliCompatibility", () => ({
  useAstrologyKundliCompatibility: () => ({
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
  }),
}));

jest.mock("../../../services/astrologyService", () => ({
  astrologyService: {
    getSigns: jest.fn(),
    getFallbackSigns: jest.fn(() => []),
    getFallbackSign: jest.fn((sign) => ({ sign, label: sign })),
    getDailyHoroscope: jest.fn(),
    getFallbackReading: jest.fn((sign) => ({ sign, horoscope: "fallback" })),
    getFestivalUpdates: jest.fn(),
    getPanchangam: jest.fn(),
    askAstrologyAssistant: jest.fn(),
    downloadHoroscopeReport: jest.fn(),
  },
}));

describe("useAstrologyHomeController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfileApi.handleProfileSave.mockResolvedValue(true);
    mockProfileApi.profileDraft = {
      birthDate: "",
      birthTime: "",
      birthPlace: "",
      birthTimezone: "Asia/Kolkata",
      gender: "",
      nakshatra: "",
      rashi: "",
      lagna: "",
    };
    astrologyService.getSigns.mockResolvedValue([
      { sign: "aries", label: "Aries", dateRange: "Mar 21 - Apr 19" },
      { sign: "taurus", label: "Taurus", dateRange: "Apr 20 - May 20" },
    ]);
    astrologyService.getDailyHoroscope.mockImplementation(async (sign) => ({
      sign,
      horoscope: `reading-${sign}`,
    }));
    astrologyService.getFestivalUpdates.mockResolvedValue([]);
    astrologyService.getPanchangam.mockResolvedValue({ tithi: "Test" });
  });

  test("sign switching triggers fresh horoscope calls", async () => {
    const { result } = renderHook(() => useAstrologyHomeController());

    await waitFor(() => {
      expect(astrologyService.getDailyHoroscope).toHaveBeenCalledWith("aries");
    });

    await act(async () => {
      result.current.setSelectedSign("taurus");
    });

    await waitFor(() => {
      expect(astrologyService.getDailyHoroscope).toHaveBeenCalledWith("taurus");
    });
  });

  test("blocks AI section before personalization details are complete", async () => {
    const { result } = renderHook(() => useAstrologyHomeController());

    await waitFor(() => {
      expect(result.current.signs.length).toBeGreaterThan(0);
    });

    act(() => {
      result.current.handleSectionChange("ai");
    });

    expect(result.current.activeSection).toBe("today");
    expect(result.current.saveState.type).toBe("error");
  });

  test("generate report transitions to today and marks personalized ready", async () => {
    const { result } = renderHook(() => useAstrologyHomeController());

    await waitFor(() => {
      expect(result.current.signs.length).toBeGreaterThan(0);
    });

    await act(async () => {
      await result.current.handleGenerateReport({
        birthDate: "1992-04-12",
        birthTime: "10:10",
        birthPlace: "Kochi",
        gender: "female",
        question: "How is this week?",
      });
    });

    expect(mockProfileApi.handleProfileSave).toHaveBeenCalled();
    expect(result.current.activeSection).toBe("today");
    expect(result.current.aiQuestion).toBe("How is this week?");
  });

  test("download flow reports error state on failure", async () => {
    astrologyService.downloadHoroscopeReport.mockRejectedValue(new Error("Download failed"));
    const { result } = renderHook(() => useAstrologyHomeController());

    await waitFor(() => {
      expect(result.current.selectedSign).toBe("aries");
    });

    await act(async () => {
      await result.current.handleDownloadHoroscopeReport("year");
    });

    expect(astrologyService.downloadHoroscopeReport).toHaveBeenCalledWith(
      "aries",
      "year",
      "en"
    );
    expect(result.current.saveState.type).toBe("error");
  });
});
