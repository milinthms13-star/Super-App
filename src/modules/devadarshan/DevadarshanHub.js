import React, { useMemo, useState } from "react";
import "./DevadarshanHub.css";

const TEMPLES = [
  {
    id: "temple-1",
    name: "Sree Padmanabhaswamy Temple",
    district: "Trivandrum",
    timings: "3:30 AM - 12:00 PM, 5:00 PM - 7:20 PM",
    festival: "Alpashy Festival",
    pooja: "Usha Pooja, Deeparadhana",
    dressCode: "Traditional attire required",
    map: "East Fort, Thiruvananthapuram",
  },
  {
    id: "temple-2",
    name: "Kottarakkara Mahaganapathy Temple",
    district: "Kollam",
    timings: "4:00 AM - 11:00 AM, 5:00 PM - 8:00 PM",
    festival: "Vinayaka Chaturthi",
    pooja: "Ganapathy Homam",
    dressCode: "Decent traditional dress",
    map: "Kottarakkara, Kollam",
  },
  {
    id: "temple-3",
    name: "Ettumanoor Mahadeva Temple",
    district: "Kottayam",
    timings: "4:00 AM - 12:00 PM, 5:00 PM - 8:00 PM",
    festival: "Ezharaponnana Festival",
    pooja: "Rudrabhishekam, Special Darshan",
    dressCode: "Mundu/saree preferred",
    map: "Ettumanoor, Kottayam",
  },
];

const VAZHIPADU_TYPES = [
  "Archana",
  "Neyvilakku",
  "Ganapathy Homam",
  "Mrityunjaya Homam",
  "Annadanam Contribution",
  "Special Darshan",
];

const DONATION_TYPES = [
  "General Donation",
  "Festival Donation",
  "Annadanam Donation",
  "Renovation Fund",
];

const RELIGIOUS_EVENTS = [
  "Bhagavatha Sapthaham",
  "Pooja Booking",
  "Homam Booking",
  "Special Darshan Booking",
  "Festival Participation",
];

const PERSONAL_FUNCTIONS = [
  "Naming Ceremony",
  "Choroonu",
  "Vidyarambham",
  "Engagement Ritual",
  "Wedding-related Ritual",
];

const HALLS = [
  {
    id: "hall-1",
    name: "Devadarshan Temple Hall",
    type: "Temple Auditorium",
    location: "Trivandrum",
    seats: 350,
    rent: 25000,
    ac: true,
    foodAllowed: true,
    decorationAllowed: true,
  },
  {
    id: "hall-2",
    name: "Bhagavathi Community Hall",
    type: "Community Hall",
    location: "Kollam",
    seats: 220,
    rent: 14000,
    ac: false,
    foodAllowed: true,
    decorationAllowed: true,
  },
  {
    id: "hall-3",
    name: "Nila Event Space",
    type: "Party/Conference Hall",
    location: "Kottayam",
    seats: 180,
    rent: 12000,
    ac: true,
    foodAllowed: false,
    decorationAllowed: true,
  },
];

const SERVICE_PROVIDERS = [
  "Caterers",
  "Decorators",
  "Photographers",
  "Priests",
  "Sound & Light",
  "Flower Decoration",
  "Vehicle Rental",
];

const PACKAGE_OPTIONS = [
  "Wedding Package",
  "Engagement Package",
  "Birthday Package",
  "Temple Function Package",
  "Housewarming Package",
];

const INITIAL_VAZHIPADU_FORM = {
  templeId: "",
  vazhipaduType: VAZHIPADU_TYPES[0],
  devoteeName: "",
  nakshatra: "",
  bookingDate: "",
  amount: "500",
};

const INITIAL_EVENT_FORM = {
  eventType: RELIGIOUS_EVENTS[0],
  personalFunction: PERSONAL_FUNCTIONS[0],
  eventDate: "",
  participants: "3",
  notes: "",
};

const INITIAL_HALL_FORM = {
  hallId: "",
  bookingDate: "",
  functionType: "Temple Function",
  acRequired: true,
  foodPermission: true,
  decorationPermission: true,
  advanceAmount: "5000",
};

const INITIAL_ADMIN_FORM = {
  commissionVazhipadu: "8",
  commissionHall: "6",
  featuredTempleFee: "1999",
  featuredHallFee: "1499",
};

const DevadarshanHub = () => {
  const [searchTemple, setSearchTemple] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("All");

  const [vazhipaduForm, setVazhipaduForm] = useState(INITIAL_VAZHIPADU_FORM);
  const [eventForm, setEventForm] = useState(INITIAL_EVENT_FORM);
  const [hallForm, setHallForm] = useState(INITIAL_HALL_FORM);
  const [adminForm, setAdminForm] = useState(INITIAL_ADMIN_FORM);

  const [vazhipaduStatus, setVazhipaduStatus] = useState("");
  const [eventStatus, setEventStatus] = useState("");
  const [hallStatus, setHallStatus] = useState("");
  const [donationStatus, setDonationStatus] = useState("");
  const [adminStatus, setAdminStatus] = useState("");

  const [selectedDonation, setSelectedDonation] = useState(DONATION_TYPES[0]);
  const [donationAmount, setDonationAmount] = useState("1000");
  const [bookingHistory, setBookingHistory] = useState([]);

  const visibleTemples = useMemo(
    () =>
      TEMPLES.filter((temple) => {
        const districtMatch =
          selectedDistrict === "All" || temple.district.toLowerCase() === selectedDistrict.toLowerCase();
        const query = searchTemple.trim().toLowerCase();
        const textMatch = !query || `${temple.name} ${temple.district}`.toLowerCase().includes(query);
        return districtMatch && textMatch;
      }),
    [searchTemple, selectedDistrict]
  );

  const handleVazhipaduSubmit = (event) => {
    event.preventDefault();
    const selectedTemple = TEMPLES.find((temple) => temple.id === vazhipaduForm.templeId);
    if (!selectedTemple || !vazhipaduForm.devoteeName.trim() || !vazhipaduForm.bookingDate) {
      setVazhipaduStatus("Select temple, date, and devotee name.");
      return;
    }

    const bookingId = `VD-${Date.now().toString().slice(-6)}`;
    setVazhipaduStatus(
      `${bookingId} booked for ${vazhipaduForm.vazhipaduType} at ${selectedTemple.name}. SMS/WhatsApp confirmation queued.`
    );
    setBookingHistory((current) => [
      {
        id: bookingId,
        type: "Vazhipadu",
        label: vazhipaduForm.vazhipaduType,
        status: "Confirmed",
      },
      ...current,
    ]);
    setVazhipaduForm(INITIAL_VAZHIPADU_FORM);
  };

  const handleDonation = () => {
    if (!Number(donationAmount)) {
      setDonationStatus("Enter valid donation amount.");
      return;
    }

    const receiptId = `DN-${Date.now().toString().slice(-5)}`;
    setDonationStatus(
      `${selectedDonation} of INR ${donationAmount} submitted. Digital receipt ${receiptId} generated.`
    );
  };

  const handleEventSubmit = (event) => {
    event.preventDefault();
    if (!eventForm.eventDate) {
      setEventStatus("Select event date.");
      return;
    }
    const requestId = `EV-${Date.now().toString().slice(-5)}`;
    setEventStatus(
      `${requestId} request created for ${eventForm.eventType} / ${eventForm.personalFunction}. Coordinator will confirm slot.`
    );
    setBookingHistory((current) => [
      {
        id: requestId,
        type: "Event",
        label: `${eventForm.eventType} - ${eventForm.personalFunction}`,
        status: "In Review",
      },
      ...current,
    ]);
    setEventForm(INITIAL_EVENT_FORM);
  };

  const handleHallSubmit = (event) => {
    event.preventDefault();
    const selectedHall = HALLS.find((hall) => hall.id === hallForm.hallId);
    if (!selectedHall || !hallForm.bookingDate) {
      setHallStatus("Select hall and date.");
      return;
    }
    const hallId = `HL-${Date.now().toString().slice(-5)}`;
    setHallStatus(
      `${hallId} reserved for ${selectedHall.name}. Advance INR ${hallForm.advanceAmount} marked, pending final approval.`
    );
    setBookingHistory((current) => [
      {
        id: hallId,
        type: "Hall",
        label: selectedHall.name,
        status: "Pending Approval",
      },
      ...current,
    ]);
    setHallForm(INITIAL_HALL_FORM);
  };

  const handleAdminSubmit = (event) => {
    event.preventDefault();
    setAdminStatus(
      `Commission updated: Vazhipadu ${adminForm.commissionVazhipadu}% | Hall ${adminForm.commissionHall}% | Featured Temple INR ${adminForm.featuredTempleFee} | Featured Hall INR ${adminForm.featuredHallFee}.`
    );
  };

  return (
    <div className="devadarshan-page">
      <section className="devadarshan-hero">
        <p className="devadarshan-kicker">Devadarshan - Temple & Event Booking Hub</p>
        <h1>Vazhipadu, Event, and Hall Booking for Kerala Communities</h1>
        <p className="devadarshan-subtitle">
          Daily-use temple services with donation support, booking confirmations, and local event workflows.
        </p>
        <div className="devadarshan-hero-controls">
          <input
            type="text"
            value={searchTemple}
            onChange={(event) => setSearchTemple(event.target.value)}
            placeholder="Search temples..."
          />
          <select value={selectedDistrict} onChange={(event) => setSelectedDistrict(event.target.value)}>
            <option value="All">All districts</option>
            <option value="Trivandrum">Trivandrum</option>
            <option value="Kollam">Kollam</option>
            <option value="Kottayam">Kottayam</option>
          </select>
        </div>
      </section>

      <section className="devadarshan-section">
        <h2>Temple Services</h2>
        <div className="devadarshan-cards">
          {visibleTemples.map((temple) => (
            <article key={temple.id} className="devadarshan-card">
              <h3>{temple.name}</h3>
              <p>{temple.district}</p>
              <p>Timing: {temple.timings}</p>
              <p>Festival: {temple.festival}</p>
              <p>Pooja: {temple.pooja}</p>
              <p>Dress Code: {temple.dressCode}</p>
              <p>Map: {temple.map}</p>
              <button
                type="button"
                onClick={() => setVazhipaduForm((current) => ({ ...current, templeId: temple.id }))}
              >
                Select Temple
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="devadarshan-grid">
        <article className="devadarshan-panel">
          <h2>Vazhipadu Booking</h2>
          <form className="devadarshan-form" onSubmit={handleVazhipaduSubmit}>
            <label>
              Temple
              <select
                value={vazhipaduForm.templeId}
                onChange={(event) =>
                  setVazhipaduForm((current) => ({ ...current, templeId: event.target.value }))
                }
              >
                <option value="">Select temple</option>
                {TEMPLES.map((temple) => (
                  <option key={temple.id} value={temple.id}>
                    {temple.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Vazhipadu Type
              <select
                value={vazhipaduForm.vazhipaduType}
                onChange={(event) =>
                  setVazhipaduForm((current) => ({ ...current, vazhipaduType: event.target.value }))
                }
              >
                {VAZHIPADU_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Devotee Name
              <input
                type="text"
                value={vazhipaduForm.devoteeName}
                onChange={(event) =>
                  setVazhipaduForm((current) => ({ ...current, devoteeName: event.target.value }))
                }
                placeholder="Name for pooja receipt"
              />
            </label>
            <label>
              Nakshatra
              <input
                type="text"
                value={vazhipaduForm.nakshatra}
                onChange={(event) =>
                  setVazhipaduForm((current) => ({ ...current, nakshatra: event.target.value }))
                }
                placeholder="Optional"
              />
            </label>
            <label>
              Date
              <input
                type="date"
                value={vazhipaduForm.bookingDate}
                onChange={(event) =>
                  setVazhipaduForm((current) => ({ ...current, bookingDate: event.target.value }))
                }
              />
            </label>
            <label>
              Amount
              <input
                type="number"
                value={vazhipaduForm.amount}
                onChange={(event) =>
                  setVazhipaduForm((current) => ({ ...current, amount: event.target.value }))
                }
              />
            </label>
            <button type="submit">Book Vazhipadu</button>
          </form>
          {vazhipaduStatus ? <p className="devadarshan-status">{vazhipaduStatus}</p> : null}
        </article>

        <article className="devadarshan-panel">
          <h2>Temple Donation</h2>
          <div className="devadarshan-form">
            <label>
              Donation Type
              <select
                value={selectedDonation}
                onChange={(event) => setSelectedDonation(event.target.value)}
              >
                {DONATION_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount
              <input
                type="number"
                value={donationAmount}
                onChange={(event) => setDonationAmount(event.target.value)}
              />
            </label>
            <button type="button" onClick={handleDonation}>
              Donate & Generate Receipt
            </button>
          </div>
          {donationStatus ? <p className="devadarshan-status">{donationStatus}</p> : null}
        </article>
      </section>

      <section className="devadarshan-grid">
        <article className="devadarshan-panel">
          <h2>Event Booking</h2>
          <form className="devadarshan-form" onSubmit={handleEventSubmit}>
            <label>
              Religious Event
              <select
                value={eventForm.eventType}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, eventType: event.target.value }))
                }
              >
                {RELIGIOUS_EVENTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Personal Function
              <select
                value={eventForm.personalFunction}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, personalFunction: event.target.value }))
                }
              >
                {PERSONAL_FUNCTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Event Date
              <input
                type="date"
                value={eventForm.eventDate}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, eventDate: event.target.value }))
                }
              />
            </label>
            <label>
              Participants
              <input
                type="number"
                value={eventForm.participants}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, participants: event.target.value }))
                }
              />
            </label>
            <label>
              Notes
              <textarea
                rows={2}
                value={eventForm.notes}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Special requirements"
              />
            </label>
            <button type="submit">Submit Event Request</button>
          </form>
          {eventStatus ? <p className="devadarshan-status">{eventStatus}</p> : null}
        </article>

        <article className="devadarshan-panel">
          <h2>Hall Booking</h2>
          <form className="devadarshan-form" onSubmit={handleHallSubmit}>
            <label>
              Hall / Auditorium
              <select
                value={hallForm.hallId}
                onChange={(event) =>
                  setHallForm((current) => ({ ...current, hallId: event.target.value }))
                }
              >
                <option value="">Select hall</option>
                {HALLS.map((hall) => (
                  <option key={hall.id} value={hall.id}>
                    {hall.name} - {hall.location} ({hall.seats} seats)
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date
              <input
                type="date"
                value={hallForm.bookingDate}
                onChange={(event) =>
                  setHallForm((current) => ({ ...current, bookingDate: event.target.value }))
                }
              />
            </label>
            <label>
              Function Type
              <input
                type="text"
                value={hallForm.functionType}
                onChange={(event) =>
                  setHallForm((current) => ({ ...current, functionType: event.target.value }))
                }
              />
            </label>
            <label className="devadarshan-checkbox">
              <input
                type="checkbox"
                checked={hallForm.acRequired}
                onChange={(event) =>
                  setHallForm((current) => ({ ...current, acRequired: event.target.checked }))
                }
              />
              AC Required
            </label>
            <label className="devadarshan-checkbox">
              <input
                type="checkbox"
                checked={hallForm.foodPermission}
                onChange={(event) =>
                  setHallForm((current) => ({ ...current, foodPermission: event.target.checked }))
                }
              />
              Food Permission
            </label>
            <label className="devadarshan-checkbox">
              <input
                type="checkbox"
                checked={hallForm.decorationPermission}
                onChange={(event) =>
                  setHallForm((current) => ({
                    ...current,
                    decorationPermission: event.target.checked,
                  }))
                }
              />
              Decoration Permission
            </label>
            <label>
              Advance Amount
              <input
                type="number"
                value={hallForm.advanceAmount}
                onChange={(event) =>
                  setHallForm((current) => ({ ...current, advanceAmount: event.target.value }))
                }
              />
            </label>
            <button type="submit">Reserve Hall</button>
          </form>
          {hallStatus ? <p className="devadarshan-status">{hallStatus}</p> : null}
        </article>
      </section>

      <section className="devadarshan-grid">
        <article className="devadarshan-panel">
          <h2>Service Providers & Packages</h2>
          <h3>Integrated Providers</h3>
          <ul className="devadarshan-list">
            {SERVICE_PROVIDERS.map((provider) => (
              <li key={provider}>{provider}</li>
            ))}
          </ul>
          <h3>Package Booking</h3>
          <ul className="devadarshan-list">
            {PACKAGE_OPTIONS.map((pkg) => (
              <li key={pkg}>{pkg}</li>
            ))}
          </ul>
        </article>

        <article className="devadarshan-panel">
          <h2>Admin Controls</h2>
          <form className="devadarshan-form" onSubmit={handleAdminSubmit}>
            <label>
              Vazhipadu Commission (%)
              <input
                type="number"
                value={adminForm.commissionVazhipadu}
                onChange={(event) =>
                  setAdminForm((current) => ({ ...current, commissionVazhipadu: event.target.value }))
                }
              />
            </label>
            <label>
              Hall Commission (%)
              <input
                type="number"
                value={adminForm.commissionHall}
                onChange={(event) =>
                  setAdminForm((current) => ({ ...current, commissionHall: event.target.value }))
                }
              />
            </label>
            <label>
              Featured Temple Fee
              <input
                type="number"
                value={adminForm.featuredTempleFee}
                onChange={(event) =>
                  setAdminForm((current) => ({ ...current, featuredTempleFee: event.target.value }))
                }
              />
            </label>
            <label>
              Featured Hall Fee
              <input
                type="number"
                value={adminForm.featuredHallFee}
                onChange={(event) =>
                  setAdminForm((current) => ({ ...current, featuredHallFee: event.target.value }))
                }
              />
            </label>
            <button type="submit">Save Admin Settings</button>
          </form>
          {adminStatus ? <p className="devadarshan-status">{adminStatus}</p> : null}
        </article>
      </section>

      <section className="devadarshan-section">
        <h2>Booking Status Tracking</h2>
        <ul className="devadarshan-list">
          {bookingHistory.length === 0 ? (
            <li>No bookings yet.</li>
          ) : (
            bookingHistory.map((entry) => (
              <li key={entry.id}>
                {entry.id} | {entry.type} | {entry.label} | {entry.status}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
};

export default DevadarshanHub;
