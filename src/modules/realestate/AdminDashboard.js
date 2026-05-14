import React, { useMemo, useState } from "react";
import AdminPanel from "./components/AdminPanel";

const AdminDashboard = ({
  properties,
  leadBoard,
  adminQueues,
  onModerate,
  onVerify,
  pushToast,
}) => {
  const [selectedListingId, setSelectedListingId] = useState("");
  const [moderationReason, setModerationReason] = useState("");
  const [asyncState, setAsyncState] = useState({
    moderation: false,
    verification: false,
  });

  const selectedListing = useMemo(
    () => properties.find((p) => p.id === selectedListingId),
    [properties, selectedListingId]
  );

  const unverifiedListings = useMemo(
    () => properties.filter((p) => !p.verified),
    [properties]
  );

  const suspiciousListings = useMemo(
    () =>
      properties.filter((p) => {
        const reportCount = p.reports?.length || 0;
        return reportCount > 0;
      }),
    [properties]
  );

  const handleVerifyListing = async (listingId) => {
    setAsyncState((s) => ({ ...s, verification: true }));
    try {
      await onVerify(listingId);
      pushToast("Listing verified");
    } finally {
      setAsyncState((s) => ({ ...s, verification: false }));
    }
  };

  const handleModerateListing = async () => {
    if (!moderationReason.trim()) {
      pushToast("Please provide a reason", "error");
      return;
    }

    setAsyncState((s) => ({ ...s, moderation: true }));
    try {
      await onModerate(selectedListingId, moderationReason);
      pushToast("Action taken on listing");
      setModerationReason("");
      setSelectedListingId("");
    } finally {
      setAsyncState((s) => ({ ...s, moderation: false }));
    }
  };

  return (
    <div className="realestate-shell admin-dashboard-shell">
      <section className="admin-dashboard-hero">
        <h1>Admin moderation & verification</h1>
        <p>Review listings, verify properties, and manage disputes.</p>
      </section>

      <div className="admin-dashboard-grid">
        {/* LEFT: ADMIN PANEL */}
        <div className="admin-dashboard-left">
          <AdminPanel
            properties={properties}
            leadBoard={leadBoard}
            queues={adminQueues}
          />
        </div>

        {/* CENTER: VERIFICATION QUEUE */}
        <article className="admin-dashboard-verification">
          <div className="realestate-section-heading">
            <h2>Verification queue</h2>
            <p>{unverifiedListings.length} pending verification</p>
          </div>
          {unverifiedListings.length === 0 ? (
            <p className="admin-dashboard-empty">
              All listings verified ✓
            </p>
          ) : (
            <div className="admin-dashboard-queue-list">
              {unverifiedListings.slice(0, 10).map((listing) => (
                <div
                  key={listing.id}
                  className={`admin-dashboard-queue-item ${selectedListingId === listing.id ? "active" : ""}`}
                  onClick={() => setSelectedListingId(listing.id)}
                >
                  <strong>{listing.title}</strong>
                  <span>{listing.location}</span>
                  <span className="admin-dashboard-queue-meta">
                    {listing.priceLabel} • {listing.type}
                  </span>
                  <button
                    type="button"
                    className="realestate-inline-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVerifyListing(listing.id);
                    }}
                    disabled={asyncState.verification}
                  >
                    Verify
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>

        {/* RIGHT: MODERATION & DETAILS */}
        <aside className="admin-dashboard-moderation">
          {selectedListing ? (
            <article className="admin-dashboard-detail-card">
              <div className="realestate-section-heading">
                <h2>Review listing</h2>
              </div>
              <div className="admin-dashboard-listing-details">
                <h3>{selectedListing.title}</h3>
                <p>
                  <strong>Location:</strong> {selectedListing.location}
                </p>
                <p>
                  <strong>Type:</strong> {selectedListing.type}
                </p>
                <p>
                  <strong>Price:</strong> {selectedListing.priceLabel}
                </p>
                <p>
                  <strong>Owner:</strong> {selectedListing.sellerName}
                </p>
                <p>
                  <strong>Email:</strong> {selectedListing.ownerId}
                </p>
                <p>
                  <strong>Posted:</strong>{" "}
                  {new Date(selectedListing.createdAt).toLocaleDateString()}
                </p>
                <p>
                  <strong>Reports:</strong> {selectedListing.reports?.length || 0}
                </p>
              </div>

              <label className="admin-dashboard-form-field">
                <span>Moderation action</span>
                <textarea
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  placeholder="Reason for removal / suspension / warning..."
                  rows="3"
                />
              </label>

              <div className="realestate-inline-actions">
                <button
                  type="button"
                  className="realestate-inline-button"
                  onClick={() => handleVerifyListing(selectedListing.id)}
                  disabled={asyncState.verification}
                >
                  {asyncState.verification
                    ? "Verifying..."
                    : "✓ Mark verified"}
                </button>
                <button
                  type="button"
                  className="realestate-inline-button danger"
                  onClick={handleModerateListing}
                  disabled={asyncState.moderation}
                >
                  {asyncState.moderation ? "Processing..." : "⚠ Flag listing"}
                </button>
              </div>
            </article>
          ) : (
            <div className="admin-dashboard-empty-state">
              <h3>Select a listing</h3>
              <p>Click a listing to view details and take moderation action.</p>
            </div>
          )}

          {/* SUSPICIOUS LISTINGS */}
          <article className="admin-dashboard-suspicious">
            <div className="realestate-section-heading">
              <h2>Reported listings</h2>
              <p>{suspiciousListings.length} with reports</p>
            </div>
            {suspiciousListings.length === 0 ? (
              <p className="admin-dashboard-empty">No reports</p>
            ) : (
              <div className="admin-dashboard-suspicious-list">
                {suspiciousListings.slice(0, 5).map((listing) => (
                  <button
                    key={listing.id}
                    type="button"
                    className="admin-dashboard-suspicious-item"
                    onClick={() => setSelectedListingId(listing.id)}
                  >
                    <strong>{listing.title}</strong>
                    <span>
                      {listing.reports?.length || 0} report
                      {(listing.reports?.length || 0) !== 1 ? "s" : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </article>
        </aside>
      </div>
    </div>
  );
};

export default AdminDashboard;
