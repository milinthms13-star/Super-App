const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');
const Restaurant = require('../models/Restaurant');
const {
  getRestaurants,
  getManagedRestaurants,
  getRestaurantGovernance,
  getMenuByRestaurant,
  addItemToCart,
  getCartForUser,
  clearCartForUser,
  getCheckoutSummary,
  getRewardsSummary,
  getRestaurantRecommendations,
  createOrder,
  createOrderFromCart,
  getOrdersByCustomer,
  getOrderById,
  getRestaurantOrders,
  getRiderActiveOrders,
  getOrderTracking,
  createOrUpdateRiderProfile,
  updateRiderAvailability,
  assignRiderToOrder,
  updateRiderLocation,
  triggerRiderSos,
  updateRiderOrderStatus,
  updateOrderStatus,
  updateRestaurantOrderStatus,
  cancelOrder,
  updateRestaurantAvailability,
  updateMenuItemAvailability,
  upsertRestaurantTeamMember,
  createOrderDispute,
  updateOrderDispute,
  getAdminDashboard,
  getAdminOrders,
  getAdminAuditLog,
  RESTAURANT_PERMISSION_CATALOG,
  RESTAURANT_TEAM_ROLE_PERMISSIONS,
  serializeRestaurant,
  serializeMenuItem,
  serializeCart,
  serializeOrder,
  serializeDriver,
} = require('../utils/foodStore');

const rateLimiter = createModerateRateLimiter();

const getAuthenticatedUserId = (req) =>
  String(req.user?.id || req.user?._id || req.auth?.sub || '');

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();
const dedupeStrings = (values = []) => Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));

const getRoleSet = (req) => {
  const values = [
    req.user?.role,
    req.user?.registrationType,
    ...(Array.isArray(req.user?.roles) ? req.user.roles : []),
  ];

  return new Set(
    values
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase())
  );
};

const hasRestaurantPrivileges = (req) => {
  const roleSet = getRoleSet(req);
  return ['admin', 'entrepreneur', 'restaurant', 'seller', 'business', 'owner'].some((role) =>
    roleSet.has(role)
  );
};

const hasAdminPrivileges = (req) => {
  const roleSet = getRoleSet(req);
  return ['admin', 'superadmin', 'operations', 'support'].some((role) => roleSet.has(role));
};

const hasRiderPrivileges = (req) => {
  const roleSet = getRoleSet(req);
  return ['rider', 'driver', 'delivery', 'delivery-partner'].some((role) => roleSet.has(role));
};

const getActorContext = (req) => {
  const roleSet = getRoleSet(req);
  const primaryRole =
    [req.user?.role, req.user?.registrationType, ...(Array.isArray(req.user?.roles) ? req.user.roles : [])]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase())[0] || 'restaurant';

  return {
    userId: getAuthenticatedUserId(req),
    email: normalizeEmail(req.user?.email),
    name: req.user?.name || req.user?.fullName || req.user?.email || 'Restaurant operator',
    role: primaryRole,
    roleSet,
  };
};

const hasClaimedRestaurantGovernance = (restaurant = {}) =>
  Boolean(normalizeValue(restaurant.ownerId)) ||
  (Array.isArray(restaurant.teamMembers)
    ? restaurant.teamMembers.some(
        (member) => String(member?.status || 'active').trim().toLowerCase() !== 'inactive'
      )
    : false);

const getRestaurantPermissionSet = (req, restaurant) => {
  if (!restaurant) {
    return new Set();
  }

  if (hasAdminPrivileges(req)) {
    return new Set(Object.keys(RESTAURANT_PERMISSION_CATALOG));
  }

  const actor = getActorContext(req);
  if (normalizeValue(restaurant.ownerId) === actor.userId) {
    return new Set(RESTAURANT_TEAM_ROLE_PERMISSIONS.owner || []);
  }

  const matchingMember = Array.isArray(restaurant.teamMembers)
    ? restaurant.teamMembers.find((member) => {
        const isActive = String(member?.status || 'active').trim().toLowerCase() !== 'inactive';
        if (!isActive) {
          return false;
        }

        return (
          (actor.userId && normalizeValue(member.userId) === actor.userId) ||
          (actor.email && normalizeEmail(member.email) === actor.email)
        );
      })
    : null;

  if (matchingMember) {
    return new Set(
      dedupeStrings([
        ...(RESTAURANT_TEAM_ROLE_PERMISSIONS[String(matchingMember.role || '').trim().toLowerCase()] || []),
        ...(Array.isArray(matchingMember.permissions) ? matchingMember.permissions : []),
      ])
    );
  }

  if (!hasClaimedRestaurantGovernance(restaurant) && hasRestaurantPrivileges(req)) {
    return new Set(RESTAURANT_TEAM_ROLE_PERMISSIONS.owner || []);
  }

  return new Set();
};

const canAccessRestaurantRecord = (req, restaurant, permission = '') => {
  const permissionSet = getRestaurantPermissionSet(req, restaurant);
  if (!permission) {
    return permissionSet.size > 0;
  }

  return permissionSet.has(permission);
};

const canAccessRestaurant = async (req, restaurantId, permission = '') => {
  const restaurant = await Restaurant.findById(restaurantId).lean();
  if (!restaurant) {
    return false;
  }

  return canAccessRestaurantRecord(req, restaurant, permission);
};

const normalizeValue = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'object') {
    return String(value._id || value.id || '');
  }

  return String(value);
};

const canAccessOrder = async (req, order) => {
  const userId = getAuthenticatedUserId(req);

  if (!userId || !order) {
    return false;
  }

  if (normalizeValue(order.customerId) === userId) {
    return true;
  }

  if (normalizeValue(order.driverProfile?.userId) === userId) {
    return true;
  }

  if (hasAdminPrivileges(req)) {
    return true;
  }

  if (await canAccessRestaurant(req, order.restaurantId, 'orders:view')) {
    return true;
  }

  return false;
};

// GET /api/fooddelivery/restaurants
router.get('/restaurants', rateLimiter, async (req, res) => {
  try {
    const restaurants = await getRestaurants(req.query);
    res.json({ success: true, data: restaurants.map(serializeRestaurant) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/fooddelivery/restaurants/managed
router.get('/restaurants/managed', authenticate, async (req, res) => {
  try {
    const restaurants = await getManagedRestaurants({
      userId: getAuthenticatedUserId(req),
      currentUser: req.user,
      permission: 'orders:view',
    });

    res.json({ success: true, data: restaurants });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/fooddelivery/admin/dashboard
router.get('/admin/dashboard', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view food admin dashboard' });
    }

    const dashboard = await getAdminDashboard();
    res.json({ success: true, data: dashboard });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/fooddelivery/admin/orders
router.get('/admin/orders', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view food admin orders' });
    }

    const orders = await getAdminOrders({
      status: req.query.status || '',
      paymentStatus: req.query.paymentStatus || '',
      restaurantId: req.query.restaurantId || '',
      riderId: req.query.riderId || '',
      disputeStatus: req.query.disputeStatus || '',
      unassignedOnly: String(req.query.unassignedOnly || '').toLowerCase() === 'true',
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/fooddelivery/admin/audit-log
router.get('/admin/audit-log', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view food admin audit log' });
    }

    const auditLog = await getAdminAuditLog({
      restaurantId: req.query.restaurantId || '',
      action: req.query.action || '',
      limit: req.query.limit || 50,
    });

    res.json({ success: true, data: auditLog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/fooddelivery/rewards/me
router.get('/rewards/me', authenticate, async (req, res) => {
  try {
    const rewards = await getRewardsSummary({
      userId: getAuthenticatedUserId(req),
      currentUser: req.user,
    });

    res.json({ success: true, data: rewards });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/fooddelivery/riders/profile
router.post('/riders/profile', authenticate, async (req, res) => {
  try {
    const rider = await createOrUpdateRiderProfile({
      userId: getAuthenticatedUserId(req),
      vehicleNumber: req.body.vehicleNumber,
      vehicleType: req.body.vehicleType,
      vehicleColor: req.body.vehicleColor,
      licenseNumber: req.body.licenseNumber,
      serviceArea: req.body.serviceArea,
      currentLat: req.body.currentLat,
      currentLng: req.body.currentLng,
      emergencyContact: req.body.emergencyContact,
      documents: req.body.documents,
      isOnline: Boolean(req.body.isOnline),
    });

    res.status(201).json({ success: true, data: serializeDriver(rider) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/fooddelivery/riders/me/availability
router.put('/riders/me/availability', authenticate, async (req, res) => {
  try {
    const rider = await updateRiderAvailability({
      userId: getAuthenticatedUserId(req),
      isOnline: req.body.isOnline,
      currentLat: req.body.currentLat,
      currentLng: req.body.currentLng,
    });

    res.json({ success: true, data: serializeDriver(rider) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/fooddelivery/riders/me/orders
router.get('/riders/me/orders', authenticate, async (req, res) => {
  try {
    if (!hasRiderPrivileges(req) && !req.query.allowProfileBootstrap) {
      // Allowing profile bootstrap through the profile endpoint keeps this check intentional.
    }

    const data = await getRiderActiveOrders({
      userId: getAuthenticatedUserId(req),
      includeCompleted: String(req.query.includeCompleted || '').toLowerCase() === 'true',
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/fooddelivery/riders/orders/:orderId/location
router.put('/riders/orders/:orderId/location', authenticate, async (req, res) => {
  try {
    const updatedOrder = await updateRiderLocation({
      orderId: req.params.orderId,
      userId: getAuthenticatedUserId(req),
      lat: req.body.lat,
      lng: req.body.lng,
      accuracy: req.body.accuracy,
      speed: req.body.speed,
    });

    res.json({ success: true, data: serializeOrder(updatedOrder) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/fooddelivery/riders/orders/:orderId/sos
router.post('/riders/orders/:orderId/sos', authenticate, async (req, res) => {
  try {
    const updatedOrder = await triggerRiderSos({
      orderId: req.params.orderId,
      userId: getAuthenticatedUserId(req),
      message: req.body.message,
      lat: req.body.lat,
      lng: req.body.lng,
    });

    res.json({ success: true, data: serializeOrder(updatedOrder) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/fooddelivery/riders/orders/:orderId/status
router.put('/riders/orders/:orderId/status', authenticate, async (req, res) => {
  try {
    const updatedOrder = await updateRiderOrderStatus({
      orderId: req.params.orderId,
      userId: getAuthenticatedUserId(req),
      status: req.body.status,
      updatedBy: req.user?.email || 'rider',
    });

    res.json({ success: true, data: serializeOrder(updatedOrder) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/fooddelivery/restaurants/:restaurantId/governance
router.get('/restaurants/:restaurantId/governance', authenticate, async (req, res) => {
  try {
    const canViewGovernance =
      (await canAccessRestaurant(req, req.params.restaurantId, 'audit:view')) ||
      (await canAccessRestaurant(req, req.params.restaurantId, 'team:manage'));

    if (!canViewGovernance) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view restaurant governance' });
    }

    const governance = await getRestaurantGovernance({
      restaurantId: req.params.restaurantId,
    });

    res.json({
      success: true,
      data: {
        ...governance,
        currentUserPermissions: Array.from(
          getRestaurantPermissionSet(req, {
            ...governance.restaurant,
            teamMembers: governance.teamMembers,
          })
        ),
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/fooddelivery/restaurants/:restaurantId/team
router.post('/restaurants/:restaurantId/team', authenticate, async (req, res) => {
  try {
    const hasAccess = await canAccessRestaurant(req, req.params.restaurantId, 'team:manage');
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Unauthorized to manage restaurant staff' });
    }

    const governance = await upsertRestaurantTeamMember({
      restaurantId: req.params.restaurantId,
      memberId: req.body.memberId,
      userId: req.body.userId,
      email: req.body.email,
      name: req.body.name,
      role: req.body.role,
      permissions: req.body.permissions,
      status: req.body.status,
      actor: getActorContext(req),
    });

    res.status(201).json({ success: true, data: governance });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/fooddelivery/restaurants/:restaurantId/orders
router.get('/restaurants/:restaurantId/orders', authenticate, async (req, res) => {
  try {
    const hasAccess = await canAccessRestaurant(req, req.params.restaurantId, 'orders:view');
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view restaurant orders' });
    }

    const orders = await getRestaurantOrders({
      restaurantId: req.params.restaurantId,
      status: req.query.status || '',
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/fooddelivery/restaurants/:restaurantId/availability
router.put('/restaurants/:restaurantId/availability', authenticate, async (req, res) => {
  try {
    const hasAccess = await canAccessRestaurant(req, req.params.restaurantId, 'availability:update');
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update restaurant availability' });
    }

    const restaurant = await updateRestaurantAvailability({
      restaurantId: req.params.restaurantId,
      open: req.body.open,
      avgPreparationTime: req.body.avgPreparationTime,
      lat: req.body.lat,
      lng: req.body.lng,
      address: req.body.address,
      zone: req.body.zone,
      updatedBy: req.user?.email || req.user?.role || 'restaurant',
      actor: getActorContext(req),
    });

    res.json({ success: true, data: restaurant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/fooddelivery/restaurants/:restaurantId/menu/:itemId/availability
router.put('/restaurants/:restaurantId/menu/:itemId/availability', authenticate, async (req, res) => {
  try {
    const hasAccess = await canAccessRestaurant(req, req.params.restaurantId, 'menu:update');
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update menu availability' });
    }

    const item = await updateMenuItemAvailability({
      restaurantId: req.params.restaurantId,
      itemId: req.params.itemId,
      available: req.body.available,
      prepTime: req.body.prepTime,
      updatedBy: req.user?.email || req.user?.role || 'restaurant',
      actor: getActorContext(req),
    });

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/fooddelivery/restaurants/:restaurantId/orders/:orderId/status
router.put('/restaurants/:restaurantId/orders/:orderId/status', authenticate, async (req, res) => {
  try {
    const hasAccess = await canAccessRestaurant(req, req.params.restaurantId, 'orders:update');
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update restaurant orders' });
    }

    const updatedOrder = await updateRestaurantOrderStatus({
      restaurantId: req.params.restaurantId,
      orderId: req.params.orderId,
      status: req.body.status,
      updatedBy: req.user?.email || req.user?.role || 'restaurant',
    });

    res.json({ success: true, data: serializeOrder(updatedOrder) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/fooddelivery/restaurants/:restaurantId/orders/:orderId/assign-rider
router.post('/restaurants/:restaurantId/orders/:orderId/assign-rider', authenticate, async (req, res) => {
  try {
    const hasAccess = await canAccessRestaurant(req, req.params.restaurantId, 'orders:assign-rider');
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Unauthorized to assign riders for this restaurant' });
    }

    const updatedOrder = await assignRiderToOrder({
      orderId: req.params.orderId,
      restaurantId: req.params.restaurantId,
      riderId: req.body.riderId,
      updatedBy: req.user?.email || req.user?.role || 'restaurant',
    });

    res.json({ success: true, data: serializeOrder(updatedOrder) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/fooddelivery/:restaurantId/menu
router.get('/:restaurantId/menu', rateLimiter, async (req, res) => {
  try {
    const menu = await getMenuByRestaurant(req.params.restaurantId, req.query);
    res.json({ success: true, data: menu.map(serializeMenuItem) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/fooddelivery/:restaurantId/recommendations
router.get('/:restaurantId/recommendations', authenticate, async (req, res) => {
  try {
    const recommendations = await getRestaurantRecommendations({
      restaurantId: req.params.restaurantId,
      cartItems: Array.isArray(req.query.cart)
        ? req.query.cart
        : req.query.cart
          ? JSON.parse(req.query.cart)
          : [],
      limit: req.query.limit,
    });

    res.json({ success: true, data: recommendations });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/fooddelivery/:restaurantId/cart
router.post('/:restaurantId/cart', authenticate, rateLimiter, async (req, res) => {
  try {
    const cart = await addItemToCart({
      userId: getAuthenticatedUserId(req),
      restaurantId: req.params.restaurantId,
      itemId: req.body.itemId,
      quantity: req.body.quantity,
      variantId: req.body.variantId,
      addonIds: req.body.addonIds,
      specialInstructions: req.body.specialInstructions,
      customizations: req.body.customizations,
    });

    res.json({ success: true, data: serializeCart(cart) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/fooddelivery/:restaurantId/cart
router.get('/:restaurantId/cart', authenticate, async (req, res) => {
  try {
    const cart = await getCartForUser({
      userId: getAuthenticatedUserId(req),
      restaurantId: req.params.restaurantId,
    });

    res.json({ success: true, data: serializeCart(cart) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/fooddelivery/:restaurantId/cart
router.delete('/:restaurantId/cart', authenticate, async (req, res) => {
  try {
    const cart = await clearCartForUser({
      userId: getAuthenticatedUserId(req),
      restaurantId: req.params.restaurantId,
    });

    res.json({ success: true, data: serializeCart(cart) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/fooddelivery/:restaurantId/cart/summary
router.post('/:restaurantId/cart/summary', authenticate, async (req, res) => {
  try {
    const summary = await getCheckoutSummary({
      userId: getAuthenticatedUserId(req),
      restaurantId: req.params.restaurantId,
      cartItems: req.body.cart,
      couponCode: req.body.couponCode,
      paymentMethod: req.body.paymentMethod,
      tipAmount: req.body.tipAmount,
      walletAmount: req.body.walletAmount,
      deliveryAddress: req.body.deliveryAddress,
      deliveryInstructions: req.body.deliveryInstructions,
      scheduledFor: req.body.scheduledFor,
      rewardPointsToRedeem: req.body.rewardPointsToRedeem,
      referralCode: req.body.referralCode,
      currentUser: req.user,
    });

    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/fooddelivery/:restaurantId/order
router.post('/:restaurantId/order', authenticate, rateLimiter, async (req, res) => {
  try {
    const order = await createOrderFromCart({
      userId: getAuthenticatedUserId(req),
      restaurantId: req.params.restaurantId,
      cartItems: req.body.cart,
      paymentMethod: req.body.paymentMethod,
      deliveryAddress: req.body.deliveryAddress,
      deliveryInstructions: req.body.deliveryInstructions,
      couponCode: req.body.couponCode,
      tipAmount: req.body.tipAmount,
      walletAmount: req.body.walletAmount,
      scheduledFor: req.body.scheduledFor,
      rewardPointsToRedeem: req.body.rewardPointsToRedeem,
      referralCode: req.body.referralCode,
      currentUser: req.user,
    });

    res.status(201).json({ success: true, data: serializeOrder(order) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/fooddelivery/order
router.post('/order', authenticate, rateLimiter, async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    const order =
      req.body.restaurantId && Array.isArray(req.body.cart)
        ? await createOrderFromCart({
            userId: authenticatedUserId,
            restaurantId: req.body.restaurantId,
            cartItems: req.body.cart,
            paymentMethod: req.body.paymentMethod,
            deliveryAddress: req.body.deliveryAddress,
            deliveryInstructions: req.body.deliveryInstructions,
            couponCode: req.body.couponCode,
            tipAmount: req.body.tipAmount,
            walletAmount: req.body.walletAmount,
            scheduledFor: req.body.scheduledFor,
            rewardPointsToRedeem: req.body.rewardPointsToRedeem,
            referralCode: req.body.referralCode,
            currentUser: req.user,
          })
        : await createOrder({
            ...req.body,
            customerId: authenticatedUserId,
          });

    res.status(201).json({ success: true, data: serializeOrder(order) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/fooddelivery/my-orders
router.get('/my-orders', authenticate, async (req, res) => {
  try {
    const orders = await getOrdersByCustomer(getAuthenticatedUserId(req));
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/fooddelivery/orders/:orderId/tracking
router.get('/orders/:orderId/tracking', authenticate, async (req, res) => {
  try {
    const order = await getOrderById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const hasAccess = await canAccessOrder(req, order);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this order tracking' });
    }

    const tracking = await getOrderTracking({ orderId: req.params.orderId });
    res.json({ success: true, data: tracking });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/fooddelivery/orders/:orderId/disputes
router.post('/orders/:orderId/disputes', authenticate, async (req, res) => {
  try {
    const order = await getOrderById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const hasAccess = await canAccessOrder(req, order);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Unauthorized to raise a dispute for this order' });
    }

    const dispute = await createOrderDispute({
      orderId: req.params.orderId,
      issueType: req.body.issueType,
      description: req.body.description,
      createdByUserId: getAuthenticatedUserId(req),
      createdByRole:
        req.user?.role ||
        req.user?.registrationType ||
        (normalizeValue(order.customerId) === getAuthenticatedUserId(req) ? 'customer' : 'restaurant'),
      createdByName: req.user?.name || req.user?.email || 'User',
    });

    res.status(201).json({ success: true, data: dispute });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/fooddelivery/orders/:orderId/disputes/:disputeId
router.put('/orders/:orderId/disputes/:disputeId', authenticate, async (req, res) => {
  try {
    const order = await getOrderById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (
      !hasAdminPrivileges(req) &&
      !(await canAccessRestaurant(req, order.restaurantId, 'disputes:manage'))
    ) {
      return res.status(403).json({ success: false, message: 'Unauthorized to manage disputes for this order' });
    }

    const dispute = await updateOrderDispute({
      orderId: req.params.orderId,
      disputeId: req.params.disputeId,
      status: req.body.status,
      resolutionNote: req.body.resolutionNote,
      updatedBy: req.user?.email || req.user?.role || 'admin',
    });

    res.json({ success: true, data: dispute });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/fooddelivery/orders/:orderId/cancel
router.post('/orders/:orderId/cancel', authenticate, async (req, res) => {
  try {
    const order = await getOrderById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const isCustomer = normalizeValue(order.customerId) === getAuthenticatedUserId(req);
    const isRestaurantOperator = await canAccessRestaurant(req, order.restaurantId, 'orders:update');

    if (!isCustomer && !isRestaurantOperator && !hasAdminPrivileges(req)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to cancel this order' });
    }

    const updatedOrder = await cancelOrder({
      orderId: req.params.orderId,
      reason: req.body.reason || (isRestaurantOperator ? 'Cancelled by restaurant' : 'Cancelled by customer'),
      requestedBy: isRestaurantOperator ? 'restaurant' : 'customer',
      currentUser: req.user,
    });

    res.json({ success: true, data: serializeOrder(updatedOrder) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/fooddelivery/orders/:orderId/status
router.put('/orders/:orderId/status', authenticate, async (req, res) => {
  try {
    const order = await getOrderById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const hasAccess =
      hasAdminPrivileges(req) ||
      (await canAccessRestaurant(req, order.restaurantId, 'orders:update'));

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this order' });
    }

    const updatedOrder = await updateOrderStatus({
      orderId: req.params.orderId,
      status: req.body.status,
      updatedBy: req.user?.email || req.user?.role || 'restaurant',
    });

    res.json({ success: true, data: serializeOrder(updatedOrder) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
