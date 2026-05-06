import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import BulkOrders from "./BulkOrders";
import { API_BASE_URL } from "../../utils/api";

const mockUseApp = jest.fn();

jest.mock("axios");
jest.mock("../../contexts/AppContext", () => ({
  useApp: () => mockUseApp(),
}));
jest.mock("../../utils/auth", () => ({
  getStoredAuthToken: () => "test-token",
}));

describe("BulkOrders", () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({ data: { data: [] } });
    axios.post.mockResolvedValue({
      data: {
        data: {
          bulkOrderId: "bulk-1",
          companyName: "Acme Traders",
          status: "Pending",
          items: [{ productId: "product-1", productName: "USB-C Cable", quantity: 75, unitPrice: 199 }],
          totalAmount: 14178.75,
          discountPercentage: 5,
          createdAt: "2026-05-07T00:00:00.000Z",
        },
      },
    });
    window.alert = jest.fn();

    mockUseApp.mockReturnValue({
      currentUser: { email: "buyer@example.com", name: "Buyer" },
      mockData: {
        ecommerceProducts: [
          {
            id: "product-1",
            name: "USB-C Cable",
            price: 199,
            sellerEmail: "seller@example.com",
            sellerName: "Seller",
            businessName: "Cable Store",
            category: "Electronics",
          },
        ],
      },
    });
  });

  test("creates a bulk order with selectable items and the mounted backend route", async () => {
    render(<BulkOrders />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        `${API_BASE_URL}/bulkorders/customer/${encodeURIComponent("buyer@example.com")}`,
        expect.any(Object)
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /create bulk order/i }));
    fireEvent.change(screen.getByLabelText(/select product/i), {
      target: { value: "product-1" },
    });
    fireEvent.change(screen.getByLabelText(/bulk quantity/i), {
      target: { value: "75" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add item/i }));
    fireEvent.change(screen.getByLabelText(/company name/i), {
      target: { value: "Acme Traders" },
    });
    fireEvent.click(screen.getByRole("button", { name: /request quote/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        `${API_BASE_URL}/bulkorders/create`,
        expect.objectContaining({
          companyName: "Acme Traders",
          items: [
            expect.objectContaining({
              productId: "product-1",
              productName: "USB-C Cable",
              quantity: 75,
              unitPrice: 199,
            }),
          ],
        }),
        expect.any(Object)
      );
    });
  });
});
