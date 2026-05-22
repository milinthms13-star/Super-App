import React, { useEffect, useMemo, useState } from "react";
import { hyperlocalApi } from "./hyperlocalApi";
import "./HyperlocalDeliveryHub.css";
import HyperlocalEmptyState from "./components/HyperlocalEmptyState";
import HyperlocalMetricCard from "./components/HyperlocalMetricCard";
import HyperlocalStatusBadge from "./components/HyperlocalStatusBadge";
import { hyperlocalStorage } from "./utils/hyperlocalStorage";
import { hyperlocalActionQueue } from "./utils/hyperlocalActionQueue";

const BASE_TABS = [
  { id: "user", label: "User Order Flow" },
  { id: "vendor", label: "Vendor Dashboard" },
  { id: "partner", label: "Partner Dashboard" },
  { id: "admin", label: "Admin Panel" },
  { id: "overview360", label: "360 Dashboard" },
  { id: "growth", label: "Wallet & Growth" },
];

const DEFAULT_ADDRESS = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  lat: 0,
  lng: 0,
};

const DEFAULT_VENDOR = {
  ownerEmail: "",
  ownerPhone: "",
  name: "",
  category: "Grocery",
  description: "",
  deliveryRadiusKm: 5,
  minOrderAmount: 99,
  deliveryCharge: 30,
  taxPercent: 5,
  lat: 8.5241,
  lng: 76.9366,
  addressText: "",
};

const DEFAULT_PRODUCT = {
  name: "",
  category: "",
  price: 0,
  mrp: 0,
  stockQty: 0,
  prescriptionRequired: false,
  isActive: true,
  description: "",
};

const DEFAULT_PARTNER = {
  fullName: "",
  email: "",
  phone: "",
  area: "Trivandrum",
  vehicleType: "Bike",
};

const DEFAULT_ADMIN_CONFIG = {
  zoneName: "Trivandrum Core",
  baseDeliveryCharge: 30,
  perKmCharge: 8,
  maxDeliveryRadiusKm: 10,
  commissionPercent: 12,
  platformFee: 8,
  emergencyMedicineFee: 20,
  surgeEnabled: false,
  surgeMultiplier: 1,
  surgeReason: "",
};

const mapLink = (lat, lng) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
const PAGE_SIZE = 20;

const getUserProfile = () => {
  const keys = ["user", "authUser", "profile"];
  for (const key of keys) {
    try {
      const raw = hyperlocalStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.email || parsed.phone || parsed.fullName || parsed.name)) {
        return parsed;
      }
    } catch (_error) {
      // ignore malformed localStorage entries
    }
  }
  return {};
};

const HyperlocalDeliveryHub = () => {
  const profile = getUserProfile();
  const currentEmail = String(profile.email || "").trim().toLowerCase();
  const currentPhone = String(profile.phone || "").trim();
  const currentName = String(profile.fullName || profile.name || "").trim();
  const role = String(profile.role || profile.registrationType || "").trim().toLowerCase();
  const isAdmin = role === "admin";
  const isVendor = isAdmin || ["vendor", "seller", "business", "shopowner", "shop_owner"].includes(role);
  const isPartner = isAdmin || ["partner", "deliverypartner", "delivery_partner", "rider"].includes(role);

  const [activeTab, setActiveTab] = useState("user");
  const [categories, setCategories] = useState([]);
  const [shops, setShops] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState({ lat: 0, lng: 0, label: "Location not shared" });
  const [selectedShop, setSelectedShop] = useState(null);
  const [cart, setCart] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [deliveryType, setDeliveryType] = useState("instant");
  const [deliveryWindowStart, setDeliveryWindowStart] = useState("");
  const [deliveryWindowEnd, setDeliveryWindowEnd] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [multiShopMode, setMultiShopMode] = useState(false);
  const [emergencyMedicine, setEmergencyMedicine] = useState(false);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [addressForm, setAddressForm] = useState({ ...DEFAULT_ADDRESS, fullName: currentName, phone: currentPhone });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [quote, setQuote] = useState(null);
  const [orders, setOrders] = useState([]);
  const [tracking, setTracking] = useState(null);

  const [vendorForm, setVendorForm] = useState({ ...DEFAULT_VENDOR, ownerEmail: currentEmail, ownerPhone: currentPhone });
  const [vendorShops, setVendorShops] = useState([]);
  const [vendorProductForm, setVendorProductForm] = useState(DEFAULT_PRODUCT);
  const [vendorSelectedShop, setVendorSelectedShop] = useState("");
  const [stockDrafts, setStockDrafts] = useState({});
  const [openingHoursDraft, setOpeningHoursDraft] = useState("09:00-21:00");
  const [vendorOrders, setVendorOrders] = useState([]);
  const [vendorSettlement, setVendorSettlement] = useState(null);
  const [vendorAnalytics, setVendorAnalytics] = useState(null);

  const [partnerForm, setPartnerForm] = useState({ ...DEFAULT_PARTNER, email: currentEmail, phone: currentPhone });
  const [partnerKycDocs, setPartnerKycDocs] = useState([]);
  const [partnerId, setPartnerId] = useState("");
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerJobs, setPartnerJobs] = useState([]);
  const [partnerWallet, setPartnerWallet] = useState(null);
  const [payoutAmount, setPayoutAmount] = useState("");

  const [adminConfig, setAdminConfig] = useState(DEFAULT_ADMIN_CONFIG);
  const [pendingShops, setPendingShops] = useState([]);
  const [pendingPartners, setPendingPartners] = useState([]);
  const [adminAnalytics, setAdminAnalytics] = useState(null);
  const [refunds, setRefunds] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [settlementReport, setSettlementReport] = useState(null);

  const [wallet, setWallet] = useState(null);
  const [walletTopup, setWalletTopup] = useState("");
  const [plans, setPlans] = useState([]);
  const [subs, setSubs] = useState([]);
  const [adForm, setAdForm] = useState({ shopId: "", title: "", description: "", budget: "" });
  const [adFilterShopId, setAdFilterShopId] = useState("");
  const [ads, setAds] = useState([]);

  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [queueProcessing, setQueueProcessing] = useState(false);
  const [queuedActionCount, setQueuedActionCount] = useState(0);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilter, setAuditFilter] = useState("");
  const [shopPagination, setShopPagination] = useState({ page: 1, limit: PAGE_SIZE, totalPages: 0, hasNext: false, hasPrev: false });
  const [orderPagination, setOrderPagination] = useState({ page: 1, limit: PAGE_SIZE, totalPages: 0, hasNext: false, hasPrev: false });
  const [adPagination, setAdPagination] = useState({ page: 1, limit: PAGE_SIZE, totalPages: 0, hasNext: false, hasPrev: false });
  const [adminPages, setAdminPages] = useState({
    pendingShops: 1,
    pendingPartners: 1,
    refunds: 1,
    complaints: 1,
    auditLogs: 1,
  });
  const [adminPagination, setAdminPagination] = useState({
    pendingShops: { page: 1, limit: PAGE_SIZE, totalPages: 0, hasNext: false, hasPrev: false },
    pendingPartners: { page: 1, limit: PAGE_SIZE, totalPages: 0, hasNext: false, hasPrev: false },
    refunds: { page: 1, limit: PAGE_SIZE, totalPages: 0, hasNext: false, hasPrev: false },
    complaints: { page: 1, limit: PAGE_SIZE, totalPages: 0, hasNext: false, hasPrev: false },
    auditLogs: { page: 1, limit: PAGE_SIZE, totalPages: 0, hasNext: false, hasPrev: false },
  });
  const [loading, setLoading] = useState({
    bootstrap: false,
    shops: false,
    quote: false,
    checkout: false,
    orders: false,
  });

  const visibleTabs = useMemo(
    () =>
      BASE_TABS.filter((tab) => {
        if (tab.id === "admin") return isAdmin;
        if (tab.id === "vendor") return isVendor;
        if (tab.id === "partner") return isPartner;
        return true;
      }),
    [isAdmin, isPartner, isVendor]
  );

  const showStatus = (message) => {
    setStatusMessage(message);
    setErrorMessage("");
    window.setTimeout(() => setStatusMessage(""), 4500);
  };

  const showError = (message) => {
    setErrorMessage(message);
    window.setTimeout(() => setErrorMessage(""), 5000);
  };

  const setLoadingFlag = (key, value) => setLoading((current) => ({ ...current, [key]: value }));
  const syncQueuedActionCount = () => setQueuedActionCount(hyperlocalActionQueue.getAll().length);

  const updateAdminPage = (key, page) => {
    setAdminPages((current) => ({ ...current, [key]: Math.max(1, page) }));
  };

  const filteredShops = useMemo(
    () => shops,
    [shops]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0),
    [cart]
  );

  const orderIdempotencyKey = useMemo(() => {
    const basis = JSON.stringify({
      email: currentEmail,
      deliveryType,
      deliveryWindowStart,
      deliveryWindowEnd,
      paymentMode,
      couponCode,
      multiShopMode,
      emergencyMedicine,
      address: {
        line1: addressForm.line1,
        pincode: addressForm.pincode,
        phone: addressForm.phone,
      },
      items: cart.map((entry) => ({ shopId: entry.shopId, productId: entry.productId, qty: entry.qty })),
    });
    let hash = 0;
    for (let i = 0; i < basis.length; i += 1) {
      hash = (hash * 31 + basis.charCodeAt(i)) >>> 0;
    }
    return `HL-ORD-${hash.toString(16).toUpperCase()}`;
  }, [
    addressForm.line1,
    addressForm.phone,
    addressForm.pincode,
    cart,
    couponCode,
    currentEmail,
    deliveryType,
    deliveryWindowEnd,
    deliveryWindowStart,
    emergencyMedicine,
    multiShopMode,
    paymentMode,
  ]);

  const canCheckout = cart.length > 0 && addressForm.line1.trim() && addressForm.pincode.trim() && addressForm.phone.trim();

  const loadBootstrap = async () => {
    setLoadingFlag("bootstrap", true);
    try {
      const response = await hyperlocalApi.bootstrap();
      const bootstrapCategories = response?.data?.categories || [];
      setCategories(bootstrapCategories);
      setCategory("All");
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to load hyperlocal settings.");
    } finally {
      setLoadingFlag("bootstrap", false);
    }
  };

  const loadShops = async (withLocation = location, page = shopPagination.page) => {
    setLoadingFlag("shops", true);
    try {
      const response = await hyperlocalApi.getShops({
        category: category === "All" ? "" : category,
        search,
        lat: withLocation.lat || undefined,
        lng: withLocation.lng || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setShops(response?.data?.shops || []);
      setShopPagination(response?.data?.pagination || { page, limit: PAGE_SIZE, totalPages: 0, hasNext: false, hasPrev: false });
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to fetch nearby shops.");
      setShops([]);
    } finally {
      setLoadingFlag("shops", false);
    }
  };

  const loadAddresses = async () => {
    try {
      const response = await hyperlocalApi.getAddresses();
      const list = response?.data?.addresses || [];
      setSavedAddresses(list);
      const defaultAddress = list.find((entry) => entry.isDefault) || list[0];
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.addressId);
        setAddressForm({
          fullName: defaultAddress.fullName || "",
          phone: defaultAddress.phone || "",
          line1: defaultAddress.line1 || "",
          line2: defaultAddress.line2 || "",
          city: defaultAddress.city || "",
          state: defaultAddress.state || "",
          pincode: defaultAddress.pincode || "",
          lat: defaultAddress.location?.lat || 0,
          lng: defaultAddress.location?.lng || 0,
        });
      }
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to fetch saved addresses.");
    }
  };

  const loadOrders = async (page = orderPagination.page) => {
    setLoadingFlag("orders", true);
    try {
      const response = await hyperlocalApi.getOrders({ page, limit: PAGE_SIZE });
      setOrders(response?.data?.orders || []);
      setOrderPagination(response?.data?.pagination || { page, limit: PAGE_SIZE, totalPages: 0, hasNext: false, hasPrev: false });
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to fetch order history.");
    } finally {
      setLoadingFlag("orders", false);
    }
  };

  useEffect(() => {
    loadBootstrap();
    loadShops(location, 1);
    loadAddresses();
    loadOrders(1);
    syncQueuedActionCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setShopPagination((current) => ({ ...current, page: 1 }));
    loadShops(location, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, search]);

  const addToCart = (shop, product) => {
    const key = `${shop.shopId}:${product.productId}`;
    setCart((current) => {
      const existing = current.find((entry) => entry.key === key);
      if (existing) {
        return current.map((entry) => (entry.key === key ? { ...entry, qty: Math.min(20, entry.qty + 1) } : entry));
      }
      return [
        ...current,
        {
          key,
          shopId: shop.shopId,
          shopName: shop.name,
          productId: product.productId,
          productName: product.name,
          price: product.price,
          qty: 1,
          prescriptionRequired: Boolean(product.prescriptionRequired),
        },
      ];
    });
  };

  const updateQty = (key, nextQty) => {
    if (nextQty <= 0) {
      setCart((current) => current.filter((entry) => entry.key !== key));
      return;
    }
    setCart((current) => current.map((entry) => (entry.key === key ? { ...entry, qty: Math.min(20, nextQty) } : entry)));
  };

  const requestQuote = async () => {
    if (!canCheckout) {
      showError("Address, phone, and cart items are required to calculate quote.");
      return;
    }
    if (deliveryType === "scheduled" && (!deliveryWindowStart || !deliveryWindowEnd)) {
      showError("Select both scheduled delivery window start and end times.");
      return;
    }
    setLoadingFlag("quote", true);
    try {
      const response = await hyperlocalApi.getQuote({
        userEmail: currentEmail || "guest@nilahub.local",
        userPhone: addressForm.phone,
        deliveryType,
        paymentMode,
        couponCode,
        multiShopMode,
        emergencyMedicine,
        deliveryWindowStart: deliveryType === "scheduled" ? deliveryWindowStart : "",
        deliveryWindowEnd: deliveryType === "scheduled" ? deliveryWindowEnd : "",
        prescriptionAttached: Boolean(prescriptionFile),
        address: {
          ...addressForm,
          lat: Number(addressForm.lat || location.lat || 0),
          lng: Number(addressForm.lng || location.lng || 0),
        },
        items: cart.map((entry) => ({ shopId: entry.shopId, productId: entry.productId, qty: entry.qty })),
      });
      setQuote(response?.data || null);
      showStatus("Quote updated.");
    } catch (error) {
      setQuote(null);
      showError(error?.response?.data?.message || "Unable to calculate quote.");
    } finally {
      setLoadingFlag("quote", false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!canCheckout) {
      showError("Please complete address and cart details.");
      return;
    }
    if (deliveryType === "scheduled" && (!deliveryWindowStart || !deliveryWindowEnd)) {
      showError("Select both scheduled delivery window start and end times.");
      return;
    }
    const orderPayload = {
      userEmail: currentEmail || "guest@nilahub.local",
      userPhone: addressForm.phone,
      deliveryType,
      paymentMode,
      couponCode,
      multiShopMode,
      emergencyMedicine,
      deliveryWindowStart: deliveryType === "scheduled" ? deliveryWindowStart : "",
      deliveryWindowEnd: deliveryType === "scheduled" ? deliveryWindowEnd : "",
      items: cart.map((entry) => ({ shopId: entry.shopId, productId: entry.productId, qty: entry.qty })),
      address: {
        ...addressForm,
        lat: Number(addressForm.lat || location.lat || 0),
        lng: Number(addressForm.lng || location.lng || 0),
      },
      idempotencyKey: orderIdempotencyKey,
    };
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      if (prescriptionFile) {
        showError("Prescription orders require online upload. Please reconnect and retry.");
        return;
      }
      queueAction({ type: "place_order", payload: orderPayload });
      return;
    }

    setLoadingFlag("checkout", true);
    try {
      const formData = buildOrderFormData(orderPayload);
      if (prescriptionFile) formData.append("prescription", prescriptionFile);

      const response = await hyperlocalApi.placeOrder(formData, { idempotencyKey: orderIdempotencyKey });
      showStatus(response?.message || "Order placed.");
      setCart([]);
      setQuote(null);
      setCouponCode("");
      setPrescriptionFile(null);
      await loadOrders();
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to place order.");
    } finally {
      setLoadingFlag("checkout", false);
    }
  };

  const trackOrder = async (orderId) => {
    try {
      const response = await hyperlocalApi.trackOrder(orderId);
      setTracking(response?.data || null);
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to track this order.");
    }
  };

  const useLiveLocation = () => {
    if (!navigator.geolocation) {
      showError("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
          label: "Live location detected",
        };
        setLocation(next);
        setShopPagination((current) => ({ ...current, page: 1 }));
        setAddressForm((current) => ({ ...current, lat: next.lat, lng: next.lng }));
        loadShops(next, 1);
        showStatus("Live location updated for distance-based shop results.");
      },
      () => showError("Unable to fetch live location.")
    );
  };

  const saveAddress = async () => {
    try {
      const payload = { ...addressForm };
      await hyperlocalApi.saveAddress(payload);
      showStatus("Address saved.");
      await loadAddresses();
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to save address.");
    }
  };

  const loadVendorData = async () => {
    try {
      const [shopsRes, ordersRes, settleRes, analyticsRes] = await Promise.all([
        hyperlocalApi.getVendorShops(),
        hyperlocalApi.vendorOrders(),
        hyperlocalApi.vendorSettle(),
        hyperlocalApi.vendorAnalytics(),
      ]);
      setVendorShops(shopsRes?.data?.shops || []);
      setVendorOrders(ordersRes?.data?.orders || []);
      setVendorSettlement(settleRes?.data || null);
      setVendorAnalytics(analyticsRes?.data || null);
      if (!vendorSelectedShop && shopsRes?.data?.shops?.length) setVendorSelectedShop(shopsRes.data.shops[0].shopId);
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to load vendor data.");
    }
  };

  const submitVendor = async (event) => {
    event.preventDefault();
    try {
      const response = await hyperlocalApi.applyVendorShop(vendorForm);
      showStatus(response?.message || "Vendor shop submitted.");
      await loadVendorData();
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to submit vendor shop.");
    }
  };

  const addVendorProduct = async (event) => {
    event.preventDefault();
    if (!vendorSelectedShop) {
      showError("Select one vendor shop first.");
      return;
    }
    try {
      await hyperlocalApi.addProduct(vendorSelectedShop, vendorProductForm);
      showStatus("Product added.");
      setVendorProductForm(DEFAULT_PRODUCT);
      await loadVendorData();
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to add product.");
    }
  };

  const toggleVendorShopStatus = async (shopId, open) => {
    try {
      await hyperlocalApi.updateShopOpenStatus(shopId, open);
      showStatus(`Shop marked as ${open ? "open" : "closed"}.`);
      await loadVendorData();
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to update shop status.");
    }
  };

  const saveStockChange = async (shop, product) => {
    try {
      const nextStock = Number(stockDrafts[product.productId] ?? product.stockQty);
      await hyperlocalApi.updateProduct(shop.shopId, product.productId, {
        ...product,
        stockQty: Number.isFinite(nextStock) ? nextStock : product.stockQty,
      });
      showStatus(`${product.name} stock updated.`);
      await loadVendorData();
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to update product stock.");
    }
  };

  const saveOpeningHours = async () => {
    if (!vendorSelectedShop) return showError("Select a shop for opening hours update.");
    const [open, close] = String(openingHoursDraft || "").split("-");
    if (!open || !close) return showError("Use HH:MM-HH:MM format.");
    try {
      await hyperlocalApi.updateOpeningHours(vendorSelectedShop, [{ day: "Mon-Sun", open: open.trim(), close: close.trim(), closed: false }]);
      showStatus("Opening hours updated.");
      await loadVendorData();
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to update opening hours.");
    }
  };

  const actOnVendorOrder = async (orderId, action) => {
    try {
      await hyperlocalApi.vendorOrderAction(orderId, action);
      showStatus(`Order ${action}ed by vendor.`);
      await loadVendorData();
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to update vendor order.");
    }
  };

  const submitPartner = async (event) => {
    event.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(partnerForm).forEach(([key, value]) => formData.append(key, value));
      Array.from(partnerKycDocs || []).forEach((file) => formData.append("kycDocs", file));
      const response = await hyperlocalApi.applyPartner(formData);
      const created = response?.data?.partner;
      if (created?.partnerId) setPartnerId(created.partnerId);
      showStatus(response?.message || "Partner application submitted.");
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to submit partner application.");
    }
  };

  const loadPartnerData = async () => {
    try {
      let resolvedPartnerId = partnerId;
      try {
        const profileRes = await hyperlocalApi.partnerProfile();
        const profilePartner = profileRes?.data?.partner;
        if (profilePartner?.partnerId) {
          resolvedPartnerId = profilePartner.partnerId;
          setPartnerId(profilePartner.partnerId);
          setPartnerOnline(Boolean(profilePartner.online));
        }
      } catch (_profileError) {
        // Partner profile is optional until onboarding is completed.
      }
      const jobsRes = await hyperlocalApi.partnerJobs();
      setPartnerJobs(jobsRes?.data?.jobs || []);
      if (resolvedPartnerId) {
        const walletRes = await hyperlocalApi.partnerWallet(resolvedPartnerId);
        setPartnerWallet(walletRes?.data || null);
      }
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to load partner data.");
    }
  };

  const togglePartnerOnline = async (nextOnline) => {
    if (!partnerId) {
      showError("Set partnerId from onboarding first.");
      return;
    }
    try {
      await hyperlocalApi.partnerAvailability(partnerId, nextOnline);
      setPartnerOnline(nextOnline);
      showStatus(`Partner is ${nextOnline ? "online" : "offline"}.`);
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to update partner status.");
    }
  };

  const acceptJob = async (orderId) => {
    if (!partnerId) {
      showError("Set partnerId from onboarding first.");
      return;
    }
    try {
      await hyperlocalApi.partnerAcceptJob(orderId);
      showStatus("Job accepted.");
      await loadPartnerData();
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to accept job.");
    }
  };

  const updateJobStage = async (orderId, status) => {
    try {
      await hyperlocalApi.partnerUpdateJob(orderId, status);
      showStatus(`Updated to ${status}.`);
      await loadPartnerData();
      await loadOrders();
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to update delivery stage.");
    }
  };

  const requestPayout = async () => {
    if (!partnerId) return showError("Set partnerId first.");
    const amount = Number(payoutAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      showError("Enter a valid payout amount.");
      return;
    }
    if (amount > Number(partnerWallet?.walletBalance || 0)) {
      showError("Requested amount exceeds available partner wallet balance.");
      return;
    }
    try {
      await hyperlocalApi.partnerPayout(partnerId, amount);
      setPayoutAmount("");
      showStatus("Payout request created.");
      await loadPartnerData();
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to request payout.");
    }
  };

  const loadAdminData = async (pageState = adminPages) => {
    try {
      const [shopsRes, partnersRes, analyticsRes, refundsRes, complaintsRes, settlementRes, auditRes] = await Promise.all([
        hyperlocalApi.adminPendingShops({ page: pageState.pendingShops, limit: PAGE_SIZE }),
        hyperlocalApi.adminPendingPartners({ page: pageState.pendingPartners, limit: PAGE_SIZE }),
        hyperlocalApi.adminAnalytics(),
        hyperlocalApi.adminRefunds({ page: pageState.refunds, limit: PAGE_SIZE }),
        hyperlocalApi.adminComplaints({ page: pageState.complaints, limit: PAGE_SIZE }),
        hyperlocalApi.adminSettlementReport(),
        hyperlocalApi.adminAuditLogs({ page: pageState.auditLogs, limit: PAGE_SIZE, action: auditFilter || undefined }),
      ]);
      setPendingShops(shopsRes?.data?.shops || []);
      setPendingPartners(partnersRes?.data?.partners || []);
      setAdminAnalytics(analyticsRes?.data || null);
      setRefunds(refundsRes?.data?.refunds || []);
      setComplaints(complaintsRes?.data?.complaints || []);
      setSettlementReport(settlementRes?.data || null);
      setAuditLogs(auditRes?.data?.auditLogs || []);
      setAdminPagination({
        pendingShops: shopsRes?.data?.pagination || { page: pageState.pendingShops, limit: PAGE_SIZE, totalPages: 0, hasNext: false, hasPrev: false },
        pendingPartners: partnersRes?.data?.pagination || { page: pageState.pendingPartners, limit: PAGE_SIZE, totalPages: 0, hasNext: false, hasPrev: false },
        refunds: refundsRes?.data?.pagination || { page: pageState.refunds, limit: PAGE_SIZE, totalPages: 0, hasNext: false, hasPrev: false },
        complaints: complaintsRes?.data?.pagination || { page: pageState.complaints, limit: PAGE_SIZE, totalPages: 0, hasNext: false, hasPrev: false },
        auditLogs: auditRes?.data?.pagination || { page: pageState.auditLogs, limit: PAGE_SIZE, totalPages: 0, hasNext: false, hasPrev: false },
      });
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to load admin data.");
    }
  };

  const applyAdminConfig = async (event) => {
    event.preventDefault();
    try {
      await hyperlocalApi.adminConfig(adminConfig);
      showStatus("Admin pricing config applied.");
      await loadAdminData();
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to update admin config.");
    }
  };

  const loadGrowthData = async (page = adPagination.page) => {
    try {
      const [walletRes, plansRes, subsRes, adsRes] = await Promise.all([
        hyperlocalApi.wallet(),
        hyperlocalApi.subscriptionPlans(),
        hyperlocalApi.subscriptions(),
        hyperlocalApi.ads({ shopId: adFilterShopId || "", page, limit: PAGE_SIZE }),
      ]);
      setWallet(walletRes?.data?.wallet || null);
      setPlans(plansRes?.data?.plans || []);
      setSubs(subsRes?.data?.subscriptions || []);
      setAds(adsRes?.data?.ads || []);
      setAdPagination(adsRes?.data?.pagination || { page, limit: PAGE_SIZE, totalPages: 0, hasNext: false, hasPrev: false });
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to load growth features.");
    }
  };

  const buildOrderFormData = (payload) => {
    const formData = new FormData();
    formData.append("userEmail", payload.userEmail);
    formData.append("userPhone", payload.userPhone);
    formData.append("deliveryType", payload.deliveryType);
    formData.append("paymentMode", payload.paymentMode);
    formData.append("couponCode", payload.couponCode || "");
    formData.append("multiShopMode", String(Boolean(payload.multiShopMode)));
    formData.append("emergencyMedicine", String(Boolean(payload.emergencyMedicine)));
    formData.append("deliveryWindowStart", payload.deliveryWindowStart || "");
    formData.append("deliveryWindowEnd", payload.deliveryWindowEnd || "");
    formData.append("items", JSON.stringify(payload.items || []));
    formData.append("address", JSON.stringify(payload.address || {}));
    return formData;
  };

  const executeQueuedAction = async (action) => {
    const type = String(action?.type || "");
    const payload = action?.payload || {};
    if (!type) return;

    if (type === "place_order") {
      const formData = buildOrderFormData(payload);
      await hyperlocalApi.placeOrder(formData, { idempotencyKey: payload.idempotencyKey });
      await loadOrders(1);
      return;
    }
    if (type === "cancel_order") {
      await hyperlocalApi.cancelOrder(payload.orderId, payload.reason || "Cancelled by user");
      await loadOrders(orderPagination.page);
      return;
    }
    if (type === "request_refund") {
      await hyperlocalApi.requestRefund(payload.orderId, payload.reason || "Need refund review");
      await loadOrders(orderPagination.page);
      return;
    }
    if (type === "create_complaint") {
      await hyperlocalApi.createComplaint(payload.orderId, payload.issue || "Delivery issue");
      return;
    }
    if (type === "wallet_topup") {
      await hyperlocalApi.walletTopup(payload);
      await loadGrowthData(adPagination.page);
      return;
    }
    if (type === "subscribe_plan") {
      await hyperlocalApi.subscribe({ planCode: payload.planCode });
      await loadGrowthData(adPagination.page);
      return;
    }
    if (type === "create_ad") {
      await hyperlocalApi.createAd(payload);
      await loadGrowthData(adPagination.page);
    }
  };

  const processQueuedActions = async () => {
    if (queueProcessing) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    const queue = hyperlocalActionQueue.getAll();
    if (!queue.length) {
      syncQueuedActionCount();
      return;
    }

    setQueueProcessing(true);
    const pending = [...queue];
    const failed = [];
    for (const action of pending) {
      try {
        await executeQueuedAction(action);
      } catch (_error) {
        failed.push(action);
      }
    }
    hyperlocalActionQueue.replace(failed);
    syncQueuedActionCount();
    if (!failed.length) showStatus("Queued offline actions synced.");
    setQueueProcessing(false);
  };

  const queueAction = (action) => {
    hyperlocalActionQueue.push(action);
    syncQueuedActionCount();
    showStatus("Action queued offline. It will auto-sync once connection is restored.");
  };

  const handleCancelOrder = async (orderId) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      queueAction({ type: "cancel_order", payload: { orderId, reason: "Cancelled by user" } });
      return;
    }
    try {
      await hyperlocalApi.cancelOrder(orderId, "Cancelled by user");
      showStatus("Order cancelled.");
      await loadOrders(orderPagination.page);
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to cancel order.");
    }
  };

  const handleRequestRefund = async (orderId) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      queueAction({ type: "request_refund", payload: { orderId, reason: "Need refund review" } });
      return;
    }
    try {
      await hyperlocalApi.requestRefund(orderId, "Need refund review");
      showStatus("Refund request submitted.");
      await loadOrders(orderPagination.page);
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to request refund.");
    }
  };

  const handleCreateComplaint = async (orderId) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      queueAction({ type: "create_complaint", payload: { orderId, issue: "Delivery issue" } });
      return;
    }
    try {
      await hyperlocalApi.createComplaint(orderId, "Delivery issue");
      showStatus("Complaint submitted.");
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to submit complaint.");
    }
  };

  const handleAdminShopApproval = async (shopId, status) => {
    try {
      await hyperlocalApi.adminShopApproval(shopId, status);
      showStatus(`Shop ${status}.`);
      await loadAdminData();
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to update shop approval.");
    }
  };

  const handleAdminPartnerApproval = async (partnerIdValue, status) => {
    try {
      await hyperlocalApi.adminPartnerApproval(partnerIdValue, status);
      showStatus(`Partner ${status}.`);
      await loadAdminData();
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to update partner approval.");
    }
  };

  const handleRefundReview = async (refundId, status) => {
    try {
      await hyperlocalApi.reviewRefund(refundId, status);
      showStatus(`Refund ${status}.`);
      await loadAdminData();
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to review refund.");
    }
  };

  const handleResolveComplaint = async (complaintId) => {
    try {
      await hyperlocalApi.resolveComplaint(complaintId, "Resolved by support team");
      showStatus("Complaint resolved.");
      await loadAdminData();
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to resolve complaint.");
    }
  };

  const loadOverview360 = async () => {
    setOverviewLoading(true);
    try {
      const response = await hyperlocalApi.getOverview360();
      setOverviewData(response?.data || null);
    } catch (error) {
      setOverviewData(null);
      showError(error?.response?.data?.message || "Unable to load Hyperlocal 360 data.");
    } finally {
      setOverviewLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "vendor") loadVendorData();
    if (activeTab === "partner") loadPartnerData();
    if (activeTab === "admin") loadAdminData(adminPages);
    if (activeTab === "overview360") loadOverview360();
    if (activeTab === "growth") loadGrowthData(adPagination.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "admin") return;
    loadAdminData(adminPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminPages, auditFilter]);

  useEffect(() => {
    if (activeTab !== "growth") return;
    loadGrowthData(1);
    setAdPagination((current) => ({ ...current, page: 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adFilterShopId]);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab("user");
    }
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    const onOnline = () => {
      processQueuedActions();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("online", onOnline);
    }
    processQueuedActions();
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const autoRefreshTabs = new Set(["partner", "admin", "overview360"]);
    if (!autoRefreshTabs.has(activeTab)) return undefined;

    const timer = window.setInterval(() => {
      if (activeTab === "partner") loadPartnerData();
      if (activeTab === "admin") loadAdminData(adminPages);
      if (activeTab === "overview360") loadOverview360();
    }, 30000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, adminPages, auditFilter]);

  return (
    <div className="hyperlocal-page">
      <section className="hyperlocal-hero">
        <div>
          <p className="hyperlocal-kicker">Nila Hyperlocal Delivery</p>
          <h1>Marketplace-ready hyperlocal operations.</h1>
          <p className="hyperlocal-subtitle">
            Grocery, pharmacy, food, parcel, multi-shop delivery, partner operations, and admin controls in one module.
          </p>
        </div>
        <div className="hyperlocal-hero-tools">
          <button type="button" className="hyperlocal-secondary-btn" onClick={useLiveLocation}>
            Use live location
          </button>
          <span className="hyperlocal-chip">{location.label}</span>
          <div className="hyperlocal-chip-row">
            {visibleTabs.map((tab) => (
              <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {statusMessage ? <p className="hyperlocal-status">{statusMessage}</p> : null}
      {errorMessage ? <p className="hyperlocal-error">{errorMessage}</p> : null}
      {queuedActionCount > 0 ? (
        <div className="hyperlocal-summary-card">
          <p>
            Offline queue: {queuedActionCount} pending action{queuedActionCount > 1 ? "s" : ""}.
          </p>
          <div className="hyperlocal-inline-actions">
            <button type="button" disabled={queueProcessing} onClick={processQueuedActions}>
              {queueProcessing ? "Syncing..." : "Sync queued actions"}
            </button>
          </div>
        </div>
      ) : null}

      {activeTab === "user" && (
        <>
          <section className="hyperlocal-section">
            <div className="hyperlocal-section-header">
              <h2>Shop Listing API + Distance Validation</h2>
              <p>Live location, delivery radius check, and category filter with real backend data.</p>
            </div>
            <div className="hyperlocal-shop-toolbar">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search shops, categories, products..."
              />
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="All">All categories</option>
                {categories.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            {loading.shops ? (
              <div className="hyperlocal-skeleton-grid">
                <div className="hyperlocal-skeleton-card" />
                <div className="hyperlocal-skeleton-card" />
                <div className="hyperlocal-skeleton-card" />
              </div>
            ) : filteredShops.length === 0 ? (
              <HyperlocalEmptyState title="No shops found for this filter." subtitle="Try another category or search." />
            ) : (
              <div className="hyperlocal-card-grid">
                {filteredShops.map((shop) => (
                  <article key={shop.shopId} className="hyperlocal-card">
                    <h3>{shop.name}</h3>
                    <p>{shop.category} | Rating {shop.rating} | {shop.open ? "Open" : "Closed"}</p>
                    <p>
                      Distance: {shop.distanceKm ?? "N/A"} km | Radius: {shop.deliveryRadiusKm} km | {shop.deliveryEligible ? "Deliverable" : "Outside delivery radius"}
                    </p>
                    <div className="hyperlocal-inline-actions">
                      <button type="button" onClick={() => setSelectedShop(shop)}>
                        View products
                      </button>
                      <a className="hyperlocal-link-btn" href={mapLink(shop.location?.lat || 0, shop.location?.lng || 0)} target="_blank" rel="noreferrer">
                        Open map
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div className="hyperlocal-inline-actions">
              <button
                type="button"
                className="hyperlocal-secondary-btn"
                disabled={!shopPagination.hasPrev}
                onClick={() => {
                  const nextPage = Math.max(1, Number(shopPagination.page || 1) - 1);
                  setShopPagination((current) => ({ ...current, page: nextPage }));
                  loadShops(location, nextPage);
                }}
              >
                Prev shops
              </button>
              <span className="hyperlocal-muted">
                Page {shopPagination.page || 1} / {shopPagination.totalPages || 1}
              </span>
              <button
                type="button"
                className="hyperlocal-secondary-btn"
                disabled={!shopPagination.hasNext}
                onClick={() => {
                  const nextPage = Number(shopPagination.page || 1) + 1;
                  setShopPagination((current) => ({ ...current, page: nextPage }));
                  loadShops(location, nextPage);
                }}
              >
                Next shops
              </button>
            </div>
          </section>

          <section className="hyperlocal-dual-grid">
            <article className="hyperlocal-panel">
              <h2>Cart System + Prescription Upload</h2>
              {selectedShop ? (
                <>
                  <h3>{selectedShop.name} products</h3>
                  <ul className="hyperlocal-list">
                    {(selectedShop.products || []).map((product) => (
                      <li key={product.productId}>
                        <strong>{product.name}</strong> | INR {product.price} | Stock {product.stockQty}{" "}
                        {product.prescriptionRequired ? <span className="hyperlocal-tag">Prescription required</span> : null}
                        <button type="button" onClick={() => addToCart(selectedShop, product)}>
                          Add
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <HyperlocalEmptyState title="Select a shop to view and add products." compact />
              )}

              <div className="hyperlocal-form">
                <label>
                  Delivery type
                  <select value={deliveryType} onChange={(event) => setDeliveryType(event.target.value)}>
                    <option value="instant">instant</option>
                    <option value="scheduled">scheduled</option>
                  </select>
                </label>
                {deliveryType === "scheduled" ? (
                  <>
                    <label>
                      Delivery window start
                      <input
                        type="datetime-local"
                        value={deliveryWindowStart}
                        onChange={(event) => setDeliveryWindowStart(event.target.value)}
                      />
                    </label>
                    <label>
                      Delivery window end
                      <input
                        type="datetime-local"
                        value={deliveryWindowEnd}
                        onChange={(event) => setDeliveryWindowEnd(event.target.value)}
                      />
                    </label>
                  </>
                ) : null}
                <label>
                  Payment mode
                  <select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>
                    <option value="UPI">UPI</option>
                    <option value="COD">Cash on delivery</option>
                    <option value="Card">Card</option>
                    <option value="Wallet">Wallet</option>
                  </select>
                </label>
                <label>
                  Coupon code
                  <input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="SAVE50 / FAST10 / FREEDEL" />
                </label>
                <label className="hyperlocal-checkbox">
                  <input type="checkbox" checked={multiShopMode} onChange={(event) => setMultiShopMode(event.target.checked)} />
                  Multi-shop single delivery
                </label>
                <label className="hyperlocal-checkbox">
                  <input type="checkbox" checked={emergencyMedicine} onChange={(event) => setEmergencyMedicine(event.target.checked)} />
                  Emergency medicine delivery
                </label>
                <label>
                  Prescription upload
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(event) => setPrescriptionFile(event.target.files?.[0] || null)} />
                </label>
              </div>
            </article>

            <article className="hyperlocal-panel">
              <h2>Address + Checkout + Tracking</h2>
              <div className="hyperlocal-form">
                <label>
                  Saved address
                  <select
                    value={selectedAddressId}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      setSelectedAddressId(nextId);
                      const selected = savedAddresses.find((entry) => entry.addressId === nextId);
                      if (!selected) return;
                      setAddressForm({
                        fullName: selected.fullName || "",
                        phone: selected.phone || "",
                        line1: selected.line1 || "",
                        line2: selected.line2 || "",
                        city: selected.city || "",
                        state: selected.state || "",
                        pincode: selected.pincode || "",
                        lat: selected.location?.lat || 0,
                        lng: selected.location?.lng || 0,
                      });
                    }}
                  >
                    <option value="">Select saved address</option>
                    {savedAddresses.map((entry) => (
                      <option key={entry.addressId} value={entry.addressId}>
                        {entry.fullName} | {entry.line1}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Full name
                  <input value={addressForm.fullName} onChange={(event) => setAddressForm((c) => ({ ...c, fullName: event.target.value }))} />
                </label>
                <label>
                  Phone
                  <input value={addressForm.phone} onChange={(event) => setAddressForm((c) => ({ ...c, phone: event.target.value }))} />
                </label>
                <label>
                  Address line
                  <input value={addressForm.line1} onChange={(event) => setAddressForm((c) => ({ ...c, line1: event.target.value }))} />
                </label>
                <label>
                  City
                  <input value={addressForm.city} onChange={(event) => setAddressForm((c) => ({ ...c, city: event.target.value }))} />
                </label>
                <label>
                  State
                  <input value={addressForm.state} onChange={(event) => setAddressForm((c) => ({ ...c, state: event.target.value }))} />
                </label>
                <label>
                  Pincode
                  <input value={addressForm.pincode} onChange={(event) => setAddressForm((c) => ({ ...c, pincode: event.target.value }))} />
                </label>
                <button type="button" onClick={saveAddress}>
                  Save address
                </button>
              </div>

              <h3>Cart</h3>
              {cart.length === 0 ? (
                <HyperlocalEmptyState title="Cart is empty." subtitle="Add products to continue." compact />
              ) : (
                <ul className="hyperlocal-list">
                  {cart.map((item) => (
                    <li key={item.key}>
                      {item.productName} ({item.shopName}) | INR {item.price} x {item.qty}
                      <div className="hyperlocal-inline-actions">
                        <button type="button" onClick={() => updateQty(item.key, item.qty - 1)}>
                          -
                        </button>
                        <button type="button" onClick={() => updateQty(item.key, item.qty + 1)}>
                          +
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="hyperlocal-summary-card">
                <p>Subtotal: INR {cartSubtotal.toFixed(2)}</p>
                <p>Delivery charge: INR {(quote?.deliveryCharge ?? 0).toFixed(2)}</p>
                <p>Platform fee: INR {(quote?.platformFee ?? 0).toFixed(2)}</p>
                <p>Tax: INR {(quote?.tax ?? 0).toFixed(2)}</p>
                <p>Coupon discount: INR {(quote?.couponDiscount ?? 0).toFixed(2)}</p>
                <p className="hyperlocal-total">Final payable: INR {(quote?.finalPayable ?? cartSubtotal).toFixed(2)}</p>
              </div>

              <div className="hyperlocal-inline-actions">
                <button type="button" disabled={loading.quote || !canCheckout} onClick={requestQuote}>
                  {loading.quote ? "Calculating..." : "Get quote"}
                </button>
                <button type="button" className="hyperlocal-secondary-btn" disabled={loading.checkout || !canCheckout} onClick={handlePlaceOrder}>
                  {loading.checkout ? "Placing order..." : "Place order"}
                </button>
              </div>
            </article>
          </section>

          <div className="hyperlocal-sticky-checkout">
            <button type="button" disabled={loading.checkout || !canCheckout} onClick={handlePlaceOrder}>
              {loading.checkout ? "Placing order..." : `Checkout INR ${(quote?.finalPayable ?? cartSubtotal).toFixed(2)}`}
            </button>
          </div>

          <section className="hyperlocal-dual-grid">
            <article className="hyperlocal-panel">
              <h2>Order Tracking</h2>
              {loading.orders ? (
                <div className="hyperlocal-skeleton-card" />
              ) : orders.length === 0 ? (
                <HyperlocalEmptyState title="No orders yet." subtitle="Place your first hyperlocal order." compact />
              ) : (
                <ul className="hyperlocal-list">
                  {orders.map((order) => (
                    <li key={order.orderId}>
                      <strong>{order.orderId}</strong> | {order.status} | INR {order.finalPayable}
                      <div className="hyperlocal-inline-actions">
                        <button type="button" onClick={() => trackOrder(order.orderId)}>
                          Track
                        </button>
                        {order.status !== "Delivered" && order.status !== "Cancelled/Refunded" ? (
                          <button type="button" onClick={() => handleCancelOrder(order.orderId)}>
                            Cancel
                          </button>
                        ) : null}
                        <button type="button" onClick={() => handleRequestRefund(order.orderId)}>
                          Refund
                        </button>
                        <button type="button" onClick={() => handleCreateComplaint(order.orderId)}>
                          Complaint
                        </button>
                        <a
                          className="hyperlocal-link-btn"
                          href={`https://wa.me/?text=${encodeURIComponent(`Order ${order.orderId} status: ${order.status}`)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp update
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="hyperlocal-inline-actions">
                <button
                  type="button"
                  className="hyperlocal-secondary-btn"
                  disabled={!orderPagination.hasPrev}
                  onClick={() => {
                    const nextPage = Math.max(1, Number(orderPagination.page || 1) - 1);
                    setOrderPagination((current) => ({ ...current, page: nextPage }));
                    loadOrders(nextPage);
                  }}
                >
                  Prev orders
                </button>
                <span className="hyperlocal-muted">
                  Page {orderPagination.page || 1} / {orderPagination.totalPages || 1}
                </span>
                <button
                  type="button"
                  className="hyperlocal-secondary-btn"
                  disabled={!orderPagination.hasNext}
                  onClick={() => {
                    const nextPage = Number(orderPagination.page || 1) + 1;
                    setOrderPagination((current) => ({ ...current, page: nextPage }));
                    loadOrders(nextPage);
                  }}
                >
                  Next orders
                </button>
              </div>
            </article>

            <article className="hyperlocal-panel">
              <h2>Timeline</h2>
              {!tracking ? (
                <HyperlocalEmptyState title="Track an order to view full status timeline." compact />
              ) : (
                <ul className="hyperlocal-list">
                  {(tracking.timeline || []).map((entry, idx) => (
                    <li key={`${entry.status}-${idx}`}>
                      <strong>{entry.status}</strong> | {new Date(entry.at || entry.date).toLocaleString()} {entry.note ? `| ${entry.note}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        </>
      )}

      {activeTab === "vendor" && (
        <section className="hyperlocal-dual-grid">
          <article className="hyperlocal-panel">
            <h2>Vendor Onboarding + Products + Stock</h2>
            <form className="hyperlocal-form" onSubmit={submitVendor}>
              <input placeholder="Owner email" value={vendorForm.ownerEmail} onChange={(e) => setVendorForm((c) => ({ ...c, ownerEmail: e.target.value }))} />
              <input placeholder="Owner phone" value={vendorForm.ownerPhone} onChange={(e) => setVendorForm((c) => ({ ...c, ownerPhone: e.target.value }))} />
              <input placeholder="Shop name" value={vendorForm.name} onChange={(e) => setVendorForm((c) => ({ ...c, name: e.target.value }))} />
              <select value={vendorForm.category} onChange={(e) => setVendorForm((c) => ({ ...c, category: e.target.value }))}>
                {["Grocery", "Pharmacy", "Food", "Parcel"].map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
              <input placeholder="Address" value={vendorForm.addressText} onChange={(e) => setVendorForm((c) => ({ ...c, addressText: e.target.value }))} />
              <label>
                Delivery radius km
                <input type="number" value={vendorForm.deliveryRadiusKm} onChange={(e) => setVendorForm((c) => ({ ...c, deliveryRadiusKm: Number(e.target.value) }))} />
              </label>
              <button type="submit">Submit shop for approval</button>
            </form>

            <button type="button" className="hyperlocal-secondary-btn" onClick={loadVendorData}>
              Refresh vendor data
            </button>
            {vendorShops.length === 0 ? (
              <HyperlocalEmptyState title="No vendor shops yet." compact />
            ) : (
              <ul className="hyperlocal-list">
                {vendorShops.map((shop) => (
                  <li key={shop.shopId}>
                    {shop.name} | {shop.approvalStatus} | {shop.open ? "Open" : "Closed"} | Products {shop.products?.length || 0}
                    <div className="hyperlocal-inline-actions">
                      <button type="button" onClick={() => setVendorSelectedShop(shop.shopId)}>
                        Manage products
                      </button>
                      <button type="button" onClick={() => toggleVendorShopStatus(shop.shopId, !shop.open)}>
                        Mark {shop.open ? "closed" : "open"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <h3>Add product</h3>
            <form className="hyperlocal-form" onSubmit={addVendorProduct}>
              <select value={vendorSelectedShop} onChange={(event) => setVendorSelectedShop(event.target.value)}>
                <option value="">Select shop</option>
                {vendorShops.map((shop) => (
                  <option key={shop.shopId} value={shop.shopId}>{shop.name}</option>
                ))}
              </select>
              <input placeholder="Product name" value={vendorProductForm.name} onChange={(e) => setVendorProductForm((c) => ({ ...c, name: e.target.value }))} />
              <input placeholder="Category" value={vendorProductForm.category} onChange={(e) => setVendorProductForm((c) => ({ ...c, category: e.target.value }))} />
              <input type="number" placeholder="Price" value={vendorProductForm.price} onChange={(e) => setVendorProductForm((c) => ({ ...c, price: Number(e.target.value) }))} />
              <input type="number" placeholder="MRP" value={vendorProductForm.mrp} onChange={(e) => setVendorProductForm((c) => ({ ...c, mrp: Number(e.target.value) }))} />
              <input type="number" placeholder="Stock qty" value={vendorProductForm.stockQty} onChange={(e) => setVendorProductForm((c) => ({ ...c, stockQty: Number(e.target.value) }))} />
              <label className="hyperlocal-checkbox">
                <input
                  type="checkbox"
                  checked={vendorProductForm.prescriptionRequired}
                  onChange={(e) => setVendorProductForm((c) => ({ ...c, prescriptionRequired: e.target.checked }))}
                />
                Prescription required
              </label>
              <button type="submit">Add product</button>
            </form>

            <div className="hyperlocal-inline-actions">
              <input
                value={openingHoursDraft}
                onChange={(event) => setOpeningHoursDraft(event.target.value)}
                placeholder="HH:MM-HH:MM"
              />
              <button type="button" onClick={saveOpeningHours}>
                Save opening hours
              </button>
            </div>

            {vendorSelectedShop ? (
              <div>
                <h3>Stock update</h3>
                <ul className="hyperlocal-list">
                  {(vendorShops.find((shop) => shop.shopId === vendorSelectedShop)?.products || []).map((product) => (
                    <li key={product.productId}>
                      {product.name} | Current stock {product.stockQty}
                      <div className="hyperlocal-inline-actions">
                        <input
                          type="number"
                          value={stockDrafts[product.productId] ?? product.stockQty}
                          onChange={(event) =>
                            setStockDrafts((current) => ({
                              ...current,
                              [product.productId]: Number(event.target.value),
                            }))
                          }
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const shop = vendorShops.find((entry) => entry.shopId === vendorSelectedShop);
                            if (shop) saveStockChange(shop, product);
                          }}
                        >
                          Save stock
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>

          <article className="hyperlocal-panel">
            <h2>Vendor Orders + Settlement + Analytics</h2>
            {vendorSettlement ? (
              <div className="hyperlocal-summary-card">
                <p>Gross sales: INR {vendorSettlement.grossSales}</p>
                <p>Commission: {vendorSettlement.commissionPercent}% (INR {vendorSettlement.commissionAmount})</p>
                <p>Net settlement: INR {vendorSettlement.netSettlement}</p>
              </div>
            ) : (
              <HyperlocalEmptyState title="Settlement history will appear here." compact />
            )}

            {vendorAnalytics ? (
              <div className="hyperlocal-summary-card">
                <p>Total orders: {vendorAnalytics.totalOrders}</p>
                <p>Delivered: {vendorAnalytics.delivered}</p>
                <p>Cancelled: {vendorAnalytics.cancelled}</p>
                <p>Average order value: INR {vendorAnalytics.avgOrderValue}</p>
              </div>
            ) : null}

            {vendorOrders.length === 0 ? (
              <HyperlocalEmptyState title="No vendor orders yet." compact />
            ) : (
              <ul className="hyperlocal-list">
                {vendorOrders.map((order) => (
                  <li key={order.orderId}>
                    {order.orderId} | {order.status} | INR {order.finalPayable}
                    <div className="hyperlocal-inline-actions">
                      {order.status === "Placed" ? (
                        <>
                          <button type="button" onClick={() => actOnVendorOrder(order.orderId, "accept")}>
                            Accept
                          </button>
                          <button type="button" onClick={() => actOnVendorOrder(order.orderId, "reject")}>
                            Reject
                          </button>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      )}

      {activeTab === "partner" && (
        <section className="hyperlocal-dual-grid">
          <article className="hyperlocal-panel">
            <h2>Partner Onboarding + KYC + Availability</h2>
            <form className="hyperlocal-form" onSubmit={submitPartner}>
              <input placeholder="Full name" value={partnerForm.fullName} onChange={(e) => setPartnerForm((c) => ({ ...c, fullName: e.target.value }))} />
              <input placeholder="Email" value={partnerForm.email} onChange={(e) => setPartnerForm((c) => ({ ...c, email: e.target.value }))} />
              <input placeholder="Phone" value={partnerForm.phone} onChange={(e) => setPartnerForm((c) => ({ ...c, phone: e.target.value }))} />
              <input placeholder="Service area" value={partnerForm.area} onChange={(e) => setPartnerForm((c) => ({ ...c, area: e.target.value }))} />
              <select value={partnerForm.vehicleType} onChange={(e) => setPartnerForm((c) => ({ ...c, vehicleType: e.target.value }))}>
                <option value="Bike">Bike</option>
                <option value="Scooter">Scooter</option>
                <option value="Auto">Auto</option>
              </select>
              <input type="file" multiple onChange={(e) => setPartnerKycDocs(e.target.files || [])} />
              <button type="submit">Submit partner application</button>
            </form>
            <label>
              Partner ID
              <input value={partnerId} onChange={(e) => setPartnerId(e.target.value)} placeholder="Paste generated partner ID" />
            </label>
            <div className="hyperlocal-inline-actions">
              <button type="button" onClick={() => togglePartnerOnline(!partnerOnline)}>
                Go {partnerOnline ? "offline" : "online"}
              </button>
              <button type="button" className="hyperlocal-secondary-btn" onClick={loadPartnerData}>
                Refresh jobs
              </button>
            </div>
          </article>

          <article className="hyperlocal-panel">
            <h2>Delivery Jobs + Navigation + Wallet</h2>
            {partnerJobs.length === 0 ? (
              <HyperlocalEmptyState title="No delivery jobs available now." compact />
            ) : (
              <ul className="hyperlocal-list">
                {partnerJobs.map((job) => (
                  <li key={job.orderId}>
                    {job.orderId} | {job.status} | INR {job.finalPayable}
                    <div className="hyperlocal-inline-actions">
                      {job.status === "Accepted by shop" ? (
                        <>
                          <button type="button" onClick={() => acceptJob(job.orderId)}>
                            Accept job
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await hyperlocalApi.partnerRejectJob(job.orderId, "Rejected by partner");
                                showStatus("Job rejected.");
                                await loadPartnerData();
                              } catch (error) {
                                showError(error?.response?.data?.message || "Unable to reject this job.");
                              }
                            }}
                          >
                            Reject job
                          </button>
                        </>
                      ) : null}
                      {["Partner assigned", "Picked up", "Out for delivery"].includes(job.status) ? (
                        <>
                          {job.status === "Partner assigned" ? (
                            <button type="button" onClick={() => updateJobStage(job.orderId, "Picked up")}>
                              Mark picked up
                            </button>
                          ) : null}
                          {job.status === "Picked up" ? (
                            <button type="button" onClick={() => updateJobStage(job.orderId, "Out for delivery")}>
                              Out for delivery
                            </button>
                          ) : null}
                          {job.status === "Out for delivery" ? (
                            <button type="button" onClick={() => updateJobStage(job.orderId, "Delivered")}>
                              Mark delivered
                            </button>
                          ) : null}
                        </>
                      ) : null}
                      <a
                        className="hyperlocal-link-btn"
                        href={mapLink(job.address?.location?.lat || 0, job.address?.location?.lng || 0)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Navigate
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="hyperlocal-summary-card">
              <p>Wallet balance: INR {partnerWallet?.walletBalance || 0}</p>
              <p>Payout requests: {partnerWallet?.payoutHistory?.length || 0}</p>
            </div>
            <div className="hyperlocal-inline-actions">
              <input
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="Payout amount"
              />
              <button type="button" onClick={requestPayout}>
                Request payout
              </button>
            </div>
          </article>
        </section>
      )}

      {activeTab === "admin" && (
        <section className="hyperlocal-dual-grid">
          <article className="hyperlocal-panel">
            <h2>Approvals + Pricing Controls</h2>
            <form className="hyperlocal-form" onSubmit={applyAdminConfig}>
              <input value={adminConfig.zoneName} onChange={(e) => setAdminConfig((c) => ({ ...c, zoneName: e.target.value }))} placeholder="Zone name" />
              <input type="number" value={adminConfig.baseDeliveryCharge} onChange={(e) => setAdminConfig((c) => ({ ...c, baseDeliveryCharge: Number(e.target.value) }))} placeholder="Base delivery charge" />
              <input type="number" value={adminConfig.perKmCharge} onChange={(e) => setAdminConfig((c) => ({ ...c, perKmCharge: Number(e.target.value) }))} placeholder="Per KM charge" />
              <input type="number" value={adminConfig.maxDeliveryRadiusKm} onChange={(e) => setAdminConfig((c) => ({ ...c, maxDeliveryRadiusKm: Number(e.target.value) }))} placeholder="Max radius" />
              <input type="number" value={adminConfig.commissionPercent} onChange={(e) => setAdminConfig((c) => ({ ...c, commissionPercent: Number(e.target.value) }))} placeholder="Commission %" />
              <input type="number" value={adminConfig.platformFee} onChange={(e) => setAdminConfig((c) => ({ ...c, platformFee: Number(e.target.value) }))} placeholder="Platform fee" />
              <label className="hyperlocal-checkbox">
                <input type="checkbox" checked={adminConfig.surgeEnabled} onChange={(e) => setAdminConfig((c) => ({ ...c, surgeEnabled: e.target.checked }))} />
                Surge pricing enabled
              </label>
              <input type="number" value={adminConfig.surgeMultiplier} onChange={(e) => setAdminConfig((c) => ({ ...c, surgeMultiplier: Number(e.target.value) }))} placeholder="Surge multiplier" />
              <button type="submit">Save zone & surge config</button>
            </form>

            <button type="button" className="hyperlocal-secondary-btn" onClick={loadAdminData}>
              Refresh admin panels
            </button>

            <h3>Pending shop approvals</h3>
            {pendingShops.length === 0 ? <HyperlocalEmptyState title="No pending shops." compact /> : (
              <ul className="hyperlocal-list">
                {pendingShops.map((shop) => (
                  <li key={shop.shopId}>
                    {shop.name} ({shop.category})
                    <div className="hyperlocal-inline-actions">
                      <button type="button" onClick={() => handleAdminShopApproval(shop.shopId, "approved")}>
                        Approve
                      </button>
                      <button type="button" onClick={() => handleAdminShopApproval(shop.shopId, "rejected")}>
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="hyperlocal-inline-actions">
              <button
                type="button"
                className="hyperlocal-secondary-btn"
                disabled={!adminPagination.pendingShops?.hasPrev}
                onClick={() => updateAdminPage("pendingShops", Number(adminPages.pendingShops || 1) - 1)}
              >
                Prev shops
              </button>
              <span className="hyperlocal-muted">
                Page {adminPagination.pendingShops?.page || 1} / {adminPagination.pendingShops?.totalPages || 1}
              </span>
              <button
                type="button"
                className="hyperlocal-secondary-btn"
                disabled={!adminPagination.pendingShops?.hasNext}
                onClick={() => updateAdminPage("pendingShops", Number(adminPages.pendingShops || 1) + 1)}
              >
                Next shops
              </button>
            </div>

            <h3>Pending partner approvals</h3>
            {pendingPartners.length === 0 ? <HyperlocalEmptyState title="No pending partners." subtitle="New partner applications will appear here." compact /> : (
              <ul className="hyperlocal-list">
                {pendingPartners.map((partner) => (
                  <li key={partner.partnerId}>
                    {partner.fullName} ({partner.phone})
                    <div className="hyperlocal-inline-actions">
                      <button type="button" onClick={() => handleAdminPartnerApproval(partner.partnerId, "approved")}>
                        Approve
                      </button>
                      <button type="button" onClick={() => handleAdminPartnerApproval(partner.partnerId, "rejected")}>
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="hyperlocal-inline-actions">
              <button
                type="button"
                className="hyperlocal-secondary-btn"
                disabled={!adminPagination.pendingPartners?.hasPrev}
                onClick={() => updateAdminPage("pendingPartners", Number(adminPages.pendingPartners || 1) - 1)}
              >
                Prev partners
              </button>
              <span className="hyperlocal-muted">
                Page {adminPagination.pendingPartners?.page || 1} / {adminPagination.pendingPartners?.totalPages || 1}
              </span>
              <button
                type="button"
                className="hyperlocal-secondary-btn"
                disabled={!adminPagination.pendingPartners?.hasNext}
                onClick={() => updateAdminPage("pendingPartners", Number(adminPages.pendingPartners || 1) + 1)}
              >
                Next partners
              </button>
            </div>
          </article>

          <article className="hyperlocal-panel">
            <h2>Complaints + Refunds + Reports</h2>
            {adminAnalytics ? (
              <div className="hyperlocal-metrics-grid">
                <HyperlocalMetricCard label="Total Orders" value={adminAnalytics.totalOrders} />
                <HyperlocalMetricCard label="Total Revenue" value={`INR ${adminAnalytics.totalRevenue}`} />
                <HyperlocalMetricCard label="Delivered" value={adminAnalytics.deliveredOrders} />
                <HyperlocalMetricCard label="Cancelled" value={adminAnalytics.cancelledOrders} />
              </div>
            ) : null}

            {settlementReport ? (
              <div className="hyperlocal-metrics-grid">
                <HyperlocalMetricCard label="Gross Sales" value={`INR ${settlementReport.grossSales}`} />
                <HyperlocalMetricCard label="Commission" value={`INR ${settlementReport.commissionCollected}`} />
                <HyperlocalMetricCard label="Vendor Payouts" value={`INR ${settlementReport.netPayoutToVendors}`} />
              </div>
            ) : null}

            <h3>Refund queue</h3>
            {refunds.length === 0 ? <HyperlocalEmptyState title="No refund requests." compact /> : (
              <ul className="hyperlocal-list">
                {refunds.map((refund) => (
                  <li key={refund.refundId}>
                    {refund.orderId} | INR {refund.amount} | <HyperlocalStatusBadge label={refund.status} tone={refund.status === "pending" ? "warning" : "neutral"} />
                    {refund.status === "pending" ? (
                      <div className="hyperlocal-inline-actions">
                        <button type="button" onClick={() => handleRefundReview(refund.refundId, "approved")}>
                          Approve
                        </button>
                        <button type="button" onClick={() => handleRefundReview(refund.refundId, "rejected")}>
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <div className="hyperlocal-inline-actions">
              <button
                type="button"
                className="hyperlocal-secondary-btn"
                disabled={!adminPagination.refunds?.hasPrev}
                onClick={() => updateAdminPage("refunds", Number(adminPages.refunds || 1) - 1)}
              >
                Prev refunds
              </button>
              <span className="hyperlocal-muted">
                Page {adminPagination.refunds?.page || 1} / {adminPagination.refunds?.totalPages || 1}
              </span>
              <button
                type="button"
                className="hyperlocal-secondary-btn"
                disabled={!adminPagination.refunds?.hasNext}
                onClick={() => updateAdminPage("refunds", Number(adminPages.refunds || 1) + 1)}
              >
                Next refunds
              </button>
            </div>

            <h3>Complaints</h3>
            {complaints.length === 0 ? <HyperlocalEmptyState title="No complaints submitted." compact /> : (
              <ul className="hyperlocal-list">
                {complaints.map((complaint) => (
                  <li key={complaint.complaintId}>
                    {complaint.orderId} | {complaint.issue} |{" "}
                    <HyperlocalStatusBadge label={complaint.status} tone={complaint.status === "resolved" ? "success" : "warning"} />
                    {complaint.status !== "resolved" ? (
                      <button type="button" onClick={() => handleResolveComplaint(complaint.complaintId)}>
                        Resolve
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <div className="hyperlocal-inline-actions">
              <button
                type="button"
                className="hyperlocal-secondary-btn"
                disabled={!adminPagination.complaints?.hasPrev}
                onClick={() => updateAdminPage("complaints", Number(adminPages.complaints || 1) - 1)}
              >
                Prev complaints
              </button>
              <span className="hyperlocal-muted">
                Page {adminPagination.complaints?.page || 1} / {adminPagination.complaints?.totalPages || 1}
              </span>
              <button
                type="button"
                className="hyperlocal-secondary-btn"
                disabled={!adminPagination.complaints?.hasNext}
                onClick={() => updateAdminPage("complaints", Number(adminPages.complaints || 1) + 1)}
              >
                Next complaints
              </button>
            </div>

            <h3>Audit Logs</h3>
            <div className="hyperlocal-inline-actions">
              <input
                value={auditFilter}
                onChange={(event) => {
                  setAuditFilter(event.target.value);
                  updateAdminPage("auditLogs", 1);
                }}
                placeholder="Filter by action (refund.review, complaint.resolve...)"
              />
              <button type="button" className="hyperlocal-secondary-btn" onClick={() => loadAdminData(adminPages)}>
                Refresh audit logs
              </button>
            </div>
            {auditLogs.length === 0 ? (
              <HyperlocalEmptyState title="No audit logs found for this filter." compact />
            ) : (
              <ul className="hyperlocal-list">
                {auditLogs.map((entry) => (
                  <li key={entry.auditId}>
                    {entry.action} | {entry.actorEmail || "unknown"} |{" "}
                    {entry.at ? new Date(entry.at).toLocaleString() : "N/A"}
                  </li>
                ))}
              </ul>
            )}
            <div className="hyperlocal-inline-actions">
              <button
                type="button"
                className="hyperlocal-secondary-btn"
                disabled={!adminPagination.auditLogs?.hasPrev}
                onClick={() => updateAdminPage("auditLogs", Number(adminPages.auditLogs || 1) - 1)}
              >
                Prev logs
              </button>
              <span className="hyperlocal-muted">
                Page {adminPagination.auditLogs?.page || 1} / {adminPagination.auditLogs?.totalPages || 1}
              </span>
              <button
                type="button"
                className="hyperlocal-secondary-btn"
                disabled={!adminPagination.auditLogs?.hasNext}
                onClick={() => updateAdminPage("auditLogs", Number(adminPages.auditLogs || 1) + 1)}
              >
                Next logs
              </button>
            </div>
          </article>
        </section>
      )}

      {activeTab === "overview360" && (
        <section className="hyperlocal-dual-grid">
          <article className="hyperlocal-panel">
            <h2>Hyperlocal 360 Overview</h2>
            <button type="button" className="hyperlocal-secondary-btn" onClick={loadOverview360}>
              Refresh 360 data
            </button>
            {overviewLoading ? (
              <div className="hyperlocal-skeleton-grid">
                <div className="hyperlocal-skeleton-card" />
                <div className="hyperlocal-skeleton-card" />
                <div className="hyperlocal-skeleton-card" />
              </div>
            ) : overviewData ? (
              <div className="hyperlocal-metrics-grid">
                <HyperlocalMetricCard label="Total Orders" value={overviewData.totalOrders} />
                <HyperlocalMetricCard label="Delivered" value={overviewData.deliveredOrders} />
                <HyperlocalMetricCard label="Cancelled" value={overviewData.cancelledOrders} />
                <HyperlocalMetricCard label="Active Jobs" value={overviewData.activeJobs} />
                <HyperlocalMetricCard label="Total Revenue" value={`INR ${overviewData.totalRevenue}`} />
                <HyperlocalMetricCard label="AOV" value={`INR ${overviewData.averageOrderValue}`} />
                <HyperlocalMetricCard label="Approved Shops" value={overviewData.approvedShopCount} />
                <HyperlocalMetricCard label="Approved Partners" value={overviewData.approvedPartnerCount} />
                <HyperlocalMetricCard label="Partners Online" value={overviewData.activePartnerCount} />
                <HyperlocalMetricCard label="Subscriptions" value={overviewData.subscriptionCount} />
                <HyperlocalMetricCard label="Open Complaints" value={overviewData.openComplaints} />
                <HyperlocalMetricCard label="Pending Refunds" value={overviewData.pendingRefunds} />
              </div>
            ) : (
              <HyperlocalEmptyState
                title="Switch to 360 Dashboard to load the full hyperlocal operations view."
                subtitle="Use Refresh 360 data after role-level operations begin."
              />
            )}
          </article>

          {overviewData ? (
            <article className="hyperlocal-panel">
              <h2>Operations Insights</h2>
              <div className="hyperlocal-summary-card">
                <h3>Top shops by revenue</h3>
                {overviewData.topShops.length ? (
                  <ol>
                    {overviewData.topShops.map((shop) => (
                      <li key={shop.name}>
                        {shop.name}: INR {shop.revenue}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <HyperlocalEmptyState title="No shop revenue data yet." compact />
                )}

                <h3>Top products by quantity sold</h3>
                {overviewData.topProducts.length ? (
                  <ol>
                    {overviewData.topProducts.map((product) => (
                      <li key={product.name}>
                        {product.name}: {product.qty} units
                      </li>
                    ))}
                  </ol>
                ) : (
                  <HyperlocalEmptyState title="No product movement yet." compact />
                )}
              </div>

              <div className="hyperlocal-summary-card">
                <h3>Category revenue mix</h3>
                {overviewData.categoryBreakdown.length ? (
                  <ul>
                    {overviewData.categoryBreakdown.map((category) => (
                      <li key={category.category}>
                        {category.category}: INR {category.revenue}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <HyperlocalEmptyState title="No category revenue data available." compact />
                )}
              </div>

              <div className="hyperlocal-summary-card">
                <h3>Orders by city</h3>
                {overviewData.ordersByCity.length ? (
                  <ul>
                    {overviewData.ordersByCity.map((cityEntry) => (
                      <li key={cityEntry.city}>
                        {cityEntry.city}: {cityEntry.count} orders
                      </li>
                    ))}
                  </ul>
                ) : (
                  <HyperlocalEmptyState title="No city-level order data yet." compact />
                )}
              </div>
            </article>
          ) : null}
        </section>
      )}

      {activeTab === "growth" && (
        <section className="hyperlocal-dual-grid">
          <article className="hyperlocal-panel">
            <h2>Wallet + Subscriptions + Cashback</h2>
            <div className="hyperlocal-summary-card">
              <p>Wallet balance: INR {wallet?.balance || 0}</p>
              <p>Cashback balance: INR {wallet?.cashbackBalance || 0}</p>
              <p>Transactions: {wallet?.transactions?.length || 0}</p>
            </div>
            <div className="hyperlocal-inline-actions">
              <input type="number" placeholder="Topup amount" value={walletTopup} onChange={(e) => setWalletTopup(e.target.value)} />
              <button
                type="button"
                onClick={async () => {
                  try {
                    const amount = Number(walletTopup || 0);
                    if (!Number.isFinite(amount) || amount <= 0) {
                      showError("Enter a valid topup amount.");
                      return;
                    }
                    const payload = {
                      amount,
                      paymentReference: `MOCK-${Date.now()}`,
                      paymentStatus: "verified",
                    };
                    if (typeof navigator !== "undefined" && navigator.onLine === false) {
                      queueAction({ type: "wallet_topup", payload });
                      setWalletTopup("");
                      return;
                    }
                    await hyperlocalApi.walletTopup(payload);
                    setWalletTopup("");
                    await loadGrowthData(adPagination.page);
                    showStatus("Wallet topped up.");
                  } catch (error) {
                    showError(error?.response?.data?.message || "Unable to top up wallet.");
                  }
                }}
              >
                Add to wallet
              </button>
            </div>

            <h3>Delivery pass plans</h3>
            {plans.length === 0 ? <HyperlocalEmptyState title="No plans available." compact /> : (
              <ul className="hyperlocal-list">
                {plans.map((plan) => (
                  <li key={plan.planCode}>
                    <strong>{plan.title}</strong> | INR {plan.amount}
                    <p>{(plan.benefits || []).join(", ")}</p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (typeof navigator !== "undefined" && navigator.onLine === false) {
                            queueAction({ type: "subscribe_plan", payload: { planCode: plan.planCode } });
                            return;
                          }
                          await hyperlocalApi.subscribe({ planCode: plan.planCode });
                          await loadGrowthData(adPagination.page);
                          showStatus(`${plan.title} activated.`);
                        } catch (error) {
                          showError(error?.response?.data?.message || "Unable to subscribe.");
                        }
                      }}
                    >
                      Subscribe
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <h3>My subscriptions</h3>
            {subs.length === 0 ? <HyperlocalEmptyState title="No active subscriptions." compact /> : (
              <ul className="hyperlocal-list">
                {subs.map((sub) => (
                  <li key={sub.subscriptionId}>
                    {sub.planCode} | {sub.status} | valid till {new Date(sub.validUntil).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="hyperlocal-panel">
            <h2>Local Shop Ads + Referral-ready Growth Layer</h2>
            <p className="hyperlocal-muted">Create ad placements for local discovery feeds.</p>
            <form
              className="hyperlocal-form"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  const payload = { ...adForm, budget: Number(adForm.budget || 0) };
                  if (typeof navigator !== "undefined" && navigator.onLine === false) {
                    queueAction({ type: "create_ad", payload });
                    setAdForm({ shopId: "", title: "", description: "", budget: "" });
                    return;
                  }
                  await hyperlocalApi.createAd(payload);
                  setAdForm({ shopId: "", title: "", description: "", budget: "" });
                  await loadGrowthData(adPagination.page);
                  showStatus("Ad campaign created.");
                } catch (error) {
                  showError(error?.response?.data?.message || "Unable to create ad.");
                }
              }}
            >
              <input placeholder="Shop ID" value={adForm.shopId} onChange={(e) => setAdForm((c) => ({ ...c, shopId: e.target.value }))} />
              <input placeholder="Ad title" value={adForm.title} onChange={(e) => setAdForm((c) => ({ ...c, title: e.target.value }))} />
              <input placeholder="Budget" type="number" value={adForm.budget} onChange={(e) => setAdForm((c) => ({ ...c, budget: e.target.value }))} />
              <textarea rows={3} placeholder="Ad description" value={adForm.description} onChange={(e) => setAdForm((c) => ({ ...c, description: e.target.value }))} />
              <button type="submit">Create ad</button>
            </form>

            <div className="hyperlocal-inline-actions">
              <input
                placeholder="Filter ads by Shop ID"
                value={adFilterShopId}
                onChange={(event) => {
                  setAdFilterShopId(event.target.value);
                  setAdPagination((current) => ({ ...current, page: 1 }));
                }}
              />
              <button type="button" className="hyperlocal-secondary-btn" onClick={() => loadGrowthData(1)}>
                Apply ad filter
              </button>
            </div>

            {ads.length === 0 ? (
              <HyperlocalEmptyState title="No ads created yet." compact />
            ) : (
              <ul className="hyperlocal-list">
                {ads.map((ad) => (
                  <li key={ad.adId}>
                    {ad.title} | Shop {ad.shopId} | Budget INR {ad.budget} | {ad.active ? "Active" : "Paused"}
                  </li>
                ))}
              </ul>
            )}
            <div className="hyperlocal-inline-actions">
              <button
                type="button"
                className="hyperlocal-secondary-btn"
                disabled={!adPagination.hasPrev}
                onClick={() => {
                  const nextPage = Math.max(1, Number(adPagination.page || 1) - 1);
                  setAdPagination((current) => ({ ...current, page: nextPage }));
                  loadGrowthData(nextPage);
                }}
              >
                Prev ads
              </button>
              <span className="hyperlocal-muted">
                Page {adPagination.page || 1} / {adPagination.totalPages || 1}
              </span>
              <button
                type="button"
                className="hyperlocal-secondary-btn"
                disabled={!adPagination.hasNext}
                onClick={() => {
                  const nextPage = Number(adPagination.page || 1) + 1;
                  setAdPagination((current) => ({ ...current, page: nextPage }));
                  loadGrowthData(nextPage);
                }}
              >
                Next ads
              </button>
            </div>

            <div className="hyperlocal-summary-card">
              <p>Referral system hook: enabled in growth layer (wallet + subscription bundle).</p>
              <p>WhatsApp status update hook: available in user order timeline actions.</p>
            </div>
          </article>
        </section>
      )}
    </div>
  );
};

export default HyperlocalDeliveryHub;
