import { buildStableObjectKey } from "./stableKey";

describe("buildStableObjectKey", () => {
  test("returns same key for equivalent objects with different key order", () => {
    const first = {
      category: "Developers",
      filters: {
        budget: "medium",
        availability: "online-now",
      },
    };
    const second = {
      filters: {
        availability: "online-now",
        budget: "medium",
      },
      category: "Developers",
    };

    expect(buildStableObjectKey(first)).toBe(buildStableObjectKey(second));
  });

  test("preserves array order while normalizing object keys", () => {
    const a = { list: [{ b: 2, a: 1 }, { c: 3 }] };
    const b = { list: [{ a: 1, b: 2 }, { c: 3 }] };
    const c = { list: [{ c: 3 }, { a: 1, b: 2 }] };

    expect(buildStableObjectKey(a)).toBe(buildStableObjectKey(b));
    expect(buildStableObjectKey(a)).not.toBe(buildStableObjectKey(c));
  });
});
