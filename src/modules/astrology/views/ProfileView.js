import React from "react";
import { DEFAULT_BIRTH_TIME_ZONE } from "../data/astrologyConstants";

const ProfileView = ({
  profileApi,
  handleBirthPlaceChange,
  handleBirthTimezoneChange,
  handleQuickSave,
  BIRTH_LOCATION_OPTIONS,
  BIRTH_TIMEZONE_OPTIONS,
  GENDER_OPTIONS,
  isProfileFieldMissing,
}) => (
  <div className="astro-card-grid">
    <article className="astrology-panel astro-result-card astro-span-2">
      <h4>Profile settings</h4>
      <div className="astro-compact-form">
        <label className={`astrology-field ${isProfileFieldMissing("birthDate") ? "astrology-field-missing" : ""}`}>
          <span>Birth date</span>
          <input type="date" value={profileApi.profileDraft.birthDate} onChange={(event) => profileApi.handleDraftChange("birthDate", event.target.value)} />
        </label>
        <label className={`astrology-field ${isProfileFieldMissing("birthTime") ? "astrology-field-missing" : ""}`}>
          <span>Birth time</span>
          <input type="time" value={profileApi.profileDraft.birthTime} onChange={(event) => profileApi.handleDraftChange("birthTime", event.target.value)} />
        </label>
        <label className={`astrology-field ${isProfileFieldMissing("birthPlace") ? "astrology-field-missing" : ""}`}>
          <span>Birth place</span>
          <input type="text" list="astro-birth-place-options-profile" value={profileApi.profileDraft.birthPlace} onChange={(event) => handleBirthPlaceChange(event.target.value)} />
          <datalist id="astro-birth-place-options-profile">
            {BIRTH_LOCATION_OPTIONS.map((option) => <option key={option.label} value={option.label} />)}
          </datalist>
        </label>
        <label className="astrology-field">
          <span>Birth timezone</span>
          <select value={profileApi.profileDraft.birthTimezone || DEFAULT_BIRTH_TIME_ZONE} onChange={(event) => handleBirthTimezoneChange(event.target.value)}>
            {BIRTH_TIMEZONE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className={`astrology-field ${isProfileFieldMissing("gender") ? "astrology-field-missing" : ""}`}>
          <span>Gender</span>
          <select value={profileApi.profileDraft.gender} onChange={(event) => profileApi.handleDraftChange("gender", event.target.value)}>
            {GENDER_OPTIONS.map((option) => <option key={option.value || "unset"} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="astrology-field">
          <span>Favorite topics</span>
          <input type="text" value={profileApi.profileDraft.favoriteTopics} onChange={(event) => profileApi.handleDraftChange("favoriteTopics", event.target.value)} />
        </label>
      </div>
      <button type="button" className="astrology-save-button" onClick={handleQuickSave}>Save profile</button>
    </article>
    
    <article className="astrology-panel astro-result-card astro-span-2">
      <h4>Notification preferences</h4>
      <div className="astro-compact-form">
        <label className="astrology-field">
          <input 
            type="checkbox" 
            checked={profileApi.profileDraft.notifications?.dailyHoroscope !== false} 
            onChange={(event) => profileApi.handleDraftChange("notifications", {
              ...profileApi.profileDraft.notifications,
              dailyHoroscope: event.target.checked
            })} 
          />
          <span>Receive daily horoscope</span>
        </label>
        <label className="astrology-field">
          <input 
            type="checkbox" 
            checked={profileApi.profileDraft.notifications?.festivalReminders !== false} 
            onChange={(event) => profileApi.handleDraftChange("notifications", {
              ...profileApi.profileDraft.notifications,
              festivalReminders: event.target.checked
            })} 
          />
          <span>Festival reminders</span>
        </label>
        <label className="astrology-field">
          <input 
            type="checkbox" 
            checked={profileApi.profileDraft.notifications?.goodMuhurtam !== false} 
            onChange={(event) => profileApi.handleDraftChange("notifications", {
              ...profileApi.profileDraft.notifications,
              goodMuhurtam: event.target.checked
            })} 
          />
          <span>Good muhurtam alerts</span>
        </label>
        <label className="astrology-field">
          <input 
            type="checkbox" 
            checked={profileApi.profileDraft.notifications?.dashaAlerts !== false} 
            onChange={(event) => profileApi.handleDraftChange("notifications", {
              ...profileApi.profileDraft.notifications,
              dashaAlerts: event.target.checked
            })} 
          />
          <span>Dasha period alerts</span>
        </label>
      </div>
    </article>
  </div>
);

export default ProfileView;
