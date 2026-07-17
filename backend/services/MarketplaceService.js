const Product = require('../models/Product');
const EcommerceCategory = require('../models/EcommerceCategory');
const EcommerceSellerProfile = require('../models/EcommerceSellerProfile');
const User = require('../models/User');

class MarketplaceService {
  /**
   * Get products for marketplace with advanced filters
   */
  async getMarketplaceProducts(filters = {}) {
    try {
      const {
        category,
        subcategory,
        minPrice,
        maxPrice,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 24,
        seller,
        rating,
        inStock = true,
        featured
      } = filters;

      const query = {
        status: 'active'
      };

      // Only show in-stock products by default
      if (inStock) {
        query.stock = { $gt: 0 };
      }

      // Category filter
      if (category) {
        query.category = category;
      }

      // Price range filter
      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseFloat(minPrice);
        if (maxPrice) query.price.$lte = parseFloat(maxPrice);
      }

      // Search filter
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'seo.keywords': { $in: [new RegExp(search, 'i')] } }
        ];
      }

      // Seller filter
      if (seller) {
        query.sellerProfile = seller;
      }

      // Featured products
      if (featured === 'true') {
        query.featured = true;
      }

      const skip = (page - 1) * limit;
      const sort = this._buildSortQuery(sortBy, sortOrder);

      const [products, total] = await Promise.all([
        Product.find(query)
          .populate('category', 'name slug parentCategory')
          .populate('sellerProfile', 'businessName storeName rating totalSales')
          .populate('seller', 'username')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(query)
      ]);

      // Filter by rating if specified
      let filteredProducts = products;
      if (rating) {
        const minRating = parseFloat(rating);
        filteredProducts = products.filter(p => 
          p.sellerProfile?.rating >= minRating
        );
      }

      return {
        products: filteredProducts,
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
   * Get product details for marketplace
   */
  async getProductDetails(productId) {
    try {
      const product = await Product.findOne({ _id: productId, status: 'active' })
        .populate('category', 'name slug parentCategory')
        .populate({
          path: 'sellerProfile',
          select: 'businessName storeName storeSlug rating totalSales totalReviews responseRate'
        })
        .populate('seller', 'username')
        .lean();

      if (!product) {
        throw new Error('Product not found or not available');
      }

      // Increment views
      await Product.findByIdAndUpdate(productId, { $inc: { views: 1 } });

      // Get related products
      const relatedProducts = await this._getRelatedProducts(product);

      return {
        product,
        relatedProducts
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get related/similar products
   */
  async _getRelatedProducts(product) {
    try {
      const relatedProducts = await Product.find({
        _id: { $ne: product._id },
        category: product.category._id,
        status: 'active',
        stock: { $gt: 0 }
      })
        .populate('sellerProfile', 'businessName rating')
        .limit(8)
        .lean();

      return relatedProducts;
    } catch (error) {
      return [];
    }
  }

  /**
   * Search products with autocomplete
   */
  async searchProducts(searchTerm, limit = 10) {
    try {
      if (!searchTerm || searchTerm.length < 2) {
        return [];
      }

      const products = await Product.find({
        status: 'active',
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } }
        ]
      })
        .select('name price images category')
        .populate('category', 'name')
        .limit(limit)
        .lean();

      return products;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit = 12) {
    try {
      const products = await Product.find({
        status: 'active',
        featured: true,
        stock: { $gt: 0 }
      })
        .populate('category', 'name')
        .populate('sellerProfile', 'businessName rating')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return products;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get new arrivals
   */
  async getNewArrivals(limit = 12) {
    try {
      const products = await Product.find({
        status: 'active',
        stock: { $gt: 0 }
      })
        .populate('category', 'name')
        .populate('sellerProfile', 'businessName rating')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return products;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get trending products (most viewed/sold)
   */
  async getTrendingProducts(limit = 12) {
    try {
      const products = await Product.find({
        status: 'active',
        stock: { $gt: 0 }
      })
        .populate('category', 'name')
        .populate('sellerProfile', 'businessName rating')
        .sort({ views: -1, sales: -1 })
        .limit(limit)
        .lean();

      return products;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId, filters = {}) {
    try {
      const category = await EcommerceCategory.findById(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      // Include subcategories
      const subcategoryIds = await EcommerceCategory.find({
        parentCategory: categoryId
      }).distinct('_id');

      const categoryIds = [categoryId, ...subcategoryIds];

      return await this.getMarketplaceProducts({
        ...filters,
        category: { $in: categoryIds }
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get filter options for category
   */
  async getFilterOptions(categoryId = null) {
    try {
      const query = { status: 'active' };
      if (categoryId) {
        query.category = categoryId;
      }

      const [priceRange, categories, sellers] = await Promise.all([
        // Get price range
        Product.aggregate([
          { $match: query },
          {
            $group: {
              _id: null,
              minPrice: { $min: '$price' },
              maxPrice: { $max: '$price' }
            }
          }
        ]),
        // Get categories
        EcommerceCategory.find({ isActive: true })
          .select('name slug parentCategory')
          .lean(),
        // Get sellers
        Product.find(query)
          .distinct('sellerProfile')
          .then(ids =>
            EcommerceSellerProfile.find({ _id: { $in: ids } })
              .select('businessName storeName rating')
              .lean()
          )
      ]);

      return {
        priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0 },
        categories,
        sellers
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Wishlist Management
   */
  async addToWishlist(userId, productId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const product = await Product.findOne({ _id: productId, status: 'active' });
      if (!product) {
        throw new Error('Product not found or not available');
      }

      user.wishlist = user.wishlist || [];
      if (!user.wishlist.includes(productId)) {
        user.wishlist.push(productId);
        await user.save();
      }

      return {
        success: true,
        message: 'Product added to wishlist'
      };
    } catch (error) {
      throw error;
    }
  }

  async removeFromWishlist(userId, productId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.wishlist = user.wishlist || [];
      user.wishlist = user.wishlist.filter(id => id.toString() !== productId.toString());
      await user.save();

      return {
        success: true,
        message: 'Product removed from wishlist'
      };
    } catch (error) {
      throw error;
    }
  }

  async getWishlist(userId) {
    try {
      const user = await User.findById(userId).populate({
        path: 'wishlist',
        match: { status: 'active' },
        populate: [
          { path: 'category', select: 'name' },
          { path: 'sellerProfile', select: 'businessName rating' }
        ]
      });

      return user.wishlist || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Recently Viewed Products
   */
  async addToRecentlyViewed(userId, productId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.recentlyViewed = user.recentlyViewed || [];
      
      // Remove if already exists
      user.recentlyViewed = user.recentlyViewed.filter(
        id => id.toString() !== productId.toString()
      );
      
      // Add to beginning
      user.recentlyViewed.unshift(productId);
      
      // Keep only last 20
      user.recentlyViewed = user.recentlyViewed.slice(0, 20);
      
      await user.save();

      return {
        success: true
      };
    } catch (error) {
      throw error;
    }
  }

  async getRecentlyViewed(userId) {
    try {
      const user = await User.findById(userId).populate({
        path: 'recentlyViewed',
        match: { status: 'active' },
        populate: [
          { path: 'category', select: 'name' },
          { path: 'sellerProfile', select: 'businessName rating' }
        ]
      });

      return user.recentlyViewed || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Product Recommendations
   */
  async getRecommendations(userId, limit = 12) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        // Return popular products for non-logged-in users
        return await this.getTrendingProducts(limit);
      }

      // Get user's recently viewed and wishlist categories
      const recentlyViewed = user.recentlyViewed || [];
      const wishlist = user.wishlist || [];
      
      const userProducts = [...recentlyViewed, ...wishlist];
      
      if (userProducts.length === 0) {
        return await this.getTrendingProducts(limit);
      }

      // Get categories from user's viewed/wishlist products
      const products = await Product.find({
        _id: { $in: userProducts }
      }).select('category');

      const categories = [...new Set(products.map(p => p.category.toString()))];

      // Get recommendations from same categories
      const recommendations = await Product.find({
        _id: { $nin: userProducts },
        category: { $in: categories },
        status: 'active',
        stock: { $gt: 0 }
      })
        .populate('category', 'name')
        .populate('sellerProfile', 'businessName rating')
        .sort({ sales: -1, views: -1 })
        .limit(limit)
        .lean();

      return recommendations;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Build sort query
   */
  _buildSortQuery(sortBy, sortOrder) {
    const order = sortOrder === 'asc' ? 1 : -1;
    
    const sortMap = {
      price: { price: order },
      name: { name: order },
      createdAt: { createdAt: order },
      popularity: { views: -1, sales: -1 },
      rating: { 'sellerProfile.rating': -1 },
      newest: { createdAt: -1 },
      featured: { featured: -1, createdAt: -1 }
    };

    return sortMap[sortBy] || sortMap.createdAt;
  }

  /**
   * Get marketplace statistics
   */
  async getMarketplaceStats() {
    try {
      const [
        totalProducts,
        totalSellers,
        totalCategories,
        avgPrice
      ] = await Promise.all([
        Product.countDocuments({ status: 'active' }),
        EcommerceSellerProfile.countDocuments({ accountStatus: 'active' }),
        EcommerceCategory.countDocuments({ isActive: true }),
        Product.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: null, avgPrice: { $avg: '$price' } } }
        ])
      ]);

      return {
        totalProducts,
        totalSellers,
        totalCategories,
        avgPrice: avgPrice[0]?.avgPrice || 0
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new MarketplaceService();
