import React, { useState } from "react";
import { InputField, TextareaField } from "./FormControls";

function ProviderDetailsModal({ provider, onClose, onSendEnquiry, formatInr }) {
  const [enquiry, setEnquiry] = useState({
    customerName: "",
    customerPhone: "",
    message: "",
  });

  if (!provider) {
    return null;
  }

  return (
    <div className="local-services-modal-overlay" onClick={onClose}>
      <div className="local-services-modal" onClick={(event) => event.stopPropagation()}>
        <div className="local-services-modal-head">
          <h2>{provider.name}</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <p>
          {provider.city} | {provider.address}
        </p>
        <p>
          Price range: {formatInr(provider.priceStart)} - {formatInr(provider.priceMax)}
        </p>
        <p>Cancellation policy: {provider.cancellationPolicy}</p>
        <p>
          Availability: Next available{" "}
          {provider.availabilityCalendar?.nextAvailableDate || "Contact provider"}
        </p>

        <h3>Packages</h3>
        <ul className="local-services-list">
          {(provider.packages || []).map((pkg) => (
            <li key={`${provider.id}-${pkg.name}`}>
              {pkg.name} | {formatInr(pkg.price)} | {pkg.details}
            </li>
          ))}
        </ul>

        <h3>Customer Reviews</h3>
        <ul className="local-services-list">
          {(provider.customerReviews || []).map((review, index) => (
            <li key={`${provider.id}-review-${index}`}>
              {review.author}: {review.rating}/5 - {review.comment}
            </li>
          ))}
        </ul>

        <h3>Portfolio</h3>
        <div className="local-services-gallery">
          {(provider.portfolio || []).map((url) => (
            <img key={url} src={url} alt={`${provider.name} portfolio`} />
          ))}
        </div>

        <h3>Enquiry Form</h3>
        <div className="local-services-form">
          <InputField label="Name">
            <input
              type="text"
              value={enquiry.customerName}
              onChange={(event) => setEnquiry((current) => ({ ...current, customerName: event.target.value }))}
            />
          </InputField>
          <InputField label="Phone">
            <input
              type="text"
              value={enquiry.customerPhone}
              onChange={(event) => setEnquiry((current) => ({ ...current, customerPhone: event.target.value }))}
            />
          </InputField>
          <TextareaField label="Message">
            <textarea
              rows={3}
              value={enquiry.message}
              onChange={(event) => setEnquiry((current) => ({ ...current, message: event.target.value }))}
            />
          </TextareaField>
          <button type="button" onClick={() => onSendEnquiry(provider, enquiry)}>
            Send Enquiry
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProviderDetailsModal;
