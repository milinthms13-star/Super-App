import React from "react";
import { DEFAULT_NEW_SHOP, SHOP_CATEGORIES, SHOP_ORDER_STATUSES, SHOP_TYPES } from "../constants";

function ShopOwnerDashboard({
  shops,
  selectedShopId,
  onSelectShop,
  newShop,
  onNewShopChange,
  onCreateShop,
  productForm,
  onProductFormChange,
  onCreateProduct,
  onStartEditProduct,
  editingProductId,
  onDeleteProduct,
  shopOrders,
  onOrderStatusChange,
}) {
  const selectedShop = shops.find((shop) => shop.id === selectedShopId) || null;

  return (
    <div className="lm-shopowner-view">
      <div className="lm-shopowner-section">
        <h2>Create / Manage Shops</h2>
        <div className="lm-form">
          <input
            type="text"
            placeholder="Shop Name"
            value={newShop.name}
            onChange={(event) => onNewShopChange("name", event.target.value)}
          />
          <select
            value={newShop.type}
            onChange={(event) => onNewShopChange("type", event.target.value)}
          >
            {SHOP_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Delivery Charge"
            value={newShop.deliveryCharge}
            onChange={(event) => onNewShopChange("deliveryCharge", Number(event.target.value || 0))}
          />
          <input
            type="number"
            placeholder="Minimum Order"
            value={newShop.minOrder}
            onChange={(event) => onNewShopChange("minOrder", Number(event.target.value || 0))}
          />
          <input
            type="number"
            placeholder="Free Delivery Above"
            value={newShop.freeDeliveryAbove}
            onChange={(event) => onNewShopChange("freeDeliveryAbove", Number(event.target.value || 0))}
          />
          <button className="lm-btn lm-btn-primary" onClick={onCreateShop}>
            Create Shop
          </button>
          <button
            className="lm-btn lm-btn-secondary"
            onClick={() => {
              Object.keys(DEFAULT_NEW_SHOP).forEach((field) => onNewShopChange(field, DEFAULT_NEW_SHOP[field]));
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="lm-shopowner-section">
        <h2>My Shops</h2>
        {shops.length === 0 ? (
          <p className="lm-empty">No shops mapped to your account yet.</p>
        ) : (
          <div className="lm-shops-list">
            {shops.map((shop) => (
              <div key={shop.id} className="lm-shopowner-card">
                <h3>{shop.name}</h3>
                <p>{shop.type}</p>
                <div className="lm-shop-stats">
                  <span>Rating {shop.rating.toFixed(1)}</span>
                  <span>{shop.products?.length || 0} products</span>
                </div>
                <button className="lm-btn lm-btn-secondary" onClick={() => onSelectShop(shop.id)}>
                  Manage Products
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedShop ? (
        <div className="lm-shopowner-section">
          <h2>Product Management - {selectedShop.name}</h2>
          <div className="lm-form">
            <input
              type="text"
              placeholder="Product Name"
              value={productForm.name}
              onChange={(event) => onProductFormChange("name", event.target.value)}
            />
            <input
              type="text"
              placeholder="Description"
              value={productForm.description}
              onChange={(event) => onProductFormChange("description", event.target.value)}
            />
            <select
              value={productForm.category}
              onChange={(event) => onProductFormChange("category", event.target.value)}
            >
              {SHOP_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Price"
              value={productForm.price}
              onChange={(event) => onProductFormChange("price", event.target.value)}
            />
            <input
              type="number"
              placeholder="MRP"
              value={productForm.mrp}
              onChange={(event) => onProductFormChange("mrp", event.target.value)}
            />
            <input
              type="text"
              placeholder="Quantity label (1 KG / 500g)"
              value={productForm.quantity}
              onChange={(event) => onProductFormChange("quantity", event.target.value)}
            />
            <input
              type="text"
              placeholder="Product image text / URL"
              value={productForm.image}
              onChange={(event) => onProductFormChange("image", event.target.value)}
            />
            <label>
              <input
                type="checkbox"
                checked={Boolean(productForm.inStock)}
                onChange={(event) => onProductFormChange("inStock", event.target.checked)}
              />
              In stock
            </label>
            <button className="lm-btn lm-btn-primary" onClick={onCreateProduct}>
              {editingProductId ? "Update Product" : "Add Product"}
            </button>
          </div>

          <div className="lm-orders-list">
            {(selectedShop.products || []).map((product) => (
              <div className="lm-order-card" key={product.id}>
                <h3>{product.name}</h3>
                <p>{product.category}</p>
                <p>
                  INR {product.price} / MRP INR {product.mrp}
                </p>
                <p>{product.inStock ? "In stock" : "Out of stock"}</p>
                <button className="lm-btn lm-btn-secondary" onClick={() => onStartEditProduct(product)}>
                  Edit
                </button>
                <button className="lm-btn lm-btn-secondary" onClick={() => onDeleteProduct(product)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {selectedShop ? (
        <div className="lm-shopowner-section">
          <h2>Shop Orders</h2>
          {shopOrders.length === 0 ? (
            <p className="lm-empty">No orders for this shop yet.</p>
          ) : (
            <div className="lm-orders-list">
              {shopOrders.map((order) => (
                <div className="lm-order-card" key={order.id}>
                  <div className="lm-order-header">
                    <h3>{order.orderId || order.id}</h3>
                    <span className={`lm-status lm-status-${order.status.replace(/\s+/g, "-").toLowerCase()}`}>
                      {order.status}
                    </span>
                  </div>
                  <p>Total: INR {order.total}</p>
                  <select
                    value={order.status}
                    onChange={(event) => onOrderStatusChange(order.id, event.target.value)}
                  >
                    {SHOP_ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default ShopOwnerDashboard;
