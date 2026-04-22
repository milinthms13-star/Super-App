import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import "../../styles/FoodDelivery.css";

const ROLE_OPTIONS = [
  { id: "customer", label: "Customer" },
  { id: "restaurant", label: "Restaurant Partner" },
  { id: "delivery", label: "Delivery Partner" },
  { id: "admin", label: "Admin" },
];

const ORDER_STATUSES = ["Order placed", "Preparing", "Out for delivery", "Delivered"];
const REJECTED_ORDER_STATUS = "Rejected";
const PAYMENT_OPTIONS = ["UPI", "Card", "Wallet", "COD"];
const DIETARY_FILTERS = ["All", "Veg only", "Customizable"];
const DELIVERY_SLOTS = [
  { label: "ASAP", capacity: 999, timing: "Fastest available rider" },
  { label: "7:30 PM", capacity: 2, timing: "Evening dinner rush" },
  { label: "8:00 PM", capacity: 2, timing: "Prime dinner slot" },
  { label: "Tomorrow 12:30 PM", capacity: 4, timing: "Scheduled lunch window" },
];
const PROMO_CODES = {
  SAVE50: { type: "flat", amount: 50, minSubtotal: 299, label: "Flat INR 50 off above INR 299" },
  FEAST10: { type: "percent", amount: 10, minSubtotal: 199, maxDiscount: 80, label: "10% off on qualifying orders" },
  FREEDEL: { type: "delivery", amount: 39, minSubtotal: 249, label: "Free delivery above INR 249" },
};
const SUPPORTED_LANGUAGES = ["English", "Malayalam", "Tamil", "Hindi"];
const INTEGRATIONS = ["Razorpay / Stripe", "Google Maps", "SMS / OTP API", "Push Notifications"];
const DATABASE_TABLES = ["Users", "Restaurants", "Menu items", "Orders", "Payments", "Delivery tracking"];

const FALLBACK_RESTAURANTS = [
  {
    id: "res-1",
    name: "Malabar Meals Hub",
    cuisine: "Kerala",
    rating: 4.8,
    deliveryTime: "26 mins",
    discount: "20% OFF",
    distanceKm: 2.1,
    priceForTwo: 420,
    promoted: true,
    open: true,
    imageLabel: "MM",
    licenseStatus: "Verified FSSAI",
    avgPreparationTime: "16 mins",
    walletOffers: "Free delivery above INR 299",
    cuisineTags: ["Kerala", "Meals", "Biryani"],
    menu: [
      {
        id: "res-1-item-1",
        name: "Malabar Chicken Biryani",
        price: 249,
        category: "Bestsellers",
        description: "Fragrant rice, tender chicken, and roasted masala.",
        prepTag: "Top rated",
        customizable: true,
        vegetarian: false,
        available: true,
      },
      {
        id: "res-1-item-2",
        name: "Porotta and Beef Roast",
        price: 229,
        category: "Combos",
        description: "Layered porotta with slow-cooked roast and salad.",
        prepTag: "Signature",
        customizable: true,
        vegetarian: false,
        available: true,
      },
      {
        id: "res-1-item-3",
        name: "Tender Coconut Payasam",
        price: 119,
        category: "Desserts",
        description: "Chilled dessert with coconut milk and jaggery.",
        prepTag: "Sweet finish",
        customizable: false,
        vegetarian: true,
        available: true,
      },
    ],
    reviews: [
      { id: "res-1-review-1", author: "Nimisha", rating: 5, comment: "Great packing and reliable delivery." },
      { id: "res-1-review-2", author: "Faizal", rating: 4, comment: "Good portion size and clear order updates." },
    ],
  },
  {
    id: "res-2",
    name: "Coastal Wraps",
    cuisine: "Fast Food",
    rating: 4.5,
    deliveryTime: "22 mins",
    discount: "10% OFF",
    distanceKm: 1.4,
    priceForTwo: 360,
    promoted: false,
    open: true,
    imageLabel: "CW",
    licenseStatus: "Verified FSSAI",
    avgPreparationTime: "13 mins",
    walletOffers: "10% wallet cashback",
    cuisineTags: ["Wraps", "Burgers", "Snacks"],
    menu: [
      {
        id: "res-2-item-1",
        name: "Peri Peri Chicken Wrap",
        price: 189,
        category: "Wraps",
        description: "Soft wrap with grilled chicken and mint mayo.",
        prepTag: "Popular",
        customizable: true,
        vegetarian: false,
        available: true,
      },
      {
        id: "res-2-item-2",
        name: "Loaded Fries",
        price: 129,
        category: "Sides",
        description: "Crispy fries with spicy seasoning and dip.",
        prepTag: "Crispy",
        customizable: false,
        vegetarian: true,
        available: true,
      },
      {
        id: "res-2-item-3",
        name: "Paneer Tikka Burger",
        price: 169,
        category: "Burgers",
        description: "Veg burger with paneer tikka and onions.",
        prepTag: "Veg favorite",
        customizable: true,
        vegetarian: true,
        available: true,
      },
    ],
    reviews: [
      { id: "res-2-review-1", author: "Riya", rating: 5, comment: "Quick service and fresh food." },
      { id: "res-2-review-2", author: "Sanal", rating: 4, comment: "Good value for late evening orders." },
    ],
  },
  {
    id: "res-3",
    name: "Night Cafe Express",
    cuisine: "Cafe",
    rating: 4.6,
    deliveryTime: "18 mins",
    discount: "Free dessert",
    distanceKm: 1.2,
    priceForTwo: 310,
    promoted: true,
    open: true,
    imageLabel: "NC",
    licenseStatus: "Pending renewal",
    avgPreparationTime: "10 mins",
    walletOffers: "Combo savings on beverages",
    cuisineTags: ["Cafe", "Desserts", "Drinks"],
    menu: [
      {
        id: "res-3-item-1",
        name: "Cold Coffee",
        price: 129,
        category: "Drinks",
        description: "Creamy cold brew with vanilla foam.",
        prepTag: "Cafe pick",
        customizable: true,
        vegetarian: true,
        available: true,
      },
      {
        id: "res-3-item-2",
        name: "Waffle Sundae",
        price: 199,
        category: "Desserts",
        description: "Warm waffle topped with ice cream and sauce.",
        prepTag: "Shareable",
        customizable: true,
        vegetarian: true,
        available: true,
      },
      {
        id: "res-3-item-3",
        name: "Cheesecake Jar",
        price: 179,
        category: "Desserts",
        description: "Creamy cheesecake with biscuit crumble.",
        prepTag: "Trending",
        customizable: false,
        vegetarian: true,
        available: false,
      },
    ],
    reviews: [
      { id: "res-3-review-1", author: "Akhil", rating: 5, comment: "Fastest delivery in the area." },
      { id: "res-3-review-2", author: "Mira", rating: 4, comment: "Desserts arrived fresh and cold." },
    ],
  },
];

const DELIVERY_PARTNERS = [
  { id: "dp-1", name: "Ajmal", vehicle: "Bike", eta: "12 mins", zone: "MG Road" },
  { id: "dp-2", name: "Reshmi", vehicle: "Scooter", eta: "9 mins", zone: "Kakkanad" },
  { id: "dp-3", name: "Naveen", vehicle: "EV Bike", eta: "11 mins", zone: "Marine Drive" },
];

const REQUIREMENT_GROUPS = [
  {
    title: "Authentication",
    items: ["Mobile OTP login", "Social login", "Profile management"],
  },
  {
    title: "Restaurant Management",
    items: ["Restaurant listing", "Menu add or edit", "Pricing and availability"],
  },
  {
    title: "Ordering",
    items: ["Add to cart", "Customize items", "Schedule delivery"],
  },
  {
    title: "Payments",
    items: ["UPI / Card / Wallet / COD", "Payment confirmation", "Invoice generation"],
  },
  {
    title: "Delivery Ops",
    items: ["Auto rider assignment", "Route optimization", "Live status updates"],
  },
  {
    title: "Trust",
    items: ["Push and SMS alerts", "Ratings and reviews", "Dispute handling"],
  },
];

const NON_FUNCTIONAL_REQUIREMENTS = [
  "Fast loading under 3 seconds",
  "Secure payments",
  "Mobile responsive flows",
  "Multi-language support",
  "Scalable architecture",
];

const OBJECTIVES = [
  "Provide fast and reliable food delivery.",
  "Enable local restaurants to onboard as entrepreneurs.",
  "Offer a seamless ordering experience from discovery to payment.",
  "Ensure real-time tracking and proactive notifications.",
];

const SUCCESS_METRICS = [
  { label: "Order completion", key: "completionRate", suffix: "%" },
  { label: "Average delivery", key: "avgDeliveryTime", suffix: " mins" },
  { label: "Customer retention", key: "retentionRate", suffix: "%" },
  { label: "Revenue growth", key: "revenueGrowth", suffix: "%" },
];

const formatCurrency = (value) => `INR ${Number(value || 0).toFixed(0)}`;

const parseEtaMinutes = (value) => Number(String(value || "").replace(/[^\d]/g, "")) || 0;

const menuMatchesDietaryFilter = (item, dietaryFilter) => {
  if (dietaryFilter === "Veg only") {
    return Boolean(item?.vegetarian);
  }

  if (dietaryFilter === "Customizable") {
    return Boolean(item?.customizable);
  }

  return true;
};

const getBaseMode = (user) => {
  if (user?.role === "admin" || user?.registrationType === "admin") {
    return "admin";
  }

  if (user?.role === "delivery" || user?.registrationType === "delivery") {
    return "delivery";
  }

  if (user?.role === "business" || user?.registrationType === "entrepreneur") {
    return "restaurant";
  }

  return "customer";
};

const buildTimeline = (status) =>
  ORDER_STATUSES.map((label) => ({
    label,
    complete: ORDER_STATUSES.indexOf(label) <= ORDER_STATUSES.indexOf(status),
  }));

const buildRestaurantCatalog = (restaurants = []) => {
  if (!Array.isArray(restaurants) || restaurants.length === 0) {
    return FALLBACK_RESTAURANTS;
  }

  return restaurants.map((restaurant, index) => {
    const fallback = FALLBACK_RESTAURANTS[index % FALLBACK_RESTAURANTS.length];
    const normalizedId = String(restaurant.id || fallback.id || `restaurant-${index + 1}`);

    const menuItems = Array.isArray(restaurant.menu) && restaurant.menu.length
      ? restaurant.menu
      : fallback.menu;

    return {
      ...fallback,
      ...restaurant,
      id: normalizedId,
      name: restaurant.name || fallback.name,
      cuisine: restaurant.cuisine || fallback.cuisine,
      rating: Number(restaurant.rating ?? fallback.rating),
      deliveryTime: restaurant.deliveryTime || fallback.deliveryTime,
      discount: restaurant.discount || fallback.discount,
      imageLabel: restaurant.imageLabel || restaurant.image || fallback.imageLabel,
      menu: menuItems.map((item, itemIndex) => ({
        ...item,
        id: item.id || `${normalizedId}-menu-${itemIndex + 1}`,
      })),
      reviews:
        Array.isArray(restaurant.reviews) && restaurant.reviews.length
          ? restaurant.reviews
          : fallback.reviews,
    };
  });
};

const buildSeedOrders = (restaurants) => {
  const firstRestaurant = restaurants[0] || FALLBACK_RESTAURANTS[0];
  const secondRestaurant = restaurants[1] || restaurants[0] || FALLBACK_RESTAURANTS[1];

  return [
    {
      id: "fd-1001",
      restaurantId: firstRestaurant.id,
      restaurantName: firstRestaurant.name,
      customerName: "Aparna Nair",
      customerEmail: "aparna@example.com",
      items: [
        { id: "seed-1", name: "Malabar Chicken Biryani", quantity: 1, price: 249, spice: "Medium", addOn: "Raita" },
        { id: "seed-2", name: "Tender Coconut Payasam", quantity: 1, price: 119, spice: "Standard", addOn: "No add-on" },
      ],
      subtotal: 368,
      deliveryFee: 39,
      total: 407,
      paymentMethod: "UPI",
      scheduleLabel: "ASAP",
      status: "Preparing",
      assignedDeliveryPartner: DELIVERY_PARTNERS[0],
      timeline: buildTimeline("Preparing"),
      eta: "18 mins",
      routeHint: "Kitchen to MG Road via NH bypass",
      acceptedByRestaurant: true,
      customerRating: 0,
      customerReview: "",
    },
    {
      id: "fd-1002",
      restaurantId: secondRestaurant.id,
      restaurantName: secondRestaurant.name,
      customerName: "Rahul Menon",
      customerEmail: "rahul@example.com",
      items: [{ id: "seed-3", name: "Peri Peri Chicken Wrap", quantity: 2, price: 189, spice: "Hot", addOn: "Fries" }],
      subtotal: 378,
      deliveryFee: 35,
      total: 413,
      paymentMethod: "COD",
      scheduleLabel: "7:30 PM",
      status: "Out for delivery",
      assignedDeliveryPartner: DELIVERY_PARTNERS[1],
      timeline: buildTimeline("Out for delivery"),
      eta: "9 mins",
      routeHint: "Pickup from central kitchen and deliver to Kakkanad",
      acceptedByRestaurant: true,
      customerRating: 0,
      customerReview: "",
    },
  ];
};

const buildStatusCopy = (language) => {
  switch (language) {
    case "ml":
      return {
        title: "Food Delivery",
        subtitle: "Restaurants, orders, delivery, and admin operations in one workspace.",
      };
    case "ta":
      return {
        title: "Food Delivery",
        subtitle: "Restaurants, orders, delivery, and admin operations in one workspace.",
      };
    case "hi":
      return {
        title: "Food Delivery",
        subtitle: "Restaurants, orders, delivery, and admin operations in one workspace.",
      };
    default:
      return {
        title: "Food Delivery",
        subtitle: "Restaurants, orders, delivery, and admin operations in one workspace.",
      };
  }
};

const FoodDelivery = () => {
  const { currentUser, mockData, language } = useApp();
  const contentCopy = useMemo(() => buildStatusCopy(language), [language]);
  const initialRestaurants = useMemo(
    () => buildRestaurantCatalog(mockData.restaurants || []),
    [mockData.restaurants]
  );
  const [mode, setMode] = useState(() => getBaseMode(currentUser));
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const [searchQuery, setSearchQuery] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState("All");
  const [dietaryFilter, setDietaryFilter] = useState("All");
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [sortBy, setSortBy] = useState("recommended");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(initialRestaurants[0]?.id || "");
  const [selectedMenuItemId, setSelectedMenuItemId] = useState(initialRestaurants[0]?.menu?.[0]?.id || "");
  const [cartItems, setCartItems] = useState([]);
  const [selectedSpice, setSelectedSpice] = useState("Medium");
  const [selectedAddon, setSelectedAddon] = useState("No add-on");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [scheduledSlot, setScheduledSlot] = useState("ASAP");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [notifications, setNotifications] = useState([
    "OTP and social login are mapped as authentication touchpoints.",
    "Payments, tracking, and SMS alerts are ready for external integrations.",
  ]);
  const [orders, setOrders] = useState(() => buildSeedOrders(initialRestaurants));
  const [restaurantDraft, setRestaurantDraft] = useState({
    name: "",
    price: "",
    category: "Mains",
    description: "",
    prepTime: "",
    serviceZone: "",
    licenseStatus: "",
  });
  const [reviewState, setReviewState] = useState({ rating: 5, review: "" });

  useEffect(() => {
    setRestaurants(initialRestaurants);
    if (!initialRestaurants.length) {
      return;
    }

    setSelectedRestaurantId((current) =>
      current && initialRestaurants.some((restaurant) => restaurant.id === current)
        ? current
        : initialRestaurants[0].id
    );
  }, [initialRestaurants]);

  useEffect(() => {
    setMode(getBaseMode(currentUser));
  }, [currentUser]);

  useEffect(() => {
    const activeRestaurant =
      restaurants.find((restaurant) => restaurant.id === selectedRestaurantId) || restaurants[0];

    setSelectedMenuItemId((current) =>
      current && activeRestaurant?.menu.some((item) => item.id === current)
        ? current
        : activeRestaurant?.menu?.[0]?.id || ""
    );
  }, [restaurants, selectedRestaurantId]);

  const cuisineOptions = useMemo(
    () => ["All", ...new Set(restaurants.flatMap((restaurant) => restaurant.cuisineTags || []))],
    [restaurants]
  );

  const filteredRestaurants = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const results = restaurants.filter((restaurant) => {
      const matchesCuisine =
        cuisineFilter === "All" || (restaurant.cuisineTags || []).includes(cuisineFilter);
      const matchesAvailability = !openNowOnly || restaurant.open;
      const hasDietaryMatch = (restaurant.menu || []).some((item) =>
        menuMatchesDietaryFilter(item, dietaryFilter)
      );
      const haystack = [
        restaurant.name,
        restaurant.cuisine,
        ...(restaurant.cuisineTags || []),
        ...(restaurant.menu || []).map((item) => item.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesCuisine &&
        matchesAvailability &&
        hasDietaryMatch &&
        (!normalizedSearch || haystack.includes(normalizedSearch))
      );
    });

    return [...results].sort((left, right) => {
      if (sortBy === "rating") {
        return right.rating - left.rating;
      }

      if (sortBy === "delivery") {
        return parseEtaMinutes(left.deliveryTime) - parseEtaMinutes(right.deliveryTime);
      }

      if (sortBy === "offer") {
        return String(right.discount).localeCompare(String(left.discount));
      }

      return Number(right.promoted) - Number(left.promoted) || right.rating - left.rating;
    });
  }, [cuisineFilter, dietaryFilter, openNowOnly, restaurants, searchQuery, sortBy]);

  useEffect(() => {
    if (!filteredRestaurants.length) {
      setSelectedRestaurantId("");
      return;
    }

    if (!filteredRestaurants.some((restaurant) => restaurant.id === selectedRestaurantId)) {
      setSelectedRestaurantId(filteredRestaurants[0].id);
    }
  }, [filteredRestaurants, selectedRestaurantId]);

  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === selectedRestaurantId) || filteredRestaurants[0] || restaurants[0] || null,
    [filteredRestaurants, restaurants, selectedRestaurantId]
  );

  const selectedMenuItem = useMemo(
    () => selectedRestaurant?.menu.find((item) => item.id === selectedMenuItemId) || selectedRestaurant?.menu?.[0] || null,
    [selectedMenuItemId, selectedRestaurant]
  );

  const visibleMenuItems = useMemo(
    () => (selectedRestaurant?.menu || []).filter((item) => menuMatchesDietaryFilter(item, dietaryFilter)),
    [dietaryFilter, selectedRestaurant]
  );

  useEffect(() => {
    if (!visibleMenuItems.length) {
      return;
    }

    setSelectedMenuItemId((current) =>
      current && visibleMenuItems.some((item) => item.id === current)
        ? current
        : visibleMenuItems[0].id
    );
  }, [visibleMenuItems]);

  const customerOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.customerEmail === (currentUser?.email || "guest@nilahub.local")
      ),
    [currentUser?.email, orders]
  );

  const trackedOrder = customerOrders[0] || null;
  const recentCustomerOrders = useMemo(() => customerOrders.slice(0, 3), [customerOrders]);

  const restaurantIncomingOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.restaurantId === selectedRestaurant?.id && order.status !== "Delivered"
      ),
    [orders, selectedRestaurant?.id]
  );

  const deliveryAssignments = useMemo(
    () =>
      orders.filter(
        (order) => order.assignedDeliveryPartner && order.status !== REJECTED_ORDER_STATUS
      ),
    [orders]
  );

  const cartRestaurantId = cartItems[0]?.restaurantId || "";
  const cartRestaurantName = cartItems[0]?.restaurantName || "";

  const totalCart = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0),
    [cartItems]
  );
  const deliveryFee = cartItems.length > 0 ? 39 : 0;
  const selectedSlotMeta = useMemo(
    () => DELIVERY_SLOTS.find((slot) => slot.label === scheduledSlot) || DELIVERY_SLOTS[0],
    [scheduledSlot]
  );

  const slotUsage = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.scheduleLabel === scheduledSlot &&
          order.status !== REJECTED_ORDER_STATUS
      ).length,
    [orders, scheduledSlot]
  );

  const isSelectedSlotFull =
    selectedSlotMeta.label !== "ASAP" && slotUsage >= Number(selectedSlotMeta.capacity || 0);

  const promoSummary = useMemo(() => {
    if (!appliedPromoCode) {
      return { discount: 0, appliedLabel: "", error: "" };
    }

    const promo = PROMO_CODES[appliedPromoCode];
    if (!promo) {
      return { discount: 0, appliedLabel: "", error: "Promo code is invalid." };
    }

    if (totalCart < promo.minSubtotal) {
      return {
        discount: 0,
        appliedLabel: "",
        error: `Add items worth ${formatCurrency(promo.minSubtotal)} to use ${appliedPromoCode}.`,
      };
    }

    if (promo.type === "flat") {
      return { discount: promo.amount, appliedLabel: promo.label, error: "" };
    }

    if (promo.type === "percent") {
      const computedDiscount = Math.round((totalCart * promo.amount) / 100);
      return {
        discount: Math.min(computedDiscount, promo.maxDiscount || computedDiscount),
        appliedLabel: promo.label,
        error: "",
      };
    }

    if (promo.type === "delivery") {
      return {
        discount: Math.min(deliveryFee, promo.amount),
        appliedLabel: promo.label,
        error: "",
      };
    }

    return { discount: 0, appliedLabel: "", error: "" };
  }, [appliedPromoCode, deliveryFee, totalCart]);

  const grandTotal = Math.max(totalCart + deliveryFee - promoSummary.discount, 0);

  const analytics = useMemo(() => {
    const totalOrders = orders.length;
    const completedOrders = orders.filter((order) => order.status === "Delivered").length;
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const avgTicket = totalOrders ? totalRevenue / totalOrders : 0;
    const avgDeliveryTime = totalOrders
      ? Math.round(
          orders.reduce((sum, order) => sum + Math.max(parseEtaMinutes(order.eta), 10), 0) / totalOrders
        )
      : 0;

    return {
      totalOrders,
      completedOrders,
      activeRestaurants: restaurants.filter((restaurant) => restaurant.open).length,
      completionRate: totalOrders ? Math.round((completedOrders / totalOrders) * 100) : 0,
      avgTicket: Math.round(avgTicket),
      avgDeliveryTime,
      onTimeRate: Math.min(98, 80 + completedOrders * 4),
      retentionRate: Math.min(92, 48 + totalOrders * 6),
      revenueGrowth: Math.min(74, 18 + totalOrders * 7),
    };
  }, [orders, restaurants]);

  const topRecommendations = useMemo(() => {
    return filteredRestaurants
      .slice(0, 2)
      .map((restaurant) => {
        const recommendedItem =
          (restaurant.menu || []).find((item) => item.available && menuMatchesDietaryFilter(item, dietaryFilter)) ||
          (restaurant.menu || []).find((item) => item.available) ||
          restaurant.menu?.[0];

        return {
          restaurant,
          item: recommendedItem,
        };
      })
      .filter((entry) => entry.item);
  }, [dietaryFilter, filteredRestaurants]);

  const selectedRestaurantStats = useMemo(() => {
    if (!selectedRestaurant) {
      return null;
    }

    const menu = selectedRestaurant.menu || [];
    const unavailableCount = menu.filter((item) => !item.available).length;
    const activeOrders = orders.filter(
      (order) =>
        order.restaurantId === selectedRestaurant.id &&
        order.status !== "Delivered" &&
        order.status !== REJECTED_ORDER_STATUS
    ).length;
    const projectedRevenue = orders
      .filter((order) => order.restaurantId === selectedRestaurant.id)
      .reduce((sum, order) => sum + Number(order.total || 0), 0);

    return {
      menuCount: menu.length,
      unavailableCount,
      activeOrders,
      projectedRevenue,
    };
  }, [orders, selectedRestaurant]);

  const addNotification = (message) => {
    setNotifications((current) => [message, ...current].slice(0, 6));
  };

  const handleSelectRestaurant = (restaurant) => {
    setSelectedRestaurantId(restaurant.id);
    setSelectedMenuItemId(restaurant.menu?.[0]?.id || "");
  };

  const handleAddToCart = () => {
    if (!selectedRestaurant || !selectedMenuItem) {
      return;
    }

    if (!selectedRestaurant.open || !selectedMenuItem.available) {
      setStatusMessage("This restaurant item is currently unavailable.");
      return;
    }

    if (cartRestaurantId && cartRestaurantId !== selectedRestaurant.id) {
      setStatusMessage(
        `Your cart already has items from ${cartRestaurantName}. Clear the cart before adding items from ${selectedRestaurant.name}.`
      );
      return;
    }

    const newItem = {
      id: `cart-${selectedMenuItem.id}-${Date.now()}`,
      restaurantId: selectedRestaurant.id,
      restaurantName: selectedRestaurant.name,
      itemId: selectedMenuItem.id,
      name: selectedMenuItem.name,
      quantity: 1,
      price: selectedMenuItem.price,
      spice: selectedMenuItem.customizable ? selectedSpice : "Standard",
      addOn: selectedMenuItem.customizable ? selectedAddon : "No add-on",
      instructions: specialInstructions.trim(),
    };

    setCartItems((current) => [...current, newItem]);
    setStatusMessage(`${selectedMenuItem.name} added to cart.`);
    addNotification(`Cart updated with ${selectedMenuItem.name}.`);
  };

  const handleUpdateCartQuantity = (cartItemId, nextQuantity) => {
    if (nextQuantity <= 0) {
      setCartItems((current) => current.filter((item) => item.id !== cartItemId));
      setStatusMessage("Item removed from cart.");
      return;
    }

    setCartItems((current) =>
      current.map((item) =>
        item.id === cartItemId ? { ...item, quantity: nextQuantity } : item
      )
    );
    setStatusMessage("Cart quantity updated.");
  };

  const handleRemoveCartItem = (cartItemId) => {
    setCartItems((current) => current.filter((item) => item.id !== cartItemId));
    setStatusMessage("Item removed from cart.");
  };

  const handleClearCart = () => {
    setCartItems([]);
    setAppliedPromoCode("");
    setPromoCodeInput("");
    setStatusMessage("Cart cleared.");
  };

  const handleApplyPromoCode = () => {
    const normalizedCode = promoCodeInput.trim().toUpperCase();

    if (!normalizedCode) {
      setStatusMessage("Enter a promo code before applying it.");
      return;
    }

    if (!PROMO_CODES[normalizedCode]) {
      setAppliedPromoCode("");
      setStatusMessage("Promo code is invalid.");
      return;
    }

    if (totalCart < PROMO_CODES[normalizedCode].minSubtotal) {
      setAppliedPromoCode("");
      setStatusMessage(
        `Add items worth ${formatCurrency(PROMO_CODES[normalizedCode].minSubtotal)} to use ${normalizedCode}.`
      );
      return;
    }

    setAppliedPromoCode(normalizedCode);
    setStatusMessage(`Promo ${normalizedCode} applied. ${PROMO_CODES[normalizedCode].label}.`);
    addNotification(`Checkout promo ${normalizedCode} was applied.`);
  };

  const handlePlaceOrder = () => {
    if (!cartItems.length) {
      setStatusMessage("Add menu items before placing an order.");
      return;
    }

    if (isSelectedSlotFull) {
      setStatusMessage(`${scheduledSlot} is full right now. Choose another delivery slot.`);
      return;
    }

    const cartRestaurantIds = [...new Set(cartItems.map((item) => item.restaurantId).filter(Boolean))];
    if (cartRestaurantIds.length > 1) {
      setStatusMessage("Only one restaurant can be checked out at a time.");
      return;
    }

    const restaurant = restaurants.find((item) => item.id === cartItems[0].restaurantId) || selectedRestaurant;
    const rider = DELIVERY_PARTNERS[orders.length % DELIVERY_PARTNERS.length];
    const nextOrder = {
      id: `fd-${Date.now()}`,
      restaurantId: restaurant?.id || "restaurant",
      restaurantName: restaurant?.name || "Restaurant",
      customerName: currentUser?.name || "Guest Customer",
      customerEmail: currentUser?.email || "guest@nilahub.local",
      items: cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        spice: item.spice,
        addOn: item.addOn,
        instructions: item.instructions,
      })),
      subtotal: totalCart,
      deliveryFee,
      promoCode: appliedPromoCode,
      discountAmount: promoSummary.discount,
      total: grandTotal,
      paymentMethod,
      scheduleLabel: scheduledSlot,
      status: "Order placed",
      assignedDeliveryPartner: rider,
      timeline: buildTimeline("Order placed"),
      eta: rider.eta,
      routeHint: `Auto-assigned to ${rider.name} with optimized route in ${rider.zone}.`,
      acceptedByRestaurant: false,
      customerRating: 0,
      customerReview: "",
    };

    setOrders((current) => [nextOrder, ...current]);
    setCartItems([]);
    setSpecialInstructions("");
    setAppliedPromoCode("");
    setPromoCodeInput("");
    setStatusMessage(`Order ${nextOrder.id} placed successfully.`);
    addNotification(`Payment confirmed via ${paymentMethod}. Customer, restaurant, and rider were notified.`);
  };

  const handleReorder = (order) => {
    if (!order?.items?.length) {
      return;
    }

    const reorderedItems = order.items.map((item) => ({
      id: `reorder-${order.id}-${item.id}-${Date.now()}`,
      restaurantId: order.restaurantId,
      restaurantName: order.restaurantName,
      itemId: item.id,
      name: item.name,
      quantity: Number(item.quantity || 1),
      price: Number(item.price || 0),
      spice: item.spice || "Standard",
      addOn: item.addOn || "No add-on",
      instructions: item.instructions || "",
    }));

    setCartItems(reorderedItems);
    setSelectedRestaurantId(order.restaurantId);
    setStatusMessage(`Added ${order.restaurantName} order back to cart for quick reorder.`);
    addNotification(`Quick reorder loaded from ${order.id}.`);
  };

  const updateOrderStatus = (orderId, status) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status,
              acceptedByRestaurant:
                status === "Preparing" || status === "Out for delivery" || status === "Delivered",
              assignedDeliveryPartner:
                status === REJECTED_ORDER_STATUS ? null : order.assignedDeliveryPartner,
              timeline: buildTimeline(status),
            }
          : order
      )
    );
    addNotification(`Order ${orderId} updated to ${status}.`);
  };

  const handleRestaurantDecision = (orderId, decision) => {
    if (decision === "accept") {
      updateOrderStatus(orderId, "Preparing");
      setStatusMessage(`Restaurant accepted order ${orderId}.`);
      return;
    }

    updateOrderStatus(orderId, REJECTED_ORDER_STATUS);
    setStatusMessage(`Restaurant rejected order ${orderId}.`);
    addNotification(`Order ${orderId} was rejected. Refund and customer notification were triggered.`);
  };

  const handleDeliveryAdvance = (order) => {
    if (order.status === REJECTED_ORDER_STATUS || order.status === "Delivered") {
      return;
    }

    const currentIndex = ORDER_STATUSES.indexOf(order.status);
    const nextStatus = ORDER_STATUSES[Math.min(currentIndex + 1, ORDER_STATUSES.length - 1)];
    updateOrderStatus(order.id, nextStatus);
    setStatusMessage(`Delivery status moved to ${nextStatus}.`);
  };

  const handleAddMenuItem = () => {
    if (!selectedRestaurant || !restaurantDraft.name.trim() || !restaurantDraft.price) {
      setStatusMessage("Enter menu item name and price before saving.");
      return;
    }

    const nextItem = {
      id: `${selectedRestaurant.id}-menu-${Date.now()}`,
      name: restaurantDraft.name.trim(),
      price: Number(restaurantDraft.price),
      category: restaurantDraft.category,
      description: restaurantDraft.description.trim(),
      prepTag: "New item",
      customizable: true,
      available: true,
    };

    setRestaurants((current) =>
      current.map((restaurant) =>
        restaurant.id === selectedRestaurant.id
          ? {
              ...restaurant,
              menu: [nextItem, ...restaurant.menu],
              avgPreparationTime:
                restaurantDraft.prepTime.trim() || restaurant.avgPreparationTime,
              licenseStatus:
                restaurantDraft.licenseStatus.trim() || restaurant.licenseStatus,
              walletOffers:
                restaurantDraft.serviceZone.trim()
                  ? `Serving ${restaurantDraft.serviceZone.trim()}`
                  : restaurant.walletOffers,
            }
          : restaurant
      )
    );
    setRestaurantDraft({
      name: "",
      price: "",
      category: "Mains",
      description: "",
      prepTime: "",
      serviceZone: "",
      licenseStatus: "",
    });
    setSelectedMenuItemId(nextItem.id);
    setStatusMessage(`${nextItem.name} added to ${selectedRestaurant.name}.`);
    addNotification(`Restaurant menu updated with ${nextItem.name}.`);
  };

  const handleToggleMenuAvailability = (itemId) => {
    setRestaurants((current) =>
      current.map((restaurant) =>
        restaurant.id !== selectedRestaurant?.id
          ? restaurant
          : {
              ...restaurant,
              menu: restaurant.menu.map((item) =>
                item.id === itemId ? { ...item, available: !item.available } : item
              ),
            }
      )
    );
    setStatusMessage("Menu availability updated.");
  };

  const handleToggleRestaurant = () => {
    if (!selectedRestaurant) {
      return;
    }

    setRestaurants((current) =>
      current.map((restaurant) =>
        restaurant.id === selectedRestaurant.id
          ? { ...restaurant, open: !restaurant.open }
          : restaurant
      )
    );
    setStatusMessage(
      `${selectedRestaurant.name} is now ${selectedRestaurant.open ? "paused" : "accepting orders"}.`
    );
  };

  const handleSubmitReview = () => {
    if (!trackedOrder || trackedOrder.status !== "Delivered") {
      return;
    }

    setOrders((current) =>
      current.map((order) =>
        order.id === trackedOrder.id
          ? {
              ...order,
              customerRating: Number(reviewState.rating),
              customerReview: reviewState.review.trim(),
            }
          : order
      )
    );
    setReviewState({ rating: 5, review: "" });
    setStatusMessage("Review saved for restaurant and admin feedback tracking.");
    addNotification(`Customer review captured for order ${trackedOrder.id}.`);
  };

  return (
    <div className="fooddelivery-shell">
      <section className="fooddelivery-hero">
        <div className="fooddelivery-hero-copy">
          <p className="fooddelivery-kicker">NilaHub Module</p>
          <h1>{contentCopy.title}</h1>
          <p>{contentCopy.subtitle}</p>
          <div className="fooddelivery-pillrow">
            <span className="fooddelivery-pill">Mobile responsive</span>
            <span className="fooddelivery-pill">Secure payments</span>
            <span className="fooddelivery-pill">Real-time tracking</span>
            <span className="fooddelivery-pill">Entrepreneur onboarding</span>
          </div>
        </div>

        <div className="fooddelivery-hero-card">
          <span className="fooddelivery-cardlabel">Success metrics</span>
          <div className="fooddelivery-metricgrid compact">
            {SUCCESS_METRICS.map((metric) => (
              <article key={metric.key} className="fooddelivery-metriccard">
                <strong>
                  {analytics[metric.key]}
                  {metric.suffix}
                </strong>
                <span>{metric.label}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fooddelivery-overview">
        <article className="fooddelivery-panel">
          <div className="fooddelivery-panelhead">
            <h2>Objectives</h2>
            <span className="fooddelivery-chip">FRS</span>
          </div>
          <ul className="fooddelivery-list">
            {OBJECTIVES.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </article>

        <article className="fooddelivery-panel">
          <div className="fooddelivery-panelhead">
            <h2>Non-functional</h2>
            <span className="fooddelivery-chip">Quality</span>
          </div>
          <ul className="fooddelivery-list">
            {NON_FUNCTIONAL_REQUIREMENTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="fooddelivery-panel">
          <div className="fooddelivery-panelhead">
            <h2>Coverage</h2>
            <span className="fooddelivery-chip">Live</span>
          </div>
          <div className="fooddelivery-pillrow">
            {SUPPORTED_LANGUAGES.map((item) => (
              <span key={item} className="fooddelivery-pill muted">
                {item}
              </span>
            ))}
          </div>
          <div className="fooddelivery-pillrow">
            {INTEGRATIONS.map((item) => (
              <span key={item} className="fooddelivery-pill muted">
                {item}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="fooddelivery-rolebar" aria-label="Food delivery role switcher">
        <div className="fooddelivery-rolebuttons">
          {ROLE_OPTIONS.map((role) => (
            <button
              key={role.id}
              type="button"
              className={`fooddelivery-rolebtn ${mode === role.id ? "active" : ""}`}
              onClick={() => setMode(role.id)}
            >
              {role.label}
            </button>
          ))}
        </div>
        <div className="fooddelivery-filters">
          <label>
            <span>Search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search restaurants or dishes"
            />
          </label>
          <label>
            <span>Cuisine</span>
            <select value={cuisineFilter} onChange={(event) => setCuisineFilter(event.target.value)}>
              {cuisineOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Preference</span>
            <select value={dietaryFilter} onChange={(event) => setDietaryFilter(event.target.value)}>
              {DIETARY_FILTERS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Availability</span>
            <select
              value={openNowOnly ? "Open now" : "All"}
              onChange={(event) => setOpenNowOnly(event.target.value === "Open now")}
            >
              <option value="All">All</option>
              <option value="Open now">Open now</option>
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="recommended">Recommended</option>
              <option value="rating">Rating</option>
              <option value="delivery">Fastest delivery</option>
              <option value="offer">Best offers</option>
            </select>
          </label>
        </div>
      </section>

      {statusMessage && (
        <p className="fooddelivery-status" role="status" aria-live="polite">
          {statusMessage}
        </p>
      )}

      <section className="fooddelivery-requirements">
        {REQUIREMENT_GROUPS.map((group) => (
          <article key={group.title} className="fooddelivery-panel">
            <div className="fooddelivery-panelhead">
              <h2>{group.title}</h2>
              <span className="fooddelivery-chip">Mapped</span>
            </div>
            <ul className="fooddelivery-list">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <div className="fooddelivery-layout">
        <main className="fooddelivery-main">
          {mode === "customer" && (
            <>
              <section className="fooddelivery-grid2">
                <article className="fooddelivery-panel">
                  <div className="fooddelivery-panelhead">
                    <h2>Smart Picks</h2>
                    <span className="fooddelivery-chip">Personalized</span>
                  </div>
                  <div className="fooddelivery-partnerlist">
                    {topRecommendations.length > 0 ? (
                      topRecommendations.map(({ restaurant, item }) => (
                        <article key={`${restaurant.id}-${item.id}`} className="fooddelivery-partnercard">
                          <div>
                            <strong>{item.name}</strong>
                            <p>{restaurant.name} | {restaurant.deliveryTime}</p>
                            <p>
                              {item.vegetarian ? "Veg" : "Non-veg"} | {item.customizable ? "Customizable" : "Ready to order"}
                            </p>
                          </div>
                          <div className="fooddelivery-actionrow">
                            <span>{formatCurrency(item.price)}</span>
                            <button
                              type="button"
                              className="fooddelivery-secondary"
                              onClick={() => {
                                handleSelectRestaurant(restaurant);
                                setSelectedMenuItemId(item.id);
                              }}
                            >
                              View dish
                            </button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="fooddelivery-muted">No dishes match the current search and preference filters.</p>
                    )}
                  </div>
                </article>

                <article className="fooddelivery-panel">
                  <div className="fooddelivery-panelhead">
                    <h2>Quick Reorder</h2>
                    <span className="fooddelivery-chip">Repeat favorites</span>
                  </div>
                  <div className="fooddelivery-partnerlist">
                    {recentCustomerOrders.length > 0 ? (
                      recentCustomerOrders.map((order) => (
                        <article key={order.id} className="fooddelivery-partnercard">
                          <div>
                            <strong>{order.restaurantName}</strong>
                            <p>{order.items.map((item) => item.name).join(", ")}</p>
                            <p>{order.status} | {formatCurrency(order.total)}</p>
                          </div>
                          <div className="fooddelivery-actionrow">
                            <span>{order.scheduleLabel}</span>
                            <button type="button" className="fooddelivery-secondary" onClick={() => handleReorder(order)}>
                              Reorder
                            </button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="fooddelivery-muted">Place an order once and it will appear here for one-tap reorder.</p>
                    )}
                  </div>
                </article>
              </section>

              <section className="fooddelivery-panel">
                <div className="fooddelivery-panelhead">
                  <h2>Browse Restaurants</h2>
                  <span className="fooddelivery-chip">{filteredRestaurants.length} listed</span>
                </div>
                <div className="fooddelivery-restaurantgrid">
                  {filteredRestaurants.map((restaurant) => (
                    <article
                      key={restaurant.id}
                      className={`fooddelivery-restaurantcard ${selectedRestaurant?.id === restaurant.id ? "selected" : ""}`}
                    >
                      <button
                        type="button"
                        className="fooddelivery-cardbutton"
                        onClick={() => handleSelectRestaurant(restaurant)}
                      >
                        <div className="fooddelivery-cardtop">
                          <div className="fooddelivery-avatar">{restaurant.imageLabel}</div>
                          <div>
                            <h3>{restaurant.name}</h3>
                            <p>{restaurant.cuisine}</p>
                          </div>
                        </div>
                        <div className="fooddelivery-chiprow">
                          {restaurant.promoted && <span className="fooddelivery-chip highlight">Promoted</span>}
                          <span className="fooddelivery-chip">{restaurant.discount}</span>
                          <span className="fooddelivery-chip">{restaurant.deliveryTime}</span>
                        </div>
                        <p className="fooddelivery-cardmeta">
                          Rating {restaurant.rating} | {restaurant.distanceKm} km | {formatCurrency(restaurant.priceForTwo)} for two
                        </p>
                        <p className={`fooddelivery-openstate ${restaurant.open ? "open" : "closed"}`}>
                          {restaurant.open ? "Accepting orders" : "Currently offline"}
                        </p>
                      </button>
                    </article>
                  ))}
                </div>
              </section>

              <section className="fooddelivery-grid2">
                <article className="fooddelivery-panel">
                  <div className="fooddelivery-panelhead">
                    <h2>Menu and Customization</h2>
                    <span className="fooddelivery-chip">{selectedRestaurant?.menu.length || 0} items</span>
                  </div>
                  {selectedRestaurant && selectedMenuItem ? (
                    <div className="fooddelivery-stack">
                      <div className="fooddelivery-cardtop">
                        <div className="fooddelivery-avatar">{selectedRestaurant.imageLabel}</div>
                        <div>
                          <h3>{selectedRestaurant.name}</h3>
                          <p>{selectedRestaurant.licenseStatus}</p>
                        </div>
                      </div>
                      <div className="fooddelivery-menulist">
                        {visibleMenuItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`fooddelivery-menuitem ${selectedMenuItem?.id === item.id ? "active" : ""}`}
                            onClick={() => setSelectedMenuItemId(item.id)}
                          >
                            <div>
                              <strong>{item.name}</strong>
                              <p>{item.category} | {item.prepTag}</p>
                            </div>
                            <span>{formatCurrency(item.price)}</span>
                          </button>
                        ))}
                      </div>
                      {visibleMenuItems.length === 0 && (
                        <p className="fooddelivery-muted">
                          No menu items match the current preference filter for this restaurant.
                        </p>
                      )}

                      <div className="fooddelivery-featurebox">
                        <h3>{selectedMenuItem.name}</h3>
                        <p>{selectedMenuItem.description}</p>
                        <div className="fooddelivery-chiprow">
                          <span className="fooddelivery-chip">{selectedMenuItem.category}</span>
                          <span className="fooddelivery-chip">{selectedMenuItem.prepTag}</span>
                          <span className="fooddelivery-chip">
                            {selectedMenuItem.vegetarian ? "Veg" : "Non-veg"}
                          </span>
                          <span className={`fooddelivery-chip ${selectedMenuItem.available ? "" : "danger"}`}>
                            {selectedMenuItem.available ? "Available" : "Unavailable"}
                          </span>
                        </div>
                        <div className="fooddelivery-formgrid">
                          <label>
                            <span>Spice level</span>
                            <select value={selectedSpice} onChange={(event) => setSelectedSpice(event.target.value)}>
                              <option value="Mild">Mild</option>
                              <option value="Medium">Medium</option>
                              <option value="Hot">Hot</option>
                            </select>
                          </label>
                          <label>
                            <span>Add-on</span>
                            <select value={selectedAddon} onChange={(event) => setSelectedAddon(event.target.value)}>
                              <option value="No add-on">No add-on</option>
                              <option value="Raita">Raita</option>
                              <option value="Fries">Fries</option>
                              <option value="Extra dip">Extra dip</option>
                            </select>
                          </label>
                        </div>
                        <label className="fooddelivery-textarea">
                          <span>Special instructions</span>
                          <textarea
                            rows="3"
                            value={specialInstructions}
                            onChange={(event) => setSpecialInstructions(event.target.value)}
                            placeholder="Less spicy, no onion, call on arrival"
                          />
                        </label>
                        <button type="button" className="fooddelivery-primary" onClick={handleAddToCart}>
                          Add to cart
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="fooddelivery-muted">Choose a restaurant to view menu items.</p>
                  )}
                </article>

                <article className="fooddelivery-panel">
                  <div className="fooddelivery-panelhead">
                    <h2>Checkout</h2>
                    <span className="fooddelivery-chip">Payments</span>
                  </div>
                  {cartItems.length > 0 ? (
                    <div className="fooddelivery-stack">
                      <ul className="fooddelivery-orderlist">
                        {cartItems.map((item) => (
                          <li key={item.id}>
                            <div>
                              <strong>{item.name}</strong>
                              <p>
                                {item.spice} | {item.addOn}
                                {item.instructions ? ` | ${item.instructions}` : ""}
                              </p>
                            </div>
                            <div className="fooddelivery-cartactions">
                              <button
                                type="button"
                                className="fooddelivery-secondary"
                                onClick={() => handleUpdateCartQuantity(item.id, item.quantity - 1)}
                                aria-label={`Decrease quantity for ${item.name}`}
                              >
                                -
                              </button>
                              <span>Qty {item.quantity}</span>
                              <button
                                type="button"
                                className="fooddelivery-secondary"
                                onClick={() => handleUpdateCartQuantity(item.id, item.quantity + 1)}
                                aria-label={`Increase quantity for ${item.name}`}
                              >
                                +
                              </button>
                              <span>{formatCurrency(item.price * item.quantity)}</span>
                              <button
                                type="button"
                                className="fooddelivery-secondary"
                                onClick={() => handleRemoveCartItem(item.id)}
                              >
                                Remove
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="fooddelivery-cardtop">
                        <p className="fooddelivery-muted">Ordering from {cartRestaurantName}</p>
                        <button type="button" className="fooddelivery-secondary" onClick={handleClearCart}>
                          Clear cart
                        </button>
                      </div>
                      <div className="fooddelivery-formgrid">
                        <label>
                          <span>Schedule delivery</span>
                          <select value={scheduledSlot} onChange={(event) => setScheduledSlot(event.target.value)}>
                            {DELIVERY_SLOTS.map((slot) => (
                              <option key={slot.label} value={slot.label}>
                                {slot.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>Payment</span>
                          <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                            {PAYMENT_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="fooddelivery-featurebox fooddelivery-inlinepanel">
                        <div>
                          <h3>Delivery slot capacity</h3>
                          <p>
                            {selectedSlotMeta.label} | {selectedSlotMeta.timing}
                          </p>
                        </div>
                        <span className={`fooddelivery-chip ${isSelectedSlotFull ? "danger" : ""}`}>
                          {selectedSlotMeta.label === "ASAP"
                            ? "Always available"
                            : `${Math.max(selectedSlotMeta.capacity - slotUsage, 0)} slots left`}
                        </span>
                      </div>
                      <div className="fooddelivery-formgrid">
                        <label>
                          <span>Promo code</span>
                          <input
                            type="text"
                            value={promoCodeInput}
                            onChange={(event) => setPromoCodeInput(event.target.value.toUpperCase())}
                            placeholder="SAVE50"
                          />
                        </label>
                        <div className="fooddelivery-promoactions">
                          <span className="fooddelivery-muted">Try `SAVE50`, `FEAST10`, or `FREEDEL`</span>
                          <button type="button" className="fooddelivery-secondary" onClick={handleApplyPromoCode}>
                            Apply promo
                          </button>
                        </div>
                      </div>
                      <div className="fooddelivery-summary">
                        <div><span>Subtotal</span><strong>{formatCurrency(totalCart)}</strong></div>
                        <div><span>Delivery fee</span><strong>{formatCurrency(deliveryFee)}</strong></div>
                        <div><span>Discount</span><strong>-{formatCurrency(promoSummary.discount)}</strong></div>
                        {appliedPromoCode && promoSummary.appliedLabel ? (
                          <div><span>Applied offer</span><strong>{appliedPromoCode}</strong></div>
                        ) : null}
                        <div className="total"><span>Total</span><strong>{formatCurrency(grandTotal)}</strong></div>
                      </div>
                      <button type="button" className="fooddelivery-primary" onClick={handlePlaceOrder}>
                        Place order
                      </button>
                    </div>
                  ) : (
                    <p className="fooddelivery-muted">
                      Add items, customize them, and choose payment to complete checkout.
                    </p>
                  )}
                </article>
              </section>

              <section className="fooddelivery-panel">
                <div className="fooddelivery-panelhead">
                  <h2>Order Tracking and Reviews</h2>
                  <span className="fooddelivery-chip">Live tracking</span>
                </div>
                {trackedOrder ? (
                  <div className="fooddelivery-grid2">
                    <div className="fooddelivery-stack">
                      <div className="fooddelivery-timeline">
                        {trackedOrder.timeline.map((step) => (
                          <div key={step.label} className={`fooddelivery-step ${step.complete ? "complete" : ""}`}>
                            <strong>{step.label}</strong>
                            <span>{step.complete ? "Completed" : "Pending"}</span>
                          </div>
                        ))}
                      </div>
                      <div className="fooddelivery-featurebox">
                        <h3>{trackedOrder.restaurantName}</h3>
                        <p>
                          {trackedOrder.scheduleLabel} | {trackedOrder.paymentMethod} | ETA {trackedOrder.eta}
                        </p>
                        <p>{trackedOrder.routeHint}</p>
                        <button
                          type="button"
                          className="fooddelivery-secondary"
                          onClick={() => handleDeliveryAdvance(trackedOrder)}
                          disabled={
                            trackedOrder.status === "Delivered" ||
                            trackedOrder.status === REJECTED_ORDER_STATUS
                          }
                        >
                          Advance demo status
                        </button>
                      </div>
                    </div>

                    <div className="fooddelivery-stack">
                      <div className="fooddelivery-featurebox">
                        <h3>Delivery partner</h3>
                        <p>
                          {trackedOrder.assignedDeliveryPartner?.name || "Awaiting rider"} |
                          {" "}{trackedOrder.assignedDeliveryPartner?.vehicle || "Unassigned"}
                        </p>
                        <p>Real-time map integration can plug into this route checkpoint flow.</p>
                      </div>

                      <div className="fooddelivery-featurebox">
                        <h3>Ratings and reviews</h3>
                        {trackedOrder.status === REJECTED_ORDER_STATUS ? (
                          <p className="fooddelivery-muted">
                            This order was rejected by the restaurant. No review is needed.
                          </p>
                        ) : trackedOrder.status === "Delivered" ? (
                          <>
                            <label>
                              <span>Rate food</span>
                              <select
                                value={reviewState.rating}
                                onChange={(event) =>
                                  setReviewState((current) => ({
                                    ...current,
                                    rating: Number(event.target.value),
                                  }))
                                }
                              >
                                {[5, 4, 3, 2, 1].map((value) => (
                                  <option key={value} value={value}>
                                    {value} star{value === 1 ? "" : "s"}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="fooddelivery-textarea">
                              <span>Feedback</span>
                              <textarea
                                rows="3"
                                value={reviewState.review}
                                onChange={(event) =>
                                  setReviewState((current) => ({ ...current, review: event.target.value }))
                                }
                                placeholder="Share food, packaging, or rider feedback"
                              />
                            </label>
                            <button type="button" className="fooddelivery-primary" onClick={handleSubmitReview}>
                              Submit review
                            </button>
                          </>
                        ) : (
                          <p className="fooddelivery-muted">
                            Reviews unlock after delivery is complete.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="fooddelivery-muted">No customer orders available yet.</p>
                )}
              </section>
            </>
          )}

          {mode === "restaurant" && (
            <>
              <section className="fooddelivery-grid2">
                <article className="fooddelivery-panel">
                  <div className="fooddelivery-panelhead">
                    <h2>Restaurant Operations</h2>
                    <span className="fooddelivery-chip">Entrepreneur view</span>
                  </div>
                  {selectedRestaurant ? (
                    <div className="fooddelivery-stack">
                      {selectedRestaurantStats && (
                        <div className="fooddelivery-metricgrid compact">
                          <article className="fooddelivery-metriccard">
                            <strong>{selectedRestaurantStats.menuCount}</strong>
                            <span>Menu items</span>
                          </article>
                          <article className="fooddelivery-metriccard">
                            <strong>{selectedRestaurantStats.activeOrders}</strong>
                            <span>Active orders</span>
                          </article>
                          <article className="fooddelivery-metriccard">
                            <strong>{selectedRestaurantStats.unavailableCount}</strong>
                            <span>Unavailable items</span>
                          </article>
                          <article className="fooddelivery-metriccard">
                            <strong>{formatCurrency(selectedRestaurantStats.projectedRevenue)}</strong>
                            <span>Order revenue</span>
                          </article>
                        </div>
                      )}

                      <div className="fooddelivery-featurebox">
                        <h3>{selectedRestaurant.name}</h3>
                        <div className="fooddelivery-summary mini">
                          <div><span>Status</span><strong>{selectedRestaurant.open ? "Accepting orders" : "Paused"}</strong></div>
                          <div><span>License</span><strong>{selectedRestaurant.licenseStatus}</strong></div>
                          <div><span>Prep SLA</span><strong>{selectedRestaurant.avgPreparationTime}</strong></div>
                          <div><span>Offer</span><strong>{selectedRestaurant.walletOffers}</strong></div>
                        </div>
                        <button type="button" className="fooddelivery-primary" onClick={handleToggleRestaurant}>
                          {selectedRestaurant.open ? "Pause restaurant" : "Resume orders"}
                        </button>
                      </div>

                      <div className="fooddelivery-featurebox">
                        <h3>Add or edit menu</h3>
                        <div className="fooddelivery-formgrid">
                          <label>
                            <span>Item name</span>
                            <input
                              type="text"
                              value={restaurantDraft.name}
                              onChange={(event) =>
                                setRestaurantDraft((current) => ({ ...current, name: event.target.value }))
                              }
                              placeholder="Kerala Fish Curry"
                            />
                          </label>
                          <label>
                            <span>Price</span>
                            <input
                              type="number"
                              value={restaurantDraft.price}
                              onChange={(event) =>
                                setRestaurantDraft((current) => ({ ...current, price: event.target.value }))
                              }
                              placeholder="220"
                            />
                          </label>
                          <label>
                            <span>Category</span>
                            <select
                              value={restaurantDraft.category}
                              onChange={(event) =>
                                setRestaurantDraft((current) => ({ ...current, category: event.target.value }))
                              }
                            >
                              <option value="Mains">Mains</option>
                              <option value="Combos">Combos</option>
                              <option value="Sides">Sides</option>
                              <option value="Desserts">Desserts</option>
                            </select>
                          </label>
                          <label>
                            <span>Prep time SLA</span>
                            <input
                              type="text"
                              value={restaurantDraft.prepTime}
                              onChange={(event) =>
                                setRestaurantDraft((current) => ({ ...current, prepTime: event.target.value }))
                              }
                              placeholder="15 mins"
                            />
                          </label>
                          <label>
                            <span>Service zone</span>
                            <input
                              type="text"
                              value={restaurantDraft.serviceZone}
                              onChange={(event) =>
                                setRestaurantDraft((current) => ({ ...current, serviceZone: event.target.value }))
                              }
                              placeholder="Kakkanad, Infopark"
                            />
                          </label>
                          <label>
                            <span>License status</span>
                            <input
                              type="text"
                              value={restaurantDraft.licenseStatus}
                              onChange={(event) =>
                                setRestaurantDraft((current) => ({ ...current, licenseStatus: event.target.value }))
                              }
                              placeholder="Verified FSSAI"
                            />
                          </label>
                        </div>
                        <label className="fooddelivery-textarea">
                          <span>Description</span>
                          <textarea
                            rows="3"
                            value={restaurantDraft.description}
                            onChange={(event) =>
                              setRestaurantDraft((current) => ({ ...current, description: event.target.value }))
                            }
                            placeholder="Freshly prepared signature item"
                          />
                        </label>
                        <button type="button" className="fooddelivery-primary" onClick={handleAddMenuItem}>
                          Save menu item
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="fooddelivery-muted">No restaurant selected.</p>
                  )}
                </article>

                <article className="fooddelivery-panel">
                  <div className="fooddelivery-panelhead">
                    <h2>Incoming Orders</h2>
                    <span className="fooddelivery-chip">{restaurantIncomingOrders.length} open</span>
                  </div>
                  <div className="fooddelivery-partnerlist">
                    {restaurantIncomingOrders.length > 0 ? (
                      restaurantIncomingOrders.map((order) => (
                        <article key={order.id} className="fooddelivery-partnercard">
                          <div>
                            <strong>{order.id}</strong>
                            <p>{order.customerName} | {order.items.length} item(s)</p>
                            <p>{order.status} | {order.scheduleLabel}</p>
                          </div>
                          <div className="fooddelivery-actionrow">
                            <span>{formatCurrency(order.total)}</span>
                            <button
                              type="button"
                              className="fooddelivery-primary"
                              onClick={() => handleRestaurantDecision(order.id, "accept")}
                              disabled={order.status !== "Order placed"}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="fooddelivery-secondary"
                              onClick={() => handleRestaurantDecision(order.id, "reject")}
                              disabled={order.status !== "Order placed"}
                            >
                              Reject
                            </button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="fooddelivery-muted">No pending restaurant orders.</p>
                    )}
                  </div>
                </article>
              </section>

              <section className="fooddelivery-panel">
                <div className="fooddelivery-panelhead">
                  <h2>Menu Availability</h2>
                  <span className="fooddelivery-chip">{selectedRestaurant?.menu.length || 0} items</span>
                </div>
                <div className="fooddelivery-partnerlist">
                  {(selectedRestaurant?.menu || []).map((item) => (
                    <article key={item.id} className="fooddelivery-partnercard">
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.description}</p>
                      </div>
                      <div className="fooddelivery-actionrow">
                        <span>{formatCurrency(item.price)}</span>
                        <button
                          type="button"
                          className="fooddelivery-secondary"
                          onClick={() => handleToggleMenuAvailability(item.id)}
                        >
                          {item.available ? "Mark unavailable" : "Mark available"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}

          {mode === "delivery" && (
            <section className="fooddelivery-panel">
              <div className="fooddelivery-panelhead">
                <h2>Delivery Dispatch Board</h2>
                <span className="fooddelivery-chip">Route optimization</span>
              </div>
              <div className="fooddelivery-partnerlist">
                {deliveryAssignments.map((order) => (
                  <article key={order.id} className="fooddelivery-partnercard">
                    <div>
                      <strong>{order.id}</strong>
                      <p>{order.restaurantName} to {order.customerName}</p>
                      <p>
                        {order.assignedDeliveryPartner?.name || "Awaiting rider"} |
                        {" "}{order.assignedDeliveryPartner?.vehicle || "Unassigned"} |
                        {" "}ETA {order.eta}
                      </p>
                      <p>{order.routeHint}</p>
                    </div>
                    <div className="fooddelivery-actionrow">
                      <span>{order.status}</span>
                      <button
                        type="button"
                        className="fooddelivery-primary"
                        onClick={() => handleDeliveryAdvance(order)}
                        disabled={
                          order.status === "Delivered" || order.status === REJECTED_ORDER_STATUS
                        }
                      >
                        Update status
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {mode === "admin" && (
            <>
              <section className="fooddelivery-panel">
                <div className="fooddelivery-panelhead">
                  <h2>Admin Analytics</h2>
                  <span className="fooddelivery-chip">Operations</span>
                </div>
                <div className="fooddelivery-metricgrid">
                  <article className="fooddelivery-metriccard">
                    <strong>{analytics.totalOrders}</strong>
                    <span>Total orders</span>
                  </article>
                  <article className="fooddelivery-metriccard">
                    <strong>{analytics.completedOrders}</strong>
                    <span>Completed</span>
                  </article>
                  <article className="fooddelivery-metriccard">
                    <strong>{formatCurrency(analytics.avgTicket)}</strong>
                    <span>Average ticket</span>
                  </article>
                  <article className="fooddelivery-metriccard">
                    <strong>{analytics.onTimeRate}%</strong>
                    <span>On-time rate</span>
                  </article>
                </div>
              </section>

              <section className="fooddelivery-grid2">
                <article className="fooddelivery-panel">
                  <div className="fooddelivery-panelhead">
                    <h2>Restaurant Governance</h2>
                    <span className="fooddelivery-chip">{analytics.activeRestaurants} active</span>
                  </div>
                  <div className="fooddelivery-partnerlist">
                    {restaurants.map((restaurant) => (
                      <article key={restaurant.id} className="fooddelivery-partnercard">
                        <div>
                          <strong>{restaurant.name}</strong>
                          <p>{restaurant.licenseStatus}</p>
                          <p>{restaurant.open ? "Operating" : "Paused"} | Rating {restaurant.rating}</p>
                        </div>
                        <div className="fooddelivery-actionrow">
                          <span>{restaurant.walletOffers}</span>
                          <button type="button" className="fooddelivery-secondary">
                            Review
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </article>

                <article className="fooddelivery-panel">
                  <div className="fooddelivery-panelhead">
                    <h2>Disputes and Feedback</h2>
                    <span className="fooddelivery-chip">Moderation</span>
                  </div>
                  <div className="fooddelivery-partnerlist">
                    {orders.slice(0, 3).map((order) => (
                      <article key={order.id} className="fooddelivery-partnercard">
                        <div>
                          <strong>{order.id}</strong>
                          <p>{order.restaurantName}</p>
                          <p>
                            {order.customerRating
                              ? `${order.customerRating}/5 stars | ${order.customerReview || "Feedback captured"}`
                              : "No dispute filed | Feedback pending"}
                          </p>
                        </div>
                        <div className="fooddelivery-actionrow">
                          <span>{order.status}</span>
                          <button type="button" className="fooddelivery-secondary">
                            Resolve
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </article>
              </section>
            </>
          )}
        </main>

        <aside className="fooddelivery-rail">
          <section className="fooddelivery-panel">
            <div className="fooddelivery-panelhead">
              <h2>Notifications</h2>
              <span className="fooddelivery-chip">Live</span>
            </div>
            <ul className="fooddelivery-list">
              {notifications.map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="fooddelivery-panel">
            <div className="fooddelivery-panelhead">
              <h2>Database scope</h2>
              <span className="fooddelivery-chip">Schema</span>
            </div>
            <div className="fooddelivery-pillrow">
              {DATABASE_TABLES.map((item) => (
                <span key={item} className="fooddelivery-pill muted">
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section className="fooddelivery-panel">
            <div className="fooddelivery-panelhead">
              <h2>Integrations</h2>
              <span className="fooddelivery-chip">External</span>
            </div>
            <ul className="fooddelivery-list">
              {INTEGRATIONS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default FoodDelivery;
