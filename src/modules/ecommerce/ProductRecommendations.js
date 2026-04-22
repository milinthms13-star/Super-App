import React, { useState, useEffect } from 'react';
import './ProductRecommendations.css';

const ProductRecommendations = ({ userEmail, cartItems = [] }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({
    category: 'all',
    priceRange: 'all',
    rating: 'all',
  });
  const [customizedFilters, setCustomizedFilters] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [userEmail, cartItems]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would call an API endpoint
      // For now, we'll simulate recommended products based on cart items
      const mockRecommendations = generateMockRecommendations();
      setRecommendations(mockRecommendations);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockRecommendations = () => {
    // Mock data - replace with actual API call
    return [
      {
        _id: '1',
        name: 'Premium Wireless Headphones',
        price: 5999,
        originalPrice: 7999,
        rating: 4.8,
        reviews: 1250,
        image: '🎧',
        category: 'Electronics',
        confidence: 95,
        reason: 'Often bought with similar items',
        discount: 25,
      },
      {
        _id: '2',
        name: 'USB-C Fast Charging Cable',
        price: 399,
        originalPrice: 599,
        rating: 4.6,
        reviews: 890,
        image: '🔌',
        category: 'Accessories',
        confidence: 88,
        reason: 'Frequently purchased together',
        discount: 33,
      },
      {
        _id: '3',
        name: 'Protective Phone Case',
        price: 599,
        originalPrice: 999,
        rating: 4.7,
        reviews: 2100,
        image: '📱',
        category: 'Accessories',
        confidence: 92,
        reason: 'Customers who viewed your item also viewed',
        discount: 40,
      },
      {
        _id: '4',
        name: 'Screen Protector Pack',
        price: 299,
        originalPrice: 499,
        rating: 4.5,
        reviews: 650,
        image: '🛡️',
        category: 'Accessories',
        confidence: 85,
        reason: 'Best sellers in similar category',
        discount: 40,
      },
      {
        _id: '5',
        name: 'Premium Portable Speaker',
        price: 3999,
        originalPrice: 5499,
        rating: 4.9,
        reviews: 1820,
        image: '🔊',
        category: 'Electronics',
        confidence: 90,
        reason: 'Trending in your category',
        discount: 27,
      },
      {
        _id: '6',
        name: 'Wireless Charging Pad',
        price: 1499,
        originalPrice: 1999,
        rating: 4.6,
        reviews: 945,
        image: '⚡',
        category: 'Accessories',
        confidence: 87,
        reason: 'Recommended for you',
        discount: 25,
      },
    ];
  };

  const handleAddToCart = (product) => {
    console.log('Added to cart:', product);
    // Implement add to cart logic
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const filteredRecommendations = recommendations.filter((product) => {
    if (filters.category !== 'all' && product.category !== filters.category) {
      return false;
    }
    if (filters.priceRange === 'under1000' && product.price >= 1000) {
      return false;
    }
    if (filters.priceRange === '1000-5000' && (product.price < 1000 || product.price > 5000)) {
      return false;
    }
    if (filters.priceRange === 'above5000' && product.price <= 5000) {
      return false;
    }
    if (filters.rating === '4plus' && product.rating < 4) {
      return false;
    }
    if (filters.rating === '45plus' && product.rating < 4.5) {
      return false;
    }
    return true;
  });

  if (loading) {
    return <div className="loading">Loading recommendations...</div>;
  }

  return (
    <div className="recommendations-container">
      <div className="recommendations-header">
        <h1>⭐ Recommended For You</h1>
        <p>Personalized products based on your interests</p>
      </div>

      <div className="recommendations-controls">
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            ⊞ Grid
          </button>
          <button
            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            ≡ List
          </button>
        </div>

        <div className="filter-section">
          <label>
            <input
              type="checkbox"
              checked={customizedFilters}
              onChange={(e) => setCustomizedFilters(e.target.checked)}
            />
            Show personalized recommendations
          </label>
        </div>
      </div>

      <div className="filters-panel">
        <div className="filter-group">
          <label>Category</label>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Accessories">Accessories</option>
            <option value="Fashion">Fashion</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Price Range</label>
          <select
            value={filters.priceRange}
            onChange={(e) => handleFilterChange('priceRange', e.target.value)}
          >
            <option value="all">All Prices</option>
            <option value="under1000">Under ₹1,000</option>
            <option value="1000-5000">₹1,000 - ₹5,000</option>
            <option value="above5000">Above ₹5,000</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Rating</label>
          <select
            value={filters.rating}
            onChange={(e) => handleFilterChange('rating', e.target.value)}
          >
            <option value="all">All Ratings</option>
            <option value="4plus">4+ Stars</option>
            <option value="45plus">4.5+ Stars</option>
          </select>
        </div>
      </div>

      <div className={`recommendations-list ${viewMode}`}>
        {filteredRecommendations.length > 0 ? (
          filteredRecommendations.map((product) => (
            <div key={product._id} className="recommendation-card">
              <div className="card-image">
                <span className="image-emoji">{product.image}</span>
                <div className="discount-badge">-{product.discount}%</div>
                <div className="confidence-badge">
                  {product.confidence}% match
                </div>
              </div>

              <div className="card-content">
                <p className="recommendation-reason">{product.reason}</p>
                <h3 className="product-name">{product.name}</h3>

                <div className="rating-section">
                  <div className="rating">
                    {'⭐'.repeat(Math.floor(product.rating))}
                    {product.rating % 1 !== 0 && '✨'}
                  </div>
                  <span className="rating-value">{product.rating}</span>
                  <span className="review-count">({product.reviews} reviews)</span>
                </div>

                <div className="price-section">
                  <span className="original-price">₹{product.originalPrice}</span>
                  <span className="price">₹{product.price}</span>
                </div>

                <div className="card-category">
                  <span className="category-badge">{product.category}</span>
                </div>

                <button
                  className="add-to-cart-btn"
                  onClick={() => handleAddToCart(product)}
                >
                  + Add to Cart
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>No recommendations match your filters</p>
            <button
              onClick={() =>
                setFilters({
                  category: 'all',
                  priceRange: 'all',
                  rating: 'all',
                })
              }
              className="reset-filters-btn"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      <div className="recommendation-info">
        <h4>🤖 How We Recommend</h4>
        <ul>
          <li>Based on your browsing history and purchases</li>
          <li>Products frequently bought together</li>
          <li>Trending items in your favorite categories</li>
          <li>Highly rated products from your preferences</li>
          <li>New arrivals matching your interests</li>
        </ul>
      </div>
    </div>
  );
};

export default ProductRecommendations;
