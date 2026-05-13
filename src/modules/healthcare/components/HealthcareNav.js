import React from "react";

const HealthcareNav = ({ sections, activeSection, onChange }) => {
  return (
    <section className="healthcare-nav" aria-label="Healthcare sections">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          className={`healthcare-nav-item ${activeSection === section.id ? "active" : ""}`}
          onClick={() => onChange(section.id)}
          aria-current={activeSection === section.id ? "page" : undefined}
        >
          <span className="healthcare-nav-icon" aria-hidden="true">{section.icon}</span>
          <strong>{section.shortLabel || section.title}</strong>
          <span>{section.description}</span>
        </button>
      ))}
    </section>
  );
};

export default HealthcareNav;
