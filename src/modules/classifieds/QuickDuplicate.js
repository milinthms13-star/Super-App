import React, { useState } from 'react';

const QuickDuplicate = ({
  selectedListing = {},
  allListings = [],
  onDuplicate,
  onClose,
}) => {
  const [duplicateData, setDuplicateData] = useState({
    title: selectedListing.title || '',
    category: selectedListing.category || '',
    price: selectedListing.price || '',
    condition: selectedListing.condition || '',
    description: selectedListing.description || '',
    location: selectedListing.location || '',
    tags: selectedListing.tags || [],
  });

  const [modifications, setModifications] = useState({
    title: '',
    priceAdjustment: 0,
    priceAdjustmentType: 'fixed',
    changeLocation: false,
    newLocation: '',
  });

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addToCollection, setAddToCollection] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get suggestions for similar listings
  const similarListings = allListings
    .filter(l => l.category === selectedListing.category && l.id !== selectedListing.id)
    .slice(0, 3);

  const handleModifyTitle = (newTitle) => {
    setModifications(prev => ({ ...prev, title: newTitle }));
    const finalTitle = newTitle || selectedListing.title;
    setDuplicateData(prev => ({ ...prev, title: finalTitle }));
  };

  const handleAdjustPrice = (adjustment, type) => {
    setModifications(prev => ({
      ...prev,
      priceAdjustment: adjustment,
      priceAdjustmentType: type,
    }));

    let newPrice = parseFloat(selectedListing.price) || 0;
    if (type === 'fixed') {
      newPrice += parseFloat(adjustment);
    } else {
      newPrice = newPrice * (1 + parseFloat(adjustment) / 100);
    }

    setDuplicateData(prev => ({
      ...prev,
      price: Math.max(0, newPrice),
    }));
  };

  const handleChangeLocation = (newLocation) => {
    setModifications(prev => ({ ...prev, newLocation }));
    setDuplicateData(prev => ({
      ...prev,
      location: newLocation || selectedListing.location,
    }));
  };

  const handleDuplicate = () => {
    const duplicates = [];

    for (let i = 0; i < quantity; i++) {
      const duplicate = {
        ...duplicateData,
        id: `${selectedListing.id}-duplicate-${Date.now()}-${i}`,
        sourceListingId: selectedListing.id,
        createdAt: new Date().toISOString(),
        isDuplicate: true,
        duplicateOf: selectedListing.title,
      };

      duplicates.push(duplicate);
    }

    if (onDuplicate) {
      onDuplicate(duplicates, { addToCollection });
    }
  };

  const applyTemplate = (template) => {
    setSelectedTemplate(template);
    setDuplicateData(prev => ({
      ...prev,
      ...template.data,
    }));
    setModifications({
      title: '',
      priceAdjustment: 0,
      priceAdjustmentType: 'fixed',
      changeLocation: false,
      newLocation: '',
    });
  };

  const presetModifications = [
    {
      name: 'Minor Price Increase',
      priceAdjustment: 500,
      type: 'fixed',
      description: 'Add ₹500 to original price',
    },
    {
      name: 'Seasonal Discount',
      priceAdjustment: -15,
      type: 'percentage',
      description: 'Reduce by 15% for seasonal sale',
    },
    {
      name: "Fresh Start",
      title: `${selectedListing.title} - Reposted`,
      description: 'Repost with updated title',
    },
  ];

  return (
    <div className="quick-duplicate-modal">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="duplicate-header">
          <h2>📋 Quick Duplicate Listing</h2>
          <p>Clone this listing with optional modifications</p>
        </div>

        <div className="duplicate-content">
          {/* Source Listing Info */}
          <div className="source-listing">
            <h3>📦 Source Listing</h3>
            <div className="listing-preview">
              <div className="preview-item">
                <span className="label">Title:</span>
                <span className="value">{selectedListing.title}</span>
              </div>
              <div className="preview-item">
                <span className="label">Category:</span>
                <span className="value">{selectedListing.category}</span>
              </div>
              <div className="preview-item">
                <span className="label">Price:</span>
                <span className="value">₹{selectedListing.price}</span>
              </div>
              <div className="preview-item">
                <span className="label">Location:</span>
                <span className="value">{selectedListing.location}</span>
              </div>
            </div>
          </div>

          {/* Quick Modifications */}
          <div className="quick-mods-section">
            <h3>⚡ Quick Modifications</h3>
            <div className="preset-mods">
              {presetModifications.map((preset, idx) => (
                <button
                  key={idx}
                  className="preset-mod-btn"
                  onClick={() => {
                    if (preset.priceAdjustment) {
                      handleAdjustPrice(preset.priceAdjustment, preset.type);
                    }
                    if (preset.title) {
                      handleModifyTitle(preset.title);
                    }
                  }}
                >
                  <span className="mod-name">{preset.name}</span>
                  <span className="mod-desc">{preset.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="advanced-section">
            <button
              className="advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? '▼' : '▶'} Advanced Options
            </button>

            {showAdvanced && (
              <div className="advanced-options">
                {/* Title Modification */}
                <div className="form-field">
                  <label htmlFor="duplicate-title">Modify Title (optional)</label>
                  <input
                    id="duplicate-title"
                    type="text"
                    className="form-input"
                    placeholder={selectedListing.title}
                    value={modifications.title}
                    onChange={(e) => handleModifyTitle(e.target.value)}
                  />
                  <span className="field-hint">Leave blank to keep original title</span>
                </div>

                {/* Price Adjustment */}
                <div className="price-adjustment-section">
                  <label>Adjust Price (optional)</label>
                  <div className="adjustment-controls">
                    <div className="adjustment-input">
                      <input
                        type="number"
                        placeholder="0"
                        value={modifications.priceAdjustment}
                        onChange={(e) =>
                          handleAdjustPrice(
                            e.target.value,
                            modifications.priceAdjustmentType
                          )
                        }
                        className="form-input"
                      />
                      <select
                        value={modifications.priceAdjustmentType}
                        onChange={(e) =>
                          handleAdjustPrice(
                            modifications.priceAdjustment,
                            e.target.value
                          )
                        }
                        className="form-select"
                      >
                        <option value="fixed">₹ Fixed</option>
                        <option value="percentage">% Percentage</option>
                      </select>
                    </div>
                    <div className="price-preview">
                      <span className="label">New Price:</span>
                      <span className="price-value">₹{Math.max(0, duplicateData.price).toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                {/* Location Change */}
                <div className="form-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={modifications.changeLocation}
                      onChange={(e) => {
                        setModifications(prev => ({
                          ...prev,
                          changeLocation: e.target.checked,
                        }));
                        if (!e.target.checked) {
                          handleChangeLocation('');
                        }
                      }}
                    />
                    <span>Change Location</span>
                  </label>
                  {modifications.changeLocation && (
                    <input
                      type="text"
                      className="form-input"
                      placeholder={selectedListing.location}
                      value={modifications.newLocation}
                      onChange={(e) => handleChangeLocation(e.target.value)}
                    />
                  )}
                </div>

                {/* Duplicate Quantity */}
                <div className="form-field">
                  <label htmlFor="duplicate-qty">Number of Duplicates</label>
                  <div className="quantity-control">
                    <button
                      className="qty-btn"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      −
                    </button>
                    <input
                      id="duplicate-qty"
                      type="number"
                      min="1"
                      max="5"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="qty-input"
                    />
                    <button
                      className="qty-btn"
                      onClick={() => setQuantity(Math.min(5, quantity + 1))}
                    >
                      +
                    </button>
                  </div>
                  <span className="field-hint">Maximum 5 duplicates at once</span>
                </div>

                {/* Collection Option */}
                <div className="form-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={addToCollection}
                      onChange={(e) => setAddToCollection(e.target.checked)}
                    />
                    <span>Add duplicates to a collection</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Duplicate Preview */}
          <div className="duplicate-preview">
            <h3>✨ What You'll Get</h3>
            <div className="preview-box">
              <div className="preview-item">
                <span className="label">Title:</span>
                <span className="value">{duplicateData.title}</span>
              </div>
              <div className="preview-item">
                <span className="label">Price:</span>
                <span className="value">₹{duplicateData.price}</span>
              </div>
              <div className="preview-item">
                <span className="label">Location:</span>
                <span className="value">{duplicateData.location}</span>
              </div>
              <div className="preview-item">
                <span className="label">Duplicates:</span>
                <span className="value">{quantity} listing{quantity > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="info-box">
            <span className="icon">💡</span>
            <div>
              <strong>Pro Tips:</strong>
              <ul>
                <li>Duplicate listings to reach different audiences</li>
                <li>Modify prices to test market demand</li>
                <li>Change locations to target multiple areas</li>
                <li>Repost with slightly different titles for more visibility</li>
              </ul>
            </div>
          </div>

          {/* Similar Listings Suggestion */}
          {similarListings.length > 0 && (
            <div className="similar-section">
              <h4>🔍 Similar Active Listings</h4>
              <div className="similar-list">
                {similarListings.map((listing, idx) => (
                  <div key={idx} className="similar-item">
                    <div>
                      <p className="similar-title">{listing.title}</p>
                      <p className="similar-price">₹{listing.price}</p>
                    </div>
                    <button
                      className="use-template-btn"
                      onClick={() => applyTemplate(listing)}
                    >
                      Use as Template
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="modal-actions">
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-btn" onClick={handleDuplicate}>
              Create {quantity} Duplicate{quantity > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickDuplicate;
