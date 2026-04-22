import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReminderAlert from "./ReminderAlert";
import {
  createReminder,
  deleteReminder,
  fetchReminders,
  toggleReminderCompletion,
  updateReminder,
} from "../../services/remindersService";

jest.mock("../../services/remindersService", () => ({
  fetchReminders: jest.fn(),
  createReminder: jest.fn(),
  updateReminder: jest.fn(),
  deleteReminder: jest.fn(),
  toggleReminderCompletion: jest.fn(),
}));

describe("ReminderAlert", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("shows backend errors without falling back to fake seed reminders", async () => {
    fetchReminders.mockRejectedValue(new Error("Backend is unavailable"));

    render(<ReminderAlert customLinks={[]} onCustomLinksChange={jest.fn()} />);

    expect(await screen.findByText("Backend is unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Renew vendor payment")).not.toBeInTheDocument();
    expect(screen.queryByText("Doctor follow-up")).not.toBeInTheDocument();
  });

  test("opens the edit form with a normalized date input value", async () => {
    fetchReminders.mockResolvedValue({
      data: [
        {
          _id: "rem-1",
          title: "Doctor follow-up",
          description: "Bring the latest lab report",
          category: "Personal",
          priority: "High",
          dueDate: "2030-05-12",
          dueTime: "09:00",
          reminders: ["In-app", "SMS"],
          status: "Escalation armed",
          recurring: "none",
          completed: false,
        },
      ],
    });
    createReminder.mockResolvedValue({ data: {} });
    updateReminder.mockResolvedValue({ data: {} });
    deleteReminder.mockResolvedValue({});
    toggleReminderCompletion.mockResolvedValue({ data: {} });

    render(<ReminderAlert customLinks={[]} onCustomLinksChange={jest.fn()} />);

    expect(await screen.findByText("Doctor follow-up")).toBeInTheDocument();
    expect(screen.queryByText(/invalid date/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("2030-05-12")).toBeInTheDocument();
    });
  });
});
