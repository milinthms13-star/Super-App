import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import Education from "./Education";

jest.mock("../../contexts/AppContext", () => ({
  useApp: () => ({
    currentUser: {
      id: "test-user-1",
      email: "student@example.com",
      name: "Student",
    },
  }),
}));

describe("Education module", () => {
  const clickNavItem = (label) => {
    const navButton = screen.getByText(label).closest("button");
    expect(navButton).not.toBeNull();
    fireEvent.click(navButton);
  };

  beforeEach(() => {
    localStorage.clear();
  });

  test("filters course cards by search query", () => {
    render(<Education />);

    clickNavItem("Courses");

    const searchInput = screen.getByLabelText(/search courses/i);
    fireEvent.change(searchInput, { target: { value: "digital" } });

    expect(screen.getByText("Digital Marketing")).toBeInTheDocument();
    expect(screen.queryByText("Spoken English")).not.toBeInTheDocument();
  });

  test("enrolls course and shows it in my learning", () => {
    render(<Education />);

    clickNavItem("Courses");
    fireEvent.click(screen.getAllByRole("button", { name: /^enroll now$/i })[0]);

    clickNavItem("My Learning");

    expect(screen.getByText("Spoken English")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue learning/i })).toBeInTheDocument();
  });

  test("marks scholarship as applied", () => {
    render(<Education />);

    clickNavItem("Government");
    fireEvent.click(screen.getAllByRole("button", { name: /^apply now$/i })[0]);

    expect(screen.getByRole("button", { name: /^applied$/i })).toBeInTheDocument();
  });
});
