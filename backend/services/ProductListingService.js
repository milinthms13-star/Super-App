const Product = require('../models/Product');
const EcommerceSellerProfile = require('../models/EcommerceSellerProfile');
const EcommerceCategory = require('../models/EcommerceCategory');

class ProductListingService {
  /**
   * Create a new product listing
   */
  async createProduct(sellerId, productData) {
    try {
      // Verify seller profile
      const sellerProfile = await EcommerceSellerProfile.findOne({ user: sellerId });
      if (!sellerProfile) {
        throw new Error('Seller profile not found. Please complete seller onboarding.');
      }

      // Check subscription limits
      if (sellerProfile.subscription.status !== 'active') {
        throw new Error('Active subscription required to list products.');
      }

      const activeProductCount = await Product.countDocuments({
        sellerProfile: sellerProfile._id,
        status: { $in: ['active', 'draft'] }
      });

      if (activeProductCount >= sellerProfile.subscription.productLimit) {
        throw new Error(`Product limit reached. Upgrade your subscription to list more products. Current limit: ${sellerProfile.subscription.productLimit}`);
      }

      // Validate category
      const category = await EcommerceCategory.findById(productData.category);
      if (!category || !category.isActive) {
        throw new Error('Invalid or inactive category.');
      }

      // Create product
      const product = new Product({
        ...productData,
        sellerProfile: sellerProfile._id,
        seller: sellerId,
        status: productData.status || 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await product.save();

      return {
        success: true,
        product: await this.getProductDetails(product._id),
        message: 'Product created successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update product listing
   */
  async updateProduct(productId, sellerId, updateData) {
    try {
      const product = await Product.findById(productId).populate('sellerProfile');
      
      if (!product) {
        throw new Error('Product not found');
      }

      if (product.seller.toString() !== sellerId.toString()) {
        throw new Error('Unauthorized: You can only edit your own products');
      }

      // Validate category if being changed
      if (updateData.category && updateData.category !== product.category.toString()) {
        const category = await EcommerceCategory.findById(updateData.category);
        if (!category || !category.isActive) {
          throw new Error('Invalid or inactive category.');
        }
      }

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (key !== '_id' && key !== 'seller' && key !== 'sellerProfile') {
          product[key] = updateData[key];
        }
      });

      product.updatedAt = new Date();
      await product.save();

      return {
        success: true,
        product: await this.getProductDetails(product._id),
        message: 'Product updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Publish draft product
   */
  async publishProduct(productId, sellerId) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      if (product.seller.toString() !== sellerId.toString()) {
        throw new Error('Unauthorized');
      }

      if (product.status === 'active') {
        throw new Error('Product is already published');
      }

      // Validate required fields for publishing
      const requiredFields = ['name', 'description', 'price', 'category', 'images'];
      const missingFields = requiredFields.filter(field => {
        if (field === 'images') return !product.images || product.images.length === 0;
        return !product[field];
      });

      if (missingFields.length > 0) {
        throw new Error(`Cannot publish: Missing required fields: ${missingFields.join(', ')}`);
      }

      product.status = 'active';
      product.publishedAt = new Date();
      product.updatedAt = new Date();
      await product.save();

      return {
        success: true,
        product: await this.getProductDetails(product._id),
        message: 'Product published successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Unpublish/deactivate product
   */
  async unpublishProduct(productId, sellerId) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      if (product.seller.toString() !== sellerId.toString()) {
        throw new Error('Unauthorized');
      }

      product.status = 'inactive';
      product.updatedAt = new Date();
      await product.save();

      return {
        success: true,
        message: 'Product unpublished successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(productId, sellerId) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      if (product.seller.toString() !== sellerId.toString()) {
        throw new Error('Unauthorized');
      }

      // Soft delete
      product.status = 'deleted';
      product.deletedAt = new Date();
      product.updatedAt = new Date();
      await product.save();

      return {
        success: true,
        message: 'Product deleted successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk operations
   */
  async bulkUpdateProducts(sellerId, productIds, updateData) {
    try {
      const results = {
        success: [],
        failed: []
      };

      for (const productId of productIds) {
        try {
          const result = await this.updateProduct(productId, sellerId, updateData);
          results.success.push({ productId, product: result.product });
        } catch (error) {
          results.failed.push({ productId, error: error.message });
        }
      }

      return {
        success: true,
        results,
        message: `Bulk update completed. Success: ${results.success.length}, Failed: ${results.failed.length}`
      };
    } catch (error) {
      throw error;
    }
  }

  async bulkPublishProducts(sellerId, productIds) {
    try {
      const results = {
        success: [],
        failed: []
      };

      for (const productId of productIds) {
        try {
          const result = await this.publishProduct(productId, sellerId);
          results.success.push({ productId, product: result.product });
        } catch (error) {
          results.failed.push({ productId, error: error.message });
        }
      }

      return {
        success: true,
        results,
        message: `Bulk publish completed. Success: ${results.success.length}, Failed: ${results.failed.length}`
      };
    } catch (error) {
      throw error;
    }
  }

  async bulkDeleteProducts(sellerId, productIds) {
    try {
      const results = {
        success: [],
        failed: []
      };

      for (const productId of productIds) {
        try {
          await this.deleteProduct(productId, sellerId);
          results.success.push({ productId });
        } catch (error) {
          results.failed.push({ productId, error: error.message });
        }
      }

      return {
        success: true,
        results,
        message: `Bulk delete completed. Success: ${results.success.length}, Failed: ${results.failed.length}`
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get product details with all relations
   */
  async getProductDetails(productId) {
    try {
      const product = await Product.findById(productId)
        .populate('category', 'name slug parentCategory')
        .populate('sellerProfile', 'businessName rating totalSales')
        .populate('seller', 'username email')
        .lean();

      if (!product) {
        throw new Error('Product not found');
      }

      return product;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get seller's products with filters
   */
  async getSellerProducts(sellerId, filters = {}) {
    try {
      const {
        status,
        category,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = filters;

      const query = { 
        seller: sellerId,
        status: { $ne: 'deleted' }
      };

      if (status) {
        query.status = status;
      }

      if (category) {
        query.category = category;
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const [products, total] = await Promise.all([
        Product.find(query)
          .populate('category', 'name slug')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(query)
      ]);

      return {
        products,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Duplicate product
   */
  async duplicateProduct(productId, sellerId) {
    try {
      const originalProduct = await Product.findById(productId);
      
      if (!originalProduct) {
        throw new Error('Product not found');
      }

      if (originalProduct.seller.toString() !== sellerId.toString()) {
        throw new Error('Unauthorized');
      }

      // Create duplicate
      const duplicateData = originalProduct.toObject();
      delete duplicateData._id;
      delete duplicateData.createdAt;
      delete duplicateData.updatedAt;
      delete duplicateData.publishedAt;
      delete duplicateData.views;
      delete duplicateData.sales;
      
      duplicateData.name = `${duplicateData.name} (Copy)`;
      duplicateData.status = 'draft';
      duplicateData.sku = `${duplicateData.sku}-copy-${Date.now()}`;

      return await this.createProduct(sellerId, duplicateData);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Product templates
   */
  async createTemplate(sellerId, templateName, productData) {
    try {
      const sellerProfile = await EcommerceSellerProfile.findOne({ user: sellerId });
      if (!sellerProfile) {
        throw new Error('Seller profile not found');
      }

      const template = {
        name: templateName,
        data: productData,
        createdAt: new Date()
      };

      sellerProfile.productTemplates = sellerProfile.productTemplates || [];
      sellerProfile.productTemplates.push(template);
      await sellerProfile.save();

      return {
        success: true,
        template,
        message: 'Template created successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  async getTemplates(sellerId) {
    try {
      const sellerProfile = await EcommerceSellerProfile.findOne({ user: sellerId });
      if (!sellerProfile) {
        throw new Error('Seller profile not found');
      }

      return {
        templates: sellerProfile.productTemplates || []
      };
    } catch (error) {
      throw error;
    }
  }

  async createProductFromTemplate(sellerId, templateId) {
    try {
      const sellerProfile = await EcommerceSellerProfile.findOne({ user: sellerId });
      if (!sellerProfile) {
        throw new Error('Seller profile not found');
      }

      const template = sellerProfile.productTemplates.id(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      return await this.createProduct(sellerId, template.data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add/remove product images
   */
  async addProductImages(productId, sellerId, imageUrls) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      if (product.seller.toString() !== sellerId.toString()) {
        throw new Error('Unauthorized');
      }

      product.images = product.images || [];
      product.images.push(...imageUrls);
      product.updatedAt = new Date();
      await product.save();

      return {
        success: true,
        product: await this.getProductDetails(product._id),
        message: 'Images added successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  async removeProductImage(productId, sellerId, imageUrl) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      if (product.seller.toString() !== sellerId.toString()) {
        throw new Error('Unauthorized');
      }

      product.images = product.images.filter(img => img !== imageUrl);
      product.updatedAt = new Date();
      await product.save();

      return {
        success: true,
        product: await this.getProductDetails(product._id),
        message: 'Image removed successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  async reorderProductImages(productId, sellerId, imageUrls) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      if (product.seller.toString() !== sellerId.toString()) {
        throw new Error('Unauthorized');
      }

      product.images = imageUrls;
      product.updatedAt = new Date();
      await product.save();

      return {
        success: true,
        product: await this.getProductDetails(product._id),
        message: 'Images reordered successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Manage product variants
   */
  async addVariant(productId, sellerId, variantData) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      if (product.seller.toString() !== sellerId.toString()) {
        throw new Error('Unauthorized');
      }

      product.variants = product.variants || [];
      product.variants.push(variantData);
      product.updatedAt = new Date();
      await product.save();

      return {
        success: true,
        product: await this.getProductDetails(product._id),
        message: 'Variant added successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  async updateVariant(productId, sellerId, variantId, variantData) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      if (product.seller.toString() !== sellerId.toString()) {
        throw new Error('Unauthorized');
      }

      const variant = product.variants.id(variantId);
      if (!variant) {
        throw new Error('Variant not found');
      }

      Object.keys(variantData).forEach(key => {
        variant[key] = variantData[key];
      });

      product.updatedAt = new Date();
      await product.save();

      return {
        success: true,
        product: await this.getProductDetails(product._id),
        message: 'Variant updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  async deleteVariant(productId, sellerId, variantId) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      if (product.seller.toString() !== sellerId.toString()) {
        throw new Error('Unauthorized');
      }

      product.variants = product.variants.filter(v => v._id.toString() !== variantId.toString());
      product.updatedAt = new Date();
      await product.save();

      return {
        success: true,
        product: await this.getProductDetails(product._id),
        message: 'Variant deleted successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * SEO optimization
   */
  async updateSEO(productId, sellerId, seoData) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      if (product.seller.toString() !== sellerId.toString()) {
        throw new Error('Unauthorized');
      }

      product.seo = {
        ...product.seo,
        ...seoData
      };

      product.updatedAt = new Date();
      await product.save();

      return {
        success: true,
        product: await this.getProductDetails(product._id),
        message: 'SEO updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate SEO suggestions
   */
  generateSEOSuggestions(product) {
    const suggestions = [];

    // Meta title suggestions
    if (!product.seo?.metaTitle) {
      suggestions.push({
        type: 'metaTitle',
        suggestion: `${product.name} - Buy Online | Your Store Name`,
        priority: 'high'
      });
    } else if (product.seo.metaTitle.length < 30 || product.seo.metaTitle.length > 60) {
      suggestions.push({
        type: 'metaTitle',
        suggestion: 'Meta title should be between 30-60 characters',
        priority: 'medium'
      });
    }

    // Meta description suggestions
    if (!product.seo?.metaDescription) {
      const desc = product.description ? product.description.substring(0, 150) : '';
      suggestions.push({
        type: 'metaDescription',
        suggestion: `${desc}... Shop now at best prices!`,
        priority: 'high'
      });
    } else if (product.seo.metaDescription.length < 120 || product.seo.metaDescription.length > 160) {
      suggestions.push({
        type: 'metaDescription',
        suggestion: 'Meta description should be between 120-160 characters',
        priority: 'medium'
      });
    }

    // Keywords suggestions
    if (!product.seo?.keywords || product.seo.keywords.length === 0) {
      suggestions.push({
        type: 'keywords',
        suggestion: 'Add relevant keywords to improve search visibility',
        priority: 'medium'
      });
    }

    // Canonical URL
    if (!product.seo?.canonicalUrl) {
      suggestions.push({
        type: 'canonicalUrl',
        suggestion: `/products/${product.slug || product._id}`,
        priority: 'low'
      });
    }

    return suggestions;
  }
}

module.exports = new ProductListingService();
