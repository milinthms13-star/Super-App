import axios from "axios";
import { astrologyService } from "./astrologyService";

jest.mock("axios");

describe("astrologyService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("throws with fallback sign data when the live sign list fails", async () => {
    axios.get.mockRejectedValueOnce(new Error("Network down"));

    try {
      await astrologyService.getSigns();
      throw new Error("Expected getSigns to reject.");
    } catch (error) {
      expect(error.message).toBe("Network down");
      expect(error.fallbackData).toEqual(
        expect.arrayContaining([expect.objectContaining({ sign: "aries" })])
      );
    }
  });

  test("throws with a fallback daily reading when the live daily endpoint fails", async () => {
    axios.get.mockRejectedValueOnce({
      response: {
        data: {
          message: "Astrology API is offline",
        },
      },
    });

    try {
      await astrologyService.getDailyHoroscope("leo");
      throw new Error("Expected getDailyHoroscope to reject.");
    } catch (error) {
      expect(error.message).toBe("Astrology API is offline");
      expect(error.fallbackData).toEqual(expect.objectContaining({ sign: "leo" }));
      expect(error.fallbackData.readingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test("normalizes the saved astrology profile payload", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          sign: "aries",
          birthDate: "2026-04-23T00:00:00.000Z",
          birthTime: "09:30",
          birthPlace: "Kochi",
          preferences: {
            receiveDailyHoroscope: true,
            favoriteTopics: ["career", "relationships"],
          },
          savedReadings: [
            {
              sign: "aries",
              horoscope: "Stay focused.",
              readingDate: "2026-04-23T00:00:00.000Z",
            },
          ],
        },
      },
    });

    const profile = await astrologyService.getProfile();

    expect(profile).toEqual(
      expect.objectContaining({
        sign: "aries",
        birthDate: "2026-04-23",
        birthTime: "09:30",
        birthPlace: "Kochi",
        preferences: expect.objectContaining({
          receiveDailyHoroscope: true,
          favoriteTopics: ["career", "relationships"],
        }),
      })
    );
    expect(profile.savedReadings[0]).toEqual(
      expect.objectContaining({
        sign: "aries",
        readingDate: "2026-04-23",
      })
    );
  });

  test("loads analytics dashboard data through the astrology service endpoint", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          totalBookings: 12,
          totalRevenue: 42000,
        },
      },
    });

    const analytics = await astrologyService.getAnalyticsDashboard("month");

    expect(analytics).toEqual(
      expect.objectContaining({
        totalBookings: 12,
        totalRevenue: 42000,
      })
    );
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining("/astrology/analytics/dashboard"),
      expect.objectContaining({
        params: { period: "month" },
      })
    );
  });

  test("returns a clear 403 status when analytics dashboard is forbidden", async () => {
    axios.get.mockRejectedValueOnce({
      response: {
        status: 403,
        data: {
          message: "Admin access required.",
        },
      },
    });

    try {
      await astrologyService.getAnalyticsDashboard("month");
      throw new Error("Expected getAnalyticsDashboard to reject.");
    } catch (error) {
      expect(error.message).toBe("Admin access required.");
      expect(error.status).toBe(403);
    }
  });

  test("loads astrology analytics alerts from the alerts endpoint", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          windowHours: 24,
          generatedAt: "2026-05-21T10:00:00.000Z",
          signals: {
            paymentVerificationFailures: { count: 2, severity: "warn" },
            slotConflictSpikes: { count: 0, severity: "info" },
            webhookErrors: { count: 1, severity: "warn" },
          },
        },
      },
    });

    const alerts = await astrologyService.getAnalyticsAlerts(24);

    expect(alerts).toEqual(
      expect.objectContaining({
        windowHours: 24,
        signals: expect.objectContaining({
          paymentVerificationFailures: expect.objectContaining({ count: 2, severity: "warn" }),
        }),
      })
    );
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining("/astrology/analytics/alerts"),
      expect.objectContaining({
        params: { lookbackHours: 24 },
      })
    );
  });

  test("returns a clear 403 status when analytics alerts are forbidden", async () => {
    axios.get.mockRejectedValueOnce({
      response: {
        status: 403,
        data: {
          message: "Admin access required.",
        },
      },
    });

    try {
      await astrologyService.getAnalyticsAlerts(24);
      throw new Error("Expected getAnalyticsAlerts to reject.");
    } catch (error) {
      expect(error.message).toBe("Admin access required.");
      expect(error.status).toBe(403);
    }
  });

  test("downloads astrology analytics report as blob with filename", async () => {
    const mockBlob = new Blob(["report"], { type: "application/pdf" });
    axios.get.mockResolvedValueOnce({
      data: mockBlob,
      headers: {
        "content-disposition": 'attachment; filename="astrology-report-month.pdf"',
      },
    });

    const report = await astrologyService.downloadAnalyticsReport("month", "pdf");

    expect(report.blob).toBe(mockBlob);
    expect(report.fileName).toBe("astrology-report-month.pdf");
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining("/astrology/analytics/report"),
      expect.objectContaining({
        params: { period: "month", format: "pdf" },
        responseType: "blob",
      })
    );
  });
});
