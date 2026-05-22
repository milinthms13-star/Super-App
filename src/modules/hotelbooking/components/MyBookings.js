import React, { useEffect, useState } from "react";
import { useApp } from "../../../contexts/AppContext";
import "../HotelBooking.css";

const MyBookings = ({ userId }) => {
  const { apiCall } = useApp();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelingBooking, setCancelingBooking] = useState(null);
  const [confirmCancelBookingId, setConfirmCancelBookingId] = useState(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiCall("/hotelbooking/bookings/my", "GET");
        const rawBookings = response?.bookings || response?.data?.bookings || response?.data || response || [];
        const mappedBookings = (Array.isArray(rawBookings) ? rawBookings : []).map((booking) => {
          const backendStatus = String(booking.status || booking.bookingStatus || "pending").toLowerCase();
          const mappedStatus =
            backendStatus === "confirmed" || backendStatus === "checked in"
              ? "confirmed"
              : backendStatus === "completed"
              ? "completed"
              : backendStatus === "cancelled" || backendStatus === "rejected"
              ? "cancelled"
              : "pending";

          return {
            ...booking,
            _id: booking._id || booking.id,
            status: mappedStatus,
            bookingStatus: booking.bookingStatus || booking.status,
            checkInDate: booking.checkInDate || booking.checkIn,
            checkOutDate: booking.checkOutDate || booking.checkOut,
            numberOfNights: booking.numberOfNights || booking.nights || 1,
            numberOfGuests: booking.numberOfGuests || booking.guests || 1,
            roomType: booking.roomType || "Standard",
            guestPhone: booking.guestPhone || booking.phone || "",
            totalPrice: booking.totalPrice || booking.totalAmount || booking.finalTotal || 0,
            finalTotal: booking.finalTotal || booking.totalAmount || booking.totalPrice || 0,
          };
        });

        setBookings(mappedBookings);
      } catch (err) {
        setError(err?.response?.data?.message || err.message || "Failed to load bookings");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchBookings();
    }
  }, [apiCall, userId]);

  const handleCancelBooking = async (bookingId) => {
    if (confirmCancelBookingId !== bookingId) {
      setConfirmCancelBookingId(bookingId);
      setError("Click cancel again to confirm this cancellation.");
      return;
    }

    try {
      setCancelingBooking(bookingId);
      setError(null);

      await apiCall(`/hotelbooking/bookings/${bookingId}/cancel`, "POST", {
        cancellationReason: "User requested cancellation",
      });

      setBookings((prev) =>
        prev.map((booking) =>
          booking._id === bookingId ? { ...booking, status: "cancelled", cancellationReason: "Cancelled by guest" } : booking
        )
      );
      setConfirmCancelBookingId(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to cancel booking");
    } finally {
      setCancelingBooking(null);
    }
  };

  const handleContactHotel = (booking) => {
    const { hotelName, guestName, checkInDate, checkOutDate, roomType, finalTotal } = booking;
    const message = `Hi, I have a booking at ${hotelName}:\nGuest: ${guestName}\nCheck-in: ${checkInDate}\nCheck-out: ${checkOutDate}\nRoom: ${roomType}\nTotal: INR ${finalTotal}`;
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

      {error && <div className="hotel-booking-error-banner">{error}</div>}

      {bookings.length === 0 ? (
        <div className="hotel-booking-empty-state">
          <p>No bookings yet</p>
          <p>Start exploring and book your first stay.</p>
        </div>
      ) : (
        <div className="hotel-booking-bookings-list">
          {bookings.map((booking) => {
            const bookingId = booking._id || booking.id;
            const needsConfirm = confirmCancelBookingId === bookingId;
            return (
              <div key={bookingId} className="hotel-booking-booking-card">
                <div className="hotel-booking-booking-header">
                  <div>
                    <h3>{booking.hotelName}</h3>
                    <span className={`hotel-booking-status ${getStatusColor(booking.status)}`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </div>
                  <div className="hotel-booking-booking-ref">Booking ID: {bookingId?.substring(0, 8)}</div>
                </div>

                <div className="hotel-booking-booking-details">
                  <div>
                    <span>Check-in: {new Date(booking.checkInDate).toLocaleDateString()}</span>
                    <span>Check-out: {new Date(booking.checkOutDate).toLocaleDateString()}</span>
                    <span>Duration: {booking.numberOfNights} night(s)</span>
                  </div>
                  <div>
                    <span>Guest: {booking.guestName}</span>
                    <span>Room: {booking.roomType}</span>
                    <span>Guests: {booking.numberOfGuests}</span>
                  </div>
                  <div>
                    <span>Price: INR {booking.pricePerNight?.toLocaleString() || 0}/night</span>
                    <span>Total: INR {booking.finalTotal?.toLocaleString() || booking.totalPrice?.toLocaleString()}</span>
                    <span>Phone: {booking.guestPhone}</span>
                  </div>
                </div>

                {booking.specialRequests && (
                  <div className="hotel-booking-special-requests">
                    <strong>Special Requests:</strong> {booking.specialRequests}
                  </div>
                )}

                <div className="hotel-booking-booking-actions">
                  <button type="button" className="hotel-booking-secondary-button" onClick={() => handleContactHotel(booking)}>
                    Contact Hotel
                  </button>
                  {(booking.status === "pending" || booking.status === "confirmed") && (
                    <button
                      type="button"
                      className="hotel-booking-danger-button"
                      onClick={() => handleCancelBooking(bookingId)}
                      disabled={cancelingBooking === bookingId}
                    >
                      {cancelingBooking === bookingId
                        ? "Canceling..."
                        : needsConfirm
                        ? "Confirm Cancel"
                        : "Cancel Booking"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default MyBookings;
