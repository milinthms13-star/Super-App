const randomToken = () => {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return Math.random().toString(36).slice(2, 14);
};

export const createEmptyDocuments = () => ({
  aadhaar: [],
  pan: [],
  salarySlip: [],
  bankStatement: [],
  gstProof: [],
  collateralDocuments: [],
});

export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export const getYearlyBreakdown = (schedule = []) => {
  const yearlyMap = {};
  schedule.forEach((row) => {
    const year = Math.ceil(Number(row.month || 0) / 12);
    if (!yearlyMap[year]) {
      yearlyMap[year] = { year, interest: 0, principal: 0, prepayment: 0, total: 0 };
    }
    yearlyMap[year].interest += Number(row.interest || 0);
    yearlyMap[year].principal += Number(row.principal || 0);
    yearlyMap[year].prepayment += Number(row.prepayment || 0);
    yearlyMap[year].total += Number(row.emi || 0) + Number(row.prepayment || 0);
  });
  return Object.values(yearlyMap);
};

export const pickInstitutions = (response) => response?.data?.institutions || response?.institutions || [];
export const pickPayload = (response) => response?.data || response || null;
export const createLeadSubmissionKey = () => `fin-submit-${Date.now()}-${randomToken()}`;
