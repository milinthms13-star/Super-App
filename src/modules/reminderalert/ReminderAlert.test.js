import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReminderAlert from "./ReminderAlert";
import {
  acceptTrustedContactInvite,
  acknowledgeSharedReminder,
  createReminder,
  createVoiceCallReminder,
  deleteReminder,
  fetchReminders,
  getAcceptedTrustedContacts,
  getReceivedTrustedContactInvites,
  getRemindersSharedWithMe,
  getSentTrustedContactInvites,
  rejectTrustedContactInvite,
  removeTrustedContact,
  sendTrustedContactInvite,
  shareReminderWithContacts,
  toggleReminderCompletion,
  updateReminder,
} from "../../services/remindersService";

jest.mock("../../components/VoiceNoteRecorder", () => {
  const React = require("react");
  return function MockVoiceNoteRecorder() {
    return React.createElement("div", null, "Voice recorder mock");
  };
});

jest.mock("../../services/remindersService", () => ({
  fetchReminders: jest.fn(),
  createReminder: jest.fn(),
  createVoiceCallReminder: jest.fn(),
  updateReminder: jest.fn(),
  deleteReminder: jest.fn(),
  toggleReminderCompletion: jest.fn(),
  getAcceptedTrustedContacts: jest.fn(),
  getSentTrustedContactInvites: jest.fn(),
  getReceivedTrustedContactInvites: jest.fn(),
  sendTrustedContactInvite: jest.fn(),
  acceptTrustedContactInvite: jest.fn(),
  acknowledgeSharedReminder: jest.fn(),
  rejectTrustedContactInvite: jest.fn(),
  removeTrustedContact: jest.fn(),
  shareReminderWithContacts: jest.fn(),
  getRemindersSharedWithMe: jest.fn(),
}));

describe("ReminderAlert", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    getAcceptedTrustedContacts.mockResolvedValue({ data: [] });
    getSentTrustedContactInvites.mockResolvedValue({ data: [] });
    getReceivedTrustedContactInvites.mockResolvedValue({ data: [] });
    sendTrustedContactInvite.mockResolvedValue({ data: {} });
    acceptTrustedContactInvite.mockResolvedValue({ data: {} });
    acknowledgeSharedReminder.mockResolvedValue({ data: {} });
    rejectTrustedContactInvite.mockResolvedValue({ data: {} });
    removeTrustedContact.mockResolvedValue({ data: {} });
    shareReminderWithContacts.mockResolvedValue({ data: null });
    createVoiceCallReminder.mockResolvedValue({ data: {} });
    getRemindersSharedWithMe.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("shows backend errors without falling back to fake seed reminders", async () => {
    fetchReminders.mockRejectedValue(new Error("Backend is unavailable"));

    render(<ReminderAlert customLinks={[]} onCustomLinksChange={jest.fn()} />);

    expect(
      await screen.findByText("An unexpected error occurred. Please try again.")
    ).toBeInTheDocument();
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

    const reminderTitles = await screen.findAllByText("Doctor follow-up");
    expect(reminderTitles.length).toBeGreaterThan(0);
    expect(screen.queryByText(/invalid date/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("2030-05-12")).toBeInTheDocument();
    });
  });

  test("reloads reminders after saving a reminder and syncing trusted-contact sharing", async () => {
    fetchReminders
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [
          {
            _id: "rem-2",
            title: "Doctor visit",
            category: "Personal",
            priority: "High",
            dueDate: "2030-06-01",
            dueTime: "",
            reminders: ["In-app"],
            status: "Reminder scheduled",
            recurring: "none",
            completed: false,
            sharedWithTrustedContacts: ["contact-1"],
          },
        ],
      });

    getAcceptedTrustedContacts.mockResolvedValue({
      data: [
        {
          _id: "trusted-1",
          relationship: "family",
          recipientId: {
            _id: "contact-1",
            name: "Anita",
          },
        },
      ],
    });
    createReminder.mockResolvedValue({
      data: {
        _id: "rem-2",
        title: "Doctor visit",
      },
    });
    shareReminderWithContacts.mockResolvedValue({
      data: {
        _id: "rem-2",
        sharedWithTrustedContacts: ["contact-1"],
      },
    });

    render(<ReminderAlert customLinks={[]} onCustomLinksChange={jest.fn()} />);

    const addButton = await screen.findByRole("button", { name: /add reminder/i });
    await waitFor(() => expect(addButton).not.toBeDisabled());
    fireEvent.click(addButton);
    fireEvent.change(screen.getByPlaceholderText("Example: Doctor follow-up"), {
      target: { value: "Doctor visit" },
    });
    fireEvent.change(screen.getByLabelText(/Due date/i), {
      target: { value: "2030-06-01" },
    });
    fireEvent.click(screen.getByLabelText(/Share reminder with Anita/i));
    fireEvent.click(screen.getByRole("button", { name: /save reminder/i }));

    await waitFor(() => {
      expect(createReminder).toHaveBeenCalledTimes(1);
      expect(shareReminderWithContacts).toHaveBeenCalledWith("rem-2", ["contact-1"]);
      expect(fetchReminders).toHaveBeenCalledTimes(2);
    });
  });

  test("requires an uploaded voice note for audio call reminders", async () => {
    fetchReminders.mockResolvedValue({ data: [] });

    render(<ReminderAlert customLinks={[]} onCustomLinksChange={jest.fn()} />);

    const addButton = await screen.findByRole("button", { name: /add reminder/i });
    await waitFor(() => expect(addButton).not.toBeDisabled());
    fireEvent.click(addButton);
    fireEvent.change(screen.getByPlaceholderText("Example: Doctor follow-up"), {
      target: { value: "Medicine check" },
    });
    fireEvent.change(screen.getByLabelText(/Due date/i), {
      target: { value: "2030-07-01" },
    });
    fireEvent.click(screen.getByLabelText(/Send reminder via Voice call/i));
    fireEvent.change(screen.getByLabelText(/Phone number/i), {
      target: { value: "+919876543210" },
    });
    fireEvent.change(screen.getByLabelText(/Voice message type/i), {
      target: { value: "audio" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save reminder/i }));

    expect(
      await screen.findByText("Record or upload a voice note for audio reminders")
    ).toBeInTheDocument();
    expect(createVoiceCallReminder).not.toHaveBeenCalled();
  });
});
