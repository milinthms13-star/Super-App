const express = require('express');
const { cacheProducts, cacheSearch } = require('../middleware/redisCache');
const { indexProduct, deleteProduct, searchProducts } = require('../utils/elasticsearch');
const Joi = require('joi');
const crypto = require('crypto');
const multer = require('multer');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const devProductStore = require('../utils/devProductStore');
const { getRedisClient } = require('../config/redis');
const { deleteGridFSFile, uploadBufferToGridFS } = require('../utils/gridfs');
const { ADMIN_EMAIL, PRODUCT_DEFAULT_LIMIT, PRODUCT_MAX_LIMIT, VALIDATION_PATTERNS, CONSTRAINTS } = require('../config/constants');
const { validateProductData, validateDiscountDates, validateExpiryDate } = require('../utils/validators');
const { getActiveFlashSaleForProduct } = require('../utils/flashSaleService');

const router = express.Router();
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = PRODUCT_DEFAULT_LIMIT;
const MAX_LIMIT = PRODUCT_MAX_LIMIT;

const useMemoryProducts = () => {
  return process.env.AUTH_STORAGE === 'memory' && process.env.NODE_ENV !== 'production';
};

const productImageSchema = Joi.alternatives()
  .try(
    Joi.string().trim().max(500).uri({ scheme: ['http', 'https'] }),
    Joi.string().trim().pattern(/^\/api\/files\/public\/[a-f0-9]{24}$/i),
    Joi.string().allow('')
  )
  .default('');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are allowed.'));
      return;
    }

    cb(null, true);
  },
});

const isBatchExpired = (batch = {}, now = new Date()) => {
  if (!batch?.expiryDate) {
    return false;
  }

  const expiryDate = new Date(batch.expiryDate);
  if (Number.isNaN(expiryDate.getTime())) {
    return false;
  }

  return expiryDate < now;
};

const productSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  category: Joi.string().trim().min(2).max(80).required(),
  subcategory: Joi.string().allow('').trim().max(80).default(''),
  model: Joi.string().allow('').trim().max(120).default(''),
  color: Joi.string().allow('').trim().max(80).default(''),
  styleTheme: Joi.string().allow('').trim().max(80).default(''),
  description: Joi.string().allow('').max(600).default(''),
  expiryApplicable: Joi.boolean().default(false),
  image: productImageSchema.default(''),
  sellerName: Joi.string().trim().min(2).max(120).required(),
  businessName: Joi.string().trim().min(2).max(120).required(),
});

const inventoryBatchSchema = Joi.object({
  batchLabel: Joi.string().allow('').max(80).default(''),
  stock: Joi.number().integer().min(1).required(),
  price: Joi.number().min(0).required(),
  mrp: Joi.number().min(0).required(),
  location: Joi.string().allow('').max(120).required(),
  discountAmount: Joi.number().min(0).default(0),
  discountPercentage: Joi.number().min(0).max(100).default(0),
  discountStartDate: Joi.date().iso().allow(null).default(null),
  discountEndDate: Joi.date().iso().allow(null).default(null),
  manufacturingDate: Joi.date().iso().allow(null).default(null),
  expiryDate: Joi.date().iso().allow(null).default(null),
  returnAllowed: Joi.boolean().default(false),
  returnWindowDays: Joi.number().integer().min(0).default(0),
}).custom((value, helpers) => {
  if (value.mrp < value.price) {
    return helpers.message('MRP must be greater than or equal to the selling price.');
  }

  if (value.discountEndDate && !value.discountStartDate) {
    return helpers.message('Choose a discount start date when a discount end date is selected.');
  }

  if (
    value.discountStartDate &&
    value.discountEndDate &&
    new Date(value.discountEndDate) < new Date(value.discountStartDate)
  ) {
    return helpers.message('Discount end date cannot be earlier than the discount start date.');
  }

  if (
    value.manufacturingDate &&
    value.expiryDate &&
    new Date(value.expiryDate) < new Date(value.manufacturingDate)
  ) {
    return helpers.message('Expiry date cannot be earlier than the manufacturing date.');
  }

  if (value.returnAllowed && Number(value.returnWindowDays || 0) <= 0) {
    return helpers.message('Return window days must be greater than zero when returns are allowed.');
  }

  return value;
});

const moderationSchema = Joi.object({
  approvalStatus: Joi.string().valid('approved', 'rejected', 'pending').required(),
  moderationNote: Joi.string().allow('').max(300).default(''),
});

const availabilitySchema = Joi.object({
  isActive: Joi.boolean().required(),
});

const inventoryBatchAvailabilitySchema = Joi.object({
  isActive: Joi.boolean().required(),
});

const createBatchId = () => crypto.randomUUID();
const extractFileIdFromProductImage = (imagePath = '') => {
  const match = String(imagePath || '').match(/\/api\/files\/public\/([a-f0-9]{24})$/i);
  return match?.[1] || '';
};

const { uploadToCloudinary } = require('../utils/cloudinary');

const buildStoredImagePayload = (imagePayload = {}) => ({
  image: imagePayload?.image || '',
  imageVariants: imagePayload?.imageVariants || null,
  imagePublicId: imagePayload?.imagePublicId || '',
  imageCdn: imagePayload?.imageCdn || '',
});

const storeProductImage = async ({ file, sellerEmail }) => {
  if (!file?.buffer?.length) {
    return buildStoredImagePayload();
  }
  
  // Try Cloudinary first, fallback to GridFS
  try {
    const uploadedImage = await uploadToCloudinary(file.buffer, file.originalname || `${crypto.randomUUID()}.jpg`, 'ecommerce/products', {
      categorization: 'google_tagging',
      quality: 'auto:good',
      format: 'auto'
    });
    return buildStoredImagePayload({
      image: uploadedImage.url,
      imageVariants: uploadedImage.variants,
      imagePublicId: uploadedImage.publicId,
      imageCdn: uploadedImage.cdn,
    });
  } catch (cloudinaryError) {
    logger.warn('Cloudinary failed, using GridFS:', cloudinaryError.message);
  }
  
  // Fallback GridFS
  try {
    const storedFile = await uploadBufferToGridFS({
      buffer: file.buffer,
      filename: file.originalname || `${crypto.randomUUID()}.jpg`,
      contentType: file.mimetype || 'application/octet-stream',
      metadata: {
        category: 'product-image',
        visibility: 'public',
        ownerEmail: sellerEmail,
      },
    });
    return buildStoredImagePayload({
      image: `/api/files/public/${storedFile.id}`,
      imageCdn: 'gridfs',
    });
  } catch (gridFsError) {
    if (gridFsError?.message?.includes('GridFS bucket has not been initialized')) {
      const contentType = file.mimetype || 'image/jpeg';
      return buildStoredImagePayload({
        image: `data:${contentType};base64,${file.buffer.toString('base64')}`,
        imageCdn: 'inline',
      });
    }
    throw gridFsError;
  }
};

const getBatchIdentifier = (batch = {}) =>
  String(batch.id || batch._id || '');

const normalizeInventoryBatch = (batch, existingBatch = {}) => ({
  ...existingBatch,
  ...batch,
  id: batch.id || existingBatch.id || createBatchId(),
  batchLabel: batch.batchLabel || '',
  stock: Number(batch.stock || 0),
  price: Number(batch.price || 0),
  mrp: Number(batch.mrp || 0),
  location: batch.location || '',
  discountAmount: Number(batch.discountAmount || 0),
  discountPercentage: Number(batch.discountPercentage || 0),
  discountStartDate: batch.discountStartDate || null,
  discountEndDate: batch.discountEndDate || null,
  manufacturingDate: batch.manufacturingDate || null,
  expiryDate: batch.expiryDate || null,
  returnAllowed: Boolean(batch.returnAllowed),
  returnWindowDays: Number(batch.returnWindowDays || 0),
  createdAt: existingBatch.createdAt || batch.createdAt || new Date().toISOString(),
  isActive: batch.isActive !== false && existingBatch.isActive !== false,
});

const buildPricingSummary = (primarySource = {}, fallbackSource = {}, now = new Date()) => {
  const mrp = Number(primarySource?.mrp ?? fallbackSource?.mrp ?? fallbackSource?.price ?? 0);
  const sellingPrice = Number(primarySource?.price ?? fallbackSource?.price ?? 0);
  const discountStartDate = primarySource?.discountStartDate ?? fallbackSource?.discountStartDate ?? null;
  const discountEndDate = primarySource?.discountEndDate ?? fallbackSource?.discountEndDate ?? null;
  const parsedDiscountStartDate = discountStartDate ? new Date(discountStartDate) : null;
  const parsedDiscountEndDate = discountEndDate ? new Date(discountEndDate) : null;
  const isBeforeDiscountStart =
    parsedDiscountStartDate && !Number.isNaN(parsedDiscountStartDate.getTime())
      ? now < parsedDiscountStartDate
      : false;
  const isAfterDiscountEnd =
    parsedDiscountEndDate && !Number.isNaN(parsedDiscountEndDate.getTime())
      ? now > parsedDiscountEndDate
      : false;
  const savedDiscountAmount = Math.max(
    0,
    Number(
      primarySource?.discountAmount ??
        fallbackSource?.discountAmount ??
        Math.max(0, mrp - sellingPrice)
    )
  );
  const savedDiscountPercentage = mrp > 0
    ? Number(
        (
          primarySource?.discountPercentage ??
          fallbackSource?.discountPercentage ??
          ((savedDiscountAmount / mrp) * 100)
        ).toFixed(2)
      )
    : 0;
  const isDiscountActive =
    savedDiscountAmount > 0 && !isBeforeDiscountStart && !isAfterDiscountEnd;

  return {
    mrp,
    sellingPrice,
    price: isDiscountActive ? sellingPrice : mrp || sellingPrice,
    discountAmount: isDiscountActive ? savedDiscountAmount : 0,
    discountPercentage: isDiscountActive ? savedDiscountPercentage : 0,
    savedDiscountAmount,
    savedDiscountPercentage,
    discountStartDate,
    discountEndDate,
    isDiscountActive,
    discountStatus:
      savedDiscountAmount <= 0
        ? 'none'
        : isDiscountActive
          ? 'active'
          : isBeforeDiscountStart
            ? 'upcoming'
            : isAfterDiscountEnd
              ? 'expired'
              : 'inactive',
  };
};

const buildBatchSummary = async (product, inventoryBatches = []) => {
  const now = new Date();
  const eligibleBatches = Array.isArray(inventoryBatches)
    ? inventoryBatches.filter(
        (batch) =>
          batch?.isActive !== false &&
          Number(batch.stock || 0) > 0 &&
          !isBatchExpired(batch, now)
      )
    : [];
  const totalStock = eligibleBatches.reduce((sum, batch) => sum + Number(batch.stock || 0), 0);
  const latestBatch = eligibleBatches[0] || null;
  const pricingSummary = buildPricingSummary(latestBatch || {}, product, now);
  const {
    mrp,
    sellingPrice,
    savedDiscountAmount,
    savedDiscountPercentage,
    discountStartDate,
    discountEndDate,
  } = pricingSummary;

  const productId = product?._id?.toString?.() || product?._id || product?.id || '';
  const flashSale = productId ? await getActiveFlashSaleForProduct(productId) : null;
  const hasFlashSalePrice =
    flashSale && Number.isFinite(Number(flashSale.salePrice)) && Number(flashSale.salePrice) >= 0;
  const flashSalePrice = hasFlashSalePrice ? Number(flashSale.salePrice) : null;
  const price = hasFlashSalePrice ? flashSalePrice : pricingSummary.price;
  const discountAmount = hasFlashSalePrice
    ? Math.max(0, mrp - flashSalePrice)
    : pricingSummary.discountAmount;
  const discountPercentage = hasFlashSalePrice
    ? (mrp > 0 ? Number((((mrp - flashSalePrice) / mrp) * 100).toFixed(2)) : 0)
    : pricingSummary.discountPercentage;

  return {
    totalStock,
    latestBatch,
    mrp,
    price,
    sellingPrice,
    discountAmount,
    discountPercentage,
    savedDiscountAmount,
    savedDiscountPercentage,
    discountStartDate,
    discountEndDate,
    isDiscountActive: hasFlashSalePrice || pricingSummary.isDiscountActive,
    discountStatus: hasFlashSalePrice ? 'active' : pricingSummary.discountStatus,
    manufacturingDate: latestBatch?.manufacturingDate || null,
    expiryDate: latestBatch?.expiryDate || null,
    location: latestBatch?.location || '',
    returnAllowed: Boolean(latestBatch?.returnAllowed),
    returnWindowDays: Number(latestBatch?.returnWindowDays || 0),
    flashSaleActive: hasFlashSalePrice,
    flashSale,
  };
};

const serializeProduct = async (product) => {
  const batchSummary = await buildBatchSummary(product, product.inventoryBatches);
  const fallbackPrice = Number(product.price || 0);
  const fallbackMrp = Number(product.mrp || product.price || 0);
  const fallbackStock = Math.max(0, Number(product.stock || 0));
  const hasInventoryBatches = Array.isArray(product.inventoryBatches) && product.inventoryBatches.length > 0;
  const resolvedStock =
    hasInventoryBatches
      ? batchSummary.totalStock
      : fallbackStock;
  const resolvedPrice = Number.isFinite(batchSummary.price) ? batchSummary.price : fallbackPrice;
  const resolvedMrp = Number.isFinite(batchSummary.mrp) ? batchSummary.mrp : fallbackMrp;
  const resolvedBatchLabel = product.batchLabel || batchSummary.latestBatch?.batchLabel || product.latestBatchLabel || '';
  const resolvedBatchLocation = product.batchLocation || batchSummary.location || product.location || '';

  return {
    id: product._id?.toString?.() || product._id || product.id,
    name: product.name,
    category: product.category,
    subcategory: product.subcategory || '',
    model: product.model || '',
    color: product.color || '',
    styleTheme: product.styleTheme || '',
    price: resolvedPrice,
    mrp: resolvedMrp,
    sellingPrice: Number.isFinite(batchSummary.sellingPrice) ? batchSummary.sellingPrice : fallbackPrice,
    discountAmount: batchSummary.discountAmount,
    discountPercentage: batchSummary.discountPercentage,
    savedDiscountAmount: batchSummary.savedDiscountAmount || 0,
    savedDiscountPercentage: batchSummary.savedDiscountPercentage || 0,
    discountStartDate: batchSummary.discountStartDate || null,
    discountEndDate: batchSummary.discountEndDate || null,
    isDiscountActive: Boolean(batchSummary.isDiscountActive),
    discountStatus: batchSummary.discountStatus || 'none',
    description: product.description,
    expiryApplicable: product.expiryApplicable === true,
    image: product.image,
    imageVariants: product.imageVariants || null,
    imagePublicId: product.imagePublicId || '',
    imageCdn: product.imageCdn || '',
    stock: resolvedStock,
    manufacturingDate: batchSummary.manufacturingDate,
    expiryDate: batchSummary.expiryDate,
    location: batchSummary.location || product.location || '',
    batchLabel: resolvedBatchLabel,
    batchLocation: resolvedBatchLocation,
    returnAllowed: batchSummary.latestBatch
      ? batchSummary.returnAllowed
      : Boolean(product.returnAllowed),
    returnWindowDays:
      batchSummary.latestBatch && batchSummary.returnWindowDays > 0
        ? batchSummary.returnWindowDays
        : Number(product.returnWindowDays || 0),
    latestBatchLabel: resolvedBatchLabel,
    inventoryBatches: Array.isArray(product.inventoryBatches)
      ? product.inventoryBatches.map((batch, index) => ({
          id: getBatchIdentifier(batch) || `${product._id?.toString?.() || product.id || 'product'}-batch-${index}`,
          batchLabel: batch.batchLabel || '',
          stock: Number(batch.stock || 0),
          price: Number(batch.price || 0),
          mrp: Number(batch.mrp || 0),
          location: batch.location || '',
          discountAmount: Number(batch.discountAmount || 0),
          discountPercentage: Number(batch.discountPercentage || 0),
          discountStartDate: batch.discountStartDate || null,
          discountEndDate: batch.discountEndDate || null,
          manufacturingDate: batch.manufacturingDate || null,
          expiryDate: batch.expiryDate || null,
          returnAllowed: Boolean(batch.returnAllowed),
          returnWindowDays: Number(batch.returnWindowDays || 0),
          isActive: batch.isActive !== false,
          isExpired: isBatchExpired(batch),
          createdAt: batch.createdAt || null,
        }))
      : [],
    sellerName: product.sellerName,
    businessName: product.businessName,
    sellerEmail: product.sellerEmail,
    isActive: product.isActive !== false,
    approvalStatus: product.approvalStatus || 'pending',
    moderationNote: product.moderationNote || '',
    rating: Number(product.rating || 0),
    reviews: Number(product.reviewCount || 0),
    views: Number(product.views || 0),
    clicks: Number(product.clicks || 0),
    unitsSold: Number(product.unitsSold || 0),
    flashSale: batchSummary.flashSale || null,
    flashSaleEndsAt: batchSummary.flashSale?.endsAt || null,
    flashSaleRemainingStock: Number(batchSummary.flashSale?.remainingStock || 0),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};

const serializeProducts = (products = []) =>
  Promise.all((products || []).map((product) => serializeProduct(product)));

const resolveRole = (req) =>
  (
    req.user?.registrationType ||
    req.user?.role ||
    req.auth?.registrationType ||
    req.auth?.role ||
    req.headers['x-malabar-role'] ||
    ''
  )
    .toString()
    .trim()
    .toLowerCase();

const isAdmin = (req) =>
  resolveRole(req) === 'admin' || req.user?.email?.trim().toLowerCase() === ADMIN_EMAIL;

const assertEntrepreneurOrAdmin = (req, res) => {
  if (isAdmin(req)) {
    return true;
  }

  if (!['entrepreneur', 'business'].includes(resolveRole(req))) {
    res.status(403).json({
      success: false,
      message: 'Only entrepreneur accounts can manage GlobeMart products.',
    });
    return false;
  }

  return true;
};

const listStoredProducts = async () => {
  if (useMemoryProducts()) {
    return devProductStore.listProducts();
  }

  return Product.find().sort({ createdAt: -1 }).lean();
};

const findStoredProductById = async (productId) => {
  if (useMemoryProducts()) {
    return devProductStore.findProductById(productId);
  }

  return Product.findById(productId);
};

const createStoredProduct = async (payload) => {
  const product = await (useMemoryProducts() 
    ? devProductStore.createProduct(payload)
    : (async () => {
        const p = new Product(payload);
        await p.save();
        return p;
      })()
  );
  const serializedProduct = await serializeProduct(product);
  await indexProduct(serializedProduct);
  return product;
};

const updateStoredProduct = async (productId, updates) => {
  const product = await (useMemoryProducts() 
    ? devProductStore.updateProduct(productId, updates)
    : Product.findByIdAndUpdate(productId, updates, { new: true, runValidators: true })
  );
  if (product) {
    const serializedProduct = await serializeProduct(product);
    await indexProduct(serializedProduct);
  }
  return product;
};

const parsePagination = (query = {}, defaultLimit = DEFAULT_LIMIT) => {
  const page = Math.max(DEFAULT_PAGE, Number.parseInt(query.page, 10) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const buildPaginationMeta = ({ page, limit, totalItems }) => ({
  page,
  limit,
  totalItems,
  totalPages: totalItems > 0 ? Math.ceil(totalItems / limit) : 0,
  hasNextPage: page * limit < totalItems,
  hasPreviousPage: page > 1,
});

const countProductStatuses = (products = []) =>
  products.reduce(
    (counts, product) => {
      const approvalStatus = product.approvalStatus || 'pending';
      counts.total += 1;
      counts[approvalStatus] = (counts[approvalStatus] || 0) + 1;
      if (product.isActive !== false) {
        counts.active += 1;
      } else {
        counts.disabled += 1;
      }
      return counts;
    },
    { total: 0, pending: 0, approved: 0, rejected: 0, active: 0, disabled: 0 }
  );

const listStarterProducts = async () => {
  const appData = require('../utils/devAppDataStore');
  const currentData = await appData.readAppData();
  return Array.isArray(currentData.moduleData?.ecommerceProducts)
    ? currentData.moduleData.ecommerceProducts
    : [];
};

const applyBatchAggregation = async (product) => {
  const batchSummary = await buildBatchSummary(product, product.inventoryBatches);
  return {
    ...product,
    stock: batchSummary.totalStock,
    price: batchSummary.price || 0,
    mrp: batchSummary.mrp || 0,
    discountAmount: batchSummary.discountAmount || 0,
    discountPercentage: batchSummary.discountPercentage || 0,
    manufacturingDate: batchSummary.manufacturingDate,
    expiryDate: batchSummary.expiryDate,
  };
};

const filterProductsLocally = (products = [], filters = {}) => {
  const normalizedQuery = String(filters.query || '').trim().toLowerCase();
  const normalizedCategory = String(filters.category || '').trim();
  const normalizedBusiness = String(filters.business || '').trim();
  const normalizedMinPrice = Number.parseFloat(filters.minPrice);
  const normalizedMaxPrice = Number.parseFloat(filters.maxPrice);
  const normalizedMinRating = Number.parseFloat(filters.minRating);
  const inStockOnly = filters.inStock === 'true';

  let filteredProducts = (products || []).filter((product) => {
    const matchesQuery =
      !normalizedQuery ||
      [
        product.name,
        product.description,
        product.category,
        product.subcategory,
        product.model,
        product.color,
        product.styleTheme,
        product.businessName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));

    const matchesCategory = !normalizedCategory || product.category === normalizedCategory;
    const matchesBusiness = !normalizedBusiness || product.businessName === normalizedBusiness;
    const matchesMinPrice = !Number.isFinite(normalizedMinPrice) || Number(product.price || 0) >= normalizedMinPrice;
    const matchesMaxPrice = !Number.isFinite(normalizedMaxPrice) || Number(product.price || 0) <= normalizedMaxPrice;
    const matchesMinRating = !Number.isFinite(normalizedMinRating) || Number(product.rating || 0) >= normalizedMinRating;
    const matchesStock = !inStockOnly || Number(product.stock || 0) > 0;

    return (
      matchesQuery &&
      matchesCategory &&
      matchesBusiness &&
      matchesMinPrice &&
      matchesMaxPrice &&
      matchesMinRating &&
      matchesStock
    );
  });

  switch (filters.sort) {
    case 'price-asc':
      filteredProducts = filteredProducts.sort((left, right) => Number(left.price || 0) - Number(right.price || 0));
      break;
    case 'price-desc':
      filteredProducts = filteredProducts.sort((left, right) => Number(right.price || 0) - Number(left.price || 0));
      break;
    case 'discount':
      filteredProducts = filteredProducts.sort((left, right) => Number(right.discountPercentage || 0) - Number(left.discountPercentage || 0));
      break;
    case 'rating':
      filteredProducts = filteredProducts.sort((left, right) => Number(right.rating || 0) - Number(left.rating || 0));
      break;
    case 'newest':
      filteredProducts = filteredProducts.sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
      break;
    default:
      break;
  }

  return filteredProducts;
};

const buildLocalFacets = (products = []) => ({
  categories: Array.from(
    (products || []).reduce((map, product) => {
      const key = product.category || 'Uncategorized';
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map())
  ).map(([key, doc_count]) => ({ key, doc_count })),
  businesses: Array.from(
    (products || []).reduce((map, product) => {
      const key = product.businessName || 'Unknown';
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map())
  ).map(([key, doc_count]) => ({ key, doc_count })),
  ratings: [
    {
      key: '4_up',
      doc_count: (products || []).filter((product) => Number(product.rating || 0) >= 4).length,
    },
    {
      key: '3_up',
      doc_count: (products || []).filter((product) => Number(product.rating || 0) >= 3 && Number(product.rating || 0) < 4).length,
    },
    {
      key: '2_up',
      doc_count: (products || []).filter((product) => Number(product.rating || 0) >= 2 && Number(product.rating || 0) < 3).length,
    },
    {
      key: 'below_2',
      doc_count: (products || []).filter((product) => Number(product.rating || 0) < 2).length,
    },
  ],
  priceRanges: [
    { key: 'under_500', doc_count: (products || []).filter((product) => Number(product.price || 0) < 500).length },
    { key: '500_to_1000', doc_count: (products || []).filter((product) => Number(product.price || 0) >= 500 && Number(product.price || 0) < 1000).length },
    { key: '1000_to_2500', doc_count: (products || []).filter((product) => Number(product.price || 0) >= 1000 && Number(product.price || 0) < 2500).length },
    { key: '2500_plus', doc_count: (products || []).filter((product) => Number(product.price || 0) >= 2500).length },
  ],
});

router.get('/', cacheProducts, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, 16);
    const starterProducts = await listStarterProducts();
    const starterApprovedProducts = await serializeProducts(
      starterProducts
        .filter(
          (product) =>
            (product.approvalStatus || 'approved') === 'approved' &&
            product.isActive !== false
        )
        .map((product) => ({
          ...product,
          approvalStatus: product.approvalStatus || 'approved',
          moderationNote: product.moderationNote || '',
          isActive: product.isActive !== false,
          createdAt: product.createdAt || null,
          updatedAt: product.updatedAt || null,
        }))
    );
    const storedProducts = await listStoredProducts();
    const approvedStoredProducts = await serializeProducts(
      storedProducts.filter(
        (product) =>
          (product.approvalStatus || 'pending') === 'approved' &&
          product.isActive !== false
      )
    );
    const approvedProducts = [...starterApprovedProducts, ...approvedStoredProducts];
    const availableProducts = approvedProducts.filter((product) => Number(product.stock || 0) > 0)
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
    const pagedProducts = availableProducts.slice(skip, skip + limit);

    return res.json({
      success: true,
      products: pagedProducts,
      pagination: buildPaginationMeta({
        page,
        limit,
        totalItems: availableProducts.length,
      }),
    });
  } catch (error) {
    logger.error('products list error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch products.',
    });
  }
});

router.get('/manage', authenticate, cacheProducts, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const products = await listStoredProducts();
    const visibleProducts = isAdmin(req)
      ? products
      : products.filter((product) => product.sellerEmail === req.user.email);
    const serializedProducts = await serializeProducts(visibleProducts);
    const pagedProducts = serializedProducts.slice(skip, skip + limit);

    return res.json({
      success: true,
      products: pagedProducts,
      pagination: buildPaginationMeta({
        page,
        limit,
        totalItems: visibleProducts.length,
      }),
      counts: countProductStatuses(visibleProducts),
    });
  } catch (error) {
    logger.error('products manage list error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch product workspace.',
    });
  }
});

router.post('/', authenticate, upload.single('imageFile'), async (req, res) => {
  let uploadedImagePayload = buildStoredImagePayload();
  try {
    if (!assertEntrepreneurOrAdmin(req, res)) {
      return;
    }

    const { error, value } = productSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const product = await createStoredProduct({
      ...value,
      ...(req.file
        ? ((uploadedImagePayload = await storeProductImage({ file: req.file, sellerEmail: req.user.email })), uploadedImagePayload)
        : buildStoredImagePayload({ image: value.image || '' })),
      price: 0,
      mrp: 0,
      stock: 0,
      manufacturingDate: null,
      expiryDate: null,
      inventoryBatches: [],
      sellerEmail: req.user.email,
      isActive: true,
      approvalStatus: isAdmin(req) ? 'approved' : 'pending',
      moderationNote: '',
    });

    return res.status(201).json({
      success: true,
      message: 'Product submitted successfully for approval.',
      product: await serializeProduct(product),
    });
  } catch (error) {
    await deleteGridFSFile(extractFileIdFromProductImage(uploadedImagePayload.image));
    logger.error('products create error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to create product.',
    });
  }
});

router.put('/:productId', authenticate, upload.single('imageFile'), async (req, res) => {
  let uploadedImagePayload = buildStoredImagePayload();
  try {
    if (!assertEntrepreneurOrAdmin(req, res)) {
      return;
    }

    const existingProduct = await findStoredProductById(req.params.productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    if (!isAdmin(req) && existingProduct.sellerEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'You can edit only your own products.',
      });
    }

    const { error, value } = productSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    uploadedImagePayload = req.file
      ? await storeProductImage({ file: req.file, sellerEmail: existingProduct.sellerEmail })
      : buildStoredImagePayload();

    const updatedProduct = await updateStoredProduct(req.params.productId, {
      ...value,
      ...(
        req.file
          ? uploadedImagePayload
          : buildStoredImagePayload({
              image: value.image || existingProduct.image || '',
              imageVariants: existingProduct.imageVariants || null,
              imagePublicId: existingProduct.imagePublicId || '',
              imageCdn: existingProduct.imageCdn || '',
            })
      ),
      price: existingProduct.price || 0,
      mrp: existingProduct.mrp || 0,
      stock: existingProduct.stock || 0,
      manufacturingDate: existingProduct.manufacturingDate || null,
      expiryDate: existingProduct.expiryDate || null,
      inventoryBatches: existingProduct.inventoryBatches || [],
      sellerEmail: existingProduct.sellerEmail,
      approvalStatus: isAdmin(req) ? existingProduct.approvalStatus : 'pending',
      moderationNote: isAdmin(req) ? existingProduct.moderationNote : '',
    });

    if (uploadedImagePayload.image && existingProduct.image && existingProduct.image !== uploadedImagePayload.image) {
      await deleteGridFSFile(extractFileIdFromProductImage(existingProduct.image));
    }

    return res.json({
      success: true,
      message: 'Product updated successfully.',
      product: await serializeProduct(updatedProduct),
    });
  } catch (error) {
    await deleteGridFSFile(extractFileIdFromProductImage(uploadedImagePayload.image));
    logger.error('products update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update product.',
    });
  }
});

router.patch('/:productId/inventory', authenticate, async (req, res) => {
  try {
    if (!assertEntrepreneurOrAdmin(req, res)) {
      return;
    }

    const existingProduct = await findStoredProductById(req.params.productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    if (!isAdmin(req) && existingProduct.sellerEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'You can add stock only for your own products.',
      });
    }

    const { error, value } = inventoryBatchSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Validate expiry date if applicable
    if (existingProduct.expiryApplicable && value.manufacturingDate && value.expiryDate) {
      const dateValidation = validateExpiryDate(value.manufacturingDate, value.expiryDate);
      if (!dateValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: dateValidation.error,
        });
      }
    }

    if (existingProduct.expiryApplicable && !value.expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date is required for this product.',
      });
    }

    const inventoryBatches = [
      normalizeInventoryBatch({
        ...value,
        expiryDate: existingProduct.expiryApplicable ? value.expiryDate || null : null,
      }),
      ...(existingProduct.inventoryBatches || []),
    ];

    const updatedProduct = await updateStoredProduct(
      req.params.productId,
      await applyBatchAggregation({
        ...existingProduct,
        inventoryBatches,
      })
    );

    return res.json({
      success: true,
      message: 'Stock batch added successfully.',
      product: await serializeProduct(updatedProduct),
    });
  } catch (error) {
    logger.error('products inventory error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to add stock batch.',
    });
  }
});

router.patch('/:productId/inventory/:batchId', authenticate, async (req, res) => {
  try {
    if (!assertEntrepreneurOrAdmin(req, res)) {
      return;
    }

    const existingProduct = await findStoredProductById(req.params.productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    if (!isAdmin(req) && existingProduct.sellerEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'You can edit stock only for your own products.',
      });
    }

    const { error, value } = inventoryBatchSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    if (existingProduct.expiryApplicable && !value.expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date is required for this product.',
      });
    }

    const batchIndex = (existingProduct.inventoryBatches || []).findIndex(
      (batch) => getBatchIdentifier(batch) === req.params.batchId
    );

    if (batchIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Stock batch not found.',
      });
    }

    const inventoryBatches = [...(existingProduct.inventoryBatches || [])];
    inventoryBatches[batchIndex] = normalizeInventoryBatch(
      {
        ...value,
        expiryDate: existingProduct.expiryApplicable ? value.expiryDate || null : null,
      },
      inventoryBatches[batchIndex]
    );

    const updatedProduct = await updateStoredProduct(
      req.params.productId,
      await applyBatchAggregation({
        ...existingProduct,
        inventoryBatches,
      })
    );

    return res.json({
      success: true,
      message: 'Stock batch updated successfully.',
      product: await serializeProduct(updatedProduct),
    });
  } catch (error) {
    logger.error('products inventory update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update stock batch.',
    });
  }
});

router.patch('/:productId/inventory/:batchId/availability', authenticate, async (req, res) => {
  try {
    if (!assertEntrepreneurOrAdmin(req, res)) {
      return;
    }

    const existingProduct = await findStoredProductById(req.params.productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    if (!isAdmin(req) && existingProduct.sellerEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'You can disable stock only for your own products.',
      });
    }

    const { error, value } = inventoryBatchAvailabilitySchema.validate(req.body, {
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const inventoryBatches = (existingProduct.inventoryBatches || []).map((batch) =>
      getBatchIdentifier(batch) === req.params.batchId
        ? { ...batch, isActive: value.isActive }
        : batch
    );

    if (!(existingProduct.inventoryBatches || []).some((batch) => getBatchIdentifier(batch) === req.params.batchId)) {
      return res.status(404).json({
        success: false,
        message: 'Stock batch not found.',
      });
    }

    const updatedProduct = await updateStoredProduct(
      req.params.productId,
      await applyBatchAggregation({
        ...existingProduct,
        inventoryBatches,
      })
    );

    return res.json({
      success: true,
      message: value.isActive ? 'Stock batch enabled successfully.' : 'Stock batch disabled successfully.',
      product: await serializeProduct(updatedProduct),
    });
  } catch (error) {
    logger.error('products inventory availability error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update stock batch availability.',
    });
  }
});

router.patch('/:productId/availability', authenticate, async (req, res) => {
  try {
    if (!assertEntrepreneurOrAdmin(req, res)) {
      return;
    }

    const existingProduct = await findStoredProductById(req.params.productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    if (!isAdmin(req) && existingProduct.sellerEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'You can update availability only for your own products.',
      });
    }

    const { error, value } = availabilitySchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const updatedProduct = await updateStoredProduct(req.params.productId, {
      isActive: value.isActive,
    });

    return res.json({
      success: true,
      message: value.isActive ? 'Product enabled successfully.' : 'Product disabled successfully.',
      product: await serializeProduct(updatedProduct),
    });
  } catch (error) {
    logger.error('products availability error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update product availability.',
    });
  }
});

router.patch('/:productId/status', authenticate, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only the admin can moderate GlobeMart products.',
      });
    }

    const existingProduct = await findStoredProductById(req.params.productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const { error, value } = moderationSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const updatedProduct = await updateStoredProduct(req.params.productId, value);

    return res.json({
      success: true,
      message: 'Product moderation status updated.',
      product: await serializeProduct(updatedProduct),
    });
  } catch (error) {
    logger.error('products moderation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update moderation status.',
    });
  }
});

// Elasticsearch search endpoint
router.get('/search', cacheSearch, async (req, res) => {
  try {
    const {
      q: query = '',
      category,
      business,
      seller = '',
      minPrice = '',
      maxPrice = '',
      minRating = '',
      inStock = '',
      sort = 'relevance',
      page = 1,
      limit = 20,
    } = req.query;
    const parsedPage = Math.max(DEFAULT_PAGE, Number.parseInt(page, 10) || DEFAULT_PAGE);
    const parsedLimit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(limit, 10) || DEFAULT_LIMIT));
    const result = await searchProducts({
      query,
      category,
      business,
      seller,
      minPrice,
      maxPrice,
      minRating,
      inStock,
      sort,
      page: parsedPage,
      limit: parsedLimit,
    });
    const serializedSearchResults = await serializeProducts(result.products);
     
    res.json({
      success: true,
      products: serializedSearchResults,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: result.total
      },
      facets: {
        categories: result.aggregations.categories || [],
        businesses: result.aggregations.businesses || [],
        ratings: result.aggregations.ratings || [],
        priceRanges: result.aggregations.priceRanges || [],
      }
    });
  } catch (error) {
    logger.error('ES search error:', error);
    const starterProducts = await listStarterProducts();
    const storedProducts = await listStoredProducts();
    const approvedProducts = await serializeProducts([
      ...starterProducts.filter((product) => (product.approvalStatus || 'approved') === 'approved' && product.isActive !== false),
      ...storedProducts.filter((product) => (product.approvalStatus || 'pending') === 'approved' && product.isActive !== false),
    ]);

    const filteredProducts = filterProductsLocally(approvedProducts, {
      query: req.query.q,
      category: req.query.category,
      business: req.query.business,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      minRating: req.query.minRating,
      inStock: req.query.inStock,
      sort: req.query.sort,
    });
    const pageMeta = buildPaginationMeta({
      page: Math.max(DEFAULT_PAGE, Number.parseInt(req.query.page, 10) || DEFAULT_PAGE),
      limit: Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(req.query.limit, 10) || DEFAULT_LIMIT)),
      totalItems: filteredProducts.length,
    });
    const pagedProducts = filteredProducts.slice(
      (pageMeta.page - 1) * pageMeta.limit,
      (pageMeta.page - 1) * pageMeta.limit + pageMeta.limit
    );

    return res.json({
      success: true,
      fallback: true,
      message: 'Search is using the local marketplace index fallback.',
      products: pagedProducts,
      pagination: {
        page: pageMeta.page,
        limit: pageMeta.limit,
        total: filteredProducts.length,
      },
      facets: buildLocalFacets(filteredProducts),
    });
  }
});

router.post('/:productId/track', async (req, res) => {
  try {
    const metric = String(req.body?.metric || 'view').trim().toLowerCase();
    if (!['view', 'click'].includes(metric)) {
      return res.status(400).json({
        success: false,
        message: 'Metric must be "view" or "click".',
      });
    }

    const product = await findStoredProductById(req.params.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const updates = metric === 'click'
      ? { clicks: Number(product.clicks || 0) + 1 }
      : { views: Number(product.views || 0) + 1 };

    const updatedProduct = await updateStoredProduct(req.params.productId, updates);

    return res.json({
      success: true,
      product: await serializeProduct(updatedProduct),
    });
  } catch (error) {
    logger.error('products track error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to track product engagement.',
    });
  }
});

// Cleanup on product delete (add to existing delete logic if exists, or new endpoint)
router.delete('/:productId', authenticate, async (req, res) => {
  try {
    if (!assertEntrepreneurOrAdmin(req, res)) return;
    
    const product = await findStoredProductById(req.params.productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    if (!isAdmin(req) && product.sellerEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    await deleteProduct(req.params.productId);
    if (useMemoryProducts()) {
      await devProductStore.deleteProduct(req.params.productId);
    } else {
      await Product.findByIdAndDelete(req.params.productId);
    }
    
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    logger.error('Delete error:', error);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

module.exports = router;
module.exports.__testables = {
  buildBatchSummary,
  serializeProduct,
};
