import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './constants';
import TrustScoreBadge from './TrustScoreBadge';
import VideoRecorder from './VideoRecorder';
import './VerificationCenter.css';

const VerificationCenter = () => {
  const [trustScore, setTrustScore] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [scoreRes, docsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/matrimonial/verification/trust-score`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        }),
        axios.get(`${API_BASE_URL}/matrimonial/verification/documents`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        }),
      ]);

      setTrustScore(scoreRes.data.data);
      setDocuments(docsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch verification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (documentType, file, documentNumber = '') => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', documentType);
      if (documentNumber) {
        formData.append('documentNumber', documentNumber);
      }

      await axios.post(
        `${API_BASE_URL}/matrimonial/verification/upload-document`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      alert('Document uploaded successfully!');
      fetchData();
    } catch (error) {
      console.error('Document upload failed:', error);
      alert(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleLinkedInVerify = async (linkedInUrl) => {
    try {
      await axios.post(
        `${API_BASE_URL}/matrimonial/verification/verify-linkedin`,
        { linkedInUrl },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        }
      );

      alert('LinkedIn profile verified successfully!');
      fetchData();
    } catch (error) {
      console.error('LinkedIn verification failed:', error);
      alert('Failed to verify LinkedIn profile');
    }
  };

  const getVerificationIcon = (verified) => {
    return verified ? '✅' : '⏳';
  };

  const getStatusColor = (status) => {
    const colors = {
      verified: '#4caf50',
      pending: '#ff9800',
      rejected: '#f44336',
      expired: '#999',
    };
    return colors[status] || '#999';
  };

  if (loading) {
    return <div className="verification-loading">Loading verification data...</div>;
  }

  return (
    <div className="verification-center">
      <div className="verification-header">
        <h2>Verification Center</h2>
        <p>Build trust by verifying your identity and credentials</p>
      </div>

      <div className="verification-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          Documents
        </button>
        <button
          className={`tab ${activeTab === 'video' ? 'active' : ''}`}
          onClick={() => setActiveTab('video')}
        >
          Video Profile
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="verification-overview">
          <div className="trust-score-section">
            <TrustScoreBadge trustScore={trustScore} large />
            
            <div className="verification-checklist">
              <h3>Verification Checklist</h3>
              
              <div className="checklist-item">
                <span className="check-icon">
                  {getVerificationIcon(trustScore?.verifications.email.verified)}
                </span>
                <div className="check-content">
                  <h4>Email Verification</h4>
                  <p>Verify your email address</p>
                </div>
                <span className="check-points">+10 pts</span>
              </div>

              <div className="checklist-item">
                <span className="check-icon">
                  {getVerificationIcon(trustScore?.verifications.phone.verified)}
                </span>
                <div className="check-content">
                  <h4>Phone Verification</h4>
                  <p>Verify your mobile number via OTP</p>
                </div>
                <span className="check-points">+10 pts</span>
              </div>

              <div className="checklist-item">
                <span className="check-icon">
                  {getVerificationIcon(trustScore?.verifications.photoId.verified)}
                </span>
                <div className="check-content">
                  <h4>Photo ID Verification</h4>
                  <p>Aadhaar, PAN, Passport, or Driving License</p>
                </div>
                <span className="check-points">+20 pts</span>
              </div>

              <div className="checklist-item">
                <span className="check-icon">
                  {getVerificationIcon(trustScore?.verifications.income.verified)}
                </span>
                <div className="check-content">
                  <h4>Income Verification</h4>
                  <p>Salary slip, ITR, or income certificate</p>
                </div>
                <span className="check-points">+15 pts</span>
              </div>

              <div className="checklist-item">
                <span className="check-icon">
                  {getVerificationIcon(trustScore?.verifications.employment.verified)}
                </span>
                <div className="check-content">
                  <h4>Employment Verification</h4>
                  <p>LinkedIn profile or employment letter</p>
                </div>
                <span className="check-points">+15 pts</span>
              </div>

              <div className="checklist-item">
                <span className="check-icon">
                  {getVerificationIcon(trustScore?.verifications.videoProfile.verified)}
                </span>
                <div className="check-content">
                  <h4>Video Profile</h4>
                  <p>30-second video introduction</p>
                </div>
                <span className="check-points">+10 pts</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="verification-documents">
          <div className="upload-section">
            <h3>Upload Verification Documents</h3>
            
            <div className="document-upload-grid">
              <DocumentUploadCard
                title="Photo ID"
                description="Aadhaar, PAN, Passport, or DL"
                icon="🆔"
                documentType="aadhaar"
                onUpload={handleDocumentUpload}
                uploading={uploading}
              />

              <DocumentUploadCard
                title="Income Proof"
                description="Salary slip or ITR"
                icon="💰"
                documentType="salary_slip"
                onUpload={handleDocumentUpload}
                uploading={uploading}
              />

              <DocumentUploadCard
                title="Employment"
                description="Offer letter or ID card"
                icon="💼"
                documentType="employment_letter"
                onUpload={handleDocumentUpload}
                uploading={uploading}
              />

              <DocumentUploadCard
                title="Address Proof"
                description="Utility bill or rental agreement"
                icon="🏠"
                documentType="address_proof"
                onUpload={handleDocumentUpload}
                uploading={uploading}
              />

              <DocumentUploadCard
                title="Education"
                description="Degree certificate"
                icon="🎓"
                documentType="education_certificate"
                onUpload={handleDocumentUpload}
                uploading={uploading}
              />

              <LinkedInVerificationCard
                verified={trustScore?.verifications.employment.verified}
                onVerify={handleLinkedInVerify}
              />
            </div>
          </div>

          <div className="submitted-documents">
            <h3>Submitted Documents</h3>
            {documents.length === 0 ? (
              <p className="no-documents">No documents submitted yet</p>
            ) : (
              <div className="documents-list">
                {documents.map((doc) => (
                  <div key={doc._id} className="document-item">
                    <div className="doc-type">
                      {doc.documentType.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div className="doc-status" style={{ color: getStatusColor(doc.verificationStatus) }}>
                      {doc.verificationStatus.toUpperCase()}
                    </div>
                    <div className="doc-date">
                      {new Date(doc.submittedAt).toLocaleDateString()}
                    </div>
                    {doc.rejectionReason && (
                      <div className="doc-rejection">{doc.rejectionReason}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'video' && (
        <div className="verification-video">
          <h3>Video Profile Introduction</h3>
          <p>Record a 30-60 second video introducing yourself</p>

          {!showVideoRecorder ? (
            <button
              className="btn btn-primary"
              onClick={() => setShowVideoRecorder(true)}
            >
              Start Recording
            </button>
          ) : (
            <VideoRecorder
              onComplete={(videoBlob) => {
                // Upload video
                const formData = new FormData();
                formData.append('video', videoBlob, 'video-profile.webm');
                
                axios.post(
                  `${API_BASE_URL}/matrimonial/verification/upload-video`,
                  formData,
                  {
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem('authToken')}`,
                      'Content-Type': 'multipart/form-data',
                    },
                  }
                ).then(() => {
                  alert('Video uploaded successfully!');
                  setShowVideoRecorder(false);
                  fetchData();
                }).catch(error => {
                  console.error('Video upload failed:', error);
                  alert('Failed to upload video');
                });
              }}
              onCancel={() => setShowVideoRecorder(false)}
            />
          )}
        </div>
      )}
    </div>
  );
};

// Helper component for document upload
const DocumentUploadCard = ({ title, description, icon, documentType, onUpload, uploading }) => {
  const fileInputRef = React.useRef(null);
  const [documentNumber, setDocumentNumber] = React.useState('');

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      onUpload(documentType, file, documentNumber);
    }
  };

  return (
    <div className="document-card">
      <div className="card-icon">{icon}</div>
      <h4>{title}</h4>
      <p>{description}</p>
      
      {['aadhaar', 'pan', 'passport'].includes(documentType) && (
        <input
          type="text"
          placeholder="Document Number"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          className="doc-number-input"
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      <button
        className="btn btn-outline btn-sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
};

// LinkedIn verification card
const LinkedInVerificationCard = ({ verified, onVerify }) => {
  const [linkedInUrl, setLinkedInUrl] = React.useState('');

  return (
    <div className="document-card linkedin-card">
      <div className="card-icon">💼</div>
      <h4>LinkedIn</h4>
      <p>Verify via LinkedIn profile</p>
      
      {!verified ? (
        <>
          <input
            type="text"
            placeholder="LinkedIn Profile URL"
            value={linkedInUrl}
            onChange={(e) => setLinkedInUrl(e.target.value)}
            className="doc-number-input"
          />
          <button
            className="btn btn-outline btn-sm"
            onClick={() => linkedInUrl && onVerify(linkedInUrl)}
            disabled={!linkedInUrl}
          >
            Verify
          </button>
        </>
      ) : (
        <div className="verified-badge">✅ Verified</div>
      )}
    </div>
  );
};

export default VerificationCenter;
