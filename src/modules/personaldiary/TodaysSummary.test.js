import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import TodaysSummary from "./TodaysSummary";
import { fetchTodaysSummary } from "../../services/diaryService";

jest.mock("../../services/diaryService", () => ({
  fetchTodaysSummary: jest.fn(),
}));

describe("TodaysSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows diary entries in today's summary when the API returns them", async () => {
    fetchTodaysSummary.mockResolvedValue({
      data: {
        entries: [
          {
            _id: "entry-1",
            title: "Morning Reflection",
            content: "<p>Today was productive and calm.</p>",
            category: "Personal",
          },
        ],
        notes: [],
        reminders: [
          {
            _id: "reminder-1",
            title: "Drink water",
            note: "Keep the bottle nearby",
            reminderAt: "2026-04-25T09:00:00.000Z",
            isCompleted: false,
          },
        ],
        pendingReminders: [
          {
            _id: "reminder-1",
            title: "Drink water",
            note: "Keep the bottle nearby",
            reminderAt: "2026-04-25T09:00:00.000Z",
            isCompleted: false,
          },
        ],
        summary: {
          totalEntries: 1,
          totalNotes: 0,
          totalReminders: 1,
          pendingRemindersCount: 1,
        },
      },
    });

    render(<TodaysSummary />);

    await waitFor(() => {
      expect(screen.getByText("Entries (1)")).toBeInTheDocument();
    });

    expect(screen.getByText("Morning Reflection")).toBeInTheDocument();
    expect(
      screen.getByText("Today was productive and calm.")
    ).toBeInTheDocument();
    expect(screen.getByText("Drink water")).toBeInTheDocument();
    expect(
      screen.queryByText("No diary entries, notes, or reminders for today yet.")
    ).not.toBeInTheDocument();
  });
});
