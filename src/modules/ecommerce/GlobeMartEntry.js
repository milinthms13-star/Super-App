import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import Ecommerce from "./Ecommerce";
import "../../styles/GlobeMartEntry.css";

const SELLER_REGISTRATION_STORAGE_PREFIX = "malabarbazaar:globemart:seller-registration:v1";

const getSellerRegistrationStorageKey = (email = "") =>
  `${SELLER_REGISTRATION_STORAGE_PREFIX}:${String(email || "guest").trim().toLowerCase()}`;

const readSellerRegistration = (email = "") => {
  try {
    const rawValue = localStorage.getItem(getSellerRegistrationStorageKey(email));
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed;
  } catch (error) {
    return null;
  }
};

const GlobeMartEntry = ({ globeMartCategories = [], loggedInUser = null }) => {
  const normalizedEmail = useMemo(
    () => String(loggedInUser?.email || "").trim().toLowerCase(),
    [loggedInUser?.email]
  );
  const isNativeSeller =
    loggedInUser?.registrationType === "entrepreneur" || loggedInUser?.role === "business";
  const [entryMode, setEntryMode] = useState("");
  const [sellerRegistration, setSellerRegistration] = useState(() =>
    readSellerRegistration(normalizedEmail)
  );
  const [registrationForm, setRegistrationForm] = useState({
    businessName: loggedInUser?.businessName || "",
    sellerName: loggedInUser?.name || "",
    phone: loggedInUser?.phone || "",
    city: loggedInUser?.location || "",
  });
  const [registrationError, setRegistrationError] = useState("");

  useEffect(() => {
    setEntryMode("");
    setSellerRegistration(readSellerRegistration(normalizedEmail));
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

  const handleSellerRegistration = (event) => {
    event.preventDefault();

    const businessName = String(registrationForm.businessName || "").trim();
    const sellerName = String(registrationForm.sellerName || "").trim();
    const phone = String(registrationForm.phone || "").trim();
    const city = String(registrationForm.city || "").trim();

    if (!businessName || !sellerName || !phone) {
      setRegistrationError("Business name, seller name, and phone are required.");
      return;
    }

    const savedRegistration = {
      businessName,
      sellerName,
      phone,
      city,
      registeredAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(
        getSellerRegistrationStorageKey(normalizedEmail),
        JSON.stringify(savedRegistration)
      );
    } catch (error) {
      setRegistrationError("Seller registration could not be saved. Please try again.");
      return;
    }

    setSellerRegistration(savedRegistration);
    setRegistrationError("");
    setEntryMode("seller");
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
