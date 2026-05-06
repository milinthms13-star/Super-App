import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import WishlistShare from "./WishlistShare";
import { API_BASE_URL, buildApiUrl } from "../../utils/api";

const mockUseApp = jest.fn();

jest.mock("axios");
jest.mock("../../contexts/AppContext", () => ({
  useApp: () => mockUseApp(),
}));
jest.mock("../../utils/auth", () => ({
  getStoredAuthToken: () => "test-token",
}));

describe("WishlistShare", () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({ data: { data: [] } });
    axios.post.mockResolvedValue({
      data: {
        data: {
          shareId: "share-1",
          sharedWith: [{ email: "friend@example.com", name: "" }],
          wishlistItems: [{ productId: "fav-1", productName: "Saved Lamp" }],
          message: "For your birthday",
          isPublic: false,
        },
      },
    });
    window.alert = jest.fn();

    mockUseApp.mockReturnValue({
      currentUser: { email: "buyer@example.com", name: "Buyer" },
      favorites: [
        {
          id: "fav-1",
          name: "Saved Lamp",
          price: 799,
          image: "/lamp.jpg",
          category: "Home Decor",
        },
      ],
    });
  });

  test("shares selected favorites through the mounted backend route", async () => {
    render(<WishlistShare />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        `${API_BASE_URL}/wishlistshare/user/list`,
        expect.any(Object)
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /create new share/i }));
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.change(screen.getByLabelText(/share with/i), {
      target: { value: "friend@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "For your birthday" },
    });
    fireEvent.click(screen.getByRole("button", { name: /share wishlist/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        `${API_BASE_URL}/wishlistshare/create`,
        expect.objectContaining({
          wishlistItems: [
            expect.objectContaining({
              productId: "fav-1",
              productName: "Saved Lamp",
            }),
          ],
          sharedWith: [{ email: "friend@example.com", name: "" }],
          message: "For your birthday",
          expiresAt: null,
        }),
        expect.any(Object)
      );
    });

    expect(screen.getByText(`Share Link: ${buildApiUrl("/wishlistshare/share-1")}`)).toBeInTheDocument();
  });
});
