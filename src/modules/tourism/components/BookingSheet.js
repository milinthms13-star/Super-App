import React from "react";
import { BOOKING_STATUS_OPTIONS, PAYMENT_OPTIONS, formatInr, HOTEL_CATEGORIES, PICKUP_CITIES } from "../tourismData";

const BookingSheet = ({
  selectedPackage,
  bookingForm,
  bookingErrors,
  bookingSubmitting,
  onBookingFormChange,
  onClose,
  onSubmitBooking,
}) => {
  if (!selectedPackage) {
    return null;
  }

  return (
    <div className="tourism-booking-backdrop" onClick={onClose}>
      <section className="tourism-booking-sheet" aria-live="polite" onClick={(event) => event.stopPropagation()}>
        <div className="tourism-booking-card">
          <div className="tourism-booking-header">
            <h3>{selectedPackage.title}</h3>
            <button type="button" className="tourism-close-button" onClick={onClose}>
              Close
            </button>
          </div>

          <p className="tourism-card-meta">
            {selectedPackage.destination} | {selectedPackage.durationDays} days | {selectedPackage.vendor}
          </p>

          <div className="tourism-booking-detail-grid">
            <article>
              <h4>Inclusions</h4>
              <ul className="tourism-itinerary-list">
                {(selectedPackage.inclusions || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article>
              <h4>Exclusions</h4>
              <ul className="tourism-itinerary-list">
                {(selectedPackage.exclusions || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>

          <div className="tourism-booking-policy-grid">
            <p><strong>Cancellation:</strong> {selectedPackage.cancellationPolicy}</p>
            <p><strong>Child pricing:</strong> {selectedPackage.childPricing}</p>
            <p><strong>GST/Service:</strong> {selectedPackage.gstAndServiceCharge}</p>
            <p><strong>Map highlights:</strong> {selectedPackage.mapHighlights}</p>
            <p><strong>Emergency contact:</strong> {selectedPackage.emergencyContact || "+91 112"}</p>
            <p><strong>Insurance:</strong> {selectedPackage.insuranceSupport ? "Available" : "Optional add-on"}</p>
            <p><strong>Tourist helpline:</strong> Kerala Tourism Helpline 1800-425-4747</p>
          </div>

          <div className="tourism-booking-form-grid">
            <label className="tourism-field">
              <span>Customer name</span>
              <input
                value={bookingForm.customerName}
                onChange={(event) => onBookingFormChange("customerName", event.target.value)}
              />
              {bookingErrors.customerName ? <small className="tourism-field-error">{bookingErrors.customerName}</small> : null}
            </label>
            <label className="tourism-field">
              <span>Email</span>
              <input
                type="email"
                value={bookingForm.customerEmail}
                onChange={(event) => onBookingFormChange("customerEmail", event.target.value)}
              />
              {bookingErrors.customerEmail ? <small className="tourism-field-error">{bookingErrors.customerEmail}</small> : null}
            </label>
            <label className="tourism-field">
              <span>Phone</span>
              <input
                value={bookingForm.customerPhone}
                onChange={(event) => onBookingFormChange("customerPhone", event.target.value)}
              />
              {bookingErrors.customerPhone ? <small className="tourism-field-error">{bookingErrors.customerPhone}</small> : null}
            </label>
            <label className="tourism-field">
              <span>Travel date</span>
              <input
                type="date"
                value={bookingForm.travelDate}
                onChange={(event) => onBookingFormChange("travelDate", event.target.value)}
              />
              {bookingErrors.travelDate ? <small className="tourism-field-error">{bookingErrors.travelDate}</small> : null}
            </label>
            <label className="tourism-field">
              <span>Pickup city</span>
              <select
                value={bookingForm.pickupCity}
                onChange={(event) => onBookingFormChange("pickupCity", event.target.value)}
              >
                {PICKUP_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label className="tourism-field">
              <span>Hotel category</span>
              <select
                value={bookingForm.hotelCategory}
                onChange={(event) => onBookingFormChange("hotelCategory", event.target.value)}
              >
                {HOTEL_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="tourism-field">
              <span>Travelers</span>
              <input
                type="number"
                min="1"
                max="20"
                value={bookingForm.travelerCount}
                onChange={(event) => onBookingFormChange("travelerCount", Number(event.target.value))}
              />
            </label>
            <label className="tourism-field">
              <span>Coupon code</span>
              <input value={bookingForm.couponCode} onChange={(event) => onBookingFormChange("couponCode", event.target.value)} />
            </label>
            <label className="tourism-field tourism-field-wide">
              <span>Booking note</span>
              <textarea
                rows="3"
                value={bookingForm.bookingNote}
                onChange={(event) => onBookingFormChange("bookingNote", event.target.value)}
              />
            </label>
          </div>

          <div className="tourism-payment-select">
            {PAYMENT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`tourism-nav-item ${bookingForm.paymentType === option.id ? "active" : ""}`}
                onClick={() => onBookingFormChange("paymentType", option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="tourism-booking-status-preview">
            <strong>Booking status flow:</strong>
            <span>{BOOKING_STATUS_OPTIONS.join(" -> ")}</span>
            <span>Base package amount: {formatInr(selectedPackage.startPrice)}</span>
          </div>

          <div className="tourism-booking-actions">
            <button type="button" className="tourism-primary-button" disabled={bookingSubmitting} onClick={onSubmitBooking}>
              {bookingSubmitting ? "Submitting..." : "Submit Booking"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BookingSheet;

