const EcommerceSellerProfile = require('../models/EcommerceSellerProfile');
const User = require('../models/User');

class SellerOnboardingService {
  /**
   * Create seller profile (Step 1: Basic Info)
   */
  async createSellerProfile(userId, basicInfo) {
    try {
      const existingProfile = await EcommerceSellerProfile.findOne({ userId });
      if (existingProfile) {
        throw new Error('Seller profile already exists');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const profile = new EcommerceSellerProfile({
        userId,
        sellerEmail: basicInfo.sellerEmail || user.email,
        businessName: basicInfo.businessName,
        businessType: basicInfo.businessType,
        storeName: basicInfo.storeName,
        storeDescription: basicInfo.storeDescription || '',
        contactPerson: {
          name: basicInfo.contactName,
          phone: basicInfo.contactPhone
        },
        businessAddress: basicInfo.businessAddress,
        categories: basicInfo.categories || [],
        verification: { status: 'pending' },
        subscription: {
          plan: 'free',
          status: 'trial',
          startDate: new Date(),
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
        },
        onboardedAt: new Date()
      });

      await profile.save();

      return {
        success: true,
        profile,
        message: 'Seller profile created successfully. Please complete verification.'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update business details (Step 2)
   */
  async updateBusinessDetails(userId, businessDetails) {
    try {
      const profile = await EcommerceSellerProfile.findOne({ userId });
      if (!profile) {
        throw new Error('Seller profile not found');
      }

      profile.taxInfo = {
        gstNumber: businessDetails.gstNumber,
        panNumber: businessDetails.panNumber,
        gstCertificate: businessDetails.gstCertificate,
        panCard: businessDetails.panCard,
        verified: false
      };

      await profile.save();

      return {
        success: true,
        profile,
        message: 'Business details updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update bank details (Step 3)
   */
  async updateBankDetails(userId, bankDetails) {
    try {
      const profile = await EcommerceSellerProfile.findOne({ userId });
      if (!profile) {
        throw new Error('Seller profile not found');
      }

      profile.bankDetails = {
        accountHolderName: bankDetails.accountHolderName,
        accountNumber: bankDetails.accountNumber,
        ifscCode: bankDetails.ifscCode,
        bankName: bankDetails.bankName,
        branchName: bankDetails.branchName,
        accountType: bankDetails.accountType,
        verified: false
      };

      await profile.save();

      return {
        success: true,
        profile,
        message: 'Bank details updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Submit for verification (Step 4)
   */
  async submitForVerification(userId) {
    try {
      const profile = await EcommerceSellerProfile.findOne({ userId });
      if (!profile) {
        throw new Error('Seller profile not found');
      }

      // Validate required fields
      if (!profile.businessName || !profile.storeName || !profile.contactPerson?.phone) {
        throw new Error('Please complete all required fields');
      }

      if (!profile.taxInfo?.gstNumber || !profile.taxInfo?.panNumber) {
        throw new Error('Please provide GST and PAN details');
      }

      if (!profile.bankDetails?.accountNumber || !profile.bankDetails?.ifscCode) {
        throw new Error('Please provide bank details');
      }

      profile.verification.status = 'in_review';
      profile.verification.documentsSubmitted = true;
      await profile.save();

      return {
        success: true,
        message: 'Profile submitted for verification. We will review within 2-3 business days.'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get onboarding status
   */
  async getOnboardingStatus(userId) {
    try {
      const profile = await EcommerceSellerProfile.findOne({ userId });
      if (!profile) {
        return {
          hasProfile: false,
          completionPercentage: 0,
          currentStep: 1,
          steps: this._getOnboardingSteps(null)
        };
      }

      const steps = this._getOnboardingSteps(profile);
      const completedSteps = steps.filter(s => s.completed).length;
      const completionPercentage = Math.round((completedSteps / steps.length) * 100);

      return {
        hasProfile: true,
        profile,
        completionPercentage,
        currentStep: this._getCurrentStep(profile),
        steps,
        canStartSelling: profile.verification.status === 'verified'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Admin: Verify seller
   */
  async verifySeller(sellerId, adminId, verificationData) {
    try {
      const profile = await EcommerceSellerProfile.findById(sellerId);
      if (!profile) {
        throw new Error('Seller profile not found');
      }

      profile.verification.status = 'verified';
      profile.verification.kycStatus = 'verified';
      profile.verification.verifiedAt = new Date();
      profile.verification.verifiedBy = adminId;
      profile.verification.notes = verificationData.notes || '';
      
      // Verify documents
      profile.verification.documentsSubmitted = true;
      profile.verification.bankVerified = verificationData.bankVerified !== false;
      profile.verification.addressVerified = verificationData.addressVerified !== false;

      if (verificationData.verifyTax !== false) {
        profile.taxInfo.verified = true;
        profile.taxInfo.verifiedAt = new Date();
      }

      if (verificationData.verifyBank !== false) {
        profile.bankDetails.verified = true;
        profile.bankDetails.verifiedAt = new Date();
      }

      profile.accountStatus = 'active';
      await profile.save();

      return {
        success: true,
        profile,
        message: 'Seller verified successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Admin: Reject verification
   */
  async rejectVerification(sellerId, adminId, reason) {
    try {
      const profile = await EcommerceSellerProfile.findById(sellerId);
      if (!profile) {
        throw new Error('Seller profile not found');
      }

      profile.verification.status = 'rejected';
      profile.verification.rejectionReason = reason;
      profile.verification.verifiedBy = adminId;
      await profile.save();

      return {
        success: true,
        message: 'Verification rejected'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Helper: Get onboarding steps
   */
  _getOnboardingSteps(profile) {
    if (!profile) {
      return [
        { step: 1, title: 'Basic Information', completed: false },
        { step: 2, title: 'Business Details', completed: false },
        { step: 3, title: 'Bank Information', completed: false },
        { step: 4, title: 'Verification', completed: false }
      ];
    }

    return [
      {
        step: 1,
        title: 'Basic Information',
        completed: !!(profile.businessName && profile.storeName && profile.contactPerson?.phone)
      },
      {
        step: 2,
        title: 'Business Details',
        completed: !!(profile.taxInfo?.gstNumber && profile.taxInfo?.panNumber)
      },
      {
        step: 3,
        title: 'Bank Information',
        completed: !!(profile.bankDetails?.accountNumber && profile.bankDetails?.ifscCode)
      },
      {
        step: 4,
        title: 'Verification',
        completed: profile.verification.status === 'verified'
      }
    ];
  }

  /**
   * Helper: Get current step
   */
  _getCurrentStep(profile) {
    const steps = this._getOnboardingSteps(profile);
    const firstIncomplete = steps.find(s => !s.completed);
    return firstIncomplete ? firstIncomplete.step : 4;
  }
}

module.exports = new SellerOnboardingService();
