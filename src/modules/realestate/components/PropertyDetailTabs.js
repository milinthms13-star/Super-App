import React, { useMemo, useState } from "react";
import { formatDateTime } from "../realEstateUtils";

const TAB_IDS = [
  { id: "overview", label: "Overview" },
  { id: "media", label: "Media" },
  { id: "documents", label: "Documents" },
  { id: "financing", label: "Financing" },
  { id: "messages", label: "Messages" },
  { id: "reviews", label: "Reviews" },
  { id: "actions", label: "Actions" },
];

const buildMissingDocs = (p) => {
  const missing = [];
  if (!p.taxReceipt) missing.push({ key: "taxReceipt", label: "Tax receipt" });
  if (!p.buildingPermit) missing.push({ key: "buildingPermit", label: "Building permit" });
  if (!p.encumbranceCertificate) missing.push({ key: "encumbranceCertificate", label: "Encumbrance certificate" });
  if (p.titleDeedStatus !== "verified") missing.push({ key: "titleDeedStatus", label: `Title deed: ${p.titleDeedStatus}` });
  return missing;
};

const trustSummary = (p) => {
  const flags = [
    { key: "verified", label: p.verified ? "Owner verified" : "Owner verification pending", ok: Boolean(p.verified) },
    { key: "reraNumber", label: p.reraNumber ? `RERA ${p.reraNumber}` : "RERA pending", ok: Boolean(p.reraNumber) },
    { key: "titleDeedStatus", label: `Title deed: ${p.titleDeedStatus}`, ok: p.titleDeedStatus === "verified" },
    { key: "taxReceipt", label: p.taxReceipt ? "Tax receipt available" : "Tax receipt pending", ok: Boolean(p.taxReceipt) },
    { key: "buildingPermit", label: p.buildingPermit ? "Building permit available" : "Building permit pending", ok: Boolean(p.buildingPermit) },
    {
      key: "encumbranceCertificate",
      label: p.encumbranceCertificate ? "Encumbrance certificate available" : "Encumbrance certificate pending",
      ok: Boolean(p.encumbranceCertificate),
    },
  ];

  const okCount = flags.filter((f) => f.ok).length;
  const score = Math.round((okCount / flags.length) * 100);
  const missing = buildMissingDocs(p);
  const status = score >= 80 ? "High trust" : score >= 50 ? "Good trust" : "Trust pending";

  return { score, status, flags, missing };
};

const PropertyDetailTabs = ({
  property,
  canManage,
  loanCalculator,
  uiMessages,
}) => {
  const [activeTab, setActiveTab] = useState("overview");

  const summary = useMemo(() => (property ? trustSummary(property) : null), [property]);

  if (!property) {
    return (
      <div className="realestate-empty-state realestate-empty-state-actions">
        <h3>Select a listing</h3>
        <p>Choose any property card from the left panel to view documents, media, financing, messages, and actions.</p>
      </div>
    );
  }

  return (
    <>
      <div className="realestate-detail-tabs">
        <div className="realestate-detail-tabs-row" role="tablist" aria-label="Property details tabs">
          {TAB_IDS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`realestate-tab ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
              role="tab"
              aria-selected={activeTab === t.id}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="realestate-trust-panel" aria-label="Trust and document status">
          <div className="realestate-trust-panel-top">
            <div>
              <div className="realestate-trust-badge">{summary.status}</div>
              <div className="realestate-trust-score">Trust score: {summary.score}/100</div>
            </div>
            <div className="realestate-trust-ctas">
              <button type="button" className="realestate-inline-button" onClick={uiMessages?.onRequestDocuments}>
                Request documents
              </button>
              <button type="button" className="realestate-inline-button" onClick={uiMessages?.onViewVerificationHistory}>
                Verification history
              </button>
            </div>
          </div>

          <div className="realestate-trust-docs">
            {summary.missing.length ? (
              <div className="realestate-trust-docs-warn">
                Missing / pending: {summary.missing.map((m) => m.label).join(", ")}
              </div>
            ) : (
              <div className="realestate-trust-docs-ok">All key documents are available for this listing.</div>
            )}
          </div>
        </div>
      </div>

      {activeTab === "overview" ? (
        <div className="realestate-detail-tab-body">
          <div className="realestate-detail-price-row">
            <strong>{property.priceLabel}</strong>
            <span>
              {property.type} | {property.intent}
            </span>
          </div>

          <div className="realestate-detail-specs">
            <span>{property.bedrooms || "Studio"} bed</span>
            <span>{property.bathrooms} bath</span>
            <span>{property.area}</span>
            <span>{property.furnishing}</span>
            {property.possession ? <span>{property.possession}</span> : null}
            {property.floorNumber !== null ? <span>Floor {property.floorNumber}</span> : null}
            {property.totalFloors !== null ? <span>Total floors {property.totalFloors}</span> : null}
            {property.parkingSpots !== null ? <span>{property.parkingSpots} parking</span> : null}
          </div>

          <p className="realestate-description">{property.description}</p>

          <div className="realestate-chip-cloud">
            {property.amenities.map((amenity) => (
              <span key={amenity}>{amenity}</span>
            ))}
          </div>

          <div className="realestate-map-card">
            <strong>Map location</strong>
            <span>{property.mapLabel}</span>
            {property.mapLocationLat && property.mapLocationLng ? (
              <span>
                {property.mapLocationLat}, {property.mapLocationLng}
              </span>
            ) : null}
          </div>

          <div className="realestate-contact-card">
            <strong>{property.sellerName}</strong>
            <span>
              {property.sellerRole} | {property.languageSupport?.join(", ") || "English"}
            </span>
            <span>
              {property.rating?.toFixed(1)} / 5 from {property.reviewCount || property.reviews?.length || 0} reviews
            </span>
            {property.contactPhone ? <span>Call: {property.contactPhone}</span> : null}
            {property.whatsappNumber ? <span>WhatsApp: {property.whatsappNumber}</span> : null}
          </div>

          <div className="realestate-trust-flags-grid">
            {summary.flags.map((f) => (
              <div key={f.key} className={`realestate-trust-flag ${f.ok ? "ok" : "warn"}`}>
                <span className={`realestate-trust-flag-dot ${f.ok ? "ok" : "warn"}`} />
                <div>
                  <strong>{f.label}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="realestate-detail-quickmeta">
            <span>Listed: {formatDateTime(property.postedOn)}</span>
            <span>Leads: {property.leads?.length || 0}</span>
            <span>Media: {property.mediaGallery?.length || property.mediaCount || 0} assets</span>
          </div>
        </div>
      ) : null}

      {activeTab === "media" ? (
        <div className="realestate-detail-tab-body">
          <div className="realestate-detail-media-grid">
            {property.mediaGallery?.length > 0 ? (
              property.mediaGallery.slice(0, 8).map((media) => (
                <div key={media.id} className="realestate-detail-media-item">
                  {media.type === "image" ? <img src={media.url} alt={media.label || property.title} /> : null}
                  {media.type !== "image" ? (
                    <a href={media.url} target="_blank" rel="noreferrer">
                      {media.type === "video" ? "Video tour" : media.type === "floor-plan" ? "Floor plan" : media.type === "brochure" ? "Brochure PDF" : "Map preview"}
                    </a>
                  ) : null}
                  <span>{media.label || media.type}</span>
                </div>
              ))
            ) : (
              <div className="realestate-detail-media">
                <strong>Media gallery available</strong>
                <span>{property.mediaCount} media assets</span>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "documents" ? (
        <div className="realestate-detail-tab-body">
          <div className="realestate-docs-card">
            <div className="realestate-section-heading">
              <h3>Verification & documents</h3>
              <p>Transparent status for KYC, RERA, and key property documents.</p>
            </div>

            <div className="realestate-docs-grid">
              <div className="realestate-docs-item">
                <span className={`realestate-docs-dot ${property.verified ? "ok" : "warn"}`} />
                <div>
                  <strong>KYC</strong>
                  <span>{property.verified ? "Owner verified" : "Verification pending"}</span>
                </div>
              </div>

              <div className="realestate-docs-item">
                <span className={`realestate-docs-dot ${property.reraNumber ? "ok" : "warn"}`} />
                <div>
                  <strong>RERA</strong>
                  <span>{property.reraNumber ? property.reraNumber : "RERA pending"}</span>
                </div>
              </div>

              <div className="realestate-docs-item">
                <span
                  className={`realestate-docs-dot ${property.titleDeedStatus === "verified" ? "ok" : property.titleDeedStatus === "rejected" ? "bad" : "warn"}`}
                />
                <div>
                  <strong>Title deed</strong>
                  <span>{property.titleDeedStatus}</span>
                </div>
              </div>

              <div className="realestate-docs-item">
                <span className={`realestate-docs-dot ${property.taxReceipt ? "ok" : "warn"}`} />
                <div>
                  <strong>Tax receipt</strong>
                  <span>{property.taxReceipt ? "Available" : "Pending"}</span>
                </div>
              </div>

              <div className="realestate-docs-item">
                <span className={`realestate-docs-dot ${property.buildingPermit ? "ok" : "warn"}`} />
                <div>
                  <strong>Building permit</strong>
                  <span>{property.buildingPermit ? "Available" : "Pending"}</span>
                </div>
              </div>

              <div className="realestate-docs-item">
                <span className={`realestate-docs-dot ${property.encumbranceCertificate ? "ok" : "warn"}`} />
                <div>
                  <strong>Encumbrance certificate</strong>
                  <span>{property.encumbranceCertificate ? "Available" : "Pending"}</span>
                </div>
              </div>
            </div>

            <div className="realestate-docs-ctas">
              <button type="button" className="realestate-inline-button" onClick={uiMessages?.onRequestDocuments}>
                Request documents
              </button>
              <button type="button" className="realestate-inline-button" onClick={uiMessages?.onViewVerificationHistory}>
                View verification history
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "financing" ? (
        <div className="realestate-detail-tab-body">{loanCalculator}</div>
      ) : null}

      {activeTab === "messages" ? (
        <div className="realestate-detail-tab-body">{uiMessages?.messages}</div>
      ) : null}

      {activeTab === "reviews" ? (
        <div className="realestate-detail-tab-body">{uiMessages?.reviews}</div>
      ) : null}

      {activeTab === "actions" ? (
        <div className="realestate-detail-tab-body">{uiMessages?.actions}</div>
      ) : null}
    </>
  );
};

export default PropertyDetailTabs;


