const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;

/**
 * BusinessServiceNotificationService
 * Handles email/SMS notifications for business service orders
 * Integrates with Nodemailer (email) and Twilio (SMS)
 */
class BusinessServiceNotificationService {
  static transporter = null;

  static getTransporter() {
    if (this.transporter) return this.transporter;

    const provider = process.env.NOTIFICATION_EMAIL_PROVIDER || 'nodemailer';
    if (provider !== 'nodemailer') {
      logger.warn('Email provider not fully configured; notifications will be logged only.');
      return null;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.NODEMAILER_SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.NODEMAILER_SMTP_PORT, 10) || 587,
        secure: false, // use TLS
        auth: {
          user: process.env.NODEMAILER_EMAIL,
          pass: process.env.NODEMAILER_PASSWORD,
        },
      });
      return this.transporter;
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
      return null;
    }
  }

  /**
   * Load email template from disk
   */
  static async loadTemplate(templateName) {
    try {
      const templatePath = path.join(__dirname, '..', 'templates', 'business-services', `${templateName}.html`);
      const content = await fs.readFile(templatePath, 'utf8');
      return content;
    } catch (error) {
      logger.error(`Failed to load template ${templateName}:`, error);
      return null;
    }
  }

  /**
   * Replace template variables
   */
  static replaceTemplateVars(template, vars) {
    let html = template;
    Object.entries(vars).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(placeholder, value || '');
    });
    return html;
  }

  /**
   * Send email helper
   */
  static async sendEmail(to, subject, htmlContent) {
    try {
      const transporter = this.getTransporter();
      if (!transporter) {
        logger.info(`Email skipped (no transporter): To=${to}, Subject=${subject}`);
        return { success: true, method: 'logged' };
      }

      const info = await transporter.sendMail({
        from: process.env.NOTIFICATION_EMAIL_FROM || 'noreply@malabarbazaar.com',
        to,
        subject,
        html: htmlContent,
      });

      logger.info(`Email sent: To=${to}, MessageId=${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`Email send failed: To=${to}, Error=${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify when order is created
   */
  static async notifyOrderCreated(order) {
    try {
      const template = await this.loadTemplate('order-created');
      if (!template) {
        logger.warn('order-created template not found; skipping notification');
        return;
      }

      const html = this.replaceTemplateVars(template, {
        customerName: order.customerName || 'Valued Customer',
        orderId: order._id?.toString() || order.id || 'N/A',
        serviceName: order.serviceName || 'Business Service',
        categoryName: order.categoryName || '',
        priceNumber: order.pricing?.priceNumber || 0,
        orderDate: new Date(order.orderDate).toLocaleDateString(),
        orderUrl: `${process.env.FRONTEND_BASE_URL || 'https://malabarbazaar.com'}/business-services?order=${order._id}`,
      });

      await this.sendEmail(
        order.customerEmail,
        `Order Confirmation: ${order.serviceName}`,
        html
      );

      logger.info(`Order creation notification sent to ${order.customerEmail} for order ${order._id}`);
    } catch (error) {
      logger.error('notifyOrderCreated error:', error);
    }
  }

  /**
   * Notify when order status changes
   */
  static async notifyOrderStatusChanged(order, previousStatus, changedBy) {
    try {
      const template = await this.loadTemplate('status-updated');
      if (!template) {
        logger.warn('status-updated template not found; skipping notification');
        return;
      }

      const statusLabels = {
        'submitted': 'Submitted',
        'under-review': 'Under Review',
        'processing': 'Processing',
        'completed': 'Completed',
        'rejected': 'Rejected',
        'pending-docs': 'Pending Documents',
      };

      const html = this.replaceTemplateVars(template, {
        customerName: order.customerName || 'Valued Customer',
        orderId: order._id?.toString() || order.id || 'N/A',
        previousStatus: statusLabels[previousStatus] || previousStatus,
        newStatus: statusLabels[order.status] || order.status,
        serviceName: order.serviceName || 'Business Service',
        orderUrl: `${process.env.FRONTEND_BASE_URL || 'https://malabarbazaar.com'}/business-services?order=${order._id}`,
      });

      await this.sendEmail(
        order.customerEmail,
        `Order Status Update: ${statusLabels[order.status] || order.status}`,
        html
      );

      logger.info(
        `Status change notification sent to ${order.customerEmail}: ${previousStatus} → ${order.status}`
      );
    } catch (error) {
      logger.error('notifyOrderStatusChanged error:', error);
    }
  }

  /**
   * Notify when payment is received
   */
  static async notifyPaymentReceived(order, paymentDetails) {
    try {
      const template = await this.loadTemplate('payment-received');
      if (!template) {
        logger.warn('payment-received template not found; skipping notification');
        return;
      }

      const html = this.replaceTemplateVars(template, {
        customerName: order.customerName || 'Valued Customer',
        orderId: order._id?.toString() || order.id || 'N/A',
        amount: order.pricing?.priceNumber || 0,
        serviceName: order.serviceName || 'Business Service',
        paymentMethod: paymentDetails?.razorpayMethod || paymentDetails?.stripeStatus || 'Online',
        orderUrl: `${process.env.FRONTEND_BASE_URL || 'https://malabarbazaar.com'}/business-services?order=${order._id}`,
      });

      await this.sendEmail(
        order.customerEmail,
        `Payment Confirmed - Order ${order._id?.toString().slice(-6).toUpperCase()}`,
        html
      );

      logger.info(`Payment received notification sent to ${order.customerEmail} for order ${order._id}`);
    } catch (error) {
      logger.error('notifyPaymentReceived error:', error);
    }
  }

  /**
   * Notify when consultant is assigned
   */
  static async notifyConsultantAssignment(order, consultantEmail, consultantName) {
    try {
      const template = await this.loadTemplate('consultant-assigned');
      if (!template) {
        logger.warn('consultant-assigned template not found; skipping notification');
        return;
      }

      const html = this.replaceTemplateVars(template, {
        customerName: order.customerName || 'Valued Customer',
        consultantName: consultantName || 'Our Expert',
        serviceName: order.serviceName || 'Business Service',
        orderId: order._id?.toString() || order.id || 'N/A',
        orderUrl: `${process.env.FRONTEND_BASE_URL || 'https://malabarbazaar.com'}/business-services?order=${order._id}`,
      });

      await this.sendEmail(
        order.customerEmail,
        `Expert Assigned: ${consultantName || 'Our Consultant'}`,
        html
      );

      logger.info(`Consultant assignment notification sent to ${order.customerEmail}`);

      // Also notify consultant
      try {
        const consultantTemplate = await this.loadTemplate('consultant-order-assigned');
        if (consultantTemplate) {
          const consultantHtml = this.replaceTemplateVars(consultantTemplate, {
            consultantName: consultantName || 'Consultant',
            serviceName: order.serviceName || 'Business Service',
            customerName: order.customerName || 'Customer',
            orderId: order._id?.toString() || order.id || 'N/A',
            adminUrl: `${process.env.FRONTEND_BASE_URL || 'https://malabarbazaar.com'}/business-services-consultant?order=${order._id}`,
          });

          await this.sendEmail(
            consultantEmail,
            `New Order Assigned: ${order.serviceName}`,
            consultantHtml
          );
          logger.info(`Consultant notification sent to ${consultantEmail}`);
        }
      } catch (error) {
        logger.warn('Failed to send consultant notification:', error.message);
      }
    } catch (error) {
      logger.error('notifyConsultantAssignment error:', error);
    }
  }

  /**
   * Notify when deliverables are uploaded
   */
  static async notifyDeliverablesUploaded(order, consultantName) {
    try {
      const template = await this.loadTemplate('deliverables-uploaded');
      if (!template) {
        logger.warn('deliverables-uploaded template not found; skipping notification');
        return;
      }

      const html = this.replaceTemplateVars(template, {
        customerName: order.customerName || 'Valued Customer',
        consultantName: consultantName || 'Our Expert',
        serviceName: order.serviceName || 'Business Service',
        orderId: order._id?.toString() || order.id || 'N/A',
        orderUrl: `${process.env.FRONTEND_BASE_URL || 'https://malabarbazaar.com'}/business-services?order=${order._id}`,
      });

      await this.sendEmail(
        order.customerEmail,
        `Your Order Deliverables Ready for Review`,
        html
      );

      logger.info(`Deliverables uploaded notification sent to ${order.customerEmail}`);
    } catch (error) {
      logger.error('notifyDeliverablesUploaded error:', error);
    }
  }

  /**
   * Notify when invoice is generated
   */
  static async notifyInvoiceGenerated(order, invoicePath) {
    try {
      const template = await this.loadTemplate('invoice-generated');
      if (!template) {
        logger.warn('invoice-generated template not found; skipping notification');
        return;
      }

      const html = this.replaceTemplateVars(template, {
        customerName: order.customerName || 'Valued Customer',
        serviceName: order.serviceName || 'Business Service',
        amount: order.pricing?.priceNumber || 0,
        orderId: order._id?.toString() || order.id || 'N/A',
        orderUrl: `${process.env.FRONTEND_BASE_URL || 'https://malabarbazaar.com'}/business-services?order=${order._id}`,
        invoiceUrl: `${process.env.FRONTEND_BASE_URL || 'https://malabarbazaar.com'}/api/business-services/orders/${order._id}/invoice/pdf`,
      });

      await this.sendEmail(
        order.customerEmail,
        `Invoice: ${order.serviceName}`,
        html
      );

      logger.info(`Invoice generation notification sent to ${order.customerEmail}`);
    } catch (error) {
      logger.error('notifyInvoiceGenerated error:', error);
    }
  }

  /**
   * Notify when interaction request is created
   */
  static async notifyInteractionCreated(interaction, order) {
    try {
      const template = await this.loadTemplate('interaction-request');
      if (!template) {
        logger.warn('interaction-request template not found; skipping notification');
        return;
      }

      const interactionTypeLabels = {
        'chat-request': 'Chat Request',
        'call-request': 'Call Request',
        'consultation-request': 'Consultation Request',
        'vendor-contact-request': 'Vendor Contact Request',
      };

      const html = this.replaceTemplateVars(template, {
        consultantName: order.consultant?.assignedName || 'Consultant',
        customerName: interaction.customerName || 'Customer',
        interactionType: interactionTypeLabels[interaction.interactionType] || interaction.interactionType,
        serviceName: order.serviceName || 'Business Service',
        orderId: order._id?.toString() || order.id || 'N/A',
        message: interaction.notes || 'Customer has requested to connect.',
      });

      await this.sendEmail(
        order.consultant?.assignedEmail,
        `${interactionTypeLabels[interaction.interactionType] || 'New Interaction'} from Customer`,
        html
      );

      logger.info(`Interaction notification sent to ${order.consultant?.assignedEmail}`);
    } catch (error) {
      logger.error('notifyInteractionCreated error:', error);
    }
  }
}

module.exports = BusinessServiceNotificationService;
