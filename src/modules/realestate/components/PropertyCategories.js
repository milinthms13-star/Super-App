import React from "react";

const PropertyCategories = ({ onTypeClick }) => {
  const categories = [
    {
      type: "Apartments",
      icon: "APT",
      description: "Flats and studio homes",
    },
    {
      type: "Houses",
      icon: "HSE",
      description: "Villas and bungalows",
    },
    {
      type: "Land",
      icon: "LND",
      description: "Plots and layouts",
    },
    {
      type: "Commercial",
      icon: "COM",
      description: "Office and retail spaces",
    },
  ];

  return (
    <section className="homesphere-property-categories">
      <article className="homesphere-surface-card">
        <div className="realestate-section-heading">
          <h2>Property Types</h2>
          <p>Browse by category</p>
        </div>
        <div className="homesphere-categories-grid">
          {categories.map((cat) => (
            <button
              key={cat.type}
              type="button"
              className="homesphere-category-card"
              onClick={() => onTypeClick?.(cat.type)}
            >
              <div className="homesphere-category-emoji">{cat.icon}</div>
              <strong>{cat.type}</strong>
              <span>{cat.description}</span>
            </button>
          ))}
        </div>
      </article>
    </section>
  );
};

export default PropertyCategories;
