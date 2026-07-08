const EducationState = require('../models/EducationState');
const EducationEnrollment = require('../models/EducationEnrollment');
const EducationTuitionRequest = require('../models/EducationTuitionRequest');
const SkillCertificate = require('../models/SkillCertificate');
const SkillTestResult = require('../models/SkillTestResult');
const { EDUCATION_CANVA_TEMPLATES, EDUCATION_CANVA_CAMPAIGN_SIZES } = require('../data/educationData');

// Calculate outcome metrics for a user
const calculateOutcomeMetrics = async (userEmail) => {
  try {
    const educationState = await EducationState.findOne({ userEmail });
    const enrollments = await EducationEnrollment.find({ userEmail, status: 'enrolled' });
    const tuitionRequests = await EducationTuitionRequest.find({ userEmail });
    const certificates = await SkillCertificate.find({ userEmail });
    const testResults = await SkillTestResult.find({ userEmail }).sort({ createdAt: -1 }).limit(10);

    // Calculate average course progress
    const progressValues = educationState?.courseProgress
      ? Array.from(educationState.courseProgress.values())
      : [];
    const avgCourseProgress = progressValues.length > 0
      ? Math.round(progressValues.reduce((sum, val) => sum + val, 0) / progressValues.length)
      : 0;

    // Calculate latest test score
    const latestTestScore = testResults.length > 0 ? testResults[0].score : 0;

    // Calculate tuition completion rate
    const completedTuition = tuitionRequests.filter(t => t.status === 'completed').length;
    const totalTuition = tuitionRequests.filter(t => t.status !== 'cancelled').length;
    const tuitionCompletionRate = totalTuition > 0
      ? Math.round((completedTuition / totalTuition) * 100)
      : 0;

    // Calculate scholarship conversion rate
    const appliedScholarships = educationState?.appliedScholarships?.length || 0;
    const scholarshipConversionRate = appliedScholarships > 0 ? 20 : 0; // Placeholder

    // Calculate certificate verification rate
    const verifiedCertificates = certificates.filter(c => c.verificationStatus === 'verified').length;
    const certificationVerificationRate = certificates.length > 0
      ? Math.round((verifiedCertificates / certificates.length) * 100)
      : 0;

    // Calculate overall readiness score
    const readinessScore = Math.round(
      (avgCourseProgress * 0.3) +
      (latestTestScore * 0.2) +
      (tuitionCompletionRate * 0.2) +
      (certificationVerificationRate * 0.15) +
      (scholarshipConversionRate * 0.15)
    );

    return {
      readinessScore,
      avgCourseProgress,
      latestTestScore,
      tuitionCompletionRate,
      scholarshipConversionRate,
      certificationVerificationRate,
    };
  } catch (error) {
    console.error('Error calculating outcome metrics:', error);
    return {
      readinessScore: 0,
      avgCourseProgress: 0,
      latestTestScore: 0,
      tuitionCompletionRate: 0,
      scholarshipConversionRate: 0,
      certificationVerificationRate: 0,
    };
  }
};

// Generate interventions based on state and metrics
const generateInterventions = async (educationState, outcomeMetrics) => {
  const interventions = [];

  if (!educationState) {
    return interventions;
  }

  // Intervention: Low course progress
  if (outcomeMetrics.avgCourseProgress < 30 && educationState.enrolledCourseIds.length > 0) {
    interventions.push({
      id: 'low-progress',
      title: 'Course Progress is Low',
      description: 'Your enrolled courses have low completion rates. Consider dedicating 30 minutes daily to catch up.',
      severity: 'medium',
      action: 'Set Study Schedule',
    });
  }

  // Intervention: No test activity
  if (outcomeMetrics.latestTestScore === 0 && educationState.enrolledCourseIds.length > 0) {
    interventions.push({
      id: 'no-tests',
      title: 'Take Your First Assessment',
      description: 'Complete at least one mock test to identify your weak areas and track improvement.',
      severity: 'low',
      action: 'Go to Assessments',
    });
  }

  // Intervention: Incomplete tuition sessions
  if (outcomeMetrics.tuitionCompletionRate < 50 && outcomeMetrics.tuitionCompletionRate > 0) {
    interventions.push({
      id: 'incomplete-tuition',
      title: 'Complete Tuition Sessions',
      description: 'You have pending tuition sessions. Regular attendance improves learning outcomes.',
      severity: 'high',
      action: 'View Tuition Tracker',
    });
  }

  // Intervention: Unverified certificates
  if (outcomeMetrics.certificationVerificationRate < 50 && outcomeMetrics.certificationVerificationRate > 0) {
    interventions.push({
      id: 'unverified-certificates',
      title: 'Verify Your Certificates',
      description: 'Some certificates are pending verification. Add credential IDs to improve trust score.',
      severity: 'low',
      action: 'Go to Certificates',
    });
  }

  // Filter out dismissed interventions
  const dismissedIds = educationState.interventionsDismissed || [];
  return interventions.filter(i => !dismissedIds.includes(i.id));
};

// Calculate KPI health status
const calculateKPIHealth = (outcomeMetrics) => {
  const getHealthStatus = (value) => {
    if (value >= 70) return 'healthy';
    if (value >= 40) return 'warning';
    return 'attention';
  };

  return {
    readiness: getHealthStatus(outcomeMetrics.readinessScore),
    progress: getHealthStatus(outcomeMetrics.avgCourseProgress),
    tuition: getHealthStatus(outcomeMetrics.tuitionCompletionRate),
    certificates: getHealthStatus(outcomeMetrics.certificationVerificationRate),
  };
};

// Match tutors for a tuition request
const matchTutors = async ({ subject, classLevel, preferredMode }) => {
  // Mock tutor matching algorithm
  // In production, this would query a tutors database
  const mockTutors = [
    {
      tutorId: 'tutor-1',
      name: 'Priya Kumar',
      subject: subject,
      experience: '5 years',
      rating: 4.8,
      matchScore: 95,
      hourlyFee: 500,
      availability: 'weekdays evenings',
    },
    {
      tutorId: 'tutor-2',
      name: 'Rajesh Menon',
      subject: subject,
      experience: '3 years',
      rating: 4.5,
      matchScore: 85,
      hourlyFee: 400,
      availability: 'weekends',
    },
  ];

  return mockTutors.filter(t => 
    t.subject.toLowerCase().includes(subject.toLowerCase())
  );
};

// Build Canva toolkit
const buildCanvaToolkit = async () => {
  return {
    templates: EDUCATION_CANVA_TEMPLATES,
    campaignSizes: EDUCATION_CANVA_CAMPAIGN_SIZES,
    translationTargets: ['English', 'Malayalam', 'Hindi'],
    suggestedCampaigns: [
      {
        campaignId: 'campaign-1',
        title: 'Student Progress Milestone',
        message: 'Celebrate 50% course completion with students and parents',
        targetAudience: 'students, parents',
      },
      {
        campaignId: 'campaign-2',
        title: 'Scholarship Deadline Reminder',
        message: 'Remind students about upcoming scholarship application deadlines',
        targetAudience: 'students',
      },
    ],
  };
};

// Build learning path based on user state
const buildLearningPath = async (educationState) => {
  const path = [];
  const recommendations = [];
  const weakAreas = [];

  if (!educationState) {
    return { path, recommendations, weakAreas };
  }

  // Generate personalized path
  if (educationState.enrolledCourseIds.length === 0) {
    path.push('Browse available courses and enroll in one that matches your career goal.');
    recommendations.push('Gulf Hotel Operations Pro', 'Kerala Digital Marketing Launchpad');
  } else {
    path.push('Complete one focused lesson from your enrolled course.');
    path.push('Take a mock test to identify weak areas.');
    path.push('Join a community group to discuss doubts with peers.');
  }

  // Add recommendations based on role profile
  const role = educationState.roleProfile?.primaryRole;
  if (role === 'student') {
    recommendations.push('Explore government scholarships for your class level');
  } else if (role === 'parent') {
    recommendations.push('Track your child progress in the 360 Dashboard');
  }

  return { path, recommendations, weakAreas };
};

module.exports = {
  calculateOutcomeMetrics,
  generateInterventions,
  calculateKPIHealth,
  matchTutors,
  buildCanvaToolkit,
  buildLearningPath,
};
