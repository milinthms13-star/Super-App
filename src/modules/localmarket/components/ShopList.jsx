import React from "react";
import { SHOP_TYPES } from "../constants";

function ShopList({
  shops,
  loading,
  error,
  searchTerm,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  sortBy,
  onSortByChange,
  onlyOpenNow,
  onOnlyOpenNowChange,
  onlyOffers,
  onOnlyOffersChange,
  onOpenShop,
  ordersCount,
  cartCount,
  onShowOrders,
  onShowCart,
}) {
  return (
    <>
      <div className="lm-toolbar">
        <div className="lm-search">
          <input
            type="text"
            placeholder="Search shops, products, categories..."
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <select value={filterType} onChange={(event) => onFilterTypeChange(event.target.value)}>
          <option value="All">All Types</option>
          {SHOP_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select value={sortBy} onChange={(event) => onSortByChange(event.target.value)}>
          <option value="rating">Sort by Rating</option>
          <option value="distance">Sort by Distance</option>
          <option value="delivery">Sort by Delivery Time</option>
          <option value="price">Sort by Avg Product Price</option>
        </select>
        <label>
          <input
            type="checkbox"
            checked={onlyOpenNow}
            onChange={(event) => onOnlyOpenNowChange(event.target.checked)}
          />
          Open now
        </label>
        <label>
          <input
            type="checkbox"
            checked={onlyOffers}
            onChange={(event) => onOnlyOffersChange(event.target.checked)}
          />
          Offers
        </label>
        <button className="lm-btn lm-btn-primary" onClick={onShowOrders}>
          My Orders ({ordersCount})
        </button>
        <button className="lm-btn lm-btn-secondary" onClick={onShowCart} disabled={cartCount === 0}>
          Cart ({cartCount})
        </button>
      </div>

      {loading ? <p className="lm-empty">Loading shops...</p> : null}
      {error ? <p className="lm-empty">{error}</p> : null}

      {!loading && !error ? (
        <div className="lm-shops-grid">
          {shops.length === 0 ? (
            <p className="lm-empty">No shops found.</p>
          ) : (
            shops.map((shop) => (
              <div key={shop.id} className="lm-shop-card">
                <div className="lm-shop-header">
                  <div className="lm-shop-image">{shop.imageLabel}</div>
                  {shop.promoted ? <span className="lm-promoted">Promoted</span> : null}
                </div>
                <h3>{shop.name}</h3>
                <p className="lm-shop-type">{shop.type}</p>
                <div className="lm-shop-stats">
                  <span>Rating {shop.rating.toFixed(1)}</span>
                  <span>{shop.deliveryTime}</span>
                  <span>{shop.distanceKm.toFixed(1)} km</span>
                </div>
                <div className="lm-shop-badge">{shop.discount || "Daily deals"}</div>
                <button
                  className="lm-btn lm-btn-primary"
                  disabled={!shop.isOpen}
                  onClick={() => onOpenShop(shop.id)}
                >
                  {shop.isOpen ? "Browse Products" : "Shop Closed"}
                </button>
              </div>
            ))
          )}
        </div>
      ) : null}
    </>
  );
}

export default ShopList;
