import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import Ecommerce from "./Ecommerce";
import { API_BASE_URL } from "../../utils/api";
import "../../styles/GlobeMartEntry.css";

const SELLER_ONBOARDING_PLANS = [
  {
    id: "basic",
    name: "Basic Seller",
    registrationFee: 499,
    monthlyFee: 0,
    transactionFee: "12%",
    description: "Entry-level seller tier with no monthly commitment.",
  },
  {
    id: "growth",
    name: "Growth Seller",
    registrationFee: 999,
    monthlyFee: 999,
    transactionFee: "8%",
    description: "Best for growing sellers with lower commission.",
  },
  {
    id: "pro",
    name: "Pro Seller",
    registrationFee: 4999,
    monthlyFee: 4999,
    transactionFee: "4%",
    description: "Premium seller tier with priority support and analytics.",
  },
];

const GlobeMartEntry = ({ globeMartCategories = [], loggedInUser = null }) => {
  const normalizedEmail = useMemo(
    () => String(loggedInUser?.email || "").trim().toLowerCase(),
    [loggedInUser?.email]
  );
  const isNativeSeller =
    loggedInUser?.registrationType === "entrepreneur" || loggedInUser?.role === "business";
  const [entryMode, setEntryMode] = useState("");
  const [sellerRegistration, setSellerRegistration] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState(SELLER_ONBOARDING_PLANS[0].id);
  const [registrationForm, setRegistrationForm] = useState({
    businessName: loggedInUser?.businessName || "",
    sellerName: loggedInUser?.name || "",
    phone: loggedInUser?.phone || "",
    city: loggedInUser?.location || "",
  });
  const [registrationError, setRegistrationError] = useState("");

  const selectedPlan =
    SELLER_ONBOARDING_PLANS.find((plan) => plan.id === selectedPlanId) ||
    SELLER_ONBOARDING_PLANS[0];

  useEffect(() => {
    setEntryMode("");
    setRegistrationError("");
  }, [normalizedEmail]);

  useEffect(() => {
    setRegistrationForm({
      businessName: loggedInUser?.businessName || "",
      sellerName: loggedInUser?.name || "",
      phone: loggedInUser?.phone || "",
      city: loggedInUser?.location || "",
    });
  }, [loggedInUser?.businessName, loggedInUser?.location, loggedInUser?.name, loggedInUser?.phone]);

  const openBuyerPage = () => {
    setEntryMode("buyer");
    setRegistrationError("");
  };

  const openSellerFlow = () => {
    setRegistrationError("");
    if (isNativeSeller || sellerRegistration?.registeredAt) {
      setEntryMode("seller");
      return;
    }

    setEntryMode("seller-registration");
  };

  const handleRegistrationFieldChange = (event) => {
    const { name, value } = event.target;
    setRegistrationForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleSellerRegistration = async (event) => {
    event.preventDefault();

    const businessName = String(registrationForm.businessName || "").trim();
    const sellerName = String(registrationForm.sellerName || "").trim();
    const phone = String(registrationForm.phone || "").trim();
    const city = String(registrationForm.city || "").trim();
    const selectedPlan = SELLER_ONBOARDING_PLANS.find((plan) => plan.id === selectedPlanId);

    if (!businessName || !sellerName || !phone) {
      setRegistrationError("Business name, seller name, and phone are required.");
      return;
    }

    if (!selectedPlan) {
      setRegistrationError("Please choose a seller plan to continue.");
      return;
    }

    if (!normalizedEmail) {
      setRegistrationError("Seller email is required to complete registration.");
      return;
    }

    const formData = new FormData();
    formData.append('applicantName', sellerName);
    formData.append('businessName', businessName);
    formData.append('email', normalizedEmail);
    formData.append('registrationType', 'entrepreneur');
    formData.append('phone', phone);
    formData.append('location', city);
    formData.append('registrationFee', String(selectedPlan.registrationFee));
    formData.append('monthlyFee', String(selectedPlan.monthlyFee));
    formData.append('transactionFee', selectedPlan.transactionFee);
    formData.append('planId', selectedPlan.id);
    formData.append('planName', selectedPlan.name);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/app-data/registration-applications`,
        formData
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Seller registration could not be saved.');
      }

      setSellerRegistration({
        registeredAt: new Date().toISOString(),
        selectedPlan,
      });
      setRegistrationError("");
      setEntryMode("seller");
    } catch (error) {
      setRegistrationError(
        error?.response?.data?.message ||
          error?.message ||
          "Seller registration could not be saved. Please try again."
      );
    }
  };

  if (entryMode === "buyer") {
    return <Ecommerce globeMartCategories={globeMartCategories} entryMode="buyer" />;
  }

  if (entryMode === "seller") {
    return <Ecommerce globeMartCategories={globeMartCategories} entryMode="seller" />;
  }

  if (entryMode === "seller-registration") {
    return (
      <section className="globemart-entry-shell" aria-label="GlobeMart seller registration">
        <div className="globemart-entry-card">
          <h2>GlobeMart Seller Registration</h2>
          <p>Complete this one-time registration to open your seller workspace.</p>
          <form className="globemart-registration-form" onSubmit={handleSellerRegistration}>
            <div className="globemart-plan-section">
              <p className="plan-section-title">Select your seller plan</p>
              <div className="globemart-plan-options">
                {SELLER_ONBOARDING_PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    className={`globemart-plan-card ${selectedPlanId === plan.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <div className="plan-card-header">
                      <strong>{plan.name}</strong>
                      <span className="plan-amount">₹{plan.registrationFee}</span>
                    </div>
                    <p className="plan-description">{plan.description}</p>
                    <div className="plan-meta">
                      <span>{plan.monthlyFee === 0 ? 'Free monthly' : `₹${plan.monthlyFee}/mo`}</span>
                      <span>{plan.transactionFee} transaction fee</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="globemart-plan-summary">
                <div>
                  <span>Selected plan</span>
                  <strong>{selectedPlan.name}</strong>
                </div>
                <div>
                  <span>Registration fee</span>
                  <strong>₹{selectedPlan.registrationFee}</strong>
                </div>
                <div>
                  <span>Monthly fee</span>
                  <strong>{selectedPlan.monthlyFee === 0 ? 'Free' : `₹${selectedPlan.monthlyFee}/month`}</strong>
                </div>
                <div>
                  <span>Transaction fee</span>
                  <strong>{selectedPlan.transactionFee}</strong>
                </div>
              </div>
            </div>

            <label>
              <span>Business Name</span>
              <input
                type="text"
                name="businessName"
                value={registrationForm.businessName}
                onChange={handleRegistrationFieldChange}
                placeholder="Enter your business name"
              />
            </label>
            <label>
              <span>Seller Name</span>
              <input
                type="text"
                name="sellerName"
                value={registrationForm.sellerName}
                onChange={handleRegistrationFieldChange}
                placeholder="Enter your name"
              />
            </label>
            <label>
              <span>Phone Number</span>
              <input
                type="tel"
                name="phone"
                value={registrationForm.phone}
                onChange={handleRegistrationFieldChange}
                placeholder="Enter phone number"
              />
            </label>
            <label>
              <span>City</span>
              <input
                type="text"
                name="city"
                value={registrationForm.city}
                onChange={handleRegistrationFieldChange}
                placeholder="Enter your city"
              />
            </label>
            {registrationError ? (
              <p className="globemart-entry-error" role="alert">
                {registrationError}
              </p>
            ) : null}
            <div className="globemart-entry-actions">
              <button type="submit" className="btn btn-primary">
                Complete Registration
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setEntryMode("")}
              >
                Back
              </button>
            </div>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="globemart-entry-shell" aria-label="GlobeMart role selection">
      <div className="globemart-entry-card">
        <h2>Choose Your GlobeMart Experience</h2>
        <p>Select how you want to continue.</p>
        <div className="globemart-entry-actions">
          <button type="button" className="btn btn-primary" onClick={openBuyerPage}>
            Continue as Buyer
          </button>
          <button type="button" className="btn btn-outline" onClick={openSellerFlow}>
            Continue as Seller
          </button>
        </div>
        {!isNativeSeller && sellerRegistration?.registeredAt ? (
          <p className="globemart-entry-note">
            Seller registration already completed on{" "}
            {new Date(sellerRegistration.registeredAt).toLocaleDateString("en-IN")}
            .
          </p>
        ) : null}
      </div>
    </section>
  );
};

GlobeMartEntry.propTypes = {
  globeMartCategories: PropTypes.array,
  loggedInUser: PropTypes.shape({
    email: PropTypes.string,
    name: PropTypes.string,
    phone: PropTypes.string,
    location: PropTypes.string,
    businessName: PropTypes.string,
    role: PropTypes.string,
    registrationType: PropTypes.string,
  }),
};

export default GlobeMartEntry;
