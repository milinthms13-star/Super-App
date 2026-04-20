const crypto = require('crypto');

const usersByEmail = new Map();
const usersById = new Map();
const otpTokensByEmail = new Map();

const createId = () => crypto.randomUUID();

const DEFAULT_USER_FIELDS = {
  avatar: 'User',
  phone: '',
  location: '',
  businessName: '',
  registrationType: 'user',
  role: 'user',
  roles: ['user'],
  selectedBusinessCategories: [],
  selectedCategoryDetails: [],
  cart: [],
  favorites: [],
  savedAddresses: [],
  preferences: {
    language: 'en',
    soulmatchOnboardingSeen: false,
  },
};

const upsertUserByEmail = async (email) => {
  const existing = usersByEmail.get(email);
  if (existing) {
    return existing;
  }

  const user = {
    _id: createId(),
    email,
    name: email.split('@')[0],
    ...DEFAULT_USER_FIELDS,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  usersByEmail.set(email, user);
  usersById.set(user._id, user);
  return user;
};

const findUserByEmail = async (email) => {
  return usersByEmail.get(email) || null;
};

const findUserById = async (id) => {
  return usersById.get(id) || null;
};

const updateUserByEmail = async (email, updates = {}) => {
  const existing = await upsertUserByEmail(email);
  const nextUser = {
    ...existing,
    ...updates,
    preferences: {
      ...(existing.preferences || DEFAULT_USER_FIELDS.preferences),
      ...(updates.preferences || {}),
    },
    updatedAt: new Date(),
  };

  usersByEmail.set(email, nextUser);
  usersById.set(nextUser._id, nextUser);
  return nextUser;
};

const updateUserById = async (id, updates = {}) => {
  const existing = await findUserById(id);
  if (!existing) {
    return null;
  }

  return updateUserByEmail(existing.email, updates);
};

const invalidateOtpsByEmail = async (email) => {
  const tokens = otpTokensByEmail.get(email) || [];
  tokens.forEach((token) => {
    token.used = true;
  });
};

const createOtpToken = async ({ email, otpHash, expiresAt }) => {
  const token = {
    _id: createId(),
    email,
    otpHash,
    expiresAt,
    used: false,
    createdAt: new Date(),
    save: async () => token,
  };

  const tokens = otpTokensByEmail.get(email) || [];
  tokens.push(token);
  otpTokensByEmail.set(email, tokens);
  return token;
};

const findLatestValidOtp = async (email) => {
  const now = new Date();
  const tokens = otpTokensByEmail.get(email) || [];

  return tokens
    .filter((token) => !token.used && token.expiresAt > now)
    .sort((a, b) => b.createdAt - a.createdAt)[0] || null;
};

module.exports = {
  upsertUserByEmail,
  findUserByEmail,
  findUserById,
  updateUserByEmail,
  updateUserById,
  invalidateOtpsByEmail,
  createOtpToken,
  findLatestValidOtp,
};
