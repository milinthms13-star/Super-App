const express = require('express');
const router = express.Router();
const ProductListingService = require('../services/ProductListingService');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/products/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, WEBP) are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

/**
 * @route   POST /api/products/listing/create
 * @desc    Create new product listing
 * @access  Private (Seller)
 */
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const result = await ProductListingService.createProduct(req.user.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   PUT /api/products/listing/:productId
 * @desc    Update product listing
 * @access  Private (Seller)
 */
router.put('/:productId', authenticateToken, async (req, res) => {
  try {
    const result = await ProductListingService.updateProduct(
      req.params.productId,
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/products/listing/:productId/publish
 * @desc    Publish draft product
 * @access  Private (Seller)
 */
router.post('/:productId/publish', authenticateToken, async (req, res) => {
  try {
    const result = await ProductListingService.publishProduct(
      req.params.productId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    console.error('Publish product error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/products/listing/:productId/unpublish
 * @desc    Unpublish product
 * @access  Private (Seller)
 */
router.post('/:productId/unpublish', authenticateToken, async (req, res) => {
  try {
    const result = await ProductListingService.unpublishProduct(
      req.params.productId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    console.error('Unpublish product error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   DELETE /api/products/listing/:productId
 * @desc    Delete product
 * @access  Private (Seller)
 */
router.delete('/:productId', authenticateToken, async (req, res) => {
  try {
    const result = await ProductListingService.deleteProduct(
      req.params.productId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/products/listing/:productId/duplicate
 * @desc    Duplicate product
 * @access  Private (Seller)
 */
router.post('/:productId/duplicate', authenticateToken, async (req, res) => {
  try {
    const result = await ProductListingService.duplicateProduct(
      req.params.productId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    console.error('Duplicate product error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/products/listing/my-products
 * @desc    Get seller's products with filters
 * @access  Private (Seller)
 */
router.get('/my-products', authenticateToken, async (req, res) => {
  try {
    const result = await ProductListingService.getSellerProducts(req.user.id, req.query);
    res.json(result);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/products/listing/:productId
 * @desc    Get product details
 * @access  Private (Seller)
 */
router.get('/:productId', authenticateToken, async (req, res) => {
  try {
    const product = await ProductListingService.getProductDetails(req.params.productId);
    res.json({ success: true, product });
  } catch (error) {
    console.error('Get product details error:', error);
    res.status(404).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * BULK OPERATIONS
 */

/**
 * @route   POST /api/products/listing/bulk/update
 * @desc    Bulk update products
 * @access  Private (Seller)
 */
router.post('/bulk/update', authenticateToken, async (req, res) => {
  try {
    const { productIds, updateData } = req.body;
    const result = await ProductListingService.bulkUpdateProducts(
      req.user.id,
      productIds,
      updateData
    );
    res.json(result);
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/products/listing/bulk/publish
 * @desc    Bulk publish products
 * @access  Private (Seller)
 */
router.post('/bulk/publish', authenticateToken, async (req, res) => {
  try {
    const { productIds } = req.body;
    const result = await ProductListingService.bulkPublishProducts(
      req.user.id,
      productIds
    );
    res.json(result);
  } catch (error) {
    console.error('Bulk publish error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/products/listing/bulk/delete
 * @desc    Bulk delete products
 * @access  Private (Seller)
 */
router.post('/bulk/delete', authenticateToken, async (req, res) => {
  try {
    const { productIds } = req.body;
    const result = await ProductListingService.bulkDeleteProducts(
      req.user.id,
      productIds
    );
    res.json(result);
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * IMAGE MANAGEMENT
 */

/**
 * @route   POST /api/products/listing/:productId/images/upload
 * @desc    Upload product images
 * @access  Private (Seller)
 */
router.post('/:productId/images/upload', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    const imageUrls = req.files.map(file => `/uploads/products/${file.filename}`);
    const result = await ProductListingService.addProductImages(
      req.params.productId,
      req.user.id,
      imageUrls
    );
    res.json(result);
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   DELETE /api/products/listing/:productId/images
 * @desc    Remove product image
 * @access  Private (Seller)
 */
router.delete('/:productId/images', authenticateToken, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const result = await ProductListingService.removeProductImage(
      req.params.productId,
      req.user.id,
      imageUrl
    );
    res.json(result);
  } catch (error) {
    console.error('Remove image error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   PUT /api/products/listing/:productId/images/reorder
 * @desc    Reorder product images
 * @access  Private (Seller)
 */
router.put('/:productId/images/reorder', authenticateToken, async (req, res) => {
  try {
    const { imageUrls } = req.body;
    const result = await ProductListingService.reorderProductImages(
      req.params.productId,
      req.user.id,
      imageUrls
    );
    res.json(result);
  } catch (error) {
    console.error('Reorder images error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * VARIANT MANAGEMENT
 */

/**
 * @route   POST /api/products/listing/:productId/variants
 * @desc    Add product variant
 * @access  Private (Seller)
 */
router.post('/:productId/variants', authenticateToken, async (req, res) => {
  try {
    const result = await ProductListingService.addVariant(
      req.params.productId,
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    console.error('Add variant error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   PUT /api/products/listing/:productId/variants/:variantId
 * @desc    Update product variant
 * @access  Private (Seller)
 */
router.put('/:productId/variants/:variantId', authenticateToken, async (req, res) => {
  try {
    const result = await ProductListingService.updateVariant(
      req.params.productId,
      req.user.id,
      req.params.variantId,
      req.body
    );
    res.json(result);
  } catch (error) {
    console.error('Update variant error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   DELETE /api/products/listing/:productId/variants/:variantId
 * @desc    Delete product variant
 * @access  Private (Seller)
 */
router.delete('/:productId/variants/:variantId', authenticateToken, async (req, res) => {
  try {
    const result = await ProductListingService.deleteVariant(
      req.params.productId,
      req.user.id,
      req.params.variantId
    );
    res.json(result);
  } catch (error) {
    console.error('Delete variant error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * TEMPLATES
 */

/**
 * @route   POST /api/products/listing/templates/create
 * @desc    Create product template
 * @access  Private (Seller)
 */
router.post('/templates/create', authenticateToken, async (req, res) => {
  try {
    const { templateName, productData } = req.body;
    const result = await ProductListingService.createTemplate(
      req.user.id,
      templateName,
      productData
    );
    res.json(result);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/products/listing/templates
 * @desc    Get product templates
 * @access  Private (Seller)
 */
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const result = await ProductListingService.getTemplates(req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/products/listing/templates/:templateId/use
 * @desc    Create product from template
 * @access  Private (Seller)
 */
router.post('/templates/:templateId/use', authenticateToken, async (req, res) => {
  try {
    const result = await ProductListingService.createProductFromTemplate(
      req.user.id,
      req.params.templateId
    );
    res.json(result);
  } catch (error) {
    console.error('Use template error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * SEO
 */

/**
 * @route   PUT /api/products/listing/:productId/seo
 * @desc    Update product SEO
 * @access  Private (Seller)
 */
router.put('/:productId/seo', authenticateToken, async (req, res) => {
  try {
    const result = await ProductListingService.updateSEO(
      req.params.productId,
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    console.error('Update SEO error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/products/listing/:productId/seo/suggestions
 * @desc    Get SEO suggestions for product
 * @access  Private (Seller)
 */
router.get('/:productId/seo/suggestions', authenticateToken, async (req, res) => {
  try {
    const product = await ProductListingService.getProductDetails(req.params.productId);
    const suggestions = ProductListingService.generateSEOSuggestions(product);
    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('Get SEO suggestions error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
