import React, { useState, useCallback, useRef } from 'react';
import './LabReportProcessing.css';

const LabReportProcessing = ({ onSaveReport, familyMembers = [], loading }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('idle'); // idle, processing, completed, error
  const [extractedData, setExtractedData] = useState(null);
  const [parsedResults, setParsedResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState('Self');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportCategory, setReportCategory] = useState('Lab Report');
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload an image (JPG, PNG, GIF) or PDF file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploadedFile(file);
    setReportTitle(file.name.replace(/\.[^/.]+$/, ''));

    // Create preview URL for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl('');
    }

    // Reset OCR state
    setOcrStatus('idle');
    setExtractedData(null);
    setParsedResults([]);
  }, []);

  const processWithOCR = useCallback(async () => {
    if (!uploadedFile) {
      alert('Please upload a file first');
      return;
    }

    setOcrStatus('processing');
    setOcrProgress(0);

    try {
      // Simulate OCR processing with Tesseract.js
      // In production, use: import Tesseract from 'tesseract.js';
      
      // Progress simulation
      const progressInterval = setInterval(() => {
        setOcrProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 200);

      // Simulate OCR delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      clearInterval(progressInterval);
      setOcrProgress(100);

      // Simulate extracted text (in production, this would come from Tesseract.js)
      const mockExtractedText = `
Patient Name: ${selectedMember}
Report Date: ${reportDate}
Lab Name: City Diagnostics Center

Complete Blood Count (CBC):
Hemoglobin: 14.2 g/dL (Normal: 12-16 g/dL)
RBC Count: 4.8 million/mcL (Normal: 4.5-5.5 million/mcL)
WBC Count: 7200 cells/mcL (Normal: 4000-11000 cells/mcL)
Platelet Count: 250000 cells/mcL (Normal: 150000-450000 cells/mcL)

Lipid Profile:
Total Cholesterol: 185 mg/dL (Normal: <200 mg/dL)
LDL Cholesterol: 110 mg/dL (Normal: <130 mg/dL)
HDL Cholesterol: 55 mg/dL (Normal: >40 mg/dL)
Triglycerides: 140 mg/dL (Normal: <150 mg/dL)

Blood Sugar:
Fasting Blood Sugar: 95 mg/dL (Normal: 70-100 mg/dL)
HbA1c: 5.4% (Normal: <5.7%)

Overall Status: NORMAL
      `.trim();

      setExtractedData(mockExtractedText);

      // Parse extracted text into structured data
      const parsed = parseLabReportText(mockExtractedText);
      setParsedResults(parsed);

      setOcrStatus('completed');
    } catch (error) {
      console.error('OCR processing error:', error);
      setOcrStatus('error');
      alert('Failed to process the report. Please try again.');
    }
  }, [uploadedFile, selectedMember, reportDate]);

  const parseLabReportText = (text) => {
    const results = [];

    // Extract test results using regex patterns
    const testPatterns = [
      // Pattern: Test Name: Value Unit (Range)
      /([A-Za-z\s]+):\s*([0-9.]+)\s*([a-zA-Z/%]+)\s*\(Normal:\s*([^)]+)\)/g,
      // Pattern: Test Name: Value (Range)
      /([A-Za-z\s]+):\s*([0-9.]+)\s*\(Normal:\s*([^)]+)\)/g,
    ];

    for (const pattern of testPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const testName = match[1].trim();
        const value = parseFloat(match[2]);
        const unit = match[3] || '';
        const normalRange = match[3] ? match[4] : match[3];

        // Determine status based on normal range
        const status = determineTestStatus(value, normalRange);

        results.push({
          testName,
          value,
          unit,
          normalRange,
          status,
        });
      }
    }

    return results;
  };

  const determineTestStatus = (value, rangeText) => {
    // Parse range text (e.g., "70-100", "<200", ">40")
    if (rangeText.includes('-')) {
      const [min, max] = rangeText.split('-').map((s) => parseFloat(s.replace(/[^0-9.]/g, '')));
      if (value < min) return 'low';
      if (value > max) return 'high';
      return 'normal';
    } else if (rangeText.startsWith('<')) {
      const max = parseFloat(rangeText.replace(/[^0-9.]/g, ''));
      return value <= max ? 'normal' : 'high';
    } else if (rangeText.startsWith('>')) {
      const min = parseFloat(rangeText.replace(/[^0-9.]/g, ''));
      return value >= min ? 'normal' : 'low';
    }
    return 'normal';
  };

  const handleSaveReport = useCallback(async () => {
    if (!uploadedFile) {
      alert('Please upload a file');
      return;
    }

    if (!reportTitle.trim()) {
      alert('Please enter a report title');
      return;
    }

    const reportData = {
      meta: {
        title: reportTitle,
        category: reportCategory,
        doctorName: extractedData ? extractDoctorName(extractedData) : 'Lab Partner',
        familyMember: selectedMember,
        recordDate: reportDate,
        fileName: uploadedFile.name,
        fileType: uploadedFile.type,
        ocrProcessed: ocrStatus === 'completed',
        extractedText: extractedData || '',
        parsedResults: parsedResults,
        overallStatus: determineOverallStatus(parsedResults),
      },
      file: uploadedFile,
    };

    try {
      await onSaveReport(reportData);
      
      // Reset form
      setUploadedFile(null);
      setPreviewUrl('');
      setOcrStatus('idle');
      setExtractedData(null);
      setParsedResults([]);
      setReportTitle('');
      setReportDate(new Date().toISOString().split('T')[0]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Save report error:', error);
      alert('Failed to save report. Please try again.');
    }
  }, [uploadedFile, reportTitle, reportCategory, selectedMember, reportDate, extractedData, parsedResults, ocrStatus, onSaveReport]);

  const extractDoctorName = (text) => {
    const doctorMatch = text.match(/Dr\.\s*([A-Za-z\s]+)/);
    return doctorMatch ? doctorMatch[1].trim() : 'Lab Partner';
  };

  const determineOverallStatus = (results) => {
    if (results.length === 0) return 'unknown';
    
    const hasAbnormal = results.some((r) => r.status !== 'normal');
    const hasCritical = results.some((r) => r.status === 'high' || r.status === 'low');
    
    if (hasCritical) return 'abnormal';
    if (hasAbnormal) return 'borderline';
    return 'normal';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal':
        return '#10b981';
      case 'high':
      case 'low':
        return '#ef4444';
      case 'borderline':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const fakeEvent = { target: { files: [file] } };
      handleFileSelect(fakeEvent);
    }
  }, [handleFileSelect]);

  return (
    <div className="lab-report-processing">
      <div className="lab-report-processing-header">
        <h2>Lab Report Processing with OCR</h2>
        <p>Upload lab reports and automatically extract test results using AI-powered OCR</p>
      </div>

      <div className="lab-report-processing-content">
        {/* Upload Section */}
        <div className="lab-report-upload-section">
          <div
            className="lab-report-dropzone"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            {uploadedFile ? (
              <div className="lab-report-file-preview">
                {previewUrl ? (
                  <img src={previewUrl} alt="Report preview" className="lab-report-preview-image" />
                ) : (
                  <div className="lab-report-pdf-icon">📄</div>
                )}
                <p className="lab-report-filename">{uploadedFile.name}</p>
                <p className="lab-report-filesize">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="lab-report-dropzone-content">
                <div className="lab-report-upload-icon">📤</div>
                <p className="lab-report-upload-text">
                  Drag & drop your lab report here
                </p>
                <p className="lab-report-upload-subtext">
                  or click to browse files
                </p>
                <p className="lab-report-upload-formats">
                  Supported formats: JPG, PNG, GIF, PDF (Max 10MB)
                </p>
              </div>
            )}
          </div>

          {uploadedFile && (
            <div className="lab-report-actions">
              <button
                className="lab-report-btn lab-report-btn-secondary"
                onClick={() => {
                  setUploadedFile(null);
                  setPreviewUrl('');
                  setOcrStatus('idle');
                  setExtractedData(null);
                  setParsedResults([]);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                Clear File
              </button>
              
              <button
                className="lab-report-btn lab-report-btn-primary"
                onClick={processWithOCR}
                disabled={ocrStatus === 'processing' || loading}
              >
                {ocrStatus === 'processing' ? 'Processing...' : 'Process with OCR'}
              </button>
            </div>
          )}
        </div>

        {/* OCR Progress */}
        {ocrStatus === 'processing' && (
          <div className="lab-report-ocr-progress">
            <p className="lab-report-progress-label">Processing report with OCR...</p>
            <div className="lab-report-progress-bar">
              <div
                className="lab-report-progress-fill"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
            <p className="lab-report-progress-percent">{ocrProgress}%</p>
          </div>
        )}

        {/* Extracted Data */}
        {ocrStatus === 'completed' && extractedData && (
          <div className="lab-report-results">
            <h3>Extracted Text</h3>
            <div className="lab-report-extracted-text">
              <pre>{extractedData}</pre>
            </div>

            {parsedResults.length > 0 && (
              <>
                <h3>Parsed Test Results</h3>
                <div className="lab-report-parsed-results">
                  <table className="lab-report-results-table">
                    <thead>
                      <tr>
                        <th>Test Name</th>
                        <th>Value</th>
                        <th>Unit</th>
                        <th>Normal Range</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedResults.map((result, index) => (
                        <tr key={index}>
                          <td>{result.testName}</td>
                          <td>{result.value}</td>
                          <td>{result.unit}</td>
                          <td>{result.normalRange}</td>
                          <td>
                            <span
                              className="lab-report-status-badge"
                              style={{ backgroundColor: getStatusColor(result.status) }}
                            >
                              {result.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="lab-report-insights">
                  <h4>AI Insights</h4>
                  <ul>
                    {parsedResults.filter(r => r.status !== 'normal').length > 0 ? (
                      parsedResults
                        .filter(r => r.status !== 'normal')
                        .map((result, index) => (
                          <li key={index} className="lab-report-insight-item">
                            <strong>{result.testName}</strong> is{' '}
                            <span style={{ color: getStatusColor(result.status) }}>
                              {result.status}
                            </span>
                            . Consider discussing with your doctor.
                          </li>
                        ))
                    ) : (
                      <li className="lab-report-insight-item lab-report-insight-positive">
                        All test results are within normal range. Great job maintaining your health!
                      </li>
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}

        {/* Save Form */}
        {uploadedFile && (
          <div className="lab-report-save-form">
            <h3>Save Report Details</h3>
            
            <div className="lab-report-form-grid">
              <div className="lab-report-form-group">
                <label htmlFor="reportTitle">Report Title *</label>
                <input
                  id="reportTitle"
                  type="text"
                  className="lab-report-input"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="e.g., Complete Blood Count"
                />
              </div>

              <div className="lab-report-form-group">
                <label htmlFor="reportCategory">Category</label>
                <select
                  id="reportCategory"
                  className="lab-report-select"
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                >
                  <option value="Lab Report">Lab Report</option>
                  <option value="Scan Report">Scan Report</option>
                  <option value="X-Ray">X-Ray</option>
                  <option value="MRI">MRI</option>
                  <option value="CT Scan">CT Scan</option>
                  <option value="Ultrasound">Ultrasound</option>
                  <option value="Blood Test">Blood Test</option>
                  <option value="Urine Test">Urine Test</option>
                </select>
              </div>

              <div className="lab-report-form-group">
                <label htmlFor="familyMember">Family Member</label>
                <select
                  id="familyMember"
                  className="lab-report-select"
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                >
                  {familyMembers.map((member) => (
                    <option key={member} value={member}>
                      {member}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lab-report-form-group">
                <label htmlFor="reportDate">Report Date</label>
                <input
                  id="reportDate"
                  type="date"
                  className="lab-report-input"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                />
              </div>
            </div>

            <div className="lab-report-form-actions">
              <button
                className="lab-report-btn lab-report-btn-primary lab-report-btn-large"
                onClick={handleSaveReport}
                disabled={loading || !reportTitle.trim()}
              >
                {loading ? 'Saving...' : 'Save to Health Records'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabReportProcessing;
