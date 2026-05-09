/**
 * BiometricLogin.jsx
 * Biometric authentication component (Fingerprint, Face recognition)
 * Works on React Native (mobile) and web with WebAuthn API
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import './BiometricLogin.css';

const BiometricLogin = ({ onSuccess, onError, isEnrolling = false }) => {
  const [step, setStep] = useState('device-select'); // device-select | biometric-scan | verifying
  const [deviceId, setDeviceId] = useState('');
  const [devices, setDevices] = useState([]);
  const [biometricType, setBiometricType] = useState('fingerprint');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  // Check biometric availability
  useEffect(() => {
    checkBiometricAvailability();
    if (!isEnrolling) {
      fetchAvailableDevices();
    }
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      // Check for WebAuthn support
      if (window.PublicKeyCredential) {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsBiometricAvailable(available);
      } else if (window.cordova) {
        // React Native check for biometric availability
        setIsBiometricAvailable(true);
      }
    } catch (err) {
      console.error('Biometric check error:', err);
    }
  };

  const fetchAvailableDevices = async () => {
    setLoading(true);

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE_URL}/auth/biometric/devices`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
      });

      setDevices(response.data.data || []);
    } catch (err) {
      const localDeviceId = localStorage.getItem('deviceId');
      if (localDeviceId) {
        setDevices([{
          deviceId: localDeviceId,
          deviceName: getDeviceName(),
          biometricMethods: [{ type: 'fingerprint' }],
        }]);
        setError('');
      } else {
        setError('No registered biometric device found. Login once and register device.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterDevice = async () => {
    setLoading(true);
    setError('');

    try {
      const deviceInfo = {
        deviceId: await getDeviceId(),
        deviceName: getDeviceName(),
        deviceType: getDeviceType()
      };

      await axios.post(`${API_BASE_URL}/auth/biometric/register`, { deviceInfo }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      setDeviceId(deviceInfo.deviceId);
      setStep('enroll-biometric');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register device');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollBiometric = async () => {
    if (!deviceId) {
      setError('Device ID required');
      return;
    }

    setLoading(true);
    setScanning(true);
    setError('');

    try {
      // Get biometric template (fingerprint/face data)
      const biometricData = await captureBiometric(biometricType);

      if (!biometricData) {
        setError('Biometric capture failed or was cancelled');
        setLoading(false);
        setScanning(false);
        return;
      }

      // Hash the biometric data
      const templateHash = await hashBiometricData(biometricData);

      await axios.post(`${API_BASE_URL}/auth/biometric/enroll`, {
        deviceId,
        biometricType,
        biometricData: templateHash
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      setStep('success');
      onSuccess?.({ type: 'enrolled', biometricType });
    } catch (err) {
      setError(err.response?.data?.error || 'Biometric enrollment failed');
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  const handleVerifyBiometric = async () => {
    if (!deviceId || !biometricType) {
      setError('Device and biometric type required');
      return;
    }

    setLoading(true);
    setScanning(true);
    setError('');

    try {
      // Capture biometric and verify
      const biometricData = await captureBiometric(biometricType);

      if (!biometricData) {
        setError('Biometric capture failed');
        setLoading(false);
        setScanning(false);
        return;
      }

      setStep('verifying');

      const response = await axios.post(`${API_BASE_URL}/auth/biometric/verify`, {
        deviceId,
        biometricType
      });

      // Store tokens
      localStorage.setItem('accessToken', response.data.data.accessToken);
      localStorage.setItem('refreshToken', response.data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));

      onSuccess?.(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Biometric verification failed');
      setStep('biometric-scan');
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  // Capture biometric data (fingerprint/face)
  const captureBiometric = async (type) => {
    try {
      // For web, use WebAuthn
      if (window.PublicKeyCredential && !window.cordova) {
        if (type === 'fingerprint') {
          return await captureWithWebAuthn();
        } else if (type === 'face') {
          return await captureWithWebAuthnFace();
        }
      }

      // For React Native
      if (window.cordova) {
        return await new Promise((resolve, reject) => {
          const biometric = window.cordova.plugins.BiometricAuthentication;

          biometric.authenticate(
            () => {
              resolve({ type, timestamp: Date.now(), verified: true });
            },
            (error) => {
              reject(new Error(error));
            },
            type
          );
        });
      }

      setError('Biometric not available on this device');
      return null;
    } catch (err) {
      console.error('Biometric capture error:', err);
      throw err;
    }
  };

  const captureWithWebAuthn = async () => {
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          timeout: 60000,
          userVerification: 'preferred'
        }
      });

      if (credential) {
        return {
          type: 'fingerprint',
          id: credential.id,
          response: credential.response
        };
      }
      return null;
    } catch (err) {
      throw err;
    }
  };

  const captureWithWebAuthnFace = async () => {
    // Similar to fingerprint but with face verification
    return captureWithWebAuthn();
  };

  const hashBiometricData = async (data) => {
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const getDeviceId = async () => {
    // Generate or retrieve device ID
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  };

  const getDeviceName = () => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return 'Apple Device';
    if (/Android/.test(ua)) return 'Android Device';
    if (/Windows/.test(ua)) return 'Windows PC';
    if (/Mac/.test(ua)) return 'Mac';
    return 'Unknown Device';
  };

  const getDeviceType = () => {
    if (/Mobile|Android|iPhone/.test(navigator.userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  };

  if (!isBiometricAvailable && !isEnrolling) {
    return (
      <div className="biometric-container">
        <div className="biometric-card">
          <div className="biometric-unavailable">
            <p>❌ Biometric authentication is not available on this device</p>
            <p className="biometric-help-text">Please use password login or enable biometric features on your device</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="biometric-container">
      <div className="biometric-card">
        {error && <div className="biometric-error-message">{error}</div>}

        {step === 'device-select' && (
          <div className="biometric-step">
            <h2>Biometric Login</h2>
            <p>Use your fingerprint or face to login securely</p>

            {devices.length === 0 ? (
              <div className="biometric-no-devices">
                <p>No biometric devices registered yet</p>
                <button onClick={handleRegisterDevice} disabled={loading} className="biometric-btn primary">
                  {loading ? 'Registering...' : 'Register This Device'}
                </button>
              </div>
            ) : (
              <div className="biometric-devices-list">
                {devices.map((device, idx) => (
                  <div key={idx} className="biometric-device-option" onClick={() => {
                    setDeviceId(device.deviceId);
                    if (device.biometricMethods.length > 0) {
                      setBiometricType(device.biometricMethods[0].type);
                      setStep('biometric-scan');
                    }
                  }}>
                    <span className="biometric-device-icon">📱</span>
                    <div className="biometric-device-info">
                      <p className="biometric-device-name">{device.deviceName}</p>
                      <p className="biometric-device-methods">
                        {device.biometricMethods.map(m => m.type).join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'biometric-scan' && (
          <div className="biometric-step">
            <h2>Biometric Authentication</h2>
            <div className="biometric-scanning">
              <div className={`biometric-scanner ${scanning ? 'active' : ''}`}>
                {biometricType === 'fingerprint' ? '👆' : '👁️'}
              </div>
              <p className="biometric-instruction">
                {biometricType === 'fingerprint'
                  ? 'Place your finger on the scanner'
                  : 'Look at the camera'}
              </p>
              {scanning && <p className="biometric-scanning-text">Scanning...</p>}
            </div>

            <button
              onClick={handleVerifyBiometric}
              disabled={loading}
              className="biometric-btn primary"
            >
              {scanning ? 'Scanning...' : 'Verify Biometric'}
            </button>
          </div>
        )}

        {step === 'verifying' && (
          <div className="biometric-step verifying">
            <div className="biometric-spinner"></div>
            <p>Verifying your biometric...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="biometric-step success">
            <div className="biometric-success-icon">✓</div>
            <h3>Biometric Enrolled</h3>
            <p>Your biometric has been successfully registered</p>
          </div>
        )}

        {isEnrolling && step === 'device-select' && (
          <div className="biometric-enrollment">
            <h2>Enroll Biometric</h2>
            <p>Register your biometric for faster login</p>

            <div className="biometric-type-select">
              <label className="biometric-radio">
                <input
                  type="radio"
                  value="fingerprint"
                  checked={biometricType === 'fingerprint'}
                  onChange={(e) => setBiometricType(e.target.value)}
                />
                <span>👆 Fingerprint</span>
              </label>
              <label className="biometric-radio">
                <input
                  type="radio"
                  value="face"
                  checked={biometricType === 'face'}
                  onChange={(e) => setBiometricType(e.target.value)}
                />
                <span>👁️ Face Recognition</span>
              </label>
            </div>

            <button onClick={handleEnrollBiometric} disabled={loading} className="biometric-btn primary">
              {loading ? 'Enrolling...' : 'Start Enrollment'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BiometricLogin;
