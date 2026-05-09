/**
 * EmailNotificationService.js
 * Phase 5E Continuation - Email notifications for orders, returns, and shipments
 * Handles transactional emails, templates, and delivery logging
 */

const logger = require('../utils/logger');
const {
  sendEmail: sendEmailMessage,
  isConfigured: isEmailConfigured,
} = require('../utils/sendEmail');

class EmailNotificationService {
  static instance;

  constructor() {
    this.fromEmail =
      process.env.NOTIFICATION_FROM_EMAIL ||
      process.env.EMAIL_FROM ||
      'noreply@malabarbazaar.com';
    this.supportEmail = process.env.SUPPORT_EMAIL || 'support@malabarbazaar.com';
    this.baseUrl = process.env.FRONTEND_URL || 'https://malabarbazaar.com';
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new EmailNotificationService();
    }
    return this.instance;
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(order, userEmail, userName) {
    try {
      const itemsList = order.items
        .map(item => `<li>${item.productName} x${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}</li>`)
        .join('');

      const html = `
        <h2>Order Confirmed!</h2>
        <p>Hi ${userName},</p>
        <p>Thank you for your order. Your order has been confirmed and is being processed.</p>
        
        <h3>Order Details</h3>
        <p><strong>Order ID:</strong> ${order._id.toString().substring(0, 8).toUpperCase()}</p>
        <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
        
        <h3>Items Ordered</h3>
        <ul>${itemsList}</ul>
        
        <p><strong>Subtotal:</strong> ₹${(order.total - order.shippingFee).toFixed(2)}</p>
        <p><strong>Shipping:</strong> ₹${order.shippingFee.toFixed(2)}</p>
        <p><strong>Tax:</strong> ₹${order.tax.toFixed(2)}</p>
        <h3><strong>Total Amount:</strong> ₹${order.total.toFixed(2)}</h3>
        
        <p>You can track your order using the order ID above. We'll send you shipping details soon!</p>
        <p><a href="${this.baseUrl}/orders/${order._id}">View Order</a></p>
        
        <p>Questions? Contact us at ${this.supportEmail}</p>
      `;

      await this.sendEmail({
        to: userEmail,
        subject: `Order Confirmed: #${order._id.toString().substring(0, 8).toUpperCase()}`,
        html,
      });

      logger.info(`Order confirmation email sent to ${userEmail} for order ${order._id}`);
    } catch (error) {
      logger.error(`Failed to send order confirmation email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send shipment notification email
   */
  async sendShipmentNotification(shipment, order, userEmail, userName) {
    try {
      const estimatedDelivery = new Date(shipment.estimatedDelivery).toLocaleDateString('en-IN');

      const html = `
        <h2>Your Order is on the Way!</h2>
        <p>Hi ${userName},</p>
        <p>Great news! Your order has been shipped and is on the way.</p>
        
        <h3>Tracking Information</h3>
        <p><strong>Tracking Number:</strong> ${shipment.trackingNumber}</p>
        <p><strong>Carrier:</strong> ${shipment.carrier === 'domestic' ? 'Domestic Courier' : 'International Courier'}</p>
        <p><strong>Status:</strong> ${shipment.status}</p>
        <p><strong>Estimated Delivery:</strong> ${estimatedDelivery}</p>
        
        <p>You can track your shipment in real-time using the tracking number above.</p>
        <p><a href="${this.baseUrl}/orders/${order._id}/track/${shipment.trackingNumber}">Track Shipment</a></p>
        
        <h3>What to Expect</h3>
        <ul>
          <li>Your package will be delivered to the address provided at checkout</li>
          <li>Delivery may take 2-7 business days depending on location</li>
          <li>You'll receive SMS/email updates as your package moves</li>
        </ul>
        
        <p>Need help? Reply to this email or contact ${this.supportEmail}</p>
      `;

      await this.sendEmail({
        to: userEmail,
        subject: `Shipment Update: Your package is on the way (${shipment.trackingNumber})`,
        html,
      });

      logger.info(`Shipment notification email sent to ${userEmail} for shipment ${shipment.trackingNumber}`);
    } catch (error) {
      logger.error(`Failed to send shipment notification email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send delivery confirmation email
   */
  async sendDeliveryConfirmation(shipment, order, userEmail, userName) {
    try {
      const deliveryDate = new Date(shipment.deliveredAt).toLocaleDateString('en-IN');

      const html = `
        <h2>Delivery Confirmed!</h2>
        <p>Hi ${userName},</p>
        <p>Your order has been successfully delivered!</p>
        
        <h3>Delivery Details</h3>
        <p><strong>Tracking Number:</strong> ${shipment.trackingNumber}</p>
        <p><strong>Delivered On:</strong> ${deliveryDate}</p>
        
        <h3>Next Steps</h3>
        <p>Please inspect your items and ensure everything is correct. You have 30 days to return items if needed.</p>
        
        <p><a href="${this.baseUrl}/orders/${order._id}">View Order Details</a></p>
        
        <h3>Feedback</h3>
        <p>We'd love to hear from you! Please rate your purchase and share your feedback.</p>
        <p><a href="${this.baseUrl}/orders/${order._id}/review">Leave a Review</a></p>
        
        <p>Thank you for shopping with Malabarbazaar!</p>
      `;

      await this.sendEmail({
        to: userEmail,
        subject: `Delivery Confirmed: Your order has arrived`,
        html,
      });

      logger.info(`Delivery confirmation email sent to ${userEmail} for order ${order._id}`);
    } catch (error) {
      logger.error(`Failed to send delivery confirmation email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send return initiated notification
   */
  async sendReturnInitiatedEmail(returnRequest, order, userEmail, userName) {
    try {
      const returnId = returnRequest.returnId;
      const reason = returnRequest.reason.replace(/_/g, ' ').toUpperCase();

      const html = `
        <h2>Return Request Initiated</h2>
        <p>Hi ${userName},</p>
        <p>We've received your return request. Our team will review and approve it within 24 hours.</p>
        
        <h3>Return Details</h3>
        <p><strong>Return ID:</strong> ${returnId}</p>
        <p><strong>Order ID:</strong> ${order._id.toString().substring(0, 8).toUpperCase()}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Status:</strong> Pending Review</p>
        
        <h3>What Happens Next?</h3>
        <ol>
          <li>Our team will review your return request (within 24 hours)</li>
          <li>Once approved, you'll receive a prepaid return label via email</li>
          <li>Drop off the package at your nearest courier center</li>
          <li>Once received and inspected, your refund will be processed (5-7 business days)</li>
        </ol>
        
        <p><a href="${this.baseUrl}/orders/${order._id}/returns/${returnId}">View Return Status</a></p>
        
        <p>Questions? Contact us at ${this.supportEmail}</p>
      `;

      await this.sendEmail({
        to: userEmail,
        subject: `Return Request Initiated: ${returnId}`,
        html,
      });

      logger.info(`Return initiated email sent to ${userEmail} for return ${returnId}`);
    } catch (error) {
      logger.error(`Failed to send return initiated email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send return approved email with return label
   */
  async sendReturnApprovedEmail(returnRequest, order, userEmail, userName) {
    try {
      const returnId = returnRequest.returnId;
      const labelExpiryDate = new Date(returnRequest.shippingLabel?.expiryDate).toLocaleDateString('en-IN');

      const html = `
        <h2>Return Request Approved!</h2>
        <p>Hi ${userName},</p>
        <p>Good news! Your return request has been approved. Please use the prepaid return label below to ship the item back.</p>
        
        <h3>Return Details</h3>
        <p><strong>Return ID:</strong> ${returnId}</p>
        <p><strong>Tracking Number:</strong> ${returnRequest.shippingLabel?.trackingNumber}</p>
        <p><strong>Label Expiry Date:</strong> ${labelExpiryDate}</p>
        
        <h3>Return Instructions</h3>
        <ol>
          <li>Download and print the return label</li>
          <li>Pack the item securely in the original packaging if possible</li>
          <li>Affix the return label on the package</li>
          <li>Drop off at your nearest courier center</li>
          <li>Keep the receipt for reference</li>
        </ol>
        
        <p><a href="${this.baseUrl}/orders/${order._id}/returns/${returnId}/label">Download Return Label</a></p>
        
        <p><strong>Important:</strong> Return label is valid until ${labelExpiryDate}. Ship the item before this date.</p>
        
        <p>Questions? Contact us at ${this.supportEmail}</p>
      `;

      await this.sendEmail({
        to: userEmail,
        subject: `Return Approved - Download Your Return Label: ${returnId}`,
        html,
      });

      logger.info(`Return approved email sent to ${userEmail} for return ${returnId}`);
    } catch (error) {
      logger.error(`Failed to send return approved email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send return rejected email
   */
  async sendReturnRejectedEmail(returnRequest, order, userEmail, userName, rejectionReason) {
    try {
      const returnId = returnRequest.returnId;

      const html = `
        <h2>Return Request Cannot be Processed</h2>
        <p>Hi ${userName},</p>
        <p>Unfortunately, your return request cannot be processed at this time.</p>
        
        <h3>Reason</h3>
        <p>${rejectionReason}</p>
        
        <h3>Return Details</h3>
        <p><strong>Return ID:</strong> ${returnId}</p>
        <p><strong>Order ID:</strong> ${order._id.toString().substring(0, 8).toUpperCase()}</p>
        
        <h3>What Can You Do?</h3>
        <ul>
          <li>Contact our support team if you believe this decision was made in error</li>
          <li>Provide additional information or documentation to appeal the decision</li>
          <li>Reach out to discuss alternative solutions</li>
        </ul>
        
        <p>We're here to help! Contact us at ${this.supportEmail}</p>
      `;

      await this.sendEmail({
        to: userEmail,
        subject: `Return Request Status: ${returnId}`,
        html,
      });

      logger.info(`Return rejected email sent to ${userEmail} for return ${returnId}`);
    } catch (error) {
      logger.error(`Failed to send return rejected email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send refund processed email
   */
  async sendRefundProcessedEmail(returnRequest, order, userEmail, userName, refundAmount) {
    try {
      const returnId = returnRequest.returnId;
      const refundDate = new Date().toLocaleDateString('en-IN');

      const html = `
        <h2>Refund Processed Successfully!</h2>
        <p>Hi ${userName},</p>
        <p>Your refund has been processed successfully. The amount will appear in your account within 5-7 business days.</p>
        
        <h3>Refund Details</h3>
        <p><strong>Return ID:</strong> ${returnId}</p>
        <p><strong>Refund Amount:</strong> ₹${refundAmount.toFixed(2)}</p>
        <p><strong>Processing Date:</strong> ${refundDate}</p>
        <p><strong>Expected Receipt:</strong> 5-7 business days</p>
        
        <h3>Original Payment Method</h3>
        <p>The refund will be credited to the same payment method used for the original purchase.</p>
        
        <p>Thank you for giving us the opportunity to make things right. We appreciate your business!</p>
        
        <p>Questions? Contact us at ${this.supportEmail}</p>
      `;

      await this.sendEmail({
        to: userEmail,
        subject: `Refund Processed: ₹${refundAmount.toFixed(2)} credited to your account`,
        html,
      });

      logger.info(`Refund processed email sent to ${userEmail} for return ${returnId}`);
    } catch (error) {
      logger.error(`Failed to send refund processed email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send order status update email (generic)
   */
  async sendOrderStatusUpdate(order, userEmail, userName, newStatus) {
    try {
      const statusMessages = {
        Confirmed: 'Your order has been confirmed and is being prepared for shipment.',
        Processing: 'Your order is being processed and will ship soon.',
        Shipped: 'Your order has shipped!',
        OutForDelivery: 'Your order is out for delivery today!',
        Delivered: 'Your order has been delivered!',
        Cancelled: 'Your order has been cancelled.',
      };

      const message = statusMessages[newStatus] || 'Your order status has been updated.';

      const html = `
        <h2>Order Status Update</h2>
        <p>Hi ${userName},</p>
        <p>${message}</p>
        
        <h3>Order Information</h3>
        <p><strong>Order ID:</strong> ${order._id.toString().substring(0, 8).toUpperCase()}</p>
        <p><strong>Status:</strong> ${newStatus}</p>
        <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
        
        <p><a href="${this.baseUrl}/orders/${order._id}">View Full Order Details</a></p>
        
        <p>Thank you for your business!</p>
      `;

      await this.sendEmail({
        to: userEmail,
        subject: `Order Status Update: #${order._id.toString().substring(0, 8).toUpperCase()}`,
        html,
      });

      logger.info(`Order status update email sent to ${userEmail} for order ${order._id} (${newStatus})`);
    } catch (error) {
      logger.error(`Failed to send order status update email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generic email sender
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      const result = await sendEmailMessage(to, subject, html, text || '', `order-notification:${subject}`);
      if (!result.success) {
        throw new Error(result.error || 'Failed to send notification email');
      }

      logger.info(`Email sent successfully to ${to}: ${result.messageId}`);
      return result;
    } catch (error) {
      logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify email configuration
   */
  async verifyConnection() {
    try {
      const configured = isEmailConfigured();
      if (configured) {
        logger.info('Email configuration verified successfully');
      } else {
        logger.warn('Email configuration is incomplete');
      }
      return configured;
    } catch (error) {
      logger.error(`Email configuration error: ${error.message}`);
      return false;
    }
  }
}

module.exports = EmailNotificationService;
