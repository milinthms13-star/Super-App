import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SOSAlert from "./SOSAlert";

const mockApiCall = jest.fn();

jest.mock("../../contexts/AppContext", () => ({
  useApp: () => ({
    currentUser: {
      _id: "user-1",
      name: "Safety User",
      email: "safety@example.com",
    },
    apiCall: mockApiCall,
  }),
}));

beforeAll(() => {
  window.scrollTo = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();

  mockApiCall.mockImplementation((endpoint) => {
    if (endpoint === "/sos/contacts") {
      return Promise.resolve({ success: true, data: [] });
    }

    if (endpoint === "/sos/history?limit=10") {
      return Promise.resolve({ success: true, data: [] });
    }

    return Promise.resolve({ success: true, data: [] });
  });

  const mockPosition = {
    coords: {
      accuracy: 12,
      latitude: 9.9312,
      longitude: 76.2673,
    },
  };

  Object.defineProperty(global.navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: jest.fn((success) => success(mockPosition)),
      watchPosition: jest.fn(() => 1),
      clearWatch: jest.fn(),
    },
  });
});

test("keeps SOS contacts independent from LinkUp contacts", async () => {
  render(<SOSAlert />);

  expect(await screen.findByRole("heading", { level: 1, name: /sos safety center/i })).toBeInTheDocument();

  await waitFor(() => {
    expect(
      screen.getByText(/SOS trusted contacts are managed here independently\./i)
    ).toBeInTheDocument();
  });

  expect(screen.queryByText(/registered app contact/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/push/i)).not.toBeInTheDocument();
  expect(screen.getByLabelText(/sms/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/whatsapp/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/call/i)).toBeInTheDocument();
});

test("shares a fresh live location snapshot when sending SOS", async () => {
  mockApiCall.mockImplementation((endpoint, method) => {
    if (endpoint === "/sos/contacts" && method === "GET") {
      return Promise.resolve({
        success: true,
        data: [
          {
            _id: "contact-1",
            name: "Primary Contact",
            relation: "Friend",
            phone: "+919999999999",
            priority: "Primary",
            notifyBy: ["SMS", "Call"],
          },
        ],
      });
    }

    if (endpoint === "/sos/contacts") {
      return Promise.resolve({
        success: true,
        data: [
          {
            _id: "contact-1",
            name: "Primary Contact",
            relation: "Friend",
            phone: "+919999999999",
            priority: "Primary",
            notifyBy: ["SMS", "Call"],
          },
        ],
      });
    }

    if (endpoint === "/sos/history?limit=10") {
      return Promise.resolve({ success: true, data: [] });
    }

    if (endpoint === "/sos/send-alert") {
      return Promise.resolve({
        success: true,
        data: {
          incidentId: "incident-1",
          videoRecipientCount: 1,
          recipients: [{ id: "contact-1", name: "Primary Contact", videoCallStatus: "ringing" }],
        },
      });
    }

    return Promise.resolve({ success: true, data: [] });
  });

  render(<SOSAlert />);

  const sendButton = await screen.findByRole("button", { name: /send sos alert/i });
  await waitFor(() => expect(sendButton).toBeEnabled());

  fireEvent.click(sendButton);

  await waitFor(() => {
    expect(mockApiCall).toHaveBeenCalledWith(
      "/sos/send-alert",
      "POST",
      expect.objectContaining({
        latitude: 9.9312,
        longitude: 76.2673,
        accuracy: 12,
        location: "9.93120, 76.26730 (12m accuracy)",
        mapsUrl: "https://www.google.com/maps?q=9.9312,76.2673",
      })
    );
  });

  expect(
    await screen.findByText(/Emergency video call sent to 1 contact\./i)
  ).toBeInTheDocument();
});
