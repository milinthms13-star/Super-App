import React from "react";
import { buildWhatsAppListingMessage } from "./classifiedsUpgradeUtils";

const INDIA_SAFETY_POINTS = [
  "Meet in a public place and inspect the item before payment.",
  "Avoid advance payment for jobs, rentals, vehicles, or high-value items.",
  "Use in-app chat first and report sellers asking for OTP or passwords.",
];

const SafeTradeBox = ({ listing, onReport }) => {
  const phone = listing?.phone || listing?.contactPhone || listing?.whatsappNumber;

  const openWhatsApp = () => {
    if (!phone) return;
    const cleanedPhone = String(phone).replace(/\D/g, "");
    const withCountry = cleanedPhone.startsWith("91") ? cleanedPhone : `91${cleanedPhone}`;
    window.open(
      `https://wa.me/${withCountry}?text=${encodeURIComponent(buildWhatsAppListingMessage(listing))}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <aside className="classifieds-safe-trade-box">
      <div>
        <strong>Safe trade checklist</strong>
        <p>Use this before contacting or paying a seller.</p>
      </div>

      <ul>
        {INDIA_SAFETY_POINTS.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>

      <div className="classifieds-safe-actions">
        {phone ? (
          <button type="button" onClick={openWhatsApp}>
            WhatsApp Seller
          </button>
        ) : null}
        <button type="button" className="danger" onClick={() => onReport?.(listing)}>
          Report Listing
        </button>
      </div>
    </aside>
  );
};

export default SafeTradeBox;
