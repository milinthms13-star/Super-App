import React from "react";

const VerifiedSellers = () => {
  const sellers = [
    { name: "Amit Electronics", title: "Certified electronics specialist", listings: 89, rating: 4.8 },
    { name: "Kerala Cars Hub", title: "Verified pre-owned vehicle dealer", listings: 156, rating: 4.9 },
    { name: "Home Appliances Plus", title: "Trusted appliance consultant", listings: 67, rating: 4.7 },
    { name: "Tech Solutions Co", title: "Premium gadget marketplace", listings: 134, rating: 4.6 },
  ];

  return (
    <section className="tradepost-verified-sellers">
      <article className="tradepost-surface-card">
        <div className="classifieds-section-heading">
          <h2>Verified sellers</h2>
          <p>Top-rated sellers with consistent buyer satisfaction.</p>
        </div>
        <div className="tradepost-sellers-grid">
          {sellers.map((seller) => (
            <div key={seller.name} className="tradepost-seller-card">
              <div className="tradepost-seller-avatar" aria-hidden="true">
                {seller.name
                  .split(" ")
                  .slice(0, 2)
                  .map((token) => token[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <strong>{seller.name}</strong>
              <span className="tradepost-seller-title">{seller.title}</span>
              <div className="tradepost-seller-stats">
                <span>{seller.rating}/5 rating</span>
                <span>{seller.listings} listings</span>
              </div>
              <button type="button" className="classifieds-inline-button tradepost-contact-seller-btn">
                Contact seller
              </button>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
};

export default VerifiedSellers;
