import React, { useState, useEffect, useCallback } from 'react';
import './SOSAlertReceiver.css';

const SOSAlertReceiver = ({ userEmail, userName, socket }) => {
  const [incomingAlerts, setIncomingAlerts] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const [acceptedAlerts, setAcceptedAlerts] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationSound, setNotificationSound] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);

  // Listen for incoming SOS alerts via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleIncomingAlert = (alertData) => {
      console.log('Incoming SOS alert:', alertData);

      // Add to incoming alerts
      setIncomingAlerts((prev) => [
        {
          id: alertData.alertId,
          incidentId: alertData.incidentId,
          callId: alertData.callId,
          chatId: alertData.chatId,
          fromUser: alertData.fromUser,
          location: alertData.location,
          reason: alertData.reason,
          channels: alertData.channels,
          timestamp: alertData.timestamp,
          status: 'incoming',
          receivedAt: new Date().toISOString(),
          responseTime: null,
          acknowledged: false,
        },
        ...prev,
      ]);

      setShowNotification(true);

      // Play notification sound
      if (notificationSound) {
        playNotificationSound();
      }

      // Auto-accept if enabled
      if (autoAccept) {
        setTimeout(() => {
          handleAcceptAlert(alertData.alertId);
        }, 500);
      }
    };

    const handleCallIncoming = (callData) => {
      console.log('Incoming call:', callData);
      if (callData.emergency) {
        // Handle emergency call
        handleIncomingAlert(callData);
      }
    };

    socket.on('sos:incoming', handleIncomingAlert);
    socket.on('call:incoming', handleCallIncoming);
    socket.on('notification:received', (notification) => {
      if (notification.type === 'sos-alert') {
        handleIncomingAlert(notification.actionData);
      }
    });

    return () => {
      socket.off('sos:incoming', handleIncomingAlert);
      socket.off('call:incoming', handleCallIncoming);
      socket.off('notification:received');
    };
  }, [socket, notificationSound, autoAccept]);

  const playNotificationSound = () => {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const handleAcceptAlert = useCallback(
    async (alertId) => {
      const alert = incomingAlerts.find((a) => a.id === alertId);
      if (!alert) return;

      try {
        // Call backend to acknowledge incident
        const response = await fetch('/api/sos/acknowledge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            incidentId: alert.incidentId,
            responderName: userName,
            responderEmail: userEmail,
          }),
        });

        if (response.ok) {
          const data = await response.json();

          // Move to accepted alerts
          setIncomingAlerts((prev) => prev.filter((a) => a.id !== alertId));

          const acceptedAlert = {
            ...alert,
            status: 'accepted',
            acknowledged: true,
            responseTime: new Date().toISOString(),
          };

          setAcceptedAlerts((prev) => [acceptedAlert, ...prev]);
          setActiveAlert(acceptedAlert);

          // Send notification back to caller
          if (socket) {
            socket.emit('sos:accepted', {
              incidentId: alert.incidentId,
              responderName: userName,
              responderEmail: userEmail,
              respondedAt: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.error('Error accepting alert:', error);
      }
    },
    [incomingAlerts, userName, userEmail, socket]
  );

  const handleDeclineAlert = (alertId) => {
    setIncomingAlerts((prev) => {
      const alert = prev.find((a) => a.id === alertId);
      if (alert && socket) {
        socket.emit('sos:declined', {
          incidentId: alert.incidentId,
          responderName: userName,
          reason: 'User declined',
        });
      }
      return prev.filter((a) => a.id !== alertId);
    });
  };

  const handleAnswerCall = (alertId) => {
    const alert = incomingAlerts.find((a) => a.id === alertId);
    if (!alert) return;

    // Emit answer event
    if (socket) {
      socket.emit('call:answer', {
        callId: alert.callId,
        responderId: userEmail,
      });
    }

    handleAcceptAlert(alertId);
  };

  const handleEndResponse = (alertId) => {
    setActiveAlert(null);
    setAcceptedAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'completed',
              completedAt: new Date().toISOString(),
            }
          : a
      )
    );

    if (socket) {
      const alert = acceptedAlerts.find((a) => a.id === alertId);
      if (alert) {
        socket.emit('sos:response-ended', {
          incidentId: alert.incidentId,
          responderName: userName,
        });
      }
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="sos-receiver-container">
      <div className="receiver-header">
        <h2>📲 SOS Alert Receiver</h2>
        <p>Respond to emergency alerts from your trusted contacts</p>
      </div>

      <div className="receiver-settings">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={notificationSound}
            onChange={(e) => setNotificationSound(e.target.checked)}
          />
          <span>Sound notifications</span>
        </label>
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={autoAccept}
            onChange={(e) => setAutoAccept(e.target.checked)}
          />
          <span>Auto-accept alerts</span>
        </label>
      </div>

      {/* Incoming Alerts */}
      {incomingAlerts.length > 0 && (
        <div className="incoming-alerts-section">
          <h3>🔔 Incoming Alerts ({incomingAlerts.length})</h3>
          <div className="alerts-stack">
            {incomingAlerts.map((alert) => (
              <div key={alert.id} className="incoming-alert-card alert-flash">
                <div className="alert-header">
                  <div className="caller-info">
                    <div className="caller-avatar">
                      {alert.fromUser?.avatar ||
                        alert.fromUser?.name?.charAt(0) ||
                        'S'}
                    </div>
                    <div className="caller-details">
                      <h4>{alert.fromUser?.name}</h4>
                      <p className="caller-reason">{alert.reason}</p>
                      <p className="caller-location">📍 {alert.location}</p>
                    </div>
                  </div>
                  <div className="alert-status">
                    <span className="status-badge incoming">
                      {formatTime(alert.timestamp)}
                    </span>
                  </div>
                </div>

                <div className="alert-details">
                  <div className="detail-row">
                    <span>Email:</span>
                    <strong>{alert.fromUser?.email}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Phone:</span>
                    <strong>{alert.fromUser?.phone || 'Not provided'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Channels:</span>
                    <div className="channel-badges">
                      {alert.channels.map((channel) => (
                        <span key={channel} className="channel-badge">
                          {channel}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="alert-actions">
                  <button
                    className="action-btn accept"
                    onClick={() => handleAnswerCall(alert.id)}
                  >
                    ✓ Accept & Answer
                  </button>
                  <button
                    className="action-btn decline"
                    onClick={() => handleDeclineAlert(alert.id)}
                  >
                    ✕ Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Response */}
      {activeAlert && (
        <div className="active-response-section">
          <h3>📞 Active Response</h3>
          <div className="active-alert-card">
            <div className="response-header">
              <div className="responder-info">
                <h4>Responding to {activeAlert.fromUser?.name}</h4>
                <p>
                  Status: <strong>Connected</strong>
                </p>
              </div>
              <div className="timer">
                <span id="response-timer">00:00</span>
              </div>
            </div>

            <div className="response-grid">
              <div className="response-item">
                <label>Caller Location:</label>
                <p>{activeAlert.location}</p>
              </div>
              <div className="response-item">
                <label>Reason:</label>
                <p>{activeAlert.reason}</p>
              </div>
              <div className="response-item">
                <label>Caller Email:</label>
                <p>{activeAlert.fromUser?.email}</p>
              </div>
              <div className="response-item">
                <label>Caller Phone:</label>
                <p>{activeAlert.fromUser?.phone || 'N/A'}</p>
              </div>
            </div>

            <div className="response-actions">
              <textarea
                placeholder="Add notes about the incident response..."
                className="response-notes"
              />
              <div className="action-buttons">
                <button className="btn-primary">📍 Share My Location</button>
                <button className="btn-secondary">📋 Send Check-In</button>
                <button
                  className="btn-danger"
                  onClick={() => handleEndResponse(activeAlert.id)}
                >
                  ✓ Complete Response
                </button>
              </div>
            </div>
          </div>

          {/* Incident Map Placeholder */}
          <div className="incident-map-container">
            <div className="incident-map">
              <p>📍 Caller Location Map</p>
              <p style={{ fontSize: '0.9rem', color: '#999' }}>
                {activeAlert.location}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Accepted Alerts History */}
      {acceptedAlerts.length > 0 && (
        <div className="accepted-alerts-section">
          <h3>✓ Responded Alerts</h3>
          <div className="alerts-list">
            {acceptedAlerts.map((alert) => (
              <div key={alert.id} className="alert-history-item">
                <div className="history-left">
                  <div className="history-avatar">
                    {alert.fromUser?.avatar ||
                      alert.fromUser?.name?.charAt(0) ||
                      'S'}
                  </div>
                  <div className="history-info">
                    <h4>{alert.fromUser?.name}</h4>
                    <p>{alert.reason}</p>
                    <p className="time-info">
                      {formatDate(alert.responseTime)}
                    </p>
                  </div>
                </div>
                <div className="history-right">
                  <span
                    className={`status-badge ${alert.status}`}
                  >
                    {alert.status === 'accepted'
                      ? 'Active'
                      : 'Completed'}
                  </span>
                  {alert.status === 'accepted' && (
                    <button
                      className="btn-text-secondary"
                      onClick={() => handleEndResponse(alert.id)}
                    >
                      End
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {incomingAlerts.length === 0 &&
        activeAlert === null &&
        acceptedAlerts.length === 0 && (
          <div className="empty-state">
            <p>📭</p>
            <p>No incoming SOS alerts</p>
            <p style={{ fontSize: '0.9rem', color: '#999' }}>
              You'll receive notifications when your contacts send SOS alerts
            </p>
          </div>
        )}
    </div>
  );
};

export default SOSAlertReceiver;
