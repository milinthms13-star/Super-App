// src/modules/resumebuilder/resumeBuilderUpgradeUtils.js
// Drop-in helper utilities for Resume Builder upgrades.

export const QUICK_RESUME_ACTIONS = [
  { id: 'gulf', title: 'Gulf Job Resume', subtitle: 'UAE / Qatar / Saudi focused', icon: '🌍' },
  { id: 'ats', title: 'ATS Resume', subtitle: 'Parser-friendly clean format', icon: '✅' },
  { id: 'fresher', title: 'Fresher Resume', subtitle: 'Projects + education first', icon: '🎓' },
  { id: 'upload', title: 'Improve My Resume', subtitle: 'Upload and optimize', icon: '⬆️' },
];

export const ROLE_PRESETS = {
  software: {
    label: 'Software Developer',
    skills: ['JavaScript', 'React', 'Node.js', 'REST APIs', 'MongoDB', 'Git', 'Debugging', 'Agile'],
    bullets: [
      'Built responsive web applications using React and REST APIs.',
      'Improved application performance and reduced page load time through code optimization.',
      'Collaborated with product and QA teams to deliver stable releases.',
    ],
  },
  accountant: {
    label: 'Accountant',
    skills: ['Tally', 'GST Filing', 'Bank Reconciliation', 'MS Excel', 'Accounts Payable', 'Accounts Receivable'],
    bullets: [
      'Managed daily accounting entries, reconciliation, and statutory records.',
      'Prepared GST reports, vendor payments, and monthly financial summaries.',
      'Maintained accurate books with strong compliance and audit readiness.',
    ],
  },
  driver: {
    label: 'Driver',
    skills: ['Route Planning', 'Defensive Driving', 'Vehicle Maintenance', 'Passenger Safety', 'Time Management'],
    bullets: [
      'Maintained safe and punctual transport service with strong route knowledge.',
      'Performed basic vehicle checks and followed safety procedures.',
      'Delivered professional customer service with clean driving record.',
    ],
  },
  nurse: {
    label: 'Nurse / Healthcare',
    skills: ['Patient Care', 'Clinical Documentation', 'Medication Support', 'Infection Control', 'Emergency Response'],
    bullets: [
      'Provided patient care support while maintaining accurate clinical records.',
      'Assisted doctors and nursing teams in daily care procedures.',
      'Followed infection-control and patient-safety protocols.',
    ],
  },
  technician: {
    label: 'Technician',
    skills: ['Troubleshooting', 'Preventive Maintenance', 'Safety Compliance', 'Tool Handling', 'Documentation'],
    bullets: [
      'Handled installation, troubleshooting, and preventive maintenance activities.',
      'Reduced downtime through timely issue diagnosis and repair support.',
      'Maintained work records and followed site safety standards.',
    ],
  },
};

export const normalizeResumeFileName = (name = 'resume') =>
  String(name || 'resume').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();

export const getResumeHealth = (resume = {}, jobDescription = '') => {
  const issues = [];
  const header = resume.header || {};
  if (!header.fullName) issues.push('Add full name.');
  if (!header.email && !header.phone) issues.push('Add email or phone.');
  if (!resume.profile || String(resume.profile).length < 80) issues.push('Improve profile summary to 3–4 strong lines.');
  if (!Array.isArray(resume.skills) || resume.skills.length < 6) issues.push('Add at least 6 role-relevant skills.');
  if (!Array.isArray(resume.experience) || resume.experience.length === 0) issues.push('Add experience or project details.');
  if (jobDescription && jobDescription.length < 120) issues.push('Paste a full job description for better ATS score.');
  return { score: Math.max(20, 100 - issues.length * 14), issues };
};

export const buildWhatsappRecruiterMessage = (resume = {}) => {
  const header = resume.header || {};
  const skills = (resume.skills || []).slice(0, 6).join(', ');
  return `Hello, I am ${header.fullName || 'a candidate'} applying for ${header.targetJob || 'a suitable role'}. My key skills are ${skills}. Please let me know if there are suitable openings. Thank you.`;
};
