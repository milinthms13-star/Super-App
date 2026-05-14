import React from "react";

const EmiCalculatorTab = ({ form, onChange, onCalculate, state, offerCompare, setOfferCompare, downloadScheduleCsv, leadForm, formatCurrency }) => (
  <section className="finance-section">
    <div className="finance-section-header">
      <h2>Advanced EMI Calculator</h2>
      <p>Monthly + yearly breakdown, processing fee, prepayment, compare offers and CSV export.</p>
    </div>
    <form className="finance-form" onSubmit={onCalculate}>
      <label>
        Principal (INR)
        <input type="number" value={form.principal} onChange={e => onChange(c => ({ ...c, principal: e.target.value }))} />
      </label>
      <label>
        Annual Interest (%)
        <input type="number" step="0.01" value={form.annualInterest} onChange={e => onChange(c => ({ ...c, annualInterest: e.target.value }))} />
      </label>
      <label>
        Tenure (months)
        <input type="number" value={form.tenureMonths} onChange={e => onChange(c => ({ ...c, tenureMonths: e.target.value }))} />
      </label>
      <label>
        Processing Fee Type
        <select value={form.processingFeeType} onChange={e => onChange(c => ({ ...c, processingFeeType: e.target.value }))}>
          <option value="percentage">Percentage (%)</option>
          <option value="flat">Flat (INR)</option>
        </select>
      </label>
      <label>
        Processing Fee Value
        <input type="number" step="0.01" value={form.processingFeeValue} onChange={e => onChange(c => ({ ...c, processingFeeValue: e.target.value }))} />
      </label>
      <label>
        Prepayment Amount (INR)
        <input type="number" value={form.prepaymentAmount} onChange={e => onChange(c => ({ ...c, prepaymentAmount: e.target.value }))} />
      </label>
      <label>
        Prepayment Month
        <input type="number" value={form.prepaymentMonth} onChange={e => onChange(c => ({ ...c, prepaymentMonth: e.target.value }))} />
      </label>
      <button type="submit">Calculate EMI</button>
    </form>
    <div className="finance-section-header">
      <h3>Compare 3 Loan Offers</h3>
    </div>
    <div className="finance-card-grid">
      {offerCompare.map((offer, index) => (
        <article key={`offer-${index}`} className="finance-card">
          <label>
            Lender
            <input type="text" value={offer.lender} onChange={e => setOfferCompare(current => current.map((item, offerIndex) => offerIndex === index ? { ...item, lender: e.target.value } : item))} />
          </label>
          <label>
            Interest %
            <input type="number" step="0.01" value={offer.interest} onChange={e => setOfferCompare(current => current.map((item, offerIndex) => offerIndex === index ? { ...item, interest: e.target.value } : item))} />
          </label>
          <label>
            Processing Fee %
            <input type="number" step="0.01" value={offer.processingFee} onChange={e => setOfferCompare(current => current.map((item, offerIndex) => offerIndex === index ? { ...item, processingFee: e.target.value } : item))} />
          </label>
        </article>
      ))}
    </div>
    {state.error ? <p className="finance-error">{state.error}</p> : null}
    {state.result ? (
      <div className="finance-result">
        <p><strong>Monthly EMI:</strong> {formatCurrency(state.result.monthlyEmi)}</p>
        <p><strong>Total Interest:</strong> {formatCurrency(state.result.totalInterest)}</p>
        <p><strong>Processing Fee:</strong> {formatCurrency(state.result.processingFeeAmount)}</p>
        <p><strong>Total Payable:</strong> {formatCurrency(state.result.grandTotal)}</p>
        <button type="button" onClick={() => downloadScheduleCsv(state.result.schedule, leadForm.fullName || "finance")}>Download EMI Schedule</button>
        <h4>Yearly Breakdown</h4>
        <ul className="finance-list">
          {state.yearly.map(year => (
            <li key={`year-${year.year}`}>Year {year.year}: Interest {formatCurrency(year.interest)} | Principal {formatCurrency(year.principal)} | Prepayment {formatCurrency(year.prepayment)}</li>
          ))}
        </ul>
        <h4>Offer Comparison</h4>
        <ul className="finance-list">
          {[...(state.offers || [])].sort((a, b) => a.totalPayable - b.totalPayable).map(offer => (
            <li key={offer.lender}>{offer.lender}: EMI {formatCurrency(offer.monthlyEmi)} | Total {formatCurrency(offer.totalPayable)}</li>
          ))}
        </ul>
      </div>
    ) : null}
  </section>
);

export default EmiCalculatorTab;
