/**
 * orderNotificationService.js
 * Phase 5E: Real-time order & shipment notification service
 * Triggers email notifications from Order/Return/Fulfillment service operations
 */

const EmailNotificationService = require('./EmailNotificationService');
const logger = require('../utils/logger');

class OrderNotificationService {
  /**
   * Notify when order is placed
   */
  static async notifyOrderPlaced(order, user) {
    try {
      const emailService = EmailNotificationService.getInstance();
      await emailService.sendOrderConfirmation(
        {
          _id: order._id,
          createdAt: order.createdAt,
          items: order.items,
          total: order.totalAmount,
          shippingFee: order.shippingFee || 0,
          tax: order.tax || 0,
        },
        user.email,
        user.name
      );
      logger.info(`Order placed notification sent for order ${order._id}`);
    } catch (error) {
      logger.error(`Failed to notify order placed: ${error.message}`);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Notify when order status changes
   */
  static async notifyOrderStatusChanged(order, user, oldStatus, newStatus) {
    try {
      const messages = {
        'confirmed': {
          subject: 'Your order has been confirmed',
          body: 'Your order has been confirmed and will be processed shortly.',
        },
        'processing': {
          subject: 'Your order is being processed',
          body: 'We are preparing your order for shipment.',
        },
        'shipped': {
          subject: 'Your order has been shipped',
          body: 'Your order is on the way. Use tracking number to monitor delivery.',
        },
        'delivered': {
          subject: 'Your order has been delivered',
          body: 'Your order has been successfully delivered. Check your package and leave a review!',
        },
        'cancelled': {
          subject: 'Your order has been cancelled',
          body: 'Your order has been cancelled. A refund will be processed shortly.',
        },
      };

      const notification = messages[newStatus] || {
        subject: `Order status updated`,
        body: `Your order status has changed to ${newStatus}`,
      };

      const emailService = EmailNotificationService.getInstance();
      const html = `
        <h2>${notification.subject}</h2>
        <p>Hi ${user.name},</p>
        <p>${notification.body}</p>
        <p><strong>Order ID:</strong> ${order._id.toString().substring(0, 8).toUpperCase()}</p>
        <p><strong>New Status:</strong> ${newStatus}</p>
        <p><a href="${process.env.FRONTEND_URL || 'https://malabarbazaar.com'}/orders/${order._id}">View Order</a></p>
      `;

      await emailService.sendEmail({
        to: user.email,
        subject: notification.subject,
        html,
      });

      logger.info(`Order status change notification sent for order ${order._id}`);
    } catch (error) {
      logger.error(`Failed to notify order status: ${error.message}`);
    }
  }

  /**
   * Notify when shipment is created
   */
  static async notifyShipmentCreated(shipment, order, user) {
    try {
      const emailService = EmailNotificationService.getInstance();
      await emailService.sendShipmentNotification(
        shipment,
        order,
        user.email,
        user.name
      );
      logger.info(`Shipment created notification sent for ${shipment.trackingNumber}`);
    } catch (error) {
      logger.error(`Failed to notify shipment: ${error.message}`);
    }
  }

  /**
   * Notify when shipment is delivered
   */
  static async notifyShipmentDelivered(shipment, order, user) {
    try {
      const emailService = EmailNotificationService.getInstance();
      await emailService.sendDeliveryConfirmation(
        shipment,
        order,
        user.email,
        user.name
      );
      logger.info(`Delivery notification sent for order ${order._id}`);
    } catch (error) {
      logger.error(`Failed to notify delivery: ${error.message}`);
    }
  }

  /**
   * Notify when shipment tracking is updated
   */
  static async notifyTrackingUpdate(shipment, order, user, lastStatus) {
    try {
      const emailService = EmailNotificationService.getInstance();
      const statusMessage = this._getTrackingStatusMessage(shipment.status);

      const html = `
        <h2>Shipment Update</h2>
        <p>Hi ${user.name},</p>
        <p>Your shipment has moved to a new location.</p>
        
        <h3>Tracking Update</h3>
        <p><strong>Tracking Number:</strong> ${shipment.trackingNumber}</p>
        <p><strong>Current Status:</strong> ${statusMessage}</p>
        <p><strong>Location:</strong> ${shipment.currentLocation || 'In Transit'}</p>
        <p><strong>Last Updated:</strong> ${new Date().toLocaleString('en-IN')}</p>
        
        <p><a href="${process.env.FRONTEND_URL || 'https://malabarbazaar.com'}/orders/${order._id}/tracking">Track Package</a></p>
      `;

      await emailService.sendEmail({
        to: user.email,
        subject: `Shipment Update: ${statusMessage}`,
        html,
      });

      logger.info(`Tracking update notification sent for ${shipment.trackingNumber}`);
    } catch (error) {
      logger.error(`Failed to notify tracking update: ${error.message}`);
    }
  }

  /**
   * Notify when return is initiated
   */
  static async notifyReturnInitiated(returnRequest, order, user) {
    try {
      const emailService = EmailNotificationService.getInstance();
      await emailService.sendReturnInitiatedEmail(
        returnRequest,
        order,
        user.email,
        user.name
      );
      logger.info(`Return initiated notification sent for ${returnRequest.returnId}`);
    } catch (error) {
      logger.error(`Failed to notify return initiated: ${error.message}`);
    }
  }

  /**
   * Notify when return is approved
   */
  static async notifyReturnApproved(returnRequest, order, user) {
    try {
      const emailService = EmailNotificationService.getInstance();
      const returnLabel = returnRequest.shippingLabel || {};

      const html = `
        <h2>Return Approved!</h2>
        <p>Hi ${user.name},</p>
        <p>Your return request has been approved. Please ship back the items using the provided label.</p>
        
        <h3>Return Details</h3>
        <p><strong>Return ID:</strong> ${returnRequest.returnId}</p>
        <p><strong>Tracking Number:</strong> ${returnLabel.trackingNumber || 'N/A'}</p>
        <p><strong>Label Expiry:</strong> ${returnLabel.expiryDate ? new Date(returnLabel.expiryDate).toLocaleDateString('en-IN') : 'N/A'}</p>
        
        <h3>Steps to Return</h3>
        <ol>
          <li>Download and print the return shipping label</li>
          <li>Pack the items securely in original packaging if possible</li>
          <li>Attach the label to the package</li>
          <li>Drop off at your nearest ${returnLabel.carrier || 'courier'} center</li>
        </ol>
        
        <p><a href="${process.env.FRONTEND_URL || 'https://malabarbazaar.com'}/orders/${order._id}/returns/${returnRequest.returnId}/label">Download Return Label</a></p>
      `;

      await emailService.sendEmail({
        to: user.email,
        subject: `Return Approved: Return shipping label ready`,
        html,
      });

      logger.info(`Return approved notification sent for ${returnRequest.returnId}`);
    } catch (error) {
      logger.error(`Failed to notify return approved: ${error.message}`);
    }
  }

  /**
   * Notify when return is rejected
   */
  static async notifyReturnRejected(returnRequest, order, user, rejectionReason) {
    try {
      const emailService = EmailNotificationService.getInstance();

      const html = `
        <h2>Return Request Status</h2>
        <p>Hi ${user.name},</p>
        <p>Unfortunately, your return request has been rejected.</p>
        
        <h3>Return Details</h3>
        <p><strong>Return ID:</strong> ${returnRequest.returnId}</p>
        <p><strong>Reason for Rejection:</strong> ${rejectionReason || 'Item does not meet return criteria'}</p>
        
        <p>If you believe this is an error, please contact us at support@malabarbazaar.com to appeal the decision.</p>
      `;

      await emailService.sendEmail({
        to: user.email,
        subject: `Return Request Rejected: #${returnRequest.returnId}`,
        html,
      });

      logger.info(`Return rejected notification sent for ${returnRequest.returnId}`);
    } catch (error) {
      logger.error(`Failed to notify return rejected: ${error.message}`);
    }
  }

  /**
   * Notify when refund is processed
   */
  static async notifyRefundProcessed(returnRequest, order, user, refundAmount) {
    try {
      const emailService = EmailNotificationService.getInstance();

      const html = `
        <h2>Refund Processed!</h2>
        <p>Hi ${user.name},</p>
        <p>Your refund has been successfully processed.</p>
        
        <h3>Refund Details</h3>
        <p><strong>Return ID:</strong> ${returnRequest.returnId}</p>
        <p><strong>Order ID:</strong> ${order._id.toString().substring(0, 8).toUpperCase()}</p>
        <p><strong>Refund Amount:</strong> ₹${refundAmount.toFixed(2)}</p>
        <p><strong>Processing Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
        
        <h3>When Will I Receive the Refund?</h3>
        <p>The refund will appear in your original payment method within 5-7 business days.</p>
        <p>Bank processing times may vary. Check with your bank if you don't see it after 7 business days.</p>
        
        <p>Thank you for your understanding!</p>
      `;

      await emailService.sendEmail({
        to: user.email,
        subject: `Refund Processed: ₹${refundAmount.toFixed(2)} credited`,
        html,
      });

      logger.info(`Refund processed notification sent for order ${order._id}`);
    } catch (error) {
      logger.error(`Failed to notify refund processed: ${error.message}`);
    }
  }

  /**
   * Get friendly tracking status message
   */
  static _getTrackingStatusMessage(status) {
    const messages = {
      'pending': 'Waiting for pickup',
      'in_transit': 'In transit to your location',
      'out_for_delivery': 'Out for delivery today',
      'delivered': 'Delivered successfully',
      'returned': 'Return in progress',
    };
    return messages[status] || status;
  }
}

module.exports = OrderNotificationService;
