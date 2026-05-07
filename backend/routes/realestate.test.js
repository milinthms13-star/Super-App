const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = {
      id: 'test-owner',
      _id: 'test-owner',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
      roles: ['admin'],
    };
    next();
  },
}));

jest.mock('../middleware/rateLimiter', () => ({
  createModerateRateLimiter: () => (_req, _res, next) => next(),
}));

jest.mock('../middleware/redisCache', () => ({
  cacheList: () => (_req, _res, next) => next(),
}));

const mockStore = {
  properties: [],
  nextId: 1,
};

const clone = (value) => JSON.parse(JSON.stringify(value));

jest.mock('../utils/realEstateStore', () => ({
  listRealEstateProperties: jest.fn(async () => clone(mockStore.properties)),
  createRealEstateProperty: jest.fn(async (payload) => {
    const record = {
      id: `property-${mockStore.nextId++}`,
      ...payload,
      leads: [],
      chatPreview: [],
      reviews: [],
      reports: [],
      status: payload.status || 'available',
    };
    mockStore.properties.unshift(record);
    return clone(record);
  }),
  updateRealEstateProperty: jest.fn(async (listingId, payload) => {
    const index = mockStore.properties.findIndex((property) => property.id === listingId);
    if (index === -1) {
      return null;
    }
    mockStore.properties[index] = { ...mockStore.properties[index], ...payload };
    return clone(mockStore.properties[index]);
  }),
  deleteRealEstateProperty: jest.fn(async (listingId) => {
    const index = mockStore.properties.findIndex((property) => property.id === listingId);
    if (index === -1) {
      return null;
    }
    const [removed] = mockStore.properties.splice(index, 1);
    return clone(removed);
  }),
  addRealEstateLead: jest.fn(async (listingId, payload) => {
    const property = mockStore.properties.find((record) => record.id === listingId);
    if (!property) {
      return null;
    }
    property.leads.push({ id: `lead-${property.leads.length + 1}`, ...payload });
    return clone(property);
  }),
  addRealEstateMessage: jest.fn(async (listingId, payload) => {
    const property = mockStore.properties.find((record) => record.id === listingId);
    if (!property) {
      return null;
    }
    property.chatPreview.push({ id: `message-${property.chatPreview.length + 1}`, ...payload });
    return clone(property);
  }),
  addRealEstateReview: jest.fn(async (listingId, payload) => {
    const property = mockStore.properties.find((record) => record.id === listingId);
    if (!property) {
      return null;
    }
    property.reviews.push({
      id: `review-${property.reviews.length + 1}`,
      score: payload.rating || payload.score,
      ...payload,
    });
    return clone(property);
  }),
  addRealEstateReport: jest.fn(async (listingId, payload) => {
    const property = mockStore.properties.find((record) => record.id === listingId);
    if (!property) {
      return null;
    }
    property.reports.push({ id: `report-${property.reports.length + 1}`, ...payload });
    return clone(property);
  }),
  moderateRealEstateProperty: jest.fn(async (listingId, payload) => {
    const property = mockStore.properties.find((record) => record.id === listingId);
    if (!property) {
      return null;
    }
    property.verificationStatus = payload.action;
    return clone(property);
  }),
  findRealEstatePropertyById: jest.fn(async (listingId) =>
    clone(mockStore.properties.find((record) => record.id === listingId) || null)
  ),
}));

const realEstateRouter = require('./realestate');

const app = express();
app.use(express.json());
app.use('/api/realestate', realEstateRouter);

const createTestProperty = async () => {
  const propertyData = {
    title: 'Test Property',
    priceLabel: '50 Lakhs',
    location: 'Kochi',
    type: 'Flat',
    intent: 'sale',
    areaSqft: 1200,
    sellerName: 'Test Seller',
    sellerEmail: 'test@example.com',
    sellerRole: 'Owner',
    ownerId: 'test-owner',
  };

  const response = await request(app).post('/api/realestate').send(propertyData);
  return response.body.data.id;
};

describe('RealEstate API', () => {
  let propertyId;

  beforeAll(async () => {
    mockStore.properties = [];
    mockStore.nextId = 1;
    propertyId = await createTestProperty();
  });

  test('GET /api/realestate - lists properties', async () => {
    const res = await request(app).get('/api/realestate');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/realestate - creates property', async () => {
    const res = await request(app)
      .post('/api/realestate')
      .send({
        title: 'New Property',
        priceLabel: '60 Lakhs',
        location: 'Trivandrum',
        type: 'Villa',
        intent: 'rent',
        areaSqft: 1500,
        sellerName: 'Test Seller',
        sellerEmail: 'test@example.com',
        sellerRole: 'Owner',
        ownerId: 'test-owner',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('New Property');
  });

  test('PATCH /api/realestate/:id - updates property', async () => {
    const res = await request(app)
      .patch(`/api/realestate/${propertyId}`)
      .send({ title: 'Updated Title', priceLabel: '55 Lakhs' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Updated Title');
  });

  test('DELETE /api/realestate/:id - deletes property', async () => {
    const res = await request(app).delete(`/api/realestate/${propertyId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/realestate/:id/enquiries - adds lead', async () => {
    propertyId = await createTestProperty();
    const res = await request(app)
      .post(`/api/realestate/${propertyId}/enquiries`)
      .send({ message: 'Interested in viewing' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/realestate/:id/messages - sends message', async () => {
    propertyId = await createTestProperty();
    const res = await request(app)
      .post(`/api/realestate/${propertyId}/messages`)
      .send({ text: 'Hello seller' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/realestate/:id/reviews - adds review', async () => {
    propertyId = await createTestProperty();
    const res = await request(app)
      .post(`/api/realestate/${propertyId}/reviews`)
      .send({ rating: 5, comment: 'Great property' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/realestate/:id/reports - reports listing', async () => {
    propertyId = await createTestProperty();
    const res = await request(app)
      .post(`/api/realestate/${propertyId}/reports`)
      .send({ reason: 'Suspicious price' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('PATCH /api/realestate/:id/moderation - moderates listing', async () => {
    propertyId = await createTestProperty();
    const res = await request(app)
      .patch(`/api/realestate/${propertyId}/moderation`)
      .send({ action: 'approve' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
