import React from "react";

const EligibilityTab = ({ form, onChange, onSubmit, state, categories, districts, formatCurrency }) => (
  <section className="finance-section">
    <div className="finance-section-header">
      <h2>Enhanced Eligibility Checker</h2>
      <p>Age, EMI burden, expenses, CIBIL, stability, collateral and GST/ITR aware scoring.</p>
    </div>
    <form className="finance-form" onSubmit={onSubmit}>
      <label>
        Name
        <input type="text" value={form.fullName} onChange={e => onChange(c => ({ ...c, fullName: e.target.value }))} />
      </label>
      <label>
        Phone
        <input type="tel" value={form.phone} onChange={e => onChange(c => ({ ...c, phone: e.target.value }))} />
      </label>
      <label>
        Loan Category
        <select value={form.loanCategory} onChange={e => onChange(c => ({ ...c, loanCategory: e.target.value }))}>
          {categories.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>
      <label>
        District
        <select value={form.district} onChange={e => onChange(c => ({ ...c, district: e.target.value }))}>
          {districts.map(district => <option key={district} value={district}>{district}</option>)}
        </select>
      </label>
      <label>
        Age
        <input type="number" value={form.age} onChange={e => onChange(c => ({ ...c, age: e.target.value }))} />
      </label>
      <label>
        Monthly Income (INR)
        <input type="number" value={form.monthlyIncome} onChange={e => onChange(c => ({ ...c, monthlyIncome: e.target.value }))} />
      </label>
      <label>
        Required Amount (INR)
        <input type="number" value={form.requiredAmount} onChange={e => onChange(c => ({ ...c, requiredAmount: e.target.value }))} />
      </label>
      <label>
        Existing EMI (INR)
        <input type="number" value={form.existingEmi} onChange={e => onChange(c => ({ ...c, existingEmi: e.target.value }))} />
      </label>
      <label>
        Monthly Expenses (INR)
        <input type="number" value={form.monthlyExpenses} onChange={e => onChange(c => ({ ...c, monthlyExpenses: e.target.value }))} />
      </label>
      <label>
        Employment Type
        <select value={form.employmentType} onChange={e => onChange(c => ({ ...c, employmentType: e.target.value }))}>
          <option value="salaried">Salaried</option>
          <option value="self-employed">Self-employed</option>
          <option value="business-owner">Business Owner</option>
          <option value="freelancer">Freelancer</option>
        </select>
      </label>
      <label>
        Employment Stability (months)
        <input type="number" value={form.employmentStabilityMonths} onChange={e => onChange(c => ({ ...c, employmentStabilityMonths: e.target.value }))} />
      </label>
      <label>
        CIBIL Score
        <input type="number" value={form.cibilScore} onChange={e => onChange(c => ({ ...c, cibilScore: e.target.value }))} />
      </label>
      <label>
        Business Vintage (months)
        <input type="number" value={form.businessVintageMonths} onChange={e => onChange(c => ({ ...c, businessVintageMonths: e.target.value }))} />
      </label>
      <label className="finance-consent">
        <input type="checkbox" checked={form.collateralAvailable} onChange={e => onChange(c => ({ ...c, collateralAvailable: e.target.checked }))} />
        Collateral Available
      </label>
      <label className="finance-consent">
        <input type="checkbox" checked={form.hasGstItr} onChange={e => onChange(c => ({ ...c, hasGstItr: e.target.checked }))} />
        GST / ITR Available
      </label>
      <button type="submit" disabled={state.loading}>{state.loading ? "Checking..." : "Check Eligibility"}</button>
    </form>
    {state.error ? <p className="finance-error">{state.error}</p> : null}
    {state.result?.result ? (
      <div className="finance-result">
        <p><strong>Approval Probability:</strong> {state.result.result.approvalProbability}% ({state.result.result.probabilityLabel})</p>
        <p><strong>Score:</strong> {state.result.result.score}/100</p>
        <p><strong>FOIR:</strong> {state.result.result.foir}%</p>
        <p><strong>Estimated New EMI:</strong> {formatCurrency(state.result.result.estimatedNewEmi)}</p>
        <p><strong>Best Matching Products:</strong> {(state.result.result.bestMatchingLoanProducts || []).join(", ")}</p>
        <p><strong>Improvement Guide:</strong> {(state.result.result.improvementTips || []).join(" | ")}</p>
        <p><strong>Potential Rejection Reasons:</strong> {(state.result.result.rejectionReasons || []).join(" | ") || "None"}</p>
        <p><strong>Matching Institutions:</strong> {(state.result.matchingInstitutions || []).map(item => item.name).join(", ")}</p>
      </div>
    ) : null}
  </section>
);

export default EligibilityTab;
