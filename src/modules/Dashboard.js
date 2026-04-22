import React, { useRef, useState, useEffect } from "react";
import { useApp } from "../contexts/AppContext";
import useI18n from "../hooks/useI18n";
import { formatCurrency } from "../utils/ecommerceHelpers";
import "../styles/Dashboard.css";

const normalizeOrderStatus = (status) => {
  const normalizedStatus = String(status || "").trim().toLowerCase();

  if (!normalizedStatus || normalizedStatus === "paid" || normalizedStatus === "cash on delivery") {
    return "Confirmed";
  }

  if (normalizedStatus === "packed") {
    return "Packed";
  }

  if (normalizedStatus === "shipped") {
    return "Shipped";
  }

  if (normalizedStatus === "delivered") {
    return "Delivered";
  }

  return "Confirmed";
};

const isReturnedForReview = (product) =>
  product?.approvalStatus === "pending" && Boolean(product?.moderationNote?.trim());

const Icon = ({ type, className = "" }) => {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  switch (type) {
    case "cart":
      return (
        <svg {...common}>
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="18" cy="20" r="1.5" />
          <path d="M3 4h2l2.5 11h10.5l2-8H6.2" />
        </svg>
      );
    case "orders":
      return (
        <svg {...common}>
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v5h5" />
          <path d="M10 12h6M10 16h6" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case "ecommerce":
      return (
        <svg {...common}>
          <path d="M3 5h2l2 10h10l2-7H7" />
          <circle cx="10" cy="19" r="1.5" />
          <circle cx="17" cy="19" r="1.5" />
        </svg>
      );
    case "messaging":
      return (
        <svg {...common}>
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z" />
        </svg>
      );
    case "classifieds":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      );
    case "realestate":
      return (
        <svg {...common}>
          <path d="M3 11 12 4l9 7" />
          <path d="M5 10.5V20h14v-9.5" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
    case "fooddelivery":
      return (
        <svg {...common}>
          <path d="M7 4v8M10 4v8M7 8h3" />
          <path d="M14 4v16" />
          <path d="M17 4c1.7 2 1.7 6 0 8" />
        </svg>
      );
    case "ridesharing":
      return (
        <svg {...common}>
          <path d="M6 16h12l-1.5-6a2 2 0 0 0-2-1.5H9.5a2 2 0 0 0-2 1.5z" />
          <circle cx="8" cy="18" r="1.5" />
          <circle cx="16" cy="18" r="1.5" />
          <path d="M6 13h12" />
        </svg>
      );
    case "matrimonial":
      return (
        <svg {...common}>
          <path d="M12 20s-6-3.7-6-8.5A3.5 3.5 0 0 1 12 9a3.5 3.5 0 0 1 6 2.5C18 16.3 12 20 12 20Z" />
        </svg>
      );
    case "socialmedia":
      return (
        <svg {...common}>
          <rect x="5" y="5" width="14" height="14" rx="4" />
          <circle cx="12" cy="12" r="3.5" />
          <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "reminderalert":
      return (
        <svg {...common}>
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M6 9a6 6 0 1 1 12 0c0 2.4.8 3.8 2 5H4c1.2-1.2 2-2.6 2-5Z" />
        </svg>
      );
case "sosalert":
      return (
        <svg {...common}>
          <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10Z" />
          <path d="M12 8v6" />
          <path d="M9 11h6" />
        </svg>
      );
  case "localmarket":
      return (
        <svg {...common}>
          <path d="M3 5h2l2 10h10l2-7H7" />
          <circle cx="10" cy="19" r="1.5" />
          <circle cx="17" cy="19" r="1.5" />
        </svg>
      );
case "astrology":
      return (
        <svg {...common}>
          <path d="M12 2v20M2 12h20" />
          <path d="M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M4.22 18.36l1.42-1.42M18.36 4.22l1.42-1.42" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  case "external":
      return (
        <svg {...common}>
          <path d="M14 5h5v5" />
          <path d="M10 14 19 5" />
          <path d="M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
};

const MODULE_CONFIG = [
  {
    id: "ecommerce",
    nameKey: "modules.ecommerce",
    fallbackName: "GlobeMart",
    icon: "ecommerce",
    descriptionKey: "dashboard.moduleDescriptions.ecommerce",
    fallbackDescription: "Global marketplace for products, daily needs, fashion, and electronics",
  },
  {
    id: "messaging",
    nameKey: "modules.messaging",
    fallbackName: "LinkUp",
    icon: "messaging",
    descriptionKey: "dashboard.moduleDescriptions.messaging",
    fallbackDescription: "Real-time messaging for customers, sellers, and service providers",
  },
  {
    id: "classifieds",
    nameKey: "modules.classifieds",
    fallbackName: "TradePost",
    icon: "classifieds",
    descriptionKey: "dashboard.moduleDescriptions.classifieds",
    fallbackDescription: "Trusted listings for buying, selling, and discovering deals",
  },
  {
    id: "realestate",
    nameKey: "modules.realestate",
    fallbackName: "HomeSphere",
    icon: "realestate",
    descriptionKey: "dashboard.moduleDescriptions.realestate",
    fallbackDescription: "Explore homes, rentals, land, and commercial spaces",
  },
  {
    id: "fooddelivery",
    nameKey: "modules.fooddelivery",
    fallbackName: "Feastly",
    icon: "fooddelivery",
    descriptionKey: "dashboard.moduleDescriptions.fooddelivery",
    fallbackDescription: "Restaurant discovery and food delivery made simple",
  },
  {
    id: "localmarket",
    nameKey: "modules.localmarket",
    fallbackName: "Local Market",
    icon: "localmarket",
    descriptionKey: "dashboard.moduleDescriptions.localmarket",
    fallbackDescription: "Local vendors, fresh produce, handmade goods, and neighborhood services",
  },
  {
    id: "ridesharing",
    nameKey: "modules.ridesharing",
    fallbackName: "SwiftRide",
    icon: "ridesharing",
    descriptionKey: "dashboard.moduleDescriptions.ridesharing",
    fallbackDescription: "Reliable ride booking and shared transport options",
  },
  {
    id: "matrimonial",
    nameKey: "modules.matrimonial",
    fallbackName: "SoulMatch",
    icon: "matrimonial",
    descriptionKey: "dashboard.moduleDescriptions.matrimonial",
    fallbackDescription: "Find your perfect life partner with verified profiles",
  },
  {
    id: "socialmedia",
    nameKey: "modules.socialmedia",
    fallbackName: "VibeHub",
    icon: "socialmedia",
    descriptionKey: "dashboard.moduleDescriptions.socialmedia",
    fallbackDescription: "Social space to connect, share, and grow across borders",
  },
  {
    id: "reminderalert",
    nameKey: "modules.reminderalert",
    fallbackName: "ReminderAlert - Todo List",
    icon: "reminderalert",
    descriptionKey: "dashboard.moduleDescriptions.reminderalert",
    fallbackDescription: "Smart task planning with alarms, SMS reminders, and automated call alerts",
  },
  {
    id: "sosalert",
    nameKey: "modules.sosalert",
    fallbackName: "SOS Safety Center",
    icon: "sosalert",
    descriptionKey: "dashboard.moduleDescriptions.sosalert",
    fallbackDescription: "Emergency alerts with live location sharing, escalation, and trusted contact tracking",
  },
  {
    id: "astrology",
    nameKey: "modules.astrology",
    fallbackName: "AstroNila",
    icon: "astrology",
    descriptionKey: "dashboard.moduleDescriptions.astrology",
    fallbackDescription: "Daily horoscope, Vedic insights, and personalized astrology readings for all zodiac signs",
  },
];

const openExternalLink = (url = "") => {
  if (!url) {
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
};

const Dashboard = ({ enabledModules, customLinks = [], onModuleChange }) => {
  const {
    currentUser,
    cart,
    orders,
    sellerOrders,
    managedProducts,
    orderStats,
    sellerOrderStats,
    ordersPagination,
    sellerOrdersPagination,
    managedProductsPagination,
    loadMoreOrders,
    loadMoreSellerOrders,
    loadMoreManagedProducts,
  } = useApp();
  const { t } = useI18n();
  const recentOrdersRef = useRef(null);
  const listingsRef = useRef(null);
  const [isLoading, setIsLoading] = useState(process.env.NODE_ENV !== "test");

  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      return undefined;
    }

    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const isSeller =
    currentUser?.registrationType === "entrepreneur" || currentUser?.role === "business";
  const businessName = currentUser?.businessName?.trim() || currentUser?.name || "Your Business";
  const subscribedCategoryIds = (currentUser?.selectedBusinessCategories || [])
    .map((category) => category?.id)
    .filter(Boolean);
  const cartItemCount = cart.reduce((total, item) => total + Number(item.quantity || 1), 0);
  const undeliveredOrdersCount = orderStats.openCount || 0;
  const sellerListingCount = managedProductsPagination.totalItems || 0;
  const sellerListings = managedProducts.filter(
    (product) => product.sellerEmail === currentUser?.email
  );
  const sellerReturnedListings = sellerListings.filter((product) => isReturnedForReview(product));
  const visibleSellerListings = sellerListings.filter((product) => !isReturnedForReview(product));
  const sellerFulfillmentPendingCount = sellerOrderStats.openFulfillmentCount || 0;

  const handleOrdersCardClick = () => {
    if (!isSeller) {
      onModuleChange?.("orders");
      return;
    }

    recentOrdersRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleListingsCardClick = () => {
    listingsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };
  const filteredModules = MODULE_CONFIG
    .map((module) => ({
      ...module,
      name: t(module.nameKey, module.fallbackName),
      description: t(module.descriptionKey, module.fallbackDescription),
    }))
    .filter((module) => enabledModules.includes(module.id))
    .filter((module) => !isSeller || subscribedCategoryIds.includes(module.id));
  const visibleCards = [
    ...filteredModules.map((module) => ({ ...module, cardType: "module" })),
    ...customLinks.map((link) => ({
      id: link.id,
      name: link.title,
      description: link.description || link.url,
      icon: "external",
      cardType: "external",
      url: link.url,
    })),
  ];

  return (
    <div className={`dashboard-container ${!isSeller ? "dashboard-container-compact" : ""}`}>
      {isLoading ? (
        <div className="premium-loading">
          <div className="loading-shimmer">
            <div className="shimmer-card welcome-shimmer"></div>
            <div className="shimmer-grid">
              <div className="shimmer-card stat-shimmer"></div>
              <div className="shimmer-card stat-shimmer"></div>
              <div className="shimmer-card stat-shimmer"></div>
              <div className="shimmer-card stat-shimmer"></div>
            </div>
            <div className="shimmer-grid">
              <div className="shimmer-card module-shimmer"></div>
              <div className="shimmer-card module-shimmer"></div>
              <div className="shimmer-card module-shimmer"></div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={`welcome-section ${isSeller ? "seller-welcome-section" : ""}`}>
            <img src="/logo.svg" alt="NilaHub" className="welcome-logo" />
            {isSeller ? (
              <>
                <h1>{businessName} Seller Dashboard</h1>
                <p>
                  Manage your subscribed NilaHub business categories, monitor seller orders,
                  and jump directly into the services your business registered for.
                </p>
              </>
            ) : (
              <>
                <h1>{t("dashboard.welcomeTitle", "Welcome to NilaHub!")}</h1>
                <p>
                  {t(
                    "dashboard.welcomeDescription",
                    "Kerala's first super app for global shopping, messaging, listings, homes, food, rides, matches, and social life"
                  )}
                </p>
              </>
            )}
          </div>

          <div className="stats-section">
            {isSeller ? (
          <>
            <div className="stat-card">
              <span className="stat-icon"><Icon type="ecommerce" className="stat-icon-svg" /></span>
              <div className="stat-content">
                <h3>{subscribedCategoryIds.length}</h3>
                <p>Subscribed Categories</p>
              </div>
            </div>
            <button
              type="button"
              className="stat-card stat-card-button"
              onClick={handleOrdersCardClick}
            >
              <span className="stat-icon"><Icon type="orders" className="stat-icon-svg" /></span>
              <div className="stat-content">
                <h3>{sellerOrdersPagination.totalItems || 0}</h3>
                <p>Seller Orders</p>
              </div>
            </button>
            <button
              type="button"
              className="stat-card stat-card-button"
              onClick={handleOrdersCardClick}
            >
              <span className="stat-icon"><Icon type="orders" className="stat-icon-svg" /></span>
              <div className="stat-content">
                <h3>{sellerFulfillmentPendingCount}</h3>
                <p>Open Fulfillments</p>
              </div>
            </button>
            <button
              type="button"
              className="stat-card stat-card-button"
              onClick={handleListingsCardClick}
            >
              <span className="stat-icon"><Icon type="classifieds" className="stat-icon-svg" /></span>
              <div className="stat-content">
                <h3>{sellerListingCount}</h3>
                <p>My Listings</p>
              </div>
            </button>
          </>
        ) : (
          <>
            <button type="button" className="stat-card stat-card-button" onClick={() => onModuleChange?.("cart")}>
              <span className="stat-icon"><Icon type="cart" className="stat-icon-svg" /></span>
              <div className="stat-content">
                <h3>{cartItemCount}</h3>
                <p>{t("dashboard.itemsInCart", "Items in Cart")}</p>
              </div>
            </button>
            <button
              type="button"
              className="stat-card stat-card-button"
              onClick={handleOrdersCardClick}
            >
              <span className="stat-icon"><Icon type="orders" className="stat-icon-svg" /></span>
              <div className="stat-content">
                <h3>{ordersPagination.totalItems || 0}</h3>
                <p>{t("dashboard.ordersPlaced", "Orders Placed")}</p>
              </div>
            </button>
            <button
              type="button"
              className="stat-card stat-card-button"
              onClick={handleOrdersCardClick}
            >
              <span className="stat-icon"><Icon type="orders" className="stat-icon-svg" /></span>
              <div className="stat-content">
                <h3>{undeliveredOrdersCount}</h3>
                <p>Orders Not Delivered</p>
              </div>
            </button>
          </>
        )}
        <div className="stat-card">
          <span className="stat-icon"><Icon type="user" className="stat-icon-svg" /></span>
          <div className="stat-content">
            <h3>{isSeller ? businessName : currentUser.name}</h3>
            <p>{isSeller ? "Seller Account" : t("dashboard.loggedIn", "Logged In")}</p>
          </div>
        </div>
      </div>

      <div className={!isSeller ? "dashboard-main-grid" : ""}>
        <div className="modules-section">
          <h2>{isSeller ? "My Business Categories" : t("dashboard.exploreServices", "Explore Our Services")}</h2>
          <div className="modules-grid">
            {visibleCards.map((module) => (
              <button
                type="button"
                className={`module-card ${isSeller ? "seller-module-card" : ""}`}
                key={module.id}
                onClick={() =>
                  module.cardType === "external"
                    ? openExternalLink(module.url)
                    : onModuleChange?.(module.id)
                }
              >
                <div className="module-icon">
                  <Icon type={module.icon} className="module-icon-svg" />
                </div>
                <h3>{module.name}</h3>
                <p>{module.description}</p>
                <span className="module-badge">
                  {module.cardType === "external"
                    ? "Open Link"
                    : isSeller
                      ? "Open Workspace"
                      : t("common.explore", "Explore")}
                </span>
              </button>
            ))}
          </div>
          {isSeller && visibleCards.length === 0 && (
            <div className="recent-orders seller-empty-dashboard">
              <h2>No Subscribed Categories</h2>
              <p>Your seller account does not have any active subscribed categories visible right now.</p>
            </div>
          )}
        </div>

        {!isSeller && (
          <div className="recent-orders recent-orders-compact" ref={recentOrdersRef}>
            <h2>{t("dashboard.recentOrders", "Recent Orders")}</h2>
            {orders.length > 0 ? (
              <div className="orders-list">
                {orders.map((order) => (
                  <div key={order.id} className="order-item">
                    <span className="order-date">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Recent"}
                    </span>
                    <span
                      className={`order-status order-status-${normalizeOrderStatus(order.status).toLowerCase()}`}
                    >
                      {normalizeOrderStatus(order.status)}
                    </span>
                    <span className="order-amount">Total: INR {formatCurrency(order.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-orders">
                {t("dashboard.noOrders", "No orders yet. Start shopping!")}
              </p>
            )}
            {ordersPagination.hasNextPage && (
              <button type="button" className="btn btn-outline" onClick={loadMoreOrders}>
                Load more orders
              </button>
            )}
            <button type="button" className="btn btn-outline dashboard-return-btn" onClick={() => onModuleChange?.("returns")}>
              Open Returns & Refunds
            </button>
          </div>
        )}
      </div>

      {isSeller && (
        <div className="recent-orders seller-listings-section" ref={listingsRef}>
          <h2>Returned For Review</h2>
          {sellerReturnedListings.length > 0 ? (
            <div className="orders-list seller-returned-list">
              {sellerReturnedListings.map((product) => (
                <div key={product.id} className="order-item seller-listing-item seller-returned-item">
                  <span className="order-date">{product.category}</span>
                  <span className="order-status order-status-returned">Returned</span>
                  <span className="order-amount">
                    {product.name}
                    {product.moderationNote ? ` · ${product.moderationNote}` : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-orders">No products are currently waiting for your review updates.</p>
          )}

          <h2>My Listed Items</h2>
          {visibleSellerListings.length > 0 ? (
            <div className="orders-list">
              {visibleSellerListings.map((product) => (
                <div key={product.id} className="order-item seller-listing-item">
                  <span className="order-date">{product.category}</span>
                  <span
                    className={`order-status order-status-${String(product.approvalStatus || "pending").toLowerCase()}`}
                  >
                    {product.approvalStatus || "pending"}
                  </span>
                  <span className="order-amount">
                    {product.name} · INR {product.price}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-orders">No listed items yet. Your seller listings will appear here.</p>
          )}
          {managedProductsPagination.hasNextPage && (
            <button type="button" className="btn btn-outline" onClick={loadMoreManagedProducts}>
              Load more listings
            </button>
          )}
        </div>
      )}

      {isSeller && (
      <div className="recent-orders" ref={recentOrdersRef}>
        <h2>{isSeller ? "Seller Activity" : t("dashboard.recentOrders", "Recent Orders")}</h2>
        {isSeller ? (
          sellerOrders.length > 0 ? (
            <div className="orders-list">
              {sellerOrders.map((order) => {
                const myFulfillment = (order.sellerFulfillments || []).find(
                  (fulfillment) =>
                    fulfillment.sellerEmail === currentUser?.email ||
                    fulfillment.businessName === businessName
                );

                return (
                  <div key={order.id} className="order-item">
                    <span className="order-date">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Recent"}
                    </span>
                    <span
                      className={`order-status order-status-${normalizeOrderStatus(myFulfillment?.status).toLowerCase()}`}
                    >
                      {normalizeOrderStatus(myFulfillment?.status)}
                    </span>
                    <span className="order-amount">Order Total: INR {formatCurrency(order.amount)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="no-orders">No seller orders yet. New business activity will appear here.</p>
          )
        ) : (
          orders.length > 0 ? (
            <div className="orders-list">
              {orders.map((order) => (
                <div key={order.id} className="order-item">
                  <span className="order-date">
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "Recent"}
                  </span>
                  <span
                    className={`order-status order-status-${normalizeOrderStatus(order.status).toLowerCase()}`}
                  >
                    {normalizeOrderStatus(order.status)}
                  </span>
                  <span className="order-amount">Total: INR {formatCurrency(order.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-orders">
              {t("dashboard.noOrders", "No orders yet. Start shopping!")}
            </p>
          )
        )}
        {isSeller ? (
          sellerOrdersPagination.hasNextPage && (
            <button type="button" className="btn btn-outline" onClick={loadMoreSellerOrders}>
              Load more seller orders
            </button>
          )
        ) : (
          ordersPagination.hasNextPage && (
            <button type="button" className="btn btn-outline" onClick={loadMoreOrders}>
              Load more orders
            </button>
          )
        )}
        {!isSeller && (
          <button type="button" className="btn btn-outline dashboard-return-btn" onClick={() => onModuleChange?.("returns")}>
            Open Returns & Refunds
          </button>
        )}
      </div>
      )}
      </>
      )}
    </div>
  );
};

export default Dashboard;
