import React from "react";
import { formatInr } from "../tourismData";
import PaymentButton from "./PaymentButton";

const BookingHistory = ({ bookings, loading, onRefresh, onPaymentSuccess, onPaymentFailure }) => (
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
              <th>Confirmation #</th>
              <th>Package</th>
              <th>Travel Date</th>
              <th>Status</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => {
              const totalAmount = booking.amountSummary?.totalAmount || 0;
              const paidAmount = booking.amountSummary?.paidAmount || 0;
              const balanceAmount = totalAmount - paidAmount;
              
              return (
                <tr key={booking._id || booking.id}>
                  <td><strong>{booking.confirmationNumber || booking.id}</strong></td>
                  <td>{booking.packageTitle}</td>
                  <td>{booking.travelDate || "-"}</td>
                  <td>
                    <span className={`tourism-status-badge tourism-status-${booking.bookingStatus}`}>
                      {booking.bookingStatus}
                    </span>
                  </td>
                  <td>{formatInr(totalAmount)}</td>
                  <td className="tourism-success-text">{formatInr(paidAmount)}</td>
                  <td className={balanceAmount > 0 ? "tourism-warning-text" : ""}>
                    {formatInr(balanceAmount)}
                  </td>
                  <td>
                    {booking.bookingStatus !== 'cancelled' && booking.bookingStatus !== 'refunded' && (
                      <PaymentButton
                        booking={booking}
                        onPaymentSuccess={onPaymentSuccess}
                        onPaymentFailure={onPaymentFailure}
                      />
                    )}
                    {(booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'refunded') && (
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!bookings.length ? (
        <div className="tourism-empty-state">
          No bookings yet. Your confirmed bookings will appear here.
        </div>
      ) : null}
    </div>
  </section>
);

export default BookingHistory;

