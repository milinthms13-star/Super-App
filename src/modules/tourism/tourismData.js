export const PACKAGE_CATEGORIES = [
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

export const TRAVELER_TYPES = ["Any", "Couple", "Family", "Group", "Solo", "Student", "NRI"];

export const HOTEL_CATEGORIES = ["budget", "3-star", "4-star", "luxury"];

export const PICKUP_CITIES = ["Kochi", "Trivandrum", "Calicut", "Coimbatore", "Bengaluru", "Chennai"];

export const BOOKING_STATUS_OPTIONS = ["pending", "confirmed", "paid", "cancelled"];
export const PAYMENT_OPTIONS = [
  { id: "advance", label: "Advance (30%)" },
  { id: "full", label: "Full Payment (100%)" },
];

export const LEAD_STATUS_OPTIONS = [
  "new",
  "contacted",
  "proposal_shared",
  "negotiation",
  "confirmed",
  "lost",
];

export const KERALA_DESTINATIONS = [
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

export const OFFICIAL_LINKS = [
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

export const FALLBACK_PACKAGES = [
  {
    id: "pkg-munnar-honeymoon",
    title: "Munnar Mist Honeymoon",
    destination: "Munnar",
    category: "Honeymoon",
    travelerType: "Couple",
    durationDays: 3,
    startPrice: 18500,
    rating: 4.8,
    reviewsCount: 124,
    tags: ["Tea Estate Stay", "Candlelight Dinner", "Private Cab"],
    vendorId: "vendor-highrange",
    vendor: "HighRange Holidays",
    vendorVerified: true,
    pickupCities: ["Kochi", "Coimbatore"],
    hotelCategory: "4-star",
    inclusions: ["Hotel stay", "Breakfast and dinner", "Private cab", "Sightseeing"],
    exclusions: ["Lunch", "Personal expenses", "Entry tickets"],
    cancellationPolicy: "Free cancellation up to 7 days before start date. 25% fee within 7 days.",
    childPricing: "0-5 yrs free, 6-11 yrs 50% of adult cost",
    gstAndServiceCharge: "5% GST + 2% service charge",
    availableDates: ["2026-06-01", "2026-06-08", "2026-06-15"],
    mapHighlights: "Top Station, Mattupetty Dam, Tea Museum, Blossom Park",
    itinerary: [
      "Day 1: Kochi pickup, check-in, sunset viewpoint",
      "Day 2: Tea museum, Mattupetty dam, romantic dinner",
      "Day 3: Blossom park, shopping, drop",
    ],
    imageGallery: [
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=800&fit=crop",
    ],
    availability: "Available this week",
    approvalStatus: "approved",
    fraudRisk: "low",
    kycStatus: "verified",
    emergencyContact: "+91 9876500001",
    insuranceSupport: true,
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
    reviewsCount: 219,
    tags: ["AC Houseboat", "All Meals", "Backwater Cruise"],
    vendorId: "vendor-backwater",
    vendor: "Nila Backwater Trails",
    vendorVerified: true,
    pickupCities: ["Kochi", "Alleppey"],
    hotelCategory: "luxury",
    inclusions: ["Premium AC houseboat", "All meals", "Village cruise"],
    exclusions: ["Personal shopping", "Special boating activities"],
    cancellationPolicy: "Free cancellation up to 10 days before departure. 30% fee after that.",
    childPricing: "0-4 yrs free, 5-10 yrs 40% of adult cost",
    gstAndServiceCharge: "5% GST + 1.5% service charge",
    availableDates: ["2026-06-03", "2026-06-10", "2026-06-17"],
    mapHighlights: "Punnamada Lake, Kuttanad villages",
    itinerary: [
      "Day 1: Board houseboat, village cruise, dinner on deck",
      "Day 2: Sunrise canal ride, local market, checkout",
    ],
    imageGallery: [
      "https://images.unsplash.com/photo-1589307004395-02c0c4ce3442?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1523419409543-0c1c6f95f3e8?w=1200&h=800&fit=crop",
    ],
    availability: "Limited slots",
    approvalStatus: "approved",
    fraudRisk: "low",
    kycStatus: "verified",
    emergencyContact: "+91 9876500002",
    insuranceSupport: true,
  },
];

export const FALLBACK_VENDOR_PIPELINE = [
  { id: "lead-4312", packageTitle: "Munnar Mist Honeymoon", travelerName: "Anoop K", budget: 20000, status: "new" },
  {
    id: "lead-4313",
    packageTitle: "Kerala Local Experience Hub",
    travelerName: "Nora M",
    budget: 12000,
    status: "negotiation",
  },
];

export const FALLBACK_ADMIN_REVIEW_ITEMS = [
  { id: "vendor-pending", vendor: "BlueHill Travels", kycStatus: "pending", packageTitle: "Wayanad Nature Trek", risk: "medium" },
];

export const FALLBACK_COUPONS = [
  { code: "KERALA5", description: "Flat 5% off above INR 15,000", discountPercent: 5, minAmount: 15000 },
  { code: "HONEYMOON10", description: "10% off honeymoon packages", discountPercent: 10, minAmount: 18000 },
];

export const formatInr = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

