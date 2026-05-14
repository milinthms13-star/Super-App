import React from "react";

const SchemesTab = ({ schemes = [], onApplyWithScheme }) => (
  <section className="finance-section">
    <div className="finance-section-header">
      <h2>Government Scheme Hub</h2>
      <p>Detailed scheme cards with eligibility, amount, docs, benefit and support action.</p>
    </div>

    <div className="finance-card-grid">
      {schemes.map((scheme) => (
        <article key={scheme.id} className="finance-card">
          <h3>{scheme.name}</h3>
          <p>
            <strong>Eligibility:</strong> {scheme.eligibility}
          </p>
          <p>
            <strong>Max Amount:</strong> {scheme.maxAmount}
          </p>
          <p>
            <strong>Documents:</strong> {scheme.documents}
          </p>
          <p>
            <strong>Benefit:</strong> {scheme.benefit}
          </p>
          <button type="button" onClick={() => onApplyWithScheme?.(scheme.categoryHint)}>
            Apply Support
          </button>
        </article>
      ))}
    </div>
  </section>
);

export default SchemesTab;
