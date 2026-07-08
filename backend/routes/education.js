const express = require('express');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const { educationRateLimiter } = require('../middleware/rateLimiters');
const EducationState = require('../models/EducationState');
const EducationEnrollment = require('../models/EducationEnrollment');
const EducationScholarshipApplication = require('../models/EducationScholarshipApplication');
const EducationCommunityMembership = require('../models/EducationCommunityMembership');
const EducationTuitionRequest = require('../models/EducationTuitionRequest');
const EducationLearningEvent = require('../models/EducationLearningEvent');
const SkillCourse = require('../models/SkillCourse');
const SkillCertificate = require('../models/SkillCertificate');
const SkillTestResult = require('../models/SkillTestResult');
const Payment = require('../models/Payment');
const {
  validateEducationState,
  validateEnrollment,
  validateTuitionRequest,
  validateScholarship,
  validateCommunityGroup,
  validateRoleProfile,
  validateProgressEvent,
  validateCertificateUpload,
  validateTestSubmission,
} = require('../validations/educationValidations');
const {
  getSkillLearningCourses,
  getCourseById,
  getQuestionBank,
  GOVT_PORTALS,
} = require('../data/skillLearningData');
const {
  EDUCATION_SCHOLARSHIPS,
  EDUCATION_GOVERNMENT_SCHEMES,
  EDUCATION_CANVA_TEMPLATES,
  EDUCATION_CANVA_CAMPAIGN_SIZES,
} = require('../data/educationData');
const {
  calculateOutcomeMetrics,
  generateInterventions,
  calculateKPIHealth,
  matchTutors,
  buildCanvaToolkit,
  buildLearningPath,
} = require('../services/educationService');
const { createRazorpayOrder, verifyRazorpaySignature } = require('../services/paymentService');
const logger = require('../config/logger');

const router = express.Router();

// Helper to normalize education state
const normalizeEducationState = (state = {}) => ({
  enrolledCourseIds: Array.isArray(state.enrolledCourseIds) ? state.enrolledCourseIds : [],
  appliedScholarships: Array.isArray(state.appliedScholarships) ? state.appliedScholarships : [],
  joinedGroups: Array.isArray(state.joinedGroups) ? state.joinedGroups : [],
  courseProgress: state.courseProgress instanceof Map ? state.courseProgress : new Map(Object.entries(state.courseProgress || {})),
  roleProfile: state.roleProfile || {
    primaryRole: 'student',
    studentName: '',
    classLevel: '',
    targetExam: '',
    preferredLanguage: 'English',
    careerGoal: '',
  },
  interventionsDismissed: Array.isArray(state.interventionsDismissed) ? state.interventionsDismissed : [],
});

// GET /api/education/state - Get user education state
router.get('/state', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    let educationState = await EducationState.findOne({ userEmail });

    if (!educationState) {
      educationState = new EducationState({
        userEmail,
        enrolledCourseIds: [],
        appliedScholarships: [],
        joinedGroups: [],
        courseProgress: new Map(),
        roleProfile: {
          primaryRole: 'student',
          studentName: '',
          classLevel: '',
          targetExam: '',
          preferredLanguage: 'English',
          careerGoal: '',
        },
        interventionsDismissed: [],
      });
      await educationState.save();
    }

    const state = {
      enrolledCourseIds: educationState.enrolledCourseIds,
      appliedScholarships: educationState.appliedScholarships,
      joinedGroups: educationState.joinedGroups,
      courseProgress: Object.fromEntries(educationState.courseProgress),
      roleProfile: educationState.roleProfile,
      interventionsDismissed: educationState.interventionsDismissed,
    };

    res.json({ success: true, data: { state } });
  } catch (error) {
    logger.error('Error fetching education state:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch education state' });
  }
});

// PATCH /api/education/state - Update user education state
router.patch('/state', authenticate, async (req, res) => {
  try {
    const { error, value } = validateEducationState(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const userEmail = req.user.email;
    const updates = normalizeEducationState(value);

    const educationState = await EducationState.findOneAndUpdate(
      { userEmail },
      {
        $set: {
          enrolledCourseIds: updates.enrolledCourseIds,
          appliedScholarships: updates.appliedScholarships,
          joinedGroups: updates.joinedGroups,
          courseProgress: updates.courseProgress,
          roleProfile: updates.roleProfile,
          interventionsDismissed: updates.interventionsDismissed,
        },
      },
      { new: true, upsert: true }
    );

    const state = {
      enrolledCourseIds: educationState.enrolledCourseIds,
      appliedScholarships: educationState.appliedScholarships,
      joinedGroups: educationState.joinedGroups,
      courseProgress: Object.fromEntries(educationState.courseProgress),
      roleProfile: educationState.roleProfile,
      interventionsDismissed: educationState.interventionsDismissed,
    };

    res.json({ success: true, data: { state } });
  } catch (error) {
    logger.error('Error updating education state:', error);
    res.status(500).json({ success: false, error: 'Failed to update education state' });
  }
});

// GET /api/education/discovery - Get scholarships and government schemes
router.get('/discovery', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        scholarships: EDUCATION_SCHOLARSHIPS,
        governmentSchemes: EDUCATION_GOVERNMENT_SCHEMES,
      },
    });
  } catch (error) {
    logger.error('Error fetching education discovery:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch discovery data' });
  }
});

// GET /api/education/learning-path - Get personalized learning path
router.get('/learning-path', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const educationState = await EducationState.findOne({ userEmail });

    const learningPath = await buildLearningPath(educationState);

    res.json({
      success: true,
      data: {
        path: learningPath.path,
        recommendations: learningPath.recommendations,
        weakAreas: learningPath.weakAreas,
        enrolledCourseIds: educationState?.enrolledCourseIds || [],
      },
    });
  } catch (error) {
    logger.error('Error fetching learning path:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch learning path' });
  }
});

// GET /api/education/overview360 - Get 360 dashboard data
router.get('/overview360', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const educationState = await EducationState.findOne({ userEmail });

    const outcomeMetrics = await calculateOutcomeMetrics(userEmail);
    const interventions = await generateInterventions(educationState, outcomeMetrics);
    const canvaToolkit = await buildCanvaToolkit();

    const state = educationState
      ? {
          enrolledCourseIds: educationState.enrolledCourseIds,
          appliedScholarships: educationState.appliedScholarships,
          joinedGroups: educationState.joinedGroups,
          courseProgress: Object.fromEntries(educationState.courseProgress),
          roleProfile: educationState.roleProfile,
          interventionsDismissed: educationState.interventionsDismissed,
        }
      : null;

    res.json({
      success: true,
      data: {
        state,
        outcomeMetrics,
        interventions,
        canvaToolkit,
      },
    });
  } catch (error) {
    logger.error('Error fetching 360 overview:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch 360 overview' });
  }
});

// GET /api/education/kpis - Get KPI health metrics
router.get('/kpis', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const outcomeMetrics = await calculateOutcomeMetrics(userEmail);
    const kpiHealth = calculateKPIHealth(outcomeMetrics);

    res.json({
      success: true,
      data: {
        metrics: outcomeMetrics,
        kpiHealth,
      },
    });
  } catch (error) {
    logger.error('Error fetching KPIs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch KPI metrics' });
  }
});

// GET /api/education/canva-kit - Get Canva toolkit
router.get('/canva-kit', authenticate, async (req, res) => {
  try {
    const canvaToolkit = await buildCanvaToolkit();

    res.json({
      success: true,
      data: { canvaToolkit },
    });
  } catch (error) {
    logger.error('Error fetching Canva kit:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch Canva kit' });
  }
});

// POST /api/education/enroll - Enroll in a course
router.post('/enroll', authenticate, async (req, res) => {
  try {
    const { error, value } = validateEnrollment(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { courseId, courseTitle, amount, paymentMethod, paymentGateway } = value;
    const userEmail = req.user.email;

    // Check if already enrolled
    const existingEnrollment = await EducationEnrollment.findOne({
      userEmail,
      courseId,
      status: { $in: ['payment_pending', 'payment_verification_pending', 'enrolled'] },
    });

    if (existingEnrollment) {
      return res.status(400).json({ success: false, error: 'Already enrolled in this course' });
    }

    const enrollmentId = `enroll-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Create enrollment record
    const enrollment = new EducationEnrollment({
      enrollmentId,
      userEmail,
      courseId,
      courseTitle,
      amount,
      paymentMethod,
      paymentGateway,
      status: amount > 0 ? 'payment_pending' : 'enrolled',
      enrolledAt: amount > 0 ? null : new Date(),
    });

    await enrollment.save();

    // If free course, update education state immediately
    if (amount === 0) {
      const educationState = await EducationState.findOneAndUpdate(
        { userEmail },
        {
          $addToSet: { enrolledCourseIds: courseId },
          $set: { [`courseProgress.${courseId}`]: 0 },
        },
        { new: true, upsert: true }
      );

      const state = {
        enrolledCourseIds: educationState.enrolledCourseIds,
        appliedScholarships: educationState.appliedScholarships,
        joinedGroups: educationState.joinedGroups,
        courseProgress: Object.fromEntries(educationState.courseProgress),
        roleProfile: educationState.roleProfile,
        interventionsDismissed: educationState.interventionsDismissed,
      };

      return res.json({
        success: true,
        data: {
          enrollment: {
            enrollmentId,
            status: 'enrolled',
          },
          state,
          requiresPayment: false,
        },
      });
    }

    // For paid courses, create payment order
    try {
      const paymentOrder = await createRazorpayOrder({
        amount,
        currency: 'INR',
        notes: {
          enrollmentId,
          courseId,
          courseTitle,
          userEmail,
        },
      });

      const payment = new Payment({
        paymentId: paymentOrder.paymentId,
        orderId: paymentOrder.orderId,
        userEmail,
        amount,
        currency: 'INR',
        status: 'pending',
        gateway: 'razorpay',
        gatewayOrderId: paymentOrder.razorpayOrderId,
        metadata: {
          type: 'course_enrollment',
          enrollmentId,
          courseId,
          courseTitle,
        },
      });

      await payment.save();

      enrollment.orderId = paymentOrder.orderId;
      enrollment.paymentRecordId = paymentOrder.paymentId;
      await enrollment.save();

      res.json({
        success: true,
        data: {
          enrollment: {
            enrollmentId,
            status: 'payment_pending',
          },
          requiresPayment: true,
          paymentDetails: {
            paymentId: paymentOrder.paymentId,
            gateway: 'razorpay',
            razorpayOrderId: paymentOrder.razorpayOrderId,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            amount,
            currency: 'INR',
            notes: paymentOrder.notes,
          },
        },
      });
    } catch (paymentError) {
      logger.error('Payment order creation failed:', paymentError);
      enrollment.status = 'payment_failed';
      enrollment.errorReason = paymentError.message;
      await enrollment.save();
      
      return res.status(500).json({
        success: false,
        error: 'Failed to create payment order',
      });
    }
  } catch (error) {
    logger.error('Error enrolling in course:', error);
    res.status(500).json({ success: false, error: 'Failed to enroll in course' });
  }
});

// POST /api/education/enroll/:enrollmentId/confirm-payment - Confirm payment for enrollment
router.post('/enroll/:enrollmentId/confirm-payment', authenticate, async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { paymentId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const enrollment = await EducationEnrollment.findOne({ enrollmentId });
    if (!enrollment) {
      return res.status(404).json({ success: false, error: 'Enrollment not found' });
    }

    if (enrollment.userEmail !== req.user.email) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Verify payment signature
    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      enrollment.status = 'payment_failed';
      enrollment.errorReason = 'Payment signature verification failed';
      await enrollment.save();
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    // Update payment record
    await Payment.findOneAndUpdate(
      { paymentId },
      {
        status: 'completed',
        gatewayPaymentId: razorpay_payment_id,
        completedAt: new Date(),
      }
    );

    // Update enrollment
    enrollment.status = 'enrolled';
    enrollment.paymentVerifiedAt = new Date();
    enrollment.enrolledAt = new Date();
    await enrollment.save();

    // Update education state
    const educationState = await EducationState.findOneAndUpdate(
      { userEmail: enrollment.userEmail },
      {
        $addToSet: { enrolledCourseIds: enrollment.courseId },
        $set: { [`courseProgress.${enrollment.courseId}`]: 0 },
      },
      { new: true, upsert: true }
    );

    const state = {
      enrolledCourseIds: educationState.enrolledCourseIds,
      appliedScholarships: educationState.appliedScholarships,
      joinedGroups: educationState.joinedGroups,
      courseProgress: Object.fromEntries(educationState.courseProgress),
      roleProfile: educationState.roleProfile,
      interventionsDismissed: educationState.interventionsDismissed,
    };

    res.json({ success: true, data: { state } });
  } catch (error) {
    logger.error('Error confirming payment:', error);
    res.status(500).json({ success: false, error: 'Failed to confirm payment' });
  }
});

// POST /api/education/scholarship - Apply for scholarship
router.post('/scholarship', authenticate, async (req, res) => {
  try {
    const { error, value } = validateScholarship(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { scholarshipName } = value;
    const userEmail = req.user.email;

    // Check if already applied
    const existing = await EducationScholarshipApplication.findOne({
      userEmail,
      scholarshipName,
      status: { $ne: 'withdrawn' },
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Already applied for this scholarship' });
    }

    const applicationId = `scholarship-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const application = new EducationScholarshipApplication({
      applicationId,
      userEmail,
      scholarshipName,
      status: 'submitted',
    });

    await application.save();

    // Update education state
    const educationState = await EducationState.findOneAndUpdate(
      { userEmail },
      { $addToSet: { appliedScholarships: scholarshipName } },
      { new: true, upsert: true }
    );

    const state = {
      enrolledCourseIds: educationState.enrolledCourseIds,
      appliedScholarships: educationState.appliedScholarships,
      joinedGroups: educationState.joinedGroups,
      courseProgress: Object.fromEntries(educationState.courseProgress),
      roleProfile: educationState.roleProfile,
      interventionsDismissed: educationState.interventionsDismissed,
    };

    res.json({ success: true, data: { state } });
  } catch (error) {
    logger.error('Error applying for scholarship:', error);
    res.status(500).json({ success: false, error: 'Failed to apply for scholarship' });
  }
});

// POST /api/education/group - Join community group
router.post('/group', authenticate, async (req, res) => {
  try {
    const { error, value } = validateCommunityGroup(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { groupTitle } = value;
    const userEmail = req.user.email;

    // Check if already joined
    const existing = await EducationCommunityMembership.findOne({ userEmail, groupTitle });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Already joined this group' });
    }

    const membership = new EducationCommunityMembership({
      membershipId: `membership-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      userEmail,
      groupTitle,
      joinedAt: new Date(),
    });

    await membership.save();

    // Update education state
    const educationState = await EducationState.findOneAndUpdate(
      { userEmail },
      { $addToSet: { joinedGroups: groupTitle } },
      { new: true, upsert: true }
    );

    const state = {
      enrolledCourseIds: educationState.enrolledCourseIds,
      appliedScholarships: educationState.appliedScholarships,
      joinedGroups: educationState.joinedGroups,
      courseProgress: Object.fromEntries(educationState.courseProgress),
      roleProfile: educationState.roleProfile,
      interventionsDismissed: educationState.interventionsDismissed,
    };

    res.json({ success: true, data: { state } });
  } catch (error) {
    logger.error('Error joining group:', error);
    res.status(500).json({ success: false, error: 'Failed to join group' });
  }
});

// PATCH /api/education/profile - Update role profile
router.patch('/profile', authenticate, async (req, res) => {
  try {
    const { error, value } = validateRoleProfile(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const userEmail = req.user.email;
    const educationState = await EducationState.findOneAndUpdate(
      { userEmail },
      { $set: { roleProfile: value } },
      { new: true, upsert: true }
    );

    const state = {
      enrolledCourseIds: educationState.enrolledCourseIds,
      appliedScholarships: educationState.appliedScholarships,
      joinedGroups: educationState.joinedGroups,
      courseProgress: Object.fromEntries(educationState.courseProgress),
      roleProfile: educationState.roleProfile,
      interventionsDismissed: educationState.interventionsDismissed,
    };

    res.json({ success: true, data: { state } });
  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// POST /api/education/progress/event - Track progress event
router.post('/progress/event', authenticate, async (req, res) => {
  try {
    const { error, value } = validateProgressEvent(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { courseId, eventType, progressDelta } = value;
    const userEmail = req.user.email;

    // Log the event
    const learningEvent = new EducationLearningEvent({
      eventId: `event-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      userEmail,
      courseId,
      eventType,
      metadata: { progressDelta },
      occurredAt: new Date(),
    });
    await learningEvent.save();

    // Update progress
    const educationState = await EducationState.findOne({ userEmail });
    if (educationState) {
      const currentProgress = educationState.courseProgress.get(courseId) || 0;
      const newProgress = Math.max(0, Math.min(100, currentProgress + progressDelta));
      educationState.courseProgress.set(courseId, newProgress);
      await educationState.save();

      const state = {
        enrolledCourseIds: educationState.enrolledCourseIds,
        appliedScholarships: educationState.appliedScholarships,
        joinedGroups: educationState.joinedGroups,
        courseProgress: Object.fromEntries(educationState.courseProgress),
        roleProfile: educationState.roleProfile,
        interventionsDismissed: educationState.interventionsDismissed,
      };

      return res.json({ success: true, data: { state } });
    }

    res.status(404).json({ success: false, error: 'Education state not found' });
  } catch (error) {
    logger.error('Error tracking progress event:', error);
    res.status(500).json({ success: false, error: 'Failed to track progress event' });
  }
});

module.exports = router;
