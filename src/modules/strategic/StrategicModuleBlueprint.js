import React from "react";
import "./StrategicModuleBlueprint.css";

const StrategicModuleBlueprint = ({
  title,
  subtitle,
  valuePill = "",
  investorStory = [],
  features = [],
  targetUsers = [],
  monetization = [],
  differentiation = [],
  keralaGulfScale = [],
  apiContracts = [],
}) => {
  return (
    <section className="strategic-module-shell">
      <header className="strategic-hero">
        {valuePill ? <p className="strategic-pill">{valuePill}</p> : null}
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>

      <section className="strategic-grid">
        <article className="strategic-card">
          <h2>Investor Story</h2>
          <ul>
            {investorStory.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="strategic-card">
          <h2>Core Features</h2>
          <ul>
            {features.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="strategic-card">
          <h2>Target Users</h2>
          <ul>
            {targetUsers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="strategic-card">
          <h2>Monetization</h2>
          <ul>
            {monetization.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="strategic-card">
          <h2>Differentiation</h2>
          <ul>
            {differentiation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="strategic-card">
          <h2>Kerala + Gulf Scale</h2>
          <ul>
            {keralaGulfScale.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="strategic-card strategic-card-wide">
          <h2>Implementation Contract</h2>
          <ul>
            {apiContracts.map((item) => (
              <li key={item}>
                <code>{item}</code>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </section>
  );
};

export default StrategicModuleBlueprint;
