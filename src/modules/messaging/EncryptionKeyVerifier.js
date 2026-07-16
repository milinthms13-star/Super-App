import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import './EncryptionKeyVerifier.css';

const EncryptionKeyVerifier = ({ contactId, contactName, onClose, onVerified }) => {
  const [myFingerprint, setMyFingerprint] = useState('');
  const [contactFingerprint, setContactFingerprint] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationMethod, setVerificationMethod] = useState('qr'); // 'qr' or 'manual'
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetchEncryptionKeys();
  }, [contactId]);

  const fetchEncryptionKeys = async () => {
    setLoading(true);
    try {
      // Fetch my fingerprint
      const myResponse = await axios.get('/api/messaging/v5/encryption/keys/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMyFingerprint(myResponse.data.fingerprint);

      // Fetch contact's fingerprint
      const contactResponse = await axios.get(`/api/messaging/v5/encryption/keys/${contactId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setContactFingerprint(contactResponse.data.fingerprint);

      // Check if already verified
      setIsVerified(contactResponse.data.isVerified || false);

      // Generate QR code with both fingerprints
      const qrData = JSON.stringify({
        myFingerprint: myResponse.data.fingerprint,
        contactFingerprint: contactResponse.data.fingerprint
      });
      const qrUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2
      });
      setQrCodeUrl(qrUrl);
    } catch (err) {
      console.error('Error fetching encryption keys:', err);
      setError('Failed to load encryption keys');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!window.confirm(`Verify encryption keys with ${contactName}?`)) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/messaging/v5/encryption/verify', {
        contactId,
        verifiedAt: new Date().toISOString()
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        setIsVerified(true);
        if (onVerified) onVerified();
        alert('Encryption keys verified successfully!');
      }
    } catch (err) {
      setError('Failed to verify keys');
    } finally {
      setLoading(false);
    }
  };

  const handleManualVerify = () => {
    const cleanedCode = manualCode.replace(/\s/g, '').toUpperCase();
    const cleanedContactFingerprint = contactFingerprint.replace(/\s/g, '').toUpperCase();

    if (cleanedCode === cleanedContactFingerprint) {
      handleVerify();
    } else {
      setError('The code does not match. Please try again.');
    }
  };

  const handleResetKeys = async () => {
    if (!window.confirm('Reset your encryption keys? This will require re-verification with all contacts.')) return;

    setLoading(true);
    setError('');

    try {
      await axios.post('/api/messaging/v5/encryption/keys/reset', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      alert('Encryption keys reset successfully. Please verify again with your contacts.');
      fetchEncryptionKeys();
    } catch (err) {
      setError('Failed to reset keys');
    } finally {
      setLoading(false);
    }
  };

  const formatFingerprint = (fingerprint) => {
    if (!fingerprint) return '';
    return fingerprint.match(/.{1,4}/g)?.join(' ') || fingerprint;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (loading && !myFingerprint) {
    return (
      <div className="encryption-verifier-modal">
        <div className="encryption-verifier-container">
          <div className="loading-state">
            <p>Loading encryption keys...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="encryption-verifier-modal">
      <div className="encryption-verifier-container">
        <div className="verifier-header">
          <h2>🔐 Verify Encryption</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {isVerified && (
          <div className="verified-badge">
            ✓ Keys verified with {contactName}
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <div className="verifier-content">
          <div className="info-section">
            <p className="info-text">
              End-to-end encryption ensures only you and {contactName} can read messages.
              Verify the security codes match to confirm the connection is secure.
            </p>
          </div>

          <div className="verification-methods">
            <button 
              className={`method-btn ${verificationMethod === 'qr' ? 'active' : ''}`}
              onClick={() => setVerificationMethod('qr')}
            >
              📷 Scan QR Code
            </button>
            <button 
              className={`method-btn ${verificationMethod === 'manual' ? 'active' : ''}`}
              onClick={() => setVerificationMethod('manual')}
            >
              🔢 Manual Verification
            </button>
          </div>

          {verificationMethod === 'qr' ? (
            <div className="qr-verification">
              <h3>Scan QR Code</h3>
              <p className="method-description">
                Show this QR code to {contactName} or scan theirs
              </p>
              {qrCodeUrl && (
                <div className="qr-code-display">
                  <img src={qrCodeUrl} alt="Verification QR Code" />
                </div>
              )}
              <p className="method-note">
                Both QR codes should match for successful verification
              </p>
            </div>
          ) : (
            <div className="manual-verification">
              <h3>Manual Verification</h3>
              <p className="method-description">
                Compare these codes with {contactName} over a trusted channel (phone call, in person)
              </p>

              <div className="fingerprint-box">
                <label>Your Security Code</label>
                <div className="fingerprint-display">
                  {formatFingerprint(myFingerprint)}
                </div>
                <button 
                  onClick={() => copyToClipboard(myFingerprint)}
                  className="btn-copy"
                >
                  📋 Copy
                </button>
              </div>

              <div className="fingerprint-box">
                <label>{contactName}'s Security Code</label>
                <div className="fingerprint-display">
                  {formatFingerprint(contactFingerprint)}
                </div>
                <button 
                  onClick={() => copyToClipboard(contactFingerprint)}
                  className="btn-copy"
                >
                  📋 Copy
                </button>
              </div>

              <div className="manual-input">
                <label>Enter {contactName}'s code to verify</label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter security code..."
                  maxLength={64}
                />
              </div>
            </div>
          )}

          <div className="verifier-actions">
            {verificationMethod === 'manual' && manualCode && (
              <button 
                onClick={handleManualVerify}
                disabled={loading}
                className="btn-verify"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            )}
            {!isVerified && verificationMethod === 'qr' && (
              <button 
                onClick={handleVerify}
                disabled={loading}
                className="btn-verify"
              >
                {loading ? 'Verifying...' : 'Mark as Verified'}
              </button>
            )}
          </div>

          <div className="advanced-section">
            <button 
              onClick={handleResetKeys}
              disabled={loading}
              className="btn-reset"
            >
              Reset My Keys
            </button>
            <p className="reset-note">
              Only reset if you believe your keys are compromised
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncryptionKeyVerifier;
