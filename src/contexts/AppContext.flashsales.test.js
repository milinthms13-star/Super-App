import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { AppProvider, useApp } from "./AppContext";

jest.mock("axios");

const ContextProbe = () => {
  const { reserveFlashSaleItems, cart } = useApp();

  return (
    <div>
      <div data-testid="cart-count">{cart.length}</div>

      <button
        type="button"
        onClick={() =>
          reserveFlashSaleItems([
            {
              id: "p1",
              name: "Item 1",
              price: 999,
              flashSaleId: "sale-1",
              quantity: 1,
            },
            {
              id: "p2",
              name: "Item 2",
              price: 888,
              flashSale: { saleId: "sale-1" },
              quantity: 2,
            },
          ])
        }
      >
        Reserve
      </button>
    </div>
  );
};

describe("AppContext flash sale reservation", () => {
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
        return Promise.resolve({ data: { success: true, products: [], pagination: {} } });
      }
      if (url.includes("/orders")) {
        return Promise.resolve({ data: { success: true, orders: [], pagination: {}, stats: {} } });
      }
      if (url.includes("/flashsales")) {
        // Used by Ecommerce.js polling; safe default for refreshProducts.
        return Promise.resolve({ data: { data: [] } });
      }

      return Promise.resolve({ data: { success: true } });
    });

    axios.post.mockImplementation((url) => {
      if (url.includes("/flashsales/reserve/bulk")) {
        return Promise.resolve({
          data: {
            data: [
              {
                saleId: "sale-1",
                productId: "p1",
                salePrice: 100,
                reservation: {
                  reservationId: "res-1",
                  expiresAt: "2099-04-18T10:00:00.000Z",
                },
              },
              {
                saleId: "sale-1",
                productId: "p2",
                salePrice: 200,
                reservation: {
                  reservationId: "res-2",
                  expiresAt: "2099-04-19T10:00:00.000Z",
                },
              },
            ],
          },
        });
      }

      // Fallback for unrelated axios.post calls (placeOrder etc.)
      return Promise.resolve({ data: { success: true, order: { id: "order-1" } } });
    });
  });

  test("calls flashsales reserve/bulk and supports reservation mapping fields", async () => {
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
        <ContextProbe />
      </AppProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /reserve/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/flashsales/reserve/bulk"),
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ productId: "p1", flashSaleId: "sale-1", quantity: 1 }),
            expect.objectContaining({ productId: "p2", flashSaleId: "sale-1", quantity: 2 }),
          ]),
        }),
        expect.any(Object)
      );
    });
  });
});
