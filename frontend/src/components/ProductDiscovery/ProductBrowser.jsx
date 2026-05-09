import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProductCard from './ProductCard';
import './ProductBrowser.css';

const ProductBrowser = ({ category = null, onProductSelect }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch products when category or page changes
  useEffect(() => {
    if (selectedCategory) {
      fetchProductsByCategory();
    }
  }, [selectedCategory, page]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/products/browse/categories');
      setCategories(response.data.data || []);
      
      // Set first category as default if no category provided
      if (!selectedCategory && response.data.data?.length > 0) {
        setSelectedCategory(response.data.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProductsByCategory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/products/browse/category/${selectedCategory}`,
        { params: { page, limit: 20 } }
      );

      setProducts(response.data.products);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setPage(1); // Reset to first page
  };

  return (
    <div className="product-browser">
      {/* Categories Sidebar */}
      <aside className="categories-sidebar">
        <h3 className="categories-title">Categories</h3>
        <div className="categories-list">
          {categories.map(cat => (
            <button
              key={cat._id}
              className={`category-btn ${selectedCategory === cat._id ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat._id)}
            >
              <span className="category-name">{cat._id}</span>
              <span className="category-count">({cat.count})</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Products Grid */}
      <main className="browser-main">
        <div className="browser-header">
          <h2 className="browser-title">{selectedCategory}</h2>
          <p className="browser-subtitle">Browse our collection</p>
        </div>

        {loading && <div className="loading">Loading products...</div>}

        {!loading && products.length === 0 && (
          <div className="no-products">
            <p>No products found in this category</p>
          </div>
        )}

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
  );
};

export default ProductBrowser;
