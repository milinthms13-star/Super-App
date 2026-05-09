/**
 * GuestCheckoutService
 * Manages guest checkout and conversion to registered users
 */

const GuestCheckout = require('../models/GuestCheckout');
const User = require('../models/User');
const Order = require('../models/Order');
const crypto = require('crypto');

class GuestCheckoutService {
  static instance;

  static getInstance() {
    if (!GuestCheckoutService.instance) {
      GuestCheckoutService.instance = new GuestCheckoutService();
    }
    return GuestCheckoutService.instance;
  }

  /**
   * Create guest checkout session
   */
  async createGuestSession(email, phoneNumber = null) {
    try {
      // Check if email already has account
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('Email already registered. Please login instead.');
      }

      // Check if email already converted guest
      const existingGuest = await GuestCheckout.findOne({ email, isConverted: false });
      if (existingGuest) {
        return { guestId: existingGuest.guestId, message: 'Existing guest session' };
      }

      // Create new guest session
      const guest = await GuestCheckout.createGuest(email, phoneNumber);

      return {
        guestId: guest.guestId,
        email: guest.email,
        createdAt: guest.createdAt,
        message: 'Guest session created'
      };
    } catch (error) {
      throw new Error(`Failed to create guest session: ${error.message}`);
    }
  }

  /**
   * Place order as guest
   */
  async placeGuestOrder(guestId, orderData) {
    try {
      const guest = await GuestCheckout.findOne({ guestId, isConverted: false });

      if (!guest) {
        throw new Error('Invalid guest session');
      }

      // Create order
      const Order = require('../models/Order');
      const order = new Order({
        ...orderData,
        guestId: guest._id,
        userType: 'guest',
        guestEmail: guest.email,
        guestPhoneNumber: guest.phoneNumber,
        shippingAddress: guest.shippingAddress || orderData.shippingAddress,
        billingAddress: guest.billingAddress || orderData.billingAddress
      });

      await order.save();

      // Add to guest's orders
      await guest.addOrder(order._id);
      await guest.updateShoppingHistory(
        orderData.items[0]?.productId,
        orderData.items[0]?.category
      );

      // Send confirmation email
      await this.sendOrderConfirmationEmail(guest, order);

      return {
        success: true,
        orderId: order._id,
        message: 'Order placed as guest',
        conversionPrompt: {
          title: 'Save Your Address & Payment Methods',
          message: 'Create an account to save your shipping address and payment methods for faster checkout next time',
          conversionUrl: guest.getConversionUrl()
        }
      };
    } catch (error) {
      throw new Error(`Failed to place guest order: ${error.message}`);
    }
  }

  /**
   * Convert guest to registered user
   */
  async convertGuestToUser(guestId, userData) {
    try {
      const guest = await GuestCheckout.findOne({ guestId });

      if (!guest) {
        throw new Error('Invalid guest session');
      }

      if (guest.isConverted) {
        throw new Error('Guest already converted');
      }

      // Create user account
      const user = new User({
        email: guest.email,
        phoneNumber: guest.phoneNumber,
        firstName: userData.firstName || 'Guest',
        lastName: userData.lastName || 'User',
        password: userData.password,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        isPhoneVerified: !!guest.phoneNumber,
        phoneVerifiedAt: guest.phoneNumber ? new Date() : null,
        shippingAddress: guest.shippingAddress,
        billingAddress: guest.billingAddress,
        authMethod: 'email'
      });

      await user.save();

      // Link guest orders to user
      await Order.updateMany(
        { guestId: guest._id },
        { userId: user._id, userType: 'registered', guestId: null }
      );

      // Mark guest as converted
      await guest.convertToUser(user._id, userData.conversionMethod || 'email_link');

      // Send welcome email
      await this.sendWelcomeEmail(user);

      return {
        success: true,
        userId: user._id,
        message: 'Successfully converted to registered user',
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      };
    } catch (error) {
      throw new Error(`Failed to convert guest: ${error.message}`);
    }
  }

  /**
   * Get guest orders
   */
  async getGuestOrders(guestId) {
    try {
      const guest = await GuestCheckout.findOne({ guestId });

      if (!guest) {
        throw new Error('Invalid guest session');
      }

      const orders = await Order.find({ guestId: guest._id })
        .populate('items.productId', 'name price images')
        .sort({ createdAt: -1 });

      return {
        guestId,
        totalOrders: orders.length,
        totalSpent: guest.shoppingHistory.totalSpent,
        orders: orders.map(order => ({
          orderId: order._id,
          date: order.createdAt,
          total: order.totalAmount,
          status: order.status,
          itemCount: order.items.length
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get guest orders: ${error.message}`);
    }
  }

  /**
   * Update guest shipping address
   */
  async updateGuestAddress(guestId, address) {
    try {
      const guest = await GuestCheckout.findOne({ guestId });

      if (!guest) {
        throw new Error('Invalid guest session');
      }

      guest.shippingAddress = {
        ...address,
        coordinates: address.coordinates || []
      };

      await guest.save();

      return {
        success: true,
        message: 'Address updated',
        address: guest.shippingAddress
      };
    } catch (error) {
      throw new Error(`Failed to update address: ${error.message}`);
    }
  }

  /**
   * Save payment method for guest
   */
  async savePaymentMethod(guestId, paymentData) {
    try {
      const guest = await GuestCheckout.findOne({ guestId });

      if (!guest) {
        throw new Error('Invalid guest session');
      }

      guest.savedPaymentMethods.push({
        paymentMethodId: crypto.randomBytes(16).toString('hex'),
        type: paymentData.type,
        lastUsed: new Date()
      });

      await guest.save();

      return {
        success: true,
        message: 'Payment method saved',
        paymentMethods: guest.savedPaymentMethods
      };
    } catch (error) {
      throw new Error(`Failed to save payment method: ${error.message}`);
    }
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(guest, order) {
    try {
      // In production, integrate with email service (SendGrid, Nodemailer, etc.)
      console.log(`[EMAIL] Order confirmation sent to ${guest.email}`);
      return true;
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user) {
    try {
      console.log(`[EMAIL] Welcome email sent to ${user.email}`);
      return true;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }

  /**
   * Clean up old guest sessions (older than 1 year)
   */
  async cleanupExpiredSessions() {
    try {
      const result = await GuestCheckout.deleteMany({
        isConverted: false,
        expiresAt: { $lt: new Date() }
      });

      console.log(`Cleaned up ${result.deletedCount} expired guest sessions`);
      return result.deletedCount;
    } catch (error) {
      console.error('Failed to cleanup guest sessions:', error);
    }
  }
}

module.exports = GuestCheckoutService.getInstance();
