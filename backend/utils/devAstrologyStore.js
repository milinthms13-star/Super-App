const profilesByUserId = new Map();

const cloneValue = (value) => JSON.parse(JSON.stringify(value));

const findProfile = async (userId) => {
  const profile = profilesByUserId.get(String(userId)) || null;
  return profile ? cloneValue(profile) : null;
};

const saveProfile = async (profile = {}) => {
  const userId = String(profile.userId || '');
  const existingProfile = profilesByUserId.get(userId) || null;
  const nextProfile = {
    ...(existingProfile ? cloneValue(existingProfile) : {}),
    ...cloneValue(profile),
    userId,
    createdAt: existingProfile?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  profilesByUserId.set(userId, nextProfile);
  return cloneValue(nextProfile);
};

const resetStore = async () => {
  profilesByUserId.clear();
};

module.exports = {
  findProfile,
  saveProfile,
  resetStore,
};
