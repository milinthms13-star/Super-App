const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'tourism');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const subDir = req.uploadType || 'packages';
    const targetDir = path.join(uploadsDir, subDir);
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// Middleware to set upload type
const setUploadType = (type) => {
  return (req, res, next) => {
    req.uploadType = type;
    next();
  };
};

// Middleware for package gallery upload (multiple files)
const uploadPackageGallery = [
  setUploadType('packages'),
  upload.array('images', 10), // Max 10 images
];

// Middleware for review images upload
const uploadReviewImages = [
  setUploadType('reviews'),
  upload.array('images', 5), // Max 5 images
];

// Middleware for vendor KYC documents
const uploadVendorKYC = [
  setUploadType('kyc'),
  upload.single('document'),
];

// Middleware for complaint attachments
const uploadComplaintAttachments = [
  setUploadType('complaints'),
  upload.array('attachments', 3), // Max 3 attachments
];

// Helper function to get file URL
const getFileUrl = (req, filename) => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/uploads/tourism/${req.uploadType}/${filename}`;
};

// Helper function to delete file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Deleted file: ${filePath}`);
    }
  } catch (error) {
    logger.error('Error deleting file:', error);
  }
};

module.exports = {
  uploadPackageGallery,
  uploadReviewImages,
  uploadVendorKYC,
  uploadComplaintAttachments,
  getFileUrl,
  deleteFile,
};
