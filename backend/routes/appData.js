const express = require('express');
const crypto = require('crypto');
const Joi = require('joi');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const devAppDataStore = require('../utils/devAppDataStore');
const {
  useMongoClassifieds,
  listClassifiedModuleData,
  createClassifiedAd,
  updateClassifiedAd,
  addClassifiedMessage,
  addClassifiedReport,
  addClassifiedReview,
  moderateClassifiedAd,
  deleteClassifiedAd,
  findClassifiedAdById,
} = require('../utils/classifiedStore');
const {
  listRealEstateProperties,
  serializeRealEstateProperty,
  useMongoRealEstate,
  createRealEstateProperty,
  updateRealEstateProperty,
  addRealEstateLead,
  addRealEstateMessage,
  addRealEstateReview,
  addRealEstateReport,
  moderateRealEstateProperty,
  deleteRealEstateProperty,
  findRealEstatePropertyById,
} = require('../utils/realEstateStore');
const { listRestaurants } = require('../utils/restaurantStore');
const User = require('../models/User');
const devAuthStore = require('../utils/devAuthStore');
const { deleteGridFSFile, uploadBufferToGridFS } = require('../utils/gridfs');
const { ADMIN_EMAIL } = require('../config/constants');
const { validatePhone } = require('../utils/validators');
const { sendEmailViaGmail } = require('../config/gmail');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const applicationSchema = Joi.object({
  applicantName: Joi.string().trim().required(),
  businessName: Joi.string().allow('').trim().default(''),
  email: Joi.string().email().required().lowercase().trim(),
  registrationType: Joi.string().trim().required(),
  phone: Joi.string().allow('').trim().default(''),
  location: Joi.string().allow('').trim().default(''),
  selectedBusinessCategories: Joi.array().items(Joi.object()).default([]),
  registrationFee: Joi.number().min(0).default(0),
  licenseNumber: Joi.string().allow('').trim().default(''),
  identityType: Joi.string().allow('').trim().default(''),
  identityNumber: Joi.string().allow('').trim().default(''),
  profilePhotoName: Joi.string().allow('').trim().default(''),
  profilePhotoFileId: Joi.string().allow('').trim().default(''),
  profilePhotoUrl: Joi.string().allow('').trim().default(''),
  licenseDocumentName: Joi.string().allow('').trim().default(''),
  licenseDocumentFileId: Joi.string().allow('').trim().default(''),
  licenseDocumentUrl: Joi.string().allow('').trim().default(''),
  identityDocumentName: Joi.string().allow('').trim().default(''),
  identityDocumentFileId: Joi.string().allow('').trim().default(''),
  identityDocumentUrl: Joi.string().allow('').trim().default(''),
  foodLicenseNumber: Joi.string().allow('').trim().default(''),
  foodLicenseAuthority: Joi.string().allow('').trim().default(''),
  foodLicenseDocumentName: Joi.string().allow('').trim().default(''),
  foodLicenseDocumentFileId: Joi.string().allow('').trim().default(''),
  foodLicenseDocumentUrl: Joi.string().allow('').trim().default(''),
  foodLicenseRequired: Joi.boolean().default(false),
  status: Joi.string().allow('').trim().default('Pending Review'),
});

const globeMartCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).required(),
  theme: Joi.string().allow('').trim().max(80).default(''),
  accentColor: Joi.string().allow('').trim().pattern(/^#?[0-9a-fA-F]{6}$/).default(''),
  subcategories: Joi.array().items(Joi.string().trim().min(2).max(60)).default([]),
});

const globeMartSubcategorySchema = Joi.object({
  subcategory: Joi.string().trim().min(2).max(60).required(),
});

const classifiedsMediaItemSchema = Joi.alternatives().try(
  Joi.string().allow('').trim(),
  Joi.object({
    id: Joi.string().allow('').trim().default(''),
    url: Joi.string().allow('').trim().required(),
    fileId: Joi.string().allow('').trim().default(''),
    type: Joi.string().valid('image', 'video').default('image'),
    order: Joi.number().integer().min(0).default(0),
    uploadedAt: Joi.date().iso().optional(),
  })
);

const classifiedsListingSchema = Joi.object({
  title: Joi.string().trim().min(3).max(140).required(),
  description: Joi.string().trim().min(10).max(1500).required(),
  price: Joi.number().min(1).required(),
  category: Joi.string().trim().min(2).max(60).required(),
  location: Joi.string().trim().min(2).max(120).required(),
  condition: Joi.string().valid('New', 'Like New', 'Used').default('Used'),
  mediaCount: Joi.number().integer().min(1).max(12).default(1),
  mediaGallery: Joi.array().items(classifiedsMediaItemSchema).max(12).default([]),
  plan: Joi.string().valid('free', 'featured', 'urgent', 'subscription').default('free'),
});

const classifiedsListingUpdateSchema = classifiedsListingSchema
  .fork(
    ['title', 'description', 'price', 'category', 'location'],
    (schema) => schema.optional()
  )
  .min(1);

const classifiedsMessageSchema = Joi.object({
  text: Joi.string().trim().min(1).max(1000).required(),
});

const classifiedsReportSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(300).required(),
});

const classifiedsReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().min(3).max(500).required(),
});

const classifiedsModerationSchema = Joi.object({
  action: Joi.string().valid('approve', 'flag', 'reject').required(),
});

const realEstateListingSchema = Joi.object({
  title: Joi.string().trim().min(3).max(140).required(),
  intent: Joi.string().valid('sale', 'rent', 'project').default('sale'),
  priceLabel: Joi.string().trim().min(2).max(80).required(),
  location: Joi.string().trim().min(2).max(120).required(),
  locality: Joi.string().allow('').trim().max(120).default(''),
  type: Joi.string().trim().min(2).max(60).required(),
  bedrooms: Joi.number().integer().min(0).max(20).default(0),
  bathrooms: Joi.number().integer().min(0).max(20).default(0),
  furnishing: Joi.string().trim().max(60).default('Semi Furnished'),
  areaSqft: Joi.number().min(100).max(100000).required(),
  description: Joi.string().allow('').trim().max(2000).default(''),
  possession: Joi.string().allow('').trim().max(120).default(''),
  amenities: Joi.array().items(Joi.string().trim().min(2).max(80)).max(20).default([]),
  featured: Joi.boolean().default(false),
  mediaCount: Joi.number().integer().min(0).max(50).default(0),
  hasVideoTour: Joi.boolean().default(false),
  status: Joi.string().valid('available', 'sold', 'rented').default('available'),
  roleMode: Joi.string().valid('owner', 'agent', 'builder').default('owner'),
});

const realEstateListingUpdateSchema = realEstateListingSchema
  .fork(
    ['title', 'priceLabel', 'location', 'type', 'areaSqft'],
    (schema) => schema.optional()
  )
  .min(1);

const realEstateEnquirySchema = Joi.object({
  message: Joi.string().allow('').trim().max(1000).default(''),
  channel: Joi.string().valid('Enquiry', 'Call', 'Chat').default('Enquiry'),
});

const realEstateMessageSchema = Joi.object({
  text: Joi.string().trim().min(1).max(1000).required(),
});

const realEstateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().min(3).max(500).required(),
});

const realEstateReportSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(300).required(),
});

const realEstateModerationSchema = Joi.object({
  action: Joi.string().valid('approve', 'flag', 'reject').required(),
});

const slugifyCategoryName = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeSubcategories = (subcategories = []) =>
  [...new Set((Array.isArray(subcategories) ? subcategories : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean))];

const normalizeGlobeMartCategory = (category) => {
  if (typeof category === 'string') {
    const name = category.trim();
    return {
      id: slugifyCategoryName(name),
      name,
      theme: '',
      accentColor: '',
      subcategories: [],
    };
  }

  const name = String(category?.name || category?.label || category?.id || '').trim();
  return {
    id: String(category?.id || slugifyCategoryName(name)).trim(),
    name,
    theme: String(category?.theme || '').trim(),
    accentColor: String(category?.accentColor || '')
      .trim()
      .replace(/^([0-9a-fA-F]{6})$/, '#$1'),
    subcategories: normalizeSubcategories(category?.subcategories),
  };
};

const normalizeGlobeMartCategories = (categories = []) =>
  (Array.isArray(categories) ? categories : [])
    .map(normalizeGlobeMartCategory)
    .filter((category) => category.name);

const ensureClassifiedsModuleData = (moduleData = {}) => ({
  ...moduleData,
  classifiedsListings: Array.isArray(moduleData.classifiedsListings)
    ? moduleData.classifiedsListings
    : [],
  classifiedsMessages: Array.isArray(moduleData.classifiedsMessages)
    ? moduleData.classifiedsMessages
    : [],
  classifiedsReports: Array.isArray(moduleData.classifiedsReports)
    ? moduleData.classifiedsReports
    : [],
});

const buildClassifiedPlanLabel = (plan = 'free') => {
  if (plan === 'featured') {
    return 'Featured';
  }

  if (plan === 'urgent') {
    return 'Urgent';
  }

  if (plan === 'subscription') {
    return 'Seller Pro';
  }

  return 'Free';
};

const normalizeClassifiedMediaGallery = (mediaGallery = []) =>
  (Array.isArray(mediaGallery) ? mediaGallery : [])
    .map((item, index) => {
      if (typeof item === 'string') {
        const url = item.trim();
        if (!url) {
          return null;
        }

        return {
          id: `classified-media-${index + 1}`,
          url,
          fileId: '',
          type: 'image',
          order: index,
          uploadedAt: new Date().toISOString(),
        };
      }

      const url = String(item?.url || '').trim();
      if (!url) {
        return null;
      }

      return {
        id: String(item?.id || `classified-media-${index + 1}`).trim(),
        url,
        fileId: String(item?.fileId || '').trim(),
        type: item?.type === 'video' ? 'video' : 'image',
        order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
        uploadedAt: item?.uploadedAt || new Date().toISOString(),
      };
    })
    .filter(Boolean);

const normalizeClassifiedsListingRecord = (listing = {}, index = 0) => ({
  id: String(listing.id || `classified-${index + 1}`),
  title: String(listing.title || 'Marketplace Listing').trim(),
  description: String(
    listing.description ||
      'Trusted local listing with seller details, direct chat, and location-first discovery.'
  ).trim(),
  price: Number(listing.price || 0),
  category: String(listing.category || 'General').trim(),
  seller: String(listing.seller || 'Trusted Seller').trim(),
  sellerRole: String(listing.sellerRole || 'Seller').trim(),
  sellerEmail: String(listing.sellerEmail || '').trim().toLowerCase(),
  location: String(listing.location || 'Kerala').trim(),
  locality: String(listing.locality || listing.location || 'Prime area').trim(),
  image: String(listing.image || 'Listing').trim(),
  posted: String(listing.posted || new Date().toISOString().slice(0, 10)).trim(),
  condition: String(listing.condition || 'Used').trim(),
  featured: Boolean(listing.featured),
  urgent: Boolean(listing.urgent),
  verified: Boolean(listing.verified),
  views: Number(listing.views || 0),
  favorites: Number(listing.favorites || 0),
  chats: Number(listing.chats || 0),
  languageSupport:
    Array.isArray(listing.languageSupport) && listing.languageSupport.length > 0
      ? listing.languageSupport
      : ['English', 'Malayalam'],
  tags:
    Array.isArray(listing.tags) && listing.tags.length > 0
      ? listing.tags
      : [String(listing.category || 'General').trim(), String(listing.condition || 'Used').trim()],
  mapLabel: String(listing.mapLabel || `${listing.location || 'Kerala'} local discovery zone`).trim(),
  contactOptions:
    Array.isArray(listing.contactOptions) && listing.contactOptions.length > 0
      ? listing.contactOptions
      : ['Chat'],
  mediaGallery: normalizeClassifiedMediaGallery(listing.mediaGallery),
  monetizationPlan: String(
    listing.monetizationPlan ||
      buildClassifiedPlanLabel(listing.plan || (listing.featured ? 'featured' : 'free'))
  ).trim(),
  reviews: Array.isArray(listing.reviews) ? listing.reviews : [],
  averageRating:
    Array.isArray(listing.reviews) && listing.reviews.length > 0
      ? Number(listing.averageRating || (
        listing.reviews.reduce((sum, review) => sum + Number(review?.rating || 0), 0) /
        listing.reviews.length
      ))
      : Number(listing.averageRating || 0),
  totalReviews: Number(
    listing.totalReviews ||
      (Array.isArray(listing.reviews) ? listing.reviews.length : 0)
  ),
  moderationStatus: String(listing.moderationStatus || (listing.verified === false ? 'pending' : 'approved')).trim(),
  createdAt: String(listing.createdAt || new Date().toISOString()).trim(),
  updatedAt: String(listing.updatedAt || listing.createdAt || new Date().toISOString()).trim(),
});

const normalizeClassifiedsModule = (moduleData = {}) => {
  const nextModuleData = ensureClassifiedsModuleData(moduleData);
  return {
    ...nextModuleData,
    classifiedsListings: nextModuleData.classifiedsListings.map(normalizeClassifiedsListingRecord),
    classifiedsMessages: nextModuleData.classifiedsMessages.map((message, index) => ({
      id: String(message.id || `classified-message-${index + 1}`),
      listingId: String(message.listingId || ''),
      from: String(message.from || 'User').trim(),
      senderEmail: String(message.senderEmail || '').trim().toLowerCase(),
      text: String(message.text || '').trim(),
      createdAt: String(message.createdAt || new Date().toISOString()).trim(),
    })),
    classifiedsReports: nextModuleData.classifiedsReports.map((report, index) => ({
      id: String(report.id || `classified-report-${index + 1}`),
      listingId: String(report.listingId || ''),
      reporterEmail: String(report.reporterEmail || '').trim().toLowerCase(),
      reporterName: String(report.reporterName || 'User').trim(),
      reason: String(report.reason || '').trim(),
      status: String(report.status || 'open').trim(),
      createdAt: String(report.createdAt || new Date().toISOString()).trim(),
    })),
  };
};

const canManageClassifieds = (user = {}) =>
  user?.email?.trim().toLowerCase() === ADMIN_EMAIL ||
  user?.registrationType === 'entrepreneur' ||
  user?.role === 'business' ||
  user?.registrationType === 'admin' ||
  user?.role === 'admin';

const canManageRealEstate = (user = {}) =>
  user?.email?.trim().toLowerCase() === ADMIN_EMAIL ||
  user?.registrationType === 'entrepreneur' ||
  user?.role === 'business' ||
  user?.registrationType === 'admin' ||
  user?.role === 'admin';

const resolveRealEstateOwnerId = (user = {}) =>
  String(
    user?.id ||
      user?.userId ||
      user?.email ||
      user?.phone ||
      user?.businessName ||
      user?.name ||
      ''
  ).trim();

const resolveRealEstateSellerRole = (roleMode = 'owner', user = {}) => {
  if (user?.email?.trim().toLowerCase() === ADMIN_EMAIL) {
    return 'Admin';
  }

  if (roleMode === 'builder') {
    return 'Builder';
  }

  if (roleMode === 'agent') {
    return 'Agent';
  }

  return 'Owner';
};

const matchesRealEstateListingId = (listing = {}, listingId = '') =>
  String(listing?._id || listing?.id || '') === String(listingId || '');

const buildRealEstateModuleData = async () => ({
  realestateProperties: await listRealEstateProperties(),
});

const isRealEstateListingOwner = (listing = {}, user = {}) => {
  const normalizedUserEmail = String(user?.email || '').trim().toLowerCase();
  const normalizedSellerEmail = String(listing?.sellerEmail || '').trim().toLowerCase();
  const ownerId = String(listing?.ownerId || '').trim();
  const resolvedOwnerId = resolveRealEstateOwnerId(user);

  return Boolean(
    (normalizedUserEmail && normalizedSellerEmail && normalizedUserEmail === normalizedSellerEmail) ||
      (ownerId && resolvedOwnerId && ownerId === resolvedOwnerId)
  );
};

const adminOnly = (req, res, next) => {
  if (req.user?.email?.trim().toLowerCase() !== ADMIN_EMAIL) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }

  return next();
};

const registrationUploadFields = upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'licenseDocument', maxCount: 1 },
  { name: 'identityDocument', maxCount: 1 },
  { name: 'foodLicenseDocument', maxCount: 1 },
]);

const storeRegistrationFile = async ({ file, ownerEmail, category }) => {
  if (!file?.buffer?.length) {
    return {
      fileId: '',
      url: '',
      name: '',
    };
  }

  const storedFile = await uploadBufferToGridFS({
    buffer: file.buffer,
    filename: file.originalname || `${category}-${Date.now()}`,
    contentType: file.mimetype || 'application/octet-stream',
    metadata: {
      category,
      visibility: 'private',
      ownerEmail,
    },
  });

  return {
    fileId: storedFile.id,
    url: `/api/files/private/${storedFile.id}`,
    name: file.originalname || storedFile.filename,
  };
};

const parseJsonField = (value, fallback) => {
  if (typeof value !== 'string') {
    return value ?? fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const normalizeApplicationBody = (body = {}) => ({
  ...body,
  selectedBusinessCategories: parseJsonField(body.selectedBusinessCategories, []),
  registrationFee: Number(body.registrationFee || 0),
  foodLicenseRequired:
    body.foodLicenseRequired === true || String(body.foodLicenseRequired).toLowerCase() === 'true',
});

const useMemoryAuth = () => {
  return process.env.AUTH_STORAGE === 'memory' && process.env.NODE_ENV !== 'production';
};

const hasRealEmailConfig = () => {
  if (process.env.EMAIL_SERVICE === 'gmail-api') {
    return !!process.env.GMAIL_USER;
  }

  if (process.env.EMAIL_SERVICE === 'ses') {
    return !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      !process.env.AWS_ACCESS_KEY_ID.includes('your-')
    );
  }

  const values = [
    process.env.EMAIL_USER,
    process.env.EMAIL_PASS,
    process.env.EMAIL_FROM,
  ];
  return values.every((value) => value && !value.includes('your-'));
};

const getEmailService = () => {
  if (process.env.EMAIL_SERVICE === 'gmail-api') {
    return 'gmail-api';
  }

  if (process.env.EMAIL_SERVICE === 'ses') {
    const AWS = require('aws-sdk');
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
    });
    return new AWS.SES({ apiVersion: '2010-12-01' });
  }

  const nodemailer = require('nodemailer');
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendRegistrationReviewEmail = async ({ to, applicantName, businessName, status, reason }) => {
  if (!hasRealEmailConfig()) {
    logger.warn(`Registration review email skipped for ${to}: email service not configured.`);
    return false;
  }

  const subject = `NilaHub registration update: ${status}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #1a2332;">
      <h2>NilaHub Registration Review</h2>
      <p>Hello ${applicantName || businessName || 'Entrepreneur'},</p>
      <p>Your entrepreneur registration for <strong>${businessName || 'your business account'}</strong> has been reviewed.</p>
      <p><strong>Status:</strong> ${status}</p>
      <p><strong>Reason:</strong> ${reason || 'No additional reason provided.'}</p>
      <p>Please log in to NilaHub for the latest account details.</p>
    </div>
  `;

  if (process.env.EMAIL_SERVICE === 'gmail-api') {
    await sendEmailViaGmail(to, subject, htmlContent);
    return true;
  }

  if (process.env.EMAIL_SERVICE === 'ses') {
    const ses = getEmailService();
    await ses.sendEmail({
      Source: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: {
          Html: { Data: htmlContent },
        },
      },
    }).promise();
    return true;
  }

  const transporter = getEmailService();
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  await transporter.sendMail({
    from: `NilaHub <${fromAddress}>`,
    to,
    subject,
    html: htmlContent,
  });
  return true;
};

router.get('/public', async (req, res) => {
  const appData = await devAppDataStore.readAppData();
  const classifiedsModuleData = await listClassifiedModuleData();
  const realestateProperties = await listRealEstateProperties();
  const restaurants = await listRestaurants();

  return res.json({
    success: true,
    data: {
      businessCategories: appData.businessCategories,
      globeMartCategories: normalizeGlobeMartCategories(appData.globeMartCategories),
      enabledModules: appData.enabledModules,
      registeredAccounts: appData.registeredAccounts,
      moduleData: {
        ...appData.moduleData,
        ...classifiedsModuleData,
        realestateProperties,
        restaurants,
      },
    },
  });
});

router.get('/classifieds/user/:sellerEmail/rating', async (req, res) => {
  try {
    const sellerEmail = req.params.sellerEmail.toLowerCase().trim();
    const user = await User.findOne({ email: sellerEmail }).select('classifiedsTotalRating classifiedsReviewCount');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    res.json({
      success: true,
      data: {
        classifiedsTotalRating: user.classifiedsTotalRating,
        classifiedsReviewCount: user.classifiedsReviewCount,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/admin', authenticate, adminOnly, async (req, res) => {
  const appData = await devAppDataStore.readAppData();
  const classifiedsModuleData = await listClassifiedModuleData();
  const realestateProperties = await listRealEstateProperties();
  const restaurants = await listRestaurants();

  return res.json({
    success: true,
    data: {
      businessCategories: appData.businessCategories,
      globeMartCategories: normalizeGlobeMartCategories(appData.globeMartCategories),
      enabledModules: appData.enabledModules,
      registrationApplications: appData.registrationApplications,
      registeredAccounts: appData.registeredAccounts,
      moduleData: {
        ...appData.moduleData,
        ...classifiedsModuleData,
        realestateProperties,
        restaurants,
      },
    },
  });
});

router.post('/registration-applications', registrationUploadFields, async (req, res) => {
  const profilePhoto = await storeRegistrationFile({
    file: req.files?.profilePhoto?.[0],
    ownerEmail: req.body?.email,
    category: 'profile-photo',
  });
  const licenseDocument = await storeRegistrationFile({
    file: req.files?.licenseDocument?.[0],
    ownerEmail: req.body?.email,
    category: 'license-document',
  });
  const identityDocument = await storeRegistrationFile({
    file: req.files?.identityDocument?.[0],
    ownerEmail: req.body?.email,
    category: 'identity-document',
  });
  const foodLicenseDocument = await storeRegistrationFile({
    file: req.files?.foodLicenseDocument?.[0],
    ownerEmail: req.body?.email,
    category: 'food-license-document',
  });

  const { error, value } = applicationSchema.validate(normalizeApplicationBody(req.body), {
    stripUnknown: true,
  });
  if (error) {
    await Promise.all([
      deleteGridFSFile(profilePhoto.fileId),
      deleteGridFSFile(licenseDocument.fileId),
      deleteGridFSFile(identityDocument.fileId),
      deleteGridFSFile(foodLicenseDocument.fileId),
    ]);
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  // Additional validation for email and phone
  if (!validatePhone(value.phone)) {
    await Promise.all([
      deleteGridFSFile(profilePhoto.fileId),
      deleteGridFSFile(licenseDocument.fileId),
      deleteGridFSFile(identityDocument.fileId),
      deleteGridFSFile(foodLicenseDocument.fileId),
    ]);
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number format (at least 10 digits required)',
    });
  }

  const registrationPayload = {
    ...value,
    profilePhotoName: profilePhoto.name || value.profilePhotoName,
    profilePhotoFileId: profilePhoto.fileId || value.profilePhotoFileId,
    profilePhotoUrl: profilePhoto.url || value.profilePhotoUrl,
    licenseDocumentName: licenseDocument.name || value.licenseDocumentName,
    licenseDocumentFileId: licenseDocument.fileId || value.licenseDocumentFileId,
    licenseDocumentUrl: licenseDocument.url || value.licenseDocumentUrl,
    identityDocumentName: identityDocument.name || value.identityDocumentName,
    identityDocumentFileId: identityDocument.fileId || value.identityDocumentFileId,
    identityDocumentUrl: identityDocument.url || value.identityDocumentUrl,
    foodLicenseDocumentName:
      foodLicenseDocument.name || value.foodLicenseDocumentName,
    foodLicenseDocumentFileId:
      foodLicenseDocument.fileId || value.foodLicenseDocumentFileId,
    foodLicenseDocumentUrl:
      foodLicenseDocument.url || value.foodLicenseDocumentUrl,
  };

  const normalizedRole = registrationPayload.registrationType === 'entrepreneur' ? 'business' : 'user';
  const nextUserRoles = registrationPayload.registrationType === 'entrepreneur'
    ? ['user', 'entrepreneur']
    : ['user'];

  if (useMemoryAuth()) {
    await devAuthStore.updateUserByEmail(registrationPayload.email, {
      name: registrationPayload.applicantName,
      phone: registrationPayload.phone,
      location: registrationPayload.location,
      businessName: registrationPayload.businessName,
      registrationType: registrationPayload.registrationType,
      role: normalizedRole,
      roles: nextUserRoles,
      selectedBusinessCategories: registrationPayload.selectedBusinessCategories || [],
      selectedCategoryDetails: registrationPayload.selectedBusinessCategories || [],
    });
  } else {
    await User.findOneAndUpdate(
      { email: registrationPayload.email },
      {
        email: registrationPayload.email,
        name: registrationPayload.applicantName,
        phone: registrationPayload.phone,
        location: registrationPayload.location,
        businessName: registrationPayload.businessName,
        registrationType: registrationPayload.registrationType,
        role: normalizedRole,
        roles: nextUserRoles,
        selectedBusinessCategories: registrationPayload.selectedBusinessCategories || [],
        selectedCategoryDetails: registrationPayload.selectedBusinessCategories || [],
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const nextData = await devAppDataStore.updateAppData(async (currentData) => {
    const nextApplications =
      registrationPayload.registrationType === 'entrepreneur'
        ? [
            {
              id: Date.now(),
              submittedAt: new Date().toLocaleDateString(),
              status: 'Pending Review',
              reviewReason: '',
              ...registrationPayload,
            },
            ...currentData.registrationApplications,
          ]
        : currentData.registrationApplications;

    const existingAccount = currentData.registeredAccounts.find(
      (account) => account.email === registrationPayload.email
    );

    let nextAccounts;
    if (existingAccount) {
      const nextRoles = existingAccount.roles.includes(registrationPayload.registrationType)
        ? existingAccount.roles
        : [...existingAccount.roles, registrationPayload.registrationType];

      nextAccounts = currentData.registeredAccounts.map((account) =>
        account.email === registrationPayload.email
          ? {
              ...account,
              roles: nextRoles,
              name: registrationPayload.applicantName,
              businessName: registrationPayload.businessName || account.businessName || '',
              phone: registrationPayload.phone || account.phone || '',
              location: registrationPayload.location || account.location || '',
              selectedBusinessCategories:
                registrationPayload.selectedBusinessCategories ||
                account.selectedBusinessCategories ||
                [],
              profilePhotoName:
                registrationPayload.profilePhotoName || account.profilePhotoName || '',
              profilePhotoFileId:
                registrationPayload.profilePhotoFileId || account.profilePhotoFileId || '',
              profilePhotoUrl:
                registrationPayload.profilePhotoUrl || account.profilePhotoUrl || '',
              licenseDocumentName:
                registrationPayload.licenseDocumentName || account.licenseDocumentName || '',
              licenseDocumentFileId:
                registrationPayload.licenseDocumentFileId ||
                account.licenseDocumentFileId ||
                '',
              licenseDocumentUrl:
                registrationPayload.licenseDocumentUrl || account.licenseDocumentUrl || '',
              identityDocumentName:
                registrationPayload.identityDocumentName || account.identityDocumentName || '',
              identityDocumentFileId:
                registrationPayload.identityDocumentFileId ||
                account.identityDocumentFileId ||
                '',
              identityDocumentUrl:
                registrationPayload.identityDocumentUrl || account.identityDocumentUrl || '',
              foodLicenseNumber:
                registrationPayload.foodLicenseNumber || account.foodLicenseNumber || '',
              foodLicenseAuthority:
                registrationPayload.foodLicenseAuthority || account.foodLicenseAuthority || '',
              foodLicenseDocumentName:
                registrationPayload.foodLicenseDocumentName ||
                account.foodLicenseDocumentName ||
                '',
              foodLicenseDocumentFileId:
                registrationPayload.foodLicenseDocumentFileId ||
                account.foodLicenseDocumentFileId ||
                '',
              foodLicenseDocumentUrl:
                registrationPayload.foodLicenseDocumentUrl ||
                account.foodLicenseDocumentUrl ||
                '',
              entrepreneurApprovalStatus:
                registrationPayload.registrationType === 'entrepreneur'
                  ? 'Pending Review'
                  : account.entrepreneurApprovalStatus || 'Not Requested',
            }
          : account
      );
    } else {
      nextAccounts = [
        ...currentData.registeredAccounts,
        {
          email: registrationPayload.email,
          name: registrationPayload.applicantName,
          roles: [registrationPayload.registrationType],
          businessName: registrationPayload.businessName || '',
          phone: registrationPayload.phone || '',
          location: registrationPayload.location || '',
          selectedBusinessCategories: registrationPayload.selectedBusinessCategories || [],
          profilePhotoName: registrationPayload.profilePhotoName || '',
          profilePhotoFileId: registrationPayload.profilePhotoFileId || '',
          profilePhotoUrl: registrationPayload.profilePhotoUrl || '',
          licenseDocumentName: registrationPayload.licenseDocumentName || '',
          licenseDocumentFileId: registrationPayload.licenseDocumentFileId || '',
          licenseDocumentUrl: registrationPayload.licenseDocumentUrl || '',
          identityDocumentName: registrationPayload.identityDocumentName || '',
          identityDocumentFileId: registrationPayload.identityDocumentFileId || '',
          identityDocumentUrl: registrationPayload.identityDocumentUrl || '',
          foodLicenseNumber: registrationPayload.foodLicenseNumber || '',
          foodLicenseAuthority: registrationPayload.foodLicenseAuthority || '',
          foodLicenseDocumentName: registrationPayload.foodLicenseDocumentName || '',
          foodLicenseDocumentFileId: registrationPayload.foodLicenseDocumentFileId || '',
          foodLicenseDocumentUrl: registrationPayload.foodLicenseDocumentUrl || '',
          entrepreneurApprovalStatus:
            registrationPayload.registrationType === 'entrepreneur'
              ? 'Pending Review'
              : 'Not Requested',
        },
      ];
    }

    return {
      ...currentData,
      registrationApplications: nextApplications,
      registeredAccounts: nextAccounts,
    };
  });

  return res.json({
    success: true,
    data: {
      registrationApplications: nextData.registrationApplications,
      registeredAccounts: nextData.registeredAccounts,
    },
  });
});

router.patch('/registration-applications/:applicationId/review', authenticate, adminOnly, async (req, res) => {
  const normalizedAction = String(req.body?.action || '').trim().toLowerCase();
  const normalizedReason = String(req.body?.reason || '').trim();

  if (!['approve', 'reject'].includes(normalizedAction)) {
    return res.status(400).json({
      success: false,
      message: 'Action must be approve or reject.',
    });
  }

  const applicationId = String(req.params.applicationId);
  const nextStatus = normalizedAction === 'approve' ? 'Approved' : 'Rejected';
  let reviewedApplication = null;

  const nextData = await devAppDataStore.updateAppData(async (currentData) => {
    const registrationApplications = currentData.registrationApplications.map((application) =>
      String(application.id) === applicationId
        ? {
            ...application,
            status: nextStatus,
            reviewReason: normalizedReason,
            reviewedAt: new Date().toISOString(),
            reviewedBy: req.user.email,
          }
        : application
    );

    const registrationEmail =
      registrationApplications.find((application) => String(application.id) === applicationId)?.email || '';

    const registeredAccounts = currentData.registeredAccounts.map((account) =>
      account.email === registrationEmail
        ? {
            ...account,
            entrepreneurApprovalStatus: nextStatus,
          }
        : account
    );

    reviewedApplication =
      registrationApplications.find((application) => String(application.id) === applicationId) || null;

    return {
      ...currentData,
      registrationApplications,
      registeredAccounts,
    };
  });

  if (!reviewedApplication) {
    return res.status(404).json({
      success: false,
      message: 'Registration application not found.',
    });
  }

  let emailSent = false;
  try {
    emailSent = await sendRegistrationReviewEmail({
      to: reviewedApplication.email,
      applicantName: reviewedApplication.applicantName,
      businessName: reviewedApplication.businessName,
      status: nextStatus,
      reason: normalizedReason,
    });
  } catch (error) {
    logger.error('Failed to send registration review email', {
      applicationId,
      email: reviewedApplication.email,
      error: error.message,
    });
  }

  const completedActionLabel = normalizedAction === 'approve' ? 'approved' : 'rejected';

  return res.json({
    success: true,
    message: emailSent
      ? `Registration ${completedActionLabel} and email sent to entrepreneur.`
      : `Registration ${completedActionLabel}. Email could not be sent.`,
    data: {
      registrationApplications: nextData.registrationApplications,
      registeredAccounts: nextData.registeredAccounts,
      emailSent,
    },
  });
});

router.put('/business-categories/:categoryId/fee', authenticate, adminOnly, async (req, res) => {
  const fee = Number(req.body?.fee);

  const nextData = await devAppDataStore.updateAppData(async (currentData) => ({
    ...currentData,
    businessCategories: currentData.businessCategories.map((category) =>
      category.id === req.params.categoryId
        ? { ...category, fee: Number.isNaN(fee) ? 0 : fee }
        : category
    ),
  }));

  return res.json({
    success: true,
    data: {
      businessCategories: nextData.businessCategories,
    },
  });
});

router.patch('/enabled-modules/:moduleId', authenticate, adminOnly, async (req, res) => {
  const nextData = await devAppDataStore.updateAppData(async (currentData) => {
    const enabledModules = currentData.enabledModules.includes(req.params.moduleId)
      ? currentData.enabledModules.filter((id) => id !== req.params.moduleId)
      : [...currentData.enabledModules, req.params.moduleId];

    return {
      ...currentData,
      enabledModules,
    };
  });

  return res.json({
    success: true,
    data: {
      enabledModules: nextData.enabledModules,
    },
  });
});

router.post('/globemart-categories', authenticate, adminOnly, async (req, res) => {
  const { error, value } = globeMartCategorySchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const normalizedCategory = normalizeGlobeMartCategory({
    id: slugifyCategoryName(value.name),
    name: value.name.trim(),
    theme: value.theme,
    accentColor: value.accentColor,
    subcategories: value.subcategories,
  });

  const nextData = await devAppDataStore.updateAppData(async (currentData) => {
    const currentCategories = normalizeGlobeMartCategories(currentData.globeMartCategories);
    const alreadyExists = currentCategories.some(
      (category) => category.name.trim().toLowerCase() === normalizedCategory.name.toLowerCase()
    );

    return {
      ...currentData,
      globeMartCategories: alreadyExists
        ? currentCategories
        : [...currentCategories, normalizedCategory],
    };
  });

  return res.json({
    success: true,
    data: {
      globeMartCategories: normalizeGlobeMartCategories(nextData.globeMartCategories),
    },
  });
});

router.post('/globemart-categories/:categoryId/subcategories', authenticate, adminOnly, async (req, res) => {
  const { error, value } = globeMartSubcategorySchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const currentData = await devAppDataStore.readAppData();
  const currentCategories = normalizeGlobeMartCategories(currentData.globeMartCategories);
  const categoryFound = currentCategories.some((category) => category.id === req.params.categoryId);

  if (!categoryFound) {
    return res.status(404).json({
      success: false,
      message: 'GlobeMart category not found.',
    });
  }

  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const latestCategories = normalizeGlobeMartCategories(latestData.globeMartCategories);

    return {
      ...latestData,
      globeMartCategories: latestCategories.map((category) =>
        category.id === req.params.categoryId
          ? {
              ...category,
              subcategories: normalizeSubcategories([...category.subcategories, value.subcategory]),
            }
          : category
      ),
    };
  });

  return res.json({
    success: true,
    data: {
      globeMartCategories: normalizeGlobeMartCategories(nextData.globeMartCategories),
    },
  });
});

router.post('/classifieds/listings', authenticate, async (req, res) => {
  if (!canManageClassifieds(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Seller or admin access required to post classifieds.',
    });
  }

  const { error, value } = classifiedsListingSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const now = new Date().toISOString();
  const sellerName = req.user.businessName?.trim() || req.user.name?.trim() || 'New Seller';
  const sellerRole =
    req.user.email?.trim().toLowerCase() === ADMIN_EMAIL
      ? 'Admin'
      : req.user.registrationType === 'entrepreneur' || req.user.role === 'business'
        ? 'Micro-entrepreneur'
        : 'Seller';
  const listingId =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `classified-${Date.now()}`;

  const createdListing = normalizeClassifiedsListingRecord({
    id: listingId,
    ...value,
    seller: sellerName,
    sellerRole,
    sellerEmail: req.user.email,
    locality: value.location,
    image: 'Fresh listing',
    posted: now.slice(0, 10),
    featured: value.plan === 'featured' || value.plan === 'subscription',
    urgent: value.plan === 'urgent',
    verified: req.user.email?.trim().toLowerCase() === ADMIN_EMAIL,
    mediaGallery:
      normalizeClassifiedMediaGallery(value.mediaGallery).length > 0
        ? normalizeClassifiedMediaGallery(value.mediaGallery)
        : Array.from({ length: value.mediaCount }, (_, index) => ({
            id: `classified-media-${index + 1}`,
            url: '',
            fileId: '',
            type: 'image',
            order: index,
            uploadedAt: now,
          })),
    contactOptions: ['Chat', 'Call'],
    languageSupport: ['English', 'Malayalam', 'Tamil', 'Hindi'],
    tags: [value.category, value.condition, 'New ad'],
    mapLabel: `${value.location} local discovery zone`,
    monetizationPlan: buildClassifiedPlanLabel(value.plan),
    moderationStatus:
      req.user.email?.trim().toLowerCase() === ADMIN_EMAIL ? 'approved' : 'pending',
    reviews: [],
    averageRating: 0,
    totalReviews: 0,
    createdAt: now,
    updatedAt: now,
  });

  if (useMongoClassifieds()) {
    const listing = await createClassifiedAd({
      ...createdListing,
      posted: createdListing.posted,
      messages: [],
      reports: [],
    });

    return res.json({
      success: true,
      data: {
        moduleData: await listClassifiedModuleData(),
        listing,
      },
    });
  }

  const nextData = await devAppDataStore.updateAppData(async (currentData) => {
    const currentModuleData = normalizeClassifiedsModule(currentData.moduleData);

    return {
      ...currentData,
      moduleData: {
        ...currentData.moduleData,
        ...currentModuleData,
        classifiedsListings: [createdListing, ...currentModuleData.classifiedsListings],
      },
    };
  });

  return res.json({
    success: true,
    data: {
      moduleData: normalizeClassifiedsModule(nextData.moduleData),
      listing: createdListing,
    },
  });
});

router.patch('/classifieds/listings/:listingId', authenticate, async (req, res) => {
  const { error, value } = classifiedsListingUpdateSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  if (useMongoClassifieds()) {
    const matchedListing = await findClassifiedAdById(req.params.listingId);

    if (!matchedListing) {
      return res.status(404).json({
        success: false,
        message: 'Classified listing not found.',
      });
    }

    const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
    const isOwner = matchedListing.sellerEmail === req.user.email?.trim().toLowerCase();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only the seller or admin can update this listing.',
      });
    }

    const updatedListing = await updateClassifiedAd(req.params.listingId, {
      ...value,
      mediaGallery: normalizeClassifiedMediaGallery(value.mediaGallery),
    });

    return res.json({
      success: true,
      data: {
        moduleData: await listClassifiedModuleData(),
        listing: updatedListing,
      },
    });
  }

  const currentData = await devAppDataStore.readAppData();
  const currentModuleData = normalizeClassifiedsModule(currentData.moduleData);
  const matchedListing = currentModuleData.classifiedsListings.find(
    (listing) => listing.id === req.params.listingId
  );

  if (!matchedListing) {
    return res.status(404).json({
      success: false,
      message: 'Classified listing not found.',
    });
  }

  const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
  const isOwner = matchedListing.sellerEmail === req.user.email?.trim().toLowerCase();

  if (!isAdmin && !isOwner) {
    return res.status(403).json({
      success: false,
      message: 'Only the seller or admin can update this listing.',
    });
  }

  let updatedListing = null;
  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const latestModuleData = normalizeClassifiedsModule(latestData.moduleData);
    const nextListings = latestModuleData.classifiedsListings.map((listing) => {
      if (listing.id !== req.params.listingId) {
        return listing;
      }

      updatedListing = normalizeClassifiedsListingRecord({
        ...listing,
        ...value,
        mediaGallery:
          value.mediaGallery !== undefined
            ? normalizeClassifiedMediaGallery(value.mediaGallery)
            : listing.mediaGallery,
        featured:
          value.plan !== undefined
            ? value.plan === 'featured' || value.plan === 'subscription'
            : listing.featured,
        urgent: value.plan !== undefined ? value.plan === 'urgent' : listing.urgent,
        monetizationPlan:
          value.plan !== undefined ? buildClassifiedPlanLabel(value.plan) : listing.monetizationPlan,
        updatedAt: new Date().toISOString(),
      });

      return updatedListing;
    });

    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        ...latestModuleData,
        classifiedsListings: nextListings,
      },
    };
  });

  return res.json({
    success: true,
    data: {
      moduleData: normalizeClassifiedsModule(nextData.moduleData),
      listing: updatedListing,
    },
  });
});

router.post('/classifieds/listings/:listingId/messages', authenticate, async (req, res) => {
  const { error, value } = classifiedsMessageSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  if (useMongoClassifieds()) {
    const updatedListing = await addClassifiedMessage(req.params.listingId, {
      id:
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `classified-message-${Date.now()}`,
      from: req.user.name?.trim() || 'You',
      senderEmail: req.user.email,
      text: value.text,
      createdAt: new Date(),
    });

    if (!updatedListing) {
      return res.status(404).json({
        success: false,
        message: 'Classified listing not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        moduleData: await listClassifiedModuleData(),
      },
    });
  }

  const nextData = await devAppDataStore.updateAppData(async (currentData) => {
    const currentModuleData = normalizeClassifiedsModule(currentData.moduleData);
    const listingExists = currentModuleData.classifiedsListings.some(
      (listing) => listing.id === req.params.listingId
    );

    if (!listingExists) {
      return currentData;
    }

    const message = {
      id:
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `classified-message-${Date.now()}`,
      listingId: req.params.listingId,
      from: req.user.name?.trim() || 'You',
      senderEmail: req.user.email,
      text: value.text,
      createdAt: new Date().toISOString(),
    };

    return {
      ...currentData,
      moduleData: {
        ...currentData.moduleData,
        ...currentModuleData,
        classifiedsListings: currentModuleData.classifiedsListings.map((listing) =>
          listing.id === req.params.listingId
            ? {
                ...listing,
                chats: Number(listing.chats || 0) + 1,
                updatedAt: message.createdAt,
              }
            : listing
        ),
        classifiedsMessages: [...currentModuleData.classifiedsMessages, message],
      },
    };
  });

  const normalizedModuleData = normalizeClassifiedsModule(nextData.moduleData);
  const listingExists = normalizedModuleData.classifiedsListings.some(
    (listing) => listing.id === req.params.listingId
  );

  if (!listingExists) {
    return res.status(404).json({
      success: false,
      message: 'Classified listing not found.',
    });
  }

  return res.json({
    success: true,
    data: {
      moduleData: normalizedModuleData,
    },
  });
});

router.post('/classifieds/listings/:listingId/reviews', authenticate, async (req, res) => {
  const { error, value } = classifiedsReviewSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  if (useMongoClassifieds()) {
    const updatedListing = await addClassifiedReview(req.params.listingId, {
      id:
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `classified-review-${Date.now()}`,
      buyerEmail: req.user.email,
      buyerName: req.user.name?.trim() || 'Anonymous',
      rating: value.rating,
      comment: value.comment,
      createdAt: new Date(),
    });

    if (!updatedListing) {
      return res.status(404).json({
        success: false,
        message: 'Classified listing not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        moduleData: await listClassifiedModuleData(),
        listing: updatedListing,
      },
    });
  }

  let listingFound = false;
  const nextData = await devAppDataStore.updateAppData(async (currentData) => {
    const currentModuleData = normalizeClassifiedsModule(currentData.moduleData);
    const now = new Date().toISOString();

    const nextListings = currentModuleData.classifiedsListings.map((listing) => {
      if (listing.id !== req.params.listingId) {
        return listing;
      }

      listingFound = true;
      const reviews = [
        {
          id:
            typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `classified-review-${Date.now()}`,
          buyerEmail: req.user.email,
          buyerName: req.user.name?.trim() || 'Anonymous',
          rating: value.rating,
          comment: value.comment,
          createdAt: now,
        },
        ...(Array.isArray(listing.reviews) ? listing.reviews : []),
      ];

      return normalizeClassifiedsListingRecord({
        ...listing,
        reviews,
        totalReviews: reviews.length,
        averageRating:
          reviews.reduce((sum, review) => sum + Number(review?.rating || 0), 0) / reviews.length,
        updatedAt: now,
      });
    });

    return {
      ...currentData,
      moduleData: {
        ...currentData.moduleData,
        ...currentModuleData,
        classifiedsListings: nextListings,
      },
    };
  });

  if (!listingFound) {
    return res.status(404).json({
      success: false,
      message: 'Classified listing not found.',
    });
  }

  return res.json({
    success: true,
    data: {
      moduleData: normalizeClassifiedsModule(nextData.moduleData),
    },
  });
});

router.post('/classifieds/listings/:listingId/reports', authenticate, async (req, res) => {
  const { error, value } = classifiedsReportSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  if (useMongoClassifieds()) {
    const updatedListing = await addClassifiedReport(req.params.listingId, {
      id:
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `classified-report-${Date.now()}`,
      reporterEmail: req.user.email,
      reporterName: req.user.name?.trim() || 'User',
      reason: value.reason,
      status: 'open',
      createdAt: new Date(),
    });

    if (!updatedListing) {
      return res.status(404).json({
        success: false,
        message: 'Classified listing not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        moduleData: await listClassifiedModuleData(),
      },
    });
  }

  const nextData = await devAppDataStore.updateAppData(async (currentData) => {
    const currentModuleData = normalizeClassifiedsModule(currentData.moduleData);
    const listingExists = currentModuleData.classifiedsListings.some(
      (listing) => listing.id === req.params.listingId
    );

    if (!listingExists) {
      return currentData;
    }

    const report = {
      id:
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `classified-report-${Date.now()}`,
      listingId: req.params.listingId,
      reporterEmail: req.user.email,
      reporterName: req.user.name?.trim() || 'User',
      reason: value.reason,
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    return {
      ...currentData,
      moduleData: {
        ...currentData.moduleData,
        ...currentModuleData,
        classifiedsReports: [...currentModuleData.classifiedsReports, report],
      },
    };
  });

  const normalizedModuleData = normalizeClassifiedsModule(nextData.moduleData);
  const listingExists = normalizedModuleData.classifiedsListings.some(
    (listing) => listing.id === req.params.listingId
  );

  if (!listingExists) {
    return res.status(404).json({
      success: false,
      message: 'Classified listing not found.',
    });
  }

  return res.json({
    success: true,
    data: {
      moduleData: normalizedModuleData,
    },
  });
});

router.patch('/classifieds/listings/:listingId/moderation', authenticate, adminOnly, async (req, res) => {
  const { error, value } = classifiedsModerationSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  if (useMongoClassifieds()) {
    const updates =
      value.action === 'approve'
        ? { verified: true, moderationStatus: 'approved' }
        : value.action === 'flag'
          ? { verified: false, moderationStatus: 'flagged' }
          : { verified: false, moderationStatus: 'rejected' };

    const updatedListing = await moderateClassifiedAd(req.params.listingId, updates);

    if (!updatedListing) {
      return res.status(404).json({
        success: false,
        message: 'Classified listing not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        moduleData: await listClassifiedModuleData(),
      },
    });
  }

  const nextData = await devAppDataStore.updateAppData(async (currentData) => {
    const currentModuleData = normalizeClassifiedsModule(currentData.moduleData);
    const nextListings = currentModuleData.classifiedsListings.map((listing) => {
      if (listing.id !== req.params.listingId) {
        return listing;
      }

      if (value.action === 'approve') {
        return {
          ...listing,
          verified: true,
          moderationStatus: 'approved',
          updatedAt: new Date().toISOString(),
        };
      }

      if (value.action === 'flag') {
        return {
          ...listing,
          verified: false,
          moderationStatus: 'flagged',
          updatedAt: new Date().toISOString(),
        };
      }

      return {
        ...listing,
        verified: false,
        moderationStatus: 'rejected',
        updatedAt: new Date().toISOString(),
      };
    });

    return {
      ...currentData,
      moduleData: {
        ...currentData.moduleData,
        ...currentModuleData,
        classifiedsListings: nextListings,
      },
    };
  });

  return res.json({
    success: true,
    data: {
      moduleData: normalizeClassifiedsModule(nextData.moduleData),
    },
  });
});

router.delete('/classifieds/listings/:listingId', authenticate, async (req, res) => {
  if (useMongoClassifieds()) {
    const matchedListing = await findClassifiedAdById(req.params.listingId);

    if (!matchedListing) {
      return res.status(404).json({
        success: false,
        message: 'Classified listing not found.',
      });
    }

    const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
    const isOwner = matchedListing.sellerEmail === req.user.email?.trim().toLowerCase();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only the seller or admin can delete this listing.',
      });
    }

    await deleteClassifiedAd(req.params.listingId);

    return res.json({
      success: true,
      data: {
        moduleData: await listClassifiedModuleData(),
      },
    });
  }

  const currentData = await devAppDataStore.readAppData();
  const currentModuleData = normalizeClassifiedsModule(currentData.moduleData);
  const matchedListing = currentModuleData.classifiedsListings.find(
    (listing) => listing.id === req.params.listingId
  );

  if (!matchedListing) {
    return res.status(404).json({
      success: false,
      message: 'Classified listing not found.',
    });
  }

  const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
  const isOwner = matchedListing.sellerEmail === req.user.email?.trim().toLowerCase();

  if (!isAdmin && !isOwner) {
    return res.status(403).json({
      success: false,
      message: 'Only the seller or admin can delete this listing.',
    });
  }

  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const latestModuleData = normalizeClassifiedsModule(latestData.moduleData);
    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        ...latestModuleData,
        classifiedsListings: latestModuleData.classifiedsListings.filter(
          (listing) => listing.id !== req.params.listingId
        ),
        classifiedsMessages: latestModuleData.classifiedsMessages.filter(
          (message) => message.listingId !== req.params.listingId
        ),
        classifiedsReports: latestModuleData.classifiedsReports.filter(
          (report) => report.listingId !== req.params.listingId
        ),
      },
    };
  });

  return res.json({
    success: true,
    data: {
      moduleData: normalizeClassifiedsModule(nextData.moduleData),
    },
  });
});

router.post('/realestate/listings', authenticate, async (req, res) => {
  if (!canManageRealEstate(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Seller or admin access required to post real-estate listings.',
    });
  }

  const { error, value } = realEstateListingSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const now = new Date().toISOString();
  const sellerName = req.user.businessName?.trim() || req.user.name?.trim() || 'New Partner';
  const sellerRole = resolveRealEstateSellerRole(value.roleMode, req.user);
  const ownerId = resolveRealEstateOwnerId(req.user);
  const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
  const numericPriceValue = Number(String(value.priceLabel || '').replace(/[^0-9.]/g, '')) || 0;
  const listingPayload = {
    title: value.title,
    price: value.priceLabel,
    priceLabel: value.priceLabel,
    priceValue: numericPriceValue,
    area: `${Number(value.areaSqft)} sq ft`,
    areaSqft: Number(value.areaSqft),
    location: value.location,
    locality: value.locality || value.location,
    type: value.type,
    intent: value.intent,
    image: 'Fresh listing',
    bedrooms: Number(value.bedrooms || 0),
    bathrooms:
      Number.isFinite(Number(value.bathrooms)) && Number(value.bathrooms) >= 0
        ? Number(value.bathrooms)
        : Number(value.bedrooms || 0) > 0
          ? Math.max(1, Number(value.bedrooms || 0) - 1)
          : 0,
    furnishing: value.furnishing,
    amenities:
      Array.isArray(value.amenities) && value.amenities.length > 0
        ? value.amenities
        : ['Photo upload ready', 'Lead capture', 'Map support'],
    sellerName,
    sellerRole,
    sellerEmail: req.user.email,
    ownerId,
    developer: sellerRole === 'Builder' ? sellerName : '',
    listedBy: sellerRole,
    verified: isAdmin,
    verificationStatus: isAdmin ? 'Verified' : 'Pending approval',
    featured: isAdmin ? Boolean(value.featured) : false,
    postedOn: now.slice(0, 10),
    possession: value.possession || 'Ready to move',
    description:
      value.description ||
      'Freshly posted listing waiting for admin review. Media, map pin, and legal checks can be attached in the next step.',
    mapLabel: `${value.locality || value.location} growth corridor`,
    rating: 0,
    reviewCount: 0,
    premiumPlan:
      Boolean(value.featured) && isAdmin
        ? 'Featured Listing'
        : sellerRole === 'Builder' || sellerRole === 'Agent'
          ? 'Agent Pro'
          : 'Starter',
    mediaCount: Number(value.mediaCount || 0),
    hasVideoTour: Boolean(value.hasVideoTour),
    projectUnits: value.intent === 'project' ? 1 : 1,
    leads: [],
    chatPreview: [],
    similarTags: [value.type, value.location, value.intent].filter(Boolean),
    reviews: [],
    reports: [],
    disputeCount: 0,
    languageSupport: ['English', 'Malayalam'],
    status: value.status,
    createdAt: now,
    updatedAt: now,
  };

  if (useMongoRealEstate()) {
    const listing = await createRealEstateProperty(listingPayload);

    return res.json({
      success: true,
      data: {
        moduleData: await buildRealEstateModuleData(),
        listing,
      },
    });
  }

  const createdListing = serializeRealEstateProperty({
    id:
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `realestate-${Date.now()}`,
    ...listingPayload,
  });

  const nextData = await devAppDataStore.updateAppData(async (currentData) => ({
    ...currentData,
    moduleData: {
      ...currentData.moduleData,
      realestateProperties: [createdListing, ...(currentData.moduleData?.realestateProperties || [])],
    },
  }));

  return res.json({
    success: true,
    data: {
      moduleData: {
        realestateProperties: Array.isArray(nextData.moduleData?.realestateProperties)
          ? nextData.moduleData.realestateProperties.map(serializeRealEstateProperty)
          : [],
      },
      listing: createdListing,
    },
  });
});

router.patch('/realestate/listings/:listingId', authenticate, async (req, res) => {
  const { error, value } = realEstateListingUpdateSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  if (useMongoRealEstate()) {
    const matchedListing = await findRealEstatePropertyById(req.params.listingId);

    if (!matchedListing) {
      return res.status(404).json({
        success: false,
        message: 'Real-estate listing not found.',
      });
    }

    const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
    if (!isAdmin && !isRealEstateListingOwner(matchedListing, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Only the listing owner or admin can update this property.',
      });
    }

    const updates = {
      ...value,
      price: value.priceLabel,
      priceValue:
        value.priceLabel !== undefined
          ? Number(String(value.priceLabel || '').replace(/[^0-9.]/g, '')) || 0
          : undefined,
      area: value.areaSqft !== undefined ? `${Number(value.areaSqft)} sq ft` : undefined,
      locality: value.locality || undefined,
      updatedAt: new Date(),
    };

    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

    const listing = await updateRealEstateProperty(req.params.listingId, updates);

    return res.json({
      success: true,
      data: {
        moduleData: await buildRealEstateModuleData(),
        listing,
      },
    });
  }

  const currentData = await devAppDataStore.readAppData();
  const currentListings = Array.isArray(currentData.moduleData?.realestateProperties)
    ? currentData.moduleData.realestateProperties.map(serializeRealEstateProperty)
    : [];
  const matchedListing = currentListings.find((listing) =>
    matchesRealEstateListingId(listing, req.params.listingId)
  );

  if (!matchedListing) {
    return res.status(404).json({
      success: false,
      message: 'Real-estate listing not found.',
    });
  }

  const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
  if (!isAdmin && !isRealEstateListingOwner(matchedListing, req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Only the listing owner or admin can update this property.',
    });
  }

  let updatedListing = null;
  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const nextListings = (latestData.moduleData?.realestateProperties || []).map((listing) => {
      if (!matchesRealEstateListingId(listing, req.params.listingId)) {
        return listing;
      }

      updatedListing = serializeRealEstateProperty({
        ...listing,
        ...value,
        price: value.priceLabel !== undefined ? value.priceLabel : listing.price,
        priceLabel: value.priceLabel !== undefined ? value.priceLabel : listing.priceLabel,
        priceValue:
          value.priceLabel !== undefined
            ? Number(String(value.priceLabel || '').replace(/[^0-9.]/g, '')) || 0
            : listing.priceValue,
        area: value.areaSqft !== undefined ? `${Number(value.areaSqft)} sq ft` : listing.area,
        locality: value.locality !== undefined ? value.locality || value.location || listing.location : listing.locality,
        updatedAt: new Date().toISOString(),
      });

      return {
        ...listing,
        ...value,
        price: updatedListing.price,
        priceLabel: updatedListing.priceLabel,
        priceValue: updatedListing.priceValue,
        area: updatedListing.area,
        locality: updatedListing.locality,
        updatedAt: updatedListing.updatedAt,
      };
    });

    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        realestateProperties: nextListings,
      },
    };
  });

  return res.json({
    success: true,
    data: {
      moduleData: {
        realestateProperties: Array.isArray(nextData.moduleData?.realestateProperties)
          ? nextData.moduleData.realestateProperties.map(serializeRealEstateProperty)
          : [],
      },
      listing: updatedListing,
    },
  });
});

router.post('/realestate/listings/:listingId/enquiries', authenticate, async (req, res) => {
  const { error, value } = realEstateEnquirySchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const lead = {
    id:
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `realestate-lead-${Date.now()}`,
    name: req.user.name?.trim() || 'Buyer',
    email: req.user.email,
    channel: value.channel,
    priority: value.message ? 'Hot' : 'Warm',
    message: value.message,
    createdAt: new Date(),
  };

  if (useMongoRealEstate()) {
    const listing = await addRealEstateLead(req.params.listingId, lead);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Real-estate listing not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        moduleData: await buildRealEstateModuleData(),
        listing,
      },
    });
  }

  let listingFound = false;
  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const nextListings = (latestData.moduleData?.realestateProperties || []).map((listing) => {
      if (!matchesRealEstateListingId(listing, req.params.listingId)) {
        return listing;
      }

      listingFound = true;
      return {
        ...listing,
        leads: [...(Array.isArray(listing.leads) ? listing.leads : []), lead],
        updatedAt: new Date().toISOString(),
      };
    });

    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        realestateProperties: nextListings,
      },
    };
  });

  if (!listingFound) {
    return res.status(404).json({
      success: false,
      message: 'Real-estate listing not found.',
    });
  }

  return res.json({
    success: true,
    data: {
      moduleData: {
        realestateProperties: Array.isArray(nextData.moduleData?.realestateProperties)
          ? nextData.moduleData.realestateProperties.map(serializeRealEstateProperty)
          : [],
      },
    },
  });
});

router.post('/realestate/listings/:listingId/messages', authenticate, async (req, res) => {
  const { error, value } = realEstateMessageSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const message = {
    id:
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `realestate-message-${Date.now()}`,
    from: req.user.name?.trim() || 'You',
    senderEmail: req.user.email,
    text: value.text,
    createdAt: new Date(),
  };

  if (useMongoRealEstate()) {
    const listing = await addRealEstateMessage(req.params.listingId, message);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Real-estate listing not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        moduleData: await buildRealEstateModuleData(),
        listing,
      },
    });
  }

  let listingFound = false;
  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const nextListings = (latestData.moduleData?.realestateProperties || []).map((listing) => {
      if (!matchesRealEstateListingId(listing, req.params.listingId)) {
        return listing;
      }

      listingFound = true;
      return {
        ...listing,
        chatPreview: [...(Array.isArray(listing.chatPreview) ? listing.chatPreview : []), message],
        updatedAt: new Date().toISOString(),
      };
    });

    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        realestateProperties: nextListings,
      },
    };
  });

  if (!listingFound) {
    return res.status(404).json({
      success: false,
      message: 'Real-estate listing not found.',
    });
  }

  return res.json({
    success: true,
    data: {
      moduleData: {
        realestateProperties: Array.isArray(nextData.moduleData?.realestateProperties)
          ? nextData.moduleData.realestateProperties.map(serializeRealEstateProperty)
          : [],
      },
    },
  });
});

router.post('/realestate/listings/:listingId/reviews', authenticate, async (req, res) => {
  const { error, value } = realEstateReviewSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const review = {
    id:
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `realestate-review-${Date.now()}`,
    author: req.user.name?.trim() || 'Buyer',
    buyerEmail: req.user.email,
    score: value.rating,
    comment: value.comment,
    createdAt: new Date(),
  };

  if (useMongoRealEstate()) {
    const listing = await addRealEstateReview(req.params.listingId, review);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Real-estate listing not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        moduleData: await buildRealEstateModuleData(),
        listing,
      },
    });
  }

  let updatedListing = null;
  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const nextListings = (latestData.moduleData?.realestateProperties || []).map((listing) => {
      if (!matchesRealEstateListingId(listing, req.params.listingId)) {
        return listing;
      }

      const reviews = [...(Array.isArray(listing.reviews) ? listing.reviews : []), review];
      const averageRating =
        reviews.reduce((sum, item) => sum + Number(item.score || 0), 0) / reviews.length;
      updatedListing = serializeRealEstateProperty({
        ...listing,
        reviews,
        reviewCount: reviews.length,
        rating: averageRating,
        updatedAt: new Date().toISOString(),
      });

      return {
        ...listing,
        reviews,
        reviewCount: updatedListing.reviewCount,
        rating: updatedListing.rating,
        updatedAt: updatedListing.updatedAt,
      };
    });

    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        realestateProperties: nextListings,
      },
    };
  });

  if (!updatedListing) {
    return res.status(404).json({
      success: false,
      message: 'Real-estate listing not found.',
    });
  }

  return res.json({
    success: true,
    data: {
      moduleData: {
        realestateProperties: Array.isArray(nextData.moduleData?.realestateProperties)
          ? nextData.moduleData.realestateProperties.map(serializeRealEstateProperty)
          : [],
      },
      listing: updatedListing,
    },
  });
});

router.post('/realestate/listings/:listingId/reports', authenticate, async (req, res) => {
  const { error, value } = realEstateReportSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const report = {
    id:
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `realestate-report-${Date.now()}`,
    reporterEmail: req.user.email,
    reporterName: req.user.name?.trim() || 'User',
    reason: value.reason,
    status: 'open',
    createdAt: new Date(),
  };

  if (useMongoRealEstate()) {
    const listing = await addRealEstateReport(req.params.listingId, report);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Real-estate listing not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        moduleData: await buildRealEstateModuleData(),
        listing,
      },
    });
  }

  let updatedListing = null;
  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const nextListings = (latestData.moduleData?.realestateProperties || []).map((listing) => {
      if (!matchesRealEstateListingId(listing, req.params.listingId)) {
        return listing;
      }

      const reports = [...(Array.isArray(listing.reports) ? listing.reports : []), report];
      updatedListing = serializeRealEstateProperty({
        ...listing,
        reports,
        disputeCount: reports.length,
        updatedAt: new Date().toISOString(),
      });

      return {
        ...listing,
        reports,
        disputeCount: updatedListing.disputeCount,
        updatedAt: updatedListing.updatedAt,
      };
    });

    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        realestateProperties: nextListings,
      },
    };
  });

  if (!updatedListing) {
    return res.status(404).json({
      success: false,
      message: 'Real-estate listing not found.',
    });
  }

  return res.json({
    success: true,
    data: {
      moduleData: {
        realestateProperties: Array.isArray(nextData.moduleData?.realestateProperties)
          ? nextData.moduleData.realestateProperties.map(serializeRealEstateProperty)
          : [],
      },
      listing: updatedListing,
    },
  });
});

router.patch('/realestate/listings/:listingId/moderation', authenticate, adminOnly, async (req, res) => {
  const { error, value } = realEstateModerationSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const updates =
    value.action === 'approve'
      ? { verified: true, verificationStatus: 'Verified', updatedAt: new Date() }
      : value.action === 'flag'
        ? { verified: false, verificationStatus: 'Flagged', updatedAt: new Date() }
        : { verified: false, verificationStatus: 'Rejected', updatedAt: new Date() };

  if (useMongoRealEstate()) {
    const listing = await moderateRealEstateProperty(req.params.listingId, updates);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Real-estate listing not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        moduleData: await buildRealEstateModuleData(),
        listing,
      },
    });
  }

  let listingFound = false;
  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const nextListings = (latestData.moduleData?.realestateProperties || []).map((listing) => {
      if (!matchesRealEstateListingId(listing, req.params.listingId)) {
        return listing;
      }

      listingFound = true;
      return {
        ...listing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    });

    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        realestateProperties: nextListings,
      },
    };
  });

  if (!listingFound) {
    return res.status(404).json({
      success: false,
      message: 'Real-estate listing not found.',
    });
  }

  return res.json({
    success: true,
    data: {
      moduleData: {
        realestateProperties: Array.isArray(nextData.moduleData?.realestateProperties)
          ? nextData.moduleData.realestateProperties.map(serializeRealEstateProperty)
          : [],
      },
    },
  });
});

router.delete('/realestate/listings/:listingId', authenticate, async (req, res) => {
  if (useMongoRealEstate()) {
    const matchedListing = await findRealEstatePropertyById(req.params.listingId);

    if (!matchedListing) {
      return res.status(404).json({
        success: false,
        message: 'Real-estate listing not found.',
      });
    }

    const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
    if (!isAdmin && !isRealEstateListingOwner(matchedListing, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Only the listing owner or admin can delete this property.',
      });
    }

    await deleteRealEstateProperty(req.params.listingId);

    return res.json({
      success: true,
      data: {
        moduleData: await buildRealEstateModuleData(),
      },
    });
  }

  const currentData = await devAppDataStore.readAppData();
  const currentListings = Array.isArray(currentData.moduleData?.realestateProperties)
    ? currentData.moduleData.realestateProperties.map(serializeRealEstateProperty)
    : [];
  const matchedListing = currentListings.find((listing) =>
    matchesRealEstateListingId(listing, req.params.listingId)
  );

  if (!matchedListing) {
    return res.status(404).json({
      success: false,
      message: 'Real-estate listing not found.',
    });
  }

  const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
  if (!isAdmin && !isRealEstateListingOwner(matchedListing, req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Only the listing owner or admin can delete this property.',
    });
  }

  const nextData = await devAppDataStore.updateAppData(async (latestData) => ({
    ...latestData,
    moduleData: {
      ...latestData.moduleData,
      realestateProperties: (latestData.moduleData?.realestateProperties || []).filter(
        (listing) => !matchesRealEstateListingId(listing, req.params.listingId)
      ),
    },
  }));

  return res.json({
    success: true,
    data: {
      moduleData: {
        realestateProperties: Array.isArray(nextData.moduleData?.realestateProperties)
          ? nextData.moduleData.realestateProperties.map(serializeRealEstateProperty)
          : [],
      },
    },
  });
});

module.exports = router;
module.exports.__testables = {
  normalizeClassifiedsListingRecord,
  normalizeClassifiedsModule,
  buildClassifiedPlanLabel,
};
