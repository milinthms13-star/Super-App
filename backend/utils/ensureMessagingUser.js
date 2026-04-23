const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const sanitizeUsername = (value = '') => {
  const cleaned = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');

  if (!cleaned) {
    return '';
  }

  if (cleaned.length >= 3) {
    return cleaned.slice(0, 20);
  }

  return `${cleaned}${'user'.slice(0, 3 - cleaned.length)}`.slice(0, 20);
};

const buildUsernameBase = (user = {}) => {
  const candidates = [
    user.username,
    user.chatUsername,
    user.name,
    String(user.email || '').split('@')[0],
  ];

  for (const candidate of candidates) {
    const normalized = sanitizeUsername(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return `user${crypto.randomBytes(2).toString('hex')}`.slice(0, 20);
};

const buildUniqueUsername = async (user = {}, excludeUserId = null) => {
  const base = buildUsernameBase(user);
  let candidate = base;
  let attempt = 0;

  while (true) {
    const query = { username: candidate };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    const existingUser = await User.findOne(query).select('_id');
    if (!existingUser) {
      return candidate;
    }

    attempt += 1;
    const suffix = attempt === 1
      ? crypto.randomBytes(2).toString('hex')
      : crypto.randomBytes(3).toString('hex');
    const maxBaseLength = Math.max(3, 20 - suffix.length);
    candidate = `${base.slice(0, maxBaseLength)}${suffix}`.slice(0, 20);
  }
};

const ensureMessagingUser = async (authUser = null) => {
  if (!authUser) {
    return null;
  }

  if (isObjectId(authUser._id)) {
    return authUser;
  }

  if (mongoose.connection.readyState !== 1) {
    return authUser;
  }

  const email = String(authUser.email || '').trim().toLowerCase();
  if (!email) {
    return authUser;
  }

  let user = await User.findOne({ email });

  if (!user) {
    const username = await buildUniqueUsername(authUser);
    user = await User.create({
      email,
      username,
      chatUsername: authUser.chatUsername || undefined,
      name: authUser.name || email.split('@')[0],
      avatar: authUser.avatar || 'User',
      phone: authUser.phone || '',
      registrationType: authUser.registrationType || 'user',
      role: authUser.role || 'user',
      roles:
        Array.isArray(authUser.roles) && authUser.roles.length > 0
          ? authUser.roles
          : [authUser.role || 'user'],
      visibility: authUser.visibility || undefined,
      contactMeans: authUser.contactMeans || undefined,
      premiumOnlyContact: Boolean(authUser.premiumOnlyContact),
      preferences: authUser.preferences || undefined,
    });
  } else {
    const updates = {};

    if (!user.username) {
      updates.username = await buildUniqueUsername(authUser, user._id);
    }

    if (!user.chatUsername && authUser.chatUsername) {
      updates.chatUsername = authUser.chatUsername;
    }

    if ((!user.name || user.name === email.split('@')[0]) && authUser.name) {
      updates.name = authUser.name;
    }

    if ((!user.avatar || user.avatar === 'User') && authUser.avatar) {
      updates.avatar = authUser.avatar;
    }

    if (!user.phone && authUser.phone) {
      updates.phone = authUser.phone;
    }

    if (Object.keys(updates).length > 0) {
      user = await User.findByIdAndUpdate(user._id, { $set: updates }, { new: true });
    }
  }

  user.memoryAuthId = authUser._id;
  return user;
};

module.exports = {
  ensureMessagingUser,
};
