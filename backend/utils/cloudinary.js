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
    const result = await cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename.replace(/\.[^/.]+$/, ""),
        resource_type: 'image',
        format: 'auto',
        quality: 'auto:good',
        ...options
      },
      (error, result) => {
        if (error) throw error;
        return result;
      }
    ).end(buffer);

    return result.secure_url;
  } catch (error) {
    logger.error('Cloudinary upload failed:', error);
    throw error;
  }
}

async function generateImageVariants(publicId) {
  try {
    const transformations = [
      { width: 400, height: 400, crop: 'fill', quality: 85 },
      { width: 800, height: 800, crop: 'fill', quality: 90 },
      { width: 1200, height: 1200, crop: 'fill', quality: 90 }
    ];

    return transformations.map(t => cloudinary.url(publicId, { 
      transformation: t,
      fetch_format: 'auto'
    }));
  } catch (error) {
    logger.error('Variant generation failed:', error);
    return [];
  }
}

function getOptimizedUrl(imageUrl, width = 400) {
  if (!imageUrl || typeof imageUrl !== 'string') return imageUrl;
  
  return cloudinary.url(imageUrl, {
    width,
    height: Math.round(width * 1.0),
    crop: 'fill',
    quality: 'auto:good',
    fetch_format: 'auto'
  });
}

module.exports = {
  uploadToCloudinary,
  generateImageVariants,
  getOptimizedUrl
};

