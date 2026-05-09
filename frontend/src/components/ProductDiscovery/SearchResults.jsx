import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProductCard from './ProductCard';
import './SearchResults.css';

const SearchResults = ({ query, onProductSelect }) => {
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({
    category: null,
    minPrice: 0,
    maxPrice: 100000,
    rating: 0,
    inStock: false,
    discount: false,
  });
  const [sortBy, setSortBy] = useState('relevance');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableFilters, setAvailableFilters] = useState({});

  // Fetch search results
  useEffect(() => {
    const fetchResults = async () => {
      if (!query || query.length < 2) return;

      try {
        setLoading(true);
        setError(null);

        const response = await axios.get('/api/products/search', {
          params: {
            q: query,
            ...filters,
            sortBy,
            page,
            limit: 20,
          }
        });

        setProducts(response.data.results);
        setTotalCount(response.data.pagination.total);
      } catch (err) {
        setError('Failed to fetch search results');
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, filters, sortBy, page]);

  // Fetch available filters for category
  useEffect(() => {
    const fetchCategoryFilters = async () => {
      if (!filters.category) return;

      try {
        const response = await axios.get(`/api/products/filters/${filters.category}`);
        setAvailableFilters(response.data.filters);
      } catch (err) {
        console.error('Error fetching filters:', err);
      }
    };

    fetchCategoryFilters();
  }, [filters.category]);

  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
    setPage(1); // Reset to first page when filters change
  };

  const handleResetFilters = () => {
    setFilters({
      category: null,
      minPrice: 0,
      maxPrice: 100000,
      rating: 0,
      inStock: false,
      discount: false,
    });
    setSortBy('relevance');
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / 20);

  if (error) {
    return <div className="search-error">{error}</div>;
  }

  return (
    <div className="search-results-container">
      <div className="results-header">
        <h1 className="results-title">
          Search Results for "{query}"
        </h1>
        <p className="results-count">
          {totalCount > 0 ? `Found ${totalCount} products` : 'No products found'}
        </p>
      </div>

      <div className="results-content">
        {/* Filters Sidebar */}
        <aside className="filters-sidebar">
          <div className="filters-header">
            <h3>Filters</h3>
            <button className="reset-filters-btn" onClick={handleResetFilters}>
              Reset
            </button>
          </div>

          {/* Price Filter */}
          <div className="filter-group">
            <h4 className="filter-title">Price Range</h4>
            <div className="filter-price">
              <div className="price-input">
                <label>Min: ₹{filters.minPrice}</label>
                <input
                  type="range"
                  min="0"
                  max="100000"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', parseInt(e.target.value))}
                  className="price-slider"
                />
              </div>
              <div className="price-input">
                <label>Max: ₹{filters.maxPrice}</label>
                <input
                  type="range"
                  min="0"
                  max="100000"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', parseInt(e.target.value))}
                  className="price-slider"
                />
              </div>
            </div>
          </div>

          {/* Rating Filter */}
          <div className="filter-group">
            <h4 className="filter-title">Rating</h4>
            <div className="filter-options">
              {[4, 3, 2, 1, 0].map(rating => (
                <label key={rating} className="filter-option">
                  <input
                    type="radio"
                    name="rating"
                    checked={filters.rating === rating}
                    onChange={() => handleFilterChange('rating', rating)}
                  />
                  <span className="rating-label">
                    {rating > 0 ? `${rating}★ & above` : 'All ratings'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Stock Filter */}
          <div className="filter-group">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={filters.inStock}
                onChange={(e) => handleFilterChange('inStock', e.target.checked)}
              />
              <span>In Stock Only</span>
            </label>
          </div>

          {/* Discount Filter */}
          <div className="filter-group">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={filters.discount}
                onChange={(e) => handleFilterChange('discount', e.target.checked)}
              />
              <span>Discounted Only</span>
            </label>
          </div>
        </aside>

        {/* Products Grid */}
        <main className="products-main">
          {/* Sort Controls */}
          <div className="sort-controls">
            <label htmlFor="sortBy">Sort by:</label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="sort-select"
            >
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rating</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          {/* Loading State */}
          {loading && <div className="loading">Loading products...</div>}

          {/* No Results */}
          {!loading && products.length === 0 && (
            <div className="no-results">
              <p>No products found matching your criteria.</p>
              <button className="reset-filters-btn" onClick={handleResetFilters}>
                Try clearing filters
              </button>
            </div>
          )}

          {/* Products Grid */}
          {!loading && products.length > 0 && (
            <>
              <div className="products-grid">
                {products.map(product => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onViewDetails={onProductSelect}
                    onAddToCart={(p) => console.log('Add to cart:', p)}
                    onAddToWishlist={(id) => console.log('Add to wishlist:', id)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-btn"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    ← Previous
                  </button>

                  <div className="page-info">
                    Page {page} of {totalPages}
                  </div>

                  <button
                    className="pagination-btn"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default SearchResults;
