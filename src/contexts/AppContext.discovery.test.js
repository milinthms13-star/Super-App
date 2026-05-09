import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { AppProvider, useApp } from "./AppContext";

jest.mock("axios");

const DiscoveryProbe = () => {
  const {
    ecommerceRecentlyViewed,
    ecommerceSavedSearches,
    ecommerceSearchHistory,
    ecommerceRefillReminders,
    trackRecentlyViewedProduct,
    saveEcommerceSearch,
    recordEcommerceSearch,
    scheduleEcommerceRefillReminder,
  } = useApp();

  return (
    <div>
      <div data-testid="recent-count">{ecommerceRecentlyViewed.length}</div>
      <div data-testid="saved-search-count">{ecommerceSavedSearches.length}</div>
      <div data-testid="search-history-count">{ecommerceSearchHistory.length}</div>
      <div data-testid="reminder-count">{ecommerceRefillReminders.length}</div>
      <button
        type="button"
        onClick={() =>
          trackRecentlyViewedProduct({
            id: "prod-1",
            name: "Banana Chips",
            category: "Snacks",
            price: 149,
          })
        }
      >
        Track View
      </button>
      <button
        type="button"
        onClick={() =>
          saveEcommerceSearch({
            label: "Weekly snacks",
            query: "banana chips",
            filters: { category: "Snacks" },
          })
        }
      >
        Save Search
      </button>
      <button type="button" onClick={() => recordEcommerceSearch("banana chips")}>
        Record Search
      </button>
      <button
        type="button"
        onClick={() =>
          scheduleEcommerceRefillReminder({
            id: "prod-1",
            name: "Banana Chips",
            category: "Snacks",
          })
        }
      >
        Schedule Reminder
      </button>
    </div>
  );
};

describe("AppContext ecommerce discovery state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    axios.get.mockImplementation((url) => {
      if (url.includes("/app-data/public")) {
        return Promise.resolve({
          data: { success: true, data: { moduleData: { ecommerceProducts: [] } } },
        });
      }

      if (url.includes("/products/manage")) {
        return Promise.resolve({
          data: {
            success: true,
            products: [],
            pagination: {},
            counts: { total: 0, pending: 0, approved: 0, rejected: 0, active: 0, disabled: 0 },
          },
        });
      }

      if (url.includes("/products")) {
        return Promise.resolve({
          data: { success: true, products: [], pagination: {} },
        });
      }

      if (url.includes("/orders")) {
        return Promise.resolve({
          data: { success: true, orders: [], pagination: {}, stats: {} },
        });
      }

      return Promise.resolve({ data: { success: true } });
    });

    axios.patch.mockResolvedValue({ data: { success: true, user: {} } });
  });

  test("tracks discovery shortcuts and refill reminders", async () => {
    render(
      <AppProvider
        loggedInUser={{
          id: 10,
          name: "Buyer",
          email: "buyer@example.com",
          role: "user",
          registrationType: "user",
        }}
      >
        <DiscoveryProbe />
      </AppProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Track View" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Search" }));
    fireEvent.click(screen.getByRole("button", { name: "Record Search" }));
    fireEvent.click(screen.getByRole("button", { name: "Schedule Reminder" }));

    await waitFor(() => {
      expect(screen.getByTestId("recent-count")).toHaveTextContent("1");
      expect(screen.getByTestId("saved-search-count")).toHaveTextContent("1");
      expect(screen.getByTestId("search-history-count")).toHaveTextContent("1");
      expect(screen.getByTestId("reminder-count")).toHaveTextContent("1");
    });
  });
});
