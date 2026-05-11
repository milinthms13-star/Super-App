import React, { useMemo, useState } from "react";
import "./HyperlocalDeliveryHub.css";

const MAIN_CATEGORIES = [
  "Grocery",
  "Pharmacy",
  "Food",
  "Parcel",
  "Vegetables & Fruits",
  "Meat & Fish",
  "Bakery",
  "Stationery",
  "Pet Supplies",
];

const DELIVERY_TYPES = ["instant", "scheduled"];

const SHOPS = [
  {
    id: "shop-1",
    name: "City Fresh Grocery",
    category: "Grocery",
    distanceKm: 1.2,
    rating: 4.7,
    open: true,
    radiusKm: 5,
    eta: "18 min",
    coupons: ["SAVE20", "FRESH10"],
  },
  {
    id: "shop-2",
    name: "MediCare Express",
    category: "Pharmacy",
    distanceKm: 2.1,
    rating: 4.8,
    open: true,
    radiusKm: 8,
    eta: "22 min",
    coupons: ["MEDI5"],
  },
  {
    id: "shop-3",
    name: "Malabar Bakery Hub",
    category: "Bakery",
    distanceKm: 0.9,
    rating: 4.6,
    open: false,
    radiusKm: 4,
    eta: "Opens 7:00 AM",
    coupons: ["BAKE15"],
  },
  {
    id: "shop-4",
    name: "QuickBite Kitchen",
    category: "Food",
    distanceKm: 1.8,
    rating: 4.5,
    open: true,
    radiusKm: 6,
    eta: "24 min",
    coupons: ["MEAL30"],
  },
];

const PARTNER_JOBS = [
  {
    id: "JOB-201",
    pickup: "City Fresh Grocery",
    drop: "Pettah, Trivandrum",
    earning: 72,
    status: "Available",
  },
  {
    id: "JOB-202",
    pickup: "MediCare Express",
    drop: "Kowdiar, Trivandrum",
    earning: 88,
    status: "Picked",
  },
];

const INITIAL_USER_ORDER = {
  category: "Grocery",
  deliveryType: "instant",
  shopId: "",
  address: "",
  paymentMode: "UPI",
  instructions: "",
  emergencyPharmacy: false,
  uploadPrescription: false,
  multiShopMode: false,
};

const INITIAL_VENDOR_FORM = {
  shopName: "",
  category: "Grocery",
  radiusKm: "5",
  openStatus: true,
  couponCode: "",
};

const INITIAL_PARTNER_FORM = {
  fullName: "",
  vehicleType: "Bike",
  area: "Trivandrum",
  kycDone: false,
};

const INITIAL_ADMIN_FORM = {
  commissionPercent: "12",
  deliveryZone: "Trivandrum Core",
  featuredListingFee: "1499",
};

const HyperlocalDeliveryHub = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [orderForm, setOrderForm] = useState(INITIAL_USER_ORDER);
  const [orderStatus, setOrderStatus] = useState("");
  const [favoriteShopIds, setFavoriteShopIds] = useState(["shop-1"]);
  const [orderHistory, setOrderHistory] = useState([]);

  const [vendorForm, setVendorForm] = useState(INITIAL_VENDOR_FORM);
  const [vendorStatus, setVendorStatus] = useState("");

  const [partnerForm, setPartnerForm] = useState(INITIAL_PARTNER_FORM);
  const [partnerStatus, setPartnerStatus] = useState("");
  const [partnerJobs, setPartnerJobs] = useState(PARTNER_JOBS);

  const [adminForm, setAdminForm] = useState(INITIAL_ADMIN_FORM);
  const [adminStatus, setAdminStatus] = useState("");

  const filteredShops = useMemo(() => {
    return SHOPS.filter((shop) => {
      const matchesCategory =
        activeCategory === "All" || shop.category.toLowerCase() === activeCategory.toLowerCase();
      const matchesText = `${shop.name} ${shop.category}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesCategory && matchesText;
    });
  }, [activeCategory, searchTerm]);

  const favoriteShops = useMemo(
    () => SHOPS.filter((shop) => favoriteShopIds.includes(shop.id)),
    [favoriteShopIds]
  );

  const handlePlaceOrder = (event) => {
    event.preventDefault();
    const selectedShop = SHOPS.find((shop) => shop.id === orderForm.shopId);
    if (!selectedShop || !orderForm.address.trim()) {
      setOrderStatus("Select shop and delivery address.");
      return;
    }

    const orderId = `HL-${Date.now().toString().slice(-6)}`;
    const status = orderForm.deliveryType === "instant" ? "Partner assigned" : "Scheduled";
    const orderEntry = {
      id: orderId,
      shopName: selectedShop.name,
      category: orderForm.category,
      payment: orderForm.paymentMode,
      status,
      multiShopMode: orderForm.multiShopMode,
    };

    setOrderHistory((current) => [orderEntry, ...current].slice(0, 10));
    setOrderStatus(
      `${orderId} confirmed. ${status}. ${orderForm.multiShopMode ? "One delivery + multi-shop mode enabled." : ""}`
    );
    setOrderForm(INITIAL_USER_ORDER);
  };

  const handleVendorRegister = (event) => {
    event.preventDefault();
    if (!vendorForm.shopName.trim()) {
      setVendorStatus("Enter shop name.");
      return;
    }
    setVendorStatus(
      `${vendorForm.shopName} submitted. Radius ${vendorForm.radiusKm} km, status ${
        vendorForm.openStatus ? "Open" : "Closed"
      }, coupon ${vendorForm.couponCode || "none"}.`
    );
    setVendorForm(INITIAL_VENDOR_FORM);
  };

  const handlePartnerOnboard = (event) => {
    event.preventDefault();
    if (!partnerForm.fullName.trim()) {
      setPartnerStatus("Enter partner name.");
      return;
    }
    setPartnerStatus(
      `${partnerForm.fullName} onboarding initiated for ${partnerForm.area}. KYC ${
        partnerForm.kycDone ? "completed" : "pending"
      }.`
    );
    setPartnerForm(INITIAL_PARTNER_FORM);
  };

  const handleAcceptJob = (jobId) => {
    setPartnerJobs((current) =>
      current.map((job) => (job.id === jobId ? { ...job, status: "Accepted" } : job))
    );
  };

  const handleAdminApply = (event) => {
    event.preventDefault();
    setAdminStatus(
      `Commission ${adminForm.commissionPercent}% set for ${adminForm.deliveryZone}. Featured listing INR ${adminForm.featuredListingFee}.`
    );
  };

  const toggleFavorite = (shopId) => {
    setFavoriteShopIds((current) =>
      current.includes(shopId) ? current.filter((id) => id !== shopId) : [...current, shopId]
    );
  };

  return (
    <div className="hyperlocal-page">
      <section className="hyperlocal-hero">
        <div>
          <p className="hyperlocal-kicker">Nila Hyperlocal Delivery</p>
          <h1>Everything nearby, delivered fast.</h1>
          <p className="hyperlocal-subtitle">
            Grocery, pharmacy, food, parcel pickup/drop, and multi-shop one-delivery workflows.
          </p>
        </div>
        <div className="hyperlocal-hero-tools">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search nearby shops..."
          />
          <div className="hyperlocal-chip-row">
            {["All", ...MAIN_CATEGORIES].map((category) => (
              <button
                type="button"
                key={category}
                className={activeCategory === category ? "active" : ""}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="hyperlocal-section">
        <div className="hyperlocal-section-header">
          <h2>User Features</h2>
          <p>Search nearby shops, live tracking, repeat order, favorites, and emergency medicine workflow.</p>
        </div>
        <div className="hyperlocal-card-grid">
          {filteredShops.map((shop) => (
            <article key={shop.id} className="hyperlocal-card">
              <h3>{shop.name}</h3>
              <p>
                {shop.category} | {shop.distanceKm} km | Rating {shop.rating}
              </p>
              <p>
                {shop.open ? "Open" : "Closed"} | Radius {shop.radiusKm} km | ETA {shop.eta}
              </p>
              <div className="hyperlocal-chip-row">
                {shop.coupons.map((coupon) => (
                  <span key={`${shop.id}-${coupon}`}>{coupon}</span>
                ))}
              </div>
              <div className="hyperlocal-inline-actions">
                <button type="button" onClick={() => setOrderForm((c) => ({ ...c, shopId: shop.id, category: shop.category }))}>
                  Select shop
                </button>
                <button type="button" onClick={() => toggleFavorite(shop.id)}>
                  {favoriteShopIds.includes(shop.id) ? "Unfavorite" : "Favorite"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="hyperlocal-dual-grid">
        <article className="hyperlocal-panel">
          <h2>Place Hyperlocal Order</h2>
          <form className="hyperlocal-form" onSubmit={handlePlaceOrder}>
            <label>
              Delivery type
              <select
                value={orderForm.deliveryType}
                onChange={(event) => setOrderForm((c) => ({ ...c, deliveryType: event.target.value }))}
              >
                {DELIVERY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Category
              <select
                value={orderForm.category}
                onChange={(event) => setOrderForm((c) => ({ ...c, category: event.target.value }))}
              >
                {MAIN_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Shop
              <select
                value={orderForm.shopId}
                onChange={(event) => setOrderForm((c) => ({ ...c, shopId: event.target.value }))}
              >
                <option value="">Select shop</option>
                {SHOPS.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Address
              <input
                type="text"
                value={orderForm.address}
                onChange={(event) => setOrderForm((c) => ({ ...c, address: event.target.value }))}
                placeholder="House no, street, landmark"
              />
            </label>
            <label>
              Payment mode
              <select
                value={orderForm.paymentMode}
                onChange={(event) => setOrderForm((c) => ({ ...c, paymentMode: event.target.value }))}
              >
                <option value="UPI">UPI</option>
                <option value="COD">COD</option>
                <option value="Card">Card</option>
                <option value="Wallet">Wallet</option>
              </select>
            </label>
            <label>
              Delivery instructions
              <textarea
                rows={2}
                value={orderForm.instructions}
                onChange={(event) => setOrderForm((c) => ({ ...c, instructions: event.target.value }))}
                placeholder="Call before delivery, gate code, etc."
              />
            </label>
            <label className="hyperlocal-checkbox">
              <input
                type="checkbox"
                checked={orderForm.emergencyPharmacy}
                onChange={(event) => setOrderForm((c) => ({ ...c, emergencyPharmacy: event.target.checked }))}
              />
              Emergency pharmacy request
            </label>
            <label className="hyperlocal-checkbox">
              <input
                type="checkbox"
                checked={orderForm.uploadPrescription}
                onChange={(event) => setOrderForm((c) => ({ ...c, uploadPrescription: event.target.checked }))}
              />
              Prescription uploaded
            </label>
            <label className="hyperlocal-checkbox">
              <input
                type="checkbox"
                checked={orderForm.multiShopMode}
                onChange={(event) => setOrderForm((c) => ({ ...c, multiShopMode: event.target.checked }))}
              />
              One delivery from multiple shops
            </label>
            <button type="submit">Place order</button>
          </form>
          {orderStatus ? <p className="hyperlocal-status">{orderStatus}</p> : null}
        </article>

        <article className="hyperlocal-panel">
          <h2>Favorites and Order Tracking</h2>
          <h3>Favorite shops</h3>
          <ul className="hyperlocal-list">
            {favoriteShops.map((shop) => (
              <li key={shop.id}>{shop.name}</li>
            ))}
          </ul>
          <h3>Recent orders</h3>
          <ul className="hyperlocal-list">
            {orderHistory.length === 0 ? (
              <li>No orders yet.</li>
            ) : (
              orderHistory.map((order) => (
                <li key={order.id}>
                  {order.id} | {order.shopName} | {order.category} | {order.payment} | {order.status}
                </li>
              ))
            )}
          </ul>
        </article>
      </section>

      <section className="hyperlocal-dual-grid">
        <article className="hyperlocal-panel">
          <h2>Vendor Features</h2>
          <form className="hyperlocal-form" onSubmit={handleVendorRegister}>
            <label>
              Shop name
              <input
                type="text"
                value={vendorForm.shopName}
                onChange={(event) => setVendorForm((c) => ({ ...c, shopName: event.target.value }))}
              />
            </label>
            <label>
              Category
              <select
                value={vendorForm.category}
                onChange={(event) => setVendorForm((c) => ({ ...c, category: event.target.value }))}
              >
                {MAIN_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Delivery radius (km)
              <input
                type="number"
                value={vendorForm.radiusKm}
                onChange={(event) => setVendorForm((c) => ({ ...c, radiusKm: event.target.value }))}
              />
            </label>
            <label>
              Coupon code
              <input
                type="text"
                value={vendorForm.couponCode}
                onChange={(event) => setVendorForm((c) => ({ ...c, couponCode: event.target.value }))}
                placeholder="Optional promo code"
              />
            </label>
            <label className="hyperlocal-checkbox">
              <input
                type="checkbox"
                checked={vendorForm.openStatus}
                onChange={(event) => setVendorForm((c) => ({ ...c, openStatus: event.target.checked }))}
              />
              Shop open status
            </label>
            <button type="submit">Submit vendor profile</button>
          </form>
          {vendorStatus ? <p className="hyperlocal-status">{vendorStatus}</p> : null}
        </article>

        <article className="hyperlocal-panel">
          <h2>Delivery Partner Features</h2>
          <form className="hyperlocal-form" onSubmit={handlePartnerOnboard}>
            <label>
              Full name
              <input
                type="text"
                value={partnerForm.fullName}
                onChange={(event) => setPartnerForm((c) => ({ ...c, fullName: event.target.value }))}
              />
            </label>
            <label>
              Vehicle type
              <select
                value={partnerForm.vehicleType}
                onChange={(event) => setPartnerForm((c) => ({ ...c, vehicleType: event.target.value }))}
              >
                <option value="Bike">Bike</option>
                <option value="Scooter">Scooter</option>
                <option value="Auto">Auto</option>
              </select>
            </label>
            <label>
              Service area
              <input
                type="text"
                value={partnerForm.area}
                onChange={(event) => setPartnerForm((c) => ({ ...c, area: event.target.value }))}
              />
            </label>
            <label className="hyperlocal-checkbox">
              <input
                type="checkbox"
                checked={partnerForm.kycDone}
                onChange={(event) => setPartnerForm((c) => ({ ...c, kycDone: event.target.checked }))}
              />
              KYC verified
            </label>
            <button type="submit">Onboard partner</button>
          </form>
          {partnerStatus ? <p className="hyperlocal-status">{partnerStatus}</p> : null}
          <h3>Delivery jobs</h3>
          <ul className="hyperlocal-list">
            {partnerJobs.map((job) => (
              <li key={job.id}>
                {job.id} | {job.pickup} -> {job.drop} | INR {job.earning} | {job.status}{" "}
                {job.status !== "Accepted" ? (
                  <button type="button" onClick={() => handleAcceptJob(job.id)}>
                    Accept
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="hyperlocal-dual-grid">
        <article className="hyperlocal-panel">
          <h2>Admin Features</h2>
          <form className="hyperlocal-form" onSubmit={handleAdminApply}>
            <label>
              Commission (%)
              <input
                type="number"
                value={adminForm.commissionPercent}
                onChange={(event) => setAdminForm((c) => ({ ...c, commissionPercent: event.target.value }))}
              />
            </label>
            <label>
              Delivery zone
              <input
                type="text"
                value={adminForm.deliveryZone}
                onChange={(event) => setAdminForm((c) => ({ ...c, deliveryZone: event.target.value }))}
              />
            </label>
            <label>
              Featured listing fee
              <input
                type="number"
                value={adminForm.featuredListingFee}
                onChange={(event) =>
                  setAdminForm((c) => ({ ...c, featuredListingFee: event.target.value }))
                }
              />
            </label>
            <button type="submit">Apply admin settings</button>
          </form>
          {adminStatus ? <p className="hyperlocal-status">{adminStatus}</p> : null}
        </article>

        <article className="hyperlocal-panel">
          <h2>Revenue Options</h2>
          <ul className="hyperlocal-list">
            <li>Commission from shops</li>
            <li>Delivery charge</li>
            <li>Premium fast delivery</li>
            <li>Featured shop listing</li>
            <li>Local business ads</li>
            <li>Subscription for free delivery</li>
          </ul>
          <h3>Operational Controls</h3>
          <ul className="hyperlocal-list">
            <li>Approve shops and partners</li>
            <li>Refund and complaint handling</li>
            <li>Category and zone management</li>
            <li>Analytics and settlement reports</li>
          </ul>
        </article>
      </section>
    </div>
  );
};

export default HyperlocalDeliveryHub;
