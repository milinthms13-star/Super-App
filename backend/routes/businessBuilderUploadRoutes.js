const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  uploadImage,
  uploadDocument,
  uploadMultiple,
  uploadBusinessLogo,
  uploadMiniAppBanner,
  uploadProductImages,
  uploadInvoiceAttachment,
  deleteFromS3,
  validateImageDimensions,
} = require('../services/fileUploadService');
const Business = require('../models/Business');
const MiniApp = require('../models/MiniApp');
const MiniAppProduct = require('../models/MiniAppProduct');
const Invoice = require('../models/Invoice');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Upload business logo
 * POST /api/business-builder/upload/business/:businessId/logo
 */
router.post('/business/:businessId/logo', uploadImage.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const business = await Business.findOne({
      businessId: req.params.businessId,
      userId: req.user.id,
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    // Validate image dimensions
    const isValid = await validateImageDimensions(req.file.path, {
      minWidth: 100,
      minHeight: 100,
      maxWidth: 2000,
      maxHeight: 2000,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Image dimensions must be between 100x100 and 2000x2000 pixels',
      });
    }

    // Delete old logo if exists
    if (business.logo) {
      await deleteFromS3(business.logo).catch(() => {});
    }

    // Upload new logo
    const urls = await uploadBusinessLogo(req.file.path, req.params.businessId);

    // Update business with new logo URL
    business.logo = urls.original;
    business.logoThumbnail = urls.thumbnail;
    await business.save();

    res.json({
      success: true,
      data: urls,
      message: 'Business logo uploaded successfully',
    });
  } catch (error) {
    console.error('Upload business logo error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload business logo',
    });
  }
});

/**
 * Upload mini app banner
 * POST /api/business-builder/upload/mini-app/:miniAppId/banner
 */
router.post('/mini-app/:miniAppId/banner', uploadImage.single('banner'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const miniApp = await MiniApp.findOne({
      miniAppId: req.params.miniAppId,
      userId: req.user.id,
    });

    if (!miniApp) {
      return res.status(404).json({
        success: false,
        message: 'Mini app not found',
      });
    }

    // Validate image dimensions for banner
    const isValid = await validateImageDimensions(req.file.path, {
      minWidth: 800,
      minHeight: 400,
      maxWidth: 4000,
      maxHeight: 2000,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Banner dimensions must be at least 800x400 and no more than 4000x2000 pixels',
      });
    }

    // Delete old banner if exists
    if (miniApp.branding?.banner) {
      await deleteFromS3(miniApp.branding.banner).catch(() => {});
    }

    // Upload new banner
    const url = await uploadMiniAppBanner(req.file.path, req.params.miniAppId);

    // Update mini app with new banner URL
    miniApp.branding = {
      ...miniApp.branding,
      banner: url,
    };
    await miniApp.save();

    res.json({
      success: true,
      data: { url },
      message: 'Mini app banner uploaded successfully',
    });
  } catch (error) {
    console.error('Upload mini app banner error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload mini app banner',
    });
  }
});

/**
 * Upload mini app logo
 * POST /api/business-builder/upload/mini-app/:miniAppId/logo
 */
router.post('/mini-app/:miniAppId/logo', uploadImage.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const miniApp = await MiniApp.findOne({
      miniAppId: req.params.miniAppId,
      userId: req.user.id,
    });

    if (!miniApp) {
      return res.status(404).json({
        success: false,
        message: 'Mini app not found',
      });
    }

    // Delete old logo if exists
    if (miniApp.branding?.logo) {
      await deleteFromS3(miniApp.branding.logo).catch(() => {});
    }

    // Upload new logo
    const urls = await uploadBusinessLogo(req.file.path, req.params.miniAppId);

    // Update mini app with new logo URL
    miniApp.branding = {
      ...miniApp.branding,
      logo: urls.original,
    };
    await miniApp.save();

    res.json({
      success: true,
      data: urls,
      message: 'Mini app logo uploaded successfully',
    });
  } catch (error) {
    console.error('Upload mini app logo error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload mini app logo',
    });
  }
});

/**
 * Upload product images
 * POST /api/business-builder/upload/product/:productId/images
 */
router.post('/product/:productId/images', uploadMultiple.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    const product = await MiniAppProduct.findOne({
      productId: req.params.productId,
    }).populate('businessId', 'userId');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Verify user owns the business
    if (String(product.businessId.userId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload images for this product',
      });
    }

    // Validate all images
    for (const file of req.files) {
      const isValid = await validateImageDimensions(file.path, {
        minWidth: 300,
        minHeight: 300,
        maxWidth: 3000,
        maxHeight: 3000,
      });

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'All images must be between 300x300 and 3000x3000 pixels',
        });
      }
    }

    // Upload images
    const filePaths = req.files.map((file) => file.path);
    const urls = await uploadProductImages(filePaths, req.params.productId);

    // Add new URLs to product images (keep existing ones)
    product.images = [...(product.images || []), ...urls];
    await product.save();

    res.json({
      success: true,
      data: { urls },
      message: `${urls.length} image(s) uploaded successfully`,
    });
  } catch (error) {
    console.error('Upload product images error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload product images',
    });
  }
});

/**
 * Delete product image
 * DELETE /api/business-builder/upload/product/:productId/image
 */
router.delete('/product/:productId/image', async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required',
      });
    }

    const product = await MiniAppProduct.findOne({
      productId: req.params.productId,
    }).populate('businessId', 'userId');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Verify user owns the business
    if (String(product.businessId.userId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Remove image URL from product
    product.images = product.images.filter((url) => url !== imageUrl);
    await product.save();

    // Delete from storage
    await deleteFromS3(imageUrl).catch(() => {});

    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Delete product image error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete product image',
    });
  }
});

/**
 * Upload invoice attachment
 * POST /api/business-builder/upload/invoice/:invoiceId/attachment
 */
router.post('/invoice/:invoiceId/attachment', uploadDocument.single('attachment'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const invoice = await Invoice.findOne({
      invoiceId: req.params.invoiceId,
      userId: req.user.id,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Upload attachment
    const url = await uploadInvoiceAttachment(req.file.path, req.params.invoiceId);

    // Add attachment to invoice
    if (!invoice.attachments) {
      invoice.attachments = [];
    }
    invoice.attachments.push({
      fileName: req.file.originalname,
      url,
      uploadedAt: new Date(),
    });
    await invoice.save();

    res.json({
      success: true,
      data: { url, fileName: req.file.originalname },
      message: 'Invoice attachment uploaded successfully',
    });
  } catch (error) {
    console.error('Upload invoice attachment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload invoice attachment',
    });
  }
});

/**
 * Delete invoice attachment
 * DELETE /api/business-builder/upload/invoice/:invoiceId/attachment
 */
router.delete('/invoice/:invoiceId/attachment', async (req, res) => {
  try {
    const { attachmentUrl } = req.body;

    if (!attachmentUrl) {
      return res.status(400).json({
        success: false,
        message: 'Attachment URL is required',
      });
    }

    const invoice = await Invoice.findOne({
      invoiceId: req.params.invoiceId,
      userId: req.user.id,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Remove attachment from invoice
    invoice.attachments = (invoice.attachments || []).filter(
      (attachment) => attachment.url !== attachmentUrl
    );
    await invoice.save();

    // Delete from storage
    await deleteFromS3(attachmentUrl).catch(() => {});

    res.json({
      success: true,
      message: 'Attachment deleted successfully',
    });
  } catch (error) {
    console.error('Delete invoice attachment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete attachment',
    });
  }
});

module.exports = router;
