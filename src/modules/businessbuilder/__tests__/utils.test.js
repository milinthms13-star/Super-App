/**
 * Unit tests for BusinessBuilder utility functions
 */

describe('BusinessBuilder Utilities', () => {
  describe('formatINR', () => {
    const formatINR = (value) =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(Number(value) || 0);

    test('formats positive numbers correctly', () => {
      expect(formatINR(1000)).toBe('₹1,000');
      expect(formatINR(100000)).toBe('₹1,00,000');
      expect(formatINR(1000000)).toBe('₹10,00,000');
    });

    test('formats zero correctly', () => {
      expect(formatINR(0)).toBe('₹0');
    });

    test('formats negative numbers correctly', () => {
      expect(formatINR(-1000)).toBe('-₹1,000');
    });

    test('handles invalid input', () => {
      expect(formatINR(null)).toBe('₹0');
      expect(formatINR(undefined)).toBe('₹0');
      expect(formatINR('invalid')).toBe('₹0');
    });

    test('rounds decimal values', () => {
      expect(formatINR(1000.99)).toBe('₹1,001');
      expect(formatINR(1000.49)).toBe('₹1,000');
    });
  });

  describe('parseNumber', () => {
    const parseNumber = (value) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : 0;
    };

    test('parses valid numbers', () => {
      expect(parseNumber('100')).toBe(100);
      expect(parseNumber('1000.50')).toBe(1000.50);
      expect(parseNumber(500)).toBe(500);
    });

    test('returns 0 for invalid input', () => {
      expect(parseNumber('abc')).toBe(0);
      expect(parseNumber(null)).toBe(0);
      expect(parseNumber(undefined)).toBe(0);
      expect(parseNumber('')).toBe(0);
    });

    test('handles negative numbers', () => {
      expect(parseNumber('-100')).toBe(-100);
    });

    test('handles edge cases', () => {
      expect(parseNumber(Infinity)).toBe(0);
      expect(parseNumber(-Infinity)).toBe(0);
      expect(parseNumber(NaN)).toBe(0);
    });
  });

  describe('hasValue', () => {
    const hasValue = (value) => {
      if (value == null) return false;
      if (typeof value === 'number') return value > 0;
      return String(value).trim().length > 0;
    };

    test('returns true for valid values', () => {
      expect(hasValue('text')).toBe(true);
      expect(hasValue(100)).toBe(true);
      expect(hasValue('  text  ')).toBe(true);
    });

    test('returns false for empty values', () => {
      expect(hasValue('')).toBe(false);
      expect(hasValue('   ')).toBe(false);
      expect(hasValue(null)).toBe(false);
      expect(hasValue(undefined)).toBe(false);
      expect(hasValue(0)).toBe(false);
    });

    test('handles edge cases', () => {
      expect(hasValue(-1)).toBe(false);
      expect(hasValue(false)).toBe(false);
      expect(hasValue(true)).toBe(true);
    });
  });

  describe('cleanSlug', () => {
    const cleanSlug = (value) =>
      String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');

    test('converts to lowercase', () => {
      expect(cleanSlug('MySlug')).toBe('myslug');
      expect(cleanSlug('UPPERCASE')).toBe('uppercase');
    });

    test('removes invalid characters', () => {
      expect(cleanSlug('my slug!')).toBe('myslug');
      expect(cleanSlug('test@#$%slug')).toBe('testslug');
    });

    test('replaces spaces with empty string', () => {
      expect(cleanSlug('my business')).toBe('mybusiness');
    });

    test('removes multiple consecutive hyphens', () => {
      expect(cleanSlug('my---slug')).toBe('my-slug');
      expect(cleanSlug('test----name')).toBe('test-name');
    });

    test('removes leading and trailing hyphens', () => {
      expect(cleanSlug('-myslug-')).toBe('myslug');
      expect(cleanSlug('---test---')).toBe('test');
    });

    test('handles empty input', () => {
      expect(cleanSlug('')).toBe('');
      expect(cleanSlug(null)).toBe('');
      expect(cleanSlug(undefined)).toBe('');
    });

    test('preserves valid slugs', () => {
      expect(cleanSlug('valid-slug')).toBe('valid-slug');
      expect(cleanSlug('my-store-123')).toBe('my-store-123');
    });
  });

  describe('Email Validation', () => {
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    test('validates correct email formats', () => {
      expect(EMAIL_REGEX.test('test@example.com')).toBe(true);
      expect(EMAIL_REGEX.test('user.name@domain.co.in')).toBe(true);
      expect(EMAIL_REGEX.test('test123@test.org')).toBe(true);
    });

    test('rejects invalid email formats', () => {
      expect(EMAIL_REGEX.test('invalid')).toBe(false);
      expect(EMAIL_REGEX.test('test@')).toBe(false);
      expect(EMAIL_REGEX.test('@example.com')).toBe(false);
      expect(EMAIL_REGEX.test('test @example.com')).toBe(false);
      expect(EMAIL_REGEX.test('')).toBe(false);
    });
  });

  describe('Phone Validation', () => {
    const PHONE_REGEX = /^[6-9]\d{9}$/;

    test('validates correct Indian phone numbers', () => {
      expect(PHONE_REGEX.test('9876543210')).toBe(true);
      expect(PHONE_REGEX.test('8765432109')).toBe(true);
      expect(PHONE_REGEX.test('7654321098')).toBe(true);
      expect(PHONE_REGEX.test('6543210987')).toBe(true);
    });

    test('rejects invalid phone numbers', () => {
      expect(PHONE_REGEX.test('123456789')).toBe(false); // Too short
      expect(PHONE_REGEX.test('12345678901')).toBe(false); // Too long
      expect(PHONE_REGEX.test('5876543210')).toBe(false); // Starts with 5
      expect(PHONE_REGEX.test('1234567890')).toBe(false); // Starts with 1
      expect(PHONE_REGEX.test('987654321a')).toBe(false); // Contains letter
      expect(PHONE_REGEX.test('')).toBe(false); // Empty
    });
  });

  describe('GSTIN Validation', () => {
    const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

    test('validates correct GSTIN format', () => {
      expect(GSTIN_REGEX.test('22AAAAA0000A1Z5')).toBe(true);
      expect(GSTIN_REGEX.test('29ABCDE1234F1Z8')).toBe(true);
    });

    test('rejects invalid GSTIN format', () => {
      expect(GSTIN_REGEX.test('1AAAAAA0000A1Z5')).toBe(false); // Single digit state code
      expect(GSTIN_REGEX.test('22aaaaa0000A1Z5')).toBe(false); // Lowercase letters
      expect(GSTIN_REGEX.test('22AAAAA00001Z5')).toBe(false); // Wrong length
      expect(GSTIN_REGEX.test('22AAAAA0000A0Z5')).toBe(false); // Invalid checksum digit
      expect(GSTIN_REGEX.test('')).toBe(false); // Empty
    });
  });

  describe('PIN Code Validation', () => {
    const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

    test('validates correct PIN codes', () => {
      expect(PINCODE_REGEX.test('110001')).toBe(true);
      expect(PINCODE_REGEX.test('560001')).toBe(true);
      expect(PINCODE_REGEX.test('400001')).toBe(true);
    });

    test('rejects invalid PIN codes', () => {
      expect(PINCODE_REGEX.test('011001')).toBe(false); // Starts with 0
      expect(PINCODE_REGEX.test('12345')).toBe(false); // Too short
      expect(PINCODE_REGEX.test('1234567')).toBe(false); // Too long
      expect(PINCODE_REGEX.test('11000a')).toBe(false); // Contains letter
      expect(PINCODE_REGEX.test('')).toBe(false); // Empty
    });
  });

  describe('Slug Validation', () => {
    const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    test('validates correct slug formats', () => {
      expect(SLUG_REGEX.test('valid-slug')).toBe(true);
      expect(SLUG_REGEX.test('my-store')).toBe(true);
      expect(SLUG_REGEX.test('test-123')).toBe(true);
      expect(SLUG_REGEX.test('singleword')).toBe(true);
    });

    test('rejects invalid slug formats', () => {
      expect(SLUG_REGEX.test('Invalid-Slug')).toBe(false); // Uppercase
      expect(SLUG_REGEX.test('my--slug')).toBe(false); // Double hyphen
      expect(SLUG_REGEX.test('-myslug')).toBe(false); // Leading hyphen
      expect(SLUG_REGEX.test('myslug-')).toBe(false); // Trailing hyphen
      expect(SLUG_REGEX.test('my slug')).toBe(false); // Space
      expect(SLUG_REGEX.test('my_slug')).toBe(false); // Underscore
      expect(SLUG_REGEX.test('')).toBe(false); // Empty
    });
  });

  describe('Reserved Slugs', () => {
    const RESERVED_SLUGS = new Set([
      'admin',
      'api',
      'app',
      'assets',
      'auth',
      'billing',
      'checkout',
      'dashboard',
      'help',
      'login',
      'logout',
      'orders',
      'payment',
      'public',
      'settings',
      'support',
    ]);

    test('identifies reserved slugs', () => {
      expect(RESERVED_SLUGS.has('admin')).toBe(true);
      expect(RESERVED_SLUGS.has('login')).toBe(true);
      expect(RESERVED_SLUGS.has('api')).toBe(true);
    });

    test('allows non-reserved slugs', () => {
      expect(RESERVED_SLUGS.has('my-store')).toBe(false);
      expect(RESERVED_SLUGS.has('business')).toBe(false);
      expect(RESERVED_SLUGS.has('custom')).toBe(false);
    });
  });

  describe('buildPlanFromInputs', () => {
    const buildPlanFromInputs = ({ businessForm, launchForm, costForm }) => {
      const businessName = businessForm.businessName || 'Your business';
      const oneTimeInvestment = (costForm.inventory || 0) + (costForm.licenseCost || 0) + (costForm.equipment || 0);
      const monthlyExpenses =
        (costForm.rent || 0) +
        (costForm.staffSalary || 0) +
        (costForm.marketing || 0) +
        (costForm.utilities || 0) +
        (costForm.otherMonthly || 0);
      const targetRevenue = Math.max(costForm.expectedMonthlyRevenue || 0, monthlyExpenses * 1.35);
      const projectedProfit = targetRevenue - monthlyExpenses;
      const breakEvenMonths = projectedProfit > 0 ? Math.ceil(oneTimeInvestment / projectedProfit) : null;

      return {
        businessName,
        oneTimeInvestment,
        monthlyExpenses,
        targetRevenue,
        projectedProfit,
        breakEvenMonths,
      };
    };

    test('calculates basic plan metrics', () => {
      const plan = buildPlanFromInputs({
        businessForm: { businessName: 'Test Business' },
        launchForm: {},
        costForm: {
          inventory: 10000,
          licenseCost: 5000,
          equipment: 15000,
          rent: 5000,
          staffSalary: 10000,
          marketing: 2000,
          utilities: 1000,
          otherMonthly: 2000,
          expectedMonthlyRevenue: 50000,
        },
      });

      expect(plan.businessName).toBe('Test Business');
      expect(plan.oneTimeInvestment).toBe(30000);
      expect(plan.monthlyExpenses).toBe(20000);
      expect(plan.targetRevenue).toBe(50000);
      expect(plan.projectedProfit).toBe(30000);
      expect(plan.breakEvenMonths).toBe(1);
    });

    test('handles zero values', () => {
      const plan = buildPlanFromInputs({
        businessForm: {},
        launchForm: {},
        costForm: {},
      });

      expect(plan.businessName).toBe('Your business');
      expect(plan.oneTimeInvestment).toBe(0);
      expect(plan.monthlyExpenses).toBe(0);
      expect(plan.breakEvenMonths).toBeNull();
    });

    test('calculates break-even correctly', () => {
      const plan = buildPlanFromInputs({
        businessForm: {},
        launchForm: {},
        costForm: {
          inventory: 100000,
          rent: 10000,
          staffSalary: 20000,
          expectedMonthlyRevenue: 50000,
        },
      });

      expect(plan.oneTimeInvestment).toBe(100000);
      expect(plan.monthlyExpenses).toBe(30000);
      expect(plan.projectedProfit).toBe(20000);
      expect(plan.breakEvenMonths).toBe(5);
    });

    test('returns null for break-even when profit is negative', () => {
      const plan = buildPlanFromInputs({
        businessForm: {},
        launchForm: {},
        costForm: {
          inventory: 50000,
          rent: 10000,
          expectedMonthlyRevenue: 5000,
        },
      });

      expect(plan.projectedProfit).toBeLessThan(0);
      expect(plan.breakEvenMonths).toBeNull();
    });
  });

  describe('validateBusinessForm', () => {
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const PHONE_REGEX = /^[6-9]\d{9}$/;
    const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
    const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

    const hasValue = (value) => {
      if (value == null) return false;
      if (typeof value === 'number') return value > 0;
      return String(value).trim().length > 0;
    };

    const validateBusinessForm = (form = {}) => {
      const errors = {};
      if (!hasValue(form.businessName)) {
        errors.businessName = 'Business name is required.';
      }
      if (!hasValue(form.phone)) {
        errors.phone = 'Phone number is required.';
      } else if (!PHONE_REGEX.test(String(form.phone).trim())) {
        errors.phone = 'Enter a valid 10-digit Indian mobile number.';
      }
      if (!hasValue(form.email)) {
        errors.email = 'Email is required.';
      } else if (!EMAIL_REGEX.test(String(form.email).trim())) {
        errors.email = 'Enter a valid email address.';
      }
      if (hasValue(form.gstin) && !GSTIN_REGEX.test(String(form.gstin).trim().toUpperCase())) {
        errors.gstin = 'Enter a valid GSTIN format.';
      }
      if (hasValue(form.addressPincode) && !PINCODE_REGEX.test(String(form.addressPincode).trim())) {
        errors.addressPincode = 'PIN code must be 6 digits.';
      }
      return errors;
    };

    test('validates required fields', () => {
      const errors = validateBusinessForm({});
      
      expect(errors.businessName).toBe('Business name is required.');
      expect(errors.phone).toBe('Phone number is required.');
      expect(errors.email).toBe('Email is required.');
    });

    test('validates phone format', () => {
      const errors = validateBusinessForm({
        businessName: 'Test',
        phone: '123',
        email: 'test@example.com',
      });
      
      expect(errors.phone).toBe('Enter a valid 10-digit Indian mobile number.');
    });

    test('validates email format', () => {
      const errors = validateBusinessForm({
        businessName: 'Test',
        phone: '9876543210',
        email: 'invalid-email',
      });
      
      expect(errors.email).toBe('Enter a valid email address.');
    });

    test('validates GSTIN format when provided', () => {
      const errors = validateBusinessForm({
        businessName: 'Test',
        phone: '9876543210',
        email: 'test@example.com',
        gstin: 'INVALID',
      });
      
      expect(errors.gstin).toBe('Enter a valid GSTIN format.');
    });

    test('validates PIN code format when provided', () => {
      const errors = validateBusinessForm({
        businessName: 'Test',
        phone: '9876543210',
        email: 'test@example.com',
        addressPincode: '12345',
      });
      
      expect(errors.addressPincode).toBe('PIN code must be 6 digits.');
    });

    test('returns no errors for valid form', () => {
      const errors = validateBusinessForm({
        businessName: 'Test Business',
        phone: '9876543210',
        email: 'test@example.com',
      });
      
      expect(Object.keys(errors)).toHaveLength(0);
    });

    test('does not validate optional fields when empty', () => {
      const errors = validateBusinessForm({
        businessName: 'Test Business',
        phone: '9876543210',
        email: 'test@example.com',
        gstin: '',
        addressPincode: '',
      });
      
      expect(errors.gstin).toBeUndefined();
      expect(errors.addressPincode).toBeUndefined();
    });
  });
});
