/**
 * Export Manager Component
 * Handles exporting diary entries to CSV, JSON, and PDF
 * Phase 7 - Export to PDF/CSV
 */

import React, { useState } from 'react';
import './Phase7Components.css';

const ExportManager = ({ token, apiUrl = 'http://localhost:5000', onError, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');
  const [includeAnalytics, setIncludeAnalytics] = useState(true);
  const [daysBack, setDaysBack] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);
      setExportComplete(false);

      let url = `${apiUrl}/api/diary/phase7/export/${exportFormat}`;
      
      if (exportFormat === 'csv') {
        url += `?daysBack=${daysBack}&includeAnalytics=${includeAnalytics}`;
      } else if (exportFormat === 'json') {
        url += `?includeAnalytics=${includeAnalytics}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Export failed');

      if (exportFormat === 'csv') {
        // Handle CSV download
        const blob = await response.blob();
        const filename = `diary_export_${new Date().toISOString().split('T')[0]}.csv`;
        downloadBlob(blob, filename);
      } else if (exportFormat === 'json') {
        // Handle JSON download
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const filename = `diary_export_${new Date().toISOString().split('T')[0]}.json`;
        downloadBlob(blob, filename);
      }

      setExportComplete(true);
      onSuccess?.('Export completed successfully');
    } catch (err) {
      const message = err.message || 'Export failed';
      setError(message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="export-manager">
      <div className="export-header">
        <h2>📥 Export Diary</h2>
        <p>Download your diary entries and analytics in multiple formats</p>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {exportComplete && <div className="success-banner">✅ Export completed! Check your downloads.</div>}

      <div className="export-options">
        <div className="option-group">
          <label>Export Format</label>
          <div className="format-buttons">
            {[
              { value: 'csv', label: '📊 CSV', description: 'Spreadsheet format' },
              { value: 'json', label: '{ } JSON', description: 'Complete data' },
              { value: 'pdf', label: '📄 PDF', description: 'Printable document' }
            ].map(format => (
              <button
                key={format.value}
                className={`format-btn ${exportFormat === format.value ? 'active' : ''}`}
                onClick={() => setExportFormat(format.value)}
              >
                <div className="format-label">{format.label}</div>
                <div className="format-desc">{format.description}</div>
              </button>
            ))}
          </div>
        </div>

        {exportFormat === 'csv' && (
          <>
            <div className="option-group">
              <label>Time Period</label>
              <select value={daysBack} onChange={(e) => setDaysBack(parseInt(e.target.value))}>
                <option value={0}>All entries</option>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={180}>Last 6 months</option>
                <option value={365}>Last year</option>
              </select>
            </div>
          </>
        )}

        <div className="option-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeAnalytics}
              onChange={(e) => setIncludeAnalytics(e.target.checked)}
            />
            Include Analytics
          </label>
          <p className="help-text">Adds sentiment analysis, mood data, and statistics</p>
        </div>

        <div className="export-info">
          <h4>ℹ️ What's included:</h4>
          <ul>
            <li>Entry dates and timestamps</li>
            <li>Entry titles and content</li>
            <li>Moods and categories</li>
            <li>Tags</li>
            {includeAnalytics && <li>Sentiment analysis</li>}
            {includeAnalytics && <li>Statistics</li>}
          </ul>
        </div>

        <button
          className="export-button"
          onClick={handleExport}
          disabled={loading}
        >
          {loading ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
        </button>
      </div>

      <div className="export-note">
        <strong>💡 Tip:</strong> Export regularly to keep a backup of your diary.
      </div>
    </div>
  );
};

export default ExportManager;
