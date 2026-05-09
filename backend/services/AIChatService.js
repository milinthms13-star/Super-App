/**
 * AIChatService.js
 * AI-powered customer support and product Q&A using OpenAI/Azure
 */

const logger = require('../config/logger');

class AIChatService {
  /**
   * Initialize chat session for user
   */
  static async initializeChatSession(userId) {
    try {
      const ChatSession = require('../models/ChatSession');

      const session = new ChatSession({
        userId,
        messages: [],
        status: 'active',
        topic: 'general',
        createdAt: new Date(),
      });

      await session.save();
      logger.info(`Chat session initialized: ${session._id}`);

      return {
        sessionId: session._id,
        status: 'active',
      };
    } catch (error) {
      logger.error('Error initializing chat session:', error);
      throw error;
    }
  }

  /**
   * Send message and get AI response
   */
  static async sendMessage(sessionId, userId, userMessage, context = {}) {
    try {
      const ChatSession = require('../models/ChatSession');

      // Store user message
      const session = await ChatSession.findById(sessionId);
      if (!session) {
        throw new Error('Chat session not found');
      }

      session.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      });

      // Detect intent/topic
      const { intent, topic, confidence } = await this._detectIntent(userMessage);

      // Generate AI response based on intent
      let aiResponse = '';

      if (intent === 'product_question') {
        aiResponse = await this._answerProductQuestion(userMessage, context);
      } else if (intent === 'order_status') {
        aiResponse = await this._handleOrderStatus(userMessage, userId, context);
      } else if (intent === 'return_refund') {
        aiResponse = await this._handleReturnRefund(userMessage, userId, context);
      } else if (intent === 'complaint') {
        aiResponse = await this._escalateToAgent(userMessage, userId, session._id, context);
      } else if (intent === 'general_help') {
        aiResponse = await this._provideGeneralHelp(userMessage, context);
      } else {
        aiResponse = await this._generateGeneralResponse(userMessage, context);
      }

      // Store AI response
      session.messages.push({
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        intent,
        confidence,
      });

      session.topic = topic;
      session.lastMessageAt = new Date();

      await session.save();

      logger.info(`Message processed in chat session: ${sessionId}`);

      return {
        sessionId,
        response: aiResponse,
        intent,
        confidence,
        suggestedActions: await this._getSuggestedActions(intent, context),
      };
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Answer product-related questions
   */
  static async _answerProductQuestion(question, context) {
    try {
      const Product = require('../models/Product');

      // Extract product keywords
      const keywords = this._extractKeywords(question);

      // Search for relevant products
      const relevantProducts = await Product.find({
        $or: [
          { name: { $regex: keywords.join('|'), $options: 'i' } },
          { description: { $regex: keywords.join('|'), $options: 'i' } },
          { category: { $regex: keywords.join('|'), $options: 'i' } },
        ],
      }).limit(3);

      if (relevantProducts.length === 0) {
        return `I couldn't find specific products matching your question. Could you provide more details about what you're looking for?`;
      }

      // Generate contextual response
      let response = 'Based on your question, here are some relevant products:\n\n';

      relevantProducts.forEach((product, idx) => {
        response += `${idx + 1}. **${product.name}** - ₹${product.price}\n`;
        response += `   Rating: ${product.rating}/5 | Stock: ${product.stock > 0 ? 'Available' : 'Out of Stock'}\n`;
        if (product.description) {
          response += `   ${product.description.substring(0, 100)}...\n\n`;
        }
      });

      response += '\nWould you like more information about any of these products?';

      return response;
    } catch (error) {
      logger.error('Error answering product question:', error);
      return 'I apologize, I had trouble finding information. Please try again or contact support.';
    }
  }

  /**
   * Handle order status queries
   */
  static async _handleOrderStatus(message, userId, context) {
    try {
      const Order = require('../models/Order');
      const Shipment = require('../models/Shipment');

      // Find recent orders
      const recentOrders = await Order.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5);

      if (recentOrders.length === 0) {
        return 'You don\'t have any recent orders. Would you like to browse our products?';
      }

      let response = '**Your Recent Orders:**\n\n';

      for (const order of recentOrders) {
        const shipment = await Shipment.findOne({ orderId: order._id });
        const status = shipment?.status || order.status;

        response += `📦 Order #${order._id.toString().substring(0, 8)}\n`;
        response += `Status: ${status}\n`;
        response += `Total: ₹${order.totalAmount}\n`;
        response += `Date: ${new Date(order.createdAt).toLocaleDateString()}\n`;

        if (shipment?.estimatedDeliveryDate) {
          response += `Estimated Delivery: ${new Date(shipment.estimatedDeliveryDate).toLocaleDateString()}\n`;
        }

        response += '\n';
      }

      response += 'Which order would you like more details about?';

      return response;
    } catch (error) {
      logger.error('Error handling order status:', error);
      return 'I had trouble retrieving your order information. Please contact support.';
    }
  }

  /**
   * Handle return/refund requests
   */
  static async _handleReturnRefund(message, userId, context) {
    try {
      const Return = require('../models/Return');

      // Check if user has eligible orders
      const Order = require('../models/Order');
      const eligibleOrders = await Order.find({
        userId,
        status: 'completed',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      });

      if (eligibleOrders.length === 0) {
        return 'You don\'t have any orders eligible for return (orders must be within 30 days).';
      }

      let response = '**Return Policy:**\n';
      response += '- Returns accepted within 30 days of delivery\n';
      response += '- Item must be unused and in original packaging\n';
      response += '- Refund processed within 5-7 business days\n\n';
      response += '**Your Eligible Orders for Return:**\n\n';

      eligibleOrders.forEach((order, idx) => {
        response += `${idx + 1}. Order #${order._id.toString().substring(0, 8)} - ₹${order.totalAmount}\n`;
      });

      response += '\nWould you like to initiate a return for any of these orders?';

      return response;
    } catch (error) {
      logger.error('Error handling return refund:', error);
      return 'I had trouble processing your refund request. Please contact our support team.';
    }
  }

  /**
   * Escalate to human agent
   */
  static async _escalateToAgent(message, userId, sessionId, context) {
    try {
      const ChatSession = require('../models/ChatSession');

      await ChatSession.findByIdAndUpdate(sessionId, {
        $set: { status: 'escalated', escalatedAt: new Date() },
      });

      logger.info(`Chat escalated to agent: ${sessionId}`);

      return `I understand this is an important matter. I'm escalating your case to our support team. A human agent will connect with you shortly. Your case ID is: **${sessionId}**. Thank you for your patience!`;
    } catch (error) {
      logger.error('Error escalating to agent:', error);
      return 'I apologize for the inconvenience. Please contact our support team directly.';
    }
  }

  /**
   * Provide general help
   */
  static async _provideGeneralHelp(message, context) {
    try {
      const helpTopics = {
        account: 'You can manage your account settings, saved addresses, and payment methods in your profile.',
        shipping: 'We offer free shipping on orders above ₹500. Standard delivery takes 3-5 business days.',
        payment: 'We accept credit cards, debit cards, UPI, and EMI options for your convenience.',
        returns: 'Items can be returned within 30 days of delivery in unused condition.',
        tracking: 'You can track your order in real-time from the Order Details page.',
      };

      const messageLower = message.toLowerCase();

      for (const [topic, answer] of Object.entries(helpTopics)) {
        if (messageLower.includes(topic)) {
          return answer;
        }
      }

      return 'How can I assist you? You can ask about orders, returns, shipping, payments, or tracking.';
    } catch (error) {
      logger.error('Error providing general help:', error);
      return 'I\'m here to help. How can I assist you?';
    }
  }

  /**
   * Generate general response using simple logic
   */
  static async _generateGeneralResponse(message, context) {
    // Simple response generation without external AI
    const responses = [
      'That\'s a great question! Can you provide more details?',
      'I understand. How can I help you further?',
      'Thank you for reaching out. Is there anything else I can assist with?',
      'I\'m here to help! Would you like information about our products or services?',
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Detect intent from message
   */
  static async _detectIntent(message) {
    const messageLower = message.toLowerCase();

    if (
      messageLower.includes('product') ||
      messageLower.includes('price') ||
      messageLower.includes('feature')
    ) {
      return {
        intent: 'product_question',
        topic: 'product',
        confidence: 0.85,
      };
    }

    if (
      messageLower.includes('order') ||
      messageLower.includes('track') ||
      messageLower.includes('delivery')
    ) {
      return {
        intent: 'order_status',
        topic: 'order',
        confidence: 0.9,
      };
    }

    if (
      messageLower.includes('return') ||
      messageLower.includes('refund') ||
      messageLower.includes('money back')
    ) {
      return {
        intent: 'return_refund',
        topic: 'returns',
        confidence: 0.88,
      };
    }

    if (
      messageLower.includes('angry') ||
      messageLower.includes('problem') ||
      messageLower.includes('complaint')
    ) {
      return {
        intent: 'complaint',
        topic: 'complaint',
        confidence: 0.8,
      };
    }

    return {
      intent: 'general_help',
      topic: 'general',
      confidence: 0.7,
    };
  }

  /**
   * Extract keywords from message
   */
  static _extractKeywords(message) {
    const stopwords = [
      'the',
      'a',
      'an',
      'and',
      'or',
      'is',
      'are',
      'can',
      'i',
      'you',
      'what',
      'where',
      'when',
    ];

    return message
      .toLowerCase()
      .split(/\s+/)
      .filter(
        word =>
          word.length > 3 &&
          !stopwords.includes(word) &&
          !/[^a-z0-9]/.test(word)
      )
      .slice(0, 5);
  }

  /**
   * Get suggested follow-up actions
   */
  static async _getSuggestedActions(intent, context) {
    const actions = {
      product_question: [
        { text: 'View Similar Products', action: 'view_similar' },
        { text: 'Add to Cart', action: 'add_to_cart' },
        { text: 'View Reviews', action: 'view_reviews' },
      ],
      order_status: [
        { text: 'Track Order', action: 'track_order' },
        { text: 'Cancel Order', action: 'cancel_order' },
        { text: 'View Return Policy', action: 'view_returns' },
      ],
      return_refund: [
        { text: 'Initiate Return', action: 'start_return' },
        { text: 'Check Refund Status', action: 'check_refund' },
      ],
      complaint: [
        { text: 'Contact Support', action: 'contact_support' },
        { text: 'View Complaint Status', action: 'view_complaint' },
      ],
    };

    return actions[intent] || [];
  }

  /**
   * Get chat history
   */
  static async getChatHistory(sessionId) {
    try {
      const ChatSession = require('../models/ChatSession');

      const session = await ChatSession.findById(sessionId);
      if (!session) {
        throw new Error('Chat session not found');
      }

      return {
        sessionId,
        messages: session.messages,
        status: session.status,
        topic: session.topic,
      };
    } catch (error) {
      logger.error('Error getting chat history:', error);
      throw error;
    }
  }

  /**
   * Close chat session
   */
  static async closeChatSession(sessionId) {
    try {
      const ChatSession = require('../models/ChatSession');

      await ChatSession.findByIdAndUpdate(sessionId, {
        $set: { status: 'closed', closedAt: new Date() },
      });

      logger.info(`Chat session closed: ${sessionId}`);

      return {
        sessionId,
        status: 'closed',
      };
    } catch (error) {
      logger.error('Error closing chat session:', error);
      throw error;
    }
  }

  /**
   * Rate chat session
   */
  static async rateChatSession(sessionId, rating, feedback = '') {
    try {
      const ChatSession = require('../models/ChatSession');

      await ChatSession.findByIdAndUpdate(sessionId, {
        $set: { rating, feedback, ratedAt: new Date() },
      });

      logger.info(`Chat session rated: ${sessionId}`);

      return {
        sessionId,
        rating,
        message: 'Thank you for your feedback!',
      };
    } catch (error) {
      logger.error('Error rating chat session:', error);
      throw error;
    }
  }
}

module.exports = AIChatService;
