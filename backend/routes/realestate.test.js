const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');

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

  const response = await request(app)
    .post('/api/realestate')
    .send(propertyData)
    .set('Authorization', 'Bearer valid-token');

  return response.body.data.id;
};

describe('RealEstate API', () => {
  let propertyId;

  beforeAll(async () => {
    await mongoose.connection.dropDatabase();
    propertyId = await createTestProperty();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('GET /api/realestate - lists properties', async () => {
    const res = await request(app)
      .get('/api/realestate')
      .set('Authorization', 'Bearer valid-token');

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
      })
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('New Property');
  });

  test('PATCH /api/realestate/:id - updates property', async () => {
    const res = await request(app)
      .patch(`/api/realestate/${propertyId}`)
      .send({ title: 'Updated Title', priceLabel: '55 Lakhs' })
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Updated Title');
  });

  test('DELETE /api/realestate/:id - deletes property', async () => {
    const res = await request(app)
      .delete(`/api/realestate/${propertyId}`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/realestate/:id/enquiries - adds lead', async () => {
    propertyId = await createTestProperty();
    const res = await request(app)
      .post(`/api/realestate/${propertyId}/enquiries`)
      .send({ message: 'Interested in viewing' })
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/realestate/:id/messages - sends message', async () => {
    propertyId = await createTestProperty();
    const res = await request(app)
      .post(`/api/realestate/${propertyId}/messages`)
      .send({ text: 'Hello seller' })
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/realestate/:id/reviews - adds review', async () => {
    propertyId = await createTestProperty();
    const res = await request(app)
      .post(`/api/realestate/${propertyId}/reviews`)
      .send({ rating: 5, comment: 'Great property' })
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/realestate/:id/reports - reports listing', async () => {
    propertyId = await createTestProperty();
    const res = await request(app)
      .post(`/api/realestate/${propertyId}/reports`)
      .send({ reason: 'Suspicious price' })
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('PATCH /api/realestate/:id/moderation - moderates listing', async () => {
    propertyId = await createTestProperty();
    const res = await request(app)
      .patch(`/api/realestate/${propertyId}/moderation`)
      .send({ action: 'approve' })
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
