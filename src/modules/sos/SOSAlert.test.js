import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  Object.defineProperty(global.navigator, "getBattery", {
    configurable: true,
    value: jest.fn(() =>
      Promise.resolve({
        level: 0.52,
        charging: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })
    ),
  });

  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: async () => ({ locality: null }),
    })
  );
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
  expect(screen.getByLabelText(/^call$/i)).toBeInTheDocument();
});

test("shares a fresh live location snapshot when sending SOS", async () => {
  jest.useFakeTimers();

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

  expect(
    screen.getByText(/SOS countdown started\. Alert will send in 5 seconds unless you cancel\./i)
  ).toBeInTheDocument();

  expect(screen.getByText(/Sending SOS in 5s/i)).toBeInTheDocument();

  for (let second = 0; second < 6; second += 1) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });
  }

  let sendAlertCall;
  await waitFor(() => {
    sendAlertCall = mockApiCall.mock.calls.find(
      ([endpoint]) => endpoint === "/sos/send-alert"
    );
    expect(sendAlertCall).toBeTruthy();
  });

  expect(sendAlertCall[1]).toBe("POST");
  expect(sendAlertCall[2]).toEqual(
    expect.objectContaining({
      latitude: 9.9312,
      longitude: 76.2673,
      accuracy: 12,
      location: "9.93120, 76.26730 (12m accuracy)",
      mapsUrl: "https://www.google.com/maps?q=9.9312,76.2673",
      batteryStatus: {
        supported: true,
        level: 52,
        charging: false,
      },
    })
  );

  expect(
    await screen.findByText(/Emergency video call sent to 1 contact\./i)
  ).toBeInTheDocument();

  jest.useRealTimers();
});

test("lets the user cancel the countdown before SOS is dispatched", async () => {
  jest.useFakeTimers();

  mockApiCall.mockImplementation((endpoint) => {
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

    return Promise.resolve({ success: true, data: [] });
  });

  render(<SOSAlert />);

  const sendButton = await screen.findByRole("button", { name: /send sos alert/i });
  await waitFor(() => expect(sendButton).toBeEnabled());

  fireEvent.click(sendButton);
  fireEvent.click(screen.getByRole("button", { name: /cancel countdown/i }));

  await act(async () => {
    jest.advanceTimersByTime(5000);
  });

  expect(mockApiCall).not.toHaveBeenCalledWith(
    "/sos/send-alert",
    "POST",
    expect.anything()
  );
  expect(
    screen.getByText(/SOS countdown cancelled before dispatch\./i)
  ).toBeInTheDocument();

  jest.useRealTimers();
});
