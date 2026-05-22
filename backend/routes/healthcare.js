const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const { authenticate, verifyAdmin, hasAdminPrivileges } = require('../middleware/auth');
const { uploadToS3, deleteFromS3, generateSignedUrl } = require('../utils/s3Storage');
const {
  buildLabTestInfo,
  buildMedicineInfo,
  explainLabTestQuery,
  explainMedicineQuery,
} = require('../services/healthcareInfoService');

const HealthcareDoctor = require('../models/healthcare/HealthcareDoctor');
const HealthcareLabTest = require('../models/healthcare/HealthcareLabTest');
const HealthcarePackage = require('../models/healthcare/HealthcarePackage');
const HealthcareMedicine = require('../models/healthcare/HealthcareMedicine');
const HealthcareRecord = require('../models/healthcare/HealthcareRecord');
const HealthcareAppointment = require('../models/healthcare/HealthcareAppointment');
const HealthcareFamilyProfile = require('../models/healthcare/HealthcareFamilyProfile');
const HealthcareRefillReminder = require('../models/healthcare/HealthcareRefillReminder');
const HealthcareEmergencyIncident = require('../models/healthcare/HealthcareEmergencyIncident');
const HealthcarePartnerApplication = require('../models/healthcare/HealthcarePartnerApplication');
const HealthcareNotification = require('../models/healthcare/HealthcareNotification');
const HealthcarePharmacyOrder = require('../models/healthcare/HealthcarePharmacyOrder');
const HealthcareAuditLog = require('../models/healthcare/HealthcareAuditLog');
const HealthcareIdempotencyKey = require('../models/healthcare/HealthcareIdempotencyKey');
const { purgeExpiredHealthcareRecords } = require('../services/healthcareRetentionService');
const { generateHealthcareAssistantResponse } = require('../services/healthcareAiAssistantService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const seedDoctors = [
  {
    name: 'Dr. Sarah Johnson',
    specialty: 'General Physician',
    qualifications: 'MBBS, MD (Internal Medicine)',
    experienceYears: 12,
    consultationFee: 500,
    rating: 4.8,
    reviewsCount: 234,
    languages: ['English', 'Malayalam', 'Hindi'],
    clinicAddress: 'Kozhikode Medical Center',
    availableModes: ['clinic', 'video'],
    availableSlots: [
      { date: '2026-05-14', times: ['09:30', '10:00', '11:00', '17:30'] },
      { date: '2026-05-15', times: ['10:30', '12:00', '18:00'] },
      { date: '2026-05-16', times: ['09:00', '15:30', '19:00'] },
    ],
  },
  {
    name: 'Dr. Rajesh Kumar',
    specialty: 'Cardiologist',
    qualifications: 'MBBS, DM (Cardiology)',
    experienceYears: 8,
    consultationFee: 700,
    rating: 4.7,
    reviewsCount: 156,
    languages: ['English', 'Tamil'],
    clinicAddress: 'Malabar Heart Institute',
    availableModes: ['clinic', 'video'],
    availableSlots: [
      { date: '2026-05-14', times: ['11:30', '12:30', '16:30'] },
      { date: '2026-05-15', times: ['09:30', '14:30', '17:00'] },
      { date: '2026-05-17', times: ['10:00', '13:00', '18:30'] },
    ],
  },
  {
    name: 'Dr. Anitha Nair',
    specialty: 'Gynecologist',
    qualifications: 'MBBS, DGO, MS (OBG)',
    experienceYears: 11,
    consultationFee: 600,
    rating: 4.9,
    reviewsCount: 192,
    languages: ['English', 'Malayalam'],
    clinicAddress: 'Nila Women Wellness Clinic',
    availableModes: ['clinic', 'video'],
    availableSlots: [
      { date: '2026-05-14', times: ['09:00', '10:00', '12:00'] },
      { date: '2026-05-16', times: ['11:00', '14:00', '17:30'] },
      { date: '2026-05-18', times: ['09:30', '15:00', '18:00'] },
    ],
  },
  {
    name: 'Dr. Fathima Rahman',
    specialty: 'Pediatrician',
    qualifications: 'MBBS, DCH, MD (Pediatrics)',
    experienceYears: 9,
    consultationFee: 550,
    rating: 4.8,
    reviewsCount: 144,
    languages: ['English', 'Malayalam', 'Hindi'],
    clinicAddress: "BabyCare Children's Clinic, Kannur",
    availableModes: ['clinic', 'video'],
    availableSlots: [
      { date: '2026-05-14', times: ['09:30', '11:30', '16:30'] },
      { date: '2026-05-15', times: ['10:00', '13:00', '18:00'] },
      { date: '2026-05-17', times: ['09:00', '12:30', '17:00'] },
    ],
  },
  {
    name: 'Dr. Vivek Menon',
    specialty: 'Orthopedic',
    qualifications: 'MBBS, MS (Orthopedics)',
    experienceYears: 10,
    consultationFee: 650,
    rating: 4.7,
    reviewsCount: 171,
    languages: ['English', 'Malayalam', 'Tamil'],
    clinicAddress: 'Malabar Bone & Joint Center, Thrissur',
    availableModes: ['clinic', 'video'],
    availableSlots: [
      { date: '2026-05-14', times: ['10:30', '14:30', '19:00'] },
      { date: '2026-05-16', times: ['09:30', '13:00', '17:30'] },
      { date: '2026-05-18', times: ['11:00', '15:00', '18:30'] },
    ],
  },
];

const seedLabTests = [
  { name: 'Complete Blood Count', price: 300, homeCollection: true, type: 'blood' },
  { name: 'Diabetes Test', price: 250, homeCollection: true, type: 'blood' },
  { name: 'Thyroid Profile', price: 500, homeCollection: true, type: 'blood' },
  { name: 'Pregnancy Test', price: 200, homeCollection: false, type: 'blood' },
  { name: 'MRI Scan', price: 4500, homeCollection: false, type: 'scan' },
  { name: 'CT Scan', price: 3800, homeCollection: false, type: 'scan' },
  { name: 'Ultrasound', price: 1400, homeCollection: false, type: 'scan' },
  { name: 'X-Ray', price: 600, homeCollection: false, type: 'scan' },
  { name: 'Lipid Profile', price: 650, homeCollection: true, type: 'blood' },
  { name: 'Liver Function Test', price: 720, homeCollection: true, type: 'blood' },
  { name: '2D Echo', price: 2200, homeCollection: false, type: 'scan' },
  { name: 'Mammography', price: 2100, homeCollection: false, type: 'scan' },
];

const seedPackages = [
  { name: 'Full Body Checkup', tests: 45, price: 2999, discount: '20% off' },
  { name: 'Women Wellness', tests: 32, price: 1999, discount: '15% off' },
  { name: 'Senior Citizen', tests: 38, price: 2499, discount: '25% off' },
  { name: 'Diabetes Package', tests: 28, price: 1499, discount: '10% off' },
];

const seedMedicines = [
  { name: 'Paracetamol 500mg', price: 25, category: 'Pain Relief', requiresPrescription: false, stock: 200 },
  { name: 'Vitamin D3', price: 180, category: 'Supplements', requiresPrescription: false, stock: 120 },
  { name: 'Blood Pressure Medicine', price: 150, category: 'Cardiac', requiresPrescription: true, stock: 80 },
  { name: 'Antibiotic Course', price: 320, category: 'Infection', requiresPrescription: true, stock: 90 },
  { name: 'Insulin Pen', price: 980, category: 'Diabetes', requiresPrescription: true, stock: 45 },
  { name: 'Calcium Tablets', price: 220, category: 'Supplements', requiresPrescription: false, stock: 130 },
  { name: 'Cetirizine 10mg', price: 48, category: 'Allergy', requiresPrescription: false, stock: 190 },
  { name: 'Amoxicillin 500mg', price: 210, category: 'Infection', requiresPrescription: true, stock: 120 },
  { name: 'Metformin 500mg', price: 130, category: 'Diabetes', requiresPrescription: true, stock: 150 },
  { name: 'Omeprazole 20mg', price: 95, category: 'Gastro', requiresPrescription: false, stock: 175 },
];

const inMemoryStore = {
  doctors: seedDoctors.map((item, index) => ({ ...item, id: `doc-memory-${index + 1}`, approvalStatus: 'approved', isActive: true })),
  labTests: seedLabTests.map((item, index) => ({ ...item, id: `lab-memory-${index + 1}`, approvalStatus: 'approved', isActive: true })),
  packages: seedPackages.map((item, index) => ({ ...item, id: `pkg-memory-${index + 1}`, approvalStatus: 'approved', isActive: true })),
  medicines: seedMedicines.map((item, index) => ({ ...item, id: `med-memory-${index + 1}`, approvalStatus: 'approved', isActive: true })),
  records: [],
  appointments: [],
  familyProfiles: [],
  refillReminders: [],
  incidents: [],
  notifications: [],
  partnerApplications: [],
  pharmacyOrders: [],
  auditLogs: [],
  idempotencyRecords: [],
};

const isMongoReady = () => mongoose.connection.readyState === 1;

const toClientObject = (value) => {
  if (!value) {
    return value;
  }

  const objectValue = typeof value.toObject === 'function' ? value.toObject() : { ...value };
  if (objectValue._id && !objectValue.id) {
    objectValue.id = String(objectValue._id);
  }
  delete objectValue.__v;
  return objectValue;
};

const createDoctorFromPartnerApplication = async (application) => {
  if (!application || String(application.entityType || '').toLowerCase() !== 'doctor') {
    return null;
  }

  const doctorName = String(application.contactName || application.vendorName || '').trim();
  if (!doctorName) {
    return null;
  }

  if (isMongoReady()) {
    const existing = await HealthcareDoctor.findOne({
      userId: application.userId,
      name: doctorName,
      isPartnerProvided: true,
    });
    if (existing) {
      return existing;
    }

    return HealthcareDoctor.create({
      userId: application.userId,
      name: doctorName,
      specialty: String(application.specialtyOrService || 'General Physician').trim(),
      qualifications: String(application.licenseNumber || '').trim(),
      clinicAddress: String(application.address || application.vendorName || '').trim(),
      consultationFee: 0,
      rating: 4.5,
      reviewsCount: 0,
      languages: ['English'],
      availableModes: ['clinic', 'video'],
      availableSlots: [],
      biography: `Partner provider onboarded from ${application.entityType} application.`,
      profilePhotoUrl: '',
      isPartnerProvided: true,
      approvalStatus: 'approved',
      reviewNotes: String(application.reviewNotes || '').trim(),
      reviewedBy: application.reviewedBy || undefined,
      reviewedAt: application.reviewedAt || new Date(),
      isActive: true,
    });
  }

  const existing = inMemoryStore.doctors.find(
    (doctor) => doctor.userId === String(application.userId) && doctor.name === doctorName && doctor.isPartnerProvided === true
  );
  if (existing) {
    return existing;
  }

  const created = {
    id: `doc-memory-${Date.now()}-${crypto.randomUUID()}`,
    userId: String(application.userId),
    name: doctorName,
    specialty: String(application.specialtyOrService || 'General Physician').trim(),
    qualifications: String(application.licenseNumber || '').trim(),
    experienceYears: 0,
    consultationFee: 0,
    rating: 4.5,
    reviewsCount: 0,
    languages: ['English'],
    clinicAddress: String(application.address || application.vendorName || '').trim(),
    availableModes: ['clinic', 'video'],
    availableSlots: [],
    biography: `Partner provider onboarded from ${application.entityType} application.`,
    profilePhotoUrl: '',
    isPartnerProvided: true,
    approvalStatus: 'approved',
    reviewNotes: String(application.reviewNotes || '').trim(),
    reviewedBy: String(application.reviewedBy || ''),
    reviewedAt: application.reviewedAt ? new Date(application.reviewedAt) : new Date(),
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  inMemoryStore.doctors.unshift(created);
  return created;
};

const sanitizeFileName = (fileName = '') => {
  return String(fileName || '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
};

const parseNumber = (value, fallbackValue = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
};

const ALLOWED_PARTNER_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
]);

const ALLOWED_PRESCRIPTION_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
]);

const SUPPORTED_PAYMENT_PROVIDERS = new Set(['simulated', 'razorpay', 'stripe']);

const normalizePaymentProvider = (provider) => {
  const value = String(provider || 'simulated').trim().toLowerCase();
  return SUPPORTED_PAYMENT_PROVIDERS.has(value) ? value : 'simulated';
};

const createPaymentReference = (prefix = 'HC') => {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
};

const isAllowedUploadMimeType = (mimetype = '', allowedTypes = ALLOWED_PARTNER_DOCUMENT_TYPES) => {
  return allowedTypes.has(String(mimetype || '').toLowerCase());
};

const APPOINTMENT_CATEGORIES = new Set(['doctor', 'lab', 'scan', 'package', 'other']);
const LAB_LIKE_APPOINTMENT_CATEGORIES = new Set(['lab', 'scan', 'package']);
const APPOINTMENT_STATUSES = new Set([
  'requested',
  'booked',
  'confirmed',
  'rescheduled',
  'in_progress',
  'sample_collected',
  'under_processing',
  'results_ready',
  'delivered',
  'cancelled',
  'completed',
  'no_show',
]);
const APPOINTMENT_TRANSITIONS = {
  requested: new Set(['confirmed', 'rescheduled', 'cancelled', 'no_show']),
  booked: new Set(['confirmed', 'rescheduled', 'cancelled', 'sample_collected']),
  confirmed: new Set(['in_progress', 'rescheduled', 'cancelled', 'no_show', 'sample_collected']),
  rescheduled: new Set(['confirmed', 'cancelled', 'no_show', 'sample_collected']),
  in_progress: new Set(['completed', 'cancelled', 'no_show']),
  sample_collected: new Set(['under_processing', 'cancelled']),
  under_processing: new Set(['results_ready', 'cancelled']),
  results_ready: new Set(['delivered']),
  delivered: new Set([]),
  cancelled: new Set([]),
  completed: new Set([]),
  no_show: new Set([]),
};

const PHARMACY_ORDER_STATUSES = new Set(['placed', 'verified', 'processing', 'out_for_delivery', 'delivered', 'cancelled']);
const PHARMACY_TRANSITIONS = {
  placed: new Set(['verified', 'processing', 'cancelled']),
  verified: new Set(['processing', 'cancelled']),
  processing: new Set(['out_for_delivery', 'cancelled']),
  out_for_delivery: new Set(['delivered', 'cancelled']),
  delivered: new Set([]),
  cancelled: new Set([]),
};

const normalizeAppointmentCategory = (category = '') => {
  const normalized = String(category || '').trim().toLowerCase();
  return APPOINTMENT_CATEGORIES.has(normalized) ? normalized : 'doctor';
};

const isLabLikeAppointment = (category = '') => LAB_LIKE_APPOINTMENT_CATEGORIES.has(normalizeAppointmentCategory(category));

const normalizeAppointmentStatus = (status, category = '') => {
  const normalized = String(status || '').trim().toLowerCase();
  if (APPOINTMENT_STATUSES.has(normalized)) {
    return normalized;
  }
  return isLabLikeAppointment(category) ? 'booked' : 'requested';
};

const validateAppointmentTransition = (currentStatus, nextStatus, category = '') => {
  const current = normalizeAppointmentStatus(currentStatus, category);
  const next = normalizeAppointmentStatus(nextStatus, category);

  if (current === next) {
    return null;
  }

  const isLab = isLabLikeAppointment(category);
  const doctorOnlyStatuses = new Set(['in_progress', 'completed', 'no_show']);
  const labOnlyStatuses = new Set(['sample_collected', 'under_processing', 'results_ready', 'delivered']);

  if (!isLab && labOnlyStatuses.has(next)) {
    return `status ${next} is only valid for lab/scan/package appointments`;
  }

  if (isLab && doctorOnlyStatuses.has(next)) {
    return `status ${next} is not valid for lab/scan/package appointments`;
  }

  const allowed = APPOINTMENT_TRANSITIONS[current] || new Set();
  if (!allowed.has(next)) {
    return `cannot change appointment status from ${current} to ${next}`;
  }

  return null;
};

const normalizePharmacyOrderStatus = (status = '') => {
  const normalized = String(status || '').trim().toLowerCase();
  return PHARMACY_ORDER_STATUSES.has(normalized) ? normalized : null;
};

const validatePharmacyOrderTransition = (currentStatus, nextStatus) => {
  const current = normalizePharmacyOrderStatus(currentStatus) || 'placed';
  const next = normalizePharmacyOrderStatus(nextStatus);
  if (!next) {
    return 'Invalid orderStatus value';
  }

  if (current === next) {
    return null;
  }

  const allowed = PHARMACY_TRANSITIONS[current] || new Set();
  if (!allowed.has(next)) {
    return `cannot change order status from ${current} to ${next}`;
  }

  return null;
};

const validateAppointmentPayload = (payload = {}) => {
  if (!payload.doctorName || !payload.appointmentDate || !payload.appointmentTime || !payload.patientName) {
    return 'doctorName, appointmentDate, appointmentTime, and patientName are required';
  }
  if (payload.category && !APPOINTMENT_CATEGORIES.has(String(payload.category).trim().toLowerCase())) {
    return `category must be one of: ${Array.from(APPOINTMENT_CATEGORIES).join(', ')}`;
  }
  const normalizedStatus = String(payload.status || '').trim().toLowerCase();
  if (normalizedStatus && !APPOINTMENT_STATUSES.has(normalizedStatus)) {
    return `status must be one of: ${Array.from(APPOINTMENT_STATUSES).join(', ')}`;
  }
  return null;
};

const validatePharmacyItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return 'At least one cart item is required';
  }
  for (const item of items) {
    if (!item || !String(item.name || '').trim()) {
      return 'Each cart item must include a valid name';
    }
    const unitPrice = parseNumber(item.unitPrice ?? item.price, -1);
    if (unitPrice < 0) {
      return 'Each cart item must include a valid unitPrice';
    }
    const quantity = parseNumber(item.quantity, 0);
    if (quantity < 1) {
      return 'Each cart item must include a valid positive quantity';
    }
  }
  return null;
};

const RECORD_VISIBILITY_VALUES = new Set(['private', 'family', 'care-team']);

const normalizeRecordVisibility = (value = '') => {
  const normalized = String(value || 'private').trim().toLowerCase();
  return RECORD_VISIBILITY_VALUES.has(normalized) ? normalized : 'private';
};

const parseDateOrNull = (value) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const validateRecordConsentPayload = (payload = {}) => {
  const visibility = normalizeRecordVisibility(payload.visibility);
  const consentAccepted = payload.consentAccepted === true || String(payload.consentAccepted).toLowerCase() === 'true';
  const consentExpiryDate = parseDateOrNull(payload.consentExpiryDate);
  if (!consentAccepted) {
    return 'consentAccepted must be true before uploading a health record';
  }
  if (visibility !== 'private' && !consentExpiryDate) {
    return 'consentExpiryDate is required when visibility is family or care-team';
  }
  if (consentExpiryDate && consentExpiryDate.getTime() <= Date.now()) {
    return 'consentExpiryDate must be in the future';
  }
  return null;
};

const RECORD_RETENTION_DAYS = 30;

const buildRecordPurgeAfterDate = (deletedAt = new Date()) =>
  new Date(new Date(deletedAt).getTime() + RECORD_RETENTION_DAYS * 24 * 60 * 60 * 1000);

const HIGH_RISK_CATEGORIES = new Set(['cardiac', 'diabetes', 'infection']);
const PHARMACY_SAFETY_RULE_SOURCE = 'internal_rules_v1';
const INTERACTION_KEYWORDS = [
  {
    pair: ['amoxicillin', 'metformin'],
    message: 'Monitor GI side effects when antibiotic and diabetes medicines are combined.',
    flag: 'interaction_antibiotic_diabetes',
  },
  {
    pair: ['insulin', 'metformin'],
    message: 'Combined diabetes therapy detected. Confirm dose schedule with prescribing doctor.',
    flag: 'interaction_diabetes_combo',
  },
];

const assessPharmacySafety = (items = []) => {
  const normalizedNames = new Map();
  const highRiskCategories = new Set();
  let prescriptionCount = 0;

  for (const item of items) {
    const normalizedName = String(item.name || '').trim().toLowerCase();
    if (normalizedName) {
      normalizedNames.set(normalizedName, (normalizedNames.get(normalizedName) || 0) + Number(item.quantity || 1));
    }
    if (item.requiresPrescription) {
      prescriptionCount += 1;
      const category = String(item.category || '').trim().toLowerCase();
      if (HIGH_RISK_CATEGORIES.has(category)) {
        highRiskCategories.add(category);
      }
    }
  }

  const interactionAlerts = [];
  const safetyFlags = [];

  const duplicateNames = Array.from(normalizedNames.entries()).filter(([, count]) => count > 1).map(([name]) => name);
  if (duplicateNames.length > 0) {
    interactionAlerts.push(`Potential duplicate medicines in cart: ${duplicateNames.join(', ')}`);
    safetyFlags.push('duplicate_medicine_name');
  }

  if (prescriptionCount >= 3) {
    interactionAlerts.push('Three or more prescription medicines in one order. Pharmacist review recommended.');
    safetyFlags.push('polypharmacy_risk');
  }

  if (highRiskCategories.size >= 2) {
    interactionAlerts.push('Multiple high-risk therapy categories detected. Manual pharmacy review required.');
    safetyFlags.push('high_risk_multi_category');
  }

  const nameKeys = Array.from(normalizedNames.keys());
  for (const rule of INTERACTION_KEYWORDS) {
    const [left, right] = rule.pair;
    if (nameKeys.some((name) => name.includes(left)) && nameKeys.some((name) => name.includes(right))) {
      interactionAlerts.push(rule.message);
      safetyFlags.push(rule.flag);
    }
  }

  const requiresPharmacistCall = safetyFlags.length > 0;
  return { interactionAlerts, safetyFlags, requiresPharmacistCall, safetyRuleSource: PHARMACY_SAFETY_RULE_SOURCE };
};

const INCIDENT_ACK_WINDOW_MINUTES = {
  low: 30,
  medium: 20,
  high: 10,
  critical: 5,
  resolved: 0,
};

const EMERGENCY_ESCALATION_STEPS = ['low', 'medium', 'high', 'critical', 'resolved'];

const getIncidentAckDueAt = (escalationLevel = 'high', at = new Date()) => {
  const key = String(escalationLevel || 'high').toLowerCase();
  const minutes = INCIDENT_ACK_WINDOW_MINUTES[key] ?? INCIDENT_ACK_WINDOW_MINUTES.high;
  return new Date(new Date(at).getTime() + minutes * 60 * 1000);
};

const nextEscalationLevel = (current = 'high') => {
  const normalized = String(current || 'high').toLowerCase();
  const index = EMERGENCY_ESCALATION_STEPS.indexOf(normalized);
  if (index === -1 || index >= EMERGENCY_ESCALATION_STEPS.length - 2) {
    return normalized === 'resolved' ? 'resolved' : 'critical';
  }
  return EMERGENCY_ESCALATION_STEPS[index + 1];
};

const EMERGENCY_STATUS_TRANSITIONS = {
  open: new Set(['acknowledged']),
  acknowledged: new Set(['resolved']),
  resolved: new Set([]),
};

const validateEmergencyTransition = (currentStatus = '', nextStatus = '') => {
  const current = String(currentStatus || 'open').toLowerCase();
  const next = String(nextStatus || '').toLowerCase();
  if (!['open', 'acknowledged', 'resolved'].includes(next)) {
    return 'Invalid emergency status';
  }
  if (current === next) {
    return null;
  }
  const allowed = EMERGENCY_STATUS_TRANSITIONS[current] || new Set();
  if (!allowed.has(next)) {
    return `cannot change emergency status from ${current} to ${next}`;
  }
  return null;
};

const tryAutoEscalateIncident = (incident) => {
  if (!incident) {
    return { changed: false };
  }

  const status = String(incident.status || '').toLowerCase();
  const currentEscalation = String(incident.escalationLevel || '').toLowerCase();
  if (status !== 'open' || currentEscalation === 'critical' || currentEscalation === 'resolved') {
    return { changed: false };
  }

  const ackDueAt = parseDateOrNull(incident.ackDueAt);
  if (!ackDueAt || ackDueAt.getTime() > Date.now()) {
    return { changed: false };
  }

  const nextLevel = nextEscalationLevel(currentEscalation || 'high');
  if (nextLevel === currentEscalation) {
    return { changed: false };
  }

  incident.escalationLevel = nextLevel;
  incident.escalatedAt = new Date();
  incident.lastEscalationReason = `Auto escalation: acknowledgement missed SLA window for ${currentEscalation || 'high'}.`;
  incident.ackDueAt = getIncidentAckDueAt(nextLevel);
  const currentTimeline = Array.isArray(incident.timeline) ? incident.timeline : [];
  currentTimeline.push({
    step: `auto_escalated_to_${nextLevel}`,
    at: new Date(),
  });
  incident.timeline = currentTimeline;
  return { changed: true };
};

const diffHours = (from, to) => {
  const start = parseDateOrNull(from);
  const end = parseDateOrNull(to);
  if (!start || !end) {
    return null;
  }
  return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
};

const getOrderTimelineAt = (order, status) => {
  if (!Array.isArray(order?.orderTimeline)) {
    return null;
  }
  const step = order.orderTimeline.find((entry) => String(entry?.status || '').toLowerCase() === String(status).toLowerCase());
  return step?.at || null;
};

const PARTNER_REVIEW_SLA_HOURS = 48;

const computePartnerSlaStats = ({ applications = [], orders = [], appointments = [] }) => {
  const reviewedApps = applications.filter((application) => parseDateOrNull(application.reviewedAt));
  const reviewHours = reviewedApps
    .map((application) => diffHours(application.createdAt, application.reviewedAt))
    .filter((value) => Number.isFinite(value));
  const avgReviewTurnaroundHours = reviewHours.length
    ? Number((reviewHours.reduce((sum, value) => sum + value, 0) / reviewHours.length).toFixed(2))
    : 0;
  const pendingSlaBreaches = applications.filter((application) => {
    if (String(application.status || '').toLowerCase() !== 'pending') {
      return false;
    }
    const ageHours = diffHours(application.createdAt, new Date());
    return Number.isFinite(ageHours) && ageHours > PARTNER_REVIEW_SLA_HOURS;
  }).length;

  const deliveredOrders = orders.filter((order) => String(order.orderStatus || '').toLowerCase() === 'delivered');
  const deliveredOrderHours = deliveredOrders
    .map((order) => {
      const deliveredAt = getOrderTimelineAt(order, 'delivered') || order.updatedAt;
      return diffHours(order.createdAt, deliveredAt);
    })
    .filter((value) => Number.isFinite(value));
  const avgOrderFulfillmentHours = deliveredOrderHours.length
    ? Number((deliveredOrderHours.reduce((sum, value) => sum + value, 0) / deliveredOrderHours.length).toFixed(2))
    : 0;

  const completedAppointments = appointments.filter((appointment) => {
    const status = String(appointment.status || '').toLowerCase();
    return status === 'completed' || status === 'delivered';
  }).length;
  const appointmentCompletionRate = appointments.length
    ? Number(((completedAppointments / appointments.length) * 100).toFixed(2))
    : 0;

  return {
    reviewSlaTargetHours: PARTNER_REVIEW_SLA_HOURS,
    pendingSlaBreaches,
    avgReviewTurnaroundHours,
    avgOrderFulfillmentHours,
    appointmentCompletionRate,
  };
};

const userIdString = (req) => String(req?.user?._id || '');

const IDEMPOTENCY_TTL_HOURS = 24;
const IDEMPOTENCY_KEY_MAX_LENGTH = 128;

const sortObjectRecursively = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectRecursively(item));
  }
  if (!value || typeof value !== 'object' || value instanceof Date) {
    return value;
  }
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      acc[key] = sortObjectRecursively(value[key]);
      return acc;
    }, {});
};

const normalizeIdempotencyKey = (value = '') => {
  const key = String(value || '').trim();
  if (!key) {
    return '';
  }
  return key.slice(0, IDEMPOTENCY_KEY_MAX_LENGTH);
};

const getRequestIdempotencyKey = (req) => {
  return normalizeIdempotencyKey(
    req.headers['x-idempotency-key'] ||
      req.headers['idempotency-key'] ||
      req.body?.idempotencyKey ||
      req.query?.idempotencyKey
  );
};

const buildIdempotencyRequestHash = (req, extra = {}) => {
  const payload = {
    body: req.body || {},
    params: req.params || {},
    query: req.query || {},
    extra,
  };
  const stable = JSON.stringify(sortObjectRecursively(payload));
  return crypto.createHash('sha256').update(stable).digest('hex');
};

const getIdempotencyRecordExpiry = () =>
  new Date(Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000);

const findIdempotencyRecord = async ({ userId, key, method, routeKey }) => {
  if (!key || !userId) {
    return null;
  }
  if (isMongoReady()) {
    const record = await HealthcareIdempotencyKey.findOne({
      userId,
      key,
      method,
      routeKey,
      expiresAt: { $gt: new Date() },
    }).lean();
    return record ? toClientObject(record) : null;
  }

  const record = inMemoryStore.idempotencyRecords.find((entry) => {
    return (
      entry.userId === String(userId) &&
      entry.key === key &&
      entry.method === method &&
      entry.routeKey === routeKey &&
      parseDateOrNull(entry.expiresAt) &&
      parseDateOrNull(entry.expiresAt).getTime() > Date.now()
    );
  });
  return record || null;
};

const saveIdempotencyRecord = async ({ userId, key, method, routeKey, requestHash, statusCode, responseBody }) => {
  if (!key || !userId) {
    return;
  }
  const expiresAt = getIdempotencyRecordExpiry();
  if (isMongoReady()) {
    await HealthcareIdempotencyKey.findOneAndUpdate(
      { userId, key, method, routeKey },
      {
        userId,
        key,
        method,
        routeKey,
        requestHash,
        statusCode,
        responseBody,
        expiresAt,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return;
  }

  const existingIndex = inMemoryStore.idempotencyRecords.findIndex((entry) => {
    return (
      entry.userId === String(userId) &&
      entry.key === key &&
      entry.method === method &&
      entry.routeKey === routeKey
    );
  });
  const nextValue = {
    id: `idem-${Date.now()}-${crypto.randomUUID()}`,
    userId: String(userId),
    key,
    method,
    routeKey,
    requestHash,
    statusCode,
    responseBody,
    expiresAt: expiresAt.toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (existingIndex === -1) {
    inMemoryStore.idempotencyRecords.unshift(nextValue);
    return;
  }
  inMemoryStore.idempotencyRecords[existingIndex] = {
    ...inMemoryStore.idempotencyRecords[existingIndex],
    ...nextValue,
  };
};

const executeWithIdempotency = async ({
  req,
  routeKey,
  buildExtra = () => ({}),
  onExecute,
}) => {
  const userId = userIdString(req);
  const method = String(req.method || 'POST').toUpperCase();
  const key = getRequestIdempotencyKey(req);
  const extra = buildExtra();
  const requestHash = buildIdempotencyRequestHash(req, extra);

  if (key) {
    const existing = await findIdempotencyRecord({ userId, key, method, routeKey });
    if (existing) {
      if (existing.requestHash !== requestHash) {
        return {
          reused: false,
          conflict: true,
          response: {
            success: false,
            message: 'Idempotency key reuse conflict: request payload changed',
          },
        };
      }
      return {
        reused: true,
        conflict: false,
        statusCode: Number(existing.statusCode || 200),
        response: existing.responseBody || {},
      };
    }
  }

  const execution = await onExecute();
  if (key && execution && Number(execution.statusCode) >= 200 && Number(execution.statusCode) < 300) {
    await saveIdempotencyRecord({
      userId,
      key,
      method,
      routeKey,
      requestHash,
      statusCode: execution.statusCode,
      responseBody: execution.response,
    });
  }
  return {
    reused: false,
    conflict: false,
    statusCode: execution?.statusCode,
    response: execution?.response,
  };
};

const ensureHealthcareSeedData = async () => {
  if (!isMongoReady()) {
    return;
  }

  const [existingDoctors, existingLabTests, existingPackages, existingMedicines] = await Promise.all([
    HealthcareDoctor.find({}, { name: 1 }).lean(),
    HealthcareLabTest.find({}, { name: 1 }).lean(),
    HealthcarePackage.find({}, { name: 1 }).lean(),
    HealthcareMedicine.find({}, { name: 1 }).lean(),
  ]);

  const existingDoctorNames = new Set(existingDoctors.map((item) => String(item.name || '').trim().toLowerCase()));
  const missingDoctors = seedDoctors
    .filter((item) => !existingDoctorNames.has(String(item.name || '').trim().toLowerCase()))
    .map((item) => ({ ...item, approvalStatus: 'approved', isActive: true }));
  if (missingDoctors.length > 0) {
    await HealthcareDoctor.insertMany(missingDoctors);
  }

  const existingLabTestNames = new Set(existingLabTests.map((item) => String(item.name || '').trim().toLowerCase()));
  const missingLabTests = seedLabTests
    .filter((item) => !existingLabTestNames.has(String(item.name || '').trim().toLowerCase()))
    .map((item) => ({ ...item, approvalStatus: 'approved', isActive: true }));
  if (missingLabTests.length > 0) {
    await HealthcareLabTest.insertMany(missingLabTests);
  }

  const existingPackageNames = new Set(existingPackages.map((item) => String(item.name || '').trim().toLowerCase()));
  const missingPackages = seedPackages
    .filter((item) => !existingPackageNames.has(String(item.name || '').trim().toLowerCase()))
    .map((item) => ({ ...item, approvalStatus: 'approved', isActive: true }));
  if (missingPackages.length > 0) {
    await HealthcarePackage.insertMany(missingPackages);
  }

  const existingMedicineNames = new Set(existingMedicines.map((item) => String(item.name || '').trim().toLowerCase()));
  const missingMedicines = seedMedicines
    .filter((item) => !existingMedicineNames.has(String(item.name || '').trim().toLowerCase()))
    .map((item) => ({ ...item, approvalStatus: 'approved', isActive: true }));
  if (missingMedicines.length > 0) {
    await HealthcareMedicine.insertMany(missingMedicines);
  }
};

const addNotification = async ({ userId, title, message, notificationType = 'system', metadata = {} }) => {
  if (!userId) {
    return;
  }

  if (isMongoReady()) {
    await HealthcareNotification.create({
      userId,
      title,
      message,
      notificationType,
      metadata,
    });
    return;
  }

  inMemoryStore.notifications.unshift({
    id: `notif-${Date.now()}-${crypto.randomUUID()}`,
    userId: String(userId),
    title,
    message,
    notificationType,
    metadata,
    createdAt: new Date().toISOString(),
    readAt: null,
  });
};

const addAuditLog = async ({
  userId,
  actorId,
  action,
  resourceType,
  resourceId,
  details = '',
  metadata = {},
}) => {
  if (!userId || !action || !resourceType || !resourceId) {
    return;
  }

  if (isMongoReady()) {
    await HealthcareAuditLog.create({
      userId,
      actorId,
      action,
      resourceType,
      resourceId,
      details,
      metadata,
    });
    return;
  }

  inMemoryStore.auditLogs.unshift({
    id: `audit-${Date.now()}-${crypto.randomUUID()}`,
    userId: String(userId),
    actorId: actorId ? String(actorId) : '',
    action,
    resourceType,
    resourceId: String(resourceId),
    details,
    metadata,
    createdAt: new Date().toISOString(),
  });
};

router.get('/doctors', async (req, res) => {
  try {
    const specialty = String(req.query.specialty || '').trim();
    const approvalStatus = String(req.query.approvalStatus || 'approved').trim();

    if (isMongoReady()) {
      await ensureHealthcareSeedData();
      const query = { isActive: true };
      if (specialty) {
        query.specialty = specialty;
      }
      if (approvalStatus) {
        query.approvalStatus = approvalStatus;
      }
      const doctors = await HealthcareDoctor.find(query).sort({ createdAt: -1 }).lean();
      return res.status(200).json({ success: true, data: doctors.map(toClientObject) });
    }

    const doctors = inMemoryStore.doctors.filter((doctor) => {
      if (specialty && doctor.specialty !== specialty) {
        return false;
      }
      if (approvalStatus && doctor.approvalStatus !== approvalStatus) {
        return false;
      }
      return Boolean(doctor.isActive);
    });
    return res.status(200).json({ success: true, data: doctors });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch doctors', error: error.message });
  }
});

router.post('/doctors', authenticate, async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.name || !payload.specialty) {
      return res.status(400).json({ success: false, message: 'name and specialty are required' });
    }

    const isAdmin = hasAdminPrivileges(req.user);
    const approvalStatus = isAdmin ? 'approved' : 'pending';

    if (isMongoReady()) {
      const created = await HealthcareDoctor.create({
        userId: req.user._id,
        name: payload.name,
        specialty: payload.specialty,
        qualifications: payload.qualifications || '',
        experienceYears: parseNumber(payload.experienceYears, 0),
        consultationFee: parseNumber(payload.consultationFee, 0),
        rating: parseNumber(payload.rating, 4.5),
        reviewsCount: parseNumber(payload.reviewsCount, 0),
        languages: Array.isArray(payload.languages) ? payload.languages : [],
        clinicAddress: payload.clinicAddress || '',
        availableModes: Array.isArray(payload.availableModes) && payload.availableModes.length > 0
          ? payload.availableModes
          : ['clinic', 'video'],
        availableSlots: Array.isArray(payload.availableSlots) ? payload.availableSlots : [],
        biography: payload.biography || '',
        profilePhotoUrl: payload.profilePhotoUrl || '',
        isPartnerProvided: true,
        approvalStatus,
      });

      return res.status(201).json({ success: true, data: toClientObject(created) });
    }

    const created = {
      id: `doc-memory-${Date.now()}-${crypto.randomUUID()}`,
      userId: userIdString(req),
      name: payload.name,
      specialty: payload.specialty,
      qualifications: payload.qualifications || '',
      experienceYears: parseNumber(payload.experienceYears, 0),
      consultationFee: parseNumber(payload.consultationFee, 0),
      rating: parseNumber(payload.rating, 4.5),
      reviewsCount: parseNumber(payload.reviewsCount, 0),
      languages: Array.isArray(payload.languages) ? payload.languages : [],
      clinicAddress: payload.clinicAddress || '',
      availableModes: Array.isArray(payload.availableModes) && payload.availableModes.length > 0
        ? payload.availableModes
        : ['clinic', 'video'],
      availableSlots: Array.isArray(payload.availableSlots) ? payload.availableSlots : [],
      biography: payload.biography || '',
      profilePhotoUrl: payload.profilePhotoUrl || '',
      isPartnerProvided: true,
      approvalStatus,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryStore.doctors.unshift(created);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create doctor profile', error: error.message });
  }
});

router.patch('/doctors/:doctorId/approval', authenticate, verifyAdmin, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { approvalStatus, reviewNotes } = req.body || {};
    if (!['approved', 'pending', 'rejected'].includes(String(approvalStatus || ''))) {
      return res.status(400).json({ success: false, message: 'Invalid approvalStatus' });
    }

    if (isMongoReady()) {
      const doctor = await HealthcareDoctor.findByIdAndUpdate(
        doctorId,
        {
          approvalStatus,
          reviewNotes: reviewNotes || '',
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
        },
        { new: true }
      );
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor not found' });
      }
      return res.status(200).json({ success: true, data: toClientObject(doctor) });
    }

    const index = inMemoryStore.doctors.findIndex((doctor) => doctor.id === doctorId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    inMemoryStore.doctors[index] = {
      ...inMemoryStore.doctors[index],
      approvalStatus,
      reviewNotes: reviewNotes || '',
      reviewedBy: userIdString(req),
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return res.status(200).json({ success: true, data: inMemoryStore.doctors[index] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update doctor approval', error: error.message });
  }
});

router.get('/lab-tests', async (req, res) => {
  try {
    const testType = String(req.query.type || '').trim();
    const approvalStatus = String(req.query.approvalStatus || 'approved').trim();

    if (isMongoReady()) {
      await ensureHealthcareSeedData();
      const query = { isActive: true };
      if (testType) {
        query.type = testType;
      }
      if (approvalStatus) {
        query.approvalStatus = approvalStatus;
      }
      const tests = await HealthcareLabTest.find(query).sort({ createdAt: -1 }).lean();
      const enrichedTests = tests.map((item) => {
        const normalized = toClientObject(item);
        return {
          ...normalized,
          info: buildLabTestInfo(normalized),
        };
      });
      return res.status(200).json({ success: true, data: enrichedTests });
    }

    const tests = inMemoryStore.labTests.filter((test) => {
      if (testType && test.type !== testType) {
        return false;
      }
      if (approvalStatus && test.approvalStatus !== approvalStatus) {
        return false;
      }
      return Boolean(test.isActive);
    });
    const enrichedTests = tests.map((test) => ({
      ...test,
      info: buildLabTestInfo(test),
    }));
    return res.status(200).json({ success: true, data: enrichedTests });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch lab tests', error: error.message });
  }
});

router.get('/lab-tests/info', async (req, res) => {
  try {
    const queryText = String(req.query.q || '').trim();
    let availableTests = [];

    if (isMongoReady()) {
      await ensureHealthcareSeedData();
      availableTests = await HealthcareLabTest.find({ isActive: true, approvalStatus: 'approved' }).lean();
    } else {
      availableTests = inMemoryStore.labTests.filter((test) => Boolean(test.isActive) && test.approvalStatus === 'approved');
    }

    const explanation = explainLabTestQuery(queryText, availableTests.map(toClientObject));
    return res.status(200).json({ success: true, data: explanation });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch test explanation', error: error.message });
  }
});

router.post('/lab-tests', authenticate, async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.name || payload.price == null) {
      return res.status(400).json({ success: false, message: 'name and price are required' });
    }

    const approvalStatus = hasAdminPrivileges(req.user) ? 'approved' : 'pending';
    if (isMongoReady()) {
      const created = await HealthcareLabTest.create({
        name: payload.name,
        price: parseNumber(payload.price, 0),
        homeCollection: Boolean(payload.homeCollection),
        type: payload.type === 'scan' ? 'scan' : payload.type || 'blood',
        turnaroundHours: parseNumber(payload.turnaroundHours, 24),
        purpose: payload.purpose || '',
        usedFor: payload.usedFor || '',
        preparationNotes: payload.preparationNotes || '',
        partnerName: payload.partnerName || req.user.name || '',
        approvalStatus,
      });
      const normalized = toClientObject(created);
      return res.status(201).json({
        success: true,
        data: {
          ...normalized,
          info: buildLabTestInfo(normalized),
        },
      });
    }

    const created = {
      id: `lab-memory-${Date.now()}-${crypto.randomUUID()}`,
      name: payload.name,
      price: parseNumber(payload.price, 0),
      homeCollection: Boolean(payload.homeCollection),
      type: payload.type === 'scan' ? 'scan' : payload.type || 'blood',
      turnaroundHours: parseNumber(payload.turnaroundHours, 24),
      purpose: payload.purpose || '',
      usedFor: payload.usedFor || '',
      preparationNotes: payload.preparationNotes || '',
      partnerName: payload.partnerName || req.user.name || '',
      approvalStatus,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryStore.labTests.unshift(created);
    return res.status(201).json({
      success: true,
      data: {
        ...created,
        info: buildLabTestInfo(created),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create lab test', error: error.message });
  }
});

router.patch('/lab-tests/:labTestId/approval', authenticate, verifyAdmin, async (req, res) => {
  try {
    const { labTestId } = req.params;
    const { approvalStatus } = req.body || {};
    if (!['approved', 'pending', 'rejected'].includes(String(approvalStatus || ''))) {
      return res.status(400).json({ success: false, message: 'Invalid approvalStatus' });
    }
    if (isMongoReady()) {
      const updated = await HealthcareLabTest.findByIdAndUpdate(labTestId, { approvalStatus }, { new: true });
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Lab test not found' });
      }
      return res.status(200).json({ success: true, data: toClientObject(updated) });
    }

    const index = inMemoryStore.labTests.findIndex((item) => item.id === labTestId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Lab test not found' });
    }
    inMemoryStore.labTests[index] = { ...inMemoryStore.labTests[index], approvalStatus, updatedAt: new Date().toISOString() };
    return res.status(200).json({ success: true, data: inMemoryStore.labTests[index] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update lab test approval', error: error.message });
  }
});

router.get('/health-packages', async (req, res) => {
  try {
    const approvalStatus = String(req.query.approvalStatus || 'approved').trim();
    if (isMongoReady()) {
      await ensureHealthcareSeedData();
      const query = { isActive: true };
      if (approvalStatus) {
        query.approvalStatus = approvalStatus;
      }
      const packages = await HealthcarePackage.find(query).sort({ createdAt: -1 }).lean();
      return res.status(200).json({ success: true, data: packages.map(toClientObject) });
    }
    const packages = inMemoryStore.packages.filter((item) => {
      if (approvalStatus && item.approvalStatus !== approvalStatus) {
        return false;
      }
      return Boolean(item.isActive);
    });
    return res.status(200).json({ success: true, data: packages });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch health packages', error: error.message });
  }
});

router.post('/health-packages', authenticate, async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.name || payload.tests == null || payload.price == null) {
      return res.status(400).json({ success: false, message: 'name, tests, and price are required' });
    }
    const approvalStatus = hasAdminPrivileges(req.user) ? 'approved' : 'pending';
    if (isMongoReady()) {
      const created = await HealthcarePackage.create({
        name: payload.name,
        tests: parseNumber(payload.tests, 1),
        price: parseNumber(payload.price, 0),
        discount: payload.discount || '',
        description: payload.description || '',
        approvalStatus,
      });
      return res.status(201).json({ success: true, data: toClientObject(created) });
    }

    const created = {
      id: `pkg-memory-${Date.now()}-${crypto.randomUUID()}`,
      name: payload.name,
      tests: parseNumber(payload.tests, 1),
      price: parseNumber(payload.price, 0),
      discount: payload.discount || '',
      description: payload.description || '',
      approvalStatus,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryStore.packages.unshift(created);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create health package', error: error.message });
  }
});

router.get('/medicines', async (req, res) => {
  try {
    const queryText = String(req.query.q || '').trim().toLowerCase();
    const approvalStatus = String(req.query.approvalStatus || 'approved').trim();
    if (isMongoReady()) {
      await ensureHealthcareSeedData();
      const query = { isActive: true };
      if (approvalStatus) {
        query.approvalStatus = approvalStatus;
      }
      if (queryText) {
        query.$or = [{ name: { $regex: queryText, $options: 'i' } }, { category: { $regex: queryText, $options: 'i' } }];
      }
      const medicines = await HealthcareMedicine.find(query).sort({ createdAt: -1 }).lean();
      const enrichedMedicines = medicines.map((item) => {
        const normalized = toClientObject(item);
        return {
          ...normalized,
          info: buildMedicineInfo(normalized),
        };
      });
      return res.status(200).json({ success: true, data: enrichedMedicines });
    }

    const medicines = inMemoryStore.medicines.filter((medicine) => {
      if (approvalStatus && medicine.approvalStatus !== approvalStatus) {
        return false;
      }
      if (!medicine.isActive) {
        return false;
      }
      if (!queryText) {
        return true;
      }
      return String(medicine.name).toLowerCase().includes(queryText) || String(medicine.category).toLowerCase().includes(queryText);
    });
    const enrichedMedicines = medicines.map((medicine) => ({
      ...medicine,
      info: buildMedicineInfo(medicine),
    }));
    return res.status(200).json({ success: true, data: enrichedMedicines });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch medicines', error: error.message });
  }
});

router.get('/medicines/info', async (req, res) => {
  try {
    const queryText = String(req.query.q || '').trim();
    let availableMedicines = [];

    if (isMongoReady()) {
      await ensureHealthcareSeedData();
      availableMedicines = await HealthcareMedicine.find({ isActive: true, approvalStatus: 'approved' }).lean();
    } else {
      availableMedicines = inMemoryStore.medicines.filter(
        (medicine) => Boolean(medicine.isActive) && medicine.approvalStatus === 'approved'
      );
    }

    const explanation = explainMedicineQuery(queryText, availableMedicines.map(toClientObject));
    return res.status(200).json({ success: true, data: explanation });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch medicine explanation', error: error.message });
  }
});

router.post('/medicines', authenticate, async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.name || payload.price == null) {
      return res.status(400).json({ success: false, message: 'name and price are required' });
    }
    const approvalStatus = hasAdminPrivileges(req.user) ? 'approved' : 'pending';

    if (isMongoReady()) {
      const created = await HealthcareMedicine.create({
        name: payload.name,
        price: parseNumber(payload.price, 0),
        category: payload.category || 'General',
        requiresPrescription: Boolean(payload.requiresPrescription),
        stock: parseNumber(payload.stock, 0),
        purpose: payload.purpose || '',
        ingredients: payload.ingredients || '',
        warning: payload.warning || '',
        vendorName: payload.vendorName || req.user.name || '',
        approvalStatus,
      });
      const normalized = toClientObject(created);
      return res.status(201).json({
        success: true,
        data: {
          ...normalized,
          info: buildMedicineInfo(normalized),
        },
      });
    }

    const created = {
      id: `med-memory-${Date.now()}-${crypto.randomUUID()}`,
      name: payload.name,
      price: parseNumber(payload.price, 0),
      category: payload.category || 'General',
      requiresPrescription: Boolean(payload.requiresPrescription),
      stock: parseNumber(payload.stock, 0),
      purpose: payload.purpose || '',
      ingredients: payload.ingredients || '',
      warning: payload.warning || '',
      vendorName: payload.vendorName || req.user.name || '',
      approvalStatus,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryStore.medicines.unshift(created);
    return res.status(201).json({
      success: true,
      data: {
        ...created,
        info: buildMedicineInfo(created),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create medicine', error: error.message });
  }
});

router.patch('/medicines/:medicineId/approval', authenticate, verifyAdmin, async (req, res) => {
  try {
    const { medicineId } = req.params;
    const { approvalStatus } = req.body || {};
    if (!['approved', 'pending', 'rejected'].includes(String(approvalStatus || ''))) {
      return res.status(400).json({ success: false, message: 'Invalid approvalStatus' });
    }

    if (isMongoReady()) {
      const updated = await HealthcareMedicine.findByIdAndUpdate(medicineId, { approvalStatus }, { new: true });
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Medicine not found' });
      }
      return res.status(200).json({ success: true, data: toClientObject(updated) });
    }

    const index = inMemoryStore.medicines.findIndex((item) => item.id === medicineId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }
    inMemoryStore.medicines[index] = { ...inMemoryStore.medicines[index], approvalStatus, updatedAt: new Date().toISOString() };
    return res.status(200).json({ success: true, data: inMemoryStore.medicines[index] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update medicine approval', error: error.message });
  }
});

router.get('/records', authenticate, async (req, res) => {
  try {
    const familyMember = String(req.query.familyMember || '').trim();
    const includeDeleted = String(req.query.includeDeleted || '').toLowerCase() === 'true';
    const userId = userIdString(req);
    if (isMongoReady()) {
      const query = { userId };
      if (familyMember) {
        query.familyMember = familyMember;
      }
      if (!includeDeleted) {
        query.isDeleted = { $ne: true };
      }
      const records = await HealthcareRecord.find(query).sort({ recordDate: -1, createdAt: -1 }).lean();
      return res.status(200).json({ success: true, data: records.map(toClientObject) });
    }

    const records = inMemoryStore.records.filter((record) => {
      if (record.userId !== userId) {
        return false;
      }
      if (familyMember && record.familyMember !== familyMember) {
        return false;
      }
      if (!includeDeleted && record.isDeleted === true) {
        return false;
      }
      return true;
    });
    return res.status(200).json({ success: true, data: records });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch records', error: error.message });
  }
});

router.post('/records', authenticate, upload.single('file'), async (req, res) => {
  try {
    const payload = req.body || {};
    const userId = userIdString(req);
    const routeKey = 'healthcare.records.create';
    const idemKey = getRequestIdempotencyKey(req);
    const idemRequestHash = buildIdempotencyRequestHash(req, {
      hasFile: Boolean(req.file?.buffer),
      uploadedFileName: req.file?.originalname || '',
    });
    if (idemKey) {
      const existing = await findIdempotencyRecord({
        userId,
        key: idemKey,
        method: 'POST',
        routeKey,
      });
      if (existing) {
        if (existing.requestHash !== idemRequestHash) {
          return res.status(409).json({
            success: false,
            message: 'Idempotency key reuse conflict: request payload changed',
          });
        }
        return res.status(Number(existing.statusCode || 200)).json(existing.responseBody || { success: true });
      }
    }
    const persistIdempotencySuccess = async (statusCode, responseBody) => {
      if (!idemKey) {
        return;
      }
      await saveIdempotencyRecord({
        userId,
        key: idemKey,
        method: 'POST',
        routeKey,
        requestHash: idemRequestHash,
        statusCode,
        responseBody,
      });
    };
    if (!payload.title || !payload.category || !payload.recordDate) {
      return res.status(400).json({ success: false, message: 'title, category, and recordDate are required' });
    }
    const consentError = validateRecordConsentPayload(payload);
    if (consentError) {
      return res.status(400).json({ success: false, message: consentError });
    }
    const visibility = normalizeRecordVisibility(payload.visibility);
    const consentAccepted = payload.consentAccepted === true || String(payload.consentAccepted).toLowerCase() === 'true';
    const consentGrantedAt = parseDateOrNull(payload.consentGrantedAt) || new Date();
    const consentExpiryDate = parseDateOrNull(payload.consentExpiryDate);

    let storageKey = '';
    let fileUrl = payload.fileUrl || '';
    let fileName = payload.fileName || '';
    let fileType = payload.fileType || 'application/octet-stream';
    let fileSize = parseNumber(payload.fileSize, 0);

    if (req.file?.buffer) {
      fileName = sanitizeFileName(req.file.originalname || `record-${Date.now()}`);
      fileType = req.file.mimetype || fileType;
      fileSize = req.file.size || fileSize;
      storageKey = `healthcare/records/${userId}/${Date.now()}-${fileName}`;
      const uploadResult = await uploadToS3(req.file.buffer, storageKey, { contentType: fileType });
      storageKey = uploadResult.s3Key || storageKey;
      fileUrl = uploadResult.s3Url || uploadResult.publicUrlPath || generateSignedUrl(storageKey);
    }

    if (!fileName) {
      return res.status(400).json({ success: false, message: 'Record file is required' });
    }

    if (isMongoReady()) {
      const created = await HealthcareRecord.create({
        userId,
        familyProfileId: payload.familyProfileId || undefined,
        familyMember: payload.familyMember || 'Self',
        title: payload.title,
        category: payload.category,
        doctorName: payload.doctorName || '',
        recordDate: payload.recordDate,
        notes: payload.notes || '',
        fileName,
        fileType,
        fileSize,
        storageKey,
        fileUrl,
        visibility,
        consentAccepted,
        consentGrantedAt,
        consentExpiryDate,
        isDeleted: false,
        deletedAt: null,
        deletionReason: '',
        purgeAfter: null,
        uploadedBy: req.user._id,
      });
      await addNotification({
        userId,
        title: 'Health record uploaded',
        message: `${payload.title} is now available in your records vault.`,
        notificationType: 'record',
        metadata: { recordId: String(created._id) },
      });
      await addAuditLog({
        userId,
        actorId: req.user?._id,
        action: 'record_uploaded',
        resourceType: 'record',
        resourceId: String(created._id),
        details: 'Health record uploaded with consent metadata',
        metadata: {
          visibility,
          consentExpiryDate: consentExpiryDate ? consentExpiryDate.toISOString() : null,
        },
      });
      const responseBody = { success: true, data: toClientObject(created) };
      await persistIdempotencySuccess(201, responseBody);
      return res.status(201).json(responseBody);
    }

    const created = {
      id: `rec-memory-${Date.now()}-${crypto.randomUUID()}`,
      userId,
      familyProfileId: payload.familyProfileId || '',
      familyMember: payload.familyMember || 'Self',
      title: payload.title,
      category: payload.category,
      doctorName: payload.doctorName || '',
      recordDate: payload.recordDate,
      notes: payload.notes || '',
      fileName,
      fileType,
      fileSize,
      storageKey,
      fileUrl,
      visibility,
      consentAccepted,
      consentGrantedAt: consentGrantedAt.toISOString(),
      consentExpiryDate: consentExpiryDate ? consentExpiryDate.toISOString() : null,
      isDeleted: false,
      deletedAt: null,
      deletionReason: '',
      purgeAfter: null,
      uploadedBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryStore.records.unshift(created);
    await addNotification({
      userId,
      title: 'Health record uploaded',
      message: `${payload.title} is now available in your records vault.`,
      notificationType: 'record',
      metadata: { recordId: created.id },
    });
    await addAuditLog({
      userId,
      actorId: req.user?._id,
      action: 'record_uploaded',
      resourceType: 'record',
      resourceId: created.id,
      details: 'Health record uploaded with consent metadata',
      metadata: {
        visibility,
        consentExpiryDate: created.consentExpiryDate,
      },
    });
    const responseBody = { success: true, data: created };
    await persistIdempotencySuccess(201, responseBody);
    return res.status(201).json(responseBody);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create record', error: error.message });
  }
});

router.get('/records/audit', authenticate, async (req, res) => {
  try {
    const userId = userIdString(req);
    const action = String(req.query.action || '').trim().toLowerCase();
    const from = parseDateOrNull(req.query.from);
    const to = parseDateOrNull(req.query.to);
    const page = Math.max(1, parseNumber(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, parseNumber(req.query.limit, 25)));
    const skip = (page - 1) * limit;
    if (isMongoReady()) {
      const query = { userId, resourceType: 'record' };
      if (action) {
        query.action = action;
      }
      if (from || to) {
        query.createdAt = {};
        if (from) query.createdAt.$gte = from;
        if (to) query.createdAt.$lte = to;
      }
      const [totalCount, logs] = await Promise.all([
        HealthcareAuditLog.countDocuments(query),
        HealthcareAuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ]);
      return res.status(200).json({
        success: true,
        data: logs.map(toClientObject),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.max(1, Math.ceil(totalCount / limit)),
          hasNextPage: skip + logs.length < totalCount,
        },
      });
    }
    const filteredLogs = inMemoryStore.auditLogs
      .filter((entry) => entry.userId === userId && entry.resourceType === 'record')
      .filter((entry) => !action || String(entry.action || '').toLowerCase() === action)
      .filter((entry) => {
        const createdAt = parseDateOrNull(entry.createdAt);
        if (!createdAt) return true;
        if (from && createdAt < from) return false;
        if (to && createdAt > to) return false;
        return true;
      });
    const totalCount = filteredLogs.length;
    const logs = filteredLogs.slice(skip, skip + limit);
    return res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        hasNextPage: skip + logs.length < totalCount,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch record audit logs', error: error.message });
  }
});

router.get('/records/:recordId/download', authenticate, async (req, res) => {
  try {
    const { recordId } = req.params;
    const userId = userIdString(req);
    if (isMongoReady()) {
      const record = await HealthcareRecord.findOne({ _id: recordId, userId }).lean();
      if (!record) {
        return res.status(404).json({ success: false, message: 'Record not found' });
      }
      if (record.isDeleted === true) {
        return res.status(410).json({ success: false, message: 'Record is archived. Restore it before download.' });
      }
      if (
        normalizeRecordVisibility(record.visibility) !== 'private' &&
        parseDateOrNull(record.consentExpiryDate) &&
        parseDateOrNull(record.consentExpiryDate).getTime() <= Date.now()
      ) {
        return res.status(410).json({ success: false, message: 'Consent expired for shared record. Renew consent to access this document.' });
      }
      const downloadUrl = record.storageKey ? generateSignedUrl(record.storageKey) : record.fileUrl;
      await addAuditLog({
        userId,
        actorId: req.user?._id,
        action: 'record_downloaded',
        resourceType: 'record',
        resourceId: String(record._id),
        details: 'Secure download link generated',
        metadata: { fileName: record.fileName, visibility: record.visibility || 'private' },
      });
      return res.status(200).json({ success: true, data: { downloadUrl, fileName: record.fileName } });
    }

    const record = inMemoryStore.records.find((item) => item.id === recordId && item.userId === userId);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    if (record.isDeleted === true) {
      return res.status(410).json({ success: false, message: 'Record is archived. Restore it before download.' });
    }
    if (
      normalizeRecordVisibility(record.visibility) !== 'private' &&
      parseDateOrNull(record.consentExpiryDate) &&
      parseDateOrNull(record.consentExpiryDate).getTime() <= Date.now()
    ) {
      return res.status(410).json({ success: false, message: 'Consent expired for shared record. Renew consent to access this document.' });
    }
    const downloadUrl = record.storageKey ? generateSignedUrl(record.storageKey) : record.fileUrl;
    await addAuditLog({
      userId,
      actorId: req.user?._id,
      action: 'record_downloaded',
      resourceType: 'record',
      resourceId: record.id,
      details: 'Secure download link generated',
      metadata: { fileName: record.fileName, visibility: record.visibility || 'private' },
    });
    return res.status(200).json({ success: true, data: { downloadUrl, fileName: record.fileName } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to generate record download link', error: error.message });
  }
});

router.delete('/records/:recordId', authenticate, async (req, res) => {
  try {
    const { recordId } = req.params;
    const userId = userIdString(req);
    const deletionReason = String(req.body?.reason || 'user_requested_archive').trim().slice(0, 180);
    if (isMongoReady()) {
      const record = await HealthcareRecord.findOne({ _id: recordId, userId });
      if (!record) {
        return res.status(404).json({ success: false, message: 'Record not found' });
      }
      if (record.isDeleted === true) {
        return res.status(200).json({ success: true, data: { id: recordId, status: 'already_archived' } });
      }
      record.isDeleted = true;
      record.deletedAt = new Date();
      record.deletionReason = deletionReason || 'user_requested_archive';
      record.purgeAfter = buildRecordPurgeAfterDate(record.deletedAt);
      await record.save();
      await addAuditLog({
        userId,
        actorId: req.user?._id,
        action: 'record_archived',
        resourceType: 'record',
        resourceId: String(recordId),
        details: 'Health record archived with retention window',
        metadata: {
          purgeAfter: record.purgeAfter ? new Date(record.purgeAfter).toISOString() : null,
          reason: record.deletionReason,
        },
      });
      return res.status(200).json({
        success: true,
        data: { id: recordId, status: 'archived', purgeAfter: record.purgeAfter },
      });
    }

    const index = inMemoryStore.records.findIndex((record) => record.id === recordId && record.userId === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    if (inMemoryStore.records[index].isDeleted === true) {
      return res.status(200).json({ success: true, data: { id: recordId, status: 'already_archived' } });
    }
    const deletedAt = new Date().toISOString();
    inMemoryStore.records[index] = {
      ...inMemoryStore.records[index],
      isDeleted: true,
      deletedAt,
      deletionReason: deletionReason || 'user_requested_archive',
      purgeAfter: buildRecordPurgeAfterDate(deletedAt).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await addAuditLog({
      userId,
      actorId: req.user?._id,
      action: 'record_archived',
      resourceType: 'record',
      resourceId: recordId,
      details: 'Health record archived with retention window',
      metadata: {
        purgeAfter: inMemoryStore.records[index].purgeAfter,
        reason: inMemoryStore.records[index].deletionReason,
      },
    });
    return res.status(200).json({
      success: true,
      data: {
        id: recordId,
        status: 'archived',
        purgeAfter: inMemoryStore.records[index].purgeAfter,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to delete record', error: error.message });
  }
});

router.patch('/records/:recordId/restore', authenticate, async (req, res) => {
  try {
    const { recordId } = req.params;
    const userId = userIdString(req);
    if (isMongoReady()) {
      const record = await HealthcareRecord.findOne({ _id: recordId, userId });
      if (!record) {
        return res.status(404).json({ success: false, message: 'Record not found' });
      }
      if (record.isDeleted !== true) {
        return res.status(400).json({ success: false, message: 'Record is not archived' });
      }
      if (parseDateOrNull(record.purgeAfter) && parseDateOrNull(record.purgeAfter).getTime() <= Date.now()) {
        return res.status(410).json({ success: false, message: 'Restore window expired for this archived record' });
      }
      record.isDeleted = false;
      record.deletedAt = null;
      record.deletionReason = '';
      record.purgeAfter = null;
      await record.save();
      await addAuditLog({
        userId,
        actorId: req.user?._id,
        action: 'record_restored',
        resourceType: 'record',
        resourceId: String(recordId),
        details: 'Archived health record restored by owner',
      });
      return res.status(200).json({ success: true, data: toClientObject(record) });
    }
    const index = inMemoryStore.records.findIndex((record) => record.id === recordId && record.userId === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    if (inMemoryStore.records[index].isDeleted !== true) {
      return res.status(400).json({ success: false, message: 'Record is not archived' });
    }
    if (
      parseDateOrNull(inMemoryStore.records[index].purgeAfter) &&
      parseDateOrNull(inMemoryStore.records[index].purgeAfter).getTime() <= Date.now()
    ) {
      return res.status(410).json({ success: false, message: 'Restore window expired for this archived record' });
    }
    inMemoryStore.records[index] = {
      ...inMemoryStore.records[index],
      isDeleted: false,
      deletedAt: null,
      deletionReason: '',
      purgeAfter: null,
      updatedAt: new Date().toISOString(),
    };
    await addAuditLog({
      userId,
      actorId: req.user?._id,
      action: 'record_restored',
      resourceType: 'record',
      resourceId: recordId,
      details: 'Archived health record restored by owner',
    });
    return res.status(200).json({ success: true, data: inMemoryStore.records[index] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to restore record', error: error.message });
  }
});

router.patch('/records/:recordId/consent', authenticate, async (req, res) => {
  try {
    const { recordId } = req.params;
    const userId = userIdString(req);
    const payload = req.body || {};
    const visibility = normalizeRecordVisibility(payload.visibility);
    const consentAccepted = payload.consentAccepted === true || String(payload.consentAccepted).toLowerCase() === 'true';
    const consentGrantedAt = parseDateOrNull(payload.consentGrantedAt) || new Date();
    const consentExpiryDate = parseDateOrNull(payload.consentExpiryDate);
    const consentError = validateRecordConsentPayload({
      visibility,
      consentAccepted,
      consentExpiryDate,
    });
    if (consentError) {
      return res.status(400).json({ success: false, message: consentError });
    }
    if (isMongoReady()) {
      const record = await HealthcareRecord.findOne({ _id: recordId, userId });
      if (!record) {
        return res.status(404).json({ success: false, message: 'Record not found' });
      }
      if (record.isDeleted === true) {
        return res.status(400).json({ success: false, message: 'Archived record cannot be updated. Restore first.' });
      }
      record.visibility = visibility;
      record.consentAccepted = consentAccepted;
      record.consentGrantedAt = consentGrantedAt;
      record.consentExpiryDate = consentExpiryDate;
      await record.save();
      await addAuditLog({
        userId,
        actorId: req.user?._id,
        action: 'record_consent_renewed',
        resourceType: 'record',
        resourceId: String(recordId),
        details: 'Consent metadata renewed',
        metadata: {
          visibility,
          consentExpiryDate: consentExpiryDate ? consentExpiryDate.toISOString() : null,
        },
      });
      return res.status(200).json({ success: true, data: toClientObject(record) });
    }
    const index = inMemoryStore.records.findIndex((record) => record.id === recordId && record.userId === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    if (inMemoryStore.records[index].isDeleted === true) {
      return res.status(400).json({ success: false, message: 'Archived record cannot be updated. Restore first.' });
    }
    inMemoryStore.records[index] = {
      ...inMemoryStore.records[index],
      visibility,
      consentAccepted,
      consentGrantedAt: consentGrantedAt.toISOString(),
      consentExpiryDate: consentExpiryDate ? consentExpiryDate.toISOString() : null,
      updatedAt: new Date().toISOString(),
    };
    await addAuditLog({
      userId,
      actorId: req.user?._id,
      action: 'record_consent_renewed',
      resourceType: 'record',
      resourceId: recordId,
      details: 'Consent metadata renewed',
      metadata: {
        visibility,
        consentExpiryDate: inMemoryStore.records[index].consentExpiryDate,
      },
    });
    return res.status(200).json({ success: true, data: inMemoryStore.records[index] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to renew record consent', error: error.message });
  }
});

router.get('/appointments', authenticate, async (req, res) => {
  try {
    const userId = userIdString(req);
    const category = String(req.query.category || '').trim();
    const status = String(req.query.status || '').trim();
    if (isMongoReady()) {
      const query = { userId };
      if (category) {
        query.category = category;
      }
      if (status) {
        query.status = status;
      }
      const appointments = await HealthcareAppointment.find(query).sort({ appointmentDate: -1, appointmentTime: -1, createdAt: -1 }).lean();
      return res.status(200).json({ success: true, data: appointments.map(toClientObject) });
    }

    let appointments = inMemoryStore.appointments.filter((appointment) => appointment.userId === userId);
    if (category) {
      appointments = appointments.filter((appointment) => appointment.category === category);
    }
    if (status) {
      appointments = appointments.filter((appointment) => appointment.status === status);
    }
    return res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch appointments', error: error.message });
  }
});

router.post('/appointments', authenticate, async (req, res) => {
  try {
    const payload = req.body || {};
    const userId = userIdString(req);
    const routeKey = 'healthcare.appointments.create';
    const idemKey = getRequestIdempotencyKey(req);
    const idemRequestHash = buildIdempotencyRequestHash(req);
    if (idemKey) {
      const existing = await findIdempotencyRecord({
        userId,
        key: idemKey,
        method: 'POST',
        routeKey,
      });
      if (existing) {
        if (existing.requestHash !== idemRequestHash) {
          return res.status(409).json({
            success: false,
            message: 'Idempotency key reuse conflict: request payload changed',
          });
        }
        return res.status(Number(existing.statusCode || 200)).json(existing.responseBody || { success: true });
      }
    }
    const persistIdempotencySuccess = async (statusCode, responseBody) => {
      if (!idemKey) {
        return;
      }
      await saveIdempotencyRecord({
        userId,
        key: idemKey,
        method: 'POST',
        routeKey,
        requestHash: idemRequestHash,
        statusCode,
        responseBody,
      });
    };
    const validationMessage = validateAppointmentPayload(payload);
    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }
    const category = normalizeAppointmentCategory(payload.category);
    const status = normalizeAppointmentStatus(payload.status, category);
    const amountDue = parseNumber(payload.amountDue, 0) || parseNumber(payload.consultationFee, 0) || 0;
    const paymentProvider = normalizePaymentProvider(payload.paymentProvider || 'simulated');
    const paymentReference = amountDue > 0 ? createPaymentReference('HC-APT') : '';
    const paymentStatus = amountDue > 0 ? 'pending' : 'paid';
    const paymentCompletedAt = amountDue > 0 ? null : new Date();

    if (isMongoReady()) {
      const created = await HealthcareAppointment.create({
        userId,
        doctorId: payload.doctorId || '',
        doctorName: payload.doctorName,
        specialty: payload.specialty || '',
        category,
        appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        mode: payload.mode || 'clinic',
        reason: payload.reason || '',
        patientName: payload.patientName,
        patientPhone: payload.patientPhone || '',
        familyMember: payload.familyMember || 'Self',
        collectionAddress: payload.collectionAddress || '',
        notes: payload.notes || '',
        status,
        paymentStatus,
        paymentProvider,
        paymentReference,
        paymentCompletedAt,
        amountDue,
      });
      await addNotification({
        userId,
        title: 'Appointment booked',
        message: `${payload.doctorName} appointment booked on ${payload.appointmentDate} at ${payload.appointmentTime}.`,
        notificationType: 'appointment',
        metadata: { appointmentId: String(created._id) },
      });
      const responseBody = { success: true, data: toClientObject(created) };
      await persistIdempotencySuccess(201, responseBody);
      return res.status(201).json(responseBody);
    }

    const created = {
      id: `apt-memory-${Date.now()}-${crypto.randomUUID()}`,
      userId,
      doctorId: payload.doctorId || '',
      doctorName: payload.doctorName,
      specialty: payload.specialty || '',
      category,
      appointmentDate: payload.appointmentDate,
      appointmentTime: payload.appointmentTime,
      mode: payload.mode || 'clinic',
      reason: payload.reason || '',
      patientName: payload.patientName,
      patientPhone: payload.patientPhone || '',
      familyMember: payload.familyMember || 'Self',
      collectionAddress: payload.collectionAddress || '',
      notes: payload.notes || '',
      status,
      paymentStatus,
      paymentProvider,
      paymentReference,
      paymentCompletedAt: paymentCompletedAt ? paymentCompletedAt.toISOString() : null,
      amountDue,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryStore.appointments.unshift(created);
    await addNotification({
      userId,
      title: 'Appointment booked',
      message: `${payload.doctorName} appointment booked on ${payload.appointmentDate} at ${payload.appointmentTime}.`,
      notificationType: 'appointment',
      metadata: { appointmentId: created.id },
    });
    const responseBody = { success: true, data: created };
    await persistIdempotencySuccess(201, responseBody);
    return res.status(201).json(responseBody);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create appointment', error: error.message });
  }
});

router.patch('/appointments/:appointmentId', authenticate, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const payload = req.body || {};
    const userId = userIdString(req);

    if (isMongoReady()) {
      const current = await HealthcareAppointment.findOne({ _id: appointmentId, userId });
      if (!current) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }
      const nextCategory = payload.category ? normalizeAppointmentCategory(payload.category) : current.category;
      const nextStatus = payload.status
        ? normalizeAppointmentStatus(payload.status, nextCategory)
        : normalizeAppointmentStatus(current.status, current.category);
      if (payload.status) {
        const transitionError = validateAppointmentTransition(current.status, nextStatus, nextCategory);
        if (transitionError) {
          return res.status(400).json({ success: false, message: transitionError });
        }
      }
      Object.assign(current, {
        doctorName: payload.doctorName || current.doctorName,
        specialty: payload.specialty || current.specialty,
        category: nextCategory,
        appointmentDate: payload.appointmentDate || current.appointmentDate,
        appointmentTime: payload.appointmentTime || current.appointmentTime,
        mode: payload.mode || current.mode,
        reason: payload.reason || current.reason,
        patientName: payload.patientName || current.patientName,
        patientPhone: payload.patientPhone || current.patientPhone,
        familyMember: payload.familyMember || current.familyMember,
        collectionAddress: payload.collectionAddress || current.collectionAddress,
        notes: payload.notes || current.notes,
        status: nextStatus,
        cancellationReason: payload.cancellationReason || current.cancellationReason,
      });
      await current.save();
      return res.status(200).json({ success: true, data: toClientObject(current) });
    }

    const index = inMemoryStore.appointments.findIndex((appointment) => appointment.id === appointmentId && appointment.userId === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    const current = inMemoryStore.appointments[index];
    const nextCategory = payload.category ? normalizeAppointmentCategory(payload.category) : current.category;
    const nextStatus = payload.status
      ? normalizeAppointmentStatus(payload.status, nextCategory)
      : normalizeAppointmentStatus(current.status, current.category);
    if (payload.status) {
      const transitionError = validateAppointmentTransition(current.status, nextStatus, nextCategory);
      if (transitionError) {
        return res.status(400).json({ success: false, message: transitionError });
      }
    }
    inMemoryStore.appointments[index] = {
      ...current,
      doctorName: payload.doctorName ?? current.doctorName,
      specialty: payload.specialty ?? current.specialty,
      category: nextCategory,
      appointmentDate: payload.appointmentDate ?? current.appointmentDate,
      appointmentTime: payload.appointmentTime ?? current.appointmentTime,
      mode: payload.mode ?? current.mode,
      reason: payload.reason ?? current.reason,
      patientName: payload.patientName ?? current.patientName,
      patientPhone: payload.patientPhone ?? current.patientPhone,
      familyMember: payload.familyMember ?? current.familyMember,
      collectionAddress: payload.collectionAddress ?? current.collectionAddress,
      notes: payload.notes ?? current.notes,
      status: nextStatus,
      cancellationReason: payload.cancellationReason ?? current.cancellationReason,
      id: current.id,
      userId,
      updatedAt: new Date().toISOString(),
    };
    return res.status(200).json({ success: true, data: inMemoryStore.appointments[index] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update appointment', error: error.message });
  }
});

router.post('/appointments/:appointmentId/payment/initiate', authenticate, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = userIdString(req);
    const paymentProvider = normalizePaymentProvider(req.body?.paymentProvider);
    if (isMongoReady()) {
      const appointment = await HealthcareAppointment.findOne({ _id: appointmentId, userId });
      if (!appointment) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }
      if (appointment.paymentStatus === 'paid') {
        return res.status(200).json({
          success: true,
          data: {
            paymentReference: appointment.paymentReference,
            amountDue: appointment.amountDue,
            paymentStatus: appointment.paymentStatus,
            paymentProvider: appointment.paymentProvider || paymentProvider,
          },
        });
      }
      const paymentReference = appointment.paymentReference || createPaymentReference('HC-APT');
      appointment.paymentProvider = paymentProvider;
      appointment.paymentReference = paymentReference;
      appointment.paymentStatus = appointment.amountDue > 0 ? 'pending' : 'paid';
      if (appointment.amountDue <= 0) {
        appointment.paymentCompletedAt = new Date();
      }
      await appointment.save();
      return res.status(200).json({
        success: true,
        data: {
          appointmentId,
          paymentReference,
          paymentProvider,
          amountDue: appointment.amountDue,
          paymentStatus: appointment.paymentStatus,
        },
      });
    }

    const index = inMemoryStore.appointments.findIndex((item) => item.id === appointmentId && item.userId === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    const paymentReference = inMemoryStore.appointments[index].paymentReference || createPaymentReference('HC-APT');
    const amountDue = parseNumber(inMemoryStore.appointments[index].amountDue, 0);
    const paymentStatus = amountDue > 0 ? 'pending' : 'paid';
    inMemoryStore.appointments[index] = {
      ...inMemoryStore.appointments[index],
      paymentProvider,
      paymentReference,
      paymentStatus,
      paymentCompletedAt: paymentStatus === 'paid' ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };
    return res.status(200).json({
      success: true,
      data: {
        appointmentId,
        paymentReference,
        paymentProvider,
        amountDue,
        paymentStatus,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to initiate appointment payment', error: error.message });
  }
});

router.post('/appointments/:appointmentId/payment/verify', authenticate, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = userIdString(req);
    const paymentReference = String(req.body?.paymentReference || '').trim();
    const requestedProvider = req.body?.paymentProvider;
    const paymentProvider = requestedProvider ? normalizePaymentProvider(requestedProvider) : null;
    const paymentStatus = String(req.body?.paymentStatus || 'success').trim().toLowerCase();
    const normalizedStatus = paymentStatus === 'success' ? 'paid' : 'failed';
    if (isMongoReady()) {
      const appointment = await HealthcareAppointment.findOne({ _id: appointmentId, userId });
      if (!appointment) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }
      if (!paymentReference) {
        return res.status(400).json({ success: false, message: 'paymentReference is required' });
      }
      if (!appointment.paymentReference) {
        return res.status(400).json({ success: false, message: 'Initiate payment before verification' });
      }
      if (paymentReference !== appointment.paymentReference) {
        return res.status(400).json({ success: false, message: 'Payment reference mismatch' });
      }
      const providerToUse = paymentProvider || appointment.paymentProvider || 'simulated';
      if (providerToUse !== 'simulated') {
        return res.status(400).json({
          success: false,
          message: `Provider ${providerToUse} verification is not configured in this route. Use gateway webhook verification.`,
        });
      }
      appointment.paymentReference = paymentReference || appointment.paymentReference;
      appointment.paymentProvider = providerToUse;
      appointment.paymentStatus = normalizedStatus;
      if (normalizedStatus === 'paid') {
        appointment.paymentCompletedAt = new Date();
      }
      await appointment.save();
      if (normalizedStatus === 'paid') {
        await addNotification({
          userId,
          title: 'Appointment payment successful',
          message: `Payment completed for appointment with ${appointment.doctorName}.`,
          notificationType: 'appointment',
          metadata: { appointmentId: String(appointment._id) },
        });
      }
      return res.status(200).json({ success: true, data: toClientObject(appointment) });
    }

    const index = inMemoryStore.appointments.findIndex((item) => item.id === appointmentId && item.userId === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    if (!paymentReference) {
      return res.status(400).json({ success: false, message: 'paymentReference is required' });
    }
    if (!inMemoryStore.appointments[index].paymentReference) {
      return res.status(400).json({ success: false, message: 'Initiate payment before verification' });
    }
    if (paymentReference !== inMemoryStore.appointments[index].paymentReference) {
      return res.status(400).json({ success: false, message: 'Payment reference mismatch' });
    }
    const providerToUse = paymentProvider || inMemoryStore.appointments[index].paymentProvider || 'simulated';
    if (providerToUse !== 'simulated') {
      return res.status(400).json({
        success: false,
        message: `Provider ${providerToUse} verification is not configured in this route. Use gateway webhook verification.`,
      });
    }
    inMemoryStore.appointments[index] = {
      ...inMemoryStore.appointments[index],
      paymentReference: paymentReference || inMemoryStore.appointments[index].paymentReference,
      paymentProvider: providerToUse,
      paymentStatus: normalizedStatus,
      paymentCompletedAt: normalizedStatus === 'paid' ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };
    if (normalizedStatus === 'paid') {
      await addNotification({
        userId,
        title: 'Appointment payment successful',
        message: `Payment completed for appointment with ${inMemoryStore.appointments[index].doctorName}.`,
        notificationType: 'appointment',
        metadata: { appointmentId },
      });
    }
    return res.status(200).json({ success: true, data: inMemoryStore.appointments[index] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to verify appointment payment', error: error.message });
  }
});

router.get('/family-profiles', authenticate, async (req, res) => {
  try {
    const userId = userIdString(req);
    if (isMongoReady()) {
      const profiles = await HealthcareFamilyProfile.find({ userId, isActive: true }).sort({ createdAt: -1 }).lean();
      return res.status(200).json({ success: true, data: profiles.map(toClientObject) });
    }
    const profiles = inMemoryStore.familyProfiles.filter((profile) => profile.userId === userId && profile.isActive !== false);
    return res.status(200).json({ success: true, data: profiles });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch family profiles', error: error.message });
  }
});

router.post('/family-profiles', authenticate, async (req, res) => {
  try {
    const payload = req.body || {};
    const userId = userIdString(req);
    if (!payload.name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }
    if (isMongoReady()) {
      const created = await HealthcareFamilyProfile.create({
        userId,
        name: payload.name,
        relation: payload.relation || 'Family',
        gender: payload.gender || '',
        dateOfBirth: payload.dateOfBirth || '',
        bloodGroup: payload.bloodGroup || '',
        phone: payload.phone || '',
        allergies: Array.isArray(payload.allergies) ? payload.allergies : [],
        chronicConditions: Array.isArray(payload.chronicConditions) ? payload.chronicConditions : [],
        notes: payload.notes || '',
        isEmergencyContact: Boolean(payload.isEmergencyContact),
        emergencyPhone: payload.emergencyPhone || '',
      });
      return res.status(201).json({ success: true, data: toClientObject(created) });
    }
    const created = {
      id: `fam-memory-${Date.now()}-${crypto.randomUUID()}`,
      userId,
      name: payload.name,
      relation: payload.relation || 'Family',
      gender: payload.gender || '',
      dateOfBirth: payload.dateOfBirth || '',
      bloodGroup: payload.bloodGroup || '',
      phone: payload.phone || '',
      allergies: Array.isArray(payload.allergies) ? payload.allergies : [],
      chronicConditions: Array.isArray(payload.chronicConditions) ? payload.chronicConditions : [],
      notes: payload.notes || '',
      isEmergencyContact: Boolean(payload.isEmergencyContact),
      emergencyPhone: payload.emergencyPhone || '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryStore.familyProfiles.unshift(created);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create family profile', error: error.message });
  }
});

router.patch('/family-profiles/:profileId', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const payload = req.body || {};
    const userId = userIdString(req);
    if (isMongoReady()) {
      const profile = await HealthcareFamilyProfile.findOne({ _id: profileId, userId });
      if (!profile) {
        return res.status(404).json({ success: false, message: 'Family profile not found' });
      }
      Object.assign(profile, {
        name: payload.name ?? profile.name,
        relation: payload.relation ?? profile.relation,
        gender: payload.gender ?? profile.gender,
        dateOfBirth: payload.dateOfBirth ?? profile.dateOfBirth,
        bloodGroup: payload.bloodGroup ?? profile.bloodGroup,
        phone: payload.phone ?? profile.phone,
        allergies: Array.isArray(payload.allergies) ? payload.allergies : profile.allergies,
        chronicConditions: Array.isArray(payload.chronicConditions) ? payload.chronicConditions : profile.chronicConditions,
        notes: payload.notes ?? profile.notes,
        isEmergencyContact: typeof payload.isEmergencyContact === 'boolean' ? payload.isEmergencyContact : profile.isEmergencyContact,
        emergencyPhone: payload.emergencyPhone ?? profile.emergencyPhone,
      });
      await profile.save();
      return res.status(200).json({ success: true, data: toClientObject(profile) });
    }
    const index = inMemoryStore.familyProfiles.findIndex((profile) => profile.id === profileId && profile.userId === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Family profile not found' });
    }
    inMemoryStore.familyProfiles[index] = { ...inMemoryStore.familyProfiles[index], ...payload, id: inMemoryStore.familyProfiles[index].id, userId, updatedAt: new Date().toISOString() };
    return res.status(200).json({ success: true, data: inMemoryStore.familyProfiles[index] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update family profile', error: error.message });
  }
});

router.delete('/family-profiles/:profileId', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const userId = userIdString(req);
    if (isMongoReady()) {
      const deleted = await HealthcareFamilyProfile.findOneAndUpdate({ _id: profileId, userId }, { isActive: false }, { new: true });
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Family profile not found' });
      }
      return res.status(200).json({ success: true, data: { id: profileId } });
    }
    const index = inMemoryStore.familyProfiles.findIndex((profile) => profile.id === profileId && profile.userId === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Family profile not found' });
    }
    inMemoryStore.familyProfiles[index] = { ...inMemoryStore.familyProfiles[index], isActive: false, updatedAt: new Date().toISOString() };
    return res.status(200).json({ success: true, data: { id: profileId } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to delete family profile', error: error.message });
  }
});

router.post('/pharmacy/orders', authenticate, upload.single('prescriptionFile'), async (req, res) => {
  try {
    const payload = req.body || {};
    const userId = userIdString(req);
    const routeKey = 'healthcare.pharmacy.orders.create';
    const idemKey = getRequestIdempotencyKey(req);
    const idemRequestHash = buildIdempotencyRequestHash(req, {
      hasPrescriptionFile: Boolean(req.file?.buffer),
      prescriptionFileName: req.file?.originalname || '',
    });
    if (idemKey) {
      const existing = await findIdempotencyRecord({
        userId,
        key: idemKey,
        method: 'POST',
        routeKey,
      });
      if (existing) {
        if (existing.requestHash !== idemRequestHash) {
          return res.status(409).json({
            success: false,
            message: 'Idempotency key reuse conflict: request payload changed',
          });
        }
        return res.status(Number(existing.statusCode || 200)).json(existing.responseBody || { success: true });
      }
    }
    const persistIdempotencySuccess = async (statusCode, responseBody) => {
      if (!idemKey) {
        return;
      }
      await saveIdempotencyRecord({
        userId,
        key: idemKey,
        method: 'POST',
        routeKey,
        requestHash: idemRequestHash,
        statusCode,
        responseBody,
      });
    };
    let items = [];
    if (Array.isArray(payload.items)) {
      items = payload.items;
    } else if (payload.items) {
      try {
        items = JSON.parse(payload.items);
      } catch (_error) {
        items = [];
      }
    }
    const normalizedItems = items.map((item) => ({
      medicineId: String(item.medicineId || item.id || ''),
      name: String(item.name || ''),
      category: String(item.category || ''),
      unitPrice: parseNumber(item.unitPrice ?? item.price, -1),
      quantity: parseNumber(item.quantity, 0),
      requiresPrescription: Boolean(item.requiresPrescription),
    }));
    const validationMessage = validatePharmacyItems(normalizedItems);
    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }
    if (!payload.deliveryAddress || !payload.phone || !payload.customerName) {
      return res.status(400).json({
        success: false,
        message: 'deliveryAddress, phone, and customerName are required to place a pharmacy order',
      });
    }
    const requiresPrescription = normalizedItems.some((item) => item.requiresPrescription);
    const safetyAssessment = assessPharmacySafety(normalizedItems);
    let prescriptionFileUrl = '';
    let prescriptionStorageKey = '';
    if (requiresPrescription && !req.file?.buffer) {
      return res.status(400).json({ success: false, message: 'Prescription upload is required for restricted medicines' });
    }
    if (req.file?.buffer) {
      if (!isAllowedUploadMimeType(req.file.mimetype, ALLOWED_PRESCRIPTION_MIME_TYPES)) {
        return res.status(400).json({ success: false, message: 'Unsupported prescription file type' });
      }
      const safeFileName = sanitizeFileName(req.file.originalname || `prescription-${Date.now()}`);
      const storageKey = `healthcare/prescriptions/${userId}/${Date.now()}-${safeFileName}`;
      const uploadResult = await uploadToS3(req.file.buffer, storageKey, { contentType: req.file.mimetype || 'application/octet-stream' });
      prescriptionStorageKey = uploadResult.s3Key || storageKey;
      prescriptionFileUrl = uploadResult.s3Url || uploadResult.publicUrlPath || generateSignedUrl(prescriptionStorageKey);
    }
    const totalAmount = normalizedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const paymentProvider = normalizePaymentProvider(payload.paymentProvider || 'simulated');
    const paymentReference = totalAmount > 0 ? createPaymentReference('HC-PHARM') : '';
    const paymentStatus = totalAmount > 0 ? 'pending' : 'paid';
    const prescriptionReviewStatus = requiresPrescription ? 'pending' : 'not_required';
    if (isMongoReady()) {
      const initialStatus = 'placed';
      const created = await HealthcarePharmacyOrder.create({
        userId,
        pharmacyId: payload.pharmacyId || '',
        pharmacyName: payload.pharmacyName || '',
        pharmacyArea: payload.pharmacyArea || '',
        pharmacyVendorId: payload.pharmacyVendorId || '',
        items: normalizedItems,
        totalAmount,
        deliveryAddress: payload.deliveryAddress || '',
        phone: payload.phone || '',
        customerName: payload.customerName || req.user?.name || 'Customer',
        notes: payload.notes || '',
        prescriptionRequired: requiresPrescription,
        prescriptionVerified: requiresPrescription ? Boolean(req.file?.buffer) : true,
        prescriptionReviewStatus,
        interactionAlerts: safetyAssessment.interactionAlerts,
        safetyFlags: safetyAssessment.safetyFlags,
        safetyRuleSource: safetyAssessment.safetyRuleSource,
        requiresPharmacistCall: safetyAssessment.requiresPharmacistCall,
        prescriptionFileUrl,
        prescriptionStorageKey,
        paymentMethod: payload.paymentMethod || 'upi',
        paymentProvider,
        paymentReference,
        paymentStatus,
        orderStatus: initialStatus,
        orderTimeline: [{ status: initialStatus, at: new Date() }],
      });
      await addNotification({
        userId,
        title: 'Pharmacy order placed',
        message: `Order with ${normalizedItems.length} medicine item(s) has been placed.`,
        notificationType: 'pharmacy',
        metadata: { orderId: String(created._id) },
      });
      const responseBody = { success: true, data: toClientObject(created) };
      await persistIdempotencySuccess(201, responseBody);
      return res.status(201).json(responseBody);
    }
    const initialStatus = 'placed';
    const created = {
      id: `pharm-order-${Date.now()}-${crypto.randomUUID()}`,
      userId,
      items: normalizedItems,
      totalAmount,
      deliveryAddress: payload.deliveryAddress || '',
      phone: payload.phone || '',
      customerName: payload.customerName || req.user?.name || 'Customer',
      notes: payload.notes || '',
      prescriptionRequired: requiresPrescription,
      prescriptionVerified: requiresPrescription ? Boolean(req.file?.buffer) : true,
      prescriptionReviewStatus,
      interactionAlerts: safetyAssessment.interactionAlerts,
      safetyFlags: safetyAssessment.safetyFlags,
      safetyRuleSource: safetyAssessment.safetyRuleSource,
      requiresPharmacistCall: safetyAssessment.requiresPharmacistCall,
      prescriptionFileUrl,
      prescriptionStorageKey,
      paymentMethod: payload.paymentMethod || 'upi',
      paymentProvider,
      paymentReference,
      paymentStatus,
      orderStatus: initialStatus,
      orderTimeline: [{ status: initialStatus, at: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryStore.pharmacyOrders.unshift(created);
    await addNotification({
      userId,
      title: 'Pharmacy order placed',
      message: `Order with ${normalizedItems.length} medicine item(s) has been placed.`,
      notificationType: 'pharmacy',
      metadata: { orderId: created.id },
    });
    const responseBody = { success: true, data: created };
    await persistIdempotencySuccess(201, responseBody);
    return res.status(201).json(responseBody);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to place pharmacy order', error: error.message });
  }
});

router.get('/pharmacy/orders', authenticate, async (req, res) => {
  try {
    const userId = userIdString(req);
    if (isMongoReady()) {
      const orders = await HealthcarePharmacyOrder.find({ userId }).sort({ createdAt: -1 }).lean();
      return res.status(200).json({ success: true, data: orders.map(toClientObject) });
    }
    const orders = inMemoryStore.pharmacyOrders.filter((order) => order.userId === userId);
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch pharmacy orders', error: error.message });
  }
});

router.patch('/pharmacy/orders/:orderId', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = userIdString(req);
    const isAdmin = hasAdminPrivileges(req.user);
    const payload = req.body || {};
    const orderStatus = payload.orderStatus ? String(payload.orderStatus).trim().toLowerCase() : undefined;
    const paymentStatus = payload.paymentStatus ? String(payload.paymentStatus).trim().toLowerCase() : undefined;
    const prescriptionReviewStatus = payload.prescriptionReviewStatus
      ? String(payload.prescriptionReviewStatus).trim().toLowerCase()
      : undefined;
    const allowedPaymentStatuses = new Set(['pending', 'paid', 'failed', 'refunded', 'success']);
    const allowedPrescriptionReviewStatuses = new Set(['not_required', 'pending', 'approved', 'rejected']);

    if (isMongoReady()) {
      const query = isAdmin ? { _id: orderId } : { _id: orderId, userId };
      const order = await HealthcarePharmacyOrder.findOne(query);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      if (prescriptionReviewStatus) {
        if (!isAdmin) {
          return res.status(403).json({ success: false, message: 'Only admin can review prescriptions' });
        }
        if (!allowedPrescriptionReviewStatuses.has(prescriptionReviewStatus)) {
          return res.status(400).json({ success: false, message: 'Invalid prescriptionReviewStatus value' });
        }
        const isRiskyOrder = Array.isArray(order.safetyFlags) && order.safetyFlags.length > 0;
        const reviewNotes = String(payload.prescriptionReviewNotes || '').trim();
        if (isRiskyOrder && ['approved', 'rejected'].includes(prescriptionReviewStatus) && !reviewNotes) {
          return res.status(400).json({
            success: false,
            message: 'prescriptionReviewNotes is required when reviewing high-risk pharmacy orders',
          });
        }
        order.prescriptionReviewStatus = prescriptionReviewStatus;
        order.prescriptionReviewNotes = reviewNotes;
        order.prescriptionReviewedBy = req.user?._id;
        order.prescriptionReviewedAt = new Date();
        order.orderTimeline = Array.isArray(order.orderTimeline) ? order.orderTimeline : [];
        order.orderTimeline.push({
          status: `prescription_review_${prescriptionReviewStatus}`,
          at: new Date(),
        });
      }

      if (orderStatus) {
        if (
          order.prescriptionRequired &&
          !['approved', 'not_required'].includes(String(order.prescriptionReviewStatus || '').toLowerCase()) &&
          ['processing', 'out_for_delivery', 'delivered'].includes(orderStatus)
        ) {
          return res.status(400).json({
            success: false,
            message: 'Prescription review approval is required before moving this order forward',
          });
        }
        const transitionError = validatePharmacyOrderTransition(order.orderStatus, orderStatus);
        if (transitionError) {
          return res.status(400).json({ success: false, message: transitionError });
        }
        order.orderStatus = orderStatus;
        order.orderTimeline = Array.isArray(order.orderTimeline) ? order.orderTimeline : [];
        order.orderTimeline.push({ status: orderStatus, at: new Date() });
      }

      if (paymentStatus) {
        if (!allowedPaymentStatuses.has(paymentStatus)) {
          return res.status(400).json({ success: false, message: 'Invalid paymentStatus value' });
        }
        const normalizedPayment = paymentStatus === 'success' ? 'paid' : paymentStatus;
        order.paymentStatus = normalizedPayment;
      }

      if (payload.deliveryAddress) {
        order.deliveryAddress = String(payload.deliveryAddress);
      }
      if (payload.notes) {
        order.notes = String(payload.notes);
      }

      await order.save();
      return res.status(200).json({ success: true, data: toClientObject(order) });
    }

    const index = inMemoryStore.pharmacyOrders.findIndex((order) =>
      order.id === orderId && (isAdmin || order.userId === userId)
    );
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (prescriptionReviewStatus) {
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'Only admin can review prescriptions' });
      }
      if (!allowedPrescriptionReviewStatuses.has(prescriptionReviewStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid prescriptionReviewStatus value' });
      }
      const reviewNotes = String(payload.prescriptionReviewNotes || '').trim();
      const isRiskyOrder = Array.isArray(inMemoryStore.pharmacyOrders[index].safetyFlags) &&
        inMemoryStore.pharmacyOrders[index].safetyFlags.length > 0;
      if (isRiskyOrder && ['approved', 'rejected'].includes(prescriptionReviewStatus) && !reviewNotes) {
        return res.status(400).json({
          success: false,
          message: 'prescriptionReviewNotes is required when reviewing high-risk pharmacy orders',
        });
      }
      inMemoryStore.pharmacyOrders[index].prescriptionReviewStatus = prescriptionReviewStatus;
      inMemoryStore.pharmacyOrders[index].prescriptionReviewNotes = reviewNotes;
      inMemoryStore.pharmacyOrders[index].prescriptionReviewedBy = String(req.user?._id || '');
      inMemoryStore.pharmacyOrders[index].prescriptionReviewedAt = new Date().toISOString();
      inMemoryStore.pharmacyOrders[index].orderTimeline = inMemoryStore.pharmacyOrders[index].orderTimeline || [];
      inMemoryStore.pharmacyOrders[index].orderTimeline.push({
        status: `prescription_review_${prescriptionReviewStatus}`,
        at: new Date().toISOString(),
      });
    }

    if (orderStatus) {
      if (
        inMemoryStore.pharmacyOrders[index].prescriptionRequired &&
        !['approved', 'not_required'].includes(String(inMemoryStore.pharmacyOrders[index].prescriptionReviewStatus || '').toLowerCase()) &&
        ['processing', 'out_for_delivery', 'delivered'].includes(orderStatus)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Prescription review approval is required before moving this order forward',
        });
      }
      const transitionError = validatePharmacyOrderTransition(inMemoryStore.pharmacyOrders[index].orderStatus, orderStatus);
      if (transitionError) {
        return res.status(400).json({ success: false, message: transitionError });
      }
      inMemoryStore.pharmacyOrders[index].orderStatus = orderStatus;
      inMemoryStore.pharmacyOrders[index].orderTimeline = inMemoryStore.pharmacyOrders[index].orderTimeline || [];
      inMemoryStore.pharmacyOrders[index].orderTimeline.push({ status: orderStatus, at: new Date().toISOString() });
    }
    if (paymentStatus) {
      if (!allowedPaymentStatuses.has(paymentStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid paymentStatus value' });
      }
      inMemoryStore.pharmacyOrders[index].paymentStatus = paymentStatus === 'success' ? 'paid' : paymentStatus;
    }
    if (payload.deliveryAddress) {
      inMemoryStore.pharmacyOrders[index].deliveryAddress = String(payload.deliveryAddress);
    }
    if (payload.notes) {
      inMemoryStore.pharmacyOrders[index].notes = String(payload.notes);
    }
    inMemoryStore.pharmacyOrders[index].updatedAt = new Date().toISOString();

    return res.status(200).json({ success: true, data: inMemoryStore.pharmacyOrders[index] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update pharmacy order', error: error.message });
  }
});

router.post('/pharmacy/orders/:orderId/payment/verify', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = userIdString(req);
    const paymentReference = String(req.body?.paymentReference || '').trim();
    const requestedProvider = req.body?.paymentProvider;
    const paymentStatus = String(req.body?.paymentStatus || 'success').trim().toLowerCase();
    const normalizedStatus = paymentStatus === 'success' ? 'paid' : 'failed';
    if (isMongoReady()) {
      const order = await HealthcarePharmacyOrder.findOne({ _id: orderId, userId });
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      if (!paymentReference) {
        return res.status(400).json({ success: false, message: 'paymentReference is required' });
      }
      if (!order.paymentReference) {
        return res.status(400).json({ success: false, message: 'Initiate payment before verification' });
      }
      if (paymentReference !== order.paymentReference) {
        return res.status(400).json({ success: false, message: 'Payment reference mismatch' });
      }
      const providerToUse = requestedProvider ? normalizePaymentProvider(requestedProvider) : order.paymentProvider || 'simulated';
      if (providerToUse !== 'simulated') {
        return res.status(400).json({
          success: false,
          message: `Provider ${providerToUse} verification is not configured in this route. Use gateway webhook verification.`,
        });
      }
      order.paymentProvider = providerToUse;
      order.paymentStatus = normalizedStatus;
      order.paymentReference = paymentReference || order.paymentReference;
      if (normalizedStatus === 'paid' && order.orderStatus !== 'delivered') {
        const reviewApproved = ['approved', 'not_required'].includes(String(order.prescriptionReviewStatus || '').toLowerCase());
        if (!order.prescriptionRequired || reviewApproved) {
          const transitionError = validatePharmacyOrderTransition(order.orderStatus, 'processing');
          if (!transitionError) {
            order.orderStatus = 'processing';
            order.orderTimeline = Array.isArray(order.orderTimeline) ? order.orderTimeline : [];
            order.orderTimeline.push({ status: order.orderStatus, at: new Date() });
          }
        }
      }
      await order.save();
      if (normalizedStatus === 'paid') {
        await addNotification({
          userId,
          title: 'Pharmacy payment successful',
          message: `Payment completed for pharmacy order ${String(order._id)}.`,
          notificationType: 'pharmacy',
          metadata: { orderId: String(order._id) },
        });
      }
      return res.status(200).json({ success: true, data: toClientObject(order) });
    }
    const index = inMemoryStore.pharmacyOrders.findIndex((order) => order.id === orderId && order.userId === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (!paymentReference) {
      return res.status(400).json({ success: false, message: 'paymentReference is required' });
    }
    if (!inMemoryStore.pharmacyOrders[index].paymentReference) {
      return res.status(400).json({ success: false, message: 'Initiate payment before verification' });
    }
    if (paymentReference !== inMemoryStore.pharmacyOrders[index].paymentReference) {
      return res.status(400).json({ success: false, message: 'Payment reference mismatch' });
    }
    const providerToUse = requestedProvider ? normalizePaymentProvider(requestedProvider) : inMemoryStore.pharmacyOrders[index].paymentProvider || 'simulated';
    if (providerToUse !== 'simulated') {
      return res.status(400).json({
        success: false,
        message: `Provider ${providerToUse} verification is not configured in this route. Use gateway webhook verification.`,
      });
    }
    inMemoryStore.pharmacyOrders[index] = {
      ...inMemoryStore.pharmacyOrders[index],
      paymentProvider: providerToUse,
      paymentStatus: normalizedStatus,
      paymentReference: paymentReference || inMemoryStore.pharmacyOrders[index].paymentReference,
      updatedAt: new Date().toISOString(),
    };
    if (normalizedStatus === 'paid') {
      const reviewApproved = ['approved', 'not_required'].includes(
        String(inMemoryStore.pharmacyOrders[index].prescriptionReviewStatus || '').toLowerCase()
      );
      if (!inMemoryStore.pharmacyOrders[index].prescriptionRequired || reviewApproved) {
        const transitionError = validatePharmacyOrderTransition(inMemoryStore.pharmacyOrders[index].orderStatus, 'processing');
        if (!transitionError) {
          inMemoryStore.pharmacyOrders[index].orderStatus = 'processing';
          inMemoryStore.pharmacyOrders[index].orderTimeline = inMemoryStore.pharmacyOrders[index].orderTimeline || [];
          inMemoryStore.pharmacyOrders[index].orderTimeline.push({ status: inMemoryStore.pharmacyOrders[index].orderStatus, at: new Date().toISOString() });
        }
      }
      await addNotification({
        userId,
        title: 'Pharmacy payment successful',
        message: `Payment completed for pharmacy order ${orderId}.`,
        notificationType: 'pharmacy',
        metadata: { orderId },
      });
    }
    return res.status(200).json({ success: true, data: inMemoryStore.pharmacyOrders[index] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to verify pharmacy payment', error: error.message });
  }
});

router.get('/refill-reminders', authenticate, async (req, res) => {
  try {
    const userId = userIdString(req);
    if (isMongoReady()) {
      const reminders = await HealthcareRefillReminder.find({ userId }).sort({ nextRefillDate: 1 }).lean();
      return res.status(200).json({ success: true, data: reminders.map(toClientObject) });
    }
    const reminders = inMemoryStore.refillReminders.filter((reminder) => reminder.userId === userId);
    return res.status(200).json({ success: true, data: reminders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch refill reminders', error: error.message });
  }
});

router.post('/refill-reminders', authenticate, async (req, res) => {
  try {
    const payload = req.body || {};
    const userId = userIdString(req);
    const routeKey = 'healthcare.refill.create';
    const idemKey = getRequestIdempotencyKey(req);
    const idemRequestHash = buildIdempotencyRequestHash(req);
    if (idemKey) {
      const existing = await findIdempotencyRecord({
        userId,
        key: idemKey,
        method: 'POST',
        routeKey,
      });
      if (existing) {
        if (existing.requestHash !== idemRequestHash) {
          return res.status(409).json({
            success: false,
            message: 'Idempotency key reuse conflict: request payload changed',
          });
        }
        return res.status(Number(existing.statusCode || 200)).json(existing.responseBody || { success: true });
      }
    }
    const persistIdempotencySuccess = async (statusCode, responseBody) => {
      if (!idemKey) {
        return;
      }
      await saveIdempotencyRecord({
        userId,
        key: idemKey,
        method: 'POST',
        routeKey,
        requestHash: idemRequestHash,
        statusCode,
        responseBody,
      });
    };
    if (!payload.medicineName || !payload.nextRefillDate) {
      return res.status(400).json({ success: false, message: 'medicineName and nextRefillDate are required' });
    }
    if (isMongoReady()) {
      const created = await HealthcareRefillReminder.create({
        userId,
        familyMember: payload.familyMember || 'Self',
        medicineName: payload.medicineName,
        dosage: payload.dosage || '',
        frequency: payload.frequency || '',
        nextRefillDate: payload.nextRefillDate,
        reminderDaysBefore: parseNumber(payload.reminderDaysBefore, 5),
        active: payload.active !== false,
        adherenceStatus: ['pending', 'met', 'missed'].includes(String(payload.adherenceStatus || '').toLowerCase())
          ? String(payload.adherenceStatus).toLowerCase()
          : 'pending',
        lastComplianceUpdate: payload.lastComplianceUpdate ? new Date(payload.lastComplianceUpdate) : undefined,
        channels: Array.isArray(payload.channels) ? payload.channels : ['in_app'],
      });
      await addNotification({
        userId,
        title: 'Refill reminder created',
        message: `Reminder set for ${payload.medicineName} on ${payload.nextRefillDate}.`,
        notificationType: 'refill',
        metadata: { reminderId: String(created._id) },
      });
      const responseBody = { success: true, data: toClientObject(created) };
      await persistIdempotencySuccess(201, responseBody);
      return res.status(201).json(responseBody);
    }
    const created = {
      id: `refill-${Date.now()}-${crypto.randomUUID()}`,
      userId,
      familyMember: payload.familyMember || 'Self',
      medicineName: payload.medicineName,
      dosage: payload.dosage || '',
      frequency: payload.frequency || '',
      nextRefillDate: payload.nextRefillDate,
      reminderDaysBefore: parseNumber(payload.reminderDaysBefore, 5),
      active: payload.active !== false,
      adherenceStatus: ['pending', 'met', 'missed'].includes(String(payload.adherenceStatus || '').toLowerCase())
        ? String(payload.adherenceStatus).toLowerCase()
        : 'pending',
      lastComplianceUpdate: payload.lastComplianceUpdate || null,
      channels: Array.isArray(payload.channels) ? payload.channels : ['in_app'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryStore.refillReminders.unshift(created);
    await addNotification({
      userId,
      title: 'Refill reminder created',
      message: `Reminder set for ${payload.medicineName} on ${payload.nextRefillDate}.`,
      notificationType: 'refill',
      metadata: { reminderId: created.id },
    });
    const responseBody = { success: true, data: created };
    await persistIdempotencySuccess(201, responseBody);
    return res.status(201).json(responseBody);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create refill reminder', error: error.message });
  }
});

router.patch('/refill-reminders/:reminderId', authenticate, async (req, res) => {
  try {
    const { reminderId } = req.params;
    const payload = req.body || {};
    const userId = userIdString(req);
    if (isMongoReady()) {
      const reminder = await HealthcareRefillReminder.findOne({ _id: reminderId, userId });
      if (!reminder) {
        return res.status(404).json({ success: false, message: 'Reminder not found' });
      }
      Object.assign(reminder, {
        familyMember: payload.familyMember ?? reminder.familyMember,
        medicineName: payload.medicineName ?? reminder.medicineName,
        dosage: payload.dosage ?? reminder.dosage,
        frequency: payload.frequency ?? reminder.frequency,
        nextRefillDate: payload.nextRefillDate ?? reminder.nextRefillDate,
        reminderDaysBefore: payload.reminderDaysBefore != null ? parseNumber(payload.reminderDaysBefore, reminder.reminderDaysBefore) : reminder.reminderDaysBefore,
        active: typeof payload.active === 'boolean' ? payload.active : reminder.active,
        adherenceStatus: ['pending', 'met', 'missed'].includes(String(payload.adherenceStatus || '').toLowerCase())
          ? String(payload.adherenceStatus).toLowerCase()
          : reminder.adherenceStatus,
        lastComplianceUpdate: payload.lastComplianceUpdate ? new Date(payload.lastComplianceUpdate) : reminder.lastComplianceUpdate,
      });
      await reminder.save();
      return res.status(200).json({ success: true, data: toClientObject(reminder) });
    }
    const index = inMemoryStore.refillReminders.findIndex((item) => item.id === reminderId && item.userId === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }
    inMemoryStore.refillReminders[index] = { ...inMemoryStore.refillReminders[index], ...payload, id: inMemoryStore.refillReminders[index].id, userId, updatedAt: new Date().toISOString() };
    return res.status(200).json({ success: true, data: inMemoryStore.refillReminders[index] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update refill reminder', error: error.message });
  }
});

router.delete('/refill-reminders/:reminderId', authenticate, async (req, res) => {
  try {
    const { reminderId } = req.params;
    const userId = userIdString(req);
    if (isMongoReady()) {
      const deleted = await HealthcareRefillReminder.findOneAndDelete({ _id: reminderId, userId });
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Reminder not found' });
      }
      return res.status(200).json({ success: true, data: { id: reminderId } });
    }
    const index = inMemoryStore.refillReminders.findIndex((item) => item.id === reminderId && item.userId === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }
    inMemoryStore.refillReminders.splice(index, 1);
    return res.status(200).json({ success: true, data: { id: reminderId } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to delete refill reminder', error: error.message });
  }
});

router.post('/emergency/sos', authenticate, async (req, res) => {
  try {
    const payload = req.body || {};
    const userId = userIdString(req);
    const routeKey = 'healthcare.emergency.sos.create';
    const idemKey = getRequestIdempotencyKey(req);
    const idemRequestHash = buildIdempotencyRequestHash(req);
    if (idemKey) {
      const existing = await findIdempotencyRecord({
        userId,
        key: idemKey,
        method: 'POST',
        routeKey,
      });
      if (existing) {
        if (existing.requestHash !== idemRequestHash) {
          return res.status(409).json({
            success: false,
            message: 'Idempotency key reuse conflict: request payload changed',
          });
        }
        return res.status(Number(existing.statusCode || 200)).json(existing.responseBody || { success: true });
      }
    }
    const persistIdempotencySuccess = async (statusCode, responseBody) => {
      if (!idemKey) {
        return;
      }
      await saveIdempotencyRecord({
        userId,
        key: idemKey,
        method: 'POST',
        routeKey,
        requestHash: idemRequestHash,
        statusCode,
        responseBody,
      });
    };
    const incidentType = ['medical', 'sos', 'police', 'safe_check_in', 'other'].includes(String(payload.incidentType || '').toLowerCase())
      ? String(payload.incidentType).toLowerCase()
      : 'sos';
    const escalationLevel = ['low', 'medium', 'high', 'critical', 'resolved'].includes(String(payload.escalationLevel || '').toLowerCase())
      ? String(payload.escalationLevel).toLowerCase()
      : 'high';
    const status = ['open', 'acknowledged', 'resolved'].includes(String(payload.status || '').toLowerCase())
      ? String(payload.status).toLowerCase()
      : 'open';
    const timeline = Array.isArray(payload.timeline)
      ? payload.timeline
          .map((entry) => ({
            step: String(entry?.step || '').trim(),
            at: entry?.at ? new Date(entry.at) : new Date(),
          }))
          .filter((entry) => Boolean(entry.step))
      : [];
    const incidentCreatedAt = new Date();
    const ackDueAt = getIncidentAckDueAt(escalationLevel, incidentCreatedAt);
    if (isMongoReady()) {
      const created = await HealthcareEmergencyIncident.create({
        userId,
        familyMember: payload.familyMember || 'Self',
        incidentType,
        message: payload.message || '',
        status,
        escalationLevel,
        location: payload.location || {},
        timeline,
        actions: {
          call108: Boolean(payload.actions?.call108),
          call112: Boolean(payload.actions?.call112),
          locationShared: Boolean(payload.actions?.locationShared),
          familyNotified: Boolean(payload.actions?.familyNotified),
          hospitalsViewed: Boolean(payload.actions?.hospitalsViewed),
        },
        contactsNotified: Array.isArray(payload.contactsNotified) ? payload.contactsNotified : [],
        acknowledgedAt: status === 'acknowledged' ? incidentCreatedAt : null,
        resolvedAt: status === 'resolved' ? incidentCreatedAt : null,
        ackDueAt,
        responderNotes: [],
        lastUpdatedBy: req.user?._id,
      });
      await addNotification({
        userId,
        title: 'Emergency alert sent',
        message: 'Your SOS incident has been registered with emergency actions.',
        notificationType: 'emergency',
        metadata: { incidentId: String(created._id) },
      });
      const responseBody = { success: true, data: toClientObject(created) };
      await persistIdempotencySuccess(201, responseBody);
      return res.status(201).json(responseBody);
    }
    const created = {
      id: `incident-${Date.now()}-${crypto.randomUUID()}`,
      userId,
      familyMember: payload.familyMember || 'Self',
      incidentType,
      message: payload.message || '',
      status,
      escalationLevel,
      location: payload.location || {},
      timeline: timeline.map((entry) => ({ step: entry.step, at: entry.at.toISOString() })),
      actions: {
        call108: Boolean(payload.actions?.call108),
        call112: Boolean(payload.actions?.call112),
        locationShared: Boolean(payload.actions?.locationShared),
        familyNotified: Boolean(payload.actions?.familyNotified),
        hospitalsViewed: Boolean(payload.actions?.hospitalsViewed),
      },
      contactsNotified: Array.isArray(payload.contactsNotified) ? payload.contactsNotified : [],
      acknowledgedAt: status === 'acknowledged' ? incidentCreatedAt.toISOString() : null,
      resolvedAt: status === 'resolved' ? incidentCreatedAt.toISOString() : null,
      ackDueAt: ackDueAt.toISOString(),
      escalatedAt: null,
      lastEscalationReason: '',
      responderNotes: [],
      lastUpdatedBy: String(req.user?._id || ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryStore.incidents.unshift(created);
    await addNotification({
      userId,
      title: 'Emergency alert sent',
      message: 'Your SOS incident has been registered with emergency actions.',
      notificationType: 'emergency',
      metadata: { incidentId: created.id },
    });
    const responseBody = { success: true, data: created };
    await persistIdempotencySuccess(201, responseBody);
    return res.status(201).json(responseBody);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create emergency incident', error: error.message });
  }
});

router.patch('/emergency/incidents/:incidentId', authenticate, async (req, res) => {
  try {
    const { incidentId } = req.params;
    const payload = req.body || {};
    const userId = userIdString(req);
    const isAdmin = hasAdminPrivileges(req.user);
    const requestedStatus = payload.status ? String(payload.status).toLowerCase().trim() : '';
    const responderNote = String(payload.responderNote || '').trim();

    if (isMongoReady()) {
      const query = isAdmin ? { _id: incidentId } : { _id: incidentId, userId };
      const incident = await HealthcareEmergencyIncident.findOne(query);
      if (!incident) {
        return res.status(404).json({ success: false, message: 'Incident not found' });
      }

      if (requestedStatus) {
        const transitionError = validateEmergencyTransition(incident.status, requestedStatus);
        if (transitionError) {
          return res.status(400).json({ success: false, message: transitionError });
        }
        incident.status = requestedStatus;
        if (requestedStatus === 'acknowledged') {
          incident.acknowledgedAt = new Date();
        }
        if (requestedStatus === 'resolved') {
          incident.resolvedAt = new Date();
          incident.escalationLevel = 'resolved';
        }
        incident.timeline = Array.isArray(incident.timeline) ? incident.timeline : [];
        incident.timeline.push({
          step: `status_${requestedStatus}`,
          at: new Date(),
        });
      }

      if (payload.escalationLevel) {
        const nextEscalation = String(payload.escalationLevel).toLowerCase().trim();
        if (!['low', 'medium', 'high', 'critical', 'resolved'].includes(nextEscalation)) {
          return res.status(400).json({ success: false, message: 'Invalid escalationLevel' });
        }
        incident.escalationLevel = nextEscalation;
        incident.ackDueAt = getIncidentAckDueAt(nextEscalation);
      }

      if (responderNote) {
        incident.responderNotes = Array.isArray(incident.responderNotes) ? incident.responderNotes : [];
        incident.responderNotes.push(responderNote);
      }
      incident.lastUpdatedBy = req.user?._id;
      await incident.save();
      return res.status(200).json({ success: true, data: toClientObject(incident) });
    }

    const index = inMemoryStore.incidents.findIndex((incident) =>
      incident.id === incidentId && (isAdmin || incident.userId === userId)
    );
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const current = inMemoryStore.incidents[index];
    const next = { ...current };
    if (requestedStatus) {
      const transitionError = validateEmergencyTransition(current.status, requestedStatus);
      if (transitionError) {
        return res.status(400).json({ success: false, message: transitionError });
      }
      next.status = requestedStatus;
      if (requestedStatus === 'acknowledged') {
        next.acknowledgedAt = new Date().toISOString();
      }
      if (requestedStatus === 'resolved') {
        next.resolvedAt = new Date().toISOString();
        next.escalationLevel = 'resolved';
      }
      next.timeline = Array.isArray(next.timeline) ? next.timeline : [];
      next.timeline.push({
        step: `status_${requestedStatus}`,
        at: new Date().toISOString(),
      });
    }
    if (payload.escalationLevel) {
      const nextEscalation = String(payload.escalationLevel).toLowerCase().trim();
      if (!['low', 'medium', 'high', 'critical', 'resolved'].includes(nextEscalation)) {
        return res.status(400).json({ success: false, message: 'Invalid escalationLevel' });
      }
      next.escalationLevel = nextEscalation;
      next.ackDueAt = getIncidentAckDueAt(nextEscalation).toISOString();
    }
    if (responderNote) {
      next.responderNotes = Array.isArray(next.responderNotes) ? next.responderNotes : [];
      next.responderNotes.push(responderNote);
    }
    next.lastUpdatedBy = String(req.user?._id || '');
    next.updatedAt = new Date().toISOString();
    inMemoryStore.incidents[index] = next;

    return res.status(200).json({ success: true, data: inMemoryStore.incidents[index] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update emergency incident', error: error.message });
  }
});

router.post('/emergency/location', authenticate, async (req, res) => {
  try {
    const payload = req.body || {};
    const { incidentId } = payload;
    const userId = userIdString(req);
    if (!incidentId) {
      return res.status(400).json({ success: false, message: 'incidentId is required' });
    }
    if (isMongoReady()) {
      const incident = await HealthcareEmergencyIncident.findOne({ _id: incidentId, userId });
      if (!incident) {
        return res.status(404).json({ success: false, message: 'Incident not found' });
      }
      incident.location = {
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        address: payload.address || '',
        capturedAt: new Date(),
      };
      incident.actions.locationShared = true;
      await incident.save();
      return res.status(200).json({ success: true, data: toClientObject(incident) });
    }
    const index = inMemoryStore.incidents.findIndex((item) => item.id === incidentId && item.userId === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }
    inMemoryStore.incidents[index] = {
      ...inMemoryStore.incidents[index],
      location: { latitude: payload.latitude, longitude: payload.longitude, accuracy: payload.accuracy, address: payload.address || '', capturedAt: new Date().toISOString() },
      actions: { ...(inMemoryStore.incidents[index].actions || {}), locationShared: true },
      updatedAt: new Date().toISOString(),
    };
    return res.status(200).json({ success: true, data: inMemoryStore.incidents[index] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update emergency location', error: error.message });
  }
});

router.get('/emergency/incidents', authenticate, async (req, res) => {
  try {
    const userId = userIdString(req);
    if (isMongoReady()) {
      const incidents = await HealthcareEmergencyIncident.find({ userId }).sort({ createdAt: -1 });
      for (const incident of incidents) {
        const { changed } = tryAutoEscalateIncident(incident);
        if (changed) {
          await incident.save();
          await addNotification({
            userId,
            title: 'Emergency escalation update',
            message: `Incident ${String(incident._id)} auto-escalated to ${incident.escalationLevel}.`,
            notificationType: 'emergency',
            metadata: { incidentId: String(incident._id), escalationLevel: incident.escalationLevel },
          });
        }
      }
      return res.status(200).json({ success: true, data: incidents.map(toClientObject) });
    }
    const incidents = inMemoryStore.incidents.filter((incident) => incident.userId === userId);
    for (const incident of incidents) {
      const { changed } = tryAutoEscalateIncident(incident);
      if (changed) {
        incident.updatedAt = new Date().toISOString();
        await addNotification({
          userId,
          title: 'Emergency escalation update',
          message: `Incident ${incident.id} auto-escalated to ${incident.escalationLevel}.`,
          notificationType: 'emergency',
          metadata: { incidentId: incident.id, escalationLevel: incident.escalationLevel },
        });
      }
    }
    return res.status(200).json({ success: true, data: incidents });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch emergency incidents', error: error.message });
  }
});

router.get('/notifications', authenticate, async (req, res) => {
  try {
    const userId = userIdString(req);
    if (isMongoReady()) {
      const notifications = await HealthcareNotification.find({ userId }).sort({ createdAt: -1 }).limit(200).lean();
      return res.status(200).json({ success: true, data: notifications.map(toClientObject) });
    }
    const notifications = inMemoryStore.notifications.filter((notification) => notification.userId === userId);
    return res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch notifications', error: error.message });
  }
});

router.patch('/notifications/:notificationId/read', authenticate, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = userIdString(req);
    if (isMongoReady()) {
      const updated = await HealthcareNotification.findOneAndUpdate({ _id: notificationId, userId }, { readAt: new Date() }, { new: true });
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }
      return res.status(200).json({ success: true, data: toClientObject(updated) });
    }
    const index = inMemoryStore.notifications.findIndex((item) => item.id === notificationId && item.userId === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    inMemoryStore.notifications[index] = { ...inMemoryStore.notifications[index], readAt: new Date().toISOString() };
    return res.status(200).json({ success: true, data: inMemoryStore.notifications[index] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to mark notification read', error: error.message });
  }
});

router.post('/partner/applications', authenticate, upload.array('documents', 5), async (req, res) => {
  try {
    const payload = req.body || {};
    const userId = userIdString(req);
    const routeKey = 'healthcare.partner.application.create';
    const idemKey = getRequestIdempotencyKey(req);
    const idemRequestHash = buildIdempotencyRequestHash(req, {
      documentCount: Array.isArray(req.files) ? req.files.length : 0,
      documentNames: Array.isArray(req.files) ? req.files.map((file) => file.originalname || '') : [],
    });
    if (idemKey) {
      const existing = await findIdempotencyRecord({
        userId,
        key: idemKey,
        method: 'POST',
        routeKey,
      });
      if (existing) {
        if (existing.requestHash !== idemRequestHash) {
          return res.status(409).json({
            success: false,
            message: 'Idempotency key reuse conflict: request payload changed',
          });
        }
        return res.status(Number(existing.statusCode || 200)).json(existing.responseBody || { success: true });
      }
    }
    const persistIdempotencySuccess = async (statusCode, responseBody) => {
      if (!idemKey) {
        return;
      }
      await saveIdempotencyRecord({
        userId,
        key: idemKey,
        method: 'POST',
        routeKey,
        requestHash: idemRequestHash,
        statusCode,
        responseBody,
      });
    };
    if (!payload.entityType || !payload.vendorName || !payload.contactName || !payload.phone || !payload.email) {
      return res.status(400).json({ success: false, message: 'entityType, vendorName, contactName, phone, and email are required' });
    }
    if (!['doctor', 'lab', 'pharmacy'].includes(String(payload.entityType))) {
      return res.status(400).json({ success: false, message: 'entityType must be doctor, lab, or pharmacy' });
    }
    const uploadedDocuments = [];
    for (const file of req.files || []) {
      if (!isAllowedUploadMimeType(file.mimetype)) {
        return res.status(400).json({ success: false, message: 'Unsupported partner document file type' });
      }
      const safeFileName = sanitizeFileName(file.originalname || `partner-${Date.now()}`);
      const storageKey = `healthcare/partner/${userId}/${Date.now()}-${safeFileName}`;
      const uploadResult = await uploadToS3(file.buffer, storageKey, { contentType: file.mimetype || 'application/octet-stream' });
      uploadedDocuments.push({
        fileName: safeFileName,
        fileType: file.mimetype || 'application/octet-stream',
        fileUrl: uploadResult.s3Url || uploadResult.publicUrlPath || generateSignedUrl(uploadResult.s3Key || storageKey),
        storageKey: uploadResult.s3Key || storageKey,
      });
    }
    if (isMongoReady()) {
      const created = await HealthcarePartnerApplication.create({
        userId,
        entityType: payload.entityType,
        vendorName: payload.vendorName,
        contactName: payload.contactName,
        phone: payload.phone,
        email: payload.email,
        address: payload.address || '',
        licenseNumber: payload.licenseNumber || '',
        specialtyOrService: payload.specialtyOrService || '',
        notes: payload.notes || '',
        documents: uploadedDocuments,
        status: 'pending',
      });
      await addNotification({
        userId,
        title: 'Partner application submitted',
        message: `${payload.entityType} partner application is pending admin review.`,
        notificationType: 'partner',
        metadata: { applicationId: String(created._id) },
      });
      const responseBody = { success: true, data: toClientObject(created) };
      await persistIdempotencySuccess(201, responseBody);
      return res.status(201).json(responseBody);
    }
    const created = {
      id: `partner-app-${Date.now()}-${crypto.randomUUID()}`,
      userId,
      entityType: payload.entityType,
      vendorName: payload.vendorName,
      contactName: payload.contactName,
      phone: payload.phone,
      email: payload.email,
      address: payload.address || '',
      licenseNumber: payload.licenseNumber || '',
      specialtyOrService: payload.specialtyOrService || '',
      notes: payload.notes || '',
      documents: uploadedDocuments,
      status: 'pending',
      reviewNotes: '',
      reviewedBy: '',
      reviewedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryStore.partnerApplications.unshift(created);
    await addNotification({
      userId,
      title: 'Partner application submitted',
      message: `${payload.entityType} partner application is pending admin review.`,
      notificationType: 'partner',
      metadata: { applicationId: created.id },
    });
    const responseBody = { success: true, data: created };
    await persistIdempotencySuccess(201, responseBody);
    return res.status(201).json(responseBody);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to submit partner application', error: error.message });
  }
});

router.get('/partner/applications', authenticate, async (req, res) => {
  try {
    const userId = userIdString(req);
    if (isMongoReady()) {
      const applications = await HealthcarePartnerApplication.find({ userId }).sort({ createdAt: -1 }).lean();
      return res.status(200).json({ success: true, data: applications.map(toClientObject) });
    }
    const applications = inMemoryStore.partnerApplications.filter((application) => application.userId === userId);
    return res.status(200).json({ success: true, data: applications });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch partner applications', error: error.message });
  }
});

router.get('/partner/applications/admin', authenticate, verifyAdmin, async (_req, res) => {
  try {
    if (isMongoReady()) {
      const applications = await HealthcarePartnerApplication.find({}).sort({ createdAt: -1 }).lean();
      return res.status(200).json({ success: true, data: applications.map(toClientObject) });
    }
    return res.status(200).json({ success: true, data: inMemoryStore.partnerApplications });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch admin partner applications', error: error.message });
  }
});

router.patch('/partner/applications/:applicationId/review', authenticate, verifyAdmin, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, reviewNotes } = req.body || {};
    if (!['approved', 'rejected', 'revision_requested', 'pending'].includes(String(status || ''))) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    if (isMongoReady()) {
      const application = await HealthcarePartnerApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({ success: false, message: 'Application not found' });
      }
      application.status = status;
      application.reviewNotes = reviewNotes || '';
      application.reviewedBy = req.user._id;
      application.reviewedAt = new Date();
      await application.save();
      if (status === 'approved' && application.entityType === 'doctor') {
        await createDoctorFromPartnerApplication(application);
      }
      await addNotification({
        userId: application.userId,
        title: 'Partner application reviewed',
        message: `Your ${application.entityType} partner application status is now ${status}.`,
        notificationType: 'partner',
        metadata: { applicationId: String(application._id), status },
      });
      return res.status(200).json({ success: true, data: toClientObject(application) });
    }
    const index = inMemoryStore.partnerApplications.findIndex((item) => item.id === applicationId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    inMemoryStore.partnerApplications[index] = {
      ...inMemoryStore.partnerApplications[index],
      status,
      reviewNotes: reviewNotes || '',
      reviewedBy: userIdString(req),
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (status === 'approved' && inMemoryStore.partnerApplications[index].entityType === 'doctor') {
      await createDoctorFromPartnerApplication(inMemoryStore.partnerApplications[index]);
    }
    await addNotification({
      userId: inMemoryStore.partnerApplications[index].userId,
      title: 'Partner application reviewed',
      message: `Your ${inMemoryStore.partnerApplications[index].entityType} partner application status is now ${status}.`,
      notificationType: 'partner',
      metadata: { applicationId, status },
    });
    return res.status(200).json({ success: true, data: inMemoryStore.partnerApplications[index] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to review partner application', error: error.message });
  }
});

router.get('/dashboard/summary', authenticate, async (req, res) => {
  try {
    const userId = userIdString(req);
    if (isMongoReady()) {
      const [appointments, pharmacyOrders, records, reminders, emergencyCases, pendingApprovals] = await Promise.all([
        HealthcareAppointment.countDocuments({ userId }),
        HealthcarePharmacyOrder.countDocuments({ userId }),
        HealthcareRecord.countDocuments({ userId, isDeleted: { $ne: true } }),
        HealthcareRefillReminder.countDocuments({ userId }),
        HealthcareEmergencyIncident.countDocuments({ userId }),
        HealthcarePartnerApplication.countDocuments({ userId, status: 'pending' }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          appointments,
          pharmacyOrders,
          records,
          reminders,
          emergencyCases,
          pendingApprovals,
          healthScore: Math.min(100, 40 + records * 3 + reminders * 5 + appointments * 2),
        },
      });
    }

    const appointments = inMemoryStore.appointments.filter((item) => String(item.userId) === userId).length;
    const pharmacyOrders = inMemoryStore.pharmacyOrders.filter((item) => String(item.userId) === userId).length;
    const records = inMemoryStore.records.filter((item) => String(item.userId) === userId && item.isDeleted !== true).length;
    const reminders = inMemoryStore.refillReminders.filter((item) => String(item.userId) === userId).length;
    const emergencyCases = inMemoryStore.incidents.filter((item) => String(item.userId) === userId).length;
    const pendingApprovals = inMemoryStore.partnerApplications.filter((item) => String(item.userId) === userId && item.status === 'pending').length;

    return res.status(200).json({
      success: true,
      data: {
        appointments,
        pharmacyOrders,
        records,
        reminders,
        emergencyCases,
        pendingApprovals,
        healthScore: Math.min(100, 40 + records * 3 + reminders * 5 + appointments * 2),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load healthcare dashboard', error: error.message });
  }
});

router.get('/ops/metrics', authenticate, verifyAdmin, async (_req, res) => {
  try {
    if (isMongoReady()) {
      const [
        pendingPrescriptionReviews,
        criticalIncidents,
        openIncidents,
        archivedRecordsPendingPurge,
        archivedRecordsExpiredPurge,
      ] = await Promise.all([
        HealthcarePharmacyOrder.countDocuments({
          prescriptionReviewStatus: { $in: ['pending', 'rejected'] },
        }),
        HealthcareEmergencyIncident.countDocuments({ escalationLevel: 'critical', status: { $ne: 'resolved' } }),
        HealthcareEmergencyIncident.countDocuments({ status: 'open' }),
        HealthcareRecord.countDocuments({ isDeleted: true, purgeAfter: { $gt: new Date() } }),
        HealthcareRecord.countDocuments({ isDeleted: true, purgeAfter: { $lte: new Date() } }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          pendingPrescriptionReviews,
          criticalIncidents,
          openIncidents,
          archivedRecordsPendingPurge,
          archivedRecordsExpiredPurge,
          generatedAt: new Date().toISOString(),
        },
      });
    }

    const pendingPrescriptionReviews = inMemoryStore.pharmacyOrders.filter((order) =>
      ['pending', 'rejected'].includes(String(order.prescriptionReviewStatus || '').toLowerCase())
    ).length;
    const criticalIncidents = inMemoryStore.incidents.filter((incident) =>
      String(incident.escalationLevel || '').toLowerCase() === 'critical' &&
      String(incident.status || '').toLowerCase() !== 'resolved'
    ).length;
    const openIncidents = inMemoryStore.incidents.filter(
      (incident) => String(incident.status || '').toLowerCase() === 'open'
    ).length;
    const archivedRecordsPendingPurge = inMemoryStore.records.filter((record) =>
      record.isDeleted === true &&
      parseDateOrNull(record.purgeAfter) &&
      parseDateOrNull(record.purgeAfter).getTime() > Date.now()
    ).length;
    const archivedRecordsExpiredPurge = inMemoryStore.records.filter((record) =>
      record.isDeleted === true &&
      parseDateOrNull(record.purgeAfter) &&
      parseDateOrNull(record.purgeAfter).getTime() <= Date.now()
    ).length;
    return res.status(200).json({
      success: true,
      data: {
        pendingPrescriptionReviews,
        criticalIncidents,
        openIncidents,
        archivedRecordsPendingPurge,
        archivedRecordsExpiredPurge,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch healthcare ops metrics', error: error.message });
  }
});

router.post('/ops/retention/purge', authenticate, verifyAdmin, async (req, res) => {
  try {
    if (!isMongoReady()) {
      return res.status(400).json({
        success: false,
        message: 'Retention purge is available only when database storage is enabled',
      });
    }
    const limit = parseNumber(req.body?.limit, 200);
    const result = await purgeExpiredHealthcareRecords({ limit });
    return res.status(200).json({
      success: true,
      data: {
        ...result,
        triggeredAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to purge expired healthcare records', error: error.message });
  }
});

router.post('/ai/assist', authenticate, async (req, res) => {
  try {
    const userId = userIdString(req);
    const question = String(req.body?.question || '').trim();
    if (!question) {
      return res.status(400).json({ success: false, message: 'question is required' });
    }

    let context = req.body?.context || {};
    if (isMongoReady()) {
      const [upcomingAppointments, activeRefills, openIncidents] = await Promise.all([
        HealthcareAppointment.countDocuments({
          userId,
          status: { $in: ['requested', 'booked', 'confirmed', 'rescheduled', 'in_progress'] },
        }),
        HealthcareRefillReminder.countDocuments({ userId, active: true }),
        HealthcareEmergencyIncident.countDocuments({ userId, status: { $ne: 'resolved' } }),
      ]);
      context = {
        ...context,
        upcomingAppointments,
        activeRefills,
        openIncidents,
      };
    }

    const aiResponse = await generateHealthcareAssistantResponse({
      question,
      context,
    });

    return res.status(200).json({
      success: true,
      data: {
        ...aiResponse,
        context,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to generate healthcare assistant response', error: error.message });
  }
});

router.get('/partner/dashboard', authenticate, async (req, res) => {
  try {
    const userId = userIdString(req);
    if (isMongoReady()) {
      const applications = await HealthcarePartnerApplication.find({ userId }).sort({ createdAt: -1 }).lean();
      const partnerDoctors = await HealthcareDoctor.find({ userId }).select('_id').lean();
      const partnerDoctorIds = partnerDoctors.map((item) => String(item._id));
      const approvedPharmacyApps = applications.filter(
        (application) =>
          String(application.entityType || '').toLowerCase() === 'pharmacy' &&
          String(application.status || '').toLowerCase() === 'approved'
      );
      const pharmacyVendorIds = approvedPharmacyApps.map((application) => String(application._id || application.id || ''));
      const pharmacyNames = approvedPharmacyApps.map((application) => String(application.vendorName || '').trim()).filter(Boolean);
      const appointments = partnerDoctorIds.length > 0
        ? await HealthcareAppointment.find({ doctorId: { $in: partnerDoctorIds } }).lean()
        : [];
      const orderQuery = [];
      if (pharmacyVendorIds.length > 0) {
        orderQuery.push({ pharmacyVendorId: { $in: pharmacyVendorIds } });
        orderQuery.push({ pharmacyId: { $in: pharmacyVendorIds } });
      }
      if (pharmacyNames.length > 0) {
        orderQuery.push({ pharmacyName: { $in: pharmacyNames } });
      }
      const orders = orderQuery.length > 0
        ? await HealthcarePharmacyOrder.find({ $or: orderQuery }).lean()
        : [];
      const paidAppointmentsRevenue = appointments.reduce((sum, apt) => sum + (String(apt.paymentStatus) === 'paid' ? parseNumber(apt.amountDue, 0) : 0), 0);
      const paidPharmacyOrdersRevenue = orders.reduce((sum, order) => sum + (String(order.paymentStatus) === 'paid' ? parseNumber(order.totalAmount, 0) : 0), 0);
      const pendingApplications = applications.filter((application) => application.status === 'pending').length;
      const approvedApplications = applications.filter((application) => application.status === 'approved').length;
      const slaStats = computePartnerSlaStats({ applications, orders, appointments });
      return res.status(200).json({
        success: true,
        data: {
          applications: applications.map(toClientObject),
          stats: {
            pendingApplications,
            approvedApplications,
            totalAppointments: appointments.length,
            totalPharmacyOrders: orders.length,
            paidAppointmentsRevenue,
            paidPharmacyOrdersRevenue,
            totalRevenue: paidAppointmentsRevenue + paidPharmacyOrdersRevenue,
            ...slaStats,
          },
        },
      });
    }
    const applications = inMemoryStore.partnerApplications.filter((application) => String(application.userId) === userId);
    const partnerDoctorIds = inMemoryStore.doctors
      .filter((doctor) => String(doctor.userId) === userId)
      .map((doctor) => String(doctor.id));
    const approvedPharmacyApps = applications.filter((application) =>
      String(application.entityType || '').toLowerCase() === 'pharmacy' &&
      String(application.status || '').toLowerCase() === 'approved'
    );
    const pharmacyVendorIds = approvedPharmacyApps.map((application) => String(application.id || ''));
    const pharmacyNames = approvedPharmacyApps.map((application) => String(application.vendorName || '').trim()).filter(Boolean);
    const appointments = inMemoryStore.appointments.filter((appointment) =>
      partnerDoctorIds.length > 0 && partnerDoctorIds.includes(String(appointment.doctorId))
    );
    const orders = inMemoryStore.pharmacyOrders.filter((order) => {
      const vendorId = String(order.pharmacyVendorId || order.pharmacyId || '');
      const vendorName = String(order.pharmacyName || '').trim();
      return (
        (vendorId && pharmacyVendorIds.includes(vendorId)) ||
        (vendorName && pharmacyNames.includes(vendorName))
      );
    });
    const paidAppointmentsRevenue = appointments.reduce((sum, apt) => sum + (String(apt.paymentStatus) === 'paid' ? parseNumber(apt.amountDue, 0) : 0), 0);
    const paidPharmacyOrdersRevenue = orders.reduce((sum, order) => sum + (String(order.paymentStatus) === 'paid' ? parseNumber(order.totalAmount, 0) : 0), 0);
    const slaStats = computePartnerSlaStats({ applications, orders, appointments });
    return res.status(200).json({
      success: true,
      data: {
        applications,
        stats: {
          pendingApplications: applications.filter((application) => application.status === 'pending').length,
          approvedApplications: applications.filter((application) => application.status === 'approved').length,
          totalAppointments: appointments.length,
          totalPharmacyOrders: orders.length,
          paidAppointmentsRevenue,
          paidPharmacyOrdersRevenue,
          totalRevenue: paidAppointmentsRevenue + paidPharmacyOrdersRevenue,
          ...slaStats,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch partner dashboard', error: error.message });
  }
});

module.exports = router;
