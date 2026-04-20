import { getMatchScore } from './matching.js';

export const matchesAdvancedFilters = (profile, filters) => {
  if (filters.religion !== "Any" && profile.religion !== filters.religion) {
    return false;
  }

  if (filters.location !== "Any" && profile.location !== filters.location) {
    return false;
  }

  if (filters.caste !== "Any" && profile.caste !== filters.caste) {
    return false;
  }

  if (filters.education !== "Any" && profile.education !== filters.education) {
    return false;
  }

  if (filters.profession !== "Any" && profile.profession !== filters.profession) {
    return false;
  }

  if (filters.verifiedOnly && !profile.verified) {
    return false;
  }

  return true;
};

export const matchesSearch = (profile, query) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [
    profile.name,
    profile.location,
    profile.religion,
    profile.caste,
    profile.community,
    profile.education,
    profile.profession,
    profile.bio,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedQuery));
};

export const applyFilters = (profiles, { blockedProfiles, advancedFilters, searchQuery, preferences, viewerProfile }) => {
  return profiles
    .filter((profile) => !blockedProfiles.includes(profile.id))
    .filter((profile) => matchesAdvancedFilters(profile, advancedFilters))
    .filter((profile) => matchesSearch(profile, searchQuery))
    .map((profile) => ({
      ...profile,
      matchScore: getMatchScore(profile, preferences, viewerProfile),
    }))
    .sort((left, right) => right.matchScore - left.matchScore);
};