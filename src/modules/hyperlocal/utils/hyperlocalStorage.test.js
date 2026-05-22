import { hyperlocalStorage } from "./hyperlocalStorage";

describe("hyperlocalStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("stores and reads plain string values", () => {
    hyperlocalStorage.setItem("hl-key", "value-1");
    expect(hyperlocalStorage.getItem("hl-key")).toBe("value-1");
  });

  test("removes existing values", () => {
    hyperlocalStorage.setItem("hl-key", "value-2");
    hyperlocalStorage.removeItem("hl-key");
    expect(hyperlocalStorage.getItem("hl-key")).toBeNull();
  });

  test("stores and reads json payloads", () => {
    const payload = { cartCount: 3, queue: ["a", "b"] };
    hyperlocalStorage.setJSON("hl-json", payload);
    expect(hyperlocalStorage.getJSON("hl-json", null)).toEqual(payload);
  });

  test("returns fallback for invalid json", () => {
    window.localStorage.setItem("hl-bad-json", "{broken");
    expect(hyperlocalStorage.getJSON("hl-bad-json", { safe: true })).toEqual({ safe: true });
  });
});
