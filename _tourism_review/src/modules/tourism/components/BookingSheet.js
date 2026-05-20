import React from "react";
import { BOOKING_STATUS_OPTIONS, PAYMENT_OPTIONS, formatInr, HOTEL_CATEGORIES, PICKUP_CITIES } from "../tourismData";
import { calculateTourismAdvance } from "../tourismUpgradeUtils";

const BookingSheet = ({
  selectedPackage,
  bookingForm,
  bookingErrors,
  bookingSubmitting,
  onBookingFormChange,
  onClose,
  onSubmitBooking,
}) => {
  if (!selectedPackage) return null;

  const payment = calculateTourismAdvance(
    selectedPackage.startPrice,
    bookingForm.travelerCount,
    bookingForm.paymentType
  );

  return (
    <div className="tourism-booking-backdrop" onClick={onClose}>
      <section className="tourism-booking-sheet" aria-live="polite" onClick={(event) => event.stopPropagation()}>
        <div className="tourism-booking-card">
          <div className="tourism-booking-header">
            <div>
              <h3>{selectedPackage.title}</h3>
              <p className="tourism-card-meta">
                {selectedPackage.destination} | {selectedPackage.durationDays} days | {selectedPackage.vendor}
              </p>
            </div>
            <button type="button" className="tourism-close-button" onClick={onClose}>Close</button>
          </div>

          <div className="tourism-price-summary-card">
            <div><span>Total estimate</span><strong>{formatInr(payment.total)}</strong></div>
            <div><span>Pay now</span><strong>{formatInr(payment.payableNow)}</strong></div>
            <div><span>Balance</span><strong>{formatInr(payment.balance)}</strong></div>
          </div>

          <div className="tourism-booking-detail-grid">
            <article>
              <h4>Inclusions</h4>
              <ul className="tourism-itinerary-list">
                {(selectedPackage.inclusions || []).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
            <article>
              <h4>Itinerary</h4>
              <ul className="tourism-itinerary-list">
                {(selectedPackage.itinerary || []).slice(0, 4).map((item) => <li key={item}>{item}</li>)}
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
          </div>

          <div className="tourism-safety-note">
            Please verify ID proof requirements, weather conditions, entry permits and final hotel availability before payment confirmation.
          </div>

          <div className="tourism-booking-form-grid">
            <label className="tourism-field">
              <span>Customer name</span>
              <input value={bookingForm.customerName} onChange={(e) => onBookingFormChange("customerName", e.target.value)} />
              {bookingErrors.customerName && <small className="tourism-field-error">{bookingErrors.customerName}</small>}
            </label>
            <label className="tourism-field">
              <span>Email</span>
              <input type="email" value={bookingForm.customerEmail} onChange={(e) => onBookingFormChange("customerEmail", e.target.value)} />
              {bookingErrors.customerEmail && <small className="tourism-field-error">{bookingErrors.customerEmail}</small>}
            </label>
            <label className="tourism-field">
              <span>Phone</span>
              <input inputMode="tel" value={bookingForm.customerPhone} onChange={(e) => onBookingFormChange("customerPhone", e.target.value)} />
              {bookingErrors.customerPhone && <small className="tourism-field-error">{bookingErrors.customerPhone}</small>}
            </label>
            <label className="tourism-field">
              <span>Travel date</span>
              <input type="date" value={bookingForm.travelDate} onChange={(e) => onBookingFormChange("travelDate", e.target.value)} />
              {bookingErrors.travelDate && <small className="tourism-field-error">{bookingErrors.travelDate}</small>}
            </label>
            <label className="tourism-field">
              <span>Pickup city</span>
              <select value={bookingForm.pickupCity} onChange={(e) => onBookingFormChange("pickupCity", e.target.value)}>
                {PICKUP_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </label>
            <label className="tourism-field">
              <span>Hotel category</span>
              <select value={bookingForm.hotelCategory} onChange={(e) => onBookingFormChange("hotelCategory", e.target.value)}>
                {HOTEL_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className="tourism-field">
              <span>Travelers</span>
              <input type="number" min="1" max="20" value={bookingForm.travelerCount} onChange={(e) => onBookingFormChange("travelerCount", Number(e.target.value))} />
              {bookingErrors.travelerCount && <small className="tourism-field-error">{bookingErrors.travelerCount}</small>}
            </label>
            <label className="tourism-field">
              <span>Coupon code</span>
              <input value={bookingForm.couponCode} onChange={(e) => onBookingFormChange("couponCode", e.target.value.toUpperCase())} />
            </label>
            <label className="tourism-field tourism-field-wide">
              <span>Booking note</span>
              <textarea rows="3" value={bookingForm.bookingNote} onChange={(e) => onBookingFormChange("bookingNote", e.target.value)} placeholder="Food preference, elderly travelers, kids, pickup timing, etc." />
            </label>
          </div>

          <div className="tourism-payment-select">
            {PAYMENT_OPTIONS.map((option) => (
              <button key={option.id} type="button" className={`tourism-nav-item ${bookingForm.paymentType === option.id ? "active" : ""}`} onClick={() => onBookingFormChange("paymentType", option.id)}>
                {option.label}
              </button>
            ))}
          </div>

          <div className="tourism-booking-status-preview">
            <strong>Booking flow:</strong>
            <span>{BOOKING_STATUS_OPTIONS.join(" → ")}</span>
          </div>

          <div className="tourism-booking-actions sticky">
            <button type="button" className="tourism-primary-button" disabled={bookingSubmitting} onClick={onSubmitBooking}>
              {bookingSubmitting ? "Submitting..." : `Submit Booking • Pay ${formatInr(payment.payableNow)}`}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BookingSheet;
