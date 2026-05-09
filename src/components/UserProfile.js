import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import "./UserProfile.css";

const UserProfile = ({ loggedInUser, onProfileUpdate }) => {
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // General Profile State
  const [profileData, setProfileData] = useState({
    name: loggedInUser?.name || "",
    phone: loggedInUser?.phone || "",
    email: loggedInUser?.email || "",
    location: loggedInUser?.location || "",
    businessName: loggedInUser?.businessName || "",
  });

  // MPIN State
  const [mpinSection, setMpinSection] = useState({
    isSet: !!loggedInUser?.mpinSet,
    currentMpin: "",
    newMpin: "",
    confirmMpin: "",
    mode: "view", // "view", "create", "change", "verify"
  });

  useEffect(() => {
    setMpinSection((prev) => ({
      ...prev,
      isSet: !!loggedInUser?.mpinSet,
    }));
  }, [loggedInUser?.mpinSet]);

  const handleProfileChange = (field, value) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError("");
    setSuccess("");
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/auth/me`,
        profileData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );

      if (response.data.success) {
        setSuccess("Profile updated successfully");
        if (onProfileUpdate) {
          onProfileUpdate(response.data.user);
        }
      } else {
        setError(response.data.message || "Failed to update profile");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSetMpin = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (!mpinSection.newMpin) {
      setError("Please enter an MPIN");
      return;
    }

    if (!/^\d{4}$/.test(mpinSection.newMpin)) {
      setError("MPIN must be exactly 4 digits");
      return;
    }

    if (mpinSection.newMpin !== mpinSection.confirmMpin) {
      setError("MPINs do not match");
      return;
    }

    if (mpinSection.isSet && !mpinSection.currentMpin) {
      setError("Please enter your current MPIN");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/set-mpin`,
        {
          currentMpin: mpinSection.isSet ? mpinSection.currentMpin : undefined,
          newMpin: mpinSection.newMpin,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );

      if (response.data.success) {
        setSuccess(mpinSection.isSet ? "MPIN changed successfully" : "MPIN set successfully");
        setMpinSection({
          isSet: true,
          currentMpin: "",
          newMpin: "",
          confirmMpin: "",
          mode: "view",
        });
        if (onProfileUpdate) {
          onProfileUpdate(response.data.user);
        }
      } else {
        setError(response.data.message || "Failed to set MPIN");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error setting MPIN");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMpin = async () => {
    if (!window.confirm("Are you sure you want to remove your MPIN?")) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/remove-mpin`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );

      if (response.data.success) {
        setSuccess("MPIN removed successfully");
        setMpinSection({
          isSet: false,
          currentMpin: "",
          newMpin: "",
          confirmMpin: "",
          mode: "view",
        });
        if (onProfileUpdate) {
          onProfileUpdate(response.data.user);
        }
      } else {
        setError(response.data.message || "Failed to remove MPIN");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error removing MPIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-profile-container">
      <div className="profile-header">
        <h1>User Profile</h1>
        <p className="profile-subtitle">Manage your account settings and preferences</p>
      </div>

      <div className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === "general" ? "active" : ""}`}
          onClick={() => setActiveTab("general")}
        >
          General Information
        </button>
        <button
          className={`tab-btn ${activeTab === "mpin" ? "active" : ""}`}
          onClick={() => setActiveTab("mpin")}
        >
          Security Settings
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* General Profile Tab */}
      {activeTab === "general" && (
        <div className="profile-section">
          <form onSubmit={handleSaveProfile} className="profile-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                value={profileData.name}
                onChange={(e) => handleProfileChange("name", e.target.value)}
                className="form-input"
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={profileData.email}
                onChange={(e) => handleProfileChange("email", e.target.value)}
                className="form-input"
                placeholder="Enter your email"
                disabled
              />
              <p className="helper-text">Email cannot be changed</p>
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                value={profileData.phone}
                onChange={(e) => handleProfileChange("phone", e.target.value)}
                className="form-input"
                placeholder="Enter your phone number"
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                value={profileData.location}
                onChange={(e) => handleProfileChange("location", e.target.value)}
                className="form-input"
                placeholder="Enter your city or location"
              />
            </div>

            {loggedInUser?.businessName && (
              <div className="form-group">
                <label htmlFor="businessName">Business Name</label>
                <input
                  type="text"
                  id="businessName"
                  value={profileData.businessName}
                  onChange={(e) => handleProfileChange("businessName", e.target.value)}
                  className="form-input"
                  placeholder="Enter your business name"
                />
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MPIN Settings Tab */}
      {activeTab === "mpin" && (
        <div className="profile-section">
          <div className="mpin-settings">
            <h2>MPIN Management</h2>
            <p className="mpin-description">
              A 4-digit MPIN (Mobile PIN) provides an additional layer of security for your account.
              You can use it for quick authentication on mobile devices.
            </p>

            {mpinSection.isSet && mpinSection.mode === "view" && (
              <div className="mpin-status">
                <div className="status-box success">
                  <span className="status-icon">✓</span>
                  <div className="status-text">
                    <strong>MPIN is set</strong>
                    <p>Your account is protected with an MPIN</p>
                  </div>
                </div>
                <div className="mpin-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setMpinSection((prev) => ({ ...prev, mode: "change" }))}
                    disabled={loading}
                  >
                    Change MPIN
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleRemoveMpin}
                    disabled={loading}
                  >
                    Remove MPIN
                  </button>
                </div>
              </div>
            )}

            {(!mpinSection.isSet || mpinSection.mode !== "view") && (
              <form onSubmit={handleSetMpin} className="mpin-form">
                {mpinSection.isSet && mpinSection.mode === "change" && (
                  <div className="form-group">
                    <label htmlFor="currentMpin">Current MPIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      id="currentMpin"
                      maxLength="4"
                      value={mpinSection.currentMpin}
                      onChange={(e) =>
                        setMpinSection((prev) => ({
                          ...prev,
                          currentMpin: e.target.value.replace(/\D/g, "").slice(0, 4),
                        }))
                      }
                      className="form-input"
                      placeholder="••••"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="newMpin">
                    {mpinSection.isSet ? "New MPIN" : "Create MPIN"}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    id="newMpin"
                    maxLength="4"
                    value={mpinSection.newMpin}
                    onChange={(e) =>
                      setMpinSection((prev) => ({
                        ...prev,
                        newMpin: e.target.value.replace(/\D/g, "").slice(0, 4),
                      }))
                    }
                    className="form-input"
                    placeholder="Enter 4 digits"
                  />
                  <p className="helper-text">Enter exactly 4 digits (0-9)</p>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmMpin">Confirm MPIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    id="confirmMpin"
                    maxLength="4"
                    value={mpinSection.confirmMpin}
                    onChange={(e) =>
                      setMpinSection((prev) => ({
                        ...prev,
                        confirmMpin: e.target.value.replace(/\D/g, "").slice(0, 4),
                      }))
                    }
                    className="form-input"
                    placeholder="Re-enter MPIN"
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading
                      ? "Processing..."
                      : mpinSection.isSet
                        ? "Change MPIN"
                        : "Set MPIN"}
                  </button>
                  {mpinSection.isSet && mpinSection.mode === "change" && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() =>
                        setMpinSection((prev) => ({
                          ...prev,
                          mode: "view",
                          currentMpin: "",
                          newMpin: "",
                          confirmMpin: "",
                        }))
                      }
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
