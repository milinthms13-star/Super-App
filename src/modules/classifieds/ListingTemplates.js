import React, { useState, useMemo } from 'react';

const ListingTemplates = ({ 
  currentListing = {}, 
  onApplyTemplate, 
  onSaveTemplate,
  onDeleteTemplate,
  savedTemplates = [],
  onClose 
}) => {
  const [templates, setTemplates] = useState(savedTemplates);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates.filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'uses') {
      filtered.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    }

    return filtered;
  }, [templates, searchQuery, sortBy]);

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    const newTemplate = {
      id: Date.now(),
      name: templateName,
      description: templateDescription,
      data: {
        title: currentListing.title || '',
        category: currentListing.category || '',
        condition: currentListing.condition || '',
        description: currentListing.description || '',
        price: currentListing.price || '',
        location: currentListing.location || '',
        tags: currentListing.tags || [],
      },
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };

    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);

    if (onSaveTemplate) {
      onSaveTemplate(newTemplate);
    }

    setTemplateName('');
    setTemplateDescription('');
    setShowSaveForm(false);
  };

  const handleApplyTemplate = (template) => {
    if (onApplyTemplate) {
      const updatedTemplate = {
        ...template,
        usageCount: (template.usageCount || 0) + 1,
      };
      onApplyTemplate(updatedTemplate.data);
      
      // Update local templates with new usage count
      setTemplates(prev =>
        prev.map(t => t.id === template.id ? updatedTemplate : t)
      );
    }
  };

  const handleDeleteTemplate = (templateId) => {
    setDeleteTargetId(templateId);
    setShowConfirmDelete(true);
  };

  const confirmDelete = () => {
    setTemplates(prev => prev.filter(t => t.id !== deleteTargetId));
    if (onDeleteTemplate) {
      onDeleteTemplate(deleteTargetId);
    }
    setShowConfirmDelete(false);
    setDeleteTargetId(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="listing-templates-modal">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="templates-header">
          <h2>📋 Listing Templates</h2>
          <p>Save and reuse listing details to speed up creating new listings</p>
        </div>

        {!showSaveForm ? (
          <>
            {/* Templates Controls */}
            <div className="templates-controls">
              <div className="search-wrapper">
                <input
                  type="text"
                  className="templates-search"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="templates-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name (A-Z)</option>
                <option value="uses">Most Used</option>
              </select>

              <button
                className="save-new-template-btn"
                onClick={() => setShowSaveForm(true)}
              >
                + Save Current as Template
              </button>
            </div>

            {/* Templates List */}
            <div className="templates-list">
              {filteredTemplates.length === 0 ? (
                <div className="templates-empty">
                  <p className="empty-icon">📭</p>
                  <h4>No templates yet</h4>
                  <p>
                    {templates.length === 0
                      ? 'Create your first template to get started'
                      : 'No templates match your search'}
                  </p>
                  {templates.length === 0 && (
                    <button
                      className="create-first-template-btn"
                      onClick={() => setShowSaveForm(true)}
                    >
                      Create First Template
                    </button>
                  )}
                </div>
              ) : (
                filteredTemplates.map(template => (
                  <div
                    key={template.id}
                    className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="template-card-header">
                      <h4>{template.name}</h4>
                      <span className="usage-badge">{template.usageCount || 0} uses</span>
                    </div>

                    {template.description && (
                      <p className="template-description">{template.description}</p>
                    )}

                    <div className="template-preview">
                      {template.data.title && (
                        <div className="preview-item">
                          <span className="preview-label">Title:</span>
                          <span className="preview-value">{template.data.title}</span>
                        </div>
                      )}
                      {template.data.category && (
                        <div className="preview-item">
                          <span className="preview-label">Category:</span>
                          <span className="preview-value">{template.data.category}</span>
                        </div>
                      )}
                      {template.data.price && (
                        <div className="preview-item">
                          <span className="preview-label">Price:</span>
                          <span className="preview-value">₹{template.data.price}</span>
                        </div>
                      )}
                    </div>

                    <div className="template-meta">
                      <span className="created-date">
                        Created {formatDate(template.createdAt)}
                      </span>
                    </div>

                    <div className="template-actions">
                      <button
                        className="template-apply-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyTemplate(template);
                        }}
                      >
                        Apply Template
                      </button>
                      <button
                        className="template-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          // Save Template Form
          <div className="save-template-form">
            <button
              className="back-btn"
              onClick={() => setShowSaveForm(false)}
            >
              ← Back to Templates
            </button>

            <h3>Save as Template</h3>

            <div className="form-field">
              <label htmlFor="template-name">Template Name *</label>
              <input
                id="template-name"
                type="text"
                className="form-input"
                placeholder="e.g., Electronics - Used"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-field">
              <label htmlFor="template-desc">Description</label>
              <textarea
                id="template-desc"
                className="form-textarea"
                placeholder="Describe when to use this template..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={4}
              />
            </div>

            {/* Preview of data to be saved */}
            <div className="template-data-preview">
              <h4>Data to Save:</h4>
              <div className="preview-grid">
                {currentListing.title && (
                  <div className="preview-item">
                    <span className="label">Title:</span>
                    <span className="value">{currentListing.title}</span>
                  </div>
                )}
                {currentListing.category && (
                  <div className="preview-item">
                    <span className="label">Category:</span>
                    <span className="value">{currentListing.category}</span>
                  </div>
                )}
                {currentListing.condition && (
                  <div className="preview-item">
                    <span className="label">Condition:</span>
                    <span className="value">{currentListing.condition}</span>
                  </div>
                )}
                {currentListing.price && (
                  <div className="preview-item">
                    <span className="label">Price:</span>
                    <span className="value">₹{currentListing.price}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowSaveForm(false)}
              >
                Cancel
              </button>
              <button
                className="save-btn"
                onClick={handleSaveTemplate}
              >
                Save Template
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showConfirmDelete && (
          <div className="confirm-overlay">
            <div className="confirm-modal">
              <h3>Delete Template?</h3>
              <p>This action cannot be undone.</p>
              <div className="confirm-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowConfirmDelete(false)}
                >
                  Cancel
                </button>
                <button
                  className="delete-confirm-btn"
                  onClick={confirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListingTemplates;
