const HealthcareDoctor = require('../models/healthcare/HealthcareDoctor');
const HealthcareAppointment = require('../models/healthcare/HealthcareAppointment');
const HealthcareLicenseVerification = require('../models/healthcare/HealthcareLicenseVerification');
const HealthcareInformedConsent = require('../models/healthcare/HealthcareInformedConsent');

/**
 * Verify doctor's medical license and credentials
 * @param {string} doctorId - Doctor ID to verify
 * @param {Object} options - Verification options
 * @returns {Object} Verification result
 */
const verifyDoctorLicense = async (doctorId, options = {}) => {
  try {
    const doctor = await HealthcareDoctor.findById(doctorId);
    if (!doctor) {
      return {
        verified: false,
        status: 'not_found',
        message: 'Doctor not found',
      };
    }

    // Check if license verification record exists
    let verification = await HealthcareLicenseVerification.findOne({
      doctorId,
      licenseType: 'medical',
    }).sort({ verifiedAt: -1 });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // If verification is older than 30 days or doesn't exist, re-verify
    if (!verification || new Date(verification.verifiedAt) < thirtyDaysAgo) {
      // In production, this would call external verification APIs (e.g., Medical Council API)
      const mockVerificationResult = {
        verified: true,
        licenseNumber: doctor.licenseNumber || `LIC-${doctorId.slice(-6).toUpperCase()}`,
        issuingAuthority: 'State Medical Council',
        issueDate: doctor.certificationDate || new Date(2015, 0, 1),
        expiryDate: new Date(now.getFullYear() + 2, 11, 31),
        status: 'active',
        restrictions: [],
      };

      verification = await HealthcareLicenseVerification.create({
        doctorId,
        licenseType: 'medical',
        licenseNumber: mockVerificationResult.licenseNumber,
        issuingAuthority: mockVerificationResult.issuingAuthority,
        issueDate: mockVerificationResult.issueDate,
        expiryDate: mockVerificationResult.expiryDate,
        verificationStatus: mockVerificationResult.verified ? 'verified' : 'failed',
        verifiedAt: now,
        restrictions: mockVerificationResult.restrictions,
        metadata: {
          verificationMethod: 'automated',
          source: 'mock_medical_council_api',
        },
      });
    }

    return {
      verified: verification.verificationStatus === 'verified',
      status: verification.verificationStatus,
      licenseNumber: verification.licenseNumber,
      issuingAuthority: verification.issuingAuthority,
      expiryDate: verification.expiryDate,
      restrictions: verification.restrictions || [],
      lastVerified: verification.verifiedAt,
      message: verification.verificationStatus === 'verified'
        ? 'License verified successfully'
        : 'License verification failed',
    };
  } catch (error) {
    console.error('[TelemedicineComplianceService] License verification error:', error);
    return {
      verified: false,
      status: 'error',
      message: error.message,
    };
  }
};

/**
 * Check state-specific telemedicine restrictions
 * @param {string} doctorId - Doctor ID
 * @param {string} patientState - Patient's state/region
 * @param {string} consultationType - Type of consultation
 * @returns {Object} Compliance check result
 */
const checkStateRestrictions = async (doctorId, patientState, consultationType = 'video') => {
  try {
    const doctor = await HealthcareDoctor.findById(doctorId);
    if (!doctor) {
      return {
        compliant: false,
        message: 'Doctor not found',
        restrictions: [],
      };
    }

    // State-specific telemedicine rules (simplified for demo)
    const stateRules = {
      'Kerala': {
        allowedConsultationTypes: ['video', 'audio', 'chat'],
        requiresInPersonVisit: false,
        prescriptionRestrictions: ['controlled_substances'],
        minConsultationDuration: 10, // minutes
      },
      'Karnataka': {
        allowedConsultationTypes: ['video', 'audio'],
        requiresInPersonVisit: false,
        prescriptionRestrictions: ['controlled_substances', 'psychotropic'],
        minConsultationDuration: 15,
      },
      'Tamil Nadu': {
        allowedConsultationTypes: ['video'],
        requiresInPersonVisit: true, // First visit must be in-person
        prescriptionRestrictions: ['controlled_substances', 'narcotics'],
        minConsultationDuration: 15,
      },
      'Maharashtra': {
        allowedConsultationTypes: ['video', 'audio', 'chat'],
        requiresInPersonVisit: false,
        prescriptionRestrictions: ['controlled_substances'],
        minConsultationDuration: 10,
      },
      'Delhi': {
        allowedConsultationTypes: ['video', 'audio'],
        requiresInPersonVisit: false,
        prescriptionRestrictions: ['controlled_substances', 'psychotropic'],
        minConsultationDuration: 12,
      },
    };

    const rules = stateRules[patientState] || {
      allowedConsultationTypes: ['video'],
      requiresInPersonVisit: false,
      prescriptionRestrictions: ['controlled_substances'],
      minConsultationDuration: 10,
    };

    // Check if doctor is licensed to practice in patient's state
    const doctorStates = Array.isArray(doctor.states) ? doctor.states : [doctor.state];
    const canPracticeInState = doctorStates.includes(patientState) || doctorStates.includes('All India');

    if (!canPracticeInState) {
      return {
        compliant: false,
        message: `Doctor is not licensed to practice in ${patientState}`,
        restrictions: ['cross_state_practice_not_allowed'],
        allowedStates: doctorStates,
      };
    }

    // Check consultation type restrictions
    if (!rules.allowedConsultationTypes.includes(consultationType)) {
      return {
        compliant: false,
        message: `${consultationType} consultations are not permitted in ${patientState}`,
        restrictions: [`${consultationType}_not_allowed`],
        allowedTypes: rules.allowedConsultationTypes,
      };
    }

    return {
      compliant: true,
      message: 'Consultation is compliant with state regulations',
      stateRules: rules,
      doctorLicensedStates: doctorStates,
    };
  } catch (error) {
    console.error('[TelemedicineComplianceService] State restriction check error:', error);
    return {
      compliant: false,
      message: error.message,
      restrictions: ['error_checking_compliance'],
    };
  }
};

/**
 * Create informed consent record
 * @param {Object} consentData - Consent information
 * @returns {Object} Created consent record
 */
const createInformedConsent = async (consentData) => {
  try {
    const {
      userId,
      appointmentId,
      doctorId,
      consentType = 'telemedicine',
      consentText,
      patientSignature,
      witnessName,
      witnessSignature,
    } = consentData;

    const consent = await HealthcareInformedConsent.create({
      userId,
      appointmentId,
      doctorId,
      consentType,
      consentText: consentText || getDefaultConsentText(consentType),
      patientSignature,
      witnessName,
      witnessSignature,
      consentGrantedAt: new Date(),
      consentStatus: 'active',
      version: '1.0',
      metadata: {
        ipAddress: consentData.ipAddress,
        userAgent: consentData.userAgent,
        location: consentData.location,
      },
    });

    // Update appointment with consent reference
    if (appointmentId) {
      await HealthcareAppointment.findByIdAndUpdate(appointmentId, {
        consentId: consent._id,
        consentGranted: true,
      });
    }

    return {
      id: consent._id,
      consentType: consent.consentType,
      consentGrantedAt: consent.consentGrantedAt,
      consentStatus: consent.consentStatus,
      message: 'Informed consent recorded successfully',
    };
  } catch (error) {
    console.error('[TelemedicineComplianceService] Informed consent creation error:', error);
    throw error;
  }
};

/**
 * Verify informed consent exists and is valid
 * @param {string} appointmentId - Appointment ID
 * @returns {Object} Consent verification result
 */
const verifyInformedConsent = async (appointmentId) => {
  try {
    const consent = await HealthcareInformedConsent.findOne({
      appointmentId,
      consentStatus: 'active',
    });

    if (!consent) {
      return {
        valid: false,
        message: 'No active informed consent found for this appointment',
      };
    }

    const now = new Date();
    const consentAge = now - new Date(consent.consentGrantedAt);
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

    // Consent is valid for 30 days
    if (consentAge > thirtyDaysInMs) {
      return {
        valid: false,
        message: 'Informed consent has expired (older than 30 days)',
        consentGrantedAt: consent.consentGrantedAt,
        expiresAt: new Date(new Date(consent.consentGrantedAt).getTime() + thirtyDaysInMs),
      };
    }

    return {
      valid: true,
      message: 'Valid informed consent found',
      consentId: consent._id,
      consentType: consent.consentType,
      consentGrantedAt: consent.consentGrantedAt,
      expiresAt: new Date(new Date(consent.consentGrantedAt).getTime() + thirtyDaysInMs),
    };
  } catch (error) {
    console.error('[TelemedicineComplianceService] Consent verification error:', error);
    return {
      valid: false,
      message: error.message,
    };
  }
};

/**
 * Revoke informed consent
 * @param {string} consentId - Consent ID to revoke
 * @param {Object} options - Revocation options
 * @returns {Object} Revocation result
 */
const revokeInformedConsent = async (consentId, options = {}) => {
  try {
    const consent = await HealthcareInformedConsent.findByIdAndUpdate(
      consentId,
      {
        consentStatus: 'revoked',
        revokedAt: new Date(),
        revocationReason: options.reason || 'Patient requested revocation',
      },
      { new: true }
    );

    if (!consent) {
      return {
        success: false,
        message: 'Consent record not found',
      };
    }

    // Update associated appointment
    if (consent.appointmentId) {
      await HealthcareAppointment.findByIdAndUpdate(consent.appointmentId, {
        consentGranted: false,
      });
    }

    return {
      success: true,
      message: 'Informed consent revoked successfully',
      revokedAt: consent.revokedAt,
    };
  } catch (error) {
    console.error('[TelemedicineComplianceService] Consent revocation error:', error);
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Perform comprehensive compliance check before consultation
 * @param {Object} checkData - Data for compliance check
 * @returns {Object} Compliance check result
 */
const performComplianceCheck = async (checkData) => {
  try {
    const {
      doctorId,
      appointmentId,
      patientState,
      consultationType = 'video',
    } = checkData;

    const results = {
      compliant: true,
      checks: [],
      warnings: [],
      errors: [],
    };

    // 1. Verify doctor license
    const licenseCheck = await verifyDoctorLicense(doctorId);
    results.checks.push({
      name: 'License Verification',
      status: licenseCheck.verified ? 'passed' : 'failed',
      details: licenseCheck,
    });

    if (!licenseCheck.verified) {
      results.compliant = false;
      results.errors.push('Doctor license verification failed');
    }

    // 2. Check state restrictions
    const stateCheck = await checkStateRestrictions(doctorId, patientState, consultationType);
    results.checks.push({
      name: 'State Compliance',
      status: stateCheck.compliant ? 'passed' : 'failed',
      details: stateCheck,
    });

    if (!stateCheck.compliant) {
      results.compliant = false;
      results.errors.push(stateCheck.message);
    }

    // 3. Verify informed consent
    if (appointmentId) {
      const consentCheck = await verifyInformedConsent(appointmentId);
      results.checks.push({
        name: 'Informed Consent',
        status: consentCheck.valid ? 'passed' : 'failed',
        details: consentCheck,
      });

      if (!consentCheck.valid) {
        results.compliant = false;
        results.errors.push('Valid informed consent required');
      }
    }

    return results;
  } catch (error) {
    console.error('[TelemedicineComplianceService] Compliance check error:', error);
    return {
      compliant: false,
      checks: [],
      warnings: [],
      errors: [error.message],
    };
  }
};

/**
 * Generate compliance report for audit purposes
 * @param {Object} options - Report options
 * @returns {Object} Compliance report
 */
const generateComplianceReport = async (options = {}) => {
  try {
    const { startDate, endDate, doctorId } = options;

    const query = {};
    if (doctorId) {
      query.doctorId = doctorId;
    }
    if (startDate || endDate) {
      query.appointmentDate = {};
      if (startDate) query.appointmentDate.$gte = startDate;
      if (endDate) query.appointmentDate.$lte = endDate;
    }

    const appointments = await HealthcareAppointment.find(query).limit(100);

    const report = {
      period: {
        startDate: startDate || 'N/A',
        endDate: endDate || 'N/A',
      },
      totalAppointments: appointments.length,
      complianceStats: {
        withValidConsent: 0,
        withoutConsent: 0,
        licensedDoctors: 0,
        unlicensedDoctors: 0,
      },
      violations: [],
      recommendations: [],
    };

    // Analyze appointments for compliance
    for (const appointment of appointments) {
      // Check consent
      const consentCheck = await verifyInformedConsent(appointment._id);
      if (consentCheck.valid) {
        report.complianceStats.withValidConsent++;
      } else {
        report.complianceStats.withoutConsent++;
        report.violations.push({
          appointmentId: appointment._id,
          issue: 'Missing or invalid informed consent',
          severity: 'high',
        });
      }

      // Check doctor license
      if (appointment.doctorId) {
        const licenseCheck = await verifyDoctorLicense(appointment.doctorId);
        if (licenseCheck.verified) {
          report.complianceStats.licensedDoctors++;
        } else {
          report.complianceStats.unlicensedDoctors++;
          report.violations.push({
            appointmentId: appointment._id,
            doctorId: appointment.doctorId,
            issue: 'Doctor license verification failed',
            severity: 'critical',
          });
        }
      }
    }

    // Generate recommendations
    if (report.complianceStats.withoutConsent > 0) {
      report.recommendations.push({
        priority: 'high',
        message: `${report.complianceStats.withoutConsent} appointment(s) lack valid informed consent. Implement mandatory consent collection before consultations.`,
      });
    }

    if (report.complianceStats.unlicensedDoctors > 0) {
      report.recommendations.push({
        priority: 'critical',
        message: `${report.complianceStats.unlicensedDoctors} appointment(s) involve doctors with unverified licenses. Suspend consultations until verification is complete.`,
      });
    }

    report.generatedAt = new Date();
    return report;
  } catch (error) {
    console.error('[TelemedicineComplianceService] Report generation error:', error);
    throw error;
  }
};

/**
 * Get default consent text for different consent types
 * @param {string} consentType - Type of consent
 * @returns {string} Default consent text
 */
function getDefaultConsentText(consentType) {
  const templates = {
    telemedicine: `I hereby consent to participate in a telemedicine consultation with a healthcare provider. I understand that:
1. Telemedicine involves the use of electronic communications to enable healthcare providers to diagnose, treat, and provide care.
2. Technical difficulties may occur before or during the consultation.
3. My healthcare information may be shared with other individuals for scheduling and billing purposes.
4. I have the right to withhold or withdraw consent at any time without affecting my right to future care or treatment.
5. The laws that protect the privacy and confidentiality of medical information also apply to telemedicine.

I have read and understood the information provided above and consent to the use of telemedicine in my care.`,
    
    data_sharing: `I consent to the collection, storage, and processing of my health information for the purposes of:
1. Providing healthcare services
2. Improving quality of care
3. Research and analytics (anonymized)
4. Legal and regulatory compliance

I understand I can revoke this consent at any time by contacting the healthcare provider.`,
    
    treatment: `I consent to the proposed treatment plan as discussed with my healthcare provider. I have been informed of:
1. The nature of the treatment
2. Expected benefits and outcomes
3. Potential risks and side effects
4. Alternative treatment options
5. Consequences of not pursuing treatment

I have had the opportunity to ask questions and all my questions have been answered to my satisfaction.`,
  };

  return templates[consentType] || templates.telemedicine;
}

module.exports = {
  verifyDoctorLicense,
  checkStateRestrictions,
  createInformedConsent,
  verifyInformedConsent,
  revokeInformedConsent,
  performComplianceCheck,
  generateComplianceReport,
};
