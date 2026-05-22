jest.mock("../../utils/api", () => ({
  BACKEND_BASE_URL: "https://example.test",
}));

jest.mock("../../utils/auth", () => ({
  getStoredAuthToken: jest.fn(),
}));

import { getStoredAuthToken } from "../../utils/auth";
import { hyperlocalApi } from "./hyperlocalApi";

describe("hyperlocalApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    getStoredAuthToken.mockReturnValue("token-123");
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  test("getShops sends query params and auth header", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { shops: [] } }),
    });

    await hyperlocalApi.getShops({ category: "Grocery", page: 2, limit: 20 });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain("https://example.test/api/hyperlocal/shops");
    expect(url).toContain("category=Grocery");
    expect(url).toContain("page=2");
    expect(options.method).toBe("GET");
    expect(options.headers.Authorization).toBe("Bearer token-123");
  });

  test("placeOrder forwards idempotency header with form data", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { orderId: "HL-1" } }),
    });
    const formData = new FormData();
    formData.append("foo", "bar");

    await hyperlocalApi.placeOrder(formData, { idempotencyKey: "idem-1" });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, options] = fetch.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.headers["x-idempotency-key"]).toBe("idem-1");
    expect(options.body).toBe(formData);
  });

  test("retries GET once on transient network failure", async () => {
    fetch
      .mockRejectedValueOnce(new Error("temporary network issue"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { shops: [] } }),
      });

    const response = await hyperlocalApi.getShops();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(response.success).toBe(true);
  });

  test("surfaces server-side error messages", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ success: false, message: "Invalid coupon code." }),
    });

    await expect(hyperlocalApi.getQuote({})).rejects.toMatchObject({
      message: "Invalid coupon code.",
    });
  });

  test("returns offline-friendly message when network is unavailable", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    fetch.mockRejectedValue(new Error("network down"));

    await expect(hyperlocalApi.getShops()).rejects.toMatchObject({
      message: "You are offline. Please reconnect and retry.",
    });
  });
});
