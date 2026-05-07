import React, { useState, useEffect } from "react";
import {
  getAppLockStatus,
  setupAppLockPin,
  verifyAppLockPin,
  disableAppLock,
  updateAutoLockTimeout,
} from "../../services/diaryService";
import "./AppLockSettings.css";

const AppLockSettings = ({ onClose }) => {
  const [lockStatus, setLockStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [timeoutMinutes, setTimeoutMinutes] = useState(5);
  const [showTimeoutEdit, setShowTimeoutEdit] = useState(false);

  useEffect(() => {
    fetchLockStatus();
  }, []);

  const fetchLockStatus = async () => {
    try {
      setLoading(true);
      const result = await getAppLockStatus();
      setLockStatus(result.data);
      setTimeoutMinutes(result.data.autoLockTimeoutMinutes || 5);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const validatePin = (pin) => {
    if (!pin || pin.length < 4 || pin.length > 8) {
      return "PIN must be 4-8 characters";
    }
    if (!/^\d+$/.test(pin)) {
      return "PIN must contain only numbers";
    }
    return null;
  };

  const handleSetupPin = async (e) => {
    e.preventDefault();

    const pinError = validatePin(newPin);
    if (pinError) {
      alert(pinError);
      return;
    }

    if (newPin !== confirmPin) {
      alert("PINs do not match");
      return;
    }

    try {
      setSetupLoading(true);
      await setupAppLockPin(newPin);
      alert("PIN lock enabled successfully!");
      setNewPin("");
      setConfirmPin("");
      setShowPinSetup(false);
      await fetchLockStatus();
    } catch (err) {
      alert(`Failed to setup PIN: ${err.message}`);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleDisableAppLock = async () => {
    if (!window.confirm("Disable app lock? You will no longer need to enter a PIN to access your diary.")) {
      return;
    }

    try {
      setSetupLoading(true);
      await disableAppLock();
      alert("App lock disabled");
      await fetchLockStatus();
      setShowPinSetup(false);
    } catch (err) {
      alert(`Failed to disable: ${err.message}`);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleUpdateTimeout = async () => {
    if (timeoutMinutes < 1 || timeoutMinutes > 120) {
      alert("Timeout must be between 1 and 120 minutes");
      return;
    }

    try {
      setSetupLoading(true);
      await updateAutoLockTimeout(timeoutMinutes);
      alert("Auto-lock timeout updated");
      await fetchLockStatus();
      setShowTimeoutEdit(false);
    } catch (err) {
      alert(`Failed to update timeout: ${err.message}`);
    } finally {
      setSetupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app-lock-settings-modal">
        <div className="app-lock-content">
          <button className="close-btn" onClick={onClose}>✕</button>
          <p>Loading lock status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-lock-settings-modal">
      <div className="app-lock-content">
        <div className="app-lock-header">
          <h2>🔐 App Lock Settings</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {error && <div className="app-lock-error">Error: {error}</div>}

        <div className="lock-status-card">
          <div className="status-indicator">
            {lockStatus?.isEnabled ? (
              <>
                <span className="status-badge enabled">🔒 Enabled</span>
                <p>Your diary is protected with a PIN</p>
              </>
            ) : (
              <>
                <span className="status-badge disabled">🔓 Disabled</span>
                <p>App lock is not currently enabled</p>
              </>
            )}
          </div>

          {lockStatus?.isEnabled && (
            <div className="lock-info">
              <div className="info-row">
                <span className="label">Lock Type:</span>
                <span className="value">{lockStatus.lockType === 'pin' ? 'PIN' : 'Biometric + PIN'}</span>
              </div>
              <div className="info-row">
                <span className="label">Auto-Lock Timeout:</span>
                <span className="value">{lockStatus.autoLockTimeoutMinutes} minutes</span>
              </div>
              {lockStatus.lastUnlockedAt && (
                <div className="info-row">
                  <span className="label">Last Unlocked:</span>
                  <span className="value">
                    {new Date(lockStatus.lastUnlockedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lock-actions">
          {!lockStatus?.isEnabled ? (
            <>
              <button
                className="setup-btn"
                onClick={() => setShowPinSetup(true)}
              >
                🔐 Enable PIN Lock
              </button>
            </>
          ) : (
            <>
              <button
                className="timeout-btn"
                onClick={() => setShowTimeoutEdit(!showTimeoutEdit)}
              >
                ⏱️ Update Auto-Lock Timeout
              </button>
              <button
                className="change-pin-btn"
                onClick={() => setShowPinSetup(true)}
              >
                🔄 Change PIN
              </button>
              <button
                className="disable-btn"
                onClick={handleDisableAppLock}
                disabled={setupLoading}
              >
                ❌ Disable App Lock
              </button>
            </>
          )}
        </div>

        {showTimeoutEdit && (
          <div className="timeout-editor">
            <label>Auto-Lock Timeout (minutes):</label>
            <input
              type="number"
              min="1"
              max="120"
              value={timeoutMinutes}
              onChange={(e) => setTimeoutMinutes(parseInt(e.target.value))}
            />
            <div className="editor-actions">
              <button
                onClick={handleUpdateTimeout}
                disabled={setupLoading}
                className="save-btn"
              >
                Save
              </button>
              <button
                onClick={() => setShowTimeoutEdit(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showPinSetup && (
          <form onSubmit={handleSetupPin} className="pin-setup-form">
            <h3>{lockStatus?.isEnabled ? 'Change PIN' : 'Setup PIN Lock'}</h3>
            <p className="pin-info">
              Enter a 4-8 digit PIN to protect your diary
            </p>
            <div className="form-group">
              <label htmlFor="newPin">PIN:</label>
              <input
                id="newPin"
                type="password"
                placeholder="Enter 4-8 digits"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                maxLength="8"
                disabled={setupLoading}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPin">Confirm PIN:</label>
              <input
                id="confirmPin"
                type="password"
                placeholder="Re-enter PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                maxLength="8"
                disabled={setupLoading}
              />
            </div>
            <div className="form-actions">
              <button type="submit" disabled={setupLoading} className="confirm-btn">
                {setupLoading ? 'Setting up...' : 'Confirm PIN'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPinSetup(false);
                  setNewPin("");
                  setConfirmPin("");
                }}
                disabled={setupLoading}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AppLockSettings;
