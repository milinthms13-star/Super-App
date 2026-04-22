import React, { useState } from 'react';

const AutoRelist = ({ 
  listingId = null,
  currentConfig = {},
  onSave,
  onClose 
}) => {
  const [enabled, setEnabled] = useState(currentConfig.enabled || false);
  const [autoRelistDelay, setAutoRelistDelay] = useState(currentConfig.autoRelistDelay || 7);
  const [maxRelists, setMaxRelists] = useState(currentConfig.maxRelists || 5);
  const [currentRelists, setCurrentRelists] = useState(currentConfig.currentRelists || 0);
  const [adjustPrice, setAdjustPrice] = useState(currentConfig.adjustPrice || false);
  const [priceAdjustmentType, setPriceAdjustmentType] = useState(currentConfig.priceAdjustmentType || 'fixed');
  const [priceAdjustmentValue, setPriceAdjustmentValue] = useState(currentConfig.priceAdjustmentValue || 0);
  const [notifyMe, setNotifyMe] = useState(currentConfig.notifyMe !== false);
  const [relistHistory, setRelistHistory] = useState(currentConfig.relistHistory || []);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleSave = () => {
    const config = {
      enabled,
      autoRelistDelay,
      maxRelists,
      currentRelists,
      adjustPrice,
      priceAdjustmentType,
      priceAdjustmentValue,
      notifyMe,
      relistHistory,
      lastUpdated: new Date().toISOString(),
    };

    if (onSave) {
      onSave(config);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const nextRelistDate = enabled && currentRelists < maxRelists
    ? new Date(Date.now() + autoRelistDelay * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="auto-relist-modal">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="auto-relist-header">
          <h2>🔄 Auto-Relist Settings</h2>
          <p>Automatically relist your sold items to keep them visible to buyers</p>
        </div>

        <div className="auto-relist-content">
          {/* Main Toggle */}
          <div className="toggle-section">
            <div className="toggle-header">
              <h3>Enable Auto-Relist</h3>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            <p className="toggle-description">
              When enabled, sold items will be automatically relisted based on your settings
            </p>
          </div>

          {enabled && (
            <>
              {/* Quick Stats */}
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-label">Relists Used</span>
                  <span className="stat-value">
                    {currentRelists} <span className="stat-max">/ {maxRelists}</span>
                  </span>
                  <div className="stat-bar">
                    <div
                      className="stat-fill"
                      style={{ width: `${(currentRelists / maxRelists) * 100}%` }}
                    />
                  </div>
                </div>

                {nextRelistDate && (
                  <div className="stat-card">
                    <span className="stat-label">Next Relist</span>
                    <span className="stat-value">{nextRelistDate}</span>
                  </div>
                )}

                {currentRelists >= maxRelists && (
                  <div className="stat-card warning">
                    <span className="stat-label">⚠️ Max Relists Reached</span>
                    <span className="stat-note">Reset or increase limit to continue</span>
                  </div>
                )}
              </div>

              {/* Basic Settings */}
              <div className="settings-section">
                <h4>Basic Settings</h4>

                <div className="form-field">
                  <label htmlFor="relist-delay">
                    Days Before Auto-Relist
                    <span className="field-hint">After item is marked sold</span>
                  </label>
                  <div className="slider-wrapper">
                    <input
                      id="relist-delay"
                      type="range"
                      min="1"
                      max="30"
                      value={autoRelistDelay}
                      onChange={(e) => setAutoRelistDelay(parseInt(e.target.value))}
                      className="slider"
                    />
                    <span className="slider-value">{autoRelistDelay} days</span>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="max-relists">
                    Maximum Relists Allowed
                    <span className="field-hint">Prevent unlimited relisting</span>
                  </label>
                  <input
                    id="max-relists"
                    type="number"
                    min="1"
                    max="50"
                    value={maxRelists}
                    onChange={(e) => setMaxRelists(Math.max(1, parseInt(e.target.value) || 1))}
                    className="form-input"
                  />
                </div>

                <div className="checkbox-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={notifyMe}
                      onChange={(e) => setNotifyMe(e.target.checked)}
                    />
                    <span>Notify me when an item is auto-relisted</span>
                  </label>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="advanced-section">
                <button
                  className="advanced-toggle"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? '▼' : '▶'} Advanced Options
                </button>

                {showAdvanced && (
                  <div className="advanced-content">
                    <div className="checkbox-field">
                      <label>
                        <input
                          type="checkbox"
                          checked={adjustPrice}
                          onChange={(e) => setAdjustPrice(e.target.checked)}
                        />
                        <span>Adjust price on relist</span>
                      </label>
                    </div>

                    {adjustPrice && (
                      <div className="price-adjustment">
                        <div className="form-field">
                          <label htmlFor="adjustment-type">Adjustment Type</label>
                          <select
                            id="adjustment-type"
                            value={priceAdjustmentType}
                            onChange={(e) => setPriceAdjustmentType(e.target.value)}
                            className="form-select"
                          >
                            <option value="fixed">Fixed Amount</option>
                            <option value="percentage">Percentage</option>
                          </select>
                        </div>

                        <div className="form-field">
                          <label htmlFor="adjustment-value">
                            {priceAdjustmentType === 'fixed' ? 'Amount (₹)' : 'Percentage (%)'}
                          </label>
                          <input
                            id="adjustment-value"
                            type="number"
                            value={priceAdjustmentValue}
                            onChange={(e) => setPriceAdjustmentValue(parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="form-input"
                          />
                          <span className="adjustment-note">
                            {priceAdjustmentValue > 0 ? 'Price will increase' : 'Price will decrease'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="info-box">
                      <span className="info-icon">ℹ️</span>
                      <div>
                        <strong>Pro Tip:</strong> Lower your price by 5-10% on relist to attract new buyers
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Relist History */}
              {relistHistory.length > 0 && (
                <div className="history-section">
                  <button
                    className="history-toggle"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    {showHistory ? '▼' : '▶'} Relist History ({relistHistory.length})
                  </button>

                  {showHistory && (
                    <div className="history-list">
                      {relistHistory.map((entry, idx) => (
                        <div key={idx} className="history-entry">
                          <span className="history-date">{formatDate(entry.date)}</span>
                          <span className="history-action">{entry.action || 'Relisted'}</span>
                          {entry.priceAdjusted && (
                            <span className={`history-price ${entry.priceChange > 0 ? 'increase' : 'decrease'}`}>
                              {entry.priceChange > 0 ? '+' : ''}{entry.priceChange}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!enabled && (
            <div className="disabled-info-box">
              <span className="icon">🔒</span>
              <div>
                <strong>Auto-Relist is disabled</strong>
                <p>Enable it above to automatically relist your sold items</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="modal-actions">
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="save-btn" onClick={handleSave}>
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoRelist;
