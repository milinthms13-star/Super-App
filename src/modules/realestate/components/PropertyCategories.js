import React from "react";

/**
 * PropertyCategories
 * Shows property types/categories to help users filter quickly.
 * Image-focused with quick access to each type.
 */
const PropertyCategories = ({ propertyTypes, onTypeClick }) => {
  const categories = [
    {
      type: "Apartments",
      emoji: "🏢",
      description: "Flats & studios",
    },
    {
      type: "Houses",
      emoji: "🏠",
      description: "Villas & bungalows",
    },
    {
      type: "Land",
      emoji: "🏗️",
      description: "Plots & layouts",
    },
    {
      type: "Commercial",
      emoji: "🏪",
      description: "Office & retail",
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
              <div className="homesphere-category-emoji">{cat.emoji}</div>
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
