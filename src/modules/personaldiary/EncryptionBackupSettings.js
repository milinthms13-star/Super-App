import React, { useEffect, useState } from "react";
import "../../styles/EncryptionBackupSettings.css";
import diaryService from "../../services/diaryService";

const EncryptionBackupSettings = ({ onClose, onBackupRestore }) => {
  const [activeTab, setActiveTab] = useState("encryption"); // encryption, backup
  const [encryptionStatus, setEncryptionStatus] = useState(null);
  const [backupList, setBackupList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(null);

  // Fetch encryption status
  const fetchEncryptionStatus = async () => {
    try {
      setLoading(true);
      const response = await diaryService.getEncryptionStatus();
      setEncryptionStatus(response.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch encryption status:", err);
      setError(err.message || "Failed to fetch encryption status");
    } finally {
      setLoading(false);
    }
  };

  // Fetch backup list
  const fetchBackupList = async () => {
    try {
      setLoading(true);
      const response = await diaryService.getBackupList();
      setBackupList(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch backups:", err);
      setError(err.message || "Failed to fetch backups");
    } finally {
      setLoading(false);
    }
  };

  // Enable encryption
  const handleEnableEncryption = async () => {
    try {
      setLoading(true);
      await diaryService.enableEncryption();
      setSuccess("Encryption enabled successfully!");
      await fetchEncryptionStatus();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to enable encryption:", err);
      setError(err.message || "Failed to enable encryption");
    } finally {
      setLoading(false);
    }
  };

  // Create backup
  const handleCreateBackup = async () => {
    try {
      setCreatingBackup(true);
      await diaryService.createBackup("manual");
      setSuccess("Backup created successfully!");
      await fetchBackupList();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to create backup:", err);
      setError(err.message || "Failed to create backup");
    } finally {
      setCreatingBackup(false);
    }
  };

  // Restore backup
  const handleRestoreBackup = async (backupId) => {
    if (
      !window.confirm(
        "Are you sure? This will restore all entries from this backup."
      )
    ) {
      return;
    }

    try {
      setRestoringBackup(backupId);
      await diaryService.restoreBackup(backupId);
      setSuccess("Backup restored successfully!");
      if (onBackupRestore) {
        onBackupRestore();
      }
      await fetchBackupList();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to restore backup:", err);
      setError(err.message || "Failed to restore backup");
    } finally {
      setRestoringBackup(null);
    }
  };

  // Load data on mount or tab change
  useEffect(() => {
    if (activeTab === "encryption") {
      fetchEncryptionStatus();
    } else if (activeTab === "backup") {
      fetchBackupList();
    }
  }, [activeTab]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "#4caf50";
      case "pending":
        return "#ff9800";
      case "in-progress":
        return "#2196f3";
      case "failed":
        return "#f44336";
      default:
        return "#999";
    }
  };

  return (
    <div
      className="encryption-backup-modal-overlay"
      onClick={onClose}
    >
      <div
        className="encryption-backup-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="eb-header">
          <h2>🔐 Encryption & Backup</h2>
          <button className="eb-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="eb-tabs">
          <button
            className={`eb-tab ${activeTab === "encryption" ? "active" : ""}`}
            onClick={() => setActiveTab("encryption")}
          >
            🔒 Encryption
          </button>
          <button
            className={`eb-tab ${activeTab === "backup" ? "active" : ""}`}
            onClick={() => setActiveTab("backup")}
          >
            💾 Backups
          </button>
        </div>

        <div className="eb-content">
          {error && (
            <div className="eb-error">{error}</div>
          )}
          {success && (
            <div className="eb-success">{success}</div>
          )}

          {loading ? (
            <div className="eb-loading">Loading...</div>
          ) : (
            <>
              {/* ENCRYPTION TAB */}
              {activeTab === "encryption" && (
                <div className="eb-encryption-section">
                  <div className="eb-status-card">
                    <div className="status-icon">🔒</div>
                    <div className="status-info">
                      <h3>
                        {encryptionStatus?.enabled
                          ? "Encryption Enabled"
                          : "Encryption Disabled"}
                      </h3>
                      <p>
                        {encryptionStatus?.enabled
                          ? "Your entries are encrypted with AES-256-GCM"
                          : "Enable encryption to protect your entries"}
                      </p>
                    </div>
                    {!encryptionStatus?.enabled && (
                      <button
                        className="eb-primary-btn"
                        onClick={handleEnableEncryption}
                        disabled={loading}
                      >
                        Enable Encryption
                      </button>
                    )}
                  </div>

                  {encryptionStatus?.enabled && (
                    <div className="eb-encryption-details">
                      <div className="detail-row">
                        <span>Algorithm:</span>
                        <strong>
                          {encryptionStatus?.algorithm || "AES-256-GCM"}
                        </strong>
                      </div>
                      <div className="detail-row">
                        <span>Key Version:</span>
                        <strong>
                          {encryptionStatus?.keyVersion || "1"}
                        </strong>
                      </div>
                      <div className="detail-row">
                        <span>Encrypted Entries:</span>
                        <strong>
                          {encryptionStatus?.encryptedCount || "0"}
                        </strong>
                      </div>
                    </div>
                  )}

                  <div className="eb-info-box">
                    <h4>🛡️ How End-to-End Encryption Works</h4>
                    <ul>
                      <li>
                        Your encryption key is derived from your account
                      </li>
                      <li>
                        Entries are encrypted locally before being stored
                      </li>
                      <li>
                        Only you can decrypt your entries
                      </li>
                      <li>
                        Encryption keys are never transmitted to servers
                      </li>
                    </ul>
                  </div>

                  <div className="eb-warning-box">
                    <h4>⚠️ Important Security Note</h4>
                    <p>
                      Never share your encryption keys. If lost, you cannot
                      recover encrypted entries.
                    </p>
                  </div>
                </div>
              )}

              {/* BACKUP TAB */}
              {activeTab === "backup" && (
                <div className="eb-backup-section">
                  <div className="eb-backup-actions">
                    <button
                      className="eb-primary-btn"
                      onClick={handleCreateBackup}
                      disabled={creatingBackup || loading}
                    >
                      {creatingBackup ? "Creating..." : "📦 Create Backup"}
                    </button>
                    <span className="backup-hint">
                      Manual backups are stored for 90 days
                    </span>
                  </div>

                  <div className="eb-backup-list">
                    {backupList.length > 0 ? (
                      backupList.map((backup, idx) => (
                        <div key={idx} className="backup-item">
                          <div className="backup-header">
                            <div className="backup-info">
                              <div className="backup-type-badge">
                                {backup.backupType || "manual"}
                              </div>
                              <div>
                                <div className="backup-date">
                                  {formatDate(backup.createdAt)}
                                </div>
                                <div className="backup-details">
                                  {backup.entryCount || 0} entries •{" "}
                                  {formatBytes(backup.backupSize || 0)}
                                </div>
                              </div>
                            </div>
                            <div className="backup-actions">
                              <span
                                className="backup-status"
                                style={{
                                  backgroundColor: getStatusColor(
                                    backup.status
                                  ),
                                }}
                              >
                                {backup.status || "unknown"}
                              </span>
                              {backup.status === "completed" && (
                                <button
                                  className="backup-restore-btn"
                                  onClick={() => handleRestoreBackup(backup._id)}
                                  disabled={restoringBackup === backup._id}
                                >
                                  {restoringBackup === backup._id
                                    ? "Restoring..."
                                    : "Restore"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="no-backups">No backups yet</p>
                    )}
                  </div>

                  <div className="eb-features-box">
                    <h4>📋 Cloud Backup Features</h4>
                    <ul>
                      <li>
                        ✓ Automatic daily backups
                      </li>
                      <li>
                        ✓ Weekly and monthly backups
                      </li>
                      <li>
                        ✓ Encrypted backup storage
                      </li>
                      <li>
                        ✓ One-click restore capability
                      </li>
                      <li>
                        ✓ 90-day retention policy
                      </li>
                    </ul>
                  </div>

                  <div className="eb-best-practices">
                    <h4>💡 Backup Best Practices</h4>
                    <ul>
                      <li>
                        Create manual backups before major changes
                      </li>
                      <li>
                        Test restore functionality regularly
                      </li>
                      <li>
                        Keep backup copies in secure locations
                      </li>
                      <li>
                        Monitor backup status periodically
                      </li>
                      <li>
                        Enable encryption with backups
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EncryptionBackupSettings;
