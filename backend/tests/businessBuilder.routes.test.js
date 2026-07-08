const request = require('supertest');
const express = require('express');
const businessBuilderRoutes = require('../routes/businessBuilderRoutes');
const businessBuilderService = require('../services/businessBuilderService');
const { authenticate } = require('../middleware/auth');

jest.mock('../services/businessBuilderService');
jest.mock('../middleware/auth');

describe('BusinessBuilder Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/business-builder', businessBuilderRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authenticate.mockImplementation((req, res, next) => {
      req.user = { _id: 'user-123', id: 'user-123', email: 'test@example.com' };
      next();
    });
  });

  describe('Public Routes', () => {
    describe('GET /api/business-builder/public/mini-apps/:slug', () => {
      it('should return mini app data when found', async () => {
        const mockData = {
          miniApp: { slug: 'test-app', appName: 'Test App' },
          business: { businessName: 'Test Business' },
          products: [],
        };
        businessBuilderService.getPublicMiniAppBySlug.mockResolvedValue(mockData);

        const response = await request(app)
          .get('/api/business-builder/public/mini-apps/test-app')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockData);
      });

      it('should return 404 when mini app not found', async () => {
        businessBuilderService.getPublicMiniAppBySlug.mockRejectedValue(
          new Error('Mini app not found')
        );

        const response = await request(app)
          .get('/api/business-builder/public/mini-apps/nonexistent')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/business-builder/public/mini-apps/:slug/events', () => {
      it('should record event successfully', async () => {
        const mockEvent = { eventId: 'event-123', eventType: 'view' };
        businessBuilderService.recordMiniAppEventBySlug.mockResolvedValue(mockEvent);

        const response = await request(app)
          .post('/api/business-builder/public/mini-apps/test-app/events')
          .send({ eventType: 'view' })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockEvent);
      });

      it('should return 400 for invalid payload', async () => {
        const response = await request(app)
          .post('/api/business-builder/public/mini-apps/test-app/events')
          .send('invalid')
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/business-builder/public/mini-apps/:slug/leads', () => {
      it('should create lead successfully', async () => {
        const mockLead = { leadId: 'lead-123' };
        businessBuilderService.createLeadBySlug.mockResolvedValue(mockLead);

        const response = await request(app)
          .post('/api/business-builder/public/mini-apps/test-app/leads')
          .send({
            customer: { name: 'John', phone: '9876543210' },
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockLead);
      });

      it('should return 400 when required fields missing', async () => {
        const response = await request(app)
          .post('/api/business-builder/public/mini-apps/test-app/leads')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/business-builder/public/mini-apps/:slug/orders', () => {
      it('should create order successfully', async () => {
        const mockOrder = { orderId: 'order-123' };
        businessBuilderService.createOrderBySlug.mockResolvedValue(mockOrder);

        const response = await request(app)
          .post('/api/business-builder/public/mini-apps/test-app/orders')
          .send({
            items: [{ name: 'Product', quantity: 1, unitPrice: 100 }],
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockOrder);
      });
    });

    describe('GET /api/business-builder/public/directory', () => {
      it('should return directory listing', async () => {
        const mockData = {
          items: [{ appName: 'App 1' }],
          pagination: { page: 1, total: 1 },
        };
        businessBuilderService.getPublicDirectory.mockResolvedValue(mockData);

        const response = await request(app)
          .get('/api/business-builder/public/directory')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockData);
      });
    });
  });

  describe('Authenticated Routes - Business', () => {
    describe('POST /api/business-builder/businesses', () => {
      it('should create business successfully', async () => {
        const mockBusiness = { businessId: 'biz-123', businessName: 'Test' };
        businessBuilderService.createBusiness.mockResolvedValue(mockBusiness);

        const response = await request(app)
          .post('/api/business-builder/businesses')
          .send({
            businessName: 'Test Business',
            businessType: 'Retail',
            phone: '9876543210',
            email: 'test@example.com',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockBusiness);
      });
    });

    describe('GET /api/business-builder/businesses', () => {
      it('should return user businesses', async () => {
        const mockBusinesses = [{ businessId: 'biz-1' }];
        businessBuilderService.getBusinesses.mockResolvedValue(mockBusinesses);

        const response = await request(app)
          .get('/api/business-builder/businesses')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockBusinesses);
      });
    });

    describe('GET /api/business-builder/businesses/:businessId', () => {
      it('should return specific business', async () => {
        const mockBusiness = { businessId: 'biz-123' };
        businessBuilderService.getBusinessById.mockResolvedValue(mockBusiness);

        const response = await request(app)
          .get('/api/business-builder/businesses/biz-123')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockBusiness);
      });

      it('should return 404 when business not found', async () => {
        businessBuilderService.getBusinessById.mockRejectedValue(
          new Error('Business not found')
        );

        const response = await request(app)
          .get('/api/business-builder/businesses/nonexistent')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/business-builder/businesses/:businessId', () => {
      it('should update business successfully', async () => {
        const mockBusiness = { businessId: 'biz-123', businessName: 'Updated' };
        businessBuilderService.updateBusiness.mockResolvedValue(mockBusiness);

        const response = await request(app)
          .put('/api/business-builder/businesses/biz-123')
          .send({ businessName: 'Updated' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockBusiness);
      });
    });

    describe('DELETE /api/business-builder/businesses/:businessId', () => {
      it('should delete business successfully', async () => {
        businessBuilderService.deleteBusiness.mockResolvedValue({});

        const response = await request(app)
          .delete('/api/business-builder/businesses/biz-123')
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Authenticated Routes - Invoices', () => {
    describe('POST /api/business-builder/invoices', () => {
      it('should create invoice successfully', async () => {
        const mockInvoice = { invoiceId: 'inv-123' };
        businessBuilderService.createInvoice.mockResolvedValue(mockInvoice);

        const response = await request(app)
          .post('/api/business-builder/invoices')
          .send({
            businessId: 'biz-123',
            customer: { name: 'John' },
            items: [{ description: 'Service', quantity: 1, unitPrice: 1000 }],
            dueDate: new Date(),
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockInvoice);
      });
    });

    describe('GET /api/business-builder/invoices', () => {
      it('should return invoices', async () => {
        const mockInvoices = [{ invoiceId: 'inv-1' }];
        businessBuilderService.getInvoices.mockResolvedValue(mockInvoices);

        const response = await request(app)
          .get('/api/business-builder/invoices')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockInvoices);
      });
    });

    describe('GET /api/business-builder/invoices/:invoiceId/pdf', () => {
      it('should return PDF buffer', async () => {
        const mockPdfBuffer = Buffer.from('PDF content');
        businessBuilderService.generateInvoicePDF.mockResolvedValue(mockPdfBuffer);

        const response = await request(app)
          .get('/api/business-builder/invoices/inv-123/pdf')
          .expect(200);

        expect(response.headers['content-type']).toBe('application/pdf');
      });
    });
  });

  describe('Authenticated Routes - Mini Apps', () => {
    describe('POST /api/business-builder/mini-apps', () => {
      it('should create mini app successfully', async () => {
        const mockMiniApp = { miniAppId: 'mini-123' };
        businessBuilderService.createMiniApp.mockResolvedValue(mockMiniApp);

        const response = await request(app)
          .post('/api/business-builder/mini-apps')
          .send({
            businessId: 'biz-123',
            appName: 'Test App',
            slug: 'test-app',
            appType: 'Business Card',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockMiniApp);
      });
    });

    describe('GET /api/business-builder/mini-apps', () => {
      it('should return mini apps', async () => {
        const mockMiniApps = [{ miniAppId: 'mini-1' }];
        businessBuilderService.getMiniApps.mockResolvedValue(mockMiniApps);

        const response = await request(app)
          .get('/api/business-builder/mini-apps')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockMiniApps);
      });
    });

    describe('POST /api/business-builder/mini-apps/:miniAppId/products', () => {
      it('should create product successfully', async () => {
        const mockProduct = { productId: 'prod-123' };
        businessBuilderService.createMiniAppProduct.mockResolvedValue(mockProduct);

        const response = await request(app)
          .post('/api/business-builder/mini-apps/mini-123/products')
          .send({
            name: 'Product 1',
            price: 1000,
            stock: 10,
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockProduct);
      });
    });

    describe('GET /api/business-builder/mini-apps/:miniAppId/orders', () => {
      it('should return mini app orders', async () => {
        const mockData = {
          items: [{ orderId: 'order-1' }],
          pagination: { page: 1, total: 1 },
        };
        businessBuilderService.getMiniAppOrders.mockResolvedValue(mockData);

        const response = await request(app)
          .get('/api/business-builder/mini-apps/mini-123/orders')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockData);
      });
    });

    describe('GET /api/business-builder/mini-apps/:miniAppId/funnel', () => {
      it('should return funnel metrics', async () => {
        const mockFunnel = {
          metrics: { views: 100, leads: 10, orders: 5 },
        };
        businessBuilderService.getMiniAppFunnel.mockResolvedValue(mockFunnel);

        const response = await request(app)
          .get('/api/business-builder/mini-apps/mini-123/funnel')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockFunnel);
      });
    });
  });

  describe('Authenticated Routes - AI Assets', () => {
    describe('POST /api/business-builder/businesses/:businessId/ai/assets/generate', () => {
      it('should generate AI asset successfully', async () => {
        const mockData = {
          asset: { assetId: 'asset-123' },
          entitlements: { plan: 'free' },
        };
        businessBuilderService.generateAIAsset.mockResolvedValue(mockData);

        const response = await request(app)
          .post('/api/business-builder/businesses/biz-123/ai/assets/generate')
          .send({
            assetType: 'poster',
            prompt: 'Create a poster',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockData);
      });

      it('should return 400 when limit reached', async () => {
        businessBuilderService.generateAIAsset.mockRejectedValue(
          new Error('limit reached')
        );

        const response = await request(app)
          .post('/api/business-builder/businesses/biz-123/ai/assets/generate')
          .send({
            assetType: 'poster',
            prompt: 'Test',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/business-builder/businesses/:businessId/ai/assets', () => {
      it('should return AI assets', async () => {
        const mockAssets = [{ assetId: 'asset-1' }];
        businessBuilderService.getAIAssets.mockResolvedValue(mockAssets);

        const response = await request(app)
          .get('/api/business-builder/businesses/biz-123/ai/assets')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockAssets);
      });
    });
  });

  describe('Authenticated Routes - Analytics', () => {
    describe('GET /api/business-builder/businesses/:businessId/analytics/dashboard', () => {
      it('should return analytics dashboard', async () => {
        const mockData = {
          summary: { views: 100, leads: 10 },
        };
        businessBuilderService.getBusinessAnalyticsDashboard.mockResolvedValue(mockData);

        const response = await request(app)
          .get('/api/business-builder/businesses/biz-123/analytics/dashboard')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockData);
      });
    });
  });

  describe('Authenticated Routes - Orders', () => {
    describe('PATCH /api/business-builder/orders/:orderId/status', () => {
      it('should update order status successfully', async () => {
        const mockOrder = { orderId: 'order-123', status: 'confirmed' };
        businessBuilderService.updateOrderStatus.mockResolvedValue(mockOrder);

        const response = await request(app)
          .patch('/api/business-builder/orders/order-123/status')
          .send({ status: 'confirmed' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockOrder);
      });
    });
  });

  describe('Payment Webhook', () => {
    describe('POST /api/business-builder/public/payments/webhook', () => {
      it('should process webhook with valid auth', async () => {
        process.env.BUSINESS_BUILDER_WEBHOOK_SECRET = 'test-secret';
        const mockOrder = { orderId: 'order-123' };
        businessBuilderService.processPaymentWebhook.mockResolvedValue(mockOrder);

        const response = await request(app)
          .post('/api/business-builder/public/payments/webhook')
          .set('x-businessbuilder-webhook-token', 'test-secret')
          .send({ orderId: 'order-123', status: 'paid' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockOrder);
      });

      it('should reject webhook with invalid auth', async () => {
        process.env.BUSINESS_BUILDER_WEBHOOK_SECRET = 'test-secret';

        const response = await request(app)
          .post('/api/business-builder/public/payments/webhook')
          .set('x-businessbuilder-webhook-token', 'wrong-secret')
          .send({ orderId: 'order-123' })
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });
});
