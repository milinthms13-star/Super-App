import React, { useState } from "react";
import LeadBoard from "./LeadBoard";
import VisitBoard from "./VisitBoard";
import ListingForm from "./ListingForm";

/**
 * SellerDashboard
 * Seller/Owner workspace for managing listings, leads, visits, and monetization.
 * Separated from the public marketplace to reduce cognitive overload.
 */
const SellerDashboard = ({
  properties = [],
  leadBoard = {},
  visitBoard = {},
  onCreateListing = async () => null,
  onUpdateListing = async () => null,
  onUpdateLead = async () => null,
  onScheduleVisit = async () => null,
  onUpdateVisit = async () => null,
}) => {
  const [activeTab, setActiveTab] = useState("listings"); // listings | leads | visits | monetization

  const tabs = [
    { id: "listings", label: "My Listings", icon: "📋" },
    { id: "leads", label: "Leads", icon: "📞" },
    { id: "visits", label: "Scheduled Visits", icon: "📅" },
    { id: "monetization", label: "Monetization", icon: "💰" },
  ];

  return (
    <div className="realestate-seller-dashboard">
      {/* SELLER NAVIGATION */}
      <div className="realestate-seller-header">
        <h1>Seller Dashboard</h1>
        <p>Manage your listings, leads, and earnings in one place.</p>
      </div>

      {/* TAB NAVIGATION */}
      <nav className="realestate-seller-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`realestate-seller-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* TAB CONTENT */}
      <div className="realestate-seller-content">
        {activeTab === "listings" && (
          <section className="realestate-seller-section">
            <div className="realestate-section-heading">
              <h2>My Property Listings</h2>
              <p>Create, edit, and manage your property listings</p>
            </div>
            <ListingForm onSubmit={onCreateListing} />
            <div className="realestate-listings-grid" style={{ marginTop: "2rem" }}>
              {properties.map((property) => (
                <article
                  key={property.id}
                  className="realestate-listing-card-compact"
                >
                  <h3>{property.title}</h3>
                  <p>{property.location}</p>
                  <div className="realestate-listing-stats">
                    <span>{property.leads?.length || 0} leads</span>
                    <span>{property.visits?.length || 0} visits</span>
                  </div>
                  <button
                    type="button"
                    className="realestate-inline-button"
                    onClick={() => onUpdateListing(property.id)}
                  >
                    Edit
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === "leads" && (
          <section className="realestate-seller-section">
            <div className="realestate-section-heading">
              <h2>Lead Management</h2>
              <p>Track inquiries and manage buyer leads</p>
            </div>
            <LeadBoard
              leadBoard={leadBoard}
              onUpdateLead={onUpdateLead}
            />
          </section>
        )}

        {activeTab === "visits" && (
          <section className="realestate-seller-section">
            <div className="realestate-section-heading">
              <h2>Scheduled Visits</h2>
              <p>Manage property viewing appointments</p>
            </div>
            <VisitBoard
              visitBoard={visitBoard}
              onUpdateVisit={onUpdateVisit}
            />
          </section>
        )}

        {activeTab === "monetization" && (
          <section className="realestate-seller-section">
            <div className="realestate-section-heading">
              <h2>Monetization Plans</h2>
              <p>Boost your listings and earn more</p>
            </div>
            <MonetizationPlans />
          </section>
        )}
      </div>
    </div>
  );
};

/**
 * MonetizationPlans
 * Monetization options for sellers to feature listings, boost visibility, etc.
 */
const MonetizationPlans = () => {
  const plans = [
    {
      name: "Standard Listing",
      price: "Free",
      features: ["Basic listing", "5 photos", "Chat with buyers"],
    },
    {
      name: "Featured Listing",
      price: "₹999",
      features: ["Featured placement", "15 photos", "Priority messaging", "Enhanced visibility"],
    },
    {
      name: "Premium Boost",
      price: "₹2,499",
      features: ["All Premium features", "Virtual tour", "Leads priority", "Analytics dashboard"],
    },
  ];

  return (
    <div className="realestate-monetization-grid">
      {plans.map((plan) => (
        <article key={plan.name} className="realestate-plan-card">
          <h3>{plan.name}</h3>
          <div className="realestate-plan-price">{plan.price}</div>
          <ul className="realestate-plan-features">
            {plan.features.map((feature) => (
              <li key={feature}>✓ {feature}</li>
            ))}
          </ul>
          <button type="button" className="realestate-primary-button">
            {plan.price === "Free" ? "Get Started" : "Subscribe Now"}
          </button>
        </article>
      ))}
    </div>
  );
};

export default SellerDashboard;
