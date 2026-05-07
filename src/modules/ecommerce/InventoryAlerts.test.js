import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import InventoryAlerts from "./InventoryAlerts";

const mockUseApp = jest.fn();

jest.mock("../../contexts/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

describe("InventoryAlerts", () => {
  let apiCall;

  beforeEach(() => {
    const activeAlert = {
      alertId: "alert-1",
      productName: "USB Cable",
      productSku: "SKU-USB-1",
      alertType: "low_stock",
      currentStock: 3,
      threshold: 10,
      status: "active",
      triggeredAt: "2026-05-07T05:00:00.000Z",
      notifications: [],
      settings: {
        reorderQuantity: 20,
        leadTimeDays: 7,
        enabled: true,
      },
      suggestions: [],
    };

    const acknowledgedAlert = {
      ...activeAlert,
      notifications: [
        {
          sentAt: "2026-05-07T05:00:00.000Z",
          channel: "dashboard",
          status: "sent",
          acknowledgedAt: "2026-05-07T05:10:00.000Z",
          acknowledgedBy: "seller@example.com",
        },
      ],
    };

    apiCall = jest.fn((endpoint) => {
      if (endpoint.startsWith("/alerts/list?")) {
        return Promise.resolve({ success: true, data: [activeAlert] });
      }

      if (endpoint === "/alerts/dashboard/summary") {
        return Promise.resolve({
          success: true,
          summary: {
            totalAlerts: 1,
            activeAlerts: 1,
            outOfStockAlerts: 0,
            lowStockAlerts: 1,
            resolvedToday: 0,
            productsAffected: 1,
          },
        });
      }

      if (endpoint === "/alerts/alert-1/acknowledge") {
        return Promise.resolve({ success: true, data: acknowledgedAlert });
      }

      return Promise.reject(new Error(`Unexpected endpoint: ${endpoint}`));
    });

    mockUseApp.mockReturnValue({ apiCall });
  });

  test("loads the summary from the mounted dashboard route and reflects persisted acknowledgement", async () => {
    render(<InventoryAlerts />);

    await waitFor(() => {
      expect(screen.getByText("USB Cable")).toBeInTheDocument();
    });

    expect(apiCall).toHaveBeenCalledWith("/alerts/dashboard/summary", "GET");

    fireEvent.click(screen.getByText("USB Cable"));
    fireEvent.click(screen.getByRole("button", { name: /acknowledge/i }));

    await waitFor(() => {
      expect(apiCall).toHaveBeenCalledWith("/alerts/alert-1/acknowledge", "PATCH");
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /acknowledge/i })).not.toBeInTheDocument();
    });

    expect(screen.getAllByText("Acknowledged").length).toBeGreaterThan(0);
  });
});
