const businessBuilderService = require('../services/businessBuilderService');
const Business = require('../models/Business');
const Invoice = require('../models/Invoice');
const MiniApp = require('../models/MiniApp');
const MiniAppProduct = require('../models/MiniAppProduct');
const BusinessBuilderLead = require('../models/BusinessBuilderLead');
const BusinessBuilderOrder = require('../models/BusinessBuilderOrder');
const BusinessBuilderEvent = require('../models/BusinessBuilderEvent');
const BusinessBuilderAsset = require('../models/BusinessBuilderAsset');

jest.mock('../models/Business');
jest.mock('../models/Invoice');
jest.mock('../models/MiniApp');
jest.mock('../models/MiniAppProduct');
jest.mock('../models/BusinessBuilderLead');
jest.mock('../models/BusinessBuilderOrder');
jest.mock('../models/BusinessBuilderEvent');
jest.mock('../models/BusinessBuilderAsset');

describe('BusinessBuilderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Business Operations', () => {
    const mockUserId = '507f1f77bcf86cd799439011';
    const mockBusinessData = {
      businessName: 'Test Business',
      businessType: 'Retail',
      phone: '9876543210',
      email: 'test@example.com',
      address: {
        city: 'Kochi',
        state: 'Kerala',
        pincode: '682001',
      },
    };

    describe('createBusiness', () => {
      it('should create a new business successfully', async () => {
        const mockSavedBusiness = {
          ...mockBusinessData,
          userId: mockUserId,
          businessId: 'biz-123',
          save: jest.fn().mockResolvedValue(true),
        };

        Business.mockImplementation(() => mockSavedBusiness);

        const result = await businessBuilderService.createBusiness(mockUserId, mockBusinessData);

        expect(result).toBeDefined();
        expect(result.businessName).toBe(mockBusinessData.businessName);
        expect(Business).toHaveBeenCalledWith({
          ...mockBusinessData,
          userId: mockUserId,
        });
      });

      it('should throw error when business creation fails', async () => {
        Business.mockImplementation(() => {
          throw new Error('Database error');
        });

        await expect(
          businessBuilderService.createBusiness(mockUserId, mockBusinessData)
        ).rejects.toThrow('Failed to create business');
      });
    });

    describe('getBusinesses', () => {
      it('should return list of businesses for user', async () => {
        const mockBusinesses = [
          { businessId: 'biz-1', businessName: 'Business 1' },
          { businessId: 'biz-2', businessName: 'Business 2' },
        ];

        Business.find = jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockBusinesses),
        });

        const result = await businessBuilderService.getBusinesses(mockUserId);

        expect(result).toEqual(mockBusinesses);
        expect(Business.find).toHaveBeenCalledWith({ userId: mockUserId });
      });
    });

    describe('getBusinessById', () => {
      it('should return business when found', async () => {
        const mockBusiness = {
          businessId: 'biz-123',
          businessName: 'Test Business',
          userId: mockUserId,
        };

        Business.findOne = jest.fn().mockResolvedValue(mockBusiness);

        const result = await businessBuilderService.getBusinessById('biz-123', mockUserId);

        expect(result).toEqual(mockBusiness);
        expect(Business.findOne).toHaveBeenCalledWith({
          businessId: 'biz-123',
          userId: mockUserId,
        });
      });

      it('should throw error when business not found', async () => {
        Business.findOne = jest.fn().mockResolvedValue(null);

        await expect(
          businessBuilderService.getBusinessById('biz-123', mockUserId)
        ).rejects.toThrow('Business not found');
      });
    });

    describe('updateBusiness', () => {
      it('should update business successfully', async () => {
        const updatedData = { businessName: 'Updated Business' };
        const mockUpdatedBusiness = {
          businessId: 'biz-123',
          ...updatedData,
        };

        Business.findOneAndUpdate = jest.fn().mockResolvedValue(mockUpdatedBusiness);

        const result = await businessBuilderService.updateBusiness('biz-123', mockUserId, updatedData);

        expect(result).toEqual(mockUpdatedBusiness);
        expect(Business.findOneAndUpdate).toHaveBeenCalledWith(
          { businessId: 'biz-123', userId: mockUserId },
          updatedData,
          { new: true, runValidators: true }
        );
      });
    });

    describe('deleteBusiness', () => {
      it('should delete business successfully', async () => {
        const mockBusiness = { businessId: 'biz-123' };
        Business.findOneAndDelete = jest.fn().mockResolvedValue(mockBusiness);

        const result = await businessBuilderService.deleteBusiness('biz-123', mockUserId);

        expect(result).toEqual(mockBusiness);
        expect(Business.findOneAndDelete).toHaveBeenCalledWith({
          businessId: 'biz-123',
          userId: mockUserId,
        });
      });
    });
  });

  describe('Invoice Operations', () => {
    const mockUserId = '507f1f77bcf86cd799439011';
    const mockInvoiceData = {
      businessId: 'biz-123',
      customer: {
        name: 'John Doe',
        phone: '9876543210',
        email: 'john@example.com',
      },
      items: [
        { description: 'Service 1', quantity: 1, unitPrice: 1000, total: 1000 },
      ],
      dueDate: new Date(),
    };

    describe('createInvoice', () => {
      it('should create invoice successfully', async () => {
        const mockBusiness = { _id: 'business-obj-id', businessId: 'biz-123' };
        Business.findOne = jest.fn().mockResolvedValue(mockBusiness);
        Invoice.getNextInvoiceNumber = jest.fn().mockResolvedValue('INV-001');

        const mockSavedInvoice = {
          ...mockInvoiceData,
          invoiceNumber: 'INV-001',
          save: jest.fn().mockResolvedValue(true),
        };
        Invoice.mockImplementation(() => mockSavedInvoice);

        const result = await businessBuilderService.createInvoice(mockUserId, mockInvoiceData);

        expect(result).toBeDefined();
        expect(Business.findOne).toHaveBeenCalled();
        expect(Invoice.getNextInvoiceNumber).toHaveBeenCalled();
      });

      it('should throw error when business not found', async () => {
        Business.findOne = jest.fn().mockResolvedValue(null);

        await expect(
          businessBuilderService.createInvoice(mockUserId, mockInvoiceData)
        ).rejects.toThrow('Business not found');
      });
    });
  });

  describe('Mini App Operations', () => {
    const mockUserId = '507f1f77bcf86cd799439011';
    const mockMiniAppData = {
      businessId: 'biz-123',
      appName: 'Test App',
      slug: 'test-app',
      appType: 'Business Card',
    };

    describe('createMiniApp', () => {
      it('should create mini app successfully', async () => {
        const mockBusiness = {
          _id: 'business-obj-id',
          businessId: 'biz-123',
          subscription: { plan: 'free' },
          featureUsage: { miniAppsCreated: 0, lastResetAt: new Date() },
          save: jest.fn().mockResolvedValue(true),
        };
        Business.findOne = jest.fn().mockResolvedValue(mockBusiness);
        MiniApp.countDocuments = jest.fn().mockResolvedValue(0);

        const mockSavedMiniApp = {
          ...mockMiniAppData,
          _id: 'miniapp-obj-id',
          generateQRData: jest.fn().mockResolvedValue(true),
          save: jest.fn().mockResolvedValue(true),
        };
        MiniApp.mockImplementation(() => mockSavedMiniApp);

        const result = await businessBuilderService.createMiniApp(mockUserId, mockMiniAppData);

        expect(result).toBeDefined();
        expect(mockSavedMiniApp.generateQRData).toHaveBeenCalled();
      });

      it('should throw error when mini app limit reached', async () => {
        const mockBusiness = {
          _id: 'business-obj-id',
          subscription: { plan: 'free' },
          featureUsage: { lastResetAt: new Date() },
        };
        Business.findOne = jest.fn().mockResolvedValue(mockBusiness);
        MiniApp.countDocuments = jest.fn().mockResolvedValue(1);

        await expect(
          businessBuilderService.createMiniApp(mockUserId, mockMiniAppData)
        ).rejects.toThrow('Mini app limit reached');
      });
    });

    describe('getPublicMiniAppBySlug', () => {
      it('should return published mini app with products', async () => {
        const mockMiniApp = {
          _id: 'miniapp-obj-id',
          slug: 'test-app',
          status: 'Published',
          businessId: { businessName: 'Test Business' },
          incrementView: jest.fn().mockResolvedValue(true),
        };
        MiniApp.findOne = jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockMiniApp),
        });

        const mockProducts = [{ name: 'Product 1' }];
        MiniAppProduct.find = jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockProducts),
          }),
        });

        const result = await businessBuilderService.getPublicMiniAppBySlug('test-app');

        expect(result.miniApp).toEqual(mockMiniApp);
        expect(result.products).toEqual(mockProducts);
        expect(mockMiniApp.incrementView).toHaveBeenCalled();
      });

      it('should throw error when mini app not found', async () => {
        MiniApp.findOne = jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        });

        await expect(
          businessBuilderService.getPublicMiniAppBySlug('nonexistent')
        ).rejects.toThrow('Published mini app not found');
      });
    });
  });

  describe('Lead and Order Operations', () => {
    describe('createLeadBySlug', () => {
      it('should create lead successfully', async () => {
        const mockMiniApp = {
          _id: 'miniapp-obj-id',
          businessId: 'business-obj-id',
        };
        const mockBusiness = { _id: 'business-obj-id', userId: 'user-id' };
        
        MiniApp.findOne = jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({ ...mockMiniApp, businessId: mockBusiness }),
        });

        const mockLead = { leadId: 'lead-123' };
        BusinessBuilderLead.create = jest.fn().mockResolvedValue(mockLead);
        BusinessBuilderEvent.create = jest.fn().mockResolvedValue({});
        Business.updateOne = jest.fn().mockResolvedValue({});

        const payload = {
          customer: { name: 'John', phone: '9876543210' },
        };

        const result = await businessBuilderService.createLeadBySlug('test-app', payload);

        expect(result).toEqual(mockLead);
        expect(BusinessBuilderLead.create).toHaveBeenCalled();
        expect(BusinessBuilderEvent.create).toHaveBeenCalled();
      });
    });

    describe('createOrderBySlug', () => {
      it('should create order successfully', async () => {
        const mockMiniApp = {
          _id: 'miniapp-obj-id',
          businessId: 'business-obj-id',
        };
        const mockBusiness = { _id: 'business-obj-id', userId: 'user-id' };
        
        MiniApp.findOne = jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({ ...mockMiniApp, businessId: mockBusiness }),
        });

        const mockOrder = {
          orderId: 'order-123',
          save: jest.fn().mockResolvedValue(true),
        };
        BusinessBuilderOrder.mockImplementation(() => mockOrder);
        BusinessBuilderEvent.create = jest.fn().mockResolvedValue({});

        const payload = {
          customer: { name: 'John' },
          items: [{ name: 'Product', quantity: 1, unitPrice: 100 }],
        };

        const result = await businessBuilderService.createOrderBySlug('test-app', payload);

        expect(result).toEqual(mockOrder);
        expect(mockOrder.save).toHaveBeenCalled();
      });

      it('should throw error when items are empty', async () => {
        const mockMiniApp = { _id: 'miniapp-obj-id', businessId: 'business-obj-id' };
        const mockBusiness = { _id: 'business-obj-id' };
        
        MiniApp.findOne = jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({ ...mockMiniApp, businessId: mockBusiness }),
        });

        const payload = { items: [] };

        await expect(
          businessBuilderService.createOrderBySlug('test-app', payload)
        ).rejects.toThrow('At least one order item is required');
      });
    });
  });

  describe('Payment Webhook Processing', () => {
    it('should process paid webhook successfully', async () => {
      const mockOrder = {
        orderId: 'order-123',
        payment: { status: 'pending', processedWebhookIds: [] },
        pushStatus: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
        miniAppId: 'miniapp-obj-id',
        businessId: 'business-obj-id',
        totalAmount: 1000,
      };

      BusinessBuilderOrder.findOne = jest.fn().mockResolvedValue(mockOrder);
      BusinessBuilderEvent.create = jest.fn().mockResolvedValue({});
      BusinessBuilderLead.updateOne = jest.fn().mockResolvedValue({});

      const payload = {
        orderId: 'order-123',
        status: 'paid',
        paymentReference: 'pay-123',
      };

      const result = await businessBuilderService.processPaymentWebhook(payload);

      expect(result.payment.status).toBe('paid');
      expect(mockOrder.save).toHaveBeenCalled();
      expect(BusinessBuilderEvent.create).toHaveBeenCalled();
    });

    it('should not duplicate webhook processing', async () => {
      const mockOrder = {
        orderId: 'order-123',
        payment: {
          status: 'paid',
          paymentReference: 'pay-123',
          processedWebhookIds: ['webhook-123'],
        },
      };

      BusinessBuilderOrder.findOne = jest.fn().mockResolvedValue(mockOrder);

      const payload = {
        orderId: 'order-123',
        webhookEventId: 'webhook-123',
        status: 'paid',
      };

      const result = await businessBuilderService.processPaymentWebhook(payload);

      expect(result).toEqual(mockOrder);
    });
  });

  describe('AI Asset Generation', () => {
    it('should generate AI asset when within limits', async () => {
      const mockBusiness = {
        _id: 'business-obj-id',
        businessId: 'biz-123',
        businessName: 'Test Business',
        subscription: { plan: 'free' },
        featureUsage: { aiAssetsGenerated: 0, lastResetAt: new Date() },
        save: jest.fn().mockResolvedValue(true),
      };

      Business.findOne = jest.fn().mockResolvedValue(mockBusiness);

      const mockAsset = { assetId: 'asset-123' };
      BusinessBuilderAsset.create = jest.fn().mockResolvedValue(mockAsset);

      const payload = {
        assetType: 'poster',
        prompt: 'Create a poster for my business',
      };

      const result = await businessBuilderService.generateAIAsset('user-id', 'biz-123', payload);

      expect(result.asset).toEqual(mockAsset);
      expect(BusinessBuilderAsset.create).toHaveBeenCalled();
      expect(mockBusiness.save).toHaveBeenCalled();
    });

    it('should throw error when AI asset limit reached', async () => {
      const mockBusiness = {
        _id: 'business-obj-id',
        subscription: { plan: 'free' },
        featureUsage: { aiAssetsGenerated: 5, lastResetAt: new Date() },
      };

      Business.findOne = jest.fn().mockResolvedValue(mockBusiness);

      const payload = { assetType: 'poster', prompt: 'Test' };

      await expect(
        businessBuilderService.generateAIAsset('user-id', 'biz-123', payload)
      ).rejects.toThrow('AI asset monthly limit reached');
    });
  });

  describe('Analytics and Reporting', () => {
    describe('getBusinessAnalyticsDashboard', () => {
      it('should return analytics dashboard data', async () => {
        const mockBusiness = {
          _id: 'business-obj-id',
          businessId: 'biz-123',
        };
        Business.findOne = jest.fn().mockResolvedValue(mockBusiness);

        BusinessBuilderEvent.countDocuments = jest.fn().mockResolvedValue(100);
        BusinessBuilderLead.countDocuments = jest.fn().mockResolvedValue(10);
        BusinessBuilderOrder.countDocuments = jest.fn().mockResolvedValue(5);
        BusinessBuilderOrder.aggregate = jest.fn().mockResolvedValue([
          { paidOrders: 3, revenue: 5000 },
        ]);
        BusinessBuilderLead.aggregate = jest.fn().mockResolvedValue([]);
        BusinessBuilderAsset.find = jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([]),
        });
        MiniApp.find = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        });

        const result = await businessBuilderService.getBusinessAnalyticsDashboard(
          'user-id',
          'biz-123',
          { days: 30 }
        );

        expect(result.summary.views).toBe(100);
        expect(result.summary.leads).toBe(10);
        expect(result.summary.orders).toBe(5);
        expect(result.summary.revenue).toBe(5000);
      });
    });

    describe('getMiniAppFunnel', () => {
      it('should return funnel metrics', async () => {
        const mockMiniApp = { _id: 'miniapp-obj-id', miniAppId: 'mini-123' };
        MiniApp.findOne = jest.fn().mockResolvedValue(mockMiniApp);

        BusinessBuilderEvent.aggregate = jest.fn().mockResolvedValue([
          { _id: 'view', count: 100 },
        ]);
        BusinessBuilderLead.countDocuments = jest.fn().mockResolvedValue(10);
        BusinessBuilderOrder.countDocuments = jest.fn().mockResolvedValue(5);
        BusinessBuilderOrder.aggregate = jest.fn().mockResolvedValue([
          { paidCount: 3, paidRevenue: 3000 },
        ]);

        const result = await businessBuilderService.getMiniAppFunnel(
          'user-id',
          'mini-123',
          { days: 30 }
        );

        expect(result.metrics.views).toBe(100);
        expect(result.metrics.leads).toBe(10);
        expect(result.metrics.leadConversionRate).toBe(10);
      });
    });
  });
});
