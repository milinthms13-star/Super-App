import React, { useEffect, useState } from "react";
import { healthcareApi } from "../services/healthcareApi";
import "./WearablesIntegration.css";

const WearablesIntegration = () => {
  const [loading, setLoading] = useState(true);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [healthData, setHealthData] = useState({
    steps: null,
    heartRate: null,
    sleep: null,
    calories: null,
    distance: null,
    bloodPressure: null,
    bloodOxygen: null,
    weight: null,
  });
  const [syncStatus, setSyncStatus] = useState({});
  const [timeRange, setTimeRange] = useState("today");
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [anomalies, setAnomalies] = useState([]);

  const availableDevices = [
    {
      id: "apple_health",
      name: "Apple Health",
      icon: "🍎",
      description: "Sync data from Apple Health app",
      metrics: ["steps", "heartRate", "sleep", "calories"],
    },
    {
      id: "google_fit",
      name: "Google Fit",
      icon: "🏃",
      description: "Connect with Google Fit",
      metrics: ["steps", "heartRate", "distance", "calories"],
    },
    {
      id: "fitbit",
      name: "Fitbit",
      icon: "⌚",
      description: "Sync Fitbit wearable data",
      metrics: ["steps", "heartRate", "sleep", "calories", "distance"],
    },
    {
      id: "samsung_health",
      name: "Samsung Health",
      icon: "📱",
      description: "Connect Samsung Health app",
      metrics: ["steps", "heartRate", "sleep", "calories", "bloodPressure"],
    },
    {
      id: "garmin",
      name: "Garmin",
      icon: "⌚",
      description: "Sync Garmin device data",
      metrics: ["steps", "heartRate", "sleep", "calories", "distance"],
    },
  ];

  useEffect(() => {
    loadWearablesData();
  }, [timeRange]);

  const loadWearablesData = async () => {
    setLoading(true);
    try {
      const data = await healthcareApi.getWearablesData(timeRange);
      setConnectedDevices(data.connectedDevices || []);
      setHealthData(data.healthData || {});
      setSyncStatus(data.syncStatus || {});
      setAnomalies(data.anomalies || []);
    } catch (error) {
      console.error("Failed to load wearables data:", error);
    } finally {
      setLoading(false);
    }
  };

  const connectDevice = async (deviceId) => {
    try {
      // Simulate OAuth flow
      const authUrl = await healthcareApi.initiateWearableAuth(deviceId);
      
      // In production, open OAuth window
      window.open(authUrl, "_blank", "width=600,height=700");
      
      // Poll for connection status
      const checkConnection = setInterval(async () => {
        const status = await healthcareApi.checkWearableConnection(deviceId);
        if (status.connected) {
          clearInterval(checkConnection);
          setShowConnectModal(false);
          await loadWearablesData();
          alert(`${deviceId} connected successfully!`);
        }
      }, 2000);

      // Stop polling after 2 minutes
      setTimeout(() => clearInterval(checkConnection), 120000);
    } catch (error) {
      alert("Failed to connect device: " + error.message);
    }
  };

  const disconnectDevice = async (deviceId) => {
    if (!window.confirm(`Disconnect ${deviceId}?`)) return;

    try {
      await healthcareApi.disconnectWearable(deviceId);
      await loadWearablesData();
    } catch (error) {
      alert("Failed to disconnect device");
    }
  };

  const syncNow = async (deviceId) => {
    setSyncStatus((prev) => ({ ...prev, [deviceId]: "syncing" }));
    try {
      await healthcareApi.syncWearableData(deviceId);
      await loadWearablesData();
    } catch (error) {
      alert("Sync failed");
      setSyncStatus((prev) => ({ ...prev, [deviceId]: "error" }));
    }
  };

  const getMetricDisplay = (metric, value) => {
    if (!value && value !== 0) return "—";

    const displays = {
      steps: `${value.toLocaleString()} steps`,
      heartRate: `${value} bpm`,
      sleep: `${(value / 60).toFixed(1)} hours`,
      calories: `${value.toLocaleString()} kcal`,
      distance: `${(value / 1000).toFixed(2)} km`,
      bloodPressure: `${value.systolic}/${value.diastolic} mmHg`,
      bloodOxygen: `${value}%`,
      weight: `${value} kg`,
    };

    return displays[metric] || value;
  };

  const getMetricIcon = (metric) => {
    const icons = {
      steps: "🚶",
      heartRate: "❤️",
      sleep: "😴",
      calories: "🔥",
      distance: "📏",
      bloodPressure: "🩺",
      bloodOxygen: "🫁",
      weight: "⚖️",
    };
    return icons[metric] || "📊";
  };

  const getMetricStatus = (metric, value) => {
    // Simple health status indicators
    if (!value && value !== 0) return "normal";

    const ranges = {
      heartRate: { low: 60, high: 100 },
      bloodPressure: { low: { systolic: 90, diastolic: 60 }, high: { systolic: 140, diastolic: 90 } },
      bloodOxygen: { low: 95, high: 100 },
    };

    if (metric === "heartRate") {
      if (value < ranges.heartRate.low) return "low";
      if (value > ranges.heartRate.high) return "high";
      return "normal";
    }

    if (metric === "bloodPressure") {
      if (value.systolic < ranges.bloodPressure.low.systolic || value.diastolic < ranges.bloodPressure.low.diastolic) {
        return "low";
      }
      if (value.systolic > ranges.bloodPressure.high.systolic || value.diastolic > ranges.bloodPressure.high.diastolic) {
        return "high";
      }
      return "normal";
    }

    if (metric === "bloodOxygen") {
      if (value < ranges.bloodOxygen.low) return "low";
      return "normal";
    }

    return "normal";
  };

  if (loading) {
    return (
      <div className="wearables-integration">
        <div className="loading-state">Loading wearables data...</div>
      </div>
    );
  }

  return (
    <div className="wearables-integration" data-testid="wearables-integration">
      <div className="wearables-header">
        <div>
          <h2>Health Wearables</h2>
          <p>Connect and sync your health devices</p>
        </div>
        <div className="header-actions">
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button className="connect-device-btn" onClick={() => setShowConnectModal(true)}>
            + Connect Device
          </button>
        </div>
      </div>

      {anomalies.length > 0 && (
        <div className="anomalies-alert">
          <h3>⚠️ Health Alerts</h3>
          <div className="anomalies-list">
            {anomalies.map((anomaly, idx) => (
              <div key={idx} className={`anomaly-item ${anomaly.severity}`}>
                <span className="anomaly-metric">{anomaly.metric}</span>
                <span className="anomaly-message">{anomaly.message}</span>
                <span className="anomaly-value">{getMetricDisplay(anomaly.metric, anomaly.value)}</span>
                <span className="anomaly-time">{new Date(anomaly.detectedAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="connected-devices-section">
        <h3>Connected Devices</h3>
        {connectedDevices.length === 0 ? (
          <div className="empty-state">
            <p>No devices connected yet</p>
            <button onClick={() => setShowConnectModal(true)}>Connect Your First Device</button>
          </div>
        ) : (
          <div className="devices-grid">
            {connectedDevices.map((device) => (
              <div key={device.id} className="device-card">
                <div className="device-header">
                  <span className="device-icon">{device.icon}</span>
                  <div className="device-info">
                    <h4>{device.name}</h4>
                    <span className="last-sync">
                      Last synced: {device.lastSyncAt ? new Date(device.lastSyncAt).toLocaleString() : "Never"}
                    </span>
                  </div>
                </div>
                <div className="device-actions">
                  <button
                    className="sync-btn"
                    onClick={() => syncNow(device.id)}
                    disabled={syncStatus[device.id] === "syncing"}
                  >
                    {syncStatus[device.id] === "syncing" ? "Syncing..." : "Sync Now"}
                  </button>
                  <button className="disconnect-btn" onClick={() => disconnectDevice(device.id)}>
                    Disconnect
                  </button>
                </div>
                {device.dataPoints && (
                  <div className="device-stats">
                    <span>{device.dataPoints.toLocaleString()} data points collected</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="health-metrics-section">
        <h3>Health Metrics Overview</h3>
        <div className="metrics-grid">
          {Object.entries(healthData).map(([metric, value]) => {
            const status = getMetricStatus(metric, value);
            return (
              <div key={metric} className={`metric-card ${status}`}>
                <div className="metric-icon">{getMetricIcon(metric)}</div>
                <div className="metric-content">
                  <h4>{metric.replace(/([A-Z])/g, " $1").trim()}</h4>
                  <div className="metric-value">{getMetricDisplay(metric, value)}</div>
                  {status !== "normal" && (
                    <span className={`status-badge ${status}`}>{status.toUpperCase()}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="trends-section">
        <h3>Health Trends</h3>
        <div className="chart-placeholder">
          <p>📈 Trend charts will be displayed here</p>
          <p className="chart-note">
            Track your health metrics over time: steps, heart rate, sleep patterns, and more
          </p>
        </div>
      </div>

      {showConnectModal && (
        <div className="connect-modal-overlay" onClick={() => setShowConnectModal(false)}>
          <div className="connect-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Connect Health Device</h3>
              <button className="close-modal" onClick={() => setShowConnectModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="available-devices">
                {availableDevices.map((device) => {
                  const isConnected = connectedDevices.some((d) => d.id === device.id);
                  return (
                    <div key={device.id} className="available-device">
                      <div className="device-icon-large">{device.icon}</div>
                      <div className="device-details">
                        <h4>{device.name}</h4>
                        <p>{device.description}</p>
                        <div className="device-metrics">
                          <span>Tracks:</span>
                          {device.metrics.map((m) => (
                            <span key={m} className="metric-tag">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        className={`connect-btn ${isConnected ? "connected" : ""}`}
                        onClick={() => !isConnected && connectDevice(device.id)}
                        disabled={isConnected}
                      >
                        {isConnected ? "Connected" : "Connect"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WearablesIntegration;
