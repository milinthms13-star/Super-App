import React from "react";

const PopularCategories = ({ onCategoryClick }) => {
  const categories = [
    { type: "Vehicles", code: "VH", description: "Cars, bikes, and commercial vehicles" },
    { type: "Electronics", code: "EL", description: "Phones, laptops, accessories, gadgets" },
    { type: "Jobs", code: "JB", description: "Local hiring and freelance opportunities" },
    { type: "Properties", code: "PR", description: "Homes, flats, plots, and rentals" },
    { type: "Services", code: "SV", description: "Repairs, tutors, logistics, and more" },
    { type: "Home Appliances", code: "HA", description: "Fridge, AC, kitchen and utility items" },
  ];

  return (
    <section className="tradepost-popular-categories">
      <article className="tradepost-surface-card">
        <div className="classifieds-section-heading">
          <h2>Popular categories</h2>
          <p>Explore high-demand marketplaces in one tap.</p>
        </div>
        <div className="tradepost-categories-grid">
          {categories.map((category) => (
            <button
              key={category.type}
              type="button"
              className="tradepost-category-card"
              onClick={() => onCategoryClick?.(category.type)}
            >
              <div className="tradepost-category-icon" aria-hidden="true">
                {category.code}
              </div>
              <strong>{category.type}</strong>
              <span>{category.description}</span>
            </button>
          ))}
        </div>
      </article>
    </section>
  );
};

export default PopularCategories;
