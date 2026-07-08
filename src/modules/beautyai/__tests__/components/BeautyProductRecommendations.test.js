/**
 * BeautyProductRecommendations Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BeautyProductRecommendations from '../../components/BeautyProductRecommendations';
import * as ecommerceIntegration from '../../services/ecommerceIntegration';
import { BUDGET_LEVELS, PRODUCT_CATEGORIES } from '../../data/beautyaiConstants';

// Mock the e-commerce integration
jest.mock('../../services/ecommerceIntegration', () => ({
  fetchRecommendedProducts: jest.fn(),
  addRecommendationsToCart: jest.fn(),
  trackProductClick: jest.fn(),
  generateProductDeepLink: jest.fn(),
  createBeautyBundle: jest.fn(),
  isEcommerceAvailable: jest.fn(),
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('BeautyProductRecommendations', () => {
  const mockProducts = [
    {
      id: 'p1',
      name: 'Vitamin C Serum',
      category: PRODUCT_CATEGORIES.SERUM,
      price: 2500,
      currency: 'INR',
      brand: 'Test Brand',
      rating: 4.5,
      reviewCount: 120,
      description: 'Brightening serum',
      imageUrl: '/test-image.jpg',
    },
    {
      id: 'p2',
      name: 'Moisturizer',
      category: PRODUCT_CATEGORIES.MOISTURIZER,
      price: 1500,
      currency: 'INR',
      brand: 'Test Brand 2',
      rating: 4.0,
      reviewCount: 80,
    },
  ];

  const mockPlan = {
    id: 'plan-1',
    profile: {
      skinType: 'oily',
      primaryConcern: 'acne',
      concerns: ['dark spots'],
      budget: BUDGET_LEVELS.MEDIUM,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ecommerceIntegration.isEcommerceAvailable.mockResolvedValue(false);
    ecommerceIntegration.fetchRecommendedProducts.mockResolvedValue({
      success: true,
      products: [],
    });
  });

  const renderComponent = (props = {}) => {
    return render(
      <BrowserRouter>
        <BeautyProductRecommendations
          products={mockProducts}
          budget={BUDGET_LEVELS.MEDIUM}
          onBudgetChange={jest.fn()}
          {...props}
        />
      </BrowserRouter>
    );
  };

  describe('Rendering', () => {
    it('should render product recommendations', () => {
      renderComponent();
      
      expect(screen.getByText('🛍️ Recommended Products')).toBeInTheDocument();
      expect(screen.getByText('Vitamin C Serum')).toBeInTheDocument();
      expect(screen.getByText('Moisturizer')).toBeInTheDocument();
    });

    it('should show empty state when no products', () => {
      renderComponent({ products: [] });
      
      expect(screen.getByText(/No product recommendations available/)).toBeInTheDocument();
    });

    it('should show loading state', async () => {
      ecommerceIntegration.isEcommerceAvailable.mockResolvedValue(true);
      ecommerceIntegration.fetchRecommendedProducts.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, products: [] }), 100))
      );

      renderComponent({ plan: mockPlan });

      await waitFor(() => {
        expect(screen.getByText(/Loading products/)).toBeInTheDocument();
      });
    });

    it('should display product prices correctly', () => {
      renderComponent();
      
      expect(screen.getByText('₹2,500')).toBeInTheDocument();
      expect(screen.getByText('₹1,500')).toBeInTheDocument();
    });

    it('should display product ratings', () => {
      renderComponent();
      
      expect(screen.getByText('(4.5)')).toBeInTheDocument();
      expect(screen.getByText('(4.0)')).toBeInTheDocument();
    });
  });

  describe('Budget Selection', () => {
    it('should render budget options', () => {
      const onBudgetChange = jest.fn();
      renderComponent({ onBudgetChange });
      
      expect(screen.getByText('Budget-Friendly')).toBeInTheDocument();
      expect(screen.getByText('Mid-Range')).toBeInTheDocument();
      expect(screen.getByText('Premium')).toBeInTheDocument();
    });

    it('should call onBudgetChange when budget is changed', () => {
      const onBudgetChange = jest.fn();
      renderComponent({ budget: BUDGET_LEVELS.LOW, onBudgetChange });
      
      const premiumButton = screen.getByText('Premium');
      fireEvent.click(premiumButton);
      
      expect(onBudgetChange).toHaveBeenCalledWith(BUDGET_LEVELS.HIGH);
    });

    it('should highlight active budget', () => {
      renderComponent({ budget: BUDGET_LEVELS.HIGH });
      
      const premiumButton = screen.getByText('Premium').closest('button');
      expect(premiumButton).toHaveClass('active');
    });
  });

  describe('Category Filtering', () => {
    it('should filter products by category', () => {
      renderComponent();
      
      const categorySelect = screen.getByLabelText('Category:');
      fireEvent.change(categorySelect, { target: { value: PRODUCT_CATEGORIES.SERUM } });
      
      expect(screen.getByText('Vitamin C Serum')).toBeInTheDocument();
      expect(screen.queryByText('Moisturizer')).not.toBeInTheDocument();
    });

    it('should show all products when "all" is selected', () => {
      renderComponent();
      
      const categorySelect = screen.getByLabelText('Category:');
      fireEvent.change(categorySelect, { target: { value: 'all' } });
      
      expect(screen.getByText('Vitamin C Serum')).toBeInTheDocument();
      expect(screen.getByText('Moisturizer')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort products by price ascending', () => {
      renderComponent();
      
      const sortSelect = screen.getByLabelText('Sort by:');
      fireEvent.change(sortSelect, { target: { value: 'price-asc' } });
      
      const prices = screen.getAllByText(/₹\d/);
      expect(prices[0]).toHaveTextContent('₹1,500');
      expect(prices[1]).toHaveTextContent('₹2,500');
    });

    it('should sort products by price descending', () => {
      renderComponent();
      
      const sortSelect = screen.getByLabelText('Sort by:');
      fireEvent.change(sortSelect, { target: { value: 'price-desc' } });
      
      const prices = screen.getAllByText(/₹\d/);
      expect(prices[0]).toHaveTextContent('₹2,500');
      expect(prices[1]).toHaveTextContent('₹1,500');
    });

    it('should sort products by rating', () => {
      renderComponent();
      
      const sortSelect = screen.getByLabelText('Sort by:');
      fireEvent.change(sortSelect, { target: { value: 'rating' } });
      
      const ratings = screen.getAllByText(/\(\d\.\d\)/);
      expect(ratings[0]).toHaveTextContent('(4.5)');
    });
  });

  describe('E-commerce Integration', () => {
    it('should check e-commerce availability on mount', async () => {
      renderComponent({ plan: mockPlan });
      
      await waitFor(() => {
        expect(ecommerceIntegration.isEcommerceAvailable).toHaveBeenCalled();
      });
    });

    it('should fetch products from e-commerce when available', async () => {
      ecommerceIntegration.isEcommerceAvailable.mockResolvedValue(true);
      ecommerceIntegration.fetchRecommendedProducts.mockResolvedValue({
        success: true,
        products: [{ id: 'e1', name: 'E-commerce Product', price: 3000, category: 'serum' }],
      });

      renderComponent({ plan: mockPlan, products: [] });

      await waitFor(() => {
        expect(ecommerceIntegration.fetchRecommendedProducts).toHaveBeenCalledWith({
          planId: 'plan-1',
          skinType: 'oily',
          concern: 'acne',
          selectedConcerns: ['dark spots'],
          budget: BUDGET_LEVELS.MEDIUM,
        });
      });

      await waitFor(() => {
        expect(screen.getByText('E-commerce Product')).toBeInTheDocument();
      });
    });

    it('should show e-commerce integration indicator', async () => {
      ecommerceIntegration.isEcommerceAvailable.mockResolvedValue(true);
      
      renderComponent({ plan: mockPlan });

      await waitFor(() => {
        expect(screen.getByText(/Live e-commerce integration/)).toBeInTheDocument();
      });
    });

    it('should show bundle creation button when products available', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Create Bundle \(2 items\)/)).toBeInTheDocument();
      });
    });
  });

  describe('Product Actions', () => {
    it('should navigate to product on click', async () => {
      ecommerceIntegration.generateProductDeepLink.mockReturnValue('/ecommerce/product?id=p1');
      
      renderComponent();
      
      const productCard = screen.getByText('Vitamin C Serum').closest('.product-card');
      fireEvent.click(productCard);
      
      await waitFor(() => {
        expect(ecommerceIntegration.trackProductClick).toHaveBeenCalled();
      });
    });

    it('should add product to cart when e-commerce available', async () => {
      ecommerceIntegration.isEcommerceAvailable.mockResolvedValue(true);
      ecommerceIntegration.addRecommendationsToCart.mockResolvedValue({ success: true });
      
      renderComponent({ plan: mockPlan });

      await waitFor(() => {
        const addToCartButtons = screen.getAllByText('🛒 Add to Cart');
        expect(addToCartButtons.length).toBeGreaterThan(0);
      });
    });

    it('should handle bundle creation', async () => {
      ecommerceIntegration.createBeautyBundle.mockReturnValue({
        id: 'bundle-1',
        name: 'Beauty Bundle',
      });

      renderComponent({ plan: mockPlan });

      await waitFor(() => {
        const bundleButton = screen.getByText(/Create Bundle/);
        fireEvent.click(bundleButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/ecommerce/bundle', expect.any(Object));
    });
  });

  describe('Disclaimer', () => {
    it('should show product disclaimer', () => {
      renderComponent();
      
      expect(screen.getByText(/Always patch test new products/)).toBeInTheDocument();
    });
  });
});
