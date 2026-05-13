export const CATEGORY_GROUPS = [
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

export const CITIES = [
  "Trivandrum",
  "Kollam",
  "Kottayam",
  "Kochi",
  "Thrissur",
  "Kozhikode",
  "Kannur",
];

export const EVENT_TYPES = ["Wedding", "Birthday", "Housewarming", "Corporate", "Engagement"];

export const SORT_OPTIONS = [
  { id: "rating", label: "Rating" },
  { id: "price", label: "Price low to high" },
  { id: "response", label: "Fastest response" },
  { id: "verified", label: "Verified first" },
  { id: "nearest", label: "Nearest location" },
];

export const COMPLETE_PACKAGE_ITEMS = [
  "Caterer",
  "Decorator",
  "Photographer",
  "Makeup artist",
  "Event anchor",
  "Sound/light system",
  "Stage setup",
  "Vehicle rental",
];

export const INITIAL_SEARCH = {
  query: "",
  category: "all",
  location: "all",
  priceMin: "",
  priceMax: "",
  sortBy: "rating",
};

export const INITIAL_VENDOR_FORM = {
  businessName: "",
  category: "caterers",
  city: "Trivandrum",
  phone: "",
  whatsappNumber: "",
  packageName: "",
  packagePrice: "",
  portfolioItems: "0",
  verificationDone: false,
  serviceAreas: [],
};

export const INITIAL_BOOKING = {
  providerId: "",
  eventType: "Wedding",
  eventDate: "",
  guests: "100",
  budget: "",
  notes: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  paymentOption: "advance",
};

export const INITIAL_PACKAGE_FORM = {
  eventType: "Wedding",
  eventDate: "",
  items: COMPLETE_PACKAGE_ITEMS.reduce((acc, item) => ({ ...acc, [item]: true }), {}),
  budget: "",
  customerPhone: "",
};

export const FALLBACK_PROVIDERS = [
  {
    id: "ls-1",
    name: "Nila Sadya Caterers",
    category: "caterers",
    city: "Trivandrum",
    address: "Pattom, Trivandrum",
    serviceAreas: ["Trivandrum", "Kollam"],
    phone: "+919876543210",
    whatsappNumber: "919876543210",
    priceStart: 16000,
    priceMax: 250000,
    rating: 4.8,
    reviewsCount: 214,
    responseMinutes: 10,
    verified: true,
    premium: true,
    fastResponse: true,
    image: "https://images.unsplash.com/photo-1555244162-803834f70033",
    cancellationPolicy: "50% refund if cancelled 7 days before event date.",
    packages: [{ name: "Wedding Silver", price: 16000, details: "Up to 120 guests." }],
    customerReviews: [{ author: "Arun", rating: 5, comment: "Great service." }],
    portfolio: ["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4"],
    availabilityCalendar: { unavailableDates: [], nextAvailableDate: "" },
  },
];

export const toLocalServiceRequestHistory = (entries = []) =>
  entries.map((entry) => ({
    id: entry.id,
    type: entry.type || "Request",
    target: entry.target || "",
    status: entry.status || "",
    createdAt: entry.createdAt || new Date().toISOString(),
    amount: Number(entry.amount || 0),
  }));
