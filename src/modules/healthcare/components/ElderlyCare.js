import React from "react";

const ElderlyCare = ({ carePlans, governmentSchemes }) => {
  return (
    <section className="healthcare-section">
      <div className="healthcare-section-heading">
        <h2>Elderly Care and Assistance</h2>
        <p>Monthly care support, medicine refill reminders, insurance help, and government scheme awareness.</p>
      </div>

      <div className="healthcare-elderly-grid">
        {(carePlans || []).map((plan) => (
          <article key={plan.id} className="healthcare-care-card">
            <h3>{plan.title}</h3>
            <p>{plan.description}</p>
            <button type="button" className="healthcare-secondary-button">
              Enable
            </button>
          </article>
        ))}
      </div>

      <div className="healthcare-schemes-card">
        <h3>Government Health Scheme Info</h3>
        <div className="healthcare-schemes-list">
          {(governmentSchemes || []).map((scheme) => (
            <article key={scheme.id} className="healthcare-scheme-item">
              <strong>{scheme.name}</strong>
              <p>{scheme.summary}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="healthcare-partner-strip">
        <h3>Partner and Admin Readiness</h3>
        <p>
          Doctor/lab/pharmacy partner dashboard and admin approval workflows are prepared in this UI roadmap and can be
          connected in next phase.
        </p>
      </div>
    </section>
  );
};

export default ElderlyCare;
