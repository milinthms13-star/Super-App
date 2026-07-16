import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './FamilyPortal.css';

const FamilyPortal = ({ profileId }) => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [newMember, setNewMember] = useState({
    name: '',
    relationship: 'mother',
    email: '',
    phone: '',
    permissions: {
      viewProfile: true,
      editProfile: false,
      viewMatches: true,
      sendInterests: false,
      respondToInterests: false,
      accessChat: false,
      viewShortlist: true,
      addToShortlist: false,
      scheduleVideoCalls: false
    }
  });

  useEffect(() => {
    fetchFamilyMembers();
  }, [profileId]);

  const fetchFamilyMembers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/matrimonial/family/profile/${profileId}/members`);
      setFamilyMembers(response.data.members);
      setError('');
    } catch (err) {
      setError('Failed to load family members');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLog = async () => {
    try {
      const response = await axios.get(`/api/matrimonial/family/profile/${profileId}/activity-log`);
      setActivityLog(response.data.activityLog);
      setShowActivityLog(true);
    } catch (err) {
      console.error('Failed to fetch activity log:', err);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post(`/api/matrimonial/family/profile/${profileId}/members`, newMember);
      
      alert(`Family member added! Invitation link: ${response.data.invitationLink}`);
      
      setFamilyMembers([...familyMembers, response.data.member]);
      setShowAddModal(false);
      setNewMember({
        name: '',
        relationship: 'mother',
        email: '',
        phone: '',
        permissions: {
          viewProfile: true,
          editProfile: false,
          viewMatches: true,
          sendInterests: false,
          respondToInterests: false,
          accessChat: false,
          viewShortlist: true,
          addToShortlist: false,
          scheduleVideoCalls: false
        }
      });
      setError('');
    } catch (err) {
      setError('Failed to add family member');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermissions = async (memberId, permissions) => {
    try {
      await axios.put(`/api/matrimonial/family/members/${memberId}/permissions`, { permissions });
      
      setFamilyMembers(familyMembers.map(m => 
        m._id === memberId ? { ...m, permissions } : m
      ));
    } catch (err) {
      console.error('Failed to update permissions:', err);
    }
  };

  const handleRevokeMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to revoke access for this family member?')) {
      return;
    }

    try {
      await axios.delete(`/api/matrimonial/family/members/${memberId}`);
      setFamilyMembers(familyMembers.filter(m => m._id !== memberId));
    } catch (err) {
      console.error('Failed to revoke access:', err);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: 'Pending', class: 'status-pending' },
      active: { label: 'Active', class: 'status-active' },
      suspended: { label: 'Suspended', class: 'status-suspended' },
      revoked: { label: 'Revoked', class: 'status-revoked' }
    };
    const badge = badges[status] || badges.pending;
    return <span className={`status-badge ${badge.class}`}>{badge.label}</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const relationshipOptions = [
    { value: 'mother', label: 'Mother' },
    { value: 'father', label: 'Father' },
    { value: 'brother', label: 'Brother' },
    { value: 'sister', label: 'Sister' },
    { value: 'uncle', label: 'Uncle' },
    { value: 'aunt', label: 'Aunt' },
    { value: 'cousin', label: 'Cousin' },
    { value: 'friend', label: 'Friend' },
    { value: 'other', label: 'Other' }
  ];

  const permissionLabels = {
    viewProfile: 'View Profile',
    editProfile: 'Edit Profile',
    viewMatches: 'View Matches',
    sendInterests: 'Send Interests',
    respondToInterests: 'Respond to Interests',
    accessChat: 'Access Chat',
    viewShortlist: 'View Shortlist',
    addToShortlist: 'Add to Shortlist',
    scheduleVideoCalls: 'Schedule Video Calls'
  };

  if (loading && familyMembers.length === 0) {
    return <div className="family-portal-loading">Loading family members...</div>;
  }

  return (
    <div className="family-portal">
      <div className="family-portal-header">
        <h2>Family Portal</h2>
        <p>Manage family members who can help manage your matrimonial profile</p>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <i className="icon-plus"></i> Add Family Member
          </button>
          <button className="btn-secondary" onClick={fetchActivityLog}>
            <i className="icon-activity"></i> View Activity Log
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="family-members-grid">
        {familyMembers.length === 0 ? (
          <div className="empty-state">
            <i className="icon-family"></i>
            <h3>No family members added yet</h3>
            <p>Add family members to help manage your profile</p>
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              Add First Member
            </button>
          </div>
        ) : (
          familyMembers.map(member => (
            <div key={member._id} className="family-member-card">
              <div className="member-header">
                <div className="member-info">
                  <h3>{member.name}</h3>
                  <span className="relationship-tag">{member.relationship}</span>
                  {getStatusBadge(member.status)}
                </div>
                {member.status === 'active' && (
                  <button 
                    className="btn-danger-small" 
                    onClick={() => handleRevokeMember(member._id)}
                    title="Revoke Access"
                  >
                    <i className="icon-revoke"></i>
                  </button>
                )}
              </div>

              <div className="member-contact">
                {member.email && (
                  <div className="contact-item">
                    <i className="icon-email"></i>
                    <span>{member.email}</span>
                  </div>
                )}
                {member.phone && (
                  <div className="contact-item">
                    <i className="icon-phone"></i>
                    <span>{member.phone}</span>
                  </div>
                )}
              </div>

              <div className="member-activity">
                <small>Last Active: {formatDate(member.lastActive)}</small>
                {member.status === 'pending' && (
                  <small className="pending-note">Invitation sent on {formatDate(member.createdAt)}</small>
                )}
              </div>

              {member.status === 'active' && (
                <details className="permissions-section">
                  <summary>Permissions ({Object.values(member.permissions).filter(Boolean).length}/9)</summary>
                  <div className="permissions-grid">
                    {Object.entries(permissionLabels).map(([key, label]) => (
                      <label key={key} className="permission-item">
                        <input
                          type="checkbox"
                          checked={member.permissions[key] || false}
                          onChange={(e) => {
                            const updatedPermissions = {
                              ...member.permissions,
                              [key]: e.target.checked
                            };
                            handleUpdatePermissions(member._id, updatedPermissions);
                          }}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Family Member</h3>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleAddMember} className="add-member-form">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                  required
                  placeholder="Enter family member's name"
                />
              </div>

              <div className="form-group">
                <label>Relationship *</label>
                <select
                  value={newMember.relationship}
                  onChange={(e) => setNewMember({...newMember, relationship: e.target.value})}
                  required
                >
                  {relationshipOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                  required
                  placeholder="email@example.com"
                />
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                  placeholder="+91 1234567890"
                />
              </div>

              <div className="form-group">
                <label>Set Permissions</label>
                <div className="permissions-grid">
                  {Object.entries(permissionLabels).map(([key, label]) => (
                    <label key={key} className="permission-item">
                      <input
                        type="checkbox"
                        checked={newMember.permissions[key] || false}
                        onChange={(e) => setNewMember({
                          ...newMember,
                          permissions: {
                            ...newMember.permissions,
                            [key]: e.target.checked
                          }
                        })}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Adding...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Log Modal */}
      {showActivityLog && (
        <div className="modal-overlay" onClick={() => setShowActivityLog(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Activity Log</h3>
              <button className="btn-close" onClick={() => setShowActivityLog(false)}>×</button>
            </div>
            
            <div className="activity-log">
              {activityLog.length === 0 ? (
                <p className="empty-state-text">No activity recorded yet</p>
              ) : (
                <table className="activity-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Action</th>
                      <th>Time</th>
                      <th>Device</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLog.map((log, index) => (
                      <tr key={index}>
                        <td>
                          <strong>{log.memberName}</strong>
                          <br />
                          <small>{log.relationship}</small>
                        </td>
                        <td>{log.action}</td>
                        <td>{formatDate(log.timestamp)}</td>
                        <td>{log.device || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyPortal;
