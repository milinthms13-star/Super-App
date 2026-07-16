import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BackupManager.css';

const BackupManager = ({ onClose }) => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('backups'); // 'backups' or 'settings'
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupFrequency, setAutoBackupFrequency] = useState('daily');
  const [includeMedia, setIncludeMedia] = useState(true);
  const [backupProgress, setBackupProgress] = useState(null);

  useEffect(() => {
    fetchBackups();
    fetchSettings();
  }, []);

  const fetchBackups = async () => {
    try {
      const response = await axios.get('/api/messaging/v5/backup', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBackups(response.data.backups || []);
    } catch (err) {
      console.error('Error fetching backups:', err);
      setError('Failed to load backups');
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/messaging/v5/backup/settings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const settings = response.data.settings || {};
      setAutoBackupEnabled(settings.autoBackupEnabled || false);
      setAutoBackupFrequency(settings.frequency || 'daily');
      setIncludeMedia(settings.includeMedia !== false);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleCreateBackup = async () => {
    if (!window.confirm('Create a new backup? This may take a few minutes.')) return;

    setLoading(true);
    setError('');
    setBackupProgress({ status: 'starting', percent: 0 });

    try {
      const response = await axios.post('/api/messaging/v5/backup', {
        includeMedia
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        setBackupProgress({ status: 'completed', percent: 100 });
        setTimeout(() => {
          setBackupProgress(null);
          fetchBackups();
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create backup');
      setBackupProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = async (backupId) => {
    try {
      const response = await axios.get(`/api/messaging/v5/backup/${backupId}/download`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `chat-backup-${backupId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to download backup');
    }
  };

  const handleRestoreBackup = async (backupId) => {
    if (!window.confirm('Restore from this backup? Current data will be replaced.')) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`/api/messaging/v5/backup/${backupId}/restore`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        alert('Backup restored successfully! Please refresh the page.');
        window.location.reload();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to restore backup');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = async (backupId) => {
    if (!window.confirm('Delete this backup? This action cannot be undone.')) return;

    try {
      await axios.delete(`/api/messaging/v5/backup/${backupId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchBackups();
    } catch (err) {
      setError('Failed to delete backup');
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setError('');

    try {
      await axios.put('/api/messaging/v5/backup/settings', {
        autoBackupEnabled,
        frequency: autoBackupFrequency,
        includeMedia
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      alert('Settings saved successfully!');
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="backup-manager-modal">
      <div className="backup-manager-container">
        <div className="backup-header">
          <h2>Backup & Restore</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="backup-tabs">
          <button 
            className={`tab ${activeTab === 'backups' ? 'active' : ''}`}
            onClick={() => setActiveTab('backups')}
          >
            My Backups ({backups.length})
          </button>
          <button 
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {activeTab === 'backups' ? (
          <div className="backups-content">
            <div className="backup-actions-header">
              <button 
                onClick={handleCreateBackup}
                disabled={loading}
                className="btn-create-backup"
              >
                {loading ? '⏳ Creating...' : '💾 Create New Backup'}
              </button>
            </div>

            {backupProgress && (
              <div className="backup-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${backupProgress.percent}%` }}
                  />
                </div>
                <span className="progress-text">
                  {backupProgress.status === 'completed' ? '✓ Backup created!' : 'Creating backup...'}
                </span>
              </div>
            )}

            <div className="backups-list">
              {backups.length === 0 ? (
                <div className="empty-state">
                  <p>📦 No backups yet</p>
                  <p className="sub-text">Create your first backup to protect your messages</p>
                </div>
              ) : (
                backups.map((backup) => (
                  <div key={backup._id} className="backup-item">
                    <div className="backup-info">
                      <div className="backup-icon">💾</div>
                      <div className="backup-details">
                        <h3>{formatDate(backup.createdAt)}</h3>
                        <p className="backup-meta">
                          {formatSize(backup.size)} • {backup.messageCount} messages
                          {backup.includeMedia && ' • Media included'}
                        </p>
                      </div>
                    </div>
                    <div className="backup-actions">
                      <button 
                        onClick={() => handleDownloadBackup(backup._id)}
                        className="btn-icon"
                        title="Download"
                      >
                        ⬇️
                      </button>
                      <button 
                        onClick={() => handleRestoreBackup(backup._id)}
                        className="btn-icon"
                        title="Restore"
                      >
                        🔄
                      </button>
                      <button 
                        onClick={() => handleDeleteBackup(backup._id)}
                        className="btn-icon"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="settings-content">
            <div className="setting-group">
              <h3>Automatic Backups</h3>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={autoBackupEnabled}
                  onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                />
                Enable automatic backups
              </label>
            </div>

            {autoBackupEnabled && (
              <div className="setting-group">
                <label>Backup Frequency</label>
                <select 
                  value={autoBackupFrequency}
                  onChange={(e) => setAutoBackupFrequency(e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            )}

            <div className="setting-group">
              <h3>Backup Options</h3>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeMedia}
                  onChange={(e) => setIncludeMedia(e.target.checked)}
                />
                Include media files (photos, videos, files)
              </label>
              <p className="setting-note">
                Including media will increase backup size but preserve all content
              </p>
            </div>

            <div className="settings-actions">
              <button 
                onClick={handleSaveSettings}
                disabled={loading}
                className="btn-save"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupManager;
