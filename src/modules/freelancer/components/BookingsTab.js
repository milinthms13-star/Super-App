import React from "react";
import BookingTimeline from "./BookingTimeline";

const BookingsTab = ({
  createBooking,
  bookingForm,
  setBookingForm,
  providers,
  rolePermissions,
  trackPhone,
  setTrackPhone,
  fetchMyBookings,
  bookingsLoading,
  bookings,
  bookingStatusSequence,
  bookingStatusLabels,
  normalizeBookingStatus,
  getBookingStatusLabel,
  getBookingNextAction,
  setOtpTargetBooking,
  setEscrowBookingCode,
  setEscrowTotalAmount,
  setDisputeBookingCode,
  releaseMilestone,
  otpTargetBooking,
  sendOtp,
  otpCode,
  setOtpCode,
  verifyOtp,
  escrowBookingCode,
  setEscrowBookingCodeValue,
  escrowTotalAmount,
  setEscrowTotalAmountValue,
  escrowMilestonesText,
  setEscrowMilestonesText,
  initializeEscrow,
  cancelBookingCode,
  setCancelBookingCode,
  cancelByRole,
  setCancelByRole,
  cancelReason,
  setCancelReason,
  submitCancellation,
  refundBookingCode,
  setRefundBookingCode,
  refundReason,
  setRefundReason,
  submitRefund,
  disputeBookingCode,
  setDisputeBookingCodeValue,
  disputeRaisedByName,
  setDisputeRaisedByName,
  disputeRole,
  setDisputeRole,
  disputeAgainstRole,
  setDisputeAgainstRole,
  disputeReason,
  setDisputeReason,
  disputeDetails,
  setDisputeDetails,
  setDisputeProofs,
  submitDispute,
  disputeStatusFilter,
  setDisputeStatusFilter,
  disputeResolutionNote,
  setDisputeResolutionNote,
  disputes,
  resolveDispute,
}) => (
  <section className="freelancer-section">
    <div className="freelancer-section-header">
      <h2>Booking + Payment + Safety Workflow</h2>
      <p>Real booking table, status flow, OTP start, escrow, milestones, refunds and disputes.</p>
    </div>

    <div className="freelancer-dual-grid">
      <article className="freelancer-panel">
        <h3>Create Booking</h3>
        <form className="freelancer-form" onSubmit={createBooking}>
          <label>
            Provider
            <select
              value={bookingForm.providerId}
              onChange={(event) =>
                setBookingForm((current) => ({ ...current, providerId: event.target.value }))
              }
            >
              <option value="">Select provider</option>
              {providers.map((provider) => (
                <option key={`booking-provider-${provider._id}`} value={provider._id}>
                  {provider.name} ({provider.category})
                </option>
              ))}
            </select>
          </label>
          <label>
            Customer Name
            <input
              type="text"
              value={bookingForm.customerName}
              onChange={(event) =>
                setBookingForm((current) => ({ ...current, customerName: event.target.value }))
              }
            />
          </label>
          <label>
            Customer Phone
            <input
              type="tel"
              value={bookingForm.customerPhone}
              onChange={(event) =>
                setBookingForm((current) => ({ ...current, customerPhone: event.target.value }))
              }
            />
          </label>
          <label>
            Service Mode
            <select
              value={bookingForm.serviceMode}
              onChange={(event) =>
                setBookingForm((current) => ({ ...current, serviceMode: event.target.value }))
              }
            >
              <option value="gig">Gig</option>
              <option value="hourly">Hourly</option>
            </select>
          </label>
          <label>
            Booking Mode
            <select
              value={bookingForm.bookingMode}
              onChange={(event) =>
                setBookingForm((current) => ({ ...current, bookingMode: event.target.value }))
              }
            >
              <option value="instant">Instant</option>
              <option value="schedule">Schedule</option>
              <option value="quotation">Quotation</option>
              <option value="bidding">Bidding</option>
            </select>
          </label>
          <label>
            Schedule
            <input
              type="text"
              value={bookingForm.schedule}
              onChange={(event) => setBookingForm((current) => ({ ...current, schedule: event.target.value }))}
              placeholder="Tomorrow 10:00 AM"
            />
          </label>
          <label>
            Notes
            <textarea
              rows={3}
              value={bookingForm.notes}
              onChange={(event) => setBookingForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>
          <label>
            Amount
            <input
              type="number"
              value={bookingForm.totalAmount}
              onChange={(event) =>
                setBookingForm((current) => ({ ...current, totalAmount: event.target.value }))
              }
            />
          </label>
          <label className="freelancer-checkbox">
            <input
              type="checkbox"
              checked={bookingForm.emergency}
              onChange={(event) =>
                setBookingForm((current) => ({ ...current, emergency: event.target.checked }))
              }
            />
            Emergency Booking
          </label>
          <button type="submit" disabled={!rolePermissions.canBook}>
            Create Booking
          </button>
        </form>
      </article>

      <article className="freelancer-panel">
        <h3>My Booking Tracker</h3>
        <div className="freelancer-inline-actions">
          <input
            type="tel"
            value={trackPhone}
            onChange={(event) => setTrackPhone(event.target.value)}
            placeholder="Customer phone"
          />
          <button type="button" onClick={() => fetchMyBookings()}>
            Load
          </button>
        </div>

        {bookingsLoading ? <p className="freelancer-note">Loading bookings...</p> : null}
        {!bookingsLoading && bookings.length === 0 ? (
          <p className="freelancer-note">No booking records. Create one to start the workflow.</p>
        ) : null}
        <ul className="freelancer-list">
          {bookings.map((booking) => (
            <BookingTimeline
              key={booking._id}
              booking={booking}
              bookingStatusSequence={bookingStatusSequence}
              bookingStatusLabels={bookingStatusLabels}
              normalizeBookingStatus={normalizeBookingStatus}
              getBookingStatusLabel={getBookingStatusLabel}
              getBookingNextAction={getBookingNextAction}
              onStartOtp={(bookingCode) => setOtpTargetBooking(bookingCode)}
              onSetupEscrow={(bookingCode, totalAmount) => {
                setEscrowBookingCode(bookingCode);
                setEscrowTotalAmount(totalAmount);
              }}
              onRaiseDispute={(bookingCode) => setDisputeBookingCode(bookingCode)}
              onReleaseMilestone={releaseMilestone}
            />
          ))}
        </ul>
      </article>
    </div>

    <div className="freelancer-dual-grid">
      <article className="freelancer-panel">
        <h3>OTP Before Work Starts</h3>
        <label>
          Booking Code
          <input
            type="text"
            value={otpTargetBooking}
            onChange={(event) => setOtpTargetBooking(event.target.value)}
          />
        </label>
        <div className="freelancer-inline-actions">
          <button type="button" onClick={sendOtp}>
            Send OTP
          </button>
        </div>
        <label>
          OTP
          <input type="text" value={otpCode} onChange={(event) => setOtpCode(event.target.value)} />
        </label>
        <button type="button" onClick={verifyOtp}>
          Verify OTP
        </button>
      </article>

      <article className="freelancer-panel">
        <h3>Escrow and Milestones</h3>
        <label>
          Booking Code
          <input
            type="text"
            value={escrowBookingCode}
            onChange={(event) => setEscrowBookingCodeValue(event.target.value)}
          />
        </label>
        <label>
          Total Amount
          <input
            type="number"
            value={escrowTotalAmount}
            onChange={(event) => setEscrowTotalAmountValue(event.target.value)}
          />
        </label>
        <label>
          Milestones (one per line: Title|Amount)
          <textarea
            rows={4}
            value={escrowMilestonesText}
            onChange={(event) => setEscrowMilestonesText(event.target.value)}
          />
        </label>
        <button type="button" onClick={initializeEscrow}>
          Initialize Escrow
        </button>
      </article>
    </div>

    <div className="freelancer-dual-grid">
      <article className="freelancer-panel">
        <h3>Cancellation Policy Flow</h3>
        <label>
          Booking Code
          <input
            type="text"
            value={cancelBookingCode}
            onChange={(event) => setCancelBookingCode(event.target.value)}
          />
        </label>
        <label>
          Requested By
          <select value={cancelByRole} onChange={(event) => setCancelByRole(event.target.value)}>
            <option value="customer">Customer</option>
            <option value="provider">Provider</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label>
          Reason
          <textarea rows={2} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} />
        </label>
        <button type="button" onClick={submitCancellation}>
          Submit Cancellation
        </button>
      </article>

      <article className="freelancer-panel">
        <h3>Refund Request</h3>
        <label>
          Booking Code
          <input
            type="text"
            value={refundBookingCode}
            onChange={(event) => setRefundBookingCode(event.target.value)}
          />
        </label>
        <label>
          Reason
          <textarea rows={2} value={refundReason} onChange={(event) => setRefundReason(event.target.value)} />
        </label>
        <button type="button" onClick={submitRefund}>
          Request Refund
        </button>
      </article>
    </div>

    <article className="freelancer-panel">
      <h3>Dispute and Proof Upload</h3>
      <div className="freelancer-filter-grid">
        <label>
          Booking Code
          <input
            type="text"
            value={disputeBookingCode}
            onChange={(event) => setDisputeBookingCodeValue(event.target.value)}
          />
        </label>
        <label>
          Raised By Name
          <input
            type="text"
            value={disputeRaisedByName}
            onChange={(event) => setDisputeRaisedByName(event.target.value)}
          />
        </label>
        <label>
          Raised By Role
          <select value={disputeRole} onChange={(event) => setDisputeRole(event.target.value)}>
            <option value="customer">Customer</option>
            <option value="provider">Provider</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label>
          Against
          <select value={disputeAgainstRole} onChange={(event) => setDisputeAgainstRole(event.target.value)}>
            <option value="provider">Provider</option>
            <option value="customer">Customer</option>
            <option value="platform">Platform</option>
          </select>
        </label>
      </div>
      <label>
        Reason
        <input type="text" value={disputeReason} onChange={(event) => setDisputeReason(event.target.value)} />
      </label>
      <label>
        Details
        <textarea rows={3} value={disputeDetails} onChange={(event) => setDisputeDetails(event.target.value)} />
      </label>
      <label>
        Proof Upload
        <input
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp,.mp4"
          onChange={(event) => setDisputeProofs(Array.from(event.target.files || []))}
        />
      </label>
      <button type="button" onClick={submitDispute}>
        Create Dispute
      </button>
      <h4>Admin Dispute Panel</h4>
      <label>
        Filter
        <select value={disputeStatusFilter} onChange={(event) => setDisputeStatusFilter(event.target.value)}>
          <option value="open">Open</option>
          <option value="under-review">Under Review</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>
      </label>
      <label>
        Resolution Note
        <textarea
          rows={2}
          value={disputeResolutionNote}
          onChange={(event) => setDisputeResolutionNote(event.target.value)}
          placeholder="Summarize resolution decision and supporting evidence."
        />
      </label>
      <ul className="freelancer-list">
        {disputes.map((dispute) => (
          <li key={dispute._id}>
            <strong>{dispute.disputeCode}</strong> | {dispute.reason} | {dispute.status}
            <br />
            Raised by {dispute.raisedByName} ({dispute.raisedByRole}) against {dispute.raisedAgainstRole}
            {Array.isArray(dispute.proofs) && dispute.proofs.length > 0 ? (
              <>
                <br />
                Proofs: {dispute.proofs.length}
              </>
            ) : null}
            {rolePermissions.canResolveDisputes && dispute.status !== "resolved" ? (
              <div className="freelancer-inline-actions">
                <button
                  type="button"
                  onClick={() => void resolveDispute(dispute.disputeCode, "under-review", "investigate")}
                >
                  Mark Under Review
                </button>
                <button
                  type="button"
                  onClick={() => void resolveDispute(dispute.disputeCode, "resolved", "refund_partial")}
                >
                  Resolve
                </button>
                <button
                  type="button"
                  onClick={() => void resolveDispute(dispute.disputeCode, "rejected", "reject_claim")}
                >
                  Reject
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </article>
  </section>
);

export default BookingsTab;
