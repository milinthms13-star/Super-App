import React, { useState, useRef } from 'react';

const BulkImport = ({
  onImport,
  onClose,
  existingListings = [],
}) => {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('idle');
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const REQUIRED_FIELDS = ['title', 'category', 'price'];
  const OPTIONAL_FIELDS = ['description', 'location', 'condition', 'tags', 'image_urls'];
  const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

  // CSV Template
  const csvTemplate = `title,category,price,condition,location,description,tags
iPhone 13,Electronics,45000,Like New,Mumbai,"Great condition, original box",iphone;smartphone
Wooden Chair,Furniture,2500,Good,Delhi,Comfortable and sturdy,furniture;chair
Mountain Bike,Sports,15000,Used,Bangalore,All terrain ready,bike;sports`;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setUploadedFile(file);
    parseCSVFile(file);
  };

  const parseCSVFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          setParseErrors(['CSV file must have at least a header row and one data row']);
          return;
        }

        // Parse header
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        // Validate required fields
        const missingFields = REQUIRED_FIELDS.filter(f => !headers.includes(f));
        if (missingFields.length > 0) {
          setParseErrors([`Missing required columns: ${missingFields.join(', ')}`]);
          return;
        }

        // Parse data rows
        const rows = [];
        const errors = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row = {};
          let isValid = true;

          headers.forEach((header, idx) => {
            if (ALL_FIELDS.includes(header)) {
              row[header] = values[idx] || '';
            }
          });

          // Validate required fields
          REQUIRED_FIELDS.forEach(field => {
            if (!row[field]) {
              errors.push(`Row ${i + 1}: Missing ${field}`);
              isValid = false;
            }
          });

          // Validate price
          if (row.price && isNaN(parseFloat(row.price))) {
            errors.push(`Row ${i + 1}: Invalid price format`);
            isValid = false;
          }

          if (isValid) {
            rows.push({ ...row, rowNumber: i + 1 });
          }
        }

        setCsvData(rows);
        setParseErrors(errors);
      } catch (error) {
        setParseErrors([`Error parsing CSV: ${error.message}`]);
      }
    };

    reader.readAsText(file);
  };

  const handleImport = () => {
    if (csvData.length === 0) {
      alert('No valid data to import');
      return;
    }

    setIsImporting(true);
    setImportStatus('importing');
    setSuccessCount(0);
    setErrorCount(0);

    // Simulate importing with progress
    let completed = 0;
    const interval = setInterval(() => {
      completed += Math.random() * 30;
      if (completed >= 100) {
        completed = 100;
        clearInterval(interval);

        // Success simulation
        setSuccessCount(csvData.length);
        setImportProgress(100);
        setImportStatus('success');
        setIsImporting(false);

        if (onImport) {
          onImport(csvData);
        }
      } else {
        setImportProgress(Math.floor(completed));
      }
    }, 300);
  };

  const handleDownloadTemplate = () => {
    const element = document.createElement('a');
    const file = new Blob([csvTemplate], { type: 'text/csv' });
    element.href = URL.createObjectURL(file);
    element.download = 'listing_template.csv';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleClickFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bulk-import-modal">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="bulk-import-header">
          <h2>📂 Bulk Import Listings</h2>
          <p>Upload multiple listings at once using a CSV file</p>
        </div>

        {/* Tabs */}
        <div className="import-tabs">
          <button
            className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            📤 Upload
          </button>
          <button
            className={`tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
            onClick={() => setActiveTab('guide')}
          >
            📖 Guide
          </button>
          <button
            className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
            disabled={csvData.length === 0}
          >
            👁️ Preview
          </button>
        </div>

        <div className="import-content">
          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <>
              {importStatus === 'idle' ? (
                <>
                  {/* File Drop Area */}
                  <div
                    className={`drop-zone ${dragActive ? 'active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <div className="drop-content">
                      <span className="drop-icon">📁</span>
                      <h3>Drag and drop CSV file here</h3>
                      <p>or</p>
                      <button className="browse-btn" onClick={handleClickFileInput}>
                        Browse Files
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                        hidden
                      />
                    </div>
                  </div>

                  {/* File Info */}
                  {uploadedFile && (
                    <div className="file-info">
                      <span className="file-icon">✓</span>
                      <div>
                        <p className="file-name">{uploadedFile.name}</p>
                        <p className="file-size">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                      </div>
                      <button
                        className="change-file-btn"
                        onClick={() => {
                          setUploadedFile(null);
                          setCsvData([]);
                          setParseErrors([]);
                        }}
                      >
                        Change
                      </button>
                    </div>
                  )}

                  {/* Parse Errors */}
                  {parseErrors.length > 0 && (
                    <div className="error-list">
                      <h4>⚠️ Issues Found:</h4>
                      <ul>
                        {parseErrors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* CSV Data Preview */}
                  {csvData.length > 0 && parseErrors.length === 0 && (
                    <div className="import-ready">
                      <div className="ready-check">
                        <span>✓</span>
                        <span>{csvData.length} valid listings ready to import</span>
                      </div>
                    </div>
                  )}

                  {/* Download Template */}
                  <div className="template-section">
                    <p>New to CSV format?</p>
                    <button className="template-btn" onClick={handleDownloadTemplate}>
                      📥 Download Template
                    </button>
                  </div>
                </>
              ) : importStatus === 'importing' ? (
                <div className="import-progress">
                  <div className="progress-info">
                    <h3>Importing Listings...</h3>
                    <p>{Math.floor(importProgress)}%</p>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="import-result">
                  <div className="result-icon success">✓</div>
                  <h3>Import Complete!</h3>
                  <div className="result-stats">
                    <div className="stat">
                      <span className="stat-number">{successCount}</span>
                      <span className="stat-label">Listings Imported</span>
                    </div>
                    {errorCount > 0 && (
                      <div className="stat error">
                        <span className="stat-number">{errorCount}</span>
                        <span className="stat-label">Errors</span>
                      </div>
                    )}
                  </div>
                  <button className="done-btn" onClick={onClose}>
                    Done
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              {importStatus === 'idle' && (
                <div className="modal-actions">
                  <button className="cancel-btn" onClick={onClose}>
                    Cancel
                  </button>
                  <button
                    className="primary-btn"
                    onClick={handleImport}
                    disabled={csvData.length === 0 || parseErrors.length > 0}
                  >
                    Import Listings
                  </button>
                </div>
              )}
            </>
          )}

          {/* Guide Tab */}
          {activeTab === 'guide' && (
            <div className="guide-content">
              <h3>CSV Format Guide</h3>

              <div className="guide-section">
                <h4>📋 Required Columns</h4>
                <ul>
                  <li><strong>title</strong> - Name/title of the item</li>
                  <li><strong>category</strong> - Product category (Electronics, Furniture, etc.)</li>
                  <li><strong>price</strong> - Price in rupees (numbers only)</li>
                </ul>
              </div>

              <div className="guide-section">
                <h4>📝 Optional Columns</h4>
                <ul>
                  <li><strong>description</strong> - Item description</li>
                  <li><strong>location</strong> - Location where item is available</li>
                  <li><strong>condition</strong> - New, Like New, Good, Fair, Poor</li>
                  <li><strong>tags</strong> - Comma-separated tags (use semicolon between multiple tags)</li>
                  <li><strong>image_urls</strong> - URLs of images (semicolon-separated)</li>
                </ul>
              </div>

              <div className="guide-section">
                <h4>💡 Tips</h4>
                <ul>
                  <li>Use the template for correct formatting</li>
                  <li>Maximum 100 listings per import</li>
                  <li>Check for errors before importing</li>
                  <li>You can edit listings after import</li>
                </ul>
              </div>

              <button className="template-btn" onClick={handleDownloadTemplate}>
                📥 Download Template
              </button>
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && csvData.length > 0 && (
            <div className="preview-content">
              <h3>Preview ({csvData.length} listings)</h3>
              <div className="preview-table-wrapper">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {REQUIRED_FIELDS.map(field => (
                        <th key={field}>{field}</th>
                      ))}
                      {OPTIONAL_FIELDS.map(field => (
                        csvData.some(row => row[field]) && <th key={field}>{field}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 10).map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.rowNumber}</td>
                        {REQUIRED_FIELDS.map(field => (
                          <td key={field} className="cell-required">
                            {row[field]}
                          </td>
                        ))}
                        {OPTIONAL_FIELDS.map(field => (
                          csvData.some(r => r[field]) && (
                            <td key={field}>{row[field]}</td>
                          )
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvData.length > 10 && (
                <p className="preview-note">Showing 10 of {csvData.length} listings</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkImport;
