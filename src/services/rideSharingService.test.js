import axios from "axios";
import rideSharingService from "./rideSharingService";

jest.mock("axios");

describe("rideSharingService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("uses the ridesharing accessToken for authenticated booking requests", async () => {
    localStorage.setItem("accessToken", "access-token-123");
    axios.post.mockResolvedValueOnce({
      data: {
        data: {
          id: "ride-1",
        },
      },
    });

    await rideSharingService.bookRide("Infopark", "Marine Drive", "Auto");

    expect(axios.post).toHaveBeenCalledWith(
      "/api/ridesharing/rides",
      expect.objectContaining({
        rideType: "Auto",
        pickup: expect.objectContaining({ address: "Infopark" }),
        dropoff: expect.objectContaining({ address: "Marine Drive" }),
      }),
      {
        headers: {
          Authorization: "Bearer access-token-123",
        },
      }
    );
  });

  test("falls back to the legacy token key when accessToken is absent", async () => {
    localStorage.setItem("token", "legacy-token-456");
    axios.post.mockResolvedValueOnce({
      data: {
        data: {
          id: "ride-2",
        },
      },
    });

    await rideSharingService.completeRide("ride-2");

    expect(axios.post).toHaveBeenCalledWith(
      "/api/ridesharing/rides/ride-2/complete",
      {},
      {
        headers: {
          Authorization: "Bearer legacy-token-456",
        },
      }
    );
  });
});
