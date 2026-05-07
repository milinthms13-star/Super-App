import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import Diary from "./Diary";
import {
  fetchDiaryEntries,
  fetchDiaryCalendarItems,
  fetchMoodStats,
  fetchTags,
  fetchUpcomingReminders,
} from "../../services/diaryService";
import notificationService from "../../services/notificationService";

jest.mock("../../services/diaryService", () => ({
  fetchDiaryEntries: jest.fn(),
  createDiaryEntry: jest.fn(),
  updateDiaryEntry: jest.fn(),
  deleteDiaryEntry: jest.fn(),
  fetchDiaryCalendarItems: jest.fn(),
  createDiaryCalendarItem: jest.fn(),
  updateDiaryCalendarItem: jest.fn(),
  deleteDiaryCalendarItem: jest.fn(),
  fetchTags: jest.fn(),
  fetchMoodStats: jest.fn(),
  fetchUpcomingReminders: jest.fn(),
  autosaveDiaryEntry: jest.fn(),
  getAppLockStatus: jest.fn(),
  getEncryptionStatus: jest.fn(),
  exportEntryAsPDF: jest.fn(),
  exportEntriesAsPDF: jest.fn(),
}));

jest.mock("../../services/notificationService", () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn().mockResolvedValue(true),
    setupWebSocketListeners: jest.fn(),
    startLocalReminderCheck: jest.fn(),
    destroy: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("socket.io-client", () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

jest.mock("./DiaryEditor", () => {
  const React = require("react");
  return function MockDiaryEditor() {
    return React.createElement("div", null, "Diary Editor Mock");
  };
});

jest.mock("./DiaryEntryCard", () => {
  const React = require("react");
  return function MockDiaryEntryCard({ entry }) {
    return React.createElement("article", null, entry.title);
  };
});

jest.mock("./DiaryCalendar", () => {
  const React = require("react");
  return function MockDiaryCalendar() {
    return React.createElement("div", null, "Calendar View Mock");
  };
});

jest.mock("./MoodChart", () => {
  const React = require("react");
  return function MockMoodChart() {
    return React.createElement("div", null, "Mood Analytics Mock");
  };
});

jest.mock("./TodaysSummary", () => {
  const React = require("react");
  return function MockTodaysSummary() {
    return React.createElement("div", null, "Today's Summary Mock");
  };
});

jest.mock("./VersionHistory", () => {
  const React = require("react");
  return function MockVersionHistory() {
    return React.createElement("div", null, "Version History Mock");
  };
});

jest.mock("./TrashBin", () => {
  const React = require("react");
  return function MockTrashBin() {
    return React.createElement("div", null, "Trash Bin Mock");
  };
});

jest.mock("./AppLockSettings", () => {
  const React = require("react");
  return function MockAppLockSettings() {
    return React.createElement("div", null, "App Lock Settings Mock");
  };
});

jest.mock("./AutosaveIndicator", () => {
  const React = require("react");
  return function MockAutosaveIndicator() {
    return React.createElement("div", null, "Autosave Indicator Mock");
  };
});

jest.mock("./AIInsights", () => {
  const React = require("react");
  return function MockAIInsights() {
    return React.createElement("div", null, "AI Insights Mock");
  };
});

jest.mock("./EncryptionBackupSettings", () => {
  const React = require("react");
  return function MockEncryptionBackupSettings() {
    return React.createElement("div", null, "Encryption Backup Mock");
  };
});

jest.mock("./DiaryAnalyticsDashboard", () => {
  const React = require("react");
  return function MockDiaryAnalyticsDashboard() {
    return React.createElement("div", null, "Analytics Dashboard Mock");
  };
});

jest.mock("./DiaryAISummaryPanel", () => {
  const React = require("react");
  return function MockDiaryAISummaryPanel() {
    return React.createElement("div", null, "AI Summary Panel Mock");
  };
});

const mockEntries = [
  {
    _id: "entry-1",
    title: "Test Entry",
    content: "Test content",
    mood: "happy",
    category: "Personal",
  },
];

describe("Diary", () => {
  let fetchSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [] }),
    });

    fetchDiaryEntries.mockResolvedValue({
      data: mockEntries,
      pagination: {
        total: mockEntries.length,
        limit: 20,
        skip: 0,
        hasMore: false,
      },
    });
    fetchDiaryCalendarItems.mockResolvedValue({ data: [] });
    fetchTags.mockResolvedValue({ data: [] });
    fetchMoodStats.mockResolvedValue({ data: [] });
    fetchUpcomingReminders.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
  });

  test("renders the diary landing state and requests notification permissions", async () => {
    render(<Diary />);

    expect(screen.getByText("My Diary")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new entry/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(notificationService.requestPermission).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Today's Summary Mock")).toBeInTheDocument();
    });
  });

  test("shows an empty state when the diary service returns no entries", async () => {
    fetchDiaryEntries.mockResolvedValue({
      data: [],
      pagination: {
        total: 0,
        limit: 20,
        skip: 0,
        hasMore: false,
      },
    });

    render(<Diary />);

    await waitFor(() => {
      expect(screen.getByText(/no entries found/i)).toBeInTheDocument();
    });
  });

  test("opens the diary editor when starting a new entry", async () => {
    render(<Diary />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /new entry/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /new entry/i }));

    await waitFor(() => {
      expect(screen.getByText("Diary Editor Mock")).toBeInTheDocument();
    });
  });

  test("reloads entries with the selected category filter", async () => {
    render(<Diary />);

    await waitFor(() => {
      expect(fetchDiaryEntries).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Work" },
    });

    await waitFor(() => {
      expect(
        fetchDiaryEntries.mock.calls.some(
          ([options]) => options?.category === "Work"
        )
      ).toBe(true);
    });
  });

  test("switches between list, calendar, and analytics views", async () => {
    render(<Diary />);

    await waitFor(() => {
      expect(fetchDiaryEntries).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: /calendar/i }));
    expect(screen.getByText("Calendar View Mock")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /mood analytics/i }));
    expect(screen.getByText("Mood Analytics Mock")).toBeInTheDocument();
  });
});
