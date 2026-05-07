import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import DiaryEditor from "./DiaryEditor";

jest.mock("react-quill", () => {
  const React = require("react");

  return function MockReactQuill({ value, onChange, placeholder, className }) {
    return React.createElement("textarea", {
      "aria-label": "Diary content editor",
      value,
      onChange: (event) => onChange(event.target.value),
      placeholder,
      className,
    });
  };
});

describe("DiaryEditor", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("validates required fields before saving an entry", () => {
    const onSave = jest.fn();

    render(
      <DiaryEditor
        onSave={onSave}
        onClose={jest.fn()}
        submitting={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /save entry/i }));

    expect(screen.getByText("Title is required")).toBeInTheDocument();
    expect(screen.getByText("Content is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
