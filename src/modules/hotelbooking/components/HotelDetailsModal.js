import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../../contexts/AppContext";
import "../HotelBooking.css";

const HotelDetailsModal = ({ hotel, checkIn, checkOut, guests, onClose, onBook, onWhatsApp, onCall, loading }) => {
  const { apiCall } = useApp();
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewError, setReviewError] = useState(null);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 1;
    return Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
  }, [checkIn, checkOut]);

  useEffect(() => {
    let mounted = true;
    const loadReviews = async () => {
      if (!hotel?.id) return;
      setLoadingReviews(true);
      setReviewError(null);
      try {
        const response = await apiCall(`/hotelbooking/hotels/${hotel.id}/reviews`, "GET");
        if (!mounted) return;
        setReviews(Array.isArray(response?.data) ? response.data : []);
      } catch (_error) {
        if (!mounted) return;
        setReviewError("Unable to load reviews right now.");
      } finally {
        if (mounted) setLoadingReviews(false);
      }
    };

    loadReviews();
    return () => {
      mounted = false;
    };
  }, [apiCall, hotel?.id]);

  if (!hotel) return null;

  return (
    <div className="hotel-booking-modal-overlay">
      <div className="hotel-booking-modal hotel-booking-hotel-detail-modal">
        <div className="hotel-booking-modal-header">
          <div>
            <h2>{hotel.name}</h2>
            <p>
              {hotel.location} | {hotel.propertyType || hotel.type} | Rating {hotel.rating?.toFixed(1) || 0}
            </p>
          </div>
          <button type="button" className="hotel-booking-modal-close" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>

        <div className="hotel-booking-modal-body">
          {loading && (
            <div className="hotel-booking-loading-block">
              <p>Fetching property details...</p>
            </div>
          )}

          <div className="hotel-booking-hotel-detail-gallery">
            {(hotel.images || []).slice(0, 3).map((src, index) => (
              <img key={index} src={src || "/api/placeholder/300/200"} alt={`${hotel.name} ${index + 1}`} />
            ))}
          </div>

          <div className="hotel-booking-modal-section">
            <h3>About this property</h3>
            <p>{hotel.description || "No property description available."}</p>
            <div className="hotel-booking-amenities hotel-booking-amenities-compact">
              {(hotel.amenities || []).map((amenity) => (
                <span key={amenity} className="hotel-booking-amenity-tag">
                  {amenity}
                </span>
              ))}
            </div>
          </div>

          <div className="hotel-booking-modal-section">
            <h3>Available rooms</h3>
            {hotel.rooms && hotel.rooms.length > 0 ? (
              <div className="hotel-booking-room-list">
                {hotel.rooms.map((room) => (
                  <div key={room.type} className="hotel-booking-room-card">
                    <div>
                      <strong>{room.type}</strong>
                      <p>{room.bedType || "Standard"} | Capacity {room.capacity || 1}</p>
                      <p>INR {Number(room.basePrice || hotel.pricePerNight || hotel.price).toLocaleString()} / night</p>
                      <p>
                        {Number.isFinite(Number(room.availableRooms))
                          ? `${room.availableRooms} rooms left`
                          : room.available
                          ? "Available"
                          : "Check availability"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No room details are available for this property.</p>
            )}
          </div>

          <div className="hotel-booking-modal-section">
            <h3>Booking summary</h3>
            <div className="hotel-booking-summary-row">
              <span>Check-in</span>
              <strong>{checkIn ? new Date(checkIn).toLocaleDateString() : "Select dates"}</strong>
            </div>
            <div className="hotel-booking-summary-row">
              <span>Check-out</span>
              <strong>{checkOut ? new Date(checkOut).toLocaleDateString() : "Select dates"}</strong>
            </div>
            <div className="hotel-booking-summary-row">
              <span>Nights</span>
              <strong>{nights}</strong>
            </div>
            <div className="hotel-booking-summary-row">
              <span>Guests</span>
              <strong>{guests || 1}</strong>
            </div>
          </div>

          <div className="hotel-booking-modal-section">
            <h3>Guest reviews</h3>
            {loading || loadingReviews ? (
              <p>Loading hotel details...</p>
            ) : reviewError ? (
              <p className="hotel-booking-error-text">{reviewError}</p>
            ) : reviews.length === 0 ? (
              <p>No reviews yet for this property.</p>
            ) : (
              reviews.slice(0, 4).map((review) => (
                <div key={review._id || review.id} className="hotel-booking-review-card">
                  <div className="hotel-booking-review-header">
                    <strong>{review.guestName || "Guest"}</strong>
                    <span>Rating {review.rating}</span>
                  </div>
                  <p>{review.comment || "No comment provided."}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="hotel-booking-modal-actions">
          <button type="button" className="hotel-booking-secondary-button" onClick={() => onWhatsApp(hotel)}>
            WhatsApp Property
          </button>
          <button type="button" className="hotel-booking-secondary-button" onClick={() => onCall(hotel)}>
            Call Property
          </button>
          <button type="button" className="hotel-booking-primary-button" onClick={() => onBook(hotel)} disabled={!checkIn || !checkOut}>
            {checkIn && checkOut ? "Book This Stay" : "Select Dates to Book"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HotelDetailsModal;
