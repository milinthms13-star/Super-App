import React, { useState } from 'react';
import axios from 'axios';
import './KYCUpload.css';

const KYCUpload = ({ driverId, onComplete, onError }) => {
  const [documents, setDocuments] = useState({
    license: null,
    vehicle: null,
    insurance: null,
    pollution: null,
    selfie: null
  });

  const [uploading, setUploading] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const documentLabels = {
    license: 'Driving License',
    vehicle: 'Vehicle Registration (RC)',
    insurance: 'Insurance Certificate',
    pollution: 'Pollution Certificate',
    selfie: 'Selfie for Verification'
  };

  const handleFileSelect = (e, docType) => {
    const file = e.target.files[0];

    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, [docType]: 'File size exceeds 5MB' });
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setErrors({ ...errors, [docType]: 'Only JPG, PNG, or PDF files allowed' });
      return;
    }

    uploadDocument(file, docType);
  };

  const uploadDocument = async (file, docType) => {
    try {
      setUploading({ ...uploading, [docType]: true });
      setErrors({ ...errors, [docType]: null });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', docType);

      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `/api/ridesharing/driver/kyc-upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setDocuments({ ...documents, [docType]: response.data.url });
      setSuccessMessage(`${documentLabels[docType]} uploaded successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Upload failed';
      setErrors({ ...errors, [docType]: errorMsg });
      if (onError) onError(errorMsg);
    } finally {
      setUploading({ ...uploading, [docType]: false });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all documents are uploaded
    const allDocTypes = Object.keys(documents);
    const missingDocs = allDocTypes.filter(doc => !documents[doc]);

    if (missingDocs.length > 0) {
      setErrors({
        ...errors,
        submit: `Missing documents: ${missingDocs
          .map(d => documentLabels[d])
          .join(', ')}`
      });
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `/api/ridesharing/driver/kyc-submit`,
        { documents },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setSuccessMessage(response.data.message);
      if (onComplete) {
        onComplete(response.data);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Submission failed';
      setErrors({ submit: errorMsg });
      if (onError) onError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const isAllDocumentsUploaded = Object.values(documents).every(doc => doc !== null);

  return (
    <div className="kyc-upload-container">
      <div className="kyc-header">
        <h2>Driver Verification (KYC)</h2>
        <p>Please upload all required documents to activate your driver account</p>
      </div>

      <form onSubmit={handleSubmit} className="kyc-form">
        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}

        {/* Driving License */}
        <div className="upload-section">
          <label className="section-label">
            <span className="required">*</span> Driving License
          </label>
          <div className="file-input-wrapper">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileSelect(e, 'license')}
              disabled={uploading.license || documents.license}
              className="file-input"
            />
            <div className="file-input-label">
              {documents.license ? (
                <div className="uploaded">
                  <span className="check-mark">✓</span>
                  <span>Document uploaded</span>
                </div>
              ) : uploading.license ? (
                <div className="uploading">Uploading...</div>
              ) : (
                <div>Click to upload or drag and drop</div>
              )}
            </div>
          </div>
          {errors.license && <div className="error-message">{errors.license}</div>}
        </div>

        {/* Vehicle RC */}
        <div className="upload-section">
          <label className="section-label">
            <span className="required">*</span> Vehicle Registration (RC)
          </label>
          <div className="file-input-wrapper">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileSelect(e, 'vehicle')}
              disabled={uploading.vehicle || documents.vehicle}
              className="file-input"
            />
            <div className="file-input-label">
              {documents.vehicle ? (
                <div className="uploaded">
                  <span className="check-mark">✓</span>
                  <span>Document uploaded</span>
                </div>
              ) : uploading.vehicle ? (
                <div className="uploading">Uploading...</div>
              ) : (
                <div>Click to upload or drag and drop</div>
              )}
            </div>
          </div>
          {errors.vehicle && <div className="error-message">{errors.vehicle}</div>}
        </div>

        {/* Insurance Certificate */}
        <div className="upload-section">
          <label className="section-label">
            <span className="required">*</span> Insurance Certificate
          </label>
          <div className="file-input-wrapper">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileSelect(e, 'insurance')}
              disabled={uploading.insurance || documents.insurance}
              className="file-input"
            />
            <div className="file-input-label">
              {documents.insurance ? (
                <div className="uploaded">
                  <span className="check-mark">✓</span>
                  <span>Document uploaded</span>
                </div>
              ) : uploading.insurance ? (
                <div className="uploading">Uploading...</div>
              ) : (
                <div>Click to upload or drag and drop</div>
              )}
            </div>
          </div>
          {errors.insurance && <div className="error-message">{errors.insurance}</div>}
        </div>

        {/* Pollution Certificate */}
        <div className="upload-section">
          <label className="section-label">
            <span className="required">*</span> Pollution Certificate
          </label>
          <div className="file-input-wrapper">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileSelect(e, 'pollution')}
              disabled={uploading.pollution || documents.pollution}
              className="file-input"
            />
            <div className="file-input-label">
              {documents.pollution ? (
                <div className="uploaded">
                  <span className="check-mark">✓</span>
                  <span>Document uploaded</span>
                </div>
              ) : uploading.pollution ? (
                <div className="uploading">Uploading...</div>
              ) : (
                <div>Click to upload or drag and drop</div>
              )}
            </div>
          </div>
          {errors.pollution && <div className="error-message">{errors.pollution}</div>}
        </div>

        {/* Selfie */}
        <div className="upload-section">
          <label className="section-label">
            <span className="required">*</span> Selfie for Verification
          </label>
          <div className="file-input-wrapper">
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => handleFileSelect(e, 'selfie')}
              disabled={uploading.selfie || documents.selfie}
              className="file-input"
            />
            <div className="file-input-label">
              {documents.selfie ? (
                <div className="uploaded">
                  <span className="check-mark">✓</span>
                  <span>Document uploaded</span>
                </div>
              ) : uploading.selfie ? (
                <div className="uploading">Uploading...</div>
              ) : (
                <div>Click to upload or drag and drop</div>
              )}
            </div>
          </div>
          {errors.selfie && <div className="error-message">{errors.selfie}</div>}
        </div>

        {errors.submit && (
          <div className="error-message full-width">{errors.submit}</div>
        )}

        <div className="upload-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(Object.values(documents).filter(d => d).length / 5) * 100}%` }}
            ></div>
          </div>
          <p className="progress-text">
            {Object.values(documents).filter(d => d).length} of 5 documents uploaded
          </p>
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={submitting || !isAllDocumentsUploaded}
        >
          {submitting ? 'Submitting for Verification...' : 'Submit for Verification'}
        </button>

        <p className="info-text">
          Your documents will be verified within 24-48 hours. You'll receive a notification once verified.
        </p>
      </form>
    </div>
  );
};

export default KYCUpload;
