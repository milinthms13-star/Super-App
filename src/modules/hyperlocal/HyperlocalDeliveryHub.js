import React, { useEffect, useMemo, useState } from "react";
import { hyperlocalApi } from "./hyperlocalApi";
import "./HyperlocalDeliveryHub.css";

const TABS = [
  { id: "user", label: "User Order Flow" },
  { id: "vendor", label: "Vendor Dashboard" },
  { id: "partner", label: "Partner Dashboard" },
  { id: "admin", label: "Admin Panel" },
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

const getUserProfile = () => {
  const keys = ["user", "authUser", "profile"];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
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
  const [ads, setAds] = useState([]);

  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState({
    bootstrap: false,
    shops: false,
    quote: false,
    checkout: false,
    orders: false,
  });

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

  const filteredShops = useMemo(
    () =>
      shops.filter((shop) => {
        const byCategory = category === "All" || shop.category === category;
        const bySearch = `${shop.name} ${shop.category} ${shop.description}`.toLowerCase().includes(search.toLowerCase());
        return byCategory && bySearch;
      }),
    [shops, search, category]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0),
    [cart]
  );

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

  const loadShops = async (withLocation = location) => {
    setLoadingFlag("shops", true);
    try {
      const response = await hyperlocalApi.getShops({
        category: category === "All" ? "" : category,
        search,
        lat: withLocation.lat || undefined,
        lng: withLocation.lng || undefined,
      });
      setShops(response?.data?.shops || []);
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to fetch nearby shops.");
      setShops([]);
    } finally {
      setLoadingFlag("shops", false);
    }
  };

  const loadAddresses = async () => {
    if (!currentEmail) return;
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

  const loadOrders = async () => {
    if (!currentEmail) return;
    setLoadingFlag("orders", true);
    try {
      const response = await hyperlocalApi.getOrders();
      setOrders(response?.data?.orders || []);
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to fetch order history.");
    } finally {
      setLoadingFlag("orders", false);
    }
  };

  useEffect(() => {
    loadBootstrap();
    loadShops();
    loadAddresses();
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadShops();
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
    setLoadingFlag("checkout", true);
    try {
      const formData = new FormData();
      formData.append("userEmail", currentEmail || "guest@nilahub.local");
      formData.append("userPhone", addressForm.phone);
      formData.append("deliveryType", deliveryType);
      formData.append("paymentMode", paymentMode);
      formData.append("couponCode", couponCode);
      formData.append("multiShopMode", String(multiShopMode));
      formData.append("emergencyMedicine", String(emergencyMedicine));
      formData.append("items", JSON.stringify(cart.map((entry) => ({ shopId: entry.shopId, productId: entry.productId, qty: entry.qty }))));
      formData.append(
        "address",
        JSON.stringify({
          ...addressForm,
          lat: Number(addressForm.lat || location.lat || 0),
          lng: Number(addressForm.lng || location.lng || 0),
        })
      );
      if (prescriptionFile) formData.append("prescription", prescriptionFile);

      const response = await hyperlocalApi.placeOrder(formData);
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
        setAddressForm((current) => ({ ...current, lat: next.lat, lng: next.lng }));
        loadShops(next);
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
    try {
      await hyperlocalApi.partnerPayout(partnerId, Number(payoutAmount || 0));
      setPayoutAmount("");
      showStatus("Payout request created.");
      await loadPartnerData();
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to request payout.");
    }
  };

  const loadAdminData = async () => {
    try {
      const [shopsRes, partnersRes, analyticsRes, refundsRes, complaintsRes, settlementRes] = await Promise.all([
        hyperlocalApi.adminPendingShops(),
        hyperlocalApi.adminPendingPartners(),
        hyperlocalApi.adminAnalytics(),
        hyperlocalApi.adminRefunds(),
        hyperlocalApi.adminComplaints(),
        hyperlocalApi.adminSettlementReport(),
      ]);
      setPendingShops(shopsRes?.data?.shops || []);
      setPendingPartners(partnersRes?.data?.partners || []);
      setAdminAnalytics(analyticsRes?.data || null);
      setRefunds(refundsRes?.data?.refunds || []);
      setComplaints(complaintsRes?.data?.complaints || []);
      setSettlementReport(settlementRes?.data || null);
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

  const loadGrowthData = async () => {
    if (!currentEmail) return;
    try {
      const [walletRes, plansRes, subsRes, adsRes] = await Promise.all([
        hyperlocalApi.wallet(),
        hyperlocalApi.subscriptionPlans(),
        hyperlocalApi.subscriptions(),
        hyperlocalApi.ads(adForm.shopId || ""),
      ]);
      setWallet(walletRes?.data?.wallet || null);
      setPlans(plansRes?.data?.plans || []);
      setSubs(subsRes?.data?.subscriptions || []);
      setAds(adsRes?.data?.ads || []);
    } catch (error) {
      showError(error?.response?.data?.message || "Unable to load growth features.");
    }
  };

  useEffect(() => {
    if (activeTab === "vendor") loadVendorData();
    if (activeTab === "partner") loadPartnerData();
    if (activeTab === "admin") loadAdminData();
    if (activeTab === "growth") loadGrowthData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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
            {TABS.map((tab) => (
              <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {statusMessage ? <p className="hyperlocal-status">{statusMessage}</p> : null}
      {errorMessage ? <p className="hyperlocal-error">{errorMessage}</p> : null}

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
              <div className="hyperlocal-empty-card">No shops found for this filter. Try another category or search.</div>
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
                <div className="hyperlocal-empty-card">Select a shop to view and add products.</div>
              )}

              <div className="hyperlocal-form">
                <label>
                  Delivery type
                  <select value={deliveryType} onChange={(event) => setDeliveryType(event.target.value)}>
                    <option value="instant">instant</option>
                    <option value="scheduled">scheduled</option>
                  </select>
                </label>
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
                <div className="hyperlocal-empty-card">Cart is empty. Add products to continue.</div>
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
                <div className="hyperlocal-empty-card">No orders yet. Place your first hyperlocal order.</div>
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
                          <button type="button" onClick={() => hyperlocalApi.cancelOrder(order.orderId, "Cancelled by user").then(loadOrders)}>
                            Cancel
                          </button>
                        ) : null}
                        <button type="button" onClick={() => hyperlocalApi.requestRefund(order.orderId, "Need refund review").then(loadOrders)}>
                          Refund
                        </button>
                        <button type="button" onClick={() => hyperlocalApi.createComplaint(order.orderId, "Delivery issue").then(() => showStatus("Complaint submitted."))}>
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
            </article>

            <article className="hyperlocal-panel">
              <h2>Timeline</h2>
              {!tracking ? (
                <div className="hyperlocal-empty-card">Track an order to view full status timeline.</div>
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
              <div className="hyperlocal-empty-card">No vendor shops yet.</div>
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
              <div className="hyperlocal-empty-card">Settlement history will appear here.</div>
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
              <div className="hyperlocal-empty-card">No vendor orders yet.</div>
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
              <div className="hyperlocal-empty-card">No delivery jobs available now.</div>
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
            {pendingShops.length === 0 ? <div className="hyperlocal-empty-card">No pending shops.</div> : (
              <ul className="hyperlocal-list">
                {pendingShops.map((shop) => (
                  <li key={shop.shopId}>
                    {shop.name} ({shop.category})
                    <div className="hyperlocal-inline-actions">
                      <button type="button" onClick={() => hyperlocalApi.adminShopApproval(shop.shopId, "approved").then(loadAdminData)}>
                        Approve
                      </button>
                      <button type="button" onClick={() => hyperlocalApi.adminShopApproval(shop.shopId, "rejected").then(loadAdminData)}>
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <h3>Pending partner approvals</h3>
            {pendingPartners.length === 0 ? <div className="hyperlocal-empty-card">No pending partners.</div> : (
              <ul className="hyperlocal-list">
                {pendingPartners.map((partner) => (
                  <li key={partner.partnerId}>
                    {partner.fullName} ({partner.phone})
                    <div className="hyperlocal-inline-actions">
                      <button type="button" onClick={() => hyperlocalApi.adminPartnerApproval(partner.partnerId, "approved").then(loadAdminData)}>
                        Approve
                      </button>
                      <button type="button" onClick={() => hyperlocalApi.adminPartnerApproval(partner.partnerId, "rejected").then(loadAdminData)}>
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="hyperlocal-panel">
            <h2>Complaints + Refunds + Reports</h2>
            {adminAnalytics ? (
              <div className="hyperlocal-summary-card">
                <p>Total orders: {adminAnalytics.totalOrders}</p>
                <p>Total revenue: INR {adminAnalytics.totalRevenue}</p>
                <p>Delivered: {adminAnalytics.deliveredOrders}</p>
                <p>Cancelled: {adminAnalytics.cancelledOrders}</p>
              </div>
            ) : null}

            {settlementReport ? (
              <div className="hyperlocal-summary-card">
                <p>Gross sales: INR {settlementReport.grossSales}</p>
                <p>Commission collected: INR {settlementReport.commissionCollected}</p>
                <p>Vendor payouts: INR {settlementReport.netPayoutToVendors}</p>
              </div>
            ) : null}

            <h3>Refund queue</h3>
            {refunds.length === 0 ? <div className="hyperlocal-empty-card">No refund requests.</div> : (
              <ul className="hyperlocal-list">
                {refunds.map((refund) => (
                  <li key={refund.refundId}>
                    {refund.orderId} | INR {refund.amount} | {refund.status}
                    {refund.status === "pending" ? (
                      <div className="hyperlocal-inline-actions">
                        <button type="button" onClick={() => hyperlocalApi.reviewRefund(refund.refundId, "approved").then(loadAdminData)}>
                          Approve
                        </button>
                        <button type="button" onClick={() => hyperlocalApi.reviewRefund(refund.refundId, "rejected").then(loadAdminData)}>
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            <h3>Complaints</h3>
            {complaints.length === 0 ? <div className="hyperlocal-empty-card">No complaints submitted.</div> : (
              <ul className="hyperlocal-list">
                {complaints.map((complaint) => (
                  <li key={complaint.complaintId}>
                    {complaint.orderId} | {complaint.issue} | {complaint.status}
                    {complaint.status !== "resolved" ? (
                      <button type="button" onClick={() => hyperlocalApi.resolveComplaint(complaint.complaintId, "Resolved by support team").then(loadAdminData)}>
                        Resolve
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </article>
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
                    await hyperlocalApi.walletTopup(Number(walletTopup || 0));
                    setWalletTopup("");
                    await loadGrowthData();
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
            {plans.length === 0 ? <div className="hyperlocal-empty-card">No plans available.</div> : (
              <ul className="hyperlocal-list">
                {plans.map((plan) => (
                  <li key={plan.planCode}>
                    <strong>{plan.title}</strong> | INR {plan.amount}
                    <p>{(plan.benefits || []).join(", ")}</p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await hyperlocalApi.subscribe({ planCode: plan.planCode, amount: plan.amount });
                          await loadGrowthData();
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
            {subs.length === 0 ? <div className="hyperlocal-empty-card">No active subscriptions.</div> : (
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
                  await hyperlocalApi.createAd({ ...adForm, budget: Number(adForm.budget || 0) });
                  setAdForm({ shopId: "", title: "", description: "", budget: "" });
                  await loadGrowthData();
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

            {ads.length === 0 ? (
              <div className="hyperlocal-empty-card">No ads created yet.</div>
            ) : (
              <ul className="hyperlocal-list">
                {ads.map((ad) => (
                  <li key={ad.adId}>
                    {ad.title} | Shop {ad.shopId} | Budget INR {ad.budget} | {ad.active ? "Active" : "Paused"}
                  </li>
                ))}
              </ul>
            )}

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
