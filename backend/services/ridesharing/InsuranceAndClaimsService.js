/**
 * InsuranceAndClaimsService.js
 * Phase 8: Insurance & Claims Management
 * Handles ride insurance products, claims processing, coverage details
 */

const InsurancePlan = require('../../models/InsurancePlan');
const InsurancePolicy = require('../../models/InsurancePolicy');
const InsuranceClaim = require('../../models/InsuranceClaim');
const ClaimDocument = require('../../models/ClaimDocument');
const RideRequest = require('../../models/RideRequest');

class InsuranceAndClaimsService {
  /**
   * Get available insurance plans
   */
  static async getAvailableInsurancePlans(filters = {}) {
    try {
      const query = { status: 'active' };

      if (filters.coverage) query.coverage = filters.coverage;
      if (filters.maxPrice) query.monthlyPremium = { $lte: filters.maxPrice };

      const plans = await InsurancePlan.find(query)
        .sort({ monthlyPremium: 1 })
        .lean();

      return {
        success: true,
        data: plans,
        count: plans.length,
      };
    } catch (error) {
      throw new Error(`Error retrieving insurance plans: ${error.message}`);
    }
  }

  /**
   * Get insurance plan details
   */
  static async getInsurancePlanDetails(planId) {
    try {
      const plan = await InsurancePlan.findById(planId).lean();

      if (!plan) {
        throw new Error('Insurance plan not found');
      }

      return {
        success: true,
        data: plan,
      };
    } catch (error) {
      throw new Error(`Error retrieving insurance plan: ${error.message}`);
    }
  }

  /**
   * Purchase insurance policy
   */
  static async purchaseInsurancePolicy(userId, policyData) {
    try {
      const {
        planId,
        paymentMethodId,
        startDate,
        beneficiaryName,
        beneficiaryPhone,
        vehicleDetails,
      } = policyData;

      // Get plan details
      const plan = await InsurancePlan.findById(planId);
      if (!plan) {
        throw new Error('Insurance plan not found');
      }

      // Validate dates
      const start = new Date(startDate);
      if (start < new Date()) {
        return {
          success: false,
          message: 'Start date cannot be in the past',
        };
      }

      // Create insurance policy
      const policy = new InsurancePolicy({
        userId,
        planId,
        planName: plan.name,
        coverage: plan.coverage,
        monthlyPremium: plan.monthlyPremium,
        startDate: start,
        endDate: new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year
        beneficiaryName,
        beneficiaryPhone,
        vehicleDetails,
        status: 'active',
        policyNumber: this.generatePolicyNumber(),
        totalClaims: 0,
        totalClaimAmount: 0,
        nextPaymentDue: new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from start
        paymentHistory: [
          {
            date: new Date(),
            amount: plan.monthlyPremium,
            status: 'pending',
            paymentMethodId,
          },
        ],
        createdAt: new Date(),
      });

      await policy.save();

      return {
        success: true,
        message: 'Insurance policy purchased successfully',
        data: {
          policyId: policy._id,
          policyNumber: policy.policyNumber,
          coverage: policy.coverage,
          monthlyPremium: policy.monthlyPremium,
          status: policy.status,
        },
      };
    } catch (error) {
      throw new Error(`Error purchasing insurance policy: ${error.message}`);
    }
  }

  /**
   * Generate unique policy number
   */
  static generatePolicyNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `POL-${timestamp}-${random}`;
  }

  /**
   * Get user insurance policy
   */
  static async getUserInsurancePolicy(userId) {
    try {
      const policy = await InsurancePolicy.findOne({
        userId,
        status: 'active',
      }).populate('planId', 'name coverage monthlyPremium');

      if (!policy) {
        return {
          success: true,
          data: null,
          message: 'No active insurance policy found',
        };
      }

      return {
        success: true,
        data: policy,
      };
    } catch (error) {
      throw new Error(`Error retrieving user insurance policy: ${error.message}`);
    }
  }

  /**
   * Get all user insurance policies
   */
  static async getUserInsurancePolicies(userId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const policies = await InsurancePolicy.find({ userId })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();

      const total = await InsurancePolicy.countDocuments({ userId });

      return {
        success: true,
        data: policies,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error retrieving user insurance policies: ${error.message}`);
    }
  }

  /**
   * File insurance claim
   */
  static async fileInsuranceClaim(userId, claimData) {
    try {
      const {
        policyId,
        rideId,
        incidentDate,
        incidentType, // 'accident', 'theft', 'damage', 'loss', 'medical'
        description,
        damagePhotos,
        estimatedAmount,
      } = claimData;

      // Get policy
      const policy = await InsurancePolicy.findOne({
        _id: policyId,
        userId,
        status: 'active',
      });

      if (!policy) {
        return {
          success: false,
          message: 'Active insurance policy not found',
        };
      }

      // Validate incident date
      const incident = new Date(incidentDate);
      if (incident > new Date()) {
        return {
          success: false,
          message: 'Incident date cannot be in the future',
        };
      }

      // Get ride details if applicable
      let rideDetails = null;
      if (rideId) {
        const ride = await RideRequest.findById(rideId);
        rideDetails = ride ? { rideId: ride._id, fare: ride.fare } : null;
      }

      // Create claim
      const claim = new InsuranceClaim({
        userId,
        policyId,
        policyNumber: policy.policyNumber,
        claimNumber: this.generateClaimNumber(),
        incidentDate: incident,
        incidentType,
        description,
        estimatedAmount,
        rideDetails,
        status: 'submitted',
        documents: damagePhotos || [],
        submittedAt: new Date(),
        createdAt: new Date(),
      });

      await claim.save();

      // Update policy claim count
      policy.totalClaims += 1;
      await policy.save();

      return {
        success: true,
        message: 'Insurance claim filed successfully',
        data: {
          claimId: claim._id,
          claimNumber: claim.claimNumber,
          status: claim.status,
          estimatedAmount: claim.estimatedAmount,
        },
      };
    } catch (error) {
      throw new Error(`Error filing insurance claim: ${error.message}`);
    }
  }

  /**
   * Generate unique claim number
   */
  static generateClaimNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `CLM-${timestamp}-${random}`;
  }

  /**
   * Get claim details
   */
  static async getClaimDetails(claimId, userId = null) {
    try {
      let query = { _id: claimId };
      if (userId) {
        query.userId = userId;
      }

      const claim = await InsuranceClaim.findOne(query)
        .populate('policyId', 'coverage monthlyPremium')
        .lean();

      if (!claim) {
        throw new Error('Claim not found');
      }

      return {
        success: true,
        data: claim,
      };
    } catch (error) {
      throw new Error(`Error retrieving claim details: ${error.message}`);
    }
  }

  /**
   * Get user claims
   */
  static async getUserClaims(userId, page = 1, limit = 20, status = null) {
    try {
      const skip = (page - 1) * limit;
      const query = { userId };

      if (status) {
        query.status = status;
      }

      const claims = await InsuranceClaim.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .select(
          'claimNumber incidentType estimatedAmount status submittedAt'
        )
        .lean();

      const total = await InsuranceClaim.countDocuments(query);

      return {
        success: true,
        data: claims,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error retrieving user claims: ${error.message}`);
    }
  }

  /**
   * Upload claim document/evidence
   */
  static async uploadClaimDocument(claimId, userId, documentData) {
    try {
      const {
        documentType, // 'photo', 'video', 'invoice', 'police_report', 'medical_report', 'other'
        documentUrl,
        description,
      } = documentData;

      // Verify claim ownership
      const claim = await InsuranceClaim.findOne({
        _id: claimId,
        userId,
      });

      if (!claim) {
        throw new Error('Claim not found');
      }

      // Add document
      claim.documents.push({
        documentType,
        documentUrl,
        description,
        uploadedAt: new Date(),
      });

      await claim.save();

      return {
        success: true,
        message: 'Document uploaded successfully',
        data: {
          claimId: claim._id,
          documentCount: claim.documents.length,
        },
      };
    } catch (error) {
      throw new Error(`Error uploading claim document: ${error.message}`);
    }
  }

  /**
   * Update claim status (admin/adjuster only)
   */
  static async updateClaimStatus(claimId, statusUpdate) {
    try {
      const {
        newStatus, // 'submitted', 'under_review', 'approved', 'rejected', 'paid'
        approvalAmount,
        rejectionReason,
        approverNotes,
      } = statusUpdate;

      const validStatuses = [
        'submitted',
        'under_review',
        'approved',
        'rejected',
        'paid',
      ];

      if (!validStatuses.includes(newStatus)) {
        return {
          success: false,
          message: 'Invalid status',
        };
      }

      const claim = await InsuranceClaim.findById(claimId);

      if (!claim) {
        throw new Error('Claim not found');
      }

      claim.status = newStatus;
      claim.lastUpdatedAt = new Date();

      if (newStatus === 'approved') {
        claim.approvalAmount = approvalAmount;
        claim.approvedAt = new Date();

        // Update policy
        const policy = await InsurancePolicy.findById(claim.policyId);
        if (policy) {
          policy.totalClaimAmount += approvalAmount;
          await policy.save();
        }
      } else if (newStatus === 'rejected') {
        claim.rejectionReason = rejectionReason;
        claim.rejectedAt = new Date();
      } else if (newStatus === 'paid') {
        claim.paidAt = new Date();
      }

      if (approverNotes) {
        claim.approverNotes = approverNotes;
      }

      await claim.save();

      return {
        success: true,
        message: 'Claim status updated successfully',
        data: {
          claimId: claim._id,
          status: claim.status,
          approvalAmount: claim.approvalAmount,
        },
      };
    } catch (error) {
      throw new Error(`Error updating claim status: ${error.message}`);
    }
  }

  /**
   * Get predefined insurance plans
   */
  static getPredefinedPlans() {
    return [
      {
        name: 'Basic Coverage',
        description: 'Essential protection for everyday rides',
        coverage: 'accident',
        monthlyPremium: 99,
        deductible: 500,
        maxCoverage: 50000,
        features: [
          'Accident coverage up to ₹50,000',
          'Medical expenses (in-ride)',
          '24/7 support line',
        ],
      },
      {
        name: 'Comprehensive Coverage',
        description: 'Full protection including theft and damage',
        coverage: 'accident,theft,damage',
        monthlyPremium: 199,
        deductible: 250,
        maxCoverage: 100000,
        features: [
          'Accident coverage up to ₹100,000',
          'Theft and loss coverage',
          'Vehicle damage coverage',
          'Medical expenses (up to ₹25,000)',
          'Legal support',
          'Priority claims processing',
        ],
      },
      {
        name: 'Premium Plus',
        description: 'Maximum coverage for corporate clients',
        coverage: 'accident,theft,damage,medical',
        monthlyPremium: 349,
        deductible: 100,
        maxCoverage: 250000,
        features: [
          'Accident coverage up to ₹250,000',
          'Full theft and loss coverage',
          'Complete vehicle damage coverage',
          'Medical expenses (up to ₹50,000)',
          'Legal support and consultation',
          'Priority claims (24-hour processing)',
          'Replacement ride coverage',
          'Dedicated claim manager',
        ],
      },
      {
        name: 'Budget Shield',
        description: 'Minimal coverage for budget-conscious riders',
        coverage: 'accident',
        monthlyPremium: 49,
        deductible: 1000,
        maxCoverage: 25000,
        features: [
          'Accident coverage up to ₹25,000',
          'Basic medical coverage',
          'Standard support (business hours)',
        ],
      },
    ];
  }

  /**
   * Check insurance eligibility for ride
   */
  static async checkInsuranceEligibility(userId, rideDetails) {
    try {
      const policy = await InsurancePolicy.findOne({
        userId,
        status: 'active',
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      });

      if (!policy) {
        return {
          success: false,
          eligible: false,
          message: 'No active insurance policy',
        };
      }

      // Check if policy covers ride type
      const coverage = policy.coverage.split(',');
      const rideType = rideDetails?.type || 'standard';

      return {
        success: true,
        eligible: true,
        policyId: policy._id,
        policyNumber: policy.policyNumber,
        coverage: coverage,
        maxCoverage: policy.planDetails?.maxCoverage || 100000,
      };
    } catch (error) {
      throw new Error(
        `Error checking insurance eligibility: ${error.message}`
      );
    }
  }

  /**
   * Get insurance statistics
   */
  static async getInsuranceStatistics(userId) {
    try {
      const policies = await InsurancePolicy.find({ userId }).lean();
      const claims = await InsuranceClaim.find({ userId }).lean();

      const activePolicy = policies.find((p) => p.status === 'active');
      const approvedClaims = claims.filter((c) => c.status === 'approved');
      const totalApprovedAmount = approvedClaims.reduce(
        (sum, c) => sum + (c.approvalAmount || 0),
        0
      );

      return {
        success: true,
        data: {
          activePolicies: policies.filter((p) => p.status === 'active').length,
          expiredPolicies: policies.filter((p) => p.status === 'expired').length,
          totalClaims: claims.length,
          approvedClaims: approvedClaims.length,
          pendingClaims: claims.filter((c) => c.status === 'submitted' || c.status === 'under_review')
            .length,
          totalApprovedAmount,
          nextPaymentDue: activePolicy?.nextPaymentDue || null,
        },
      };
    } catch (error) {
      throw new Error(`Error retrieving insurance statistics: ${error.message}`);
    }
  }
}

module.exports = InsuranceAndClaimsService;
