import React from "react";

const HealthcareNav = ({ sections, activeSection, onChange, onSectionChange }) => {
  const handleNavigationChange = onChange || onSectionChange;
  const sectionTestIdMap = {
    consultation: "nav-consultation",
    lab: "nav-lab-booking",
    records: "nav-health-records",
    family: "nav-family-profiles",
    pharmacy: "nav-pharmacy",
    reminders: "nav-reminders",
    emergency: "nav-emergency",
    notifications: "nav-notifications",
    elderly: "nav-elderly-care",
    partner: "nav-partner",
    "ai-assist": "nav-ai-assist",
  };

  return (
    <section className="healthcare-nav" aria-label="Healthcare sections" data-testid="healthcare-nav">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          data-testid={sectionTestIdMap[section.id] || `nav-${section.id}`}
          className={`healthcare-nav-item ${activeSection === section.id ? "active" : ""}`}
          onClick={() => handleNavigationChange?.(section.id)}
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
