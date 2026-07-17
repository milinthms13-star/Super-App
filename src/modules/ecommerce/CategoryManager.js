/**
 * Category Manager Component
 * Admin interface for managing product categories
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../../contexts/AppContext';
import { API_BASE_URL } from '../../utils/api';
import '../../styles/CategoryManager.css';

const CategoryManager = () => {
  const { currentUser } = useApp();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' or 'edit'
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    color: '#3498db',
    parentCategory: null,
    isFeatured: false,
    metaTitle: '',
    metaDescription: '',
  });

  useEffect(() => {
    if (currentUser) {
      fetchCategories();
    }
  }, [currentUser]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [treeRes, allRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/ecommerce/categories/tree`, { headers }),
        axios.get(`${API_BASE_URL}/ecommerce/categories`, { headers }),
      ]);

      setCategoryTree(treeRes.data.tree || []);
      setCategories(allRes.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    try {
      const token = localStorage.getItem('authToken');

      const response = await axios.post(
        `${API_BASE_URL}/ecommerce/categories`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        alert('Category created successfully!');
        setShowForm(false);
        resetForm();
        fetchCategories();
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdateCategory = async () => {
    try {
      const token = localStorage.getItem('authToken');

      const response = await axios.put(
        `${API_BASE_URL}/ecommerce/categories/${selectedCategory._id}`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        alert('Category updated successfully!');
        setShowForm(false);
        resetForm();
        fetchCategories();
      }
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');

      const response = await axios.delete(
        `${API_BASE_URL}/ecommerce/categories/${categoryId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        alert('Category deleted successfully!');
        fetchCategories();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleToggleFeatured = async (categoryId) => {
    try {
      const token = localStorage.getItem('authToken');

      const response = await axios.post(
        `${API_BASE_URL}/ecommerce/categories/${categoryId}/toggle-featured`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        fetchCategories();
      }
    } catch (error) {
      console.error('Error toggling featured:', error);
      alert('Failed to toggle featured status');
    }
  };

  const handleEditCategory = (category) => {
    setSelectedCategory(category);
    setFormMode('edit');
    setFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      color: category.color || '#3498db',
      parentCategory: category.parentCategory || null,
      isFeatured: category.isFeatured || false,
      metaTitle: category.metaTitle || '',
      metaDescription: category.metaDescription || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: '',
      color: '#3498db',
      parentCategory: null,
      isFeatured: false,
      metaTitle: '',
      metaDescription: '',
    });
    setSelectedCategory(null);
    setFormMode('create');
  };

  const renderCategoryTree = (nodes, level = 0) => {
    return nodes.map((node) => (
      <div key={node._id} className={`category-node level-${level}`}>
        <div className="category-item">
          <div className="category-info">
            <span className="category-icon">{node.icon || '📁'}</span>
            <span className="category-name">{node.name}</span>
            {node.isFeatured && <span className="featured-badge">⭐ Featured</span>}
            <span className="product-count">{node.stats?.productCount || 0} products</span>
          </div>
          <div className="category-actions">
            <button
              className="btn-icon"
              onClick={() => handleToggleFeatured(node._id)}
              title="Toggle Featured"
            >
              {node.isFeatured ? '⭐' : '☆'}
            </button>
            <button
              className="btn-icon"
              onClick={() => handleEditCategory(node)}
              title="Edit"
            >
              ✏️
            </button>
            <button
              className="btn-icon danger"
              onClick={() => handleDeleteCategory(node._id)}
              title="Delete"
            >
              🗑️
            </button>
          </div>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="category-children">
            {renderCategoryTree(node.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="category-loading">
        <div className="spinner"></div>
        <p>Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="category-manager">
      <div className="manager-header">
        <h1>📁 Category Management</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          ➕ Add Category
        </button>
      </div>

      <div className="categories-container">
        <div className="category-tree">
          <h3>Category Hierarchy</h3>
          {categoryTree.length === 0 ? (
            <p className="no-categories">No categories available. Create one to get started.</p>
          ) : (
            renderCategoryTree(categoryTree)
          )}
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{formMode === 'create' ? 'Create New Category' : 'Edit Category'}</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Electronics"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the category"
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Icon (Emoji)</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="📱"
                  />
                </div>

                <div className="form-group">
                  <label>Color</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Parent Category</label>
                <select
                  value={formData.parentCategory || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      parentCategory: e.target.value || null,
                    })
                  }
                >
                  <option value="">None (Top Level)</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  />
                  Featured Category
                </label>
              </div>

              <div className="form-group">
                <label>Meta Title (SEO)</label>
                <input
                  type="text"
                  value={formData.metaTitle}
                  onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                  placeholder="SEO-friendly title"
                />
              </div>

              <div className="form-group">
                <label>Meta Description (SEO)</label>
                <textarea
                  value={formData.metaDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, metaDescription: e.target.value })
                  }
                  placeholder="SEO description"
                  rows="2"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={formMode === 'create' ? handleCreateCategory : handleUpdateCategory}
              >
                {formMode === 'create' ? 'Create' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;
