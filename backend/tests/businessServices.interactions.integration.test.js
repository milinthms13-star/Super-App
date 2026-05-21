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

const createBaseOrder = (overrides = {}) =>
  BusinessServiceOrder.create({
    customerEmail: 'customer@example.com',
    customerName: 'Customer',
    categoryId: 'business-registration',
    categoryName: 'Business Registration',
    serviceId: 'llp-registration',
    serviceName: 'LLP Registration',
    pricing: {
      priceText: '₹5,000',
      priceNumber: 5000,
      durationText: '5 days',
    },
    status: 'processing',
    paymentStatus: 'paid',
    formData: {
      businessName: 'Acme LLP',
    },
    consultant: {
      assignedEmail: 'consultant@example.com',
      assignedName: 'Consultant',
    },
    deliverables: [],
    history: [
      {
        status: 'processing',
        changedBy: 'consultant@example.com',
        note: 'Work started.',
      },
    ],
    ...overrides,
  });

describe('BusinessServices interaction and invoice guardrails', () => {
  let app;

  beforeAll(async () => {
    app = createTestApp();
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  });

  afterEach(async () => {
    await BusinessServiceInteraction.deleteMany({});
    await BusinessServiceOrder.deleteMany({});
  });

  test('creates interaction with seeded first message from notes', async () => {
    const order = await createBaseOrder();
    const customerToken = makeToken({
      sub: 'customer-user-id',
      email: 'customer@example.com',
      name: 'Customer',
    });

    const response = await request(app)
      .post('/api/business-services/interactions')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        interactionType: 'chat-request',
        orderId: String(order._id),
        categoryId: order.categoryId,
        serviceId: order.serviceId,
        notes: 'Need timeline clarification',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.interaction.messages.length).toBe(1);
    expect(response.body.data.interaction.messages[0].text).toBe('Need timeline clarification');
  });

  test('adds message to interaction for authorized customer', async () => {
    const order = await createBaseOrder();
    const interaction = await BusinessServiceInteraction.create({
      customerEmail: 'customer@example.com',
      customerName: 'Customer',
      consultantEmail: 'consultant@example.com',
      consultantName: 'Consultant',
      interactionType: 'chat-request',
      orderId: String(order._id),
      categoryId: order.categoryId,
      serviceId: order.serviceId,
      notes: 'Initial request',
      status: 'submitted',
      messages: [],
    });

    const customerToken = makeToken({
      sub: 'customer-user-id',
      email: 'customer@example.com',
      name: 'Customer',
    });

    const response = await request(app)
      .post(`/api/business-services/interactions/${interaction._id}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ text: 'Please confirm checklist.' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.interaction.status).toBe('open');
    expect(response.body.data.interaction.messages.length).toBe(1);
  });

  test('rejects interaction message from unauthorized user', async () => {
    const order = await createBaseOrder();
    const interaction = await BusinessServiceInteraction.create({
      customerEmail: 'customer@example.com',
      customerName: 'Customer',
      consultantEmail: 'consultant@example.com',
      consultantName: 'Consultant',
      interactionType: 'chat-request',
      orderId: String(order._id),
      categoryId: order.categoryId,
      serviceId: order.serviceId,
      notes: 'Initial request',
      status: 'submitted',
      messages: [],
    });

    const outsiderToken = makeToken({
      sub: 'outsider-user-id',
      email: 'outsider@example.com',
      name: 'Outsider',
    });

    const response = await request(app)
      .post(`/api/business-services/interactions/${interaction._id}/messages`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ text: 'I should not be allowed.' });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  test('marks unread interaction messages as read for the viewer', async () => {
    const order = await createBaseOrder();
    const interaction = await BusinessServiceInteraction.create({
      customerEmail: 'customer@example.com',
      customerName: 'Customer',
      consultantEmail: 'consultant@example.com',
      consultantName: 'Consultant',
      interactionType: 'chat-request',
      orderId: String(order._id),
      categoryId: order.categoryId,
      serviceId: order.serviceId,
      notes: 'Initial request',
      status: 'open',
      messages: [
        {
          sender: 'consultant@example.com',
          senderRole: 'consultant',
          text: 'Please upload one missing document.',
        },
      ],
    });

    const customerToken = makeToken({
      sub: 'customer-user-id',
      email: 'customer@example.com',
      name: 'Customer',
    });

    const response = await request(app)
      .get(`/api/business-services/interactions/${interaction._id}/messages`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.messages.length).toBe(1);
    expect(response.body.data.messages[0].readAt).toBeTruthy();
  });

  test('blocks invoice download before order completion', async () => {
    const order = await createBaseOrder({
      status: 'processing',
      paymentStatus: 'paid',
    });
    const customerToken = makeToken({
      sub: 'customer-user-id',
      email: 'customer@example.com',
      name: 'Customer',
    });

    const response = await request(app)
      .get(`/api/business-services/orders/${order._id}/invoice/pdf`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(String(response.body.message || '').toLowerCase()).toContain('completed');
  });

  test('blocks deliverable status update from consultant role', async () => {
    const order = await createBaseOrder({
      deliverables: [
        {
          fileId: 'file-001',
          name: 'Deliverable.pdf',
          contentType: 'application/pdf',
          size: 1234,
          url: '/api/files/private/file-001',
          uploadedBy: 'consultant@example.com',
          status: 'pending-review',
        },
      ],
    });

    const consultantToken = makeToken({
      sub: 'consultant-user-id',
      email: 'consultant@example.com',
      name: 'Consultant',
    });

    const response = await request(app)
      .patch(`/api/business-services/orders/${order._id}/deliverables/file-001/status`)
      .set('Authorization', `Bearer ${consultantToken}`)
      .send({ status: 'approved' });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});
