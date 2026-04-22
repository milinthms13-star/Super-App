const { calculateSpamScore, detectSuspiciousFlags, validateContentQuality } = require('../utils/spamDetector');
const { generateSlug, isValidSlug } = require('../utils/slugGenerator');
const { calculateDistance, isValidCoordinates } = require('../utils/geolocationHelper');
const {
  calculatePopularityScore,
  calculateSellerScore,
  calculateConversionRate,
} = require('../utils/analyticsHelper');
const { validateListingData, validateMessage, validateReview } = require('../utils/classifiedsValidation');

describe('Classifieds Enhancement Tests', () => {
  describe('Spam Detection', () => {
    test('detects spam keywords', () => {
      const listing = {
        title: 'Click here for free money guaranteed income',
        description: 'Earn money fast bitcoin forex',
      };

      const score = calculateSpamScore(listing);
      expect(score).toBeGreaterThan(40);
    });

    test('detects phishing patterns', () => {
      const listing = {
        title: 'Verify your account details',
        description: 'Please click the link to confirm payment',
      };

      const score = calculateSpamScore(listing);
      expect(score).toBeGreaterThan(20);
    });

    test('detects suspicious flags', () => {
      const listing = {
        title: 'Used Phone',
        description: 'PayPal payment required upfront',
        price: 0,
      };

      const flags = detectSuspiciousFlags(listing);
      expect(flags).toContain('unusual-price');
      expect(flags).toContain('advance-payment');
    });

    test('validates content quality', () => {
      const badListing = {
        title: 'XYZ',
        description: 'Short',
      };

      const errors = validateContentQuality(badListing);
      expect(errors.length).toBeGreaterThan(0);
    });

    test('accepts quality content', () => {
      const goodListing = {
        title: 'Gaming Laptop - Like New Condition',
        description: 'High-end gaming laptop in excellent condition with original charger and warranty.',
      };

      const errors = validateContentQuality(goodListing);
      expect(errors.length).toBe(0);
    });
  });

  describe('Slug Generation', () => {
    test('generates valid slugs', () => {
      const slug = generateSlug('Gaming Laptop RTX 4060', '507f1f77bcf86cd799439011');
      expect(isValidSlug(slug)).toBe(true);
      expect(slug).toMatch(/^[a-z0-9].*[a-z0-9]$/);
    });

    test('handles special characters', () => {
      const slug = generateSlug('iPhone 14 Pro @$%^&*', 'test-id');
      expect(isValidSlug(slug)).toBe(true);
      expect(slug).not.toContain('@');
      expect(slug).not.toContain('$');
    });

    test('generates unique slugs for same title', () => {
      const slug1 = generateSlug('Gaming Laptop', 'id1');
      const slug2 = generateSlug('Gaming Laptop', 'id2');
      expect(slug1).not.toBe(slug2);
    });
  });

  describe('Geolocation', () => {
    test('validates valid coordinates', () => {
      expect(isValidCoordinates([77.5946, 12.9716])).toBe(true); // Bengaluru
      expect(isValidCoordinates([72.8479, 8.5241])).toBe(true); // Trivandrum
    });

    test('rejects invalid coordinates', () => {
      expect(isValidCoordinates([200, 100])).toBe(false); // Out of range
      expect(isValidCoordinates([77.5946])).toBe(false); // Missing coordinate
      expect(isValidCoordinates('not-coordinates')).toBe(false); // Wrong type
    });

    test('calculates distance correctly', () => {
      const bengaluru = [77.5946, 12.9716];
      const hyderabad = [78.4711, 17.3850];

      const distance = calculateDistance(bengaluru, hyderabad);
      expect(distance).toBeGreaterThan(500); // Roughly 570km apart
      expect(distance).toBeLessThan(600);
    });
  });

  describe('Analytics', () => {
    test('calculates conversion rate', () => {
      const rate = calculateConversionRate(100, 10);
      expect(rate).toBe(10); // 10%
    });

    test('handles zero views', () => {
      const rate = calculateConversionRate(0, 5);
      expect(rate).toBe(0);
    });

    test('calculates popularity score', () => {
      const listing = {
        views: 100,
        chats: 10,
        favorites: 20,
        featured: true,
        createdAt: new Date(),
      };

      const score = calculatePopularityScore(listing);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('calculates seller score', () => {
      const seller = {
        rating: 4.5,
        reviewCount: 10,
        responseTime: 2, // hours
        completionRate: 95,
        verificationLevel: 'identity-verified',
      };

      const score = calculateSellerScore(seller);
      expect(score).toBeGreaterThan(60);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Validation', () => {
    test('validates listing data', async () => {
      const validData = {
        title: 'Gaming Laptop RTX 4060',
        description: 'High-end gaming laptop in excellent condition with warranty.',
        price: 85000,
        category: 'Electronics',
        location: 'Bengaluru',
        condition: 'Like New',
      };

      const result = await validateListingData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('rejects invalid listing data', async () => {
      const invalidData = {
        title: 'XYZ',
        description: 'Short',
        price: -100,
        category: 'Electronics',
        location: 'Bengaluru',
      };

      const result = await validateListingData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('validates messages', () => {
      const validMessage = { text: 'Is this item still available?' };
      const result = validateMessage(validMessage);
      expect(result.isValid).toBe(true);
    });

    test('rejects empty messages', () => {
      const invalidMessage = { text: '' };
      const result = validateMessage(invalidMessage);
      expect(result.isValid).toBe(false);
    });

    test('validates reviews', () => {
      const validReview = {
        buyerName: 'John Doe',
        rating: 5,
        comment: 'Great seller, fast delivery!',
      };
      const result = validateReview(validReview);
      expect(result.isValid).toBe(true);
    });

    test('rejects invalid ratings', () => {
      const invalidReview = {
        buyerName: 'John Doe',
        rating: 10, // Out of range
      };
      const result = validateReview(invalidReview);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('handles very long titles', () => {
      const longTitle = 'A'.repeat(200);
      const errors = validateContentQuality({ title: longTitle, description: 'Valid description here' });
      expect(errors.some((e) => e.includes('Title too long'))).toBe(true);
    });

    test('handles spam with mixed case', () => {
      const listing = {
        title: 'CLICK HERE - EARN MONEY FAST',
        description: 'Guaranteed income from home',
      };

      const score = calculateSpamScore(listing);
      expect(score).toBeGreaterThan(30);
    });

    test('handles listings with no metadata', () => {
      const score = calculatePopularityScore({});
      expect(score).toBe(0);
    });
  });
});
