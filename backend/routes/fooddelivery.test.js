const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = {
      id: req.headers['x-test-user-id'] || 'user-1',
      role: req.headers['x-test-role'] || 'entrepreneur',
      email: req.headers['x-test-email'] || 'owner@example.com',
      registrationType: req.headers['x-test-role'] || 'entrepreneur',
      name: 'Test User',
    };
    next();
  },
}));

jest.mock('../middleware/rateLimiter', () => ({
  createModerateRateLimiter: () => (_req, _res, next) => next(),
}));

jest.mock('../models/Restaurant', () => ({
  findById: jest.fn(),
}));

jest.mock('../utils/foodStore', () => ({
  getRestaurants: jest.fn(),
  getManagedRestaurants: jest.fn(),
  getRestaurantGovernance: jest.fn(),
  getMenuByRestaurant: jest.fn(),
  addItemToCart: jest.fn(),
  getCartForUser: jest.fn(),
  clearCartForUser: jest.fn(),
  getCheckoutSummary: jest.fn(),
  getRewardsSummary: jest.fn(),
  getRestaurantRecommendations: jest.fn(),
  createOrder: jest.fn(),
  createOrderFromCart: jest.fn(),
  getOrdersByCustomer: jest.fn(),
  getOrderById: jest.fn(),
  getRestaurantOrders: jest.fn(),
  getRiderActiveOrders: jest.fn(),
  getOrderTracking: jest.fn(),
  createOrUpdateRiderProfile: jest.fn(),
  updateRiderAvailability: jest.fn(),
  assignRiderToOrder: jest.fn(),
  updateRiderLocation: jest.fn(),
  triggerRiderSos: jest.fn(),
  updateRiderOrderStatus: jest.fn(),
  updateOrderStatus: jest.fn(),
  updateRestaurantOrderStatus: jest.fn(),
  cancelOrder: jest.fn(),
  updateRestaurantAvailability: jest.fn(),
  updateMenuItemAvailability: jest.fn(),
  upsertRestaurantTeamMember: jest.fn(),
  createOrderDispute: jest.fn(),
  updateOrderDispute: jest.fn(),
  getAdminDashboard: jest.fn(),
  getAdminOrders: jest.fn(),
  getAdminAuditLog: jest.fn(),
  RESTAURANT_PERMISSION_CATALOG: {
    'orders:view': 'View restaurant orders',
    'orders:update': 'Update order workflow',
    'orders:assign-rider': 'Assign delivery partners',
    'disputes:manage': 'Resolve order disputes',
    'menu:update': 'Manage menu availability',
    'availability:update': 'Manage restaurant availability',
    'team:manage': 'Manage restaurant staff access',
    'analytics:view': 'View restaurant analytics',
    'audit:view': 'View restaurant audit activity',
  },
  RESTAURANT_TEAM_ROLE_PERMISSIONS: {
    owner: [
      'orders:view',
      'orders:update',
      'orders:assign-rider',
      'disputes:manage',
      'menu:update',
      'availability:update',
      'team:manage',
      'analytics:view',
      'audit:view',
    ],
    manager: ['orders:view', 'orders:update', 'team:manage', 'audit:view'],
    dispatcher: ['orders:view', 'orders:assign-rider', 'audit:view'],
    kitchen: ['orders:view', 'orders:update', 'menu:update', 'availability:update'],
    support: ['orders:view', 'disputes:manage', 'audit:view'],
    analyst: ['orders:view', 'analytics:view', 'audit:view'],
  },
  serializeRestaurant: jest.fn((value) => value),
  serializeMenuItem: jest.fn((value) => value),
  serializeCart: jest.fn((value) => value),
  serializeOrder: jest.fn((value) => value),
  serializeDriver: jest.fn((value) => value),
}));

const Restaurant = require('../models/Restaurant');
const foodStore = require('../utils/foodStore');
const foodDeliveryRouter = require('./fooddelivery');

describe('fooddelivery route contract', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    Restaurant.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: 'rest-1', ownerId: 'user-1' }),
    });

    app = express();
    app.use(express.json());
    app.use('/api/fooddelivery', foodDeliveryRouter);
  });

  test('POST /api/fooddelivery/:restaurantId/cart adds or updates cart items', async () => {
    foodStore.addItemToCart.mockResolvedValue({
      restaurantId: 'rest-1',
      itemCount: 2,
      total: 500,
      items: [{ id: 'item-1', quantity: 2, price: 250 }],
    });

    const response = await request(app)
      .post('/api/fooddelivery/rest-1/cart')
      .send({ itemId: 'item-1', quantity: 2 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(foodStore.addItemToCart).toHaveBeenCalledWith({
      userId: 'user-1',
      restaurantId: 'rest-1',
      itemId: 'item-1',
      quantity: 2,
    });
  });

  test('GET /api/fooddelivery/restaurants/managed returns scoped restaurants', async () => {
    foodStore.getManagedRestaurants.mockResolvedValue([
      { id: 'rest-1', name: 'Managed Kitchen' },
    ]);

    const response = await request(app).get('/api/fooddelivery/restaurants/managed');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(foodStore.getManagedRestaurants).toHaveBeenCalledWith({
      userId: 'user-1',
      currentUser: expect.objectContaining({ id: 'user-1' }),
      permission: 'orders:view',
    });
  });

  test('POST /api/fooddelivery/:restaurantId/cart/summary returns pricing breakdown', async () => {
    foodStore.getCheckoutSummary.mockResolvedValue({
      subtotal: 400,
      discountAmount: 40,
      deliveryCharge: 19,
      platformFee: 5,
      taxAmount: 18,
      tipAmount: 10,
      totalAmount: 412,
      payableAmount: 412,
      isValid: true,
    });

    const response = await request(app)
      .post('/api/fooddelivery/rest-1/cart/summary')
      .send({
        cart: [{ id: 'item-1', quantity: 2 }],
        couponCode: 'SAVE10',
        paymentMethod: 'cod',
        tipAmount: 10,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.discountAmount).toBe(40);
  });

  test('GET /api/fooddelivery/rewards/me returns loyalty summary', async () => {
    foodStore.getRewardsSummary.mockResolvedValue({
      pointsBalance: 140,
      referralCode: 'FDMALA2024',
    });

    const response = await request(app).get('/api/fooddelivery/rewards/me');

    expect(response.status).toBe(200);
    expect(response.body.data.pointsBalance).toBe(140);
    expect(foodStore.getRewardsSummary).toHaveBeenCalledWith({
      userId: 'user-1',
      currentUser: expect.objectContaining({ id: 'user-1' }),
    });
  });

  test('GET /api/fooddelivery/:restaurantId/recommendations returns suggested items', async () => {
    foodStore.getRestaurantRecommendations.mockResolvedValue([
      { id: 'item-2', name: 'Paneer Wrap', price: 180 },
    ]);

    const response = await request(app)
      .get('/api/fooddelivery/rest-1/recommendations')
      .query({ limit: 3, cart: JSON.stringify([{ id: 'item-1', quantity: 1 }]) });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(foodStore.getRestaurantRecommendations).toHaveBeenCalledWith({
      restaurantId: 'rest-1',
      cartItems: [{ id: 'item-1', quantity: 1 }],
      limit: '3',
    });
  });

  test('POST /api/fooddelivery/restaurants/:restaurantId/orders/:orderId/assign-rider assigns a rider', async () => {
    foodStore.assignRiderToOrder.mockResolvedValue({
      _id: 'order-1',
      orderStatus: 'confirmed',
      driverProfile: { name: 'Aparna' },
    });

    const response = await request(app)
      .post('/api/fooddelivery/restaurants/rest-1/orders/order-1/assign-rider')
      .send({});

    expect(response.status).toBe(200);
    expect(foodStore.assignRiderToOrder).toHaveBeenCalledWith({
      orderId: 'order-1',
      restaurantId: 'rest-1',
      riderId: undefined,
      updatedBy: 'owner@example.com',
    });
  });

  test('PUT /api/fooddelivery/restaurants/:restaurantId/availability updates restaurant operations state', async () => {
    foodStore.updateRestaurantAvailability.mockResolvedValue({
      id: 'rest-1',
      open: false,
      avgPreparationTime: '25 mins',
    });

    const response = await request(app)
      .put('/api/fooddelivery/restaurants/rest-1/availability')
      .send({ open: false, avgPreparationTime: '25 mins' });

    expect(response.status).toBe(200);
    expect(foodStore.updateRestaurantAvailability).toHaveBeenCalledWith({
      restaurantId: 'rest-1',
      open: false,
      avgPreparationTime: '25 mins',
      lat: undefined,
      lng: undefined,
      address: undefined,
      zone: undefined,
      updatedBy: 'owner@example.com',
      actor: expect.objectContaining({
        userId: 'user-1',
        email: 'owner@example.com',
      }),
    });
  });

  test('PUT /api/fooddelivery/restaurants/:restaurantId/menu/:itemId/availability updates item availability', async () => {
    foodStore.updateMenuItemAvailability.mockResolvedValue({
      id: 'item-1',
      available: false,
    });

    const response = await request(app)
      .put('/api/fooddelivery/restaurants/rest-1/menu/item-1/availability')
      .send({ available: false, prepTime: 18 });

    expect(response.status).toBe(200);
    expect(foodStore.updateMenuItemAvailability).toHaveBeenCalledWith({
      restaurantId: 'rest-1',
      itemId: 'item-1',
      available: false,
      prepTime: 18,
      updatedBy: 'owner@example.com',
      actor: expect.objectContaining({
        userId: 'user-1',
        email: 'owner@example.com',
      }),
    });
  });

  test('GET /api/fooddelivery/restaurants/:restaurantId/governance returns governance details', async () => {
    foodStore.getRestaurantGovernance.mockResolvedValue({
      restaurant: { id: 'rest-1', ownerId: 'user-1' },
      teamMembers: [{ id: 'member-1', email: 'ops@example.com', role: 'manager' }],
      recentAuditLog: [{ id: 'audit-1', summary: 'Added ops@example.com as manager' }],
    });

    const response = await request(app).get('/api/fooddelivery/restaurants/rest-1/governance');

    expect(response.status).toBe(200);
    expect(response.body.data.teamMembers).toHaveLength(1);
    expect(foodStore.getRestaurantGovernance).toHaveBeenCalledWith({
      restaurantId: 'rest-1',
    });
  });

  test('POST /api/fooddelivery/restaurants/:restaurantId/team saves governance access', async () => {
    foodStore.upsertRestaurantTeamMember.mockResolvedValue({
      restaurant: { id: 'rest-1', ownerId: 'user-1' },
      teamMembers: [{ id: 'member-1', email: 'ops@example.com', role: 'manager' }],
      recentAuditLog: [],
    });

    const response = await request(app)
      .post('/api/fooddelivery/restaurants/rest-1/team')
      .send({ email: 'ops@example.com', role: 'manager', status: 'active' });

    expect(response.status).toBe(201);
    expect(foodStore.upsertRestaurantTeamMember).toHaveBeenCalledWith({
      restaurantId: 'rest-1',
      memberId: undefined,
      userId: undefined,
      email: 'ops@example.com',
      name: undefined,
      role: 'manager',
      permissions: undefined,
      status: 'active',
      actor: expect.objectContaining({
        userId: 'user-1',
        email: 'owner@example.com',
      }),
    });
  });

  test('GET /api/fooddelivery/orders/:orderId/tracking returns tracking for accessible users', async () => {
    foodStore.getOrderById.mockResolvedValue({
      _id: 'order-1',
      customerId: 'user-1',
      restaurantId: 'rest-1',
    });
    foodStore.getOrderTracking.mockResolvedValue({
      orderId: 'order-1',
      tracking: { status: 'assigned' },
    });

    const response = await request(app).get('/api/fooddelivery/orders/order-1/tracking');

    expect(response.status).toBe(200);
    expect(response.body.data.tracking.status).toBe('assigned');
  });

  test('POST /api/fooddelivery/orders/:orderId/disputes creates a dispute', async () => {
    foodStore.getOrderById.mockResolvedValue({
      _id: 'order-1',
      customerId: 'user-1',
      restaurantId: 'rest-1',
    });
    foodStore.createOrderDispute.mockResolvedValue({
      id: 'dispute-1',
      issueType: 'late_delivery',
      status: 'open',
    });

    const response = await request(app)
      .post('/api/fooddelivery/orders/order-1/disputes')
      .send({ issueType: 'late_delivery', description: 'Food arrived late.' });

    expect(response.status).toBe(201);
    expect(foodStore.createOrderDispute).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        issueType: 'late_delivery',
      })
    );
  });

  test('PUT /api/fooddelivery/riders/orders/:orderId/location updates rider location', async () => {
    foodStore.updateRiderLocation.mockResolvedValue({
      _id: 'order-1',
      orderStatus: 'out-for-delivery',
      tracking: { status: 'nearby' },
    });

    const response = await request(app)
      .put('/api/fooddelivery/riders/orders/order-1/location')
      .set('x-test-role', 'rider')
      .send({ lat: 9.93, lng: 76.26, accuracy: 12, speed: 20 });

    expect(response.status).toBe(200);
    expect(foodStore.updateRiderLocation).toHaveBeenCalledWith({
      orderId: 'order-1',
      userId: 'user-1',
      lat: 9.93,
      lng: 76.26,
      accuracy: 12,
      speed: 20,
    });
  });

  test('POST /api/fooddelivery/riders/orders/:orderId/sos raises rider SOS', async () => {
    foodStore.triggerRiderSos.mockResolvedValue({
      _id: 'order-1',
      riderSafety: { activeSos: true },
    });

    const response = await request(app)
      .post('/api/fooddelivery/riders/orders/order-1/sos')
      .set('x-test-role', 'rider')
      .send({ message: 'Need help', lat: 9.93, lng: 76.26 });

    expect(response.status).toBe(200);
    expect(foodStore.triggerRiderSos).toHaveBeenCalledWith({
      orderId: 'order-1',
      userId: 'user-1',
      message: 'Need help',
      lat: 9.93,
      lng: 76.26,
    });
  });

  test('PUT /api/fooddelivery/riders/orders/:orderId/status updates rider delivery status', async () => {
    foodStore.updateRiderOrderStatus.mockResolvedValue({
      _id: 'order-1',
      orderStatus: 'delivered',
    });

    const response = await request(app)
      .put('/api/fooddelivery/riders/orders/order-1/status')
      .set('x-test-role', 'rider')
      .send({ status: 'delivered' });

    expect(response.status).toBe(200);
    expect(foodStore.updateRiderOrderStatus).toHaveBeenCalledWith({
      orderId: 'order-1',
      userId: 'user-1',
      status: 'delivered',
      updatedBy: 'owner@example.com',
    });
  });

  test('GET /api/fooddelivery/admin/dashboard returns admin metrics', async () => {
    foodStore.getAdminDashboard.mockResolvedValue({
      totalOrders: 18,
      openDisputes: 2,
    });

    const response = await request(app)
      .get('/api/fooddelivery/admin/dashboard')
      .set('x-test-role', 'admin');

    expect(response.status).toBe(200);
    expect(response.body.data.totalOrders).toBe(18);
  });

  test('GET /api/fooddelivery/admin/audit-log returns audit activity', async () => {
    foodStore.getAdminAuditLog.mockResolvedValue([
      { id: 'audit-1', summary: 'Restaurant marked closed' },
    ]);

    const response = await request(app)
      .get('/api/fooddelivery/admin/audit-log')
      .set('x-test-role', 'admin');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(foodStore.getAdminAuditLog).toHaveBeenCalledWith({
      restaurantId: '',
      action: '',
      limit: 50,
    });
  });
});
