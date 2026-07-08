/**
 * E-commerce Integration Service
 * Connects beauty AI product recommendations to the e-commerce module
 */

import { BUDGET_LEVELS, PRODUCT_CATEGORIES } from "../data/beautyaiConstants";

/**
 * Map beauty AI product recommendations to e-commerce product structure
 */
export const mapToEcommerceProduct = (beautyProduct, planData) => {
  return {
    id: beautyProduct.id || `beauty-rec-${Date.now()}`,
    name: beautyProduct.name,
    category: beautyProduct.category || PRODUCT_CATEGORIES.SERUM,
    price: beautyProduct.price || 0,
    currency: beautyProduct.currency || 'INR',
    description: beautyProduct.description || `Recommended for ${planData?.skinType || 'your skin'}`,
    imageUrl: beautyProduct.imageUrl || '/images/placeholder-product.jpg',
    brand: beautyProduct.brand || 'Recommended Brand',
    rating: beautyProduct.rating || 4.5,
    reviewCount: beautyProduct.reviewCount || 0,
    inStock: beautyProduct.inStock !== false,
    tags: [
      'beauty-ai-recommended',
      planData?.skinType,
      planData?.concern,
      ...(beautyProduct.tags || []),
    ].filter(Boolean),
    metadata: {
      source: 'beauty-ai',
      planId: planData?.planId,
      recommendedFor: planData?.concern,
      budget: planData?.budget || BUDGET_LEVELS.MEDIUM,
    },
  };
};

/**
 * Generate product search query based on beauty plan
 */
export const generateProductSearchQuery = (planData) => {
  const { skinType, concern, budget, selectedConcerns = [] } = planData || {};
  
  const keywords = [];
  
  // Add skin type keywords
  if (skinType) {
    keywords.push(skinType);
  }
  
  // Add primary concern
  if (concern) {
    keywords.push(concern);
  }
  
  // Add additional concerns
  if (selectedConcerns.length > 0) {
    keywords.push(...selectedConcerns.slice(0, 2));
  }
  
  // Add budget filter
  const budgetFilter = {
    [BUDGET_LEVELS.LOW]: { minPrice: 0, maxPrice: 2000 },
    [BUDGET_LEVELS.MEDIUM]: { minPrice: 2000, maxPrice: 5000 },
    [BUDGET_LEVELS.HIGH]: { minPrice: 5000, maxPrice: 50000 },
  };
  
  return {
    keywords: keywords.join(' '),
    filters: {
      category: 'skincare',
      priceRange: budgetFilter[budget] || budgetFilter[BUDGET_LEVELS.MEDIUM],
      tags: ['dermatologist-approved', 'cruelty-free'],
    },
    sortBy: 'relevance',
  };
};

/**
 * Fetch products from e-commerce module based on beauty plan
 */
export const fetchRecommendedProducts = async (planData, ecommerceApiUrl = '/api/ecommerce') => {
  try {
    const searchQuery = generateProductSearchQuery(planData);
    
    const response = await fetch(`${ecommerceApiUrl}/products/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchQuery),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    
    const data = await response.json();
    
    // Map products to include beauty AI metadata
    const products = (data.products || []).map(product => 
      mapToEcommerceProduct(product, planData)
    );
    
    return {
      success: true,
      products,
      total: data.total || products.length,
    };
  } catch (error) {
    console.error('E-commerce integration error:', error);
    return {
      success: false,
      products: [],
      error: error.message,
    };
  }
};

/**
 * Create shopping cart with beauty AI recommendations
 */
export const addRecommendationsToCart = async (products, cartApiUrl = '/api/cart') => {
  try {
    const cartItems = products.map(product => ({
      productId: product.id,
      quantity: 1,
      metadata: {
        source: 'beauty-ai-recommendation',
        recommendedFor: product.metadata?.recommendedFor,
        planId: product.metadata?.planId,
      },
    }));
    
    const response = await fetch(`${cartApiUrl}/bulk-add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items: cartItems }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to add items to cart');
    }
    
    const data = await response.json();
    
    return {
      success: true,
      cartId: data.cartId,
      itemsAdded: cartItems.length,
    };
  } catch (error) {
    console.error('Cart integration error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Track product click analytics
 */
export const trackProductClick = async (product, analyticsApiUrl = '/api/analytics') => {
  try {
    await fetch(`${analyticsApiUrl}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'beauty_ai_product_click',
        productId: product.id,
        productName: product.name,
        source: 'beauty-ai',
        metadata: product.metadata,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    // Silent fail for analytics
    console.warn('Analytics tracking failed:', error);
  }
};

/**
 * Get product details with beauty AI context
 */
export const getProductWithBeautyContext = async (productId, planData, ecommerceApiUrl = '/api/ecommerce') => {
  try {
    const response = await fetch(`${ecommerceApiUrl}/products/${productId}`);
    
    if (!response.ok) {
      throw new Error('Product not found');
    }
    
    const product = await response.json();
    
    // Add beauty AI relevance score
    const relevanceScore = calculateRelevanceScore(product, planData);
    
    return {
      success: true,
      product: {
        ...product,
        beautyAiContext: {
          relevanceScore,
          recommendedFor: planData?.concern,
          suitableFor: planData?.skinType,
          planId: planData?.planId,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Calculate relevance score for a product based on beauty plan
 */
const calculateRelevanceScore = (product, planData) => {
  let score = 50; // Base score
  
  if (!planData) return score;
  
  const { skinType, concern, selectedConcerns = [], budget } = planData;
  
  // Check product tags/keywords
  const productTags = [
    ...(product.tags || []),
    product.name?.toLowerCase() || '',
    product.description?.toLowerCase() || '',
  ].join(' ');
  
  // Boost for skin type match
  if (skinType && productTags.includes(skinType.toLowerCase())) {
    score += 15;
  }
  
  // Boost for concern match
  if (concern && productTags.includes(concern.toLowerCase())) {
    score += 20;
  }
  
  // Boost for additional concerns
  selectedConcerns.forEach(c => {
    if (productTags.includes(c.toLowerCase())) {
      score += 5;
    }
  });
  
  // Adjust for budget
  const budgetRanges = {
    [BUDGET_LEVELS.LOW]: { min: 0, max: 2000 },
    [BUDGET_LEVELS.MEDIUM]: { min: 2000, max: 5000 },
    [BUDGET_LEVELS.HIGH]: { min: 5000, max: 50000 },
  };
  
  const range = budgetRanges[budget] || budgetRanges[BUDGET_LEVELS.MEDIUM];
  if (product.price >= range.min && product.price <= range.max) {
    score += 10;
  }
  
  return Math.min(score, 100);
};

/**
 * Create product bundle from beauty plan products
 */
export const createBeautyBundle = (planProducts, planData) => {
  return {
    id: `bundle-${planData?.planId || Date.now()}`,
    name: `${planData?.concern || 'Beauty'} Care Bundle`,
    description: `Curated bundle for ${planData?.skinType || 'your'} skin`,
    products: planProducts,
    totalPrice: planProducts.reduce((sum, p) => sum + (p.price || 0), 0),
    discount: calculateBundleDiscount(planProducts.length),
    tags: ['beauty-ai-bundle', planData?.skinType, planData?.concern].filter(Boolean),
    metadata: {
      source: 'beauty-ai',
      planId: planData?.planId,
      createdAt: new Date().toISOString(),
    },
  };
};

/**
 * Calculate bundle discount based on number of items
 */
const calculateBundleDiscount = (itemCount) => {
  if (itemCount >= 5) return 0.15; // 15% off
  if (itemCount >= 3) return 0.10; // 10% off
  if (itemCount >= 2) return 0.05; // 5% off
  return 0;
};

/**
 * Generate deep link to product in e-commerce module
 */
export const generateProductDeepLink = (product, source = 'beauty-ai') => {
  const baseUrl = '/ecommerce/product';
  const params = new URLSearchParams({
    id: product.id,
    source,
    ref: 'beauty-ai-recommendation',
  });
  
  if (product.metadata?.planId) {
    params.append('planId', product.metadata.planId);
  }
  
  return `${baseUrl}?${params.toString()}`;
};

/**
 * Check if e-commerce module is available
 */
export const isEcommerceAvailable = async () => {
  try {
    const response = await fetch('/api/ecommerce/health', { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};

export default {
  mapToEcommerceProduct,
  generateProductSearchQuery,
  fetchRecommendedProducts,
  addRecommendationsToCart,
  trackProductClick,
  getProductWithBeautyContext,
  createBeautyBundle,
  generateProductDeepLink,
  isEcommerceAvailable,
};
