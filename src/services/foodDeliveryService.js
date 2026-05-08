import axios from 'axios';

const API_BASE_URL = '/api/fooddelivery';

const getAuthHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
  },
});

const normalizeId = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'object') {
    return String(value.id || value._id || '');
  }

  return String(value);
};

const normalizeRestaurant = (restaurant = {}) => {
  const cuisineTags = Array.isArray(restaurant.cuisineTags)
    ? restaurant.cuisineTags.filter(Boolean)
    : [];
  const fallbackCategories = String(restaurant.cuisine || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    ...restaurant,
    id: normalizeId(restaurant.id || restaurant._id),
    ownerId: normalizeId(restaurant.ownerId),
    categories: cuisineTags.length > 0 ? cuisineTags : fallbackCategories,
    deliveryTime: restaurant.deliveryTime || restaurant.avgPreparationTime || '',
    imageLabel: restaurant.imageLabel || restaurant.name?.slice(0, 1) || 'FD',
    activeTeamMemberCount: Number(restaurant.activeTeamMemberCount || 0),
    hasGovernanceConfigured: Boolean(restaurant.hasGovernanceConfigured),
  };
};

const normalizeMenuItem = (item = {}) => ({
  ...item,
  id: normalizeId(item.id || item._id || item.menuItemId),
  image: item.image || '',
  price: Number(item.price || 0),
  basePrice: Number(item.basePrice || item.price || 0),
  quantity: Number(item.quantity || 0),
  addonsPrice: Number(item.addonsPrice || 0),
  lineItemKey: item.lineItemKey || '',
  selectedVariant: item.selectedVariant
    ? {
        ...item.selectedVariant,
        id: normalizeId(item.selectedVariant.id || item.selectedVariant._id),
        priceModifier: Number(item.selectedVariant.priceModifier || 0),
        prepTimeModifier: Number(item.selectedVariant.prepTimeModifier || 0),
      }
    : null,
  selectedAddons: Array.isArray(item.selectedAddons)
    ? item.selectedAddons.map((addon) => ({
        ...addon,
        id: normalizeId(addon.id || addon._id),
        price: Number(addon.price || 0),
        prepTimeModifier: Number(addon.prepTimeModifier || 0),
      }))
    : [],
  variants: Array.isArray(item.variants)
    ? item.variants.map((variant) => ({
        ...variant,
        id: normalizeId(variant.id || variant._id),
        priceModifier: Number(variant.priceModifier || 0),
        prepTimeModifier: Number(variant.prepTimeModifier || 0),
        available: variant.available !== false,
      }))
    : [],
  addons: Array.isArray(item.addons)
    ? item.addons.map((addon) => ({
        ...addon,
        id: normalizeId(addon.id || addon._id),
        price: Number(addon.price || 0),
        prepTimeModifier: Number(addon.prepTimeModifier || 0),
        available: addon.available !== false,
      }))
    : [],
});

const normalizeCart = (cart = {}) => ({
  ...cart,
  restaurantId: normalizeId(cart.restaurantId),
  itemCount: Number(cart.itemCount || 0),
  total: Number(cart.total || 0),
  tipAmount: Number(cart.tipAmount || 0),
  walletAmount: Number(cart.walletAmount || 0),
  rewardPointsToRedeem: Number(cart.rewardPointsToRedeem || 0),
  scheduledFor: cart.scheduledFor || null,
  referralCode: cart.referralCode || '',
  paymentMethod: cart.paymentMethod || 'cod',
  items: Array.isArray(cart.items) ? cart.items.map(normalizeMenuItem) : [],
});

const normalizeOrder = (order = {}) => ({
  ...order,
  id: normalizeId(order.id || order._id),
  status: order.status || order.orderStatus || 'placed',
  total: Number(order.total || order.totalAmount || 0),
  totalAmount: Number(order.totalAmount || order.total || 0),
  subtotal: Number(order.subtotal || 0),
  discountAmount: Number(order.discountAmount || 0),
  deliveryCharge: Number(order.deliveryCharge || 0),
  platformFee: Number(order.platformFee || 0),
  taxAmount: Number(order.taxAmount || 0),
  tipAmount: Number(order.tipAmount || 0),
  payableAmount: Number(order.payableAmount || 0),
  walletUsed: Number(order.walletUsed || 0),
  restaurantId: normalizeId(order.restaurantId),
  canCancel: Boolean(order.canCancel),
  scheduleDeliveryFor: order.scheduleDeliveryFor || null,
  isScheduled: Boolean(order.isScheduled),
  scheduledWindowLabel: order.scheduledWindowLabel || '',
  etaSnapshot: order.etaSnapshot
    ? {
        ...order.etaSnapshot,
        preparationMinutes: Number(order.etaSnapshot.preparationMinutes || 0),
        deliveryMinutes: Number(order.etaSnapshot.deliveryMinutes || 0),
        bufferMinutes: Number(order.etaSnapshot.bufferMinutes || 0),
        totalMinutes: Number(order.etaSnapshot.totalMinutes || 0),
        trafficMultiplier: Number(order.etaSnapshot.trafficMultiplier || 1),
      }
    : null,
  loyalty: order.loyalty
    ? {
        ...order.loyalty,
        pointsEarned: Number(order.loyalty.pointsEarned || 0),
        pointsRedeemed: Number(order.loyalty.pointsRedeemed || 0),
        rewardDiscountAmount: Number(order.loyalty.rewardDiscountAmount || 0),
        credited: Boolean(order.loyalty.credited),
      }
    : null,
  referral: order.referral
    ? {
        ...order.referral,
        referrerUserId: normalizeId(order.referral.referrerUserId),
        referralDiscountAmount: Number(order.referral.referralDiscountAmount || 0),
      }
    : null,
  riderSafety: order.riderSafety
    ? {
        ...order.riderSafety,
        activeSos: Boolean(order.riderSafety.activeSos),
        sosEvents: Array.isArray(order.riderSafety.sosEvents)
          ? order.riderSafety.sosEvents.map((event) => ({
              ...event,
              id: normalizeId(event.id || event._id),
            }))
          : [],
      }
    : null,
  coupon: order.coupon || null,
  items: Array.isArray(order.items)
    ? order.items.map((item) => ({
        ...item,
        id: normalizeId(item.id || item._id || item.menuItemId),
        menuItemId: normalizeId(item.menuItemId || item.id || item._id),
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
      }))
    : [],
});

const normalizeCheckoutSummary = (summary = {}) => ({
  ...summary,
  restaurantId: normalizeId(summary.restaurantId),
  itemCount: Number(summary.itemCount || 0),
  subtotal: Number(summary.subtotal || 0),
  discountAmount: Number(summary.discountAmount || 0),
  deliveryCharge: Number(summary.deliveryCharge || 0),
  platformFee: Number(summary.platformFee || 0),
  taxAmount: Number(summary.taxAmount || 0),
  tipAmount: Number(summary.tipAmount || 0),
  totalAmount: Number(summary.totalAmount || 0),
  payableAmount: Number(summary.payableAmount || 0),
  walletBalance: Number(summary.walletBalance || 0),
  walletUsed: Number(summary.walletUsed || 0),
  gstRate: Number(summary.gstRate || 0),
  scheduledFor: summary.scheduledFor || null,
  isScheduled: Boolean(summary.isScheduled),
  scheduledWindowLabel: summary.scheduledWindowLabel || '',
  referral: summary.referral || null,
  loyalty: summary.loyalty
    ? {
        ...summary.loyalty,
        availablePoints: Number(summary.loyalty.availablePoints || 0),
        pointsRedeemed: Number(summary.loyalty.pointsRedeemed || 0),
        rewardDiscountAmount: Number(summary.loyalty.rewardDiscountAmount || 0),
        pointsEarned: Number(summary.loyalty.pointsEarned || 0),
      }
    : null,
  etaSnapshot: summary.etaSnapshot
    ? {
        ...summary.etaSnapshot,
        preparationMinutes: Number(summary.etaSnapshot.preparationMinutes || 0),
        deliveryMinutes: Number(summary.etaSnapshot.deliveryMinutes || 0),
        bufferMinutes: Number(summary.etaSnapshot.bufferMinutes || 0),
        totalMinutes: Number(summary.etaSnapshot.totalMinutes || 0),
        trafficMultiplier: Number(summary.etaSnapshot.trafficMultiplier || 1),
      }
    : null,
  items: Array.isArray(summary.items) ? summary.items.map(normalizeMenuItem) : [],
});

const normalizeDriver = (driver = {}) => ({
  ...driver,
  id: normalizeId(driver.id || driver._id),
  userId: normalizeId(driver.userId),
  currentOrderId: normalizeId(driver.currentOrderId),
  currentLat: Number(driver.currentLat || 0),
  currentLng: Number(driver.currentLng || 0),
  rating: Number(driver.rating || 0),
  isOnline: Boolean(driver.isOnline),
  serviceTypes: Array.isArray(driver.serviceTypes) ? driver.serviceTypes : [],
});

const normalizeTracking = (tracking = {}) => ({
  ...tracking,
  orderId: normalizeId(tracking.orderId),
  trackingId: tracking.trackingId || '',
  driver: tracking.driver ? normalizeDriver(tracking.driver) : null,
  tracking: tracking.tracking
    ? {
        ...tracking.tracking,
        distanceFromRestaurantKm: Number(tracking.tracking.distanceFromRestaurantKm || 0),
        distanceToCustomerKm: Number(tracking.tracking.distanceToCustomerKm || 0),
        estimatedArrivalMinutes: Number(tracking.tracking.estimatedArrivalMinutes || 0),
        trafficMultiplier: Number(tracking.tracking.trafficMultiplier || 1),
        routeStrategy: tracking.tracking.routeStrategy || 'balanced',
        routeHistory: Array.isArray(tracking.tracking.routeHistory)
          ? tracking.tracking.routeHistory.map((point) => ({
              ...point,
              lat: Number(point.lat || 0),
              lng: Number(point.lng || 0),
              speed: Number(point.speed || 0),
              accuracy: Number(point.accuracy || 0),
            }))
          : [],
      }
    : null,
  etaSnapshot: tracking.etaSnapshot
    ? {
        ...tracking.etaSnapshot,
        totalMinutes: Number(tracking.etaSnapshot.totalMinutes || 0),
        trafficMultiplier: Number(tracking.etaSnapshot.trafficMultiplier || 1),
      }
    : null,
  riderSafety: tracking.riderSafety || null,
});

const normalizeTeamMember = (member = {}) => ({
  ...member,
  id: normalizeId(member.id || member._id),
  userId: normalizeId(member.userId),
  email: member.email || '',
  name: member.name || '',
  role: member.role || 'support',
  permissions: Array.isArray(member.permissions) ? member.permissions : [],
  permissionLabels: Array.isArray(member.permissionLabels) ? member.permissionLabels : [],
  status: member.status || 'active',
  invitedByUserId: normalizeId(member.invitedByUserId),
  invitedByName: member.invitedByName || '',
  invitedAt: member.invitedAt || null,
  updatedAt: member.updatedAt || null,
});

const normalizeAuditEntry = (entry = {}) => ({
  ...entry,
  id: normalizeId(entry.id || entry._id),
  targetId: normalizeId(entry.targetId),
  restaurantId: normalizeId(entry.restaurantId),
  orderId: normalizeId(entry.orderId),
  performedByUserId: normalizeId(entry.performedByUserId),
  timestamp: entry.timestamp || null,
  metadata: entry.metadata || {},
});

const normalizeGovernance = (payload = {}) => ({
  ...payload,
  restaurant: payload.restaurant ? normalizeRestaurant(payload.restaurant) : null,
  teamMembers: Array.isArray(payload.teamMembers) ? payload.teamMembers.map(normalizeTeamMember) : [],
  recentAuditLog: Array.isArray(payload.recentAuditLog)
    ? payload.recentAuditLog.map(normalizeAuditEntry)
    : [],
  currentUserPermissions: Array.isArray(payload.currentUserPermissions)
    ? payload.currentUserPermissions
    : [],
  permissionCatalog: Array.isArray(payload.permissionCatalog) ? payload.permissionCatalog : [],
  roleTemplates: Array.isArray(payload.roleTemplates) ? payload.roleTemplates : [],
  activeTeamMemberCount: Number(payload.activeTeamMemberCount || 0),
});

export default {
  getRestaurants: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const { data } = await axios.get(`${API_BASE_URL}/restaurants?${params}`, getAuthHeaders());
    return Array.isArray(data.data) ? data.data.map(normalizeRestaurant) : [];
  },

  getManagedRestaurants: async () => {
    const { data } = await axios.get(`${API_BASE_URL}/restaurants/managed`, getAuthHeaders());
    return Array.isArray(data.data) ? data.data.map(normalizeRestaurant) : [];
  },

  getMenu: async (restaurantId, category = '') => {
    const params = new URLSearchParams({ category });
    const { data } = await axios.get(`${API_BASE_URL}/${restaurantId}/menu?${params}`, getAuthHeaders());
    return Array.isArray(data.data) ? data.data.map(normalizeMenuItem) : [];
  },

  getRecommendations: async (restaurantId, options = {}) => {
    const params = new URLSearchParams();
    if (options.limit) {
      params.set('limit', String(options.limit));
    }
    if (options.cart?.length) {
      params.set('cart', JSON.stringify(options.cart));
    }

    const { data } = await axios.get(
      `${API_BASE_URL}/${restaurantId}/recommendations?${params}`,
      getAuthHeaders()
    );
    return Array.isArray(data.data) ? data.data.map(normalizeMenuItem) : [];
  },

  getRewardsSummary: async () => {
    const { data } = await axios.get(`${API_BASE_URL}/rewards/me`, getAuthHeaders());
    return {
      ...data.data,
      pointsBalance: Number(data.data?.pointsBalance || 0),
      lifetimePointsEarned: Number(data.data?.lifetimePointsEarned || 0),
      totalRedemptions: Number(data.data?.totalRedemptions || 0),
      totalPointsRedeemed: Number(data.data?.totalPointsRedeemed || 0),
      referralUsageCount: Number(data.data?.referralUsageCount || 0),
      referralCreditsEarned: Number(data.data?.referralCreditsEarned || 0),
      referredOrders: Number(data.data?.referredOrders || 0),
      nextRewardUnlockAt: Number(data.data?.nextRewardUnlockAt || 0),
    };
  },

  addToCart: async (restaurantId, itemId, quantity, options = {}) => {
    const { data } = await axios.post(
      `${API_BASE_URL}/${restaurantId}/cart`,
      {
        itemId,
        quantity,
        variantId: options.variantId,
        addonIds: options.addonIds,
        specialInstructions: options.specialInstructions,
        customizations: options.customizations,
      },
      getAuthHeaders()
    );
    return normalizeCart(data.data);
  },

  getCart: async (restaurantId) => {
    const { data } = await axios.get(`${API_BASE_URL}/${restaurantId}/cart`, getAuthHeaders());
    return normalizeCart(data.data);
  },

  clearCart: async (restaurantId) => {
    const { data } = await axios.delete(`${API_BASE_URL}/${restaurantId}/cart`, getAuthHeaders());
    return normalizeCart(data.data);
  },

  getCheckoutSummary: async (restaurantId, options = {}) => {
    const { data } = await axios.post(
      `${API_BASE_URL}/${restaurantId}/cart/summary`,
      options,
      getAuthHeaders()
    );
    return normalizeCheckoutSummary(data.data);
  },

  checkout: async (restaurantId, options = {}) => {
    const { data } = await axios.post(
      `${API_BASE_URL}/${restaurantId}/order`,
      options,
      getAuthHeaders()
    );
    return normalizeOrder(data.data);
  },

  getMyOrders: async () => {
    const { data } = await axios.get(`${API_BASE_URL}/my-orders`, getAuthHeaders());
    return Array.isArray(data.data) ? data.data.map(normalizeOrder) : [];
  },

  cancelOrder: async (orderId, reason = 'Cancelled by customer') => {
    const { data } = await axios.post(
      `${API_BASE_URL}/orders/${orderId}/cancel`,
      { reason },
      getAuthHeaders()
    );
    return normalizeOrder(data.data);
  },

  updateOrderStatus: async (orderId, status) => {
    const { data } = await axios.put(
      `${API_BASE_URL}/orders/${orderId}/status`,
      { status },
      getAuthHeaders()
    );
    return normalizeOrder(data.data);
  },

  getRestaurantOrders: async (restaurantId, filters = {}) => {
    const params = new URLSearchParams(filters);
    const { data } = await axios.get(
      `${API_BASE_URL}/restaurants/${restaurantId}/orders?${params}`,
      getAuthHeaders()
    );
    return Array.isArray(data.data) ? data.data.map(normalizeOrder) : [];
  },

  getRestaurantGovernance: async (restaurantId) => {
    const { data } = await axios.get(
      `${API_BASE_URL}/restaurants/${restaurantId}/governance`,
      getAuthHeaders()
    );
    return normalizeGovernance(data.data);
  },

  saveRestaurantTeamMember: async (restaurantId, payload = {}) => {
    const { data } = await axios.post(
      `${API_BASE_URL}/restaurants/${restaurantId}/team`,
      payload,
      getAuthHeaders()
    );
    return normalizeGovernance(data.data);
  },

  updateRestaurantOrderStatus: async (restaurantId, orderId, status) => {
    const { data } = await axios.put(
      `${API_BASE_URL}/restaurants/${restaurantId}/orders/${orderId}/status`,
      { status },
      getAuthHeaders()
    );
    return normalizeOrder(data.data);
  },

  updateRestaurantAvailability: async (restaurantId, payload = {}) => {
    const { data } = await axios.put(
      `${API_BASE_URL}/restaurants/${restaurantId}/availability`,
      payload,
      getAuthHeaders()
    );
    return normalizeRestaurant(data.data);
  },

  updateMenuAvailability: async (restaurantId, itemId, payload = {}) => {
    const { data } = await axios.put(
      `${API_BASE_URL}/restaurants/${restaurantId}/menu/${itemId}/availability`,
      payload,
      getAuthHeaders()
    );
    return normalizeMenuItem(data.data);
  },

  assignRider: async (restaurantId, orderId, riderId = '') => {
    const { data } = await axios.post(
      `${API_BASE_URL}/restaurants/${restaurantId}/orders/${orderId}/assign-rider`,
      { riderId },
      getAuthHeaders()
    );
    return normalizeOrder(data.data);
  },

  createRiderProfile: async (payload = {}) => {
    const { data } = await axios.post(`${API_BASE_URL}/riders/profile`, payload, getAuthHeaders());
    return normalizeDriver(data.data);
  },

  updateRiderAvailability: async (payload = {}) => {
    const { data } = await axios.put(`${API_BASE_URL}/riders/me/availability`, payload, getAuthHeaders());
    return normalizeDriver(data.data);
  },

  getMyRiderOrders: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const { data } = await axios.get(`${API_BASE_URL}/riders/me/orders?${params}`, getAuthHeaders());
    return {
      rider: data.data?.rider ? normalizeDriver(data.data.rider) : null,
      orders: Array.isArray(data.data?.orders) ? data.data.orders.map(normalizeOrder) : [],
    };
  },

  updateRiderLocation: async (orderId, payload = {}) => {
    const { data } = await axios.put(
      `${API_BASE_URL}/riders/orders/${orderId}/location`,
      payload,
      getAuthHeaders()
    );
    return normalizeOrder(data.data);
  },

  updateRiderOrderStatus: async (orderId, status) => {
    const { data } = await axios.put(
      `${API_BASE_URL}/riders/orders/${orderId}/status`,
      { status },
      getAuthHeaders()
    );
    return normalizeOrder(data.data);
  },

  triggerRiderSos: async (orderId, payload = {}) => {
    const { data } = await axios.post(
      `${API_BASE_URL}/riders/orders/${orderId}/sos`,
      payload,
      getAuthHeaders()
    );
    return normalizeOrder(data.data);
  },

  getOrderTracking: async (orderId) => {
    const { data } = await axios.get(`${API_BASE_URL}/orders/${orderId}/tracking`, getAuthHeaders());
    return normalizeTracking(data.data);
  },

  createDispute: async (orderId, payload = {}) => {
    const { data } = await axios.post(
      `${API_BASE_URL}/orders/${orderId}/disputes`,
      payload,
      getAuthHeaders()
    );
    return data.data;
  },

  updateDispute: async (orderId, disputeId, payload = {}) => {
    const { data } = await axios.put(
      `${API_BASE_URL}/orders/${orderId}/disputes/${disputeId}`,
      payload,
      getAuthHeaders()
    );
    return data.data;
  },

  getAdminDashboard: async () => {
    const { data } = await axios.get(`${API_BASE_URL}/admin/dashboard`, getAuthHeaders());
    return {
      ...data.data,
      recentOrders: Array.isArray(data.data?.recentOrders) ? data.data.recentOrders.map(normalizeOrder) : [],
    };
  },

  getAdminOrders: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const { data } = await axios.get(`${API_BASE_URL}/admin/orders?${params}`, getAuthHeaders());
    return Array.isArray(data.data) ? data.data.map(normalizeOrder) : [];
  },

  getAdminAuditLog: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const { data } = await axios.get(`${API_BASE_URL}/admin/audit-log?${params}`, getAuthHeaders());
    return Array.isArray(data.data) ? data.data.map(normalizeAuditEntry) : [];
  },
};
