export const SHOP_TYPES = [
  "Grocery Store",
  "Supermarket",
  "Convenience Store",
  "Local Kirana",
  "Organic Store",
];

export const SHOP_CATEGORIES = [
  "Vegetables & Fruits",
  "Dairy & Eggs",
  "Pantry Staples",
  "Beverages",
  "Bakery",
  "Meat & Fish",
  "Personal Care",
  "Household",
  "Snacks & Confectionery",
  "Frozen Foods",
];

export const BUYER_ORDER_STATUSES = [
  "Order Confirmed",
  "Being Prepared",
  "Ready for Pickup",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

export const SHOP_ORDER_STATUSES = [
  "Order Confirmed",
  "Being Prepared",
  "Ready for Pickup",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

export const PAYMENT_OPTIONS = [
  "UPI",
  "Card",
  "Wallet",
  "Cash on Delivery",
  "Net Banking",
];

export const DELIVERY_OPTIONS = ["Home Delivery", "Store Pickup"];

export const PROMO_CODES = {
  SAVE100: {
    type: "flat",
    amount: 100,
    minSubtotal: 500,
    label: "Flat INR 100 off above INR 500",
    expiresAt: "2027-12-31T23:59:59.000Z",
    usageLimit: 3,
    firstOrderOnly: false,
  },
  FIRST20: {
    type: "percent",
    amount: 20,
    minSubtotal: 300,
    maxDiscount: 150,
    label: "20% off on first order",
    expiresAt: "2027-12-31T23:59:59.000Z",
    usageLimit: 1,
    firstOrderOnly: true,
  },
  FREEDEL: {
    type: "delivery",
    amount: 49,
    minSubtotal: 599,
    label: "Free delivery above INR 599",
    expiresAt: "2027-12-31T23:59:59.000Z",
    usageLimit: 5,
    firstOrderOnly: false,
  },
};

export const DEFAULT_ORDER_FORM = {
  deliveryAddress: "",
  deliveryType: "Home Delivery",
  paymentMethod: "UPI",
  phoneNumber: "",
  specialInstructions: "",
};

export const DEFAULT_NEW_SHOP = {
  name: "",
  type: "Grocery Store",
  deliveryCharge: 40,
  minOrder: 150,
  freeDeliveryAbove: 500,
};

export const DEFAULT_PRODUCT_FORM = {
  name: "",
  description: "",
  category: "Vegetables & Fruits",
  price: "",
  mrp: "",
  quantity: "",
  image: "",
  inStock: true,
};

export const FALLBACK_SHOPS = [
  {
    id: "fallback-shop-1",
    _id: "fallback-shop-1",
    ownerId: "fallback-owner-1",
    name: "Fresh Mart Supermarket",
    type: "Supermarket",
    rating: 4.7,
    deliveryTime: "30 mins",
    discount: "15% OFF",
    distanceKm: 2.5,
    minOrder: 200,
    promoted: true,
    isOpen: true,
    imageLabel: "FM",
    licenseStatus: "Verified License",
    avgDeliveryRating: 4.8,
    deliveryCharge: 40,
    freeDeliveryAbove: 599,
    products: [
      {
        id: "fallback-shop-1-prod-1",
        _id: "fallback-shop-1-prod-1",
        name: "Fresh Tomatoes (1 KG)",
        price: 60,
        mrp: 75,
        category: "Vegetables & Fruits",
        description: "Locally sourced fresh tomatoes",
        image: "T",
        inStock: true,
        quantity: "1 KG",
        rating: 4.6,
      },
    ],
    reviews: [],
  },
];
