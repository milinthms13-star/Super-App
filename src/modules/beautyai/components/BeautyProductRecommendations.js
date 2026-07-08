import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BUDGET_LEVELS,
  BUDGET_LABELS,
  PRODUCT_CATEGORY_LABELS,
} from "../data/beautyaiConstants";
import {
  fetchRecommendedProducts,
  addRecommendationsToCart,
  trackProductClick,
  generateProductDeepLink,
  createBeautyBundle,
  isEcommerceAvailable,
} from "../services/ecommerceIntegration";
import "../NilaBeautyAI.css";

/**
 * BeautyProductRecommendations Component
 * Displays product recommendations with e-commerce integration
 */

const BeautyProductRecommendations = ({
  products = [],
  budget = BUDGET_LEVELS.MEDIUM,
  onBudgetChange,
  plan,
}) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("relevance"); // 'relevance', 'price-asc', 'price-desc', 'rating'
  const [ecommerceAvailable, setEcommerceAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchedProducts, setFetchedProducts] = useState([]);

  // Check e-commerce availability and fetch products
  useEffect(() => {
    const initEcommerce = async () => {
      const available = await isEcommerceAvailable();
      setEcommerceAvailable(available);
      
      // Fetch products from e-commerce if available and plan exists
      if (available && plan) {
        setLoading(true);
        try {
          const planData = {
            planId: plan.id || plan._id,
            skinType: plan.profile?.skinType || plan.skinType,
            concern: plan.profile?.primaryConcern || plan.concern,
            selectedConcerns: plan.profile?.concerns || [],
            budget: plan.profile?.budget || budget,
          };
          
          const result = await fetchRecommendedProducts(planData);
          if (result.success) {
            setFetchedProducts(result.products || []);
          }
        } catch (error) {
          console.error("Failed to fetch e-commerce products:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    initEcommerce();
  }, [plan, budget]);

  // Merge products from props and fetched products
  const allProducts = [...products, ...fetchedProducts];

  const filteredProducts = selectedCategory === "all"
    ? allProducts
    : allProducts.filter((product) => product.category === selectedCategory);

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "rating":
        return (b.rating || 0) - (a.rating || 0);
      default:
        return 0;
    }
  });

  const categories = ["all", ...new Set(allProducts.map((p) => p.category))];

  const handleProductClick = async (product) => {
    // Track analytics
    await trackProductClick(product);
    
    // Generate deep link if e-commerce is available
    if (ecommerceAvailable) {
      const deepLink = generateProductDeepLink(product, 'beauty-ai');
      navigate(deepLink);
    } else if (product.link) {
      navigate(product.link);
    }
  };

  const handleBuyNow = async (product) => {
    await trackProductClick(product);
    const deepLink = generateProductDeepLink(product, 'beauty-ai-buy');
    navigate(deepLink);
  };

  const handleAddToCart = async (product) => {
    try {
      const result = await addRecommendationsToCart([product]);
      if (result.success) {
        alert(`${product.name} added to cart!`);
      } else {
        alert('Failed to add to cart. Please try again.');
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
      alert('Failed to add to cart. Please try again.');
    }
  };

  const handleCreateBundle = async () => {
    if (allProducts.length === 0) {
      alert('No products available to create a bundle.');
      return;
    }
    
    const planData = {
      planId: plan?.id || plan?._id,
      skinType: plan?.profile?.skinType || plan?.skinType,
      concern: plan?.profile?.primaryConcern || plan?.concern,
      budget: plan?.profile?.budget || budget,
    };
    
    const bundle = createBeautyBundle(allProducts, planData);
    
    // Navigate to bundle creation/checkout
    navigate('/ecommerce/bundle', { state: { bundle } });
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={`full-${i}`} className="star full">★</span>);
    }

    if (hasHalfStar) {
      stars.push(<span key="half" className="star half">★</span>);
    }

    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="star empty">☆</span>);
    }

    return stars;
  };

  const formatPrice = (price, currency = "INR") => {
    if (currency === "INR") {
      return `₹${price.toLocaleString()}`;
    }
    return `${currency} ${price.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="beauty-product-recommendations loading">
        <h3>Product Recommendations</h3>
        <div className="loading-spinner">Loading products...</div>
      </div>
    );
  }

  if (allProducts.length === 0) {
    return (
      <div className="beauty-product-recommendations empty">
        <h3>Product Recommendations</h3>
        <p>No product recommendations available. Generate a beauty plan to get personalized product suggestions!</p>
      </div>
    );
  }

  return (
    <div className="beauty-product-recommendations">
      <div className="recommendations-header">
        <h3>🛍️ Recommended Products</h3>
        <p className="recommendations-subtitle">
          Curated products based on your beauty plan and preferences
          {ecommerceAvailable && " • Live e-commerce integration"}
        </p>
        {allProducts.length > 1 && (
          <button
            type="button"
            className="create-bundle-btn"
            onClick={handleCreateBundle}
          >
            📦 Create Bundle ({allProducts.length} items)
          </button>
        )}
      </div>

      {/* Budget Selector */}
      <div className="budget-selector">
        <label>Budget Range:</label>
        <div className="budget-options">
          {Object.values(BUDGET_LEVELS).map((level) => (
            <button
              key={level}
              type="button"
              className={budget === level ? "active" : ""}
              onClick={() => onBudgetChange && onBudgetChange(level)}
            >
              {BUDGET_LABELS[level]}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="recommendations-filters">
        <div className="category-filter">
          <label>Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories
              .filter((cat) => cat !== "all")
              .map((category) => (
                <option key={category} value={category}>
                  {PRODUCT_CATEGORY_LABELS[category] || category}
                </option>
              ))}
          </select>
        </div>

        <div className="sort-filter">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="relevance">Most Relevant</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* Product Grid */}
      {sortedProducts.length === 0 ? (
        <p className="no-products">No products found for the selected filters.</p>
      ) : (
        <div className="products-grid">
          {sortedProducts.map((product) => (
            <div
              key={product.id}
              className="product-card"
              onClick={() => handleProductClick(product)}
            >
              {product.imageUrl && (
                <div className="product-image">
                  <img src={product.imageUrl} alt={product.name} loading="lazy" />
                  {product.badge && (
                    <span className="product-badge">{product.badge}</span>
                  )}
                </div>
              )}

              <div className="product-info">
                <div className="product-category">
                  {PRODUCT_CATEGORY_LABELS[product.category] || product.category}
                </div>
                <h4 className="product-name">{product.name}</h4>

                {product.brand && (
                  <div className="product-brand">{product.brand}</div>
                )}

                {product.description && (
                  <p className="product-description">{product.description}</p>
                )}

                <div className="product-rating">
                  {renderStars(product.rating || 0)}
                  <span className="rating-value">({product.rating || 0})</span>
                  {product.reviewCount && (
                    <span className="review-count">{product.reviewCount} reviews</span>
                  )}
                </div>

                <div className="product-footer">
                  <div className="product-price">
                    {formatPrice(product.price, product.currency)}
                  </div>
                  <div className="product-actions">
                    {ecommerceAvailable ? (
                      <>
                        <button
                          type="button"
                          className="add-to-cart-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(product);
                          }}
                        >
                          🛒 Add to Cart
                        </button>
                        <button
                          type="button"
                          className="buy-now-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyNow(product);
                          }}
                        >
                          Buy Now
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="view-product-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProductClick(product);
                        }}
                      >
                        View Product
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan Products Section */}
      {plan && plan.products && plan.products.length > 0 && (
        <div className="plan-products-section">
          <h4>Products in Your Current Plan</h4>
          <ul className="plan-products-list">
            {plan.products.map((product, idx) => (
              <li key={idx}>{product}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <div className="recommendations-disclaimer">
        <p>
          <strong>Note:</strong> Product recommendations are based on your beauty plan and
          preferences. Always patch test new products and consult with a dermatologist if
          you have specific skin concerns or allergies.
        </p>
      </div>
    </div>
  );
};

export default BeautyProductRecommendations;
