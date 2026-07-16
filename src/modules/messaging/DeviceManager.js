import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DeviceManager.css';

const DeviceManager = ({ onClose }) => {
  const [devices, setDevices] = useState([]);
  const [currentDeviceId, setCurrentDeviceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/messaging/devices', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDevices(response.data.devices || []);
      setCurrentDeviceId(response.data.currentDeviceId || '');
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutDevice = async (deviceId) => {
    if (!window.confirm('Log out this device? This will end its session immediately.')) return;

    setLoading(true);
    setError('');

    try {
      await axios.post(`/api/messaging/devices/${deviceId}/logout`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // If logging out current device, redirect to login
      if (deviceId === currentDeviceId) {
        alert('Logged out successfully');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        fetchDevices();
      }
    } catch (err) {
      setError('Failed to log out device');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAllOthers = async () => {
    if (!window.confirm('Log out all other devices? Only this device will remain logged in.')) return;

    setLoading(true);
    setError('');

    try {
      await axios.post('/api/messaging/devices/logout-others', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('All other devices logged out successfully');
      fetchDevices();
    } catch (err) {
      setError('Failed to log out devices');
    } finally {
      setLoading(false);
    }
  };

  const handleRenameDevice = async (deviceId, currentName) => {
    const newName = prompt('Enter new device name:', currentName);
    if (!newName || newName === currentName) return;

    setLoading(true);
    setError('');

    try {
      await axios.put(`/api/messaging/devices/${deviceId}`, {
        name: newName
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchDevices();
    } catch (err) {
      setError('Failed to rename device');
    } finally {
      setLoading(false);
    }
  };

  const formatLastActive = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Active now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getDeviceIcon = (deviceType) => {
    const icons = {
      mobile: '📱',
      tablet: '📱',
      desktop: '💻',
      web: '🌐',
      unknown: '📟'
    };
    return icons[deviceType] || icons.unknown;
  };

  const getOSIcon = (os) => {
    if (os?.toLowerCase().includes('windows')) return '🪟';
    if (os?.toLowerCase().includes('mac')) return '🍎';
    if (os?.toLowerCase().includes('linux')) return '🐧';
    if (os?.toLowerCase().includes('android')) return '🤖';
    if (os?.toLowerCase().includes('ios')) return '📱';
    return '💻';
  };

  if (loading && devices.length === 0) {
    return (
      <div className="device-manager-modal">
        <div className="device-manager-container">
          <div className="loading-state">
            <p>Loading devices...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="device-manager-modal">
      <div className="device-manager-container">
        <div className="device-header">
          <h2>🔐 Device Management</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="device-content">
          <div className="device-info-box">
            <p>
              Manage all devices where you're logged in. Remove devices you don't recognize
              or no longer use to keep your account secure.
            </p>
          </div>

          <div className="devices-list">
            {devices.length === 0 ? (
              <div className="empty-state">
                <p>No devices found</p>
              </div>
            ) : (
              devices.map((device) => {
                const isCurrent = device._id === currentDeviceId;
                return (
                  <div 
                    key={device._id} 
                    className={`device-item ${isCurrent ? 'current' : ''}`}
                  >
                    <div className="device-icon">
                      {getDeviceIcon(device.deviceType)}
                    </div>
                    <div className="device-details">
                      <div className="device-name">
                        {device.name || 'Unnamed Device'}
                        {isCurrent && <span className="current-badge">This device</span>}
                      </div>
                      <div className="device-info">
                        <span className="device-os">
                          {getOSIcon(device.os)} {device.os || 'Unknown OS'}
                        </span>
                        {device.browser && (
                          <span className="device-browser">• {device.browser}</span>
                        )}
                      </div>
                      <div className="device-location">
                        {device.location && `📍 ${device.location}`}
                        {device.ipAddress && ` • IP: ${device.ipAddress}`}
                      </div>
                      <div className="device-activity">
                        {device.isActive ? (
                          <span className="status-active">🟢 Active now</span>
                        ) : (
                          <span className="status-inactive">
                            Last active: {formatLastActive(device.lastActiveAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="device-actions">
                      <button 
                        onClick={() => handleRenameDevice(device._id, device.name)}
                        className="btn-icon"
                        title="Rename"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleLogoutDevice(device._id)}
                        className="btn-icon btn-danger"
                        title={isCurrent ? 'Log out' : 'Remove device'}
                      >
                        {isCurrent ? '🚪' : '🗑️'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {devices.length > 1 && (
            <div className="bulk-actions">
              <button 
                onClick={handleLogoutAllOthers}
                disabled={loading}
                className="btn-logout-all"
              >
                Log out all other devices
              </button>
            </div>
          )}

          <div className="security-tips">
            <h3>🛡️ Security Tips</h3>
            <ul>
              <li>Remove devices you don't recognize immediately</li>
              <li>Log out from public or shared devices after use</li>
              <li>Regularly review your active sessions</li>
              <li>Use strong, unique passwords for your account</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceManager;
