import { PROMO_CODES } from "./constants";

export const resolveLocalMarketRole = (currentUser = {}) => {
  const role = String(currentUser?.role || "").toLowerCase();
  const registrationType = String(currentUser?.registrationType || "").toLowerCase();

  if (role === "admin" || registrationType === "admin") {
    return "admin";
  }

  if (role === "delivery" || role === "deliverypartner" || registrationType === "delivery") {
    return "delivery";
  }

  if (
    role === "business" ||
    role === "shopowner" ||
    registrationType === "entrepreneur" ||
    registrationType === "shopowner"
  ) {
    return "shopowner";
  }

  return "buyer";
};

export const normalizeShop = (shop) => ({
  ...shop,
  id: String(shop?.id || shop?._id || ""),
  _id: String(shop?._id || shop?.id || ""),
  ownerId: String(shop?.ownerId || ""),
  promoted: Boolean(shop?.promoted),
  isOpen: shop?.isOpen !== false,
  open: shop?.isOpen !== false,
  rating: Number(shop?.rating || 0),
  distanceKm: Number(shop?.distanceKm || 0),
  deliveryCharge: Number(shop?.deliveryCharge || 0),
  minOrder: Number(shop?.minOrder || 0),
  freeDeliveryAbove: Number(shop?.freeDeliveryAbove || 0),
  deliveryTime: shop?.deliveryTime || "30 mins",
  imageLabel: shop?.imageLabel || String(shop?.name || "S").slice(0, 2).toUpperCase(),
  products: Array.isArray(shop?.products) ? shop.products : [],
  reviews: Array.isArray(shop?.reviews) ? shop.reviews : [],
});

export const normalizeProduct = (product) => ({
  ...product,
  id: String(product?.id || product?._id || ""),
  _id: String(product?._id || product?.id || ""),
  shopId: String(product?.shopId || ""),
  name: String(product?.name || ""),
  description: String(product?.description || ""),
  category: String(product?.category || ""),
  quantity: String(product?.quantity || ""),
  price: Number(product?.price || 0),
  mrp: Number(product?.mrp || 0),
  inStock: product?.inStock !== false,
});

export const normalizeOrder = (order) => ({
  ...order,
  id: String(order?.id || order?._id || ""),
  _id: String(order?._id || order?.id || ""),
  shopId: String(order?.shopId?._id || order?.shopId?.id || order?.shopId || ""),
  shopName:
    order?.shopName ||
    order?.shopId?.name ||
    order?.shop?.name ||
    "Local Market Shop",
  status: String(order?.status || "Order Confirmed"),
  paymentStatus: String(order?.paymentStatus || "Pending"),
  items: Array.isArray(order?.items) ? order.items : [],
  subtotal: Number(order?.subtotal || 0),
  discount: Number(order?.discount || 0),
  deliveryCharge: Number(order?.deliveryCharge || order?.delivery || 0),
  total: Number(order?.total || 0),
});

export const extractEstimatedMinutes = (deliveryTime = "") => {
  const numeric = Number.parseInt(String(deliveryTime || ""), 10);
  return Number.isFinite(numeric) ? numeric : 999;
};

export const getAverageProductPrice = (shop) => {
  const products = Array.isArray(shop?.products) ? shop.products : [];
  if (!products.length) {
    return Number.POSITIVE_INFINITY;
  }

  const total = products.reduce((sum, product) => sum + Number(product?.price || 0), 0);
  return total / products.length;
};

export const getCartStorageKey = (userId) => `localmarket-cart-${String(userId || "guest")}`;

export const evaluatePromoCode = ({ code, subtotal, existingOrdersCount, shop, cartItems }) => {
  const promo = PROMO_CODES[code];
  if (!promo) {
    return { valid: false, message: "Invalid promo code." };
  }

  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
    return { valid: false, message: "Promo code has expired." };
  }

  if (subtotal < Number(promo.minSubtotal || 0)) {
    return { valid: false, message: `Minimum order INR ${promo.minSubtotal} required.` };
  }

  if (promo.firstOrderOnly && Number(existingOrdersCount || 0) > 0) {
    return { valid: false, message: "This offer is for first order only." };
  }

  if (Array.isArray(promo.shopIds) && promo.shopIds.length > 0) {
    if (!promo.shopIds.includes(String(shop?.id || shop?._id || ""))) {
      return { valid: false, message: "Promo not applicable for this shop." };
    }
  }

  if (Array.isArray(promo.categories) && promo.categories.length > 0) {
    const hasEligibleItem = (cartItems || []).some((item) => promo.categories.includes(item.category));
    if (!hasEligibleItem) {
      return { valid: false, message: "Promo not applicable for selected categories." };
    }
  }

  const usageKey = `localmarket-promo-usage-${code}`;
  const usageCount = Number(window.localStorage.getItem(usageKey) || 0);
  if (promo.usageLimit && usageCount >= promo.usageLimit) {
    return { valid: false, message: "Promo usage limit reached." };
  }

  return { valid: true, promo, usageKey };
};

export const getPromoDiscount = ({ promoCode, subtotal, deliveryCharge }) => {
  const promo = PROMO_CODES[promoCode];
  if (!promo) {
    return 0;
  }

  if (promo.type === "flat") {
    return subtotal >= promo.minSubtotal ? promo.amount : 0;
  }

  if (promo.type === "percent") {
    if (subtotal < promo.minSubtotal) {
      return 0;
    }
    const rawDiscount = (subtotal * promo.amount) / 100;
    return Math.min(rawDiscount, Number(promo.maxDiscount || rawDiscount));
  }

  if (promo.type === "delivery") {
    return subtotal >= promo.minSubtotal ? Math.min(deliveryCharge, promo.amount) : 0;
  }

  return 0;
};

export const getRoleLabel = (role) => {
  if (role === "shopowner") {
    return "Shop Owner";
  }
  if (role === "delivery") {
    return "Delivery Partner";
  }
  if (role === "admin") {
    return "Admin";
  }
  return "Buyer";
};
