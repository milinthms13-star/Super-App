import React, { useState } from 'react';
import { financeApi } from '../financeApi';

const DocumentVerificationPanel = ({ onClose, onVerified }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('aadhaar');
  const [verificationResult, setVerificationResult] = useState(null);
  const [formData, setFormData] = useState({
    aadhaarNumber: '',
    panNumber: '',
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a document to verify');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const formDataToSend = new FormData();
      formDataToSend.append('document', selectedFile);
      formDataToSend.append('documentType', documentType);
      
      if (documentType === 'aadhaar' && formData.aadhaarNumber) {
        formDataToSend.append('aadhaarNumber', formData.aadhaarNumber);
      }
      if (documentType === 'pan' && formData.panNumber) {
        formDataToSend.append('panNumber', formData.panNumber);
      }

      const response = await financeApi.verifyDocument(formDataToSend);
      
      if (response.success) {
        setVerificationResult(response.data);
        if (onVerified) {
          onVerified(response.data);
        }
      } else {
        setError(response.message || 'Verification failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderExtractedData = () => {
    if (!verificationResult?.ocrExtracted) return null;

    const extracted = verificationResult.ocrExtracted;
    const fields = [];

    if (extracted.name) fields.push({ label: 'Name', value: extracted.name });
    if (extracted.aadhaarNumber) fields.push({ label: 'Aadhaar Number', value: extracted.aadhaarNumber });
    if (extracted.panNumber) fields.push({ label: 'PAN Number', value: extracted.panNumber });
    if (extracted.dob) fields.push({ label: 'Date of Birth', value: extracted.dob });
    if (extracted.gender) fields.push({ label: 'Gender', value: extracted.gender });
    if (extracted.accountNumber) fields.push({ label: 'Account Number', value: extracted.accountNumber });
    if (extracted.ifscCode) fields.push({ label: 'IFSC Code', value: extracted.ifscCode });
    if (extracted.accountHolderName) fields.push({ label: 'Account Holder', value: extracted.accountHolderName });
    if (extracted.employeeName) fields.push({ label: 'Employee Name', value: extracted.employeeName });
    if (extracted.netSalary) fields.push({ label: 'Net Salary', value: `₹${parseFloat(extracted.netSalary).toLocaleString()}` });
    if (extracted.salaryMonth) fields.push({ label: 'Salary Month', value: extracted.salaryMonth });

    return fields;
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3>Document Verification</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.content}>
          {!verificationResult ? (
            <form onSubmit={handleVerify} style={styles.form}>
              <div style={styles.formGroup}>
                <label>Document Type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  style={styles.select}
                >
                  <option value="aadhaar">Aadhaar Card</option>
                  <option value="pan">PAN Card</option>
                  <option value="bankStatement">Bank Statement</option>
                  <option value="salarySlip">Salary Slip</option>
                </select>
              </div>

              {documentType === 'aadhaar' && (
                <div style={styles.formGroup}>
                  <label>Aadhaar Number (optional, for DigiLocker verification)</label>
                  <input
                    type="text"
                    value={formData.aadhaarNumber}
                    onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                    placeholder="1234 5678 9012"
                    maxLength="12"
                    style={styles.input}
                  />
                </div>
              )}

              {documentType === 'pan' && (
                <div style={styles.formGroup}>
                  <label>PAN Number (optional, for DigiLocker verification)</label>
                  <input
                    type="text"
                    value={formData.panNumber}
                    onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                    placeholder="ABCDE1234F"
                    maxLength="10"
                    style={styles.input}
                  />
                </div>
              )}

              <div style={styles.formGroup}>
                <label>Upload Document</label>
                <div style={styles.fileInputWrapper}>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    style={styles.fileInput}
                    required
                  />
                  {selectedFile && (
                    <div style={styles.fileInfo}>
                      📄 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </div>
                  )}
                </div>
                <small style={styles.helpText}>
                  Supported formats: JPG, PNG, PDF (Max 10MB)
                </small>
              </div>

              <button type="submit" disabled={loading} style={styles.submitBtn}>
                {loading ? 'Verifying Document...' : 'Verify Document'}
              </button>

              <div style={styles.infoBox}>
                <p><strong>Verification Process:</strong></p>
                <ul>
                  <li>✓ Document quality check</li>
                  <li>✓ OCR text extraction</li>
                  <li>✓ DigiLocker verification (if number provided)</li>
                  <li>✓ Data validation</li>
                </ul>
              </div>
            </form>
          ) : (
            <div style={styles.results}>
              <div style={styles.successBanner}>
                ✓ Document Verified Successfully
              </div>

              <div style={styles.section}>
                <h4>Quality Check</h4>
                <div style={styles.qualityCard}>
                  <div style={styles.qualityScore}>
                    <div style={styles.scoreCircle}>
                      {verificationResult.qualityScore || 0}
                    </div>
                    <div>Quality Score</div>
                  </div>
                  <div style={styles.qualityStatus}>
                    {verificationResult.qualityScore >= 70 ? (
                      <span style={{ color: '#4caf50' }}>✓ Good Quality</span>
                    ) : (
                      <span style={{ color: '#ff9800' }}>⚠ Fair Quality</span>
                    )}
                  </div>
                </div>
              </div>

              {renderExtractedData() && renderExtractedData().length > 0 && (
                <div style={styles.section}>
                  <h4>Extracted Information (OCR)</h4>
                  <div style={styles.dataGrid}>
                    {renderExtractedData().map((field, idx) => (
                      <div key={idx} style={styles.dataItem}>
                        <span style={styles.dataLabel}>{field.label}:</span>
                        <strong style={styles.dataValue}>{field.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {verificationResult.verification && (
                <div style={styles.section}>
                  <h4>DigiLocker Verification</h4>
                  <div style={verificationResult.verification.verified ? styles.verifiedBox : styles.unverifiedBox}>
                    {verificationResult.verification.verified ? (
                      <>
                        <div style={styles.verifiedIcon}>✓</div>
                        <div>
                          <strong>Verified via DigiLocker</strong>
                          <p>Document authenticity confirmed</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={styles.unverifiedIcon}>⚠</div>
                        <div>
                          <strong>Manual Verification Required</strong>
                          <p>DigiLocker verification not available</p>
                        </div>
                      </>
                    )}
                  </div>

                  {verificationResult.verification.verified && verificationResult.verification.data && (
                    <div style={styles.verificationData}>
                      {verificationResult.verification.data.name && (
                        <div style={styles.dataItem}>
                          <span>Name:</span>
                          <strong>{verificationResult.verification.data.name}</strong>
                        </div>
                      )}
                      {verificationResult.verification.data.dob && (
                        <div style={styles.dataItem}>
                          <span>DOB:</span>
                          <strong>{verificationResult.verification.data.dob}</strong>
                        </div>
                      )}
                      {verificationResult.verification.data.status && (
                        <div style={styles.dataItem}>
                          <span>Status:</span>
                          <strong>{verificationResult.verification.data.status}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div style={styles.actions}>
                <button onClick={() => setVerificationResult(null)} style={styles.newVerificationBtn}>
                  Verify Another Document
                </button>
                <button onClick={onClose} style={styles.doneBtn}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
  },
  error: {
    padding: '15px 20px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderBottom: '1px solid #ef5350',
  },
  content: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
  },
  form: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  formGroup: {
    marginBottom: '20px',
  },
  select: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    marginTop: '5px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    marginTop: '5px',
  },
  fileInputWrapper: {
    marginTop: '5px',
  },
  fileInput: {
    width: '100%',
    padding: '10px',
    border: '2px dashed #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  fileInfo: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    fontSize: '14px',
  },
  helpText: {
    display: 'block',
    marginTop: '5px',
    fontSize: '12px',
    color: '#666',
  },
  submitBtn: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px',
  },
  infoBox: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#e3f2fd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  results: {
    maxWidth: '650px',
    margin: '0 auto',
  },
  successBanner: {
    padding: '15px',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: '4px',
    marginBottom: '20px',
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: '600',
  },
  section: {
    marginBottom: '30px',
  },
  qualityCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    marginTop: '15px',
  },
  qualityScore: {
    textAlign: 'center',
  },
  scoreCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#1976d2',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  qualityStatus: {
    fontSize: '18px',
    fontWeight: '600',
  },
  dataGrid: {
    display: 'grid',
    gap: '12px',
    marginTop: '15px',
  },
  dataItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
  },
  dataLabel: {
    color: '#666',
  },
  dataValue: {
    color: '#333',
  },
  verifiedBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '20px',
    backgroundColor: '#e8f5e9',
    border: '2px solid #4caf50',
    borderRadius: '8px',
    marginTop: '15px',
  },
  unverifiedBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '20px',
    backgroundColor: '#fff3e0',
    border: '2px solid #ff9800',
    borderRadius: '8px',
    marginTop: '15px',
  },
  verifiedIcon: {
    fontSize: '48px',
    color: '#4caf50',
  },
  unverifiedIcon: {
    fontSize: '48px',
    color: '#ff9800',
  },
  verificationData: {
    marginTop: '15px',
    padding: '15px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    marginTop: '30px',
  },
  newVerificationBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  doneBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
  },
};

export default DocumentVerificationPanel;
