const axios = require('axios');

/**
 * AI Chat Service
 * Provides AI-powered chatbot for product Q&A, order tracking, complaints, shopping assistance
 * Integration with Google Gemini for natural language understanding
 */
class AIChatService {
  static geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  static geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  /**
   * Check API configuration
   */
  static isGeminiConfigured() {
    return Boolean(this.geminiApiKey);
  }

  static extractGeminiText(response) {
    const direct = response?.data?.candidates?.[0]?.content?.parts
      ?.map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('\n')
      .trim();
    return direct || '';
  }

  static async generateGeminiResponse(systemPrompt, userMessage) {
    if (!this.isGeminiConfigured()) {
      throw new Error('Gemini API key is not configured');
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.geminiModel)}:generateContent`,
      {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `SYSTEM INSTRUCTION:\n${systemPrompt}\n\nUSER MESSAGE:\n${userMessage}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          topP: 0.9,
        },
      },
      {
        headers: {
          'x-goog-api-key': this.geminiApiKey,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return this.extractGeminiText(response);
  }

  /**
   * Process chat message and generate response
   * @param {String} message - User message
   * @param {String} userId - User ID (optional)
   * @param {String} context - Chat context (product_qa, order_tracking, complaint, shopping_advice)
   * @param {Object} contextData - Additional context data
   * @returns {Object} {success, message, data: {response, suggestedActions}}
   */
  static async processMessage(message, userId = null, context = 'general', contextData = {}) {
    try {
      // Validate message
      if (!message || message.trim().length === 0) {
        return {
          success: false,
          message: 'Message cannot be empty',
          data: null
        };
      }

      // Build system prompt based on context
      const systemPrompt = this.buildSystemPrompt(context, contextData);

      const response = await this.generateGeminiResponse(systemPrompt, message);

      // Generate suggested actions based on response
      const suggestedActions = this.generateSuggestedActions(context, message, response);

      return {
        success: true,
        message: 'Response generated',
        data: {
          response: response,
          suggestedActions: suggestedActions,
          context: context
        }
      };
    } catch (error) {
      console.error('Chat Processing Error:', error);
      return {
        success: false,
        message: 'Failed to generate response. Please try again.',
        data: null
      };
    }
  }

  /**
   * Build system prompt based on context
   * @param {String} context - Chat context
   * @param {Object} contextData - Context-specific data
   * @returns {String}
   */
  static buildSystemPrompt(context, contextData) {
    const basePrompt = `You are a helpful AI shopping assistant for an Indian e-commerce superapp called MalaBarbazaar.
You are friendly, professional, and always aim to help customers find what they need.
Keep responses concise (2-3 sentences) and actionable.
Always mention specific product names or order numbers when relevant.`;

    const contextPrompts = {
      product_qa: `${basePrompt}
Context: You're answering questions about a specific product.
Product: ${contextData.productName || 'Unknown'}
Specifications: ${contextData.specs || 'N/A'}
Price: ₹${contextData.price || 'N/A'}
Rating: ${contextData.rating || 'N/A'}★

Answer questions about this product's features, specifications, and benefits.
Be honest about limitations. Recommend complementary products when relevant.`,

      order_tracking: `${basePrompt}
Context: Customer is asking about their order.
Order ID: ${contextData.orderId || 'Unknown'}
Status: ${contextData.status || 'Processing'}
Expected Delivery: ${contextData.deliveryDate || 'Soon'}
Current Location: ${contextData.currentLocation || 'In transit'}

Provide order status, delivery updates, and help with tracking. Offer solutions for delays.`,

      complaint: `${basePrompt}
Context: Customer has a complaint or issue.
Issue Type: ${contextData.issueType || 'General'}
Order ID: ${contextData.orderId || 'N/A'}

Listen empathetically. Acknowledge the issue. Provide solutions:
- For delivery issues: Offer tracking or contact support
- For quality issues: Offer returns/refunds
- For billing issues: Offer refund or adjustment
Escalate to human support if needed.`,

      shopping_advice: `${basePrompt}
Context: Customer is asking for shopping recommendations.
Budget: ${contextData.budget || 'Any'}
Category: ${contextData.category || 'Any'}
Preferences: ${contextData.preferences || 'None specified'}

Provide 2-3 specific product recommendations matching their criteria.
Include why each product is suitable. Ask clarifying questions if needed.`,

      general: basePrompt
    };

    return contextPrompts[context] || basePrompt;
  }

  /**
   * Generate suggested actions based on conversation
   * @param {String} context - Chat context
   * @param {String} userMessage - User's message
   * @param {String} response - AI response
   * @returns {Array}
   */
  static generateSuggestedActions(context, userMessage, response) {
    const actions = [];

    const messageLower = userMessage.toLowerCase();

    // General actions
    if (messageLower.includes('help') || messageLower.includes('support')) {
      actions.push({
        label: 'Contact Support Team',
        action: 'contact_support',
        priority: 'high'
      });
    }

    if (messageLower.includes('return') || messageLower.includes('refund')) {
      actions.push({
        label: 'Initiate Return',
        action: 'return_process',
        priority: 'high'
      });
    }

    if (messageLower.includes('where') || messageLower.includes('track')) {
      actions.push({
        label: 'Track Order',
        action: 'track_order',
        priority: 'high'
      });
    }

    // Context-specific actions
    if (context === 'product_qa') {
      actions.push({
        label: 'Add to Cart',
        action: 'add_to_cart',
        priority: 'medium'
      });
      actions.push({
        label: 'View Similar Products',
        action: 'view_similar',
        priority: 'low'
      });
    }

    if (context === 'shopping_advice') {
      actions.push({
        label: 'Compare Selected Products',
        action: 'compare_products',
        priority: 'medium'
      });
    }

    if (context === 'complaint') {
      actions.push({
        label: 'Escalate to Support',
        action: 'escalate_support',
        priority: 'high'
      });
    }

    // Add general action if no specific action found
    if (actions.length === 0) {
      actions.push({
        label: 'Continue Shopping',
        action: 'continue_shopping',
        priority: 'low'
      });
    }

    return actions;
  }

  /**
   * Answer product-specific questions
   * @param {String} productId - Product ID
   * @param {String} question - User's question
   * @returns {Object} {success, message, data}
   */
  static async answerProductQuestion(productId, question) {
    try {
      // Get product details from database
      const Product = require('../models/Product');
      const product = await Product.findById(productId)
        .select('name description price specs rating reviews')
        .lean();

      if (!product) {
        return {
          success: false,
          message: 'Product not found',
          data: null
        };
      }

      // Process message with product context
      return await this.processMessage(
        question,
        null,
        'product_qa',
        {
          productName: product.name,
          specs: product.specs ? JSON.stringify(product.specs) : 'N/A',
          price: product.price,
          rating: product.rating
        }
      );
    } catch (error) {
      console.error('Product QA Error:', error);
      return {
        success: false,
        message: 'Failed to answer question',
        data: null
      };
    }
  }

  /**
   * Track order via chat
   * @param {String} userId - User ID
   * @param {String} orderQuery - What they're asking (optional orderId or "my order")
   * @returns {Object} {success, message, data}
   */
  static async trackOrderViaChat(userId, orderQuery) {
    try {
      const Order = require('../models/Order');

      // Find order
      let order;
      if (orderQuery && orderQuery.match(/^[0-9a-f]{24}$/i)) {
        // ObjectId format
        order = await Order.findById(orderQuery).lean();
      } else {
        // Get most recent order
        order = await Order.findOne({ userId })
          .sort({ createdAt: -1 })
          .lean();
      }

      if (!order) {
        return {
          success: true,
          message: 'No order found',
          data: {
            response: "I couldn't find an order matching your query. Could you please provide your order ID?",
            suggestedActions: [
              { label: 'Browse Orders', action: 'view_orders', priority: 'medium' }
            ]
          }
        };
      }

      // Build order context
      const contextData = {
        orderId: order._id.toString(),
        status: order.status,
        deliveryDate: order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString() : 'TBD',
        currentLocation: order.trackingInfo?.currentLocation || 'Processing'
      };

      // Process message
      return await this.processMessage(
        `Check status of order ${order._id}`,
        userId,
        'order_tracking',
        contextData
      );
    } catch (error) {
      console.error('Order Tracking Error:', error);
      return {
        success: false,
        message: 'Failed to track order',
        data: null
      };
    }
  }

  /**
   * Handle complaint
   * @param {String} userId - User ID
   * @param {String} complaintText - Complaint description
   * @param {Object} complaintData - Additional data (orderId, issueType, etc.)
   * @returns {Object} {success, message, data}
   */
  static async handleComplaint(userId, complaintText, complaintData = {}) {
    try {
      // Process message with complaint context
      const response = await this.processMessage(
        complaintText,
        userId,
        'complaint',
        {
          issueType: complaintData.issueType || 'General',
          orderId: complaintData.orderId || null
        }
      );

      // If complaint is serious, auto-escalate
      const escalate = complaintText.toLowerCase().includes('damaged') ||
        complaintText.toLowerCase().includes('defective') ||
        complaintText.toLowerCase().includes('wrong item');

      if (escalate) {
        response.data.suggestedActions.unshift({
          label: 'Escalate to Support',
          action: 'escalate_support',
          priority: 'high'
        });
      }

      return response;
    } catch (error) {
      console.error('Complaint Handling Error:', error);
      return {
        success: false,
        message: 'Failed to handle complaint',
        data: null
      };
    }
  }

  /**
   * Shopping advice based on user query
   * @param {String} query - What user is looking for
   * @param {Object} preferences - User preferences
   * @returns {Object} {success, message, data}
   */
  static async getShoppingAdvice(query, preferences = {}) {
    try {
      const response = await this.processMessage(
        query,
        null,
        'shopping_advice',
        {
          budget: preferences.budget || 'Any',
          category: preferences.category || 'Any',
          preferences: preferences.description || 'None specified'
        }
      );

      return response;
    } catch (error) {
      console.error('Shopping Advice Error:', error);
      return {
        success: false,
        message: 'Failed to provide advice',
        data: null
      };
    }
  }

  /**
   * Detect intent from user message
   * @param {String} message - User message
   * @returns {String} Intent type
   */
  static detectIntent(message) {
    const messageLower = message.toLowerCase();

    if (messageLower.match(/track|where|order|delivery|arrived|location/)) {
      return 'order_tracking';
    }
    if (messageLower.match(/complain|issue|problem|damaged|defective|wrong|broken|not work/)) {
      return 'complaint';
    }
    if (messageLower.match(/help|support|assist|question|how|why|what|can you/)) {
      return 'help';
    }
    if (messageLower.match(/recommend|suggest|advice|looking for|want|need|best|good/)) {
      return 'shopping_advice';
    }
    if (messageLower.match(/spec|feature|benefit|price|cost|value|warranty|return/)) {
      return 'product_qa';
    }

    return 'general';
  }

  /**
   * Get chat history for user
   * @param {String} userId - User ID
   * @param {Number} limit - Number of messages to retrieve
   * @returns {Object} {success, message, data}
   */
  static async getChatHistory(userId, limit = 20) {
    try {
      const ChatMessage = require('../models/ChatMessage');

      const messages = await ChatMessage.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return {
        success: true,
        message: 'Chat history retrieved',
        data: messages.reverse()
      };
    } catch (error) {
      console.error('Get Chat History Error:', error);
      return {
        success: false,
        message: 'Failed to retrieve chat history',
        data: null
      };
    }
  }

  /**
   * Save chat message
   * @param {String} userId - User ID
   * @param {String} userMessage - User's message
   * @param {String} botResponse - Bot's response
   * @param {String} context - Chat context
   * @returns {Object} {success, message, data}
   */
  static async saveChatMessage(userId, userMessage, botResponse, context = 'general') {
    try {
      const ChatMessage = require('../models/ChatMessage');

      const message = new ChatMessage({
        userId: userId,
        userMessage: userMessage,
        botResponse: botResponse,
        context: context,
        createdAt: new Date()
      });

      await message.save();

      return {
        success: true,
        message: 'Chat message saved',
        data: { messageId: message._id }
      };
    } catch (error) {
      console.error('Save Chat Message Error:', error);
      return {
        success: false,
        message: 'Failed to save message',
        data: null
      };
    }
  }

  /**
   * Get quick replies for common questions
   * @returns {Array}
   */
  static getQuickReplies() {
    return [
      { text: 'Track my order', intent: 'order_tracking' },
      { text: 'Return/Refund', intent: 'complaint' },
      { text: 'Product recommendations', intent: 'shopping_advice' },
      { text: 'How to use this app?', intent: 'help' },
      { text: 'Payment issues', intent: 'complaint' },
      { text: 'Delivery delayed', intent: 'complaint' },
      { text: 'Find similar products', intent: 'product_qa' },
      { text: 'Contact support', intent: 'help' }
    ];
  }
}

module.exports = AIChatService;
