import React, { useEffect, useMemo, useState, useCallback } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { resolveProductImageSrc } from "./productImage";
import {
  formatCountdown,
  formatCurrency,
  isValidGSTIN,
  isValidIndianPhone,
  isValidPincode,
} from "../../utils/ecommerceHelpers";
import { sanitizeText } from "../../utils/xssProtection";
import { API_BASE_URL } from "../../utils/api";
import {
  getNotificationPermission,
  requestNotificationPermission,
  showServiceWorkerNotification,
} from "../../pwaConfig";
import { getPathForModule } from "../../utils/moduleRoutes";
import "../../styles/Ecommerce.css";

const PINCODE_LENGTH = 6;
const DEFAULT_COUNTRY = "India";

// Default values (will be overridden by backend constants)
const DEFAULT_DELIVERY_BASE_FEE = 40;
const DEFAULT_DELIVERY_PER_ITEM_FEE = 15;
const RAZORPAY_LOAD_TIMEOUT = 5000; // 5 seconds

const DEFAULT_DELIVERY_FORM = {
  receiverPhone: "",
  pincode: "",
  country: "",
  state: "",
  district: "",
  houseName: "",
  addressLine: "",
  gstin: "",
};

const buildFormattedAddress = (deliveryForm) =>
  [
    deliveryForm.houseName,
    deliveryForm.addressLine,
    deliveryForm.district,
    deliveryForm.state,
    deliveryForm.country,
    deliveryForm.pincode,
  ]
    .map((value) => sanitizeText(String(value || "")).trim())
    .filter(Boolean)
    .join(", ");

const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const existingScript = document.querySelector('script[data-razorpay-checkout="true"]');
    if (existingScript) {
      const timeout = setTimeout(() => {
        reject(new Error("Razorpay script load timeout"));
      }, RAZORPAY_LOAD_TIMEOUT);

      const cleanup = () => {
        clearTimeout(timeout);
        existingScript.removeEventListener("load", handleLoad);
        existingScript.removeEventListener("error", handleError);
      };

      const handleLoad = () => {
        cleanup();
        resolve(window.Razorpay);
      };

      const handleError = () => {
        cleanup();
        reject(new Error("Unable to load Razorpay script."));
      };

      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "true";

    const timeout = setTimeout(() => {
      reject(new Error("Razorpay script load timeout"));
    }, RAZORPAY_LOAD_TIMEOUT);

    script.onload = () => {
      clearTimeout(timeout);
      resolve(window.Razorpay);
    };

    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Unable to load Razorpay script."));
    };

    document.body.appendChild(script);
  });

const CartPage = ({ onContinueShopping = null }) => {
  const navigate = useNavigate();
  const {
    cart,
    currentUser,
    paymentGateways,
    paymentSecurityConfig,
    checkoutStatus,
    clearCheckoutStatus,
    removeFromCart,
    updateCartQuantity,
    placeOrder,
    initializePayment,
    savedAddresses,
    updateSavedAddresses,
    verifyRazorpayPayment,
    reserveFlashSaleItems,
  } = useApp();
  const isSellerAccount =
    currentUser?.registrationType === "entrepreneur" || currentUser?.role === "business";
  const [deliveryForm, setDeliveryForm] = useState(DEFAULT_DELIVERY_FORM);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [pincodeLookupMessage, setPincodeLookupMessage] = useState("");
  const [pincodeLookupLoading, setPincodeLookupLoading] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState("cod");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [saveAddressLabel, setSaveAddressLabel] = useState("");
  const [deliveryConstants, setDeliveryConstants] = useState({
    baseFee: DEFAULT_DELIVERY_BASE_FEE,
    perItemFee: DEFAULT_DELIVERY_PER_ITEM_FEE,
  });
  const [showOrderConfirm, setShowOrderConfirm] = useState(false);
  const [orderConfirmData, setOrderConfirmData] = useState(null);
  const [isOffline, setIsOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [notificationPermission, setNotificationPermission] = useState(() =>
    getNotificationPermission()
  );
  const [liveNow, setLiveNow] = useState(() => Date.now());
  const handleContinueShopping = () => {
    if (typeof onContinueShopping === "function") {
      onContinueShopping();
      return;
    }

    navigate(getPathForModule("ecommerce"));
  };

  // Fetch delivery constants from backend (ensures frontend/backend consistency)
  useEffect(() => {
    const fetchConstants = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/orders/constants`);
        if (response.data?.success && response.data.constants) {
          setDeliveryConstants({
            baseFee: response.data.constants.DELIVERY_BASE_FEE || DEFAULT_DELIVERY_BASE_FEE,
            perItemFee: response.data.constants.DELIVERY_PER_ITEM_FEE || DEFAULT_DELIVERY_PER_ITEM_FEE,
          });
        }
      } catch (err) {
        console.warn("Failed to fetch delivery constants, using defaults:", err);
      }
    };
    fetchConstants();
  }, []);

  const totalAmount = cart.reduce(
    (total, item) => total + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );
  const totalItems = cart.reduce((total, item) => total + Number(item.quantity || 1), 0);
  const hasReachedItemStock = (item) =>
    typeof item.stock === "number" && Number(item.quantity || 1) >= item.stock;
  const deliveryFee = useMemo(
    () => (cart.length > 0 ? deliveryConstants.baseFee + totalItems * deliveryConstants.perItemFee : 0),
    [cart.length, totalItems, deliveryConstants]
  );
  const grandTotal = totalAmount + deliveryFee;
  const buildOrderPayload = (items = cart) => {
    const subtotalAmount = (items || []).reduce(
      (total, item) => total + Number(item.price || 0) * Number(item.quantity || 1),
      0
    );
    const itemCount = (items || []).reduce((total, item) => total + Number(item.quantity || 1), 0);
    const computedDeliveryFee =
      items.length > 0 ? deliveryConstants.baseFee + itemCount * deliveryConstants.perItemFee : 0;

    return {
      amount: `INR ${subtotalAmount + computedDeliveryFee}`,
      subtotal: `INR ${subtotalAmount}`,
      deliveryFee: `INR ${computedDeliveryFee}`,
      deliveryAddress: buildFormattedAddress(deliveryForm),
      deliveryDetails: {
        ...deliveryForm,
        receiverPhone: deliveryForm.receiverPhone.trim(),
        pincode: deliveryForm.pincode.trim(),
      },
      items,
    };
  };

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const validateAddressFormForSave = () => {
    if (!deliveryForm.receiverPhone.trim()) {
      return "Enter the receiver phone number before saving this address.";
    }

    if (!isValidIndianPhone(deliveryForm.receiverPhone)) {
      return "Enter a valid 10-digit Indian phone number before saving this address.";
    }

    if (!isValidPincode(deliveryForm.pincode)) {
      return "Enter a valid 6-digit pincode before saving this address.";
    }

    if (!deliveryForm.country.trim() || !deliveryForm.state.trim() || !deliveryForm.district.trim()) {
      return "Country, state, and district are required before saving this address.";
    }

    if (!deliveryForm.houseName.trim()) {
      return "Enter the house name or building name before saving this address.";
    }

    if (!deliveryForm.addressLine.trim()) {
      return "Enter the address details before saving this address.";
    }

    return "";
  };

  const validateDeliveryForm = () => {
    if (!cart.length) {
      return "Your cart is empty.";
    }

    if (!deliveryForm.receiverPhone.trim()) {
      return "Enter the receiver phone number before checkout.";
    }

    if (!isValidIndianPhone(deliveryForm.receiverPhone)) {
      return "Enter a valid 10-digit Indian phone number.";
    }

    if (!isValidPincode(deliveryForm.pincode)) {
      return "Enter a valid 6-digit pincode.";
    }

    if (!deliveryForm.country.trim() || !deliveryForm.state.trim() || !deliveryForm.district.trim()) {
      return "Country, state, and district are required for delivery.";
    }

    if (!deliveryForm.houseName.trim()) {
      return "Enter the house name or building name.";
    }

    if (!deliveryForm.addressLine.trim()) {
      return "Enter the address details for delivery.";
    }

    if (selectedGateway !== "cod" && !paymentGateways[selectedGateway]?.enabled) {
      return `${selectedGateway === "razorpay" ? "Razorpay" : "Stripe"} is not configured right now.`;
    }

    return "";
  };

  useEffect(() => {
    const trimmedPincode = deliveryForm.pincode.trim();

    if (trimmedPincode.length !== PINCODE_LENGTH) {
      setPincodeLookupLoading(false);
      setPincodeLookupMessage("");
      return undefined;
    }

    let isCancelled = false;
    const controller = new AbortController();

    const fetchPincodeDetails = async () => {
      setPincodeLookupLoading(true);
      setPincodeLookupMessage("");

      try {
        const response = await axios.get(`${API_BASE_URL}/orders/pincode/${trimmedPincode}`, {
          signal: controller.signal,
        });
        const office = response.data?.location;

        if (!office) {
          if (!isCancelled) {
            setPincodeLookupMessage("Could not auto-fill this pincode. Please check it or enter details manually.");
          }
          return;
        }

        if (!isCancelled) {
          setDeliveryForm((currentForm) => ({
            ...currentForm,
            country: office.country || DEFAULT_COUNTRY,
            state: office.state || "",
            district: office.district || "",
          }));
          setPincodeLookupMessage("Location auto-filled from pincode.");
        }
      } catch (error) {
        if (!isCancelled) {
          if (error.name === "AbortError") {
            return;
          }
          console.warn("Pincode lookup failed:", error);
          setPincodeLookupMessage("Pincode lookup unavailable. Enter location details manually.");
        }
      } finally {
        if (!isCancelled) {
          setPincodeLookupLoading(false);
        }
      }
    };

    const timeoutId = setTimeout(fetchPincodeDetails, 350);

    return () => {
      isCancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [deliveryForm.pincode]);

  // Consolidated effect: Handle payment gateway fallback when selected gateway is disabled
  useEffect(() => {
    if (selectedGateway === "cod") {
      return; // COD is always available
    }

    if (paymentGateways[selectedGateway]?.enabled) {
      return; // Current gateway is still enabled
    }

    // Current gateway was disabled, find an alternative
    const enabledGateways = Object.entries(paymentGateways)
      .filter(([key, config]) => config.enabled && key !== selectedGateway)
      .map(([key]) => key);

    if (enabledGateways.length > 0) {
      setSelectedGateway(enabledGateways[0]);
    } else {
      setSelectedGateway("cod");
    }
  }, [paymentGateways, selectedGateway]);

  // Consolidated effect: Handle address selection sync
  useEffect(() => {
    if (!savedAddresses.length) {
      setSelectedAddressId("");
      return;
    }

    // Check if currently selected address still exists
    const addressExists = savedAddresses.some((addr) => addr.id === selectedAddressId);

    if (addressExists) {
      return; // Current selection is valid
    }

    // Address was removed, select the first one and populate form
    const firstAddress = savedAddresses[0];
    if (firstAddress?.data) {
      setDeliveryForm(firstAddress.data);
    }
    setSelectedAddressId(firstAddress?.id || "");
  }, [savedAddresses.length, savedAddresses, selectedAddressId]);

  // Update delivery form when specific address is selected
  useEffect(() => {
    if (!selectedAddressId) {
      return;
    }

    const selectedAddress = savedAddresses.find((address) => address.id === selectedAddressId);
    if (selectedAddress?.data) {
      setDeliveryForm(selectedAddress.data);
    }
  }, [selectedAddressId, savedAddresses]);

  useEffect(() => {
    if (checkoutStatus.gateway === "stripe" && checkoutStatus.type === "success") {
      setPincodeLookupMessage("");
      setDeliveryForm(DEFAULT_DELIVERY_FORM);
      setPaymentLoading(false);
      return;
    }

    if (checkoutStatus.gateway === "stripe" && checkoutStatus.type !== "loading") {
      setPaymentLoading(false);
    }
  }, [checkoutStatus]);

  const handleDeliveryFieldChange = useCallback((field, value) => {
    setSelectedAddressId("");
    setDeliveryForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }, []);

  const applySavedAddress = useCallback((addressId) => {
    const savedAddress = savedAddresses.find((address) => address.id === addressId);
    if (savedAddress) {
      setSelectedAddressId(addressId);
      setDeliveryForm(savedAddress.data);
    } else {
      setSelectedAddressId("");
    }
  }, [savedAddresses]);

  const saveCurrentAddress = useCallback(() => {
    const validationMessage = validateAddressFormForSave();
    if (validationMessage) {
      setCheckoutMessage(validationMessage);
      return;
    }

    const label = saveAddressLabel.trim() || `${deliveryForm.houseName}, ${deliveryForm.district || deliveryForm.state || deliveryForm.country}`;
    const nextAddress = {
      id: `addr-${Date.now()}`,
      label,
      data: { ...deliveryForm },
    };

    const newAddresses = [nextAddress, ...savedAddresses];
    if (newAddresses.length > 5) {
      setCheckoutMessage("Max 5 addresses saved. Your oldest address has been removed.");
    }
    
    updateSavedAddresses(newAddresses.slice(0, 5));
    setSelectedAddressId(nextAddress.id);
    setSaveAddressLabel("");
    setCheckoutMessage("Address saved for faster checkout.");
  }, [
    deliveryForm,
    savedAddresses,
    saveAddressLabel,
    updateSavedAddresses,
    validateAddressFormForSave,
  ]);

  const handleStartPayment = useCallback(async () => {
    clearCheckoutStatus();
    if (isSellerAccount) {
      setCheckoutMessage("Seller accounts cannot place orders or make payments.");
      return;
    }

    if (isOffline) {
      setCheckoutMessage("You're offline. Your cart is saved locally, but checkout needs a connection.");
      return;
    }

    const validationMessage = validateDeliveryForm();
    if (validationMessage) {
      setCheckoutMessage(validationMessage);
      return;
    }

    let nextItems = cart;
    if (cart.some((item) => item.flashSale?.saleId || item.flashSaleId)) {
      setCheckoutMessage("Reserving flash sale stock for checkout...");
      try {
        nextItems = await reserveFlashSaleItems(cart);
        setCheckoutMessage("Flash sale items reserved for 15 minutes.");
      } catch (error) {
        setCheckoutMessage(
          error.response?.data?.error || error.response?.data?.message || error.message || "Unable to reserve flash sale stock."
        );
        return;
      }
    }

    // Show order confirmation dialog instead of directly processing payment
    setOrderConfirmData(buildOrderPayload(nextItems));
    setShowOrderConfirm(true);
  }, [buildOrderPayload, cart, clearCheckoutStatus, isOffline, isSellerAccount, reserveFlashSaleItems, validateDeliveryForm]);

  const handleConfirmOrder = async (retryAttempt = 0) => {
    setShowOrderConfirm(false);
    setPaymentLoading(true);
    setCheckoutMessage("");

    try {
      if (selectedGateway === "cod") {
        await placeOrder(orderConfirmData);
        setCheckoutMessage("Order placed successfully with Cash on Delivery.");
        setPincodeLookupMessage("");
        setDeliveryForm(DEFAULT_DELIVERY_FORM);
        setPaymentLoading(false);
        return;
      }

      const paymentSession = await initializePayment(selectedGateway, orderConfirmData);

      if (selectedGateway === "stripe") {
        window.location.assign(paymentSession.checkoutUrl);
        return;
      }

      const RazorpayCheckout = await loadRazorpayScript();
      const razorpay = new RazorpayCheckout({
        key: paymentSession.key,
        amount: paymentSession.order.amount,
        currency: paymentSession.order.currency,
        name: "NilaHub",
        description: "Secure order payment",
        order_id: paymentSession.order.id,
        prefill: {
          name: currentUser?.name || "",
          email: currentUser?.email || "",
          contact: deliveryForm.receiverPhone.trim(),
        },
        notes: {
          address: buildFormattedAddress(deliveryForm),
          attemptId: paymentSession.attemptId,
        },
        theme: {
          color: "#c18b2f",
        },
        handler: async (response) => {
          setCheckoutMessage("Verifying Razorpay payment...");

          try {
            await verifyRazorpayPayment({
              attemptId: paymentSession.attemptId,
              ...response,
            });
            setCheckoutMessage("Payment successful. Your order has been placed.");
            setPincodeLookupMessage("");
            setDeliveryForm(DEFAULT_DELIVERY_FORM);
          } catch (error) {
            setCheckoutMessage(
              error.response?.data?.message || error.message || "Unable to verify Razorpay payment."
            );
          } finally {
            setPaymentLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentLoading(false);
            setCheckoutMessage("Payment was cancelled. You can try again.");
          },
        },
      });

      razorpay.on("payment.failed", (response) => {
        setPaymentLoading(false);
        const errorCode = response.error?.code;
        const errorDesc = response.error?.description;
        let userMessage = "Payment failed. Please try again.";

        if (errorCode === "BAD_REQUEST_ERROR") {
          userMessage = "Payment details invalid. Please check and try again.";
        } else if (errorCode === "GATEWAY_ERROR") {
          userMessage = "Payment gateway error. Try a different payment method or try again shortly.";
        } else if (errorCode === "INVALID_CURRENCY") {
          userMessage = "Payment method unavailable for this currency.";
        } else if (errorDesc) {
          userMessage = `Payment failed: ${errorDesc}`;
        }

        setCheckoutMessage(userMessage);
      });

      razorpay.open();
    } catch (error) {
      setPaymentLoading(false);
      const errorMsg = error.response?.data?.message || error.message || "Unable to start the payment flow right now.";
      if (
        selectedGateway === "razorpay" &&
        retryAttempt < 2 &&
        (errorMsg.includes("Razorpay") || errorMsg.includes("script"))
      ) {
        const nextAttempt = retryAttempt + 1;
        setCheckoutMessage(`${errorMsg} Retrying... (Attempt ${nextAttempt + 1}/3)`);
        setTimeout(() => {
          handleConfirmOrder(nextAttempt);
        }, 2000);
      } else {
        setCheckoutMessage(errorMsg);
      }
    }
  };

  return (
    <div className="ecommerce-container">
      <div className="ecommerce-header">
        <h1>Cart</h1>
        <p>Review your selected items and place your order.</p>
      </div>

      {isSellerAccount && (
        <div className="products-notice">
          Seller login is for business management only. Shopping and checkout are disabled.
        </div>
      )}

      {!isSellerAccount && isOffline && (
        <div className="products-notice">
          Offline mode is active. Your cart is stored locally and will be available when you reconnect.
        </div>
      )}

      {isSellerAccount ? (
        <div className="cart-panel empty-cart">
          <h2>Shopping Disabled</h2>
          <p>Switch to a customer account if you want to purchase products.</p>
          <button type="button" className="filter-btn active" onClick={handleContinueShopping}>
            Back to Workspace
          </button>
        </div>
      ) : cart.length === 0 ? (
        <div className="cart-panel empty-cart">
          <h2>Your cart is empty</h2>
          <p>Add products from GlobeMart to see them here.</p>
          <button type="button" className="filter-btn active" onClick={handleContinueShopping}>
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {cart.map((item) => (
              <article className="cart-item-card" key={item.id}>
                <div className="cart-item-media">
                  {resolveProductImageSrc(item.image) ? (
                    <img
                      className="product-media-image"
                      src={resolveProductImageSrc(item.image)}
                      alt={item.name}
                      loading="lazy"
                    />
                  ) : (
                    <span className="product-emoji">{item.name?.slice(0, 1)?.toUpperCase() || "P"}</span>
                  )}
                </div>
                <div className="cart-item-details">
                  <h3>{item.name}</h3>
                  <p>{item.category}</p>
                  {(item.batchLabel || item.batchLocation || item.expiryDate) && (
                    <p className="cart-item-meta">
                      {[
                        item.batchLabel ? `Batch ${item.batchLabel}` : "",
                        item.batchLocation ? `Dispatch from ${item.batchLocation}` : "",
                        item.expiryDate ? `Expiry ${String(item.expiryDate).slice(0, 10)}` : "",
                      ]
                        .filter(Boolean)
                        .join(" � ")}
                    </p>
                  )}
                  <p className="cart-item-meta">
                    {item.returnAllowed
                      ? `Return eligible within ${item.returnWindowDays || 0} day(s)`
                      : "Returns not allowed for this batch"}
                  </p>
                  <div className="cart-item-pricing">
                    <strong>INR {formatCurrency(item.price)}</strong>
                    <span>Subtotal: INR {formatCurrency(Number(item.price || 0) * Number(item.quantity || 1))}</span>
                  </div>
                  <div className="cart-quantity-controls">
                    <button
                      type="button"
                      className="quantity-btn"
                      onClick={() => updateCartQuantity(item.id, Number(item.quantity || 1) - 1)}
                      disabled={Number(item.quantity || 1) <= 1}
                      title="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="quantity-value">{item.quantity || 1}</span>
                    <button
                      type="button"
                      className="quantity-btn"
                      onClick={() => {
                        const newQty = Number(item.quantity || 1) + 1;
                        const availableStock = typeof item.stock === "number" ? item.stock : Number.POSITIVE_INFINITY;
                        if (newQty > availableStock) {
                          setCheckoutMessage(`Only ${availableStock} ${availableStock === 1 ? "item" : "items"} available for this product`);
                          return;
                        }
                        updateCartQuantity(item.id, newQty);
                      }}
                      disabled={hasReachedItemStock(item)}
                      title={hasReachedItemStock(item) ? "Stock limit reached" : "Increase quantity"}
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline cart-remove-btn"
                  onClick={() => removeFromCart(item.id)}
                >
                  Remove
                </button>
              </article>
            ))}
          </div>

          <aside className="cart-panel">
            <h2>Payment & Delivery</h2>

            <div className="delivery-form-grid">
              <div className="delivery-address-group delivery-address-group-full">
                <label htmlFor="savedAddress">Saved Delivery Address</label>
                <div className="saved-address-row">
                  <select
                    id="savedAddress"
                    value={selectedAddressId}
                    onChange={(event) => applySavedAddress(event.target.value)}
                  >
                    <option value="">Choose saved address</option>
                    {savedAddresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="delivery-address-group delivery-address-group-full">
                <label htmlFor="saveAddressLabel">Save current address as</label>
                <div className="saved-address-row">
                  <input
                    id="saveAddressLabel"
                    type="text"
                    value={saveAddressLabel}
                    onChange={(event) => setSaveAddressLabel(event.target.value)}
                    placeholder="Label this address, e.g. Home, Office"
                  />
                  <button type="button" className="btn btn-outline" onClick={saveCurrentAddress}>
                    Save Address
                  </button>
                </div>
              </div>

              <div className="delivery-address-group">
                <label htmlFor="receiverPhone">Receiver Phone Number</label>
                <input
                  id="receiverPhone"
                  type="tel"
                  value={deliveryForm.receiverPhone}
                  onChange={(event) =>
                    handleDeliveryFieldChange("receiverPhone", event.target.value.replace(/[^\d+\s-]/g, ""))
                  }
                  placeholder="Enter receiver phone number"
                />
              </div>

              <div className="delivery-address-group">
                <label htmlFor="pincode">Pincode</label>
                <input
                  id="pincode"
                  type="text"
                  inputMode="numeric"
                  maxLength={PINCODE_LENGTH}
                  value={deliveryForm.pincode}
                  onChange={(event) =>
                    handleDeliveryFieldChange("pincode", event.target.value.replace(/\D/g, "").slice(0, PINCODE_LENGTH))
                  }
                  placeholder="Enter 6-digit pincode"
                />
              </div>

              <div className="delivery-address-group">
                <label htmlFor="country">Country</label>
                <input
                  id="country"
                  type="text"
                  value={deliveryForm.country}
                  onChange={(event) => handleDeliveryFieldChange("country", event.target.value)}
                  placeholder="Auto-filled from pincode"
                />
              </div>

              <div className="delivery-address-group">
                <label htmlFor="state">State</label>
                <input
                  id="state"
                  type="text"
                  value={deliveryForm.state}
                  onChange={(event) => handleDeliveryFieldChange("state", event.target.value)}
                  placeholder="Auto-filled from pincode"
                />
              </div>

              <div className="delivery-address-group">
                <label htmlFor="district">District</label>
                <input
                  id="district"
                  type="text"
                  value={deliveryForm.district}
                  onChange={(event) => handleDeliveryFieldChange("district", event.target.value)}
                  placeholder="Auto-filled from pincode"
                />
              </div>

              <div className="delivery-address-group">
                <label htmlFor="houseName">House Name</label>
                <input
                  id="houseName"
                  type="text"
                  value={deliveryForm.houseName}
                  onChange={(event) => handleDeliveryFieldChange("houseName", event.target.value)}
                  placeholder="Enter house or building name"
                />
              </div>

              <div className="delivery-address-group delivery-address-group-full">
                <label htmlFor="addressLine">Address Line / Area / Landmark</label>
                <textarea
                  id="addressLine"
                  value={deliveryForm.addressLine}
                  onChange={(event) => handleDeliveryFieldChange("addressLine", event.target.value)}
                  placeholder="Enter street, area, landmark, or other address details"
                  rows="3"
                />
              </div>
            </div>

            {pincodeLookupLoading && (
              <div className="pincode-lookup-loading" role="status" aria-live="polite" aria-label="Looking up pincode details">
                <div className="spinner"></div>
                <p className="delivery-fee-note">Looking up pincode details...</p>
              </div>
            )}
            {!pincodeLookupLoading && pincodeLookupMessage && (
              <p className="delivery-fee-note" role="status" aria-live="polite">
                {pincodeLookupMessage}
              </p>
            )}

            <div className="payment-methods">
              <p className="payment-methods-title">Choose Payment Method</p>
              <p className="delivery-fee-note">
                Online payments use hosted tokenized checkout with 3D Secure when supported. Raw card details are not stored in GlobeMart.
              </p>
              <div className="payment-method-grid">
                <button
                  type="button"
                  className={`payment-method-card ${selectedGateway === "cod" ? "selected" : ""}`}
                  onClick={() => setSelectedGateway("cod")}
                  disabled={paymentLoading}
                >
                  <strong>Cash on Delivery</strong>
                  <span>Place the order now and pay when it arrives</span>
                </button>
                <button
                  type="button"
                  className={`payment-method-card ${selectedGateway === "razorpay" ? "selected" : ""}`}
                  onClick={() => setSelectedGateway("razorpay")}
                  disabled={!paymentGateways.razorpay.enabled || paymentLoading}
                >
                  <strong>Razorpay</strong>
                  <span>
                    {paymentGateways.razorpay.enabled
                      ? "UPI, cards, netbanking, wallets, tokenized checkout"
                      : "Not configured"}
                  </span>
                </button>
                <button
                  type="button"
                  className={`payment-method-card ${selectedGateway === "stripe" ? "selected" : ""}`}
                  onClick={() => setSelectedGateway("stripe")}
                  disabled={!paymentGateways.stripe.enabled || paymentLoading}
                >
                  <strong>Stripe</strong>
                  <span>
                    {paymentGateways.stripe.enabled
                      ? "Hosted card checkout with 3DS support"
                      : "Not configured"}
                  </span>
                </button>
              </div>
            </div>

            <div className="cart-summary-row">
              <span>Items</span>
              <strong>{totalItems}</strong>
            </div>
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <strong>INR {formatCurrency(totalAmount)}</strong>
            </div>
            <div className="cart-summary-row">
              <span>Delivery Fee</span>
              <strong>INR {formatCurrency(deliveryFee)}</strong>
            </div>
            <div className="cart-summary-row cart-summary-total">
              <span>Total</span>
              <strong>INR {formatCurrency(grandTotal)}</strong>
            </div>
            <p className="delivery-fee-note">
              Delivery fee includes INR {formatCurrency(deliveryConstants.baseFee)} base charge plus INR {formatCurrency(deliveryConstants.perItemFee)} per item.
            </p>
            {!paymentGateways.razorpay.enabled && !paymentGateways.stripe.enabled && (
              <p className="delivery-fee-note">
                Online payments are unavailable right now, but Cash on Delivery is still available.
              </p>
            )}
            {(checkoutMessage || checkoutStatus.message) && (
              <p className="checkout-message" role="status" aria-live="polite">
                {checkoutMessage || checkoutStatus.message}
              </p>
            )}
            <div className="cart-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStartPayment}
                disabled={paymentLoading}
              >
                {paymentLoading
                  ? "Processing..."
                  : selectedGateway === "cod"
                    ? "Place COD Order"
                  : selectedGateway === "stripe"
                    ? "Pay with Stripe"
                    : "Pay with Razorpay"}
              </button>
              <button type="button" className="btn btn-outline" onClick={handleContinueShopping}>
                Continue Shopping
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Order Confirmation Modal */}
      {showOrderConfirm && orderConfirmData && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="order-confirm-title" aria-describedby="order-confirm-desc">
          <div className="modal-content">
            <div className="modal-header">
              <h2 id="order-confirm-title">Confirm Your Order</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowOrderConfirm(false)}
                aria-label="Close confirmation dialog"
              >
                �
              </button>
            </div>

            <div className="modal-body" id="order-confirm-desc">
              <div className="order-confirm-section">
                <h3>Delivery Address</h3>
                <p className="order-confirm-detail">{orderConfirmData.deliveryAddress}</p>
                <p className="order-confirm-detail">Phone: {orderConfirmData.deliveryDetails.receiverPhone}</p>
              </div>

              <div className="order-confirm-section">
                <h3>Order Summary</h3>
                <div className="order-confirm-items">
                  {orderConfirmData.items.map((item) => (
                    <div key={item.id} className="order-confirm-item">
                      <div>
                        <strong>{item.name}</strong>
                        <p>Qty: {item.quantity} x INR {item.price}</p>
                        {item.flashSaleId && (
                          <p>
                            Flash sale locked
                            {item.flashReservationExpiresAt
                              ? ` until ${new Date(item.flashReservationExpiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                              : ""}
                          </p>
                        )}
                      </div>
                      <p>INR {Number(item.price || 0) * Number(item.quantity || 1)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="order-confirm-pricing">
                <div className="pricing-row">
                  <span>Subtotal</span>
                  <span>{orderConfirmData.subtotal}</span>
                </div>
                <div className="pricing-row">
                  <span>Delivery Fee</span>
                  <span>{orderConfirmData.deliveryFee}</span>
                </div>
                <div className="pricing-row pricing-total">
                  <strong>Total</strong>
                  <strong>{orderConfirmData.amount}</strong>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowOrderConfirm(false)}
              >
                Edit Order
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmOrder}
                disabled={paymentLoading}
              >
                {paymentLoading ? "Processing..." : "Confirm and Pay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

CartPage.propTypes = {
  onContinueShopping: PropTypes.func,
};

export default CartPage;
