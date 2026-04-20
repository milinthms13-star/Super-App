import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { useApp } from "../../contexts/AppContext";
import "../../styles/Matrimonial.css";
import PropTypes from "prop-types";
import {
  API_BASE_URL,
  DEFAULT_PREFERENCES,
  PROFILES_PER_PAGE
} from "./constants.js";
import { validateMatrimonialProfile, sanitizeProfileData, calculateProfileCompletion } from "./validators.js";
import { getMatchScore, getScoreBreakdown } from "./matching.js";
import { applyFilters } from "./filtering.js";
import { buildProfileForm, buildViewerProfile, normalizeProfile } from "./profileBuilders.js";
import { sanitizeText } from "../../utils/xssProtection";

// Debounce hook for search and filters
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const getVisiblePhone = (profile, isPremiumViewer) => {
  if (profile.premiumOnlyContact && !isPremiumViewer) {
    return "Premium required to view contact details";
  }

  if (profile.privacy.hidePhone) {
    return "Hidden by privacy settings";
  }

  return profile.phone;
};

const Matrimonial = ({ onProfileUpdate }) => {
  const { currentUser, mockData } = useApp();
  const isAdmin =
    currentUser?.role === "admin" || currentUser?.registrationType === "admin";
  const [profileForm, setProfileForm] = useState(() => buildProfileForm(currentUser));
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const viewerProfile = buildViewerProfile(currentUser, profileForm);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [activeTab, setActiveTab] = useState("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("best-match");
  const [advancedFilters, setAdvancedFilters] = useState({
    religion: "Any",
    location: "Any",
    caste: "Any",
    education: "Any",
    profession: "Any",
    verifiedOnly: true,
  });
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [currentPage, setCurrentPage] = useState(1);
  const [sentInterests, setSentInterests] = useState([]);
  const [shortlistedProfiles, setShortlistedProfiles] = useState([]);
  const [blockedProfiles, setBlockedProfiles] = useState([]);
  const [reportedProfiles, setReportedProfiles] = useState([]);
  const [interestResponses, setInterestResponses] = useState({});
  const [messageComposer, setMessageComposer] = useState({});
  const [statusMessage, setStatusMessage] = useState("");
  const [isPremiumPreview, setIsPremiumPreview] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const photoInputRef = useRef(null);
  const onboardingRecordedRef = useRef(false);

  // Debounce search input only; advanced filters apply immediately
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  useEffect(() => {
    setProfileForm(buildProfileForm(currentUser));
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const hasSeenOnboarding = Boolean(currentUser?.preferences?.soulmatchOnboardingSeen);
    setShowProfilePrompt(!hasSeenOnboarding);

    if (hasSeenOnboarding || onboardingRecordedRef.current) {
      return;
    }

    onboardingRecordedRef.current = true;

    const persistOnboardingSeen = async () => {
      try {
        const response = await axios.patch(
          `${API_BASE_URL}/auth/me`,
          {
            preferences: {
              ...(currentUser?.preferences || {}),
              soulmatchOnboardingSeen: true,
            },
          },
          {
            timeout: 10000,
          }
        );

        if (response.data?.user) {
          onProfileUpdate?.(response.data.user);
          return;
        }

        onProfileUpdate?.({
          ...currentUser,
          preferences: {
            ...(currentUser?.preferences || {}),
            soulmatchOnboardingSeen: true,
          },
        });
      } catch (error) {
        onboardingRecordedRef.current = false;
      }
    };

    persistOnboardingSeen();
  }, [currentUser, onProfileUpdate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, advancedFilters, preferences, blockedProfiles]);

  useEffect(() => {
    const hasFilter = Boolean(
      searchQuery.trim() ||
      advancedFilters.religion !== "Any" ||
      advancedFilters.location !== "Any" ||
      advancedFilters.caste !== "Any" ||
      advancedFilters.education !== "Any" ||
      advancedFilters.profession !== "Any"
    );

    setIsFiltering(hasFilter);
  }, [searchQuery, advancedFilters]);

  const profiles = (mockData.matrimonialProfiles || []).map(normalizeProfile);
  const allFilteredProfiles = useMemo(() => 
    applyFilters(profiles, { blockedProfiles, advancedFilters, searchQuery: debouncedSearchQuery, preferences, viewerProfile }),
    [profiles, blockedProfiles, advancedFilters, debouncedSearchQuery, preferences, viewerProfile]
  );

  const sortedProfiles = useMemo(() => {
    const nextProfiles = [...allFilteredProfiles];

    nextProfiles.sort((left, right) => {
      if (sortMode === "recently-active") {
        return String(left.lastActive || "").localeCompare(String(right.lastActive || ""));
      }

      if (sortMode === "most-viewed") {
        return Number(right.profileViews || 0) - Number(left.profileViews || 0);
      }

      if (sortMode === "age-low") {
        return Number(left.age || 0) - Number(right.age || 0);
      }

      return Number(right.matchScore || 0) - Number(left.matchScore || 0);
    });

    return nextProfiles;
  }, [allFilteredProfiles, sortMode]);

  const visibleProfiles = useMemo(() => {
    const startIdx = (currentPage - 1) * PROFILES_PER_PAGE;
    return sortedProfiles.slice(startIdx, startIdx + PROFILES_PER_PAGE);
  }, [currentPage, sortedProfiles]);

  const totalPages = Math.ceil(sortedProfiles.length / PROFILES_PER_PAGE);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages, allFilteredProfiles.length, advancedFilters]);

  const selectedProfile =
    visibleProfiles.find((profile) => profile.id === selectedProfileId) ||
    visibleProfiles[0] ||
    null;

  const topMatches = visibleProfiles.slice(0, 3);
  const shortlistedMatches = useMemo(
    () => profiles.filter((profile) => shortlistedProfiles.includes(profile.id)),
    [profiles, shortlistedProfiles]
  );
  const religions = useMemo(
    () => ["Any", ...new Set(profiles.map((profile) => profile.religion).filter(Boolean))],
    [profiles]
  );
  const locations = useMemo(
    () => ["Any", ...new Set(profiles.map((profile) => profile.location).filter(Boolean))],
    [profiles]
  );
  const educations = useMemo(
    () => ["Any", ...new Set(profiles.map((profile) => profile.education).filter(Boolean))],
    [profiles]
  );
  const professions = useMemo(
    () => ["Any", ...new Set(profiles.map((profile) => profile.profession).filter(Boolean))],
    [profiles]
  );

  const castes = useMemo(
    () => ["Any", ...new Set(profiles.map((profile) => profile.caste).filter(Boolean))],
    [profiles]
  );

  const incomingInterests = useMemo(() => 
    profiles
      .slice(0, 3)
      .map((profile, index) => ({
        id: `incoming-${profile.id}`,
        name: profile.name,
        matchScore: getMatchScore(profile, preferences, viewerProfile),
        status: index === 0 ? "New Interest" : index === 1 ? "Pending Response" : "Viewed Your Profile",
        note:
          index === 0
            ? "Interested in a family-oriented match."
            : index === 1
              ? "Wants to connect after reviewing your preferences."
              : "Your profile has been shortlisted for further conversation.",
      })), [profiles, preferences, viewerProfile]
  );
  const selectedProfileBreakdown = useMemo(
    () =>
      selectedProfile
        ? getScoreBreakdown(selectedProfile, preferences, viewerProfile)
        : null,
    [preferences, selectedProfile, viewerProfile]
  );

  const messageThreads = useMemo(() => 
    profiles.slice(0, 3).map((profile, index) => ({
      id: `thread-${profile.id}`,
      name: profile.name,
      lastMessage:
        index === 0
          ? "Thank you for accepting the interest. Happy to speak with family as well."
          : index === 1
            ? "Can we continue the conversation this weekend?"
            : "I liked your approach to work-life balance.",
      unreadCount: index === 0 ? 2 : index === 1 ? 0 : 1,
      premiumLocked: !isPremiumPreview && index > 0,
    })),
    [profiles, isPremiumPreview]
  );

  const notifications = [
    `${topMatches.length} suggested matches updated for your preferences`,
    `${incomingInterests.length} profile events need your attention`,
    isPremiumPreview
      ? "Premium preview is active: messaging and contact visibility are unlocked"
      : "Upgrade to premium to unlock unlimited messaging and direct contact visibility",
  ];

  const handleInterest = useCallback((profile) => {
    if (sentInterests.includes(profile.id)) {
      setStatusMessage(`Interest already sent to ${sanitizeText(profile.name)}.`);
      return;
    }

    setSentInterests((current) => [...current, profile.id]);
    setStatusMessage(`Interest sent to ${sanitizeText(profile.name)}.`);
  }, [sentInterests]);

  const handleBlock = useCallback((profile) => {
    setBlockedProfiles((current) => [...current, profile.id]);
    setStatusMessage(`${sanitizeText(profile.name)} was blocked from your discovery list.`);
    if (selectedProfileId === profile.id) {
      setSelectedProfileId("");
    }
  }, [selectedProfileId]);

  const handleReport = useCallback((profile) => {
    if (!reportedProfiles.includes(profile.id)) {
      setReportedProfiles((current) => [...current, profile.id]);
    }
    setStatusMessage(`${sanitizeText(profile.name)} was flagged for moderation review.`);
  }, [reportedProfiles]);

  const handleShortlist = useCallback((profile) => {
    const isAlreadyShortlisted = shortlistedProfiles.includes(profile.id);

    setShortlistedProfiles((current) =>
      isAlreadyShortlisted
        ? current.filter((id) => id !== profile.id)
        : [...current, profile.id]
    );
    setStatusMessage(
      isAlreadyShortlisted
        ? `${sanitizeText(profile.name)} removed from your shortlist.`
        : `${sanitizeText(profile.name)} added to your shortlist.`
    );
  }, [shortlistedProfiles]);

  const handleInterestResponse = useCallback((interest, decision) => {
    setInterestResponses((current) => ({
      ...current,
      [interest.id]: decision,
    }));
    setStatusMessage(
      `${decision === "accepted" ? "Accepted" : "Declined"} interest from ${sanitizeText(
        interest.name
      )}.`
    );
  }, []);

  const handleSendMessage = useCallback((thread) => {
    const draft = String(messageComposer[thread.id] || "").trim();

    if (!draft) {
      setStatusMessage("Type a message before sending.");
      return;
    }

    setMessageComposer((current) => ({
      ...current,
      [thread.id]: "",
    }));
    setStatusMessage(`Message sent to ${sanitizeText(thread.name)}.`);
  }, [messageComposer]);

  const handleProfileFieldChange = useCallback((field, value) => {
    // Field length constraints
    const constraints = {
      name: 50,
      email: 100,
      phone: 15,
      religion: 50,
      caste: 50,
      community: 50,
      education: 100,
      profession: 100,
      location: 100,
      bio: 500,
      familyDetails: 1000,
      languages: 200,
      hobbies: 200,
    };

    const maxLength = constraints[field];
    const constrainedValue = maxLength && value?.length > maxLength ? value.slice(0, maxLength) : value;

    setProfileForm((current) => ({
      ...current,
      [field]: constrainedValue,
    }));

    // Clear field error when user starts editing
    if (fieldErrors[field]) {
      setFieldErrors((current) => {
        const updated = { ...current };
        delete updated[field];
        return updated;
      });
    }
  }, [fieldErrors]);

  const handleProfileSubmit = useCallback(async (event) => {
    event.preventDefault();

    const { isValid, errors } = validateMatrimonialProfile(profileForm);
    if (!isValid) {
      setFieldErrors(errors);
      setProfileError("Please fix the highlighted fields and try again.");
      return;
    }
    setFieldErrors({});

    setIsSavingProfile(true);
    setProfileError("");
    setStatusMessage("Saving your profile...");

    try {
      const sanitizedData = sanitizeProfileData(profileForm);
      const response = await axios.patch(`${API_BASE_URL}/auth/me`, sanitizedData, {
        timeout: 10000,
      });
      const updatedUser = response.data?.user || {
        ...currentUser,
        ...sanitizedData,
      };

      setProfileForm(buildProfileForm(updatedUser));
      setShowProfilePrompt(false);
      setIsEditingProfile(false);
      setStatusMessage("Your profile has been saved successfully.");
      onProfileUpdate?.(updatedUser);
    } catch (error) {
      let errorMsg = "Failed to save profile. Check your connection.";
      
      if (error.response?.status === 401) {
        errorMsg = "Your session expired. Please log in again.";
      } else if (error.response?.status === 413) {
        errorMsg = "Profile data too large. Please reduce text content.";
      } else if (error.response?.status === 400) {
        errorMsg = error.response.data?.message || "Invalid profile data. Please review and try again.";
      } else if (error.code === 'ECONNABORTED') {
        errorMsg = "Request timed out. Please check your connection and try again.";
      }
      
      setProfileError(errorMsg);
    } finally {
      setIsSavingProfile(false);
    }
  }, [profileForm, currentUser, onProfileUpdate]);

  const profileCompletion = useMemo(() => 
    calculateProfileCompletion(profileForm),
    [profileForm]
  );

  return (
    <div className="matrimonial-shell">
      {(showProfilePrompt || isEditingProfile) && (
        <div className="matrimonial-modal-backdrop" role="presentation">
          <section
            className="matrimonial-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="soulmatch-profile-title"
          >
            <p className="matrimonial-kicker">SoulMatch</p>
            <h2 id="soulmatch-profile-title">Complete your profile before you continue</h2>
            <div className="profile-completion-container" role="progressbar" aria-valuenow={profileCompletion} aria-valuemin={0} aria-valuemax={100} aria-label={`Profile ${profileCompletion}% complete`}>
              <div className="profile-completion-bar" style={{ width: `${profileCompletion}%` }}></div>
              <span className="profile-completion-text">{profileCompletion}% Complete</span>
            </div>
            <p className="matrimonial-modal-copy">
              We prefilled this from registration wherever possible. Complete your full SoulMatch
              profile now so matchmaking can start with the right details.
            </p>
            <form className="matrimonial-modal-form" onSubmit={handleProfileSubmit}>
              <label>
                <span>Profile Photo (Optional)</span>
                <div className="matrimonial-photo-upload">
                  {profilePhoto && <img src={profilePhoto} alt="Profile preview" className="matrimonial-photo-preview" />}
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {profilePhoto ? "Change Photo" : "Upload Photo"}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => setProfilePhoto(evt.target?.result || "");
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ display: "none" }}
                  />
                </div>
              </label>
              <div className="matrimonial-modal-grid">
                <label>
                  <span>Profile Name {profileForm.name?.length || 0}/50</span>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(event) => handleProfileFieldChange("name", event.target.value)}
                    placeholder="Enter your profile name"
                    maxLength={50}
                    aria-label="Profile Name"
                    aria-invalid={fieldErrors.name ? "true" : "false"}
                    className={fieldErrors.name ? "field-error" : ""}
                  />
                  {fieldErrors.name && <span className="field-error-msg">{fieldErrors.name}</span>}
                </label>
                <label>
                  <span>Gmail</span>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(event) => handleProfileFieldChange("email", event.target.value)}
                    placeholder="Enter your Gmail address"
                  />
                </label>
                <label>
                  <span>Phone Number</span>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(event) => handleProfileFieldChange("phone", event.target.value)}
                    placeholder="Enter your phone number"
                  />
                </label>
                <label>
                  <span>Age</span>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    value={profileForm.age}
                    onChange={(event) => handleProfileFieldChange("age", event.target.value)}
                  />
                </label>
                <label>
                  <span>Gender</span>
                  <select
                    value={profileForm.gender}
                    onChange={(event) => handleProfileFieldChange("gender", event.target.value)}
                  >
                    <option value="Man">Man</option>
                    <option value="Woman">Woman</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label>
                  <span>Religion</span>
                  <input
                    type="text"
                    value={profileForm.religion}
                    onChange={(event) => handleProfileFieldChange("religion", event.target.value)}
                    placeholder="Enter your religion"
                  />
                </label>
                <label>
                  <span>Caste</span>
                  <input
                    type="text"
                    value={profileForm.caste}
                    onChange={(event) => handleProfileFieldChange("caste", event.target.value)}
                    placeholder="Enter your caste"
                  />
                </label>
                <label>
                  <span>Community</span>
                  <input
                    type="text"
                    value={profileForm.community}
                    onChange={(event) => handleProfileFieldChange("community", event.target.value)}
                    placeholder="Enter your community"
                  />
                </label>
                <label>
                  <span>Education</span>
                  <input
                    type="text"
                    value={profileForm.education}
                    onChange={(event) => handleProfileFieldChange("education", event.target.value)}
                    placeholder="Enter your education"
                  />
                </label>
                <label>
                  <span>Profession</span>
                  <input
                    type="text"
                    value={profileForm.profession}
                    onChange={(event) => handleProfileFieldChange("profession", event.target.value)}
                    placeholder="Enter your profession"
                  />
                </label>
                <label>
                  <span>Location</span>
                  <input
                    type="text"
                    value={profileForm.location}
                    onChange={(event) => handleProfileFieldChange("location", event.target.value)}
                    placeholder="Enter your location"
                  />
                </label>
                <label>
                  <span>Marital Status</span>
                  <select
                    value={profileForm.maritalStatus}
                    onChange={(event) =>
                      handleProfileFieldChange("maritalStatus", event.target.value)
                    }
                  >
                    <option value="Never Married">Never Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </label>
              </div>
        <label>
          <span>Family Details {profileForm.familyDetails?.length || 0}/1000</span>
          <textarea
            value={profileForm.familyDetails}
            onChange={(event) => handleProfileFieldChange("familyDetails", event.target.value)}
            placeholder="Describe your family background"
            rows="3"
            maxLength={1000}
            aria-label="Family Details"
            aria-invalid={fieldErrors.familyDetails ? "true" : "false"}
            className={fieldErrors.familyDetails ? "field-error" : ""}
          />
                {fieldErrors.familyDetails && <span className="field-error-msg">{fieldErrors.familyDetails}</span>}
              </label>
              <label>
                <span>Bio {profileForm.bio?.length || 0}/500</span>
                <textarea
                  value={profileForm.bio}
                  onChange={(event) => handleProfileFieldChange("bio", event.target.value)}
                  placeholder="Describe yourself and what you are looking for"
                  rows="3"
                  maxLength={500}
                  aria-invalid={fieldErrors.bio ? "true" : "false"}
                  className={fieldErrors.bio ? "field-error" : ""}
                />
                {fieldErrors.bio && <span className="field-error-msg">{fieldErrors.bio}</span>}
              </label>
              <div className="matrimonial-modal-grid">
          <label>
            <span>Languages</span>
            <input
              type="text"
              value={profileForm.languages}
              onChange={(event) => handleProfileFieldChange("languages", event.target.value)}
              placeholder="Malayalam, English"
              aria-label="Languages"
            />
          </label>
          <label>
            <span>Hobbies</span>
            <input
              type="text"
              value={profileForm.hobbies}
              onChange={(event) => handleProfileFieldChange("hobbies", event.target.value)}
              placeholder="Travel, Reading"
              aria-label="Hobbies"
            />
          </label>
              </div>
              <div className="matrimonial-toggle-grid">
                <label className="matrimonial-checkbox">
                  <input
                    type="checkbox"
                    checked={profileForm.hidePhone}
                    onChange={(event) =>
                      handleProfileFieldChange("hidePhone", event.target.checked)
                    }
                  />
                  <span>Hide phone number on my profile</span>
                </label>
                <label className="matrimonial-checkbox">
                  <input
                    type="checkbox"
                    checked={profileForm.hidePhotos}
                    onChange={(event) =>
                      handleProfileFieldChange("hidePhotos", event.target.checked)
                    }
                  />
                  <span>Hide profile photos for non-premium viewers</span>
                </label>
                <label className="matrimonial-checkbox">
                  <input
                    type="checkbox"
                    checked={profileForm.premiumOnlyContact}
                    onChange={(event) =>
                      handleProfileFieldChange("premiumOnlyContact", event.target.checked)
                    }
                  />
                  <span>Allow contact only for premium members</span>
                </label>
              </div>
              {profileError && <p className="matrimonial-form-error">{profileError}</p>}
              <div className="matrimonial-modal-actions">
                <button type="submit" className="btn btn-primary" disabled={isSavingProfile}>
                  {isSavingProfile ? "Saving..." : "Save & Continue"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <section className="matrimonial-hero">
        <div>
          <p className="matrimonial-kicker">SoulMatch</p>
          <h1>Matrimonial Matchmaking Workspace</h1>
          <p className="matrimonial-subtitle">
            Profile discovery, partner preferences, interests, secure communication previews,
            premium access controls, moderation, and privacy-aware contact visibility.
          </p>
        </div>
        <div className="matrimonial-hero-card">
          <span className="matrimonial-hero-label">Plan Status</span>
          <strong>{isPremiumPreview ? "Premium Preview" : "Free Member"}</strong>
          <p>
            {isPremiumPreview
              ? "Unlimited messaging and contact visibility are unlocked in this preview."
              : "Upgrade to preview premium messaging, contact details, and deeper profile access."}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsPremiumPreview((current) => !current)}
          >
            {isPremiumPreview ? "Switch to Free View" : "Preview Premium"}
          </button>
        </div>
      </section>

      <section className="matrimonial-overview">
        <article className="matrimonial-stat-card">
          <span className="matrimonial-stat-label">Suggested Matches</span>
          <strong>{visibleProfiles.length}</strong>
          <p>Profiles that meet your current filters and preference rules.</p>
        </article>
        <article className="matrimonial-stat-card">
          <span className="matrimonial-stat-label">Sent Interests</span>
          <strong>{sentInterests.length}</strong>
          <p>Track responses from people you have already shown interest in.</p>
        </article>
        <article className="matrimonial-stat-card">
          <span className="matrimonial-stat-label">Profile Completion</span>
          <strong>{calculateProfileCompletion(viewerProfile)}%</strong>
          <p>Add family details, verification, and preferences to improve match quality.</p>
        </article>
        <article className="matrimonial-stat-card">
          <span className="matrimonial-stat-label">Security</span>
          <strong>{reportedProfiles.length} Reports</strong>
          <p>Privacy-aware browsing with report, block, and moderation support.</p>
        </article>
      </section>

      <section className="matrimonial-tabs" aria-label="SoulMatch sections" role="tablist">
        {[
          { id: "discover", label: "Discover" },
          { id: "requests", label: "Interests" },
          { id: "messages", label: "Messages" },
          ...(isAdmin ? [{ id: "admin", label: "Admin" }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`matrimonial-tabpanel-${tab.id}`}
            className={`matrimonial-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </section>

      {statusMessage && (
        <div className="matrimonial-banner" role="status" aria-live="polite">
          {statusMessage}
        </div>
      )}

      <div className="matrimonial-content-grid">
        <aside className="matrimonial-sidebar">
          <section className="matrimonial-panel">
            <div className="matrimonial-panel-heading">
              <h2>Your Profile</h2>
              <span className="matrimonial-chip">{isPremiumPreview ? "Premium" : "Free"}</span>
            </div>
            <dl className="matrimonial-profile-summary">
              <div>
                <dt>Name</dt>
                <dd>{sanitizeText(viewerProfile.name)}</dd>
              </div>
              <div>
                <dt>Age</dt>
                <dd>{viewerProfile.age}</dd>
              </div>
              <div>
                <dt>Gender</dt>
                <dd>{sanitizeText(viewerProfile.gender)}</dd>
              </div>
              <div>
                <dt>Religion</dt>
                <dd>{sanitizeText(viewerProfile.religion)}</dd>
              </div>
              <div>
                <dt>Community</dt>
                <dd>{sanitizeText(viewerProfile.community)}</dd>
              </div>
              <div>
                <dt>Education</dt>
                <dd>{sanitizeText(viewerProfile.education)}</dd>
              </div>
              <div>
                <dt>Profession</dt>
                <dd>{sanitizeText(viewerProfile.profession)}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{sanitizeText(viewerProfile.location)}</dd>
              </div>
              <div>
                <dt>Gmail</dt>
                <dd>{viewerProfile.email || "Add your Gmail in profile setup"}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{viewerProfile.phone || "Add your phone number in profile setup"}</dd>
              </div>
              <div>
                <dt>Marital Status</dt>
                <dd>{sanitizeText(viewerProfile.maritalStatus)}</dd>
              </div>
            </dl>
            <p className="matrimonial-detail-bio">{sanitizeText(viewerProfile.bio)}</p>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsEditingProfile(!isEditingProfile)}
            >
              {isEditingProfile ? "Close Edit Mode" : "Edit Profile"}
            </button>
          </section>

          <section className="matrimonial-panel">
            <div className="matrimonial-panel-heading">
              <h2>Partner Preferences</h2>
              <span className="matrimonial-chip">Match Rules</span>
            </div>
            <div className="matrimonial-form-grid">
              <label>
                <span>Age Min</span>
                <input
                  type="number"
                  min="18"
                  max="70"
                  value={preferences.ageMin}
                  onChange={(event) =>
                    setPreferences((current) => ({ ...current, ageMin: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Age Max</span>
                <input
                  type="number"
                  min="18"
                  max="70"
                  value={preferences.ageMax}
                  onChange={(event) =>
                    setPreferences((current) => ({ ...current, ageMax: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Religion</span>
                <select
                  value={preferences.religion}
                  onChange={(event) =>
                    setPreferences((current) => ({ ...current, religion: event.target.value }))
                  }
                >
                  {religions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Caste</span>
                <input
                  type="text"
                  value={preferences.caste}
                  onChange={(event) =>
                    setPreferences((current) => ({ ...current, caste: event.target.value || "Any" }))
                  }
                  placeholder="Any"
                />
              </label>
              <label>
                <span>Location</span>
                <select
                  value={preferences.location}
                  onChange={(event) =>
                    setPreferences((current) => ({ ...current, location: event.target.value }))
                  }
                >
                  {locations.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Education</span>
                <select
                  value={preferences.education}
                  onChange={(event) =>
                    setPreferences((current) => ({ ...current, education: event.target.value }))
                  }
                >
                  {educations.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Profession</span>
                <select
                  value={preferences.profession}
                  onChange={(event) =>
                    setPreferences((current) => ({ ...current, profession: event.target.value }))
                  }
                >
                  {professions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="matrimonial-panel">
            <div className="matrimonial-panel-heading">
              <h2>Notifications</h2>
              <span className="matrimonial-chip">Live</span>
            </div>
            <ul className="matrimonial-notification-list">
              {notifications.map((notification) => (
                <li key={notification}>{notification}</li>
              ))}
            </ul>
          </section>

          <section className="matrimonial-panel">
            <div className="matrimonial-panel-heading">
              <h2>Shortlist</h2>
              <span className="matrimonial-chip">{shortlistedMatches.length} saved</span>
            </div>
            {shortlistedMatches.length > 0 ? (
              <div className="matrimonial-shortlist-list">
                {shortlistedMatches.map((profile) => (
                  <button
                    key={`shortlist-${profile.id}`}
                    type="button"
                    className="matrimonial-shortlist-item"
                    onClick={() => {
                      setActiveTab("discover");
                      setSelectedProfileId(profile.id);
                    }}
                  >
                    <strong>{sanitizeText(profile.name)}</strong>
                    <span>{profile.matchScore || getMatchScore(profile, preferences, viewerProfile)}% Match</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="matrimonial-detail-bio">
                Save promising profiles to revisit them quickly while comparing matches.
              </p>
            )}
          </section>
        </aside>

        <main className="matrimonial-main">
          {activeTab === "discover" && (
            <>
              <section className="matrimonial-panel">
                <div className="matrimonial-panel-heading">
                  <h2>Search & Matchmaking</h2>
                  <span className="matrimonial-chip">FRS Core</span>
                </div>
                <div className="matrimonial-search-grid" role="region" aria-label="Profile search and filter controls" aria-live={isFiltering ? "polite" : "off"}>
                  <label>
                    <span>Search Profiles</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by profession, location, religion, or community"
                      aria-label="Search profiles by profession, location, religion, or community"
                    />
                  </label>
                  <label>
                    <span>Religion Filter</span>
                    <select
                      value={advancedFilters.religion}
                      onChange={(event) =>
                        setAdvancedFilters((current) => ({
                          ...current,
                          religion: event.target.value,
                        }))
                      }
                    >
                      {religions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Location Filter</span>
                    <select
                      value={advancedFilters.location}
                      onChange={(event) =>
                        setAdvancedFilters((current) => ({
                          ...current,
                          location: event.target.value,
                        }))
                      }
                    >
                      {locations.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Caste Filter</span>
                    <select
                      value={advancedFilters.caste}
                      onChange={(event) =>
                        setAdvancedFilters((current) => ({
                          ...current,
                          caste: event.target.value,
                        }))
                      }
                    >
                      {castes.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Education Filter</span>
                    <select
                      value={advancedFilters.education}
                      onChange={(event) =>
                        setAdvancedFilters((current) => ({
                          ...current,
                          education: event.target.value,
                        }))
                      }
                    >
                      {educations.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Profession Filter</span>
                    <select
                      value={advancedFilters.profession}
                      onChange={(event) =>
                        setAdvancedFilters((current) => ({
                          ...current,
                          profession: event.target.value,
                        }))
                      }
                    >
                      {professions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Sort Matches</span>
                    <select
                      value={sortMode}
                      onChange={(event) => setSortMode(event.target.value)}
                    >
                      <option value="best-match">Best match</option>
                      <option value="recently-active">Recently active</option>
                      <option value="most-viewed">Most viewed</option>
                      <option value="age-low">Age: low to high</option>
                    </select>
                  </label>
                  <label className="matrimonial-checkbox">
                    <input
                      type="checkbox"
                      checked={advancedFilters.verifiedOnly}
                      onChange={(event) =>
                        setAdvancedFilters((current) => ({
                          ...current,
                          verifiedOnly: event.target.checked,
                        }))
                      }
                    />
                    <span>Show verified profiles only</span>
                  </label>
                </div>
              </section>

              <section className="matrimonial-panel">
                <div className="matrimonial-panel-heading">
                  <h2>Suggested Matches</h2>
                  <span className="matrimonial-chip">{allFilteredProfiles.length} results</span>
                </div>
                <div className="matrimonial-match-grid">
                  {visibleProfiles.map((profile) => (
                    <article
                      key={profile.id}
                      className={`matrimonial-match-card ${
                        selectedProfile?.id === profile.id ? "selected" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="matrimonial-card-hitbox"
                        onClick={() => setSelectedProfileId(profile.id)}
                      >
                        <div className="matrimonial-card-top">
                          <div className="matrimonial-avatar-wrap">
                            <span className="matrimonial-avatar">
                              {profile.privacy.hidePhotos && !isPremiumPreview ? "Private" : sanitizeText(profile.image)}
                            </span>
                          </div>
                          <div>
                            <h3>{sanitizeText(profile.name)}</h3>
                            <p>
                              {profile.age} years · {sanitizeText(profile.profession)}
                            </p>
                          </div>
                        </div>
                        <div className="matrimonial-card-meta">
                          <span>{sanitizeText(profile.religion)}</span>
                          <span>{sanitizeText(profile.caste)}</span>
                          <span>{sanitizeText(profile.location)}</span>
                          <span>{sanitizeText(profile.education)}</span>
                        </div>
                        <div className="matrimonial-score-row">
                          <strong>{profile.matchScore}% Match</strong>
                          {profile.verified && <span className="matrimonial-verified-badge" title="Profile verified">✓ Verified</span>}
                          {!profile.verified && <span className="matrimonial-unverified-badge">Pending</span>}
                        </div>
                        <p className="matrimonial-bio-snippet">{sanitizeText(profile.bio)}</p>
                      </button>
                      <div className="matrimonial-card-actions">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleInterest(profile)}
                          aria-label={`${sentInterests.includes(profile.id) ? "Interest sent to" : "Express interest to"} ${sanitizeText(profile.name)}`}
                          aria-pressed={sentInterests.includes(profile.id)}
                        >
                          {sentInterests.includes(profile.id) ? "Interest Sent" : "Express Interest"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => setSelectedProfileId(profile.id)}
                          aria-label={`View profile for ${sanitizeText(profile.name)}`}
                        >
                          View Profile
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => handleShortlist(profile)}
                        >
                          {shortlistedProfiles.includes(profile.id) ? "Shortlisted" : "Shortlist"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {totalPages > 0 && (
                  <div className="matrimonial-pagination">
                    <button 
                      type="button"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button 
                      type="button"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === "requests" && (
            <section className="matrimonial-panel">
              <div className="matrimonial-panel-heading">
                <h2>Interest Requests</h2>
                <span className="matrimonial-chip">Communication</span>
              </div>
              <div className="matrimonial-request-list">
                {incomingInterests.map((interest) => (
                  <article key={interest.id} className="matrimonial-request-card">
                    <div>
                      <h3>{interest.name}</h3>
                      <p>{interest.note}</p>
                    </div>
                    <div className="matrimonial-request-meta">
                      <strong>{interest.matchScore}% Match</strong>
                      <span>{interest.status}</span>
                    </div>
                    <div className="matrimonial-card-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleInterestResponse(interest, "accepted")}
                      >
                        {interestResponses[interest.id] === "accepted" ? "Accepted" : "Accept"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => handleInterestResponse(interest, "declined")}
                      >
                        {interestResponses[interest.id] === "declined" ? "Declined" : "Decline"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeTab === "messages" && (
            <section className="matrimonial-panel">
              <div className="matrimonial-panel-heading">
                <h2>Secure Messages</h2>
                <span className="matrimonial-chip">
                  {isPremiumPreview ? "Unlocked" : "Premium Gated"}
                </span>
              </div>
              <div className="matrimonial-message-list">
                {messageThreads.map((thread) => (
                  <article key={thread.id} className="matrimonial-message-card">
                    <div>
                      <h3>{thread.name}</h3>
                      <p>
                        {thread.premiumLocked
                          ? "Upgrade to premium to continue unlimited messaging with this member."
                          : thread.lastMessage}
                      </p>
                    </div>
                    <div className="matrimonial-message-meta">
                      <span>{thread.unreadCount} unread</span>
                      <div className="matrimonial-message-actions">
                        <button
                          type="button"
                          className="btn btn-outline"
                          disabled={thread.premiumLocked}
                        >
                          {thread.premiumLocked ? "Premium Required" : "Open Chat"}
                        </button>
                        {!thread.premiumLocked && (
                          <>
                            <input
                              type="text"
                              value={messageComposer[thread.id] || ""}
                              onChange={(event) =>
                                setMessageComposer((current) => ({
                                  ...current,
                                  [thread.id]: event.target.value,
                                }))
                              }
                              placeholder="Type a respectful introduction"
                              aria-label={`Message ${thread.name}`}
                            />
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => handleSendMessage(thread)}
                            >
                              Send
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeTab === "admin" && isAdmin && (
            <section className="matrimonial-panel">
              <div className="matrimonial-panel-heading">
                <h2>Admin Moderation</h2>
                <span className="matrimonial-chip">Moderation</span>
              </div>
              <div className="matrimonial-admin-grid">
                <article className="matrimonial-admin-card">
                  <strong>{profiles.filter((profile) => profile.verified).length}</strong>
                  <p>Approved Profiles</p>
                </article>
                <article className="matrimonial-admin-card">
                  <strong>{profiles.filter((profile) => !profile.verified).length}</strong>
                  <p>Pending Verification</p>
                </article>
                <article className="matrimonial-admin-card">
                  <strong>{reportedProfiles.length}</strong>
                  <p>Complaints / Reports</p>
                </article>
                <article className="matrimonial-admin-card">
                  <strong>{isPremiumPreview ? "1 demo premium" : "0 demo premium"}</strong>
                  <p>Premium Members Preview</p>
                </article>
              </div>
              <div className="matrimonial-request-list">
                {profiles.slice(0, 3).map((profile) => (
                  <article key={`admin-${profile.id}`} className="matrimonial-request-card">
                    <div>
                      <h3>{sanitizeText(profile.name)}</h3>
                      <p>
                        {sanitizeText(profile.profileStatus)} · {sanitizeText(profile.verificationStatus)} · {profile.profileViews} views
                      </p>
                    </div>
                    <div className="matrimonial-card-actions">
                      <button type="button" className="btn btn-primary">
                        Approve
                      </button>
                      <button type="button" className="btn btn-outline">
                        Request Changes
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>

        <aside className="matrimonial-detail-rail">
          <section className="matrimonial-panel">
            <div className="matrimonial-panel-heading">
              <h2>Selected Profile</h2>
              <span className="matrimonial-chip">
                {selectedProfile ? `${selectedProfile.matchScore}% Match` : "No Match"}
              </span>
            </div>
            {selectedProfile ? (
              <div className="matrimonial-detail-card">
                <div className="matrimonial-detail-hero">
                  <span className="matrimonial-avatar large">
                    {selectedProfile.privacy.hidePhotos && !isPremiumPreview
                      ? "Private"
                      : sanitizeText(selectedProfile.image)}
                  </span>
                  <div>
                    <h3>{sanitizeText(selectedProfile.name)}</h3>
                    <p>
                      {selectedProfile.age} years · {sanitizeText(selectedProfile.maritalStatus)}
                    </p>
                    <p>{sanitizeText(selectedProfile.lastActive)}</p>
                  </div>
                </div>
                <dl className="matrimonial-detail-grid">
                  <div>
                    <dt>Religion</dt>
                    <dd>{sanitizeText(selectedProfile.religion)}</dd>
                  </div>
                  <div>
                    <dt>Caste</dt>
                    <dd>{sanitizeText(selectedProfile.caste)}</dd>
                  </div>
                  <div>
                    <dt>Community</dt>
                    <dd>{sanitizeText(selectedProfile.community)}</dd>
                  </div>
                  <div>
                    <dt>Education</dt>
                    <dd>{sanitizeText(selectedProfile.education)}</dd>
                  </div>
                  <div>
                    <dt>Profession</dt>
                    <dd>{sanitizeText(selectedProfile.profession)}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>{sanitizeText(selectedProfile.location)}</dd>
                  </div>
                  <div>
                    <dt>Family</dt>
                    <dd>{sanitizeText(selectedProfile.familyDetails)}</dd>
                  </div>
                  <div>
                    <dt>Contact</dt>
                    <dd>{getVisiblePhone(selectedProfile, isPremiumPreview)}</dd>
                  </div>
                </dl>
                <div className="matrimonial-tag-row">
                  {selectedProfile.languages.map((language) => (
                    <span key={language} className="matrimonial-tag">
                      {sanitizeText(language)}
                    </span>
                  ))}
                  {selectedProfile.hobbies.map((hobby) => (
                    <span key={hobby} className="matrimonial-tag muted">
                      {sanitizeText(hobby)}
                    </span>
                  ))}
                </div>
                <p className="matrimonial-detail-bio">{sanitizeText(selectedProfile.bio)}</p>
                <div className="matrimonial-card-actions vertical">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleInterest(selectedProfile)}
                    aria-label={`${sentInterests.includes(selectedProfile.id) ? "Interest sent to" : "Send interest to"} ${sanitizeText(selectedProfile.name)}`}
                    aria-pressed={sentInterests.includes(selectedProfile.id)}
                  >
                    {sentInterests.includes(selectedProfile.id) ? "Interest Sent" : "Send Interest"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleShortlist(selectedProfile)}
                  >
                    {shortlistedProfiles.includes(selectedProfile.id)
                      ? "Remove from Shortlist"
                      : "Add to Shortlist"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={!isPremiumPreview}
                    aria-label={`${isPremiumPreview ? "Open secure chat with" : "Premium messaging required for"} ${sanitizeText(selectedProfile.name)}`}
                  >
                    {isPremiumPreview ? "Open Secure Chat" : "Premium Messaging Required"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleReport(selectedProfile)}
                    aria-label={`Report ${sanitizeText(selectedProfile.name)} for inappropriate content`}
                  >
                    Report Profile
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleBlock(selectedProfile)}
                    aria-label={`Block ${sanitizeText(selectedProfile.name)} from viewing your profile`}
                  >
                    Block Profile
                  </button>
                </div>
                {selectedProfileBreakdown && (
                  <div className="matrimonial-insights-card">
                    <h4>Why this match</h4>
                    <div className="matrimonial-tag-row">
                      {selectedProfileBreakdown.age > 0 && <span className="matrimonial-tag">Age aligned</span>}
                      {selectedProfileBreakdown.religion > 0 && <span className="matrimonial-tag">Religion aligned</span>}
                      {selectedProfileBreakdown.location > 0 && <span className="matrimonial-tag">Location aligned</span>}
                      {selectedProfileBreakdown.education > 0 && <span className="matrimonial-tag">Education aligned</span>}
                      {selectedProfileBreakdown.profession > 0 && <span className="matrimonial-tag">Profession aligned</span>}
                      {selectedProfileBreakdown.similarity > 0 && <span className="matrimonial-tag muted">Shared background</span>}
                    </div>
                    <p className="matrimonial-detail-bio">
                      {selectedProfileBreakdown.matches || "This profile is being shown as a general discovery suggestion."}
                    </p>
                    <p className="matrimonial-detail-bio">
                      {selectedProfile.profileViews} profile views · {sanitizeText(selectedProfile.lastActive)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="matrimonial-empty-state">
                <h3>No profiles available</h3>
                <p>Relax the filters or update your partner preferences to widen discovery.</p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

Matrimonial.propTypes = {
  onProfileUpdate: PropTypes.func,
};

Matrimonial.defaultProps = {
  onProfileUpdate: null,
};

export default Matrimonial;
