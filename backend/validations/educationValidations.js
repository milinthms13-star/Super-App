const Joi = require('joi');

// Education State Validation
const validateEducationState = (data) => {
  const schema = Joi.object({
    enrolledCourseIds: Joi.array().items(Joi.string().trim()).default([]),
    appliedScholarships: Joi.array().items(Joi.string().trim()).default([]),
    joinedGroups: Joi.array().items(Joi.string().trim()).default([]),
    courseProgress: Joi.object().pattern(Joi.string(), Joi.number().min(0).max(100)).default({}),
    roleProfile: Joi.object({
      primaryRole: Joi.string().valid('student', 'parent', 'tutor', 'institute_admin').default('student'),
      studentName: Joi.string().trim().allow('').default(''),
      classLevel: Joi.string().trim().allow('').default(''),
      targetExam: Joi.string().trim().allow('').default(''),
      preferredLanguage: Joi.string().trim().default('English'),
      careerGoal: Joi.string().trim().allow('').default(''),
    }).default(),
    interventionsDismissed: Joi.array().items(Joi.string().trim()).default([]),
  });

  return schema.validate(data, { stripUnknown: true });
};

// Enrollment Validation
const validateEnrollment = (data) => {
  const schema = Joi.object({
    courseId: Joi.string().trim().required(),
    courseTitle: Joi.string().trim().required(),
    amount: Joi.number().min(0).required(),
    paymentMethod: Joi.string().trim().default('upi'),
    paymentGateway: Joi.string().trim().default('razorpay'),
  });

  return schema.validate(data, { stripUnknown: true });
};

// Tuition Request Validation
const validateTuitionRequest = (data) => {
  const schema = Joi.object({
    subject: Joi.string().trim().required(),
    classLevel: Joi.string().trim().required(),
    contactPhone: Joi.string()
      .trim()
      .pattern(/^[0-9]{10,15}$/)
      .allow('')
      .messages({
        'string.pattern.base': 'Contact phone must be a valid phone number (10-15 digits)',
      }),
    preferredMode: Joi.string().trim().valid('online', 'offline', 'hybrid').default('online'),
    preferredTime: Joi.string().trim().allow('').default(''),
    details: Joi.string().trim().max(1000).allow('').default(''),
  });

  return schema.validate(data, { stripUnknown: true });
};

// Scholarship Application Validation
const validateScholarship = (data) => {
  const schema = Joi.object({
    scholarshipName: Joi.string().trim().required(),
  });

  return schema.validate(data, { stripUnknown: true });
};

// Community Group Validation
const validateCommunityGroup = (data) => {
  const schema = Joi.object({
    groupTitle: Joi.string().trim().required(),
  });

  return schema.validate(data, { stripUnknown: true });
};

// Role Profile Validation
const validateRoleProfile = (data) => {
  const schema = Joi.object({
    primaryRole: Joi.string().valid('student', 'parent', 'tutor', 'institute_admin').required(),
    studentName: Joi.string().trim().allow('').default(''),
    classLevel: Joi.string().trim().allow('').default(''),
    targetExam: Joi.string().trim().allow('').default(''),
    preferredLanguage: Joi.string().trim().default('English'),
    careerGoal: Joi.string().trim().allow('').default(''),
    idempotencyKey: Joi.string().trim().optional(),
  });

  return schema.validate(data, { stripUnknown: true });
};

// Progress Event Validation
const validateProgressEvent = (data) => {
  const schema = Joi.object({
    courseId: Joi.string().trim().required(),
    eventType: Joi.string().trim().default('progress_adjustment'),
    progressDelta: Joi.number().min(-100).max(100).required(),
  });

  return schema.validate(data, { stripUnknown: true });
};

// Certificate Upload Validation
const validateCertificateUpload = (data) => {
  const schema = Joi.object({
    title: Joi.string().trim().min(3).max(200).required(),
    issuer: Joi.string().trim().max(200).allow('').default(''),
    completedOn: Joi.date().max('now').required(),
    credentialId: Joi.string().trim().max(100).allow('').default(''),
  });

  return schema.validate(data, { stripUnknown: true });
};

// Certificate Verification Validation
const validateCertificateVerification = (data) => {
  const schema = Joi.object({
    verificationStatus: Joi.string().valid('uploaded', 'verified', 'rejected').required(),
    verificationNote: Joi.string().trim().max(500).allow('').default(''),
    idempotencyKey: Joi.string().trim().optional(),
  });

  return schema.validate(data, { stripUnknown: true });
};

// Test Submission Validation
const validateTestSubmission = (data) => {
  const schema = Joi.object({
    category: Joi.string().trim().required(),
    answers: Joi.array()
      .items(
        Joi.object({
          questionId: Joi.string().trim().required(),
          selectedIndex: Joi.number().min(0).required(),
        })
      )
      .min(1)
      .required(),
  });

  return schema.validate(data, { stripUnknown: true });
};

// Tuition Status Update Validation
const validateTuitionStatusUpdate = (data) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid('submitted', 'matched', 'trial_scheduled', 'trial_completed', 'booked', 'in_progress', 'completed', 'cancelled')
      .required(),
    note: Joi.string().trim().max(500).allow('').default(''),
  });

  return schema.validate(data, { stripUnknown: true });
};

// Tuition Session Validation
const validateTuitionSession = (data) => {
  const schema = Joi.object({
    scheduledAt: Joi.date().min('now').required(),
    durationMinutes: Joi.number().min(15).max(240).default(60),
    agenda: Joi.string().trim().max(500).allow('').default(''),
    idempotencyKey: Joi.string().trim().optional(),
  });

  return schema.validate(data, { stripUnknown: true });
};

// Session Attendance Validation
const validateSessionAttendance = (data) => {
  const schema = Joi.object({
    attendanceStatus: Joi.string().valid('pending', 'attended', 'missed', 'rescheduled').required(),
    idempotencyKey: Joi.string().trim().optional(),
  });

  return schema.validate(data, { stripUnknown: true });
};

module.exports = {
  validateEducationState,
  validateEnrollment,
  validateTuitionRequest,
  validateScholarship,
  validateCommunityGroup,
  validateRoleProfile,
  validateProgressEvent,
  validateCertificateUpload,
  validateCertificateVerification,
  validateTestSubmission,
  validateTuitionStatusUpdate,
  validateTuitionSession,
  validateSessionAttendance,
};
