const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const { authenticate, verifyAdmin, hasAdminPrivileges } = require('../middleware/auth');
const { uploadToS3, deleteFromS3, generateSignedUrl } = require('../utils/s3Storage');

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

const sanitizeFileName = (fileName = '') => {
  return String(fileName || '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
};

const parseNumber = (value, fallbackValue = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
};

const userIdString = (req) => String(req?.user?._id || '');

const ensureHealthcareSeedData = async () => {
  if (!isMongoReady()) {
    return;
  }

  const [doctorCount, labCount, packageCount, medicineCount] = await Promise.all([
    HealthcareDoctor.countDocuments(),
    HealthcareLabTest.countDocuments(),
    HealthcarePackage.countDocuments(),
    HealthcareMedicine.countDocuments(),
  ]);

  if (doctorCount === 0) {
    await HealthcareDoctor.insertMany(seedDoctors.map((item) => ({ ...item, approvalStatus: 'approved', isActive: true })));
  }

  if (labCount === 0) {
    await HealthcareLabTest.insertMany(seedLabTests.map((item) => ({ ...item, approvalStatus: 'approved', isActive: true })));
  }

  if (packageCount === 0) {
    await HealthcarePackage.insertMany(seedPackages.map((item) => ({ ...item, approvalStatus: 'approved', isActive: true })));
  }

  if (medicineCount === 0) {
    await HealthcareMedicine.insertMany(seedMedicines.map((item) => ({ ...item, approvalStatus: 'approved', isActive: true })));
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
      return res.status(200).json({ success: true, data: tests.map(toClientObject) });
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
    return res.status(200).json({ success: true, data: tests });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch lab tests', error: error.message });
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
        preparationNotes: payload.preparationNotes || '',
        partnerName: payload.partnerName || req.user.name || '',
        approvalStatus,
      });
      return res.status(201).json({ success: true, data: toClientObject(created) });
    }

    const created = {
      id: `lab-memory-${Date.now()}-${crypto.randomUUID()}`,
      name: payload.name,
      price: parseNumber(payload.price, 0),
      homeCollection: Boolean(payload.homeCollection),
      type: payload.type === 'scan' ? 'scan' : payload.type || 'blood',
      turnaroundHours: parseNumber(payload.turnaroundHours, 24),
      preparationNotes: payload.preparationNotes || '',
      partnerName: payload.partnerName || req.user.name || '',
      approvalStatus,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryStore.labTests.unshift(created);
    return res.status(201).json({ success: true, data: created });
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
      return res.status(200).json({ success: true, data: medicines.map(toClientObject) });
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
    return res.status(200).json({ success: true, data: medicines });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch medicines', error: error.message });
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
        vendorName: payload.vendorName || req.user.name || '',
        approvalStatus,
      });
      return res.status(201).json({ success: true, data: toClientObject(created) });
    }

    const created = {
      id: `med-memory-${Date.now()}-${crypto.randomUUID()}`,
      name: payload.name,
      price: parseNumber(payload.price, 0),
      category: payload.category || 'General',
      requiresPrescription: Boolean(payload.requiresPrescription),
      stock: parseNumber(payload.stock, 0),
      vendorName: payload.vendorName || req.user.name || '',
      approvalStatus,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryStore.medicines.unshift(created);
    return res.status(201).json({ success: true, data: created });
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
    const userId = userIdString(req);
    if (isMongoReady()) {
      const query = { userId };
      if (familyMember) {
        query.familyMember = familyMember;
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
    if (!payload.title || !payload.category || !payload.recordDate) {
      return res.status(400).json({ success: false, message: 'title, category, and recordDate are required' });
    }

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
        uploadedBy: req.user._id,
      });
      await addNotification({
        userId,
        title: 'Health record uploaded',
        message: `${payload.title} is now available in your records vault.`,
        notificationType: 'record',
        metadata: { recordId: String(created._id) },
      });
      return res.status(201).json({ success: true, data: toClientObject(created) });
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
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create record', error: error.message });
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
      const downloadUrl = record.storageKey ? generateSignedUrl(record.storageKey) : record.fileUrl;
      return res.status(200).json({ success: true, data: { downloadUrl, fileName: record.fileName } });
    }

    const record = inMemoryStore.records.find((item) => item.id === recordId && item.userId === userId);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    const downloadUrl = record.storageKey ? generateSignedUrl(record.storageKey) : record.fileUrl;
    return res.status(200).json({ success: true, data: { downloadUrl, fileName: record.fileName } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to generate record download link', error: error.message });
  }
});

router.delete('/records/:recordId', authenticate, async (req, res) => {
  try {
    const { recordId } = req.params;
    const userId = userIdString(req);
    if (isMongoReady()) {
      const record = await HealthcareRecord.findOne({ _id: recordId, userId });
      if (!record) {
        return res.status(404).json({ success: false, message: 'Record not found' });
      }
      if (record.storageKey) {
        await deleteFromS3(record.storageKey);
      }
      await record.deleteOne();
      return res.status(200).json({ success: true, data: { id: recordId } });
    }

    const index = inMemoryStore.records.findIndex((record) => record.id === recordId && record.userId === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    const [removed] = inMemoryStore.records.splice(index, 1);
    if (removed?.storageKey) {
      await deleteFromS3(removed.storageKey);
    }
    return res.status(200).json({ success: true, data: { id: recordId } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to delete record', error: error.message });
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
    if (!payload.doctorName || !payload.appointmentDate || !payload.appointmentTime || !payload.patientName) {
      return res.status(400).json({ success: false, message: 'doctorName, appointmentDate, appointmentTime, and patientName are required' });
    }
    const amountDue = parseNumber(payload.amountDue, 0) || parseNumber(payload.consultationFee, 0) || 0;

    if (isMongoReady()) {
      const created = await HealthcareAppointment.create({
        userId,
        doctorId: payload.doctorId || '',
        doctorName: payload.doctorName,
        specialty: payload.specialty || '',
        category: payload.category || 'doctor',
        appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        mode: payload.mode || 'clinic',
        reason: payload.reason || '',
        patientName: payload.patientName,
        patientPhone: payload.patientPhone || '',
        familyMember: payload.familyMember || 'Self',
        collectionAddress: payload.collectionAddress || '',
        notes: payload.notes || '',
        status: payload.status || 'booked',
        paymentStatus: amountDue > 0 ? 'pending' : 'paid',
        amountDue,
      });
      await addNotification({
        userId,
        title: 'Appointment booked',
        message: `${payload.doctorName} appointment booked on ${payload.appointmentDate} at ${payload.appointmentTime}.`,
        notificationType: 'appointment',
        metadata: { appointmentId: String(created._id) },
      });
      return res.status(201).json({ success: true, data: toClientObject(created) });
    }

    const created = {
      id: `apt-memory-${Date.now()}-${crypto.randomUUID()}`,
      userId,
      doctorId: payload.doctorId || '',
      doctorName: payload.doctorName,
      specialty: payload.specialty || '',
      category: payload.category || 'doctor',
      appointmentDate: payload.appointmentDate,
      appointmentTime: payload.appointmentTime,
      mode: payload.mode || 'clinic',
      reason: payload.reason || '',
      patientName: payload.patientName,
      patientPhone: payload.patientPhone || '',
      familyMember: payload.familyMember || 'Self',
      collectionAddress: payload.collectionAddress || '',
      notes: payload.notes || '',
      status: payload.status || 'booked',
      paymentStatus: amountDue > 0 ? 'pending' : 'paid',
      amountDue,
      paymentReference: '',
      paymentProvider: '',
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
    return res.status(201).json({ success: true, data: created });
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
      Object.assign(current, {
        doctorName: payload.doctorName || current.doctorName,
        specialty: payload.specialty || current.specialty,
        category: payload.category || current.category,
        appointmentDate: payload.appointmentDate || current.appointmentDate,
        appointmentTime: payload.appointmentTime || current.appointmentTime,
        mode: payload.mode || current.mode,
        reason: payload.reason || current.reason,
        patientName: payload.patientName || current.patientName,
        patientPhone: payload.patientPhone || current.patientPhone,
        familyMember: payload.familyMember || current.familyMember,
        collectionAddress: payload.collectionAddress || current.collectionAddress,
        notes: payload.notes || current.notes,
        status: payload.status || current.status,
        cancellationReason: payload.cancellationReason || current.cancellationReason,
      });
      await current.save();
      return res.status(200).json({ success: true, data: toClientObject(current) });
    }

    const index = inMemoryStore.appointments.findIndex((appointment) => appointment.id === appointmentId && appointment.userId === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    inMemoryStore.appointments[index] = { ...inMemoryStore.appointments[index], ...payload, id: inMemoryStore.appointments[index].id, userId, updatedAt: new Date().toISOString() };
    return res.status(200).json({ success: true, data: inMemoryStore.appointments[index] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update appointment', error: error.message });
  }
});

router.post('/appointments/:appointmentId/payment/initiate', authenticate, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = userIdString(req);
    const paymentProvider = String(req.body?.paymentProvider || 'simulated').trim();
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
          },
        });
      }
      const paymentReference = `HC-APT-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      appointment.paymentProvider = paymentProvider;
      appointment.paymentReference = paymentReference;
      appointment.paymentStatus = 'pending';
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
    const paymentReference = `HC-APT-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    inMemoryStore.appointments[index] = {
      ...inMemoryStore.appointments[index],
      paymentProvider,
      paymentReference,
      paymentStatus: 'pending',
      updatedAt: new Date().toISOString(),
    };
    return res.status(200).json({
      success: true,
      data: {
        appointmentId,
        paymentReference,
        paymentProvider,
        amountDue: inMemoryStore.appointments[index].amountDue || 0,
        paymentStatus: 'pending',
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
    const paymentStatus = String(req.body?.paymentStatus || 'success').trim().toLowerCase();
    const normalizedStatus = paymentStatus === 'success' ? 'paid' : 'failed';
    if (isMongoReady()) {
      const appointment = await HealthcareAppointment.findOne({ _id: appointmentId, userId });
      if (!appointment) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }
      appointment.paymentReference = paymentReference || appointment.paymentReference;
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
    inMemoryStore.appointments[index] = {
      ...inMemoryStore.appointments[index],
      paymentReference: paymentReference || inMemoryStore.appointments[index].paymentReference,
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
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one cart item is required' });
    }
    const normalizedItems = items.map((item) => ({
      medicineId: String(item.medicineId || item.id || ''),
      name: String(item.name || ''),
      category: String(item.category || ''),
      unitPrice: parseNumber(item.unitPrice ?? item.price, 0),
      quantity: parseNumber(item.quantity, 1),
      requiresPrescription: Boolean(item.requiresPrescription),
    }));
    const requiresPrescription = normalizedItems.some((item) => item.requiresPrescription);
    let prescriptionFileUrl = '';
    let prescriptionStorageKey = '';
    if (requiresPrescription && !Boolean(payload.prescriptionVerified) && !req.file?.buffer) {
      return res.status(400).json({ success: false, message: 'Prescription upload is required for restricted medicines' });
    }
    if (req.file?.buffer) {
      const safeFileName = sanitizeFileName(req.file.originalname || `prescription-${Date.now()}`);
      const storageKey = `healthcare/prescriptions/${userId}/${Date.now()}-${safeFileName}`;
      const uploadResult = await uploadToS3(req.file.buffer, storageKey, { contentType: req.file.mimetype || 'application/octet-stream' });
      prescriptionStorageKey = uploadResult.s3Key || storageKey;
      prescriptionFileUrl = uploadResult.s3Url || uploadResult.publicUrlPath || generateSignedUrl(prescriptionStorageKey);
    }
    const totalAmount = normalizedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    if (isMongoReady()) {
      const created = await HealthcarePharmacyOrder.create({
        userId,
        items: normalizedItems,
        totalAmount,
        deliveryAddress: payload.deliveryAddress || '',
        phone: payload.phone || '',
        customerName: payload.customerName || req.user?.name || 'Customer',
        notes: payload.notes || '',
        prescriptionRequired: requiresPrescription,
        prescriptionVerified: requiresPrescription ? Boolean(req.file?.buffer || payload.prescriptionVerified) : true,
        prescriptionFileUrl,
        prescriptionStorageKey,
        paymentMethod: payload.paymentMethod || 'upi',
        paymentStatus: 'pending',
        orderStatus: requiresPrescription ? 'verified' : 'placed',
      });
      await addNotification({
        userId,
        title: 'Pharmacy order placed',
        message: `Order with ${normalizedItems.length} medicine item(s) has been placed.`,
        notificationType: 'pharmacy',
        metadata: { orderId: String(created._id) },
      });
      return res.status(201).json({ success: true, data: toClientObject(created) });
    }
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
      prescriptionVerified: requiresPrescription ? Boolean(req.file?.buffer || payload.prescriptionVerified) : true,
      prescriptionFileUrl,
      prescriptionStorageKey,
      paymentMethod: payload.paymentMethod || 'upi',
      paymentStatus: 'pending',
      orderStatus: requiresPrescription ? 'verified' : 'placed',
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
    return res.status(201).json({ success: true, data: created });
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

router.post('/pharmacy/orders/:orderId/payment/verify', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = userIdString(req);
    const paymentReference = String(req.body?.paymentReference || '').trim();
    const paymentStatus = String(req.body?.paymentStatus || 'success').trim().toLowerCase();
    const normalizedStatus = paymentStatus === 'success' ? 'paid' : 'failed';
    if (isMongoReady()) {
      const order = await HealthcarePharmacyOrder.findOne({ _id: orderId, userId });
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      order.paymentStatus = normalizedStatus;
      order.paymentReference = paymentReference || order.paymentReference;
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
    inMemoryStore.pharmacyOrders[index] = {
      ...inMemoryStore.pharmacyOrders[index],
      paymentStatus: normalizedStatus,
      paymentReference: paymentReference || inMemoryStore.pharmacyOrders[index].paymentReference,
      updatedAt: new Date().toISOString(),
    };
    if (normalizedStatus === 'paid') {
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
        channels: Array.isArray(payload.channels) ? payload.channels : ['in_app'],
      });
      await addNotification({
        userId,
        title: 'Refill reminder created',
        message: `Reminder set for ${payload.medicineName} on ${payload.nextRefillDate}.`,
        notificationType: 'refill',
        metadata: { reminderId: String(created._id) },
      });
      return res.status(201).json({ success: true, data: toClientObject(created) });
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
    return res.status(201).json({ success: true, data: created });
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
    if (isMongoReady()) {
      const created = await HealthcareEmergencyIncident.create({
        userId,
        familyMember: payload.familyMember || 'Self',
        incidentType: payload.incidentType || 'sos',
        message: payload.message || '',
        status: 'open',
        location: payload.location || {},
        actions: {
          call108: Boolean(payload.actions?.call108),
          call112: Boolean(payload.actions?.call112),
          locationShared: Boolean(payload.actions?.locationShared),
          familyNotified: Boolean(payload.actions?.familyNotified),
          hospitalsViewed: Boolean(payload.actions?.hospitalsViewed),
        },
        contactsNotified: Array.isArray(payload.contactsNotified) ? payload.contactsNotified : [],
      });
      await addNotification({
        userId,
        title: 'Emergency alert sent',
        message: 'Your SOS incident has been registered with emergency actions.',
        notificationType: 'emergency',
        metadata: { incidentId: String(created._id) },
      });
      return res.status(201).json({ success: true, data: toClientObject(created) });
    }
    const created = {
      id: `incident-${Date.now()}-${crypto.randomUUID()}`,
      userId,
      familyMember: payload.familyMember || 'Self',
      incidentType: payload.incidentType || 'sos',
      message: payload.message || '',
      status: 'open',
      location: payload.location || {},
      actions: {
        call108: Boolean(payload.actions?.call108),
        call112: Boolean(payload.actions?.call112),
        locationShared: Boolean(payload.actions?.locationShared),
        familyNotified: Boolean(payload.actions?.familyNotified),
        hospitalsViewed: Boolean(payload.actions?.hospitalsViewed),
      },
      contactsNotified: Array.isArray(payload.contactsNotified) ? payload.contactsNotified : [],
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
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create emergency incident', error: error.message });
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
      const incidents = await HealthcareEmergencyIncident.find({ userId }).sort({ createdAt: -1 }).lean();
      return res.status(200).json({ success: true, data: incidents.map(toClientObject) });
    }
    const incidents = inMemoryStore.incidents.filter((incident) => incident.userId === userId);
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
    if (!payload.entityType || !payload.vendorName || !payload.contactName || !payload.phone || !payload.email) {
      return res.status(400).json({ success: false, message: 'entityType, vendorName, contactName, phone, and email are required' });
    }
    if (!['doctor', 'lab', 'pharmacy'].includes(String(payload.entityType))) {
      return res.status(400).json({ success: false, message: 'entityType must be doctor, lab, or pharmacy' });
    }
    const uploadedDocuments = [];
    for (const file of req.files || []) {
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
      return res.status(201).json({ success: true, data: toClientObject(created) });
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
    return res.status(201).json({ success: true, data: created });
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

router.get('/partner/dashboard', authenticate, async (req, res) => {
  try {
    const userId = userIdString(req);
    if (isMongoReady()) {
      const [applications, appointments, orders] = await Promise.all([
        HealthcarePartnerApplication.find({ userId }).sort({ createdAt: -1 }).lean(),
        HealthcareAppointment.find({ doctorId: { $exists: true }, category: { $in: ['doctor', 'lab', 'scan', 'package'] } }).lean(),
        HealthcarePharmacyOrder.find({}).lean(),
      ]);
      const pendingApplications = applications.filter((application) => application.status === 'pending').length;
      const approvedApplications = applications.filter((application) => application.status === 'approved').length;
      return res.status(200).json({
        success: true,
        data: {
          applications: applications.map(toClientObject),
          stats: {
            pendingApplications,
            approvedApplications,
            totalAppointments: appointments.length,
            totalPharmacyOrders: orders.length,
          },
        },
      });
    }
    const applications = inMemoryStore.partnerApplications.filter((application) => application.userId === userId);
    return res.status(200).json({
      success: true,
      data: {
        applications,
        stats: {
          pendingApplications: applications.filter((application) => application.status === 'pending').length,
          approvedApplications: applications.filter((application) => application.status === 'approved').length,
          totalAppointments: inMemoryStore.appointments.length,
          totalPharmacyOrders: inMemoryStore.pharmacyOrders.length,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch partner dashboard', error: error.message });
  }
});

module.exports = router;
