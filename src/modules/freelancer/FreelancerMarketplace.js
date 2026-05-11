import React, { useMemo, useState } from "react";
import "./FreelancerMarketplace.css";

const DISTRICTS = ["Kollam", "Trivandrum", "Alappuzha", "Kottayam", "Pathanamthitta"];
const LANGUAGES = ["English", "Malayalam", "Tamil"];

const DIGITAL_CATEGORIES = [
  "Developers",
  "UI/UX Designers",
  "Video Editors",
  "SEO Experts",
  "Digital Marketing",
  "Content Writers",
  "AI Automation Experts",
  "Accountants",
  "GST Consultants",
];

const LOCAL_CATEGORIES = [
  "Electricians",
  "Plumbers",
  "AC Technicians",
  "Carpenters",
  "Painters",
  "Home Cleaning",
  "Drivers",
  "Tutors",
  "Nurses",
  "Beauticians",
];

const PROFESSIONALS = [
  {
    id: "pro-101",
    name: "Akhil Dev Studio",
    category: "Developers",
    type: "digital",
    district: "Trivandrum",
    rating: 4.9,
    experience: 6,
    language: "English",
    budget: "premium",
    availability: "online-now",
    verified: true,
    responseMinutes: 12,
    badges: ["Verified", "Top Rated"],
    hourlyRate: 1200,
    gigStartsFrom: 15000,
    completionRate: 96,
    responseRate: 98,
  },
  {
    id: "pro-102",
    name: "Nila Tax Assist",
    category: "GST Consultants",
    type: "digital",
    district: "Kollam",
    rating: 4.7,
    experience: 9,
    language: "Malayalam",
    budget: "medium",
    availability: "schedule",
    verified: true,
    responseMinutes: 24,
    badges: ["Verified", "Trusted Expert"],
    hourlyRate: 900,
    gigStartsFrom: 2500,
    completionRate: 94,
    responseRate: 95,
  },
  {
    id: "pro-103",
    name: "QuickFix Electrical Team",
    category: "Electricians",
    type: "local",
    district: "Kottayam",
    rating: 4.8,
    experience: 7,
    language: "Malayalam",
    budget: "medium",
    availability: "instant",
    verified: true,
    responseMinutes: 8,
    badges: ["Verified", "Premium"],
    hourlyRate: 700,
    gigStartsFrom: 999,
    completionRate: 97,
    responseRate: 99,
  },
  {
    id: "pro-104",
    name: "CareBridge Nurses",
    category: "Nurses",
    type: "local",
    district: "Pathanamthitta",
    rating: 4.6,
    experience: 5,
    language: "Tamil",
    budget: "budget",
    availability: "schedule",
    verified: true,
    responseMinutes: 30,
    badges: ["Verified"],
    hourlyRate: 650,
    gigStartsFrom: 1800,
    completionRate: 92,
    responseRate: 93,
  },
  {
    id: "pro-105",
    name: "PixelCraft Editors",
    category: "Video Editors",
    type: "digital",
    district: "Alappuzha",
    rating: 4.5,
    experience: 4,
    language: "English",
    budget: "budget",
    availability: "online-now",
    verified: false,
    responseMinutes: 35,
    badges: ["Rising Talent"],
    hourlyRate: 500,
    gigStartsFrom: 2000,
    completionRate: 89,
    responseRate: 90,
  },
  {
    id: "pro-106",
    name: "SafeFlow Plumbing",
    category: "Plumbers",
    type: "local",
    district: "Trivandrum",
    rating: 4.9,
    experience: 11,
    language: "Malayalam",
    budget: "premium",
    availability: "instant",
    verified: true,
    responseMinutes: 6,
    badges: ["Verified", "Top Rated", "Trusted Expert"],
    hourlyRate: 850,
    gigStartsFrom: 1200,
    completionRate: 98,
    responseRate: 99,
  },
];

const FEATURED_GIGS = [
  {
    id: "gig-1",
    title: "Logo Design INR 999",
    mode: "gig",
    provider: "PixelCraft Editors",
    packages: ["Basic", "Standard", "Premium"],
    deliveryDays: 2,
    revisions: 2,
  },
  {
    id: "gig-2",
    title: "Build React Website INR 15000",
    mode: "gig",
    provider: "Akhil Dev Studio",
    packages: ["Basic", "Standard", "Premium"],
    deliveryDays: 7,
    revisions: 3,
  },
  {
    id: "gig-3",
    title: "Electrician Home Visit",
    mode: "hourly",
    provider: "QuickFix Electrical Team",
    hourlyRate: 700,
    tracking: true,
    emergency: true,
  },
  {
    id: "gig-4",
    title: "GST Filing Consultation",
    mode: "hourly",
    provider: "Nila Tax Assist",
    hourlyRate: 900,
    tracking: false,
    emergency: true,
  },
];

const VERIFICATION_TYPES = [
  "Mobile OTP",
  "Email verification",
  "Aadhaar/PAN check",
  "GST verification",
  "Selfie verification",
  "Trade license verification",
  "Police verification",
  "Background verification",
];

const SUBSCRIPTION_PLANS = [
  { id: "basic", name: "Basic", price: "Free", note: "Entry-level visibility" },
  { id: "pro", name: "Pro", price: "INR 799/month", note: "More leads and better discovery" },
  {
    id: "premium",
    name: "Premium",
    price: "INR 1999/month",
    note: "Top placement + analytics + priority support",
  },
];

const EMERGENCY_SERVICES = [
  "Emergency electrician",
  "Water leakage support",
  "AC breakdown support",
  "Urgent accountant filing",
];

const AI_ASSISTANT_SUGGESTIONS = [
  "Which professional fits my budget?",
  "Estimate timeline for my work.",
  "Compare top-rated service providers.",
];

const INITIAL_FILTERS = {
  category: "all",
  location: "all",
  rating: "all",
  experience: "all",
  language: "all",
  budget: "all",
  availability: "all",
  serviceType: "all",
  verifiedOnly: false,
  responseSpeed: "all",
};

const INITIAL_BOOKING = {
  professionalId: "",
  serviceMode: "gig",
  bookingMode: "instant",
  schedule: "",
  notes: "",
  emergency: false,
};

const INITIAL_JOB_POST = {
  title: "",
  category: "Developers",
  location: "Trivandrum",
  budget: "",
  requirements: "",
};

const INITIAL_QUOTE = {
  description: "",
  budget: "",
  timelineDays: "",
  location: "Trivandrum",
};

const FreelancerMarketplace = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [bookingForm, setBookingForm] = useState(INITIAL_BOOKING);
  const [bookingStatus, setBookingStatus] = useState("");
  const [bookingHistory, setBookingHistory] = useState([]);
  const [jobForm, setJobForm] = useState(INITIAL_JOB_POST);
  const [jobPosts, setJobPosts] = useState([
    {
      id: "job-1",
      title: "Need React Developer for Ecommerce App",
      category: "Developers",
      budget: "INR 50000",
      location: "Trivandrum",
      bids: 4,
    },
    {
      id: "job-2",
      title: "Urgent AC Technician for Office",
      category: "AC Technicians",
      budget: "INR 3000",
      location: "Kollam",
      bids: 6,
    },
  ]);
  const [quoteForm, setQuoteForm] = useState(INITIAL_QUOTE);
  const [quoteResult, setQuoteResult] = useState(null);

  const categoryOptions = useMemo(
    () => Array.from(new Set([...DIGITAL_CATEGORIES, ...LOCAL_CATEGORIES])),
    []
  );

  const filteredProfessionals = useMemo(() => {
    return PROFESSIONALS.filter((pro) => {
      const matchesText =
        `${pro.name} ${pro.category} ${pro.district} ${pro.badges.join(" ")}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesCategory = filters.category === "all" || pro.category === filters.category;
      const matchesLocation = filters.location === "all" || pro.district === filters.location;
      const matchesRating =
        filters.rating === "all" ||
        (filters.rating === "4.5+" && pro.rating >= 4.5) ||
        (filters.rating === "4.8+" && pro.rating >= 4.8);
      const matchesExperience =
        filters.experience === "all" ||
        (filters.experience === "1-3" && pro.experience >= 1 && pro.experience <= 3) ||
        (filters.experience === "4-7" && pro.experience >= 4 && pro.experience <= 7) ||
        (filters.experience === "8+" && pro.experience >= 8);
      const matchesLanguage = filters.language === "all" || pro.language === filters.language;
      const matchesBudget = filters.budget === "all" || pro.budget === filters.budget;
      const matchesAvailability =
        filters.availability === "all" || pro.availability === filters.availability;
      const matchesType = filters.serviceType === "all" || pro.type === filters.serviceType;
      const matchesVerified = !filters.verifiedOnly || pro.verified;
      const matchesResponse =
        filters.responseSpeed === "all" ||
        (filters.responseSpeed === "under-15" && pro.responseMinutes <= 15) ||
        (filters.responseSpeed === "under-30" && pro.responseMinutes <= 30);

      return (
        matchesText &&
        matchesCategory &&
        matchesLocation &&
        matchesRating &&
        matchesExperience &&
        matchesLanguage &&
        matchesBudget &&
        matchesAvailability &&
        matchesType &&
        matchesVerified &&
        matchesResponse
      );
    });
  }, [filters, searchTerm]);

  const topRatedProfessionals = useMemo(
    () => [...filteredProfessionals].sort((a, b) => b.rating - a.rating).slice(0, 4),
    [filteredProfessionals]
  );

  const handleBookingSubmit = (event) => {
    event.preventDefault();
    const professional = PROFESSIONALS.find((item) => item.id === bookingForm.professionalId);

    if (!professional) {
      setBookingStatus("Select a professional before booking.");
      return;
    }

    const bookingId = `WL-${Date.now().toString().slice(-6)}`;
    const stage = bookingForm.emergency
      ? "Emergency request raised"
      : bookingForm.bookingMode === "instant"
        ? "Technician assigned"
        : "Scheduled for confirmation";

    setBookingHistory((current) => [
      {
        id: bookingId,
        proName: professional.name,
        category: professional.category,
        mode: bookingForm.serviceMode,
        bookingMode: bookingForm.bookingMode,
        stage,
      },
      ...current,
    ]);
    setBookingStatus(`${bookingId} created. ${stage}.`);
    setBookingForm(INITIAL_BOOKING);
  };

  const handleCreateJobPost = (event) => {
    event.preventDefault();
    if (!jobForm.title.trim() || !jobForm.budget.trim()) {
      return;
    }

    const post = {
      id: `job-${Date.now().toString().slice(-5)}`,
      title: jobForm.title.trim(),
      category: jobForm.category,
      budget: jobForm.budget,
      location: jobForm.location,
      bids: 0,
    };

    setJobPosts((current) => [post, ...current]);
    setJobForm(INITIAL_JOB_POST);
  };

  const handleGenerateQuote = (event) => {
    event.preventDefault();
    if (!quoteForm.description.trim()) {
      setQuoteResult({ error: "Describe your requirement to generate an AI estimate." });
      return;
    }

    const budgetValue = Number(quoteForm.budget || 0);
    const timeline = Number(quoteForm.timelineDays || 0);
    const complexityScore = Math.max(1, Math.min(5, Math.ceil(quoteForm.description.length / 40)));
    const estimatedBudget = budgetValue || complexityScore * 5000;
    const estimatedDays = timeline || complexityScore * 3;

    setQuoteResult({
      priceRange: `INR ${Math.max(2000, estimatedBudget - 1500)} - INR ${estimatedBudget + 3000}`,
      timeline: `${Math.max(1, estimatedDays - 1)} to ${estimatedDays + 2} days`,
      skills:
        complexityScore >= 4
          ? ["Project planning", "Technical specialist", "QA review"]
          : ["Core specialist", "Basic QA"],
    });
  };

  return (
    <div className="freelancer-marketplace-page">
      <section className="freelancer-hero">
        <div>
          <p className="freelancer-kicker">NilaWorks</p>
          <h1>Freelancer Marketplace Module</h1>
          <p className="freelancer-subtitle">
            A hybrid of Fiverr + Urban Company with digital freelancers, local service providers,
            instant hiring, and verified professional workflows.
          </p>
          <div className="freelancer-chip-row">
            <span>Digital Freelance Work</span>
            <span>Local Service Booking</span>
            <span>Instant Hiring</span>
            <span>Emergency Mode</span>
          </div>
        </div>
        <div className="freelancer-hero-tools">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search services, professionals, categories..."
          />
          <p className="freelancer-note">
            Built for South Kerala first: Kollam, Trivandrum, Alappuzha, Kottayam, Pathanamthitta.
          </p>
        </div>
      </section>

      <section className="freelancer-compliance-banner">
        Platform disclosure: NilaWorks is a marketplace and assistance platform. Service quality,
        turnaround, and outcomes depend on individual professionals and agreed terms.
      </section>

      <section className="freelancer-section">
        <div className="freelancer-section-header">
          <h2>Core Categories</h2>
          <p>Two strong verticals: remote digital freelancers and nearby local providers.</p>
        </div>
        <div className="freelancer-dual-grid">
          <article className="freelancer-panel">
            <h3>Digital Freelancers</h3>
            <div className="freelancer-tag-row">
              {DIGITAL_CATEGORIES.map((item) => (
                <span key={`digital-${item}`}>{item}</span>
              ))}
            </div>
          </article>
          <article className="freelancer-panel">
            <h3>Local Service Providers</h3>
            <div className="freelancer-tag-row">
              {LOCAL_CATEGORIES.map((item) => (
                <span key={`local-${item}`}>{item}</span>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="freelancer-section">
        <div className="freelancer-section-header">
          <h2>Search and Discovery</h2>
          <p>Filter by category, location, rating, language, budget, availability, and verification.</p>
        </div>
        <div className="freelancer-filter-grid">
          <label>
            Category
            <select
              value={filters.category}
              onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
            >
              <option value="all">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            Location
            <select
              value={filters.location}
              onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))}
            >
              <option value="all">All districts</option>
              {DISTRICTS.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rating
            <select
              value={filters.rating}
              onChange={(event) => setFilters((current) => ({ ...current, rating: event.target.value }))}
            >
              <option value="all">Any rating</option>
              <option value="4.5+">4.5 and above</option>
              <option value="4.8+">4.8 and above</option>
            </select>
          </label>
          <label>
            Experience
            <select
              value={filters.experience}
              onChange={(event) =>
                setFilters((current) => ({ ...current, experience: event.target.value }))
              }
            >
              <option value="all">Any experience</option>
              <option value="1-3">1-3 years</option>
              <option value="4-7">4-7 years</option>
              <option value="8+">8+ years</option>
            </select>
          </label>
          <label>
            Language
            <select
              value={filters.language}
              onChange={(event) => setFilters((current) => ({ ...current, language: event.target.value }))}
            >
              <option value="all">All languages</option>
              {LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>
          <label>
            Budget
            <select
              value={filters.budget}
              onChange={(event) => setFilters((current) => ({ ...current, budget: event.target.value }))}
            >
              <option value="all">All budgets</option>
              <option value="budget">Budget</option>
              <option value="medium">Medium</option>
              <option value="premium">Premium</option>
            </select>
          </label>
          <label>
            Availability
            <select
              value={filters.availability}
              onChange={(event) =>
                setFilters((current) => ({ ...current, availability: event.target.value }))
              }
            >
              <option value="all">All availability</option>
              <option value="online-now">Online now</option>
              <option value="instant">Instant booking</option>
              <option value="schedule">Schedule later</option>
            </select>
          </label>
          <label>
            Service type
            <select
              value={filters.serviceType}
              onChange={(event) =>
                setFilters((current) => ({ ...current, serviceType: event.target.value }))
              }
            >
              <option value="all">All services</option>
              <option value="digital">Digital freelancers</option>
              <option value="local">Local providers</option>
            </select>
          </label>
          <label>
            Response time
            <select
              value={filters.responseSpeed}
              onChange={(event) =>
                setFilters((current) => ({ ...current, responseSpeed: event.target.value }))
              }
            >
              <option value="all">Any response</option>
              <option value="under-15">Under 15 min</option>
              <option value="under-30">Under 30 min</option>
            </select>
          </label>
          <label className="freelancer-checkbox">
            <input
              type="checkbox"
              checked={filters.verifiedOnly}
              onChange={(event) =>
                setFilters((current) => ({ ...current, verifiedOnly: event.target.checked }))
              }
            />
            Verified badge only
          </label>
        </div>

        <div className="freelancer-card-grid">
          {filteredProfessionals.map((pro) => (
            <article key={pro.id} className="freelancer-card">
              <h3>{pro.name}</h3>
              <p>
                <strong>{pro.category}</strong> | {pro.type === "digital" ? "Digital" : "Local"} |{" "}
                {pro.district}
              </p>
              <p>
                Rating {pro.rating} | {pro.experience} years | {pro.language}
              </p>
              <p>
                Hourly INR {pro.hourlyRate} | Gigs from INR {pro.gigStartsFrom}
              </p>
              <p>
                Completion {pro.completionRate}% | Response {pro.responseRate}% | {pro.responseMinutes} min
              </p>
              <div className="freelancer-tag-row">
                {pro.badges.map((badge) => (
                  <span key={`${pro.id}-${badge}`}>{badge}</span>
                ))}
              </div>
              <div className="freelancer-inline-actions">
                <button
                  type="button"
                  onClick={() =>
                    setBookingForm((current) => ({
                      ...current,
                      professionalId: pro.id,
                      bookingMode: pro.availability === "instant" ? "instant" : current.bookingMode,
                    }))
                  }
                >
                  Select for booking
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setBookingStatus(
                      `Open LinkUp chat with ${pro.name} for files, voice notes, and video consultation.`
                    )
                  }
                >
                  Chat in LinkUp
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="freelancer-dual-grid">
        <article className="freelancer-panel">
          <h2>Gig and Hourly Services</h2>
          <div className="freelancer-list-grid">
            {FEATURED_GIGS.map((item) => (
              <div key={item.id} className="freelancer-list-item">
                <strong>{item.title}</strong>
                <p>Provider: {item.provider}</p>
                {item.mode === "gig" ? (
                  <p>
                    Packages: {item.packages.join(", ")} | Delivery: {item.deliveryDays} days |
                    Revisions: {item.revisions}
                  </p>
                ) : (
                  <p>
                    Hourly rate: INR {item.hourlyRate} | Live tracking:{" "}
                    {item.tracking ? "Enabled" : "Not required"} | Emergency:{" "}
                    {item.emergency ? "Available" : "No"}
                  </p>
                )}
              </div>
            ))}
          </div>
        </article>

        <article className="freelancer-panel">
          <h2>Emergency Services</h2>
          <ul className="freelancer-list">
            {EMERGENCY_SERVICES.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
          <p className="freelancer-note">
            Emergency bookings are charged with premium fee rules and prioritized assignment.
          </p>
        </article>
      </section>

      <section className="freelancer-dual-grid">
        <article className="freelancer-panel">
          <h2>Booking System</h2>
          <form className="freelancer-form" onSubmit={handleBookingSubmit}>
            <label>
              Professional
              <select
                value={bookingForm.professionalId}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, professionalId: event.target.value }))
                }
              >
                <option value="">Select professional</option>
                {filteredProfessionals.map((pro) => (
                  <option key={`book-${pro.id}`} value={pro.id}>
                    {pro.name} - {pro.category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Service mode
              <select
                value={bookingForm.serviceMode}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, serviceMode: event.target.value }))
                }
              >
                <option value="gig">Gig based</option>
                <option value="hourly">Hourly booking</option>
              </select>
            </label>
            <label>
              Booking mode
              <select
                value={bookingForm.bookingMode}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, bookingMode: event.target.value }))
                }
              >
                <option value="instant">Instant booking</option>
                <option value="schedule">Schedule later</option>
                <option value="quotation">Request quotation</option>
                <option value="bidding">Multi-provider bidding</option>
              </select>
            </label>
            <label>
              Preferred schedule
              <input
                type="text"
                value={bookingForm.schedule}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, schedule: event.target.value }))
                }
                placeholder="Today 6 PM / Tomorrow morning"
              />
            </label>
            <label>
              Work notes
              <textarea
                value={bookingForm.notes}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, notes: event.target.value }))
                }
                rows={3}
                placeholder="Add service details, files required, address notes..."
              />
            </label>
            <label className="freelancer-checkbox">
              <input
                type="checkbox"
                checked={bookingForm.emergency}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, emergency: event.target.checked }))
                }
              />
              Emergency booking
            </label>
            <button type="submit">Create booking</button>
          </form>
          {bookingStatus ? <p className="freelancer-status">{bookingStatus}</p> : null}
        </article>

        <article className="freelancer-panel">
          <h2>Live Booking Tracking</h2>
          {bookingHistory.length === 0 ? (
            <p className="freelancer-note">No bookings yet. Create one to track technician/provider status.</p>
          ) : (
            <ul className="freelancer-list">
              {bookingHistory.map((item) => (
                <li key={item.id}>
                  <strong>{item.id}</strong> - {item.proName}
                  <br />
                  {item.category} | {item.mode} | {item.bookingMode} | Stage: {item.stage}
                </li>
              ))}
            </ul>
          )}
          <h3>Safety controls</h3>
          <ul className="freelancer-list">
            <li>OTP before work starts</li>
            <li>Live tracking for on-site services</li>
            <li>SOS button and call masking</li>
            <li>Review moderation and fraud checks</li>
          </ul>
        </article>
      </section>

      <section className="freelancer-dual-grid">
        <article className="freelancer-panel">
          <h2>Job Marketplace</h2>
          <form className="freelancer-form" onSubmit={handleCreateJobPost}>
            <label>
              Job title
              <input
                type="text"
                value={jobForm.title}
                onChange={(event) => setJobForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Need React Developer for Ecommerce App"
              />
            </label>
            <label>
              Category
              <select
                value={jobForm.category}
                onChange={(event) =>
                  setJobForm((current) => ({ ...current, category: event.target.value }))
                }
              >
                {categoryOptions.map((category) => (
                  <option key={`job-${category}`} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Budget
              <input
                type="text"
                value={jobForm.budget}
                onChange={(event) => setJobForm((current) => ({ ...current, budget: event.target.value }))}
                placeholder="INR 15000"
              />
            </label>
            <label>
              District
              <select
                value={jobForm.location}
                onChange={(event) => setJobForm((current) => ({ ...current, location: event.target.value }))}
              >
                {DISTRICTS.map((district) => (
                  <option key={`job-location-${district}`} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Requirements
              <textarea
                value={jobForm.requirements}
                onChange={(event) =>
                  setJobForm((current) => ({ ...current, requirements: event.target.value }))
                }
                rows={3}
                placeholder="Share scope, timeline, must-have skills..."
              />
            </label>
            <button type="submit">Post requirement</button>
          </form>
        </article>

        <article className="freelancer-panel">
          <h2>Open Requirements</h2>
          <div className="freelancer-list-grid">
            {jobPosts.map((post) => (
              <div key={post.id} className="freelancer-list-item">
                <strong>{post.title}</strong>
                <p>
                  {post.category} | {post.location}
                </p>
                <p>
                  Budget: {post.budget} | Bids: {post.bids}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="freelancer-dual-grid">
        <article className="freelancer-panel">
          <h2>AI Quote Generator and Matching Engine</h2>
          <form className="freelancer-form" onSubmit={handleGenerateQuote}>
            <label>
              Describe your work
              <textarea
                rows={3}
                value={quoteForm.description}
                onChange={(event) =>
                  setQuoteForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Describe what needs to be built/fixed..."
              />
            </label>
            <label>
              Budget (optional)
              <input
                type="number"
                value={quoteForm.budget}
                onChange={(event) => setQuoteForm((current) => ({ ...current, budget: event.target.value }))}
              />
            </label>
            <label>
              Timeline in days (optional)
              <input
                type="number"
                value={quoteForm.timelineDays}
                onChange={(event) =>
                  setQuoteForm((current) => ({ ...current, timelineDays: event.target.value }))
                }
              />
            </label>
            <label>
              District
              <select
                value={quoteForm.location}
                onChange={(event) =>
                  setQuoteForm((current) => ({ ...current, location: event.target.value }))
                }
              >
                {DISTRICTS.map((district) => (
                  <option key={`quote-${district}`} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">Generate AI estimate</button>
          </form>
          {quoteResult ? (
            <div className="freelancer-result">
              {quoteResult.error ? (
                <p className="freelancer-error">{quoteResult.error}</p>
              ) : (
                <>
                  <p>
                    Estimated price range: <strong>{quoteResult.priceRange}</strong>
                  </p>
                  <p>Estimated timeline: {quoteResult.timeline}</p>
                  <p>Recommended skills: {quoteResult.skills.join(", ")}</p>
                </>
              )}
            </div>
          ) : null}
          <div className="freelancer-tag-row">
            {AI_ASSISTANT_SUGGESTIONS.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </article>

        <article className="freelancer-panel">
          <h2>Verification, Payments, and Safety</h2>
          <h3>Verification system</h3>
          <ul className="freelancer-list">
            {VERIFICATION_TYPES.map((type) => (
              <li key={type}>{type}</li>
            ))}
          </ul>
          <h3>Wallet and payment options</h3>
          <ul className="freelancer-list">
            <li>Escrow payments and milestone releases</li>
            <li>Advance payment + wallet refunds</li>
            <li>UPI, bank transfer, auto invoice, GST invoice</li>
          </ul>
          <h3>Fraud and dispute controls</h3>
          <ul className="freelancer-list">
            <li>AI fraud detection for fake reviews/spam profiles</li>
            <li>Dispute management workflow with proof uploads</li>
            <li>Cancellation protection for providers</li>
          </ul>
        </article>
      </section>

      <section className="freelancer-dual-grid">
        <article className="freelancer-panel">
          <h2>Revenue Model and Plans</h2>
          <ul className="freelancer-list">
            <li>Commission per booking: 5% to 20%</li>
            <li>Featured listing and sponsored professionals</li>
            <li>Lead purchase system for high-intent requirements</li>
            <li>Ads and promotions</li>
          </ul>
          <h3>Subscription plans</h3>
          <div className="freelancer-list-grid">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div key={plan.id} className="freelancer-list-item">
                <strong>{plan.name}</strong>
                <p>{plan.price}</p>
                <p>{plan.note}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="freelancer-panel">
          <h2>Ecosystem Integrations</h2>
          <ul className="freelancer-list">
            <li>Messaging module for chat, file sharing, voice notes, and calls</li>
            <li>Maps module for live tracking and ETA</li>
            <li>Wallet and payments engine for escrow and milestone payout</li>
            <li>AI assistant for matching, quote generation, and smart support</li>
            <li>Business listings and ecommerce seller expansion support</li>
          </ul>
          <h3>Top-rated professionals right now</h3>
          <div className="freelancer-tag-row">
            {topRatedProfessionals.map((pro) => (
              <span key={`top-${pro.id}`}>
                {pro.name} ({pro.rating})
              </span>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
};

export default FreelancerMarketplace;
