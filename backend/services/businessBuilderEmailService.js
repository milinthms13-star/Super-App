const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Email template cache
const templateCache = {};

/**
 * Load and compile email template
 * @param {string} templateName - Template file name
 * @returns {Promise<Function>} - Compiled handlebars template
 */
async function loadTemplate(templateName) {
  if (templateCache[templateName]) {
    return templateCache[templateName];
  }

  const templatePath = path.join(__dirname, '../email-templates', `${templateName}.hbs`);
  const templateContent = await fs.readFile(templatePath, 'utf-8');
  const compiled = handlebars.compile(templateContent);
  templateCache[templateName] = compiled;
  return compiled;
}

/**
 * Send email
 * @param {object} options - Email options
 * @returns {Promise<object>} - Send result
 */
async function sendEmail(options) {
  const {
    to,
    subject,
    html,
    text,
    from = process.env.SMTP_FROM || 'noreply@malabarbazaar.com',
    cc,
    bcc,
    attachments,
  } = options;

  const mailOptions = {
    from,
    to,
    subject,
    html,
    text: text || stripHtml(html),
    cc,
    bcc,
    attachments,
  };

  return transporter.sendMail(mailOptions);
}

/**
 * Strip HTML tags from string
 * @param {string} html - HTML string
 * @returns {string} - Plain text
 */
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Format currency
 * @param {number} amount - Amount
 * @returns {string} - Formatted currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Send invoice created notification
 * @param {object} invoice - Invoice object
 * @param {object} business - Business object
 * @returns {Promise<object>}
 */
async function sendInvoiceCreatedEmail(invoice, business) {
  try {
    const template = await loadTemplate('invoice-created');
    
    const html = template({
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customer.name,
      businessName: business.businessName,
      totalAmount: formatCurrency(invoice.totalAmount),
      dueDate: new Date(invoice.dueDate).toLocaleDateString('en-IN'),
      invoiceUrl: `${process.env.APP_BASE_URL}/invoices/${invoice.invoiceId}`,
      businessPhone: business.phone,
      businessEmail: business.email,
    });

    await sendEmail({
      to: invoice.customer.email,
      subject: `Invoice ${invoice.invoiceNumber} from ${business.businessName}`,
      html,
    });

    // Send copy to business owner
    if (business.email && business.email !== invoice.customer.email) {
      await sendEmail({
        to: business.email,
        subject: `Invoice ${invoice.invoiceNumber} sent to ${invoice.customer.name}`,
        html: template({
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customer.name,
          businessName: business.businessName,
          totalAmount: formatCurrency(invoice.totalAmount),
          dueDate: new Date(invoice.dueDate).toLocaleDateString('en-IN'),
          invoiceUrl: `${process.env.APP_BASE_URL}/invoices/${invoice.invoiceId}`,
          businessPhone: business.phone,
          businessEmail: business.email,
          isBusinessCopy: true,
        }),
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Send invoice email error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send invoice reminder
 * @param {object} invoice - Invoice object
 * @param {object} business - Business object
 * @returns {Promise<object>}
 */
async function sendInvoiceReminderEmail(invoice, business) {
  try {
    const template = await loadTemplate('invoice-reminder');
    
    const daysOverdue = Math.floor(
      (new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24)
    );

    const html = template({
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customer.name,
      businessName: business.businessName,
      totalAmount: formatCurrency(invoice.totalAmount),
      dueDate: new Date(invoice.dueDate).toLocaleDateString('en-IN'),
      daysOverdue,
      invoiceUrl: `${process.env.APP_BASE_URL}/invoices/${invoice.invoiceId}`,
      businessPhone: business.phone,
      businessEmail: business.email,
    });

    await sendEmail({
      to: invoice.customer.email,
      subject: `Payment Reminder: Invoice ${invoice.invoiceNumber} from ${business.businessName}`,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Send invoice reminder error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send order confirmation email
 * @param {object} order - Order object
 * @param {object} miniApp - Mini app object
 * @param {object} business - Business object
 * @returns {Promise<object>}
 */
async function sendOrderConfirmationEmail(order, miniApp, business) {
  try {
    const template = await loadTemplate('order-confirmation');
    
    const items = order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: formatCurrency(item.unitPrice),
      total: formatCurrency(item.total),
    }));

    const html = template({
      orderId: order.orderId,
      customerName: order.customer.name || 'Valued Customer',
      businessName: business.businessName,
      miniAppName: miniApp.appName,
      items,
      subtotal: formatCurrency(order.subtotalAmount),
      discount: formatCurrency(order.discountAmount),
      tax: formatCurrency(order.taxAmount),
      total: formatCurrency(order.totalAmount),
      orderUrl: `${process.env.APP_BASE_URL}/orders/${order.orderId}`,
      businessPhone: business.phone,
      businessEmail: business.email,
    });

    // Send to customer if email provided
    if (order.customer.email) {
      await sendEmail({
        to: order.customer.email,
        subject: `Order Confirmation: ${order.orderId} from ${business.businessName}`,
        html,
      });
    }

    // Send notification to business owner
    if (business.email) {
      await sendEmail({
        to: business.email,
        subject: `New Order Received: ${order.orderId}`,
        html: template({
          orderId: order.orderId,
          customerName: order.customer.name || 'Customer',
          businessName: business.businessName,
          miniAppName: miniApp.appName,
          items,
          subtotal: formatCurrency(order.subtotalAmount),
          discount: formatCurrency(order.discountAmount),
          tax: formatCurrency(order.taxAmount),
          total: formatCurrency(order.totalAmount),
          orderUrl: `${process.env.APP_BASE_URL}/business-builder/orders/${order.orderId}`,
          businessPhone: business.phone,
          businessEmail: business.email,
          isBusinessCopy: true,
          customerPhone: order.customer.phone,
          customerEmail: order.customer.email,
        }),
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Send order confirmation email error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send order status update email
 * @param {object} order - Order object
 * @param {object} business - Business object
 * @param {string} previousStatus - Previous order status
 * @returns {Promise<object>}
 */
async function sendOrderStatusUpdateEmail(order, business, previousStatus) {
  try {
    if (!order.customer.email) {
      return { success: false, error: 'No customer email' };
    }

    const template = await loadTemplate('order-status-update');
    
    const statusMessages = {
      confirmed: 'Your order has been confirmed and is being prepared.',
      processing: 'Your order is now being processed.',
      completed: 'Your order has been completed. Thank you for your business!',
      cancelled: 'Your order has been cancelled.',
    };

    const html = template({
      orderId: order.orderId,
      customerName: order.customer.name || 'Valued Customer',
      businessName: business.businessName,
      status: order.status,
      statusMessage: statusMessages[order.status] || `Your order status has been updated to: ${order.status}`,
      orderUrl: `${process.env.APP_BASE_URL}/orders/${order.orderId}`,
      businessPhone: business.phone,
      businessEmail: business.email,
    });

    await sendEmail({
      to: order.customer.email,
      subject: `Order Update: ${order.orderId} - ${order.status}`,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Send order status update email error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send lead notification email
 * @param {object} lead - Lead object
 * @param {object} miniApp - Mini app object
 * @param {object} business - Business object
 * @returns {Promise<object>}
 */
async function sendLeadNotificationEmail(lead, miniApp, business) {
  try {
    if (!business.email) {
      return { success: false, error: 'No business email' };
    }

    const template = await loadTemplate('lead-notification');
    
    const html = template({
      leadId: lead.leadId,
      customerName: lead.customer.name || 'Anonymous',
      customerPhone: lead.customer.phone,
      customerEmail: lead.customer.email,
      customerMessage: lead.customer.message,
      businessName: business.businessName,
      miniAppName: miniApp.appName,
      source: lead.source,
      leadUrl: `${process.env.APP_BASE_URL}/business-builder/leads/${lead.leadId}`,
    });

    await sendEmail({
      to: business.email,
      subject: `New Lead from ${miniApp.appName}: ${lead.customer.name || 'Interested Customer'}`,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Send lead notification email error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send welcome email to new business
 * @param {object} business - Business object
 * @param {object} user - User object
 * @returns {Promise<object>}
 */
async function sendBusinessWelcomeEmail(business, user) {
  try {
    const template = await loadTemplate('business-welcome');
    
    const html = template({
      userName: user.name || user.email,
      businessName: business.businessName,
      dashboardUrl: `${process.env.APP_BASE_URL}/business-builder`,
      guideUrl: `${process.env.APP_BASE_URL}/guides/getting-started`,
    });

    await sendEmail({
      to: user.email,
      subject: `Welcome to Business Builder - ${business.businessName}`,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Send welcome email error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send mini app published notification
 * @param {object} miniApp - Mini app object
 * @param {object} business - Business object
 * @returns {Promise<object>}
 */
async function sendMiniAppPublishedEmail(miniApp, business) {
  try {
    if (!business.email) {
      return { success: false, error: 'No business email' };
    }

    const template = await loadTemplate('mini-app-published');
    
    const html = template({
      businessName: business.businessName,
      miniAppName: miniApp.appName,
      miniAppUrl: `${process.env.APP_BASE_URL}/miniapp/${miniApp.slug}`,
      qrCodeUrl: miniApp.qrCode?.imageUrl,
      dashboardUrl: `${process.env.APP_BASE_URL}/business-builder/mini-apps/${miniApp.miniAppId}`,
    });

    await sendEmail({
      to: business.email,
      subject: `Your Mini App "${miniApp.appName}" is Now Live!`,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Send mini app published email error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send monthly report email
 * @param {object} business - Business object
 * @param {object} analytics - Analytics data
 * @returns {Promise<object>}
 */
async function sendMonthlyReportEmail(business, analytics) {
  try {
    if (!business.email) {
      return { success: false, error: 'No business email' };
    }

    const template = await loadTemplate('monthly-report');
    
    const html = template({
      businessName: business.businessName,
      month: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      views: analytics.summary.views,
      leads: analytics.summary.leads,
      orders: analytics.summary.orders,
      revenue: formatCurrency(analytics.summary.revenue),
      conversionRate: `${analytics.summary.leadConversionRate}%`,
      dashboardUrl: `${process.env.APP_BASE_URL}/business-builder/analytics`,
    });

    await sendEmail({
      to: business.email,
      subject: `Monthly Report for ${business.businessName}`,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Send monthly report email error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test email configuration
 * @param {string} toEmail - Test recipient email
 * @returns {Promise<object>}
 */
async function testEmailConfiguration(toEmail) {
  try {
    await sendEmail({
      to: toEmail,
      subject: 'Business Builder - Email Configuration Test',
      html: '<h1>Email Configuration Test</h1><p>If you receive this email, your configuration is working correctly!</p>',
    });

    return { success: true, message: 'Test email sent successfully' };
  } catch (error) {
    console.error('Test email error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendEmail,
  sendInvoiceCreatedEmail,
  sendInvoiceReminderEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendLeadNotificationEmail,
  sendBusinessWelcomeEmail,
  sendMiniAppPublishedEmail,
  sendMonthlyReportEmail,
  testEmailConfiguration,
};
