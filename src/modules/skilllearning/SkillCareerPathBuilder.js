import React, { useMemo } from "react";
import { buildCareerPath } from "./skillDevelopmentUtils";

const SkillCareerPathBuilder = ({ form, setForm, onApplyFilters }) => {
  const plan = useMemo(() => buildCareerPath(form), [form]);

  return (
    <section className="skillhub-section skillhub-career-builder">
      <div className="skillhub-section-header">
        <h2>AI Career Path Builder</h2>
        <p>Suggests a practical path based on education, interests, salary target and destination.</p>
      </div>

      <div className="skillhub-career-grid">
        <form className="skillhub-form" onSubmit={(event) => event.preventDefault()}>
          <label>
            Education
            <select value={form.education} onChange={(event) => setForm((s) => ({ ...s, education: event.target.value }))}>
              <option value="SSLC">SSLC</option>
              <option value="Plus Two">Plus Two</option>
              <option value="BCom">BCom</option>
              <option value="BTech">BTech</option>
              <option value="Nursing">Nursing</option>
              <option value="Any Degree">Any Degree</option>
            </select>
          </label>

          <label>
            Interest / skill area
            <input
              value={form.interests}
              placeholder="Accounting, IT, Hotel jobs, PSC"
              onChange={(event) => setForm((s) => ({ ...s, interests: event.target.value }))}
            />
          </label>

          <label>
            Monthly salary target
            <input
              type="number"
              min="10000"
              value={form.salaryTarget}
              onChange={(event) => setForm((s) => ({ ...s, salaryTarget: event.target.value }))}
            />
          </label>

          <label>
            Destination
            <select value={form.destination} onChange={(event) => setForm((s) => ({ ...s, destination: event.target.value }))}>
              <option value="India">India</option>
              <option value="Gulf">Gulf</option>
              <option value="Remote">Remote / Freelance</option>
            </select>
          </label>

          <button type="button" onClick={() => onApplyFilters?.(plan.filters)}>
            Show matching courses
          </button>
        </form>

        <div className="skillhub-career-output">
          <div className="skillhub-career-role">
            <span>Recommended path</span>
            <strong>{plan.title}</strong>
            <p>{plan.summary}</p>
          </div>

          <div className="skillhub-career-steps">
            {plan.steps.map((step, index) => (
              <article key={step.title}>
                <b>{index + 1}</b>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="skillhub-career-metrics">
            <span>Timeline: {plan.timeline}</span>
            <span>Job readiness: {plan.readiness}</span>
            <span>Focus: {plan.focus}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SkillCareerPathBuilder;
