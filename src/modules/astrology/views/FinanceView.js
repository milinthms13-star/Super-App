import React from "react";

const FinanceView = ({
  selectedSign,
  getFinanceAdvice,
}) => (
  <div className="astro-card-grid">
    <article className="astrology-panel astro-result-card astro-span-2">
      <h4>Finance forecast</h4>
      <p>{getFinanceAdvice(selectedSign)}</p>
    </article>

    <article className="astrology-panel astro-result-card">
      <h4>Income prospects</h4>
      <ul>
        <li>Steady income flow expected this quarter</li>
        <li>Additional revenue streams possible mid-year</li>
        <li>Bonus or incentive opportunities in Q3</li>
        <li>Investment returns showing positive trends</li>
      </ul>
    </article>

    <article className="astrology-panel astro-result-card">
      <h4>Expense management</h4>
      <ul>
        <li>Control discretionary spending in early months</li>
        <li>Plan for major expenses in advance</li>
        <li>Medical or health costs need attention</li>
        <li>Home maintenance budget required</li>
      </ul>
    </article>

    <article className="astrology-panel astro-result-card">
      <h4>Investment timing</h4>
      <div className="astro-period-list">
        <div className="astro-period-item astro-favorable">
          <strong>January - March</strong>
          <p>Favorable for long-term investments</p>
        </div>
        <div className="astro-period-item astro-neutral">
          <strong>April - June</strong>
          <p>Review and rebalance portfolio</p>
        </div>
        <div className="astro-period-item astro-caution">
          <strong>July - August</strong>
          <p>Avoid major financial decisions</p>
        </div>
        <div className="astro-period-item astro-favorable">
          <strong>September - December</strong>
          <p>Good for property or asset purchases</p>
        </div>
      </div>
    </article>

    <article className="astrology-panel astro-result-card">
      <h4>Wealth building tips</h4>
      <ul>
        <li>Start systematic investment plan (SIP)</li>
        <li>Build emergency fund equivalent to 6 months expenses</li>
        <li>Diversify investment portfolio across asset classes</li>
        <li>Review insurance coverage adequacy</li>
        <li>Clear high-interest debts first</li>
      </ul>
    </article>

    <article className="astrology-panel astro-result-card astro-span-2">
      <h4>Financial action checklist</h4>
      <div className="astro-action-checklist">
        <label>
          <input type="checkbox" />
          <span>Create monthly budget and track expenses</span>
        </label>
        <label>
          <input type="checkbox" />
          <span>Set up automatic savings transfers</span>
        </label>
        <label>
          <input type="checkbox" />
          <span>Review and optimize recurring subscriptions</span>
        </label>
        <label>
          <input type="checkbox" />
          <span>Research tax-saving investment options</span>
        </label>
        <label>
          <input type="checkbox" />
          <span>Schedule financial health check with advisor</span>
        </label>
        <label>
          <input type="checkbox" />
          <span>Update will and nomination details</span>
        </label>
      </div>
    </article>

    <article className="astrology-panel astro-result-card astro-span-2">
      <h4>Avoid these financial mistakes</h4>
      <div className="astro-caution-list">
        <div className="astro-caution-item">
          <strong>⚠️ Impulsive spending</strong>
          <p>Wait 48 hours before major purchases</p>
        </div>
        <div className="astro-caution-item">
          <strong>⚠️ Ignoring small leaks</strong>
          <p>Track and plug daily expense gaps</p>
        </div>
        <div className="astro-caution-item">
          <strong>⚠️ Borrowing for depreciating assets</strong>
          <p>Avoid loans for lifestyle upgrades</p>
        </div>
        <div className="astro-caution-item">
          <strong>⚠️ Neglecting emergency fund</strong>
          <p>Build buffer before aggressive investing</p>
        </div>
      </div>
    </article>
  </div>
);

export default FinanceView;
