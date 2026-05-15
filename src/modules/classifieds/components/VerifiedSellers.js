import React from "react";

const VerifiedSellers = () => {
  const sellers = [
    {
      name: "Amit Electronics",
      title: "Trusted Electronics Seller",
      listings: 89,
      rating: 4.8,
    },
    {
      name: "Kerala Cars Hub",
      title: "Verified Vehicle Dealer",
      listings: 156,
      rating: 4.9,
    },
    {
      name: "Home Appliances Plus",
      title: "Appliance Specialist",
      listings: 67,
      rating: 4.7,
    },
    {
      name: "Tech Solutions Co",
      title: "Gadget & Computer Expert",
      listings: 134,
      rating: 4.6,
    },
  ];

  return (
    <section className="tradepost-verified-sellers">
      <article className="tradepost-surface-card">
        <div className="classifieds-section-heading">
          <h2>Verified Sellers</h2>
          <p>Connect with trusted sellers</p>
        </div>
        <div className="tradepost-sellers-grid">
          {sellers.map((seller) => (
            <div key={seller.name} className="tradepost-seller-card">
              <div className="tradepost-seller-avatar">{seller.name[0]}</div>
              <strong>{seller.name}</strong>
              <span className="tradepost-seller-title">{seller.title}</span>
              <div className="tradepost-seller-stats">
                <span>Rating: {seller.rating}</span>
                <span>{seller.listings} listings</span>
              </div>
              <button
                type="button"
                className="classifieds-inline-button"
                style={{ marginTop: "0.75rem", width: "100%" }}
              >
                Contact
              </button>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
};

export default VerifiedSellers;