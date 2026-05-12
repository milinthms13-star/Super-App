const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Business = require('../models/Business');
const Invoice = require('../models/Invoice');
const MiniApp = require('../models/MiniApp');
const User = require('../models/User');

describe('Business Builder API', () => {
  let authToken;
  let testUser;
  let testBusiness;

  const baseBusinessData = {
    businessName: 'Test Business',
    businessType: 'Retail',
    phone: '9876543210',
    email: 'business@test.com',
    address: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
    },
    costForm: {
      rent: 10000,
      staffSalary: 20000,
      inventory: 50000,
      marketing: 5000,
      licenseCost: 10000,
      equipment: 25000,
      utilities: 3000,
      otherMonthly: 2000,
      expectedMonthlyRevenue: 100000,
    },
    schemeProfile: {
      isWomenEntrepreneur: false,
      isKeralaBased: true,
      isSCSTEntrepreneur: false,
      isMinorityEntrepreneur: false,
    },
  };

  beforeAll(async () => {
    // Create test user
    testUser = new User({
      username: 'testbusinessuser',
      email: 'testbusiness@example.com',
      password: 'hashedpassword',
      phone: '9876543210',
    });
    await testUser.save();

    // Create a base business record for dependent tests
    testBusiness = await Business.create({
      ...baseBusinessData,
      userId: testUser._id,
      businessId: `BUS-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    });

    // Generate auth token (mock JWT)
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET || 'testsecret');
  });

  afterAll(async () => {
    await Business.deleteMany({ userId: testUser._id });
    await Invoice.deleteMany({ userId: testUser._id });
    await MiniApp.deleteMany({ userId: testUser._id });
    await User.findByIdAndDelete(testUser._id);
    await mongoose.connection.close();
  });

  describe('Business CRUD Operations', () => {
    const businessData = {
      businessName: 'Test Business',
      businessType: 'Retail',
      phone: '9876543210',
      email: 'business@test.com',
      address: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
      },
      costForm: {
        rent: 10000,
        staffSalary: 20000,
        inventory: 50000,
        marketing: 5000,
        licenseCost: 10000,
        equipment: 25000,
        utilities: 3000,
        otherMonthly: 2000,
        expectedMonthlyRevenue: 100000,
      },
      schemeProfile: {
        isWomenEntrepreneur: false,
        isKeralaBased: true,
        isSCSTEntrepreneur: false,
        isMinorityEntrepreneur: false,
      },
    };

    test('should create a new business', async () => {
      const response = await request(app)
        .post('/api/business-builder/businesses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(businessData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.businessName).toBe(businessData.businessName);
      expect(response.body.data.businessType).toBe(businessData.businessType);

      testBusiness = response.body.data;
    });

    test('should get all businesses for user', async () => {
      const response = await request(app)
        .get('/api/business-builder/businesses')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should get business by ID', async () => {
      const response = await request(app)
        .get(`/api/business-builder/businesses/${testBusiness.businessId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.businessId).toBe(testBusiness.businessId);
    });

    test('should update business', async () => {
      const updateData = {
        businessName: 'Updated Test Business',
        costForm: {
          ...businessData.costForm,
          rent: 15000,
        },
      };

      const response = await request(app)
        .put(`/api/business-builder/businesses/${testBusiness.businessId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.businessName).toBe(updateData.businessName);
      expect(response.body.data.costForm.rent).toBe(updateData.costForm.rent);
    });

    test('should generate business plan', async () => {
      const response = await request(app)
        .post(`/api/business-builder/businesses/${testBusiness.businessId}/generate-plan`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('marketAnalysis');
      expect(response.body.data).toHaveProperty('revenueModel');
    });

    test('should get eligible government schemes', async () => {
      const response = await request(app)
        .get(`/api/business-builder/businesses/${testBusiness.businessId}/schemes`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Invoice CRUD Operations', () => {
    let testInvoice;
    let invoiceData;

    test('should create a new invoice', async () => {
      invoiceData = {
        businessId: testBusiness.businessId,
        customer: {
          name: 'John Doe',
          phone: '9876543210',
          email: 'john@example.com',
          address: '456 Customer Street, Customer City',
        },
        items: [
          {
            description: 'Product A',
            quantity: 2,
            unitPrice: 500,
            total: 1000,
            hsnCode: '1234',
          },
          {
            description: 'Service B',
            quantity: 1,
            unitPrice: 1500,
            total: 1500,
            hsnCode: '5678',
          },
        ],
        subtotal: 2500,
        discount: 100,
        taxRate: 18,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        notes: 'Payment due within 30 days',
      };

      const response = await request(app)
        .post('/api/business-builder/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.customer.name).toBe(invoiceData.customer.name);
      expect(response.body.data.totalAmount).toBeDefined();

      testInvoice = response.body.data;
    });

    test('should get all invoices for user', async () => {
      const response = await request(app)
        .get('/api/business-builder/invoices')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should get invoice by ID', async () => {
      const response = await request(app)
        .get(`/api/business-builder/invoices/${testInvoice.invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.invoiceId).toBe(testInvoice.invoiceId);
    });

    test('should generate invoice PDF', async () => {
      const response = await request(app)
        .get(`/api/business-builder/invoices/${testInvoice.invoiceId}/pdf`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    test('should update invoice', async () => {
      const updateData = {
        status: 'Paid',
        paymentMethod: 'Bank Transfer',
      };

      const response = await request(app)
        .put(`/api/business-builder/invoices/${testInvoice.invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(updateData.status);
      expect(response.body.data.paymentMethod).toBe(updateData.paymentMethod);
    });
  });

  describe('Mini App CRUD Operations', () => {
    let testMiniApp;
    let miniAppData;

    test('should create a new mini app', async () => {
      miniAppData = {
        businessId: testBusiness.businessId,
        appName: 'Test Mini App',
        appDescription: 'A test mini application',
        appType: 'Business Card',
        branding: {
          primaryColor: '#0f766e',
          secondaryColor: '#10b981',
        },
        content: {
          heroTitle: 'Welcome to Our Business',
          heroSubtitle: 'We provide excellent services',
          aboutText: 'We are a leading business in our field.',
          contactInfo: {
            phone: '9876543210',
            email: 'contact@test.com',
            address: '123 Business Street',
          },
        },
      };

      const response = await request(app)
        .post('/api/business-builder/mini-apps')
        .set('Authorization', `Bearer ${authToken}`)
        .send(miniAppData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.appName).toBe(miniAppData.appName);
      expect(response.body.data.appType).toBe(miniAppData.appType);
      expect(response.body.data.qrCode).toBeDefined();

      testMiniApp = response.body.data;
    });

    test('should get all mini apps for user', async () => {
      const response = await request(app)
        .get('/api/business-builder/mini-apps')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should get mini app by ID', async () => {
      const response = await request(app)
        .get(`/api/business-builder/mini-apps/${testMiniApp.miniAppId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.miniAppId).toBe(testMiniApp.miniAppId);
    });

    test('should update mini app', async () => {
      const updateData = {
        appName: 'Updated Test Mini App',
        status: 'Published',
      };

      const response = await request(app)
        .put(`/api/business-builder/mini-apps/${testMiniApp.miniAppId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.appName).toBe(updateData.appName);
      expect(response.body.data.status).toBe(updateData.status);
    });

    test('should record mini app view', async () => {
      const response = await request(app)
        .post(`/api/business-builder/mini-apps/${testMiniApp.miniAppId}/view`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('View recorded');
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for non-existent business', async () => {
      const response = await request(app)
        .get('/api/business-builder/businesses/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Business not found');
    });

    test('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/business-builder/businesses');

      expect(response.status).toBe(401);
    });

    test('should return 400 for invalid business data', async () => {
      const invalidData = {
        businessName: '', // Invalid: empty name
        businessType: 'InvalidType', // Invalid: not in enum
      };

      const response = await request(app)
        .post('/api/business-builder/businesses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});