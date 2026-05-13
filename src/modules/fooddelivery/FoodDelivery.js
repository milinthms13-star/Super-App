import React, { useEffect, useMemo, useState } from "react";
import foodDeliveryService from "../../services/foodDeliveryService";
import DeliveryPartnerDashboard from "./DeliveryPartnerDashboard";
import FoodAdminDashboard from "./FoodAdminDashboard";
import RestaurantDashboard from "./RestaurantDashboard";
import "../../styles/FoodDelivery.css";

const PAYMENT_OPTIONS = [
  { value: "cod", label: "Cash on Delivery" },
  { value: "wallet", label: "Wallet" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
];

const USER_ROLES = [
  { id: "customer", label: "Customer" },
  { id: "restaurant", label: "Restaurant Partner" },
  { id: "rider", label: "Delivery Partner" },
  { id: "admin", label: "Administrator" },
];

const VIEWS = [
  { id: "customer", label: "Customer" },
  { id: "restaurant", label: "Restaurant Ops" },
  { id: "rider", label: "Delivery Ops" },
  { id: "admin", label: "Admin Ops" },
];

const ROLE_VIEW_MAP = {
  customer: ["customer"],
  restaurant: ["restaurant"],
  rider: ["rider"],
  admin: ["admin"],
};

const ISSUE_OPTIONS = [
  { value: "late_delivery", label: "Late delivery" },
  { value: "item_missing", label: "Item missing" },
  { value: "quality_issue", label: "Food quality" },
  { value: "rider_issue", label: "Rider issue" },
];

const formatInr = (value) => `INR ${Number(value || 0).toFixed(2)}`;

const toDateTimeInputValue = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const buildDefaultCustomizationDraft = (item = {}) => ({
  variantId: item.variants?.find((variant) => variant.available !== false)?.id || "",
  addonIds: [],
  specialInstructions: "",
});

const sameSelection = (cartItem, itemId, draft) => {
  if (cartItem.id !== itemId) {
    return false;
  }

  const cartVariantId = cartItem.selectedVariant?.id || "";
  const cartAddons = (cartItem.selectedAddons || []).map((addon) => addon.id).sort().join("|");
  const draftAddons = (draft.addonIds || []).slice().sort().join("|");

  return (
    cartVariantId === (draft.variantId || "") &&
    cartAddons === draftAddons &&
    String(cartItem.specialInstructions || "").trim() === String(draft.specialInstructions || "").trim()
  );
};

const FoodDelivery = () => {
  const [activeView, setActiveView] = useState("customer");
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [rewardsSummary, setRewardsSummary] = useState(null);
  const [customizationDrafts, setCustomizationDrafts] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCuisine, setFilterCuisine] = useState("All");
  const [sortBy, setSortBy] = useState("rating");
  const [orders, setOrders] = useState([]);
  const [restaurantCartId, setRestaurantCartId] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [tipAmount, setTipAmount] = useState("0");
  const [scheduledFor, setScheduledFor] = useState("");
  const [rewardPointsToRedeem, setRewardPointsToRedeem] = useState("0");
  const [referralCode, setReferralCode] = useState("");
  const [checkoutSummary, setCheckoutSummary] = useState(null);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [trackingByOrderId, setTrackingByOrderId] = useState({});
  const [disputeDrafts, setDisputeDrafts] = useState({});
  const [userRole, setUserRole] = useState("customer");
  const [toastMessages, setToastMessages] = useState([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [loadingRestaurant, setLoadingRestaurant] = useState(false);
  const [updatingCart, setUpdatingCart] = useState(false);
  const [clearingCart, setClearingCart] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [trackingLoadingByOrderId, setTrackingLoadingByOrderId] = useState({});

  const canAccessView = (viewId) => ROLE_VIEW_MAP[userRole]?.includes(viewId);

  const addToast = (message, type = "info") => {
    const toast = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      message,
      type,
    };
    setToastMessages((current) => [toast, ...current]);
    window.setTimeout(() => {
      setToastMessages((current) => current.filter((item) => item.id !== toast.id));
    }, 4200);
  };

  const clearToasts = () => setToastMessages([]);

  const handleRoleChange = (nextRole) => {
    setUserRole(nextRole);
    if (!ROLE_VIEW_MAP[nextRole].includes(activeView)) {
      setActiveView(nextRole);
    }
  };

  const loadRestaurants = async () => {
    setLoadingRestaurants(true);
    try {
      const restaurantList = await foodDeliveryService.getRestaurants();
      setRestaurants(restaurantList);
    } catch (error) {
      console.error("Failed to load restaurants:", error);
      addToast("Unable to load restaurant list. Try again later.", "error");
    } finally {
      setLoadingRestaurants(false);
    }
  };

  const loadOrders = async () => {
    try {
      const orderList = await foodDeliveryService.getMyOrders();
      setOrders(orderList);
    } catch (error) {
      console.error("Failed to load food orders:", error);
      addToast("Unable to load your orders.", "error");
    }
  };

  const loadRewards = async () => {
    try {
      const rewards = await foodDeliveryService.getRewardsSummary();
      setRewardsSummary(rewards);
    } catch (error) {
      console.error("Failed to load food rewards:", error);
    }
  };

  const loadRecommendations = async (restaurantId, cartItems = []) => {
    try {
      const suggestedItems = await foodDeliveryService.getRecommendations(restaurantId, {
        cart: cartItems,
        limit: 4,
      });
      setRecommendations(suggestedItems);
    } catch (error) {
      console.error("Failed to load food recommendations:", error);
      setRecommendations([]);
    }
  };

  useEffect(() => {
    loadRestaurants().catch((error) => {
      console.error("Failed to load restaurants:", error);
    });
    loadOrders();
    loadRewards();
  }, []);

  useEffect(() => {
    let ignore = false;

    const refreshCheckoutSummary = async () => {
      if (!selectedRestaurant || cart.length === 0) {
        if (!ignore) {
          setCheckoutSummary(null);
          setCheckoutMessage("");
        }
        return;
      }

      try {
        const summary = await foodDeliveryService.getCheckoutSummary(selectedRestaurant.id, {
          cart,
          couponCode,
          paymentMethod,
          tipAmount: Number(tipAmount || 0),
          scheduledFor: scheduledFor || undefined,
          rewardPointsToRedeem: Number(rewardPointsToRedeem || 0),
          referralCode,
        });

        if (!ignore) {
          setCheckoutSummary(summary);
          setCheckoutMessage(summary.validationMessage || "");
        }
      } catch (error) {
        if (!ignore) {
          setCheckoutSummary(null);
          setCheckoutMessage(error.response?.data?.message || error.message || "Unable to preview checkout");
        }
      }
    };

    refreshCheckoutSummary();

    return () => {
      ignore = true;
    };
  }, [
    cart,
    couponCode,
    paymentMethod,
    referralCode,
    rewardPointsToRedeem,
    scheduledFor,
    selectedRestaurant,
    tipAmount,
  ]);

  useEffect(() => {
    if (!selectedRestaurant) {
      setRecommendations([]);
      return;
    }

    loadRecommendations(selectedRestaurant.id, cart);
  }, [selectedRestaurant, cart]);

  const filteredRestaurants = useMemo(() => {
    let result = restaurants.filter((restaurant) =>
      restaurant.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterCuisine !== "All") {
      result = result.filter((restaurant) => restaurant.categories?.includes(filterCuisine));
    }

    return result.sort((a, b) => {
      if (sortBy === "rating") {
        return Number(b.rating || 0) - Number(a.rating || 0);
      }

      if (sortBy === "delivery") {
        return parseInt(a.deliveryTime, 10) - parseInt(b.deliveryTime, 10);
      }

      return 0;
    });
  }, [restaurants, searchTerm, filterCuisine, sortBy]);

  const getDraftForItem = (item) => customizationDrafts[item.id] || buildDefaultCustomizationDraft(item);

  const cartCount = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const activeRestaurantName = selectedRestaurant?.name || "";
  const isCartReady = cart.length > 0;

  const openRestaurant = async (restaurant) => {
    setLoadingRestaurant(true);
    try {
      const [restaurantMenu, serverCart] = await Promise.all([
        foodDeliveryService.getMenu(restaurant.id),
        foodDeliveryService.getCart(restaurant.id),
      ]);

      setSelectedRestaurant(restaurant);
      setMenu(restaurantMenu);
      setCart(serverCart.items || []);
      setCustomizationDrafts(
        restaurantMenu.reduce((drafts, item) => {
          drafts[item.id] = buildDefaultCustomizationDraft(item);
          return drafts;
        }, {})
      );
      setRestaurantCartId(serverCart.restaurantId || null);
      setCouponCode(serverCart.couponCode || "");
      setPaymentMethod(serverCart.paymentMethod || "cod");
      setTipAmount(String(serverCart.tipAmount || 0));
      setScheduledFor(toDateTimeInputValue(serverCart.scheduledFor));
      setRewardPointsToRedeem(String(serverCart.rewardPointsToRedeem || 0));
      setReferralCode(serverCart.referralCode || "");
      setCheckoutMessage("");
      loadRecommendations(restaurant.id, serverCart.items || []);
    } catch (error) {
      console.error("Failed to load restaurant details:", error);
      addToast("Unable to open this restaurant right now.", "error");
    } finally {
      setLoadingRestaurant(false);
    }
  };

  const updateCustomizationDraft = (itemId, nextValue) => {
    setCustomizationDrafts((currentDrafts) => ({
      ...currentDrafts,
      [itemId]: {
        ...(currentDrafts[itemId] || {}),
        ...nextValue,
      },
    }));
  };

  const handleAddonToggle = (itemId, addonId, checked) => {
    const currentDraft = customizationDrafts[itemId] || {};
    const currentAddonIds = Array.isArray(currentDraft.addonIds) ? currentDraft.addonIds : [];
    const nextAddonIds = checked
      ? Array.from(new Set([...currentAddonIds, addonId]))
      : currentAddonIds.filter((value) => value !== addonId);

    updateCustomizationDraft(itemId, { addonIds: nextAddonIds });
  };

  const handleAddToCart = async (item, overrideDraft = null) => {
    if (!selectedRestaurant) {
      return;
    }

    const draft = overrideDraft || getDraftForItem(item);
    setUpdatingCart(true);

    try {
      const existingItem = cart.find((cartItem) => sameSelection(cartItem, item.id, draft));
      const updatedCart = await foodDeliveryService.addToCart(
        selectedRestaurant.id,
        item.id,
        existingItem ? existingItem.quantity + 1 : 1,
        {
          variantId: draft.variantId || undefined,
          addonIds: draft.addonIds || [],
          specialInstructions: draft.specialInstructions,
        }
      );

      setCart(updatedCart.items || []);
      setRestaurantCartId(updatedCart.restaurantId || selectedRestaurant.id);
      setCustomizationDrafts((currentDrafts) => ({
        ...currentDrafts,
        [item.id]: buildDefaultCustomizationDraft(item),
      }));
      addToast(`${item.name} added to cart.`, "success");
    } catch (error) {
      console.error("Cart update error:", error);
      addToast(error.response?.data?.message || "Unable to update cart right now.", "error");
    } finally {
      setUpdatingCart(false);
    }
  };

  const handleUpdateCartQuantity = async (cartItem, nextQuantity) => {
    if (!selectedRestaurant) {
      return;
    }

    const updatedQuantity = Number(nextQuantity);
    const options = {
      variantId: cartItem.selectedVariant?.id || undefined,
      addonIds: cartItem.selectedAddons?.map((addon) => addon.id) || [],
      specialInstructions: cartItem.specialInstructions || "",
    };

    if (updatedQuantity < 0) {
      return;
    }

    setUpdatingCart(true);
    try {
      const updatedCart = await foodDeliveryService.addToCart(
        selectedRestaurant.id,
        cartItem.id,
        updatedQuantity,
        options
      );
      setCart(updatedCart.items || []);
      setRestaurantCartId(updatedCart.restaurantId || selectedRestaurant.id);
      const action = updatedQuantity === 0 ? "removed from" : "updated in";
      addToast(`${cartItem.name} ${action} cart.`, "success");
    } catch (error) {
      console.error("Cart quantity update error:", error);
      addToast(error.response?.data?.message || "Unable to update cart quantity.", "error");
    } finally {
      setUpdatingCart(false);
    }
  };

  const handleClearCart = async () => {
    setClearingCart(true);
    if (!restaurantCartId) {
      setCart([]);
      setCheckoutSummary(null);
      setClearingCart(false);
      return;
    }

    try {
      await foodDeliveryService.clearCart(restaurantCartId);
      addToast("Cart cleared.", "info");
    } catch (error) {
      console.error("Cart clear error:", error);
      addToast(error.response?.data?.message || "Unable to clear cart.", "error");
    } finally {
      setCart([]);
      setRestaurantCartId(null);
      setCheckoutSummary(null);
      setCheckoutMessage("");
      setCouponCode("");
      setTipAmount("0");
      setPaymentMethod("cod");
      setScheduledFor("");
      setRewardPointsToRedeem("0");
      setReferralCode("");
      setClearingCart(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedRestaurant || cart.length === 0) {
      addToast("Add items to cart before checkout.", "warn");
      return;
    }

    if (checkoutSummary && checkoutSummary.isValid === false) {
      addToast(checkoutSummary.validationMessage || "Checkout is not ready yet.", "warn");
      return;
    }

    setCheckingOut(true);
    try {
      const order = await foodDeliveryService.checkout(selectedRestaurant.id, {
        cart,
        paymentMethod,
        couponCode,
        tipAmount: Number(tipAmount || 0),
        scheduledFor: scheduledFor || undefined,
        rewardPointsToRedeem: Number(rewardPointsToRedeem || 0),
        referralCode,
      });

      setCart([]);
      setRestaurantCartId(null);
      setCheckoutSummary(null);
      setCheckoutMessage("");
      setCouponCode("");
      setTipAmount("0");
      setPaymentMethod("cod");
      setScheduledFor("");
      setRewardPointsToRedeem("0");
      setReferralCode("");
      setOrders((currentOrders) => [order, ...currentOrders]);
      loadRewards();
      addToast(`Checkout successful! Total: ${formatInr(order.total)}`, "success");
    } catch (error) {
      console.error("Checkout error:", error);
      addToast(`Checkout failed: ${error.response?.data?.message || error.message || "Unknown error"}`, "error");
    } finally {
      setCheckingOut(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      const updatedOrder = await foodDeliveryService.cancelOrder(orderId);
      setOrders((currentOrders) =>
        currentOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
      );
      loadRewards();
      addToast(`Order ${updatedOrder.id} cancelled.`, "info");
    } catch (error) {
      console.error("Order cancellation error:", error);
      addToast(error.response?.data?.message || "Unable to cancel this order.", "error");
    }
  };

  const fetchOrderTracking = async (orderId, suppressToast = false) => {
    setTrackingLoadingByOrderId((current) => ({ ...current, [orderId]: true }));
    try {
      const tracking = await foodDeliveryService.getOrderTracking(orderId);
      setTrackingByOrderId((currentTracking) => ({
        ...currentTracking,
        [orderId]: tracking,
      }));
      if (!suppressToast) {
        addToast(`Tracking updated for order ${orderId}.`, "info");
      }
    } catch (error) {
      addToast(error.response?.data?.message || "Unable to load order tracking.", "error");
    } finally {
      setTrackingLoadingByOrderId((current) => ({ ...current, [orderId]: false }));
    }
  };

  const handleLoadTracking = (orderId) => fetchOrderTracking(orderId, false);

  useEffect(() => {
    const trackedOrderIds = Object.keys(trackingByOrderId);
    if (trackedOrderIds.length === 0) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      trackedOrderIds.forEach((orderId) => {
        fetchOrderTracking(orderId, true);
      });
    }, 20000);

    return () => {
      window.clearInterval(interval);
    };
  }, [trackingByOrderId]);

  const handleCreateDispute = async (orderId) => {
    const draft = disputeDrafts[orderId] || {};
    if (!draft.issueType || !draft.description) {
      addToast("Choose an issue type and add a short description.", "warn");
      return;
    }

    try {
      const dispute = await foodDeliveryService.createDispute(orderId, draft);
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                disputes: [...(order.disputes || []), dispute],
                activeDisputeCount: Number(order.activeDisputeCount || 0) + 1,
              }
            : order
        )
      );
      setDisputeDrafts((currentDrafts) => ({
        ...currentDrafts,
        [orderId]: { issueType: "", description: "" },
      }));
      addToast("Issue submitted. Our operations team will review it.", "info");
    } catch (error) {
      addToast(error.response?.data?.message || "Unable to raise an issue for this order.", "error");
    }
  };

  const renderMenuCustomization = (item) => {
    const draft = getDraftForItem(item);

    return (
      <div className="fd-controls">
        {item.variants?.length > 0 && (
          <select
            value={draft.variantId}
            onChange={(event) => updateCustomizationDraft(item.id, { variantId: event.target.value })}
          >
            <option value="">Choose size</option>
            {item.variants
              .filter((variant) => variant.available !== false)
              .map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name} {variant.priceModifier ? `(+${formatInr(variant.priceModifier)})` : ""}
                </option>
              ))}
          </select>
        )}

        {item.addons?.length > 0 && (
          <div>
            {item.addons
              .filter((addon) => addon.available !== false)
              .map((addon) => (
                <label key={addon.id} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    checked={draft.addonIds?.includes(addon.id) || false}
                    onChange={(event) => handleAddonToggle(item.id, addon.id, event.target.checked)}
                  />
                  {" "}
                  {addon.name} (+{formatInr(addon.price)})
                </label>
              ))}
          </div>
        )}

        <input
          placeholder="Special instructions"
          value={draft.specialInstructions || ""}
          onChange={(event) =>
            updateCustomizationDraft(item.id, { specialInstructions: event.target.value })
          }
        />
      </div>
    );
  };

  const renderCustomerView = () => (
    <>
      <div className="fd-controls fd-rolebar">
        <input
          placeholder="Search restaurants..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select value={filterCuisine} onChange={(event) => setFilterCuisine(event.target.value)}>
          <option>All</option>
          <option>Biryani</option>
          <option>Chinese</option>
          <option>North Indian</option>
        </select>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="rating">Top Rated</option>
          <option value="delivery">Fastest Delivery</option>
        </select>
      </div>

      {rewardsSummary && (
        <div className="fd-cart-summary">
          <div>Loyalty Balance: {rewardsSummary.pointsBalance} points</div>
          <div>Your referral code: {rewardsSummary.referralCode}</div>
          <div>Lifetime rewards earned: {rewardsSummary.lifetimePointsEarned} points</div>
        </div>
      )}

      <div className="fd-customer-layout">
        <main className="fd-customer-main">
          {loadingRestaurants ? (
            <div className="fd-panelhead">Loading restaurants...</div>
          ) : (
            <div className="fd-restaurants-grid">
              {filteredRestaurants.map((restaurant) => (
                <div key={restaurant.id} className="fd-restaurant-card">
                  <div className="fd-restaurant-image">{restaurant.imageLabel}</div>
                  <h3>{restaurant.name}</h3>
                  <div className="fd-stats">
                    <span>Rating {restaurant.rating}</span>
                    <span>{restaurant.deliveryTime}</span>
                  </div>
                  <button onClick={() => openRestaurant(restaurant)}>
                    View Menu
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedRestaurant && (
            <div className="fd-menu">
              <div className="fooddelivery-panelhead">
                <button onClick={() => setSelectedRestaurant(null)}>Back to restaurants</button>
                <h2>{selectedRestaurant.name}</h2>
                {loadingRestaurant && <span>Loading menu...</span>}
              </div>

              {recommendations.length > 0 && (
                <div className="fd-cart-summary">
                  <h3>Recommended for this order</h3>
                  <div className="fd-menu-grid">
                    {recommendations.map((item) => (
                      <div key={item.id} className="fd-menu-item">
                        <strong>{item.name}</strong>
                        <div>{formatInr(item.price)}</div>
                        <button
                          onClick={() =>
                            handleAddToCart(item, {
                              variantId:
                                item.variants?.find((variant) => variant.available !== false)?.id || "",
                              addonIds: [],
                              specialInstructions: "",
                            })
                          }
                          disabled={updatingCart}
                        >
                          Add Suggested
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="fd-menu-grid">
                {menu.map((item) => (
                  <div key={item.id} className="fd-menu-item">
                    <span>{item.name}</span>
                    <div>{formatInr(item.price)}</div>
                    <div>Prep: {item.prepTime || 0} mins</div>
                    {renderMenuCustomization(item)}
                    <button onClick={() => handleAddToCart(item)} disabled={updatingCart}>
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {isCartReady && (
          <aside className="fd-sticky-cart">
            <div className="fooddelivery-panelhead">
              <div>
                <h3>Cart</h3>
                <p>{cartCount} item{cartCount === 1 ? "" : "s"} • {formatInr(cartTotal)}</p>
                <p>{activeRestaurantName}</p>
              </div>
              <button type="button" onClick={handleClearCart} disabled={clearingCart || !isCartReady}>
                Clear
              </button>
            </div>

            <div className="fd-cart-items">
              {cart.map((item) => (
                <div key={item.lineItemKey || item.id} className="fd-cart-item">
                  <div>
                    <strong>{item.name}</strong>
                    <div>
                      {item.selectedVariant?.name ? `${item.selectedVariant.name} • ` : ""}
                      {item.selectedAddons?.length
                        ? item.selectedAddons.map((addon) => addon.name).join(", ")
                        : ""}
                    </div>
                    {item.specialInstructions && <div>{item.specialInstructions}</div>}
                  </div>
                  <div className="fd-quantity-controls">
                    <button
                      type="button"
                      onClick={() => handleUpdateCartQuantity(item, item.quantity - 1)}
                      disabled={updatingCart || item.quantity <= 0}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateCartQuantity(item, item.quantity + 1)}
                      disabled={updatingCart}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="fd-controls fd-form-row">
              <input
                placeholder="Promo code"
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              />
              <input
                placeholder="Referral code"
                value={referralCode}
                onChange={(event) => setReferralCode(event.target.value.toUpperCase())}
              />
            </div>
            <div className="fd-controls fd-form-row">
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                {PAYMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Tip"
                value={tipAmount}
                onChange={(event) => setTipAmount(event.target.value)}
              />
            </div>
            <div className="fd-controls fd-form-row">
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
              />
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Redeem points"
                value={rewardPointsToRedeem}
                onChange={(event) => setRewardPointsToRedeem(event.target.value)}
              />
            </div>

            {checkoutSummary && (
              <div className="fd-cart-summary">
                <div>Subtotal: {formatInr(checkoutSummary.subtotal)}</div>
                <div>Discount: {formatInr(checkoutSummary.discountAmount)}</div>
                <div>Delivery Fee: {formatInr(checkoutSummary.deliveryCharge)}</div>
                <div>Platform Fee: {formatInr(checkoutSummary.platformFee)}</div>
                <div>GST: {formatInr(checkoutSummary.taxAmount)}</div>
                <div>Tip: {formatInr(checkoutSummary.tipAmount)}</div>
                <div>Wallet Used: {formatInr(checkoutSummary.walletUsed)}</div>
                <div>Total: {formatInr(checkoutSummary.totalAmount)}</div>
                <div>Payable Now: {formatInr(checkoutSummary.payableAmount)}</div>
                <div>ETA Strategy: {checkoutSummary.etaSnapshot?.routeStrategy || "balanced"}</div>
                <div>ETA: {checkoutSummary.etaSnapshot?.totalMinutes || 0} mins</div>
                {checkoutSummary.isScheduled && (
                  <div>Scheduled Window: {checkoutSummary.scheduledWindowLabel}</div>
                )}
                <div>
                  Rewards: Redeem {checkoutSummary.loyalty?.pointsRedeemed || 0} / Earn {checkoutSummary.loyalty?.pointsEarned || 0}
                </div>
              </div>
            )}

            {checkoutMessage && <div>{checkoutMessage}</div>}

            <div className="fd-controls">
              <button onClick={handleCheckout} disabled={checkingOut || !isCartReady}>
                {checkingOut ? "Processing…" : "Checkout"}
              </button>
            </div>
          </aside>
        )}
      </div>

      <div className="orders-list">
        <h2>My Orders</h2>
        {orders.length === 0 && <p>No food delivery orders yet.</p>}
        {orders.map((order) => {
          const tracking = trackingByOrderId[order.id];
          const draft = disputeDrafts[order.id] || { issueType: "", description: "" };

          return (
            <div key={order.id} className="fd-order-status">
              <div>
                Order {order.id}: {order.status} - {formatInr(order.total)}
              </div>
              <div>
                Payment: {order.paymentMethod || "cod"} | Refund: {order.refundStatus || "none"}
              </div>
              <div>Rider: {order.driverProfile?.name || "Not assigned yet"}</div>
              {order.isScheduled && <div>Scheduled: {order.scheduledWindowLabel}</div>}
              <div>
                Loyalty: earned {order.loyalty?.pointsEarned || 0}, redeemed {order.loyalty?.pointsRedeemed || 0}
              </div>
              <button onClick={() => handleLoadTracking(order.id)}>Track Order</button>
              {order.canCancel && (
                <button onClick={() => handleCancelOrder(order.id)}>Cancel Order</button>
              )}

              {tracking && (
                <div>
                  <div>Tracking Status: {tracking.tracking?.status || "unassigned"}</div>
                  <div>ETA: {tracking.tracking?.estimatedArrivalMinutes || tracking.etaSnapshot?.totalMinutes || 0} mins</div>
                  <div>Route: {tracking.tracking?.routeStrategy || tracking.etaSnapshot?.routeStrategy || "balanced"}</div>
                  <div>Distance to you: {tracking.tracking?.distanceToCustomerKm || 0} km</div>
                  {tracking.riderSafety?.activeSos && <div>Rider SOS is currently active for this order.</div>}
                </div>
              )}

              <div className="fd-controls">
                <select
                  value={draft.issueType}
                  onChange={(event) =>
                    setDisputeDrafts((currentDrafts) => ({
                      ...currentDrafts,
                      [order.id]: {
                        ...draft,
                        issueType: event.target.value,
                      },
                    }))
                  }
                >
                  <option value="">Raise an issue</option>
                  {ISSUE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Describe the issue"
                  value={draft.description}
                  onChange={(event) =>
                    setDisputeDrafts((currentDrafts) => ({
                      ...currentDrafts,
                      [order.id]: {
                        ...draft,
                        description: event.target.value,
                      },
                    }))
                  }
                />
                <button onClick={() => handleCreateDispute(order.id)}>Submit Issue</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="food-delivery">
      <div className="fd-header">
        <div>
          <h1>Feastly - Food Delivery</h1>
          <p className="fooddelivery-chip">Role: {USER_ROLES.find((item) => item.id === userRole)?.label}</p>
        </div>
        <div className="fd-controls fd-role-selector">
          {USER_ROLES.map((role) => (
            <button
              key={role.id}
              className={userRole === role.id ? "fooddelivery-rolebtn active" : "fooddelivery-rolebtn"}
              onClick={() => handleRoleChange(role.id)}
              type="button"
            >
              {role.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fd-controls fd-rolebar">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            className={canAccessView(view.id) ? "fooddelivery-primary" : "fooddelivery-secondary"}
            onClick={() => canAccessView(view.id) && setActiveView(view.id)}
            type="button"
            disabled={!canAccessView(view.id)}
          >
            {view.label}
          </button>
        ))}
      </div>

      {toastMessages.length > 0 && (
        <div className="fd-toast-area" role="status" aria-live="polite">
          {toastMessages.map((toast) => (
            <div key={toast.id} className={`fd-toast fd-toast-${toast.type}`}>
              {toast.message}
            </div>
          ))}
        </div>
      )}

      {activeView === "customer" && renderCustomerView()}
      {activeView === "restaurant" && <RestaurantDashboard />}
      {activeView === "rider" && <DeliveryPartnerDashboard />}
      {activeView === "admin" && <FoodAdminDashboard />}
    </div>
  );
};

export default FoodDelivery;
