import React from "react";
import { render, waitFor } from "@testing-library/react";
import GiftCards from "./GiftCards";
import { API_BASE_URL } from "../../utils/api";

jest.mock("../../utils/auth", () => ({
  getStoredAuthToken: () => "test-token",
}));

describe("GiftCards", () => {
  beforeEach(() => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });
  });

  test("loads sent and received cards from the mounted backend endpoints", async () => {
    render(<GiftCards userEmail="buyer@example.com" userName="Buyer" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/giftcards/sent`,
        expect.any(Object)
      );
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/giftcards/received`,
      expect.any(Object)
    );
  });
});
