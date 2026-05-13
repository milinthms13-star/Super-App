import React from "react";
import "../HotelBooking.css";

const HotelCard = ({
  hotel,
  checkIn,
  checkOut,
  guests,
  onBooking,
  onWhatsApp,
  onCall,
  onViewDetails,
}) => {
  // Calculate nights and total price
  const nights = checkIn && checkOut
    ? Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))
    : 1;
  
  const totalPrice = hotel.price * nights;

  return (
    <div className="hotel-booking-hotel-card">
      <div className="hotel-booking-hotel-image">
        <img src={hotel.images?.[0] || "/api/placeholder/300/200"} alt={hotel.name} />
        {hotel.verified && <span className="hotel-booking-verified">✓ Verified</span>}
      </div>

      <div className="hotel-booking-hotel-info">
        <div className="hotel-booking-hotel-header">
          <h3>{hotel.name}</h3>
          <div className="hotel-booking-rating">
            ⭐ {hotel.rating} ({hotel.reviews} reviews)
          </div>
        </div>

        <div className="hotel-booking-hotel-details">
          <span>📍 {hotel.location}</span>
          <span>🏠 {hotel.type}</span>
          <span>💰 ₹{hotel.price.toLocaleString()}/night</span>
          {checkIn && checkOut && <span>📅 {nights} night(s) = ₹{totalPrice.toLocaleString()}</span>}
        </div>

        <p className="hotel-booking-description">{hotel.description}</p>

        <div className="hotel-booking-amenities">
          {hotel.amenities?.slice(0, 4).map(amenity => (
            <span key={amenity} className="hotel-booking-amenity-tag">
              {amenity}
            </span>
          ))}
        </div>

        <div className="hotel-booking-actions">
          <button
            type="button"
            className="hotel-booking-primary-button"
            onClick={() => onBooking(hotel)}
            title={checkIn && checkOut ? "Book now" : "Select dates first"}
            disabled={!checkIn || !checkOut}
          >
            Book Now
          </button>
          <button
            type="button"
            className="hotel-booking-secondary-button"
            onClick={() => onViewDetails(hotel)}
          >
            View Details
          </button>
          <button
            type="button"
            className="hotel-booking-secondary-button"
            onClick={() => onWhatsApp(hotel)}
          >
            WhatsApp
          </button>
          <button
            type="button"
            className="hotel-booking-secondary-button"
            onClick={() => onCall(hotel)}
          >
            📞 Call
          </button>
        </div>
      </div>
    </div>
  );
};

export default HotelCard;
