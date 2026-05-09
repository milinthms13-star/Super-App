/**
 * ProfileSetup.jsx
 * User profile creation and editing component with avatar upload
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProfileSetup.css';

const ProfileSetup = ({ userId, onComplete }) => {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    bio: '',
    profession: '',
    company: '',
    avatar: null,
    website: '',
    socialLinks: {
      twitter: '',
      linkedin: '',
      instagram: '',
      facebook: ''
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [completeness, setCompleteness] = useState(0);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneVerificationStep, setPhoneVerificationStep] = useState(1);

  // Fetch current profile
  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/user/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setProfile(response.data.data);
      setCompleteness(response.data.data.profileCompleteness);
    } catch (err) {
      console.log('New profile creation');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setProfile({
        ...profile,
        [parent]: {
          ...profile[parent],
          [child]: value
        }
      });
    } else {
      setProfile({
        ...profile,
        [name]: value
      });
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Client-side validation
    if (file.size > 5 * 1024 * 1024) {
      setError('Avatar must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result);
      setProfile({ ...profile, avatar: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handlePhoneVerification = async () => {
    if (!profile.phoneNumber || !/^[6-9]\d{9}$/.test(profile.phoneNumber)) {
      setError('Invalid phone number');
      return;
    }

    try {
      setPhoneVerifying(true);
      await axios.post(
        '/api/user/profile/phone/verify',
        { phoneNumber: profile.phoneNumber },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setPhoneVerificationStep(2);
      setSuccess('Verification code sent to SMS');
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handlePhoneConfirm = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Invalid verification code');
      return;
    }

    try {
      setPhoneVerifying(true);
      await axios.post(
        '/api/user/profile/phone/confirm',
        { code: verificationCode },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setSuccess('Phone verified successfully');
      setPhoneVerificationStep(1);
      setVerificationCode('');
    } catch (err) {
      setError(err.response?.data?.error || 'Confirmation failed');
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/api/user/profile', profile, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setSuccess('Profile updated successfully');
      setCompleteness(response.data.data.profileCompleteness);

      if (onComplete) {
        onComplete(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-setup">
      <div className="profile-container">
        <h2>My Profile</h2>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="completeness-bar">
          <div className="label">Profile Completeness: {Math.round(completeness)}%</div>
          <div className="bar">
            <div className="fill" style={{ width: `${completeness}%` }}></div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Avatar Section */}
          <div className="form-section">
            <h3>Profile Picture</h3>

            <div className="avatar-upload">
              <div className="avatar-preview">
                {avatar ? (
                  <img src={avatar} alt="Preview" />
                ) : profile.avatar ? (
                  <img src={profile.avatar} alt="Avatar" />
                ) : (
                  <div className="placeholder">📷</div>
                )}
              </div>

              <label className="upload-button">
                Choose Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </label>
              <p className="text-hint">Max 5MB, JPG/PNG/GIF</p>
            </div>
          </div>

          {/* Basic Information */}
          <div className="form-section">
            <h3>Basic Information</h3>

            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleInputChange}
                  placeholder="Enter first name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleInputChange}
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phone Number *</label>
                <div className="phone-input-group">
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={profile.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="6-9 followed by 9 digits"
                    disabled={phoneVerificationStep === 2}
                  />
                  {phoneVerificationStep === 1 ? (
                    <button
                      type="button"
                      className="verify-button"
                      onClick={handlePhoneVerification}
                      disabled={phoneVerifying}
                    >
                      {phoneVerifying ? 'Verifying...' : 'Verify'}
                    </button>
                  ) : null}
                </div>
              </div>

              {phoneVerificationStep === 2 && (
                <div className="form-group">
                  <label>Verification Code</label>
                  <div className="phone-input-group">
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="6-digit code"
                      maxLength="6"
                    />
                    <button
                      type="button"
                      className="verify-button"
                      onClick={handlePhoneConfirm}
                      disabled={phoneVerifying}
                    >
                      {phoneVerifying ? 'Confirming...' : 'Confirm'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : ''}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Professional Information */}
          <div className="form-section">
            <h3>Professional</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Profession</label>
                <input
                  type="text"
                  name="profession"
                  value={profile.profession}
                  onChange={handleInputChange}
                  placeholder="e.g., Software Engineer"
                />
              </div>

              <div className="form-group">
                <label>Company</label>
                <input
                  type="text"
                  name="company"
                  value={profile.company}
                  onChange={handleInputChange}
                  placeholder="e.g., Tech Corp"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Website</label>
              <input
                type="url"
                name="website"
                value={profile.website}
                onChange={handleInputChange}
                placeholder="https://example.com"
              />
            </div>

            <div className="form-group">
              <label>Bio</label>
              <textarea
                name="bio"
                value={profile.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself"
                rows="4"
              ></textarea>
            </div>
          </div>

          {/* Social Links */}
          <div className="form-section">
            <h3>Social Links</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Twitter</label>
                <input
                  type="text"
                  name="socialLinks.twitter"
                  value={profile.socialLinks?.twitter || ''}
                  onChange={handleInputChange}
                  placeholder="@username"
                />
              </div>

              <div className="form-group">
                <label>LinkedIn</label>
                <input
                  type="text"
                  name="socialLinks.linkedin"
                  value={profile.socialLinks?.linkedin || ''}
                  onChange={handleInputChange}
                  placeholder="linkedin URL"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Instagram</label>
                <input
                  type="text"
                  name="socialLinks.instagram"
                  value={profile.socialLinks?.instagram || ''}
                  onChange={handleInputChange}
                  placeholder="@username"
                />
              </div>

              <div className="form-group">
                <label>Facebook</label>
                <input
                  type="text"
                  name="socialLinks.facebook"
                  value={profile.socialLinks?.facebook || ''}
                  onChange={handleInputChange}
                  placeholder="facebook URL"
                />
              </div>
            </div>
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
