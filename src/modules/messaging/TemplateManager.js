import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TemplateManager.css';

const TemplateManager = ({ onClose, onSelectTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'new'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // New template form
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [templateCategory, setTemplateCategory] = useState('general');
  const [templateVariables, setTemplateVariables] = useState([]);

  const categories = ['general', 'business', 'personal', 'greetings', 'support', 'sales'];

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, selectedCategory, searchQuery]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/messaging/v5/templates', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTemplates(response.data.templates || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.content.toLowerCase().includes(query)
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();

    if (!templateName.trim() || !templateContent.trim()) {
      setError('Name and content are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/messaging/v5/templates', {
        name: templateName,
        content: templateContent,
        category: templateCategory,
        variables: templateVariables
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        setTemplateName('');
        setTemplateContent('');
        setTemplateCategory('general');
        setTemplateVariables([]);
        setActiveTab('all');
        fetchTemplates();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTemplate = async (templateId, updates) => {
    setLoading(true);
    setError('');

    try {
      await axios.put(`/api/messaging/v5/templates/${templateId}`, updates, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchTemplates();
    } catch (err) {
      setError('Failed to update template');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Delete this template?')) return;

    setLoading(true);
    setError('');

    try {
      await axios.delete(`/api/messaging/v5/templates/${templateId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchTemplates();
    } catch (err) {
      setError('Failed to delete template');
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = (template) => {
    if (onSelectTemplate) {
      onSelectTemplate(template.content);
    }
    onClose();
  };

  const extractVariables = (content) => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [...content.matchAll(regex)];
    return [...new Set(matches.map(m => m[1]))];
  };

  const handleContentChange = (content) => {
    setTemplateContent(content);
    setTemplateVariables(extractVariables(content));
  };

  const getCategoryIcon = (category) => {
    const icons = {
      general: '📋',
      business: '💼',
      personal: '👤',
      greetings: '👋',
      support: '🎧',
      sales: '💰'
    };
    return icons[category] || '📋';
  };

  return (
    <div className="template-manager-modal">
      <div className="template-manager-container">
        <div className="template-header">
          <h2>📝 Message Templates</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="template-tabs">
          <button 
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            My Templates ({templates.length})
          </button>
          <button 
            className={`tab ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            Create New
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {activeTab === 'all' ? (
          <div className="templates-content">
            <div className="templates-toolbar">
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="category-filter"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {getCategoryIcon(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="templates-list">
              {loading && templates.length === 0 ? (
                <div className="loading-state">Loading templates...</div>
              ) : filteredTemplates.length === 0 ? (
                <div className="empty-state">
                  <p>📝 No templates found</p>
                  <p className="sub-text">
                    {searchQuery || selectedCategory !== 'all' 
                      ? 'Try adjusting your filters' 
                      : 'Create your first template to get started'}
                  </p>
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <div key={template._id} className="template-item">
                    <div className="template-icon">
                      {getCategoryIcon(template.category)}
                    </div>
                    <div className="template-details">
                      <h3>{template.name}</h3>
                      <p className="template-content">{template.content}</p>
                      <div className="template-meta">
                        <span className="category-badge">{template.category}</span>
                        {template.variables && template.variables.length > 0 && (
                          <span className="variables-badge">
                            Variables: {template.variables.join(', ')}
                          </span>
                        )}
                        <span className="usage-count">
                          Used {template.usageCount || 0} times
                        </span>
                      </div>
                    </div>
                    <div className="template-actions">
                      <button 
                        onClick={() => handleUseTemplate(template)}
                        className="btn-use"
                        title="Use Template"
                      >
                        📤
                      </button>
                      <button 
                        onClick={() => handleDeleteTemplate(template._id)}
                        className="btn-delete"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateTemplate} className="template-form">
            <div className="form-group">
              <label>Template Name *</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Welcome Message"
                maxLength="100"
                required
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select 
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                required
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {getCategoryIcon(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Template Content *</label>
              <textarea
                value={templateContent}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Type your template message here... Use {{variable}} for dynamic content"
                rows="6"
                maxLength="1000"
                required
              />
              <span className="char-count">{templateContent.length}/1000</span>
            </div>

            {templateVariables.length > 0 && (
              <div className="variables-info">
                <h4>Detected Variables:</h4>
                <div className="variables-list">
                  {templateVariables.map((variable, idx) => (
                    <span key={idx} className="variable-tag">
                      {`{{${variable}}}`}
                    </span>
                  ))}
                </div>
                <p className="info-text">
                  These placeholders will be replaced with actual values when you use the template
                </p>
              </div>
            )}

            <div className="template-example">
              <h4>Example:</h4>
              <p>Hello {{name}}, welcome to {{company}}! Your order {{orderId}} is confirmed.</p>
              <p className="example-note">
                Variables like {{name}}, {{company}}, {{orderId}} will be filled in when sending
              </p>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => setActiveTab('all')}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="btn-create"
              >
                {loading ? 'Creating...' : 'Create Template'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default TemplateManager;
