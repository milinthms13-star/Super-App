const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

jest.mock('../services/BusinessServiceNotificationService', () => ({
  notifyOrderCreated: jest.fn().mockResolvedValue({}),
  notifyOrderStatusChanged: jest.fn().mockResolvedValue({}),
  notifyPaymentReceived: jest.fn().mockResolvedValue({}),
  notifyConsultantAssignment: jest.fn().mockResolvedValue({}),
  notifyDeliverablesUploaded: jest.fn().mockResolvedValue({}),
  notifyInvoiceGenerated: jest.fn().mockResolvedValue({}),
  notifyInteractionCreated: jest.fn().mockResolvedValue({}),
}));

const businessServicesRouter = require('../routes/businessServices');
const BusinessServiceOrder = require('../models/BusinessServiceOrder');
const BusinessServiceInteraction = require('../models/BusinessServiceInteraction');

const makeToken = ({ sub, email, name }) =>
  jwt.sign(
    {
      sub,
      email,
      name,
    },
    'test-secret'
  );

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/business-services', businessServicesRouter);
  return app;
};

const buildOrderPayload = (overrides = {}) => ({
  customerEmail: 'customer@example.com',
  customerName: 'Customer One',
  categoryId: 'business-registration',
  categoryName: 'Business Registration',
  serviceId: 'llp-registration',
  serviceName: 'LLP Registration',
  pricing: {
    priceText: '₹5000',
    priceNumber: 5000,
    durationText: '5 days',
  },
  status: 'processing',
  paymentStatus: 'paid',
  formData: {
    businessName: 'Acme Ventures',
  },
  documents: [],
  deliverables: [
    {
      fileId: 'file-deliverable-1',
      name: 'Draft Incorporation Packet.pdf',
      contentType: 'application/pdf',
      size: 1024,
      url: '/api/files/private/file-deliverable-1',
      uploadedBy: 'consultant@example.com',
      status: 'pending-review',
    },
  ],
  history: [
    {
      status: 'processing',
      changedBy: 'consultant@example.com',
      note: 'Deliverables uploaded for review.',
    },
  ],
  ...overrides,
});

describe('BusinessServices completion approval endpoint', () => {
  let app;

  beforeAll(async () => {
    app = createTestApp();
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  });

  afterEach(async () => {
    await BusinessServiceOrder.deleteMany({});
    await BusinessServiceInteraction.deleteMany({});
  });

  test('approves completion for paid customer orders and marks deliverables approved', async () => {
    const order = await BusinessServiceOrder.create(buildOrderPayload());
    const token = makeToken({
      sub: 'customer-user-1',
      email: 'customer@example.com',
      name: 'Customer One',
    });

    const response = await request(app)
      .post(`/api/business-services/orders/${order._id}/completion-approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ note: 'Everything delivered as expected.' });

    expect(response.status).toBe(200);
    expect(response.body?.success).toBe(true);
    expect(response.body?.data?.order?.status).toBe('completed');
    expect(response.body?.data?.order?.approvalStatus).toBe('approved');
    expect(response.body?.data?.order?.approvedBy).toBe('customer@example.com');
    expect(response.body?.data?.order?.deliverables?.every((item) => item.status === 'approved')).toBe(true);
  });

  test('rejects completion approval when payment is not paid', async () => {
    const order = await BusinessServiceOrder.create(
      buildOrderPayload({
        paymentStatus: 'pending',
      })
    );
    const token = makeToken({
      sub: 'customer-user-1',
      email: 'customer@example.com',
      name: 'Customer One',
    });

    const response = await request(app)
      .post(`/api/business-services/orders/${order._id}/completion-approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ note: 'Please complete this.' });

    expect(response.status).toBe(400);
    expect(response.body?.success).toBe(false);
    expect(String(response.body?.message || '').toLowerCase()).toContain('complete payment');
  });

  test('rejects completion approval when a deliverable is rejected', async () => {
    const order = await BusinessServiceOrder.create(
      buildOrderPayload({
        deliverables: [
          {
            fileId: 'file-deliverable-1',
            name: 'Incorporation Packet.pdf',
            contentType: 'application/pdf',
            size: 1024,
            url: '/api/files/private/file-deliverable-1',
            uploadedBy: 'consultant@example.com',
            status: 'rejected',
          },
        ],
      })
    );
    const token = makeToken({
      sub: 'customer-user-1',
      email: 'customer@example.com',
      name: 'Customer One',
    });

    const response = await request(app)
      .post(`/api/business-services/orders/${order._id}/completion-approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ note: 'Trying to approve.' });

    expect(response.status).toBe(400);
    expect(response.body?.success).toBe(false);
    expect(String(response.body?.message || '').toLowerCase()).toContain('rejected deliverables');
  });

  test('rejects completion approval for non-owner non-admin user', async () => {
    const order = await BusinessServiceOrder.create(buildOrderPayload());
    const token = makeToken({
      sub: 'different-user-1',
      email: 'intruder@example.com',
      name: 'Intruder',
    });

    const response = await request(app)
      .post(`/api/business-services/orders/${order._id}/completion-approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ note: 'Approve as outsider.' });

    expect(response.status).toBe(403);
    expect(response.body?.success).toBe(false);
    expect(String(response.body?.message || '').toLowerCase()).toContain('only customer/admin');
  });

  test('schedules call for an interaction and updates interaction status', async () => {
    const order = await BusinessServiceOrder.create(buildOrderPayload());
    const interaction = await BusinessServiceInteraction.create({
      customerEmail: 'customer@example.com',
      customerName: 'Customer One',
      consultantEmail: 'consultant@example.com',
      consultantName: 'Consultant One',
      interactionType: 'call-request',
      orderId: String(order._id),
      categoryId: order.categoryId,
      serviceId: order.serviceId,
      notes: 'Need a call for final clarification.',
      status: 'submitted',
      messages: [],
    });
    const token = makeToken({
      sub: 'customer-user-1',
      email: 'customer@example.com',
      name: 'Customer One',
    });

    const response = await request(app)
      .post(`/api/business-services/interactions/${interaction._id}/schedule-call`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        scheduledFor: '2026-06-01T10:30:00.000Z',
        callProvider: 'manual',
        callLink: 'https://example.com/call-room',
        callDuration: 45,
      });

    expect(response.status).toBe(200);
    expect(response.body?.success).toBe(true);
    expect(response.body?.data?.interaction?.status).toBe('scheduled');
    expect(response.body?.data?.interaction?.callProvider).toBe('manual');
    expect(response.body?.data?.interaction?.callDuration).toBe(45);
    expect(response.body?.data?.interaction?.messages?.length).toBeGreaterThan(0);
  });
});
