import React from "react";

const HealthcareHero = ({ onBookDoctor, onBookLab }) => {
  return (
    <section className="healthcare-hero">
      <div className="healthcare-hero-copy">
        <h1>NilaCare Complete Digital Healthcare Ecosystem</h1>
        <p>
          Real doctor booking, lab and scan scheduling, medicine safety checks, health records vault, emergency actions,
          and family-first care flows in one place.
        </p>
        <div className="healthcare-hero-actions">
          <button type="button" className="healthcare-primary-button" onClick={onBookDoctor}>
            Book Doctor
          </button>
          <button type="button" className="healthcare-secondary-button" onClick={onBookLab}>
            Book Lab/Scan
          </button>
        </div>
        <div className="healthcare-hero-tags">
          <span>24/7 support</span>
          <span>Video consultations</span>
          <span>Home collection</span>
          <span>Records vault</span>
          <span>Emergency ready</span>
        </div>
      </div>
    </section>
  );
};

export default HealthcareHero;
