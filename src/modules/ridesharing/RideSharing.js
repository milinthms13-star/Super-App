import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import "../../styles/RideSharing.css";

const ROLE_MODES = [
  {
    id: "rider",
    title: "Rider",
    description: "Book rides, track drivers live, pay digitally, and rate every trip.",
  },
  {
    id: "driver",
    title: "Driver / Captain",
    description: "Go online, accept requests, navigate smart routes, and track earnings.",
  },
  {
    id: "admin",
    title: "Admin",
    description: "Verify drivers, monitor rides, handle disputes, and oversee platform health.",
  },
];

const RIDE_STATUS_FLOW = [
  "Ride requested",
  "Driver accepted",
  "Driver arriving",
  "Trip started",
  "Trip completed",
];

const PAYMENT_OPTIONS = ["UPI", "Card", "Wallet", "Cash"];
const SUPPORTED_LANGUAGES = ["English", "Malayalam", "Tamil", "Hindi"];
const DATABASE_TABLES = ["Users", "Drivers", "Vehicles", "Rides", "Payments", "Locations", "Ratings"];
const INTEGRATIONS = ["Google Maps API", "Razorpay", "Stripe", "SMS / OTP service", "Push notifications"];
const FUTURE_ENHANCEMENTS = [
  "AI-based surge pricing",
  "Carpool and ride sharing",
  "Subscription plans",
  "EV vehicle integration",
  "Voice booking",
];
const OBJECTIVES = [
  "Provide fast and reliable transportation.",
  "Empower drivers as local entrepreneurs.",
  "Optimize ride matching and route efficiency.",
  "Ensure safety, transparency, and trust.",
];
const NON_FUNCTIONAL_REQUIREMENTS = [
  "Low-latency real-time performance",
  "Secure payments and privacy",
  "Mobile-first experience",
  "Multi-language support",
  "Scalable backend services",
];
const REQUIREMENT_GROUPS = [
  {
    title: "Authentication",
    items: ["Mobile OTP login", "Email and password login", "Profile management"],
  },
  {
    title: "Ride Booking",
    items: ["Pickup and drop selection", "Bike, Auto, Car ride types", "Fare estimation and confirmation"],
  },
  {
    title: "Driver Matching",
    items: ["Nearest-driver assignment", "Multi-driver request fanout", "ETA calculation"],
  },
  {
    title: "Live Operations",
    items: ["Real-time map tracking", "Route visualization", "Ride status flow"],
  },
  {
    title: "Payments and Alerts",
    items: ["UPI, Card, Wallet, Cash", "Invoice generation", "Ride and payment notifications"],
  },
  {
    title: "Safety and Trust",
    items: ["SOS button", "Trip sharing", "Driver verification", "Ratings and feedback"],
  },
];

const FALLBACK_RIDE_OFFERS = [
  {
    id: "ride-bike",
    type: "Bike",
    icon: "BK",
    category: "Quickest pickup",
    pricePerKm: 6,
    baseFare: 28,
    capacity: 1,
    eta: "2 mins",
    surgeMultiplier: 1,
    comfort: "Solo commute",
  },
  {
    id: "ride-auto",
    type: "Auto",
    icon: "AT",
    category: "Budget urban travel",
    pricePerKm: 9,
    baseFare: 42,
    capacity: 3,
    eta: "4 mins",
    surgeMultiplier: 1,
    comfort: "Short city hops",
  },
  {
    id: "ride-car",
    type: "Car",
    icon: "CR",
    category: "Everyday comfort",
    pricePerKm: 14,
    baseFare: 74,
    capacity: 4,
    eta: "5 mins",
    surgeMultiplier: 1.1,
    comfort: "Family and office rides",
  },
];

const DRIVER_PARTNERS = [
  {
    id: "driver-1",
    name: "Niyas",
    rating: 4.9,
    vehicle: "Honda Activa Auto",
    languages: ["English", "Malayalam"],
    zone: "Kakkanad",
    tripsToday: 9,
    earningsToday: 1840,
    verification: "Verified documents",
  },
  {
    id: "driver-2",
    name: "Akhil",
    rating: 4.8,
    vehicle: "Suzuki Access",
    languages: ["English", "Hindi"],
    zone: "Edappally",
    tripsToday: 11,
    earningsToday: 2120,
    verification: "Verified documents",
  },
  {
    id: "driver-3",
    name: "Fathima",
    rating: 4.9,
    vehicle: "WagonR",
    languages: ["English", "Malayalam", "Tamil"],
    zone: "Marine Drive",
    tripsToday: 7,
    earningsToday: 2650,
    verification: "Background checked",
  },
];

const SEED_RIDE_REQUESTS = [
  {
    id: "rq-101",
    riderName: "Aparna",
    pickup: "Infopark Phase 1",
    dropoff: "Lulu Mall",
    rideType: "Auto",
    eta: "5 mins",
    estimatedFare: 182,
    paymentMethod: "UPI",
  },
  {
    id: "rq-102",
    riderName: "Shahid",
    pickup: "Kaloor Metro",
    dropoff: "MG Road",
    rideType: "Bike",
    eta: "2 mins",
    estimatedFare: 86,
    paymentMethod: "Cash",
  },
];

const SEED_TRIP_HISTORY = [
  {
    id: "trip-9001",
    route: "Kakkanad to Vyttila",
    fare: 248,
    paymentMethod: "UPI",
    status: "Trip completed",
    riderRating: 5,
  },
  {
    id: "trip-9002",
    route: "Fort Kochi to MG Road",
    fare: 312,
    paymentMethod: "Card",
    status: "Trip completed",
    riderRating: 4,
  },
  {
    id: "trip-9003",
    route: "Edappally to Airport",
    fare: 518,
    paymentMethod: "Wallet",
    status: "Trip completed",
    riderRating: 5,
  },
];

const DEFAULT_BOOKING_FORM = {
  pickup: "",
  dropoff: "",
  paymentMethod: "UPI",
  rideTypeId: "",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatCompactNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const parseEtaMinutes = (value) => Number(String(value || "").replace(/[^0-9.]/g, "")) || 0;

const getBaseMode = (user) => {
  if (user?.registrationType === "admin" || user?.role === "admin") {
    return "admin";
  }

  if (user?.registrationType === "driver" || user?.role === "driver" || user?.role === "captain") {
    return "driver";
  }

  return "rider";
};

const estimateDistanceKm = (pickup, dropoff) => {
  const pickupSize = pickup.trim().length;
  const dropoffSize = dropoff.trim().length;

  if (!pickupSize || !dropoffSize) {
    return 0;
  }

  return Math.max(3, Math.min(26, Math.round((pickupSize + dropoffSize) / 4)));
};

const normalizeRideOffer = (ride, index) => ({
  id: String(ride?.id || `ride-${index + 1}`),
  type: ride?.type || FALLBACK_RIDE_OFFERS[index % FALLBACK_RIDE_OFFERS.length].type,
  icon: ride?.icon || FALLBACK_RIDE_OFFERS[index % FALLBACK_RIDE_OFFERS.length].icon,
  category: ride?.category || "Reliable transport",
  pricePerKm: Number(ride?.pricePerKm ?? 10),
  baseFare: Number(ride?.baseFare ?? 35),
  capacity: Number(ride?.capacity ?? 4),
  eta: ride?.eta || "4 mins",
  surgeMultiplier: Number(ride?.surgeMultiplier ?? 1),
  comfort: ride?.comfort || "City rides",
});

const buildTimeline = (status) =>
  RIDE_STATUS_FLOW.map((label) => ({
    label,
    complete: RIDE_STATUS_FLOW.indexOf(label) <= RIDE_STATUS_FLOW.indexOf(status),
    active: label === status,
  }));

const calculateFareBreakdown = (ride, pickup, dropoff) => {
  if (!ride) {
    return {
      distanceKm: 0,
      baseFare: 0,
      rideFare: 0,
      serviceFee: 0,
      total: 0,
    };
  }

  const distanceKm = estimateDistanceKm(pickup, dropoff);
  const baseFare = Number(ride.baseFare || 0);
  const rideFare = Math.round(distanceKm * Number(ride.pricePerKm || 0) * Number(ride.surgeMultiplier || 1));
  const serviceFee = Math.max(12, Math.round((baseFare + rideFare) * 0.06));
  const total = baseFare + rideFare + serviceFee;

  return {
    distanceKm,
    baseFare,
    rideFare,
    serviceFee,
    total,
  };
};

const buildInitialNotifications = () => [
  "OTP login, map APIs, and payment gateways are mapped into the ride flow.",
  "Safety tools include SOS, trip sharing, verified drivers, and ride logs.",
];

const RideSharing = () => {
  const { currentUser, mockData } = useApp();
  const baseMode = useMemo(() => getBaseMode(currentUser), [currentUser]);
  const rideCatalog = useMemo(() => {
    const incoming = Array.isArray(mockData?.rideOffers) ? mockData.rideOffers : [];
    const source = incoming.length ? incoming : FALLBACK_RIDE_OFFERS;
    return source.map(normalizeRideOffer);
  }, [mockData?.rideOffers]);

  const [mode, setMode] = useState(() => getBaseMode(currentUser));
  const [bookingForm, setBookingForm] = useState(() => ({
    ...DEFAULT_BOOKING_FORM,
    rideTypeId: rideCatalog[0]?.id || "",
  }));
  const [selectedRideId, setSelectedRideId] = useState(rideCatalog[0]?.id || "");
  const [statusMessage, setStatusMessage] = useState("");
  const [notifications, setNotifications] = useState(buildInitialNotifications);
  const [driverOnline, setDriverOnline] = useState(true);
  const [rideRequests, setRideRequests] = useState(SEED_RIDE_REQUESTS);
  const [tripHistory, setTripHistory] = useState(SEED_TRIP_HISTORY);
  const [activeTrip, setActiveTrip] = useState(null);
  const [pendingRatingTripId, setPendingRatingTripId] = useState("");
  const [ratingState, setRatingState] = useState({ riderToDriver: "5", driverToRider: "5", feedback: "" });

  useEffect(() => {
    setMode(baseMode);
  }, [baseMode]);

  useEffect(() => {
    if (!rideCatalog.length) {
      setSelectedRideId("");
      return;
    }

    setSelectedRideId((current) =>
      current && rideCatalog.some((ride) => String(ride.id) === String(current))
        ? current
        : rideCatalog[0].id
    );
  }, [rideCatalog]);

  useEffect(() => {
    setBookingForm((current) => ({
      ...current,
      rideTypeId:
        current.rideTypeId && rideCatalog.some((ride) => String(ride.id) === String(current.rideTypeId))
          ? current.rideTypeId
          : rideCatalog[0]?.id || "",
    }));
  }, [rideCatalog]);

  const selectedRide =
    rideCatalog.find((ride) => String(ride.id) === String(selectedRideId || bookingForm.rideTypeId)) ||
    rideCatalog[0] ||
    null;

  const fareBreakdown = useMemo(
    () => calculateFareBreakdown(selectedRide, bookingForm.pickup, bookingForm.dropoff),
    [bookingForm.dropoff, bookingForm.pickup, selectedRide]
  );

  const assignedDriver = useMemo(() => {
    if (!selectedRide) {
      return null;
    }

    if (selectedRide.type === "Bike") {
      return DRIVER_PARTNERS[1];
    }

    if (selectedRide.type === "Auto") {
      return DRIVER_PARTNERS[0];
    }

    return DRIVER_PARTNERS[2];
  }, [selectedRide]);

  const analytics = useMemo(() => {
    const hasActiveOngoingTrip = Boolean(activeTrip && activeTrip.status !== "Trip completed");
    const totalTrips = tripHistory.length + (hasActiveOngoingTrip ? 1 : 0);
    const completedTrips = tripHistory.filter((trip) => trip.status === "Trip completed").length;
    const revenue = tripHistory.reduce((sum, trip) => sum + Number(trip.fare || 0), 0);

    return {
      completionRate: totalTrips ? Math.round((completedTrips / totalTrips) * 100) : 0,
      averageWaitTime: selectedRide ? parseEtaMinutes(selectedRide.eta) : 0,
      driverEarnings: DRIVER_PARTNERS.reduce((sum, driver) => sum + driver.earningsToday, 0),
      retentionRate: 88,
      activeDrivers: DRIVER_PARTNERS.length,
      openDisputes: 2,
      totalRevenue: revenue,
    };
  }, [activeTrip, selectedRide, tripHistory]);

  const riderTrips = useMemo(() => {
    const currentTrip = activeTrip && activeTrip.status !== "Trip completed"
      ? [
          {
            id: activeTrip.id,
            route: `${activeTrip.pickup} to ${activeTrip.dropoff}`,
            fare: activeTrip.totalFare,
            paymentMethod: activeTrip.paymentMethod,
            status: activeTrip.status,
            riderRating: 0,
          },
        ]
      : [];

    return [...currentTrip, ...tripHistory];
  }, [activeTrip, tripHistory]);

  const canSubmitRating = Boolean(pendingRatingTripId);

  const allowedModes = useMemo(() => {
    if (baseMode === "admin") {
      return new Set(ROLE_MODES.map((role) => role.id));
    }

    return new Set([baseMode]);
  }, [baseMode]);

  const driverMetrics = useMemo(() => {
    const todayTrips = tripHistory.length;
    const acceptanceRate = rideRequests.length > 0 ? Math.max(82, 100 - rideRequests.length * 4) : 96;

    return {
      todayTrips,
      onlineHours: "7h 40m",
      earnings: tripHistory.reduce((sum, trip) => sum + Number(trip.fare || 0), 0),
      acceptanceRate,
    };
  }, [rideRequests, tripHistory]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setBookingForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (name === "rideTypeId") {
      setSelectedRideId(value);
    }
  };

  const handleRideSelect = (ride) => {
    setSelectedRideId(ride.id);
    setBookingForm((current) => ({
      ...current,
      rideTypeId: ride.id,
    }));
  };

  const pushNotification = (message) => {
    setNotifications((current) => [message, ...current].slice(0, 6));
  };

  const handleBookRide = () => {
    if (!selectedRide || !bookingForm.pickup.trim() || !bookingForm.dropoff.trim()) {
      setStatusMessage("Add pickup, drop, and ride type before confirming the booking.");
      return;
    }

    const newTrip = {
      id: `ride-${Date.now()}`,
      rideType: selectedRide.type,
      pickup: bookingForm.pickup.trim(),
      dropoff: bookingForm.dropoff.trim(),
      paymentMethod: bookingForm.paymentMethod,
      status: "Ride requested",
      totalFare: fareBreakdown.total,
      distanceKm: fareBreakdown.distanceKm,
      driver: assignedDriver,
      eta: selectedRide.eta,
      routeLabel: `${bookingForm.pickup.trim()} -> ${bookingForm.dropoff.trim()}`,
    };

    setActiveTrip(newTrip);
    setPendingRatingTripId("");
    setStatusMessage(`${selectedRide.type} booked successfully. Driver matching has started.`);
    pushNotification(`Ride booked from ${newTrip.pickup} to ${newTrip.dropoff}.`);
  };

  const handleAdvanceTripStatus = () => {
    if (!activeTrip) {
      return;
    }

    const currentIndex = RIDE_STATUS_FLOW.indexOf(activeTrip.status);
    if (currentIndex >= RIDE_STATUS_FLOW.length - 1) {
      setStatusMessage("This trip is already completed.");
      return;
    }

    const nextStatus = RIDE_STATUS_FLOW[Math.min(currentIndex + 1, RIDE_STATUS_FLOW.length - 1)];

    const nextTrip = {
      ...activeTrip,
      status: nextStatus,
    };

    setActiveTrip(nextTrip);
    setStatusMessage(`Trip updated to "${nextStatus}".`);
    pushNotification(`${nextTrip.driver?.name || "Driver"} updated the ride to ${nextStatus}.`);

    if (nextStatus === "Trip completed") {
      setTripHistory((current) => [
        {
          id: nextTrip.id,
          route: `${nextTrip.pickup} to ${nextTrip.dropoff}`,
          fare: nextTrip.totalFare,
          paymentMethod: nextTrip.paymentMethod,
          status: nextStatus,
          riderRating: 0,
        },
        ...current,
      ]);
      setPendingRatingTripId(nextTrip.id);
      setActiveTrip(null);
      return;
    }
  };

  const handleAcceptRequest = (requestId) => {
    const request = rideRequests.find((item) => item.id === requestId);
    if (!request) {
      return;
    }

    setRideRequests((current) => current.filter((item) => item.id !== requestId));
    setStatusMessage(`Ride request ${request.id} accepted. Navigation opened for ${request.pickup}.`);
    pushNotification(`Driver accepted ${request.rideType} ride for ${request.riderName}.`);
  };

  const handleRejectRequest = (requestId) => {
    const request = rideRequests.find((item) => item.id === requestId);
    setRideRequests((current) => current.filter((item) => item.id !== requestId));
    setStatusMessage(`Ride request ${requestId} rejected. The system will notify the next nearest driver.`);
    if (request) {
      pushNotification(`Request ${request.id} was rerouted to another nearby driver.`);
    }
  };

  const handleSubmitRating = () => {
    if (!canSubmitRating) {
      setStatusMessage("Complete your current trip before adding ratings and feedback.");
      return;
    }

    setStatusMessage("Ratings and feedback captured for both rider and driver.");
    pushNotification("Feedback stored for service quality and trust scoring.");
    setRatingState({ riderToDriver: "5", driverToRider: "5", feedback: "" });
    setPendingRatingTripId("");
  };

  const heroStats = [
    { label: "Completion rate", value: `${analytics.completionRate}%` },
    { label: "Average wait", value: `${analytics.averageWaitTime || 4} mins` },
    { label: "Driver earnings", value: formatCurrency(analytics.driverEarnings) },
    { label: "Retention", value: `${analytics.retentionRate}%` },
  ];

  return (
    <div className="rideshare-page">
      <section className="rideshare-hero">
        <div className="rideshare-hero-copy">
          <p className="rideshare-eyebrow">FRS ride-hailing platform</p>
          <h1>Book bikes, autos, and cars with live tracking, digital payments, and safety-first operations.</h1>
          <p>
            This module maps the full FRS into one mobile-first workspace for riders, drivers, and admins,
            covering booking, driver matching, tracking, payments, ratings, governance, and future roadmap.
          </p>
        </div>

        <div className="rideshare-stat-grid">
          {heroStats.map((stat) => (
            <article key={stat.label} className="rideshare-stat-card">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="rideshare-role-switcher">
        {ROLE_MODES.map((role) => {
          const isAllowed = allowedModes.has(role.id);
          return (
          <button
            key={role.id}
            type="button"
            className={`rideshare-role-chip ${mode === role.id ? "active" : ""}`}
            onClick={() => {
              if (isAllowed) {
                setMode(role.id);
              }
            }}
            disabled={!isAllowed}
          >
            <strong>{role.title}</strong>
            <span>{role.description}</span>
          </button>
          );
        })}
      </section>

      {statusMessage ? <div className="rideshare-status-banner">{statusMessage}</div> : null}

      <div className="rideshare-layout">
        <main className="rideshare-main">
          <section className="rideshare-panel rideshare-panel-highlight">
            <div className="rideshare-panel-head">
              <div>
                <h2>Ride booking</h2>
                <p>Pickup, drop, ride type selection, fare estimate, and payment confirmation.</p>
              </div>
              <span className="rideshare-badge">Live ETA + matching</span>
            </div>

            <div className="rideshare-booking-grid">
              <div className="rideshare-form-card">
                <div className="rideshare-form-grid">
                  <label className="rideshare-field">
                    <span>Pickup location</span>
                    <input
                      name="pickup"
                      type="text"
                      value={bookingForm.pickup}
                      onChange={handleFieldChange}
                      placeholder="Infopark Phase 1"
                    />
                  </label>

                  <label className="rideshare-field">
                    <span>Drop location</span>
                    <input
                      name="dropoff"
                      type="text"
                      value={bookingForm.dropoff}
                      onChange={handleFieldChange}
                      placeholder="Marine Drive"
                    />
                  </label>

                  <label className="rideshare-field">
                    <span>Ride type</span>
                    <select name="rideTypeId" value={bookingForm.rideTypeId} onChange={handleFieldChange}>
                      {rideCatalog.map((ride) => (
                        <option key={ride.id} value={ride.id}>
                          {ride.type}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="rideshare-field">
                    <span>Payment</span>
                    <select
                      name="paymentMethod"
                      value={bookingForm.paymentMethod}
                      onChange={handleFieldChange}
                    >
                      {PAYMENT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="rideshare-option-grid">
                  {rideCatalog.map((ride) => {
                    const isSelected = String(ride.id) === String(selectedRide?.id);
                    const previewFare = calculateFareBreakdown(ride, bookingForm.pickup, bookingForm.dropoff);

                    return (
                      <button
                        key={ride.id}
                        type="button"
                        className={`rideshare-option-card ${isSelected ? "selected" : ""}`}
                        onClick={() => handleRideSelect(ride)}
                      >
                        <div className="rideshare-option-top">
                          <span className="rideshare-option-icon">{ride.icon}</span>
                          <span className="rideshare-mini-badge">{ride.category}</span>
                        </div>
                        <strong>{ride.type}</strong>
                        <span>{ride.capacity} seats</span>
                        <span>{ride.eta} away</span>
                        <span>{formatCurrency(previewFare.total || ride.baseFare)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rideshare-summary-card">
                <div className="rideshare-panel-head compact">
                  <div>
                    <h3>Fare estimate</h3>
                    <p>Auto-calculated using ride type, distance, and service fee.</p>
                  </div>
                </div>

                <div className="rideshare-summary-list">
                  <div><span>Estimated distance</span><strong>{fareBreakdown.distanceKm || "--"} km</strong></div>
                  <div><span>Base fare</span><strong>{formatCurrency(fareBreakdown.baseFare)}</strong></div>
                  <div><span>Ride fare</span><strong>{formatCurrency(fareBreakdown.rideFare)}</strong></div>
                  <div><span>Service fee</span><strong>{formatCurrency(fareBreakdown.serviceFee)}</strong></div>
                  <div className="total"><span>Total estimate</span><strong>{formatCurrency(fareBreakdown.total)}</strong></div>
                </div>

                {selectedRide ? (
                  <div className="rideshare-driver-preview">
                    <strong>Matching preview</strong>
                    <span>{selectedRide.type} will search nearby drivers in {assignedDriver?.zone || "your zone"}.</span>
                    <span>Primary match ETA: {selectedRide.eta}</span>
                  </div>
                ) : null}

                <button type="button" className="rideshare-primary-button" onClick={handleBookRide}>
                  Confirm booking
                </button>
              </div>
            </div>
          </section>

          <section className="rideshare-grid-two">
            <article className="rideshare-panel">
              <div className="rideshare-panel-head">
                <div>
                  <h2>Core objectives</h2>
                  <p>Business goals behind the transport platform.</p>
                </div>
                <span className="rideshare-badge subtle">FRS scope</span>
              </div>
              <ul className="rideshare-list">
                {OBJECTIVES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="rideshare-panel">
              <div className="rideshare-panel-head">
                <div>
                  <h2>Non-functional requirements</h2>
                  <p>Performance, security, scalability, and mobile readiness.</p>
                </div>
                <span className="rideshare-badge subtle">Operations</span>
              </div>
              <ul className="rideshare-list">
                {NON_FUNCTIONAL_REQUIREMENTS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </section>

          {mode === "rider" ? (
            <>
              <section className="rideshare-grid-two">
                <article className="rideshare-panel">
                  <div className="rideshare-panel-head">
                    <div>
                      <h2>Live tracking</h2>
                      <p>Driver updates, route visualization, and status flow.</p>
                    </div>
                    <span className="rideshare-badge">Rider view</span>
                  </div>

                  {activeTrip ? (
                    <div className="rideshare-stack">
                      <div className="rideshare-map-card">
                        <strong>{activeTrip.routeLabel}</strong>
                        <span>Driver tracking is active with GPS logs, route line, and ETA monitoring.</span>
                      </div>

                      <div className="rideshare-tracker-grid">
                        <div className="rideshare-profile-card">
                          <strong>{activeTrip.driver?.name}</strong>
                          <span>{activeTrip.driver?.vehicle}</span>
                          <span>{activeTrip.driver?.rating} star captain</span>
                          <span>{activeTrip.driver?.verification}</span>
                        </div>

                        <div className="rideshare-summary-list">
                          <div><span>Status</span><strong>{activeTrip.status}</strong></div>
                          <div><span>ETA</span><strong>{activeTrip.eta}</strong></div>
                          <div><span>Payment</span><strong>{activeTrip.paymentMethod}</strong></div>
                          <div><span>Invoice amount</span><strong>{formatCurrency(activeTrip.totalFare)}</strong></div>
                        </div>
                      </div>

                      <div className="rideshare-timeline">
                        {buildTimeline(activeTrip.status).map((step) => (
                          <div
                            key={step.label}
                            className={`rideshare-timeline-item ${step.complete ? "complete" : ""} ${step.active ? "active" : ""}`}
                          >
                            <span />
                            <strong>{step.label}</strong>
                          </div>
                        ))}
                      </div>

                      <div className="rideshare-inline-actions">
                        <button type="button" className="rideshare-primary-button" onClick={handleAdvanceTripStatus}>
                          Simulate next status
                        </button>
                        <button
                          type="button"
                          className="rideshare-secondary-button"
                          onClick={() => {
                            setStatusMessage("Trip details shared with trusted contacts.");
                            pushNotification("Trip sharing sent with live route and driver details.");
                          }}
                        >
                          Share trip
                        </button>
                        <button
                          type="button"
                          className="rideshare-secondary-button danger"
                          onClick={() => {
                            setStatusMessage("SOS alert triggered for emergency support.");
                            pushNotification("SOS alert escalated to emergency workflow.");
                          }}
                        >
                          SOS
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rideshare-empty-state">
                      Book a ride to activate live tracking, route view, notifications, and payment flow.
                    </div>
                  )}
                </article>

                <article className="rideshare-panel">
                  <div className="rideshare-panel-head">
                    <div>
                      <h2>Ratings and feedback</h2>
                      <p>Mutual trust scoring for rider and driver after trip completion.</p>
                    </div>
                    <span className="rideshare-badge subtle">Trust</span>
                  </div>

                  <div className="rideshare-form-grid single">
                    <label className="rideshare-field">
                      <span>Rider rates driver</span>
                      <select
                        value={ratingState.riderToDriver}
                        onChange={(event) =>
                          setRatingState((current) => ({ ...current, riderToDriver: event.target.value }))
                        }
                      >
                        {[5, 4, 3, 2, 1].map((value) => (
                          <option key={`rider-${value}`} value={String(value)}>
                            {value} star{value === 1 ? "" : "s"}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="rideshare-field">
                      <span>Driver rates rider</span>
                      <select
                        value={ratingState.driverToRider}
                        onChange={(event) =>
                          setRatingState((current) => ({ ...current, driverToRider: event.target.value }))
                        }
                      >
                        {[5, 4, 3, 2, 1].map((value) => (
                          <option key={`driver-${value}`} value={String(value)}>
                            {value} star{value === 1 ? "" : "s"}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="rideshare-field rideshare-field-full">
                      <span>Feedback</span>
                      <textarea
                        rows="4"
                        value={ratingState.feedback}
                        onChange={(event) =>
                          setRatingState((current) => ({ ...current, feedback: event.target.value }))
                        }
                        placeholder="Share feedback about driver behavior, route accuracy, or vehicle quality"
                      />
                    </label>
                  </div>

                  <button type="button" className="rideshare-primary-button" onClick={handleSubmitRating}>
                    {canSubmitRating ? "Submit feedback" : "Complete trip to unlock feedback"}
                  </button>
                </article>
              </section>

              <section className="rideshare-panel">
                <div className="rideshare-panel-head">
                  <div>
                    <h2>Trip history and payments</h2>
                    <p>Invoices, payment methods, and completed trip records.</p>
                  </div>
                  <span className="rideshare-badge subtle">{riderTrips.length} trips</span>
                </div>

                <div className="rideshare-record-list">
                  {riderTrips.map((trip) => (
                    <article key={trip.id} className="rideshare-record-card">
                      <div>
                        <strong>{trip.route}</strong>
                        <p>{trip.status}</p>
                      </div>
                      <div className="rideshare-record-meta">
                        <span>{trip.paymentMethod}</span>
                        <strong>{formatCurrency(trip.fare)}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {mode === "driver" ? (
            <>
              <section className="rideshare-grid-two">
                <article className="rideshare-panel">
                  <div className="rideshare-panel-head">
                    <div>
                      <h2>Captain console</h2>
                      <p>Online status, ride alerts, navigation readiness, and daily earnings.</p>
                    </div>
                    <span className="rideshare-badge">Driver app</span>
                  </div>

                  <div className="rideshare-summary-list driver">
                    <div><span>Availability</span><strong>{driverOnline ? "Online" : "Offline"}</strong></div>
                    <div><span>Trips today</span><strong>{driverMetrics.todayTrips}</strong></div>
                    <div><span>Earnings</span><strong>{formatCurrency(driverMetrics.earnings)}</strong></div>
                    <div><span>Acceptance rate</span><strong>{driverMetrics.acceptanceRate}%</strong></div>
                  </div>

                  <div className="rideshare-inline-actions">
                    <button
                      type="button"
                      className="rideshare-primary-button"
                      onClick={() => {
                        setDriverOnline((current) => {
                          const nextValue = !current;
                          setStatusMessage(`Driver mode is now ${nextValue ? "online" : "offline"}.`);
                          return nextValue;
                        });
                      }}
                    >
                      {driverOnline ? "Go offline" : "Go online"}
                    </button>
                    <button
                      type="button"
                      className="rideshare-secondary-button"
                      onClick={() => {
                        setStatusMessage("Navigation opened with pickup and drop waypoints.");
                        pushNotification("Driver navigation synced with current ride assignment.");
                      }}
                    >
                      Open navigation
                    </button>
                  </div>
                </article>

                <article className="rideshare-panel">
                  <div className="rideshare-panel-head">
                    <div>
                      <h2>Earnings dashboard</h2>
                      <p>Trip income, active hours, and daily productivity.</p>
                    </div>
                    <span className="rideshare-badge subtle">Entrepreneur tools</span>
                  </div>

                  <div className="rideshare-stat-grid compact">
                    <article className="rideshare-stat-card">
                      <strong>{formatCurrency(driverMetrics.earnings)}</strong>
                      <span>Gross earnings</span>
                    </article>
                    <article className="rideshare-stat-card">
                      <strong>{driverMetrics.onlineHours}</strong>
                      <span>Online time</span>
                    </article>
                    <article className="rideshare-stat-card">
                      <strong>{rideRequests.length}</strong>
                      <span>Open ride alerts</span>
                    </article>
                    <article className="rideshare-stat-card">
                      <strong>{formatCompactNumber(124)}</strong>
                      <span>Kilometers today</span>
                    </article>
                  </div>
                </article>
              </section>

              <section className="rideshare-grid-two">
                <article className="rideshare-panel">
                  <div className="rideshare-panel-head">
                    <div>
                      <h2>Ride requests</h2>
                      <p>Nearest-driver assignment with accept and reject logic.</p>
                    </div>
                    <span className="rideshare-badge subtle">{rideRequests.length} pending</span>
                  </div>

                  <div className="rideshare-record-list">
                    {rideRequests.length ? (
                      rideRequests.map((request) => (
                        <article key={request.id} className="rideshare-record-card">
                          <div>
                            <strong>{request.riderName}</strong>
                            <p>{request.pickup} to {request.dropoff}</p>
                            <p>{request.rideType} | {request.eta} | {request.paymentMethod}</p>
                          </div>
                          <div className="rideshare-inline-actions stacked">
                            <strong>{formatCurrency(request.estimatedFare)}</strong>
                            <button
                              type="button"
                              className="rideshare-primary-button"
                              onClick={() => handleAcceptRequest(request.id)}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="rideshare-secondary-button"
                              onClick={() => handleRejectRequest(request.id)}
                            >
                              Reject
                            </button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="rideshare-empty-state">
                        No pending ride requests right now. New alerts will appear here.
                      </div>
                    )}
                  </div>
                </article>

                <article className="rideshare-panel">
                  <div className="rideshare-panel-head">
                    <div>
                      <h2>Trip history</h2>
                      <p>Completed rides and rider feedback history.</p>
                    </div>
                    <span className="rideshare-badge subtle">History</span>
                  </div>

                  <div className="rideshare-record-list">
                    {tripHistory.map((trip) => (
                      <article key={trip.id} className="rideshare-record-card">
                        <div>
                          <strong>{trip.route}</strong>
                          <p>{trip.status}</p>
                        </div>
                        <div className="rideshare-record-meta">
                          <span>{trip.riderRating}/5 rider score</span>
                          <strong>{formatCurrency(trip.fare)}</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                </article>
              </section>
            </>
          ) : null}

          {mode === "admin" ? (
            <>
              <section className="rideshare-grid-two">
                <article className="rideshare-panel">
                  <div className="rideshare-panel-head">
                    <div>
                      <h2>Platform analytics</h2>
                      <p>Success metrics for ride completion, wait time, earnings, and retention.</p>
                    </div>
                    <span className="rideshare-badge">Admin</span>
                  </div>

                  <div className="rideshare-stat-grid compact">
                    <article className="rideshare-stat-card">
                      <strong>{analytics.completionRate}%</strong>
                      <span>Ride completion</span>
                    </article>
                    <article className="rideshare-stat-card">
                      <strong>{analytics.averageWaitTime || 4} mins</strong>
                      <span>Average wait</span>
                    </article>
                    <article className="rideshare-stat-card">
                      <strong>{formatCurrency(analytics.driverEarnings)}</strong>
                      <span>Driver earnings</span>
                    </article>
                    <article className="rideshare-stat-card">
                      <strong>{analytics.retentionRate}%</strong>
                      <span>Customer retention</span>
                    </article>
                  </div>
                </article>

                <article className="rideshare-panel">
                  <div className="rideshare-panel-head">
                    <div>
                      <h2>Governance desk</h2>
                      <p>User management, document verification, disputes, and safety oversight.</p>
                    </div>
                    <span className="rideshare-badge subtle">Compliance</span>
                  </div>

                  <div className="rideshare-summary-list admin">
                    <div><span>Active drivers</span><strong>{analytics.activeDrivers}</strong></div>
                    <div><span>Disputes open</span><strong>{analytics.openDisputes}</strong></div>
                    <div><span>Documents verified</span><strong>{DRIVER_PARTNERS.length}</strong></div>
                    <div><span>Tracked payments</span><strong>{formatCurrency(analytics.totalRevenue)}</strong></div>
                  </div>
                </article>
              </section>

              <section className="rideshare-grid-two">
                <article className="rideshare-panel">
                  <div className="rideshare-panel-head">
                    <div>
                      <h2>Driver verification</h2>
                      <p>Vehicle, document, and background-check visibility.</p>
                    </div>
                    <span className="rideshare-badge subtle">Safety</span>
                  </div>

                  <div className="rideshare-record-list">
                    {DRIVER_PARTNERS.map((driver) => (
                      <article key={driver.id} className="rideshare-record-card">
                        <div>
                          <strong>{driver.name}</strong>
                          <p>{driver.vehicle}</p>
                          <p>{driver.languages.join(", ")}</p>
                        </div>
                        <div className="rideshare-record-meta">
                          <span>{driver.verification}</span>
                          <strong>{driver.rating} stars</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                </article>

                <article className="rideshare-panel">
                  <div className="rideshare-panel-head">
                    <div>
                      <h2>Disputes and feedback</h2>
                      <p>Review complaints, low ratings, and payment exceptions.</p>
                    </div>
                    <span className="rideshare-badge subtle">Moderation</span>
                  </div>

                  <div className="rideshare-record-list">
                    {[
                      "Fare dispute from Airport to Edappally awaiting review",
                      "Late-arrival complaint flagged against one auto trip",
                      "Wallet refund verification pending for cancelled ride",
                    ].map((item) => (
                      <article key={item} className="rideshare-record-card simple">
                        <strong>{item}</strong>
                        <button type="button" className="rideshare-secondary-button">
                          Resolve
                        </button>
                      </article>
                    ))}
                  </div>
                </article>
              </section>
            </>
          ) : null}

          <section className="rideshare-panel">
            <div className="rideshare-panel-head">
              <div>
                <h2>Functional requirements map</h2>
                <p>Each FRS block is represented as a product capability area.</p>
              </div>
              <span className="rideshare-badge subtle">Coverage</span>
            </div>

            <div className="rideshare-requirement-grid">
              {REQUIREMENT_GROUPS.map((group) => (
                <article key={group.title} className="rideshare-requirement-card">
                  <strong>{group.title}</strong>
                  <ul className="rideshare-list">
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="rideshare-rail">
          <section className="rideshare-panel">
            <div className="rideshare-panel-head">
              <div>
                <h2>Notifications</h2>
                <p>Ride confirmations, arrival alerts, and payment updates.</p>
              </div>
              <span className="rideshare-badge subtle">Live</span>
            </div>
            <ul className="rideshare-list">
              {notifications.map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="rideshare-panel">
            <div className="rideshare-panel-head">
              <div>
                <h2>Safety stack</h2>
                <p>Core trust features built into every trip.</p>
              </div>
              <span className="rideshare-badge subtle">Secure</span>
            </div>
            <div className="rideshare-chip-cloud">
              {["SOS emergency", "Share trip", "Driver verification", "Ride tracking logs"].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>

          <section className="rideshare-panel">
            <div className="rideshare-panel-head">
              <div>
                <h2>Database scope</h2>
                <p>Primary tables required for the platform.</p>
              </div>
            </div>
            <div className="rideshare-chip-cloud muted">
              {DATABASE_TABLES.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>

          <section className="rideshare-panel">
            <div className="rideshare-panel-head">
              <div>
                <h2>Integrations</h2>
                <p>External services the module depends on.</p>
              </div>
            </div>
            <ul className="rideshare-list">
              {INTEGRATIONS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="rideshare-panel">
            <div className="rideshare-panel-head">
              <div>
                <h2>Languages</h2>
                <p>Mobile-first multilingual readiness.</p>
              </div>
            </div>
            <div className="rideshare-chip-cloud">
              {SUPPORTED_LANGUAGES.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>

          <section className="rideshare-panel">
            <div className="rideshare-panel-head">
              <div>
                <h2>Future roadmap</h2>
                <p>Growth opportunities beyond the first release.</p>
              </div>
            </div>
            <ul className="rideshare-list">
              {FUTURE_ENHANCEMENTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default RideSharing;
