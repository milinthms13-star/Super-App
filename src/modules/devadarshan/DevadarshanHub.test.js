import { __private__ } from "./DevadarshanHub";

describe("DevadarshanHub helpers", () => {
  test("formatINR formats amount in INR locale", () => {
    expect(__private__.formatINR(1500)).toBe("INR 1,500");
    expect(__private__.formatINR("25000")).toBe("INR 25,000");
  });

  test("generateId returns prefixed identifier", () => {
    const generated = __private__.generateId("BK");
    expect(generated.startsWith("BK-")).toBe(true);
    expect(generated.split("-").length).toBeGreaterThanOrEqual(3);
  });

  test("donation categories include expected options", () => {
    expect(__private__.DONATION_CATEGORIES).toContain("Annadanam");
    expect(__private__.DONATION_CATEGORIES).toContain("Temple Maintenance");
  });
});

