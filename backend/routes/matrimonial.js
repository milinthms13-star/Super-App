const fs = require('fs');
const path = require('path');

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');

const MatrimonialProfile = require('../models/MatrimonialProfile');
const User = require('../models/User');
const { uploadToS3 } = require('../config/s3');
const { authenticate } = require('../middleware/auth');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');
const subscriptionService = require('../utils/subscriptionService');
const logger = require('../utils/logger');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!String(file.mimetype || '').startsWith('image/')) {
      callback(new Error('Only image uploads are allowed'));
      return;
    }

    callback(null, true);
  },
});

const profileUpdateLimiter = createModerateRateLimiter({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
});
const searchLimiter = createModerateRateLimiter({
  maxRequests: 30,
  windowMs: 15 * 60 * 1000,
});
const interestLimiter = createModerateRateLimiter({
  maxRequests: 20,
  windowMs: 24 * 60 * 60 * 1000,
});
const messageLimiter = createModerateRateLimiter({
  maxRequests: 120,
  windowMs: 24 * 60 * 60 * 1000,
});
const reportLimiter = createModerateRateLimiter({
  maxRequests: 30,
  windowMs: 24 * 60 * 60 * 1000,
});
const blockLimiter = createModerateRateLimiter({
  maxRequests: 50,
  windowMs: 24 * 60 * 60 * 1000,
});

const DEFAULT_PROFILE_VALUES = {
  familyDetails:
    'Family based in Kerala with a balanced traditional and modern outlook.',
  bio: 'Looking for a respectful partner with shared values, emotional maturity, and family focus.',
};

router.use(authenticate);

const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }

  return digits;
};

const normalizeText = (value, fallback = '') =>
  String(value == null ? fallback : value)
    .replace(/<[^>]*>/g, '')
    .trim();

const parseBoolean = (value, fallback = false) => {
  if (value === true || value === false) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return fallback;
};

const parseNumber = (value, fallback = null) => {
  if (value === '' || value == null) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseList = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeText(entry)).filter(Boolean);
  }

  return String(value || '')
    .split(',')
    .map((entry) => normalizeText(entry))
    .filter(Boolean);
};

const parseObject = (value) => {
  if (!value) {
    return {};
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
};

const isAdminUser = (user) =>
  user?.role === 'admin' ||
  user?.registrationType === 'admin' ||
  (Array.isArray(user?.roles) && user.roles.includes('admin'));

const ensureAdmin = (req, res, next) => {
  if (!isAdminUser(req.user)) {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
    return;
  }

  next();
};

const isPremiumMember = (profile) =>
  Boolean(profile?.premiumUntil && new Date(profile.premiumUntil) > new Date());

const formatRelativeTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Recently active';
  }

  const diffMs = Math.max(0, Date.now() - date.getTime());
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return 'Just now';
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

  return date.toLocaleDateString('en-IN');
};

const serializeOwnProfile = (profile) => {
  if (!profile) {
    return null;
  }

  return {
    id: String(profile._id),
    userId: String(profile.userId),
    name: profile.name,
    email: profile.email || '',
    phone: profile.phone || '',
    photoUrl: profile.photoUrl || '',
    age: profile.age,
    gender: profile.gender,
    religion: profile.religion || '',
    caste: profile.caste || '',
    community: profile.community || '',
    education: profile.education || '',
    profession: profile.profession || '',
    location: profile.location || '',
    maritalStatus: profile.maritalStatus || '',
    familyDetails: profile.familyDetails || '',
    bio: profile.bio || '',
    languages: Array.isArray(profile.languages) ? profile.languages : [],
    hobbies: Array.isArray(profile.hobbies) ? profile.hobbies : [],
    preferences: profile.preferences || {},
    privacy: {
      hidePhone: Boolean(profile.privacy?.hidePhone),
      hidePhotos: Boolean(profile.privacy?.hidePhotos),
      premiumOnlyContact: Boolean(profile.privacy?.premiumOnlyContact),
    },
    premiumOnlyContact: Boolean(profile.privacy?.premiumOnlyContact),
    profileViews: Number(profile.profileViews || 0),
    interestsSent: Number(profile.interestsSent || 0),
    interestsReceived: Number(profile.interestsReceived || 0),
    verified: profile.verificationStatus === 'verified',
    verificationStatus: profile.verificationStatus || 'pending',
    profileStatus: profile.profileStatus || 'pending_review',
    lastActive: profile.lastActive || null,
    lastActiveLabel: formatRelativeTime(profile.lastActive),
    premiumUntil: profile.premiumUntil || null,
  };
};

const serializePublicProfile = (profile, viewerProfile) => {
  if (!profile) {
    return null;
  }

  const premiumRequired =
    Boolean(profile.privacy?.premiumOnlyContact) && !isPremiumMember(viewerProfile);
  const hiddenByPrivacy = Boolean(profile.privacy?.hidePhone);
  const phoneVisible = !premiumRequired && !hiddenByPrivacy && Boolean(profile.phone);

  let contactVisibility = 'unavailable';
  if (premiumRequired) {
    contactVisibility = 'premium_required';
  } else if (hiddenByPrivacy) {
    contactVisibility = 'hidden';
  } else if (phoneVisible) {
    contactVisibility = 'visible';
  }

  return {
    id: String(profile._id),
    name: profile.name,
    age: profile.age,
    gender: profile.gender,
    religion: profile.religion || '',
    caste: profile.caste || '',
    community: profile.community || '',
    education: profile.education || '',
    profession: profile.profession || '',
    location: profile.location || '',
    maritalStatus: profile.maritalStatus || '',
    familyDetails: profile.familyDetails || '',
    bio: profile.bio || '',
    languages: Array.isArray(profile.languages) ? profile.languages : [],
    hobbies: Array.isArray(profile.hobbies) ? profile.hobbies : [],
    image: String(profile.name || '?').trim().charAt(0).toUpperCase() || '?',
    photoUrl:
      profile.privacy?.hidePhotos && !isPremiumMember(viewerProfile)
        ? ''
        : profile.photoUrl || '',
    phone: phoneVisible ? profile.phone : '',
    contactVisibility,
    privacy: {
      hidePhone: Boolean(profile.privacy?.hidePhone),
      hidePhotos: Boolean(profile.privacy?.hidePhotos),
      premiumOnlyContact: Boolean(profile.privacy?.premiumOnlyContact),
    },
    premiumOnlyContact: Boolean(profile.privacy?.premiumOnlyContact),
    verified: profile.verificationStatus === 'verified',
    verificationStatus: profile.verificationStatus || 'pending',
    profileStatus: profile.profileStatus || 'pending_review',
    profileViews: Number(profile.profileViews || 0),
    lastActive: profile.lastActive || null,
    lastActiveLabel: formatRelativeTime(profile.lastActive),
  };
};

const buildMergedUserResponse = (currentUser, profileUpdates) => {
  const currentPreferences =
    currentUser?.preferences && typeof currentUser.preferences === 'object'
      ? currentUser.preferences
      : {};

  return {
    id: currentUser?._id,
    email: profileUpdates.email || currentUser?.email || '',
    name: profileUpdates.name || currentUser?.name || '',
    phone: profileUpdates.phone || currentUser?.phone || '',
    age: profileUpdates.age ?? currentUser?.age ?? null,
    gender: profileUpdates.gender || currentUser?.gender || '',
    religion: profileUpdates.religion || currentUser?.religion || '',
    caste: profileUpdates.caste || currentUser?.caste || '',
    community: profileUpdates.community || currentUser?.community || '',
    education: profileUpdates.education || currentUser?.education || '',
    profession: profileUpdates.profession || currentUser?.profession || '',
    location: profileUpdates.location || currentUser?.location || '',
    maritalStatus: profileUpdates.maritalStatus || currentUser?.maritalStatus || '',
    familyDetails: profileUpdates.familyDetails || currentUser?.familyDetails || '',
    bio: profileUpdates.bio || currentUser?.bio || '',
    languages: profileUpdates.languages || currentUser?.languages || [],
    hobbies: profileUpdates.hobbies || currentUser?.hobbies || [],
    preferences: {
      ...currentPreferences,
      ...(profileUpdates.preferences || {}),
    },
    privacy: {
      hidePhone: Boolean(profileUpdates.privacy?.hidePhone),
      hidePhotos: Boolean(profileUpdates.privacy?.hidePhotos),
    },
    premiumOnlyContact: Boolean(profileUpdates.privacy?.premiumOnlyContact),
    role: currentUser?.role || 'user',
    registrationType: currentUser?.registrationType || 'user',
    roles: Array.isArray(currentUser?.roles)
      ? currentUser.roles
      : [currentUser?.role || currentUser?.registrationType || 'user'],
  };
};

const validateProfileUpdate = (data) => {
  const errors = [];

  if (!normalizeText(data.name)) {
    errors.push('Name required');
  }

  const age = Number(data.age);
  if (!Number.isFinite(age) || age < 18 || age > 100) {
    errors.push('Valid age 18-100 required');
  }

  if (!normalizeText(data.bio)) {
    errors.push('Bio required');
  }

  if (!normalizeText(data.familyDetails)) {
    errors.push('Family details required');
  }

  if (!normalizeText(data.gender)) {
    errors.push('Gender required');
  }

  if (!normalizeText(data.maritalStatus)) {
    errors.push('Marital status required');
  }

  const phone = normalizePhone(data.phone);
  if (phone && phone.length !== 10) {
    errors.push('Phone must be 10 digits');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const buildProfilePayload = (user, rawBody, existingProfile, photoUrl) => {
  const preferencesInput = parseObject(rawBody.preferences);
  const currentPreferences =
    existingProfile?.preferences && typeof existingProfile.preferences === 'object'
      ? existingProfile.preferences
      : {};

  const privacyInput = {
    hidePhone: parseBoolean(
      rawBody.hidePhone ?? rawBody['privacy.hidePhone'],
      existingProfile?.privacy?.hidePhone || false
    ),
    hidePhotos: parseBoolean(
      rawBody.hidePhotos ?? rawBody['privacy.hidePhotos'],
      existingProfile?.privacy?.hidePhotos || false
    ),
    premiumOnlyContact: parseBoolean(
      rawBody.premiumOnlyContact ?? rawBody['privacy.premiumOnlyContact'],
      existingProfile?.privacy?.premiumOnlyContact || false
    ),
  };

  const nextAge = parseNumber(rawBody.age, existingProfile?.age ?? user?.age ?? 29);

  const payload = {
    userId: user._id,
    name: normalizeText(rawBody.name, existingProfile?.name || user?.name || ''),
    email: normalizeText(rawBody.email, existingProfile?.email || user?.email || '').toLowerCase(),
    phone: normalizePhone(rawBody.phone || existingProfile?.phone || user?.phone || ''),
    photoUrl: photoUrl || existingProfile?.photoUrl || '',
    age: nextAge,
    gender: normalizeText(rawBody.gender, existingProfile?.gender || user?.gender || 'Man'),
    religion: normalizeText(rawBody.religion, existingProfile?.religion || user?.religion || ''),
    caste: normalizeText(rawBody.caste, existingProfile?.caste || user?.caste || ''),
    community: normalizeText(
      rawBody.community,
      existingProfile?.community || user?.community || ''
    ),
    education: normalizeText(
      rawBody.education,
      existingProfile?.education || user?.education || ''
    ),
    profession: normalizeText(
      rawBody.profession,
      existingProfile?.profession || user?.profession || ''
    ),
    location: normalizeText(rawBody.location, existingProfile?.location || user?.location || ''),
    maritalStatus: normalizeText(
      rawBody.maritalStatus,
      existingProfile?.maritalStatus || user?.maritalStatus || 'Never Married'
    ),
    familyDetails: normalizeText(
      rawBody.familyDetails,
      existingProfile?.familyDetails || user?.familyDetails || DEFAULT_PROFILE_VALUES.familyDetails
    ),
    bio: normalizeText(rawBody.bio, existingProfile?.bio || user?.bio || DEFAULT_PROFILE_VALUES.bio),
    languages: parseList(rawBody.languages || existingProfile?.languages || user?.languages),
    hobbies: parseList(rawBody.hobbies || existingProfile?.hobbies || user?.hobbies),
    preferences: {
      ...currentPreferences,
      ageMin: parseNumber(
        preferencesInput.ageMin,
        currentPreferences.ageMin == null ? undefined : currentPreferences.ageMin
      ),
      ageMax: parseNumber(
        preferencesInput.ageMax,
        currentPreferences.ageMax == null ? undefined : currentPreferences.ageMax
      ),
      religion: normalizeText(
        preferencesInput.religion,
        currentPreferences.religion || 'Any'
      ),
      caste: normalizeText(preferencesInput.caste, currentPreferences.caste || 'Any'),
      location: normalizeText(
        preferencesInput.location,
        currentPreferences.location || 'Any'
      ),
      education: normalizeText(
        preferencesInput.education,
        currentPreferences.education || 'Any'
      ),
      profession: normalizeText(
        preferencesInput.profession,
        currentPreferences.profession || 'Any'
      ),
    },
    privacy: privacyInput,
    lastActive: new Date(),
  };

  const changedProfileFields = [
    'name',
    'age',
    'gender',
    'religion',
    'caste',
    'community',
    'education',
    'profession',
    'location',
    'maritalStatus',
    'familyDetails',
    'bio',
    'phone',
    'email',
  ].some((field) => {
    if (!existingProfile) {
      return true;
    }

    return JSON.stringify(existingProfile[field]) !== JSON.stringify(payload[field]);
  });

  if (!existingProfile) {
    payload.profileStatus = 'pending_review';
    payload.verificationStatus = 'pending';
  } else if (changedProfileFields || photoUrl !== existingProfile.photoUrl) {
    payload.profileStatus =
      existingProfile.verificationStatus === 'verified' ? 'changes_requested' : 'pending_review';
    payload.verificationStatus =
      existingProfile.verificationStatus === 'verified'
        ? 'pending'
        : existingProfile.verificationStatus || 'pending';
  }

  return payload;
};

const syncUserMirror = async (userId, payload) => {
  const userUpdates = {
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    age: payload.age,
    gender: payload.gender,
    religion: payload.religion,
    caste: payload.caste,
    community: payload.community,
    education: payload.education,
    profession: payload.profession,
    location: payload.location,
    maritalStatus: payload.maritalStatus,
    familyDetails: payload.familyDetails,
    bio: payload.bio,
    languages: payload.languages,
    hobbies: payload.hobbies,
    preferences: payload.preferences,
    privacy: {
      hidePhone: Boolean(payload.privacy?.hidePhone),
      hidePhotos: Boolean(payload.privacy?.hidePhotos),
    },
    premiumOnlyContact: Boolean(payload.privacy?.premiumOnlyContact),
  };

  if (typeof User.findByIdAndUpdate === 'function') {
    try {
      await User.findByIdAndUpdate(userId, userUpdates, {
        new: true,
        runValidators: true,
      });
    } catch (error) {
      logger.warn('Unable to sync mirrored user profile:', error.message);
    }
  }

  return userUpdates;
};

const storeUploadedPhoto = async (userId, file) => {
  if (!file?.buffer?.length) {
    return '';
  }

  const safeFileName = String(file.originalname || 'profile-photo')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .toLowerCase();

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    const key = await uploadToS3(
      file.buffer,
      `matrimonial-${userId}-${Date.now()}-${safeFileName}`,
      file.mimetype
    );
    return key;
  }

  const uploadDirectory = path.join(__dirname, '..', 'uploads', 'matrimonial');
  fs.mkdirSync(uploadDirectory, { recursive: true });
  const fileName = `${userId}-${Date.now()}-${safeFileName}`;
  const absolutePath = path.join(uploadDirectory, fileName);
  fs.writeFileSync(absolutePath, file.buffer);
  return `/uploads/matrimonial/${fileName}`;
};

const loadCurrentProfile = async (userId) =>
  MatrimonialProfile.findOne({ userId }).populate('blockedBy', '_id');

const isConnectedForMessaging = async (currentProfileId, otherProfileId) => {
  const incoming = await MatrimonialProfile.exists({
    _id: currentProfileId,
    interests: {
      $elemMatch: {
        fromProfileId: otherProfileId,
        toProfileId: currentProfileId,
        status: 'accepted',
      },
    },
  });

  if (incoming) {
    return true;
  }

  const outgoing = await MatrimonialProfile.exists({
    _id: otherProfileId,
    interests: {
      $elemMatch: {
        fromProfileId: currentProfileId,
        toProfileId: otherProfileId,
        status: 'accepted',
      },
    },
  });

  return Boolean(outgoing);
};

const buildInterestSummary = (interest, fromProfile, toProfile, viewerProfile) => ({
  id: interest.id,
  status: interest.status,
  message: interest.message || '',
  createdAt: interest.createdAt,
  respondedAt: interest.respondedAt || null,
  fromProfileId: String(fromProfile?._id || interest.fromProfileId),
  toProfileId: String(toProfile?._id || interest.toProfileId),
  fromProfile: serializePublicProfile(fromProfile, viewerProfile),
  toProfile: serializePublicProfile(toProfile, viewerProfile),
});

const buildThreadMap = (profile, acceptedProfiles) => {
  const threads = new Map();

  acceptedProfiles.forEach((acceptedProfile) => {
    threads.set(String(acceptedProfile._id), {
      id: String(acceptedProfile._id),
      profile: null,
      unreadCount: 0,
      messages: [],
      lastMessage: null,
    });
  });

  (profile.messages || []).forEach((message) => {
    const fromId = String(message.fromProfileId);
    const toId = String(message.toProfileId);
    const currentId = String(profile._id);
    const otherPartyId = fromId === currentId ? toId : fromId;
    const currentThread =
      threads.get(otherPartyId) ||
      {
        id: otherPartyId,
        profile: null,
        unreadCount: 0,
        messages: [],
        lastMessage: null,
      };

    currentThread.messages.push({
      id: message.id,
      fromProfileId: fromId,
      toProfileId: toId,
      content: message.content,
      isRead: Boolean(message.isRead),
      createdAt: message.createdAt,
    });

    if (toId === currentId && !message.isRead) {
      currentThread.unreadCount += 1;
    }

    if (
      !currentThread.lastMessage ||
      new Date(message.createdAt).getTime() > new Date(currentThread.lastMessage.createdAt).getTime()
    ) {
      currentThread.lastMessage = {
        content: message.content,
        createdAt: message.createdAt,
      };
    }

    threads.set(otherPartyId, currentThread);
  });

  return threads;
};

router.get('/profile', async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    res.json({
      success: true,
      data: serializeOwnProfile(profile),
    });
  } catch (error) {
    logger.error('Get matrimonial profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/profile', profileUpdateLimiter, upload.single('photo'), async (req, res) => {
  try {
    const existingProfile = await MatrimonialProfile.findOne({ userId: req.user._id });
    const currentPhotoUrl = existingProfile?.photoUrl || '';
    const nextPhotoUrl = req.file
      ? await storeUploadedPhoto(req.user._id, req.file)
      : currentPhotoUrl;

    const payload = buildProfilePayload(req.user, req.body, existingProfile, nextPhotoUrl);
    const validation = validateProfileUpdate(payload);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    const profile = await MatrimonialProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: payload },
      { new: true, upsert: true, runValidators: true }
    );

    const mirroredUser = await syncUserMirror(req.user._id, payload);

    res.json({
      success: true,
      data: serializeOwnProfile(profile),
      user: buildMergedUserResponse(req.user, mirroredUser),
    });
  } catch (error) {
    logger.error('Update matrimonial profile error:', error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

router.get('/search', searchLimiter, async (req, res) => {
  try {
    const currentProfile = await MatrimonialProfile.findOne({ userId: req.user._id });
    const {
      religion,
      caste,
      location,
      education,
      profession,
      ageMin,
      ageMax,
      verifiedOnly = 'true',
      search = '',
      limit = 100,
    } = req.query;

    const query = {
      userId: { $ne: req.user._id },
    };

    const andFilters = [];
    if (currentProfile?._id) {
      andFilters.push({ _id: { $ne: currentProfile._id } });
      if (Array.isArray(currentProfile.blockedBy) && currentProfile.blockedBy.length > 0) {
        andFilters.push({ _id: { $nin: currentProfile.blockedBy } });
      }
      andFilters.push({ blockedBy: { $ne: currentProfile._id } });
    }

    if (religion && religion !== 'Any') {
      query.religion = religion;
    }
    if (caste && caste !== 'Any') {
      query.caste = caste;
    }
    if (location && location !== 'Any') {
      query.location = { $regex: location, $options: 'i' };
    }
    if (education && education !== 'Any') {
      query.education = education;
    }
    if (profession && profession !== 'Any') {
      query.profession = profession;
    }
    if (String(verifiedOnly).toLowerCase() !== 'false') {
      query.verificationStatus = 'verified';
    }
    if (ageMin || ageMax) {
      query.age = {};
      if (ageMin) {
        query.age.$gte = Number(ageMin);
      }
      if (ageMax) {
        query.age.$lte = Number(ageMax);
      }
    }
    if (normalizeText(search)) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { religion: { $regex: search, $options: 'i' } },
        { caste: { $regex: search, $options: 'i' } },
        { community: { $regex: search, $options: 'i' } },
        { education: { $regex: search, $options: 'i' } },
        { profession: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
      ];
    }

    if (andFilters.length > 0) {
      query.$and = andFilters;
    }

    const numericLimit = Math.min(200, Math.max(1, Number(limit) || 100));

    const profiles = await MatrimonialProfile.find(query)
      .select('-messages -interests -reports')
      .sort({ lastActive: -1, profileViews: -1 })
      .limit(numericLimit);

    res.json({
      success: true,
      data: profiles.map((profile) => serializePublicProfile(profile, currentProfile)),
      total: profiles.length,
    });
  } catch (error) {
    logger.error('Matrimonial search error:', error);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

router.get('/interests', async (req, res) => {
  try {
    const currentProfile = await MatrimonialProfile.findOne({ userId: req.user._id }).populate(
      'interests.fromProfileId',
      'name phone photoUrl age gender religion caste community education profession location maritalStatus familyDetails bio languages hobbies privacy verificationStatus profileStatus profileViews lastActive premiumUntil'
    );

    if (!currentProfile) {
      return res.json({
        success: true,
        data: {
          incoming: [],
          outgoing: [],
        },
      });
    }

    const incoming = (currentProfile.interests || [])
      .slice()
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
      .map((interest) =>
        buildInterestSummary(
          interest,
          interest.fromProfileId,
          currentProfile,
          currentProfile
        )
      );

    const outgoingTargets = await MatrimonialProfile.find({
      interests: {
        $elemMatch: {
          fromProfileId: currentProfile._id,
        },
      },
    }).select(
      'name phone photoUrl age gender religion caste community education profession location maritalStatus familyDetails bio languages hobbies privacy verificationStatus profileStatus profileViews lastActive premiumUntil interests'
    );

    const outgoing = outgoingTargets
      .flatMap((targetProfile) =>
        (targetProfile.interests || [])
          .filter((interest) => String(interest.fromProfileId) === String(currentProfile._id))
          .map((interest) =>
            buildInterestSummary(interest, currentProfile, targetProfile, currentProfile)
          )
      )
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

    res.json({
      success: true,
      data: {
        incoming,
        outgoing,
      },
    });
  } catch (error) {
    logger.error('Get matrimonial interests error:', error);
    res.status(500).json({ success: false, message: 'Failed to load interests' });
  }
});

router.post('/interests', interestLimiter, async (req, res) => {
  try {
    const { toProfileId, message } = req.body;
    if (!mongoose.Types.ObjectId.isValid(toProfileId)) {
      return res.status(400).json({ success: false, message: 'Invalid profile ID' });
    }

    const currentProfile = await MatrimonialProfile.findOne({ userId: req.user._id });
    const targetProfile = await MatrimonialProfile.findById(toProfileId);

    if (!currentProfile) {
      return res.status(400).json({
        success: false,
        message: 'Complete your matrimonial profile before sending interests',
      });
    }

    if (!targetProfile || String(targetProfile._id) === String(currentProfile._id)) {
      return res.status(400).json({ success: false, message: 'Invalid profiles' });
    }

    if (
      targetProfile.blockedBy?.some((entry) => String(entry) === String(currentProfile._id)) ||
      currentProfile.blockedBy?.some((entry) => String(entry) === String(targetProfile._id))
    ) {
      return res.status(403).json({
        success: false,
        message: 'This profile is not available for matching',
      });
    }

    const existingInterest = (targetProfile.interests || []).find(
      (interest) => String(interest.fromProfileId) === String(currentProfile._id)
    );

    if (existingInterest) {
      return res.json({
        success: true,
        message: 'Interest already sent',
        data: buildInterestSummary(existingInterest, currentProfile, targetProfile, currentProfile),
      });
    }

    const interest = {
      fromProfileId: currentProfile._id,
      toProfileId: targetProfile._id,
      message: normalizeText(message),
      status: 'sent',
    };

    targetProfile.interests.push(interest);
    targetProfile.interestsReceived = Number(targetProfile.interestsReceived || 0) + 1;
    targetProfile.lastActive = new Date();
    currentProfile.interestsSent = Number(currentProfile.interestsSent || 0) + 1;
    currentProfile.lastActive = new Date();

    await Promise.all([targetProfile.save(), currentProfile.save()]);

    if (typeof User.findByIdAndUpdate === 'function') {
      await Promise.allSettled([
        User.findByIdAndUpdate(currentProfile.userId, {
          $inc: { matrimonialInterestsSent: 1 },
        }),
        User.findByIdAndUpdate(targetProfile.userId, {
          $inc: { matrimonialInterestsReceived: 1 },
        }),
      ]);
    }

    res.json({
      success: true,
      data: buildInterestSummary(interest, currentProfile, targetProfile, currentProfile),
    });
  } catch (error) {
    logger.error('Send matrimonial interest error:', error);
    res.status(500).json({ success: false, message: 'Interest failed' });
  }
});

router.patch('/interests/:interestId', async (req, res) => {
  try {
    const { interestId } = req.params;
    const action = String(req.body.action || '').trim().toLowerCase();

    if (!['accepted', 'declined'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be accepted or declined',
      });
    }

    const currentProfile = await MatrimonialProfile.findOne({ userId: req.user._id }).populate(
      'interests.fromProfileId',
      'name phone photoUrl age gender religion caste community education profession location maritalStatus familyDetails bio languages hobbies privacy verificationStatus profileStatus profileViews lastActive premiumUntil'
    );

    if (!currentProfile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const interest = (currentProfile.interests || []).find((entry) => entry.id === interestId);
    if (!interest) {
      return res.status(404).json({ success: false, message: 'Interest not found' });
    }

    interest.status = action;
    interest.respondedAt = new Date();
    currentProfile.lastActive = new Date();
    await currentProfile.save();

    res.json({
      success: true,
      data: buildInterestSummary(
        interest,
        interest.fromProfileId,
        currentProfile,
        currentProfile
      ),
    });
  } catch (error) {
    logger.error('Respond matrimonial interest error:', error);
    res.status(500).json({ success: false, message: 'Unable to respond to interest' });
  }
});

router.get('/messages', async (req, res) => {
  try {
    const currentProfile = await MatrimonialProfile.findOne({ userId: req.user._id });

    if (!currentProfile) {
      return res.json({ success: true, data: [] });
    }

    const incomingAcceptedIds = (currentProfile.interests || [])
      .filter((interest) => interest.status === 'accepted')
      .map((interest) => interest.fromProfileId);

    const outgoingAcceptedProfiles = await MatrimonialProfile.find({
      interests: {
        $elemMatch: {
          fromProfileId: currentProfile._id,
          status: 'accepted',
        },
      },
    }).select(
      'name phone photoUrl age gender religion caste community education profession location maritalStatus familyDetails bio languages hobbies privacy verificationStatus profileStatus profileViews lastActive premiumUntil'
    );

    const incomingAcceptedProfiles = incomingAcceptedIds.length
      ? await MatrimonialProfile.find({
          _id: { $in: incomingAcceptedIds },
        }).select(
          'name phone photoUrl age gender religion caste community education profession location maritalStatus familyDetails bio languages hobbies privacy verificationStatus profileStatus profileViews lastActive premiumUntil'
        )
      : [];

    const acceptedProfiles = [
      ...incomingAcceptedProfiles,
      ...outgoingAcceptedProfiles.filter(
        (profile, index, collection) =>
          collection.findIndex((entry) => String(entry._id) === String(profile._id)) === index
      ),
    ];

    const threadMap = buildThreadMap(currentProfile, acceptedProfiles);
    const participantIds = Array.from(threadMap.keys())
      .filter(Boolean)
      .map((id) => new mongoose.Types.ObjectId(id));

    const participants = participantIds.length
      ? await MatrimonialProfile.find({ _id: { $in: participantIds } }).select(
          'name phone photoUrl age gender religion caste community education profession location maritalStatus familyDetails bio languages hobbies privacy verificationStatus profileStatus profileViews lastActive premiumUntil'
        )
      : [];

    participants.forEach((participant) => {
      const thread = threadMap.get(String(participant._id));
      if (!thread) {
        return;
      }

      thread.profile = serializePublicProfile(participant, currentProfile);
      if (!thread.lastMessage) {
        thread.lastMessage = {
          content: 'Connection accepted. Start the conversation with a respectful introduction.',
          createdAt: participant.lastActive || new Date(),
        };
      }
    });

    const threads = Array.from(threadMap.values())
      .filter((thread) => thread.profile)
      .sort(
        (left, right) =>
          new Date(right.lastMessage?.createdAt || 0).getTime() -
          new Date(left.lastMessage?.createdAt || 0).getTime()
      );

    res.json({ success: true, data: threads });
  } catch (error) {
    logger.error('Get matrimonial messages error:', error);
    res.status(500).json({ success: false, message: 'Unable to load messages' });
  }
});

router.post('/messages', messageLimiter, async (req, res) => {
  try {
    const { toProfileId, content } = req.body;
    if (!mongoose.Types.ObjectId.isValid(toProfileId)) {
      return res.status(400).json({ success: false, message: 'Invalid profile ID' });
    }

    const trimmedContent = normalizeText(content);
    if (!trimmedContent) {
      return res.status(400).json({ success: false, message: 'Message content required' });
    }

    const currentProfile = await MatrimonialProfile.findOne({ userId: req.user._id });
    const targetProfile = await MatrimonialProfile.findById(toProfileId);

    if (!currentProfile || !targetProfile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const hasMessagingAccess = await subscriptionService.hasEntitlement(
      userEmail,
      'directMessages'
    );
    if (!hasMessagingAccess) {
      return res.status(403).json({
        success: false,
        message: 'Direct messaging requires an active paid subscription',
      });
    }

    const connected = await isConnectedForMessaging(currentProfile._id, targetProfile._id);
    if (!connected) {
      return res.status(403).json({
        success: false,
        message: 'Messages are available only after an accepted interest',
      });
    }

    try {
      await subscriptionService.consumeEntitlement(userEmail, 'directMessages');
    } catch (_error) {
      return res.status(429).json({
        success: false,
        message: 'You reached your messaging quota for the current cycle',
      });
    }

    const message = {
      fromProfileId: currentProfile._id,
      toProfileId: targetProfile._id,
      content: trimmedContent,
      isRead: true,
      createdAt: new Date(),
    };

    currentProfile.messages.push(message);
    targetProfile.messages.push({
      ...message,
      isRead: false,
    });
    currentProfile.lastActive = new Date();
    targetProfile.lastActive = new Date();

    await Promise.all([currentProfile.save(), targetProfile.save()]);

    res.json({
      success: true,
      data: {
        ...message,
        fromProfileId: String(currentProfile._id),
        toProfileId: String(targetProfile._id),
      },
    });
  } catch (error) {
    logger.error('Send matrimonial message error:', error);
    res.status(500).json({ success: false, message: 'Unable to send message' });
  }
});

router.post('/profiles/:profileId/block', blockLimiter, async (req, res) => {
  try {
    const { profileId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({ success: false, message: 'Invalid profile ID' });
    }

    const currentProfile = await MatrimonialProfile.findOne({ userId: req.user._id });
    const targetProfile = await MatrimonialProfile.findById(profileId);

    if (!currentProfile || !targetProfile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    if (!targetProfile.blockedBy.some((entry) => String(entry) === String(currentProfile._id))) {
      targetProfile.blockedBy.push(currentProfile._id);
      targetProfile.lastActive = new Date();
      await targetProfile.save();
    }

    res.json({ success: true, message: 'Profile blocked successfully' });
  } catch (error) {
    logger.error('Block matrimonial profile error:', error);
    res.status(500).json({ success: false, message: 'Unable to block profile' });
  }
});

router.post('/profiles/:profileId/report', reportLimiter, async (req, res) => {
  try {
    const { profileId } = req.params;
    const reason = normalizeText(req.body.reason);

    if (!mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({ success: false, message: 'Invalid profile ID' });
    }

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Report reason required' });
    }

    const currentProfile = await MatrimonialProfile.findOne({ userId: req.user._id });
    const targetProfile = await MatrimonialProfile.findById(profileId);

    if (!currentProfile || !targetProfile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    targetProfile.reports.push({
      reporterId: currentProfile._id,
      reason,
      status: 'open',
    });
    await targetProfile.save();

    res.json({ success: true, message: 'Profile reported successfully' });
  } catch (error) {
    logger.error('Report matrimonial profile error:', error);
    res.status(500).json({ success: false, message: 'Unable to report profile' });
  }
});

router.get('/admin/review-queue', ensureAdmin, async (_req, res) => {
  try {
    const profiles = await MatrimonialProfile.find({})
      .select(
        'name photoUrl age gender religion caste community education profession location maritalStatus familyDetails bio languages hobbies privacy verificationStatus profileStatus profileViews lastActive premiumUntil reports'
      )
      .sort({ updatedAt: -1, profileViews: -1 })
      .limit(25);

    const verifiedCount = await MatrimonialProfile.countDocuments({
      verificationStatus: 'verified',
    });
    const pendingCount = await MatrimonialProfile.countDocuments({
      verificationStatus: { $ne: 'verified' },
    });
    const premiumCount = await MatrimonialProfile.countDocuments({
      premiumUntil: { $gt: new Date() },
    });

    const reportCount = profiles.reduce(
      (total, profile) => total + (Array.isArray(profile.reports) ? profile.reports.length : 0),
      0
    );

    res.json({
      success: true,
      data: {
        summary: {
          verifiedCount,
          pendingCount,
          reportCount,
          premiumCount,
        },
        profiles: profiles.map((profile) => ({
          ...serializeOwnProfile(profile),
          reportCount: Array.isArray(profile.reports) ? profile.reports.length : 0,
        })),
      },
    });
  } catch (error) {
    logger.error('Load matrimonial review queue error:', error);
    res.status(500).json({ success: false, message: 'Unable to load moderation queue' });
  }
});

router.patch('/admin/profiles/:profileId/moderation', ensureAdmin, async (req, res) => {
  try {
    const { profileId } = req.params;
    const action = String(req.body.action || '').trim().toLowerCase();

    if (!mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({ success: false, message: 'Invalid profile ID' });
    }

    const profile = await MatrimonialProfile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    if (action === 'approve') {
      profile.verificationStatus = 'verified';
      profile.profileStatus = 'approved';
    } else if (action === 'request_changes') {
      profile.verificationStatus = 'pending';
      profile.profileStatus = 'changes_requested';
    } else if (action === 'reject') {
      profile.verificationStatus = 'rejected';
      profile.profileStatus = 'rejected';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported moderation action',
      });
    }

    profile.lastActive = new Date();
    await profile.save();

    res.json({
      success: true,
      data: serializeOwnProfile(profile),
    });
  } catch (error) {
    logger.error('Moderate matrimonial profile error:', error);
    res.status(500).json({ success: false, message: 'Unable to update moderation status' });
  }
});

module.exports = router;
