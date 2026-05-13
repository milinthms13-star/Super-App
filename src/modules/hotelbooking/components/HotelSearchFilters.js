import React, { useState, useMemo } from "react";
import "../HotelBooking.css";

const KERALA_LOCATIONS = [
  "Kollam", "Varkala", "Alleppey", "Munnar", "Thekkady", "Kochi",
  "Trivandrum", "Kovalam", "Wayanad", "Kumarakom", "Periyar", "Idukki"
];

const PROPERTY_TYPES = [
  "Hotel", "Homestay", "Resort", "Lodge", "Villa", "Heritage Property",
  "Eco Lodge", "Beach Resort", "Hill Station Stay", "Houseboat"
];

const AMENITIES = [
  "WiFi", "AC", "TV", "Parking", "Swimming Pool", "Restaurant",
  "Spa", "Gym", "Pet Friendly", "Family Friendly", "Couple Friendly"
];

const HotelSearchFilters = ({
  searchLocation,
  setSearchLocation,
  checkIn,
  setCheckIn,
  checkOut,
  setCheckOut,
  guests,
  setGuests,
  budget,
  setBudget,
  selectedTypes,
  setSelectedTypes,
  selectedAmenities,
  setSelectedAmenities,
}) => {
  // Get minimum date (today)
  const today = useMemo(() => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  }, []);

  const handleGuestsChange = (e) => {
    setGuests(Number(e.target.value) || 1);
  };

  const handleBudgetChange = (e) => {
    setBudget(Number(e.target.value) || 500);
  };

  const toggleType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleAmenity = (amenity) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  return (
    <div className="hotel-booking-filters">
      <div className="hotel-booking-filter-group">
        <h3>📍 Location</h3>
        <select value={searchLocation} onChange={(e) => setSearchLocation(e.target.value)}>
          <option value="">All Locations</option>
          {KERALA_LOCATIONS.map(location => (
            <option key={location} value={location}>{location}</option>
          ))}
        </select>
      </div>

      <div className="hotel-booking-filter-group">
        <h3>📅 Dates</h3>
        <input
          type="date"
          placeholder="Check-in"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          min={today}
        />
        <input
          type="date"
          placeholder="Check-out"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          min={checkIn || today}
          disabled={!checkIn}
        />
      </div>

      <div className="hotel-booking-filter-group">
        <h3>👥 Guests</h3>
        <input
          type="number"
          min="1"
          max="20"
          value={guests}
          onChange={handleGuestsChange}
        />
      </div>

      <div className="hotel-booking-filter-group">
        <h3>💰 Budget (₹/night)</h3>
        <input
          type="range"
          min="500"
          max="20000"
          step="500"
          value={budget}
          onChange={handleBudgetChange}
        />
        <span>Up to ₹{budget}</span>
      </div>

      <div className="hotel-booking-filter-group">
        <h3>🏠 Property Type</h3>
        {PROPERTY_TYPES.map(type => (
          <label key={type} className="hotel-booking-checkbox">
            <input
              type="checkbox"
              checked={selectedTypes.includes(type)}
              onChange={() => toggleType(type)}
            />
            {type}
          </label>
        ))}
      </div>

      <div className="hotel-booking-filter-group">
        <h3>✨ Amenities</h3>
        {AMENITIES.map(amenity => (
          <label key={amenity} className="hotel-booking-checkbox">
            <input
              type="checkbox"
              checked={selectedAmenities.includes(amenity)}
              onChange={() => toggleAmenity(amenity)}
            />
            {amenity}
          </label>
        ))}
      </div>
    </div>
  );
};

export default HotelSearchFilters;
