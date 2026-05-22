const crypto = require('crypto');
const LocalServiceProvider = require('../models/LocalServiceProvider');
const LocalServiceBooking = require('../models/LocalServiceBooking');
const LocalServiceQuote = require('../models/LocalServiceQuote');
const LocalServiceVendorApplication = require('../models/LocalServiceVendorApplication');
const LocalServicePackageRequest = require('../models/LocalServicePackageRequest');

const EVENT_TYPES = ['Wedding', 'Birthday', 'Housewarming', 'Corporate', 'Engagement'];
const CITIES = ['Trivandrum', 'Kollam', 'Kottayam', 'Kochi', 'Thrissur', 'Kozhikode', 'Kannur'];
const CATEGORIES = [
  { id: 'caterers', name: 'Caterers' },
  { id: 'decorators', name: 'Decorators' },
  { id: 'photographers', name: 'Photographers' },
  { id: 'makeup', name: 'Makeup Artists' },
  { id: 'sound', name: 'Sound and Light' },
];
const SORT_OPTIONS = [
  { id: 'rating', label: 'Rating' },
  { id: 'price', label: 'Price low to high' },
  { id: 'response', label: 'Fastest response' },
  { id: 'verified', label: 'Verified first' },
  { id: 'nearest', label: 'Nearest location' },
];

const createCode = (prefix) => `${prefix}-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

const normalizeTextQuery = (value) => String(value || '').trim();

const computeDistanceKm = (provider, lat, lng) => {
  if (typeof provider.latitude !== 'number' || typeof provider.longitude !== 'number') {
    return 0;
  }
  const latDiff = provider.latitude - lat;
  const lngDiff = provider.longitude - lng;
  const distanceKm = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
  return Math.round(distanceKm * 10) / 10;
};

const getMeta = async () => ({ categories: CATEGORIES, cities: CITIES, eventTypes: EVENT_TYPES, sortOptions: SORT_OPTIONS });

const listProviders = async ({ query = '', category = 'all', location = 'all', priceMin = '', priceMax = '', sortBy = 'rating', latitude = '', longitude = '' } = {}) => {
  const filters = { isActive: true };
  const normalizedQuery = normalizeTextQuery(query);
  const parsedMin = Number(priceMin || 0);
  const parsedMax = Number(priceMax || Number.POSITIVE_INFINITY);

  if (category && category !== 'all') {
    filters.category = category;
  }
  if (location && location !== 'all') {
    filters.city = location;
  }
  if (Number.isFinite(parsedMin) && parsedMin > 0) {
    filters.priceStart = { $gte: parsedMin };
  }
  if (Number.isFinite(parsedMax) && parsedMax < Number.POSITIVE_INFINITY) {
    filters.priceStart = { ...filters.priceStart, $lte: parsedMax };
  }

  let providerQuery = LocalServiceProvider.find(filters);

  if (normalizedQuery) {
    const regex = new RegExp(normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    providerQuery = LocalServiceProvider.find({
      ...filters,
      $or: [
        { name: regex },
        { category: regex },
        { city: regex },
        { address: regex },
        { serviceAreas: regex },
      ],
    });
  }

  const providers = await providerQuery.lean().exec();

  const hasLocation = latitude !== '' && longitude !== '' && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const lat = Number(latitude);
  const lng = Number(longitude);

  const providersWithDistance = providers.map((provider) => ({
    ...provider,
    distanceKm: hasLocation ? computeDistanceKm(provider, lat, lng) : Number(provider.distanceKm || 0),
  }));

  providersWithDistance.sort((left, right) => {
    if (sortBy === 'price') return left.priceStart - right.priceStart;
    if (sortBy === 'response') return left.responseMinutes - right.responseMinutes;
    if (sortBy === 'verified') return Number(Boolean(right.verified)) - Number(Boolean(left.verified));
    if (sortBy === 'nearest') return (left.distanceKm || 0) - (right.distanceKm || 0);
    return (right.rating || 0) - (left.rating || 0);
  });

  return providersWithDistance;
};

const getProviderById = async (providerId) => {
  if (!providerId) return null;
  const provider = await LocalServiceProvider.findOne({ providerCode: providerId.toString().trim().toUpperCase(), isActive: true }).lean().exec();
  return provider || null;
};

const createBooking = async (payload) => {
  const provider = await LocalServiceProvider.findOne({ providerCode: payload.providerId }).exec();
  if (!provider) {
    throw new Error('Provider not found');
  }

  const bookingCode = createCode('LSB');
  const totalAmount = Number(payload.budget || 0);
  const advanceAmount = payload.paymentOption === 'advance' ? Math.max(1000, Math.round(totalAmount * 0.2)) : payload.paymentOption === 'full' ? totalAmount : 0;

  const booking = new LocalServiceBooking({
    bookingCode,
    providerId: provider.providerCode,
    providerName: provider.name,
    providerCategory: provider.category,
    providerPhone: provider.phone || '',
    providerWhatsapp: provider.whatsappNumber || '',
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    customerEmail: payload.customerEmail || '',
    eventType: payload.eventType,
    eventDate: payload.eventDate,
    guests: payload.guests,
    budget: payload.budget,
    notes: payload.notes || '',
    paymentOption: payload.paymentOption,
    payment: {
      totalAmount,
      paymentOption: payload.paymentOption,
      advanceAmount,
      amountDue: Math.max(0, totalAmount - advanceAmount),
    },
    status: 'Pending vendor response',
    paymentStatus: payload.paymentOption === 'full' ? 'Pending full payment' : payload.paymentOption === 'advance' ? 'Pending advance payment' : 'Quote requested',
    refundStatus: 'Not requested',
    invoiceNumber: `INV-${Date.now()}`,
  });

  await booking.save();
  return booking.toObject();
};

const createQuoteRequest = async (payload) => {
  const provider = await LocalServiceProvider.findOne({ providerCode: payload.providerId }).exec();
  if (!provider) {
    throw new Error('Provider not found');
  }

  const quoteCode = createCode('LSQ');
  const quote = new LocalServiceQuote({
    quoteCode,
    providerId: provider.providerCode,
    providerName: provider.name,
    providerCategory: provider.category,
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    customerEmail: payload.customerEmail || '',
    eventType: payload.eventType,
    eventDate: payload.eventDate,
    guests: payload.guests,
    budget: payload.budget,
    notes: payload.notes || '',
  });

  await quote.save();
  return quote.toObject();
};

const createVendor = async (payload) => {
  const vendorCode = createCode('LSV');
  const vendor = new LocalServiceVendorApplication({
    vendorCode,
    businessName: payload.businessName,
    category: payload.category,
    city: payload.city,
    phone: payload.phone,
    whatsappNumber: payload.whatsappNumber || '',
    packageName: payload.packageName,
    packagePrice: payload.packagePrice,
    portfolioItems: payload.portfolioItems || 0,
    verificationDone: payload.verificationDone || false,
    serviceAreas: Array.isArray(payload.serviceAreas) ? payload.serviceAreas : [],
    approvalStatus: 'pending',
    featured: false,
    commissionPercent: 12,
    moderationNote: '',
    createdByUserId: String(payload.createdByUserId || '').trim(),
  });

  await vendor.save();
  return vendor.toObject();
};

const listVendorApplications = async ({ status = 'all' } = {}) => {
  const filters = {};
  if (status && status !== 'all') {
    filters.approvalStatus = status;
  }
  return LocalServiceVendorApplication.find(filters).sort({ createdAt: -1 }).lean().exec();
};

const createPackageRequest = async (payload) => {
  const packageCode = createCode('LSPKG');
  const request = new LocalServicePackageRequest({
    packageCode,
    eventType: payload.eventType,
    eventDate: payload.eventDate,
    items: Array.isArray(payload.items) ? payload.items : [],
    budget: payload.budget,
    customerPhone: payload.customerPhone,
    notes: payload.notes || '',
    status: 'Coordinator assigned',
    assignedCoordinator: payload.assignedCoordinator || '',
  });
  await request.save();
  return request.toObject();
};

const listTrackingByPhone = async (phone) => {
  const normalizedPhone = String(phone || '').trim();
  const [bookings, quotes, packages] = await Promise.all([
    LocalServiceBooking.find({ customerPhone: normalizedPhone }).lean().exec(),
    LocalServiceQuote.find({ customerPhone: normalizedPhone }).lean().exec(),
    LocalServicePackageRequest.find({ customerPhone: normalizedPhone }).lean().exec(),
  ]);

  const history = [
    ...bookings.map((entry) => ({
      id: entry.bookingCode,
      type: 'Booking request',
      target: entry.providerName,
      status: entry.status,
      createdAt: entry.createdAt,
      amount: Number(entry.payment?.totalAmount || 0),
    })),
    ...quotes.map((entry) => ({
      id: entry.quoteCode,
      type: 'Quote request',
      target: entry.providerName,
      status: entry.status,
      createdAt: entry.createdAt,
      amount: 0,
    })),
    ...packages.map((entry) => ({
      id: entry.packageCode,
      type: 'Complete package',
      target: `${entry.eventType} bundle`,
      status: entry.status,
      createdAt: entry.createdAt,
      amount: Number(entry.budget || 0),
    })),
  ];

  return history.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
};

const listVendorDashboard = async (vendorPhone) => {
  const normalizedPhone = String(vendorPhone || '').trim();
  const vendor = await LocalServiceVendorApplication.findOne({ phone: normalizedPhone }).lean().exec();
  if (!vendor) {
    return null;
  }

  const providers = await LocalServiceProvider.find({
    $or: [{ sourceVendorCode: vendor.vendorCode }, { phone: vendor.phone }],
  })
    .lean()
    .exec();

  const providerCodes = providers.map((provider) => provider.providerCode);
  const leadEntries = await LocalServiceBooking.find({ providerId: { $in: providerCodes } })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()
    .exec();

  const totalRevenue = leadEntries.reduce((sum, entry) => sum + Number(entry.payment?.totalAmount || 0), 0);
  const commissionPercent = Number(vendor.commissionPercent || 12);

  return {
    vendor,
    leadEntries,
    stats: {
      totalLeads: leadEntries.length,
      activeLeads: leadEntries.filter((entry) => !['Completed', 'Cancelled'].includes(entry.status)).length,
      totalRevenue,
      commissionDue: Math.round((totalRevenue * commissionPercent) / 100),
    },
  };
};

const findProviderBySourceVendorCode = async (vendorCode) => {
  return LocalServiceProvider.findOne({ sourceVendorCode: vendorCode }).exec();
};

const createProviderFromVendor = async (vendor) => {
  const existingProvider = await findProviderBySourceVendorCode(vendor.vendorCode);
  if (existingProvider) {
    return existingProvider;
  }

  const providerCode = createCode('LSPRV');
  const provider = new LocalServiceProvider({
    providerCode,
    name: vendor.businessName,
    category: vendor.category,
    city: vendor.city,
    address: `${vendor.city} service area`,
    serviceAreas: vendor.serviceAreas.length ? vendor.serviceAreas : [vendor.city],
    priceStart: Number(vendor.packagePrice || 0),
    priceMax: Number(vendor.packagePrice || 0) * 3 || 10000,
    rating: 4.2,
    reviewsCount: 0,
    responseMinutes: 30,
    verified: vendor.verificationDone,
    premium: false,
    fastResponse: true,
    phone: vendor.phone,
    whatsappNumber: vendor.whatsappNumber,
    image: '',
    cancellationPolicy: 'Standard cancellation policy applies.',
    availabilityCalendar: { unavailableDates: [], nextAvailableDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) },
    packages: [{ name: vendor.packageName, price: vendor.packagePrice, details: 'Vendor-provided package.' }],
    portfolio: Array(vendor.portfolioItems || 0).fill(''),
    customerReviews: [],
    sourceVendorCode: vendor.vendorCode,
    featured: vendor.featured,
    isActive: vendor.approvalStatus === 'approved',
  });

  await provider.save();
  return provider;
};

const upsertVendorAdminStatus = async (vendorId, updates = {}) => {
  const vendor = await LocalServiceVendorApplication.findOne({ vendorCode: vendorId.toString().trim().toUpperCase() }).exec();
  if (!vendor) {
    return null;
  }

  const applyUpdates = {
    approvalStatus: updates.approvalStatus || vendor.approvalStatus,
    featured: typeof updates.featured === 'boolean' ? updates.featured : vendor.featured,
    commissionPercent: Number.isFinite(Number(updates.commissionPercent)) ? Number(updates.commissionPercent) : vendor.commissionPercent,
    moderationNote: String(updates.moderationNote || vendor.moderationNote).trim(),
  };

  vendor.approvalStatus = applyUpdates.approvalStatus;
  vendor.featured = applyUpdates.featured;
  vendor.commissionPercent = applyUpdates.commissionPercent;
  vendor.moderationNote = applyUpdates.moderationNote;
  vendor.updatedAt = new Date();

  if (applyUpdates.approvalStatus === 'approved' && !vendor.sourceProviderCode) {
    const provider = await createProviderFromVendor(vendor);
    if (provider) {
      vendor.sourceProviderCode = provider.sourceVendorCode || provider.providerCode;
    }
  }
  if (applyUpdates.approvalStatus === 'approved' && !vendor.approvedAt) {
    vendor.approvedAt = new Date();
  }

  await vendor.save();
  return vendor.toObject();
};

module.exports = {
  EVENT_TYPES,
  CATEGORIES,
  CITIES,
  SORT_OPTIONS,
  getMeta,
  listProviders,
  getProviderById,
  createBooking,
  createQuoteRequest,
  createVendor,
  createPackageRequest,
  listTrackingByPhone,
  listVendorDashboard,
  listVendorApplications,
  upsertVendorAdminStatus,
};
