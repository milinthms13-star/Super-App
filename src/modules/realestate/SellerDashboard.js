import React, { useState, useMemo } from "react";
import LeadBoard from "./components/LeadBoard";
import VisitBoard from "./components/VisitBoard";
import ListingForm from "./components/ListingForm";
import LoanCalculator from "./components/LoanCalculator";
import {
  CONSTRUCTION_SERVICES,
  DEFAULT_LISTING_FORM,
  SUBSCRIPTION_PLANS,
} from "./realEstateConstants";
import {
  buildListingPayloadFromForm,
  validateListingForm,
  resolveErrorMessage,
} from "./realEstateUtils";

const SellerDashboard = ({
  currentUser,
  activeRole,
  setActiveRole,
  allowedRoleModes,
  leadBoard,
  visitBoard,
  properties,
  onLeadUpdate,
  onVisitUpdate,
  onListingSubmit,
  onSubscriptionUpgrade,
  pushToast,
}) => {
  const [listingForm, setListingForm] = useState(DEFAULT_LISTING_FORM);
  const [listingFieldErrors, setListingFieldErrors] = useState({});
  const [editListingId, setEditListingId] = useState("");
  const [selectedService, setSelectedService] = useState(
    CONSTRUCTION_SERVICES[0].id
  );
  const [subscriptionState, setSubscriptionState] = useState({
    planId: "",
    gateway: "razorpay",
    invoiceNumber: "",
    expiresOn: "",
    featuredCredits: 0,
  });
  const [asyncState, setAsyncState] = useState({
    listingSubmit: false,
    leadUpdate: false,
    visitUpdate: false,
    payment: false,
  });

  const userListings = useMemo(() => {
    return properties.filter(
      (p) =>
        String(p.ownerId || "").trim().toLowerCase() ===
        String(currentUser?.email || "").trim().toLowerCase()
    );
  }, [properties, currentUser?.email]);

  const handleListingInputChange = (field, value) => {
    setListingForm((state) => ({ ...state, [field]: value }));
    if (listingFieldErrors[field]) {
      setListingFieldErrors((state) => {
        const next = { ...state };
        delete next[field];
        return next;
      });
    }
  };

  const handleListingToggleChange = (field) => {
    setListingForm((state) => ({ ...state, [field]: !state[field] }));
  };

  const handleListingSubmit = async () => {
    const errors = validateListingForm(listingForm);
    if (Object.keys(errors).length > 0) {
      setListingFieldErrors(errors);
      pushToast("Please correct the form errors", "error");
      return;
    }

    setAsyncState((s) => ({ ...s, listingSubmit: true }));
    try {
      const payload = buildListingPayloadFromForm(
        listingForm,
        currentUser,
        activeRole
      );
      await onListingSubmit(payload, editListingId);
      pushToast(
        editListingId
          ? "Listing updated successfully"
          : "Listing created successfully"
      );
      setListingForm(DEFAULT_LISTING_FORM);
      setEditListingId("");
    } catch (error) {
      pushToast(resolveErrorMessage(error), "error");
    } finally {
      setAsyncState((s) => ({ ...s, listingSubmit: false }));
    }
  };

  const handleSubscriptionUpgrade = async (planId, gateway) => {
    setAsyncState((s) => ({ ...s, payment: true }));
    try {
      await onSubscriptionUpgrade(planId, gateway);
      pushToast(`Subscription initiated with ${gateway}`);
    } finally {
      setAsyncState((s) => ({ ...s, payment: false }));
    }
  };

  const handleConstructionRequest = (serviceId) => {
    pushToast(`Construction service request for ${serviceId} opened (demo)`);
  };

  return (
    <div className="realestate-shell seller-dashboard-shell">
      <section className="seller-dashboard-hero">
        <div className="seller-dashboard-hero-content">
          <h1>
            {activeRole === "owner"
              ? "My listings & leads"
              : activeRole === "builder"
              ? "Builder project management"
              : "Broker workspace"}
          </h1>
          <p>Manage your properties, track leads, and monitor conversions.</p>
        </div>
        <div className="seller-dashboard-role-switch">
          {allowedRoleModes.map((role) => (
            <button
              key={role}
              type="button"
              className={`seller-dashboard-role-btn ${activeRole === role ? "active" : ""}`}
              onClick={() => setActiveRole(role)}
            >
              {role === "owner"
                ? "Seller"
                : role === "builder"
                ? "Builder"
                : "Broker"}
            </button>
          ))}
        </div>
      </section>

      <div className="seller-dashboard-grid">
        {/* LEFT: FORMS & MANAGEMENT */}
        <div className="seller-dashboard-left">
          {/* LEAD BOARD */}
          <LeadBoard
            activeRole={activeRole}
            leadBoard={leadBoard}
            onStageUpdate={onLeadUpdate}
            loading={asyncState.leadUpdate}
          />

          {/* VISIT BOARD */}
          <VisitBoard
            visitBoard={visitBoard}
            onStatusUpdate={onVisitUpdate}
            loading={asyncState.visitUpdate}
          />

          {/* LISTING FORM */}
          <ListingForm
            activeRole={activeRole}
            editListingId={editListingId}
            listingForm={listingForm}
            fieldErrors={listingFieldErrors}
            loading={asyncState.listingSubmit}
            onInputChange={handleListingInputChange}
            onToggleChange={handleListingToggleChange}
            onSubmit={handleListingSubmit}
          />

          {/* CONSTRUCTION SERVICES */}
          <article className="seller-dashboard-service-card">
            <div className="realestate-section-heading">
              <h2>Construction & services</h2>
              <p>Request maintenance, repairs, and construction services.</p>
            </div>
            <div className="seller-dashboard-service-grid">
              {CONSTRUCTION_SERVICES.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  className={`seller-dashboard-service-btn ${selectedService === service.id ? "active" : ""}`}
                  onClick={() => handleConstructionRequest(service.id)}
                >
                  <strong>{service.title}</strong>
                  <span>{service.description}</span>
                </button>
              ))}
            </div>
          </article>
        </div>

        {/* RIGHT: LISTINGS & MONETIZATION */}
        <aside className="seller-dashboard-right">
          {/* MY LISTINGS SUMMARY */}
          <article className="seller-dashboard-listings-summary">
            <div className="realestate-section-heading">
              <h2>My listings</h2>
              <p>{userListings.length} active properties</p>
            </div>
            {userListings.length === 0 ? (
              <div className="seller-dashboard-empty">
                <p>No listings yet. Create your first property listing above.</p>
              </div>
            ) : (
              <div className="seller-dashboard-listing-list">
                {userListings.map((listing) => (
                  <div key={listing.id} className="seller-dashboard-listing-item">
                    <strong>{listing.title}</strong>
                    <span>{listing.location}</span>
                    <span>{listing.priceLabel}</span>
                    <button
                      type="button"
                      className="realestate-inline-button"
                      onClick={() => {
                        setListingForm(listing);
                        setEditListingId(listing.id);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </article>

          {/* MONETIZATION / SUBSCRIPTION */}
          <article className="seller-dashboard-monetization">
            <div className="realestate-section-heading">
              <h2>Premium features</h2>
              <p>Featured listings, featured credits, and advanced analytics.</p>
            </div>
            <div className="seller-dashboard-plan-list">
              {SUBSCRIPTION_PLANS.map((plan) => (
                <div key={plan.id} className="seller-dashboard-plan-card">
                  <strong>{plan.name}</strong>
                  <span className="seller-dashboard-plan-price">
                    ₹{Number(plan.amountInr).toLocaleString("en-IN")}/month
                  </span>
                  <span className="seller-dashboard-plan-benefit">
                    {plan.featuredCredits} featured credits
                  </span>
                  <div className="realestate-inline-actions">
                    <button
                      type="button"
                      className="realestate-primary-button"
                      onClick={() => handleSubscriptionUpgrade(plan.id, "razorpay")}
                      disabled={asyncState.payment}
                    >
                      {asyncState.payment ? "Processing..." : "Upgrade"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {subscriptionState.invoiceNumber && (
              <p className="realestate-pitch">
                Active plan: {subscriptionState.planId} | Invoice{" "}
                {subscriptionState.invoiceNumber} | Expires{" "}
                {subscriptionState.expiresOn} | Credits{" "}
                {subscriptionState.featuredCredits}
              </p>
            )}
          </article>
        </aside>
      </div>
    </div>
  );
};

export default SellerDashboard;
