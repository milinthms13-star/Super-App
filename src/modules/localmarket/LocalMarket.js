import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import { localMarketService } from "../../services/localMarketService";
import "../../styles/LocalMarket.css";
import {
  DEFAULT_NEW_SHOP,
  DEFAULT_ORDER_FORM,
  DEFAULT_PRODUCT_FORM,
  FALLBACK_SHOPS,
} from "./constants";
import {
  evaluatePromoCode,
  extractEstimatedMinutes,
  getAverageProductPrice,
  getCartStorageKey,
  getPromoDiscount,
  getRoleLabel,
  normalizeOrder,
  normalizeProduct,
  normalizeShop,
  resolveLocalMarketRole,
} from "./utils";
import ShopList from "./components/ShopList";
import ProductList from "./components/ProductList";
import CartModal from "./components/CartModal";
import OrdersList from "./components/OrdersList";
import ReviewModal from "./components/ReviewModal";
import ShopOwnerDashboard from "./components/ShopOwnerDashboard";

const getAuthToken = () =>
  window.localStorage.getItem("token") ||
  window.localStorage.getItem("authToken") ||
  window.localStorage.getItem("accessToken") ||
  "";

function LocalMarket() {
  const { currentUser = {} } = useApp();
  const currentUserId = String(currentUser?.id || currentUser?._id || "");
  const currentRole = resolveLocalMarketRole(currentUser);
  const authToken = getAuthToken();

  const [currentTab, setCurrentTab] = useState("browse");
  const [shops, setShops] = useState([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [shopsError, setShopsError] = useState("");
  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopLoading, setSelectedShopLoading] = useState(false);
  const [selectedShopError, setSelectedShopError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [filterType, setFilterType] = useState("All");
  const [onlyOpenNow, setOnlyOpenNow] = useState(false);
  const [onlyOffers, setOnlyOffers] = useState(false);

  const [cart, setCart] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderForm, setOrderForm] = useState(DEFAULT_ORDER_FORM);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [promoUsageKey, setPromoUsageKey] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutValidationErrors, setCheckoutValidationErrors] = useState([]);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [newShop, setNewShop] = useState(DEFAULT_NEW_SHOP);
  const [selectedOwnerShopId, setSelectedOwnerShopId] = useState("");
  const [productForm, setProductForm] = useState(DEFAULT_PRODUCT_FORM);
  const [editingProductId, setEditingProductId] = useState("");
  const [shopOrders, setShopOrders] = useState([]);

  const [notice, setNotice] = useState({ type: "", message: "" });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: "" });
  const confirmActionRef = useRef(() => {});

  const selectedShop = useMemo(
    () => shops.find((shop) => shop.id === selectedShopId) || null,
    [shops, selectedShopId]
  );

  const ownerShops = useMemo(() => {
    if (!currentUserId) {
      return [];
    }
    return shops.filter((shop) => String(shop.ownerId) === currentUserId);
  }, [shops, currentUserId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setNotice({ type: "", message: "" }), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const notify = useCallback((type, message) => setNotice({ type, message }), []);

  const requestConfirmation = (message, onConfirm) => {
    confirmActionRef.current = onConfirm;
    setConfirmDialog({ open: true, message });
  };

  const loadShops = async () => {
    setShopsLoading(true);
    setShopsError("");
    try {
      const data = await localMarketService.getShops();
      if (Array.isArray(data) && data.length > 0) {
        setShops(data.map((shop) => normalizeShop(shop)));
      } else {
        setShops(FALLBACK_SHOPS.map((shop) => normalizeShop(shop)));
      }
    } catch (error) {
      setShopsError("Could not load shops from server. Showing fallback data.");
      setShops(FALLBACK_SHOPS.map((shop) => normalizeShop(shop)));
    } finally {
      setShopsLoading(false);
    }
  };

  const loadBuyerOrders = useCallback(async () => {
    if (!authToken) {
      setOrders([]);
      return;
    }
    setOrdersLoading(true);
    try {
      const data = await localMarketService.getMyOrders();
      setOrders((Array.isArray(data) ? data : []).map((order) => normalizeOrder(order)));
    } catch (error) {
      notify("error", "Could not load your orders.");
    } finally {
      setOrdersLoading(false);
    }
  }, [authToken, notify]);

  const loadShopOwnerOrders = useCallback(async (shopId) => {
    if (!authToken || !shopId) {
      setShopOrders([]);
      return;
    }
    try {
      const data = await localMarketService.getShopOrders(shopId);
      setShopOrders((Array.isArray(data) ? data : []).map((order) => normalizeOrder(order)));
    } catch (error) {
      notify("error", "Could not load shop orders.");
    }
  }, [authToken, notify]);

  const refreshShopDetails = async (shopId) => {
    if (!shopId) {
      return;
    }

    setSelectedShopLoading(true);
    setSelectedShopError("");
    try {
      const data = await localMarketService.getShop(shopId);
      const normalizedShop = normalizeShop({
        ...data,
        products: (data?.products || []).map((product) => normalizeProduct(product)),
      });

      setShops((previous) => {
        const next = [...previous];
        const index = next.findIndex((entry) => entry.id === normalizedShop.id);
        if (index >= 0) {
          next[index] = normalizedShop;
        } else {
          next.unshift(normalizedShop);
        }
        return next;
      });
    } catch (error) {
      setSelectedShopError("Could not load shop products.");
    } finally {
      setSelectedShopLoading(false);
    }
  };

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    if (currentRole === "buyer") {
      loadBuyerOrders();
    }
  }, [currentRole, loadBuyerOrders]);

  useEffect(() => {
    const storageKey = getCartStorageKey(currentUserId);
    try {
      const rawValue = window.localStorage.getItem(storageKey);
      const parsed = rawValue ? JSON.parse(rawValue) : [];
      setCart(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      setCart([]);
    }
  }, [currentUserId]);

  useEffect(() => {
    const storageKey = getCartStorageKey(currentUserId);
    window.localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart, currentUserId]);

  useEffect(() => {
    if (selectedShopId) {
      refreshShopDetails(selectedShopId);
    }
  }, [selectedShopId]);

  useEffect(() => {
    if (!selectedOwnerShopId && ownerShops.length > 0) {
      setSelectedOwnerShopId(ownerShops[0].id);
    }
  }, [ownerShops, selectedOwnerShopId]);

  useEffect(() => {
    if (currentRole === "shopowner" && selectedOwnerShopId) {
      loadShopOwnerOrders(selectedOwnerShopId);
    }
  }, [currentRole, selectedOwnerShopId, loadShopOwnerOrders]);

  const filteredShops = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    let result = [...shops];

    if (filterType !== "All") {
      result = result.filter((shop) => shop.type === filterType);
    }

    if (onlyOpenNow) {
      result = result.filter((shop) => Boolean(shop.isOpen));
    }

    if (onlyOffers) {
      result = result.filter((shop) => Boolean(shop.promoted) || String(shop.discount || "").trim() !== "");
    }

    if (normalizedSearch) {
      result = result.filter((shop) => {
        const productMatch = (shop.products || []).some((product) => {
          const nameMatch = String(product?.name || "").toLowerCase().includes(normalizedSearch);
          const categoryMatch = String(product?.category || "").toLowerCase().includes(normalizedSearch);
          return nameMatch || categoryMatch;
        });

        const shopNameMatch = String(shop.name || "").toLowerCase().includes(normalizedSearch);
        const shopTypeMatch = String(shop.type || "").toLowerCase().includes(normalizedSearch);
        return shopNameMatch || shopTypeMatch || productMatch;
      });
    }

    if (sortBy === "rating") {
      result.sort((left, right) => right.rating - left.rating);
    } else if (sortBy === "distance") {
      result.sort((left, right) => left.distanceKm - right.distanceKm);
    } else if (sortBy === "delivery") {
      result.sort((left, right) => extractEstimatedMinutes(left.deliveryTime) - extractEstimatedMinutes(right.deliveryTime));
    } else if (sortBy === "price") {
      result.sort((left, right) => getAverageProductPrice(left) - getAverageProductPrice(right));
    }

    return result;
  }, [shops, filterType, onlyOpenNow, onlyOffers, searchTerm, sortBy]);

  const cartShop = useMemo(() => {
    const shopId = cart[0]?.shopId;
    return shops.find((shop) => shop.id === shopId) || null;
  }, [cart, shops]);

  const cartTotals = useMemo(() => {
    if (cart.length === 0) {
      return { subtotal: 0, discount: 0, delivery: 0, total: 0 };
    }

    const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    let delivery = 0;
    if (orderForm.deliveryType === "Home Delivery") {
      const freeDeliveryAbove = Number(cartShop?.freeDeliveryAbove || 0);
      const deliveryCharge = Number(cartShop?.deliveryCharge || 0);
      delivery = subtotal >= freeDeliveryAbove ? 0 : deliveryCharge;
    }

    const discount = getPromoDiscount({
      promoCode: appliedPromo,
      subtotal,
      deliveryCharge: delivery,
    });
    const total = Math.max(0, subtotal - discount + delivery);
    return { subtotal, discount, delivery, total };
  }, [appliedPromo, cart, cartShop, orderForm.deliveryType]);

  const onAddToCart = (product, shop) => {
    const executeAdd = () => {
      setCart((previousCart) => {
        const existingItem = previousCart.find(
          (item) => item.productId === product.id && item.shopId === shop.id
        );
        if (existingItem) {
          return previousCart.map((item) =>
            item.productId === product.id && item.shopId === shop.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }

        return [
          ...previousCart,
          {
            productId: product.id,
            productName: product.name,
            image: product.image,
            price: Number(product.price || 0),
            quantity: 1,
            shopId: shop.id,
            category: product.category,
          },
        ];
      });
      notify("success", "Added to cart.");
    };

    if (cart.length > 0 && cart[0].shopId !== shop.id) {
      requestConfirmation(
        "Your cart has items from another shop. Replace the cart with this shop's items?",
        () => {
          setCart([]);
          executeAdd();
        }
      );
      return;
    }

    executeAdd();
  };

  const onUpdateQuantity = (productId, shopId, quantity) => {
    setCart((previousCart) => {
      if (quantity <= 0) {
        return previousCart.filter((item) => !(item.productId === productId && item.shopId === shopId));
      }

      return previousCart.map((item) =>
        item.productId === productId && item.shopId === shopId ? { ...item, quantity } : item
      );
    });
  };

  const validateCheckout = () => {
    const errors = [];
    const checkoutShop = cartShop;
    if (!authToken) {
      errors.push("Please log in before placing an order.");
    }

    if (cart.length === 0) {
      errors.push("Your cart is empty.");
      return errors;
    }

    if (!checkoutShop) {
      errors.push("Selected shop could not be found.");
    }

    if (checkoutShop && !checkoutShop.isOpen) {
      errors.push("This shop is currently closed.");
    }

    if (checkoutShop && cartTotals.subtotal < Number(checkoutShop.minOrder || 0)) {
      errors.push(`Minimum order for this shop is INR ${checkoutShop.minOrder}.`);
    }

    const phonePattern = /^\+?\d{10,13}$/;
    if (!phonePattern.test(String(orderForm.phoneNumber || "").trim())) {
      errors.push("Please provide a valid phone number.");
    }

    if (orderForm.deliveryType === "Home Delivery") {
      if (String(orderForm.deliveryAddress || "").trim().length < 12) {
        errors.push("Delivery address is required.");
      }
    }

    if (!String(orderForm.paymentMethod || "").trim()) {
      errors.push("Please select a payment method.");
    }

    cart.forEach((item) => {
      const product = (checkoutShop?.products || []).find((entry) => entry.id === item.productId);
      if (!product || !product.inStock) {
        errors.push(`${item.productName} is currently out of stock.`);
      }
    });

    return [...new Set(errors)];
  };

  const onApplyPromo = () => {
    const promoCode = promoCodeInput.trim().toUpperCase();
    if (!promoCode) {
      notify("error", "Enter a promo code.");
      return;
    }

    const result = evaluatePromoCode({
      code: promoCode,
      subtotal: cartTotals.subtotal,
      existingOrdersCount: orders.length,
      shop: cartShop,
      cartItems: cart,
    });

    if (!result.valid) {
      notify("error", result.message);
      return;
    }

    setAppliedPromo(promoCode);
    setPromoUsageKey(result.usageKey || "");
    notify("success", `${promoCode} applied.`);
  };

  const onPlaceOrder = async () => {
    const errors = validateCheckout();
    setCheckoutValidationErrors(errors);
    if (errors.length > 0) {
      notify("error", "Please resolve checkout validation errors.");
      return;
    }

    setCheckoutLoading(true);
    try {
      const orderPayload = {
        shopId: cartShop.id,
        items: cart.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
        })),
        subtotal: cartTotals.subtotal,
        discount: cartTotals.discount,
        deliveryCharge: cartTotals.delivery,
        deliveryType: orderForm.deliveryType,
        deliveryAddress: {
          street: orderForm.deliveryAddress,
          city: "",
          state: "",
        },
        paymentMethod: orderForm.paymentMethod,
        promoCode: appliedPromo || undefined,
        specialInstructions: orderForm.specialInstructions || "",
      };

      const data = await localMarketService.createOrder(orderPayload);
      const normalizedOrder = normalizeOrder(data);
      setOrders((previousOrders) => [normalizedOrder, ...previousOrders]);

      if (promoUsageKey) {
        const usageCount = Number(window.localStorage.getItem(promoUsageKey) || 0);
        window.localStorage.setItem(promoUsageKey, String(usageCount + 1));
      }

      setCart([]);
      setShowCheckout(false);
      setAppliedPromo("");
      setPromoCodeInput("");
      setPromoUsageKey("");
      setOrderForm(DEFAULT_ORDER_FORM);
      setCheckoutValidationErrors([]);
      setCurrentTab("orders");
      notify("success", "Order placed successfully.");
    } catch (error) {
      notify("error", "Could not place order. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const onCreateShop = async () => {
    if (!authToken) {
      notify("error", "Please log in as shop owner.");
      return;
    }
    if (!newShop.name.trim()) {
      notify("error", "Shop name is required.");
      return;
    }

    try {
      const payload = {
        name: newShop.name.trim(),
        type: newShop.type,
        deliveryCharge: Number(newShop.deliveryCharge || 0),
        minOrder: Number(newShop.minOrder || 0),
        freeDeliveryAbove: Number(newShop.freeDeliveryAbove || 0),
      };
      await localMarketService.createShop(payload);
      setNewShop(DEFAULT_NEW_SHOP);
      await loadShops();
      notify("success", "Shop created successfully.");
    } catch (error) {
      notify("error", "Unable to create shop.");
    }
  };

  const onCreateOrUpdateProduct = async () => {
    if (!authToken) {
      notify("error", "Please log in as shop owner.");
      return;
    }

    if (!selectedOwnerShopId) {
      notify("error", "Choose a shop first.");
      return;
    }

    const price = Number(productForm.price || 0);
    const mrp = Number(productForm.mrp || 0);
    if (!productForm.name.trim() || !productForm.quantity.trim() || price <= 0 || mrp <= 0) {
      notify("error", "Product name, quantity, price, and MRP are required.");
      return;
    }

    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      category: productForm.category,
      price,
      mrp,
      quantity: productForm.quantity.trim(),
      image: productForm.image.trim(),
      inStock: Boolean(productForm.inStock),
    };

    try {
      if (editingProductId) {
        await localMarketService.updateProduct(editingProductId, payload);
        notify("success", "Product updated.");
      } else {
        await localMarketService.createProduct(selectedOwnerShopId, payload);
        notify("success", "Product added.");
      }

      setProductForm(DEFAULT_PRODUCT_FORM);
      setEditingProductId("");
      await refreshShopDetails(selectedOwnerShopId);
    } catch (error) {
      notify("error", "Could not save product.");
    }
  };

  const onDeleteProduct = (product) => {
    requestConfirmation(`Delete product "${product.name}"?`, async () => {
      try {
        await localMarketService.deleteProduct(product.id);
        await refreshShopDetails(selectedOwnerShopId);
        notify("success", "Product deleted.");
      } catch (error) {
        notify("error", "Could not delete product.");
      }
    });
  };

  const onStartEditProduct = (product) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name || "",
      description: product.description || "",
      category: product.category || DEFAULT_PRODUCT_FORM.category,
      price: String(product.price || ""),
      mrp: String(product.mrp || ""),
      quantity: product.quantity || "",
      image: product.image || "",
      inStock: product.inStock !== false,
    });
  };

  const onOrderStatusChange = async (orderId, status) => {
    try {
      const data = await localMarketService.updateOrderStatus(orderId, status);
      const nextOrder = normalizeOrder(data);
      setShopOrders((previousOrders) =>
        previousOrders.map((order) => (order.id === orderId ? { ...order, ...nextOrder } : order))
      );
      notify("success", "Order status updated.");
    } catch (error) {
      notify("error", "Could not update order status.");
    }
  };

  const onSubmitReview = async () => {
    if (!reviewOrder) {
      return;
    }
    if (!reviewForm.comment.trim()) {
      notify("error", "Please add a review comment.");
      return;
    }
    setReviewSubmitting(true);
    try {
      const data = await localMarketService.addOrderReview(reviewOrder.id, {
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
      });
      const reviewedOrder = normalizeOrder(data);
      setOrders((previousOrders) =>
        previousOrders.map((order) => (order.id === reviewOrder.id ? { ...order, ...reviewedOrder } : order))
      );
      setReviewOrder(null);
      setReviewForm({ rating: 5, comment: "" });
      notify("success", "Review submitted.");
      if (selectedShopId) {
        refreshShopDetails(selectedShopId);
      }
    } catch (error) {
      notify("error", "Could not submit review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="local-market">
      <div className="lm-header">
        <h1>Local Market and Grocery Delivery</h1>
        <div className="lm-role-selector">
          <span>Role: {getRoleLabel(currentRole)}</span>
        </div>
      </div>

      {notice.message ? (
        <div className={`lm-notice lm-notice-${notice.type || "info"}`}>{notice.message}</div>
      ) : null}

      {currentRole === "buyer" ? (
        <div className="lm-buyer-view">
          {currentTab === "browse" ? (
            <ShopList
              shops={filteredShops}
              loading={shopsLoading}
              error={shopsError}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filterType={filterType}
              onFilterTypeChange={setFilterType}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              onlyOpenNow={onlyOpenNow}
              onOnlyOpenNowChange={setOnlyOpenNow}
              onlyOffers={onlyOffers}
              onOnlyOffersChange={setOnlyOffers}
              onOpenShop={(shopId) => {
                setSelectedShopId(shopId);
                setCurrentTab("products");
              }}
              ordersCount={orders.length}
              cartCount={cart.length}
              onShowOrders={() => setCurrentTab("orders")}
              onShowCart={() => setShowCheckout(true)}
            />
          ) : null}

          {currentTab === "products" ? (
            <ProductList
              shop={selectedShop}
              loading={selectedShopLoading}
              error={selectedShopError}
              onBack={() => setCurrentTab("browse")}
              onAddToCart={onAddToCart}
            />
          ) : null}

          {currentTab === "orders" ? (
            ordersLoading ? (
              <p className="lm-empty">Loading orders...</p>
            ) : (
              <OrdersList
                orders={orders}
                onBack={() => setCurrentTab("browse")}
                onLeaveReview={(order) => {
                  setReviewOrder(order);
                  setReviewForm({ rating: 5, comment: "" });
                }}
              />
            )
          ) : null}
        </div>
      ) : null}

      {currentRole === "shopowner" ? (
        <ShopOwnerDashboard
          shops={ownerShops}
          selectedShopId={selectedOwnerShopId}
          onSelectShop={(shopId) => {
            setSelectedOwnerShopId(shopId);
            refreshShopDetails(shopId);
          }}
          newShop={newShop}
          onNewShopChange={(field, value) => setNewShop((previous) => ({ ...previous, [field]: value }))}
          onCreateShop={onCreateShop}
          productForm={productForm}
          onProductFormChange={(field, value) => setProductForm((previous) => ({ ...previous, [field]: value }))}
          onCreateProduct={onCreateOrUpdateProduct}
          onStartEditProduct={onStartEditProduct}
          editingProductId={editingProductId}
          onDeleteProduct={onDeleteProduct}
          shopOrders={shopOrders}
          onOrderStatusChange={onOrderStatusChange}
        />
      ) : null}

      {currentRole === "delivery" ? (
        <div className="lm-orders-section">
          <h2>Delivery Partner Dashboard</h2>
          <p className="lm-empty">
            Assigned orders, pickup/drop workflow, route map, and earnings are planned for the next phase.
          </p>
        </div>
      ) : null}

      {currentRole === "admin" ? (
        <div className="lm-orders-section">
          <h2>Admin Controls</h2>
          <p className="lm-empty">
            Shop approvals, complaint handling, commission controls, and category moderation are queued for admin phase rollout.
          </p>
        </div>
      ) : null}

      {showCheckout ? (
        <CartModal
          cart={cart}
          orderForm={orderForm}
          onOrderFormChange={(field, value) =>
            setOrderForm((previous) => ({
              ...previous,
              [field]: value,
            }))
          }
          onClose={() => setShowCheckout(false)}
          onUpdateQuantity={onUpdateQuantity}
          promoCodeInput={promoCodeInput}
          onPromoCodeInputChange={setPromoCodeInput}
          appliedPromo={appliedPromo}
          onApplyPromo={onApplyPromo}
          cartTotals={cartTotals}
          onPlaceOrder={onPlaceOrder}
          validationErrors={checkoutValidationErrors}
          checkoutLoading={checkoutLoading}
        />
      ) : null}

      {reviewOrder ? (
        <ReviewModal
          reviewForm={reviewForm}
          onReviewFormChange={(field, value) =>
            setReviewForm((previous) => ({
              ...previous,
              [field]: value,
            }))
          }
          onClose={() => setReviewOrder(null)}
          onSubmit={onSubmitReview}
          submitting={reviewSubmitting}
        />
      ) : null}

      {confirmDialog.open ? (
        <div className="lm-modal-overlay" onClick={() => setConfirmDialog({ open: false, message: "" })}>
          <div className="lm-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Confirm Action</h2>
            <p>{confirmDialog.message}</p>
            <div className="lm-modal-buttons">
              <button
                className="lm-btn lm-btn-primary"
                onClick={() => {
                  setConfirmDialog({ open: false, message: "" });
                  confirmActionRef.current();
                }}
              >
                Confirm
              </button>
              <button
                className="lm-btn lm-btn-secondary"
                onClick={() => setConfirmDialog({ open: false, message: "" })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default LocalMarket;
