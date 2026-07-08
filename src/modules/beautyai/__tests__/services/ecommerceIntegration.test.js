/**
 * E-commerce Integration Service Tests
 */

import {
  mapToEcommerceProduct,
  generateProductSearchQuery,
  fetchRecommendedProducts,
  addRecommendationsToCart,
  trackProductClick,
  createBeautyBundle,
  generateProductDeepLink,
  isEcommerceAvailable,
} from '../../services/ecommerceIntegration';
import { BUDGET_LEVELS, PRODUCT_CATEGORIES } from '../../data/beautyaiConstants';

// Mock fetch
global.fetch = jest.fn();

describe('E-commerce Integration Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockReset();
  });

  describe('mapToEcommerceProduct', () => {
    it('should map beauty product to e-commerce format', () => {
      const beautyProduct = {
        id: 'prod-1',
        name: 'Vitamin C Serum',
        category: PRODUCT_CATEGORIES.SERUM,
        price: 2500,
        description: 'Brightening serum',
        brand: 'Test Brand',
        rating: 4.5,
      };

      const planData = {
        planId: 'plan-1',
        skinType: 'oily',
        concern: 'acne',
        budget: BUDGET_LEVELS.MEDIUM,
      };

      const result = mapToEcommerceProduct(beautyProduct, planData);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'prod-1',
          name: 'Vitamin C Serum',
          category: PRODUCT_CATEGORIES.SERUM,
          price: 2500,
          currency: 'INR',
          brand: 'Test Brand',
          rating: 4.5,
          tags: expect.arrayContaining(['beauty-ai-recommended', 'oily', 'acne']),
          metadata: {
            source: 'beauty-ai',
            planId: 'plan-1',
            recommendedFor: 'acne',
            budget: BUDGET_LEVELS.MEDIUM,
          },
        })
      );
    });

    it('should use defaults for missing fields', () => {
      const beautyProduct = { id: 'prod-1', name: 'Product' };
      const planData = { skinType: 'dry' };

      const result = mapToEcommerceProduct(beautyProduct, planData);

      expect(result.price).toBe(0);
      expect(result.currency).toBe('INR');
      expect(result.rating).toBe(4.5);
      expect(result.inStock).toBe(true);
    });
  });

  describe('generateProductSearchQuery', () => {
    it('should generate search query from plan data', () => {
      const planData = {
        skinType: 'oily',
        concern: 'acne',
        selectedConcerns: ['dark spots', 'aging'],
        budget: BUDGET_LEVELS.MEDIUM,
      };

      const result = generateProductSearchQuery(planData);

      expect(result.keywords).toBe('oily acne dark spots aging');
      expect(result.filters).toEqual({
        category: 'skincare',
        priceRange: { minPrice: 2000, maxPrice: 5000 },
        tags: ['dermatologist-approved', 'cruelty-free'],
      });
      expect(result.sortBy).toBe('relevance');
    });

    it('should handle minimal plan data', () => {
      const result = generateProductSearchQuery({});

      expect(result.keywords).toBe('');
      expect(result.filters.priceRange).toEqual({ minPrice: 2000, maxPrice: 5000 });
    });

    it('should apply correct budget ranges', () => {
      const lowBudget = generateProductSearchQuery({ budget: BUDGET_LEVELS.LOW });
      expect(lowBudget.filters.priceRange).toEqual({ minPrice: 0, maxPrice: 2000 });

      const highBudget = generateProductSearchQuery({ budget: BUDGET_LEVELS.HIGH });
      expect(highBudget.filters.priceRange).toEqual({ minPrice: 5000, maxPrice: 50000 });
    });
  });

  describe('fetchRecommendedProducts', () => {
    it('should fetch and map products successfully', async () => {
      const mockProducts = [
        { id: 'p1', name: 'Product 1', price: 3000 },
        { id: 'p2', name: 'Product 2', price: 4000 },
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: mockProducts, total: 2 }),
      });

      const planData = {
        planId: 'plan-1',
        skinType: 'oily',
        concern: 'acne',
      };

      const result = await fetchRecommendedProducts(planData);

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.products[0].metadata.source).toBe('beauty-ai');
      expect(result.products[0].metadata.planId).toBe('plan-1');
    });

    it('should handle fetch errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchRecommendedProducts({ skinType: 'dry' });

      expect(result.success).toBe(false);
      expect(result.products).toEqual([]);
      expect(result.error).toBe('Network error');
    });

    it('should handle API errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await fetchRecommendedProducts({});

      expect(result.success).toBe(false);
      expect(result.products).toEqual([]);
    });
  });

  describe('addRecommendationsToCart', () => {
    it('should add products to cart successfully', async () => {
      const products = [
        { id: 'p1', name: 'Product 1', metadata: { planId: 'plan-1', recommendedFor: 'acne' } },
        { id: 'p2', name: 'Product 2', metadata: { planId: 'plan-1', recommendedFor: 'acne' } },
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cartId: 'cart-123' }),
      });

      const result = await addRecommendationsToCart(products);

      expect(result.success).toBe(true);
      expect(result.cartId).toBe('cart-123');
      expect(result.itemsAdded).toBe(2);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/cart/bulk-add',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle cart errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Cart error'));

      const result = await addRecommendationsToCart([{ id: 'p1' }]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cart error');
    });
  });

  describe('trackProductClick', () => {
    it('should track product clicks', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });

      const product = {
        id: 'p1',
        name: 'Product 1',
        metadata: { planId: 'plan-1' },
      };

      await trackProductClick(product);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/analytics/events',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('beauty_ai_product_click'),
        })
      );
    });

    it('should fail silently on analytics errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Analytics down'));

      const product = { id: 'p1', name: 'Product 1' };

      // Should not throw
      await expect(trackProductClick(product)).resolves.toBeUndefined();
    });
  });

  describe('createBeautyBundle', () => {
    it('should create bundle with products', () => {
      const products = [
        { id: 'p1', price: 2000 },
        { id: 'p2', price: 3000 },
      ];

      const planData = {
        planId: 'plan-1',
        skinType: 'oily',
        concern: 'acne',
      };

      const bundle = createBeautyBundle(products, planData);

      expect(bundle.id).toContain('bundle-plan-1');
      expect(bundle.name).toBe('acne Care Bundle');
      expect(bundle.description).toBe('Curated bundle for oily skin');
      expect(bundle.products).toEqual(products);
      expect(bundle.totalPrice).toBe(5000);
      expect(bundle.discount).toBe(0.05); // 2 items = 5% discount
      expect(bundle.tags).toContain('beauty-ai-bundle');
    });

    it('should calculate correct discounts', () => {
      const products2 = [{ price: 1000 }, { price: 1000 }];
      const bundle2 = createBeautyBundle(products2, {});
      expect(bundle2.discount).toBe(0.05); // 5% for 2 items

      const products3 = [{ price: 1000 }, { price: 1000 }, { price: 1000 }];
      const bundle3 = createBeautyBundle(products3, {});
      expect(bundle3.discount).toBe(0.10); // 10% for 3 items

      const products5 = Array(5).fill({ price: 1000 });
      const bundle5 = createBeautyBundle(products5, {});
      expect(bundle5.discount).toBe(0.15); // 15% for 5+ items
    });
  });

  describe('generateProductDeepLink', () => {
    it('should generate deep link with query params', () => {
      const product = {
        id: 'p1',
        metadata: { planId: 'plan-1' },
      };

      const link = generateProductDeepLink(product, 'beauty-ai');

      expect(link).toContain('/ecommerce/product?');
      expect(link).toContain('id=p1');
      expect(link).toContain('source=beauty-ai');
      expect(link).toContain('ref=beauty-ai-recommendation');
      expect(link).toContain('planId=plan-1');
    });

    it('should work without planId', () => {
      const product = { id: 'p1', metadata: {} };

      const link = generateProductDeepLink(product);

      expect(link).toContain('id=p1');
      expect(link).not.toContain('planId=');
    });
  });

  describe('isEcommerceAvailable', () => {
    it('should return true when e-commerce is available', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });

      const result = await isEcommerceAvailable();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/ecommerce/health', { method: 'HEAD' });
    });

    it('should return false when e-commerce is unavailable', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false });

      const result = await isEcommerceAvailable();

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await isEcommerceAvailable();

      expect(result).toBe(false);
    });
  });
});
