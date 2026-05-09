/**
 * UserProfileService.js
 * Manages user profile operations, validation, and data enrichment
 */

const UserProfile = require('../models/UserProfile');
const User = require('../models/User');

class UserProfileService {
  static instance;

  constructor() {}

  static getInstance() {
    if (!this.instance) {
      this.instance = new UserProfileService();
    }
    return this.instance;
  }

  // Create or update user profile
  async createOrUpdateProfile(userId, profileData) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let profile = await UserProfile.findOne({ userId });

    if (!profile) {
      profile = await UserProfile.create({ userId, ...profileData });
    } else {
      Object.assign(profile, profileData);
      await profile.save();
    }

    // Calculate completeness
    profile.calculateCompleteness();
    await profile.save();

    return profile;
  }

  // Get user profile
  async getProfile(userId) {
    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      throw new Error('Profile not found');
    }
    return profile;
  }

  // Get public profile (limited data)
  async getPublicProfile(userId) {
    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      throw new Error('Profile not found');
    }
    return profile.getPublicProfile();
  }

  // Update avatar
  async updateAvatar(userId, avatarUrl, publicId = null) {
    const profile = await this.getProfile(userId);
    profile.avatar = avatarUrl;
    if (publicId) {
      profile.avatarPublicId = publicId;
    }
    profile.calculateCompleteness();
    return profile.save();
  }

  // Remove avatar
  async removeAvatar(userId) {
    const profile = await this.getProfile(userId);
    profile.avatar = null;
    profile.avatarPublicId = null;
    profile.calculateCompleteness();
    return profile.save();
  }

  // Verify phone number
  async verifyPhoneNumber(userId, phoneNumber) {
    const profile = await this.getProfile(userId);

    // Check if phone already used by other user
    const existing = await UserProfile.findOne({
      userId: { $ne: userId },
      phoneNumber,
      phoneVerified: true
    });

    if (existing) {
      throw new Error('Phone number already registered');
    }

    profile.phoneNumber = phoneNumber;
    const code = profile.generatePhoneVerificationCode();
    await profile.save();

    return { code, expiresAt: profile.phoneVerificationExpires };
  }

  // Confirm phone verification
  async confirmPhoneVerification(userId, code) {
    const profile = await this.getProfile(userId);

    await profile.verifyPhone(code);
    profile.calculateCompleteness();
    await profile.save();

    return { success: true, message: 'Phone verified successfully' };
  }

  // Generate and save referral code
  async generateReferralCode(userId) {
    const profile = await this.getProfile(userId);

    // Check if already has referral code
    if (profile.referralCode) {
      return profile.referralCode;
    }

    let referralCode = profile.generateReferralCode();

    // Ensure uniqueness
    let counter = 0;
    while ((await UserProfile.findOne({ referralCode })) && counter < 5) {
      referralCode = profile.generateReferralCode();
      counter++;
    }

    if (counter === 5) {
      throw new Error('Failed to generate unique referral code');
    }

    await profile.save();
    return referralCode;
  }

  // Apply referral code
  async applyReferralCode(userId, referralCode) {
    // Find referrer's profile
    const referrerProfile = await UserProfile.findOne({ referralCode });
    if (!referrerProfile) {
      throw new Error('Invalid referral code');
    }

    if (referrerProfile.userId.toString() === userId.toString()) {
      throw new Error('Cannot use your own referral code');
    }

    // Check if user already referred
    const userProfile = await this.getProfile(userId);
    if (userProfile.referredBy) {
      throw new Error('User already has a referrer');
    }

    // Apply referral
    userProfile.referredBy = referrerProfile.userId;
    await userProfile.save();

    // Add to referrer's list
    referrerProfile.referrals.push({ referredUserId: userId });
    await referrerProfile.save();

    return { success: true, message: 'Referral applied successfully' };
  }

  // Get referral stats
  async getReferralStats(userId) {
    const profile = await this.getProfile(userId);

    const activeReferrals = profile.referrals.filter((r) => r.isActive).length;
    const totalReferrals = profile.referrals.length;

    return {
      referralCode: profile.referralCode,
      activeReferrals,
      totalReferrals,
      referredBy: profile.referredBy
    };
  }

  // Add badge to user
  async addBadge(userId, badgeName) {
    const profile = await this.getProfile(userId);

    // Check if badge already exists
    const hasBadge = profile.badges.some((b) => b.name === badgeName);
    if (hasBadge) {
      return profile;
    }

    profile.badges.push({ name: badgeName, earnedAt: new Date() });
    return profile.save();
  }

  // Remove badge
  async removeBadge(userId, badgeName) {
    const profile = await this.getProfile(userId);
    profile.badges = profile.badges.filter((b) => b.name !== badgeName);
    return profile.save();
  }

  // Update profile status
  async updateAccountStatus(userId, status) {
    if (!['active', 'suspended', 'deleted'].includes(status)) {
      throw new Error('Invalid account status');
    }

    const profile = await this.getProfile(userId);
    profile.accountStatus = status;
    return profile.save();
  }

  // Record last login
  async recordLastLogin(userId) {
    const profile = await this.getProfile(userId);
    profile.lastLoginAt = new Date();
    return profile.save();
  }

  // Get profile completeness
  async getProfileCompleteness(userId) {
    const profile = await this.getProfile(userId);
    return {
      percentage: profile.profileCompleteness,
      missingFields: this.getMissingFields(profile)
    };
  }

  // Helper to find missing fields
  getMissingFields(profile) {
    const fields = {
      firstName: 'First Name',
      lastName: 'Last Name',
      phoneNumber: 'Phone Number',
      dateOfBirth: 'Date of Birth',
      avatar: 'Avatar',
      bio: 'Bio',
      profession: 'Profession'
    };

    const missing = [];
    Object.entries(fields).forEach(([field, label]) => {
      if (!profile[field] || profile[field].toString().trim().length === 0) {
        missing.push(label);
      }
    });

    return missing;
  }

  // Search profiles
  async searchProfiles(query, limit = 20) {
    return UserProfile.find(
      {
        $or: [
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } },
          { bio: { $regex: query, $options: 'i' } },
          { profession: { $regex: query, $options: 'i' } }
        ],
        accountStatus: 'active'
      },
      {
        firstName: 1,
        lastName: 1,
        avatar: 1,
        profession: 1,
        bio: 1,
        badges: 1
      }
    )
      .limit(limit)
      .exec();
  }

  // Delete profile (soft delete)
  async deleteProfile(userId, reason = '') {
    const profile = await this.getProfile(userId);
    profile.accountStatus = 'deleted';
    profile.lastUpdatedAt = new Date();
    await profile.save();

    // Optional: Log deletion reason
    console.log(`Profile deleted for user ${userId}: ${reason}`);

    return { success: true, message: 'Profile deleted successfully' };
  }
}

module.exports = UserProfileService.getInstance();
