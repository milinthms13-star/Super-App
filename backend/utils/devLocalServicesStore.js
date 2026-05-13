const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const defaultDataFilePath = path.join(__dirname, "..", "data", "localservices.json");

const EVENT_TYPES = ["Wedding", "Birthday", "Housewarming", "Corporate", "Engagement"];

const CITIES = [
  "Trivandrum",
  "Kollam",
  "Kottayam",
  "Kochi",
  "Thrissur",
  "Kozhikode",
  "Kannur",
];

const CATEGORIES = [
  { id: "caterers", name: "Caterers" },
  { id: "decorators", name: "Decorators" },
  { id: "photographers", name: "Photographers" },
  { id: "makeup", name: "Makeup Artists" },
  { id: "sound", name: "Sound and Light" },
];

const seedProviders = [
  {
    id: "lsp-101",
    name: "Nila Sadya Caterers",
    category: "caterers",
    city: "Trivandrum",
    address: "Pattom, Trivandrum",
    serviceAreas: ["Trivandrum", "Kollam"],
    latitude: 8.5241,
    longitude: 76.9366,
    priceStart: 16000,
    priceMax: 250000,
    rating: 4.8,
    reviewsCount: 214,
    responseMinutes: 10,
    verified: true,
    premium: true,
    fastResponse: true,
    phone: "+919876543210",
    whatsappNumber: "919876543210",
    image: "https://images.unsplash.com/photo-1555244162-803834f70033",
    cancellationPolicy: "50% refund if cancelled 7 days before event date.",
    availabilityCalendar: {
      unavailableDates: [],
      nextAvailableDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    },
    packages: [
      { name: "Wedding Silver", price: 16000, details: "Up to 120 guests, Kerala veg menu." },
      { name: "Wedding Gold", price: 32000, details: "Up to 250 guests, veg and non-veg." },
    ],
    portfolio: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
      "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17",
    ],
    customerReviews: [
      { author: "Arun", rating: 5, comment: "Great food and punctual setup." },
      { author: "Meera", rating: 4, comment: "Good value and clean service." },
    ],
  },
  {
    id: "lsp-102",
    name: "Divine Stage Decor",
    category: "decorators",
    city: "Kollam",
    address: "Chinnakada, Kollam",
    serviceAreas: ["Kollam", "Trivandrum"],
    latitude: 8.8932,
    longitude: 76.6141,
    priceStart: 9000,
    priceMax: 120000,
    rating: 4.6,
    reviewsCount: 171,
    responseMinutes: 18,
    verified: true,
    premium: false,
    fastResponse: false,
    phone: "+919812345670",
    whatsappNumber: "919812345670",
    image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed",
    cancellationPolicy: "30% refund if cancelled 5 days before event.",
    availabilityCalendar: {
      unavailableDates: [],
      nextAvailableDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    },
    packages: [{ name: "Stage Classic", price: 9000, details: "Floral and light decor." }],
    portfolio: ["https://images.unsplash.com/photo-1469371670807-013ccf25f16a"],
    customerReviews: [{ author: "Fathima", rating: 5, comment: "Beautiful decor." }],
  },
  {
    id: "lsp-103",
    name: "LensCraft Events",
    category: "photographers",
    city: "Kottayam",
    address: "Nagampadam, Kottayam",
    serviceAreas: ["Kottayam", "Kochi", "Pathanamthitta"],
    latitude: 9.5916,
    longitude: 76.5222,
    priceStart: 12000,
    priceMax: 180000,
    rating: 4.7,
    reviewsCount: 259,
    responseMinutes: 12,
    verified: false,
    premium: false,
    fastResponse: true,
    phone: "+919845678901",
    whatsappNumber: "919845678901",
    image: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486",
    cancellationPolicy: "Booking advance non-refundable within 72 hours.",
    availabilityCalendar: {
      unavailableDates: [],
      nextAvailableDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    },
    packages: [{ name: "Photo and Video", price: 12000, details: "Single day full event coverage." }],
    portfolio: ["https://images.unsplash.com/photo-1511285560929-80b456fea0bc"],
    customerReviews: [{ author: "Nithin", rating: 4, comment: "Good quality album." }],
  },
];

const seedData = {
  categories: CATEGORIES,
  cities: CITIES,
  eventTypes: EVENT_TYPES,
  providers: seedProviders,
  bookings: [],
  quotes: [],
  vendors: [],
};

const getDataFilePath = () => process.env.LOCALSERVICES_DATA_FILE || defaultDataFilePath;

const clone = (value) => JSON.parse(JSON.stringify(value));
const createId = (prefix) => `${prefix}-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;

const ensureFile = async () => {
  const dataFilePath = getDataFilePath();
  await fs.mkdir(path.dirname(dataFilePath), { recursive: true });
  try {
    await fs.access(dataFilePath);
  } catch (error) {
    await fs.writeFile(dataFilePath, JSON.stringify(seedData, null, 2), "utf8");
  }
};

const readState = async () => {
  await ensureFile();
  const raw = await fs.readFile(getDataFilePath(), "utf8");
  try {
    const parsed = JSON.parse(raw);
    return {
      categories: Array.isArray(parsed?.categories) ? parsed.categories : clone(seedData.categories),
      cities: Array.isArray(parsed?.cities) ? parsed.cities : clone(seedData.cities),
      eventTypes: Array.isArray(parsed?.eventTypes) ? parsed.eventTypes : clone(seedData.eventTypes),
      providers: Array.isArray(parsed?.providers) ? parsed.providers : clone(seedData.providers),
      bookings: Array.isArray(parsed?.bookings) ? parsed.bookings : [],
      quotes: Array.isArray(parsed?.quotes) ? parsed.quotes : [],
      vendors: Array.isArray(parsed?.vendors) ? parsed.vendors : [],
    };
  } catch (error) {
    return clone(seedData);
  }
};

const writeState = async (state) => {
  await ensureFile();
  await fs.writeFile(getDataFilePath(), JSON.stringify(state, null, 2), "utf8");
};

const listProviders = async ({
  query = "",
  category = "all",
  location = "all",
  priceMin = "",
  priceMax = "",
  sortBy = "rating",
  latitude = "",
  longitude = "",
} = {}) => {
  const state = await readState();
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const parsedMin = Number(priceMin || 0);
  const parsedMax = Number(priceMax || Number.POSITIVE_INFINITY);
  const hasLocation = latitude !== "" && longitude !== "";
  const lat = Number(latitude);
  const lng = Number(longitude);

  const result = state.providers.filter((provider) => {
    const categoryMatch = category === "all" || provider.category === category;
    const locationMatch = location === "all" || provider.city.toLowerCase() === String(location).toLowerCase();
    const queryMatch =
      !normalizedQuery ||
      `${provider.name} ${provider.city} ${provider.category} ${(provider.serviceAreas || []).join(" ")}`.toLowerCase().includes(normalizedQuery);
    const minMatch = provider.priceStart >= (Number.isFinite(parsedMin) ? parsedMin : 0);
    const maxMatch = provider.priceStart <= (Number.isFinite(parsedMax) ? parsedMax : Number.POSITIVE_INFINITY);
    return categoryMatch && locationMatch && queryMatch && minMatch && maxMatch;
  });

  const withDistance = result.map((provider) => {
    if (!hasLocation || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { ...provider, distanceKm: Number(provider.distanceKm || 0) };
    }

    const latDiff = provider.latitude - lat;
    const lngDiff = provider.longitude - lng;
    const distanceKm = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
    return { ...provider, distanceKm: Math.round(distanceKm * 10) / 10 };
  });

  withDistance.sort((left, right) => {
    if (sortBy === "price") return left.priceStart - right.priceStart;
    if (sortBy === "response") return left.responseMinutes - right.responseMinutes;
    if (sortBy === "verified") return Number(Boolean(right.verified)) - Number(Boolean(left.verified));
    if (sortBy === "nearest") return left.distanceKm - right.distanceKm;
    return right.rating - left.rating;
  });

  return clone(withDistance);
};

const getProviderById = async (providerId) => {
  const state = await readState();
  const provider = state.providers.find((entry) => String(entry.id) === String(providerId));
  return provider ? clone(provider) : null;
};

const createBooking = async (payload) => {
  const state = await readState();
  const bookingId = createId("LSB");
  const booking = {
    id: bookingId,
    bookingCode: bookingId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "Pending vendor response",
    paymentStatus: payload.paymentOption === "full" ? "Pending full payment" : "Pending advance payment",
    refundStatus: "Not requested",
    invoiceNumber: `INV-${Date.now()}`,
    ...payload,
  };
  state.bookings.unshift(booking);
  await writeState(state);
  return clone(booking);
};

const createQuoteRequest = async (payload) => {
  const state = await readState();
  const quoteId = createId("LSQ");
  const quote = {
    id: quoteId,
    quoteCode: quoteId,
    createdAt: new Date().toISOString(),
    status: "Quote in progress",
    ...payload,
  };
  state.quotes.unshift(quote);
  await writeState(state);
  return clone(quote);
};

const createVendor = async (payload) => {
  const state = await readState();
  const vendorId = createId("LSV");
  const vendor = {
    id: vendorId,
    vendorCode: vendorId,
    createdAt: new Date().toISOString(),
    approvalStatus: "pending",
    featured: false,
    commissionPercent: 12,
    leadCredits: 0,
    ...payload,
  };
  state.vendors.unshift(vendor);
  await writeState(state);
  return clone(vendor);
};

const listTrackingByPhone = async (phone) => {
  const state = await readState();
  const normalizedPhone = String(phone || "").trim();
  const bookings = state.bookings.filter((entry) => String(entry.customerPhone || "").trim() === normalizedPhone);
  const quotes = state.quotes.filter((entry) => String(entry.customerPhone || "").trim() === normalizedPhone);
  return clone([
    ...bookings.map((entry) => ({
      id: entry.id,
      type: "Booking request",
      target: entry.providerName,
      status: entry.status,
      createdAt: entry.createdAt,
      amount: entry.payment?.totalAmount || 0,
    })),
    ...quotes.map((entry) => ({
      id: entry.id,
      type: "Quote request",
      target: entry.providerName,
      status: entry.status,
      createdAt: entry.createdAt,
      amount: 0,
    })),
  ].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
};

const listVendorDashboard = async (vendorPhone) => {
  const state = await readState();
  const normalizedPhone = String(vendorPhone || "").trim();
  const vendor = state.vendors.find((entry) => String(entry.phone || "").trim() === normalizedPhone);
  if (!vendor) {
    return null;
  }

  const leadEntries = state.bookings.filter((entry) => String(entry.providerId || "") === String(vendor.providerId || ""));
  const totalRevenue = leadEntries.reduce((sum, entry) => sum + Number(entry?.payment?.totalAmount || 0), 0);
  const commissionPercent = Number(vendor.commissionPercent || 12);
  const commissionDue = (totalRevenue * commissionPercent) / 100;

  return clone({
    vendor,
    leadEntries: leadEntries.slice(0, 15),
    stats: {
      totalLeads: leadEntries.length,
      activeLeads: leadEntries.filter((entry) => entry.status !== "Completed" && entry.status !== "Cancelled").length,
      totalRevenue,
      commissionDue,
    },
  });
};

const upsertVendorAdminStatus = async (vendorId, updates = {}) => {
  const state = await readState();
  const index = state.vendors.findIndex((entry) => String(entry.id) === String(vendorId));
  if (index === -1) {
    return null;
  }
  state.vendors[index] = {
    ...state.vendors[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await writeState(state);
  return clone(state.vendors[index]);
};

module.exports = {
  listProviders,
  getProviderById,
  createBooking,
  createQuoteRequest,
  createVendor,
  listTrackingByPhone,
  listVendorDashboard,
  upsertVendorAdminStatus,
  readState,
  EVENT_TYPES,
  CITIES,
  CATEGORIES,
};
