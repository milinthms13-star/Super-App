import React from "react";

const ConsultView = ({ consultApi }) => (
  <div className="astro-card-grid">
    {consultApi.consultationHistoryLoading ? (
      <article className="astrology-panel astro-result-card astro-span-2">
        <h4>Consultation history</h4>
        <p>Loading your consultation history...</p>
      </article>
    ) : null}
    {consultApi.consultants.map((consultant) => {
      const key = consultant.id || consultant.name;
      return (
        <article key={key} className="astrology-panel astro-result-card">
          <h4>{consultant.name}</h4>
          <p>{consultant.specialty}</p>
          <p>{consultant.rate}</p>
          <label className="astrology-field">
            <span>Choose slot</span>
            <select value={consultApi.consultationSlots[key] || ""} onChange={(event) => consultApi.handleConsultationSlotChange(key, event.target.value)}>
              {consultant.availableSlots.map((slot) => <option key={slot.id} value={slot.id}>{slot.label}</option>)}
            </select>
          </label>
          <label className="astrology-field">
            <span>Notes for consultant (optional)</span>
            <textarea
              rows={3}
              value={consultApi.consultationNotes[key] || ""}
              onChange={(event) => consultApi.handleConsultationNotesChange(key, event.target.value)}
              placeholder="Share topic, concern, or context for the session..."
            />
          </label>
          <button type="button" className="astrology-save-button" disabled={consultApi.bookingLoadingId === key} onClick={() => consultApi.handlePrepareConsultationBooking(consultant)}>{consultApi.bookingLoadingId === key ? "Booking..." : "Review booking"}</button>
        </article>
      );
    })}
    {consultApi.bookingDraft ? (
      <article className="astrology-panel astro-result-card astro-span-2">
        <h4>Review consultation booking</h4>
        <p><strong>Consultant:</strong> {consultApi.bookingDraft.consultant?.name || "Consultant"}</p>
        <p><strong>Slot:</strong> {consultApi.bookingDraft.slotLabel}</p>
        <p><strong>Rate:</strong> {consultApi.bookingDraft.consultant?.rate || "INR"}</p>
        <p><strong>Notes:</strong> {consultApi.bookingDraft.notes || "No notes added."}</p>
        <div className="astrology-inline-actions">
          <button type="button" className="astrology-save-button" disabled={consultApi.bookingLoadingId === consultApi.bookingDraft.consultantKey} onClick={consultApi.handleConfirmConsultationBooking}>
            {consultApi.bookingLoadingId === consultApi.bookingDraft.consultantKey ? "Booking..." : "Confirm booking"}
          </button>
          <button type="button" className="astrology-secondary-button" disabled={consultApi.bookingLoadingId === consultApi.bookingDraft.consultantKey} onClick={consultApi.handleCancelConsultationDraft}>
            Edit details
          </button>
        </div>
      </article>
    ) : null}
    {consultApi.lastBooking ? (
      <article className="astrology-panel astro-result-card astro-span-2">
        <h4>Latest booking</h4>
        <p>Code: {consultApi.lastBooking.confirmationCode}</p>
        <p>Consultant: {consultApi.lastBooking.consultantName}</p>
        {consultApi.lastBooking.notes ? <p>Notes: {consultApi.lastBooking.notes}</p> : null}
        <p>
          Booking status:{" "}
          <span className={consultApi.getStatusClassName(consultApi.lastBooking.status)}>
            {consultApi.formatStatusLabel(consultApi.lastBooking.status)}
          </span>
        </p>
        <p>
          Payment status:{" "}
          <span className={consultApi.getStatusClassName(consultApi.lastBooking.paymentStatus)}>
            {consultApi.formatStatusLabel(consultApi.lastBooking.paymentStatus)}
          </span>
        </p>
        <div className="astrology-inline-actions">
          <button
            type="button"
            className="astrology-save-button"
            disabled={consultApi.paymentLoading || consultApi.lastBooking.paymentStatus === "completed"}
            onClick={consultApi.handleCreateConsultationPaymentOrder}
          >
            {consultApi.paymentLoading ? "Creating payment..." : "Pay now"}
          </button>
          <button
            type="button"
            className="astrology-secondary-button"
            disabled={consultApi.paymentRefreshLoadingId === consultApi.lastBooking.id}
            onClick={() => consultApi.handleRefreshPaymentStatus(consultApi.lastBooking)}
          >
            Refresh payment
          </button>
          <button
            type="button"
            className="astrology-secondary-button"
            disabled={consultApi.consultationActionLoadingId === consultApi.lastBooking.id}
            onClick={() => consultApi.handleUpdateConsultationStatus(consultApi.lastBooking.id, "cancelled")}
          >
            {consultApi.consultationActionLoadingId === consultApi.lastBooking.id ? "Updating..." : "Cancel booking"}
          </button>
        </div>
      </article>
    ) : null}
    <article className="astrology-panel astro-result-card astro-span-2">
      <h4>Recent consultation bookings</h4>
      {consultApi.consultationHistory.length ? (
        <div className="astrology-mini-history-list">
          {consultApi.consultationHistory.slice(0, 8).map((booking) => (
            <div key={booking.id} className="astrology-mini-history-item">
              <strong>{booking.consultantName || "Consultant"}</strong>
              <span>{booking.slot || booking.preferredDate || "Slot pending"}</span>
              {booking.notes ? <span>{booking.notes}</span> : null}
              <span className={consultApi.getStatusClassName(booking.status)}>
                {consultApi.formatStatusLabel(booking.status)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="astrology-history-empty">No consultation bookings yet.</p>
      )}
    </article>
  </div>
);

export default ConsultView;
