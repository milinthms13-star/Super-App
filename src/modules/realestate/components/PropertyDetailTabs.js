import React, { useMemo, useState } from "react";
import { formatDateTime } from "../realEstateUtils";
import NearbyAmenitiesMap from "./NearbyAmenitiesMap";
import PriceInsightsPanel from "./PriceInsightsPanel";

/**
 * PropertyDetailTabs — Professional upgrade
 * - Live OpenStreetMap embed (free)
 * - Nominatim reverse geocode display (free)
 * - Nearby amenities tab (Overpass API — free)
 * - Price insights tab (free static market data)
 * - Street View deep link (free)
 * - Neighborhood data panel
 */

const TAB_IDS = [
  { id: "overview", label: "Overview" },
  { id: "media", label: "Media" },
  { id: "nearby", label: "Nearby" },
  { id: "insights", label: "Market" },
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

// Nominatim reverse geocode (free OpenStreetMap geocoding service)
const useReverseGeocode = (lat, lng) => {
  const [address, setAddress] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const hasCoords = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
    if (!hasCoords) return;

    setLoading(true);
    const controller = new AbortController();

    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      {
        headers: { "Accept-Language": "en", "User-Agent": "HomeSphere/1.0" },
        signal: controller.signal,
      }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data?.display_name) setAddress(data.display_name);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => controller.abort();
  }, [lat, lng]);

  return { address, loading };
};

const PropertyDetailTabs = ({
  property,
  canManage,
  loanCalculator,
  uiMessages,
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const summary = useMemo(() => (property ? trustSummary(property) : null), [property]);

  const lat = Number(property?.mapLocationLat);
  const lng = Number(property?.mapLocationLng);
  const hasCoords =
    property?.mapLocationLat != null &&
    property?.mapLocationLng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  const { address: geocodedAddress, loading: geocodeLoading } = useReverseGeocode(
    hasCoords ? lat : null,
    hasCoords ? lng : null
  );

  if (!property) {
    return (
      <div className="realestate-empty-state realestate-empty-state-actions">
        <h3>Select a listing</h3>
        <p>Choose any property card from the left panel to view documents, media, financing, messages, and actions.</p>
      </div>
    );
  }

  // Map embed (OpenStreetMap — free)
  const osmEmbedUrl = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.012}%2C${lat - 0.012}%2C${lng + 0.012}%2C${lat + 0.012}&layer=mapnik&marker=${lat}%2C${lng}`
    : null;

  const osmFullUrl = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
    : null;

  // Google Street View deep link (free, no API key required for linking)
  const streetViewUrl = hasCoords
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`
    : null;

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

        {/* TRUST PANEL */}
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

      {/* ── TAB: OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="realestate-detail-tab-body">
          <div className="realestate-detail-price-row">
            <strong>{property.priceLabel}</strong>
            <span>{property.type} · {property.intent === "rent" ? "Rental" : "For sale"}</span>
          </div>

          <div className="realestate-detail-specs">
            {property.bedrooms > 0 && <span>{property.bedrooms} bed</span>}
            {property.bathrooms > 0 && <span>{property.bathrooms} bath</span>}
            <span>{property.area}</span>
            {property.furnishing && <span>{property.furnishing}</span>}
            {property.possession && <span>{property.possession}</span>}
            {property.floorNumber != null && <span>Floor {property.floorNumber}</span>}
            {property.totalFloors != null && <span>{property.totalFloors} floors total</span>}
            {property.parkingSpots != null && <span>{property.parkingSpots} parking</span>}
          </div>

          {property.description && (
            <p className="realestate-description">{property.description}</p>
          )}

          {property.amenities?.length > 0 && (
            <div className="realestate-chip-cloud">
              {[...new Set(property.amenities)].map((a) => (
                <span key={a}>{a}</span>
              ))}
            </div>
          )}

          {/* ENHANCED MAP SECTION */}
          <div className="realestate-map-card">
            <div className="re-map-header">
              <strong>📍 Location</strong>
              <div className="re-map-header-actions">
                {osmFullUrl && (
                  <a href={osmFullUrl} target="_blank" rel="noreferrer" className="re-map-action-link">
                    Open map ↗
                  </a>
                )}
                {streetViewUrl && (
                  <a href={streetViewUrl} target="_blank" rel="noreferrer" className="re-map-action-link">
                    Street view ↗
                  </a>
                )}
              </div>
            </div>

            <span className="re-map-label">{property.mapLabel || property.address || property.location}</span>

            {/* Nominatim reverse geocoded address */}
            {hasCoords && (
              <div className="re-map-geocode">
                {geocodeLoading ? (
                  <span className="re-map-geocode-loading">Resolving address…</span>
                ) : geocodedAddress ? (
                  <span className="re-map-geocode-result">🗺 {geocodedAddress}</span>
                ) : null}
              </div>
            )}

            {/* Coordinates */}
            {hasCoords && (
              <span className="re-map-coords">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
            )}

            {/* OpenStreetMap embed */}
            {osmEmbedUrl ? (
              <div className="realestate-map-embed">
                <iframe
                  title={`Map location for ${property.title}`}
                  src={osmEmbedUrl}
                  loading="lazy"
                  allowFullScreen
                />
              </div>
            ) : property.mapPreviewUrl ? (
              <div className="realestate-map-preview">
                <img src={property.mapPreviewUrl} alt={`Map preview for ${property.title}`} />
              </div>
            ) : (
              <span className="re-map-no-coords">Location coordinates will appear here once the seller adds GPS data.</span>
            )}
          </div>

          {/* CONTACT CARD */}
          <div className="realestate-contact-card">
            <strong>{property.sellerName}</strong>
            <span>{property.sellerRole} · {(property.languageSupport || ["English"]).join(", ")}</span>
            <span>⭐ {property.rating?.toFixed(1) || "—"} / 5 from {property.reviewCount || property.reviews?.length || 0} reviews</span>
            {property.contactPhone && <span>📱 {property.contactPhone}</span>}
          </div>

          {/* TRUST FLAGS */}
          <div className="realestate-trust-flags-grid">
            {summary.flags.map((f) => (
              <div key={f.key} className={`realestate-trust-flag ${f.ok ? "ok" : "warn"}`}>
                <span className={`realestate-trust-flag-dot ${f.ok ? "ok" : "warn"}`} />
                <div><strong>{f.label}</strong></div>
              </div>
            ))}
          </div>

          <div className="realestate-detail-quickmeta">
            <span>Listed: {formatDateTime(property.postedOn)}</span>
            <span>Leads: {property.leads?.length || 0}</span>
            <span>Media: {property.mediaGallery?.length || property.mediaCount || 0} assets</span>
          </div>
        </div>
      )}

      {/* ── TAB: MEDIA ── */}
      {activeTab === "media" && (
        <div className="realestate-detail-tab-body">
          <div className="realestate-detail-media-grid">
            {property.mediaGallery?.length > 0 ? (
              property.mediaGallery.slice(0, 8).map((media) => (
                <div key={media.id} className="realestate-detail-media-item">
                  {media.type === "image" ? (
                    <img
                      src={media.url}
                      alt={media.label || property.title}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <a href={media.url} target="_blank" rel="noreferrer" className="re-media-link">
                      <span className="re-media-link-icon">
                        {media.type === "video" ? "▶" : media.type === "floor-plan" ? "📐" : media.type === "brochure" ? "📄" : "🗺"}
                      </span>
                      <span>
                        {media.type === "video" ? "Video tour" : media.type === "floor-plan" ? "Floor plan" : media.type === "brochure" ? "Brochure PDF" : "Map preview"}
                      </span>
                    </a>
                  )}
                  <span className="re-media-label">{media.label || media.type}</span>
                </div>
              ))
            ) : (
              <div className="realestate-detail-media">
                <strong>Media gallery</strong>
                <span>{property.mediaCount || 0} assets available from the seller</span>
              </div>
            )}
          </div>

          {/* VIDEO TOUR QUICK LINK */}
          {property.videoTourUrl && (
            <div className="re-media-video-section">
              <a href={property.videoTourUrl} target="_blank" rel="noreferrer" className="re-media-video-btn">
                ▶ Watch video tour
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: NEARBY (Overpass API — FREE) ── */}
      {activeTab === "nearby" && (
        <div className="realestate-detail-tab-body">
          <NearbyAmenitiesMap property={property} />
        </div>
      )}

      {/* ── TAB: MARKET INSIGHTS ── */}
      {activeTab === "insights" && (
        <div className="realestate-detail-tab-body">
          <PriceInsightsPanel property={property} />
        </div>
      )}

      {/* ── TAB: DOCUMENTS ── */}
      {activeTab === "documents" && (
        <div className="realestate-detail-tab-body">
          <div className="realestate-docs-card">
            <div className="realestate-section-heading">
              <h3>Verification &amp; documents</h3>
              <p>Transparent status for KYC, RERA, and key property documents.</p>
            </div>

            <div className="realestate-docs-grid">
              {[
                { ok: property.verified, label: "KYC", detail: property.verified ? "Owner verified" : "Verification pending" },
                { ok: Boolean(property.reraNumber), label: "RERA", detail: property.reraNumber || "RERA pending" },
                {
                  ok: property.titleDeedStatus === "verified",
                  bad: property.titleDeedStatus === "rejected",
                  label: "Title deed",
                  detail: property.titleDeedStatus,
                },
                { ok: property.taxReceipt, label: "Tax receipt", detail: property.taxReceipt ? "Available" : "Pending" },
                { ok: property.buildingPermit, label: "Building permit", detail: property.buildingPermit ? "Available" : "Pending" },
                { ok: property.encumbranceCertificate, label: "Encumbrance certificate", detail: property.encumbranceCertificate ? "Available" : "Pending" },
              ].map((doc) => (
                <div key={doc.label} className="realestate-docs-item">
                  <span className={`realestate-docs-dot ${doc.ok ? "ok" : doc.bad ? "bad" : "warn"}`} />
                  <div>
                    <strong>{doc.label}</strong>
                    <span>{doc.detail}</span>
                  </div>
                </div>
              ))}
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
      )}

      {activeTab === "financing" && (
        <div className="realestate-detail-tab-body">{loanCalculator}</div>
      )}

      {activeTab === "messages" && (
        <div className="realestate-detail-tab-body">{uiMessages?.messages}</div>
      )}

      {activeTab === "reviews" && (
        <div className="realestate-detail-tab-body">{uiMessages?.reviews}</div>
      )}

      {activeTab === "actions" && (
        <div className="realestate-detail-tab-body">{uiMessages?.actions}</div>
      )}
    </>
  );
};

export default PropertyDetailTabs;
