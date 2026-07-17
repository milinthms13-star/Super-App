import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/ProductListing.css';

const ProductListing = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    images: [],
    variants: [],
    stock: '',
    sku: '',
    status: 'draft',
    seo: {
      metaTitle: '',
      metaDescription: '',
      keywords: []
    }
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [variantForm, setVariantForm] = useState({
    name: '',
    price: '',
    stock: '',
    sku: ''
  });
  const [seoSuggestions, setSeoSuggestions] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchTemplates();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/products/listing/my-products', {
        params: filters
      });
      setProducts(response.data.products);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Failed to fetch products');
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

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/products/listing/templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Upload images first if any
      let imageUrls = [];
      if (imageFiles.length > 0) {
        const formDataImages = new FormData();
        imageFiles.forEach(file => {
          formDataImages.append('images', file);
        });
        
        // Create product first to get ID for image upload
        const productResponse = await axios.post('/api/products/listing/create', {
          ...formData,
          images: []
        });
        
        const productId = productResponse.data.product._id;
        
        // Upload images
        const imageResponse = await axios.post(
          `/api/products/listing/${productId}/images/upload`,
          formDataImages,
          {
            headers: { 'Content-Type': 'multipart/form-data' }
          }
        );
        
        alert('Product created successfully!');
        setShowCreateModal(false);
        resetForm();
        fetchProducts();
        return;
      }

      const response = await axios.post('/api/products/listing/create', formData);
      alert('Product created successfully!');
      setShowCreateModal(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error creating product:', error);
      alert(error.response?.data?.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.put(`/api/products/listing/${editingProduct._id}`, formData);
      alert('Product updated successfully!');
      setEditingProduct(null);
      setShowCreateModal(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      alert(error.response?.data?.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishProduct = async (productId) => {
    try {
      await axios.post(`/api/products/listing/${productId}/publish`);
      alert('Product published successfully!');
      fetchProducts();
    } catch (error) {
      console.error('Error publishing product:', error);
      alert(error.response?.data?.message || 'Failed to publish product');
    }
  };

  const handleUnpublishProduct = async (productId) => {
    try {
      await axios.post(`/api/products/listing/${productId}/unpublish`);
      alert('Product unpublished successfully!');
      fetchProducts();
    } catch (error) {
      console.error('Error unpublishing product:', error);
      alert(error.response?.data?.message || 'Failed to unpublish product');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await axios.delete(`/api/products/listing/${productId}`);
      alert('Product deleted successfully!');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleDuplicateProduct = async (productId) => {
    try {
      await axios.post(`/api/products/listing/${productId}/duplicate`);
      alert('Product duplicated successfully!');
      fetchProducts();
    } catch (error) {
      console.error('Error duplicating product:', error);
      alert(error.response?.data?.message || 'Failed to duplicate product');
    }
  };

  const handleBulkPublish = async () => {
    if (selectedProducts.length === 0) {
      alert('Please select products to publish');
      return;
    }
    
    try {
      const response = await axios.post('/api/products/listing/bulk/publish', {
        productIds: selectedProducts
      });
      alert(response.data.message);
      setSelectedProducts([]);
      fetchProducts();
    } catch (error) {
      console.error('Error bulk publishing:', error);
      alert('Failed to publish products');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) {
      alert('Please select products to delete');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) return;
    
    try {
      const response = await axios.post('/api/products/listing/bulk/delete', {
        productIds: selectedProducts
      });
      alert(response.data.message);
      setSelectedProducts([]);
      fetchProducts();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      alert('Failed to delete products');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category?._id || '',
      images: product.images || [],
      variants: product.variants || [],
      stock: product.stock || '',
      sku: product.sku || '',
      status: product.status,
      seo: product.seo || {
        metaTitle: '',
        metaDescription: '',
        keywords: []
      }
    });
    setShowCreateModal(true);
  };

  const handleSaveAsTemplate = async () => {
    const templateName = prompt('Enter template name:');
    if (!templateName) return;

    try {
      await axios.post('/api/products/listing/templates/create', {
        templateName,
        productData: formData
      });
      alert('Template saved successfully!');
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    }
  };

  const handleUseTemplate = async (templateId) => {
    try {
      const response = await axios.post(`/api/products/listing/templates/${templateId}/use`);
      alert('Product created from template!');
      setShowTemplateModal(false);
      fetchProducts();
    } catch (error) {
      console.error('Error using template:', error);
      alert(error.response?.data?.message || 'Failed to create product from template');
    }
  };

  const handleAddVariant = () => {
    if (!variantForm.name || !variantForm.price) {
      alert('Please fill variant name and price');
      return;
    }

    setFormData({
      ...formData,
      variants: [...formData.variants, { ...variantForm, _id: Date.now() }]
    });
    setVariantForm({ name: '', price: '', stock: '', sku: '' });
  };

  const handleRemoveVariant = (variantId) => {
    setFormData({
      ...formData,
      variants: formData.variants.filter(v => v._id !== variantId)
    });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles([...imageFiles, ...files]);
  };

  const handleRemoveImage = (index) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
  };

  const fetchSEOSuggestions = async (productId) => {
    try {
      const response = await axios.get(`/api/products/listing/${productId}/seo/suggestions`);
      setSeoSuggestions(response.data.suggestions);
    } catch (error) {
      console.error('Error fetching SEO suggestions:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      images: [],
      variants: [],
      stock: '',
      sku: '',
      status: 'draft',
      seo: {
        metaTitle: '',
        metaDescription: '',
        keywords: []
      }
    });
    setImageFiles([]);
    setEditingProduct(null);
  };

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAllProducts = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p._id));
    }
  };

  return (
    <div className="product-listing-container">
      <div className="product-listing-header">
        <h2>Product Management</h2>
        <div className="header-actions">
          <button onClick={() => setShowTemplateModal(true)} className="btn-secondary">
            <i className="icon-template"></i> Templates
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <i className="icon-plus"></i> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="product-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search products..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="filter-group">
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            className="filter-select"
          >
            <option value="createdAt">Created Date</option>
            <option value="updatedAt">Updated Date</option>
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="stock">Stock</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <div className="bulk-actions">
          <span>{selectedProducts.length} selected</span>
          <button onClick={handleBulkPublish} className="btn-secondary">
            Publish Selected
          </button>
          <button onClick={handleBulkDelete} className="btn-danger">
            Delete Selected
          </button>
        </div>
      )}

      {/* Products Table */}
      <div className="products-table-container">
        {loading ? (
          <div className="loading">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <p>No products found</p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              Create Your First Product
            </button>
          </div>
        ) : (
          <table className="products-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === products.length}
                    onChange={selectAllProducts}
                  />
                </th>
                <th>Image</th>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product._id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product._id)}
                      onChange={() => toggleProductSelection(product._id)}
                    />
                  </td>
                  <td>
                    {product.images && product.images.length > 0 ? (
                      <img src={product.images[0]} alt={product.name} className="product-thumb" />
                    ) : (
                      <div className="no-image">No Image</div>
                    )}
                  </td>
                  <td>
                    <div className="product-info">
                      <div className="product-name">{product.name}</div>
                      <div className="product-sku">SKU: {product.sku}</div>
                    </div>
                  </td>
                  <td>{product.category?.name || 'N/A'}</td>
                  <td>₹{product.price?.toLocaleString()}</td>
                  <td>
                    <span className={`stock-badge ${product.stock < 10 ? 'low-stock' : ''}`}>
                      {product.stock || 0}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${product.status}`}>
                      {product.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="btn-icon"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      {product.status === 'draft' ? (
                        <button
                          onClick={() => handlePublishProduct(product._id)}
                          className="btn-icon"
                          title="Publish"
                        >
                          🚀
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnpublishProduct(product._id)}
                          className="btn-icon"
                          title="Unpublish"
                        >
                          📥
                        </button>
                      )}
                      <button
                        onClick={() => handleDuplicateProduct(product._id)}
                        className="btn-icon"
                        title="Duplicate"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="btn-icon btn-danger"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination">
          <button
            disabled={pagination.page === 1}
            onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            disabled={pagination.page === pagination.pages}
            onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
          >
            Next
          </button>
        </div>
      )}

      {/* Create/Edit Product Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProduct ? 'Edit Product' : 'Create New Product'}</h3>
              <button onClick={() => setShowCreateModal(false)} className="close-btn">×</button>
            </div>

            <form onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}>
              <div className="form-tabs">
                <button type="button" className="tab-btn active">Basic Info</button>
                <button type="button" className="tab-btn">Images</button>
                <button type="button" className="tab-btn">Variants</button>
                <button type="button" className="tab-btn">SEO</button>
              </div>

              <div className="form-section">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="4"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Price (₹) *</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Stock *</label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>SKU</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Image Upload Section */}
                <div className="form-group">
                  <label>Product Images</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <div className="image-preview-grid">
                    {imageFiles.map((file, index) => (
                      <div key={index} className="image-preview-item">
                        <img src={URL.createObjectURL(file)} alt={`Preview ${index}`} />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="remove-image-btn"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Variants Section */}
                <div className="variants-section">
                  <h4>Product Variants</h4>
                  <div className="variant-form">
                    <input
                      type="text"
                      placeholder="Variant Name (e.g., Size: Large)"
                      value={variantForm.name}
                      onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={variantForm.price}
                      onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })}
                    />
                    <input
                      type="number"
                      placeholder="Stock"
                      value={variantForm.stock}
                      onChange={(e) => setVariantForm({ ...variantForm, stock: e.target.value })}
                    />
                    <button type="button" onClick={handleAddVariant} className="btn-secondary">
                      Add Variant
                    </button>
                  </div>
                  <div className="variants-list">
                    {formData.variants.map(variant => (
                      <div key={variant._id} className="variant-item">
                        <span>{variant.name} - ₹{variant.price}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(variant._id)}
                          className="btn-danger-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SEO Section */}
                <div className="seo-section">
                  <h4>SEO Optimization</h4>
                  <div className="form-group">
                    <label>Meta Title</label>
                    <input
                      type="text"
                      value={formData.seo.metaTitle}
                      onChange={(e) => setFormData({
                        ...formData,
                        seo: { ...formData.seo, metaTitle: e.target.value }
                      })}
                      placeholder="Product name - Your Store"
                    />
                  </div>
                  <div className="form-group">
                    <label>Meta Description</label>
                    <textarea
                      value={formData.seo.metaDescription}
                      onChange={(e) => setFormData({
                        ...formData,
                        seo: { ...formData.seo, metaDescription: e.target.value }
                      })}
                      rows="3"
                      placeholder="Brief description for search engines"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={handleSaveAsTemplate} className="btn-secondary">
                  Save as Template
                </button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplateModal && (
        <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Product Templates</h3>
              <button onClick={() => setShowTemplateModal(false)} className="close-btn">×</button>
            </div>

            <div className="templates-list">
              {templates.length === 0 ? (
                <p>No templates saved yet</p>
              ) : (
                templates.map(template => (
                  <div key={template._id} className="template-item">
                    <h4>{template.name}</h4>
                    <p>Created: {new Date(template.createdAt).toLocaleDateString()}</p>
                    <button
                      onClick={() => handleUseTemplate(template._id)}
                      className="btn-primary-sm"
                    >
                      Use Template
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductListing;
