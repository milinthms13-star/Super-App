import {
  createEmptyDocuments,
  createLeadSubmissionKey,
  formatCurrency,
  getYearlyBreakdown,
  pickInstitutions,
  pickPayload,
} from "./financeHubUtils";

describe("financeHubUtils", () => {
  test("creates empty document buckets", () => {
    const docs = createEmptyDocuments();
    expect(Object.keys(docs)).toEqual(
      expect.arrayContaining(["aadhaar", "pan", "salarySlip", "bankStatement", "gstProof", "collateralDocuments"])
    );
  });

  test("formats INR currency and aggregates yearly breakdown", () => {
    expect(formatCurrency(1200)).toContain("1,200");

    const yearly = getYearlyBreakdown([
      { month: 1, interest: 100, principal: 200, prepayment: 0, emi: 300 },
      { month: 13, interest: 90, principal: 210, prepayment: 50, emi: 300 },
    ]);

    expect(yearly).toHaveLength(2);
    expect(yearly[0].year).toBe(1);
    expect(yearly[1].year).toBe(2);
  });

  test("picks payloads and creates lead submission key", () => {
    expect(pickInstitutions({ data: { institutions: [{ _id: "1" }] } })).toHaveLength(1);
    expect(pickPayload({ data: { ok: true } })).toEqual({ ok: true });
    expect(createLeadSubmissionKey().startsWith("fin-submit-")).toBe(true);
  });
});
