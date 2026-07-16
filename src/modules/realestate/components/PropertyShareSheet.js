import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * PropertyShareSheet
 * Free sharing utilities: Web Share API, WhatsApp, copy link, print brochure.
 * No paid APIs or third-party SDKs required.
 */
const PropertyShareSheet = ({ property, onClose }) => {
  const [copyState, setCopyState] = useState("idle"); // idle | copied | error
  const sheetRef = useRef(null);

  const shareUrl = `${window.location.origin}/realestate?property=${encodeURIComponent(property.id)}`;
  const shareTitle = `${property.title} — ${property.priceLabel}`;
  const shareText = `Check out this property: ${property.title} in ${property.location}. ${property.priceLabel}. ${property.bedrooms ? `${property.bedrooms} BHK, ` : ""}${property.areaSqft} sq ft. Verified listing on HomeSphere.`;

  // Close on Escape or outside click
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
      } catch {
        // user cancelled — no action needed
      }
    } else {
      handleCopyLink();
    }
  }, [shareTitle, shareText, shareUrl]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2200);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2200);
    }
  }, [shareUrl]);

  const handleWhatsApp = useCallback(() => {
    const whatsappMsg = encodeURIComponent(`${shareText}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${whatsappMsg}`, "_blank", "noopener,noreferrer");
  }, [shareText, shareUrl]);

  const handleTelegram = useCallback(() => {
    const url = encodeURIComponent(shareUrl);
    const text = encodeURIComponent(shareTitle);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank", "noopener,noreferrer");
  }, [shareUrl, shareTitle]);

  const handleTwitter = useCallback(() => {
    const text = encodeURIComponent(`${shareTitle}\n${shareUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank", "noopener,noreferrer");
  }, [shareTitle, shareUrl]);

  const handlePrintBrochure = useCallback(() => {
    const pricePerSqft = property.priceValue && property.areaSqft
      ? Math.round((property.priceValue * 100000) / property.areaSqft).toLocaleString("en-IN")
      : "N/A";

    const amenitiesHtml = (property.amenities || [])
      .map((a) => `<li>${a}</li>`)
      .join("");

    const docsHtml = [
      property.reraNumber ? `<li>RERA: ${property.reraNumber}</li>` : "",
      property.titleDeedStatus === "verified" ? "<li>Title Deed: Verified</li>" : "",
      property.taxReceipt ? "<li>Tax Receipt: Available</li>" : "",
      property.buildingPermit ? "<li>Building Permit: Available</li>" : "",
      property.encumbranceCertificate ? "<li>Encumbrance Certificate: Available</li>" : "",
    ].filter(Boolean).join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${property.title} — Property Brochure</title>
        <style>
          body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1a2a3a; }
          h1 { font-size: 1.8rem; margin-bottom: 0.25rem; color: #0d7a69; }
          .subtitle { color: #555; margin-bottom: 1.5rem; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1.5rem 0; }
          .card { border: 1px solid #d0dde4; border-radius: 8px; padding: 1rem; }
          .card h3 { margin: 0 0 0.5rem; font-size: 0.85rem; text-transform: uppercase; color: #0d7a69; }
          .price { font-size: 2rem; font-weight: bold; color: #0d7a69; }
          .badge { display: inline-block; background: #e6f4f1; color: #0d7a69; border-radius: 4px; padding: 0.2rem 0.6rem; font-size: 0.8rem; margin: 0.15rem; }
          ul { padding-left: 1.2rem; margin: 0.5rem 0; }
          li { margin-bottom: 0.3rem; font-size: 0.9rem; }
          img { width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem; }
          .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #d0dde4; font-size: 0.75rem; color: #888; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${property.image ? `<img src="${property.image}" alt="${property.title}" />` : ""}
        <h1>${property.title}</h1>
        <p class="subtitle">${property.locality || property.location}, ${property.location} &bull; ${property.type} &bull; ${property.intent === "rent" ? "For Rent" : "For Sale"}</p>

        <div class="price">${property.priceLabel}</div>
        ${pricePerSqft !== "N/A" ? `<p>₹${pricePerSqft} / sq ft</p>` : ""}

        <div class="grid">
          <div class="card">
            <h3>Property Details</h3>
            <ul>
              ${property.bedrooms ? `<li>Bedrooms: ${property.bedrooms}</li>` : ""}
              ${property.bathrooms ? `<li>Bathrooms: ${property.bathrooms}</li>` : ""}
              <li>Area: ${property.area}</li>
              ${property.carpetAreaSqft ? `<li>Carpet Area: ${property.carpetAreaSqft} sq ft</li>` : ""}
              ${property.floorNumber != null ? `<li>Floor: ${property.floorNumber} / ${property.totalFloors || "?"}</li>` : ""}
              ${property.parkingSpots ? `<li>Parking: ${property.parkingSpots} spots</li>` : ""}
              <li>Furnishing: ${property.furnishing}</li>
              <li>Possession: ${property.possession}</li>
            </ul>
          </div>
          <div class="card">
            <h3>Documents & Verification</h3>
            <ul>
              <li>Verification: ${property.verified ? "Owner Verified" : "Pending"}</li>
              ${docsHtml || "<li>Documents under review</li>"}
            </ul>
          </div>
        </div>

        ${property.description ? `<div class="card"><h3>About this Property</h3><p>${property.description}</p></div>` : ""}

        ${amenitiesHtml ? `
        <div class="card" style="margin-top:1rem">
          <h3>Amenities</h3>
          ${(property.amenities || []).map((a) => `<span class="badge">${a}</span>`).join("")}
        </div>` : ""}

        <div class="card" style="margin-top:1rem">
          <h3>Contact</h3>
          <ul>
            <li>Listed by: ${property.sellerName} (${property.sellerRole})</li>
            ${property.contactPhone ? `<li>Phone: ${property.contactPhone}</li>` : ""}
          </ul>
        </div>

        <div class="footer">
          <p>Generated by HomeSphere &bull; ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })} &bull; ${shareUrl}</p>
          <p>This brochure is for informational purposes only. Please verify all details with the seller before making any decision.</p>
        </div>
        <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }, [property, shareUrl]);

  const canNativeShare = Boolean(navigator.share);

  return (
    <div
      className="re-share-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Share property"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="re-share-sheet" ref={sheetRef}>
        <div className="re-share-header">
          <h3>Share this property</h3>
          <button
            type="button"
            className="re-share-close"
            onClick={onClose}
            aria-label="Close share panel"
          >
            ✕
          </button>
        </div>

        <div className="re-share-preview">
          {property.image && (
            <img src={property.image} alt={property.title} className="re-share-thumb" />
          )}
          <div className="re-share-preview-info">
            <strong>{property.title}</strong>
            <span>{property.priceLabel}</span>
            <span>{property.location}</span>
          </div>
        </div>

        <div className="re-share-actions">
          {canNativeShare && (
            <button
              type="button"
              className="re-share-btn re-share-btn-primary"
              onClick={handleNativeShare}
            >
              <span className="re-share-icon">⬆️</span>
              Share via…
            </button>
          )}

          <button
            type="button"
            className="re-share-btn re-share-btn-whatsapp"
            onClick={handleWhatsApp}
          >
            <span className="re-share-icon">💬</span>
            WhatsApp
          </button>

          <button
            type="button"
            className="re-share-btn re-share-btn-telegram"
            onClick={handleTelegram}
          >
            <span className="re-share-icon">📨</span>
            Telegram
          </button>

          <button
            type="button"
            className="re-share-btn re-share-btn-twitter"
            onClick={handleTwitter}
          >
            <span className="re-share-icon">🐦</span>
            Twitter / X
          </button>

          <button
            type="button"
            className={`re-share-btn re-share-btn-copy ${copyState === "copied" ? "copied" : ""}`}
            onClick={handleCopyLink}
          >
            <span className="re-share-icon">{copyState === "copied" ? "✅" : "🔗"}</span>
            {copyState === "copied" ? "Link copied!" : copyState === "error" ? "Copy failed" : "Copy link"}
          </button>

          <button
            type="button"
            className="re-share-btn re-share-btn-print"
            onClick={handlePrintBrochure}
          >
            <span className="re-share-icon">🖨️</span>
            Download brochure (PDF)
          </button>
        </div>

        <div className="re-share-url-row">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="re-share-url-input"
            onFocus={(e) => e.target.select()}
            aria-label="Property share URL"
          />
        </div>
      </div>
    </div>
  );
};

export default PropertyShareSheet;
