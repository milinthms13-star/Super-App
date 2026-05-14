import React from "react";

const PortfolioSection = ({ portfolio = [], fallbackCategory = "" }) => (
  <div className="freelancer-list-grid">
    {portfolio.length === 0 ? (
      <p className="freelancer-note">No portfolio items available for this provider yet.</p>
    ) : (
      portfolio.map((item, index) => (
        <div key={`portfolio-${index}`} className="freelancer-list-item">
          <strong>{item.title || `Portfolio Item ${index + 1}`}</strong>
          <p>{item.description || "No description provided."}</p>
          <p>Category: {item.category || fallbackCategory || "General"}</p>
          {item.link ? (
            <a href={item.link} target="_blank" rel="noreferrer">
              Open Asset
            </a>
          ) : null}
        </div>
      ))
    )}
  </div>
);

export default PortfolioSection;
