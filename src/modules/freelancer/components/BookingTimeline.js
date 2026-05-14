import React from "react";

const BookingTimeline = ({
  booking,
  bookingStatusSequence,
  bookingStatusLabels,
  normalizeBookingStatus,
  getBookingStatusLabel,
  getBookingNextAction,
  onStartOtp,
  onSetupEscrow,
  onRaiseDispute,
  onReleaseMilestone,
}) => (
  <li key={booking._id}>
    <strong>{booking.bookingCode}</strong> | {booking.providerName}
    <br />
    Status: {getBookingStatusLabel(booking.status)} | Payment: {booking.payment?.status || "pending"}
    <br />
    Masked Phone: {booking.customer?.maskedPhone}
    <div className="freelancer-booking-next-action">
      Next action: {getBookingNextAction(booking)}
    </div>
    <div className="freelancer-booking-timeline">
      {bookingStatusSequence.map((step) => {
        const hasStep = Array.isArray(booking.statusTimeline)
          ? booking.statusTimeline.some(
              (entry) => normalizeBookingStatus(entry.status) === normalizeBookingStatus(step)
            )
          : false;
        return (
          <span key={`${booking.bookingCode}-${step}`} className={hasStep ? "is-complete" : ""}>
            {bookingStatusLabels[step]}
          </span>
        );
      })}
      {normalizeBookingStatus(booking.status) === "cancelled" ? (
        <span className="is-cancelled">Cancelled</span>
      ) : null}
      {normalizeBookingStatus(booking.status) === "disputed" ? (
        <span className="is-disputed">Disputed</span>
      ) : null}
    </div>
    <div className="freelancer-inline-actions">
      <button type="button" onClick={() => onStartOtp(booking.bookingCode || "")}>
        Start OTP
      </button>
      <button
        type="button"
        onClick={() =>
          onSetupEscrow(booking.bookingCode || "", String(booking.payment?.totalAmount || ""))
        }
      >
        Setup Escrow
      </button>
      <button type="button" onClick={() => onRaiseDispute(booking.bookingCode || "")}>
        Raise Dispute
      </button>
    </div>
    {Array.isArray(booking.payment?.milestones) && booking.payment.milestones.length > 0 ? (
      <div className="freelancer-inline-actions">
        {booking.payment.milestones.map((milestone, index) => (
          <button
            key={`${booking.bookingCode}-ms-${index}`}
            type="button"
            onClick={() => onReleaseMilestone(booking.bookingCode, index)}
            disabled={milestone.status === "released"}
          >
            Release M{index + 1} ({milestone.status})
          </button>
        ))}
      </div>
    ) : null}
  </li>
);

export default BookingTimeline;
