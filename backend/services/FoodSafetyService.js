/**
 * Food Safety Service - Phase 9 Feature B
 * Compliance tracking, certifications, hygiene audits, FSSAI management
 */

const FoodSafetyCertification = require('../models/FoodSafetyCertification');

class FoodSafetyService {
  /**
   * Create food safety record for restaurant
   */
  static async createSafetyRecord(restaurantId) {
    try {
      const certificationId = `FSAFE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const safety = new FoodSafetyCertification({
        certificationId,
        restaurantId,
      });

      await safety.save();

      return {
        success: true,
        data: safety,
        message: 'Food safety record created',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Update FSSAI certification
   */
  static async updateFSSAICertification(restaurantId, fssaiData) {
    try {
      const safety = await FoodSafetyCertification.findOne({ restaurantId });
      if (!safety) {
        return { success: false, message: 'Food safety record not found' };
      }

      safety.fssai = {
        registered: fssaiData.registered,
        licenseNumber: fssaiData.licenseNumber,
        licenseIssueDate: fssaiData.licenseIssueDate,
        licenseExpiryDate: fssaiData.licenseExpiryDate,
        isActive: new Date() < new Date(fssaiData.licenseExpiryDate),
        certificateUrl: fssaiData.certificateUrl,
        verifiedAt: new Date(),
      };

      await safety.save();

      return {
        success: true,
        data: safety,
        message: 'FSSAI certification updated',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Record hygiene inspection
   */
  static async recordHygieneInspection(restaurantId, inspectionData) {
    try {
      const safety = await FoodSafetyCertification.findOne({ restaurantId });
      if (!safety) {
        return { success: false, message: 'Food safety record not found' };
      }

      safety.hygieneCompliance = {
        lastInspectionDate: new Date(),
        nextInspectionDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        inspectionScore: inspectionData.inspectionScore,
        kitchenCleanliness: inspectionData.kitchenCleanliness,
        staffHygiene: inspectionData.staffHygiene,
        storageConditions: inspectionData.storageConditions,
        wasteManagement: inspectionData.wasteManagement,
        overallHygieneScore:
          (inspectionData.kitchenCleanliness +
            inspectionData.staffHygiene +
            inspectionData.storageConditions +
            inspectionData.wasteManagement) /
          4,
        violations: inspectionData.violations || [],
      };

      await safety.save();

      return {
        success: true,
        data: safety,
        message: 'Hygiene inspection recorded',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Update staff training records
   */
  static async updateStaffTraining(restaurantId, trainingData) {
    try {
      const safety = await FoodSafetyCertification.findOne({ restaurantId });
      if (!safety) {
        return { success: false, message: 'Food safety record not found' };
      }

      safety.staffTraining = {
        foodHandlersCertified: trainingData.foodHandlersCertified,
        sanitationSpecialistsCertified: trainingData.sanitationSpecialistsCertified,
        lastTrainingDate: new Date(),
        trainingFrequency: trainingData.trainingFrequency,
        trainingDocumentation: trainingData.trainingDocumentation || [],
      };

      await safety.save();

      return {
        success: true,
        data: safety,
        message: 'Staff training updated',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Record quality control test
   */
  static async recordQualityTest(restaurantId, testData) {
    try {
      const safety = await FoodSafetyCertification.findOne({ restaurantId });
      if (!safety) {
        return { success: false, message: 'Food safety record not found' };
      }

      const testRecord = {
        testDate: new Date(),
        testType: testData.testType,
        status: testData.status,
        labName: testData.labName,
        results: testData.results,
      };

      safety.qualityControl.testResults.push(testRecord);
      safety.qualityControl.lastTestDate = new Date();

      await safety.save();

      return {
        success: true,
        data: safety,
        message: 'Quality test recorded',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Record complaint
   */
  static async recordComplaint(restaurantId, complaintData) {
    try {
      const safety = await FoodSafetyCertification.findOne({ restaurantId });
      if (!safety) {
        return { success: false, message: 'Food safety record not found' };
      }

      const complaintId = `COMP-${Date.now()}`;

      safety.complaints.push({
        complaintId,
        type: complaintData.type,
        dateReported: new Date(),
        description: complaintData.description,
        status: 'open',
      });

      await safety.save();

      return {
        success: true,
        data: safety,
        message: 'Complaint recorded',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Calculate overall compliance score
   */
  static async calculateComplianceScore(restaurantId) {
    try {
      const safety = await FoodSafetyCertification.findOne({ restaurantId });
      if (!safety) {
        return { success: false, message: 'Food safety record not found' };
      }

      // Compliance scoring: FSSAI (20%) + Hygiene (25%) + Staff (20%) + QC (20%) + Complaints (15%)
      let score = 0;

      // FSSAI compliance (20 points)
      if (safety.fssai && safety.fssai.registered && safety.fssai.isActive) {
        score += 20;
      }

      // Hygiene compliance (25 points)
      if (safety.hygieneCompliance && safety.hygieneCompliance.overallHygieneScore) {
        score += (safety.hygieneCompliance.overallHygieneScore / 5) * 25;
      }

      // Staff training (20 points)
      if (safety.staffTraining && safety.staffTraining.foodHandlersCertified > 0) {
        score += 20;
      }

      // Quality control (20 points)
      if (safety.qualityControl && safety.qualityControl.microbiologicalTesting) {
        const passTests = safety.qualityControl.testResults.filter((t) => t.status === 'pass').length;
        score += (passTests / Math.max(safety.qualityControl.testResults.length, 1)) * 20;
      }

      // Complaints impact (15 points - deduct for complaints)
      const recentComplaints = safety.complaints.filter((c) => c.status === 'open').length;
      score += Math.max(0, 15 - recentComplaints * 3);

      safety.overallComplianceScore = Math.min(100, score);

      // Assign rating
      if (safety.overallComplianceScore >= 90) {
        safety.complianceRating = 'A';
      } else if (safety.overallComplianceScore >= 80) {
        safety.complianceRating = 'B';
      } else if (safety.overallComplianceScore >= 70) {
        safety.complianceRating = 'C';
      } else if (safety.overallComplianceScore >= 60) {
        safety.complianceRating = 'D';
      } else {
        safety.complianceRating = 'F';
      }

      await safety.save();

      return {
        success: true,
        data: {
          overallComplianceScore: safety.overallComplianceScore,
          complianceRating: safety.complianceRating,
        },
        message: 'Compliance score calculated',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get compliance details
   */
  static async getComplianceDetails(restaurantId) {
    try {
      const safety = await FoodSafetyCertification.findOne({ restaurantId });
      if (!safety) {
        return { success: false, message: 'Food safety record not found' };
      }

      return {
        success: true,
        data: {
          restaurantId,
          fssai: safety.fssai,
          hygiene: safety.hygieneCompliance,
          staffTraining: safety.staffTraining,
          overallScore: safety.overallComplianceScore,
          rating: safety.complianceRating,
          complaints: safety.complaints,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Check if restaurant is compliant
   */
  static async isCompliant(restaurantId) {
    try {
      const safety = await FoodSafetyCertification.findOne({ restaurantId });
      if (!safety) {
        return { success: false, message: 'Food safety record not found' };
      }

      const isCompliant = safety.complianceStatus === 'compliant' && safety.complianceRating !== 'F';

      return {
        success: true,
        data: {
          isCompliant,
          score: safety.overallComplianceScore,
          rating: safety.complianceRating,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }
}

module.exports = FoodSafetyService;
