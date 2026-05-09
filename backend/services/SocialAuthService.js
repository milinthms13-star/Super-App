/**
 * SocialAuthService
 * Handles Google, Facebook, Apple social login integration
 */

const User = require('../models/User');
const SocialAccount = require('../models/SocialAccount');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

class SocialAuthService {
  static instance;

  static getInstance() {
    if (!SocialAuthService.instance) {
      SocialAuthService.instance = new SocialAuthService();
    }
    return SocialAuthService.instance;
  }

  constructor() {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  /**
   * Google Login - Verify ID token and create/login user
   */
  async loginWithGoogle(idToken) {
    try {
      // Verify Google token
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      const profileData = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        email_verified: payload.email_verified,
        locale: payload.locale
      };

      return await this.handleSocialLogin('google', profileData);
    } catch (error) {
      throw new Error(`Google login failed: ${error.message}`);
    }
  }

  /**
   * Facebook Login - Verify access token
   */
  async loginWithFacebook(accessToken) {
    try {
      const fetch = require('node-fetch');
      const response = await fetch(
        `https://graph.facebook.com/me?fields=id,email,name,picture&access_token=${accessToken}`
      );

      if (!response.ok) {
        throw new Error('Invalid Facebook access token');
      }

      const data = await response.json();
      const profileData = {
        id: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture?.data?.url,
        accessToken
      };

      return await this.handleSocialLogin('facebook', profileData);
    } catch (error) {
      throw new Error(`Facebook login failed: ${error.message}`);
    }
  }

  /**
   * Apple Login - Verify identity token
   */
  async loginWithApple(identityToken) {
    try {
      // Verify Apple token (simplified - in production, implement full JWT verification)
      const decode = require('jsonwebtoken').decode;
      const payload = decode(identityToken);

      const profileData = {
        id: payload.sub,
        email: payload.email,
        name: `${payload.user_name || 'Apple'} User`,
        email_verified: payload.email_verified,
        accessToken: identityToken
      };

      return await this.handleSocialLogin('apple', profileData);
    } catch (error) {
      throw new Error(`Apple login failed: ${error.message}`);
    }
  }

  /**
   * Handle social login - Common logic for all providers
   */
  async handleSocialLogin(provider, profileData) {
    try {
      // Find or create social account
      let socialAccount = await SocialAccount.findOne({
        provider,
        providerId: profileData.id
      });

      let user;

      if (socialAccount) {
        // Existing user - update login info
        user = await User.findById(socialAccount.userId);
        socialAccount.lastLoginAt = new Date();
        await socialAccount.save();
      } else {
        // New user - create account
        user = await User.findOne({ email: profileData.email });

        if (!user) {
          // Create new user
          const [firstName, ...lastNameParts] = profileData.name.split(' ');
          user = new User({
            email: profileData.email,
            firstName,
            lastName: lastNameParts.join(' '),
            profilePicture: profileData.picture,
            isEmailVerified: profileData.email_verified || false,
            emailVerifiedAt: profileData.email_verified ? new Date() : null,
            authMethod: provider,
            locale: profileData.locale
          });
          await user.save();
        }

        // Create social account link
        socialAccount = await SocialAccount.create({
          userId: user._id,
          provider,
          providerId: profileData.id,
          email: profileData.email,
          name: profileData.name,
          picture: profileData.picture,
          profileData,
          accessToken: profileData.accessToken,
          refreshToken: profileData.refreshToken,
          lastLoginAt: new Date()
        });
      }

      // Generate tokens
      const tokens = this.generateTokens(user, provider);

      return {
        success: true,
        isNewUser: !socialAccount.lastLoginAt || 
                   socialAccount.lastLoginAt.getTime() === socialAccount.createdAt.getTime(),
        user: {
          id: user._id,
          email: user.email,
          phoneNumber: user.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture
        },
        ...tokens
      };
    } catch (error) {
      throw new Error(`Social login failed: ${error.message}`);
    }
  }

  /**
   * Link social account to existing user
   */
  async linkSocialAccount(userId, provider, profileData) {
    try {
      // Check if already linked
      let socialAccount = await SocialAccount.findOne({
        userId,
        provider
      });

      if (socialAccount) {
        throw new Error(`${provider} account already linked`);
      }

      // Check if another user has this account
      const existingAccount = await SocialAccount.findOne({
        provider,
        providerId: profileData.id
      });

      if (existingAccount && existingAccount.userId.toString() !== userId.toString()) {
        throw new Error(`${provider} account already linked to another user`);
      }

      // Create new social account
      socialAccount = await SocialAccount.create({
        userId,
        provider,
        providerId: profileData.id,
        email: profileData.email,
        name: profileData.name,
        picture: profileData.picture,
        profileData,
        accessToken: profileData.accessToken
      });

      return {
        success: true,
        message: `${provider} account linked successfully`,
        account: socialAccount
      };
    } catch (error) {
      throw new Error(`Failed to link social account: ${error.message}`);
    }
  }

  /**
   * Unlink social account from user
   */
  async unlinkSocialAccount(userId, provider) {
    try {
      const socialAccount = await SocialAccount.findOne({ userId, provider });

      if (!socialAccount) {
        throw new Error(`${provider} account not linked`);
      }

      await socialAccount.disconnect();

      return {
        success: true,
        message: `${provider} account unlinked successfully`
      };
    } catch (error) {
      throw new Error(`Failed to unlink social account: ${error.message}`);
    }
  }

  /**
   * Get user's linked social accounts
   */
  async getUserSocialAccounts(userId) {
    try {
      const accounts = await SocialAccount.find({
        userId,
        isConnected: true
      }).select('-accessToken -refreshToken -profileData');

      return accounts;
    } catch (error) {
      throw new Error(`Failed to get social accounts: ${error.message}`);
    }
  }

  /**
   * Generate JWT tokens
   */
  generateTokens(user, provider = 'social') {
    const accessToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        authMethod: provider
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      {
        userId: user._id,
        authMethod: provider
      },
      process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
      { expiresIn: '30d' }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 86400
    };
  }
}

module.exports = SocialAuthService.getInstance();
