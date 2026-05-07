import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { AppProvider, useApp } from "./AppContext";

jest.mock("axios");

const ContextProbe = () => {
  const { currentUser, addToCart, cart, updateCartQuantity, removeFromCart } = useApp();
  return (
    <div>
      <div data-testid="role">{currentUser?.registrationType || ""}:{currentUser?.role || ""}</div>
      <div data-testid="cart-count">{cart.length}</div>
      <div data-testid="cart-items">
        {cart.map((i) => (
          <div key={i.id} data-testid={`cart-item-${i.id}`}>
            {i.name}:{i.quantity}:{i.price}:{i.id}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          addToCart({
            id: "p1::batch::b1",
            name: "Banana Chips",
            price: 100,
            mrp: 150,
            stock: 2,
          })
        }
      >
        Add
      </button>

      <button type="button" onClick={() => updateCartQuantity("p1::batch::b1", 10)}>
        UpdateQty10
      </button>

      <button type="button" onClick={() => updateCartQuantity("p1::batch::b1", 0)}>
        UpdateQty0
      </button>

      <button type="button" onClick={() => removeFromCart("p1::batch::b1")}>
        Remove
      </button>
    </div>
  );
};

describe("AppContext ecommerce cart mutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    axios.get.mockImplementation((url) => {
      if (url.includes("/app-data/public")) {
        return Promise.resolve({
          data: {
            success: true,
            data: { moduleData: { ecommerceProducts: [] } },
          },
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
          data: {
            success: true,
            products: [],
            pagination: {},
          },
        });
      }

      // orders endpoints called during refreshProducts in AppProvider
      if (url.includes("/orders")) {
        return Promise.resolve({
          data: { success: true, orders: [], pagination: {}, stats: {} },
        });
      }

      return Promise.resolve({ data: { success: true } });
    });

    axios.post.mockResolvedValue({
      data: { success: true, order: { id: "order-1" } },
    });
  });

  test("caps cart quantity by available stock", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(screen.getByTestId("cart-count")).toHaveTextContent("1");
    });

    fireEvent.click(screen.getByRole("button", { name: "UpdateQty10" }));

    await waitFor(() => {
      expect(screen.getByTestId("cart-item-p1::batch::b1")).toHaveTextContent(":2:");
    });
  });

  test("removing by setting quantity to 0 removes the cart item", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(screen.getByTestId("cart-count")).toHaveTextContent("1");
    });

    fireEvent.click(screen.getByRole("button", { name: "UpdateQty0" }));

    await waitFor(() => {
      expect(screen.getByTestId("cart-count")).toHaveTextContent("0");
    });
  });

  test("seller account cannot add/update cart quantities", async () => {
    render(
      <AppProvider
        loggedInUser={{
          id: 20,
          name: "Seller",
          email: "seller@example.com",
          role: "business",
          registrationType: "entrepreneur",
        }}
      >
        <ContextProbe />
      </AppProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("button", { name: "UpdateQty10" }));
    fireEvent.click(screen.getByRole("button", { name: "UpdateQty0" }));

    await waitFor(() => {
      expect(screen.getByTestId("cart-count")).toHaveTextContent("0");
    });
  });
});
