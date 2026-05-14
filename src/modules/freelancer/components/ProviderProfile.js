import React from "react";

const ProviderProfile = ({ profileLoading, selectedProvider }) => (
  <article className="freelancer-panel">
    <h3>Provider Profile</h3>
    {profileLoading ? <p className="freelancer-note">Loading profile...</p> : null}
    {!profileLoading && selectedProvider ? (
      <div className="freelancer-list-grid">
        <div className="freelancer-list-item">
          <strong>{selectedProvider.name}</strong>
          <p>{selectedProvider.about || "No profile summary provided."}</p>
          <p>
            Contact protected: {selectedProvider.maskedPhoneEnabled ? "Yes" : "No"} | KYC:{" "}
            {selectedProvider.kycStatus}
          </p>
          <p>
            Reviews: {selectedProvider.reviewCount} | Rating {selectedProvider.rating}
          </p>
          <p>
            Portfolio items: {(selectedProvider.portfolio || []).length}
          </p>
        </div>
      </div>
    ) : null}
    {!profileLoading && !selectedProvider ? (
      <p className="freelancer-note">Use View Profile on a provider card to see details.</p>
    ) : null}
  </article>
);

export default ProviderProfile;
