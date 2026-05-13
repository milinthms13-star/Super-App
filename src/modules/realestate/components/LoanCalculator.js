import React from "react";
import { HOME_LOAN_PARTNERS } from "../realEstateConstants";

const LoanCalculator = ({
  loanAmount,
  setLoanAmount,
  loanTenure,
  setLoanTenure,
  loanInterest,
  setLoanInterest,
  loanEligibility,
  setLoanEligibility,
  bankComparison,
  loanEstimateResult,
  onEstimate,
  onApply,
  loading,
}) => (
  <section className="realestate-loan-card">
    <div className="realestate-section-heading">
      <h3>Home loan calculator</h3>
      <p>EMI, eligibility, bank comparison, and one-click loan enquiry.</p>
    </div>
    <label className="realestate-field">
      <span>Loan amount (Lakhs)</span>
      <input type="number" value={loanAmount} onChange={(event) => setLoanAmount(event.target.value)} />
    </label>
    <label className="realestate-field">
      <span>Tenure (years)</span>
      <select value={loanTenure} onChange={(event) => setLoanTenure(event.target.value)}>
        {Array.from({ length: 25 }, (_, index) => String(index + 5)).map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
    <label className="realestate-field">
      <span>Interest rate (%)</span>
      <input type="number" step="0.1" value={loanInterest} onChange={(event) => setLoanInterest(event.target.value)} />
    </label>
    <label className="realestate-field">
      <span>Monthly income (INR)</span>
      <input
        type="number"
        value={loanEligibility.monthlyIncome}
        onChange={(event) => setLoanEligibility((state) => ({ ...state, monthlyIncome: event.target.value }))}
      />
    </label>
    <label className="realestate-field">
      <span>Existing EMI (INR)</span>
      <input
        type="number"
        value={loanEligibility.existingEmi}
        onChange={(event) => setLoanEligibility((state) => ({ ...state, existingEmi: event.target.value }))}
      />
    </label>
    <button type="button" className="realestate-primary-button" onClick={onEstimate} disabled={loading}>
      Estimate EMI & eligibility
    </button>
    {loanEstimateResult ? <p className="realestate-pitch">{loanEstimateResult}</p> : null}
    <div className="realestate-plan-list">
      {bankComparison.map((partner) => (
        <div key={partner.name}>
          <strong>{partner.name}</strong>
          <span>{partner.rate}% p.a. | Processing fee {partner.processingFee}%</span>
        </div>
      ))}
    </div>
    <div className="realestate-inline-actions">
      {HOME_LOAN_PARTNERS.map((partner) => (
        <button
          key={partner.name}
          type="button"
          className="realestate-inline-button"
          onClick={() => onApply(partner.name)}
          disabled={loading}
        >
          Apply with {partner.name}
        </button>
      ))}
    </div>
  </section>
);

export default LoanCalculator;

