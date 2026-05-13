const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(__dirname, '..', 'data');
const dataFilePath = path.join(dataDir, 'tourism-marketplace.json');

const createId = (prefix) =>
  `${prefix}-${typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now()}`;

const DEFAULT_TOURISM_DATA = {
  packages: [
    {
      id: 'pkg-munnar-honeymoon',
      title: 'Munnar Mist Honeymoon',
      destination: 'Munnar',
      category: 'Honeymoon',
      travelerType: 'Couple',
      durationDays: 3,
      startPrice: 18500,
      rating: 4.8,
      reviewsCount: 124,
      pickupCities: ['Kochi', 'Coimbatore', 'Trivandrum'],
      hotelCategory: '4-star',
      vendorId: 'vendor-highrange',
      vendor: 'HighRange Holidays',
      vendorVerified: true,
      tags: ['Tea Estate Stay', 'Candlelight Dinner', 'Private Cab'],
      inclusions: ['Hotel stay', 'Breakfast and dinner', 'Private cab', 'Sightseeing'],
      exclusions: ['Lunch', 'Personal expenses', 'Entry tickets'],
      cancellationPolicy: 'Free cancellation up to 7 days before start date. 25% fee within 7 days.',
      childPricing: '0-5 yrs free (without extra bed), 6-11 yrs 50% of adult cost',
      gstAndServiceCharge: '5% GST + 2% service charge',
      availableDates: ['2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22'],
      mapHighlights: 'Top Station, Mattupetty Dam, Tea Museum, Blossom Park',
      itinerary: [
        'Day 1: Kochi pickup, check-in, sunset viewpoint',
        'Day 2: Tea museum, Mattupetty dam, romantic dinner',
        'Day 3: Blossom park, shopping, drop',
      ],
      imageGallery: [
        'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=800&fit=crop',
      ],
      seasonalPricing: [
        { season: 'Summer', startDate: '2026-04-01', endDate: '2026-06-30', price: 18500 },
        { season: 'Monsoon', startDate: '2026-07-01', endDate: '2026-09-30', price: 17200 },
      ],
      approvalStatus: 'approved',
      commissionPercent: 8,
      fraudRisk: 'low',
      kycStatus: 'verified',
      createdAt: '2026-05-01T08:00:00.000Z',
      updatedAt: '2026-05-01T08:00:00.000Z',
    },
    {
      id: 'pkg-alleppey-houseboat',
      title: 'Alleppey Premium Houseboat',
      destination: 'Alleppey',
      category: 'Houseboat',
      travelerType: 'Family',
      durationDays: 2,
      startPrice: 14200,
      rating: 4.7,
      reviewsCount: 219,
      pickupCities: ['Kochi', 'Alleppey'],
      hotelCategory: 'luxury',
      vendorId: 'vendor-backwater',
      vendor: 'Nila Backwater Trails',
      vendorVerified: true,
      tags: ['AC Houseboat', 'All Meals', 'Backwater Cruise'],
      inclusions: ['Premium AC houseboat', 'All meals', 'Evening tea snacks', 'Village cruise'],
      exclusions: ['Personal shopping', 'Special boating activities'],
      cancellationPolicy: 'Free cancellation up to 10 days before departure. 30% fee after that.',
      childPricing: '0-4 yrs free, 5-10 yrs 40% of adult cost',
      gstAndServiceCharge: '5% GST + 1.5% service charge',
      availableDates: ['2026-06-03', '2026-06-10', '2026-06-17', '2026-06-24'],
      mapHighlights: 'Punnamada Lake, Kuttanad villages, narrow backwater canals',
      itinerary: [
        'Day 1: Board houseboat, village cruise, dinner on deck',
        'Day 2: Sunrise canal ride, local market, checkout',
      ],
      imageGallery: [
        'https://images.unsplash.com/photo-1589307004395-02c0c4ce3442?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1523419409543-0c1c6f95f3e8?w=1200&h=800&fit=crop',
      ],
      seasonalPricing: [{ season: 'Peak', startDate: '2026-11-01', endDate: '2027-01-31', price: 16800 }],
      approvalStatus: 'approved',
      commissionPercent: 8,
      fraudRisk: 'low',
      kycStatus: 'verified',
      createdAt: '2026-05-01T08:00:00.000Z',
      updatedAt: '2026-05-01T08:00:00.000Z',
    },
  ],
  bookings: [],
  reviews: [
    {
      id: 'review-001',
      packageId: 'pkg-munnar-honeymoon',
      reviewerName: 'Anoop K',
      rating: 5,
      comment: 'Smooth pickup and perfect itinerary pacing.',
      createdAt: '2026-05-05T11:45:00.000Z',
    },
  ],
  vendors: [
    {
      id: 'vendor-highrange',
      name: 'HighRange Holidays',
      email: 'ops@highrange.example',
      phone: '+919876500001',
      kycStatus: 'verified',
      verificationBadge: true,
      approvalStatus: 'approved',
      riskFlag: 'low',
      emergencyContact: '+919876500001',
      insuranceSupport: true,
    },
    {
      id: 'vendor-backwater',
      name: 'Nila Backwater Trails',
      email: 'ops@backwater.example',
      phone: '+919876500002',
      kycStatus: 'verified',
      verificationBadge: true,
      approvalStatus: 'approved',
      riskFlag: 'low',
      emergencyContact: '+919876500002',
      insuranceSupport: true,
    },
    {
      id: 'vendor-pending',
      name: 'BlueHill Travels',
      email: 'owner@bluehill.example',
      phone: '+919876500003',
      kycStatus: 'pending',
      verificationBadge: false,
      approvalStatus: 'pending',
      riskFlag: 'medium',
      emergencyContact: '+919876500003',
      insuranceSupport: false,
    },
  ],
  leads: [
    {
      id: 'lead-4312',
      packageId: 'pkg-munnar-honeymoon',
      vendorId: 'vendor-highrange',
      travelerName: 'Anoop K',
      travelerPhone: '+919999000001',
      budget: 20000,
      status: 'new',
      note: 'Need private pickup from Kochi airport.',
      createdAt: '2026-05-08T09:00:00.000Z',
      updatedAt: '2026-05-08T09:00:00.000Z',
    },
  ],
  coupons: [
    { code: 'KERALA5', description: 'Flat 5% off above INR 15,000', discountPercent: 5, minAmount: 15000 },
    { code: 'HONEYMOON10', description: '10% off honeymoon packages', discountPercent: 10, minAmount: 18000 },
  ],
  complaints: [
    {
      id: 'cmp-001',
      bookingId: '',
      packageId: 'pkg-alleppey-houseboat',
      vendorId: 'vendor-backwater',
      issue: 'Refund delay complaint',
      status: 'open',
      escalationTimeline: [
        { at: '2026-05-09T08:00:00.000Z', event: 'Complaint opened' },
        { at: '2026-05-09T13:30:00.000Z', event: 'Assigned to grievance desk' },
      ],
    },
  ],
};

const ensureDataFile = async () => {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFilePath);
  } catch (error) {
    await fs.writeFile(dataFilePath, JSON.stringify(DEFAULT_TOURISM_DATA, null, 2), 'utf8');
  }
};

const readTourismData = async () => {
  await ensureDataFile();
  const raw = await fs.readFile(dataFilePath, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_TOURISM_DATA,
      ...parsed,
      packages: Array.isArray(parsed.packages) ? parsed.packages : DEFAULT_TOURISM_DATA.packages,
      bookings: Array.isArray(parsed.bookings) ? parsed.bookings : DEFAULT_TOURISM_DATA.bookings,
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : DEFAULT_TOURISM_DATA.reviews,
      vendors: Array.isArray(parsed.vendors) ? parsed.vendors : DEFAULT_TOURISM_DATA.vendors,
      leads: Array.isArray(parsed.leads) ? parsed.leads : DEFAULT_TOURISM_DATA.leads,
      coupons: Array.isArray(parsed.coupons) ? parsed.coupons : DEFAULT_TOURISM_DATA.coupons,
      complaints: Array.isArray(parsed.complaints) ? parsed.complaints : DEFAULT_TOURISM_DATA.complaints,
    };
  } catch (error) {
    return DEFAULT_TOURISM_DATA;
  }
};

const writeTourismData = async (nextData) => {
  await ensureDataFile();
  await fs.writeFile(dataFilePath, JSON.stringify(nextData, null, 2), 'utf8');
  return nextData;
};

const updateTourismData = async (updater) => {
  const currentData = await readTourismData();
  const nextData = await updater(currentData);
  await writeTourismData(nextData);
  return nextData;
};

module.exports = {
  createId,
  readTourismData,
  updateTourismData,
};
