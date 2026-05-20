import React from "react";

const LOAN_TYPES = [
  "Personal Loan",
  "Business Loan",
  "Gold Loan",
  "Home Loan",
  "Vehicle Loan",
  "Education Loan",
  "MSME Loan",
];

const EMPLOYMENT_TYPES = [
  "Salaried",
  "Self Employed",
  "Business Owner",
  "Freelancer",
  "Student",
  "Homemaker",
];

const FinanceOverviewTab = ({
  quickJourney,
  setQuickJourney,
  financePulse,
  setFinancePulse,
  quickAssist,
  setQuickAssist,
  quickEligibilityScore,
  quickEmi,
  onQuickAssistContinue,
  states,
  districtsByState,
  financeApiEnabled,
  formatCurrency,
}) => {
  const districts = districtsByState[quickJourney.state] || [];
  const monthlyIncome = Number(financePulse.monthlyIncome || 0);
  const monthlyExpenses = Number(financePulse.monthlyExpenses || 0);
  const monthlyLoanEmi = Number(financePulse.monthlyLoanEmi || 0);
  const monthlySavingsGoal = Number(financePulse.monthlySavingsGoal || 0);
  const savingsRate = monthlyIncome > 0 ? Math.max(0, ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0;
  const freeCash = monthlyIncome - monthlyExpenses - monthlyLoanEmi;
  const goalCoverage = monthlySavingsGoal > 0 ? Math.max(0, (freeCash / monthlySavingsGoal) * 100) : 0;

  return (
    <section className="finance-section">
      <div className="finance-section-header">
        <h2>Finance 10/10 Command Desk</h2>
        <p>Money health, eligibility pulse, EMI estimate, and one-click lead assist in a single workspace.</p>
      </div>

      <div className="finance-overview-grid">
        <article className="finance-overview-card">
          <h3>Money Health Snapshot</h3>
          <div className="finance-overview-form-grid">
            <label>
              Monthly Income (INR)
              <input
                type="number"
                value={financePulse.monthlyIncome}
                onChange={(event) =>
                  setFinancePulse((current) => ({ ...current, monthlyIncome: event.target.value }))
                }
              />
            </label>
            <label>
              Monthly Expenses (INR)
              <input
                type="number"
                value={financePulse.monthlyExpenses}
                onChange={(event) =>
                  setFinancePulse((current) => ({ ...current, monthlyExpenses: event.target.value }))
                }
              />
            </label>
            <label>
              Existing EMI (INR)
              <input
                type="number"
                value={financePulse.monthlyLoanEmi}
                onChange={(event) =>
                  setFinancePulse((current) => ({ ...current, monthlyLoanEmi: event.target.value }))
                }
              />
            </label>
            <label>
              Savings Goal / Month (INR)
              <input
                type="number"
                value={financePulse.monthlySavingsGoal}
                onChange={(event) =>
                  setFinancePulse((current) => ({ ...current, monthlySavingsGoal: event.target.value }))
                }
              />
            </label>
            <label>
              Credit Score
              <input
                type="number"
                min="300"
                max="900"
                value={financePulse.creditScore}
                onChange={(event) =>
                  setFinancePulse((current) => ({ ...current, creditScore: event.target.value }))
                }
              />
            </label>
            <label>
              Risk Profile
              <select
                value={financePulse.riskProfile}
                onChange={(event) =>
                  setFinancePulse((current) => ({ ...current, riskProfile: event.target.value }))
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>

          <div className="finance-overview-metrics">
            <div>
              <span>Savings Rate</span>
              <strong>{savingsRate.toFixed(1)}%</strong>
            </div>
            <div>
              <span>Free Cash / Month</span>
              <strong>{formatCurrency(freeCash)}</strong>
            </div>
            <div>
              <span>Goal Coverage</span>
              <strong>{goalCoverage.toFixed(1)}%</strong>
            </div>
          </div>
        </article>

        <article className="finance-overview-card">
          <h3>Quick Eligibility + EMI Pulse</h3>
          <div className="finance-overview-form-grid">
            <label>
              Full Name
              <input
                type="text"
                value={quickAssist.name}
                onChange={(event) => setQuickAssist((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label>
              Phone
              <input
                type="tel"
                value={quickAssist.phone}
                onChange={(event) => setQuickAssist((current) => ({ ...current, phone: event.target.value }))}
              />
            </label>
            <label>
              Loan Type
              <select
                value={quickAssist.loanType}
                onChange={(event) => setQuickAssist((current) => ({ ...current, loanType: event.target.value }))}
              >
                {LOAN_TYPES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Employment
              <select
                value={quickAssist.employmentType}
                onChange={(event) =>
                  setQuickAssist((current) => ({ ...current, employmentType: event.target.value }))
                }
              >
                {EMPLOYMENT_TYPES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Monthly Income (INR)
              <input
                type="number"
                value={quickAssist.monthlyIncome}
                onChange={(event) =>
                  setQuickAssist((current) => ({ ...current, monthlyIncome: event.target.value }))
                }
              />
            </label>
            <label>
              City / District
              <input
                type="text"
                value={quickAssist.city}
                onChange={(event) => setQuickAssist((current) => ({ ...current, city: event.target.value }))}
                placeholder="e.g. Kollam"
              />
            </label>
          </div>

          <div className="finance-overview-form-grid">
            <label>
              State
              <select
                value={quickJourney.state}
                onChange={(event) =>
                  setQuickJourney((current) => ({
                    ...current,
                    state: event.target.value,
                    district: (districtsByState[event.target.value] || [])[0] || current.district,
                  }))
                }
              >
                {states.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </label>
            <label>
              District
              <select
                value={quickJourney.district}
                onChange={(event) =>
                  setQuickJourney((current) => ({ ...current, district: event.target.value }))
                }
              >
                {districts.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </label>
            <label>
              Loan Amount (INR)
              <input
                type="number"
                value={quickJourney.amount}
                onChange={(event) =>
                  setQuickJourney((current) => ({ ...current, amount: event.target.value }))
                }
              />
            </label>
            <label>
              Preferred Rate (%)
              <input
                type="number"
                step="0.01"
                value={quickJourney.interest}
                onChange={(event) =>
                  setQuickJourney((current) => ({ ...current, interest: event.target.value }))
                }
              />
            </label>
            <label>
              Tenure (months)
              <input
                type="number"
                value={quickJourney.tenureMonths}
                onChange={(event) =>
                  setQuickJourney((current) => ({ ...current, tenureMonths: event.target.value }))
                }
              />
            </label>
            <label className="finance-consent">
              <input
                type="checkbox"
                checked={quickAssist.consent}
                onChange={(event) =>
                  setQuickAssist((current) => ({ ...current, consent: event.target.checked }))
                }
              />
              I agree to finance follow-up support
            </label>
          </div>

          <div className="finance-overview-metrics">
            <div>
              <span>Eligibility Score</span>
              <strong>{quickEligibilityScore}%</strong>
            </div>
            <div>
              <span>Estimated EMI</span>
              <strong>{formatCurrency(quickEmi)}</strong>
            </div>
            <div>
              <span>Engine</span>
              <strong>{financeApiEnabled ? "API + Hub" : "Hub + Local"}</strong>
            </div>
          </div>

          <button type="button" onClick={onQuickAssistContinue}>
            Continue to Full Apply Flow
          </button>
        </article>
      </div>

      <div className="finance-compliance-banner">
        <strong>Finance disclaimer:</strong> We assist with comparisons, eligibility guidance and lead routing.
        Final approval, interest and disbursal are always based on lender underwriting, KYC and document verification.
      </div>
    </section>
  );
};

export default FinanceOverviewTab;
