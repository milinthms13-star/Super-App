import React, { useState, useEffect } from 'react';
import {
  enableEncryption,
  getEncryptionStatus,
  encryptEntry,
  createBackup,
  getBackupList,
  restoreBackup
} from '../services/diaryService';
import './EncryptionBackupSettings.css';

/**
 * Encryption & Backup Settings Component
 * Manages E2E encryption and cloud backup for diary entries
 */
const EncryptionBackupSettings = () => {
  const [encryptionStatus, setEncryptionStatus] = useState(null);
  const [backupList, setBackupList] = useState([]);
  const [activeTab, setActiveTab] = useState('encryption');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(null);

  useEffect(() => {
    if (activeTab === 'encryption') {
      fetchEncryptionStatus();
    } else if (activeTab === 'backup') {
      fetchBackups();
    }
  }, [activeTab]);

  const fetchEncryptionStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEncryptionStatus();
      setEncryptionStatus(data.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch encryption status');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackups = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBackupList({ limit: 10 });
      setBackupList(data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch backups');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableEncryption = async () => {
    try {
      setLoading(true);
      setError(null);
      await enableEncryption();
      setSuccess('Encryption enabled successfully!');
      fetchEncryptionStatus();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to enable encryption');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreatingBackup(true);
      setError(null);
      await createBackup('manual');
      setSuccess('Backup created! Check the list below for details.');
      fetchBackups();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.message || 'Failed to create backup');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (backupId) => {
    if (!window.confirm('Restore from this backup? Existing entries may be affected.')) {
      return;
    }

    try {
      setRestoringBackup(backupId);
      setError(null);
      await restoreBackup(backupId);
      setSuccess('Backup restore initiated. This may take a few moments.');
      fetchBackups();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.message || 'Failed to restore backup');
    } finally {
      setRestoringBackup(null);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="security-container">
      <div className="security-header">
        <h2>🔐 Encryption & Backup</h2>
        <p className="security-subtitle">Protect your diary with end-to-end encryption and cloud backups</p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="security-success">
          <p>✅ {success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="security-error">
          <p>⚠️ {error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="security-tabs">
        <button
          className={`security-tab ${activeTab === 'encryption' ? 'active' : ''}`}
          onClick={() => setActiveTab('encryption')}
        >
          🔐 E2E Encryption
        </button>
        <button
          className={`security-tab ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          💾 Cloud Backup
        </button>
      </div>

      {/* Encryption Tab */}
      {activeTab === 'encryption' && (
        <div className="security-content">
          {loading ? (
            <div className="security-loading">
              <div className="security-spinner"></div>
              <p>Loading encryption status...</p>
            </div>
          ) : encryptionStatus ? (
            <>
              <div className="security-status-card">
                <div className="security-status-icon">
                  {encryptionStatus.isEnabled ? '✅' : '❌'}
                </div>
                <div className="security-status-info">
                  <h3>{encryptionStatus.isEnabled ? 'Encryption Active' : 'Encryption Disabled'}</h3>
                  <p>
                    {encryptionStatus.isEnabled
                      ? 'Your diary entries are protected with AES-256-GCM encryption.'
                      : 'Enable end-to-end encryption to protect your private thoughts.'}
                  </p>
                </div>
              </div>

              {encryptionStatus.isEnabled && (
                <div className="security-details">
                  <div className="security-detail-item">
                    <label>Algorithm</label>
                    <value>{encryptionStatus.algorithm}</value>
                  </div>
                  <div className="security-detail-item">
                    <label>Key Version</label>
                    <value>{encryptionStatus.keyVersion}</value>
                  </div>
                  <div className="security-detail-item">
                    <label>Encrypted Entries</label>
                    <value>{encryptionStatus.encryptedEntriesCount || 0}</value>
                  </div>
                </div>
              )}

              {!encryptionStatus.isEnabled && (
                <button
                  className="security-button security-button-primary"
                  onClick={handleEnableEncryption}
                  disabled={loading}
                >
                  {loading ? 'Enabling...' : 'Enable E2E Encryption'}
                </button>
              )}

              <div className="security-info-box">
                <h4>🔒 How E2E Encryption Works</h4>
                <ul>
                  <li>Your encryption key is stored locally on your device</li>
                  <li>Entries are encrypted before uploading to the server</li>
                  <li>Only you can decrypt your diary entries</li>
                  <li>The server cannot read your encrypted content</li>
                  <li>Key rotation is supported for enhanced security</li>
                </ul>
              </div>

              <div className="security-warning-box">
                <h4>⚠️ Important</h4>
                <p>
                  Protect your encryption keys carefully. If you lose your key, encrypted entries cannot be recovered.
                  Consider backing up your encryption key in a secure location.
                </p>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Backup Tab */}
      {activeTab === 'backup' && (
        <div className="security-content">
          <div className="security-backup-actions">
            <button
              className="security-button security-button-primary"
              onClick={handleCreateBackup}
              disabled={creatingBackup}
            >
              {creatingBackup ? '⏳ Creating Backup...' : '💾 Create Backup Now'}
            </button>
            <p className="security-backup-hint">Manual backups are stored for 90 days</p>
          </div>

          <div className="security-backup-list">
            <h3>Recent Backups</h3>

            {loading ? (
              <div className="security-loading">
                <div className="security-spinner"></div>
                <p>Loading backups...</p>
              </div>
            ) : backupList.length === 0 ? (
              <p className="security-no-data">No backups yet. Create one to get started!</p>
            ) : (
              <div className="backup-items">
                {backupList.map((backup) => (
                  <div key={backup.backupId} className={`backup-item backup-status-${backup.status}`}>
                    <div className="backup-info">
                      <h4>{backup.backupType === 'manual' ? '👤 Manual' : '⏰ Scheduled'} Backup</h4>
                      <p className="backup-date">{formatDate(backup.createdAt)}</p>
                      <div className="backup-meta">
                        <span className={`backup-status backup-${backup.status}`}>
                          {backup.status.charAt(0).toUpperCase() + backup.status.slice(1)}
                        </span>
                        {backup.completedAt && (
                          <>
                            <span className="backup-entries">📝 {backup.entryCount} entries</span>
                            <span className="backup-size">💾 {formatBytes(backup.backupSize)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {backup.status === 'completed' && (
                      <button
                        className="security-button security-button-secondary"
                        onClick={() => handleRestoreBackup(backup.backupId)}
                        disabled={restoringBackup === backup.backupId}
                      >
                        {restoringBackup === backup.backupId ? '⏳ Restoring...' : '📥 Restore'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="security-info-box">
            <h4>📊 Backup Features</h4>
            <ul>
              <li>Automatic daily backups (optional)</li>
              <li>Manual backup creation on-demand</li>
              <li>Encrypted backup storage</li>
              <li>Easy one-click restore</li>
              <li>Backup retention for 90 days</li>
              <li>Automatic cleanup after expiry</li>
            </ul>
          </div>

          <div className="security-info-box">
            <h4>💡 Best Practices</h4>
            <ul>
              <li>Create manual backups before major changes</li>
              <li>Test restore functionality periodically</li>
              <li>Keep multiple backup copies</li>
              <li>Monitor backup status regularly</li>
              <li>Enable encryption before backing up sensitive entries</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default EncryptionBackupSettings;
