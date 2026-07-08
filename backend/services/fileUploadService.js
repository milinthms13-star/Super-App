const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'malabarbazaar-uploads';

// Multer configuration for local uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/temp');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
  }
};

// File filter for documents
const documentFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid document type. Only PDF, DOC, DOCX, XLS, XLSX are allowed.'), false);
  }
};

// Multer middleware configurations
const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

const uploadDocument = multer({
  storage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const uploadMultiple = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10, // Maximum 10 files
  },
});

/**
 * Process and optimize image
 * @param {string} filePath - Path to the image file
 * @param {object} options - Processing options
 * @returns {Promise<Buffer>} - Optimized image buffer
 */
async function processImage(filePath, options = {}) {
  const {
    width = 1200,
    height = null,
    quality = 80,
    format = 'jpeg',
  } = options;

  let pipeline = sharp(filePath);

  if (width || height) {
    pipeline = pipeline.resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  if (format === 'jpeg' || format === 'jpg') {
    pipeline = pipeline.jpeg({ quality });
  } else if (format === 'png') {
    pipeline = pipeline.png({ quality });
  } else if (format === 'webp') {
    pipeline = pipeline.webp({ quality });
  }

  return pipeline.toBuffer();
}

/**
 * Generate thumbnail for image
 * @param {string} filePath - Path to the image file
 * @returns {Promise<Buffer>} - Thumbnail buffer
 */
async function generateThumbnail(filePath) {
  return sharp(filePath)
    .resize(300, 300, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 70 })
    .toBuffer();
}

/**
 * Upload file to S3
 * @param {Buffer|string} fileData - File buffer or path
 * @param {string} fileName - Destination file name
 * @param {string} contentType - MIME type
 * @param {string} folder - S3 folder path
 * @returns {Promise<string>} - S3 URL
 */
async function uploadToS3(fileData, fileName, contentType, folder = 'business-builder') {
  const useS3 = process.env.USE_S3_STORAGE === 'true';
  
  if (!useS3) {
    // Store locally
    const localDir = path.join(__dirname, '../uploads', folder);
    await fs.mkdir(localDir, { recursive: true });
    const localPath = path.join(localDir, fileName);
    
    if (Buffer.isBuffer(fileData)) {
      await fs.writeFile(localPath, fileData);
    } else {
      await fs.copyFile(fileData, localPath);
    }
    
    return `/uploads/${folder}/${fileName}`;
  }

  // Upload to S3
  const buffer = Buffer.isBuffer(fileData) ? fileData : await fs.readFile(fileData);
  
  const params = {
    Bucket: BUCKET_NAME,
    Key: `${folder}/${fileName}`,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
  };

  const result = await s3.upload(params).promise();
  return result.Location;
}

/**
 * Delete file from S3
 * @param {string} fileUrl - S3 URL or local path
 * @returns {Promise<void>}
 */
async function deleteFromS3(fileUrl) {
  const useS3 = process.env.USE_S3_STORAGE === 'true';
  
  if (!useS3) {
    // Delete local file
    if (fileUrl.startsWith('/uploads/')) {
      const localPath = path.join(__dirname, '..', fileUrl);
      try {
        await fs.unlink(localPath);
      } catch (error) {
        // File might not exist
      }
    }
    return;
  }

  // Delete from S3
  const urlParts = fileUrl.split('/');
  const key = urlParts.slice(3).join('/'); // Remove protocol and domain

  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  await s3.deleteObject(params).promise();
}

/**
 * Upload business logo
 * @param {string} filePath - Temporary file path
 * @param {string} businessId - Business identifier
 * @returns {Promise<object>} - URLs for original and thumbnail
 */
async function uploadBusinessLogo(filePath, businessId) {
  const originalBuffer = await processImage(filePath, {
    width: 800,
    height: 800,
    quality: 85,
  });

  const thumbnailBuffer = await generateThumbnail(filePath);

  const fileName = `logo-${businessId}-${Date.now()}.jpg`;
  const thumbFileName = `logo-${businessId}-${Date.now()}-thumb.jpg`;

  const [originalUrl, thumbnailUrl] = await Promise.all([
    uploadToS3(originalBuffer, fileName, 'image/jpeg', 'business-builder/logos'),
    uploadToS3(thumbnailBuffer, thumbFileName, 'image/jpeg', 'business-builder/logos'),
  ]);

  // Clean up temp file
  await fs.unlink(filePath).catch(() => {});

  return {
    original: originalUrl,
    thumbnail: thumbnailUrl,
  };
}

/**
 * Upload mini app banner
 * @param {string} filePath - Temporary file path
 * @param {string} miniAppId - Mini app identifier
 * @returns {Promise<string>} - Banner URL
 */
async function uploadMiniAppBanner(filePath, miniAppId) {
  const buffer = await processImage(filePath, {
    width: 1920,
    height: 1080,
    quality: 85,
  });

  const fileName = `banner-${miniAppId}-${Date.now()}.jpg`;
  const url = await uploadToS3(buffer, fileName, 'image/jpeg', 'business-builder/banners');

  // Clean up temp file
  await fs.unlink(filePath).catch(() => {});

  return url;
}

/**
 * Upload product images
 * @param {Array<string>} filePaths - Array of temporary file paths
 * @param {string} productId - Product identifier
 * @returns {Promise<Array<string>>} - Array of image URLs
 */
async function uploadProductImages(filePaths, productId) {
  const uploadPromises = filePaths.map(async (filePath, index) => {
    const buffer = await processImage(filePath, {
      width: 1200,
      quality: 85,
    });

    const fileName = `product-${productId}-${index}-${Date.now()}.jpg`;
    const url = await uploadToS3(buffer, fileName, 'image/jpeg', 'business-builder/products');

    // Clean up temp file
    await fs.unlink(filePath).catch(() => {});

    return url;
  });

  return Promise.all(uploadPromises);
}

/**
 * Upload invoice attachment
 * @param {string} filePath - Temporary file path
 * @param {string} invoiceId - Invoice identifier
 * @returns {Promise<string>} - Document URL
 */
async function uploadInvoiceAttachment(filePath, invoiceId) {
  const fileName = `invoice-attachment-${invoiceId}-${Date.now()}${path.extname(filePath)}`;
  const contentType = path.extname(filePath) === '.pdf' ? 'application/pdf' : 'application/octet-stream';
  
  const url = await uploadToS3(filePath, fileName, contentType, 'business-builder/attachments');

  // Clean up temp file
  await fs.unlink(filePath).catch(() => {});

  return url;
}

/**
 * Get signed URL for private file access
 * @param {string} fileKey - S3 file key
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {string} - Signed URL
 */
function getSignedUrl(fileKey, expiresIn = 3600) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Expires: expiresIn,
  };

  return s3.getSignedUrl('getObject', params);
}

/**
 * Validate image dimensions
 * @param {string} filePath - Path to image file
 * @param {object} constraints - Min/max width and height
 * @returns {Promise<boolean>}
 */
async function validateImageDimensions(filePath, constraints = {}) {
  const { minWidth = 0, maxWidth = 10000, minHeight = 0, maxHeight = 10000 } = constraints;
  
  const metadata = await sharp(filePath).metadata();
  
  return (
    metadata.width >= minWidth &&
    metadata.width <= maxWidth &&
    metadata.height >= minHeight &&
    metadata.height <= maxHeight
  );
}

module.exports = {
  uploadImage,
  uploadDocument,
  uploadMultiple,
  processImage,
  generateThumbnail,
  uploadToS3,
  deleteFromS3,
  uploadBusinessLogo,
  uploadMiniAppBanner,
  uploadProductImages,
  uploadInvoiceAttachment,
  getSignedUrl,
  validateImageDimensions,
};
