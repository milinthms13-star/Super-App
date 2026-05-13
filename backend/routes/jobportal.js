const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const EmployerProfile = require('../models/EmployerProfile');
const JobSavedJob = require('../models/JobSavedJob');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/jobportal/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|mp4|webm|mp3|wav/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadDir = path.join(__dirname, '../uploads/jobportal');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const APPLICATION_STATUSES = ['Applied', 'Viewed', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];
const PHONE_REGEX = /^\+?[0-9][0-9\s-]{7,14}$/;
const LICENSE_REGEX = /^[A-Za-z0-9/-]{5,30}$/;

const normalizeArrayField = (value = '') =>
  Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

const parseSalaryNumbers = (salaryText = '') => {
  const matches = String(salaryText || '')
    .replace(/,/g, '')
    .match(/\d+(\.\d+)?/g);
  if (!matches || !matches.length) return { salaryMin: 0, salaryMax: 0 };
  const numbers = matches.map((item) => Number(item)).filter(Number.isFinite);
  if (!numbers.length) return { salaryMin: 0, salaryMax: 0 };
  return {
    salaryMin: Math.min(...numbers),
    salaryMax: Math.max(...numbers),
  };
};

const postJobValidationSchema = Joi.object({
  title: Joi.string().trim().min(3).max(140).required(),
  company: Joi.string().trim().min(2).max(140).required(),
  location: Joi.string().trim().min(2).max(140).required(),
  district: Joi.string().trim().allow('').max(80),
  type: Joi.string().valid('local', 'gulf', 'it', 'gig').required(),
  subtype: Joi.string().trim().min(2).max(120).required(),
  salary: Joi.string().trim().min(3).max(80).required(),
  experience: Joi.string().trim().min(2).max(80).required(),
  description: Joi.string().trim().min(30).max(4000).required(),
  requirements: Joi.string().trim().allow('').max(2000),
  benefits: Joi.string().allow(''),
  skills: Joi.string().allow(''),
  jobType: Joi.string().valid('fulltime', 'parttime', 'contract', 'freelance', 'temporary').allow(''),
  workMode: Joi.string().valid('onsite', 'remote', 'hybrid').allow(''),
  contactEmail: Joi.string().email().required(),
  contactPhone: Joi.string().pattern(PHONE_REGEX).required(),
  companyWebsite: Joi.string().uri().allow(''),
  isUrgent: Joi.boolean().default(false),
  isFeatured: Joi.boolean().default(false),
  visaType: Joi.string().allow('').max(80),
  accommodationProvided: Joi.boolean().default(false),
  contractTerms: Joi.string().allow('').max(2000),
  agencyLicenseNumber: Joi.string().allow('').max(40),
  medicalInsuranceProvided: Joi.boolean().default(false),
  returnTicketProvided: Joi.boolean().default(false),
  overtimePolicy: Joi.string().allow('').max(300),
  warningNotes: Joi.string().allow('').max(500),
});

// Job Routes

// Get all jobs with filters
router.get('/jobs', async (req, res) => {
  try {
    const {
      type,
      subtype,
      location,
      experience,
      skills,
      district,
      quickFilter,
      q,
      page = 1,
      limit = 20,
      sort = '-postedAt'
    } = req.query;

    const query = { isActive: true };

    if (type) query.type = type;
    if (subtype) query.subtype = subtype;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (district) query.district = { $regex: district, $options: 'i' };
    if (experience) query.experience = experience;
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      query.skills = { $in: skillsArray };
    }
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { company: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } }
      ];
    }

    if (quickFilter === 'remote') query.workMode = 'remote';
    if (quickFilter === 'gulf') query.type = 'gulf';
    if (quickFilter === 'urgent') query.isUrgent = true;
    if (quickFilter === 'high-salary') query.salaryMax = { $gte: 75000 };

    const jobs = await Job.find(query)
      .populate('postedBy', 'name email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Job.countDocuments(query);

    res.json({
      success: true,
      data: jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ success: false, message: 'Error fetching jobs' });
  }
});

// Get job by ID
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('postedBy', 'name email')
      .populate({
        path: 'postedBy',
        populate: {
          path: 'employerProfile',
          model: 'EmployerProfile'
        }
      });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Increment view count
    await Job.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });

    res.json({ success: true, data: job });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ success: false, message: 'Error fetching job' });
  }
});

// Create new job (Employer only)
router.post('/jobs', authenticateToken, upload.array('documents', 5), async (req, res) => {
  try {
    const employerProfile = await EmployerProfile.findOne({ userId: req.user.id });
    if (!employerProfile) {
      return res.status(403).json({ success: false, message: 'Employer profile required' });
    }

    // Check job posting limit
    if (employerProfile.jobsPosted >= employerProfile.jobPostingLimit) {
      return res.status(403).json({ success: false, message: 'Job posting limit reached' });
    }

    const { error, value } = postJobValidationSchema.validate(req.body, { abortEarly: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    if (value.type === 'gulf') {
      if (!employerProfile.isVerified) {
        return res.status(403).json({
          success: false,
          message: 'Gulf jobs require verified employer/agency KYC.'
        });
      }

      if (!LICENSE_REGEX.test(String(value.agencyLicenseNumber || '').trim())) {
        return res.status(400).json({
          success: false,
          message: 'Valid Gulf agency license number is required for Gulf jobs.'
        });
      }

      if (!String(value.visaType || '').trim() || !String(value.contractTerms || '').trim()) {
        return res.status(400).json({
          success: false,
          message: 'Visa type and contract terms are required for Gulf jobs.'
        });
      }
    }

    const salaryNumbers = parseSalaryNumbers(value.salary);

    const jobData = {
      ...value,
      postedBy: req.user.id,
      skills: normalizeArrayField(value.skills),
      benefits: normalizeArrayField(value.benefits),
      contactEmail: String(value.contactEmail || '').trim().toLowerCase(),
      contactPhone: String(value.contactPhone || '').trim(),
      salaryMin: salaryNumbers.salaryMin,
      salaryMax: salaryNumbers.salaryMax,
      isVerified: Boolean(employerProfile.isVerified),
      gulfSafetyChecklist: {
        agencyLicenseNumber: String(value.agencyLicenseNumber || '').trim(),
        medicalInsuranceProvided: Boolean(value.medicalInsuranceProvided),
        returnTicketProvided: Boolean(value.returnTicketProvided),
        overtimePolicy: String(value.overtimePolicy || '').trim(),
        warningNotes:
          String(value.warningNotes || '').trim() ||
          (value.type === 'gulf'
            ? 'Never pay recruitment charges in cash. Verify offer letter and visa details before travel.'
            : '')
      }
    };

    const job = new Job(jobData);
    await job.save();

    // Update employer stats
    await EmployerProfile.findByIdAndUpdate(employerProfile._id, {
      $inc: { jobsPosted: 1, activeJobs: 1 }
    });

    res.status(201).json({ success: true, data: job });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ success: false, message: 'Error creating job' });
  }
});

// Update job
router.put('/jobs/:id', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const candidatePayload = { ...job.toObject(), ...req.body };
    const { error, value } = postJobValidationSchema.validate(candidatePayload, { abortEarly: true, allowUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const employerProfile = await EmployerProfile.findOne({ userId: req.user.id });
    if (value.type === 'gulf') {
      if (!employerProfile?.isVerified) {
        return res.status(403).json({
          success: false,
          message: 'Gulf jobs require verified employer/agency KYC.'
        });
      }
      if (!LICENSE_REGEX.test(String(value.agencyLicenseNumber || '').trim())) {
        return res.status(400).json({
          success: false,
          message: 'Valid Gulf agency license number is required for Gulf jobs.'
        });
      }
    }
    const salaryNumbers = parseSalaryNumbers(value.salary);

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      {
        ...value,
        skills: normalizeArrayField(value.skills),
        benefits: normalizeArrayField(value.benefits),
        contactEmail: String(value.contactEmail || '').trim().toLowerCase(),
        contactPhone: String(value.contactPhone || '').trim(),
        salaryMin: salaryNumbers.salaryMin,
        salaryMax: salaryNumbers.salaryMax,
        gulfSafetyChecklist: {
          agencyLicenseNumber: String(value.agencyLicenseNumber || '').trim(),
          medicalInsuranceProvided: Boolean(value.medicalInsuranceProvided),
          returnTicketProvided: Boolean(value.returnTicketProvided),
          overtimePolicy: String(value.overtimePolicy || '').trim(),
          warningNotes:
            String(value.warningNotes || '').trim() ||
            (value.type === 'gulf'
              ? 'Never pay recruitment charges in cash. Verify offer letter and visa details before travel.'
              : '')
        }
      },
      { new: true }
    );

    res.json({ success: true, data: updatedJob });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ success: false, message: 'Error updating job' });
  }
});

// Delete job
router.delete('/jobs/:id', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Job.findByIdAndUpdate(req.params.id, { isActive: false });

    // Update employer stats
    const employerProfile = await EmployerProfile.findOne({ userId: req.user.id });
    if (employerProfile) {
      await EmployerProfile.findByIdAndUpdate(employerProfile._id, {
        $inc: { activeJobs: -1 }
      });
    }

    res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ success: false, message: 'Error deleting job' });
  }
});

// Job Application Routes

// Apply for job
router.post('/jobs/:id/apply', authenticateToken, upload.single('resume'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job || !job.isActive) {
      return res.status(404).json({ success: false, message: 'Job not found or inactive' });
    }

    // Check if already applied
    const existingApplication = await JobApplication.findOne({
      jobId: req.params.id,
      applicantId: req.user.id
    });

    if (existingApplication) {
      return res.status(400).json({ success: false, message: 'Already applied for this job' });
    }

    const applicationData = {
      jobId: req.params.id,
      applicantId: req.user.id,
      coverLetter: req.body.coverLetter,
      expectedSalary: req.body.expectedSalary,
      availability: req.body.availability,
      resumeUrl: req.file ? `/uploads/jobportal/${req.file.filename}` : null
    };

    const application = new JobApplication(applicationData);
    await application.save();

    // Update job application count
    await Job.findByIdAndUpdate(req.params.id, { $inc: { applicationCount: 1 } });

    // Update employer stats
    const employerProfile = await EmployerProfile.findOne({ userId: job.postedBy });
    if (employerProfile) {
      await EmployerProfile.findByIdAndUpdate(employerProfile._id, {
        $inc: { totalApplications: 1 }
      });
    }

    res.status(201).json({ success: true, data: application });
  } catch (error) {
    console.error('Error applying for job:', error);
    res.status(500).json({ success: false, message: 'Error applying for job' });
  }
});

// Get applications for a job (Employer only)
router.get('/jobs/:id/applications', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const applications = await JobApplication.find({ jobId: req.params.id })
      .populate('applicantId', 'name email')
      .populate({
        path: 'applicantId',
        populate: {
          path: 'jobSeekerProfile',
          model: 'JobSeekerProfile'
        }
      })
      .sort('-appliedAt');

    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ success: false, message: 'Error fetching applications' });
  }
});

// Update application status
router.put('/applications/:id', authenticateToken, async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id).populate('jobId');
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (application.jobId.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const statusMap = {
      applied: 'Applied',
      viewed: 'Viewed',
      shortlisted: 'Shortlisted',
      interview: 'Interview',
      interviewed: 'Interview',
      selected: 'Selected',
      hired: 'Selected',
      rejected: 'Rejected'
    };
    const requestedStatus = String(req.body.status || '').trim();
    const normalizedStatus =
      APPLICATION_STATUSES.includes(requestedStatus)
        ? requestedStatus
        : statusMap[requestedStatus.toLowerCase()];

    if (!normalizedStatus) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${APPLICATION_STATUSES.join(', ')}`
      });
    }

    const updatedApplication = await JobApplication.findByIdAndUpdate(
      req.params.id,
      {
        status: normalizedStatus,
        notes: req.body.notes,
        interviewScheduled: req.body.interviewScheduled,
        interviewNotes: req.body.interviewNotes,
        rating: req.body.rating,
        feedback: req.body.feedback
      },
      { new: true }
    );

    res.json({ success: true, data: updatedApplication });
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ success: false, message: 'Error updating application' });
  }
});

// Profile Routes

// Get or create job seeker profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    let profile = await JobSeekerProfile.findOne({ userId: req.user.id });
    if (!profile) {
      const account = await User.findById(req.user.id).lean();
      profile = new JobSeekerProfile({
        userId: req.user.id,
        fullName: account?.name || req.user.name || 'Job Seeker',
        email: account?.email || req.user.email || 'unknown@example.com',
        phone: account?.phone || ''
      });
      await profile.save();
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, message: 'Error fetching profile' });
  }
});

// Update job seeker profile
router.put('/profile', authenticateToken, upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'videoIntro', maxCount: 1 },
  { name: 'voiceResume', maxCount: 1 }
]), async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Handle file uploads
    if (req.files) {
      if (req.files.resume && req.files.resume[0]) {
        updateData.resume = {
          url: `/uploads/jobportal/${req.files.resume[0].filename}`,
          filename: req.files.resume[0].originalname
        };
      }
      if (req.files.videoIntro && req.files.videoIntro[0]) {
        updateData.videoIntro = {
          url: `/uploads/jobportal/${req.files.videoIntro[0].filename}`,
          filename: req.files.videoIntro[0].originalname
        };
      }
      if (req.files.voiceResume && req.files.voiceResume[0]) {
        updateData.voiceResume = {
          url: `/uploads/jobportal/${req.files.voiceResume[0].filename}`,
          filename: req.files.voiceResume[0].originalname
        };
      }
    }

    // Handle arrays
    if (updateData.skills) {
      updateData.skills = Array.isArray(updateData.skills)
        ? updateData.skills
        : updateData.skills.split(',').map(s => s.trim());
    }
    if (updateData.languages) {
      updateData.languages = Array.isArray(updateData.languages)
        ? updateData.languages
        : updateData.languages.split(',').map(l => l.trim());
    }
    if (updateData.preferredLocations) {
      updateData.preferredLocations = Array.isArray(updateData.preferredLocations)
        ? updateData.preferredLocations
        : updateData.preferredLocations.split(',').map(l => l.trim());
    }

    updateData.lastUpdated = new Date();

    // Calculate profile completeness
    const completeness = calculateProfileCompleteness(updateData);
    updateData.profileCompleteness = completeness;

    const profile = await JobSeekerProfile.findOneAndUpdate(
      { userId: req.user.id },
      updateData,
      { new: true, upsert: true }
    );

    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
});

// Employer profile routes
router.get('/employer/profile', authenticateToken, async (req, res) => {
  try {
    let profile = await EmployerProfile.findOne({ userId: req.user.id });
    if (!profile) {
      const account = await User.findById(req.user.id).lean();
      profile = new EmployerProfile({
        userId: req.user.id,
        companyName: account?.businessName || account?.name || 'My Company',
        companyType: 'sme',
        location: account?.location || 'Kerala',
        contactEmail: account?.email || req.user.email || 'unknown@example.com',
        contactPhone: account?.phone || '',
        industry: account?.profession || 'General',
      });
      await profile.save();
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching employer profile:', error);
    res.status(500).json({ success: false, message: 'Error fetching employer profile' });
  }
});

router.put('/employer/profile', authenticateToken, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'documents', maxCount: 5 }
]), async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.files) {
      if (req.files.logo && req.files.logo[0]) {
        updateData.logo = {
          url: `/uploads/jobportal/${req.files.logo[0].filename}`,
          filename: req.files.logo[0].originalname
        };
      }
      if (req.files.documents) {
        updateData.verificationDocuments = req.files.documents.map(file => ({
          type: req.body.documentTypes ? req.body.documentTypes[file.fieldname] : 'other',
          url: `/uploads/jobportal/${file.filename}`,
          filename: file.originalname
        }));
      }
    }

    if (updateData.preferredSkills) {
      updateData.preferredSkills = Array.isArray(updateData.preferredSkills)
        ? updateData.preferredSkills
        : updateData.preferredSkills.split(',').map(s => s.trim());
    }

    const profile = await EmployerProfile.findOneAndUpdate(
      { userId: req.user.id },
      updateData,
      { new: true, upsert: true }
    );

    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error updating employer profile:', error);
    res.status(500).json({ success: false, message: 'Error updating employer profile' });
  }
});

// Get my applications (Job seeker)
router.get('/my-applications', authenticateToken, async (req, res) => {
  try {
    const applications = await JobApplication.find({ applicantId: req.user.id })
      .populate({
        path: 'jobId',
        select: 'title company location salary type status'
      })
      .sort('-appliedAt');

    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ success: false, message: 'Error fetching applications' });
  }
});

router.post('/jobs/:id/report', authenticateToken, async (req, res) => {
  try {
    const reason = String(req.body.reason || '').trim();
    const details = String(req.body.details || '').trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Reason is required.' });
    }

    const updated = await Job.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          reports: {
            reportedBy: req.user.id,
            reason,
            details,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    return res.status(201).json({ success: true, message: 'Report submitted for moderation.' });
  } catch (error) {
    console.error('Error reporting job:', error);
    return res.status(500).json({ success: false, message: 'Error reporting job' });
  }
});

// Saved jobs (Job seeker)
router.get('/saved-jobs', authenticateToken, async (req, res) => {
  try {
    const saved = await JobSavedJob.find({ userId: req.user.id })
      .populate({
        path: 'jobId',
        select: 'title company location salary salaryMin salaryMax type subtype isUrgent isVerified postedAt workMode district isActive',
      })
      .sort({ createdAt: -1 })
      .lean();

    const jobs = saved
      .filter((entry) => entry.jobId && entry.jobId.isActive !== false)
      .map((entry) => ({ ...entry.jobId, savedAt: entry.createdAt }));

    res.json({ success: true, data: jobs });
  } catch (error) {
    console.error('Error loading saved jobs:', error);
    res.status(500).json({ success: false, message: 'Error loading saved jobs' });
  }
});

router.post('/saved-jobs/:jobId', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId).select('_id isActive');
    if (!job || !job.isActive) {
      return res.status(404).json({ success: false, message: 'Job not found or inactive' });
    }

    const saved = await JobSavedJob.findOneAndUpdate(
      { userId: req.user.id, jobId: req.params.jobId },
      { $setOnInsert: { userId: req.user.id, jobId: req.params.jobId } },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving job:', error);
    res.status(500).json({ success: false, message: 'Error saving job' });
  }
});

router.delete('/saved-jobs/:jobId', authenticateToken, async (req, res) => {
  try {
    await JobSavedJob.deleteOne({ userId: req.user.id, jobId: req.params.jobId });
    res.json({ success: true, message: 'Saved job removed.' });
  } catch (error) {
    console.error('Error removing saved job:', error);
    res.status(500).json({ success: false, message: 'Error removing saved job' });
  }
});

// Get my jobs (Employer)
router.get('/my-jobs', authenticateToken, async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user.id })
      .sort('-postedAt');

    res.json({ success: true, data: jobs });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ success: false, message: 'Error fetching jobs' });
  }
});

// Employer dashboard analytics and latest activity
router.get('/employer/dashboard', authenticateToken, async (req, res) => {
  try {
    const myJobs = await Job.find({ postedBy: req.user.id, isActive: true })
      .sort('-postedAt')
      .lean();
    const jobIds = myJobs.map((job) => job._id);
    const applications = jobIds.length
      ? await JobApplication.find({ jobId: { $in: jobIds } })
          .populate('jobId', 'title company location')
          .populate('applicantId', 'name email')
          .sort('-appliedAt')
          .lean()
      : [];

    const statusCount = applications.reduce(
      (acc, item) => {
        const normalized = String(item.status || '').toLowerCase();
        if (normalized === 'applied') acc.applied += 1;
        else if (normalized === 'viewed') acc.viewed += 1;
        else if (normalized === 'shortlisted') acc.shortlisted += 1;
        else if (normalized === 'interview') acc.interview += 1;
        else if (normalized === 'selected' || normalized === 'hired') acc.selected += 1;
        else if (normalized === 'rejected') acc.rejected += 1;
        return acc;
      },
      { applied: 0, viewed: 0, shortlisted: 0, interview: 0, selected: 0, rejected: 0 }
    );

    const jobApplicationCountById = applications.reduce((acc, item) => {
      const id = String(item.jobId?._id || item.jobId || '');
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});

    const jobsWithStats = myJobs.map((job) => ({
      ...job,
      applicationCount: jobApplicationCountById[String(job._id)] || 0,
    }));

    res.json({
      success: true,
      data: {
        stats: {
          activeJobs: myJobs.length,
          totalApplications: applications.length,
          ...statusCount,
        },
        jobs: jobsWithStats,
        applications: applications.slice(0, 100),
      },
    });
  } catch (error) {
    console.error('Error loading employer dashboard:', error);
    res.status(500).json({ success: false, message: 'Error loading employer dashboard' });
  }
});

// Search jobs
router.get('/search', async (req, res) => {
  try {
    const { q, type, location, experience } = req.query;

    const query = { isActive: true };

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { company: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { skills: { $in: [new RegExp(q, 'i')] } }
      ];
    }

    if (type) query.type = type;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (experience) query.experience = experience;

    const jobs = await Job.find(query)
      .populate('postedBy', 'name')
      .sort('-postedAt')
      .limit(50);

    res.json({ success: true, data: jobs });
  } catch (error) {
    console.error('Error searching jobs:', error);
    res.status(500).json({ success: false, message: 'Error searching jobs' });
  }
});

// Helper function to calculate profile completeness
function calculateProfileCompleteness(profile) {
  let score = 0;
  const totalFields = 12;

  if (profile.fullName) score++;
  if (profile.email) score++;
  if (profile.phone) score++;
  if (profile.resume && profile.resume.url) score++;
  if (profile.skills && profile.skills.length > 0) score++;
  if (profile.experience) score++;
  if (profile.expectedSalary) score++;
  if (profile.languages && profile.languages.length > 0) score++;
  if (profile.portfolio) score++;
  if (profile.videoIntro && profile.videoIntro.url) score++;
  if (profile.voiceResume && profile.voiceResume.url) score++;
  if (profile.preferredLocations && profile.preferredLocations.length > 0) score++;

  return Math.round((score / totalFields) * 100);
}

module.exports = router;
