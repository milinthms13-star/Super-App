import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/Marketplace.css';

const Marketplace = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    search: '',
    sortBy: 'newest',
    page: 1,
    limit: 24,
    inStock: true
  });
  const [pagination, setPagination] = useState({});
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [showFilters, setShowFilters] = useState(true);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
  const [wishlist, setWishlist] = useState([]);
  const [compareList, setCompareList] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchWishlist();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/marketplace/products', {
        params: filters
      });
      setProducts(response.data.products);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/ecommerce/categories');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchWishlist = async () => {
    try {
      const response = await axios.get('/api/marketplace/wishlist');
      setWishlist(response.data.products.map(p => p._id));
    } catch (error) {
      // User not logged in or error
      setWishlist([]);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters({ ...filters, page: 1 });
    fetchProducts();
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      minPrice: '',
      maxPrice: '',
      search: '',
      sortBy: 'newest',
      page: 1,
      limit: 24,
      inStock: true
    });
  };

  const toggleWishlist = async (productId) => {
    try {
      if (wishlist.includes(productId)) {
        await axios.post('/api/marketplace/wishlist/remove', { productId });
        setWishlist(wishlist.filter(id => id !== productId));
      } else {
        await axios.post('/api/marketplace/wishlist/add', { productId });
        setWishlist([...wishlist, productId]);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      alert(error.response?.data?.message || 'Please login to add to wishlist');
    }
  };

  const toggleCompare = (product) => {
    if (compareList.find(p => p._id === product._id)) {
      setCompareList(compareList.filter(p => p._id !== product._id));
    } else {
      if (compareList.length >= 4) {
        alert('You can compare up to 4 products at a time');
        return;
      }
      setCompareList([...compareList, product]);
    }
  };

  const ProductCard = ({ product }) => (
    <div className={`product-card ${viewMode}`}>
      <div className="product-image-container">
        <img
          src={product.images?.[0] || '/placeholder.jpg'}
          alt={product.name}
          className="product-image"
          onClick={() => window.location.href = `/product/${product._id}`}
        />
        <div className="product-badges">
          {product.featured && <span className="badge-featured">Featured</span>}
          {product.stock < 10 && product.stock > 0 && (
            <span className="badge-low-stock">Only {product.stock} left</span>
          )}
          {product.stock === 0 && <span className="badge-out-of-stock">Out of Stock</span>}
        </div>
        <div className="product-actions">
          <button
            className={`action-btn ${wishlist.includes(product._id) ? 'active' : ''}`}
            onClick={() => toggleWishlist(product._id)}
            title="Add to Wishlist"
          >
            ❤️
          </button>
          <button
            className={`action-btn ${compareList.find(p => p._id === product._id) ? 'active' : ''}`}
            onClick={() => toggleCompare(product)}
            title="Add to Compare"
          >
            ⚖️
          </button>
        </div>
      </div>

      <div className="product-details">
        <div className="product-category">{product.category?.name}</div>
        <h3 className="product-name">{product.name}</h3>
        
        <div className="product-seller">
          <span className="seller-icon">🏪</span>
          <span className="seller-name">{product.sellerProfile?.businessName}</span>
          {product.sellerProfile?.rating && (
            <span className="seller-rating">
              ⭐ {product.sellerProfile.rating.toFixed(1)}
            </span>
          )}
        </div>

        <div className="product-price">
          <span className="price">₹{product.price?.toLocaleString()}</span>
          {product.originalPrice && product.originalPrice > product.price && (
            <>
              <span className="original-price">₹{product.originalPrice.toLocaleString()}</span>
              <span className="discount">
                {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
              </span>
            </>
          )}
        </div>

        <div className="product-footer">
          <button
            className="btn-add-to-cart"
            disabled={product.stock === 0}
            onClick={() => window.location.href = `/product/${product._id}`}
          >
            {product.stock === 0 ? 'Out of Stock' : 'View Details'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="marketplace-container">
      {/* Header */}
      <div className="marketplace-header">
        <h1>Marketplace</h1>
        <div className="header-actions">
          <div className="search-bar">
            <form onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search products..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
              <button type="submit">🔍</button>
            </form>
          </div>
          <button
            className="btn-wishlist"
            onClick={() => window.location.href = '/wishlist'}
          >
            ❤️ Wishlist ({wishlist.length})
          </button>
        </div>
      </div>

      <div className="marketplace-content">
        {/* Sidebar Filters */}
        <aside className={`filters-sidebar ${showFilters ? 'open' : 'closed'}`}>
          <div className="filters-header">
            <h3>Filters</h3>
            <button onClick={clearFilters} className="btn-clear-filters">
              Clear All
            </button>
          </div>

          <div className="filter-section">
            <h4>Category</h4>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="filter-select"
            >
              <option value="">All Categories</option>
              {categories.filter(cat => !cat.parentCategory).map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-section">
            <h4>Price Range</h4>
            <div className="price-inputs">
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              />
              <span>to</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              />
            </div>
          </div>

          <div className="filter-section">
            <h4>Availability</h4>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.inStock}
                onChange={(e) => handleFilterChange('inStock', e.target.checked)}
              />
              In Stock Only
            </label>
          </div>

          <div className="filter-section">
            <h4>Sort By</h4>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="filter-select"
            >
              <option value="newest">Newest First</option>
              <option value="popularity">Popularity</option>
              <option value="price">Price: Low to High</option>
              <option value="name">Name: A to Z</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </aside>

        {/* Products Grid */}
        <main className="products-section">
          <div className="products-toolbar">
            <div className="toolbar-left">
              <button
                className="btn-toggle-filters"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? '◀ Hide' : '▶ Show'} Filters
              </button>
              <span className="results-count">
                {pagination.total || 0} Products Found
              </span>
            </div>

            <div className="toolbar-right">
              <div className="view-mode-toggle">
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                >
                  ▦
                </button>
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List View"
                >
                  ☰
                </button>
              </div>
            </div>
          </div>

          {compareList.length > 0 && (
            <div className="compare-bar">
              <span>Compare: {compareList.length} products selected</span>
              <button
                onClick={() => setShowCompareModal(true)}
                className="btn-compare"
              >
                Compare Now
              </button>
              <button
                onClick={() => setCompareList([])}
                className="btn-clear-compare"
              >
                Clear
              </button>
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>No Products Found</h3>
              <p>Try adjusting your filters or search terms</p>
              <button onClick={clearFilters} className="btn-primary">
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className={`products-${viewMode}`}>
                {products.map(product => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="pagination">
                  <button
                    disabled={pagination.page === 1}
                    onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
                    className="pagination-btn"
                  >
                    Previous
                  </button>
                  
                  <div className="pagination-pages">
                    {[...Array(Math.min(pagination.pages, 5))].map((_, i) => {
                      const pageNum = pagination.page <= 3
                        ? i + 1
                        : pagination.page >= pagination.pages - 2
                        ? pagination.pages - 4 + i
                        : pagination.page - 2 + i;
                      
                      if (pageNum < 1 || pageNum > pagination.pages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          className={`pagination-btn ${pageNum === pagination.page ? 'active' : ''}`}
                          onClick={() => setFilters({ ...filters, page: pageNum })}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    disabled={pagination.page === pagination.pages}
                    onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                    className="pagination-btn"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Compare Modal */}
      {showCompareModal && (
        <div className="modal-overlay" onClick={() => setShowCompareModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Compare Products</h3>
              <button onClick={() => setShowCompareModal(false)} className="close-btn">×</button>
            </div>

            <div className="compare-table-container">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    {compareList.map(product => (
                      <th key={product._id}>
                        <img src={product.images?.[0]} alt={product.name} />
                        <div className="compare-product-name">{product.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="compare-label">Price</td>
                    {compareList.map(product => (
                      <td key={product._id}>₹{product.price?.toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="compare-label">Category</td>
                    {compareList.map(product => (
                      <td key={product._id}>{product.category?.name}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="compare-label">Seller</td>
                    {compareList.map(product => (
                      <td key={product._id}>{product.sellerProfile?.businessName}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="compare-label">Rating</td>
                    {compareList.map(product => (
                      <td key={product._id}>
                        ⭐ {product.sellerProfile?.rating?.toFixed(1) || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="compare-label">Stock</td>
                    {compareList.map(product => (
                      <td key={product._id}>
                        {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="compare-label">Action</td>
                    {compareList.map(product => (
                      <td key={product._id}>
                        <button
                          className="btn-primary-sm"
                          onClick={() => window.location.href = `/product/${product._id}`}
                        >
                          View Details
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
