import React from "react";
import { formatInr } from "../tourismData";

const BookingHistory = ({ bookings, loading, onRefresh }) => (
  <section className="tourism-section">
    <div className="tourism-section-heading">
      <h2>Booking History</h2>
      <p>Track status, payment mode, and refund eligibility for all your trips.</p>
    </div>
    <div className="tourism-panel">
      <div className="tourism-card-footer">
        <span>{bookings.length} booking records</span>
        <button type="button" className="tourism-secondary-button" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <div className="tourism-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Package</th>
              <th>Travel Date</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Payable</th>
              <th>Coupon</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td>{booking.id}</td>
                <td>{booking.packageTitle}</td>
                <td>{booking.travelDate || "-"}</td>
                <td>{booking.bookingStatus}</td>
                <td>{booking.amountSummary?.paymentType || "-"}</td>
                <td>{formatInr(booking.amountSummary?.payableAmount || 0)}</td>
                <td>{booking.amountSummary?.couponCode || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!bookings.length ? <div className="tourism-empty-state">No bookings yet. Your confirmed bookings will appear here.</div> : null}
    </div>
  </section>
);

export default BookingHistory;

