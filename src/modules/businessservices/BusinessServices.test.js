import { __private__ } from "./BusinessServices";

describe("BusinessServices helpers", () => {
  test("parseINRToNumber converts currency-like text to number", () => {
    expect(__private__.parseINRToNumber("₹15,000")).toBe(15000);
    expect(__private__.parseINRToNumber("₹2,000/hour")).toBe(2000);
  });

  test("normalizeOrderStatus maps legacy statuses to supported timeline", () => {
    expect(__private__.normalizeOrderStatus("documents-pending")).toBe("submitted");
    expect(__private__.normalizeOrderStatus("assigned-to-expert")).toBe("under-review");
    expect(__private__.normalizeOrderStatus("work-in-progress")).toBe("processing");
    expect(__private__.normalizeOrderStatus("invoice-generated")).toBe("completed");
  });

  test("getMissingRequiredFields returns missing required labels", () => {
    const missing = __private__.getMissingRequiredFields({
      name: "",
      email: "demo@example.com",
      phone: "",
      businessName: "Acme",
      businessType: "",
    });

    expect(missing).toEqual(["full name", "phone number", "business type"]);
  });
});
