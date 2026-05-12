import React, { useMemo, useState } from "react";
import "./TourismMarketplace.css";

const PACKAGE_CATEGORIES = [
  "All",
  "Honeymoon",
  "Houseboat",
  "Wildlife",
  "Nature",
  "Beach",
  "Pilgrimage",
  "Wellness",
  "Family",
  "Student",
  "NRI",
  "Local Experience",
];

const TRAVELER_TYPES = ["Any", "Couple", "Family", "Group", "Solo", "Student", "NRI"];

const KERALA_DESTINATIONS = [
  "All destinations",
  "Munnar",
  "Alleppey",
  "Thekkady",
  "Wayanad",
  "Kovalam",
  "Varkala",
  "Kochi",
  "Kumarakom",
  "Sabarimala",
  "Trivandrum",
  "Kannur",
];

const TOURISM_PACKAGES = [
  {
    id: "pkg-munnar-honeymoon",
    title: "Munnar Mist Honeymoon",
    destination: "Munnar",
    category: "Honeymoon",
    travelerType: "Couple",
    durationDays: 3,
    startPrice: 18500,
    rating: 4.8,
    reviews: 124,
    tags: ["Tea Estate Stay", "Candlelight Dinner", "Private Cab"],
    itinerary: [
      "Day 1: Kochi pickup, check-in, sunset viewpoint",
      "Day 2: Tea museum, Mattupetty dam, romantic dinner",
      "Day 3: Blossom park, shopping, drop",
    ],
    vendor: "HighRange Holidays",
    availability: "Available this week",
  },
  {
    id: "pkg-alleppey-houseboat",
    title: "Alleppey Premium Houseboat",
    destination: "Alleppey",
    category: "Houseboat",
    travelerType: "Family",
    durationDays: 2,
    startPrice: 14200,
    rating: 4.7,
    reviews: 219,
    tags: ["AC Houseboat", "All Meals", "Backwater Cruise"],
    itinerary: [
      "Day 1: Board houseboat, village cruise, dinner on deck",
      "Day 2: Sunrise canal ride, local market, checkout",
    ],
    vendor: "Nila Backwater Trails",
    availability: "Limited slots",
  },
  {
    id: "pkg-thekkady-wildlife",
    title: "Thekkady Wildlife Explorer",
    destination: "Thekkady",
    category: "Wildlife",
    travelerType: "Group",
    durationDays: 2,
    startPrice: 9900,
    rating: 4.5,
    reviews: 88,
    tags: ["Periyar Safari", "Spice Plantation", "Guide Included"],
    itinerary: [
      "Day 1: Check-in, plantation tour, cultural show",
      "Day 2: Early safari, local lunch, return",
    ],
    vendor: "Periyar Trek Co.",
    availability: "Available",
  },
  {
    id: "pkg-wayanad-nature",
    title: "Wayanad Nature Retreat",
    destination: "Wayanad",
    category: "Nature",
    travelerType: "Family",
    durationDays: 3,
    startPrice: 12800,
    rating: 4.6,
    reviews: 162,
    tags: ["Waterfall Trail", "Campfire", "Resort Stay"],
    itinerary: [
      "Day 1: Check-in, tea trail walk, campfire",
      "Day 2: Edakkal caves, waterfalls, zipline",
      "Day 3: Organic farm visit, checkout",
    ],
    vendor: "Western Ghats Getaways",
    availability: "Available",
  },
  {
    id: "pkg-kovalam-beach",
    title: "Kovalam and Varkala Beach Escape",
    destination: "Kovalam",
    category: "Beach",
    travelerType: "Solo",
    durationDays: 3,
    startPrice: 11700,
    rating: 4.4,
    reviews: 96,
    tags: ["Beach Stay", "Surf Session", "Sunset Cliff"],
    itinerary: [
      "Day 1: Kovalam beach and lighthouse",
      "Day 2: Varkala cliff, water activities",
      "Day 3: Local cafe trail, return",
    ],
    vendor: "Coastal Routes Kerala",
    availability: "Available",
  },
  {
    id: "pkg-sabarimala-pilgrim",
    title: "Sabarimala Pilgrimage Support Trip",
    destination: "Sabarimala",
    category: "Pilgrimage",
    travelerType: "Group",
    durationDays: 2,
    startPrice: 6800,
    rating: 4.7,
    reviews: 141,
    tags: ["Darshan Queue Assist", "Group Transport", "Veg Meals"],
    itinerary: [
      "Day 1: Pickup, base camp stay, pooja support",
      "Day 2: Darshan support, return",
    ],
    vendor: "Bhakti Travel Desk",
    availability: "Festival season booking open",
  },
  {
    id: "pkg-ayurveda-wellness",
    title: "Kumarakom Ayurveda Wellness",
    destination: "Kumarakom",
    category: "Wellness",
    travelerType: "NRI",
    durationDays: 5,
    startPrice: 28600,
    rating: 4.9,
    reviews: 77,
    tags: ["Doctor Consultation", "Detox Plan", "Lakeside Resort"],
    itinerary: [
      "Day 1: Health assessment and therapy planning",
      "Day 2-4: Ayurvedic therapies and yoga sessions",
      "Day 5: Progress review and departure",
    ],
    vendor: "Nila Wellness Journeys",
    availability: "Pre-book 10 days earlier",
  },
  {
    id: "pkg-local-experience",
    title: "Kerala Local Experience Hub",
    destination: "Kannur",
    category: "Local Experience",
    travelerType: "Group",
    durationDays: 2,
    startPrice: 7600,
    rating: 4.8,
    reviews: 65,
    tags: ["Theyyam Visit", "Village Food Trail", "Women-Led Units"],
    itinerary: [
      "Day 1: Backwater village walk, toddy food trail",
      "Day 2: Theyyam performance and handicraft market",
    ],
    vendor: "Responsible Roots Kerala",
    availability: "Weekend departures",
  },
];

const OFFICIAL_LINKS = [
  {
    name: "Kerala Tourism",
    url: "https://www.keralatourism.org/",
    description: "Official destination and travel information from Kerala Tourism.",
  },
  {
    name: "KTDC",
    url: "https://www.ktdc.com/",
    description: "Kerala Tourism Development Corporation packages and stays.",
  },
  {
    name: "Responsible Tourism Mission",
    url: "https://www.keralatourism.org/responsible-tourism/",
    description: "Community tourism and local experience initiatives.",
  },
  {
    name: "Kerala Forest Ecotourism",
    url: "https://www.keralaforestecotourism.com/",
    description: "Ecotourism references and nature experience booking information.",
  },
];

const VENDOR_PIPELINE = [
  { leadId: "LD-4312", package: "Munnar Mist Honeymoon", traveler: "Anoop K", budget: "INR 20k", status: "New" },
  { leadId: "LD-4313", package: "Kerala Local Experience Hub", traveler: "Nora M", budget: "INR 12k", status: "Negotiation" },
  { leadId: "LD-4314", package: "Kumarakom Ayurveda Wellness", traveler: "Riya P", budget: "INR 35k", status: "Confirmed" },
];

const ADMIN_REVIEW_ITEMS = [
  { id: "VN-102", vendor: "BlueHill Travels", kyc: "Pending", package: "Wayanad Nature Trek", risk: "Medium" },
  { id: "VN-203", vendor: "PalmLine Holidays", kyc: "Verified", package: "Varkala Surf Weekend", risk: "Low" },
  { id: "VN-318", vendor: "Heritage Temple Tours", kyc: "Pending", package: "Pilgrimage Circle", risk: "High" },
];

const formatInr = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const TourismMarketplace = () => {
  const [activeTab, setActiveTab] = useState("marketplace");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDestination, setSelectedDestination] = useState("All destinations");
  const [selectedTravelerType, setSelectedTravelerType] = useState("Any");
  const [maxBudget, setMaxBudget] = useState(30000);
  const [maxDays, setMaxDays] = useState(6);
  const [searchText, setSearchText] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [bookingNote, setBookingNote] = useState("");

  const [customRequest, setCustomRequest] = useState({
    travelerName: "",
    phone: "",
    travelerType: "Family",
    destination: "Munnar",
    startDate: "",
    days: 3,
    estimatedBudget: 15000,
    preferences: "",
  });

  const filteredPackages = useMemo(() => {
    return TOURISM_PACKAGES.filter((pkg) => {
      const matchesCategory = selectedCategory === "All" || pkg.category === selectedCategory;
      const matchesDestination =
        selectedDestination === "All destinations" || pkg.destination === selectedDestination;
      const matchesTravelerType =
        selectedTravelerType === "Any" || pkg.travelerType === selectedTravelerType;
      const matchesBudget = pkg.startPrice <= Number(maxBudget || 0);
      const matchesDays = pkg.durationDays <= Number(maxDays || 0);
      const text = searchText.trim().toLowerCase();
      const matchesText =
        !text ||
        pkg.title.toLowerCase().includes(text) ||
        pkg.destination.toLowerCase().includes(text) ||
        pkg.tags.some((tag) => tag.toLowerCase().includes(text));

      return (
        matchesCategory &&
        matchesDestination &&
        matchesTravelerType &&
        matchesBudget &&
        matchesDays &&
        matchesText
      );
    });
  }, [maxBudget, maxDays, searchText, selectedCategory, selectedDestination, selectedTravelerType]);

  const selectedPackage = useMemo(
    () => TOURISM_PACKAGES.find((pkg) => pkg.id === selectedPackageId) || null,
    [selectedPackageId]
  );

  const handleCustomRequestChange = (field, value) => {
    setCustomRequest((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmitCustomRequest = (event) => {
    event.preventDefault();
    alert("Custom request submitted. Vendor matching will start in the next step.");
  };

  const handleBookingConfirm = () => {
    if (!selectedPackage) {
      return;
    }

    alert(`Booking request sent for ${selectedPackage.title}. A travel agent will contact you shortly.`);
    setSelectedPackageId("");
    setBookingNote("");
  };

  return (
    <div className="tourism-shell">
      <section className="tourism-hero">
        <div className="tourism-hero-copy">
          <p className="tourism-kicker">NilaTravel Tourism Marketplace</p>
          <h1>Kerala tourism packages, local experiences, and verified travel agencies in one module.</h1>
          <p>
            Discover curated trips, compare itineraries, request custom plans, and track bookings with
            vendor and admin workflows built for a Kerala-first travel ecosystem.
          </p>
          <div className="tourism-hero-actions">
            <button
              type="button"
              className="tourism-primary-button"
              onClick={() => setActiveTab("marketplace")}
            >
              Explore Packages
            </button>
            <button
              type="button"
              className="tourism-secondary-button"
              onClick={() => setActiveTab("custom")}
            >
              Request Custom Trip
            </button>
          </div>
          <div className="tourism-hero-tags">
            <span>Advance or full payment options</span>
            <span>Verified vendor workflows</span>
            <span>Emergency support visibility</span>
            <span>Kerala local experience hub</span>
          </div>
        </div>
      </section>

      <section className="tourism-nav">
        <button
          type="button"
          className={`tourism-nav-item ${activeTab === "marketplace" ? "active" : ""}`}
          onClick={() => setActiveTab("marketplace")}
        >
          Marketplace
        </button>
        <button
          type="button"
          className={`tourism-nav-item ${activeTab === "custom" ? "active" : ""}`}
          onClick={() => setActiveTab("custom")}
        >
          Custom Trip Desk
        </button>
        <button
          type="button"
          className={`tourism-nav-item ${activeTab === "vendor" ? "active" : ""}`}
          onClick={() => setActiveTab("vendor")}
        >
          Vendor Workspace
        </button>
        <button
          type="button"
          className={`tourism-nav-item ${activeTab === "admin" ? "active" : ""}`}
          onClick={() => setActiveTab("admin")}
        >
          Admin Controls
        </button>
      </section>

      {activeTab === "marketplace" && (
        <section className="tourism-section">
          <div className="tourism-section-heading">
            <h2>Kerala Package Discovery</h2>
            <p>Search by destination, budget, days, and traveler type to find matching packages.</p>
          </div>

          <div className="tourism-search-grid">
            <aside className="tourism-filters">
              <label className="tourism-field">
                <span>Search package</span>
                <input
                  type="text"
                  placeholder="Munnar, houseboat, wellness"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                />
              </label>

              <label className="tourism-field">
                <span>Category</span>
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                >
                  {PACKAGE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="tourism-field">
                <span>Destination</span>
                <select
                  value={selectedDestination}
                  onChange={(event) => setSelectedDestination(event.target.value)}
                >
                  {KERALA_DESTINATIONS.map((destination) => (
                    <option key={destination} value={destination}>
                      {destination}
                    </option>
                  ))}
                </select>
              </label>

              <label className="tourism-field">
                <span>Traveler type</span>
                <select
                  value={selectedTravelerType}
                  onChange={(event) => setSelectedTravelerType(event.target.value)}
                >
                  {TRAVELER_TYPES.map((travelerType) => (
                    <option key={travelerType} value={travelerType}>
                      {travelerType}
                    </option>
                  ))}
                </select>
              </label>

              <label className="tourism-field">
                <span>Max budget: {formatInr(maxBudget)}</span>
                <input
                  type="range"
                  min="5000"
                  max="50000"
                  step="500"
                  value={maxBudget}
                  onChange={(event) => setMaxBudget(Number(event.target.value))}
                />
              </label>

              <label className="tourism-field">
                <span>Max duration: {maxDays} days</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={maxDays}
                  onChange={(event) => setMaxDays(Number(event.target.value))}
                />
              </label>
            </aside>

            <div className="tourism-results">
              <div className="tourism-results-header">
                <h3>{filteredPackages.length} packages found</h3>
                <span>Compare itinerary, inclusions, and vendor reliability before booking.</span>
              </div>

              <div className="tourism-packages-grid">
                {filteredPackages.map((pkg) => (
                  <article key={pkg.id} className="tourism-package-card">
                    <div className="tourism-package-top">
                      <span className="tourism-chip">{pkg.category}</span>
                      <span className="tourism-rating">
                        {pkg.rating} ({pkg.reviews} reviews)
                      </span>
                    </div>
                    <h4>{pkg.title}</h4>
                    <p className="tourism-card-meta">
                      {pkg.destination} | {pkg.durationDays} days | {pkg.travelerType}
                    </p>
                    <p className="tourism-card-price">From {formatInr(pkg.startPrice)}</p>
                    <div className="tourism-tags">
                      {pkg.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    <div className="tourism-card-footer">
                      <span>{pkg.availability}</span>
                      <button
                        type="button"
                        className="tourism-primary-button"
                        onClick={() => setSelectedPackageId(pkg.id)}
                      >
                        View and Book
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {filteredPackages.length === 0 && (
                <div className="tourism-empty-state">
                  No packages match the current filters. Try increasing budget or changing destination.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === "custom" && (
        <section className="tourism-section">
          <div className="tourism-section-heading">
            <h2>Custom Package Request</h2>
            <p>Tell us your plan and get proposals from verified Kerala travel agencies.</p>
          </div>

          <form className="tourism-custom-form" onSubmit={handleSubmitCustomRequest}>
            <label className="tourism-field">
              <span>Traveler name</span>
              <input
                type="text"
                required
                value={customRequest.travelerName}
                onChange={(event) => handleCustomRequestChange("travelerName", event.target.value)}
              />
            </label>

            <label className="tourism-field">
              <span>Phone</span>
              <input
                type="tel"
                required
                value={customRequest.phone}
                onChange={(event) => handleCustomRequestChange("phone", event.target.value)}
              />
            </label>

            <label className="tourism-field">
              <span>Traveler type</span>
              <select
                value={customRequest.travelerType}
                onChange={(event) => handleCustomRequestChange("travelerType", event.target.value)}
              >
                {TRAVELER_TYPES.filter((item) => item !== "Any").map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="tourism-field">
              <span>Destination focus</span>
              <select
                value={customRequest.destination}
                onChange={(event) => handleCustomRequestChange("destination", event.target.value)}
              >
                {KERALA_DESTINATIONS.filter((item) => item !== "All destinations").map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="tourism-field">
              <span>Preferred start date</span>
              <input
                type="date"
                value={customRequest.startDate}
                onChange={(event) => handleCustomRequestChange("startDate", event.target.value)}
              />
            </label>

            <label className="tourism-field">
              <span>Trip duration (days)</span>
              <input
                type="number"
                min="1"
                max="15"
                value={customRequest.days}
                onChange={(event) => handleCustomRequestChange("days", Number(event.target.value))}
              />
            </label>

            <label className="tourism-field tourism-field-wide">
              <span>Estimated budget (INR)</span>
              <input
                type="number"
                min="5000"
                step="500"
                value={customRequest.estimatedBudget}
                onChange={(event) =>
                  handleCustomRequestChange("estimatedBudget", Number(event.target.value))
                }
              />
            </label>

            <label className="tourism-field tourism-field-wide">
              <span>Preferences</span>
              <textarea
                rows="4"
                placeholder="Include hotel type, food preference, local experiences, guide language, pickup city"
                value={customRequest.preferences}
                onChange={(event) => handleCustomRequestChange("preferences", event.target.value)}
              />
            </label>

            <div className="tourism-custom-actions tourism-field-wide">
              <button type="submit" className="tourism-primary-button">
                Submit Request
              </button>
              <button type="button" className="tourism-secondary-button">
                Chat With Agent
              </button>
            </div>
          </form>

          <div className="tourism-official-links">
            <h3>Official Kerala Tourism References</h3>
            <div className="tourism-link-grid">
              {OFFICIAL_LINKS.map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
                  <strong>{link.name}</strong>
                  <span>{link.description}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === "vendor" && (
        <section className="tourism-section">
          <div className="tourism-section-heading">
            <h2>Vendor Workspace</h2>
            <p>Manage packages, availability calendar, leads, KYC, and commission tracking.</p>
          </div>

          <div className="tourism-workspace-grid">
            <div className="tourism-panel">
              <h3>Quick Vendor Actions</h3>
              <ul>
                <li>Register travel agency and upload KYC documents.</li>
                <li>Create package with itinerary, hotel, cab, and guide options.</li>
                <li>Set seasonal pricing and block dates on availability calendar.</li>
                <li>Respond to custom package requests within SLA.</li>
              </ul>
              <button type="button" className="tourism-primary-button">
                Add New Package
              </button>
            </div>

            <div className="tourism-panel">
              <h3>Lead Management</h3>
              <div className="tourism-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Lead</th>
                      <th>Package</th>
                      <th>Traveler</th>
                      <th>Budget</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {VENDOR_PIPELINE.map((row) => (
                      <tr key={row.leadId}>
                        <td>{row.leadId}</td>
                        <td>{row.package}</td>
                        <td>{row.traveler}</td>
                        <td>{row.budget}</td>
                        <td>{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === "admin" && (
        <section className="tourism-section">
          <div className="tourism-section-heading">
            <h2>Admin Controls</h2>
            <p>Approve vendors, moderate packages, monitor fraud, and control refund workflows.</p>
          </div>

          <div className="tourism-workspace-grid">
            <div className="tourism-panel">
              <h3>Platform Controls</h3>
              <ul>
                <li>Vendor approval queue and KYC verification.</li>
                <li>Package moderation for pricing and itinerary quality.</li>
                <li>Featured package slots and commission slabs.</li>
                <li>Complaint handling, refund governance, and fraud checks.</li>
              </ul>
              <div className="tourism-admin-badges">
                <span>Base commission: 8%</span>
                <span>Featured listing: INR 2,499/month</span>
                <span>Escalation SLA: 24 hours</span>
              </div>
            </div>

            <div className="tourism-panel">
              <h3>Review Queue</h3>
              <div className="tourism-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Vendor</th>
                      <th>KYC</th>
                      <th>Package</th>
                      <th>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ADMIN_REVIEW_ITEMS.map((row) => (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td>{row.vendor}</td>
                        <td>{row.kyc}</td>
                        <td>{row.package}</td>
                        <td>{row.risk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {selectedPackage && (
        <section className="tourism-booking-sheet" aria-live="polite">
          <div className="tourism-booking-card">
            <div className="tourism-booking-header">
              <h3>{selectedPackage.title}</h3>
              <button
                type="button"
                className="tourism-close-button"
                onClick={() => setSelectedPackageId("")}
              >
                Close
              </button>
            </div>
            <p className="tourism-card-meta">
              {selectedPackage.destination} | {selectedPackage.durationDays} days | {selectedPackage.vendor}
            </p>
            <ul className="tourism-itinerary-list">
              {selectedPackage.itinerary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <label className="tourism-field">
              <span>Booking note (optional)</span>
              <textarea
                rows="3"
                value={bookingNote}
                onChange={(event) => setBookingNote(event.target.value)}
                placeholder="Add pickup preference, room type, meal plan, or special requirements"
              />
            </label>
            <div className="tourism-booking-actions">
              <button type="button" className="tourism-primary-button" onClick={handleBookingConfirm}>
                Pay Advance and Request Booking
              </button>
              <button type="button" className="tourism-secondary-button">
                Pay Full Amount
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default TourismMarketplace;
