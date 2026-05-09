import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProductCard from './ProductCard';
import './RecommendedProducts.css';

const RecommendedProducts = ({
  userId,
  type = 'personalized',
  title = 'Recommended for You',
  limit = 6
}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    fetchRecommendations();
  }, [userId, type]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let endpoint = '/api/products/recommendations/popular';
      
      if (userId && token) {
        switch (type) {
          case 'personalized':
            endpoint = '/api/products/recommendations/personalized';
            break;
          case 'recently-viewed':
            endpoint = '/api/products/recommendations/recently-viewed';
            break;
          case 'collaborative':
            endpoint = '/api/products/recommendations/collaborative';
            break;
          default:
            endpoint = '/api/products/recommendations/popular';
        }
      }

      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.get(endpoint, {
        params: { limit },
        ...config
      });

      const data = response.data.data || response.data;
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (direction) => {
    const carousel = document.getElementById(`carousel-${type}`);
    if (!carousel) return;

    const scrollAmount = 300;
    const newPosition = scrollPosition + (direction === 'left' ? -scrollAmount : scrollAmount);

    carousel.scrollTo({
      left: newPosition,
      behavior: 'smooth'
    });
    setScrollPosition(newPosition);
  };

  if (loading) {
    return (
      <div className="recommended-products">
        <div className="loading-skeleton">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-card"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="recommended-products">
      <div className="recommendations-header">
        <h2 className="recommendations-title">{title}</h2>
        <button
          className="refresh-btn"
          onClick={fetchRecommendations}
          title="Refresh recommendations"
        >
          🔄
        </button>
      </div>

      <div className="carousel-container">
        <button
          className="carousel-btn prev-btn"
          onClick={() => handleScroll('left')}
          aria-label="Scroll left"
        >
          ←
        </button>

        <div
          id={`carousel-${type}`}
          className="products-carousel"
        >
          {products.map(product => (
            <div key={product._id} className="carousel-item">
              <ProductCard
                product={product}
                onAddToCart={(p) => console.log('Add to cart:', p)}
                onAddToWishlist={(id) => console.log('Add to wishlist:', id)}
              />
            </div>
          ))}
        </div>

        <button
          className="carousel-btn next-btn"
          onClick={() => handleScroll('right')}
          aria-label="Scroll right"
        >
          →
        </button>
      </div>
    </div>
  );
};

export default RecommendedProducts;
