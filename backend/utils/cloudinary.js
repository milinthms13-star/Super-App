const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function getPublicIdBase(filename = '') {
  return String(filename || `product-${Date.now()}`)
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || `product-${Date.now()}`;
}

async function uploadToCloudinary(buffer, filename, folder = 'products', options = {}) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured.');
  }

  try {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: getPublicIdBase(filename),
          resource_type: 'image',
          quality: 'auto:good',
          fetch_format: 'auto',
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          ...options
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      cdn: 'cloudinary',
      webpUrl: cloudinary.url(result.public_id, {
        secure: true,
        transformation: [{ quality: 'auto:good', fetch_format: 'webp' }],
      }),
      variants: generateImageVariants(result.public_id),
    };
  } catch (error) {
    logger.error('Cloudinary upload failed:', error);
    throw error;
  }
}

function generateImageVariants(publicId) {
  try {
    const buildUrl = (width, height, extra = {}) => cloudinary.url(publicId, {
      secure: true,
      transformation: [{
        width,
        ...(height ? { height } : {}),
        crop: 'fill',
        quality: 'auto:good',
        fetch_format: 'auto',
        ...extra,
      }],
    });

    return {
      thumbnail: buildUrl(160, 160),
      small: buildUrl(320, 320),
      medium: buildUrl(640, 640),
      large: buildUrl(960, 960),
      hero: buildUrl(1440, 960, { crop: 'limit' }),
      webp: cloudinary.url(publicId, {
        secure: true,
        transformation: [{ width: 640, crop: 'limit', quality: 'auto:good', fetch_format: 'webp' }],
      }),
      original: cloudinary.url(publicId, {
        secure: true,
        transformation: [{ quality: 'auto:best', fetch_format: 'auto' }],
      }),
    };
  } catch (error) {
    logger.error('Variant generation failed:', error);
    return null;
  }
}

function getOptimizedUrl(publicIdOrUrl, width = 400, height = null) {
  if (!publicIdOrUrl) return '';
  
  const options = {
    width,
    quality: 'auto:good',
    crop: 'fill',
    fetch_format: 'auto'
  };
  
  if (height) options.height = height;
  
  return cloudinary.url(publicIdOrUrl, options);
}

module.exports = {
  isCloudinaryConfigured,
  uploadToCloudinary,
  generateImageVariants,
  getOptimizedUrl
};

