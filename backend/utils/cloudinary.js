const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function uploadToCloudinary(buffer, filename, folder = 'products', options = {}) {
  try {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: filename.replace(/\.[^/.]+$/, ""),
          resource_type: 'image',
          categorization: 'google_tagging',
          quality: 'auto:good',
          format: 'auto',
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
      public_id: result.public_id,
      variants: generateImageVariants(result.public_id)
    };
  } catch (error) {
    logger.error('Cloudinary upload failed:', error);
    throw error;
  }
}

async function generateImageVariants(publicId) {
  try {
    const transformations = [
      { width: 300, height: 300, crop: 'fill', quality: 80, fetch_format: 'auto' },
      { width: 400, height: 400, crop: 'fill', quality: 85, fetch_format: 'auto' },
      { width: 600, height: 600, crop: 'fill', quality: 90, fetch_format: 'auto' },
      { width: 800, height: 800, crop: 'fill', quality: 90, fetch_format: 'auto' },
      { width: 1200, height: 1200, crop: 'fill', quality: 90, fetch_format: 'auto' }
    ];

    return {
      thumbnail: cloudinary.url(publicId, transformations[0]),
      small: cloudinary.url(publicId, transformations[1]),
      medium: cloudinary.url(publicId, transformations[2]),
      large: cloudinary.url(publicId, transformations[3]),
      original: cloudinary.url(publicId, transformations[4])
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
  uploadToCloudinary,
  generateImageVariants,
  getOptimizedUrl
};

