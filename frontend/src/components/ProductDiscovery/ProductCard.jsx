import React from 'react';
import { Link } from 'react-router-dom';
import './ProductCard.css';

const ProductCard = ({
  product,
  onAddToCart,
  onAddToWishlist,
  onViewDetails
}) => {
  const discountPercentage = product.discountPercentage || 0;
  const savings = (product.mrp - product.price).toFixed(0);

  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails(product._id);
    }
  };

  return (
    <div className="product-card">
      {/* Product Image */}
      <div className="product-image-container">
        <Link
          to={`/product/${product._id}`}
          className="product-image-link"
          onClick={handleCardClick}
        >
          <img
            src={product.image || 'https://via.placeholder.com/200'}
            alt={product.name}
            className="product-image"
          />
        </Link>

        {/* Badges */}
        <div className="product-badges">
          {discountPercentage > 0 && (
            <span className="badge discount-badge">
              -{discountPercentage}%
            </span>
          )}
          {product.stock <= 5 && product.stock > 0 && (
            <span className="badge stock-badge">
              Low Stock
            </span>
          )}
          {product.stock === 0 && (
            <span className="badge outofstock-badge">
              Out of Stock
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          className="wishlist-button"
          onClick={() => onAddToWishlist?.(product._id)}
          title="Add to Wishlist"
        >
          ♡
        </button>
      </div>

      {/* Product Info */}
      <div className="product-info">
        {/* Product Name */}
        <Link
          to={`/product/${product._id}`}
          className="product-name-link"
        >
          <h3 className="product-name">{product.name}</h3>
        </Link>

        {/* Category */}
        <p className="product-category">{product.category}</p>

        {/* Rating */}
        <div className="product-rating">
          <span className="stars">
            {'★'.repeat(Math.floor(product.rating || 0))}
            {'☆'.repeat(5 - Math.floor(product.rating || 0))}
          </span>
          <span className="rating-value">
            {product.rating?.toFixed(1) || 'No rating'}
          </span>
        </div>

        {/* Price Section */}
        <div className="product-price">
          <span className="current-price">₹{product.price.toLocaleString()}</span>
          {product.mrp > product.price && (
            <>
              <span className="original-price">
                ₹{product.mrp.toLocaleString()}
              </span>
              <span className="savings">Save ₹{savings}</span>
            </>
          )}
        </div>

        {/* Add to Cart Button */}
        <button
          className={`add-to-cart-btn ${product.stock === 0 ? 'disabled' : ''}`}
          onClick={() => onAddToCart?.(product)}
          disabled={product.stock === 0}
        >
          {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
