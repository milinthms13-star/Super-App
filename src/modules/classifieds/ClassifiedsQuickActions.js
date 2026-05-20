import React from "react";

const quickActions = [
  {
    key: "buy",
    icon: "Search",
    title: "Find Deals",
    subtitle: "Search nearby used items",
    filters: { listingTypeFilter: "sell", verifiedOnly: false },
  },
  { key: "sell", icon: "Plus", title: "Post Ad", subtitle: "Sell item or service", mode: "post" },
  {
    key: "requirement",
    icon: "Megaphone",
    title: "Post Requirement",
    subtitle: "Ask sellers to contact you",
    mode: "requirement",
  },
  {
    key: "safe",
    icon: "Shield",
    title: "Safe Trade",
    subtitle: "Verified sellers only",
    filters: { verifiedOnly: true },
  },
];

const ClassifiedsQuickActions = ({ onFilterApply, onPostAd, onPostRequirement }) => {
  const handleClick = (action) => {
    if (action.mode === "post") return onPostAd?.();
    if (action.mode === "requirement") return onPostRequirement?.();
    return onFilterApply?.(action.filters || {});
  };

  return (
    <section className="classifieds-quick-actions-upgrade" aria-label="Classifieds quick actions">
      {quickActions.map((action) => (
        <button key={action.key} type="button" onClick={() => handleClick(action)}>
          <span className="classifieds-quick-icon">{action.icon}</span>
          <strong>{action.title}</strong>
          <small>{action.subtitle}</small>
        </button>
      ))}
    </section>
  );
};

export default ClassifiedsQuickActions;
