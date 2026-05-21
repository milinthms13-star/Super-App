import { getEligibilityFormErrors, getLeadFormErrors } from "./financeValidation";

describe("financeValidation", () => {
  test("accepts valid lead form names with punctuation", () => {
    const errors = getLeadFormErrors({
      fullName: "Asha D'Souza",
      phone: "9999999999",
      amount: 250000,
      preferredTenureMonths: 36,
      preferredInterestRate: 11.5,
      consentPrivacy: true,
      consentKyc: true,
      consentDisclaimer: true,
    });

    expect(errors).toHaveLength(0);
  });

  test("flags invalid consent and phone", () => {
    const errors = getLeadFormErrors({
      fullName: "Asha",
      phone: "99999",
      amount: 100000,
      consentPrivacy: false,
      consentKyc: true,
      consentDisclaimer: false,
    });

    expect(errors.join(" ")).toContain("Phone must be exactly 10 digits.");
    expect(errors.join(" ")).toContain("All consent checkboxes must be accepted.");
  });

  test("returns eligibility errors for out-of-range CIBIL", () => {
    const errors = getEligibilityFormErrors({
      fullName: "User Name",
      phone: "9999999999",
      monthlyIncome: 40000,
      requiredAmount: 300000,
      age: 25,
      cibilScore: 250,
    });

    expect(errors.join(" ")).toContain("CIBIL score must be between 300 and 900.");
  });
});
