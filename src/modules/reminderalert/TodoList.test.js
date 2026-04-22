import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TodoList from "./TodoList";
import {
  deleteReminder,
  fetchReminders,
  toggleReminderCompletion,
} from "../../services/remindersService";

jest.mock("../../services/remindersService", () => ({
  fetchReminders: jest.fn(),
  toggleReminderCompletion: jest.fn(),
  deleteReminder: jest.fn(),
}));

describe("TodoList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("removes a reminder from the visible list when it is completed in incomplete-only mode", async () => {
    fetchReminders.mockResolvedValue({
      data: [
        {
          _id: "rem-1",
          title: "Pay rent",
          description: "Transfer by noon",
          category: "Personal",
          priority: "High",
          status: "Reminder scheduled",
          completed: false,
        },
      ],
    });
    toggleReminderCompletion.mockResolvedValue({
      data: {
        _id: "rem-1",
        title: "Pay rent",
        description: "Transfer by noon",
        category: "Personal",
        priority: "High",
        status: "Completed",
        completed: true,
      },
    });
    deleteReminder.mockResolvedValue({});

    render(<TodoList category="All" showCompleted={false} />);

    expect(await screen.findByText("Pay rent")).toBeInTheDocument();
    expect(fetchReminders).toHaveBeenCalledWith({
      category: "All",
      completed: false,
      limit: 50,
    });

    fireEvent.click(
      screen.getByRole("checkbox", { name: /mark pay rent as complete/i })
    );

    await waitFor(() => {
      expect(screen.queryByText("Pay rent")).not.toBeInTheDocument();
    });
    expect(screen.getByText("No reminders found")).toBeInTheDocument();
  });
});
