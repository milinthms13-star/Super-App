/**
 * AccountSettings.jsx
 * Account security, password management, and deletion
 */

import React, { useState } from 'react';
import axios from 'axios';
import './AccountSettings.css';

const AccountSettings = ({ userId }) => {
  const [activeTab, setActiveTab] = useState('security');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Email verification state
  const [emailData, setEmailData] = useState({
    newEmail: '',
    verificationCode: '',
    verifying: false
  });

  // Account deletion state
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        '/api/auth/change-password',
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      setSuccess('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!emailData.newEmail) {
      setError('Email required');
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        '/api/auth/verify-email',
        { email: emailData.newEmail },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      setSuccess('Verification code sent');
      setEmailData({ ...emailData, verifying: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailConfirm = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setLoading(true);
      await axios.post(
        '/api/auth/confirm-email',
        {
          email: emailData.newEmail,
          verificationCode: emailData.verificationCode
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      setSuccess('Email updated successfully');
      setEmailData({ newEmail: '', verificationCode: '', verifying: false });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm email');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountDeletion = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (deleteConfirm !== 'DELETE') {
      setError('Type DELETE to confirm');
      return;
    }

    try {
      setLoading(true);
      await axios.delete('/api/auth/delete-account', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setSuccess('Account deleted successfully');
      // Redirect to login after 2 seconds
      setTimeout(() => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="account-settings">
      <h2>Account Settings</h2>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          🔒 Security
        </button>
        <button
          className={`tab ${activeTab === 'email' ? 'active' : ''}`}
          onClick={() => setActiveTab('email')}
        >
          📧 Email
        </button>
        <button
          className={`tab ${activeTab === 'deletion' ? 'active' : ''}`}
          onClick={() => setActiveTab('deletion')}
        >
          ⚠️ Delete Account
        </button>
      </div>

      <div className="tab-content">
        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="setting-section">
            <h3>Change Password</h3>

            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label>Current Password *</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div className="form-group">
                <label>New Password *</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password (min 8 characters)"
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          </div>
        )}

        {/* Email Tab */}
        {activeTab === 'email' && (
          <div className="setting-section">
            <h3>Change Email</h3>

            <form onSubmit={emailData.verifying ? handleEmailConfirm : handleEmailChange}>
              <div className="form-group">
                <label>New Email Address *</label>
                <input
                  type="email"
                  value={emailData.newEmail}
                  onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                  placeholder="Enter new email"
                  disabled={emailData.verifying}
                  required
                />
              </div>

              {emailData.verifying && (
                <div className="form-group">
                  <label>Verification Code</label>
                  <input
                    type="text"
                    value={emailData.verificationCode}
                    onChange={(e) => setEmailData({ ...emailData, verificationCode: e.target.value })}
                    placeholder="6-digit code from email"
                    maxLength="6"
                    required
                  />
                </div>
              )}

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (emailData.verifying ? 'Confirming...' : 'Sending...') : emailData.verifying ? 'Confirm Email' : 'Send Code'}
              </button>
            </form>
          </div>
        )}

        {/* Deletion Tab */}
        {activeTab === 'deletion' && (
          <div className="setting-section danger-zone">
            <h3>Delete Account</h3>
            <p className="warning-text">
              ⚠️ Warning: This action is permanent. All your data will be deleted.
            </p>

            {!showDeleteConfirm ? (
              <button
                className="delete-account-btn"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Account
              </button>
            ) : (
              <form onSubmit={handleAccountDeletion}>
                <p>Type <strong>DELETE</strong> to confirm permanent deletion:</p>

                <div className="form-group">
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value.toUpperCase())}
                    placeholder="Type DELETE"
                    required
                  />
                </div>

                <div className="button-group">
                  <button type="submit" className="confirm-delete-btn" disabled={loading}>
                    {loading ? 'Deleting...' : 'Permanently Delete'}
                  </button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirm('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountSettings;
