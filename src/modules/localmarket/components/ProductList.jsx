import React from "react";

function ProductList({ shop, loading, error, onBack, onAddToCart }) {
  return (
    <>
      <div className="lm-back-button">
        <button onClick={onBack}>Back to Shops</button>
      </div>

      {loading ? <p className="lm-empty">Loading products...</p> : null}
      {error ? <p className="lm-empty">{error}</p> : null}

      {shop ? (
        <div className="lm-shop-details">
          <h2>{shop.name}</h2>
          <div className="lm-shop-info">
            <span>Rating {shop.rating.toFixed(1)}</span>
            <span>{shop.licenseStatus || "License verification pending"}</span>
            <span>Delivery INR {shop.deliveryCharge}</span>
            <span>Min order INR {shop.minOrder}</span>
          </div>

          <div className="lm-products-grid">
            {(shop.products || []).map((product) => (
              <div key={product.id} className="lm-product-card">
                <div className="lm-product-image">{product.image || "P"}</div>
                <h4>{product.name}</h4>
                <p className="lm-category">{product.category}</p>
                <p className="lm-description">{product.description || "No description provided."}</p>
                <div className="lm-price-section">
                  <span className="lm-price">INR {product.price}</span>
                  {Number(product.mrp || 0) > Number(product.price || 0) ? (
                    <span className="lm-mrp">INR {product.mrp}</span>
                  ) : null}
                </div>
                <p className="lm-quantity">{product.quantity}</p>
                <button
                  className="lm-btn lm-btn-primary"
                  disabled={!product.inStock}
                  onClick={() => onAddToCart(product, shop)}
                >
                  {product.inStock ? "Add to Cart" : "Out of Stock"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

export default ProductList;
