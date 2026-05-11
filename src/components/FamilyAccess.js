import React, { useState, useEffect } from 'react';
import FamilyAccessService from '../../services/familyAccessService';
import './FamilyAccess.css';

/**
 * FamilyAccess Component
 * Manages family groups and automatic access to location and camera
 * When admin allows a member, all family members can automatically access their location and camera
 */
const FamilyAccess = ({ userId, onAccessChange }) => {
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form states
  const [createFormData, setCreateFormData] = useState({
    familyName: '',
    memberIds: [],
  });

  const [memberFormData, setMemberFormData] = useState({
    memberId: '',
    relationship: 'other',
  });

  const [permissionsData, setPermissionsData] = useState({
    location: {
      enabled: true,
      updateInterval: 30,
      realTime: true,
      accuracy: 'high',
    },
    camera: {
      enabled: true,
      liveView: true,
      snapshot: true,
      recordVideo: false,
    },
  });

  /**
   * Load families on component mount
   */
  useEffect(() => {
    loadFamilies();
  }, []);

  /**
   * Fetch user's families
   */
  const loadFamilies = async () => {
    try {
      setLoading(true);
      const familiesList = await FamilyAccessService.getUserFamilies();
      setFamilies(familiesList);

      // Select first family if available
      if (familiesList.length > 0) {
        setSelectedFamily(familiesList[0]);
      }
    } catch (err) {
      setError('Failed to load families');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a new family group
   */
  const handleCreateFamily = async (e) => {
    e.preventDefault();

    if (!createFormData.familyName.trim()) {
      setError('Family name is required');
      return;
    }

    try {
      setLoading(true);
      const result = await FamilyAccessService.createFamilyGroup(
        createFormData.familyName,
        createFormData.memberIds,
        permissionsData
      );

      setSuccess('Family group created successfully!');
      setCreateFormData({ familyName: '', memberIds: [] });
      setShowCreateForm(false);
      await loadFamilies();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.error || 'Failed to create family group');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add member to family
   */
  const handleAddMember = async (e) => {
    e.preventDefault();

    if (!memberFormData.memberId.trim()) {
      setError('Member ID is required');
      return;
    }

    if (!selectedFamily) {
      setError('Please select a family first');
      return;
    }

    try {
      setLoading(true);
      await FamilyAccessService.addFamilyMember(
        selectedFamily._id,
        memberFormData.memberId,
        memberFormData.relationship
      );

      setSuccess('Member added successfully!');
      setMemberFormData({ memberId: '', relationship: 'other' });
      setShowMemberForm(false);
      await loadFamilies();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove member from family
   */
  const handleRemoveMember = async (memberId) => {
    if (!selectedFamily) return;

    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      setLoading(true);
      await FamilyAccessService.removeFamilyMember(selectedFamily._id, memberId);

      setSuccess('Member removed successfully!');
      await loadFamilies();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.error || 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update access permissions
   */
  const handleUpdatePermissions = async () => {
    if (!selectedFamily) {
      setError('Please select a family first');
      return;
    }

    try {
      setLoading(true);
      await FamilyAccessService.updateAccessPermissions(selectedFamily._id, permissionsData);

      setSuccess('Permissions updated successfully!');
      await loadFamilies();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.error || 'Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle location access
   */
  const toggleLocationAccess = (field, value) => {
    setPermissionsData((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value,
      },
    }));
  };

  /**
   * Toggle camera access
   */
  const toggleCameraAccess = (field, value) => {
    setPermissionsData((prev) => ({
      ...prev,
      camera: {
        ...prev.camera,
        [field]: value,
      },
    }));
  };

  /**
   * Disable auto-access for a member
   */
  const handleDisableAutoAccess = async (memberId) => {
    if (!selectedFamily) return;

    try {
      setLoading(true);
      await FamilyAccessService.disableAutoAccessForMember(selectedFamily._id, memberId);

      setSuccess('Auto-access disabled!');
      await loadFamilies();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.error || 'Failed to disable auto-access');
    } finally {
      setLoading(false);
    }
  };

  if (loading && families.length === 0) {
    return <div className="family-access-loading">Loading family data...</div>;
  }

  return (
    <div className="family-access-container">
      <div className="family-access-header">
        <h1>🏠 Family Auto-Access Management</h1>
        <p>When you allow a family member access, they can automatically access your location and camera</p>
      </div>

      {error && <div className="family-access-error">{error}</div>}
      {success && <div className="family-access-success">{success}</div>}

      {/* Create Family Section */}
      <div className="family-access-section">
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
          disabled={loading}
        >
          {showCreateForm ? '✕ Cancel' : '+ Create Family Group'}
        </button>

        {showCreateForm && (
          <form className="family-form" onSubmit={handleCreateFamily}>
            <div className="form-group">
              <label>Family Name *</label>
              <input
                type="text"
                value={createFormData.familyName}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    familyName: e.target.value,
                  })
                }
                placeholder="e.g., Smith Family"
                required
              />
            </div>

            <div className="form-group">
              <label>Member Email IDs (comma separated)</label>
              <input
                type="text"
                placeholder="member1@email.com, member2@email.com"
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    memberIds: e.target.value.split(',').map((id) => id.trim()),
                  })
                }
              />
            </div>

            <button type="submit" className="btn btn-success" disabled={loading}>
              Create Family
            </button>
          </form>
        )}
      </div>

      {/* Family Selection and Details */}
      {families.length > 0 && (
        <div className="family-access-section">
          <h2>Your Families</h2>

          <div className="family-list">
            {families.map((family) => (
              <div
                key={family._id}
                className={`family-card ${selectedFamily?._id === family._id ? 'selected' : ''}`}
                onClick={() => setSelectedFamily(family)}
              >
                <div className="family-card-header">
                  <h3>{family.familyName}</h3>
                  <span className="member-count">{family.members.length} members</span>
                </div>
                <div className="family-card-details">
                  <p>Group ID: {family.familyGroupId}</p>
                  <p>Created: {new Date(family.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Selected Family Details */}
          {selectedFamily && (
            <div className="family-details-container">
              <h2>Family: {selectedFamily.familyName}</h2>

              {/* Members Section */}
              <div className="members-section">
                <h3>👥 Members</h3>

                <button
                  className="btn btn-secondary"
                  onClick={() => setShowMemberForm(!showMemberForm)}
                  disabled={loading}
                >
                  {showMemberForm ? '✕ Cancel' : '+ Add Member'}
                </button>

                {showMemberForm && (
                  <form className="member-form" onSubmit={handleAddMember}>
                    <div className="form-group">
                      <label>Member Email ID *</label>
                      <input
                        type="email"
                        value={memberFormData.memberId}
                        onChange={(e) =>
                          setMemberFormData({
                            ...memberFormData,
                            memberId: e.target.value,
                          })
                        }
                        placeholder="member@email.com"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Relationship</label>
                      <select
                        value={memberFormData.relationship}
                        onChange={(e) =>
                          setMemberFormData({
                            ...memberFormData,
                            relationship: e.target.value,
                          })
                        }
                      >
                        <option value="other">Other</option>
                        <option value="spouse">Spouse</option>
                        <option value="parent">Parent</option>
                        <option value="child">Child</option>
                        <option value="sibling">Sibling</option>
                        <option value="grandparent">Grandparent</option>
                        <option value="grandchild">Grandchild</option>
                      </select>
                    </div>

                    <button type="submit" className="btn btn-success" disabled={loading}>
                      Add Member
                    </button>
                  </form>
                )}

                <div className="members-list">
                  {selectedFamily.members.map((member) => (
                    <div key={member.userId._id || member.userId} className="member-item">
                      <div className="member-info">
                        <p className="member-name">
                          {member.name || member.email} {member.role === 'admin' && '👑'}
                        </p>
                        <p className="member-relationship">{member.relationship}</p>
                        <p className="member-status">
                          Status: <span className={member.status}>{member.status}</span>
                        </p>
                        <p className="member-auto-access">
                          Auto-Access:{' '}
                          <span className={member.autoAccessEnabled ? 'enabled' : 'disabled'}>
                            {member.autoAccessEnabled ? '✓ Enabled' : '✗ Disabled'}
                          </span>
                        </p>
                      </div>

                      {member.role !== 'admin' && selectedFamily.adminId === userId && (
                        <div className="member-actions">
                          {member.autoAccessEnabled && (
                            <button
                              className="btn btn-warning"
                              onClick={() => handleDisableAutoAccess(member.userId)}
                              disabled={loading}
                            >
                              Disable Auto-Access
                            </button>
                          )}
                          <button
                            className="btn btn-danger"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={loading}
                          >
                            Remove Member
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Access Permissions Section */}
              {selectedFamily.adminId === userId && (
                <div className="permissions-section">
                  <h3>🔒 Access Permissions</h3>
                  <p className="permissions-note">
                    These settings apply to ALL family members automatically
                  </p>

                  {/* Location Permissions */}
                  <div className="permission-group">
                    <h4>📍 Location Access</h4>
                    <div className="permission-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={permissionsData.location.enabled}
                          onChange={(e) =>
                            toggleLocationAccess('enabled', e.target.checked)
                          }
                        />
                        Enable Location Sharing
                      </label>
                    </div>

                    {permissionsData.location.enabled && (
                      <>
                        <div className="permission-item">
                          <label>
                            <input
                              type="checkbox"
                              checked={permissionsData.location.realTime}
                              onChange={(e) =>
                                toggleLocationAccess('realTime', e.target.checked)
                              }
                            />
                            Real-Time Location
                          </label>
                        </div>

                        <div className="permission-item">
                          <label>Update Interval (seconds):</label>
                          <input
                            type="number"
                            min="5"
                            max="300"
                            value={permissionsData.location.updateInterval}
                            onChange={(e) =>
                              toggleLocationAccess(
                                'updateInterval',
                                parseInt(e.target.value)
                              )
                            }
                          />
                        </div>

                        <div className="permission-item">
                          <label>Accuracy Level:</label>
                          <select
                            value={permissionsData.location.accuracy}
                            onChange={(e) =>
                              toggleLocationAccess('accuracy', e.target.value)
                            }
                          >
                            <option value="high">High Precision</option>
                            <option value="medium">Medium Precision</option>
                            <option value="low">Low Precision</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Camera Permissions */}
                  <div className="permission-group">
                    <h4>📷 Camera Access</h4>
                    <div className="permission-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={permissionsData.camera.enabled}
                          onChange={(e) => toggleCameraAccess('enabled', e.target.checked)}
                        />
                        Enable Camera Access
                      </label>
                    </div>

                    {permissionsData.camera.enabled && (
                      <>
                        <div className="permission-item">
                          <label>
                            <input
                              type="checkbox"
                              checked={permissionsData.camera.liveView}
                              onChange={(e) =>
                                toggleCameraAccess('liveView', e.target.checked)
                              }
                            />
                            Live View
                          </label>
                        </div>

                        <div className="permission-item">
                          <label>
                            <input
                              type="checkbox"
                              checked={permissionsData.camera.snapshot}
                              onChange={(e) =>
                                toggleCameraAccess('snapshot', e.target.checked)
                              }
                            />
                            Take Snapshots
                          </label>
                        </div>

                        <div className="permission-item">
                          <label>
                            <input
                              type="checkbox"
                              checked={permissionsData.camera.recordVideo}
                              onChange={(e) =>
                                toggleCameraAccess('recordVideo', e.target.checked)
                              }
                            />
                            Record Video
                          </label>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={handleUpdatePermissions}
                    disabled={loading}
                  >
                    Save Permissions
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {families.length === 0 && !showCreateForm && (
        <div className="no-families-message">
          <p>No family groups yet. Create one to get started!</p>
        </div>
      )}
    </div>
  );
};

export default FamilyAccess;
