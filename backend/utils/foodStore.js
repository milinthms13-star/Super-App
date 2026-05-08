const mongoose = require('mongoose');
const Driver = require('../models/Driver');
const MenuItem = require('../models/MenuItem');
const FoodOrder = require('../models/FoodOrder');
const FoodDeliveryNotification = require('../models/FoodDeliveryNotification');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const devAuthStore = require('./devAuthStore');
const { calculateDistance } = require('./deliveryLocationService');
const { getWalletBalance, deductWalletBalance, creditWallet } = require('./wallet');

const ORDER_STATUS_SEQUENCE = ['placed', 'confirmed', 'preparing', 'out-for-delivery', 'delivered'];
const ORDER_STATUS_ALIASES = {
  accepted: 'confirmed',
  completed: 'delivered',
  pending: 'placed',
  ready: 'out-for-delivery',
};

const RESTAURANT_STATUS_SEQUENCE = ['confirmed', 'preparing', 'out-for-delivery', 'delivered', 'cancelled'];

const GST_RATE = 0.05;
const DEFAULT_PLATFORM_FEE = 5;
const BASE_DELIVERY_FEE = 39;
const REDUCED_DELIVERY_FEE = 19;
const REDUCED_DELIVERY_THRESHOLD = 299;
const FREE_DELIVERY_THRESHOLD = 499;
const LOYALTY_EARNING_STEP = 50;
const REFERRAL_DISCOUNT = 50;
const REFERRAL_REWARD_POINTS = 25;
const MAX_REWARD_REDEMPTION_SHARE = 0.25;
const MAX_RESTAURANT_AUDIT_LOG_ENTRIES = 120;

const RESTAURANT_PERMISSION_CATALOG = Object.freeze({
  'orders:view': 'View restaurant orders',
  'orders:update': 'Update order workflow',
  'orders:assign-rider': 'Assign delivery partners',
  'disputes:manage': 'Resolve order disputes',
  'menu:update': 'Manage menu availability',
  'availability:update': 'Manage restaurant availability',
  'team:manage': 'Manage restaurant staff access',
  'analytics:view': 'View restaurant analytics',
  'audit:view': 'View restaurant audit activity',
});

const RESTAURANT_TEAM_ROLE_PERMISSIONS = Object.freeze({
  owner: Object.keys(RESTAURANT_PERMISSION_CATALOG),
  manager: [
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
  dispatcher: ['orders:view', 'orders:update', 'orders:assign-rider', 'audit:view'],
  kitchen: ['orders:view', 'orders:update', 'menu:update', 'availability:update'],
  support: ['orders:view', 'disputes:manage', 'audit:view'],
  analyst: ['orders:view', 'analytics:view', 'audit:view'],
});

const roundCurrency = (value) => Math.round((Number(value) || 0) * 100) / 100;
const normalizeNumber = (value, fallback = null) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const normalizeId = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'object') {
    return String(value._id || value.id || '');
  }

  return String(value);
};

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();
const dedupeStrings = (values = []) => Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));

const normalizeRestaurantPermission = (value = '') => String(value || '').trim().toLowerCase();
const normalizeRestaurantTeamRole = (value = '') => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  return RESTAURANT_TEAM_ROLE_PERMISSIONS[normalizedValue] ? normalizedValue : 'support';
};

const getPermissionsForRestaurantRole = (role = 'support') =>
  RESTAURANT_TEAM_ROLE_PERMISSIONS[normalizeRestaurantTeamRole(role)] || [];

const serializeRestaurantTeamMember = (member = {}) => {
  const permissions = dedupeStrings([
    ...getPermissionsForRestaurantRole(member.role),
    ...(Array.isArray(member.permissions) ? member.permissions.map(normalizeRestaurantPermission) : []),
  ]);

  return {
    ...member,
    id: normalizeId(member.id || member._id),
    userId: normalizeId(member.userId),
    email: normalizeEmail(member.email),
    name: member.name || '',
    role: normalizeRestaurantTeamRole(member.role),
    permissions,
    permissionLabels: permissions.map((permission) => ({
      value: permission,
      label: RESTAURANT_PERMISSION_CATALOG[permission] || permission,
    })),
    status: String(member.status || 'active').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active',
    invitedByUserId: normalizeId(member.invitedByUserId),
    invitedByName: member.invitedByName || '',
    invitedAt: member.invitedAt || null,
    updatedAt: member.updatedAt || null,
  };
};

const serializeRestaurantAuditEntry = (entry = {}) => ({
  ...entry,
  id: normalizeId(entry.id || entry._id),
  action: String(entry.action || '').trim(),
  summary: entry.summary || '',
  targetType: entry.targetType || 'restaurant',
  targetId: normalizeId(entry.targetId),
  performedByUserId: normalizeId(entry.performedByUserId),
  performedByName: entry.performedByName || '',
  performedByRole: entry.performedByRole || '',
  metadata: entry.metadata || {},
  timestamp: entry.timestamp || entry.createdAt || null,
});

const buildRestaurantGovernanceContext = ({ currentUser = null, userId = '', fallbackRole = '' } = {}) => ({
  userId: normalizeId(currentUser?.id || currentUser?._id || userId),
  email: normalizeEmail(currentUser?.email),
  name: currentUser?.name || currentUser?.fullName || currentUser?.email || 'Restaurant operator',
  role:
    String(currentUser?.role || currentUser?.registrationType || fallbackRole || '')
      .trim()
      .toLowerCase() || 'restaurant',
});

const hasClaimedRestaurantGovernance = (restaurant = {}) =>
  Boolean(normalizeId(restaurant.ownerId)) ||
  (Array.isArray(restaurant.teamMembers)
    ? restaurant.teamMembers.some(
        (member) => serializeRestaurantTeamMember(member).status === 'active'
      )
    : false);

const findRestaurantTeamMemberMatch = (restaurant = {}, actor = {}) => {
  const normalizedUserId = normalizeId(actor.userId);
  const normalizedEmail = normalizeEmail(actor.email);

  return Array.isArray(restaurant.teamMembers)
    ? restaurant.teamMembers.find((member) => {
        const normalizedMember = serializeRestaurantTeamMember(member);
        if (normalizedMember.status !== 'active') {
          return false;
        }

        return (
          (normalizedUserId && normalizedMember.userId === normalizedUserId) ||
          (normalizedEmail && normalizedMember.email === normalizedEmail)
        );
      }) || null
    : null;
};

const getRestaurantPermissionSetForActor = (restaurant = {}, actor = {}) => {
  const normalizedUserId = normalizeId(actor.userId);
  if (normalizedUserId && normalizeId(restaurant.ownerId) === normalizedUserId) {
    return new Set(getPermissionsForRestaurantRole('owner'));
  }

  const matchedMember = findRestaurantTeamMemberMatch(restaurant, actor);
  if (!matchedMember) {
    return new Set();
  }

  return new Set(serializeRestaurantTeamMember(matchedMember).permissions);
};

const buildLineItemKey = ({
  menuItemId = '',
  selectedVariant = null,
  selectedAddons = [],
  specialInstructions = '',
} = {}) => {
  const addonKey = (Array.isArray(selectedAddons) ? selectedAddons : [])
    .map((addon) => normalizeId(addon?.id || addon))
    .filter(Boolean)
    .sort()
    .join('.');

  const specialKey = String(specialInstructions || '').trim().toLowerCase();

  return [
    normalizeId(menuItemId),
    normalizeId(selectedVariant?.id || selectedVariant),
    addonKey,
    specialKey,
  ].join('::');
};

const toPlainObject = (value) => {
  if (!value) {
    return {};
  }

  if (typeof value.toObject === 'function') {
    return value.toObject();
  }

  return { ...value };
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const useMemoryAuth = () => process.env.AUTH_STORAGE === 'memory' && process.env.NODE_ENV !== 'production';

const buildCartSummary = ({
  restaurantId = '',
  items = [],
  deliveryAddress = null,
  deliveryInstructions = '',
  couponCode = '',
  paymentMethod = 'cod',
  tipAmount = 0,
  walletAmount = 0,
  scheduledFor = null,
  rewardPointsToRedeem = 0,
  referralCode = '',
} = {}) => {
  const normalizedRestaurantId = normalizeId(restaurantId);
  const normalizedItems = items.map((item) => ({
    lineItemKey:
      item.lineItemKey ||
      buildLineItemKey({
        menuItemId: item.menuItemId || item.id,
        selectedVariant: item.selectedVariant,
        selectedAddons: item.selectedAddons,
        specialInstructions: item.specialInstructions,
      }),
    id: normalizeId(item.id || item.menuItemId),
    menuItemId: normalizeId(item.menuItemId || item.id),
    name: item.name || item.itemName || 'Menu item',
    price: roundCurrency(item.price || item.basePrice || 0),
    basePrice: roundCurrency(item.basePrice || item.price || 0),
    quantity: Number(item.quantity || 0),
    category: item.category || '',
    vegetarian: Boolean(item.vegetarian),
    prepTime: Number(item.prepTime || 0),
    image: item.image || '',
    subtotal: roundCurrency(Number(item.price || item.basePrice || 0) * Number(item.quantity || 0)),
    customizations: item.customizations || {},
    selectedVariant: item.selectedVariant || null,
    selectedAddons: Array.isArray(item.selectedAddons) ? item.selectedAddons : [],
    addonsPrice: roundCurrency(item.addonsPrice || 0),
    specialInstructions: item.specialInstructions || '',
  }));

  const total = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    restaurantId: normalizedRestaurantId,
    items: normalizedItems,
    itemCount,
    total: roundCurrency(total),
    deliveryAddress,
    deliveryInstructions,
    couponCode: String(couponCode || '').trim().toUpperCase(),
    referralCode: String(referralCode || '').trim().toUpperCase(),
    paymentMethod: String(paymentMethod || 'cod').trim().toLowerCase(),
    tipAmount: roundCurrency(tipAmount),
    walletAmount: roundCurrency(walletAmount),
    scheduledFor: scheduledFor || null,
    rewardPointsToRedeem: Math.max(0, Number(rewardPointsToRedeem || 0)),
  };
};

const serializeRestaurant = (restaurant = {}) => {
  const baseRestaurant = toPlainObject(restaurant);
  const cuisineTags = Array.isArray(baseRestaurant.cuisineTags)
    ? baseRestaurant.cuisineTags.filter(Boolean)
    : [];
  const fallbackCategories = String(baseRestaurant.cuisine || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const activeTeamMembers = Array.isArray(baseRestaurant.teamMembers)
    ? baseRestaurant.teamMembers.filter(
        (member) => serializeRestaurantTeamMember(member).status === 'active'
      )
    : [];

  return {
    ...baseRestaurant,
    id: normalizeId(baseRestaurant.id || baseRestaurant._id),
    ownerId: normalizeId(baseRestaurant.ownerId),
    categories: cuisineTags.length > 0 ? cuisineTags : fallbackCategories,
    deliveryTime: baseRestaurant.deliveryTime || baseRestaurant.avgPreparationTime || '',
    imageLabel: baseRestaurant.imageLabel || baseRestaurant.name?.slice(0, 1) || 'FD',
    activeTeamMemberCount: activeTeamMembers.length,
    hasGovernanceConfigured: hasClaimedRestaurantGovernance(baseRestaurant),
  };
};

const serializeMenuItem = (item = {}) => {
  const baseItem = toPlainObject(item);

  return {
    ...baseItem,
    id: normalizeId(baseItem.id || baseItem._id || baseItem.menuItemId),
    price: roundCurrency(baseItem.price || 0),
    basePrice: roundCurrency(baseItem.basePrice || baseItem.price || 0),
    quantity: Number(baseItem.quantity || 0),
    image: baseItem.image || baseItem.imageUrl || '',
    lineItemKey:
      baseItem.lineItemKey ||
      buildLineItemKey({
        menuItemId: baseItem.menuItemId || baseItem.id || baseItem._id,
        selectedVariant: baseItem.selectedVariant,
        selectedAddons: baseItem.selectedAddons,
        specialInstructions: baseItem.specialInstructions,
      }),
    selectedVariant: baseItem.selectedVariant
      ? {
          ...baseItem.selectedVariant,
          id: normalizeId(baseItem.selectedVariant.id || baseItem.selectedVariant._id),
          priceModifier: roundCurrency(baseItem.selectedVariant.priceModifier || 0),
          prepTimeModifier: Number(baseItem.selectedVariant.prepTimeModifier || 0),
        }
      : null,
    selectedAddons: Array.isArray(baseItem.selectedAddons)
      ? baseItem.selectedAddons.map((addon) => ({
          ...addon,
          id: normalizeId(addon.id || addon._id),
          price: roundCurrency(addon.price || 0),
          prepTimeModifier: Number(addon.prepTimeModifier || 0),
        }))
      : [],
    addonsPrice: roundCurrency(baseItem.addonsPrice || 0),
    variants: Array.isArray(baseItem.variants)
      ? baseItem.variants.map((variant) => ({
          ...variant,
          id: normalizeId(variant.id || variant._id),
          priceModifier: roundCurrency(variant.priceModifier || 0),
          prepTimeModifier: Number(variant.prepTimeModifier || 0),
          available: variant.available !== false,
        }))
      : [],
    addons: Array.isArray(baseItem.addons)
      ? baseItem.addons.map((addon) => ({
          ...addon,
          id: normalizeId(addon.id || addon._id),
          price: roundCurrency(addon.price || 0),
          prepTimeModifier: Number(addon.prepTimeModifier || 0),
          available: addon.available !== false,
        }))
      : [],
    popularityScore: Number(baseItem.popularityScore || 0),
    recommendationTags: Array.isArray(baseItem.recommendationTags)
      ? baseItem.recommendationTags.filter(Boolean)
      : [],
  };
};

const serializeCart = (cart = {}) => buildCartSummary(cart);

const serializeOrder = (order = {}) => {
  const baseOrder = toPlainObject(order);
  const normalizedStatus = baseOrder.status || baseOrder.orderStatus || 'placed';

  return {
    ...baseOrder,
    id: normalizeId(baseOrder.id || baseOrder._id),
    status: normalizedStatus,
    total: roundCurrency(baseOrder.total || baseOrder.totalAmount || 0),
    totalAmount: roundCurrency(baseOrder.totalAmount || baseOrder.total || 0),
    payableAmount: roundCurrency(baseOrder.payableAmount || 0),
    subtotal: roundCurrency(baseOrder.subtotal || 0),
    discountAmount: roundCurrency(baseOrder.discountAmount || 0),
    deliveryCharge: roundCurrency(baseOrder.deliveryCharge || 0),
    platformFee: roundCurrency(baseOrder.platformFee || 0),
    taxAmount: roundCurrency(baseOrder.taxAmount || 0),
    tipAmount: roundCurrency(baseOrder.tipAmount || 0),
    walletUsed: roundCurrency(baseOrder.walletUsed || 0),
    scheduleDeliveryFor: baseOrder.scheduleDeliveryFor || null,
    isScheduled: Boolean(baseOrder.isScheduled),
    scheduledWindowLabel: baseOrder.scheduledWindowLabel || '',
    restaurantId: normalizeId(baseOrder.restaurantId),
    customerId: normalizeId(baseOrder.customerId),
    driverId: normalizeId(baseOrder.driverId),
    assignedAt: baseOrder.assignedAt || null,
    assignedBy: baseOrder.assignedBy || '',
    assignmentMode: baseOrder.assignmentMode || '',
    coupon: baseOrder.coupon || null,
    canCancel: ['placed', 'confirmed', 'preparing'].includes(normalizedStatus),
    driverProfile: baseOrder.driverProfile
      ? {
          ...baseOrder.driverProfile,
          id: normalizeId(baseOrder.driverProfile.id),
          userId: normalizeId(baseOrder.driverProfile.userId),
        }
      : null,
    tracking: baseOrder.tracking
      ? {
          ...baseOrder.tracking,
          distanceFromRestaurantKm: roundCurrency(baseOrder.tracking.distanceFromRestaurantKm || 0),
          distanceToCustomerKm: roundCurrency(baseOrder.tracking.distanceToCustomerKm || 0),
          estimatedArrivalMinutes: Number(baseOrder.tracking.estimatedArrivalMinutes || 0),
          trafficMultiplier: roundCurrency(baseOrder.tracking.trafficMultiplier || 1),
          routeStrategy: baseOrder.tracking.routeStrategy || 'balanced',
          routeHistory: Array.isArray(baseOrder.tracking.routeHistory)
            ? baseOrder.tracking.routeHistory.map((point) => ({
                ...point,
                lat: normalizeNumber(point.lat, 0),
                lng: normalizeNumber(point.lng, 0),
                accuracy: normalizeNumber(point.accuracy, 0),
                speed: normalizeNumber(point.speed, 0),
              }))
            : [],
        }
      : null,
    etaSnapshot: baseOrder.etaSnapshot
      ? {
          ...baseOrder.etaSnapshot,
          preparationMinutes: Number(baseOrder.etaSnapshot.preparationMinutes || 0),
          deliveryMinutes: Number(baseOrder.etaSnapshot.deliveryMinutes || 0),
          bufferMinutes: Number(baseOrder.etaSnapshot.bufferMinutes || 0),
          totalMinutes: Number(baseOrder.etaSnapshot.totalMinutes || 0),
          trafficMultiplier: roundCurrency(baseOrder.etaSnapshot.trafficMultiplier || 1),
          routeStrategy: baseOrder.etaSnapshot.routeStrategy || 'balanced',
          estimatedArrivalAt: baseOrder.etaSnapshot.estimatedArrivalAt || null,
          computedAt: baseOrder.etaSnapshot.computedAt || null,
        }
      : null,
    loyalty: baseOrder.loyalty
      ? {
          ...baseOrder.loyalty,
          pointsEarned: Number(baseOrder.loyalty.pointsEarned || 0),
          pointsRedeemed: Number(baseOrder.loyalty.pointsRedeemed || 0),
          rewardDiscountAmount: roundCurrency(baseOrder.loyalty.rewardDiscountAmount || 0),
          credited: Boolean(baseOrder.loyalty.credited),
          creditedAt: baseOrder.loyalty.creditedAt || null,
        }
      : null,
    referral: baseOrder.referral
      ? {
          ...baseOrder.referral,
          referrerUserId: normalizeId(baseOrder.referral.referrerUserId),
          referralDiscountAmount: roundCurrency(baseOrder.referral.referralDiscountAmount || 0),
          referrerRewardGranted: Boolean(baseOrder.referral.referrerRewardGranted),
        }
      : null,
    recommendations: baseOrder.recommendations
      ? {
          ...baseOrder.recommendations,
          suggestionIds: Array.isArray(baseOrder.recommendations.suggestionIds)
            ? baseOrder.recommendations.suggestionIds.map((value) => normalizeId(value))
            : [],
        }
      : null,
    riderSafety: baseOrder.riderSafety
      ? {
          ...baseOrder.riderSafety,
          activeSos: Boolean(baseOrder.riderSafety.activeSos),
          sosEvents: Array.isArray(baseOrder.riderSafety.sosEvents)
            ? baseOrder.riderSafety.sosEvents.map((event) => ({
                ...event,
                id: normalizeId(event.id || event._id),
                acknowledgedBy: normalizeId(event.acknowledgedBy),
                lat: normalizeNumber(event.lat, null),
                lng: normalizeNumber(event.lng, null),
              }))
            : [],
        }
      : null,
    disputes: Array.isArray(baseOrder.disputes)
      ? baseOrder.disputes.map((dispute) => ({
          ...dispute,
          id: normalizeId(dispute.id || dispute._id),
          createdByUserId: normalizeId(dispute.createdByUserId),
        }))
      : [],
    activeDisputeCount: Array.isArray(baseOrder.disputes)
      ? baseOrder.disputes.filter((dispute) => !['resolved', 'rejected'].includes(dispute.status)).length
      : 0,
    items: Array.isArray(baseOrder.items)
      ? baseOrder.items.map((item) => ({
          ...item,
          id: normalizeId(item.id || item._id || item.menuItemId),
          menuItemId: normalizeId(item.menuItemId || item.id || item._id),
          itemName: item.itemName || item.name || '',
          quantity: Number(item.quantity || 0),
          price: roundCurrency(item.price || 0),
          basePrice: roundCurrency(item.basePrice || item.price || 0),
          lineItemKey:
            item.lineItemKey ||
            buildLineItemKey({
              menuItemId: item.menuItemId || item.id || item._id,
              selectedVariant: item.selectedVariant,
              selectedAddons: item.selectedAddons,
              specialInstructions: item.specialInstructions,
            }),
          selectedVariant: item.selectedVariant
            ? {
                ...item.selectedVariant,
                id: normalizeId(item.selectedVariant.id || item.selectedVariant._id),
                priceModifier: roundCurrency(item.selectedVariant.priceModifier || 0),
              }
            : null,
          selectedAddons: Array.isArray(item.selectedAddons)
            ? item.selectedAddons.map((addon) => ({
                ...addon,
                id: normalizeId(addon.id || addon._id),
                price: roundCurrency(addon.price || 0),
              }))
            : [],
          addonsPrice: roundCurrency(item.addonsPrice || 0),
          specialInstructions: item.specialInstructions || '',
        }))
      : [],
  };
};

const serializeDriver = (driver = {}) => {
  const baseDriver = toPlainObject(driver);

  return {
    ...baseDriver,
    id: normalizeId(baseDriver.id || baseDriver._id),
    userId: normalizeId(baseDriver.userId),
    currentOrderId: normalizeId(baseDriver.currentOrderId),
    currentLat: normalizeNumber(baseDriver.currentLat, 0),
    currentLng: normalizeNumber(baseDriver.currentLng, 0),
    rating: roundCurrency(baseDriver.rating || 0),
    isOnline: Boolean(baseDriver.isOnline),
    availabilityStatus: baseDriver.availabilityStatus || (baseDriver.isOnline ? 'available' : 'offline'),
    serviceTypes: Array.isArray(baseDriver.serviceTypes) ? baseDriver.serviceTypes : [],
  };
};

const getSocketHelpers = () => {
  try {
    return require('../config/websocket');
  } catch (_error) {
    return null;
  }
};

const emitUserEvent = (userId, eventName, payload) => {
  try {
    const websocket = getSocketHelpers();
    if (!websocket || typeof websocket.io !== 'function' || !websocket.io()) {
      return;
    }

    websocket.emitToUser(userId, eventName, payload);
  } catch (_error) {
    // Notification delivery should not block order operations.
  }
};

const broadcastEvent = (eventName, payload) => {
  try {
    const websocket = getSocketHelpers();
    if (!websocket || typeof websocket.io !== 'function' || !websocket.io()) {
      return;
    }

    websocket.broadcast(eventName, payload);
  } catch (_error) {
    // Notification delivery should not block order operations.
  }
};

const saveNotification = async ({
  userId = null,
  deliveryPersonId = null,
  restaurantId = null,
  orderId = null,
  notificationType,
  title,
  body,
  context = {},
}) => {
  try {
    const notification = new FoodDeliveryNotification({
      userId: userId || undefined,
      deliveryPersonId: deliveryPersonId || undefined,
      restaurantId: restaurantId || undefined,
      orderId: orderId || undefined,
      notificationType,
      title,
      body,
      data: {
        orderId: normalizeId(orderId),
        screen: 'fooddelivery',
        action: 'view_order',
        metadata: context,
      },
      channels: [
        {
          type: 'in_app',
          status: 'delivered',
          sentAt: new Date(),
          deliveredAt: new Date(),
        },
      ],
      status: 'delivered',
      context,
    });

    await notification.save();
    return notification;
  } catch (_error) {
    return null;
  }
};

const readPersistedCart = (user = null) => {
  const storedCart = user?.preferences?.foodDeliveryCart;
  if (!storedCart || !Array.isArray(storedCart.items)) {
    return buildCartSummary();
  }

  return buildCartSummary(storedCart);
};

const buildReferralCode = (seed = '') => {
  const normalizedSeed = String(seed || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

  const prefix = normalizedSeed.slice(0, 6) || 'FEAST';
  const suffix = normalizedSeed.slice(-4).padEnd(4, 'X');
  return `FD${prefix}${suffix}`.slice(0, 14);
};

const normalizeRewardsProfile = (profile = {}, seed = '') => ({
  pointsBalance: Math.max(0, Number(profile.pointsBalance || 0)),
  lifetimePointsEarned: Math.max(0, Number(profile.lifetimePointsEarned || 0)),
  totalRedemptions: Math.max(0, Number(profile.totalRedemptions || 0)),
  totalPointsRedeemed: Math.max(0, Number(profile.totalPointsRedeemed || 0)),
  referralCode: String(profile.referralCode || buildReferralCode(seed || 'FEAST')).toUpperCase(),
  referralUsageCount: Math.max(0, Number(profile.referralUsageCount || 0)),
  referralCreditsEarned: Math.max(0, Number(profile.referralCreditsEarned || 0)),
  referredOrders: Math.max(0, Number(profile.referredOrders || 0)),
  lastRewardedOrderId: normalizeId(profile.lastRewardedOrderId),
  updatedAt: profile.updatedAt || null,
});

const getUserRecordById = async (userId) => {
  if (!userId) {
    return null;
  }

  if (useMemoryAuth()) {
    return devAuthStore.findUserById(userId);
  }

  return User.findById(userId).lean();
};

const getRewardsSeed = ({ user = null, userId = '', currentUser = null }) =>
  user?.email || currentUser?.email || user?.username || user?.name || userId || 'FEAST';

const readPersistedRewards = (user = null, currentUser = null, userId = '') =>
  normalizeRewardsProfile(user?.preferences?.foodDeliveryRewards || {}, getRewardsSeed({ user, userId, currentUser }));

const persistFoodRewards = async (userId, rewards = {}) => {
  const normalizedRewards = normalizeRewardsProfile(rewards, userId);

  if (!userId) {
    return normalizedRewards;
  }

  normalizedRewards.updatedAt = new Date();

  if (useMemoryAuth()) {
    await devAuthStore.updateUserById(userId, {
      preferences: {
        foodDeliveryRewards: normalizedRewards,
      },
    });
    return normalizedRewards;
  }

  await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        'preferences.foodDeliveryRewards': normalizedRewards,
      },
    },
    { new: false }
  );

  return normalizedRewards;
};

const getRewardsSummary = async ({ userId, currentUser = null }) => {
  const user = await getUserRecordById(userId);
  const profile = readPersistedRewards(user, currentUser, userId);

  return {
    ...profile,
    nextRewardUnlockAt:
      LOYALTY_EARNING_STEP - (Number(profile.lifetimePointsEarned || 0) % LOYALTY_EARNING_STEP || 0),
  };
};

const findReferrerByCode = async (referralCode = '', excludeUserId = '') => {
  const normalizedCode = String(referralCode || '').trim().toUpperCase();
  if (!normalizedCode || useMemoryAuth() || typeof User.findOne !== 'function') {
    return null;
  }

  const maybeQuery = User.findOne({
    _id: { $ne: excludeUserId || undefined },
    'preferences.foodDeliveryRewards.referralCode': normalizedCode,
  });

  if (!maybeQuery) {
    return null;
  }

  return typeof maybeQuery.lean === 'function' ? maybeQuery.lean() : maybeQuery;
};

const normalizeScheduledDelivery = (scheduledFor = null) => {
  if (!scheduledFor) {
    return {
      scheduleDeliveryFor: null,
      isScheduled: false,
      scheduledWindowLabel: '',
    };
  }

  const parsedDate = new Date(scheduledFor);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error('Scheduled delivery time is invalid');
  }

  const now = Date.now();
  if (parsedDate.getTime() < now + 15 * 60 * 1000) {
    throw new Error('Scheduled delivery must be at least 15 minutes from now');
  }

  if (parsedDate.getTime() > now + 7 * 24 * 60 * 60 * 1000) {
    throw new Error('Scheduled delivery can only be placed up to 7 days in advance');
  }

  const endWindow = new Date(parsedDate.getTime() + 30 * 60 * 1000);
  const label = `${parsedDate.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })} - ${endWindow.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })}`;

  return {
    scheduleDeliveryFor: parsedDate,
    isScheduled: true,
    scheduledWindowLabel: label,
  };
};

const getTrafficMultiplier = (targetDate = new Date()) => {
  const hour = new Date(targetDate).getHours();

  if ((hour >= 8 && hour <= 10) || (hour >= 18 && hour <= 21)) {
    return 1.35;
  }

  if (hour >= 22 || hour <= 6) {
    return 0.9;
  }

  return 1.1;
};

const getRouteStrategy = ({ distanceKm = 0, itemCount = 0, isScheduled = false }) => {
  if (isScheduled) {
    return 'scheduled-window';
  }

  if (distanceKm <= 2 && itemCount <= 3) {
    return 'express-short-hop';
  }

  if (distanceKm >= 6) {
    return 'distance-optimized';
  }

  return 'balanced';
};

const computeEtaSnapshot = ({
  items = [],
  restaurant = null,
  deliveryAddress = null,
  scheduledFor = null,
}) => {
  const totalItemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const preparationMinutes = Math.max(
    12,
    Math.round(
      items.reduce(
        (maxMinutes, item) => Math.max(maxMinutes, Number(item.prepTime || 0) + Math.max(0, Number(item.quantity || 0) - 1) * 2),
        0
      )
    )
  );

  const restaurantLat = normalizeNumber(restaurant?.location?.lat, null);
  const restaurantLng = normalizeNumber(restaurant?.location?.lng, null);
  const deliveryLat = normalizeNumber(deliveryAddress?.lat, null);
  const deliveryLng = normalizeNumber(deliveryAddress?.lng, null);
  const distanceKm =
    restaurantLat != null && restaurantLng != null && deliveryLat != null && deliveryLng != null
      ? calculateDistance(restaurantLat, restaurantLng, deliveryLat, deliveryLng)
      : Math.max(2.5, totalItemCount * 0.9);

  const trafficMultiplier = getTrafficMultiplier(scheduledFor || new Date());
  const deliveryMinutes = Math.max(8, Math.round((distanceKm / 20) * 60 * trafficMultiplier));
  const bufferMinutes = Math.max(4, Math.round(totalItemCount * 0.8));
  const totalMinutes = Math.max(18, preparationMinutes + deliveryMinutes + bufferMinutes);
  const routeStrategy = getRouteStrategy({
    distanceKm,
    itemCount: totalItemCount,
    isScheduled: Boolean(scheduledFor),
  });
  const estimatedArrivalAt = scheduledFor
    ? new Date(scheduledFor)
    : new Date(Date.now() + totalMinutes * 60 * 1000);

  return {
    preparationMinutes,
    deliveryMinutes,
    bufferMinutes,
    totalMinutes,
    trafficMultiplier,
    routeStrategy,
    estimatedArrivalAt,
    computedAt: new Date(),
  };
};

const getDriverRecordByUserId = (userId) => {
  if (!userId) {
    return null;
  }

  return Driver.findOne({ userId });
};

const getRestaurantRecord = (restaurantId) => {
  if (!restaurantId) {
    return null;
  }

  return Restaurant.findById(restaurantId);
};

const hydrateDriverProfile = async (driver = null) => {
  if (!driver) {
    return null;
  }

  const driverUser = await getUserRecordById(driver.userId);

  return {
    id: normalizeId(driver._id),
    userId: normalizeId(driver.userId),
    name: driverUser?.name || driverUser?.fullName || driverUser?.email || 'Delivery partner',
    phone: driverUser?.phone || driverUser?.mobile || '',
    email: driverUser?.email || '',
    rating: roundCurrency(driver.rating || 0),
    vehicleNumber: driver.vehicleNumber || '',
    vehicleType: driver.vehicleType || '',
  };
};

const syncDriverAvailability = (driver, { isOnline = driver?.isOnline } = {}) => {
  if (!driver) {
    return null;
  }

  driver.isOnline = Boolean(isOnline);

  if (driver.availabilityStatus === 'suspended') {
    return driver;
  }

  if (!driver.isOnline) {
    driver.availabilityStatus = 'offline';
    return driver;
  }

  driver.availabilityStatus = driver.currentOrderId ? 'busy' : 'available';
  return driver;
};

const maybeMarkModified = (document, path) => {
  if (document && typeof document.markModified === 'function') {
    document.markModified(path);
  }
};

const buildTrackingState = (order, restaurant = null) => {
  const currentTracking = order?.tracking || {};
  const etaSnapshot = order?.etaSnapshot || {};

  return {
    status: currentTracking.status || (order?.driverId ? 'assigned' : 'unassigned'),
    restaurantLocation: {
      lat: normalizeNumber(currentTracking.restaurantLocation?.lat, normalizeNumber(restaurant?.location?.lat, null)),
      lng: normalizeNumber(currentTracking.restaurantLocation?.lng, normalizeNumber(restaurant?.location?.lng, null)),
      address:
        currentTracking.restaurantLocation?.address ||
        restaurant?.location?.address ||
        restaurant?.name ||
        '',
    },
    deliveryLocation: {
      lat: normalizeNumber(currentTracking.deliveryLocation?.lat, normalizeNumber(order?.deliveryAddress?.lat, null)),
      lng: normalizeNumber(currentTracking.deliveryLocation?.lng, normalizeNumber(order?.deliveryAddress?.lng, null)),
      address:
        currentTracking.deliveryLocation?.address ||
        [order?.deliveryAddress?.street, order?.deliveryAddress?.city, order?.deliveryAddress?.pincode]
          .filter(Boolean)
          .join(', '),
    },
    currentLocation: currentTracking.currentLocation || null,
    distanceFromRestaurantKm: roundCurrency(currentTracking.distanceFromRestaurantKm || 0),
    distanceToCustomerKm: roundCurrency(currentTracking.distanceToCustomerKm || 0),
    estimatedArrivalMinutes: Number(
      currentTracking.estimatedArrivalMinutes || etaSnapshot.deliveryMinutes || etaSnapshot.totalMinutes || 0
    ),
    trafficMultiplier: roundCurrency(currentTracking.trafficMultiplier || etaSnapshot.trafficMultiplier || 1),
    routeStrategy: currentTracking.routeStrategy || etaSnapshot.routeStrategy || 'balanced',
    lastUpdatedAt: currentTracking.lastUpdatedAt || null,
    routeHistory: Array.isArray(currentTracking.routeHistory) ? currentTracking.routeHistory : [],
  };
};

const calculateEstimatedArrivalMinutes = (distanceKm = 0, speedKmh = 22) => {
  const safeDistance = Number(distanceKm || 0);
  const safeSpeed = Number(speedKmh || 0) > 0 ? Number(speedKmh || 0) : 22;

  if (!safeDistance) {
    return 0;
  }

  return Math.max(1, Math.round((safeDistance / safeSpeed) * 60));
};

const applyTrackingMetrics = ({ tracking, status = '', previousTrackingStatus = '' }) => {
  const nextTracking = {
    ...tracking,
    routeHistory: Array.isArray(tracking.routeHistory) ? tracking.routeHistory.slice(-50) : [],
  };

  if (
    nextTracking.currentLocation?.lat != null &&
    nextTracking.currentLocation?.lng != null &&
    nextTracking.restaurantLocation?.lat != null &&
    nextTracking.restaurantLocation?.lng != null
  ) {
    nextTracking.distanceFromRestaurantKm = roundCurrency(
      calculateDistance(
        nextTracking.currentLocation.lat,
        nextTracking.currentLocation.lng,
        nextTracking.restaurantLocation.lat,
        nextTracking.restaurantLocation.lng
      )
    );
  }

  if (
    nextTracking.currentLocation?.lat != null &&
    nextTracking.currentLocation?.lng != null &&
    nextTracking.deliveryLocation?.lat != null &&
    nextTracking.deliveryLocation?.lng != null
  ) {
    nextTracking.distanceToCustomerKm = roundCurrency(
      calculateDistance(
        nextTracking.currentLocation.lat,
        nextTracking.currentLocation.lng,
        nextTracking.deliveryLocation.lat,
        nextTracking.deliveryLocation.lng
      )
    );
    const effectiveSpeed =
      Number(nextTracking.currentLocation.speed || 0) > 0
        ? Number(nextTracking.currentLocation.speed || 0) / Math.max(0.7, Number(nextTracking.trafficMultiplier || 1))
        : 0;
    nextTracking.estimatedArrivalMinutes = calculateEstimatedArrivalMinutes(
      nextTracking.distanceToCustomerKm,
      effectiveSpeed
    );
  }

  if (
    status === 'out-for-delivery' &&
    previousTrackingStatus !== 'nearby' &&
    nextTracking.distanceToCustomerKm > 0 &&
    nextTracking.distanceToCustomerKm <= 0.8
  ) {
    nextTracking.status = 'nearby';
  }

  if (
    nextTracking.status === 'nearby' &&
    nextTracking.distanceToCustomerKm > 0 &&
    nextTracking.distanceToCustomerKm <= 0.25
  ) {
    nextTracking.status = 'arrived';
  }

  nextTracking.lastUpdatedAt = new Date();

  return nextTracking;
};

const notifyOrderStakeholders = async ({
  order,
  restaurant = null,
  customerNotification = null,
  riderNotification = null,
  restaurantNotification = null,
  broadcastEventName = 'fooddelivery:order:update',
}) => {
  if (!order) {
    return;
  }

  const serializedOrder = serializeOrder(order);
  const resolvedRestaurant =
    restaurant || (order.restaurantId ? await Restaurant.findById(order.restaurantId).select('ownerId name').lean() : null);

  emitUserEvent(serializedOrder.customerId, broadcastEventName, serializedOrder);

  if (serializedOrder.driverProfile?.userId) {
    emitUserEvent(serializedOrder.driverProfile.userId, broadcastEventName, serializedOrder);
  }

  if (normalizeId(resolvedRestaurant?.ownerId)) {
    emitUserEvent(normalizeId(resolvedRestaurant.ownerId), broadcastEventName, serializedOrder);
  }

  broadcastEvent(broadcastEventName, serializedOrder);

  if (customerNotification) {
    await saveNotification({
      userId: order.customerId,
      orderId: order._id,
      restaurantId: order.restaurantId,
      notificationType: customerNotification.type,
      title: customerNotification.title,
      body: customerNotification.body,
      context: customerNotification.context || {},
    });
    emitUserEvent(serializedOrder.customerId, 'fooddelivery:notification', customerNotification);
  }

  if (riderNotification && order.driverId) {
    await saveNotification({
      deliveryPersonId: order.driverId,
      orderId: order._id,
      restaurantId: order.restaurantId,
      notificationType: riderNotification.type,
      title: riderNotification.title,
      body: riderNotification.body,
      context: riderNotification.context || {},
    });
    if (serializedOrder.driverProfile?.userId) {
      emitUserEvent(serializedOrder.driverProfile.userId, 'fooddelivery:notification', riderNotification);
    }
  }

  if (restaurantNotification && normalizeId(resolvedRestaurant?.ownerId)) {
    await saveNotification({
      userId: resolvedRestaurant.ownerId,
      restaurantId: order.restaurantId,
      orderId: order._id,
      notificationType: restaurantNotification.type,
      title: restaurantNotification.title,
      body: restaurantNotification.body,
      context: restaurantNotification.context || {},
    });
    emitUserEvent(normalizeId(resolvedRestaurant.ownerId), 'fooddelivery:notification', restaurantNotification);
  }
};

const persistFoodCart = async (userId, cart) => {
  const normalizedCart = serializeCart(cart);

  if (!userId) {
    return normalizedCart;
  }

  if (useMemoryAuth()) {
    await devAuthStore.updateUserById(userId, {
      preferences: {
        foodDeliveryCart: normalizedCart,
      },
    });
    return normalizedCart;
  }

  await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        'preferences.foodDeliveryCart': normalizedCart,
      },
    },
    { new: false }
  );

  return normalizedCart;
};

const clearPersistedFoodCart = async (userId) => {
  if (!userId) {
    return;
  }

  if (useMemoryAuth()) {
    await devAuthStore.updateUserById(userId, {
      preferences: {
        foodDeliveryCart: null,
      },
    });
    return;
  }

  await User.findByIdAndUpdate(
    userId,
    {
      $unset: {
        'preferences.foodDeliveryCart': 1,
      },
    },
    { new: false }
  );
};

const getUserCartSnapshot = async (userId) => {
  const user = await getUserRecordById(userId);
  return readPersistedCart(user);
};

const creditDeliveredLoyaltyBenefits = async (order) => {
  if (!order || !order.customerId) {
    return;
  }

  order.loyalty = order.loyalty || {};

  if (!order.loyalty.credited && Number(order.loyalty.pointsEarned || 0) > 0) {
    const customerRewards = await getRewardsSummary({ userId: normalizeId(order.customerId) });
    await persistFoodRewards(normalizeId(order.customerId), {
      ...customerRewards,
      pointsBalance: Number(customerRewards.pointsBalance || 0) + Number(order.loyalty.pointsEarned || 0),
      lifetimePointsEarned:
        Number(customerRewards.lifetimePointsEarned || 0) + Number(order.loyalty.pointsEarned || 0),
      lastRewardedOrderId: normalizeId(order._id),
    });

    order.loyalty.credited = true;
    order.loyalty.creditedAt = new Date();
    maybeMarkModified(order, 'loyalty');
  }

  order.referral = order.referral || {};
  if (
    order.referral.referrerUserId &&
    !order.referral.referrerRewardGranted
  ) {
    const referrerRewards = await getRewardsSummary({ userId: normalizeId(order.referral.referrerUserId) });
    await persistFoodRewards(normalizeId(order.referral.referrerUserId), {
      ...referrerRewards,
      pointsBalance: Number(referrerRewards.pointsBalance || 0) + REFERRAL_REWARD_POINTS,
      lifetimePointsEarned: Number(referrerRewards.lifetimePointsEarned || 0) + REFERRAL_REWARD_POINTS,
      referralCreditsEarned: Number(referrerRewards.referralCreditsEarned || 0) + REFERRAL_REWARD_POINTS,
      referredOrders: Number(referrerRewards.referredOrders || 0) + 1,
    });

    order.referral.referrerRewardGranted = true;
    maybeMarkModified(order, 'referral');
  }
};

const refundRedeemedPoints = async (order) => {
  if (!order?.customerId || Number(order?.loyalty?.pointsRedeemed || 0) <= 0) {
    return;
  }

  const customerRewards = await getRewardsSummary({ userId: normalizeId(order.customerId) });
  await persistFoodRewards(normalizeId(order.customerId), {
    ...customerRewards,
    pointsBalance: Number(customerRewards.pointsBalance || 0) + Number(order.loyalty.pointsRedeemed || 0),
    totalRedemptions: Math.max(0, Number(customerRewards.totalRedemptions || 0) - 1),
    totalPointsRedeemed: Math.max(
      0,
      Number(customerRewards.totalPointsRedeemed || 0) - Number(order.loyalty.pointsRedeemed || 0)
    ),
  });

  order.loyalty.pointsRedeemed = 0;
  order.loyalty.rewardDiscountAmount = 0;
  maybeMarkModified(order, 'loyalty');
};

const resolveRequestedStatus = (currentStatus, requestedStatus) => {
  const normalizedCurrent = normalizeId(currentStatus).toLowerCase() || ORDER_STATUS_SEQUENCE[0];
  const normalizedRequested = normalizeId(requestedStatus).toLowerCase();

  if (normalizedRequested === 'next') {
    const currentIndex = ORDER_STATUS_SEQUENCE.indexOf(normalizedCurrent);
    if (currentIndex === -1 || currentIndex === ORDER_STATUS_SEQUENCE.length - 1) {
      return normalizedCurrent;
    }
    return ORDER_STATUS_SEQUENCE[currentIndex + 1];
  }

  const mappedStatus = ORDER_STATUS_ALIASES[normalizedRequested] || normalizedRequested;
  if (!ORDER_STATUS_SEQUENCE.includes(mappedStatus) && mappedStatus !== 'cancelled') {
    throw new Error(`Unsupported order status: ${requestedStatus}`);
  }

  return mappedStatus;
};

const resolveRestaurantStatus = (status) => {
  const normalizedStatus = normalizeId(status).toLowerCase();
  const mappedStatus = ORDER_STATUS_ALIASES[normalizedStatus] || normalizedStatus;

  if (!RESTAURANT_STATUS_SEQUENCE.includes(mappedStatus)) {
    throw new Error(`Unsupported restaurant order status: ${status}`);
  }

  return mappedStatus;
};

const resolveRewardRedemption = ({
  requestedPoints = 0,
  rewardsProfile = {},
  subtotal = 0,
}) => {
  const requested = Math.max(0, Math.floor(Number(requestedPoints || 0)));
  const balance = Math.max(0, Math.floor(Number(rewardsProfile.pointsBalance || 0)));
  const maxRedeemable = Math.floor(Math.max(0, Number(subtotal || 0) * MAX_REWARD_REDEMPTION_SHARE));
  const pointsRedeemed = Math.min(requested, balance, maxRedeemable);

  return {
    pointsRedeemed,
    rewardDiscountAmount: roundCurrency(pointsRedeemed),
  };
};

const resolveReferralHook = async ({
  referralCode = '',
  userId = '',
  currentUser = null,
}) => {
  const normalizedCode = String(referralCode || '').trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }

  const currentRewards = await getRewardsSummary({ userId, currentUser });
  if (normalizedCode === currentRewards.referralCode) {
    throw new Error('You cannot apply your own referral code');
  }

  const referrer = await findReferrerByCode(normalizedCode, userId);
  if (!useMemoryAuth() && !referrer) {
    throw new Error('Invalid referral code');
  }

  return {
    referralCodeApplied: normalizedCode,
    referralDiscountAmount: REFERRAL_DISCOUNT,
    referrerUserId: normalizeId(referrer?._id),
    referrerRewardGranted: false,
  };
};

const buildRecommendations = async ({
  restaurantId,
  cartItems = [],
  limit = 6,
}) => {
  const availableItemsQuery = MenuItem.find({
    restaurantId,
    available: { $ne: false },
  });
  const availableItems = Array.isArray(availableItemsQuery)
    ? availableItemsQuery
    : typeof availableItemsQuery.sort === 'function'
      ? await availableItemsQuery.sort({ popularityScore: -1, price: 1, name: 1 })
      : await availableItemsQuery;

  const cartCategories = new Set((Array.isArray(cartItems) ? cartItems : []).map((item) => item.category).filter(Boolean));
  const cartTags = new Set(
    (Array.isArray(cartItems) ? cartItems : [])
      .flatMap((item) => (Array.isArray(item.recommendationTags) ? item.recommendationTags : []))
      .filter(Boolean)
  );

  const rankedItems = availableItems
    .map((item) => {
      const itemId = normalizeId(item._id);
      const alreadyInCart = (Array.isArray(cartItems) ? cartItems : []).some(
        (cartItem) => normalizeId(cartItem.menuItemId || cartItem.id) === itemId
      );
      const categoryBoost = cartCategories.has(item.category) ? 12 : 0;
      const tagBoost = Array.isArray(item.recommendationTags)
        ? item.recommendationTags.reduce((score, tag) => (cartTags.has(tag) ? score + 8 : score), 0)
        : 0;

      return {
        item,
        score: Number(item.popularityScore || 0) + categoryBoost + tagBoost + (alreadyInCart ? -20 : 0),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(1, Number(limit || 6)));

  return rankedItems.map(({ item }) => serializeMenuItem(item));
};

const resolveCartItems = async ({ restaurantId, cartItems = [] }) => {
  const requestedRestaurantId = normalizeId(restaurantId);
  const requestedItems = Array.isArray(cartItems) ? cartItems : [];

  if (requestedItems.length === 0) {
    throw new Error('Cart is empty');
  }

  const menuItemIds = requestedItems
    .map((item) => normalizeId(item.menuItemId || item.itemId || item.id))
    .filter(Boolean);

  if (menuItemIds.length === 0) {
    throw new Error('Cart items are missing menu item ids');
  }

  const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
  const menuItemsById = new Map(menuItems.map((item) => [normalizeId(item._id), item]));

  return requestedItems
    .map((requestedItem) => {
      const menuItemId = normalizeId(requestedItem.menuItemId || requestedItem.itemId || requestedItem.id);
      const menuItem = menuItemsById.get(menuItemId);

      if (!menuItem) {
        throw new Error(`Menu item not found: ${menuItemId}`);
      }

      if (requestedRestaurantId && normalizeId(menuItem.restaurantId) !== requestedRestaurantId) {
        throw new Error('Cart contains items from a different restaurant');
      }

      if (menuItem.available === false) {
        throw new Error(`${menuItem.name} is currently unavailable`);
      }

      const quantity = Math.max(0, Number(requestedItem.quantity || 0));
      if (!quantity) {
        return null;
      }

      const selectedVariantId = normalizeId(requestedItem.variantId || requestedItem.selectedVariant?.id);
      const selectedVariant = selectedVariantId
        ? (Array.isArray(menuItem.variants)
            ? menuItem.variants.find((variant) => normalizeId(variant.id || variant._id) === selectedVariantId)
            : null)
        : null;

      if (selectedVariantId && !selectedVariant) {
        throw new Error(`Selected variant is unavailable for ${menuItem.name}`);
      }

      if (selectedVariant && selectedVariant.available === false) {
        throw new Error(`${menuItem.name} variant is currently unavailable`);
      }

      const requestedAddons = Array.isArray(requestedItem.addonIds)
        ? requestedItem.addonIds
        : Array.isArray(requestedItem.selectedAddons)
          ? requestedItem.selectedAddons
          : [];

      const selectedAddons = requestedAddons.map((addonValue) => {
        const addonId = normalizeId(addonValue?.id || addonValue);
        const addon = Array.isArray(menuItem.addons)
          ? menuItem.addons.find((candidate) => normalizeId(candidate.id || candidate._id) === addonId)
          : null;

        if (!addon) {
          throw new Error(`Selected add-on is unavailable for ${menuItem.name}`);
        }

        if (addon.available === false) {
          throw new Error(`${addon.name} is currently unavailable`);
        }

        return {
          id: normalizeId(addon.id || addon._id),
          name: addon.name,
          price: roundCurrency(addon.price || 0),
          prepTimeModifier: Number(addon.prepTimeModifier || 0),
          vegetarian: addon.vegetarian !== false,
        };
      });

      const basePrice = roundCurrency(menuItem.price || 0);
      const variantPriceModifier = roundCurrency(selectedVariant?.priceModifier || 0);
      const addonsPrice = roundCurrency(
        selectedAddons.reduce((sum, addon) => sum + Number(addon.price || 0), 0)
      );
      const finalPrice = roundCurrency(basePrice + variantPriceModifier + addonsPrice);
      const prepTime = Math.max(
        1,
        Number(menuItem.prepTime || 0) +
          Number(selectedVariant?.prepTimeModifier || 0) +
          selectedAddons.reduce((sum, addon) => sum + Number(addon.prepTimeModifier || 0), 0)
      );
      const specialInstructions = String(requestedItem.specialInstructions || '').trim();
      const lineItemKey =
        requestedItem.lineItemKey ||
        buildLineItemKey({
          menuItemId: normalizeId(menuItem._id),
          selectedVariant,
          selectedAddons,
          specialInstructions,
        });

      return {
        id: normalizeId(menuItem._id),
        menuItemId: normalizeId(menuItem._id),
        lineItemKey,
        itemName: menuItem.name,
        name: menuItem.name,
        price: finalPrice,
        basePrice,
        quantity,
        category: menuItem.category || '',
        vegetarian: Boolean(menuItem.vegetarian),
        prepTime,
        image: requestedItem.image || menuItem.imageUrl || '',
        customizations: requestedItem.customizations || {},
        selectedVariant: selectedVariant
          ? {
              id: normalizeId(selectedVariant.id || selectedVariant._id),
              name: selectedVariant.name,
              label: selectedVariant.label || '',
              priceModifier: variantPriceModifier,
              prepTimeModifier: Number(selectedVariant.prepTimeModifier || 0),
            }
          : null,
        selectedAddons,
        addonsPrice,
        specialInstructions,
      };
    })
    .filter(Boolean);
};

const normalizeCouponCode = (couponCode = '') => String(couponCode || '').trim().toUpperCase();

const resolveCoupon = async ({ couponCode = '', subtotal = 0, userId = '' }) => {
  const normalizedCouponCode = normalizeCouponCode(couponCode);

  if (!normalizedCouponCode) {
    return null;
  }

  const coupon = await Coupon.findOne({ code: normalizedCouponCode });
  if (!coupon) {
    throw new Error('Invalid coupon code');
  }

  if (!coupon.isActive) {
    throw new Error('Coupon is not active');
  }

  const now = new Date();
  if (coupon.startAt && now < new Date(coupon.startAt)) {
    throw new Error('Coupon is not active yet');
  }

  if (coupon.endAt && now > new Date(coupon.endAt)) {
    throw new Error('Coupon has expired');
  }

  if (subtotal < Number(coupon.minOrderAmount || 0)) {
    throw new Error(`Minimum order amount for this coupon is INR ${Number(coupon.minOrderAmount || 0)}`);
  }

  if (Number(coupon.maxUses || 0) > 0) {
    const totalUsageCount = await FoodOrder.countDocuments({ 'coupon.code': normalizedCouponCode });
    if (totalUsageCount >= Number(coupon.maxUses)) {
      throw new Error('Coupon usage limit has been reached');
    }
  }

  if (userId && Number(coupon.perUserUses || 0) > 0) {
    const userUsageCount = await FoodOrder.countDocuments({
      customerId: userId,
      'coupon.code': normalizedCouponCode,
    });
    if (userUsageCount >= Number(coupon.perUserUses)) {
      throw new Error('You have already used this coupon the maximum number of times');
    }
  }

  let discountAmount = 0;
  if (coupon.discountType === 'fixed') {
    discountAmount = Number(coupon.discountValue || 0);
  } else {
    discountAmount = (Number(subtotal || 0) * Number(coupon.discountValue || 0)) / 100;
  }

  discountAmount = roundCurrency(Math.max(0, Math.min(discountAmount, Number(subtotal || 0))));

  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue || 0),
    discountAmount,
  };
};

const computeDeliveryCharge = (subtotal = 0) => {
  if (subtotal >= FREE_DELIVERY_THRESHOLD) {
    return 0;
  }

  if (subtotal >= REDUCED_DELIVERY_THRESHOLD) {
    return REDUCED_DELIVERY_FEE;
  }

  return BASE_DELIVERY_FEE;
};

const getCheckoutSummary = async ({
  userId,
  restaurantId,
  cartItems = null,
  couponCode = '',
  paymentMethod = 'cod',
  tipAmount = 0,
  walletAmount = 0,
  deliveryAddress = null,
  deliveryInstructions = '',
  scheduledFor = null,
  rewardPointsToRedeem = 0,
  referralCode = '',
  currentUser = null,
}) => {
  const existingCart = await getUserCartSnapshot(userId);
  const normalizedRestaurantId = normalizeId(restaurantId) || existingCart.restaurantId;

  if (!normalizedRestaurantId) {
    throw new Error('restaurantId is required');
  }

  const sourceCartItems =
    Array.isArray(cartItems) && cartItems.length > 0
      ? cartItems
      : (await getCartForUser({ userId, restaurantId: normalizedRestaurantId })).items;

  const resolvedItems = await resolveCartItems({
    restaurantId: normalizedRestaurantId,
    cartItems: sourceCartItems,
  });

  if (resolvedItems.length === 0) {
    throw new Error('Cart is empty');
  }

  const subtotal = roundCurrency(
    resolvedItems.reduce((sum, item) => sum + roundCurrency(item.price * item.quantity), 0)
  );
  const rewardsProfile = await getRewardsSummary({ userId, currentUser });
  const rewardRedemption = resolveRewardRedemption({
    requestedPoints: rewardPointsToRedeem,
    rewardsProfile,
    subtotal,
  });
  const referral = await resolveReferralHook({
    referralCode,
    userId,
    currentUser,
  });

  const appliedCoupon = await resolveCoupon({
    couponCode,
    subtotal,
    userId,
  });

  const discountAmount = roundCurrency(
    Number(appliedCoupon?.discountAmount || 0) +
      Number(rewardRedemption.rewardDiscountAmount || 0) +
      Number(referral?.referralDiscountAmount || 0)
  );
  const discountedSubtotal = roundCurrency(Math.max(0, subtotal - discountAmount));
  const deliveryCharge = roundCurrency(computeDeliveryCharge(discountedSubtotal));
  const platformFee = roundCurrency(DEFAULT_PLATFORM_FEE);
  const taxAmount = roundCurrency(discountedSubtotal * GST_RATE);
  const normalizedTipAmount = roundCurrency(Math.max(0, Number(tipAmount || 0)));
  const scheduling = normalizeScheduledDelivery(scheduledFor);
  const restaurantRecord = await Restaurant.findById(normalizedRestaurantId).lean();
  const etaSnapshot = computeEtaSnapshot({
    items: resolvedItems,
    restaurant: restaurantRecord,
    deliveryAddress,
    scheduledFor: scheduling.scheduleDeliveryFor,
  });
  const rewardPointsEarned = Math.max(
    0,
    Math.floor(discountedSubtotal / LOYALTY_EARNING_STEP)
  );

  const grossTotal = roundCurrency(
    discountedSubtotal + deliveryCharge + platformFee + taxAmount + normalizedTipAmount
  );

  const normalizedPaymentMethod = String(paymentMethod || 'cod').trim().toLowerCase();
  const walletBalance = currentUser?.email ? roundCurrency(await getWalletBalance(currentUser.email)) : 0;
  const requestedWalletAmount = roundCurrency(Math.max(0, Number(walletAmount || 0)));

  let walletUsed = 0;
  let payableAmount = grossTotal;
  let validationMessage = '';

  if (normalizedPaymentMethod === 'wallet') {
    walletUsed = roundCurrency(Math.min(walletBalance, grossTotal));
    payableAmount = roundCurrency(Math.max(0, grossTotal - walletUsed));
    if (payableAmount > 0) {
      validationMessage = 'Insufficient wallet balance for wallet-only checkout';
    }
  } else if (requestedWalletAmount > 0) {
    walletUsed = roundCurrency(Math.min(requestedWalletAmount, walletBalance, grossTotal));
    payableAmount = roundCurrency(Math.max(0, grossTotal - walletUsed));
  }

  return {
    restaurantId: normalizedRestaurantId,
    items: resolvedItems.map(serializeMenuItem),
    itemCount: resolvedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    subtotal,
    discountAmount,
    appliedCoupon,
    referral,
    deliveryCharge,
    platformFee,
    taxAmount,
    gstRate: GST_RATE,
    tipAmount: normalizedTipAmount,
    totalAmount: grossTotal,
    payableAmount,
    walletBalance,
    walletUsed,
    paymentMethod: normalizedPaymentMethod,
    deliveryAddress,
    deliveryInstructions,
    scheduledFor: scheduling.scheduleDeliveryFor,
    isScheduled: scheduling.isScheduled,
    scheduledWindowLabel: scheduling.scheduledWindowLabel,
    currency: 'INR',
    isValid: validationMessage.length === 0,
    validationMessage,
    isCodAllowed: normalizedPaymentMethod === 'cod',
    loyalty: {
      availablePoints: rewardsProfile.pointsBalance,
      pointsRedeemed: rewardRedemption.pointsRedeemed,
      rewardDiscountAmount: rewardRedemption.rewardDiscountAmount,
      pointsEarned: rewardPointsEarned,
      referralCode: rewardsProfile.referralCode,
    },
    etaSnapshot,
    recommendationSeed: resolvedItems.map((item) => normalizeId(item.menuItemId)),
  };
};

const initializeDevData = async () => {
  const sampleRestaurants = await Restaurant.find({}).limit(5);

  if (sampleRestaurants.length === 0) {
    return;
  }

  const existingMenuItemCount = await MenuItem.countDocuments({
    restaurantId: sampleRestaurants[0]._id,
  });

  if (existingMenuItemCount > 0) {
    return;
  }

  await MenuItem.insertMany([
    {
      _id: new mongoose.Types.ObjectId(),
      restaurantId: sampleRestaurants[0]._id,
      name: 'Chicken Biryani',
      description: 'Spicy Kerala style biryani',
      category: 'main',
      price: 250,
      available: true,
      prepTime: 20,
      vegetarian: false,
      spiceLevel: 'hot',
    },
  ]);
};

const getRestaurants = async (filters = {}) => {
  const query = {};

  if (filters.search) {
    query.$or = [
      { name: { $regex: escapeRegex(filters.search), $options: 'i' } },
      { cuisine: { $regex: escapeRegex(filters.search), $options: 'i' } },
    ];
  }

  if (filters.cuisine) {
    query.$and = [
      ...(query.$and || []),
      {
        $or: [
          { cuisine: { $regex: escapeRegex(filters.cuisine), $options: 'i' } },
          { cuisineTags: { $in: [filters.cuisine] } },
        ],
      },
    ];
  }

  let restaurants = await Restaurant.find(query).sort({ rating: -1, name: 1 });

  if (restaurants.length === 0 && Object.keys(query).length === 0) {
    restaurants = await Restaurant.find({ type: 'restaurant' }).sort({ rating: -1, name: 1 });
  }

  return restaurants;
};

const appendRestaurantAuditEntry = (restaurant, entry = {}) => {
  if (!restaurant) {
    return null;
  }

  const normalizedEntry = {
    id: new mongoose.Types.ObjectId().toString(),
    action: String(entry.action || 'restaurant.updated').trim(),
    summary: String(entry.summary || 'Restaurant operation updated').trim(),
    targetType: String(entry.targetType || 'restaurant').trim(),
    targetId: normalizeId(entry.targetId || restaurant._id),
    performedByUserId: normalizeId(entry.performedByUserId),
    performedByName: entry.performedByName || '',
    performedByRole: entry.performedByRole || '',
    metadata: entry.metadata || {},
    timestamp: entry.timestamp || new Date(),
  };

  restaurant.operationsAuditLog = Array.isArray(restaurant.operationsAuditLog)
    ? restaurant.operationsAuditLog
    : [];
  restaurant.operationsAuditLog.push(normalizedEntry);
  restaurant.operationsAuditLog = restaurant.operationsAuditLog.slice(
    -MAX_RESTAURANT_AUDIT_LOG_ENTRIES
  );
  maybeMarkModified(restaurant, 'operationsAuditLog');
  return normalizedEntry;
};

const getManagedRestaurants = async ({
  userId = '',
  currentUser = null,
  includeBootstrapRestaurants = true,
  permission = 'orders:view',
} = {}) => {
  const actor = buildRestaurantGovernanceContext({ currentUser, userId });
  const restaurants = await getRestaurants({});

  if (['admin', 'superadmin', 'operations', 'support'].includes(actor.role)) {
    return restaurants.map(serializeRestaurant);
  }

  return restaurants
    .filter((restaurant) => {
      const permissionSet = getRestaurantPermissionSetForActor(restaurant, actor);
      if (permissionSet.has(permission) || permissionSet.has('*')) {
        return true;
      }

      if (
        includeBootstrapRestaurants &&
        !hasClaimedRestaurantGovernance(restaurant) &&
        ['restaurant', 'entrepreneur', 'business', 'seller', 'owner'].includes(actor.role)
      ) {
        return true;
      }

      return false;
    })
    .map(serializeRestaurant);
};

const getRestaurantGovernance = async ({ restaurantId }) => {
  const restaurant = await Restaurant.findById(restaurantId).lean();
  if (!restaurant) {
    throw new Error('Restaurant not found');
  }

  const teamMembers = Array.isArray(restaurant.teamMembers)
    ? restaurant.teamMembers.map(serializeRestaurantTeamMember)
    : [];
  const recentAuditLog = Array.isArray(restaurant.operationsAuditLog)
    ? restaurant.operationsAuditLog
        .map(serializeRestaurantAuditEntry)
        .sort((left, right) => new Date(right.timestamp || 0) - new Date(left.timestamp || 0))
        .slice(0, 25)
    : [];

  return {
    restaurant: serializeRestaurant(restaurant),
    teamMembers,
    activeTeamMemberCount: teamMembers.filter((member) => member.status === 'active').length,
    recentAuditLog,
    permissionCatalog: Object.entries(RESTAURANT_PERMISSION_CATALOG).map(([value, label]) => ({
      value,
      label,
    })),
    roleTemplates: Object.entries(RESTAURANT_TEAM_ROLE_PERMISSIONS)
      .filter(([role]) => role !== 'owner')
      .map(([role, permissions]) => ({
        role,
        permissions,
      })),
  };
};

const upsertRestaurantTeamMember = async ({
  restaurantId,
  memberId = '',
  userId = '',
  email = '',
  name = '',
  role = 'support',
  permissions = [],
  status = 'active',
  actor = {},
}) => {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    throw new Error('Restaurant not found');
  }

  const normalizedUserId = normalizeId(userId);
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedUserId && !normalizedEmail) {
    throw new Error('Either userId or email is required for a restaurant team member');
  }

  const normalizedRole = normalizeRestaurantTeamRole(role);
  const normalizedPermissions = dedupeStrings([
    ...getPermissionsForRestaurantRole(normalizedRole),
    ...(Array.isArray(permissions)
      ? permissions.map(normalizeRestaurantPermission).filter(
          (permission) => RESTAURANT_PERMISSION_CATALOG[permission]
        )
      : []),
  ]);
  const normalizedStatus =
    String(status || 'active').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';

  restaurant.teamMembers = Array.isArray(restaurant.teamMembers) ? restaurant.teamMembers : [];

  let existingMember = restaurant.teamMembers.find(
    (member) =>
      normalizeId(member.id || member._id) === normalizeId(memberId) ||
      (normalizedUserId && normalizeId(member.userId) === normalizedUserId) ||
      (normalizedEmail && normalizeEmail(member.email) === normalizedEmail)
  );

  const isCreate = !existingMember;
  if (!existingMember) {
    existingMember = {
      id: new mongoose.Types.ObjectId().toString(),
      invitedAt: new Date(),
    };
    restaurant.teamMembers.push(existingMember);
  }

  existingMember.userId = normalizedUserId;
  existingMember.email = normalizedEmail;
  existingMember.name = String(name || existingMember.name || normalizedEmail || normalizedUserId).trim();
  existingMember.role = normalizedRole;
  existingMember.permissions = normalizedPermissions;
  existingMember.status = normalizedStatus;
  existingMember.invitedByUserId = normalizeId(actor.userId);
  existingMember.invitedByName = actor.name || '';
  existingMember.updatedAt = new Date();

  maybeMarkModified(restaurant, 'teamMembers');
  appendRestaurantAuditEntry(restaurant, {
    action: isCreate ? 'team.member_added' : 'team.member_updated',
    summary: isCreate
      ? `Added ${existingMember.name} as ${normalizedRole}`
      : `Updated ${existingMember.name} access`,
    targetType: 'team-member',
    targetId: normalizeId(existingMember.id),
    performedByUserId: normalizeId(actor.userId),
    performedByName: actor.name || '',
    performedByRole: actor.role || '',
    metadata: {
      role: normalizedRole,
      permissions: normalizedPermissions,
      status: normalizedStatus,
      email: normalizedEmail,
    },
  });

  await restaurant.save();
  return getRestaurantGovernance({ restaurantId: restaurant._id });
};

const getMenuByRestaurant = (restaurantId, filters = {}) => {
  const query = { restaurantId };

  if (filters.category) {
    query.category = filters.category;
  }

  return MenuItem.find(query).sort({ available: -1, category: 1, name: 1 });
};

const getRestaurantRecommendations = async ({ restaurantId, cartItems = [], limit = 6 }) => {
  if (!restaurantId) {
    throw new Error('restaurantId is required');
  }

  return buildRecommendations({
    restaurantId,
    cartItems,
    limit,
  });
};

const addItemToCart = async ({
  userId,
  restaurantId,
  itemId,
  quantity,
  variantId = '',
  addonIds = [],
  specialInstructions = '',
  customizations = {},
}) => {
  const normalizedRestaurantId = normalizeId(restaurantId);
  const normalizedItemId = normalizeId(itemId);
  const desiredQuantity = Number(quantity || 0);

  if (!normalizedRestaurantId || !normalizedItemId) {
    throw new Error('restaurantId and itemId are required');
  }

  if (desiredQuantity < 1) {
    throw new Error('quantity must be at least 1');
  }

  const menuItem = await MenuItem.findById(normalizedItemId);
  if (!menuItem) {
    throw new Error('Menu item not found');
  }

  if (normalizeId(menuItem.restaurantId) !== normalizedRestaurantId) {
    throw new Error('Menu item does not belong to the selected restaurant');
  }

  if (menuItem.available === false) {
    throw new Error(`${menuItem.name} is currently unavailable`);
  }

  const selectedVariantId = normalizeId(variantId);
  const selectedVariant = selectedVariantId
    ? (Array.isArray(menuItem.variants)
        ? menuItem.variants.find((variant) => normalizeId(variant.id || variant._id) === selectedVariantId)
        : null)
    : null;

  if (selectedVariantId && !selectedVariant) {
    throw new Error('Selected variant is not available');
  }

  if (selectedVariant && selectedVariant.available === false) {
    throw new Error('Selected variant is currently unavailable');
  }

  const selectedAddons = (Array.isArray(addonIds) ? addonIds : []).map((addonValue) => {
    const addonId = normalizeId(addonValue?.id || addonValue);
    const addon = Array.isArray(menuItem.addons)
      ? menuItem.addons.find((candidate) => normalizeId(candidate.id || candidate._id) === addonId)
      : null;

    if (!addon) {
      throw new Error('Selected add-on is not available');
    }

    if (addon.available === false) {
      throw new Error('Selected add-on is currently unavailable');
    }

    return {
      id: normalizeId(addon.id || addon._id),
      name: addon.name,
      price: roundCurrency(addon.price || 0),
      prepTimeModifier: Number(addon.prepTimeModifier || 0),
    };
  });

  const basePrice = roundCurrency(menuItem.price || 0);
  const addonsPrice = roundCurrency(selectedAddons.reduce((sum, addon) => sum + Number(addon.price || 0), 0));
  const specialNote = String(specialInstructions || '').trim();
  const lineItemKey = buildLineItemKey({
    menuItemId: normalizedItemId,
    selectedVariant,
    selectedAddons,
    specialInstructions: specialNote,
  });

  const currentCart = await getUserCartSnapshot(userId);
  const activeItems =
    currentCart.restaurantId && currentCart.restaurantId !== normalizedRestaurantId
      ? []
      : currentCart.items;

  const nextItems = activeItems.filter((item) => String(item.lineItemKey || '') !== lineItemKey);
  nextItems.push({
    id: normalizedItemId,
    menuItemId: normalizedItemId,
    lineItemKey,
    name: menuItem.name,
    itemName: menuItem.name,
    price: roundCurrency(basePrice + roundCurrency(selectedVariant?.priceModifier || 0) + addonsPrice),
    basePrice,
    quantity: desiredQuantity,
    category: menuItem.category || '',
    vegetarian: Boolean(menuItem.vegetarian),
    prepTime:
      Number(menuItem.prepTime || 0) +
      Number(selectedVariant?.prepTimeModifier || 0) +
      selectedAddons.reduce((sum, addon) => sum + Number(addon.prepTimeModifier || 0), 0),
    image: menuItem.imageUrl || '',
    customizations,
    selectedVariant: selectedVariant
      ? {
          id: normalizeId(selectedVariant.id || selectedVariant._id),
          name: selectedVariant.name,
          label: selectedVariant.label || '',
          priceModifier: roundCurrency(selectedVariant.priceModifier || 0),
          prepTimeModifier: Number(selectedVariant.prepTimeModifier || 0),
        }
      : null,
    selectedAddons,
    addonsPrice,
    specialInstructions: specialNote,
  });

  return persistFoodCart(userId, {
    ...currentCart,
    restaurantId: normalizedRestaurantId,
    items: nextItems,
  });
};

const getCartForUser = async ({ userId, restaurantId }) => {
  const normalizedRestaurantId = normalizeId(restaurantId);
  const currentCart = await getUserCartSnapshot(userId);

  if (!normalizedRestaurantId || !currentCart.restaurantId || currentCart.restaurantId === normalizedRestaurantId) {
    return currentCart;
  }

  return buildCartSummary({ restaurantId: normalizedRestaurantId, items: [] });
};

const clearCartForUser = async ({ userId, restaurantId }) => {
  const normalizedRestaurantId = normalizeId(restaurantId);
  const currentCart = await getUserCartSnapshot(userId);

  if (!normalizedRestaurantId || currentCart.restaurantId === normalizedRestaurantId) {
    await clearPersistedFoodCart(userId);
    return buildCartSummary({ restaurantId: normalizedRestaurantId, items: [] });
  }

  return buildCartSummary({ restaurantId: normalizedRestaurantId, items: [] });
};

const createOrder = (orderData) => {
  const order = new FoodOrder(orderData);
  return order.save();
};

const createOrderFromCart = async ({
  userId,
  restaurantId,
  cartItems = null,
  paymentMethod = 'cod',
  deliveryAddress = null,
  deliveryInstructions = '',
  couponCode = '',
  tipAmount = 0,
  walletAmount = 0,
  scheduledFor = null,
  rewardPointsToRedeem = 0,
  referralCode = '',
  currentUser = null,
}) => {
  const checkoutSummary = await getCheckoutSummary({
    userId,
    restaurantId,
    cartItems,
    couponCode,
    paymentMethod,
    tipAmount,
    walletAmount,
    deliveryAddress,
    deliveryInstructions,
    scheduledFor,
    rewardPointsToRedeem,
    referralCode,
    currentUser,
  });

  if (!checkoutSummary.isValid) {
    throw new Error(checkoutSummary.validationMessage || 'Cart is not ready for checkout');
  }

  const restaurantRecord = await Restaurant.findById(checkoutSummary.restaurantId).lean();
  const initialTrackingState = {
    status: 'unassigned',
    restaurantLocation: {
      lat: normalizeNumber(restaurantRecord?.location?.lat, null),
      lng: normalizeNumber(restaurantRecord?.location?.lng, null),
      address: restaurantRecord?.location?.address || restaurantRecord?.name || '',
    },
    deliveryLocation: {
      lat: normalizeNumber(deliveryAddress?.lat, null),
      lng: normalizeNumber(deliveryAddress?.lng, null),
      address: [deliveryAddress?.street, deliveryAddress?.city, deliveryAddress?.pincode]
        .filter(Boolean)
        .join(', '),
    },
    currentLocation: null,
    distanceFromRestaurantKm: 0,
    distanceToCustomerKm: 0,
    estimatedArrivalMinutes: Number(checkoutSummary.etaSnapshot?.totalMinutes || 0),
    trafficMultiplier: roundCurrency(checkoutSummary.etaSnapshot?.trafficMultiplier || 1),
    routeStrategy: checkoutSummary.etaSnapshot?.routeStrategy || 'balanced',
    lastUpdatedAt: null,
    routeHistory: [],
  };
  const recommendations = await buildRecommendations({
    restaurantId: checkoutSummary.restaurantId,
    cartItems: checkoutSummary.items,
    limit: 4,
  });

  const order = await createOrder({
    customerId: userId,
    restaurantId: checkoutSummary.restaurantId,
    items: checkoutSummary.items.map((item) => ({
      menuItemId: item.menuItemId || item.id,
      lineItemKey: item.lineItemKey,
      itemName: item.itemName || item.name,
      quantity: item.quantity,
      price: item.price,
      basePrice: item.basePrice,
      category: item.category || '',
      selectedVariant: item.selectedVariant || undefined,
      selectedAddons: item.selectedAddons || [],
      addonsPrice: item.addonsPrice || 0,
      specialInstructions: item.specialInstructions || '',
      customizations: item.customizations || {},
    })),
    subtotal: checkoutSummary.subtotal,
    discountAmount: checkoutSummary.discountAmount,
    coupon: checkoutSummary.appliedCoupon
      ? {
          code: checkoutSummary.appliedCoupon.code,
          discountType: checkoutSummary.appliedCoupon.discountType,
          discountValue: checkoutSummary.appliedCoupon.discountValue,
          discountAmount: checkoutSummary.appliedCoupon.discountAmount,
        }
      : undefined,
    deliveryCharge: checkoutSummary.deliveryCharge,
    platformFee: checkoutSummary.platformFee,
    taxAmount: checkoutSummary.taxAmount,
    tipAmount: checkoutSummary.tipAmount,
    walletUsed: checkoutSummary.walletUsed,
    totalAmount: checkoutSummary.totalAmount,
    payableAmount: checkoutSummary.payableAmount,
    deliveryAddress: deliveryAddress || undefined,
    deliveryInstructions,
    scheduleDeliveryFor: checkoutSummary.scheduledFor || undefined,
    isScheduled: Boolean(checkoutSummary.isScheduled),
    scheduledWindowLabel: checkoutSummary.scheduledWindowLabel || '',
    paymentMethod: checkoutSummary.paymentMethod,
    paymentStatus: checkoutSummary.walletUsed > 0 && checkoutSummary.payableAmount === 0 ? 'paid' : 'pending',
    orderStatus: 'placed',
    refundStatus: 'none',
    estimatedDelivery: checkoutSummary.etaSnapshot?.estimatedArrivalAt || new Date(Date.now() + 45 * 60 * 1000),
    etaSnapshot: checkoutSummary.etaSnapshot || undefined,
    trackingId: `FD-${Date.now()}`,
    tracking: initialTrackingState,
    loyalty: {
      pointsEarned: Number(checkoutSummary.loyalty?.pointsEarned || 0),
      pointsRedeemed: Number(checkoutSummary.loyalty?.pointsRedeemed || 0),
      rewardDiscountAmount: roundCurrency(checkoutSummary.loyalty?.rewardDiscountAmount || 0),
      credited: false,
    },
    referral: checkoutSummary.referral || undefined,
    recommendations: {
      generatedAt: new Date(),
      algorithm: 'popularity-tag-hybrid-v1',
      suggestionIds: recommendations.map((item) => normalizeId(item.id)),
    },
    riderSafety: {
      activeSos: false,
      sosEvents: [],
    },
    statusTimeline: [
      {
        status: 'placed',
        note: checkoutSummary.isScheduled
          ? `Scheduled order placed for ${checkoutSummary.scheduledWindowLabel}`
          : 'Order placed successfully',
        updatedBy: 'customer',
        timestamp: new Date(),
      },
    ],
  });

  if (checkoutSummary.walletUsed > 0) {
    try {
      await deductWalletBalance(
        currentUser?.email,
        checkoutSummary.walletUsed,
        normalizeId(order._id),
        'Food delivery checkout'
      );
    } catch (error) {
      order.paymentStatus = 'failed';
      order.statusTimeline.push({
        status: order.orderStatus,
        note: `Wallet charge failed: ${error.message}`,
        updatedBy: 'system',
        timestamp: new Date(),
      });
      await order.save();
      throw error;
    }
  }

  if (Number(checkoutSummary.loyalty?.pointsRedeemed || 0) > 0) {
    const existingRewards = await getRewardsSummary({ userId, currentUser });
    await persistFoodRewards(userId, {
      ...existingRewards,
      pointsBalance: Math.max(0, Number(existingRewards.pointsBalance || 0) - Number(checkoutSummary.loyalty.pointsRedeemed || 0)),
      totalRedemptions: Number(existingRewards.totalRedemptions || 0) + 1,
      totalPointsRedeemed:
        Number(existingRewards.totalPointsRedeemed || 0) + Number(checkoutSummary.loyalty.pointsRedeemed || 0),
    });
  }

  await clearPersistedFoodCart(userId);
  await notifyOrderStakeholders({
    order,
    restaurant: restaurantRecord,
    customerNotification: {
      type: 'order_confirmed',
      title: checkoutSummary.isScheduled ? 'Scheduled order placed' : 'Order placed successfully',
      body: checkoutSummary.isScheduled
        ? `${restaurantRecord?.name || 'Restaurant'} scheduled your order for ${checkoutSummary.scheduledWindowLabel}.`
        : `${restaurantRecord?.name || 'Restaurant'} received your order and will confirm it soon.`,
      context: {
        status: 'placed',
        scheduledFor: checkoutSummary.scheduledFor,
      },
    },
    restaurantNotification: {
      type: 'new_order_received',
      title: 'New food order received',
      body: `A new order ${normalizeId(order._id)} is waiting for confirmation.`,
      context: {
        status: 'placed',
      },
    },
  });

  return order;
};

const getOrdersByCustomer = async (customerId) => {
  const orders = await FoodOrder.find({ customerId }).sort({ createdAt: -1 }).lean();
  return orders.map(serializeOrder);
};

const getOrderById = (orderId) => FoodOrder.findById(orderId);

const getRestaurantOrders = async ({ restaurantId, status = '' }) => {
  const query = { restaurantId };

  if (status) {
    query.orderStatus = status;
  }

  const orders = await FoodOrder.find(query).sort({ createdAt: -1 }).lean();
  return orders.map(serializeOrder);
};

const getRiderActiveOrders = async ({ userId, includeCompleted = false }) => {
  const driver = await getDriverRecordByUserId(userId);
  if (!driver) {
    throw new Error('Rider profile not found');
  }

  const query = { driverId: driver._id };
  if (!includeCompleted) {
    query.orderStatus = { $in: ['confirmed', 'preparing', 'out-for-delivery'] };
  }

  const orders = await FoodOrder.find(query).sort({ createdAt: -1 }).lean();

  return {
    rider: serializeDriver(driver),
    orders: orders.map(serializeOrder),
  };
};

const getOrderTracking = async ({ orderId }) => {
  const order = await FoodOrder.findById(orderId).lean();
  if (!order) {
    throw new Error('Order not found');
  }

  const serializedOrder = serializeOrder(order);
  return {
    orderId: serializedOrder.id,
    orderStatus: serializedOrder.status,
    trackingId: order.trackingId || '',
    driver: serializedOrder.driverProfile || null,
    tracking: serializedOrder.tracking || null,
    etaSnapshot: serializedOrder.etaSnapshot || null,
    riderSafety: serializedOrder.riderSafety || null,
    recommendations: serializedOrder.recommendations || null,
    estimatedDelivery: serializedOrder.estimatedDelivery || null,
    actualDelivery: serializedOrder.actualDelivery || null,
  };
};

const getAssignmentCandidate = async ({ riderId = '', restaurant = null, deliveryAddress = null }) => {
  if (riderId) {
    const selectedDriver = await Driver.findById(riderId);
    if (!selectedDriver) {
      throw new Error('Selected rider not found');
    }
    return selectedDriver;
  }

  const drivers = await Driver.find({
    isOnline: true,
    availabilityStatus: { $in: ['available', 'busy'] },
    serviceTypes: { $in: ['fooddelivery'] },
  });

  const availableDrivers = drivers.filter((driver) => !normalizeId(driver.currentOrderId));
  if (availableDrivers.length === 0) {
    throw new Error('No food delivery riders are available right now');
  }

  const targetLat = normalizeNumber(restaurant?.location?.lat, normalizeNumber(deliveryAddress?.lat, null));
  const targetLng = normalizeNumber(restaurant?.location?.lng, normalizeNumber(deliveryAddress?.lng, null));

  const rankedDrivers = availableDrivers
    .map((driver) => {
      const verified = driver.documents?.verified || driver.kycStatus === 'approved';
      const canMeasureDistance =
        targetLat != null &&
        targetLng != null &&
        normalizeNumber(driver.currentLat, null) != null &&
        normalizeNumber(driver.currentLng, null) != null;

      return {
        driver,
        verificationScore: verified ? 0 : 1,
        distanceKm: canMeasureDistance
          ? calculateDistance(driver.currentLat, driver.currentLng, targetLat, targetLng)
          : Number.MAX_SAFE_INTEGER,
        ratingScore: Number(driver.rating || 0) * -1,
      };
    })
    .sort((left, right) => {
      if (left.verificationScore !== right.verificationScore) {
        return left.verificationScore - right.verificationScore;
      }

      if (left.distanceKm !== right.distanceKm) {
        return left.distanceKm - right.distanceKm;
      }

      return left.ratingScore - right.ratingScore;
    });

  return rankedDrivers[0].driver;
};

const releaseDriverFromOrder = async (driverId) => {
  if (!driverId) {
    return null;
  }

  const driver = await Driver.findById(driverId);
  if (!driver) {
    return null;
  }

  driver.currentOrderId = null;
  syncDriverAvailability(driver, { isOnline: driver.isOnline });
  await driver.save();
  return driver;
};

const createOrUpdateRiderProfile = async ({
  userId,
  vehicleNumber = '',
  vehicleType = 'bike',
  vehicleColor = '',
  licenseNumber = '',
  serviceArea = [],
  currentLat = null,
  currentLng = null,
  emergencyContact = null,
  documents = {},
  isOnline = false,
}) => {
  let driver = await getDriverRecordByUserId(userId);

  if (!driver) {
    driver = new Driver({
      userId,
      vehicleNumber: vehicleNumber || 'PENDING',
      vehicleType: vehicleType || 'bike',
    });
  }

  if (vehicleNumber) {
    driver.vehicleNumber = vehicleNumber;
  }
  if (vehicleType) {
    driver.vehicleType = vehicleType;
  }
  if (vehicleColor) {
    driver.vehicleColor = vehicleColor;
  }
  if (licenseNumber) {
    driver.licenseNumber = licenseNumber;
  }
  if (Array.isArray(serviceArea) && serviceArea.length > 0) {
    driver.serviceArea = serviceArea;
  }
  if (currentLat != null) {
    driver.currentLat = Number(currentLat);
  }
  if (currentLng != null) {
    driver.currentLng = Number(currentLng);
  }
  if (emergencyContact) {
    driver.emergencyContact = {
      ...driver.emergencyContact,
      ...emergencyContact,
    };
  }
  if (documents && typeof documents === 'object') {
    driver.documents = {
      ...(driver.documents || {}),
      ...documents,
    };
  }

  driver.serviceTypes = Array.from(new Set([...(driver.serviceTypes || []), 'fooddelivery']));
  driver.kycStatus = driver.documents?.verified ? 'approved' : (driver.licenseNumber ? 'submitted' : driver.kycStatus);
  syncDriverAvailability(driver, { isOnline });
  await driver.save();

  return serializeDriver(driver);
};

const updateRiderAvailability = async ({
  userId,
  isOnline,
  currentLat = null,
  currentLng = null,
}) => {
  const driver = await getDriverRecordByUserId(userId);
  if (!driver) {
    throw new Error('Rider profile not found');
  }

  if (currentLat != null) {
    driver.currentLat = Number(currentLat);
  }
  if (currentLng != null) {
    driver.currentLng = Number(currentLng);
  }

  syncDriverAvailability(driver, { isOnline });
  await driver.save();
  return serializeDriver(driver);
};

const assignRiderToOrder = async ({
  orderId,
  restaurantId = '',
  riderId = '',
  updatedBy = 'restaurant',
}) => {
  const order = await FoodOrder.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  if (restaurantId && normalizeId(order.restaurantId) !== normalizeId(restaurantId)) {
    throw new Error('Order does not belong to this restaurant');
  }

  if (['cancelled', 'delivered'].includes(order.orderStatus)) {
    throw new Error(`Cannot assign a rider to a ${order.orderStatus} order`);
  }

  const restaurant = await Restaurant.findById(order.restaurantId).lean();
  const driver = await getAssignmentCandidate({
    riderId,
    restaurant,
    deliveryAddress: order.deliveryAddress,
  });

  if (normalizeId(driver.currentOrderId) && normalizeId(driver.currentOrderId) !== normalizeId(order._id)) {
    throw new Error('Selected rider already has an active delivery');
  }

  order.driverId = driver._id;
  order.driverProfile = await hydrateDriverProfile(driver);
  order.assignedAt = new Date();
  order.assignedBy = updatedBy;
  order.assignmentMode = riderId ? 'manual' : 'auto';
  order.tracking = {
    ...buildTrackingState(order, restaurant),
    status: 'assigned',
    lastUpdatedAt: new Date(),
  };
  order.statusTimeline.push({
    status: order.orderStatus,
    note: `Rider ${order.driverProfile.name} assigned to order`,
    updatedBy,
    timestamp: new Date(),
  });
  maybeMarkModified(order, 'tracking');
  await order.save();

  driver.currentOrderId = order._id;
  driver.foodDeliveryStats = {
    ...(driver.foodDeliveryStats || {}),
    assignedOrders: Number(driver.foodDeliveryStats?.assignedOrders || 0) + 1,
  };
  syncDriverAvailability(driver, { isOnline: true });
  await driver.save();

  await notifyOrderStakeholders({
    order,
    restaurant,
    customerNotification: {
      type: 'rider_assigned',
      title: 'Rider assigned',
      body: `${order.driverProfile.name} is getting ready to deliver your order.`,
      context: {
        riderId: normalizeId(driver._id),
      },
    },
    riderNotification: {
      type: 'new_order_assigned',
      title: 'New delivery assigned',
      body: `Order ${normalizeId(order._id)} has been assigned to you.`,
      context: {
        riderId: normalizeId(driver._id),
      },
    },
    restaurantNotification: {
      type: 'order_details_updated',
      title: 'Rider assigned to order',
      body: `Order ${normalizeId(order._id)} now has an assigned rider.`,
      context: {
        riderId: normalizeId(driver._id),
      },
    },
  });

  return order;
};

const updateRiderLocation = async ({
  orderId,
  userId,
  lat,
  lng,
  accuracy = 0,
  speed = 0,
}) => {
  const driver = await getDriverRecordByUserId(userId);
  if (!driver) {
    throw new Error('Rider profile not found');
  }

  const order = await FoodOrder.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  if (normalizeId(order.driverId) !== normalizeId(driver._id)) {
    throw new Error('This rider is not assigned to the order');
  }

  const restaurant = await Restaurant.findById(order.restaurantId).lean();
  const previousTrackingStatus = order.tracking?.status || '';
  const trackingState = buildTrackingState(order, restaurant);
  const nextLocation = {
    lat: Number(lat),
    lng: Number(lng),
    accuracy: roundCurrency(accuracy),
    speed: roundCurrency(speed),
    updatedAt: new Date(),
  };

  trackingState.currentLocation = nextLocation;
  trackingState.routeHistory = [...(trackingState.routeHistory || []), nextLocation].slice(-50);
  trackingState.status = order.orderStatus === 'out-for-delivery' ? 'on-the-way' : trackingState.status;

  order.tracking = applyTrackingMetrics({
    tracking: trackingState,
    status: order.orderStatus,
    previousTrackingStatus,
  });
  maybeMarkModified(order, 'tracking');

  driver.currentLat = Number(lat);
  driver.currentLng = Number(lng);

  await Promise.all([order.save(), driver.save()]);

  const customerNotification =
    previousTrackingStatus !== order.tracking.status && order.tracking.status === 'nearby'
      ? {
          type: 'rider_nearby',
          title: 'Rider is nearby',
          body: 'Your delivery partner is close to your location.',
          context: {
            etaMinutes: order.tracking.estimatedArrivalMinutes,
          },
        }
      : previousTrackingStatus !== order.tracking.status && order.tracking.status === 'arrived'
        ? {
            type: 'rider_arrived',
            title: 'Rider has arrived',
            body: 'Your delivery partner has reached the delivery point.',
            context: {
              etaMinutes: 0,
            },
          }
        : null;

  await notifyOrderStakeholders({
    order,
    restaurant,
    customerNotification,
  });

  return order;
};

const triggerRiderSos = async ({
  orderId,
  userId,
  message = 'Emergency assistance requested by rider',
  lat = null,
  lng = null,
}) => {
  const driver = await getDriverRecordByUserId(userId);
  if (!driver) {
    throw new Error('Rider profile not found');
  }

  const order = await FoodOrder.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  if (normalizeId(order.driverId) !== normalizeId(driver._id)) {
    throw new Error('This rider is not assigned to the order');
  }

  const restaurant = await Restaurant.findById(order.restaurantId).lean();
  order.riderSafety = order.riderSafety || { activeSos: false, sosEvents: [] };
  order.riderSafety.activeSos = true;
  order.riderSafety.lastSosAt = new Date();
  order.riderSafety.sosEvents = Array.isArray(order.riderSafety.sosEvents) ? order.riderSafety.sosEvents : [];
  order.riderSafety.sosEvents.push({
    triggeredAt: new Date(),
    message: String(message || 'Emergency assistance requested by rider').trim(),
    lat: normalizeNumber(lat, normalizeNumber(driver.currentLat, null)),
    lng: normalizeNumber(lng, normalizeNumber(driver.currentLng, null)),
    status: 'open',
  });
  maybeMarkModified(order, 'riderSafety');

  order.statusTimeline.push({
    status: order.orderStatus,
    note: 'Rider SOS triggered',
    updatedBy: 'rider',
    timestamp: new Date(),
  });

  await order.save();

  await notifyOrderStakeholders({
    order,
    restaurant,
    riderNotification: {
      type: 'rider_sos_acknowledged',
      title: 'SOS raised',
      body: 'Operations and restaurant teams have been notified.',
      context: {
        orderId: normalizeId(order._id),
      },
    },
    restaurantNotification: {
      type: 'rider_sos',
      title: 'Rider SOS triggered',
      body: `The assigned rider for order ${normalizeId(order._id)} requested emergency support.`,
      context: {
        orderId: normalizeId(order._id),
      },
    },
  });

  broadcastEvent('fooddelivery:rider:sos', {
    orderId: normalizeId(order._id),
    riderSafety: serializeOrder(order).riderSafety,
  });

  return order;
};

const updateRiderOrderStatus = async ({
  orderId,
  userId,
  status,
  updatedBy = 'rider',
}) => {
  const driver = await getDriverRecordByUserId(userId);
  if (!driver) {
    throw new Error('Rider profile not found');
  }

  const order = await FoodOrder.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  if (normalizeId(order.driverId) !== normalizeId(driver._id)) {
    throw new Error('This rider is not assigned to the order');
  }

  const normalizedStatus = normalizeId(status).toLowerCase();
  const restaurant = await Restaurant.findById(order.restaurantId).lean();

  if (['picked-up', 'picked_up'].includes(normalizedStatus)) {
    order.orderStatus = 'out-for-delivery';
    order.pickedUpAt = new Date();
    order.tracking = {
      ...buildTrackingState(order, restaurant),
      status: 'picked-up',
      lastUpdatedAt: new Date(),
    };
  } else if (normalizedStatus === 'nearby') {
    order.tracking = {
      ...buildTrackingState(order, restaurant),
      status: 'nearby',
      lastUpdatedAt: new Date(),
    };
  } else if (normalizedStatus === 'arrived') {
    order.tracking = {
      ...buildTrackingState(order, restaurant),
      status: 'arrived',
      lastUpdatedAt: new Date(),
    };
  } else if (normalizedStatus === 'delivered') {
    order.orderStatus = 'delivered';
    order.actualDelivery = new Date();
    order.paymentStatus = order.paymentMethod === 'cod' ? 'paid' : order.paymentStatus;
    order.tracking = {
      ...buildTrackingState(order, restaurant),
      status: 'completed',
      lastUpdatedAt: new Date(),
      estimatedArrivalMinutes: 0,
      distanceToCustomerKm: 0,
    };
    await releaseDriverFromOrder(driver._id);
    driver.foodDeliveryStats = {
      ...(driver.foodDeliveryStats || {}),
      completedOrders: Number(driver.foodDeliveryStats?.completedOrders || 0) + 1,
    };
    await creditDeliveredLoyaltyBenefits(order);
  } else if (normalizedStatus === 'out-for-delivery') {
    order.orderStatus = 'out-for-delivery';
    order.tracking = {
      ...buildTrackingState(order, restaurant),
      status: 'on-the-way',
      lastUpdatedAt: new Date(),
    };
  } else {
    throw new Error(`Unsupported rider order status: ${status}`);
  }

  order.statusTimeline.push({
    status: order.orderStatus,
    note: `Rider updated delivery flow to ${normalizedStatus}`,
    updatedBy,
    timestamp: new Date(),
  });

  maybeMarkModified(order, 'tracking');
  await Promise.all([order.save(), driver.save()]);

  const customerNotification =
    normalizedStatus === 'delivered'
      ? {
          type: 'order_delivered',
          title: 'Order delivered',
          body: 'Your order has been marked as delivered.',
          context: {
            status: 'delivered',
          },
        }
      : {
          type: normalizedStatus === 'picked-up' ? 'order_ready' : 'order_details_updated',
          title: normalizedStatus === 'picked-up' ? 'Order is on the way' : 'Delivery update',
          body:
            normalizedStatus === 'picked-up'
              ? 'Your rider picked up the order and is on the way.'
              : `Delivery update: ${normalizedStatus.replace(/-/g, ' ')}`,
          context: {
            status: normalizedStatus,
          },
        };

  await notifyOrderStakeholders({
    order,
    restaurant,
    customerNotification,
    restaurantNotification: {
      type: normalizedStatus === 'delivered' ? 'delivery_completed_confirmed' : 'order_details_updated',
      title: normalizedStatus === 'delivered' ? 'Delivery completed' : 'Delivery status updated',
      body: `Order ${normalizeId(order._id)} is now ${normalizedStatus.replace(/-/g, ' ')}.`,
      context: {
        status: normalizedStatus,
      },
    },
  });

  return order;
};

const updateOrderStatus = async ({ orderId, status, updatedBy = 'restaurant' }) => {
  const order = await FoodOrder.findById(orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  const nextStatus = resolveRequestedStatus(order.orderStatus, status);
  order.orderStatus = nextStatus;

  if (nextStatus === 'delivered') {
    order.actualDelivery = new Date();
    order.paymentStatus = order.paymentMethod === 'cod' ? 'paid' : order.paymentStatus;
    if (order.driverId) {
      await releaseDriverFromOrder(order.driverId);
    }
    await creditDeliveredLoyaltyBenefits(order);
  }

  if (nextStatus === 'out-for-delivery') {
    order.tracking = {
      ...buildTrackingState(order),
      status: 'on-the-way',
      lastUpdatedAt: new Date(),
    };
    maybeMarkModified(order, 'tracking');
  }

  order.statusTimeline.push({
    status: nextStatus,
    note: `Order moved to ${nextStatus}`,
    updatedBy,
    timestamp: new Date(),
  });

  await order.save();
  await notifyOrderStakeholders({
    order,
    customerNotification: {
      type: nextStatus === 'delivered' ? 'order_delivered' : 'order_details_updated',
      title: nextStatus === 'delivered' ? 'Order delivered' : 'Order update',
      body: `Your order is now ${nextStatus.replace(/-/g, ' ')}.`,
      context: {
        status: nextStatus,
      },
    },
  });
  return order;
};

const updateRestaurantOrderStatus = async ({ orderId, restaurantId, status, updatedBy = 'restaurant' }) => {
  const order = await FoodOrder.findById(orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  if (normalizeId(order.restaurantId) !== normalizeId(restaurantId)) {
    throw new Error('Order does not belong to this restaurant');
  }

  const normalizedStatus = resolveRestaurantStatus(status);

  if (normalizedStatus === 'cancelled') {
    return cancelOrder({
      orderId,
      reason: 'Cancelled by restaurant',
      requestedBy: 'restaurant',
      currentUser: null,
    });
  }

  order.orderStatus = normalizedStatus;

  if (normalizedStatus === 'delivered') {
    order.actualDelivery = new Date();
    order.paymentStatus = order.paymentMethod === 'cod' ? 'paid' : order.paymentStatus;
    if (order.driverId) {
      await releaseDriverFromOrder(order.driverId);
    }
    await creditDeliveredLoyaltyBenefits(order);
  }

  if (normalizedStatus === 'out-for-delivery') {
    order.tracking = {
      ...buildTrackingState(order),
      status: 'on-the-way',
      lastUpdatedAt: new Date(),
    };
    maybeMarkModified(order, 'tracking');
  }

  order.statusTimeline.push({
    status: normalizedStatus,
    note: `Restaurant updated order to ${normalizedStatus}`,
    updatedBy,
    timestamp: new Date(),
  });

  await order.save();
  await notifyOrderStakeholders({
    order,
    restaurant: await Restaurant.findById(order.restaurantId).select('ownerId name').lean(),
    customerNotification: {
      type:
        normalizedStatus === 'confirmed'
          ? 'order_confirmed'
          : normalizedStatus === 'preparing'
            ? 'order_preparing'
            : normalizedStatus === 'delivered'
              ? 'order_delivered'
              : 'order_details_updated',
      title:
        normalizedStatus === 'confirmed'
          ? 'Order confirmed'
          : normalizedStatus === 'preparing'
            ? 'Order is being prepared'
            : normalizedStatus === 'delivered'
              ? 'Order delivered'
              : 'Order update',
      body: `Your order is now ${normalizedStatus.replace(/-/g, ' ')}.`,
      context: {
        status: normalizedStatus,
      },
    },
  });
  return order;
};

const cancelOrder = async ({ orderId, reason = 'Cancelled', requestedBy = 'customer', currentUser = null }) => {
  const order = await FoodOrder.findById(orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  if (['out-for-delivery', 'delivered', 'cancelled'].includes(order.orderStatus)) {
    throw new Error(`Order cannot be cancelled in ${order.orderStatus} status`);
  }

  const chargedAmount = order.paymentStatus === 'paid'
    ? roundCurrency(order.totalAmount || 0)
    : roundCurrency(order.walletUsed || 0);

  let refundAmount = 0;
  if (chargedAmount > 0) {
    refundAmount = ['placed', 'confirmed'].includes(order.orderStatus)
      ? chargedAmount
      : roundCurrency(chargedAmount * 0.5);
  }

  order.orderStatus = 'cancelled';
  order.cancellationReason = reason;
  order.cancellationRequestedBy = requestedBy;
  order.cancelledAt = new Date();
  order.refundAmount = refundAmount;
  order.refundStatus = refundAmount > 0 ? 'pending' : 'none';
  await refundRedeemedPoints(order);

  const customer = await getUserRecordById(order.customerId);
  if (refundAmount > 0 && customer?.email) {
    await creditWallet(
      customer.email,
      refundAmount,
      `Food delivery refund for order ${normalizeId(order._id)}`,
      normalizeId(order._id)
    );
    order.refundStatus = 'completed';
    order.refundedToWallet = true;
    order.refundedAt = new Date();
    order.paymentStatus = 'refunded';
  }

  if (order.driverId) {
    await releaseDriverFromOrder(order.driverId);
  }

  order.statusTimeline.push({
    status: 'cancelled',
    note: `Order cancelled by ${requestedBy}: ${reason}`,
    updatedBy: requestedBy,
    timestamp: new Date(),
  });

  await order.save();
  await notifyOrderStakeholders({
    order,
    customerNotification: {
      type: refundAmount > 0 ? 'refund_processed' : 'order_cancelled',
      title: refundAmount > 0 ? 'Refund initiated' : 'Order cancelled',
      body:
        refundAmount > 0
          ? `Refund of INR ${refundAmount.toFixed(2)} was moved to your wallet.`
          : `Your order was cancelled: ${reason}`,
      context: {
        reason,
        refundAmount,
      },
    },
    restaurantNotification: {
      type: 'order_cancelled_by_customer',
      title: 'Order cancelled',
      body: `Order ${normalizeId(order._id)} was cancelled.`,
      context: {
        reason,
      },
    },
  });
  return order;
};

const updateRestaurantAvailability = async ({
  restaurantId,
  open,
  avgPreparationTime = '',
  lat = null,
  lng = null,
  address = '',
  zone = '',
  updatedBy = 'restaurant',
  actor = {},
}) => {
  const restaurant = await getRestaurantRecord(restaurantId);
  if (!restaurant) {
    throw new Error('Restaurant not found');
  }

  if (typeof open === 'boolean') {
    restaurant.open = open;
  }
  if (avgPreparationTime) {
    restaurant.avgPreparationTime = String(avgPreparationTime);
  }
  if (lat != null || lng != null || address || zone) {
    restaurant.location = {
      ...(restaurant.location || {}),
      ...(lat != null ? { lat: Number(lat) } : {}),
      ...(lng != null ? { lng: Number(lng) } : {}),
      ...(address ? { address } : {}),
      ...(zone ? { zone } : {}),
    };
  }

  appendRestaurantAuditEntry(restaurant, {
    action: 'restaurant.availability_updated',
    summary: `Restaurant marked ${restaurant.open ? 'open' : 'closed'} with prep time ${restaurant.avgPreparationTime || 'unchanged'}`,
    targetType: 'restaurant',
    targetId: restaurant._id,
    performedByUserId: normalizeId(actor.userId),
    performedByName: actor.name || updatedBy,
    performedByRole: actor.role || updatedBy,
    metadata: {
      open: restaurant.open,
      avgPreparationTime: restaurant.avgPreparationTime || '',
      zone: restaurant.location?.zone || '',
    },
  });

  await restaurant.save();
  return serializeRestaurant(restaurant);
};

const updateMenuItemAvailability = async ({
  restaurantId,
  itemId,
  available,
  prepTime = null,
  updatedBy = 'restaurant',
  actor = {},
}) => {
  const item = await MenuItem.findById(itemId);
  if (!item) {
    throw new Error('Menu item not found');
  }

  if (normalizeId(item.restaurantId) !== normalizeId(restaurantId)) {
    throw new Error('Menu item does not belong to this restaurant');
  }

  if (typeof available === 'boolean') {
    item.available = available;
  }
  if (prepTime != null && Number(prepTime) > 0) {
    item.prepTime = Number(prepTime);
  }

  await item.save();

  const restaurant = await getRestaurantRecord(restaurantId);
  if (restaurant) {
    appendRestaurantAuditEntry(restaurant, {
      action: 'menu.item_availability_updated',
      summary: `${item.name} was marked ${item.available ? 'available' : 'paused'}`,
      targetType: 'menu-item',
      targetId: item._id,
      performedByUserId: normalizeId(actor.userId),
      performedByName: actor.name || updatedBy,
      performedByRole: actor.role || updatedBy,
      metadata: {
        itemName: item.name,
        available: item.available,
        prepTime: item.prepTime || null,
      },
    });
    await restaurant.save();
  }

  return serializeMenuItem(item);
};

const createOrderDispute = async ({
  orderId,
  issueType,
  description,
  createdByUserId = '',
  createdByRole = 'customer',
  createdByName = '',
}) => {
  const order = await FoodOrder.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  if (!issueType || !description) {
    throw new Error('issueType and description are required');
  }

  const dispute = {
    id: new mongoose.Types.ObjectId().toString(),
    issueType,
    description,
    status: 'open',
    createdByUserId: createdByUserId || undefined,
    createdByRole,
    createdByName,
    createdAt: new Date(),
  };

  order.disputes = Array.isArray(order.disputes) ? order.disputes : [];
  order.disputes.push(dispute);
  order.statusTimeline.push({
    status: order.orderStatus,
    note: `Dispute opened: ${issueType}`,
    updatedBy: createdByRole,
    timestamp: new Date(),
  });
  maybeMarkModified(order, 'disputes');
  await order.save();

  broadcastEvent('fooddelivery:dispute', {
    orderId: normalizeId(order._id),
    dispute,
  });

  await notifyOrderStakeholders({
    order,
    customerNotification:
      createdByRole === 'customer'
        ? null
        : {
            type: 'order_issue',
            title: 'Order issue updated',
            body: `A dispute was raised for order ${normalizeId(order._id)}.`,
            context: {
              issueType,
              disputeId: dispute.id,
            },
          },
    restaurantNotification: {
      type: 'order_details_updated',
      title: 'Order dispute raised',
      body: `A dispute was raised for order ${normalizeId(order._id)}.`,
      context: {
        issueType,
        disputeId: dispute.id,
      },
    },
  });

  return dispute;
};

const updateOrderDispute = async ({
  orderId,
  disputeId,
  status,
  resolutionNote = '',
  updatedBy = 'admin',
}) => {
  const order = await FoodOrder.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  order.disputes = Array.isArray(order.disputes) ? order.disputes : [];
  const dispute = order.disputes.find((entry) => normalizeId(entry.id || entry._id) === normalizeId(disputeId));

  if (!dispute) {
    throw new Error('Dispute not found');
  }

  const normalizedStatus = normalizeId(status).toLowerCase();
  if (!['open', 'investigating', 'resolved', 'rejected'].includes(normalizedStatus)) {
    throw new Error(`Unsupported dispute status: ${status}`);
  }

  dispute.status = normalizedStatus;
  if (resolutionNote) {
    dispute.resolutionNote = resolutionNote;
  }
  if (['resolved', 'rejected'].includes(normalizedStatus)) {
    dispute.resolvedAt = new Date();
    dispute.resolvedBy = updatedBy;
  }

  order.statusTimeline.push({
    status: order.orderStatus,
    note: `Dispute ${normalizeId(dispute.id)} marked ${normalizedStatus}`,
    updatedBy,
    timestamp: new Date(),
  });
  maybeMarkModified(order, 'disputes');
  await order.save();

  broadcastEvent('fooddelivery:dispute', {
    orderId: normalizeId(order._id),
    dispute: {
      ...dispute,
      id: normalizeId(dispute.id || dispute._id),
    },
  });

  await notifyOrderStakeholders({
    order,
    customerNotification: {
      type: 'order_issue',
      title: 'Dispute updated',
      body: `Dispute status changed to ${normalizedStatus}.`,
      context: {
        disputeId: normalizeId(dispute.id || dispute._id),
        status: normalizedStatus,
      },
    },
    restaurantNotification: {
      type: 'order_details_updated',
      title: 'Dispute updated',
      body: `Dispute status changed to ${normalizedStatus}.`,
      context: {
        disputeId: normalizeId(dispute.id || dispute._id),
        status: normalizedStatus,
      },
    },
  });

  return {
    ...dispute,
    id: normalizeId(dispute.id || dispute._id),
  };
};

const getAdminDashboard = async () => {
  const [
    totalOrders,
    activeOrders,
    deliveredOrders,
    cancelledOrders,
    openRestaurants,
    onlineRiders,
    availableRiders,
    recentOrders,
    restaurants,
  ] = await Promise.all([
    FoodOrder.countDocuments({}),
    FoodOrder.countDocuments({ orderStatus: { $in: ['placed', 'confirmed', 'preparing', 'out-for-delivery'] } }),
    FoodOrder.countDocuments({ orderStatus: 'delivered' }),
    FoodOrder.countDocuments({ orderStatus: 'cancelled' }),
    Restaurant.countDocuments({ open: true }),
    Driver.countDocuments({ isOnline: true }),
    Driver.countDocuments({ availabilityStatus: 'available' }),
    FoodOrder.find({}).sort({ createdAt: -1 }).limit(8).lean(),
    Restaurant.find({}).select('ownerId teamMembers operationsAuditLog').lean(),
  ]);

  const allOrders = await FoodOrder.find({}).lean();
  const openDisputes = allOrders.reduce(
    (count, order) =>
      count +
      (Array.isArray(order.disputes)
        ? order.disputes.filter((dispute) => !['resolved', 'rejected'].includes(dispute.status)).length
        : 0),
    0
  );
  const assignedOrders = allOrders.filter((order) => normalizeId(order.driverId)).length;
  const activeRiderSos = allOrders.filter((order) => Boolean(order.riderSafety?.activeSos)).length;
  const activeTeamMembers = restaurants.reduce(
    (count, restaurant) =>
      count +
      (Array.isArray(restaurant.teamMembers)
        ? restaurant.teamMembers.filter(
            (member) => serializeRestaurantTeamMember(member).status === 'active'
          ).length
        : 0),
    0
  );
  const restaurantsWithGovernance = restaurants.filter((restaurant) =>
    hasClaimedRestaurantGovernance(restaurant)
  ).length;
  const governanceEventsLast24Hours = restaurants.reduce((count, restaurant) => {
    const recentCount = Array.isArray(restaurant.operationsAuditLog)
      ? restaurant.operationsAuditLog.filter((entry) => {
          const entryTime = new Date(entry.timestamp || 0).getTime();
          return entryTime >= Date.now() - 24 * 60 * 60 * 1000;
        }).length
      : 0;
    return count + recentCount;
  }, 0);

  return {
    totalOrders,
    activeOrders,
    deliveredOrders,
    cancelledOrders,
    openRestaurants,
    onlineRiders,
    availableRiders,
    assignedOrders,
    unassignedOrders: Math.max(0, activeOrders - assignedOrders),
    openDisputes,
    activeRiderSos,
    governanceSummary: {
      restaurantsWithGovernance,
      activeTeamMembers,
      governanceEventsLast24Hours,
    },
    recentOrders: recentOrders.map(serializeOrder),
  };
};

const getAdminOrders = async ({
  status = '',
  paymentStatus = '',
  restaurantId = '',
  riderId = '',
  disputeStatus = '',
  unassignedOnly = false,
}) => {
  const query = {};
  if (status) {
    query.orderStatus = status;
  }
  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }
  if (restaurantId) {
    query.restaurantId = restaurantId;
  }
  if (riderId) {
    query.driverId = riderId;
  }

  let orders = await FoodOrder.find(query).sort({ createdAt: -1 }).lean();

  if (unassignedOnly) {
    orders = orders.filter((order) => !normalizeId(order.driverId));
  }

  if (disputeStatus) {
    orders = orders.filter((order) =>
      Array.isArray(order.disputes) &&
      order.disputes.some((dispute) => dispute.status === disputeStatus)
    );
  }

  return orders.map(serializeOrder);
};

const getAdminAuditLog = async ({
  restaurantId = '',
  action = '',
  limit = 50,
} = {}) => {
  const normalizedRestaurantId = normalizeId(restaurantId);
  const actionFilter = String(action || '').trim().toLowerCase();
  const entryLimit = Math.max(1, Math.min(Number(limit) || 50, 200));

  const restaurantQuery = normalizedRestaurantId ? { _id: normalizedRestaurantId } : {};
  const orderQuery = normalizedRestaurantId ? { restaurantId: normalizedRestaurantId } : {};

  const [restaurants, orders] = await Promise.all([
    Restaurant.find(restaurantQuery)
      .select('name operationsAuditLog')
      .lean(),
    FoodOrder.find(orderQuery)
      .select('restaurantId statusTimeline orderStatus')
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean(),
  ]);

  const restaurantEntries = restaurants.flatMap((restaurant) =>
    (Array.isArray(restaurant.operationsAuditLog) ? restaurant.operationsAuditLog : []).map((entry) => ({
      ...serializeRestaurantAuditEntry(entry),
      source: 'restaurant',
      restaurantId: normalizeId(restaurant._id),
      restaurantName: restaurant.name || 'Restaurant',
      orderId: '',
    }))
  );

  const orderEntries = orders.flatMap((order) =>
    (Array.isArray(order.statusTimeline) ? order.statusTimeline : []).map((entry, index) => ({
      id: `timeline-${normalizeId(order._id)}-${index}`,
      action: 'order.timeline',
      summary: entry.note || `Order ${normalizeId(order._id)} updated to ${entry.status || order.orderStatus}`,
      targetType: 'order',
      targetId: normalizeId(order._id),
      performedByUserId: '',
      performedByName: entry.updatedBy || '',
      performedByRole: entry.updatedBy || '',
      metadata: {
        status: entry.status || order.orderStatus || '',
      },
      timestamp: entry.timestamp || null,
      source: 'order',
      restaurantId: normalizeId(order.restaurantId),
      restaurantName: '',
      orderId: normalizeId(order._id),
    }))
  );

  return [...restaurantEntries, ...orderEntries]
    .filter((entry) =>
      actionFilter
        ? String(entry.action || '').toLowerCase().includes(actionFilter) ||
          String(entry.summary || '').toLowerCase().includes(actionFilter)
        : true
    )
    .sort((left, right) => new Date(right.timestamp || 0) - new Date(left.timestamp || 0))
    .slice(0, entryLimit);
};

module.exports = {
  RESTAURANT_PERMISSION_CATALOG,
  RESTAURANT_TEAM_ROLE_PERMISSIONS,
  initializeDevData,
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
  serializeRestaurant,
  serializeRestaurantTeamMember,
  serializeRestaurantAuditEntry,
  serializeMenuItem,
  serializeCart,
  serializeOrder,
  serializeDriver,
};
