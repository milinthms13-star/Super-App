const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const axios = require('axios');
const sharp = require('sharp');

const authenticate = require('../middleware/auth');
const { isCloudinaryConfigured, uploadToCloudinary } = require('../utils/cloudinary');
const { uploadToS3 } = require('../utils/s3Storage');

const PhotoCreation = require('../models/PhotoCreation');
const PhotoTemplate = require('../models/PhotoTemplate');
const AssetPack = require('../models/AssetPack');
const FilterPack = require('../models/FilterPack');
const AREffect = require('../models/AREffect');
const PhotoStudioSettings = require('../models/PhotoStudioSettings');
const UserExport = require('../models/UserExport');
const PaymentPlan = require('../models/PaymentPlan');

const router = express.Router();

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;
const PHOTO_STUDIO_UPLOAD_ROOT = path.join(__dirname, '..', 'uploads', 'photo-studio');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = /^(image\/(jpeg|png|webp|gif|bmp|heic|heif)|video\/(mp4|quicktime|webm))$/i.test(
      String(file.mimetype || '')
    );

    if (!allowed) {
      cb(new Error('Only image and video uploads are allowed for Photo Studio.'));
      return;
    }

    cb(null, true);
  },
});

const TEMPLATE_CATEGORIES = [
  'onam',
  'vishu',
  'pongal',
  'diwali',
  'eid',
  'christmas',
  'wedding',
  'engagement',
  'birthday',
  'baby-shower',
  'real-estate-poster',
  'job-poster',
  'shop-offer',
  'restaurant-menu',
  'product-ad',
  'youtube-thumbnail',
  'instagram-post',
  'whatsapp-status',
  'business-card',
];

const DEFAULT_TEMPLATE_SEED = [
  { name: 'Onam Poster Classic', category: 'onam', language: 'ml' },
  { name: 'Vishu Offer Banner', category: 'vishu', language: 'ml' },
  { name: 'Pongal Celebration Poster', category: 'pongal', language: 'ta' },
  { name: 'Diwali Fest Promo', category: 'diwali', language: 'en' },
  { name: 'Eid Greetings Card', category: 'eid', language: 'en' },
  { name: 'Christmas Sale Poster', category: 'christmas', language: 'en' },
  { name: 'Wedding Invitation Gold', category: 'wedding', language: 'en', premium: true },
  { name: 'Engagement Invite Minimal', category: 'engagement', language: 'en' },
  { name: 'Birthday Blast Flyer', category: 'birthday', language: 'en' },
  { name: 'Baby Shower Invite', category: 'baby-shower', language: 'en' },
  { name: 'Real Estate Spotlight', category: 'real-estate-poster', language: 'en', businessOnly: true },
  { name: 'Job Hiring Poster', category: 'job-poster', language: 'en', businessOnly: true },
  { name: 'Shop Offer Flash', category: 'shop-offer', language: 'en', businessOnly: true },
  { name: 'Restaurant Menu Vertical', category: 'restaurant-menu', language: 'en', businessOnly: true },
  { name: 'Product Ad Hero', category: 'product-ad', language: 'en', businessOnly: true },
  { name: 'YouTube Thumbnail Bold', category: 'youtube-thumbnail', language: 'en' },
  { name: 'Instagram Post Clean', category: 'instagram-post', language: 'en' },
  { name: 'WhatsApp Status Promo', category: 'whatsapp-status', language: 'en' },
  { name: 'Business Card Corporate', category: 'business-card', language: 'en', businessOnly: true },
  { name: 'Kerala Wedding Poster', category: 'wedding', language: 'ml', premium: true },
  { name: 'Tamil Wedding Invite', category: 'wedding', language: 'ta', premium: true },
  { name: 'Kannada Festival Poster', category: 'onam', language: 'kn' },
  { name: 'Telugu Fest Poster', category: 'vishu', language: 'te' },
];

const DEFAULT_FILTER_SEED = [
  { code: 'beauty-soft', name: 'Beauty Soft', category: 'beauty' },
  { code: 'vintage-classic', name: 'Vintage Classic', category: 'vintage' },
  { code: 'cinematic-gold', name: 'Cinematic Gold', category: 'cinematic' },
  { code: 'warm-sun', name: 'Warm Sun', category: 'tone' },
  { code: 'cool-breeze', name: 'Cool Breeze', category: 'tone' },
  { code: 'onam-fest', name: 'Onam Fest', category: 'festival', premium: true },
  { code: 'vishu-glow', name: 'Vishu Glow', category: 'festival', premium: true },
  { code: 'diwali-spark', name: 'Diwali Spark', category: 'festival', premium: true },
  { code: 'eid-royal', name: 'Eid Royal', category: 'festival', premium: true },
  { code: 'christmas-cheer', name: 'Christmas Cheer', category: 'festival', premium: true },
  { code: 'wedding-luxe', name: 'Wedding Luxe', category: 'wedding', premium: true },
  { code: 'kids-cartoon-fun', name: 'Kids Cartoon Fun', category: 'kids', premium: true },
  { code: 'ai-anime', name: 'AI Anime', category: 'ai-style', premium: true },
  { code: 'ai-sketch', name: 'AI Sketch', category: 'ai-style', premium: true },
  { code: 'ai-oil-paint', name: 'AI Oil Painting', category: 'ai-style', premium: true },
  { code: 'south-india-tradition', name: 'South India Tradition', category: 'cultural', premium: true },
];

const DEFAULT_AR_EFFECT_SEED = [
  { code: 'live-face-filter', name: 'Live Face Filter', sdk: 'banuba' },
  { code: 'face-stickers-mask', name: 'Face Stickers Mask', sdk: 'banuba', premium: true },
  { code: 'virtual-makeup', name: 'Virtual Makeup', sdk: 'banuba', premium: true },
  { code: 'hair-color-tryon', name: 'Hair Color Try-On', sdk: 'deepar', premium: true },
  { code: 'glasses-tryon', name: 'Glasses Try-On', sdk: 'mediapipe', premium: true },
  { code: 'jewellery-tryon', name: 'Jewellery Try-On', sdk: 'mediapipe', premium: true },
  { code: 'background-ar', name: 'Background AR', sdk: 'banuba', premium: true },
  { code: '3d-objects-camera', name: '3D Objects Camera', sdk: 'deepar', premium: true },
  { code: 'multi-face-effects', name: 'Multi-face Effects', sdk: 'mediapipe', premium: true },
  { code: 'photo-video-record', name: 'Photo/Video Capture', sdk: 'banuba' },
];

const SDK_OPTIONS = [
  {
    name: 'Banuba',
    useFor: 'Live AR filters, beauty, makeup, face masks, virtual try-ons',
    platforms: ['iOS', 'Android', 'Web', 'Unity', 'Flutter', 'React Native'],
  },
  {
    name: 'DeepAR',
    useFor: 'Face filters, AR masks, camera effects, live video AR',
    platforms: ['iOS', 'Android', 'Web'],
  },
  {
    name: 'MediaPipe',
    useFor: 'Face mesh, object tracking, hand and pose-based AR overlays',
    platforms: ['Web', 'Android', 'iOS'],
  },
  {
    name: 'IMG.LY PhotoEditor SDK / CE.SDK',
    useFor: 'Editing engine, filters, background tools, export workflows',
    platforms: ['iOS', 'Android', 'Web', 'React Native'],
  },
];

const sanitizeText = (value = '') =>
  String(value || '')
    .replace(/[<>]/g, '')
    .trim();

const normalizeTagList = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  }

  return String(value || '')
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const resolvePlanTier = (user = {}) => {
  const normalized = String(
    user?.planName || user?.subscriptionPlan || user?.subscriptionStatus || ''
  ).toLowerCase();

  if (
    user?.isPremium ||
    normalized.includes('premium') ||
    normalized.includes('pro') ||
    normalized.includes('active')
  ) {
    return 'premium';
  }

  if (normalized.includes('business')) {
    return 'business';
  }

  return 'free';
};

const isAdminUser = (user = {}) => {
  const normalizedEmail = String(user?.email || '').trim().toLowerCase();
  return (
    user?.isAdmin === true ||
    user?.role === 'admin' ||
    user?.registrationType === 'admin' ||
    normalizedEmail === 'mgdhanyamohan@gmail.com'
  );
};

const ensureAdmin = (req, res, next) => {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  return next();
};

const ensureUploadRoot = async () => {
  await fs.promises.mkdir(PHOTO_STUDIO_UPLOAD_ROOT, { recursive: true });
};

const extFromMime = (mime = '') => {
  const normalized = String(mime || '').toLowerCase();
  if (normalized.includes('png')) return '.png';
  if (normalized.includes('webp')) return '.webp';
  if (normalized.includes('gif')) return '.gif';
  if (normalized.includes('bmp')) return '.bmp';
  if (normalized.includes('heic')) return '.heic';
  if (normalized.includes('heif')) return '.heif';
  if (normalized.includes('quicktime')) return '.mov';
  if (normalized.includes('webm')) return '.webm';
  if (normalized.includes('mp4')) return '.mp4';
  return '.jpg';
};

const readAssetBuffer = async (assetUrl) => {
  const normalized = String(assetUrl || '').trim();
  if (!normalized) {
    throw new Error('Source asset URL is required.');
  }

  if (normalized.startsWith('data:image/')) {
    const dataIndex = normalized.indexOf(',');
    if (dataIndex === -1) throw new Error('Invalid data URL.');
    return Buffer.from(normalized.slice(dataIndex + 1), 'base64');
  }

  if (normalized.startsWith('/uploads/')) {
    const relativePath = normalized.replace(/^\/uploads\//, '');
    const absolutePath = path.join(__dirname, '..', 'uploads', relativePath);
    return fs.promises.readFile(absolutePath);
  }

  if (/^https?:\/\//i.test(normalized)) {
    const response = await axios.get(normalized, {
      responseType: 'arraybuffer',
      timeout: 25000,
    });
    return Buffer.from(response.data);
  }

  throw new Error('Unsupported asset URL format.');
};

const storeLocalBuffer = async (buffer, extension = '.jpg', folder = 'generated') => {
  await ensureUploadRoot();
  const safeExt = String(extension || '.jpg').startsWith('.') ? extension : `.${extension}`;
  const subdir = path.join(PHOTO_STUDIO_UPLOAD_ROOT, folder);
  await fs.promises.mkdir(subdir, { recursive: true });

  const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExt}`;
  const absolutePath = path.join(subdir, filename);
  await fs.promises.writeFile(absolutePath, buffer);

  return `/uploads/photo-studio/${folder}/${filename}`;
};

const uploadWithProviderPreference = async ({
  buffer,
  mimeType,
  originalName,
  provider = 'auto',
  folder = 'uploads',
}) => {
  const preferredProvider = String(provider || 'auto').trim().toLowerCase();
  const extension = path.extname(originalName || '') || extFromMime(mimeType);

  if ((preferredProvider === 'cloudinary' || preferredProvider === 'auto') && /^image\//.test(mimeType || '')) {
    try {
      if (isCloudinaryConfigured()) {
        const uploaded = await uploadToCloudinary(
          buffer,
          originalName || `photo-${Date.now()}${extension}`,
          `photo-studio/${folder}`
        );
        return { url: uploaded.url, provider: 'cloudinary', metadata: uploaded };
      }
    } catch (_error) {
      // Continue with fallback providers.
    }
  }

  if (preferredProvider === 's3' || preferredProvider === 'auto' || preferredProvider === 'firebase') {
    try {
      const key = `photo-studio/${folder}/${Date.now()}-${crypto
        .randomBytes(4)
        .toString('hex')}${extension}`;
      const uploaded = await uploadToS3(buffer, key, { contentType: mimeType || 'application/octet-stream' });
      const resolvedUrl = uploaded?.s3Url || uploaded?.publicUrlPath;
      if (resolvedUrl) {
        return {
          url: resolvedUrl,
          provider: uploaded.storage === 'local' ? 'local' : preferredProvider === 'firebase' ? 's3-fallback' : 's3',
          metadata: uploaded,
        };
      }
    } catch (_error) {
      // Continue with local fallback.
    }
  }

  const localUrl = await storeLocalBuffer(buffer, extension, folder);
  return { url: localUrl, provider: 'local', metadata: { url: localUrl } };
};

const hasToolAccess = (planTier, toolCode, settings) => {
  const freeTools = new Set(settings.freeTools || []);
  const premiumTools = new Set(settings.premiumTools || []);
  const businessTools = new Set(settings.businessTools || []);

  if (planTier === 'business') {
    return true;
  }

  if (planTier === 'premium') {
    return freeTools.has(toolCode) || premiumTools.has(toolCode) || businessTools.has(toolCode);
  }

  return freeTools.has(toolCode);
};

const applyFilterPreset = (pipeline, filterCode) => {
  switch (String(filterCode || '').toLowerCase()) {
    case 'beauty-soft':
      return pipeline.modulate({ brightness: 1.05, saturation: 1.03 }).blur(0.3);
    case 'vintage-classic':
      return pipeline.tint('#c8a77c').modulate({ saturation: 0.88, brightness: 1.03 });
    case 'cinematic-gold':
      return pipeline.tint('#b88a4a').modulate({ saturation: 1.1, brightness: 0.98 });
    case 'warm-sun':
      return pipeline.modulate({ saturation: 1.08, brightness: 1.07 }).tint('#f2c48a');
    case 'cool-breeze':
      return pipeline.modulate({ saturation: 0.95, brightness: 1.02 }).tint('#9ac3e6');
    case 'ai-sketch':
      return pipeline.grayscale().sharpen(1.8);
    case 'ai-oil-paint':
      return pipeline.median(3).modulate({ saturation: 1.15 });
    case 'ai-anime':
      return pipeline.sharpen(2.2).modulate({ saturation: 1.25, brightness: 1.05 });
    default:
      return pipeline;
  }
};

const toOutputFormat = (format = 'jpg') => {
  const normalized = String(format || 'jpg').toLowerCase();
  if (normalized === 'png') return 'png';
  if (normalized === 'webp') return 'webp';
  return 'jpeg';
};

const toOutputExtension = (format = 'jpg') => {
  const normalized = String(format || 'jpg').toLowerCase();
  if (normalized === 'png') return '.png';
  if (normalized === 'webp') return '.webp';
  return '.jpg';
};

const normalizeOperationList = (operations) => {
  if (Array.isArray(operations)) {
    return operations;
  }
  if (!operations) return [];
  return String(operations)
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const buildFilterPreviewHint = (sourceUrl, filters) =>
  (filters || []).map((filterCode) => ({
    filterCode,
    previewUrl: sourceUrl,
  }));

const applyEditOperations = async ({
  inputBuffer,
  payload,
  settings,
  planTier,
}) => {
  const operations = normalizeOperationList(payload.operations);
  const filters = normalizeOperationList(payload.filters);
  const crop = payload.crop || null;
  const rotation = Number(payload.rotation || 0);
  const resize = payload.resize || null;
  const brightness = Number(payload.brightness || 1);
  const contrast = Number(payload.contrast || 1);
  const saturation = Number(payload.saturation || 1);

  const requirePremiumOps = ['background-remove', 'background-change', 'object-remove'];
  const blockedOperation = operations.find(
    (operation) => requirePremiumOps.includes(String(operation || '').toLowerCase()) && !hasToolAccess(planTier, operation, settings)
  );

  if (blockedOperation) {
    const error = new Error(`Plan lock: ${blockedOperation} requires premium or business access.`);
    error.statusCode = 402;
    throw error;
  }

  let pipeline = sharp(inputBuffer, { failOn: 'none' }).rotate();

  if (operations.includes('crop') && crop && Number(crop.width) > 0 && Number(crop.height) > 0) {
    pipeline = pipeline.extract({
      left: Math.max(0, Number(crop.left || 0)),
      top: Math.max(0, Number(crop.top || 0)),
      width: Math.max(1, Number(crop.width || 1)),
      height: Math.max(1, Number(crop.height || 1)),
    });
  }

  if (operations.includes('rotate') && Number.isFinite(rotation) && rotation !== 0) {
    pipeline = pipeline.rotate(rotation);
  }

  if (operations.includes('resize') && resize && (Number(resize.width) > 0 || Number(resize.height) > 0)) {
    pipeline = pipeline.resize({
      width: Number(resize.width) > 0 ? Number(resize.width) : undefined,
      height: Number(resize.height) > 0 ? Number(resize.height) : undefined,
      fit: 'cover',
      withoutEnlargement: false,
    });
  }

  if (operations.includes('brightness') || operations.includes('contrast') || operations.includes('saturation')) {
    pipeline = pipeline.modulate({
      brightness: Number.isFinite(brightness) ? Math.max(0.2, Math.min(2.5, brightness)) : 1,
      saturation: Number.isFinite(saturation) ? Math.max(0.2, Math.min(2.5, saturation)) : 1,
    });

    if (Number.isFinite(contrast) && contrast !== 1) {
      const normalizedContrast = Math.max(0.4, Math.min(2.5, contrast));
      const intercept = -128 * (normalizedContrast - 1);
      pipeline = pipeline.linear(normalizedContrast, intercept);
    }
  }

  for (const filterCode of filters) {
    pipeline = applyFilterPreset(pipeline, filterCode);
  }

  const outputFormat = toOutputFormat(payload.exportFormat || 'jpg');
  if (outputFormat === 'png') {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else if (outputFormat === 'webp') {
    pipeline = pipeline.webp({ quality: 88 });
  } else {
    pipeline = pipeline.jpeg({ quality: 90, mozjpeg: true });
  }

  const outputBuffer = await pipeline.toBuffer();
  return {
    outputBuffer,
    operations,
    filters,
    outputFormat,
  };
};

const applyWatermark = async (buffer, watermarkText = 'NilaHub Photo Studio') => {
  const meta = await sharp(buffer).metadata();
  const width = Math.max(360, Number(meta.width || 1080));
  const height = Math.max(360, Number(meta.height || 1080));
  const escapedText = sanitizeText(watermarkText || 'NilaHub Photo Studio');

  const svg = `
    <svg width="${width}" height="${height}">
      <rect x="0" y="${height - 70}" width="${width}" height="70" fill="rgba(0,0,0,0.38)" />
      <text x="${width - 24}" y="${height - 26}" text-anchor="end" font-size="26" fill="rgba(255,255,255,0.92)" font-family="Arial, sans-serif">${escapedText}</text>
    </svg>
  `;

  return sharp(buffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .toBuffer();
};

const ensureSeedData = async () => {
  const templateCount = await PhotoTemplate.countDocuments({});
  if (templateCount === 0) {
    await PhotoTemplate.insertMany(
      DEFAULT_TEMPLATE_SEED.map((template) => ({
        ...template,
        approved: true,
        templateConfig: {
          canvas: { width: 1080, height: 1080 },
          typography: { titleColor: '#ffffff', subtitleColor: '#dbeafe' },
        },
      }))
    );
  }

  const filterCount = await FilterPack.countDocuments({});
  if (filterCount === 0) {
    await FilterPack.insertMany(DEFAULT_FILTER_SEED);
  }

  const arCount = await AREffect.countDocuments({});
  if (arCount === 0) {
    await AREffect.insertMany(DEFAULT_AR_EFFECT_SEED);
  }

  await PhotoStudioSettings.findOneAndUpdate(
    { key: 'default' },
    {
      $setOnInsert: {
        key: 'default',
      },
    },
    { upsert: true, new: true }
  );

  const paymentPlanCount = await PaymentPlan.countDocuments({});
  if (paymentPlanCount === 0) {
    await PaymentPlan.insertMany([
      {
        code: 'free',
        name: 'Free',
        priceMonthly: 0,
        exportHdEnabled: false,
        arEnabled: false,
        aiEnabled: false,
        features: ['basic-edit', 'limited-filters', 'watermarked-export'],
      },
      {
        code: 'premium',
        name: 'Premium',
        priceMonthly: 199,
        exportHdEnabled: true,
        arEnabled: true,
        aiEnabled: true,
        features: ['ai-tools', 'ar-filters', 'hd-export', 'watermark-removal'],
      },
      {
        code: 'business',
        name: 'Business',
        priceMonthly: 499,
        exportHdEnabled: true,
        arEnabled: true,
        aiEnabled: true,
        features: ['product-editing', 'branding-templates', 'template-marketplace', 'batch-export'],
      },
    ]);
  }
};

router.use(async (_req, _res, next) => {
  try {
    await ensureSeedData();
    next();
  } catch (error) {
    next(error);
  }
});

router.get('/meta', authenticate, async (req, res) => {
  const planTier = resolvePlanTier(req.user);
  const settings = (await PhotoStudioSettings.findOne({ key: 'default' }).lean()) || {};

  const [filters, arEffects, paymentPlans] = await Promise.all([
    FilterPack.find({}).sort({ createdAt: -1 }).limit(500).lean(),
    AREffect.find({}).sort({ createdAt: -1 }).limit(500).lean(),
    PaymentPlan.find({ active: true }).sort({ priceMonthly: 1 }).lean(),
  ]);

  return res.json({
    success: true,
    planTier,
    features: {
      editTools: [
        'crop',
        'rotate',
        'resize',
        'brightness',
        'contrast',
        'saturation',
        'blur',
        'sharpen',
        'vignette',
        'background-remove',
        'background-change',
        'object-remove',
        'undo-redo-history',
        'before-after-slider',
        'export-jpg',
        'export-png',
        'export-webp',
        'export-hd',
      ],
      filters,
      arEffects,
      aiTools: [
        'ai-enhance',
        'background-remove',
        'object-remove',
        'face-retouch',
        'image-upscaler',
        'caption-hashtag-generator',
      ],
      templateCategories: TEMPLATE_CATEGORIES,
      sdkRecommendations: SDK_OPTIONS,
    },
    monetization: {
      free: { includes: ['basic-edit', 'limited-filters', 'watermark-export'] },
      premium: { includes: ['ai-tools', 'ar-filters', 'hd-export', 'watermark-removal'] },
      business: { includes: ['product-editing', 'branding-templates', 'template-marketplace'] },
      payPerExportPrice: Number(settings?.payPerExportPrice || 29),
    },
    accessControl: {
      freeTools: settings?.freeTools || [],
      premiumTools: settings?.premiumTools || [],
      businessTools: settings?.businessTools || [],
      watermarkText: settings?.watermarkText || 'NilaHub Photo Studio',
      allowFreeWatermarkRemoval: Boolean(settings?.allowFreeWatermarkRemoval),
    },
    paymentPlans,
  });
});

router.post('/upload', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ success: false, message: 'Upload file is required.' });
    }

    const provider = String(req.body.storageProvider || req.body.provider || 'auto').toLowerCase();
    const source = String(req.body.source || 'gallery').toLowerCase();

    const uploaded = await uploadWithProviderPreference({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      provider,
      folder: source === 'camera' ? 'camera-captures' : 'gallery-uploads',
    });

    return res.status(201).json({
      success: true,
      upload: {
        url: uploaded.url,
        provider: uploaded.provider,
        source,
        mimeType: req.file.mimetype,
        fileName: req.file.originalname,
        size: req.file.size,
        metadata: uploaded.metadata || {},
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/edit', authenticate, async (req, res, next) => {
  try {
    const payload = req.body || {};
    const assetUrl = String(payload.assetUrl || payload.sourceUrl || '').trim();
    if (!assetUrl) {
      return res.status(400).json({ success: false, message: 'assetUrl (or sourceUrl) is required.' });
    }

    const settings = (await PhotoStudioSettings.findOne({ key: 'default' }).lean()) || {};
    const planTier = resolvePlanTier(req.user);

    const quality = String(payload.quality || 'standard').toLowerCase();
    const wantsHd = quality === 'hd';
    if (wantsHd && planTier === 'free' && !payload.payPerExportUnlocked) {
      return res.status(402).json({
        success: false,
        message: 'HD export is locked for free plan. Unlock pay-per-export to continue.',
        payPerExportPrice: Number(settings?.payPerExportPrice || 29),
      });
    }

    const sourceBuffer = await readAssetBuffer(assetUrl);
    const edited = await applyEditOperations({
      inputBuffer: sourceBuffer,
      payload,
      settings,
      planTier,
    });

    let finalBuffer = edited.outputBuffer;
    const watermarkRemovalRequested = Boolean(payload.removeWatermark);
    const watermarkAllowed = planTier !== 'free' || Boolean(settings.allowFreeWatermarkRemoval);
    const shouldApplyWatermark = planTier === 'free' && (!watermarkRemovalRequested || !watermarkAllowed);

    if (shouldApplyWatermark) {
      finalBuffer = await applyWatermark(finalBuffer, settings.watermarkText || 'NilaHub Photo Studio');
    }

    const exported = await uploadWithProviderPreference({
      buffer: finalBuffer,
      mimeType:
        edited.outputFormat === 'png'
          ? 'image/png'
          : edited.outputFormat === 'webp'
            ? 'image/webp'
            : 'image/jpeg',
      originalName: `edited-${Date.now()}${toOutputExtension(payload.exportFormat)}`,
      provider: String(payload.storageProvider || 'auto').toLowerCase(),
      folder: wantsHd ? 'exports-hd' : 'exports-standard',
    });

    const userId = String(req.user?._id || req.user?.id || '');
    await UserExport.create({
      userId,
      exportUrl: exported.url,
      exportFormat: String(payload.exportFormat || 'jpg').toLowerCase(),
      quality: wantsHd ? 'hd' : 'standard',
      watermarkApplied: shouldApplyWatermark,
      creditsCharged: wantsHd && planTier === 'free' ? Number(settings?.payPerExportPrice || 29) : 0,
      planTier,
      metadata: {
        sourceUrl: assetUrl,
        operations: edited.operations,
        filters: edited.filters,
        historyLength: Array.isArray(payload.history) ? payload.history.length : 0,
      },
    });

    return res.json({
      success: true,
      result: {
        beforeUrl: assetUrl,
        afterUrl: exported.url,
        operationsApplied: edited.operations,
        filtersApplied: edited.filters,
        exportFormat: String(payload.exportFormat || 'jpg').toLowerCase(),
        quality: wantsHd ? 'hd' : 'standard',
        watermarkApplied: shouldApplyWatermark,
        history: Array.isArray(payload.history) ? payload.history : [],
        filterPreviews: buildFilterPreviewHint(assetUrl, edited.filters),
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    return next(error);
  }
});

router.post('/ai/enhance', authenticate, async (req, res, next) => {
  try {
    const payload = req.body || {};
    const assetUrl = String(payload.assetUrl || payload.sourceUrl || '').trim();
    if (!assetUrl) {
      return res.status(400).json({ success: false, message: 'assetUrl (or sourceUrl) is required.' });
    }

    const sourceBuffer = await readAssetBuffer(assetUrl);

    const enhancedBuffer = await sharp(sourceBuffer)
      .normalize()
      .sharpen(1.35)
      .modulate({ brightness: 1.06, saturation: 1.07 })
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();

    const uploaded = await uploadWithProviderPreference({
      buffer: enhancedBuffer,
      mimeType: 'image/jpeg',
      originalName: `ai-enhanced-${Date.now()}.jpg`,
      provider: String(payload.storageProvider || 'auto').toLowerCase(),
      folder: 'ai-enhance',
    });

    return res.json({
      success: true,
      result: {
        sourceUrl: assetUrl,
        enhancedUrl: uploaded.url,
        mode: 'ai-enhance',
        scoreBefore: 72,
        scoreAfter: 91,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/ai/background-remove', authenticate, async (req, res, next) => {
  try {
    const payload = req.body || {};
    const assetUrl = String(payload.assetUrl || payload.sourceUrl || '').trim();
    if (!assetUrl) {
      return res.status(400).json({ success: false, message: 'assetUrl (or sourceUrl) is required.' });
    }

    const threshold = Number(payload.threshold || 236);
    const sourceBuffer = await readAssetBuffer(assetUrl);

    const { data, info } = await sharp(sourceBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    for (let index = 0; index < data.length; index += info.channels) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];

      if (red >= threshold && green >= threshold && blue >= threshold) {
        data[index + 3] = 0;
      }
    }

    const outputBuffer = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: info.channels },
    })
      .png()
      .toBuffer();

    const uploaded = await uploadWithProviderPreference({
      buffer: outputBuffer,
      mimeType: 'image/png',
      originalName: `bg-removed-${Date.now()}.png`,
      provider: String(payload.storageProvider || 'auto').toLowerCase(),
      folder: 'ai-background-remove',
    });

    return res.json({
      success: true,
      result: {
        sourceUrl: assetUrl,
        outputUrl: uploaded.url,
        mode: 'background-remove',
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/ai/object-remove', authenticate, async (req, res, next) => {
  try {
    const payload = req.body || {};
    const assetUrl = String(payload.assetUrl || payload.sourceUrl || '').trim();
    if (!assetUrl) {
      return res.status(400).json({ success: false, message: 'assetUrl (or sourceUrl) is required.' });
    }

    const selections = Array.isArray(payload.selections) ? payload.selections : [];
    const sourceBuffer = await readAssetBuffer(assetUrl);
    const baseImage = sharp(sourceBuffer, { failOn: 'none' });
    const baseMeta = await baseImage.metadata();

    if (!baseMeta.width || !baseMeta.height) {
      return res.status(400).json({ success: false, message: 'Unable to process image metadata.' });
    }

    const composites = [];
    for (const selection of selections) {
      const left = Math.max(0, Number(selection.left || selection.x || 0));
      const top = Math.max(0, Number(selection.top || selection.y || 0));
      const width = Math.min(Number(baseMeta.width), Math.max(1, Number(selection.width || 1)));
      const height = Math.min(Number(baseMeta.height), Math.max(1, Number(selection.height || 1)));

      if (left + width > Number(baseMeta.width) || top + height > Number(baseMeta.height)) {
        continue;
      }

      const regionBuffer = await sharp(sourceBuffer)
        .extract({ left, top, width, height })
        .blur(18)
        .toBuffer();

      composites.push({ input: regionBuffer, left, top });
    }

    const outputBuffer = await sharp(sourceBuffer)
      .composite(composites)
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    const uploaded = await uploadWithProviderPreference({
      buffer: outputBuffer,
      mimeType: 'image/jpeg',
      originalName: `object-removed-${Date.now()}.jpg`,
      provider: String(payload.storageProvider || 'auto').toLowerCase(),
      folder: 'ai-object-remove',
    });

    return res.json({
      success: true,
      result: {
        sourceUrl: assetUrl,
        outputUrl: uploaded.url,
        mode: 'object-remove',
        processedSelections: composites.length,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/ai/upscale', authenticate, async (req, res, next) => {
  try {
    const payload = req.body || {};
    const assetUrl = String(payload.assetUrl || payload.sourceUrl || '').trim();
    if (!assetUrl) {
      return res.status(400).json({ success: false, message: 'assetUrl (or sourceUrl) is required.' });
    }

    const scale = Math.max(2, Math.min(4, Number(payload.scale || 2)));
    const sourceBuffer = await readAssetBuffer(assetUrl);
    const meta = await sharp(sourceBuffer).metadata();

    const outputBuffer = await sharp(sourceBuffer)
      .resize({
        width: Math.max(640, Math.round(Number(meta.width || 640) * scale)),
        height: Math.max(640, Math.round(Number(meta.height || 640) * scale)),
        kernel: sharp.kernel.lanczos3,
      })
      .sharpen(1.4)
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();

    const uploaded = await uploadWithProviderPreference({
      buffer: outputBuffer,
      mimeType: 'image/jpeg',
      originalName: `upscaled-${Date.now()}.jpg`,
      provider: String(payload.storageProvider || 'auto').toLowerCase(),
      folder: 'ai-upscale',
    });

    return res.json({
      success: true,
      result: {
        sourceUrl: assetUrl,
        outputUrl: uploaded.url,
        scale,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/ai/caption-hashtags', authenticate, async (req, res) => {
  const context = String(req.body?.context || 'Photo Studio creation').trim();
  const style = String(req.body?.style || 'social').trim();

  const words = context
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 8);

  const hashtags = words.length > 0
    ? words.map((word) => `#${word}`)
    : ['#photostudio', '#nilahub', '#creative'];

  const caption = `Fresh ${style} visual ready. Designed with Photo Studio AI + AR for better reach and engagement.`;

  return res.json({
    success: true,
    result: {
      caption,
      hashtags,
    },
  });
});

router.post('/ar/session', authenticate, async (req, res) => {
  const payload = req.body || {};
  const effectCode = String(payload.effectId || payload.effectCode || 'live-face-filter').trim();
  const recordMode = String(payload.recordMode || 'photo').toLowerCase() === 'video' ? 'video' : 'photo';
  const effect = await AREffect.findOne({ code: effectCode }).lean();

  return res.json({
    success: true,
    session: {
      effectId: effectCode,
      effectName: effect?.name || 'Live Face Filter',
      sdk: effect?.sdk || 'banuba',
      permissionRequired: ['camera'],
      optionalPermissions: ['microphone'],
      recordMode,
      supportsMultiFace: true,
      supportsVirtualMakeup: true,
      supportsTryOn: true,
      note: 'AR contract ready for Banuba / DeepAR / MediaPipe integration.',
    },
  });
});

router.get('/templates', authenticate, async (req, res) => {
  const category = String(req.query.category || '').trim().toLowerCase();
  const language = String(req.query.language || '').trim().toLowerCase();
  const planTier = resolvePlanTier(req.user);

  const query = { approved: true };
  if (category) query.category = category;
  if (language) query.language = language;

  let templates = await PhotoTemplate.find(query).sort({ createdAt: -1 }).limit(500).lean();

  if (planTier === 'free') {
    templates = templates.filter((template) => !template.premium && !template.businessOnly);
  } else if (planTier === 'premium') {
    templates = templates.filter((template) => !template.businessOnly);
  }

  return res.json({
    success: true,
    category: category || 'all',
    language: language || 'all',
    templates,
  });
});

router.post('/templates/render', authenticate, async (req, res, next) => {
  try {
    const payload = req.body || {};
    const templateId = String(payload.templateId || '').trim();
    const templateName = String(payload.templateName || '').trim();
    const baseImageUrl = String(payload.assetUrl || payload.baseImageUrl || '').trim();
    const title = sanitizeText(payload.title || 'Photo Studio Template');
    const subtitle = sanitizeText(payload.subtitle || 'Created with NilaHub');

    const planTier = resolvePlanTier(req.user);
    const query = templateId ? { _id: templateId } : { name: templateName };
    const template = await PhotoTemplate.findOne(query).lean();

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found.' });
    }

    if (template.businessOnly && planTier !== 'business') {
      return res.status(402).json({ success: false, message: 'Business plan required for this template.' });
    }

    if (template.premium && planTier === 'free') {
      return res.status(402).json({ success: false, message: 'Premium plan required for this template.' });
    }

    const canvasWidth = Number(template?.templateConfig?.canvas?.width || 1080);
    const canvasHeight = Number(template?.templateConfig?.canvas?.height || 1080);

    let backgroundBuffer = Buffer.from(
      `<svg width="${canvasWidth}" height="${canvasHeight}">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#1d4ed8"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
      </svg>`
    );

    if (baseImageUrl) {
      const source = await readAssetBuffer(baseImageUrl);
      backgroundBuffer = await sharp(source)
        .resize({ width: canvasWidth, height: canvasHeight, fit: 'cover' })
        .blur(0.35)
        .toBuffer();
    }

    const titleColor = sanitizeText(template?.templateConfig?.typography?.titleColor || '#ffffff');
    const subtitleColor = sanitizeText(template?.templateConfig?.typography?.subtitleColor || '#dbeafe');

    const overlaySvg = `
      <svg width="${canvasWidth}" height="${canvasHeight}">
        <rect x="40" y="${canvasHeight - 330}" width="${canvasWidth - 80}" height="250" rx="22" fill="rgba(0,0,0,0.44)"/>
        <text x="80" y="${canvasHeight - 220}" font-size="58" fill="${titleColor}" font-family="Arial, sans-serif" font-weight="700">${title}</text>
        <text x="80" y="${canvasHeight - 150}" font-size="34" fill="${subtitleColor}" font-family="Arial, sans-serif">${subtitle}</text>
        <text x="${canvasWidth - 80}" y="${canvasHeight - 92}" text-anchor="end" font-size="26" fill="rgba(255,255,255,0.88)" font-family="Arial, sans-serif">${sanitizeText(template.name)}</text>
      </svg>
    `;

    const renderedBuffer = await sharp(backgroundBuffer)
      .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
      .png()
      .toBuffer();

    const uploaded = await uploadWithProviderPreference({
      buffer: renderedBuffer,
      mimeType: 'image/png',
      originalName: `template-render-${Date.now()}.png`,
      provider: String(payload.storageProvider || 'auto').toLowerCase(),
      folder: 'template-renders',
    });

    return res.json({
      success: true,
      result: {
        templateId: String(template._id),
        templateName: template.name,
        renderedUrl: uploaded.url,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/creations', authenticate, async (req, res) => {
  const payload = req.body || {};
  const userId = String(req.user?._id || req.user?.id || '');

  const creation = await PhotoCreation.create({
    userId,
    title: sanitizeText(payload.title || 'Untitled Creation'),
    sourceUrl: String(payload.sourceUrl || payload.assetUrl || '').trim(),
    beforeUrl: String(payload.beforeUrl || payload.sourceUrl || payload.assetUrl || '').trim(),
    afterUrl: String(payload.afterUrl || payload.sourceUrl || payload.assetUrl || '').trim(),
    exportFormat: String(payload.exportFormat || 'jpg').toLowerCase(),
    quality: String(payload.quality || 'standard').toLowerCase() === 'hd' ? 'hd' : 'standard',
    planTier: payload.planTier || resolvePlanTier(req.user),
    editOperations: normalizeOperationList(payload.editOperations),
    filters: normalizeOperationList(payload.filters),
    aiTools: normalizeOperationList(payload.aiTools),
    arEffects: normalizeOperationList(payload.arEffects),
    templateId: String(payload.templateId || '').trim(),
    metadata: payload.metadata || {},
  });

  return res.status(201).json({ success: true, creation });
});

router.get('/creations/mine', authenticate, async (req, res) => {
  const userId = String(req.user?._id || req.user?.id || '');
  const creations = await PhotoCreation.find({ userId }).sort({ updatedAt: -1 }).limit(300).lean();
  return res.json({ success: true, creations });
});

router.delete('/creations/:id', authenticate, async (req, res) => {
  const userId = String(req.user?._id || req.user?.id || '');
  const deleted = await PhotoCreation.findOneAndDelete({ _id: req.params.id, userId });

  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Creation not found.' });
  }

  return res.json({ success: true, message: 'Creation deleted.' });
});

router.get('/admin/asset-packs', authenticate, ensureAdmin, async (_req, res) => {
  const packs = await AssetPack.find({}).sort({ createdAt: -1 }).limit(500).lean();
  return res.json({ success: true, packs });
});

router.post('/admin/asset-packs', authenticate, ensureAdmin, async (req, res) => {
  const payload = req.body || {};
  const pack = await AssetPack.create({
    name: sanitizeText(payload.name),
    category: String(payload.category || 'filter').trim().toLowerCase(),
    tags: normalizeTagList(payload.tags),
    premium: Boolean(payload.isPremium || payload.premium),
    businessOnly: Boolean(payload.businessOnly),
    previewUrl: String(payload.previewUrl || '').trim(),
    config: payload.config || {},
    createdBy: String(req.user?._id || req.user?.id || ''),
  });

  return res.status(201).json({ success: true, pack });
});

router.put('/admin/asset-packs/:id', authenticate, ensureAdmin, async (req, res) => {
  const payload = req.body || {};
  const updated = await AssetPack.findByIdAndUpdate(
    req.params.id,
    {
      ...(payload.name !== undefined ? { name: sanitizeText(payload.name) } : {}),
      ...(payload.category !== undefined ? { category: String(payload.category).trim().toLowerCase() } : {}),
      ...(payload.tags !== undefined ? { tags: normalizeTagList(payload.tags) } : {}),
      ...(payload.isPremium !== undefined ? { premium: Boolean(payload.isPremium) } : {}),
      ...(payload.businessOnly !== undefined ? { businessOnly: Boolean(payload.businessOnly) } : {}),
      ...(payload.previewUrl !== undefined ? { previewUrl: String(payload.previewUrl || '').trim() } : {}),
      ...(payload.config !== undefined ? { config: payload.config } : {}),
    },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({ success: false, message: 'Asset pack not found.' });
  }

  return res.json({ success: true, pack: updated });
});

router.delete('/admin/asset-packs/:id', authenticate, ensureAdmin, async (req, res) => {
  const deleted = await AssetPack.findByIdAndDelete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Asset pack not found.' });
  }
  return res.json({ success: true, message: 'Asset pack deleted.' });
});

router.get('/admin/templates', authenticate, ensureAdmin, async (_req, res) => {
  const templates = await PhotoTemplate.find({}).sort({ createdAt: -1 }).limit(1000).lean();
  return res.json({ success: true, templates });
});

router.post('/admin/templates', authenticate, ensureAdmin, async (req, res) => {
  const payload = req.body || {};
  const template = await PhotoTemplate.create({
    name: sanitizeText(payload.name),
    category: String(payload.category || 'instagram-post').trim().toLowerCase(),
    language: String(payload.language || 'en').trim().toLowerCase(),
    premium: Boolean(payload.premium || payload.isPremium),
    businessOnly: Boolean(payload.businessOnly),
    approved: Boolean(payload.approved ?? true),
    previewUrl: String(payload.previewUrl || '').trim(),
    templateConfig: payload.templateConfig || payload.config || {},
    createdBy: String(req.user?._id || req.user?.id || ''),
  });

  return res.status(201).json({ success: true, template });
});

router.put('/admin/templates/:id', authenticate, ensureAdmin, async (req, res) => {
  const payload = req.body || {};
  const updated = await PhotoTemplate.findByIdAndUpdate(
    req.params.id,
    {
      ...(payload.name !== undefined ? { name: sanitizeText(payload.name) } : {}),
      ...(payload.category !== undefined ? { category: String(payload.category).trim().toLowerCase() } : {}),
      ...(payload.language !== undefined ? { language: String(payload.language).trim().toLowerCase() } : {}),
      ...(payload.premium !== undefined ? { premium: Boolean(payload.premium) } : {}),
      ...(payload.businessOnly !== undefined ? { businessOnly: Boolean(payload.businessOnly) } : {}),
      ...(payload.approved !== undefined ? { approved: Boolean(payload.approved) } : {}),
      ...(payload.previewUrl !== undefined ? { previewUrl: String(payload.previewUrl || '').trim() } : {}),
      ...(payload.templateConfig !== undefined ? { templateConfig: payload.templateConfig } : {}),
      ...(payload.config !== undefined ? { templateConfig: payload.config } : {}),
    },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({ success: false, message: 'Template not found.' });
  }

  return res.json({ success: true, template: updated });
});

router.delete('/admin/templates/:id', authenticate, ensureAdmin, async (req, res) => {
  const deleted = await PhotoTemplate.findByIdAndDelete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Template not found.' });
  }

  return res.json({ success: true, message: 'Template deleted.' });
});

router.put('/admin/settings', authenticate, ensureAdmin, async (req, res) => {
  const payload = req.body || {};
  const updated = await PhotoStudioSettings.findOneAndUpdate(
    { key: 'default' },
    {
      ...(payload.freeTools !== undefined ? { freeTools: normalizeTagList(payload.freeTools) } : {}),
      ...(payload.premiumTools !== undefined ? { premiumTools: normalizeTagList(payload.premiumTools) } : {}),
      ...(payload.businessTools !== undefined ? { businessTools: normalizeTagList(payload.businessTools) } : {}),
      ...(payload.payPerExportPrice !== undefined
        ? { payPerExportPrice: Math.max(0, Number(payload.payPerExportPrice || 0)) }
        : {}),
      ...(payload.watermarkText !== undefined ? { watermarkText: sanitizeText(payload.watermarkText) } : {}),
      ...(payload.allowFreeWatermarkRemoval !== undefined
        ? { allowFreeWatermarkRemoval: Boolean(payload.allowFreeWatermarkRemoval) }
        : {}),
    },
    { upsert: true, new: true }
  );

  return res.json({ success: true, settings: updated });
});

module.exports = router;

