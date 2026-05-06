import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReferralProgram from "./ReferralProgram";
import { API_BASE_URL } from "../../utils/api";

jest.mock("../../utils/auth", () => ({
  getStoredAuthToken: () => "test-token",
}));

describe("ReferralProgram", () => {
  beforeEach(() => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            referralCode: "REFCODE1",
            tier: "Bronze",
            status: "Active",
            rewardType: "Wallet Credits",
            rewardAmount: 100,
            tierBenefits: { rewardPercentage: 5 },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            totalReferrals: 0,
            successfulReferrals: 0,
            conversionRate: "0.00",
            totalRewardsEarned: 0,
            referredUsers: [],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            referralCode: "REFCODE1",
            tier: "Bronze",
            status: "Paused",
            rewardType: "Wallet Credits",
            rewardAmount: 100,
            tierBenefits: { rewardPercentage: 5 },
          },
        }),
      });
  });

  test("loads and toggles referral data through the mounted backend endpoints", async () => {
    render(<ReferralProgram userEmail="buyer@example.com" userName="Buyer" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/referralprogram/my-referral`,
        expect.any(Object)
      );
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/referralprogram/statistics`,
      expect.any(Object)
    );

    await screen.findByDisplayValue("REFCODE1");

    fireEvent.click(screen.getByRole("button", { name: /pause program/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/referralprogram/toggle-status`,
        expect.objectContaining({
          method: "PUT",
        })
      );
    });
  });
});
