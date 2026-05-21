// Finance form and consent validation utilities

export function getLeadFormErrors(form = {}) {
  const issues = [];
  const preferredTenureRaw = String(form.preferredTenureMonths ?? "").trim();
  const preferredInterestRaw = String(form.preferredInterestRate ?? "").trim();

  if (!/^[A-Za-z .'-]{2,80}$/.test(String(form.fullName || "").trim())) {
    issues.push("Enter a valid name using letters, spaces, dot, apostrophe or hyphen.");
  }

  if (!/^\d{10}$/.test(String(form.phone || "").trim())) {
    issues.push("Phone must be exactly 10 digits.");
  }

  if (Number(form.amount || 0) <= 0) {
    issues.push("Loan amount must be greater than zero.");
  }

  if (preferredTenureRaw !== "" && Number(preferredTenureRaw) <= 0) {
    issues.push("Tenure must be a positive number of months.");
  }

  const interest = Number(preferredInterestRaw || 0);
  if (preferredInterestRaw !== "" && (interest < 6 || interest > 36)) {
    issues.push("Preferred interest rate must be between 6% and 36%.");
  }

  if (!form.consentPrivacy || !form.consentKyc || !form.consentDisclaimer) {
    issues.push("All consent checkboxes must be accepted.");
  }

  return issues;
}

export function getEligibilityFormErrors(form = {}) {
  const issues = [];
  const fullName = String(form.fullName || "").trim();
  const phone = String(form.phone || "").trim();

  if (fullName && !/^[A-Za-z .'-]{2,80}$/.test(fullName)) {
    issues.push("Enter a valid name using letters, spaces, dot, apostrophe or hyphen.");
  }

  if (phone && !/^\d{10}$/.test(phone)) {
    issues.push("Phone must be exactly 10 digits.");
  }

  if (Number(form.monthlyIncome || 0) <= 0) {
    issues.push("Monthly income must be greater than zero.");
  }

  if (Number(form.requiredAmount || 0) <= 0) {
    issues.push("Requested loan amount must be greater than zero.");
  }

  if (Number(form.age || 0) < 18) {
    issues.push("Age must be 18 or above.");
  }

  if (Number(form.cibilScore || 0) < 300 || Number(form.cibilScore || 0) > 900) {
    issues.push("CIBIL score must be between 300 and 900.");
  }

  return issues;
}
