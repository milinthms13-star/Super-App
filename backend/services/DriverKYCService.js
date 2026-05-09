const DriverProfile = require('../models/DriverProfile');
const s3Service = require('./s3Service');

class DriverKYCService {
  /**
   * Upload document to S3
   */
  static async uploadDocument(file, documentType, driverId) {
    try {
      if (!file) {
        throw new Error('File is required');
      }

      const fileName = `kyc/${driverId}/${documentType}/${Date.now()}-${file.originalname}`;
      
      // Upload to S3 using existing s3Service
      const result = await s3Service.uploadFile({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'private'
      });

      return result.Location || result.url;
    } catch (error) {
      throw new Error(`Document upload failed: ${error.message}`);
    }
  }

  /**
   * Submit KYC documents
   */
  static async submitKYC(userId, documents) {
    try {
      const driverProfile = await DriverProfile.findOne({ userId });

      if (!driverProfile) {
        throw new Error('Driver profile not found');
      }

      // Check if all required documents are provided
      const requiredDocs = ['license', 'vehicle', 'insurance', 'pollution', 'selfie'];
      const missingDocs = requiredDocs.filter(doc => !documents[doc]);

      if (missingDocs.length > 0) {
        throw new Error(`Missing required documents: ${missingDocs.join(', ')}`);
      }

      // Update documents
      driverProfile.license.documentUrl = documents.license;
      driverProfile.license.verified = false;

      driverProfile.vehicle.registrationCertificate.documentUrl = documents.vehicle;
      driverProfile.vehicle.registrationCertificate.verified = false;

      driverProfile.insurance.documentUrl = documents.insurance;
      driverProfile.insurance.verified = false;

      driverProfile.pollutionCertificate.documentUrl = documents.pollution;
      driverProfile.pollutionCertificate.verified = false;

      driverProfile.faceVerification.selfieUrl = documents.selfie;
      driverProfile.faceVerification.status = 'pending';

      driverProfile.kycStatus = 'submitted';
      driverProfile.kycSubmittedDate = new Date();

      await driverProfile.save();

      return {
        success: true,
        message: 'KYC submitted successfully. Please wait for verification.',
        kycStatus: 'submitted',
        estimatedDays: 2
      };
    } catch (error) {
      throw new Error(`KYC submission failed: ${error.message}`);
    }
  }

  /**
   * Check KYC status
   */
  static async checkKYCStatus(userId) {
    try {
      const driverProfile = await DriverProfile.findOne({ userId });

      if (!driverProfile) {
        throw new Error('Driver profile not found');
      }

      const overallStatus = driverProfile.kycStatus;
      let completionPercentage = 0;

      // Calculate completion
      const checks = [
        driverProfile.license.documentUrl ? 1 : 0,
        driverProfile.vehicle.registrationCertificate.documentUrl ? 1 : 0,
        driverProfile.insurance.documentUrl ? 1 : 0,
        driverProfile.pollutionCertificate.documentUrl ? 1 : 0,
        driverProfile.faceVerification.selfieUrl ? 1 : 0
      ];

      completionPercentage = (checks.reduce((a, b) => a + b, 0) / checks.length) * 100;

      return {
        kycStatus: overallStatus,
        completionPercentage: Math.round(completionPercentage),
        backgroundCheck: driverProfile.backgroundCheck.status,
        faceVerification: driverProfile.faceVerification.status,
        documentsVerified: {
          license: driverProfile.license.verified,
          vehicle: driverProfile.vehicle.registrationCertificate.verified,
          insurance: driverProfile.insurance.verified,
          pollution: driverProfile.pollutionCertificate.verified
        },
        matchScore: driverProfile.faceVerification.matchScore,
        rejectionReason: driverProfile.kycRejectionReason || null,
        submittedDate: driverProfile.kycSubmittedDate,
        approvedDate: driverProfile.kycApprovedDate
      };
    } catch (error) {
      throw new Error(`Failed to check KYC status: ${error.message}`);
    }
  }

  /**
   * Approve KYC (Admin/Background verification service)
   */
  static async approveKYC(userId) {
    try {
      const driverProfile = await DriverProfile.findOne({ userId });

      if (!driverProfile) {
        throw new Error('Driver profile not found');
      }

      driverProfile.kycStatus = 'approved';
      driverProfile.kycApprovedDate = new Date();
      driverProfile.license.verified = true;
      driverProfile.vehicle.registrationCertificate.verified = true;
      driverProfile.insurance.verified = true;
      driverProfile.pollutionCertificate.verified = true;
      driverProfile.faceVerification.status = 'verified';
      driverProfile.backgroundCheck.status = 'approved';
      driverProfile.status = 'active';

      await driverProfile.save();

      return {
        success: true,
        message: 'KYC approved successfully',
        status: 'active'
      };
    } catch (error) {
      throw new Error(`KYC approval failed: ${error.message}`);
    }
  }

  /**
   * Reject KYC with reason
   */
  static async rejectKYC(userId, reason) {
    try {
      const driverProfile = await DriverProfile.findOne({ userId });

      if (!driverProfile) {
        throw new Error('Driver profile not found');
      }

      driverProfile.kycStatus = 'rejected';
      driverProfile.kycRejectionReason = reason;

      await driverProfile.save();

      return {
        success: true,
        message: 'KYC rejected',
        rejectionReason: reason
      };
    } catch (error) {
      throw new Error(`KYC rejection failed: ${error.message}`);
    }
  }

  /**
   * Update driver vehicle information
   */
  static async updateVehicleInfo(userId, vehicleData) {
    try {
      const driverProfile = await DriverProfile.findOne({ userId });

      if (!driverProfile) {
        throw new Error('Driver profile not found');
      }

      if (vehicleData.number) driverProfile.vehicle.number = vehicleData.number;
      if (vehicleData.type) driverProfile.vehicle.type = vehicleData.type;
      if (vehicleData.color) driverProfile.vehicle.color = vehicleData.color;
      if (vehicleData.model) driverProfile.vehicle.model = vehicleData.model;
      if (vehicleData.year) driverProfile.vehicle.manufacturingYear = vehicleData.year;

      await driverProfile.save();

      return {
        success: true,
        message: 'Vehicle information updated'
      };
    } catch (error) {
      throw new Error(`Vehicle update failed: ${error.message}`);
    }
  }

  /**
   * Get driver verification status summary
   */
  static async getVerificationSummary(userId) {
    try {
      const driverProfile = await DriverProfile.findOne({ userId });

      if (!driverProfile) {
        throw new Error('Driver profile not found');
      }

      const summary = {
        profile: {
          name: true,
          phone: true,
          profilePhoto: !!driverProfile.vehicle.number
        },
        documents: {
          drivingLicense: !!driverProfile.license.verified,
          vehicleRC: !!driverProfile.vehicle.registrationCertificate.verified,
          insurance: !!driverProfile.insurance.verified,
          pollutionCertificate: !!driverProfile.pollutionCertificate.verified
        },
        verification: {
          faceVerification: driverProfile.faceVerification.status === 'verified',
          backgroundCheck: driverProfile.backgroundCheck.status === 'approved',
          bankVerification: driverProfile.bankAccount.verificationStatus === 'verified'
        },
        status: driverProfile.status,
        kycStatus: driverProfile.kycStatus,
        canGoOnline: driverProfile.status === 'active' && driverProfile.kycStatus === 'approved'
      };

      return summary;
    } catch (error) {
      throw new Error(`Failed to get verification summary: ${error.message}`);
    }
  }
}

module.exports = DriverKYCService;
