import React, { useMemo, useState } from "react";
import "./HotelBooking.css";

const KERALA_LOCATIONS = [
  "Kollam", "Varkala", "Alleppey", "Munnar", "Thekkady", "Kochi",
  "Trivandrum", "Kovalam", "Wayanad", "Kumarakom", "Periyar", "Idukki"
];

const ROOM_TYPES = [
  "Standard Room", "Deluxe Room", "Suite", "Villa", "Cottage", "Tree House",
  "Heritage Room", "Presidential Suite", "Family Room", "Couple Room"
];

const PROPERTY_TYPES = [
  "Hotel", "Homestay", "Resort", "Lodge", "Villa", "Heritage Property",
  "Eco Lodge", "Beach Resort", "Hill Station Stay", "Houseboat"
];

const AMENITIES = [
  "WiFi", "AC", "TV", "Parking", "Swimming Pool", "Restaurant",
  "Spa", "Gym", "Pet Friendly", "Family Friendly", "Couple Friendly"
];

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
  const [activeTab, setActiveTab] = useState("search");
  const [searchLocation, setSearchLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [budget, setBudget] = useState(5000);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [sortBy, setSortBy] = useState("rating");

  const filteredHotels = useMemo(() => {
    return SAMPLE_HOTELS.filter(hotel => {
      const locationMatch = !searchLocation || hotel.location.toLowerCase().includes(searchLocation.toLowerCase());
      const budgetMatch = hotel.price <= budget;
      const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(hotel.type);
      const amenityMatch = selectedAmenities.length === 0 ||
        selectedAmenities.every(amenity => hotel.amenities.includes(amenity));

      return locationMatch && budgetMatch && typeMatch && amenityMatch;
    }).sort((a, b) => {
      switch (sortBy) {
        case "price-low": return a.price - b.price;
        case "price-high": return b.price - a.price;
        case "rating": return b.rating - a.rating;
        default: return 0;
      }
    });
  }, [searchLocation, budget, selectedTypes, selectedAmenities, sortBy]);

  const handleBookingRequest = (hotel) => {
    alert(`Demo: Booking request sent to ${hotel.name}. In real app, this would open booking form with WhatsApp integration.`);
  };

  const handleCallHotel = (phone) => {
    alert(`Demo: Calling ${phone}. In real app, this would initiate phone call.`);
  };

  const handleWhatsAppBooking = (whatsapp) => {
    alert(`Demo: Opening WhatsApp chat with ${whatsapp}. In real app, this would open WhatsApp with booking message.`);
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
        <button
          type="button"
          className={`hotel-booking-nav-item ${activeTab === "admin" ? "active" : ""}`}
          onClick={() => setActiveTab("admin")}
        >
          ⚙️ Admin Panel
        </button>
      </section>

      {activeTab === "search" && (
        <section className="hotel-booking-section">
          <div className="hotel-booking-search-grid">
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
                />
                <input
                  type="date"
                  placeholder="Check-out"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>

              <div className="hotel-booking-filter-group">
                <h3>👥 Guests</h3>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
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
                  onChange={(e) => setBudget(e.target.value)}
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
                  <div key={hotel.id} className="hotel-booking-hotel-card">
                    <div className="hotel-booking-hotel-image">
                      <img src={hotel.images[0]} alt={hotel.name} />
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
                        <span>💰 ₹{hotel.price}/night</span>
                      </div>

                      <p className="hotel-booking-description">{hotel.description}</p>

                      <div className="hotel-booking-amenities">
                        {hotel.amenities.slice(0, 4).map(amenity => (
                          <span key={amenity} className="hotel-booking-amenity-tag">
                            {amenity}
                          </span>
                        ))}
                      </div>

                      <div className="hotel-booking-actions">
                        <button
                          type="button"
                          className="hotel-booking-primary-button"
                          onClick={() => handleBookingRequest(hotel)}
                        >
                          Request Booking
                        </button>
                        <button
                          type="button"
                          className="hotel-booking-secondary-button"
                          onClick={() => handleWhatsAppBooking(hotel.contact.whatsapp)}
                        >
                          WhatsApp
                        </button>
                        <button
                          type="button"
                          className="hotel-booking-secondary-button"
                          onClick={() => handleCallHotel(hotel.contact.phone)}
                        >
                          📞 Call
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === "bookings" && (
        <section className="hotel-booking-section">
          <div className="hotel-booking-section-heading">
            <h2>My Bookings</h2>
            <p>Track your hotel reservations and booking history.</p>
          </div>
          <div className="hotel-booking-bookings-list">
            <div className="hotel-booking-booking-card">
              <div className="hotel-booking-booking-header">
                <h3>Green Valley Homestay</h3>
                <span className="hotel-booking-status confirmed">✓ Confirmed</span>
              </div>
              <div className="hotel-booking-booking-details">
                <span>📅 15-17 May 2024</span>
                <span>👥 2 Guests</span>
                <span>💰 ₹5,000 total</span>
              </div>
              <div className="hotel-booking-booking-actions">
                <button type="button" className="hotel-booking-secondary-button">View Details</button>
                <button type="button" className="hotel-booking-secondary-button">Contact Hotel</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === "partner" && (
        <section className="hotel-booking-section">
          <div className="hotel-booking-section-heading">
            <h2>Partner With Us</h2>
            <p>List your hotel or homestay on NilaStay and reach more customers.</p>
          </div>
          <div className="hotel-booking-partner-grid">
            <div className="hotel-booking-partner-card">
              <h3>🏨 Hotel Registration</h3>
              <p>Register your property and start receiving direct bookings.</p>
              <ul>
                <li>Free basic listing</li>
                <li>Direct customer contact</li>
                <li>Commission: 10% per booking</li>
                <li>WhatsApp booking integration</li>
              </ul>
              <button type="button" className="hotel-booking-primary-button">Register Now</button>
            </div>

            <div className="hotel-booking-partner-card">
              <h3>⭐ Featured Listing</h3>
              <p>Get premium visibility and more bookings.</p>
              <ul>
                <li>Top search results</li>
                <li>Priority customer support</li>
                <li>₹299/month</li>
                <li>Analytics dashboard</li>
              </ul>
              <button type="button" className="hotel-booking-secondary-button">Upgrade to Featured</button>
            </div>

            <div className="hotel-booking-partner-card">
              <h3>📊 Business Benefits</h3>
              <p>Why partner with NilaStay?</p>
              <ul>
                <li>Reach Kerala tourists</li>
                <li>No booking fees for hotels</li>
                <li>Local customer support</li>
                <li>Verified reviews system</li>
              </ul>
              <button type="button" className="hotel-booking-secondary-button">Learn More</button>
            </div>
          </div>
        </section>
      )}

      {activeTab === "admin" && (
        <section className="hotel-booking-section">
          <div className="hotel-booking-section-heading">
            <h2>Admin Panel</h2>
            <p>Manage hotels, bookings, and commissions.</p>
          </div>
          <div className="hotel-booking-admin-grid">
            <div className="hotel-booking-admin-card">
              <h3>📊 Dashboard</h3>
              <div className="hotel-booking-stats">
                <div>Total Hotels: 156</div>
                <div>Active Bookings: 23</div>
                <div>Monthly Revenue: ₹45,230</div>
                <div>Commission Earned: ₹4,523</div>
              </div>
            </div>

            <div className="hotel-booking-admin-card">
              <h3>🏨 Hotel Verification</h3>
              <p>Pending approvals: 5 hotels</p>
              <button type="button" className="hotel-booking-secondary-button">Review Hotels</button>
            </div>

            <div className="hotel-booking-admin-card">
              <h3>💰 Commission Management</h3>
              <p>Current rate: 10%</p>
              <button type="button" className="hotel-booking-secondary-button">View Settlements</button>
            </div>

            <div className="hotel-booking-admin-card">
              <h3>📋 Booking Management</h3>
              <p>Today's bookings: 8</p>
              <button type="button" className="hotel-booking-secondary-button">Manage Bookings</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default HotelBooking;