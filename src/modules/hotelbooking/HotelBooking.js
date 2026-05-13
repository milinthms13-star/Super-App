import React, { useMemo, useState, useEffect } from "react";
import { useApp } from "../../contexts/AppContext";
import "./HotelBooking.css";
import HotelSearchFilters from "./components/HotelSearchFilters";
import HotelCard from "./components/HotelCard";
import BookingModal from "./components/BookingModal";
import MyBookings from "./components/MyBookings";
import PartnerDashboard from "./components/PartnerDashboard";
import AdminHotelPanel from "./components/AdminHotelPanel";

// Hotel data - TODO: Move to backend and fetch from API
const SAMPLE_HOTELS = [
  {
    id: 1,
    name: "Green Valley Homestay",
    location: "Munnar",
    type: "Homestay",
    rating: 4.8,
    reviews: 156,
    price: 2500,
    images: ["/api/placeholder/300/200"],
    amenities: ["WiFi", "Parking", "Restaurant", "Family Friendly"],
    description: "Peaceful homestay with mountain views, organic farm, and authentic Kerala cuisine.",
    rooms: [
      { type: "Deluxe Room", price: 2500, available: true },
      { type: "Suite", price: 3500, available: true }
    ],
    contact: { phone: "+91 9876543210", whatsapp: "+91 9876543210" },
    verified: true
  },
  {
    id: 2,
    name: "Backwater Paradise Resort",
    location: "Alleppey",
    type: "Resort",
    rating: 4.6,
    reviews: 89,
    price: 4500,
    images: ["/api/placeholder/300/200"],
    amenities: ["WiFi", "AC", "Swimming Pool", "Restaurant", "Spa"],
    description: "Luxury resort with private backwater access, ayurvedic spa, and traditional Kerala architecture.",
    rooms: [
      { type: "Deluxe Room", price: 4500, available: true },
      { type: "Villa", price: 6500, available: false }
    ],
    contact: { phone: "+91 9876543211", whatsapp: "+91 9876543211" },
    verified: true
  },
  {
    id: 3,
    name: "Heritage Lodge Varkala",
    location: "Varkala",
    type: "Heritage Property",
    rating: 4.7,
    reviews: 203,
    price: 1800,
    images: ["/api/placeholder/300/200"],
    amenities: ["WiFi", "Parking", "Restaurant", "Pet Friendly"],
    description: "Century-old Dutch bungalow converted to boutique heritage stay with cliff views.",
    rooms: [
      { type: "Heritage Room", price: 1800, available: true },
      { type: "Suite", price: 2800, available: true }
    ],
    contact: { phone: "+91 9876543212", whatsapp: "+91 9876543212" },
    verified: true
  }
];

const HotelBooking = () => {
  const { currentUser, apiCall } = useApp();
  const [activeTab, setActiveTab] = useState("search");
  const [searchLocation, setSearchLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [budget, setBudget] = useState(5000);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [sortBy, setSortBy] = useState("rating");
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  // Validate dates
  const isValidDateRange = useMemo(() => {
    if (!checkIn || !checkOut) return true;
    return new Date(checkOut) > new Date(checkIn);
  }, [checkIn, checkOut]);

  // Get today's date for minimum date validation
  const today = useMemo(() => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  }, []);

  // Filter hotels with availability checking
  const filteredHotels = useMemo(() => {
    let filtered = SAMPLE_HOTELS.filter(hotel => {
      const locationMatch = !searchLocation || hotel.location.toLowerCase().includes(searchLocation.toLowerCase());
      const budgetMatch = hotel.price <= budget;
      const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(hotel.type);
      const amenityMatch = selectedAmenities.length === 0 ||
        selectedAmenities.every(amenity => hotel.amenities.includes(amenity));

      return locationMatch && budgetMatch && typeMatch && amenityMatch;
    });

    // Apply sorting
    filtered = filtered.sort((a, b) => {
      switch (sortBy) {
        case "price-low": return a.price - b.price;
        case "price-high": return b.price - a.price;
        case "rating": return b.rating - a.rating;
        default: return 0;
      }
    });

    return filtered;
  }, [searchLocation, budget, selectedTypes, selectedAmenities, sortBy]);

  // Handle booking submission
  const handleBookingSubmit = async (bookingData) => {
    const userId = currentUser?.id || "guest";
    const fallbackBooking = {
      ...bookingData,
      _id: Date.now().toString(),
      userId,
      status: bookingData.status || "confirmed",
    };

    try {
      const response = await apiCall("/hotelbookings/bookings", "POST", bookingData);
      const newBooking = response?.booking || response?.data?.booking || response?.data || response || fallbackBooking;
      const existingBookings = JSON.parse(localStorage.getItem(`bookings_${userId}`) || "[]");
      existingBookings.push(newBooking);
      localStorage.setItem(`bookings_${userId}`, JSON.stringify(existingBookings));

      setBookingSuccess(`Booking confirmed for ${newBooking.hotelName}! Confirmation sent to ${newBooking.guestEmail || bookingData.guestEmail}`);
      setTimeout(() => setBookingSuccess(null), 5000);
      setActiveTab("bookings");
    } catch (error) {
      console.warn("Booking API failed, falling back to localStorage:", error);
      const existingBookings = JSON.parse(localStorage.getItem(`bookings_${userId}`) || "[]");
      existingBookings.push(fallbackBooking);
      localStorage.setItem(`bookings_${userId}`, JSON.stringify(existingBookings));

      setBookingSuccess(`Booking confirmed for ${fallbackBooking.hotelName}! Offline copy saved.`);
      setTimeout(() => setBookingSuccess(null), 5000);
      setActiveTab("bookings");
    }
  };

  // Handle booking request click
  const handleBookingClick = (hotel) => {
    if (!isValidDateRange) {
      alert("Please select valid dates (check-out after check-in)");
      return;
    }
    if (!checkIn || !checkOut) {
      alert("Please select check-in and check-out dates");
      return;
    }
    setSelectedHotel(hotel);
    setShowBookingModal(true);
  };

  // Handle WhatsApp booking
  const handleWhatsAppBooking = (hotel) => {
    if (!checkIn || !checkOut) {
      alert("Please select dates first");
      return;
    }
    const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
    const totalPrice = hotel.price * nights;
    const message = `Hi! I'm interested in booking at ${hotel.name}, ${hotel.location}.\n\nDetails:\nCheckCheck-in: ${new Date(checkIn).toLocaleDateString()}\nCheck-out: ${new Date(checkOut).toLocaleDateString()}\nNights: ${nights}\nGuests: ${guests}\nRoom Type: ${hotel.rooms?.[0]?.type || "Standard"}\nTotal: ₹${totalPrice.toLocaleString()}\n\nPlease confirm availability and send booking details.`;
    const whatsappLink = `https://wa.me/${hotel.contact.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, "_blank");
  };

  // Handle call
  const handleCall = (hotel) => {
    window.location.href = `tel:${hotel.contact.phone}`;
  };

  // Handle view details (future: open details page)
  const handleViewDetails = (hotel) => {
    alert(`Hotel Details:\n\n${hotel.name}\n${hotel.location}\n\nFull details page coming soon!`);
  };

  // Determine if user should see admin panel (role check)
  const isAdmin = currentUser?.role === "admin" || currentUser?.registrationType === "admin";
  const isPartner = currentUser?.role === "partner" || currentUser?.registrationType === "partner";

  return (
    <div className="hotel-booking-shell">
      <section className="hotel-booking-hero">
        <div className="hotel-booking-hero-copy">
          <h1>NilaStay — Kerala Hotel & Homestay Booking</h1>
          <p>
            Discover authentic Kerala stays: from cliffside homestays to backwater resorts.
            Book directly with verified local properties.
          </p>
          <div className="hotel-booking-hero-actions">
            <button type="button" className="hotel-booking-primary-button" onClick={() => setActiveTab("search")}>
              Find Your Stay
            </button>
            <button type="button" className="hotel-booking-secondary-button" onClick={() => setActiveTab("partner")}>
              List Your Property
            </button>
          </div>
          <div className="hotel-booking-hero-tags">
            <span>Verified Properties</span>
            <span>Direct Booking</span>
            <span>Local Support</span>
            <span>Best Price Guarantee</span>
          </div>
        </div>
      </section>

      <section className="hotel-booking-nav">
        <button
          type="button"
          className={`hotel-booking-nav-item ${activeTab === "search" ? "active" : ""}`}
          onClick={() => setActiveTab("search")}
        >
          🔍 Find Hotels
        </button>
        <button
          type="button"
          className={`hotel-booking-nav-item ${activeTab === "bookings" ? "active" : ""}`}
          onClick={() => setActiveTab("bookings")}
        >
          📋 My Bookings
        </button>
        <button
          type="button"
          className={`hotel-booking-nav-item ${activeTab === "partner" ? "active" : ""}`}
          onClick={() => setActiveTab("partner")}
        >
          🏨 Partner Hotels
        </button>
        {isAdmin && (
          <button
            type="button"
            className={`hotel-booking-nav-item ${activeTab === "admin" ? "active" : ""}`}
            onClick={() => setActiveTab("admin")}
          >
            ⚙️ Admin Panel
          </button>
        )}
      </section>

      {/* Success Message Banner */}
      {bookingSuccess && (
        <div className="hotel-booking-success-banner">
          ✓ {bookingSuccess}
        </div>
      )}

      {/* Search Tab */}
      {activeTab === "search" && (
        <section className="hotel-booking-section">
          <div className="hotel-booking-search-grid">
            <HotelSearchFilters
              searchLocation={searchLocation}
              setSearchLocation={setSearchLocation}
              checkIn={checkIn}
              setCheckIn={setCheckIn}
              checkOut={checkOut}
              setCheckOut={setCheckOut}
              guests={guests}
              setGuests={setGuests}
              budget={budget}
              setBudget={setBudget}
              selectedTypes={selectedTypes}
              setSelectedTypes={setSelectedTypes}
              selectedAmenities={selectedAmenities}
              setSelectedAmenities={setSelectedAmenities}
            />

            <div className="hotel-booking-results">
              <div className="hotel-booking-results-header">
                <h2>{filteredHotels.length} Properties Found</h2>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="rating">Sort by Rating</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>

              <div className="hotel-booking-hotels-list">
                {filteredHotels.map(hotel => (
                  <HotelCard
                    key={hotel.id}
                    hotel={hotel}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    guests={guests}
                    onBooking={handleBookingClick}
                    onWhatsApp={handleWhatsAppBooking}
                    onCall={handleCall}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* My Bookings Tab */}
      {activeTab === "bookings" && (
        <MyBookings
          userId={currentUser?.id || "guest"}
          currentUser={currentUser}
        />
      )}

      {/* Partner Tab */}
      {activeTab === "partner" && (
        <PartnerDashboard currentUser={currentUser} />
      )}

      {/* Admin Tab (Only visible to admins) */}
      {activeTab === "admin" && isAdmin && (
        <AdminHotelPanel currentUser={currentUser} />
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedHotel && (
        <BookingModal
          hotel={selectedHotel}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedHotel(null);
          }}
          onSubmit={handleBookingSubmit}
        />
      )}
    </div>
  );
};

export default HotelBooking;
