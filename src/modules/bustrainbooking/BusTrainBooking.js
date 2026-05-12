import React, { useMemo, useState } from "react";
import "./BusTrainBooking.css";

const KERALA_DISTRICTS = [
  "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam",
  "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram", "Kozhikode",
  "Wayanad", "Kannur", "Kasaragod", "Bangalore", "Chennai", "Mumbai", "Delhi"
];

const MAJOR_STATIONS = [
  "Thiruvananthapuram Central (TVC)", "Kollam Junction (QLN)", "Ernakulam Junction (ERS)",
  "Thrissur (TCR)", "Kozhikode (CLT)", "Kannur (CAN)", "Palakkad Junction (PGT)",
  "Alappuzha (ALLP)", "Kottayam (KTYM)", "Bangalore City (SBC)", "Chennai Central (MAS)",
  "Mumbai Central (BCT)", "New Delhi (NDLS)"
];

const BUS_OPERATORS = [
  { name: "KSRTC Swift", type: "Government", rating: 4.2 },
  { name: "KSRTC Ordinary", type: "Government", rating: 3.8 },
  { name: "KSRTC Garuda", type: "Government", rating: 4.5 },
  { name: "RedBus Partner", type: "Private", rating: 4.1 },
  { name: "AbhiBus", type: "Private", rating: 4.0 },
  { name: "MakeMyTrip Bus", type: "Private", rating: 3.9 }
];

const SAMPLE_TRAINS = [
  {
    number: "12623",
    name: "Trivandrum Central - Chennai Central Mail",
    from: "TVC",
    to: "MAS",
    departure: "14:15",
    arrival: "04:45",
    duration: "14h 30m",
    classes: [
      { type: "2A", fare: 2150, available: 12 },
      { type: "3A", fare: 1480, available: 25 },
      { type: "SL", fare: 545, available: 45 }
    ],
    status: "On Time"
  },
  {
    number: "16381",
    name: "Kanyakumari - Mumbai CST Express",
    from: "CAPE",
    to: "CSTM",
    departure: "07:15",
    arrival: "12:30",
    duration: "29h 15m",
    classes: [
      { type: "2A", fare: 3120, available: 8 },
      { type: "3A", fare: 2150, available: 15 },
      { type: "SL", fare: 810, available: 32 }
    ],
    status: "On Time"
  }
];

const SAMPLE_BUSES = [
  {
    operator: "KSRTC Swift",
    type: "AC Seater",
    departure: "22:00",
    arrival: "06:00",
    duration: "8h",
    fare: 450,
    seats: 35,
    rating: 4.2,
    amenities: ["WiFi", "Water", "Blanket"]
  },
  {
    operator: "KSRTC Garuda",
    type: "Volvo AC Multi-Axle",
    departure: "23:30",
    arrival: "07:30",
    duration: "8h",
    fare: 650,
    seats: 45,
    rating: 4.5,
    amenities: ["WiFi", "Water", "Blanket", "TV"]
  },
  {
    operator: "RedBus Partner",
    type: "AC Sleeper",
    departure: "21:00",
    arrival: "05:00",
    duration: "8h",
    fare: 850,
    seats: 30,
    rating: 4.1,
    amenities: ["WiFi", "Water", "Blanket", "Charging"]
  }
];

const BusTrainBooking = () => {
  const [activeTab, setActiveTab] = useState("search");
  const [bookingType, setBookingType] = useState("bus");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [selectedClass, setSelectedClass] = useState("all");
  const [pnrNumber, setPnrNumber] = useState("");
  const [trainNumber, setTrainNumber] = useState("");

  const filteredTrains = useMemo(() => {
    return SAMPLE_TRAINS.filter(train => {
      const fromMatch = !fromLocation || train.from.toLowerCase().includes(fromLocation.toLowerCase());
      const toMatch = !toLocation || train.to.toLowerCase().includes(toLocation.toLowerCase());
      return fromMatch && toMatch;
    });
  }, [fromLocation, toLocation]);

  const filteredBuses = useMemo(() => {
    return SAMPLE_BUSES.filter(bus => {
      // Add filtering logic based on locations and preferences
      return true; // For demo, show all
    });
  }, [fromLocation, toLocation]);

  const handleOfficialBooking = (type) => {
    if (type === "train") {
      alert("Demo: Redirecting to IRCTC official booking portal. In real app, this would open irctc.co.in");
      // window.open("https://www.irctc.co.in", "_blank");
    } else {
      alert("Demo: Redirecting to KSRTC official booking portal. In real app, this would open onlineksrtcswift.com");
      // window.open("https://onlineksrtcswift.com", "_blank");
    }
  };

  const handlePNRCheck = () => {
    if (!pnrNumber) {
      alert("Please enter a valid PNR number");
      return;
    }
    alert(`Demo: Checking PNR ${pnrNumber}. In real app, this would fetch from IRCTC API and show train details, status, and passenger info.`);
  };

  const handleTrainStatus = () => {
    if (!trainNumber) {
      alert("Please enter a valid train number");
      return;
    }
    alert(`Demo: Checking live status for train ${trainNumber}. In real app, this would show current location, delay status, and next station.`);
  };

  const handleWhatsAppSupport = () => {
    alert("Demo: Opening WhatsApp chat for booking assistance. In real app, this would connect to travel support team.");
  };

  const handleBusBooking = (bus) => {
    alert(`Demo: Initiating booking for ${bus.operator} ${bus.type}. In real app, this would redirect to official booking with pre-filled details.`);
  };

  const handleTrainBooking = (train, trainClass) => {
    alert(`Demo: Booking ${train.name} in ${trainClass.type} class. In real app, this would redirect to IRCTC with selected class.`);
  };

  return (
    <div className="bus-train-booking-shell">
      <section className="bus-train-booking-hero">
        <div className="bus-train-booking-hero-copy">
          <h1>NilaTravel — Bus & Train Booking Hub</h1>
          <p>
            Book trains and buses across Kerala and India with official portal integration.
            Get PNR status, live tracking, and booking assistance.
          </p>
          <div className="bus-train-booking-hero-actions">
            <button type="button" className="bus-train-booking-primary-button" onClick={() => setActiveTab("search")}>
              Search & Book
            </button>
            <button type="button" className="bus-train-booking-secondary-button" onClick={() => setActiveTab("pnr")}>
              Check PNR Status
            </button>
          </div>
          <div className="bus-train-booking-hero-tags">
            <span>Official Integration</span>
            <span>Live Tracking</span>
            <span>24/7 Support</span>
            <span>Government Approved</span>
          </div>
        </div>
      </section>

      <section className="bus-train-booking-nav">
        <button
          type="button"
          className={`bus-train-booking-nav-item ${activeTab === "search" ? "active" : ""}`}
          onClick={() => setActiveTab("search")}
        >
          🔍 Search & Book
        </button>
        <button
          type="button"
          className={`bus-train-booking-nav-item ${activeTab === "pnr" ? "active" : ""}`}
          onClick={() => setActiveTab("pnr")}
        >
          🎫 PNR Status
        </button>
        <button
          type="button"
          className={`bus-train-booking-nav-item ${activeTab === "status" ? "active" : ""}`}
          onClick={() => setActiveTab("status")}
        >
          📍 Live Status
        </button>
        <button
          type="button"
          className={`bus-train-booking-nav-item ${activeTab === "support" ? "active" : ""}`}
          onClick={() => setActiveTab("support")}
        >
          🛟 Travel Support
        </button>
      </section>

      {activeTab === "search" && (
        <section className="bus-train-booking-section">
          <div className="bus-train-booking-search-container">
            <div className="bus-train-booking-type-toggle">
              <button
                type="button"
                className={`bus-train-booking-type-btn ${bookingType === "bus" ? "active" : ""}`}
                onClick={() => setBookingType("bus")}
              >
                🚌 Bus
              </button>
              <button
                type="button"
                className={`bus-train-booking-type-btn ${bookingType === "train" ? "active" : ""}`}
                onClick={() => setBookingType("train")}
              >
                🚂 Train
              </button>
            </div>

            <div className="bus-train-booking-search-form">
              <div className="bus-train-booking-form-row">
                <div className="bus-train-booking-field">
                  <label>From</label>
                  <select value={fromLocation} onChange={(e) => setFromLocation(e.target.value)}>
                    <option value="">Select Origin</option>
                    {bookingType === "bus" ? KERALA_DISTRICTS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    )) : MAJOR_STATIONS.map(station => (
                      <option key={station} value={station}>{station}</option>
                    ))}
                  </select>
                </div>
                <div className="bus-train-booking-field">
                  <label>To</label>
                  <select value={toLocation} onChange={(e) => setToLocation(e.target.value)}>
                    <option value="">Select Destination</option>
                    {bookingType === "bus" ? KERALA_DISTRICTS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    )) : MAJOR_STATIONS.map(station => (
                      <option key={station} value={station}>{station}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bus-train-booking-form-row">
                <div className="bus-train-booking-field">
                  <label>Travel Date</label>
                  <input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="bus-train-booking-field">
                  <label>Passengers</label>
                  <select value={passengers} onChange={(e) => setPassengers(e.target.value)}>
                    {[1,2,3,4,5,6].map(num => (
                      <option key={num} value={num}>{num} Passenger{num > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {bookingType === "train" && (
                <div className="bus-train-booking-form-row">
                  <div className="bus-train-booking-field">
                    <label>Class Preference</label>
                    <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                      <option value="all">All Classes</option>
                      <option value="1A">1st AC</option>
                      <option value="2A">2nd AC</option>
                      <option value="3A">3rd AC</option>
                      <option value="SL">Sleeper</option>
                      <option value="CC">Chair Car</option>
                    </select>
                  </div>
                </div>
              )}

              <button type="button" className="bus-train-booking-primary-button search-btn">
                🔍 Search {bookingType === "bus" ? "Buses" : "Trains"}
              </button>
            </div>

            <div className="bus-train-booking-results">
              {bookingType === "bus" ? (
                <div className="bus-train-booking-bus-results">
                  <h3>Available Buses</h3>
                  {filteredBuses.map((bus, index) => (
                    <div key={index} className="bus-train-booking-bus-card">
                      <div className="bus-train-booking-bus-header">
                        <div>
                          <h4>{bus.operator}</h4>
                          <span>{bus.type}</span>
                          <div className="bus-train-booking-rating">⭐ {bus.rating}</div>
                        </div>
                        <div className="bus-train-booking-bus-timing">
                          <div className="bus-train-booking-time">{bus.departure}</div>
                          <div className="bus-train-booking-duration">{bus.duration}</div>
                          <div className="bus-train-booking-time">{bus.arrival}</div>
                        </div>
                      </div>

                      <div className="bus-train-booking-bus-details">
                        <span>💺 {bus.seats} seats available</span>
                        <span>💰 ₹{bus.fare}</span>
                        <div className="bus-train-booking-amenities">
                          {bus.amenities.map(amenity => (
                            <span key={amenity} className="bus-train-booking-amenity">{amenity}</span>
                          ))}
                        </div>
                      </div>

                      <div className="bus-train-booking-bus-actions">
                        <button
                          type="button"
                          className="bus-train-booking-primary-button"
                          onClick={() => handleBusBooking(bus)}
                        >
                          Book Now
                        </button>
                        <button
                          type="button"
                          className="bus-train-booking-secondary-button"
                          onClick={() => handleOfficialBooking("bus")}
                        >
                          Official Booking
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bus-train-booking-train-results">
                  <h3>Available Trains</h3>
                  {filteredTrains.map((train, index) => (
                    <div key={index} className="bus-train-booking-train-card">
                      <div className="bus-train-booking-train-header">
                        <div>
                          <h4>{train.number} - {train.name}</h4>
                          <span>{train.from} → {train.to}</span>
                          <div className={`bus-train-booking-status ${train.status === "On Time" ? "ontime" : "delayed"}`}>
                            {train.status}
                          </div>
                        </div>
                        <div className="bus-train-booking-train-timing">
                          <div className="bus-train-booking-time">{train.departure}</div>
                          <div className="bus-train-booking-duration">{train.duration}</div>
                          <div className="bus-train-booking-time">{train.arrival}</div>
                        </div>
                      </div>

                      <div className="bus-train-booking-classes">
                        {train.classes.map((cls, clsIndex) => (
                          <div key={clsIndex} className="bus-train-booking-class-option">
                            <div className="bus-train-booking-class-info">
                              <span className="bus-train-booking-class-type">{cls.type}</span>
                              <span className="bus-train-booking-class-fare">₹{cls.fare}</span>
                              <span className="bus-train-booking-class-seats">{cls.available} seats</span>
                            </div>
                            <button
                              type="button"
                              className="bus-train-booking-secondary-button"
                              onClick={() => handleTrainBooking(train, cls)}
                            >
                              Book {cls.type}
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="bus-train-booking-train-actions">
                        <button
                          type="button"
                          className="bus-train-booking-primary-button"
                          onClick={() => handleOfficialBooking("train")}
                        >
                          Book on IRCTC
                        </button>
                        <button
                          type="button"
                          className="bus-train-booking-secondary-button"
                          onClick={() => handleWhatsAppSupport()}
                        >
                          WhatsApp Support
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === "pnr" && (
        <section className="bus-train-booking-section">
          <div className="bus-train-booking-section-heading">
            <h2>PNR Status Check</h2>
            <p>Check your train ticket status, passenger details, and current status.</p>
          </div>
          <div className="bus-train-booking-pnr-form">
            <div className="bus-train-booking-field">
              <label>Enter PNR Number</label>
              <input
                type="text"
                placeholder="10-digit PNR number"
                value={pnrNumber}
                onChange={(e) => setPnrNumber(e.target.value)}
                maxLength="10"
              />
            </div>
            <button
              type="button"
              className="bus-train-booking-primary-button"
              onClick={handlePNRCheck}
            >
              Check PNR Status
            </button>
          </div>

          <div className="bus-train-booking-pnr-info">
            <h3>How to check PNR?</h3>
            <ul>
              <li>Enter your 10-digit PNR number from the ticket</li>
              <li>Get real-time status from IRCTC servers</li>
              <li>View passenger details and seat numbers</li>
              <li>Check if your train is on time or delayed</li>
            </ul>
            <div className="bus-train-booking-pnr-note">
              <strong>Note:</strong> PNR status is fetched directly from official IRCTC systems for accuracy.
            </div>
          </div>
        </section>
      )}

      {activeTab === "status" && (
        <section className="bus-train-booking-section">
          <div className="bus-train-booking-section-heading">
            <h2>Live Train Status</h2>
            <p>Track your train in real-time with current location and delay information.</p>
          </div>
          <div className="bus-train-booking-status-form">
            <div className="bus-train-booking-field">
              <label>Enter Train Number</label>
              <input
                type="text"
                placeholder="Train number (e.g., 12623)"
                value={trainNumber}
                onChange={(e) => setTrainNumber(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="bus-train-booking-primary-button"
              onClick={handleTrainStatus}
            >
              Check Live Status
            </button>
          </div>

          <div className="bus-train-booking-status-features">
            <div className="bus-train-booking-feature-card">
              <h4>📍 Current Location</h4>
              <p>Real-time GPS tracking of train position</p>
            </div>
            <div className="bus-train-booking-feature-card">
              <h4>⏰ Delay Information</h4>
              <p>Live updates on delays and expected arrival</p>
            </div>
            <div className="bus-train-booking-feature-card">
              <h4>🚉 Next Station</h4>
              <p>Next stop and platform information</p>
            </div>
            <div className="bus-train-booking-feature-card">
              <h4>📊 Running Status</h4>
              <p>Complete journey status and schedule</p>
            </div>
          </div>
        </section>
      )}

      {activeTab === "support" && (
        <section className="bus-train-booking-section">
          <div className="bus-train-booking-section-heading">
            <h2>Travel Support & Assistance</h2>
            <p>Get help with bookings, cancellations, and travel queries.</p>
          </div>
          <div className="bus-train-booking-support-grid">
            <div className="bus-train-booking-support-card">
              <h3>🎫 Booking Assistance</h3>
              <p>Help with online booking for elderly and first-time users</p>
              <button type="button" className="bus-train-booking-secondary-button" onClick={handleWhatsAppSupport}>
                WhatsApp Support
              </button>
            </div>

            <div className="bus-train-booking-support-card">
              <h3>🔄 Cancellation & Refund</h3>
              <p>Guide for ticket cancellation and refund procedures</p>
              <button type="button" className="bus-train-booking-secondary-button">
                Cancellation Guide
              </button>
            </div>

            <div className="bus-train-booking-support-card">
              <h3>👥 Senior Citizen Help</h3>
              <p>Special assistance for senior citizens and differently-abled</p>
              <button type="button" className="bus-train-booking-secondary-button">
                Senior Support
              </button>
            </div>

            <div className="bus-train-booking-support-card">
              <h3>📞 Emergency Contact</h3>
              <p>24/7 helpline for travel emergencies</p>
              <button type="button" className="bus-train-booking-secondary-button">
                Call Support
              </button>
            </div>
          </div>

          <div className="bus-train-booking-support-note">
            <h3>Important Travel Information</h3>
            <ul>
              <li><strong>Train Bookings:</strong> Use official IRCTC portal for guaranteed tickets</li>
              <li><strong>Bus Bookings:</strong> KSRTC Swift for government buses, private operators for additional services</li>
              <li><strong>Cancellation:</strong> Check individual operator policies for refunds</li>
              <li><strong>Documents:</strong> Carry valid ID proof for all journeys</li>
            </ul>
          </div>
        </section>
      )}
    </div>
  );
};

export default BusTrainBooking;