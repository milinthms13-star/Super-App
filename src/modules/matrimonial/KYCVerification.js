import React, { useRef, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './constants';

const getStoredAuthToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('accessToken') ||
  localStorage.getItem('token') ||
  '';

const buildAuthConfig = (extraConfig = {}) => {
  const token = getStoredAuthToken();
  const headers = {
    ...(extraConfig.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return {
    ...extraConfig,
    headers,
  };
};

const getProfileId = (profile) => profile?._id || profile?.id || '';

const KYCVerification = ({ onKYCComplete, currentProfile }) => {
  const [kycStatus, setKycStatus] = useState('pending');
  const [documentType, setDocumentType] = useState('aadhaar');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [riskScore, setRiskScore] = useState(0);
  const fileInputRef = useRef(null);
  const cameraRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [selfieImage, setSelfieImage] = useState(null);
  const profileId = getProfileId(currentProfile);

  const documentOptions = [
    { value: 'aadhaar', label: 'Aadhaar Card' },
    { value: 'pan', label: 'PAN Card' },
    { value: 'passport', label: 'Passport' },
    { value: 'voterId', label: 'Voter ID' },
    { value: 'drivingLicense', label: 'Driving License' },
  ];

  const handleFileUpload = async (file) => {
    if (!file) return;

    if (!profileId) {
      setMessage('Save your matrimonial profile before starting KYC verification.');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', documentType);
      formData.append('profileId', profileId);

      const response = await axios.post(
        `${API_BASE_URL}/matrimonial/kyc/upload`,
        formData,
        buildAuthConfig({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      );

      const nextStatus = response.data?.data?.status || response.data?.status || 'under_review';
      const nextRiskScore = response.data?.data?.riskScore ?? response.data?.riskScore ?? 0;

      setMessage(`${documentType} uploaded successfully. Status: ${nextStatus}`);
      setKycStatus(nextStatus);
      setRiskScore(nextRiskScore);

      if (onKYCComplete) {
        onKYCComplete({ documentType, status: nextStatus });
      }
    } catch (error) {
      setMessage(`Upload failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      cameraRef.current.srcObject = stream;
      setIsCameraActive(true);
    } catch (_error) {
      setMessage('Camera access denied. Please check browser permissions.');
    }
  };

  const captureSelfie = () => {
    if (!canvasRef.current || !cameraRef.current) {
      return;
    }

    const context = canvasRef.current.getContext('2d');
    context.drawImage(cameraRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    const imageData = canvasRef.current.toDataURL('image/jpeg');
    setSelfieImage(imageData);

    if (cameraRef.current.srcObject) {
      cameraRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    setIsCameraActive(false);
  };

  const uploadSelfie = async () => {
    if (!selfieImage) return;

    if (!profileId) {
      setMessage('Save your matrimonial profile before uploading a selfie.');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const response = await axios.post(
        `${API_BASE_URL}/matrimonial/kyc/selfie`,
        { selfieImage, profileId },
        buildAuthConfig()
      );

      const livenessScore =
        response.data?.data?.livenessScore ?? response.data?.livenessScore ?? 0;
      const nextRiskScore = response.data?.data?.riskScore ?? response.data?.riskScore ?? 0;
      const nextStatus = response.data?.data?.status || response.data?.status || 'under_review';

      setMessage(`Selfie uploaded. Liveness Score: ${livenessScore}%`);
      setSelfieImage(null);
      setKycStatus(nextStatus);
      setRiskScore(nextRiskScore);
    } catch (error) {
      setMessage(`Selfie upload failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const checkKYCStatus = async () => {
    if (!profileId) {
      setMessage('Save your matrimonial profile before checking KYC status.');
      return;
    }

    try {
      const response = await axios.get(
        `${API_BASE_URL}/matrimonial/kyc/status`,
        buildAuthConfig({
          params: { profileId },
        })
      );

      const nextStatus = response.data?.data?.status || response.data?.status || 'pending';
      const nextRiskScore = response.data?.data?.riskScore ?? response.data?.riskScore ?? 0;

      setKycStatus(nextStatus);
      setRiskScore(nextRiskScore);
      setMessage(`Status: ${nextStatus}`);
    } catch (error) {
      setMessage(`Failed to fetch status: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <div className="kyc-verification-container">
      <div className="kyc-header">
        <h2>Identity Verification (KYC)</h2>
        <p className="kyc-subtitle">Verify your identity to unlock premium features and get a blue tick badge</p>
      </div>

      {message && (
        <div className={`kyc-message ${message.startsWith('Failed') || message.startsWith('Upload failed') || message.startsWith('Selfie upload failed') || message.startsWith('Save') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {riskScore > 0 && (
        <div className="risk-score-display">
          <span>Risk Score: {riskScore}/100</span>
          {riskScore < 30 && <span className="risk-low">Low Risk</span>}
          {riskScore >= 30 && riskScore < 70 && <span className="risk-medium">Medium Risk</span>}
          {riskScore >= 70 && <span className="risk-high">High Risk</span>}
        </div>
      )}

      <div className="kyc-status-badge">
        <span className={`status-${kycStatus}`}>{kycStatus.toUpperCase()}</span>
      </div>

      <div className="kyc-section">
        <h3>Document Upload</h3>
        <div className="document-selector">
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            disabled={uploading || kycStatus === 'approved'}
          >
            {documentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => handleFileUpload(e.target.files[0])}
          style={{ display: 'none' }}
          disabled={uploading}
        />

        <button
          className="btn btn-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || kycStatus === 'approved'}
        >
          {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
      </div>

      <div className="kyc-section">
        <h3>Liveness Verification</h3>
        <p className="kyc-subtitle">Take a selfie to verify you're real</p>

        {!isCameraActive && !selfieImage && (
          <button
            className="btn btn-secondary"
            onClick={startCamera}
            disabled={uploading}
          >
            Start Camera
          </button>
        )}

        {isCameraActive && (
          <>
            <video
              ref={cameraRef}
              autoPlay
              playsInline
              width="300"
              height="300"
              className="camera-preview"
            />
            <canvas
              ref={canvasRef}
              width="300"
              height="300"
              style={{ display: 'none' }}
            />
            <button
              className="btn btn-success"
              onClick={captureSelfie}
            >
              Capture Selfie
            </button>
          </>
        )}

        {selfieImage && (
          <div className="selfie-preview">
            <img src={selfieImage} alt="Selfie preview" width="200" height="200" />
            <div className="selfie-actions">
              <button
                className="btn btn-success"
                onClick={uploadSelfie}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Selfie'}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setSelfieImage(null);
                  startCamera();
                }}
              >
                Retake
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="kyc-section">
        <h3>Verification Status</h3>
        <button
          className="btn btn-outline"
          onClick={checkKYCStatus}
          disabled={uploading}
        >
          Check Status
        </button>
      </div>

      <div className="kyc-info">
        <h4>Why KYC?</h4>
        <ul>
          <li>Ensures profile authenticity</li>
          <li>Prevents fraud and fake profiles</li>
          <li>Unlocks premium features</li>
          <li>Gets you a blue tick badge (if approved)</li>
          <li>Your documents are stored securely</li>
        </ul>
      </div>
    </div>
  );
};

export default KYCVerification;
