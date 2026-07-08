import React from "react";

const RELATION_OPTIONS = [
  { value: "Self", label: "Self" },
  { value: "Spouse", label: "Spouse" },
  { value: "Father", label: "Father" },
  { value: "Mother", label: "Mother" },
  { value: "Son", label: "Son" },
  { value: "Daughter", label: "Daughter" },
  { value: "Brother", label: "Brother" },
  { value: "Sister", label: "Sister" },
  { value: "Grandfather", label: "Grandfather" },
  { value: "Grandmother", label: "Grandmother" },
  { value: "Uncle", label: "Uncle" },
  { value: "Aunt", label: "Aunt" },
  { value: "Cousin", label: "Cousin" },
  { value: "Partner", label: "Partner" },
  { value: "Friend", label: "Friend" },
  { value: "Other", label: "Other" },
];

const FamilyProfilesView = ({
  familyProfilesApi,
  signs,
  GENDER_OPTIONS,
  BIRTH_LOCATION_OPTIONS,
  BIRTH_TIMEZONE_OPTIONS,
  NAKSHATRA_NAMES,
  getNakshatraDisplayName,
  language,
}) => (
  <div className="astro-card-grid">
    <article className="astrology-panel astro-result-card astro-span-2">
      <div className="astro-family-header">
        <h4>Family profiles</h4>
        <button
          type="button"
          className="astrology-save-button"
          onClick={familyProfilesApi.handleStartAdd}
          disabled={familyProfilesApi.isAddingNew || familyProfilesApi.editingProfile}
        >
          + Add family member
        </button>
      </div>
      <p>Manage birth details for your family members to generate their horoscopes and check compatibility.</p>
    </article>

    {familyProfilesApi.familyProfilesError ? (
      <article className="astrology-panel astro-result-card astro-span-2">
        <p className="astrology-inline-message astrology-inline-message-error">
          {familyProfilesApi.familyProfilesError}
        </p>
        <button
          type="button"
          className="astrology-secondary-button"
          onClick={familyProfilesApi.clearFamilyProfilesError}
        >
          Dismiss
        </button>
      </article>
    ) : null}

    {familyProfilesApi.editingProfile ? (
      <article className="astrology-panel astro-result-card astro-span-2">
        <h4>{familyProfilesApi.isAddingNew ? "Add family member" : "Edit family member"}</h4>
        <div className="astro-compact-form">
          <label className="astrology-field">
            <span>Name *</span>
            <input
              type="text"
              value={familyProfilesApi.editingProfile.name}
              onChange={(event) => familyProfilesApi.handleFieldChange("name", event.target.value)}
              placeholder="Full name"
            />
          </label>

          <label className="astrology-field">
            <span>Relation *</span>
            <select
              value={familyProfilesApi.editingProfile.relation}
              onChange={(event) => familyProfilesApi.handleFieldChange("relation", event.target.value)}
            >
              {RELATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="astrology-field">
            <span>Gender</span>
            <select
              value={familyProfilesApi.editingProfile.gender}
              onChange={(event) => familyProfilesApi.handleFieldChange("gender", event.target.value)}
            >
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value || "unset"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="astrology-field">
            <span>Zodiac sign *</span>
            <select
              value={familyProfilesApi.editingProfile.sign}
              onChange={(event) => familyProfilesApi.handleFieldChange("sign", event.target.value)}
            >
              {signs.map((item) => (
                <option key={item.sign} value={item.sign}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="astrology-field">
            <span>Birth date</span>
            <input
              type="date"
              value={familyProfilesApi.editingProfile.birthDate}
              onChange={(event) => familyProfilesApi.handleFieldChange("birthDate", event.target.value)}
            />
          </label>

          <label className="astrology-field">
            <span>Birth time</span>
            <input
              type="time"
              value={familyProfilesApi.editingProfile.birthTime}
              onChange={(event) => familyProfilesApi.handleFieldChange("birthTime", event.target.value)}
            />
          </label>

          <label className="astrology-field">
            <span>Birth place</span>
            <input
              type="text"
              list="astro-family-birth-place-options"
              value={familyProfilesApi.editingProfile.birthPlace}
              onChange={(event) => familyProfilesApi.handleFieldChange("birthPlace", event.target.value)}
              placeholder="City, Country"
            />
            <datalist id="astro-family-birth-place-options">
              {BIRTH_LOCATION_OPTIONS.map((option) => (
                <option key={option.label} value={option.label} />
              ))}
            </datalist>
          </label>

          <label className="astrology-field">
            <span>Birth timezone</span>
            <select
              value={familyProfilesApi.editingProfile.birthTimezone}
              onChange={(event) => familyProfilesApi.handleFieldChange("birthTimezone", event.target.value)}
            >
              {BIRTH_TIMEZONE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="astrology-field">
            <span>Nakshatra</span>
            <select
              value={familyProfilesApi.editingProfile.nakshatra}
              onChange={(event) => familyProfilesApi.handleFieldChange("nakshatra", event.target.value)}
            >
              <option value="">Auto-calculate</option>
              {NAKSHATRA_NAMES.map((name) => (
                <option key={name} value={name}>
                  {getNakshatraDisplayName(name, language)}
                </option>
              ))}
            </select>
          </label>

          <label className="astrology-field">
            <span>Rashi</span>
            <input
              type="text"
              value={familyProfilesApi.editingProfile.rashi}
              onChange={(event) => familyProfilesApi.handleFieldChange("rashi", event.target.value)}
              placeholder="Auto-calculated from birth details"
            />
          </label>

          <label className="astrology-field">
            <span>Lagna</span>
            <input
              type="text"
              value={familyProfilesApi.editingProfile.lagna}
              onChange={(event) => familyProfilesApi.handleFieldChange("lagna", event.target.value)}
              placeholder="Ascendant sign"
            />
          </label>
        </div>

        <div className="astrology-inline-actions">
          <button
            type="button"
            className="astrology-save-button"
            onClick={familyProfilesApi.handleSaveProfile}
            disabled={familyProfilesApi.familyProfilesLoading}
          >
            {familyProfilesApi.familyProfilesLoading ? "Saving..." : "Save profile"}
          </button>
          <button
            type="button"
            className="astrology-secondary-button"
            onClick={familyProfilesApi.handleCancelEdit}
            disabled={familyProfilesApi.familyProfilesLoading}
          >
            Cancel
          </button>
        </div>
      </article>
    ) : null}

    {familyProfilesApi.familyProfiles.length === 0 && !familyProfilesApi.editingProfile ? (
      <article className="astrology-panel astro-result-card astro-span-2">
        <p className="astrology-history-empty">
          No family profiles added yet. Click "Add family member" to get started.
        </p>
      </article>
    ) : null}

    {familyProfilesApi.familyProfiles.map((profile) => (
      <article key={profile.id} className="astrology-panel astro-result-card">
        <div className="astro-family-profile-header">
          <h4>{profile.name}</h4>
          <span className="astro-relation-badge">{profile.relation}</span>
        </div>
        
        <div className="astro-profile-details">
          <p><strong>Sign:</strong> {signs.find(s => s.sign === profile.sign)?.label || profile.sign}</p>
          {profile.birthDate ? (
            <p><strong>Birth date:</strong> {new Date(profile.birthDate).toLocaleDateString()}</p>
          ) : null}
          {profile.birthTime ? <p><strong>Birth time:</strong> {profile.birthTime}</p> : null}
          {profile.birthPlace ? <p><strong>Birth place:</strong> {profile.birthPlace}</p> : null}
          {profile.gender ? <p><strong>Gender:</strong> {profile.gender}</p> : null}
          {profile.nakshatra ? (
            <p><strong>Nakshatra:</strong> {getNakshatraDisplayName(profile.nakshatra, language)}</p>
          ) : null}
          {profile.rashi ? <p><strong>Rashi:</strong> {profile.rashi}</p> : null}
        </div>

        <div className="astrology-inline-actions">
          <button
            type="button"
            className="astrology-secondary-button"
            onClick={() => familyProfilesApi.handleStartEdit(profile)}
            disabled={familyProfilesApi.editingProfile !== null}
          >
            Edit
          </button>
          <button
            type="button"
            className="astrology-secondary-button"
            onClick={() => familyProfilesApi.handleDuplicateProfile(profile)}
            disabled={familyProfilesApi.editingProfile !== null}
          >
            Duplicate
          </button>
          {profile.birthDate && profile.birthTime ? (
            <button
              type="button"
              className="astrology-secondary-button"
              onClick={() => familyProfilesApi.handleGenerateKundliForMember(profile)}
              disabled={familyProfilesApi.familyProfilesLoading}
            >
              Generate Kundli
            </button>
          ) : null}
          {familyProfilesApi.deleteConfirmId === profile.id ? (
            <>
              <button
                type="button"
                className="astrology-delete-button"
                onClick={() => familyProfilesApi.handleDeleteProfile(profile.id)}
                disabled={familyProfilesApi.familyProfilesLoading}
              >
                Confirm delete
              </button>
              <button
                type="button"
                className="astrology-secondary-button"
                onClick={() => familyProfilesApi.setDeleteConfirmId("")}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className="astrology-secondary-button"
              onClick={() => familyProfilesApi.setDeleteConfirmId(profile.id)}
              disabled={familyProfilesApi.editingProfile !== null}
            >
              Delete
            </button>
          )}
        </div>
      </article>
    ))}

    {familyProfilesApi.familyProfiles.length >= 2 && !familyProfilesApi.editingProfile ? (
      <article className="astrology-panel astro-result-card astro-span-2">
        <h4>Check compatibility between family members</h4>
        <p>Select two family members to check their astrological compatibility</p>
        <div className="astro-compatibility-selector">
          <select className="astrology-field-input">
            <option value="">Select first member</option>
            {familyProfilesApi.familyProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name} ({profile.relation})
              </option>
            ))}
          </select>
          <span>with</span>
          <select className="astrology-field-input">
            <option value="">Select second member</option>
            {familyProfilesApi.familyProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name} ({profile.relation})
              </option>
            ))}
          </select>
          <button type="button" className="astrology-save-button">
            Check compatibility
          </button>
        </div>
      </article>
    ) : null}
  </div>
);

export default FamilyProfilesView;
