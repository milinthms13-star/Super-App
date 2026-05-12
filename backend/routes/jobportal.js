const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const EmployerProfile = require('../models/EmployerProfile');
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

// Job Routes

// Get all jobs with filters
router.get('/jobs', async (req, res) => {
  try {
    const {
      type,
      subtype,
      location,
      salary,
      experience,
      skills,
      page = 1,
      limit = 20,
      sort = '-postedAt'
    } = req.query;

    const query = { isActive: true };

    if (type) query.type = type;
    if (subtype) query.subtype = subtype;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (experience) query.experience = experience;
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      query.skills = { $in: skillsArray };
    }

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

    const jobData = {
      ...req.body,
      postedBy: req.user.id,
      skills: req.body.skills ? req.body.skills.split(',').map(s => s.trim()) : [],
      benefits: req.body.benefits ? req.body.benefits.split(',').map(b => b.trim()) : []
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

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        skills: req.body.skills ? req.body.skills.split(',').map(s => s.trim()) : job.skills,
        benefits: req.body.benefits ? req.body.benefits.split(',').map(b => b.trim()) : job.benefits
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

    const updatedApplication = await JobApplication.findByIdAndUpdate(
      req.params.id,
      {
        status: req.body.status,
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
      profile = new JobSeekerProfile({ userId: req.user.id });
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
      profile = new EmployerProfile({ userId: req.user.id });
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