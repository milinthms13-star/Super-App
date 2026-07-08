// Build shareable wallet text
const buildSkillWalletShareText = (courses = [], certificates = []) => {
  if (courses.length === 0 && certificates.length === 0) {
    return 'No courses or certificates yet. Start learning today!';
  }

  const courseText = courses.length > 0
    ? `Enrolled in ${courses.length} course${courses.length > 1 ? 's' : ''}: ${courses.map(c => c.title || c.courseTitle).join(', ')}`
    : '';

  const certText = certificates.length > 0
    ? `Earned ${certificates.length} certificate${certificates.length > 1 ? 's' : ''}`
    : '';

  return [courseText, certText].filter(Boolean).join(' | ');
};

// Validate certificate upload payload
const validateCertificateUploadPayload = (payload) => {
  const errors = [];

  if (!payload.title || payload.title.trim().length < 3) {
    errors.push('Certificate title must be at least 3 characters');
  }

  if (!payload.completedOn) {
    errors.push('Completion date is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  buildSkillWalletShareText,
  validateCertificateUploadPayload,
};
