import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LinkPreview.css';

const LinkPreview = ({ url, onClose, compact = false }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(!compact);

  useEffect(() => {
    if (url) {
      fetchPreview();
    }
  }, [url]);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/messaging/advanced/link-preview', {
        params: { url },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPreview(response.data.preview);
    } catch (err) {
      console.error('Error fetching preview:', err);
      setError('Could not load preview');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className={`link-preview ${compact ? 'compact' : 'full'}`}>
        <div className="preview-loading">
          <div className="preview-skeleton">
            <div className="skeleton-image"></div>
            <div className="skeleton-content">
              <div className="skeleton-line short"></div>
              <div className="skeleton-line long"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className={`link-preview ${compact ? 'compact' : 'full'} error-state`}>
        <div className="preview-error">
          <span className="error-icon">🔗</span>
          <span className="error-text">{url}</span>
        </div>
      </div>
    );
  }

  if (compact && !expanded) {
    return (
      <div className="link-preview compact" onClick={() => setExpanded(true)}>
        <div className="preview-compact">
          {preview.image && (
            <div className="compact-image">
              <img src={preview.image} alt="" />
            </div>
          )}
          <div className="compact-info">
            <div className="compact-title">{preview.title}</div>
            <div className="compact-domain">{preview.siteName}</div>
          </div>
          <button className="expand-btn">▼</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`link-preview ${compact ? 'compact' : 'full'} expanded`}>
      <div className="preview-card" onClick={handleOpenLink}>
        {preview.image && (
          <div className="preview-image">
            <img src={preview.image} alt={preview.title} />
            <div className="image-overlay">
              <span className="open-icon">🔗</span>
            </div>
          </div>
        )}
        <div className="preview-content">
          <div className="preview-header">
            <span className="site-icon">🌐</span>
            <span className="site-name">{preview.siteName}</span>
          </div>
          <h3 className="preview-title">{preview.title}</h3>
          {preview.description && (
            <p className="preview-description">{preview.description}</p>
          )}
          <div className="preview-footer">
            <span className="preview-url">{new URL(url).hostname}</span>
            <button className="btn-open">
              Open Link →
            </button>
          </div>
        </div>
      </div>
      {compact && (
        <button 
          className="collapse-btn"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
        >
          ▲
        </button>
      )}
    </div>
  );
};

export default LinkPreview;
