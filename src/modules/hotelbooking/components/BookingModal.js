import React, { useMemo, useState } from "react";
import "../HotelBooking.css";

const BookingModal = ({ hotel, checkIn, checkOut, guests, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    roomType: hotel?.rooms?.[0]?.type || "",
    specialRequests: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nights = useMemo(() => {
    if (checkIn && checkOut) {
      return Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
    }
    return 1;
  }, [checkIn, checkOut]);

  const selectedRoom = useMemo(() => {
    return hotel?.rooms?.find((room) => room.type === formData.roomType);
  }, [hotel, formData.roomType]);

  const selectedRoomAvailable = useMemo(() => {
    if (!selectedRoom) return true;
    if (typeof selectedRoom.available === "boolean") return selectedRoom.available;
    if (typeof selectedRoom.availableRooms === "number") return selectedRoom.availableRooms > 0;
    return true;
  }, [selectedRoom]);

  const pricePerNight = Number(selectedRoom?.price ?? selectedRoom?.basePrice ?? hotel?.price ?? 0);
  const totalPrice = pricePerNight * nights;
  const gst = Math.round(totalPrice * 0.05);
  const finalTotal = totalPrice + gst;

  const validateForm = () => {
    const newErrors = {};

    if (!formData.guestName?.trim()) {
      newErrors.guestName = "Guest name is required";
    }

    if (!formData.guestEmail?.trim()) {
      newErrors.guestEmail = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guestEmail)) {
      newErrors.guestEmail = "Invalid email address";
    }

    if (!formData.guestPhone?.trim()) {
      newErrors.guestPhone = "Phone number is required";
    } else if (!/^[0-9]{10}$/.test(formData.guestPhone.replace(/\D/g, ""))) {
      newErrors.guestPhone = "Phone number must be 10 digits";
    }

    if (!formData.roomType) {
      newErrors.roomType = "Room type is required";
    }
    if (!selectedRoomAvailable) {
      newErrors.roomType = "Selected room is currently unavailable";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const bookingData = {
        hotelId: hotel?.id,
        hotelName: hotel?.name,
        location: hotel?.location,
        roomType: formData.roomType,
        guestName: formData.guestName,
        guestEmail: formData.guestEmail,
        guestPhone: formData.guestPhone,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfNights: nights,
        numberOfGuests: guests,
        numberOfRooms: 1,
        pricePerNight,
        totalPrice,
        gst,
        finalTotal,
        specialRequests: formData.specialRequests,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      await onSubmit(bookingData);
      onClose();
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        submit: error.message || "Failed to submit booking. Please try again.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hotel) return null;

  return (
    <div className="hotel-booking-modal-overlay">
      <div className="hotel-booking-modal">
        <div className="hotel-booking-modal-header">
          <h2>Book {hotel.name}</h2>
          <button type="button" className="hotel-booking-modal-close" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>

        <div className="hotel-booking-modal-body">
          <form onSubmit={handleSubmit}>
            <div className="hotel-booking-booking-summary">
              <h3>Booking Details</h3>
              <div className="hotel-booking-summary-row">
                <span>Check-in:</span>
                <strong>{new Date(checkIn).toLocaleDateString()}</strong>
              </div>
              <div className="hotel-booking-summary-row">
                <span>Check-out:</span>
                <strong>{new Date(checkOut).toLocaleDateString()}</strong>
              </div>
              <div className="hotel-booking-summary-row">
                <span>Nights:</span>
                <strong>{nights}</strong>
              </div>
              <div className="hotel-booking-summary-row">
                <span>Guests:</span>
                <strong>{guests}</strong>
              </div>
            </div>

            <div className="hotel-booking-form-section">
              <h3>Guest Information</h3>

              <div className="hotel-booking-form-group">
                <label htmlFor="guestName">Full Name *</label>
                <input
                  type="text"
                  id="guestName"
                  name="guestName"
                  value={formData.guestName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className={errors.guestName ? "hotel-booking-input-error" : ""}
                />
                {errors.guestName && <span className="hotel-booking-error-text">{errors.guestName}</span>}
              </div>

              <div className="hotel-booking-form-group">
                <label htmlFor="guestEmail">Email *</label>
                <input
                  type="email"
                  id="guestEmail"
                  name="guestEmail"
                  value={formData.guestEmail}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  className={errors.guestEmail ? "hotel-booking-input-error" : ""}
                />
                {errors.guestEmail && <span className="hotel-booking-error-text">{errors.guestEmail}</span>}
              </div>

              <div className="hotel-booking-form-group">
                <label htmlFor="guestPhone">Phone Number *</label>
                <input
                  type="tel"
                  id="guestPhone"
                  name="guestPhone"
                  value={formData.guestPhone}
                  onChange={handleInputChange}
                  placeholder="10-digit phone number"
                  maxLength="10"
                  className={errors.guestPhone ? "hotel-booking-input-error" : ""}
                />
                {errors.guestPhone && <span className="hotel-booking-error-text">{errors.guestPhone}</span>}
              </div>
            </div>

            <div className="hotel-booking-form-section">
              <h3>Room Selection</h3>

              <div className="hotel-booking-form-group">
                <label htmlFor="roomType">Room Type *</label>
                <select
                  id="roomType"
                  name="roomType"
                  value={formData.roomType}
                  onChange={handleInputChange}
                  className={errors.roomType ? "hotel-booking-input-error" : ""}
                >
                  <option value="">Select a room type</option>
                  {hotel.rooms?.map((room) => {
                    const roomPrice = Number(room?.price ?? room?.basePrice ?? 0);
                    const roomAvailable = typeof room.availableRooms === "number" ? room.availableRooms > 0 : room.available;
                    return (
                      <option key={room.type} value={room.type}>
                        {room.type} - INR {roomPrice.toLocaleString()}/night {roomAvailable ? "Available" : "Unavailable"}
                      </option>
                    );
                  })}
                </select>
                {errors.roomType && <span className="hotel-booking-error-text">{errors.roomType}</span>}
              </div>
            </div>

            <div className="hotel-booking-form-section">
              <h3>Special Requests (Optional)</h3>

              <div className="hotel-booking-form-group">
                <label htmlFor="specialRequests">Any special requirements?</label>
                <textarea
                  id="specialRequests"
                  name="specialRequests"
                  value={formData.specialRequests}
                  onChange={handleInputChange}
                  placeholder="E.g., high floor, near park, crib needed, dietary restrictions..."
                  rows="4"
                />
              </div>
            </div>

            <div className="hotel-booking-price-breakdown">
              <h3>Price Breakdown</h3>
              <div className="hotel-booking-price-row">
                <span>INR {pricePerNight.toLocaleString()} x {nights} night(s)</span>
                <strong>INR {totalPrice.toLocaleString()}</strong>
              </div>
              <div className="hotel-booking-price-row">
                <span>GST (5%)</span>
                <strong>INR {gst.toLocaleString()}</strong>
              </div>
              <div className="hotel-booking-price-row hotel-booking-price-total">
                <span>Total Amount</span>
                <strong>INR {finalTotal.toLocaleString()}</strong>
              </div>
            </div>

            {errors.submit && <div className="hotel-booking-error-banner">{errors.submit}</div>}

            <div className="hotel-booking-modal-actions">
              <button type="button" className="hotel-booking-secondary-button" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="hotel-booking-primary-button" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Confirm Booking"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
