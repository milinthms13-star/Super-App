jest.mock('../models/Driver', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock('../models/MenuItem', () => ({
  findById: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  insertMany: jest.fn(),
}));

jest.mock('../models/FoodOrder', () => {
  const FoodOrder = jest.fn(function FoodOrder(payload = {}) {
    Object.assign(this, payload);
    this._id = this._id || 'order-1';
    this.save = jest.fn().mockResolvedValue(this);
  });
  FoodOrder.find = jest.fn();
  FoodOrder.findById = jest.fn();
  FoodOrder.countDocuments = jest.fn();
  return FoodOrder;
});

jest.mock('../models/FoodDeliveryNotification', () =>
  jest.fn(function FoodDeliveryNotification(payload = {}) {
    Object.assign(this, payload);
    this.save = jest.fn().mockResolvedValue(this);
  })
);

jest.mock('../models/Restaurant', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock('../models/User', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../models/Coupon', () => ({
  findOne: jest.fn(),
}));

jest.mock('./devAuthStore', () => ({
  findUserById: jest.fn(),
  updateUserById: jest.fn(),
}));

jest.mock('./wallet', () => ({
  getWalletBalance: jest.fn(),
  deductWalletBalance: jest.fn(),
  creditWallet: jest.fn(),
}));

jest.mock('../config/websocket', () => ({
  io: jest.fn(() => true),
  emitToUser: jest.fn(),
  broadcast: jest.fn(),
}));

const Driver = require('../models/Driver');
const MenuItem = require('../models/MenuItem');
const FoodOrder = require('../models/FoodOrder');
const Restaurant = require('../models/Restaurant');
const Coupon = require('../models/Coupon');
const devAuthStore = require('./devAuthStore');
const walletUtils = require('./wallet');
const websocket = require('../config/websocket');

const {
  addItemToCart,
  getCartForUser,
  getCheckoutSummary,
  createOrderFromCart,
  getManagedRestaurants,
  upsertRestaurantTeamMember,
  assignRiderToOrder,
  updateRiderLocation,
  triggerRiderSos,
  createOrderDispute,
  updateOrderDispute,
  getAdminAuditLog,
  serializeOrder,
} = require('./foodStore');

describe('foodStore priority 4 behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AUTH_STORAGE = 'memory';
    process.env.NODE_ENV = 'development';
    FoodOrder.countDocuments.mockResolvedValue(0);
    Driver.countDocuments.mockResolvedValue(0);
    Restaurant.countDocuments.mockResolvedValue(0);
    walletUtils.getWalletBalance.mockResolvedValue(0);
    walletUtils.deductWalletBalance.mockResolvedValue(true);
    walletUtils.creditWallet.mockResolvedValue(true);
    Restaurant.findById.mockImplementation(() => {
      const restaurantData = {
        _id: 'rest-1',
        ownerId: 'owner-1',
        name: 'Malabar Meals',
        location: {
          lat: 9.9312,
          lng: 76.2673,
          address: 'Fort Kochi',
        },
      };

      return {
        lean: jest.fn().mockResolvedValue(restaurantData),
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(restaurantData),
        }),
      };
    });
  });

  test('persists food cart into user-backed auth storage', async () => {
    devAuthStore.findUserById.mockResolvedValue({
      _id: 'user-1',
      preferences: {},
    });
    devAuthStore.updateUserById.mockResolvedValue({
      _id: 'user-1',
      preferences: {
        foodDeliveryCart: {
          restaurantId: 'rest-1',
          items: [{ id: 'item-1', menuItemId: 'item-1', name: 'Dosa', price: 120, quantity: 2 }],
        },
      },
    });
    MenuItem.findById.mockResolvedValue({
      _id: 'item-1',
      restaurantId: 'rest-1',
      name: 'Dosa',
      price: 120,
      vegetarian: true,
      prepTime: 12,
      imageUrl: 'dosa.png',
    });

    const cart = await addItemToCart({
      userId: 'user-1',
      restaurantId: 'rest-1',
      itemId: 'item-1',
      quantity: 2,
    });

    expect(cart.total).toBe(240);
    expect(cart.itemCount).toBe(2);
  });

  test('reads persisted cart for the selected restaurant', async () => {
    devAuthStore.findUserById.mockResolvedValue({
      _id: 'user-1',
      preferences: {
        foodDeliveryCart: {
          restaurantId: 'rest-1',
          items: [
            {
              id: 'item-1',
              menuItemId: 'item-1',
              name: 'Dosa',
              price: 120,
              quantity: 2,
            },
          ],
        },
      },
    });

    const cart = await getCartForUser({
      userId: 'user-1',
      restaurantId: 'rest-1',
    });

    expect(cart.restaurantId).toBe('rest-1');
    expect(cart.total).toBe(240);
  });

  test('builds checkout summary with coupon, fee, gst and tip', async () => {
    Coupon.findOne.mockResolvedValue({
      code: 'SAVE10',
      isActive: true,
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 100,
      maxUses: 0,
      perUserUses: 0,
    });
    MenuItem.find.mockResolvedValue([
      {
        _id: 'item-1',
        restaurantId: 'rest-1',
        name: 'Dosa',
        price: 200,
        available: true,
        category: 'main',
        vegetarian: true,
        prepTime: 12,
      },
    ]);

    const summary = await getCheckoutSummary({
      userId: 'user-1',
      restaurantId: 'rest-1',
      cartItems: [{ id: 'item-1', quantity: 2 }],
      couponCode: 'SAVE10',
      paymentMethod: 'cod',
      tipAmount: 20,
      currentUser: { email: 'user@example.com' },
    });

    expect(summary.subtotal).toBe(400);
    expect(summary.discountAmount).toBe(40);
    expect(summary.totalAmount).toBe(422);
    expect(summary.isValid).toBe(true);
  });

  test('supports variants, scheduled delivery, loyalty redemption, and referral hooks in checkout summary', async () => {
    devAuthStore.findUserById.mockResolvedValue({
      _id: 'user-1',
      email: 'user@example.com',
      preferences: {
        foodDeliveryRewards: {
          pointsBalance: 120,
          referralCode: 'FDSELF2024',
        },
      },
    });
    MenuItem.find.mockResolvedValue([
      {
        _id: 'item-1',
        restaurantId: 'rest-1',
        name: 'Biryani',
        price: 220,
        available: true,
        category: 'main',
        vegetarian: false,
        prepTime: 18,
        popularityScore: 10,
        variants: [
          { id: 'half', name: 'Half', priceModifier: -40, prepTimeModifier: -2, available: true },
          { id: 'full', name: 'Full', priceModifier: 0, prepTimeModifier: 0, available: true },
        ],
        addons: [
          { id: 'egg', name: 'Egg', price: 20, prepTimeModifier: 1, available: true },
        ],
      },
    ]);

    const scheduledFor = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const summary = await getCheckoutSummary({
      userId: 'user-1',
      restaurantId: 'rest-1',
      cartItems: [{ id: 'item-1', quantity: 2, variantId: 'half', addonIds: ['egg'] }],
      paymentMethod: 'upi',
      rewardPointsToRedeem: 50,
      referralCode: 'FDREFER99',
      scheduledFor,
      currentUser: { email: 'user@example.com' },
    });

    expect(summary.items[0].selectedVariant?.id).toBe('half');
    expect(summary.items[0].selectedAddons).toHaveLength(1);
    expect(summary.loyalty.pointsRedeemed).toBe(50);
    expect(summary.referral.referralCodeApplied).toBe('FDREFER99');
    expect(summary.isScheduled).toBe(true);
    expect(summary.etaSnapshot.totalMinutes).toBeGreaterThan(0);
  });

  test('creates wallet-backed order, initializes tracking, and deducts wallet balance', async () => {
    walletUtils.getWalletBalance.mockResolvedValue(500);
    devAuthStore.findUserById.mockImplementation(async (userId) => {
      if (userId === 'user-1') {
        return { _id: 'user-1', email: 'user@example.com', preferences: {} };
      }
      if (userId === 'owner-1') {
        return { _id: 'owner-1', email: 'owner@example.com', preferences: {} };
      }
      return null;
    });
    devAuthStore.updateUserById.mockResolvedValue(true);
    MenuItem.find.mockResolvedValue([
      {
        _id: 'item-1',
        restaurantId: 'rest-1',
        name: 'Dosa',
        price: 200,
        available: true,
        category: 'main',
        vegetarian: true,
        prepTime: 12,
      },
    ]);

    const order = await createOrderFromCart({
      userId: 'user-1',
      restaurantId: 'rest-1',
      cartItems: [{ id: 'item-1', quantity: 2 }],
      paymentMethod: 'wallet',
      currentUser: { email: 'user@example.com' },
    });

    expect(walletUtils.deductWalletBalance).toHaveBeenCalledWith(
      'user@example.com',
      444,
      'order-1',
      'Food delivery checkout'
    );
    expect(order.tracking.status).toBe('unassigned');
    expect(websocket.emitToUser).toHaveBeenCalled();
  });

  test('auto assigns a rider and marks the rider busy', async () => {
    const saveOrder = jest.fn().mockResolvedValue(true);
    const saveDriver = jest.fn().mockResolvedValue(true);
    const order = {
      _id: 'order-1',
      restaurantId: 'rest-1',
      customerId: 'user-1',
      deliveryAddress: { street: 'MG Road', city: 'Kochi', pincode: '682001', lat: 9.95, lng: 76.28 },
      orderStatus: 'confirmed',
      statusTimeline: [],
      save: saveOrder,
    };
    const driver = {
      _id: 'driver-1',
      userId: 'driver-user-1',
      isOnline: true,
      availabilityStatus: 'available',
      serviceTypes: ['fooddelivery'],
      currentLat: 9.932,
      currentLng: 76.268,
      currentOrderId: null,
      rating: 4.8,
      vehicleNumber: 'KL-07-AA-9999',
      vehicleType: 'bike',
      documents: { verified: true },
      foodDeliveryStats: { assignedOrders: 2 },
      save: saveDriver,
    };

    FoodOrder.findById.mockResolvedValue(order);
    Driver.find.mockResolvedValue([driver]);
    devAuthStore.findUserById.mockImplementation(async (userId) => {
      if (userId === 'driver-user-1') {
        return { _id: 'driver-user-1', name: 'Aparna', email: 'rider@example.com', phone: '99999' };
      }
      if (userId === 'owner-1') {
        return { _id: 'owner-1', name: 'Owner', email: 'owner@example.com' };
      }
      return { _id: 'user-1', name: 'Customer', email: 'customer@example.com' };
    });

    const updatedOrder = await assignRiderToOrder({
      orderId: 'order-1',
      restaurantId: 'rest-1',
      updatedBy: 'owner@example.com',
    });

    expect(updatedOrder.driverId).toBe('driver-1');
    expect(updatedOrder.driverProfile.name).toBe('Aparna');
    expect(updatedOrder.tracking.status).toBe('assigned');
    expect(driver.currentOrderId).toBe('order-1');
    expect(driver.availabilityStatus).toBe('busy');
    expect(saveDriver).toHaveBeenCalled();
  });

  test('updates rider location and computes tracking metrics', async () => {
    const saveOrder = jest.fn().mockResolvedValue(true);
    const saveDriver = jest.fn().mockResolvedValue(true);
    const driver = {
      _id: 'driver-1',
      userId: 'driver-user-1',
      isOnline: true,
      availabilityStatus: 'busy',
      currentOrderId: 'order-1',
      save: saveDriver,
    };
    const order = {
      _id: 'order-1',
      restaurantId: 'rest-1',
      customerId: 'user-1',
      driverId: 'driver-1',
      orderStatus: 'out-for-delivery',
      deliveryAddress: { street: 'MG Road', city: 'Kochi', pincode: '682001', lat: 9.95, lng: 76.28 },
      tracking: {
        status: 'assigned',
        routeHistory: [],
      },
      save: saveOrder,
    };

    Driver.findOne.mockResolvedValue(driver);
    FoodOrder.findById.mockResolvedValue(order);

    const updatedOrder = await updateRiderLocation({
      orderId: 'order-1',
      userId: 'driver-user-1',
      lat: 9.945,
      lng: 76.275,
      accuracy: 10,
      speed: 24,
    });

    expect(updatedOrder.tracking.status).toMatch(/on-the-way|nearby|arrived/);
    expect(updatedOrder.tracking.routeHistory).toHaveLength(1);
    expect(updatedOrder.tracking.distanceToCustomerKm).toBeGreaterThanOrEqual(0);
    expect(saveOrder).toHaveBeenCalled();
    expect(saveDriver).toHaveBeenCalled();
  });

  test('raises rider SOS and marks the order as active SOS', async () => {
    const saveOrder = jest.fn().mockResolvedValue(true);
    const driver = {
      _id: 'driver-1',
      userId: 'driver-user-1',
      isOnline: true,
      availabilityStatus: 'busy',
      currentOrderId: 'order-1',
      currentLat: 9.944,
      currentLng: 76.272,
    };
    const order = {
      _id: 'order-1',
      restaurantId: 'rest-1',
      customerId: 'user-1',
      driverId: 'driver-1',
      orderStatus: 'out-for-delivery',
      riderSafety: { activeSos: false, sosEvents: [] },
      statusTimeline: [],
      save: saveOrder,
    };

    Driver.findOne.mockResolvedValue(driver);
    FoodOrder.findById.mockResolvedValue(order);

    const updatedOrder = await triggerRiderSos({
      orderId: 'order-1',
      userId: 'driver-user-1',
      message: 'Flat tyre, need help',
      lat: 9.945,
      lng: 76.273,
    });

    expect(updatedOrder.riderSafety.activeSos).toBe(true);
    expect(updatedOrder.riderSafety.sosEvents).toHaveLength(1);
    expect(websocket.broadcast).toHaveBeenCalledWith(
      'fooddelivery:rider:sos',
      expect.objectContaining({ orderId: 'order-1' })
    );
  });

  test('creates and resolves a dispute on an order', async () => {
    const saveOrder = jest.fn().mockResolvedValue(true);
    const order = {
      _id: 'order-1',
      restaurantId: 'rest-1',
      customerId: 'user-1',
      orderStatus: 'delivered',
      disputes: [],
      statusTimeline: [],
      save: saveOrder,
    };

    FoodOrder.findById.mockResolvedValue(order);

    const dispute = await createOrderDispute({
      orderId: 'order-1',
      issueType: 'quality_issue',
      description: 'Food was cold',
      createdByUserId: 'user-1',
      createdByRole: 'customer',
      createdByName: 'Customer',
    });

    expect(dispute.issueType).toBe('quality_issue');
    expect(order.disputes).toHaveLength(1);

    const resolved = await updateOrderDispute({
      orderId: 'order-1',
      disputeId: dispute.id,
      status: 'resolved',
      resolutionNote: 'Refund provided',
      updatedBy: 'admin@example.com',
    });

    expect(resolved.status).toBe('resolved');
    expect(order.disputes[0].resolutionNote).toBe('Refund provided');
  });

  test('returns managed restaurants for owner-scoped governance access', async () => {
    Restaurant.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        { _id: 'rest-1', ownerId: 'owner-1', name: 'Owned Kitchen', cuisine: 'Kerala' },
        {
          _id: 'rest-2',
          ownerId: 'someone-else',
          name: 'Other Kitchen',
          cuisine: 'North Indian',
          teamMembers: [{ id: 'member-1', email: 'ops@example.com', role: 'manager', status: 'active' }],
        },
      ]),
    });

    const restaurants = await getManagedRestaurants({
      userId: 'owner-1',
      currentUser: { id: 'owner-1', role: 'restaurant', email: 'owner@example.com' },
    });

    expect(restaurants).toHaveLength(1);
    expect(restaurants[0].name).toBe('Owned Kitchen');
  });

  test('upserts restaurant team members and records an audit entry', async () => {
    const saveRestaurant = {
      _id: 'rest-1',
      ownerId: 'owner-1',
      name: 'Malabar Meals',
      teamMembers: [],
      operationsAuditLog: [],
      save: jest.fn().mockResolvedValue(true),
    };

    Restaurant.findById
      .mockResolvedValueOnce(saveRestaurant)
      .mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue({
          _id: 'rest-1',
          ownerId: 'owner-1',
          name: 'Malabar Meals',
          teamMembers: saveRestaurant.teamMembers,
          operationsAuditLog: saveRestaurant.operationsAuditLog,
        }),
      });

    const governance = await upsertRestaurantTeamMember({
      restaurantId: 'rest-1',
      email: 'ops@example.com',
      name: 'Ops Lead',
      role: 'manager',
      actor: {
        userId: 'owner-1',
        name: 'Owner',
        role: 'owner',
      },
    });

    expect(saveRestaurant.save).toHaveBeenCalled();
    expect(saveRestaurant.teamMembers).toHaveLength(1);
    expect(saveRestaurant.operationsAuditLog).toHaveLength(1);
    expect(governance.teamMembers[0].email).toBe('ops@example.com');
  });

  test('aggregates admin audit log entries from restaurant governance and order timelines', async () => {
    Restaurant.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: 'rest-1',
            name: 'Malabar Meals',
            operationsAuditLog: [
              {
                id: 'audit-1',
                action: 'restaurant.availability_updated',
                summary: 'Restaurant marked open',
                performedByName: 'Owner',
                timestamp: new Date('2026-05-08T10:00:00.000Z'),
              },
            ],
          },
        ]),
      }),
    });
    FoodOrder.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              {
                _id: 'order-1',
                restaurantId: 'rest-1',
                orderStatus: 'confirmed',
                statusTimeline: [
                  {
                    status: 'confirmed',
                    note: 'Order confirmed',
                    updatedBy: 'owner@example.com',
                    timestamp: new Date('2026-05-08T09:30:00.000Z'),
                  },
                ],
              },
            ]),
          }),
        }),
      }),
    });

    const auditLog = await getAdminAuditLog({ limit: 10 });

    expect(auditLog).toHaveLength(2);
    expect(auditLog.some((entry) => entry.source === 'restaurant')).toBe(true);
    expect(auditLog.some((entry) => entry.source === 'order')).toBe(true);
  });

  test('serializeOrder returns consistent frontend-friendly fields for ops flows', () => {
    const order = serializeOrder({
      _id: 'order-1',
      restaurantId: 'rest-1',
      customerId: 'user-1',
      driverId: 'driver-1',
      orderStatus: 'out-for-delivery',
      subtotal: 400,
      deliveryCharge: 19,
      taxAmount: 18,
      totalAmount: 444,
      walletUsed: 100,
      isScheduled: true,
      scheduledWindowLabel: '08 May, 07:00 PM - 07:30 PM',
      etaSnapshot: { totalMinutes: 34, routeStrategy: 'balanced', trafficMultiplier: 1.2 },
      loyalty: { pointsEarned: 8, pointsRedeemed: 25 },
      riderSafety: { activeSos: true, sosEvents: [{ id: 'sos-1', message: 'Help' }] },
      driverProfile: { id: 'driver-1', userId: 'driver-user-1', name: 'Aparna' },
      tracking: { status: 'nearby', distanceToCustomerKm: 0.6 },
      disputes: [{ id: 'dispute-1', status: 'open', issueType: 'late_delivery' }],
      items: [{
        menuItemId: 'item-1',
        quantity: 3,
        price: 120,
        basePrice: 110,
        selectedVariant: { id: 'full', name: 'Full', priceModifier: 10 },
        selectedAddons: [{ id: 'egg', name: 'Egg', price: 10 }],
      }],
    });

    expect(order.driverProfile.name).toBe('Aparna');
    expect(order.tracking.status).toBe('nearby');
    expect(order.activeDisputeCount).toBe(1);
    expect(order.isScheduled).toBe(true);
    expect(order.loyalty.pointsEarned).toBe(8);
    expect(order.riderSafety.activeSos).toBe(true);
  });
});
