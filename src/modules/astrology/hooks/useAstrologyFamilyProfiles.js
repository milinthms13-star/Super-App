import { useState, useCallback, useEffect } from "react";
import { astrologyService } from "../../../services/astrologyService";

const createEmptyFamilyProfile = () => ({
  id: `family-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name: "",
  relation: "Family",
  sign: "aries",
  birthDate: "",
  birthTime: "",
  birthPlace: "",
  birthTimezone: "Asia/Kolkata",
  nakshatra: "",
  rashi: "",
  lagna: "",
  gender: "",
});

export const useAstrologyFamilyProfiles = ({ currentUser, profileApi }) => {
  const [familyProfiles, setFamilyProfiles] = useState([]);
  const [editingProfile, setEditingProfile] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [familyProfilesLoading, setFamilyProfilesLoading] = useState(false);
  const [familyProfilesError, setFamilyProfilesError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState("");

  // Load family profiles from parent profile API
  useEffect(() => {
    if (profileApi?.profileDraft?.familyProfiles) {
      setFamilyProfiles(profileApi.profileDraft.familyProfiles || []);
    }
  }, [profileApi?.profileDraft?.familyProfiles]);

  const handleStartAdd = useCallback(() => {
    setEditingProfile(createEmptyFamilyProfile());
    setIsAddingNew(true);
    setFamilyProfilesError("");
  }, []);

  const handleStartEdit = useCallback((profile) => {
    setEditingProfile({ ...profile });
    setIsAddingNew(false);
    setFamilyProfilesError("");
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingProfile(null);
    setIsAddingNew(false);
    setFamilyProfilesError("");
  }, []);

  const handleFieldChange = useCallback((field, value) => {
    setEditingProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const validateProfile = useCallback((profile) => {
    const errors = [];

    if (!profile.name?.trim()) {
      errors.push("Name is required");
    }

    if (!profile.relation?.trim()) {
      errors.push("Relation is required");
    }

    if (!profile.sign?.trim()) {
      errors.push("Zodiac sign is required");
    }

    return errors;
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (!editingProfile) return;

    const validationErrors = validateProfile(editingProfile);
    if (validationErrors.length > 0) {
      setFamilyProfilesError(validationErrors.join(", "));
      return;
    }

    if (!currentUser?.id) {
      setFamilyProfilesError("Please sign in to save family profiles.");
      return;
    }

    setFamilyProfilesLoading(true);
    setFamilyProfilesError("");

    try {
      let updatedProfiles;

      if (isAddingNew) {
        // Add new profile
        updatedProfiles = [...familyProfiles, editingProfile];
      } else {
        // Update existing profile
        updatedProfiles = familyProfiles.map((profile) =>
          profile.id === editingProfile.id ? editingProfile : profile
        );
      }

      // Save to backend
      const result = await astrologyService.updateProfile({
        familyProfiles: updatedProfiles,
      });

      if (result?.familyProfiles) {
        setFamilyProfiles(result.familyProfiles);
      } else {
        setFamilyProfiles(updatedProfiles);
      }

      setEditingProfile(null);
      setIsAddingNew(false);

      // Update parent profile API if available
      if (profileApi?.refreshProfile) {
        await profileApi.refreshProfile();
      }
    } catch (error) {
      setFamilyProfilesError(error.message || "Unable to save family profile.");
    } finally {
      setFamilyProfilesLoading(false);
    }
  }, [editingProfile, isAddingNew, familyProfiles, currentUser, validateProfile, profileApi]);

  const handleDeleteProfile = useCallback(async (profileId) => {
    if (!currentUser?.id) {
      setFamilyProfilesError("Please sign in to delete family profiles.");
      return;
    }

    setFamilyProfilesLoading(true);
    setFamilyProfilesError("");

    try {
      const updatedProfiles = familyProfiles.filter((profile) => profile.id !== profileId);

      // Save to backend
      const result = await astrologyService.updateProfile({
        familyProfiles: updatedProfiles,
      });

      if (result?.familyProfiles) {
        setFamilyProfiles(result.familyProfiles);
      } else {
        setFamilyProfiles(updatedProfiles);
      }

      setDeleteConfirmId("");

      // Update parent profile API if available
      if (profileApi?.refreshProfile) {
        await profileApi.refreshProfile();
      }
    } catch (error) {
      setFamilyProfilesError(error.message || "Unable to delete family profile.");
    } finally {
      setFamilyProfilesLoading(false);
    }
  }, [familyProfiles, currentUser, profileApi]);

  const handleGenerateKundliForMember = useCallback(async (profile) => {
    if (!profile.birthDate || !profile.birthTime) {
      setFamilyProfilesError("Birth date and time are required to generate Kundli.");
      return null;
    }

    setFamilyProfilesLoading(true);
    setFamilyProfilesError("");

    try {
      const kundliData = await astrologyService.getKundliData({
        name: profile.name,
        sign: profile.sign,
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        birthPlace: profile.birthPlace,
        birthTimezone: profile.birthTimezone,
        nakshatra: profile.nakshatra,
        rashi: profile.rashi,
        lagna: profile.lagna,
        gender: profile.gender,
      });

      return kundliData;
    } catch (error) {
      setFamilyProfilesError(error.message || "Unable to generate Kundli.");
      return null;
    } finally {
      setFamilyProfilesLoading(false);
    }
  }, []);

  const handleCheckCompatibility = useCallback(async (profile1, profile2) => {
    if (!profile1?.sign || !profile2?.sign) {
      setFamilyProfilesError("Both profiles must have zodiac signs to check compatibility.");
      return null;
    }

    setFamilyProfilesLoading(true);
    setFamilyProfilesError("");

    try {
      const compatibility = await astrologyService.checkCompatibility(
        profile1.sign,
        profile2.sign
      );

      return compatibility;
    } catch (error) {
      setFamilyProfilesError(error.message || "Unable to check compatibility.");
      return null;
    } finally {
      setFamilyProfilesLoading(false);
    }
  }, []);

  const handleDuplicateProfile = useCallback((profile) => {
    const duplicated = {
      ...profile,
      id: `family-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: `${profile.name} (Copy)`,
    };
    setEditingProfile(duplicated);
    setIsAddingNew(true);
  }, []);

  const clearFamilyProfilesError = useCallback(() => {
    setFamilyProfilesError("");
  }, []);

  return {
    familyProfiles,
    editingProfile,
    isAddingNew,
    familyProfilesLoading,
    familyProfilesError,
    deleteConfirmId,
    setDeleteConfirmId,
    handleStartAdd,
    handleStartEdit,
    handleCancelEdit,
    handleFieldChange,
    handleSaveProfile,
    handleDeleteProfile,
    handleGenerateKundliForMember,
    handleCheckCompatibility,
    handleDuplicateProfile,
    clearFamilyProfilesError,
  };
};
