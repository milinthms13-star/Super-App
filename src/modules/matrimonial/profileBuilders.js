import { DEFAULT_PROFILE_FORM, PROFILE_ENRICHMENTS } from './constants.js';

export const buildProfileForm = (currentUser) => ({
  name: currentUser?.name || DEFAULT_PROFILE_FORM.name,
  email: currentUser?.email || DEFAULT_PROFILE_FORM.email,
  phone: currentUser?.phone || DEFAULT_PROFILE_FORM.phone,
  age: currentUser?.age || DEFAULT_PROFILE_FORM.age,
  gender: currentUser?.gender || DEFAULT_PROFILE_FORM.gender,
  religion: currentUser?.religion || DEFAULT_PROFILE_FORM.religion,
  caste: currentUser?.caste || DEFAULT_PROFILE_FORM.caste,
  community: currentUser?.community || DEFAULT_PROFILE_FORM.community,
  education: currentUser?.education || DEFAULT_PROFILE_FORM.education,
  profession: currentUser?.profession || DEFAULT_PROFILE_FORM.profession,
  location: currentUser?.location || DEFAULT_PROFILE_FORM.location,
  maritalStatus: currentUser?.maritalStatus || DEFAULT_PROFILE_FORM.maritalStatus,
  familyDetails:
    currentUser?.familyDetails ||
    "Family based in Kerala with a balanced traditional and modern outlook.",
  bio:
    currentUser?.bio ||
    "Looking for a respectful partner with shared values, emotional maturity, and family focus.",
  languages: Array.isArray(currentUser?.languages) && currentUser.languages.length > 0
    ? currentUser.languages.join(", ")
    : DEFAULT_PROFILE_FORM.languages,
  hobbies: Array.isArray(currentUser?.hobbies) && currentUser.hobbies.length > 0
    ? currentUser.hobbies.join(", ")
    : DEFAULT_PROFILE_FORM.hobbies,
  hidePhone: Boolean(currentUser?.privacy?.hidePhone),
  hidePhotos: Boolean(currentUser?.privacy?.hidePhotos),
  premiumOnlyContact: Boolean(currentUser?.premiumOnlyContact),
});

export const buildViewerProfile = (currentUser, profileDraft = {}) => ({
  name: profileDraft.name || currentUser?.name || "You",
  age: Number(profileDraft.age || currentUser?.age || DEFAULT_PROFILE_FORM.age),
  gender: profileDraft.gender || currentUser?.gender || DEFAULT_PROFILE_FORM.gender,
  religion: profileDraft.religion || currentUser?.religion || DEFAULT_PROFILE_FORM.religion,
  caste: profileDraft.caste || currentUser?.caste || DEFAULT_PROFILE_FORM.caste,
  community: profileDraft.community || currentUser?.community || DEFAULT_PROFILE_FORM.community,
  education: profileDraft.education || currentUser?.education || DEFAULT_PROFILE_FORM.education,
  profession: profileDraft.profession || currentUser?.profession || DEFAULT_PROFILE_FORM.profession,
  location: profileDraft.location || currentUser?.location || DEFAULT_PROFILE_FORM.location,
  maritalStatus:
    profileDraft.maritalStatus || currentUser?.maritalStatus || DEFAULT_PROFILE_FORM.maritalStatus,
  familyDetails:
    profileDraft.familyDetails ||
    currentUser?.familyDetails ||
    "Family based in Kerala with a balanced traditional and modern outlook.",
  bio:
    profileDraft.bio ||
    currentUser?.bio ||
    "Looking for a respectful partner with shared values, emotional maturity, and family focus.",
  email: profileDraft.email || currentUser?.email || "",
  phone: profileDraft.phone || currentUser?.phone || "",
  languages: String(profileDraft.languages || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  hobbies: String(profileDraft.hobbies || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  privacy: {
    hidePhone: Boolean(profileDraft.hidePhone ?? currentUser?.privacy?.hidePhone),
    hidePhotos: Boolean(profileDraft.hidePhotos ?? currentUser?.privacy?.hidePhotos),
  },
  premiumOnlyContact: Boolean(
    profileDraft.premiumOnlyContact ?? currentUser?.premiumOnlyContact
  ),
});

export const normalizeProfile = (profile, index) => {
  const enrichment = PROFILE_ENRICHMENTS[index % PROFILE_ENRICHMENTS.length];

  return {
    ...profile,
    id: String(profile.id || index + 1),
    gender: profile.gender || "Woman",
    community: profile.community || enrichment.community,
    education: profile.education || enrichment.education,
    familyDetails: profile.familyDetails || enrichment.familyDetails,
    maritalStatus: profile.maritalStatus || enrichment.maritalStatus,
    phone: profile.phone || enrichment.phone,
    languages: Array.isArray(profile.languages) ? profile.languages : enrichment.languages,
    hobbies: Array.isArray(profile.hobbies) ? profile.hobbies : enrichment.hobbies,
    privacy: {
      hidePhone: Boolean(profile.privacy?.hidePhone ?? enrichment.privacy.hidePhone),
      hidePhotos: Boolean(profile.privacy?.hidePhotos ?? enrichment.privacy.hidePhotos),
    },
    premiumOnlyContact: Boolean(
      profile.premiumOnlyContact ?? enrichment.premiumOnlyContact
    ),
    profileViews: Number(profile.profileViews || 40 + index * 13),
    lastActive: profile.lastActive || `${index + 1}h ago`,
    verificationStatus: profile.verified ? "Verified" : "Pending Review",
    profileStatus: profile.profileStatus || (profile.verified ? "Approved" : "Pending Review"),
  };
};