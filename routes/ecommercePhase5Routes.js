const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Import Phase 5 Services
const OTPAuthService = require('../services/OTPAuthService');
const RecommendationEngine = require('../services/RecommendationEngine');
const AdvancedFilterService = require('../services/AdvancedFilterService');
const AIChatService = require('../services/AIChatService');
const AddressManagementService = require('../services/AddressManagementService');

/**
 * AUTHENTICATION ROUTES (OTP)
 */

// Request OTP on phone number
router.post('/auth/otp/request-code', async (req, res) => {
  try {
    const { phoneNumber, channel } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const result = await OTPAuthService.requestOTP(phoneNumber, channel || 'sms');
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Request OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request OTP'
    });
  }
});

// Verify OTP and login
router.post('/auth/otp/verify-code-login', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    const result = await OTPAuthService.verifyOTPAndLogin(phoneNumber, otp);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
});

// Resend OTP
router.post('/auth/otp/resend-code', async (req, res) => {
  try {
    const { phoneNumber, channel } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const result = await OTPAuthService.resendOTP(phoneNumber, channel || 'sms');
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Resend OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP'
    });
  }
});

// Verify phone and link to user account
router.post('/auth/otp/verify-phone', auth, async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    const userId = req.user.userId;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    const result = await OTPAuthService.verifyPhoneForUser(userId, phoneNumber, otp);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Verify Phone Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify phone'
    });
  }
});

// Get OTP status
router.get('/auth/otp/status/:requestId', async (req, res) => {
  try {
    const result = await OTPAuthService.getOTPStatus(req.params.requestId);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Get OTP Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get OTP status'
    });
  }
});

/**
 * RECOMMENDATION ENGINE ROUTES
 */

// Get personalized recommendations for user
router.get('/recommendations/for-you', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = req.query.limit || 10;

    const result = await RecommendationEngine.getPersonalizedRecommendations(userId, limit);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Get Recommendations Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations'
    });
  }
});

// Get similar products
router.get('/recommendations/similar/:productId', async (req, res) => {
  try {
    const result = await RecommendationEngine.getSimilarProducts(
      req.params.productId,
      req.query.limit || 10
    );
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Similar Products Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get similar products'
    });
  }
});

// Get frequently bought together
router.get('/recommendations/frequently-bought/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;
    const result = await RecommendationEngine.getFrequentlyBoughtTogether([productId], req.query.limit || 5);

    res.status(200).json({
      success: true,
      message: 'Frequently bought together retrieved',
      data: result
    });
  } catch (error) {
    console.error('Frequently Bought Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get frequently bought products'
    });
  }
});

// Get upsell recommendations
router.post('/recommendations/upsell', auth, async (req, res) => {
  try {
    const { cartItems } = req.body;
    const result = await RecommendationEngine.getUpsellRecommendations(
      cartItems,
      req.query.limit || 5
    );
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Upsell Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upsell recommendations'
    });
  }
});

// Get cross-sell recommendations
router.get('/recommendations/crosssell/:productId', async (req, res) => {
  try {
    const result = await RecommendationEngine.getCrossSellRecommendations(
      req.params.productId,
      req.query.limit || 5
    );
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Cross-sell Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cross-sell recommendations'
    });
  }
});

// Get trending products
router.get('/recommendations/trending', async (req, res) => {
  try {
    const result = await RecommendationEngine.getTrendingProducts(
      req.query.limit || 10,
      req.query.days || 30
    );
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Trending Products Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trending products'
    });
  }
});

// Track user behavior
router.post('/recommendations/track', auth, async (req, res) => {
  try {
    const { eventType, data } = req.body;
    const userId = req.user.userId;

    await RecommendationEngine.trackUserBehavior(userId, eventType, data);

    res.status(200).json({
      success: true,
      message: 'Behavior tracked'
    });
  } catch (error) {
    console.error('Track Behavior Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track behavior'
    });
  }
});

// Calculate product similarities (admin/cron job)
router.post('/recommendations/calculate-similarities', async (req, res) => {
  try {
    // Protect with API key or admin check
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const result = await RecommendationEngine.calculateProductSimilarities();
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Calculate Similarities Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate similarities'
    });
  }
});

/**
 * ADVANCED FILTER ROUTES
 */

// Apply filters
router.post('/products/filters', async (req, res) => {
  try {
    const { filters, page, pageSize, sortBy, userLocation } = req.body;

    const result = await AdvancedFilterService.applyFilters(
      filters,
      page || 1,
      pageSize || 20,
      sortBy || 'relevance',
      userLocation
    );

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Apply Filters Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply filters'
    });
  }
});

// Get filter options
router.get('/products/filters/options', async (req, res) => {
  try {
    const result = await AdvancedFilterService.getFilterOptions(req.query.category);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Get Filter Options Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get filter options'
    });
  }
});

// Get delivery options
router.post('/products/filters/delivery-options', async (req, res) => {
  try {
    const { location, sellerId } = req.body;

    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({
        success: false,
        message: 'Location is required'
      });
    }

    const result = await AdvancedFilterService.getDeliveryOptions(location, sellerId);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Get Delivery Options Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get delivery options'
    });
  }
});

/**
 * AI CHAT SERVICE ROUTES
 */

// Process chat message
router.post('/chat/message', async (req, res) => {
  try {
    const { message, userId, context, contextData } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Auto-detect context if not provided
    let chatContext = context || AIChatService.detectIntent(message);

    const result = await AIChatService.processMessage(
      message,
      userId,
      chatContext,
      contextData || {}
    );

    // Save chat message if user is authenticated
    if (userId) {
      await AIChatService.saveChatMessage(userId, message, result.data?.response, chatContext);
    }

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Chat Message Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process message'
    });
  }
});

// Answer product question
router.post('/chat/product-question/:productId', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'Question is required'
      });
    }

    const result = await AIChatService.answerProductQuestion(req.params.productId, question);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Product Question Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to answer question'
    });
  }
});

// Track order via chat
router.post('/chat/track-order', auth, async (req, res) => {
  try {
    const { orderQuery } = req.body;
    const userId = req.user.userId;

    const result = await AIChatService.trackOrderViaChat(userId, orderQuery);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Track Order Chat Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track order'
    });
  }
});

// Handle complaint
router.post('/chat/complaint', auth, async (req, res) => {
  try {
    const { complaintText, issueType, orderId } = req.body;
    const userId = req.user.userId;

    if (!complaintText) {
      return res.status(400).json({
        success: false,
        message: 'Complaint text is required'
      });
    }

    const result = await AIChatService.handleComplaint(userId, complaintText, {
      issueType,
      orderId
    });
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Complaint Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle complaint'
    });
  }
});

// Get shopping advice
router.post('/chat/shopping-advice', async (req, res) => {
  try {
    const { query, budget, category, preferences } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }

    const result = await AIChatService.getShoppingAdvice(query, {
      budget,
      category,
      description: preferences
    });
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Shopping Advice Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to provide advice'
    });
  }
});

// Get chat history
router.get('/chat/history', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = req.query.limit || 20;

    const result = await AIChatService.getChatHistory(userId, limit);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Chat History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat history'
    });
  }
});

// Get quick replies
router.get('/chat/quick-replies', (req, res) => {
  try {
    const replies = AIChatService.getQuickReplies();
    res.status(200).json({
      success: true,
      message: 'Quick replies retrieved',
      data: replies
    });
  } catch (error) {
    console.error('Quick Replies Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quick replies'
    });
  }
});

/**
 * ADDRESS MANAGEMENT ROUTES
 */

// Add address
router.post('/user/addresses', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await AddressManagementService.addAddress(userId, req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Add Address Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add address'
    });
  }
});

// Get all addresses
router.get('/user/addresses', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await AddressManagementService.getUserAddresses(userId);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Get Addresses Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get addresses'
    });
  }
});

// Get single address
router.get('/user/addresses/:addressId', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await AddressManagementService.getAddress(userId, req.params.addressId);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Get Address Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get address'
    });
  }
});

// Update address
router.put('/user/addresses/:addressId', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await AddressManagementService.updateAddress(userId, req.params.addressId, req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Update Address Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update address'
    });
  }
});

// Delete address
router.delete('/user/addresses/:addressId', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await AddressManagementService.deleteAddress(userId, req.params.addressId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Delete Address Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete address'
    });
  }
});

// Set default address
router.put('/user/addresses/:addressId/default', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await AddressManagementService.setDefaultAddress(userId, req.params.addressId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Set Default Address Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default address'
    });
  }
});

// Get default address
router.get('/user/addresses/default', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await AddressManagementService.getDefaultAddress(userId);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Get Default Address Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get default address'
    });
  }
});

// Get quick address shortcuts
router.get('/user/addresses/quick/shortcuts', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await AddressManagementService.getQuickAddressShortcuts(userId);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Quick Shortcuts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get shortcuts'
    });
  }
});

// Search addresses by city
router.get('/user/addresses/search/city', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { city } = req.query;

    if (!city) {
      return res.status(400).json({
        success: false,
        message: 'City is required'
      });
    }

    const result = await AddressManagementService.searchAddressesByCity(userId, city);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Search Addresses Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search addresses'
    });
  }
});

// Get addresses by type
router.get('/user/addresses/by-type/:type', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await AddressManagementService.getAddressesByType(userId, req.params.type);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Get Addresses By Type Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get addresses'
    });
  }
});

module.exports = router;
