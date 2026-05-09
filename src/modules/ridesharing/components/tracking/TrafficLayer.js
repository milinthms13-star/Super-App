/**
 * TrafficLayer.js
 * Real-time traffic display component
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './TrafficLayer.css';

const TrafficLayer = ({ 
  center = { lat: 40.7128, lng: -74.0060 }, 
  radius = 2,
  autoRefresh = true,
  refreshInterval = 30000 
}) => {
  const [trafficData, setTrafficData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('accessToken');

  // Fetch traffic data
  const fetchTrafficData = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${API_BASE}/api/ridesharing/phase4/traffic-data`,
        { center, radius },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTrafficData(response.data.data);
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      setError('Failed to fetch traffic data');
      console.error('Error fetching traffic data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTrafficData();
  }, [center, radius]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchTrafficData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, center, radius]);

  // Get traffic condition color
  const getTrafficColor = (condition) => {
    const colors = {
      light: '#10b981',
      moderate: '#f59e0b',
      heavy: '#ef4444',
      severe: '#7f1d1d',
      normal: '#3b82f6',
    };
    return colors[condition] || '#3b82f6';
  };

  // Get traffic condition label
  const getTrafficLabel = (condition) => {
    const labels = {
      light: '✨ Light Traffic',
      moderate: '⚠️ Moderate Traffic',
      heavy: '🚨 Heavy Traffic',
      severe: '🛑 Severe Traffic',
      normal: '🟢 Normal',
    };
    return labels[condition] || 'Unknown';
  };

  if (!trafficData) {
    return (
      <div className="traffic-layer">
        <div className="traffic-empty">{loading ? 'Loading traffic data...' : 'No traffic data'}</div>
      </div>
    );
  }

  const conditions = trafficData.trafficConditions || [];

  return (
    <div className="traffic-layer">
      {error && (
        <div className="traffic-error">
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div className="traffic-header">
        <h3>🚗 Traffic Overview</h3>
        <div className="traffic-controls">
          <button
            className="refresh-btn"
            onClick={fetchTrafficData}
            disabled={loading}
          >
            {loading ? '⟳ Updating...' : '⟳ Refresh'}
          </button>
          {lastUpdated && (
            <span className="last-updated">
              Updated {formatTime(lastUpdated)}
            </span>
          )}
        </div>
      </div>

      {/* Traffic Summary */}
      <div className="traffic-summary">
        {conditions.map((cond, idx) => (
          <div key={idx} className="traffic-direction">
            <div
              className="traffic-indicator"
              style={{ backgroundColor: getTrafficColor(cond.condition) }}
            />
            <div className="direction-info">
              <span className="direction-name">{cond.direction.toUpperCase()}</span>
              <span className="traffic-status">{getTrafficLabel(cond.condition)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Traffic Legend */}
      <div className="traffic-legend">
        <div className="legend-title">Traffic Conditions</div>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#10b981' }} />
            <span>Light (0-30 min)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#f59e0b' }} />
            <span>Moderate (30-60 min)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ef4444' }} />
            <span>Heavy (60+ min)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#7f1d1d' }} />
            <span>Severe (Very Slow)</span>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="traffic-tips">
        <p className="tips-title">💡 Pro Tips</p>
        <ul>
          <li>Heavy traffic in North and East directions</li>
          <li>Consider alternative routes or adjust timing</li>
          <li>Data updates every 30 seconds</li>
          <li>Peak hours: 8-10 AM, 5-7 PM</li>
        </ul>
      </div>
    </div>
  );
};

// Helper function to format time
const formatTime = (date) => {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
};

export default TrafficLayer;
