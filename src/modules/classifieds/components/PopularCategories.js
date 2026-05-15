import React from "react";

const PopularCategories = ({ onCategoryClick }) => {
  const categories = [
    {
      type: "Vehicles",
      icon: "🚗",
      description: "Cars, bikes, and more",
    },
    {
      type: "Electronics",
      icon: "📱",
      description: "Phones, laptops, gadgets",
    },
    {
      type: "Jobs",
      icon: "💼",
      description: "Employment opportunities",
    },
    {
      type: "Properties",
      icon: "🏠",
      description: "Real estate listings",
    },
    {
      type: "Services",
      icon: "🔧",
      description: "Professional services",
    },
    {
      type: "Home Appliances",
      icon: "🏠",
      description: "Kitchen and home items",
    },
  ];

  return (
    <section className="tradepost-popular-categories">
      <article className="tradepost-surface-card">
        <div className="classifieds-section-heading">
          <h2>Popular Categories</h2>
          <p>Browse by category</p>
        </div>
        <div className="tradepost-categories-grid">
          {categories.map((cat) => (
            <button
              key={cat.type}
              type="button"
              className="tradepost-category-card"
              onClick={() => onCategoryClick?.(cat.type)}
            >
              <div className="tradepost-category-emoji">{cat.icon}</div>
              <strong>{cat.type}</strong>
              <span>{cat.description}</span>
            </button>
          ))}
        </div>
      </article>
    </section>
  );
};

export default PopularCategories;