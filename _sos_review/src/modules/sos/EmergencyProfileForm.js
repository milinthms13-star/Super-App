import React, { useEffect, useState } from "react";
import "../../styles/SOSUpgrade.css";

const STORAGE_KEY = "nilahub_emergency_profile_v1";

const defaultProfile = {
  bloodGroup: "",
  allergies: "",
  medicalConditions: "",
  emergencyNotes: "",
  homeAddress: "",
  preferredHospital: "",
};

export const loadEmergencyProfile = () => {
  try {
    return { ...defaultProfile, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) };
  } catch {
    return defaultProfile;
  }
};

const EmergencyProfileForm = ({ onSave }) => {
  const [profile, setProfile] = useState(defaultProfile);

  useEffect(() => {
    setProfile(loadEmergencyProfile());
  }, []);

  const updateField = (field, value) => setProfile((state) => ({ ...state, [field]: value }));

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    onSave?.(profile);
  };

  return (
    <section className="sos-profile-card">
      <div>
        <p className="sos-upgrade-eyebrow">Emergency profile</p>
        <h3>Details shared with trusted contacts during SOS</h3>
      </div>

      <div className="sos-profile-grid">
        <label>Blood group<input value={profile.bloodGroup} onChange={(e) => updateField("bloodGroup", e.target.value)} placeholder="O+" /></label>
        <label>Allergies<input value={profile.allergies} onChange={(e) => updateField("allergies", e.target.value)} placeholder="Penicillin, peanuts..." /></label>
        <label>Medical conditions<input value={profile.medicalConditions} onChange={(e) => updateField("medicalConditions", e.target.value)} placeholder="Asthma, diabetes..." /></label>
        <label>Preferred hospital<input value={profile.preferredHospital} onChange={(e) => updateField("preferredHospital", e.target.value)} placeholder="Hospital name" /></label>
        <label className="wide">Home address<textarea value={profile.homeAddress} onChange={(e) => updateField("homeAddress", e.target.value)} placeholder="Address for responders" /></label>
        <label className="wide">Emergency notes<textarea value={profile.emergencyNotes} onChange={(e) => updateField("emergencyNotes", e.target.value)} placeholder="Any important safety note" /></label>
      </div>

      <p className="sos-privacy-note">SOS recordings, location and emergency profile are shared only with your trusted contacts for safety purpose.</p>
      <button type="button" className="sos-save-profile" onClick={save}>Save emergency profile</button>
    </section>
  );
};

export default EmergencyProfileForm;
