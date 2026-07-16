import React, { useMemo, useState } from "react";
import AdminPanel from "./components/AdminPanel";
import { MARKET_TRENDS } from "./realEstateConstants";

/**
 * AdminDashboard — Professional upgrade
 * - Analytics cards: total, verified %, RERA %, avg price, leads pipeline
 * - RERA compliance overview
 * - Bulk verify action
 * - Suspicious listings panel with report details
 * - Market demand overlay
 */

const TRUST_FLAGS = [
  { key: "verified", label: "Owner verified" },
  { key: "reraNumber", label: "RERA number", check: (p) => Boolean(p.reraNumber) },
  { key: "titleDeedStatus", label: "Title deed", check: (p) => p.titleDeedStatus === "verified" },
  { key: "taxReceipt", label: "Tax receipt" },
  { key: "buildingPermit", label: "Building permit" },
  { key: "encumbranceCertificate", label: "Encumbrance cert" },
];

const StatCard = ({ label, value, sub, accent }) => (
  <div className={`re-admin-stat-card ${accent ? `re-admin-stat-accent-${accent}` : ""}`}>
    <div className="re-admin-stat-value">{value}</div>
    <div className="re-admin-stat-label">{label}</div>
    {sub && <div className="re-admin-stat-sub">{sub}</div>}
  </div>
);

const AdminDashboard = ({
  properties = [],
  leadBoard,
  adminQueues,
  onModerate,
  onVerify,
  pushToast,
}) => {
  const [selectedListingId, setSelectedListingId] = useState("");
  const [moderationReason, setModerationReason] = useState("");
  const [activeTab, setActiveTab] = useState("queue"); // queue | reports | rera | analytics
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [asyncState, setAsyncState] = useState({
    moderation: false,
    verification: false,
    bulk: false,
  });

  // ── Derived analytics ────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const total = properties.length;
    const verified = properties.filter((p) => p.verified).length;
    const withRera = properties.filter((p) => p.reraNumber).length;
    const readyToMove = properties.filter((p) => p.readyToMove).length;
    const forSale = properties.filter((p) => p.intent === "sale").length;
    const forRent = properties.filter((p) => p.intent === "rent").length;
    const totalLeads = properties.reduce((s, p) => s + (p.leads?.length || 0), 0);
    const totalReports = properties.reduce((s, p) => s + (p.reports?.length || 0), 0);
    const disputed = properties.filter((p) => (p.reports?.length || 0) > 0).length;

    const priceValues = properties.filter((p) => p.priceValue > 0).map((p) => p.priceValue);
    const avgPrice = priceValues.length
      ? Math.round(priceValues.reduce((s, v) => s + v, 0) / priceValues.length)
      : 0;

    const cityMap = {};
    properties.forEach((p) => {
      const c = (p.location || "Unknown").trim();
      cityMap[c] = (cityMap[c] || 0) + 1;
    });
    const topCities = Object.entries(cityMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([city, count]) => ({ city, count }));

    const typeMap = {};
    properties.forEach((p) => { typeMap[p.type] = (typeMap[p.type] || 0) + 1; });
    const byType = Object.entries(typeMap).sort((a, b) => b[1] - a[1]).map(([type, count]) => ({ type, count }));

    const leadStages = {};
    properties.forEach((p) =>
      (p.leads || []).forEach((l) => {
        leadStages[l.status] = (leadStages[l.status] || 0) + 1;
      })
    );

    return {
      total, verified, withRera, readyToMove, forSale, forRent,
      totalLeads, totalReports, disputed, avgPrice, topCities, byType, leadStages,
      verifiedPct: total > 0 ? Math.round((verified / total) * 100) : 0,
      reraPct: total > 0 ? Math.round((withRera / total) * 100) : 0,
    };
  }, [properties]);

  const unverifiedListings = useMemo(
    () => properties.filter((p) => !p.verified),
    [properties]
  );

  const suspiciousListings = useMemo(
    () => properties.filter((p) => (p.reports?.length || 0) > 0)
      .sort((a, b) => (b.reports?.length || 0) - (a.reports?.length || 0)),
    [properties]
  );

  const reraIssues = useMemo(
    () => properties.filter((p) => !p.reraNumber && p.intent !== "rent"),
    [properties]
  );

  const selectedListing = useMemo(
    () => properties.find((p) => p.id === selectedListingId),
    [properties, selectedListingId]
  );

  // ── Actions ──────────────────────────────────────────────────────────
  const handleVerifyListing = async (listingId) => {
    setAsyncState((s) => ({ ...s, verification: true }));
    try {
      await onVerify(listingId);
      pushToast("Listing verified successfully");
    } catch {
      pushToast("Verification failed", "error");
    } finally {
      setAsyncState((s) => ({ ...s, verification: false }));
    }
  };

  const handleModerateListing = async () => {
    if (!moderationReason.trim()) {
      pushToast("Provide a reason before flagging", "error");
      return;
    }
    setAsyncState((s) => ({ ...s, moderation: true }));
    try {
      await onModerate(selectedListingId, moderationReason);
      pushToast("Moderation action taken");
      setModerationReason("");
      setSelectedListingId("");
    } catch {
      pushToast("Moderation failed", "error");
    } finally {
      setAsyncState((s) => ({ ...s, moderation: false }));
    }
  };

  const handleBulkToggle = (id) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkVerify = async () => {
    if (bulkSelected.size === 0) { pushToast("Select at least one listing", "info"); return; }
    setAsyncState((s) => ({ ...s, bulk: true }));
    let done = 0;
    for (const id of bulkSelected) {
      try { await onVerify(id); done++; } catch { /* continue */ }
    }
    pushToast(`${done} listing${done !== 1 ? "s" : ""} verified`);
    setBulkSelected(new Set());
    setAsyncState((s) => ({ ...s, bulk: false }));
  };

  const maxCityCount = analytics.topCities[0]?.count || 1;

  return (
    <div className="realestate-shell admin-dashboard-shell">
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="re-admin-hero">
        <div>
          <h1>Admin — Moderation &amp; Analytics</h1>
          <p>Review listings, verify properties, track compliance, and monitor platform health.</p>
        </div>
        <div className="re-admin-hero-meta">
          <span>Last refresh: {new Date().toLocaleTimeString("en-IN", { timeStyle: "short" })}</span>
        </div>
      </section>

      {/* ── ANALYTICS CARDS ───────────────────────────────────────────── */}
      <div className="re-admin-stats-row">
        <StatCard label="Total listings" value={analytics.total} />
        <StatCard
          label="Verified"
          value={`${analytics.verifiedPct}%`}
          sub={`${analytics.verified} of ${analytics.total}`}
          accent="green"
        />
        <StatCard
          label="RERA registered"
          value={`${analytics.reraPct}%`}
          sub={`${analytics.withRera} listings`}
          accent="blue"
        />
        <StatCard
          label="Avg price"
          value={`₹${analytics.avgPrice}L`}
          sub="across all listings"
        />
        <StatCard
          label="Total leads"
          value={analytics.totalLeads}
          sub={`${analytics.disputed} disputed`}
          accent={analytics.disputed > 0 ? "amber" : undefined}
        />
        <StatCard
          label="Ready to move"
          value={analytics.readyToMove}
          sub={`${analytics.forSale} for sale · ${analytics.forRent} rental`}
        />
      </div>

      {/* ── TABS ──────────────────────────────────────────────────────── */}
      <div className="re-admin-tabs" role="tablist">
        {[
          { id: "queue", label: `Verify queue (${unverifiedListings.length})` },
          { id: "reports", label: `Reports (${suspiciousListings.length})` },
          { id: "rera", label: `RERA issues (${reraIssues.length})` },
          { id: "analytics", label: "Analytics" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`re-admin-tab ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="re-admin-body">
        {/* ── LEFT PANEL (tab content) ──────────────────────────────── */}
        <div className="re-admin-left">

          {/* VERIFY QUEUE */}
          {activeTab === "queue" && (
            <article className="re-admin-panel-card">
              <div className="realestate-section-heading">
                <h2>Verification queue</h2>
                <p>{unverifiedListings.length} pending · {bulkSelected.size} selected</p>
              </div>
              {unverifiedListings.length === 0 ? (
                <p className="re-admin-empty">All listings are verified ✓</p>
              ) : (
                <>
                  <div className="re-admin-bulk-bar">
                    <button
                      type="button"
                      className="realestate-inline-button"
                      onClick={() =>
                        setBulkSelected(new Set(unverifiedListings.map((p) => p.id)))
                      }
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="realestate-inline-button"
                      onClick={() => setBulkSelected(new Set())}
                    >
                      Deselect
                    </button>
                    <button
                      type="button"
                      className="realestate-primary-button"
                      onClick={handleBulkVerify}
                      disabled={asyncState.bulk || bulkSelected.size === 0}
                    >
                      {asyncState.bulk ? "Verifying…" : `Bulk verify (${bulkSelected.size})`}
                    </button>
                  </div>
                  <div className="re-admin-queue-list">
                    {unverifiedListings.slice(0, 20).map((listing) => (
                      <div
                        key={listing.id}
                        className={`re-admin-queue-item ${selectedListingId === listing.id ? "active" : ""}`}
                        onClick={() => setSelectedListingId(listing.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && setSelectedListingId(listing.id)}
                      >
                        <input
                          type="checkbox"
                          checked={bulkSelected.has(listing.id)}
                          onChange={(e) => { e.stopPropagation(); handleBulkToggle(listing.id); }}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${listing.title}`}
                        />
                        <div className="re-admin-queue-info">
                          <strong>{listing.title}</strong>
                          <span>{listing.location} · {listing.type} · {listing.priceLabel}</span>
                          <span className="re-admin-queue-seller">{listing.sellerName} ({listing.sellerRole})</span>
                        </div>
                        <div className="re-admin-queue-actions">
                          <button
                            type="button"
                            className="realestate-inline-button"
                            onClick={(e) => { e.stopPropagation(); handleVerifyListing(listing.id); }}
                            disabled={asyncState.verification}
                          >
                            ✓ Verify
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </article>
          )}

          {/* REPORTED LISTINGS */}
          {activeTab === "reports" && (
            <article className="re-admin-panel-card">
              <div className="realestate-section-heading">
                <h2>Reported listings</h2>
                <p>{suspiciousListings.length} with active reports · {analytics.totalReports} total reports</p>
              </div>
              {suspiciousListings.length === 0 ? (
                <p className="re-admin-empty">No reports — platform looks clean ✓</p>
              ) : (
                <div className="re-admin-reports-list">
                  {suspiciousListings.map((listing) => (
                    <div
                      key={listing.id}
                      className={`re-admin-queue-item ${selectedListingId === listing.id ? "active" : ""}`}
                      onClick={() => setSelectedListingId(listing.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setSelectedListingId(listing.id)}
                    >
                      <div className="re-admin-queue-info">
                        <strong>{listing.title}</strong>
                        <span>{listing.location} · {listing.sellerName}</span>
                        <div className="re-admin-report-reasons">
                          {(listing.reports || []).slice(0, 2).map((r, i) => (
                            <span key={i} className="re-admin-report-chip">{r.reason}</span>
                          ))}
                          {listing.reports?.length > 2 && (
                            <span className="re-admin-report-chip">+{listing.reports.length - 2} more</span>
                          )}
                        </div>
                      </div>
                      <span className="re-admin-report-count">
                        {listing.reports?.length || 0} report{listing.reports?.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          )}

          {/* RERA COMPLIANCE */}
          {activeTab === "rera" && (
            <article className="re-admin-panel-card">
              <div className="realestate-section-heading">
                <h2>RERA compliance</h2>
                <p>{reraIssues.length} sale/project listings without RERA number</p>
              </div>
              <div className="re-admin-rera-summary">
                <div className="re-admin-rera-stat">
                  <strong>{analytics.withRera}</strong>
                  <span>RERA registered</span>
                </div>
                <div className="re-admin-rera-stat">
                  <strong>{reraIssues.length}</strong>
                  <span>Missing RERA</span>
                </div>
                <div className="re-admin-rera-stat">
                  <strong>{analytics.reraPct}%</strong>
                  <span>Compliance rate</span>
                </div>
              </div>
              {/* RERA compliance bar */}
              <div className="re-admin-compliance-bar-track">
                <div
                  className="re-admin-compliance-bar-fill"
                  style={{ width: `${analytics.reraPct}%` }}
                />
              </div>
              <p className="re-admin-rera-note">
                Under RERA Act 2016, all residential projects above 500 sq m or 8 units require registration.
              </p>
              {reraIssues.length > 0 && (
                <div className="re-admin-queue-list" style={{ marginTop: "0.75rem" }}>
                  {reraIssues.slice(0, 15).map((listing) => (
                    <div
                      key={listing.id}
                      className={`re-admin-queue-item ${selectedListingId === listing.id ? "active" : ""}`}
                      onClick={() => setSelectedListingId(listing.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setSelectedListingId(listing.id)}
                    >
                      <div className="re-admin-queue-info">
                        <strong>{listing.title}</strong>
                        <span>{listing.location} · {listing.type} · {listing.priceLabel}</span>
                      </div>
                      <span className="re-admin-rera-missing">No RERA</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === "analytics" && (
            <article className="re-admin-panel-card">
              <div className="realestate-section-heading">
                <h2>Platform analytics</h2>
                <p>Listing distribution, city heat map, and lead pipeline.</p>
              </div>

              {/* Listings by city */}
              <h4 className="re-admin-chart-title">Listings by city</h4>
              <div className="re-admin-city-bars">
                {analytics.topCities.map(({ city, count }) => (
                  <div key={city} className="re-admin-city-bar-row">
                    <span className="re-admin-city-bar-label">{city}</span>
                    <div className="re-admin-city-bar-track">
                      <div
                        className="re-admin-city-bar-fill"
                        style={{ width: `${Math.round((count / maxCityCount) * 100)}%` }}
                      />
                    </div>
                    <span className="re-admin-city-bar-count">{count}</span>
                  </div>
                ))}
              </div>

              {/* Listings by type */}
              <h4 className="re-admin-chart-title" style={{ marginTop: "1.25rem" }}>By property type</h4>
              <div className="re-admin-type-chips">
                {analytics.byType.map(({ type, count }) => (
                  <span key={type} className="re-admin-type-chip">
                    {type} <strong>{count}</strong>
                  </span>
                ))}
              </div>

              {/* Lead pipeline */}
              <h4 className="re-admin-chart-title" style={{ marginTop: "1.25rem" }}>Lead pipeline stages</h4>
              <div className="re-admin-pipeline">
                {Object.entries(analytics.leadStages).map(([stage, count]) => (
                  <div key={stage} className="re-admin-pipeline-item">
                    <span>{stage}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
                {Object.keys(analytics.leadStages).length === 0 && (
                  <p className="re-admin-empty">No active leads yet.</p>
                )}
              </div>

              {/* Market demand overlay */}
              <h4 className="re-admin-chart-title" style={{ marginTop: "1.25rem" }}>Market demand signals</h4>
              <div className="re-admin-market-grid">
                {Object.entries(MARKET_TRENDS).map(([city, data]) => (
                  <div key={city} className="re-admin-market-card">
                    <strong>{city}</strong>
                    <span className="re-admin-market-growth">+{data.yoyGrowthPct}% YoY</span>
                    <span className="re-admin-market-demand">{data.demandIndex} demand</span>
                    <span>₹{data.avgPricePerSqft.toLocaleString("en-IN")}/sqft</span>
                  </div>
                ))}
              </div>
            </article>
          )}
        </div>

        {/* ── RIGHT PANEL (selected listing + admin panel) ─────────── */}
        <aside className="re-admin-right">
          {selectedListing ? (
            <article className="re-admin-detail-card">
              <div className="realestate-section-heading">
                <h2>Review listing</h2>
                <button
                  type="button"
                  className="re-admin-close"
                  onClick={() => setSelectedListingId("")}
                >✕</button>
              </div>

              <div className="re-admin-listing-details">
                <h3>{selectedListing.title}</h3>
                <div className="re-admin-detail-grid">
                  <span><strong>Location</strong>{selectedListing.location}</span>
                  <span><strong>Type</strong>{selectedListing.type}</span>
                  <span><strong>Price</strong>{selectedListing.priceLabel}</span>
                  <span><strong>Owner</strong>{selectedListing.sellerName}</span>
                  <span><strong>Role</strong>{selectedListing.sellerRole}</span>
                  <span><strong>RERA</strong>{selectedListing.reraNumber || "—"}</span>
                  <span><strong>Reports</strong>{selectedListing.reports?.length || 0}</span>
                  <span><strong>Leads</strong>{selectedListing.leads?.length || 0}</span>
                  <span><strong>Status</strong>{selectedListing.verificationStatus}</span>
                  <span><strong>Posted</strong>{selectedListing.postedOn}</span>
                </div>
              </div>

              {/* Trust flag summary */}
              <div className="re-admin-trust-flags">
                {TRUST_FLAGS.map((f) => {
                  const ok = f.check ? f.check(selectedListing) : Boolean(selectedListing[f.key]);
                  return (
                    <span key={f.key} className={`re-admin-trust-chip ${ok ? "ok" : "warn"}`}>
                      {ok ? "✓" : "✗"} {f.label}
                    </span>
                  );
                })}
              </div>

              <label className="realestate-field" style={{ marginTop: "0.75rem" }}>
                <span>Moderation reason</span>
                <textarea
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  placeholder="Reason for flag / removal / suspension…"
                  rows={3}
                />
              </label>

              <div className="re-admin-action-row">
                <button
                  type="button"
                  className="realestate-inline-button"
                  onClick={() => handleVerifyListing(selectedListing.id)}
                  disabled={asyncState.verification}
                >
                  {asyncState.verification ? "Verifying…" : "✓ Mark verified"}
                </button>
                <button
                  type="button"
                  className="realestate-inline-button danger"
                  onClick={handleModerateListing}
                  disabled={asyncState.moderation}
                >
                  {asyncState.moderation ? "Processing…" : "⚠ Flag listing"}
                </button>
              </div>
            </article>
          ) : (
            <div className="re-admin-empty-state">
              <span>📋</span>
              <h3>Select a listing</h3>
              <p>Click any row to review details, documents, and take moderation action.</p>
            </div>
          )}

          {/* ADMIN PANEL */}
          <AdminPanel
            properties={properties}
            leadBoard={leadBoard}
            queues={adminQueues}
          />
        </aside>
      </div>
    </div>
  );
};

export default AdminDashboard;
