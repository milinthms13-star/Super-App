import React, { useMemo, useState } from "react";
import { formatDateTime } from "../classifiedsUtils";

const TAB_IDS = [
  { id: "overview", label: "Overview" },
  { id: "media", label: "Media" },
  { id: "documents", label: "Documents" },
  { id: "messages", label: "Messages" },
  { id: "reviews", label: "Reviews" },
  { id: "actions", label: "Actions" },
];

const buildMissingDocs = (l) => {
  const missing = [];
  if (!l.verified) missing.push({ key: "verified", label: "Seller verification" });
  if (!l.warranty) missing.push({ key: "warranty", label: "Warranty details" });
  if (!l.originalReceipt) missing.push({ key: "originalReceipt", label: "Original receipt" });
  return missing;
};

const trustSummary = (l) => {
  const flags = [
    { key: "verified", label: l.verified ? "Seller verified" : "Seller verification pending", ok: Boolean(l.verified) },
    { key: "sellerRating", label: `Seller rating: ${l.sellerRating || 0}/5`, ok: (l.sellerRating || 0) >= 4 },
    { key: "condition", label: `Condition: ${l.condition}`, ok: l.condition === "New" },
    { key: "warranty", label: l.warranty ? "Warranty available" : "Warranty pending", ok: Boolean(l.warranty) },
    { key: "originalReceipt", label: l.originalReceipt ? "Original receipt available" : "Original receipt pending", ok: Boolean(l.originalReceipt) },
  ];

  const okCount = flags.filter((f) => f.ok).length;
  const score = Math.round((okCount / flags.length) * 100);
  const missing = buildMissingDocs(l);
  const status = score >= 80 ? "High trust" : score >= 50 ? "Good trust" : "Trust pending";

  return { score, status, flags, missing };
};

const ListingDetailTabs = ({
  listing,
  canManage,
  uiMessages,
}) => {
  const [activeTab, setActiveTab] = useState("overview");

  const summary = useMemo(() => (listing ? trustSummary(listing) : null), [listing]);

  if (!listing) {
    return (
      <div className="classifieds-empty-state classifieds-empty-state-actions">
        <h3>Select a listing</h3>
        <p>Choose any listing card from the left panel to view details, media, documents, messages, and actions.</p>
      </div>
    );
  }

  return (
    <>
      <div className="classifieds-detail-tabs">
        <div className="classifieds-detail-tabs-row" role="tablist" aria-label="Listing details tabs">
          {TAB_IDS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`classifieds-tab ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
              role="tab"
              aria-selected={activeTab === t.id}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="classifieds-trust-panel" aria-label="Trust and document status">
          <div className="classifieds-trust-panel-top">
            <div>
              <div className="classifieds-trust-badge">{summary.status}</div>
              <div className="classifieds-trust-score">Trust score: {summary.score}/100</div>
            </div>
            <div className="classifieds-trust-ctas">
              <button type="button" className="classifieds-inline-button" onClick={uiMessages?.onRequestDocuments}>
                Request documents
              </button>
              <button type="button" className="classifieds-inline-button" onClick={uiMessages?.onViewVerificationHistory}>
                Verification history
              </button>
            </div>
          </div>

          <div className="classifieds-trust-docs">
            {summary.missing.length ? (
              <div className="classifieds-trust-docs-warn">
                Missing / pending: {summary.missing.map((m) => m.label).join(", ")}
              </div>
            ) : (
              <div className="classifieds-trust-docs-ok">All key documents are available for this listing.</div>
            )}
          </div>
        </div>
      </div>

      {activeTab === "overview" ? (
        <div className="classifieds-detail-tab-body">
          <div className="classifieds-detail-price-row">
            <strong>{listing.priceLabel}</strong>
            <span>
              {listing.category} | {listing.condition}
            </span>
          </div>

          <div className="classifieds-detail-specs">
            <span>{listing.brand || "Generic"}</span>
            <span>{listing.condition}</span>
            {listing.warranty && <span>Warranty: {listing.warranty}</span>}
          </div>

          <p className="classifieds-description">{listing.description}</p>

          <div className="classifieds-contact-card">
            <strong>{listing.sellerName || listing.listedBy}</strong>
            <span>
              Seller | Rating: {listing.sellerRating || 0}/5
            </span>
            {listing.contactPhone ? <span>Call: {listing.contactPhone}</span> : null}
            {listing.whatsappNumber ? <span>WhatsApp: {listing.whatsappNumber}</span> : null}
          </div>

          <div className="classifieds-trust-flags-grid">
            {summary.flags.map((f) => (
              <div key={f.key} className={`classifieds-trust-flag ${f.ok ? "ok" : "warn"}`}>
                <span className={`classifieds-trust-flag-dot ${f.ok ? "ok" : "warn"}`} />
                <div>
                  <strong>{f.label}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="classifieds-detail-quickmeta">
            <span>Listed: {formatDateTime(listing.postedOn)}</span>
            <span>Views: {listing.views || 0}</span>
            <span>Media: {listing.mediaGallery?.length || listing.mediaCount || 0} assets</span>
          </div>
        </div>
      ) : null}

      {activeTab === "media" ? (
        <div className="classifieds-detail-tab-body">
          <div className="classifieds-detail-media-grid">
            {listing.mediaGallery?.length > 0 ? (
              listing.mediaGallery.slice(0, 8).map((media) => (
                <div key={media.id} className="classifieds-detail-media-item">
                  {media.type === "image" ? <img src={media.url} alt={media.label || listing.title} /> : null}
                  {media.type !== "image" ? (
                    <a href={media.url} target="_blank" rel="noreferrer">
                      {media.type === "video" ? "Video" : media.type === "document" ? "Document" : "Media"}
                    </a>
                  ) : null}
                  <span>{media.label || media.type}</span>
                </div>
              ))
            ) : (
              <div className="classifieds-detail-media">
                <strong>Media gallery available</strong>
                <span>{listing.mediaCount} media assets</span>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "documents" ? (
        <div className="classifieds-detail-tab-body">
          <div className="classifieds-docs-card">
            <div className="classifieds-section-heading">
              <h3>Verification & documents</h3>
              <p>Transparent status for seller verification and key documents.</p>
            </div>

            <div className="classifieds-docs-grid">
              <div className="classifieds-docs-item">
                <span className={`classifieds-docs-dot ${listing.verified ? "ok" : "warn"}`} />
                <div>
                  <strong>Seller verification</strong>
                  <span>{listing.verified ? "Seller verified" : "Verification pending"}</span>
                </div>
              </div>

              <div className="classifieds-docs-item">
                <span className={`classifieds-docs-dot ${listing.sellerRating >= 4 ? "ok" : "warn"}`} />
                <div>
                  <strong>Seller rating</strong>
                  <span>{listing.sellerRating || 0}/5</span>
                </div>
              </div>

              <div className="classifieds-docs-item">
                <span className={`classifieds-docs-dot ${listing.condition === "New" ? "ok" : "warn"}`} />
                <div>
                  <strong>Condition</strong>
                  <span>{listing.condition}</span>
                </div>
              </div>

              <div className="classifieds-docs-item">
                <span className={`classifieds-docs-dot ${listing.warranty ? "ok" : "warn"}`} />
                <div>
                  <strong>Warranty</strong>
                  <span>{listing.warranty ? "Available" : "Not available"}</span>
                </div>
              </div>

              <div className="classifieds-docs-item">
                <span className={`classifieds-docs-dot ${listing.originalReceipt ? "ok" : "warn"}`} />
                <div>
                  <strong>Original receipt</strong>
                  <span>{listing.originalReceipt ? "Available" : "Not available"}</span>
                </div>
              </div>
            </div>

            <div className="classifieds-docs-ctas">
              <button type="button" className="classifieds-inline-button" onClick={uiMessages?.onRequestDocuments}>
                Request documents
              </button>
              <button type="button" className="classifieds-inline-button" onClick={uiMessages?.onViewVerificationHistory}>
                View verification history
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "messages" ? (
        <div className="classifieds-detail-tab-body">{uiMessages?.messages}</div>
      ) : null}

      {activeTab === "reviews" ? (
        <div className="classifieds-detail-tab-body">{uiMessages?.reviews}</div>
      ) : null}

      {activeTab === "actions" ? (
        <div className="classifieds-detail-tab-body">{uiMessages?.actions}</div>
      ) : null}
    </>
  );
};

export default ListingDetailTabs;