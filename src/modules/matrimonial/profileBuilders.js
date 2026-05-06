import { DEFAULT_PROFILE_FORM, PROFILE_ENRICHMENTS } from "./constants.js";

const resolvePrivacy = (source = {}, fallback = {}) => ({
  hidePhone: Boolean(source.hidePhone ?? source.privacy?.hidePhone ?? fallback.hidePhone),
  hidePhotos: Boolean(source.hidePhotos ?? source.privacy?.hidePhotos ?? fallback.hidePhotos),
  premiumOnlyContact: Boolean(
    source.premiumOnlyContact ??
      source.privacy?.premiumOnlyContact ??
      fallback.premiumOnlyContact
  ),
});

export const formatRelativeActive = (value) => {
  if (!value) {
    return "Recently active";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const diffMs = Math.max(0, Date.now() - date.getTime());
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString("en-IN");
};

export const buildProfileForm = (profileSource) => {
  const privacy = resolvePrivacy(profileSource, {
    hidePhone: DEFAULT_PROFILE_FORM.hidePhone,
    hidePhotos: DEFAULT_PROFILE_FORM.hidePhotos,
    premiumOnlyContact: DEFAULT_PROFILE_FORM.premiumOnlyContact,
  });

  return {
    name: profileSource?.name || DEFAULT_PROFILE_FORM.name,
    email: profileSource?.email || DEFAULT_PROFILE_FORM.email,
    phone: profileSource?.phone || DEFAULT_PROFILE_FORM.phone,
    age: profileSource?.age || DEFAULT_PROFILE_FORM.age,
    gender: profileSource?.gender || DEFAULT_PROFILE_FORM.gender,
    religion: profileSource?.religion || DEFAULT_PROFILE_FORM.religion,
    caste: profileSource?.caste || DEFAULT_PROFILE_FORM.caste,
    community: profileSource?.community || DEFAULT_PROFILE_FORM.community,
    education: profileSource?.education || DEFAULT_PROFILE_FORM.education,
    profession: profileSource?.profession || DEFAULT_PROFILE_FORM.profession,
    location: profileSource?.location || DEFAULT_PROFILE_FORM.location,
    maritalStatus: profileSource?.maritalStatus || DEFAULT_PROFILE_FORM.maritalStatus,
    familyDetails:
      profileSource?.familyDetails ||
      "Family based in Kerala with a balanced traditional and modern outlook.",
    bio:
      profileSource?.bio ||
      "Looking for a respectful partner with shared values, emotional maturity, and family focus.",
    languages:
      Array.isArray(profileSource?.languages) && profileSource.languages.length > 0
        ? profileSource.languages.join(", ")
        : DEFAULT_PROFILE_FORM.languages,
    hobbies:
      Array.isArray(profileSource?.hobbies) && profileSource.hobbies.length > 0
        ? profileSource.hobbies.join(", ")
        : DEFAULT_PROFILE_FORM.hobbies,
    hidePhone: privacy.hidePhone,
    hidePhotos: privacy.hidePhotos,
    premiumOnlyContact: privacy.premiumOnlyContact,
  };
};

export const buildViewerProfile = (currentUser, profileDraft = {}) => {
  const privacy = resolvePrivacy(profileDraft, resolvePrivacy(currentUser));

  return {
    name: profileDraft.name || currentUser?.name || "You",
    age: Number(profileDraft.age || currentUser?.age || DEFAULT_PROFILE_FORM.age),
    gender: profileDraft.gender || currentUser?.gender || DEFAULT_PROFILE_FORM.gender,
    religion: profileDraft.religion || currentUser?.religion || DEFAULT_PROFILE_FORM.religion,
    caste: profileDraft.caste || currentUser?.caste || DEFAULT_PROFILE_FORM.caste,
    community: profileDraft.community || currentUser?.community || DEFAULT_PROFILE_FORM.community,
    education:
      profileDraft.education || currentUser?.education || DEFAULT_PROFILE_FORM.education,
    profession:
      profileDraft.profession || currentUser?.profession || DEFAULT_PROFILE_FORM.profession,
    location: profileDraft.location || currentUser?.location || DEFAULT_PROFILE_FORM.location,
    maritalStatus:
      profileDraft.maritalStatus ||
      currentUser?.maritalStatus ||
      DEFAULT_PROFILE_FORM.maritalStatus,
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
    languages: String(profileDraft.languages || currentUser?.languages || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    hobbies: String(profileDraft.hobbies || currentUser?.hobbies || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    privacy: {
      hidePhone: privacy.hidePhone,
      hidePhotos: privacy.hidePhotos,
      premiumOnlyContact: privacy.premiumOnlyContact,
    },
    premiumOnlyContact: privacy.premiumOnlyContact,
  };
};

export const normalizeProfile = (profile, index = 0) => {
  const enrichment = PROFILE_ENRICHMENTS[index % PROFILE_ENRICHMENTS.length];
  const privacy = resolvePrivacy(profile, enrichment.privacy);
  const verified = Boolean(
    profile?.verified ?? String(profile?.verificationStatus || "").toLowerCase() === "verified"
  );

  return {
    ...profile,
    id: String(profile?.id || profile?._id || index + 1),
    image:
      profile?.image ||
      String(profile?.name || enrichment.community || "?").trim().charAt(0).toUpperCase() ||
      "?",
    gender: profile?.gender || "Woman",
    community: profile?.community || enrichment.community,
    education: profile?.education || enrichment.education,
    familyDetails: profile?.familyDetails || enrichment.familyDetails,
    maritalStatus: profile?.maritalStatus || enrichment.maritalStatus,
    phone: profile?.phone || "",
    languages: Array.isArray(profile?.languages) ? profile.languages : enrichment.languages,
    hobbies: Array.isArray(profile?.hobbies) ? profile.hobbies : enrichment.hobbies,
    privacy,
    premiumOnlyContact: privacy.premiumOnlyContact,
    profileViews: Number(profile?.profileViews || 40 + index * 13),
    lastActive: profile?.lastActive || null,
    lastActiveLabel: profile?.lastActiveLabel || formatRelativeActive(profile?.lastActive),
    verified,
    verificationStatus: profile?.verificationStatus || (verified ? "verified" : "pending"),
    profileStatus: profile?.profileStatus || (verified ? "approved" : "pending_review"),
    contactVisibility: profile?.contactVisibility || "unavailable",
  };
};
