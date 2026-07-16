import React, { useMemo, useState } from "react";
import { HOME_LOAN_PARTNERS, RBI_RATE_INFO, STAMP_DUTY_RATES } from "../realEstateConstants";
import { calculateEMI } from "../realEstateUtils";

/**
 * LoanCalculator — Professional upgrade
 * - RBI repo rate reference (free, static)
 * - Stamp duty & registration cost by state
 * - Total cost of acquisition breakdown
 * - Affordability score (FOIR-based)
 * - Amortization summary
 */

const CITY_STATE_MAP = {
  Kochi: "Kerala", Trivandrum: "Kerala", Kozhikode: "Kerala", Thrissur: "Kerala",
  Bangalore: "Karnataka", Mysore: "Karnataka",
  Hyderabad: "Telangana",
  Chennai: "Tamil Nadu", Coimbatore: "Tamil Nadu",
  Mumbai: "Maharashtra", Pune: "Maharashtra",
  Ahmedabad: "Gujarat",
  Jaipur: "Rajasthan",
  Kolkata: "West Bengal",
  Lucknow: "Uttar Pradesh",
  Delhi: "Delhi NCR", Gurgaon: "Delhi NCR", Noida: "Delhi NCR",
};

const formatInr = (amount) => {
  if (!amount) return "—";
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
};

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
  propertyLocation,
  propertyPriceValue,
  isUnderConstruction,
}) => {
  const [activeTab, setActiveTab] = useState("emi"); // emi | breakdown | affordability

  // Detect state from property city for stamp duty
  const detectedState = useMemo(() => {
    if (!propertyLocation) return null;
    return CITY_STATE_MAP[propertyLocation] || null;
  }, [propertyLocation]);

  const stampDutyInfo = detectedState ? STAMP_DUTY_RATES[detectedState] : null;

  // Cost of acquisition breakdown
  const acquisitionBreakdown = useMemo(() => {
    const base = Number(propertyPriceValue || 0) * 100000;
    if (!base || !stampDutyInfo) return null;
    const stamp = (base * stampDutyInfo.stampDuty) / 100;
    const reg = (base * stampDutyInfo.registration) / 100;
    const gst = isUnderConstruction ? (base * 5) / 100 : 0;
    const total = base + stamp + reg + gst;
    return { base, stamp, reg, gst, total, stampPct: stampDutyInfo.stampDuty, regPct: stampDutyInfo.registration };
  }, [propertyPriceValue, stampDutyInfo, isUnderConstruction]);

  // EMI calculation
  const emiValue = useMemo(() => {
    const principal = Number(loanAmount);
    const rate = Number(loanInterest);
    const tenure = Number(loanTenure);
    if (!principal || !rate || !tenure) return 0;
    return calculateEMI(principal, rate, tenure);
  }, [loanAmount, loanInterest, loanTenure]);

  const totalPayment = emiValue * Number(loanTenure) * 12;
  const totalInterest = totalPayment - Number(loanAmount) * 100000;

  // Affordability score (FOIR — Fixed Obligation to Income Ratio)
  const affordabilityResult = useMemo(() => {
    const income = Number(loanEligibility.monthlyIncome || 0);
    const existingEmi = Number(loanEligibility.existingEmi || 0);
    if (!income) return null;

    const foirAfterLoan = ((existingEmi + emiValue) / income) * 100;
    const maxLoanByFoir = ((income * 0.5) - existingEmi) > 0
      ? Math.round(((income * 0.5) - existingEmi) * Number(loanTenure) * 12 / 100000 * 0.8)
      : 0;

    let score, label, color;
    if (foirAfterLoan <= 35) { score = 90; label = "Excellent"; color = "#0d7a69"; }
    else if (foirAfterLoan <= 45) { score = 70; label = "Good"; color = "#2196a0"; }
    else if (foirAfterLoan <= 55) { score = 50; label = "Moderate"; color = "#c98a2e"; }
    else { score = 25; label = "Stretched"; color = "#c84d4d"; }

    return { foirPct: Math.round(foirAfterLoan), score, label, color, maxLoan: maxLoanByFoir };
  }, [loanEligibility, emiValue, loanTenure]);

  return (
    <section className="realestate-loan-card">
      <div className="realestate-section-heading">
        <h3>Home loan calculator</h3>
        <p>EMI, affordability, stamp duty, and total acquisition cost.</p>
      </div>

      {/* RBI RATE BANNER */}
      <div className="re-loan-rbi-banner">
        <span className="re-loan-rbi-dot" />
        <span>
          RBI repo rate: <strong>{RBI_RATE_INFO.repoRate}%</strong> · Home loan rates: <strong>{RBI_RATE_INFO.homeLoansRangeMin}–{RBI_RATE_INFO.homeLoansRangeMax}%</strong> · Updated {RBI_RATE_INFO.lastUpdated}
        </span>
        <a href={RBI_RATE_INFO.source} target="_blank" rel="noreferrer" className="re-loan-rbi-link">RBI ↗</a>
      </div>

      {/* SUB-TABS */}
      <div className="re-loan-tabs" role="tablist">
        {[
          { id: "emi", label: "EMI calc" },
          { id: "breakdown", label: "Acquisition cost" },
          { id: "affordability", label: "Affordability" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`re-loan-tab ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: EMI ── */}
      {activeTab === "emi" && (
        <div className="re-loan-tab-body">
          <label className="realestate-field">
            <span>Loan amount (Lakhs)</span>
            <input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              min="1"
              max="10000"
            />
          </label>
          <label className="realestate-field">
            <span>Tenure (years)</span>
            <select value={loanTenure} onChange={(e) => setLoanTenure(e.target.value)}>
              {Array.from({ length: 25 }, (_, i) => String(i + 5)).map((yr) => (
                <option key={yr} value={yr}>{yr} years</option>
              ))}
            </select>
          </label>
          <label className="realestate-field">
            <span>Interest rate (%)</span>
            <input
              type="number"
              step="0.1"
              value={loanInterest}
              onChange={(e) => setLoanInterest(e.target.value)}
              min="1"
              max="25"
            />
          </label>

          {emiValue > 0 && (
            <div className="re-loan-emi-summary">
              <div className="re-loan-emi-result">
                <span>Monthly EMI</span>
                <strong>₹{emiValue.toLocaleString("en-IN")}</strong>
              </div>
              <div className="re-loan-emi-breakdown">
                <div className="re-loan-emi-stat">
                  <span>Total payment</span>
                  <strong>{formatInr(totalPayment)}</strong>
                </div>
                <div className="re-loan-emi-stat">
                  <span>Total interest</span>
                  <strong>{formatInr(Math.max(0, totalInterest))}</strong>
                </div>
                <div className="re-loan-emi-stat">
                  <span>Principal</span>
                  <strong>{formatInr(Number(loanAmount) * 100000)}</strong>
                </div>
              </div>

              {/* Principal vs interest stacked bar */}
              <div className="re-loan-pie-bar" aria-label="Principal vs interest breakdown">
                <div
                  className="re-loan-pie-principal"
                  style={{ width: `${Math.round((Number(loanAmount) * 100000 / totalPayment) * 100)}%` }}
                  title="Principal"
                />
                <div
                  className="re-loan-pie-interest"
                  style={{ width: `${Math.round((Math.max(0, totalInterest) / totalPayment) * 100)}%` }}
                  title="Interest"
                />
              </div>
              <div className="re-loan-pie-legend">
                <span><span className="re-dot principal" />Principal {Math.round((Number(loanAmount) * 100000 / totalPayment) * 100)}%</span>
                <span><span className="re-dot interest" />Interest {Math.round((Math.max(0, totalInterest) / totalPayment) * 100)}%</span>
              </div>
            </div>
          )}

          <button
            type="button"
            className="realestate-primary-button"
            onClick={onEstimate}
            disabled={loading}
          >
            {loading ? "Calculating…" : "Calculate EMI"}
          </button>
          {loanEstimateResult ? <p className="realestate-pitch">{loanEstimateResult}</p> : null}

          {/* BANK COMPARISON */}
          <div className="re-loan-banks">
            <h4>Bank rate comparison</h4>
            <div className="re-loan-bank-list">
              {(bankComparison || HOME_LOAN_PARTNERS.map((p, i) => ({ ...p, processingFee: i === 0 ? 0.5 : 0.75 }))).map((partner) => {
                const bankEmi = calculateEMI(Number(loanAmount), partner.rate, Number(loanTenure));
                return (
                  <div key={partner.name} className="re-loan-bank-row">
                    <div>
                      <strong>{partner.name}</strong>
                      <span>{partner.rate}% p.a. · Processing fee {partner.processingFee}%</span>
                    </div>
                    <div className="re-loan-bank-emi">
                      <strong>₹{bankEmi.toLocaleString("en-IN")}/mo</strong>
                      {typeof onApply === "function" && (
                        <button
                          type="button"
                          className="realestate-inline-button"
                          onClick={() => onApply(partner.name)}
                          disabled={loading}
                        >
                          Apply
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: ACQUISITION COST ── */}
      {activeTab === "breakdown" && (
        <div className="re-loan-tab-body">
          {acquisitionBreakdown ? (
            <>
              <div className="re-loan-acq-header">
                <span>State: <strong>{detectedState}</strong></span>
                {stampDutyInfo?.notes && <p className="re-loan-acq-note">ℹ️ {stampDutyInfo.notes}</p>}
              </div>
              <div className="re-loan-acq-rows">
                {[
                  { label: "Base price", value: acquisitionBreakdown.base, highlight: false },
                  { label: `Stamp duty (${acquisitionBreakdown.stampPct}%)`, value: acquisitionBreakdown.stamp, highlight: false },
                  { label: `Registration (${acquisitionBreakdown.regPct}%)`, value: acquisitionBreakdown.reg, highlight: false },
                  ...(acquisitionBreakdown.gst > 0 ? [{ label: "GST (5% under construction)", value: acquisitionBreakdown.gst, highlight: false }] : []),
                  { label: "Total acquisition cost", value: acquisitionBreakdown.total, highlight: true },
                ].map((row) => (
                  <div key={row.label} className={`re-loan-acq-row ${row.highlight ? "total" : ""}`}>
                    <span>{row.label}</span>
                    <strong>{formatInr(row.value)}</strong>
                  </div>
                ))}
              </div>
              <p className="re-loan-acq-disclaimer">
                Stamp duty and registration rates sourced from state government schedules. Verify with a registered valuator before transacting.
              </p>
            </>
          ) : (
            <div className="re-loan-no-data">
              <p>Enter the property price and location to see the full acquisition cost breakdown including stamp duty and registration fees.</p>
              <p className="re-insights-muted">Supported states: Kerala, Karnataka, Maharashtra, Tamil Nadu, Telangana, Andhra Pradesh, Gujarat, Rajasthan, West Bengal, UP, Punjab, Haryana, MP, Odisha, Delhi NCR.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: AFFORDABILITY ── */}
      {activeTab === "affordability" && (
        <div className="re-loan-tab-body">
          <label className="realestate-field">
            <span>Monthly income (₹)</span>
            <input
              type="number"
              value={loanEligibility.monthlyIncome}
              onChange={(e) => setLoanEligibility((s) => ({ ...s, monthlyIncome: e.target.value }))}
            />
          </label>
          <label className="realestate-field">
            <span>Existing EMI obligations (₹)</span>
            <input
              type="number"
              value={loanEligibility.existingEmi}
              onChange={(e) => setLoanEligibility((s) => ({ ...s, existingEmi: e.target.value }))}
            />
          </label>

          {affordabilityResult ? (
            <div className="re-loan-afford-result">
              <div
                className="re-loan-afford-score"
                style={{ borderColor: affordabilityResult.color, color: affordabilityResult.color }}
              >
                <strong>{affordabilityResult.label}</strong>
                <span>Affordability</span>
              </div>
              <div className="re-loan-afford-stats">
                <div className="re-loan-afford-stat">
                  <span>FOIR after loan</span>
                  <strong style={{ color: affordabilityResult.color }}>{affordabilityResult.foirPct}%</strong>
                  <span className="re-loan-afford-note">(Target: below 50%)</span>
                </div>
                <div className="re-loan-afford-stat">
                  <span>EMI for this loan</span>
                  <strong>₹{emiValue.toLocaleString("en-IN")}/mo</strong>
                </div>
                <div className="re-loan-afford-stat">
                  <span>Max eligible loan</span>
                  <strong>₹{affordabilityResult.maxLoan.toLocaleString("en-IN")} L</strong>
                </div>
              </div>
              {/* Score bar */}
              <div className="re-loan-afford-bar-track">
                <div
                  className="re-loan-afford-bar-fill"
                  style={{
                    width: `${affordabilityResult.score}%`,
                    background: affordabilityResult.color,
                  }}
                />
              </div>
              <p className="re-loan-afford-help">
                FOIR (Fixed Obligation to Income Ratio) measures what percentage of your income goes towards EMIs. Most banks prefer FOIR below 40–50%.
              </p>
            </div>
          ) : (
            <p className="re-loan-no-data">Enter your monthly income above to see your affordability score.</p>
          )}
        </div>
      )}
    </section>
  );
};

export default LoanCalculator;
