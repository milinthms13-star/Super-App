/**
 * SocialAccount Model
 * Links social media accounts (Google, Facebook, Apple) to users
 */

const mongoose = require('mongoose');

const SocialAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  provider: {
    type: String,
    enum: ['google', 'facebook', 'apple', 'linkedin'],
    required: true
  },
  providerId: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
    lowercase: true,
    sparse: true,
    index: true
  },
  name: String,
  picture: String,
  accessToken: {
    type: String,
    select: false
  },
  refreshToken: {
    type: String,
    select: false
  },
  accessTokenExpiry: Date,
  refreshTokenExpiry: Date,
  profileData: {
    firstName: String,
    lastName: String,
    locale: String,
    timezone: String,
    verified: Boolean,
    email: String,
    picture: String,
    birthDate: String,
    phone: String
  },
  permissions: [String], // Granted permissions
  scopes: [String],
  isConnected: {
    type: Boolean,
    default: true,
    index: true
  },
  connectedAt: {
    type: Date,
    default: Date.now
  },
  disconnectedAt: Date,
  lastUsedAt: Date,
  lastLoginAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Unique index to prevent duplicate connections
SocialAccountSchema.index({ userId: 1, provider: 1 }, { unique: true });
SocialAccountSchema.index({ provider: 1, providerId: 1 }, { unique: true });
SocialAccountSchema.index({ userId: 1, isConnected: 1 });

// Static methods
SocialAccountSchema.statics.findOrCreateFromSocial = async function(provider, profileData) {
  const providerId = profileData.id || profileData.sub;
  
  let account = await this.findOne({ provider, providerId });
  
  if (!account) {
    account = new this({
      provider,
      providerId,
      email: profileData.email,
      name: profileData.name,
      picture: profileData.picture,
      profileData,
      accessToken: profileData.accessToken,
      refreshToken: profileData.refreshToken,
      accessTokenExpiry: profileData.accessTokenExpiry,
      refreshTokenExpiry: profileData.refreshTokenExpiry
    });
    await account.save();
  } else {
    // Update tokens and profile data
    account.accessToken = profileData.accessToken;
    account.refreshToken = profileData.refreshToken;
    account.accessTokenExpiry = profileData.accessTokenExpiry;
    account.profileData = profileData;
    account.lastLoginAt = new Date();
    await account.save();
  }
  
  return account;
};

// Instance methods
SocialAccountSchema.methods.disconnect = async function() {
  this.isConnected = false;
  this.disconnectedAt = new Date();
  await this.save();
};

SocialAccountSchema.methods.reconnect = async function() {
  this.isConnected = true;
  this.disconnectedAt = null;
  this.lastUsedAt = new Date();
  await this.save();
};

SocialAccountSchema.methods.updateAccessToken = async function(newAccessToken, expiryDate) {
  this.accessToken = newAccessToken;
  this.accessTokenExpiry = expiryDate;
  this.lastUsedAt = new Date();
  await this.save();
};

SocialAccountSchema.methods.refreshAccessTokenIfNeeded = async function() {
  const now = new Date();
  
  if (this.accessTokenExpiry && this.accessTokenExpiry < now) {
    // Token expired - would need to refresh using refreshToken
    return false; // Token needs refresh
  }
  
  return true; // Token still valid
};

module.exports = mongoose.model('SocialAccount', SocialAccountSchema);
