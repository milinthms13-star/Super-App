import React, { useMemo, useState } from "react";
import "./LocalServicesMarketplace.css";

const CATEGORY_GROUPS = [
  {
    id: "caterers",
    name: "Caterers",
    services: [
      "Wedding catering",
      "Birthday party catering",
      "Corporate food orders",
      "Home function catering",
      "Veg / non-veg / Kerala sadya",
    ],
  },
  {
    id: "decorators",
    name: "Decorators",
    services: [
      "Wedding stage decoration",
      "Birthday decoration",
      "Housewarming decoration",
      "Balloon decoration",
      "Floral decoration",
      "Event lighting setup",
    ],
  },
  {
    id: "photographers",
    name: "Photographers",
    services: [
      "Wedding photography",
      "Engagement shoots",
      "Birthday photography",
      "Product photography",
      "Videography",
      "Drone shoot",
      "Album creation",
    ],
  },
];

const PROVIDERS = [
  {
    id: "ls-1",
    name: "Nila Sadya Caterers",
    category: "caterers",
    location: "Trivandrum",
    priceStart: 16000,
    rating: 4.8,
    responseTime: "10 mins",
    verified: true,
    portfolioCount: 24,
    availability: "Available this week",
  },
  {
    id: "ls-2",
    name: "Divine Stage Decor",
    category: "decorators",
    location: "Kollam",
    priceStart: 9000,
    rating: 4.6,
    responseTime: "18 mins",
    verified: true,
    portfolioCount: 31,
    availability: "Limited slots",
  },
  {
    id: "ls-3",
    name: "LensCraft Events",
    category: "photographers",
    location: "Kottayam",
    priceStart: 12000,
    rating: 4.7,
    responseTime: "12 mins",
    verified: false,
    portfolioCount: 45,
    availability: "Available tomorrow",
  },
];

const COMPLETE_PACKAGE_ITEMS = [
  "Caterer",
  "Decorator",
  "Photographer",
  "Makeup artist",
  "Event anchor",
  "Sound/light system",
  "Stage setup",
  "Vehicle rental",
];

const INITIAL_SEARCH = {
  query: "",
  category: "all",
  location: "all",
  priceMin: "",
  priceMax: "",
};

const INITIAL_VENDOR_FORM = {
  businessName: "",
  category: "caterers",
  city: "Trivandrum",
  packageName: "",
  packagePrice: "",
  portfolioItems: "0",
  verificationDone: false,
};

const INITIAL_BOOKING = {
  providerId: "",
  eventType: "Wedding",
  eventDate: "",
  guests: "100",
  budget: "",
  notes: "",
  advanceEnabled: true,
};

const INITIAL_PACKAGE_FORM = {
  eventType: "Wedding",
  eventDate: "",
  items: COMPLETE_PACKAGE_ITEMS.reduce((acc, item) => ({ ...acc, [item]: true }), {}),
  budget: "",
};

const LocalServicesMarketplace = () => {
  const [search, setSearch] = useState(INITIAL_SEARCH);
  const [bookingForm, setBookingForm] = useState(INITIAL_BOOKING);
  const [vendorForm, setVendorForm] = useState(INITIAL_VENDOR_FORM);
  const [packageForm, setPackageForm] = useState(INITIAL_PACKAGE_FORM);

  const [bookingStatus, setBookingStatus] = useState("");
  const [quoteStatus, setQuoteStatus] = useState("");
  const [vendorStatus, setVendorStatus] = useState("");
  const [packageStatus, setPackageStatus] = useState("");
  const [leadStatus, setLeadStatus] = useState("");
  const [requestHistory, setRequestHistory] = useState([]);

  const visibleProviders = useMemo(() => {
    return PROVIDERS.filter((provider) => {
      const query = search.query.trim().toLowerCase();
      const categoryMatch = search.category === "all" || provider.category === search.category;
      const locationMatch =
        search.location === "all" || provider.location.toLowerCase() === search.location.toLowerCase();
      const queryMatch =
        !query ||
        `${provider.name} ${provider.location} ${provider.category}`.toLowerCase().includes(query);
      const minMatch = !search.priceMin || provider.priceStart >= Number(search.priceMin);
      const maxMatch = !search.priceMax || provider.priceStart <= Number(search.priceMax);
      return categoryMatch && locationMatch && queryMatch && minMatch && maxMatch;
    });
  }, [search]);

  const handleBookingRequest = (event) => {
    event.preventDefault();
    const provider = PROVIDERS.find((item) => item.id === bookingForm.providerId);
    if (!provider || !bookingForm.eventDate) {
      setBookingStatus("Select provider and event date.");
      return;
    }

    const requestId = `LSB-${Date.now().toString().slice(-6)}`;
    setBookingStatus(
      `${requestId} sent to ${provider.name}. ${bookingForm.advanceEnabled ? "Advance payment enabled." : "Quote-only request."}`
    );
    setRequestHistory((current) => [
      {
        id: requestId,
        type: "Booking request",
        target: provider.name,
        status: "Pending vendor response",
      },
      ...current,
    ]);
    setBookingForm(INITIAL_BOOKING);
  };

  const handleQuoteRequest = (providerId) => {
    const provider = PROVIDERS.find((item) => item.id === providerId);
    if (!provider) {
      return;
    }
    const quoteId = `LSQ-${Date.now().toString().slice(-5)}`;
    setQuoteStatus(`${quoteId} quote requested from ${provider.name}. Vendor will respond in chat.`);
    setRequestHistory((current) => [
      { id: quoteId, type: "Quote request", target: provider.name, status: "Quote in progress" },
      ...current,
    ]);
  };

  const handleVendorRegister = (event) => {
    event.preventDefault();
    if (!vendorForm.businessName.trim() || !vendorForm.packageName.trim()) {
      setVendorStatus("Enter business name and package details.");
      return;
    }
    setVendorStatus(
      `${vendorForm.businessName} profile submitted. Package "${vendorForm.packageName}" queued for verification and listing.`
    );
    setVendorForm(INITIAL_VENDOR_FORM);
  };

  const handlePackageSubmit = (event) => {
    event.preventDefault();
    if (!packageForm.eventDate) {
      setPackageStatus("Select event date for complete package.");
      return;
    }

    const selectedItems = Object.entries(packageForm.items)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);
    const packageId = `LSP-${Date.now().toString().slice(-6)}`;
    setPackageStatus(
      `${packageId} complete package request created with ${selectedItems.length} services. Coordinator assigned.`
    );
    setRequestHistory((current) => [
      {
        id: packageId,
        type: "Complete package",
        target: packageForm.eventType,
        status: "Coordinator assigned",
      },
      ...current,
    ]);
  };

  const handleLeadAction = () => {
    setLeadStatus(
      "Lead selling model enabled: vendors can purchase priority leads and premium listing bundles."
    );
  };

  return (
    <div className="local-services-page">
      <section className="local-services-hero">
        <p className="local-services-kicker">Local Services Marketplace</p>
        <h1>Book Trusted Local Event Providers Quickly</h1>
        <p className="local-services-subtitle">
          Caterers, decorators, photographers, and full event bundles built for frequent Kerala functions.
        </p>
      </section>

      <section className="local-services-section">
        <h2>Main Categories</h2>
        <div className="local-services-categories">
          {CATEGORY_GROUPS.map((group) => (
            <article key={group.id} className="local-services-card">
              <h3>{group.name}</h3>
              <ul className="local-services-list">
                {group.services.map((service) => (
                  <li key={service}>{service}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="local-services-grid">
        <article className="local-services-panel">
          <h2>Find Providers</h2>
          <div className="local-services-form">
            <label>
              Search
              <input
                type="text"
                value={search.query}
                onChange={(event) => setSearch((current) => ({ ...current, query: event.target.value }))}
                placeholder="Provider, category, location..."
              />
            </label>
            <label>
              Category
              <select
                value={search.category}
                onChange={(event) =>
                  setSearch((current) => ({ ...current, category: event.target.value }))
                }
              >
                <option value="all">All categories</option>
                {CATEGORY_GROUPS.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Location
              <select
                value={search.location}
                onChange={(event) =>
                  setSearch((current) => ({ ...current, location: event.target.value }))
                }
              >
                <option value="all">All locations</option>
                <option value="Trivandrum">Trivandrum</option>
                <option value="Kollam">Kollam</option>
                <option value="Kottayam">Kottayam</option>
              </select>
            </label>
            <div className="local-services-row">
              <label>
                Price min
                <input
                  type="number"
                  value={search.priceMin}
                  onChange={(event) =>
                    setSearch((current) => ({ ...current, priceMin: event.target.value }))
                  }
                />
              </label>
              <label>
                Price max
                <input
                  type="number"
                  value={search.priceMax}
                  onChange={(event) =>
                    setSearch((current) => ({ ...current, priceMax: event.target.value }))
                  }
                />
              </label>
            </div>
          </div>
          {quoteStatus ? <p className="local-services-status">{quoteStatus}</p> : null}
        </article>

        <article className="local-services-panel">
          <h2>Provider Listings</h2>
          <div className="local-services-provider-list">
            {visibleProviders.length === 0 ? (
              <p>No providers match current filters.</p>
            ) : (
              visibleProviders.map((provider) => (
                <div key={provider.id} className="local-services-provider-item">
                  <h3>{provider.name}</h3>
                  <p>
                    {provider.location} | Start INR {provider.priceStart} | Rating {provider.rating}
                  </p>
                  <p>
                    Portfolio {provider.portfolioCount} | Response {provider.responseTime} |{" "}
                    {provider.verified ? "Verified" : "Verification pending"}
                  </p>
                  <p>{provider.availability}</p>
                  <div className="local-services-actions">
                    <button
                      type="button"
                      onClick={() =>
                        setBookingForm((current) => ({ ...current, providerId: provider.id }))
                      }
                    >
                      Select
                    </button>
                    <button type="button" onClick={() => handleQuoteRequest(provider.id)}>
                      Request Quote
                    </button>
                    <button type="button">Call / WhatsApp</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="local-services-grid">
        <article className="local-services-panel">
          <h2>Booking Request</h2>
          <form className="local-services-form" onSubmit={handleBookingRequest}>
            <label>
              Provider
              <select
                value={bookingForm.providerId}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, providerId: event.target.value }))
                }
              >
                <option value="">Select provider</option>
                {PROVIDERS.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Event type
              <select
                value={bookingForm.eventType}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, eventType: event.target.value }))
                }
              >
                <option value="Wedding">Wedding</option>
                <option value="Birthday">Birthday</option>
                <option value="Housewarming">Housewarming</option>
                <option value="Corporate">Corporate</option>
              </select>
            </label>
            <label>
              Event date
              <input
                type="date"
                value={bookingForm.eventDate}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, eventDate: event.target.value }))
                }
              />
            </label>
            <label>
              Guest count
              <input
                type="number"
                value={bookingForm.guests}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, guests: event.target.value }))
                }
              />
            </label>
            <label>
              Budget
              <input
                type="number"
                value={bookingForm.budget}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, budget: event.target.value }))
                }
              />
            </label>
            <label>
              Notes
              <textarea
                rows={2}
                value={bookingForm.notes}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Custom requirements"
              />
            </label>
            <label className="local-services-checkbox">
              <input
                type="checkbox"
                checked={bookingForm.advanceEnabled}
                onChange={(event) =>
                  setBookingForm((current) => ({
                    ...current,
                    advanceEnabled: event.target.checked,
                  }))
                }
              />
              Enable advance payment option
            </label>
            <button type="submit">Send Booking Request</button>
          </form>
          {bookingStatus ? <p className="local-services-status">{bookingStatus}</p> : null}
        </article>

        <article className="local-services-panel">
          <h2>Vendor Portal</h2>
          <form className="local-services-form" onSubmit={handleVendorRegister}>
            <label>
              Business name
              <input
                type="text"
                value={vendorForm.businessName}
                onChange={(event) =>
                  setVendorForm((current) => ({ ...current, businessName: event.target.value }))
                }
              />
            </label>
            <label>
              Category
              <select
                value={vendorForm.category}
                onChange={(event) =>
                  setVendorForm((current) => ({ ...current, category: event.target.value }))
                }
              >
                {CATEGORY_GROUPS.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              City
              <input
                type="text"
                value={vendorForm.city}
                onChange={(event) =>
                  setVendorForm((current) => ({ ...current, city: event.target.value }))
                }
              />
            </label>
            <label>
              Service package
              <input
                type="text"
                value={vendorForm.packageName}
                onChange={(event) =>
                  setVendorForm((current) => ({ ...current, packageName: event.target.value }))
                }
              />
            </label>
            <label>
              Package price
              <input
                type="number"
                value={vendorForm.packagePrice}
                onChange={(event) =>
                  setVendorForm((current) => ({ ...current, packagePrice: event.target.value }))
                }
              />
            </label>
            <label>
              Portfolio count
              <input
                type="number"
                value={vendorForm.portfolioItems}
                onChange={(event) =>
                  setVendorForm((current) => ({ ...current, portfolioItems: event.target.value }))
                }
              />
            </label>
            <label className="local-services-checkbox">
              <input
                type="checkbox"
                checked={vendorForm.verificationDone}
                onChange={(event) =>
                  setVendorForm((current) => ({
                    ...current,
                    verificationDone: event.target.checked,
                  }))
                }
              />
              Profile verification completed
            </label>
            <button type="submit">Submit Vendor Profile</button>
          </form>
          {vendorStatus ? <p className="local-services-status">{vendorStatus}</p> : null}
        </article>
      </section>

      <section className="local-services-grid">
        <article className="local-services-panel">
          <h2>Complete Event Booking Package</h2>
          <form className="local-services-form" onSubmit={handlePackageSubmit}>
            <label>
              Event type
              <select
                value={packageForm.eventType}
                onChange={(event) =>
                  setPackageForm((current) => ({ ...current, eventType: event.target.value }))
                }
              >
                <option value="Wedding">Wedding</option>
                <option value="Birthday">Birthday</option>
                <option value="Housewarming">Housewarming</option>
                <option value="Engagement">Engagement</option>
              </select>
            </label>
            <label>
              Event date
              <input
                type="date"
                value={packageForm.eventDate}
                onChange={(event) =>
                  setPackageForm((current) => ({ ...current, eventDate: event.target.value }))
                }
              />
            </label>
            <label>
              Budget
              <input
                type="number"
                value={packageForm.budget}
                onChange={(event) =>
                  setPackageForm((current) => ({ ...current, budget: event.target.value }))
                }
              />
            </label>
            <div className="local-services-checkbox-grid">
              {COMPLETE_PACKAGE_ITEMS.map((item) => (
                <label key={item} className="local-services-checkbox">
                  <input
                    type="checkbox"
                    checked={packageForm.items[item]}
                    onChange={(event) =>
                      setPackageForm((current) => ({
                        ...current,
                        items: { ...current.items, [item]: event.target.checked },
                      }))
                    }
                  />
                  {item}
                </label>
              ))}
            </div>
            <button type="submit">Request Complete Package</button>
          </form>
          {packageStatus ? <p className="local-services-status">{packageStatus}</p> : null}
        </article>

        <article className="local-services-panel">
          <h2>Monetization & Vendor Growth</h2>
          <ul className="local-services-list">
            <li>Commission per booking</li>
            <li>Paid vendor listing</li>
            <li>Featured provider placement</li>
            <li>Vendor subscription plans</li>
            <li>Lead selling model</li>
            <li>Advertisement banners</li>
            <li>Event package bundles</li>
          </ul>
          <h3>Vendor Operations</h3>
          <ul className="local-services-list">
            <li>Lead management</li>
            <li>Booking calendar</li>
            <li>Payment tracking</li>
            <li>Customer enquiry management</li>
            <li>Commission dashboard</li>
          </ul>
          <button type="button" onClick={handleLeadAction}>
            Enable Lead Selling Workflow
          </button>
          {leadStatus ? <p className="local-services-status">{leadStatus}</p> : null}
        </article>
      </section>

      <section className="local-services-section">
        <h2>Request Tracking</h2>
        <ul className="local-services-list">
          {requestHistory.length === 0 ? (
            <li>No requests yet.</li>
          ) : (
            requestHistory.map((item) => (
              <li key={item.id}>
                {item.id} | {item.type} | {item.target} | {item.status}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
};

export default LocalServicesMarketplace;
