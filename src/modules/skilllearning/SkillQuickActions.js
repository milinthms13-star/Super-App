import React from "react";

const QUICK_ACTIONS = [
  {
    key: "gulf",
    title: "Gulf Job Skills",
    subtitle: "Hospitality, safety, support tracks",
    filters: { region: "Gulf", jobLinked: "true" },
  },
  {
    key: "it",
    title: "IT Career Track",
    subtitle: "React, cloud, support, DevOps",
    filters: { category: "it-software", jobLinked: "true" },
  },
  {
    key: "free",
    title: "Free Certificates",
    subtitle: "No-cost courses with proofs",
    filters: { isFree: "true", certificateAvailable: "true" },
  },
  {
    key: "test",
    title: "Mock Test",
    subtitle: "Practice and score quickly",
    scrollTo: "skillhub-mock-test",
  },
];

const SkillQuickActions = ({ onApplyFilters, onScrollTo }) => {
  const handleAction = (action) => {
    if (action.filters) onApplyFilters?.(action.filters);
    if (action.scrollTo) onScrollTo?.(action.scrollTo);
  };

  return (
    <section className="skillhub-quick-actions" aria-label="Skill quick actions">
      {QUICK_ACTIONS.map((action) => (
        <button key={action.key} type="button" onClick={() => handleAction(action)}>
          <strong>{action.title}</strong>
          <small>{action.subtitle}</small>
        </button>
      ))}
    </section>
  );
};

export default SkillQuickActions;
