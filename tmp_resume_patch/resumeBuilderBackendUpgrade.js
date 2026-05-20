// backend/services/resumeBuilderUpgradeService.js
// Optional backend helper. Import these into backend/routes/resumebuilder.js for stronger validation.

const cleanText = (value = '') => String(value || '').replace(/\s+/g, ' ').trim();

const validateResumePayload = ({ formData = {}, jobDescription = '' }) => {
  const errors = [];
  const name = cleanText(formData.name);
  const email = cleanText(formData.email);
  const phone = cleanText(formData.phone);

  if (!name || name.length < 2) errors.push('Name is required.');
  if (!cleanText(formData.targetJob)) errors.push('Target job is required.');
  if (!cleanText(formData.skills)) errors.push('Skills are required.');
  if (!email && !phone) errors.push('Email or phone is required.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email format.');
  if (phone && phone.replace(/\D/g, '').length < 7) errors.push('Invalid phone number.');
  if (jobDescription && cleanText(jobDescription).length > 12000) errors.push('Job description is too long.');

  return { valid: errors.length === 0, errors };
};

const sanitizeResumeForStorage = (payload = {}) => {
  const clone = JSON.parse(JSON.stringify(payload || {}));
  if (clone.formData) {
    delete clone.formData.password;
    delete clone.formData.token;
    delete clone.formData.secret;
  }
  return clone;
};

module.exports = { validateResumePayload, sanitizeResumeForStorage };
