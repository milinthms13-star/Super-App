const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const SkillCourse = require('../models/SkillCourse');
const SkillCertificate = require('../models/SkillCertificate');
const SkillTestResult = require('../models/SkillTestResult');
const EducationState = require('../models/EducationState');
const {
  validateCertificateUpload,
  validateCertificateVerification,
  validateTestSubmission,
} = require('../validations/educationValidations');
const {
  getSkillLearningCourses,
  getCourseById,
  getQuestionBank,
  evaluateTestAnswers,
  GOVT_PORTALS,
} = require('../data/skillLearningData');
const { uploadToGridFS, deleteGridFSFile } = require('../utils/gridfs');
const { buildSkillWalletShareText } = require('../utils/skillDevelopmentBackendHelpers');
const logger = require('../config/logger');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  },
});

// GET /api/skilllearning/courses - Get all courses
router.get('/courses', authenticate, async (req, res) => {
  try {
    const { category, level, search } = req.query;
    
    let query = { published: true };
    
    if (category) {
      query.category = category;
    }
    
    if (level) {
      query.level = level;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const courses = await SkillCourse.find(query)
      .select('-__v')
      .sort({ enrollmentCount: -1, createdAt: -1 })
      .limit(50)
      .lean();

    // If no DB courses, fall back to static data
    const finalCourses = courses.length > 0 ? courses : getSkillLearningCourses();

    res.json({ success: true, data: { courses: finalCourses } });
  } catch (error) {
    logger.error('Error fetching courses:', error);
    // Fallback to static data on error
    const courses = getSkillLearningCourses();
    res.json({ success: true, data: { courses } });
  }
});

// GET /api/skilllearning/courses/:courseId - Get course by ID
router.get('/courses/:courseId', authenticate, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    let course = await SkillCourse.findOne({ courseId, published: true }).lean();
    
    if (!course) {
      course = getCourseById(courseId);
    }
    
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    res.json({ success: true, data: { course } });
  } catch (error) {
    logger.error('Error fetching course:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch course' });
  }
});

// GET /api/skilllearning/questions - Get question bank
router.get('/questions', authenticate, async (req, res) => {
  try {
    const { category = 'Gulf Ready' } = req.query;
    const questions = getQuestionBank(category);
    
    res.json({ success: true, data: { questions } });
  } catch (error) {
    logger.error('Error fetching questions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch questions' });
  }
});

// POST /api/skilllearning/tests/submit - Submit test answers
router.post('/tests/submit', authenticate, async (req, res) => {
  try {
    const { error, value } = validateTestSubmission(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { category, answers } = value;
    const userEmail = req.user.email;

    // Evaluate answers
    const result = evaluateTestAnswers(category, answers);

    // Save test result
    const testResult = new SkillTestResult({
      testId: `test-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      userEmail,
      category,
      answers,
      score: result.score,
      correct: result.correct,
      wrong: result.wrong,
      weakAreas: result.weakAreas,
      completedAt: new Date(),
    });

    await testResult.save();

    res.json({
      success: true,
      data: {
        result: {
          score: result.score,
          correct: result.correct,
          wrong: result.wrong,
          weakAreas: result.weakAreas,
        },
        insight: `You scored ${result.score}%. ${result.score >= 70 ? 'Great job!' : 'Keep practicing to improve.'}`,
      },
    });
  } catch (error) {
    logger.error('Error submitting test:', error);
    res.status(500).json({ success: false, error: 'Failed to submit test' });
  }
});

// GET /api/skilllearning/certificates - Get user certificates
router.get('/certificates', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const certificates = await SkillCertificate.find({ userEmail })
      .sort({ uploadedAt: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        certificates,
        govtPortals: GOVT_PORTALS,
      },
    });
  } catch (error) {
    logger.error('Error fetching certificates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch certificates' });
  }
});

// POST /api/skilllearning/certificates/upload - Upload certificate
router.post('/certificates/upload', authenticate, upload.single('certificateFile'), async (req, res) => {
  try {
    const { error, value } = validateCertificateUpload(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { title, issuer, completedOn, credentialId } = value;
    const userEmail = req.user.email;

    let fileUrl = '';
    let fileName = '';

    if (req.file) {
      const uploadResult = await uploadToGridFS(req.file.buffer, {
        filename: `certificate-${Date.now()}-${req.file.originalname}`,
        contentType: req.file.mimetype,
        metadata: {
          userEmail,
          type: 'skill_certificate',
          uploadedAt: new Date(),
        },
      });

      fileUrl = `/api/files/${uploadResult.fileId}`;
      fileName = req.file.originalname;
    }

    const certificate = new SkillCertificate({
      certificateId: `cert-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      userEmail,
      title,
      issuer,
      completedOn: new Date(completedOn),
      credentialId,
      verificationStatus: 'uploaded',
      fileUrl,
      fileName,
      uploadedAt: new Date(),
    });

    await certificate.save();

    res.json({ success: true, data: { certificate } });
  } catch (error) {
    logger.error('Error uploading certificate:', error);
    res.status(500).json({ success: false, error: 'Failed to upload certificate' });
  }
});

// PATCH /api/skilllearning/certificates/:certificateId/verification - Update verification status
router.patch('/certificates/:certificateId/verification', authenticate, async (req, res) => {
  try {
    const { certificateId } = req.params;
    const { error, value } = validateCertificateVerification(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { verificationStatus, verificationNote } = value;
    const userEmail = req.user.email;

    const certificate = await SkillCertificate.findOne({ certificateId, userEmail });
    if (!certificate) {
      return res.status(404).json({ success: false, error: 'Certificate not found' });
    }

    certificate.verificationStatus = verificationStatus;
    certificate.verificationNote = verificationNote || '';
    if (verificationStatus === 'verified') {
      certificate.verifiedAt = new Date();
    }

    await certificate.save();

    res.json({ success: true, data: { certificate } });
  } catch (error) {
    logger.error('Error updating certificate verification:', error);
    res.status(500).json({ success: false, error: 'Failed to update verification' });
  }
});

// GET /api/skilllearning/wallet - Get wallet data for sharing
router.get('/wallet', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    
    const certificates = await SkillCertificate.find({ userEmail })
      .sort({ uploadedAt: -1 })
      .lean();
    
    const educationState = await EducationState.findOne({ userEmail });
    const enrolledCourseIds = educationState?.enrolledCourseIds || [];
    
    // Get enrolled courses
    let courses = [];
    if (enrolledCourseIds.length > 0) {
      courses = await SkillCourse.find({ courseId: { $in: enrolledCourseIds } }).lean();
      if (courses.length === 0) {
        // Fallback to static data
        const allCourses = getSkillLearningCourses();
        courses = allCourses.filter(c => enrolledCourseIds.includes(c.id || c.courseId));
      }
    }

    const shareText = buildSkillWalletShareText(courses, certificates);

    res.json({
      success: true,
      data: {
        courses,
        certificates,
        shareText,
      },
    });
  } catch (error) {
    logger.error('Error fetching wallet data:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch wallet data' });
  }
});

module.exports = router;
