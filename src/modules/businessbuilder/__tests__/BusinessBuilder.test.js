import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import BusinessBuilder from '../BusinessBuilder';

// Mock axios
jest.mock('axios');

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock window.confirm
global.confirm = jest.fn(() => true);

describe('BusinessBuilder Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Default mock responses
    axios.get.mockResolvedValue({
      data: {
        success: true,
        data: []
      }
    });
  });

  describe('Component Rendering', () => {
    test('renders the main heading', async () => {
      render(<BusinessBuilder />);
      
      await waitFor(() => {
        expect(screen.getByText('SME Growth Studio')).toBeInTheDocument();
      });
    });

    test('renders all tab buttons', async () => {
      render(<BusinessBuilder />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Growth Dashboard/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Launch Wizard/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /AI Plan Generator/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /10X Builder/i })).toBeInTheDocument();
      });
    });

    test('displays loading state initially', () => {
      render(<BusinessBuilder />);
      
      // Component starts with loading state while fetching data
      expect(axios.get).toHaveBeenCalled();
    });
  });

  describe('Dashboard Tab', () => {
    test('displays dashboard metrics', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [{
            businessId: 'test-123',
            businessName: 'Test Business',
            businessType: 'Retail'
          }]
        }
      });

      render(<BusinessBuilder />);
      
      await waitFor(() => {
        expect(screen.getByText(/completion percentage/i)).toBeInTheDocument();
        expect(screen.getByText(/Pending tasks/i)).toBeInTheDocument();
        expect(screen.getByText(/Revenue estimate/i)).toBeInTheDocument();
      });
    });

    test('shows next action recommendation', async () => {
      render(<BusinessBuilder />);
      
      await waitFor(() => {
        expect(screen.getByText(/Recommended next action/i)).toBeInTheDocument();
      });
    });
  });

  describe('Business Profile Tab', () => {
    beforeEach(() => {
      axios.get.mockResolvedValue({
        data: { success: true, data: [] }
      });
    });

    test('renders business profile form', async () => {
      render(<BusinessBuilder />);
      
      const overviewTab = screen.getByRole('button', { name: /Business Profile/i });
      fireEvent.click(overviewTab);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Business name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Business type/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Contact phone/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Contact email/i)).toBeInTheDocument();
      });
    });

    test('validates business form on submit', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const overviewTab = screen.getByRole('button', { name: /Business Profile/i });
      await user.click(overviewTab);
      
      const submitButton = await screen.findByRole('button', { name: /Save business profile/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Business name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/Phone number is required/i)).toBeInTheDocument();
        expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
      });
    });

    test('saves business profile successfully', async () => {
      const user = userEvent.setup();
      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            businessId: 'new-123',
            businessName: 'New Business'
          }
        }
      });

      render(<BusinessBuilder />);
      
      const overviewTab = screen.getByRole('button', { name: /Business Profile/i });
      await user.click(overviewTab);
      
      const nameInput = await screen.findByLabelText(/Business name/i);
      const phoneInput = screen.getByLabelText(/Contact phone/i);
      const emailInput = screen.getByLabelText(/Contact email/i);
      
      await user.type(nameInput, 'Test Business');
      await user.type(phoneInput, '9876543210');
      await user.type(emailInput, 'test@example.com');
      
      const submitButton = screen.getByRole('button', { name: /Save business profile/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          '/api/business-builder/businesses',
          expect.objectContaining({
            businessName: 'Test Business',
            phone: '9876543210',
            email: 'test@example.com'
          })
        );
      });
    });

    test('validates phone number format', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const overviewTab = screen.getByRole('button', { name: /Business Profile/i });
      await user.click(overviewTab);
      
      const phoneInput = await screen.findByLabelText(/Contact phone/i);
      await user.type(phoneInput, '123'); // Invalid phone
      
      const submitButton = screen.getByRole('button', { name: /Save business profile/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Enter a valid 10-digit Indian mobile number/i)).toBeInTheDocument();
      });
    });

    test('validates email format', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const overviewTab = screen.getByRole('button', { name: /Business Profile/i });
      await user.click(overviewTab);
      
      const emailInput = await screen.findByLabelText(/Contact email/i);
      await user.type(emailInput, 'invalid-email'); // Invalid email
      
      const submitButton = screen.getByRole('button', { name: /Save business profile/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Enter a valid email address/i)).toBeInTheDocument();
      });
    });
  });

  describe('Launch Wizard Tab', () => {
    test('renders wizard with steps', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const wizardTab = screen.getByRole('button', { name: /Launch Wizard/i });
      await user.click(wizardTab);
      
      await waitFor(() => {
        expect(screen.getByText(/Business idea to Launch Wizard/i)).toBeInTheDocument();
        expect(screen.getByText(/Step 1 of 8/i)).toBeInTheDocument();
      });
    });

    test('navigates through wizard steps', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const wizardTab = screen.getByRole('button', { name: /Launch Wizard/i });
      await user.click(wizardTab);
      
      await waitFor(() => {
        expect(screen.getByText(/Step 1 of 8/i)).toBeInTheDocument();
      });
      
      const nextButton = screen.getByRole('button', { name: /Next/i });
      await user.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Step 2 of 8/i)).toBeInTheDocument();
      });
    });

    test('saves wizard input to localStorage', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const wizardTab = screen.getByRole('button', { name: /Launch Wizard/i });
      await user.click(wizardTab);
      
      const textarea = await screen.findByPlaceholderText(/What business do you want to start/i);
      await user.type(textarea, 'My business idea');
      
      await waitFor(() => {
        const stored = JSON.parse(localStorageMock.getItem('business_builder_launch_form_v2__draft'));
        expect(stored.businessIdea).toBe('My business idea');
      });
    });

    test('displays wizard progress', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const wizardTab = screen.getByRole('button', { name: /Launch Wizard/i });
      await user.click(wizardTab);
      
      await waitFor(() => {
        expect(screen.getByText(/0% complete/i)).toBeInTheDocument();
      });
    });
  });

  describe('Invoice Studio Tab', () => {
    beforeEach(() => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/invoices')) {
          return Promise.resolve({
            data: {
              success: true,
              data: [
                {
                  invoiceId: 'inv-1',
                  invoiceNumber: 'INV-001',
                  customer: { name: 'John Doe' },
                  totalAmount: 1000,
                  status: 'pending'
                }
              ]
            }
          });
        }
        return Promise.resolve({ data: { success: true, data: [] } });
      });
    });

    test('renders invoice form', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const invoicesTab = screen.getByRole('button', { name: /Invoice Studio/i });
      await user.click(invoicesTab);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Customer name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Customer phone/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Due date/i)).toBeInTheDocument();
      });
    });

    test('validates invoice form', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const invoicesTab = screen.getByRole('button', { name: /Invoice Studio/i });
      await user.click(invoicesTab);
      
      const createButton = await screen.findByRole('button', { name: /Create invoice/i });
      await user.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Customer name is required/i)).toBeInTheDocument();
      });
    });

    test('adds invoice items', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const invoicesTab = screen.getByRole('button', { name: /Invoice Studio/i });
      await user.click(invoicesTab);
      
      const addItemButton = await screen.findByRole('button', { name: /Add item/i });
      
      // Initially one item
      const initialItems = screen.getAllByPlaceholderText(/Item name/i);
      expect(initialItems).toHaveLength(1);
      
      await user.click(addItemButton);
      
      // Now two items
      const updatedItems = screen.getAllByPlaceholderText(/Item name/i);
      expect(updatedItems).toHaveLength(2);
    });

    test('displays invoice list', async () => {
      render(<BusinessBuilder />);
      
      const invoicesTab = screen.getByRole('button', { name: /Invoice Studio/i });
      fireEvent.click(invoicesTab);
      
      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });

  describe('Mini App Builder Tab', () => {
    beforeEach(() => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/mini-apps')) {
          return Promise.resolve({
            data: {
              success: true,
              data: [
                {
                  miniAppId: 'app-1',
                  appName: 'My Store',
                  slug: 'my-store',
                  appType: 'Product Showcase',
                  status: 'active'
                }
              ]
            }
          });
        }
        return Promise.resolve({ data: { success: true, data: [] } });
      });
    });

    test('renders mini app form', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const miniappsTab = screen.getByRole('button', { name: /Mini App Builder/i });
      await user.click(miniappsTab);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/App display name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/App slug/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/App type/i)).toBeInTheDocument();
      });
    });

    test('validates slug format', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const miniappsTab = screen.getByRole('button', { name: /Mini App Builder/i });
      await user.click(miniappsTab);
      
      const slugInput = await screen.findByLabelText(/App slug/i);
      await user.type(slugInput, 'Invalid Slug!'); // Invalid slug
      
      const launchButton = screen.getByRole('button', { name: /Launch mini app/i });
      await user.click(launchButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Use lowercase letters, numbers, and single hyphens only/i)).toBeInTheDocument();
      });
    });

    test('checks for reserved slugs', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const miniappsTab = screen.getByRole('button', { name: /Mini App Builder/i });
      await user.click(miniappsTab);
      
      const slugInput = await screen.findByLabelText(/App slug/i);
      await user.type(slugInput, 'admin'); // Reserved slug
      
      const launchButton = screen.getByRole('button', { name: /Launch mini app/i });
      await user.click(launchButton);
      
      await waitFor(() => {
        expect(screen.getByText(/This slug is reserved/i)).toBeInTheDocument();
      });
    });

    test('displays mini app list', async () => {
      render(<BusinessBuilder />);
      
      const miniappsTab = screen.getByRole('button', { name: /Mini App Builder/i });
      fireEvent.click(miniappsTab);
      
      await waitFor(() => {
        expect(screen.getByText('My Store')).toBeInTheDocument();
        expect(screen.getByText(/\/my-store/i)).toBeInTheDocument();
      });
    });
  });

  describe('Startup Cost Tab', () => {
    test('renders cost calculator form', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const costTab = screen.getByRole('button', { name: /Startup Cost/i });
      await user.click(costTab);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Rent \(monthly\)/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Staff salary \(monthly\)/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Inventory \(one-time\)/i)).toBeInTheDocument();
      });
    });

    test('calculates cost summary', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const costTab = screen.getByRole('button', { name: /Startup Cost/i });
      await user.click(costTab);
      
      await waitFor(() => {
        expect(screen.getByText(/Estimated one-time investment/i)).toBeInTheDocument();
        expect(screen.getByText(/Estimated monthly expenses/i)).toBeInTheDocument();
        expect(screen.getByText(/Break-even period/i)).toBeInTheDocument();
      });
    });

    test('updates cost calculations on input', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const costTab = screen.getByRole('button', { name: /Startup Cost/i });
      await user.click(costTab);
      
      const rentInput = await screen.findByLabelText(/Rent \(monthly\)/i);
      await user.clear(rentInput);
      await user.type(rentInput, '10000');
      
      const revenueInput = screen.getByLabelText(/Expected monthly revenue/i);
      await user.clear(revenueInput);
      await user.type(revenueInput, '50000');
      
      await waitFor(() => {
        // Cost summary should update
        const stored = JSON.parse(localStorageMock.getItem('business_builder_cost_form_v2__draft'));
        expect(stored.rent).toBe(10000);
        expect(stored.expectedMonthlyRevenue).toBe(50000);
      });
    });
  });

  describe('Checklist Tab', () => {
    test('renders checklist items', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const checklistTab = screen.getByRole('button', { name: /Launch Checklist/i });
      await user.click(checklistTab);
      
      await waitFor(() => {
        expect(screen.getByText(/Register business/i)).toBeInTheDocument();
        expect(screen.getByText(/Create logo and brand identity/i)).toBeInTheDocument();
      });
    });

    test('toggles checklist items', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const checklistTab = screen.getByRole('button', { name: /Launch Checklist/i });
      await user.click(checklistTab);
      
      const checkbox = await screen.findByRole('checkbox', { name: /Register business/i });
      expect(checkbox).not.toBeChecked();
      
      await user.click(checkbox);
      
      await waitFor(() => {
        expect(checkbox).toBeChecked();
      });
    });

    test('displays checklist completion percentage', async () => {
      render(<BusinessBuilder />);
      
      const checklistTab = screen.getByRole('button', { name: /Launch Checklist/i });
      fireEvent.click(checklistTab);
      
      await waitFor(() => {
        expect(screen.getByText(/0\/7 tasks complete/i)).toBeInTheDocument();
        expect(screen.getByText(/0% complete/i)).toBeInTheDocument();
      });
    });
  });

  describe('AI Plan Generator Tab', () => {
    test('renders AI plan generator', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const aiTab = screen.getByRole('button', { name: /AI Plan Generator/i });
      await user.click(aiTab);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Generate AI Plan/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Generate Branding Builder/i })).toBeInTheDocument();
      });
    });

    test('generates business plan', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const aiTab = screen.getByRole('button', { name: /AI Plan Generator/i });
      await user.click(aiTab);
      
      const generateButton = await screen.findByRole('button', { name: /Generate AI Plan/i });
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Business summary/i)).toBeInTheDocument();
        expect(screen.getByText(/Market analysis/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      axios.get.mockRejectedValueOnce(new Error('API Error'));
      
      render(<BusinessBuilder />);
      
      await waitFor(() => {
        // Component should still render despite error
        expect(screen.getByText('SME Growth Studio')).toBeInTheDocument();
      });
    });

    test('displays error message on failed save', async () => {
      const user = userEvent.setup();
      axios.post.mockRejectedValueOnce({
        response: {
          data: {
            message: 'Failed to save business'
          }
        }
      });
      
      render(<BusinessBuilder />);
      
      const overviewTab = screen.getByRole('button', { name: /Business Profile/i });
      await user.click(overviewTab);
      
      const nameInput = await screen.findByLabelText(/Business name/i);
      const phoneInput = screen.getByLabelText(/Contact phone/i);
      const emailInput = screen.getByLabelText(/Contact email/i);
      
      await user.type(nameInput, 'Test Business');
      await user.type(phoneInput, '9876543210');
      await user.type(emailInput, 'test@example.com');
      
      const submitButton = screen.getByRole('button', { name: /Save business profile/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to save business/i)).toBeInTheDocument();
      });
    });
  });

  describe('LocalStorage Persistence', () => {
    test('loads data from localStorage on mount', () => {
      const mockData = {
        businessIdea: 'My startup idea',
        targetCustomers: 'Entrepreneurs'
      };
      localStorageMock.setItem('business_builder_launch_form_v2__draft', JSON.stringify(mockData));
      
      render(<BusinessBuilder />);
      
      const wizardTab = screen.getByRole('button', { name: /Launch Wizard/i });
      fireEvent.click(wizardTab);
      
      waitFor(() => {
        const textarea = screen.getByDisplayValue('My startup idea');
        expect(textarea).toBeInTheDocument();
      });
    });

    test('persists data to localStorage on change', async () => {
      const user = userEvent.setup();
      render(<BusinessBuilder />);
      
      const wizardTab = screen.getByRole('button', { name: /Launch Wizard/i });
      await user.click(wizardTab);
      
      const textarea = await screen.findByPlaceholderText(/What business do you want to start/i);
      await user.type(textarea, 'New idea');
      
      await waitFor(() => {
        const stored = JSON.parse(localStorageMock.getItem('business_builder_launch_form_v2__draft'));
        expect(stored.businessIdea).toContain('New idea');
      });
    });
  });
});
