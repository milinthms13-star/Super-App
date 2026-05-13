import React, { useState, useEffect } from "react";
import { useApp } from "../../../contexts/AppContext";
import "../HotelBooking.css";

const MyBookings = ({ userId, currentUser }) => {
  const { apiCall } = useApp();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelingBooking, setCancelingBooking] = useState(null);

  // Fetch user bookings on mount
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);

        let savedBookings = [];
        try {
          const response = await apiCall("/hotelbookings/bookings", "GET", { userId });
          savedBookings = response?.bookings || response?.data?.bookings || response?.data || response || [];
        } catch (apiError) {
          console.warn("MyBookings API failed, using localStorage:", apiError);
          const raw = localStorage.getItem(`bookings_${userId}`);
          savedBookings = raw ? JSON.parse(raw) : [];
        }

        setBookings(Array.isArray(savedBookings) ? savedBookings : []);
      } catch (err) {
        console.error("Error fetching bookings:", err);
        setError(err.message || "Failed to load bookings");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchBookings();
    }
  }, [userId]);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    try {
      setCancelingBooking(bookingId);

      try {
        await apiCall(`/hotelbookings/bookings/${bookingId}/cancel`, "POST", {
          cancellationReason: "User requested cancellation",
        });
      } catch (apiError) {
        console.warn("Cancel booking API failed, falling back to local state:", apiError);
      }

      setBookings(prev =>
        prev.map(booking =>
          booking._id === bookingId
            ? { ...booking, status: "cancelled", cancellationReason: "Cancelled by guest" }
            : booking
        )
      );

      const updatedBookings = bookings.map(b =>
        b._id === bookingId
          ? { ...b, status: "cancelled", cancellationReason: "Cancelled by guest" }
          : b
      );
      localStorage.setItem(`bookings_${userId}`, JSON.stringify(updatedBookings));
    } catch (err) {
      console.error("Error canceling booking:", err);
      setError("Failed to cancel booking");
    } finally {
      setCancelingBooking(null);
    }
  };

  const handleContactHotel = (booking) => {
    const { hotelName, guestName, checkInDate, checkOutDate, roomType, finalTotal } = booking;
    const message = `Hi, I have a booking at ${hotelName}:\nGuest: ${guestName}\nCheck-in: ${checkInDate}\nCheck-out: ${checkOutDate}\nRoom: ${roomType}\nTotal: ₹${finalTotal}`;
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, "_blank");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "hotel-booking-status-confirmed";
      case "pending":
        return "hotel-booking-status-pending";
      case "cancelled":
        return "hotel-booking-status-cancelled";
      case "completed":
        return "hotel-booking-status-completed";
      default:
        return "";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "confirmed":
        return "✓";
      case "pending":
        return "⏳";
      case "cancelled":
        return "✕";
      case "completed":
        return "✓✓";
      default:
        return "•";
    }
  };

  if (loading) {
    return (
      <section className="hotel-booking-section">
        <div className="hotel-booking-section-heading">
          <h2>My Bookings</h2>
          <p>Track your hotel reservations and booking history.</p>
        </div>
        <div className="hotel-booking-loading">Loading your bookings...</div>
      </section>
    );
  }

  return (
    <section className="hotel-booking-section">
      <div className="hotel-booking-section-heading">
        <h2>My Bookings</h2>
        <p>Track your hotel reservations and booking history.</p>
      </div>

      {error && (
        <div className="hotel-booking-error-banner">
          {error}
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="hotel-booking-empty-state">
          <p>📭 No bookings yet</p>
          <p>Start exploring and book your first stay!</p>
        </div>
      ) : (
        <div className="hotel-booking-bookings-list">
          {bookings.map(booking => (
            <div key={booking._id || booking.id} className="hotel-booking-booking-card">
              <div className="hotel-booking-booking-header">
                <div>
                  <h3>{booking.hotelName}</h3>
                  <span className={`hotel-booking-status ${getStatusColor(booking.status)}`}>
                    {getStatusIcon(booking.status)} {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>
                <div className="hotel-booking-booking-ref">
                  Booking ID: {booking._id?.substring(0, 8) || booking.id?.substring(0, 8)}
                </div>
              </div>

              <div className="hotel-booking-booking-details">
                <div>
                  <span>📅 Check-in: {new Date(booking.checkInDate).toLocaleDateString()}</span>
                  <span>📅 Check-out: {new Date(booking.checkOutDate).toLocaleDateString()}</span>
                  <span>📅 Duration: {booking.numberOfNights} night(s)</span>
                </div>
                <div>
                  <span>👤 Guest: {booking.guestName}</span>
                  <span>🏠 Room: {booking.roomType}</span>
                  <span>👥 Guests: {booking.numberOfGuests}</span>
                </div>
                <div>
                  <span>💰 ₹{booking.pricePerNight?.toLocaleString() || 0}/night</span>
                  <span>💰 Total: ₹{booking.finalTotal?.toLocaleString() || booking.totalPrice?.toLocaleString()}</span>
                  <span>📞 {booking.guestPhone}</span>
                </div>
              </div>

              {booking.specialRequests && (
                <div className="hotel-booking-special-requests">
                  <strong>📝 Special Requests:</strong> {booking.specialRequests}
                </div>
              )}

              <div className="hotel-booking-booking-actions">
                <button
                  type="button"
                  className="hotel-booking-secondary-button"
                  onClick={() => handleContactHotel(booking)}
                >
                  📞 Contact Hotel
                </button>
                {booking.status === "pending" || booking.status === "confirmed" ? (
                  <button
                    type="button"
                    className="hotel-booking-danger-button"
                    onClick={() => handleCancelBooking(booking._id || booking.id)}
                    disabled={cancelingBooking === (booking._id || booking.id)}
                  >
                    {cancelingBooking === (booking._id || booking.id) ? "Canceling..." : "Cancel Booking"}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default MyBookings;
