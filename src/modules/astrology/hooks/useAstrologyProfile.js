import { useEffect, useMemo, useState } from "react";
import { astrologyService } from "../../../services/astrologyService";

const parseFavoriteTopics = (value = "") =>
  String(value || "")
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean);

export const useAstrologyProfile = ({
  currentUser,
  selectedSign,
  signs,
  setSelectedSign,
  setSaveState,
  ensureSignedIn,
  createProfileDraft,
  createFamilyProfileDraft,
  getDefaultFamilyProfile,
  getNakshatraFromSign,
  getRashiFromSign,
  getLagnaFromTime,
}) => {
  const [profile, setProfile] = useState(null);
  const [profileDraft, setProfileDraft] = useState(() => createProfileDraft());
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileNotice, setProfileNotice] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [familyProfiles, setFamilyProfiles] = useState([]);
  const [activeFamilyIndex, setActiveFamilyIndex] = useState(0);
  const [familyDraft, setFamilyDraft] = useState(() => createFamilyProfileDraft());

  const selectedProfile = useMemo(
    () => familyProfiles[activeFamilyIndex] || familyProfiles[0] || {},
    [activeFamilyIndex, familyProfiles]
  );

  const recentSavedReadings = useMemo(
    () =>
      [...(profile?.savedReadings || [])]
        .sort((left, right) => new Date(right.readingDate) - new Date(left.readingDate))
        .slice(0, 4),
    [profile?.savedReadings]
  );

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setProfileLoading(true);

      try {
        const nextProfile = await astrologyService.getProfile();
        if (!active) {
          return;
        }

        setProfile(nextProfile);
        setProfileDraft(createProfileDraft(nextProfile));
        setProfileNotice("");

        const initialFamily =
          Array.isArray(nextProfile?.familyProfiles) && nextProfile.familyProfiles.length
            ? nextProfile.familyProfiles.map((item) => ({
                ...item,
                nakshatra: item.nakshatra || getNakshatraFromSign(item.sign),
                rashi: item.rashi || getRashiFromSign(item.sign),
                lagna: item.lagna || getLagnaFromTime(item.birthTime),
              }))
            : [getDefaultFamilyProfile(nextProfile, currentUser?.name)];

        setFamilyProfiles(initialFamily);
        setActiveFamilyIndex(0);
        setFamilyDraft(createFamilyProfileDraft(initialFamily[0]));

        if (nextProfile?.sign) {
          setSelectedSign(nextProfile.sign);
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        setProfile(null);
        setProfileDraft(createProfileDraft());
        const defaultProfiles = [getDefaultFamilyProfile(null, currentUser?.name)];
        setFamilyProfiles(defaultProfiles);
        setActiveFamilyIndex(0);
        setFamilyDraft(createFamilyProfileDraft(defaultProfiles[0]));
        setProfileNotice(loadError.message || "Unable to load your astrology profile.");
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [
    createFamilyProfileDraft,
    createProfileDraft,
    currentUser?.name,
    getDefaultFamilyProfile,
    getLagnaFromTime,
    getNakshatraFromSign,
    getRashiFromSign,
    setSelectedSign,
  ]);

  const handleDraftChange = (field, value) => {
    setProfileDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
    setSaveState({ type: "", message: "" });
  };

  const handleNotificationDraftChange = (field, value) => {
    setProfileDraft((currentDraft) => ({
      ...currentDraft,
      notifications: {
        ...currentDraft.notifications,
        [field]: value,
      },
    }));
    setSaveState({ type: "", message: "" });
  };

  const handleFamilyDraftChange = (field, value) => {
    setFamilyDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    if (!ensureSignedIn()) {
      return;
    }

    setSavingProfile(true);
    setSaveState({ type: "", message: "" });

    try {
      const updatedProfile = await astrologyService.updateProfile({
        sign: selectedSign || signs[0]?.sign || "aries",
        birthDate: profileDraft.birthDate,
        birthTime: profileDraft.birthTime,
        birthPlace: profileDraft.birthPlace,
        birthTimezone: profileDraft.birthTimezone,
        nakshatra: profileDraft.nakshatra,
        rashi: profileDraft.rashi,
        lagna: profileDraft.lagna,
        gender: profileDraft.gender,
        preferences: {
          receiveDailyHoroscope: profileDraft.receiveDailyHoroscope,
          favoriteTopics: parseFavoriteTopics(profileDraft.favoriteTopics),
        },
        notifications: profileDraft.notifications,
        familyProfiles,
      });

      setProfile(updatedProfile);
      setProfileDraft(createProfileDraft(updatedProfile));
      setSelectedSign(updatedProfile.sign || selectedSign);
      setProfileNotice("");
      setSaveState({
        type: "success",
        message:
          "Your astrology profile was saved, and today's reading is now stored in your recent history.",
      });
    } catch (saveError) {
      setSaveState({
        type: "error",
        message: saveError.message || "Unable to save your astrology profile.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleNewFamilyProfile = () => {
    setFamilyDraft(createFamilyProfileDraft());
    setActiveFamilyIndex(familyProfiles.length);
  };

  const selectFamilyProfile = (index) => {
    setActiveFamilyIndex(index);
    setFamilyDraft(createFamilyProfileDraft(familyProfiles[index]));
  };

  const handleFamilyProfileSave = async () => {
    const updatedProfileItem = {
      id: familyDraft.id || `profile-${Date.now()}`,
      name: familyDraft.name || "Family Member",
      relation: familyDraft.relation || "Relative",
      sign: familyDraft.sign || "aries",
      birthDate: familyDraft.birthDate,
      birthTime: familyDraft.birthTime,
      birthPlace: familyDraft.birthPlace,
      birthTimezone: familyDraft.birthTimezone || "Asia/Kolkata",
      nakshatra: getNakshatraFromSign(familyDraft.sign),
      rashi: getRashiFromSign(familyDraft.sign),
      lagna: getLagnaFromTime(familyDraft.birthTime),
    };

    const nextProfiles = [...familyProfiles];
    if (activeFamilyIndex >= 0 && activeFamilyIndex < nextProfiles.length) {
      nextProfiles[activeFamilyIndex] = updatedProfileItem;
    } else {
      nextProfiles.push(updatedProfileItem);
    }

    setFamilyProfiles(nextProfiles);
    setActiveFamilyIndex(nextProfiles.findIndex((item) => item.id === updatedProfileItem.id));
    setFamilyDraft(createFamilyProfileDraft(updatedProfileItem));

    try {
      const updatedProfile = await astrologyService.updateProfile({
        ...profile,
        familyProfiles: nextProfiles,
      });
      setProfile(updatedProfile);
      setProfileNotice("");
      setSaveState({
        type: "success",
        message: "Family profile saved successfully.",
      });
    } catch (saveError) {
      setSaveState({
        type: "error",
        message: saveError.message || "Unable to save family profile.",
      });
    }
  };

  return {
    profileDraft,
    profileLoading,
    profileNotice,
    savingProfile,
    familyProfiles,
    activeFamilyIndex,
    familyDraft,
    recentSavedReadings,
    selectedProfile,
    handleDraftChange,
    handleNotificationDraftChange,
    handleFamilyDraftChange,
    handleProfileSave,
    handleNewFamilyProfile,
    selectFamilyProfile,
    handleFamilyProfileSave,
  };
};
