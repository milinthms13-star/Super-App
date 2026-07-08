const logger = require('../utils/logger');
const { sendEmail, isConfigured: isEmailConfigured } = require('../utils/sendEmail');
const { sendSMS } = require('../utils/sendSMS');

class TourismNotificationService {
  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(booking) {
    try {
      if (!isEmailConfigured()) {
        logger.warn('Email not configured. Skipping booking confirmation email.');
        return { success: false, reason: 'Email not configured' };
      }

      const subject = `Booking Confirmation - ${booking.packageTitle}`;
      const htmlContent = this.buildBookingConfirmationEmail(booking);

      await sendEmail(booking.customerEmail, subject, htmlContent);
      
      // Update notification flag
      booking.notificationsSent.bookingConfirmation = true;
      await booking.save();

      logger.info(`Booking confirmation email sent to ${booking.customerEmail}`);
      return { success: true };
    } catch (error) {
      logger.error('Error sending booking confirmation email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send payment receipt email
   */
  async sendPaymentReceipt(booking, payment) {
    try {
      if (!isEmailConfigured()) {
        logger.warn('Email not configured. Skipping payment receipt email.');
        return { success: false, reason: 'Email not configured' };
      }

      const subject = `Payment Receipt - ${booking.confirmationNumber}`;
      const htmlContent = this.buildPaymentReceiptEmail(booking, payment);

      await sendEmail(booking.customerEmail, subject, htmlContent);
      
      // Update notification flag
      booking.notificationsSent.paymentReceipt = true;
      await booking.save();

      logger.info(`Payment receipt email sent to ${booking.customerEmail}`);
      return { success: true };
    } catch (error) {
      logger.error('Error sending payment receipt email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send booking status update email
   */
  async sendBookingStatusUpdate(booking, oldStatus, newStatus) {
    try {
      if (!isEmailConfigured()) {
        logger.warn('Email not configured. Skipping status update email.');
        return { success: false, reason: 'Email not configured' };
      }

      const subject = `Booking Status Update - ${booking.confirmationNumber}`;
      const htmlContent = this.buildStatusUpdateEmail(booking, oldStatus, newStatus);

      await sendEmail(booking.customerEmail, subject, htmlContent);
      
      booking.notificationsSent.statusUpdate = true;
      await booking.save();

      logger.info(`Status update email sent to ${booking.customerEmail}`);
      return { success: true };
    } catch (error) {
      logger.error('Error sending status update email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send vendor lead notification
   */
  async sendVendorLeadNotification(vendor, lead) {
    try {
      if (!isEmailConfigured()) {
        logger.warn('Email not configured. Skipping vendor lead notification.');
        return { success: false, reason: 'Email not configured' };
      }

      const subject = `New Lead: ${lead.destination} - ${lead.travelerName}`;
      const htmlContent = this.buildVendorLeadEmail(vendor, lead);

      await sendEmail(vendor.email, subject, htmlContent);

      logger.info(`Vendor lead notification sent to ${vendor.email}`);
      return { success: true };
    } catch (error) {
      logger.error('Error sending vendor lead notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS notification for booking
   */
  async sendBookingSMS(booking) {
    try {
      const message = `Dear ${booking.customerName}, your tourism booking ${booking.confirmationNumber} for ${booking.packageTitle} on ${booking.travelDate} is confirmed. Total: ₹${booking.amountSummary.payableAmount}. Contact: ${booking.vendorName}`;
      
      const result = await sendSMS(booking.customerPhone, message);
      
      if (result.success) {
        logger.info(`Booking SMS sent to ${booking.customerPhone}`);
      }
      
      return result;
    } catch (error) {
      logger.error('Error sending booking SMS:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Build booking confirmation email HTML
   */
  buildBookingConfirmationEmail(booking) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: bold; color: #6b7280; }
          .detail-value { color: #111827; }
          .amount-box { background: #ecfdf5; border: 2px solid #10b981; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .amount { font-size: 28px; font-weight: bold; color: #059669; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Booking Confirmed!</h1>
            <p>Your Kerala tourism package is confirmed</p>
          </div>
          <div class="content">
            <p>Dear ${booking.customerName},</p>
            <p>Thank you for booking with us! Your tourism package has been confirmed.</p>
            
            <div class="booking-details">
              <h2 style="margin-top: 0; color: #667eea;">Booking Details</h2>
              <div class="detail-row">
                <span class="detail-label">Confirmation Number:</span>
                <span class="detail-value"><strong>${booking.confirmationNumber}</strong></span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Package:</span>
                <span class="detail-value">${booking.packageTitle}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Travel Date:</span>
                <span class="detail-value">${booking.travelDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Travelers:</span>
                <span class="detail-value">${booking.travelerCount} person(s)</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Pickup City:</span>
                <span class="detail-value">${booking.pickupCity}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Hotel Category:</span>
                <span class="detail-value">${booking.hotelCategory}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Vendor:</span>
                <span class="detail-value">${booking.vendorName}</span>
              </div>
            </div>

            <div class="amount-box">
              <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">Total Amount</div>
              <div class="amount">₹${booking.amountSummary.totalAmount.toLocaleString('en-IN')}</div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">
                Paid: ₹${booking.amountSummary.paidAmount.toLocaleString('en-IN')} | 
                Balance: ₹${(booking.amountSummary.totalAmount - booking.amountSummary.paidAmount).toLocaleString('en-IN')}
              </div>
            </div>

            ${booking.bookingNote ? `<p><strong>Your Note:</strong> ${booking.bookingNote}</p>` : ''}

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <strong>⚠️ Important:</strong> Please verify your travel documents, weather conditions, and complete payment before your travel date.
            </div>

            <p><strong>Contact Information:</strong><br>
            Email: ${booking.customerEmail}<br>
            Phone: ${booking.customerPhone}</p>

            <p>For any queries, please contact the vendor or our support team.</p>

            <div style="text-align: center;">
              <a href="#" class="button">View Booking Details</a>
            </div>
          </div>
          <div class="footer">
            <p>Kerala Tourism Helpline: 1800-425-4747</p>
            <p>This is an automated email. Please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Build payment receipt email HTML
   */
  buildPaymentReceiptEmail(booking, payment) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .receipt-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #10b981; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: bold; color: #6b7280; }
          .detail-value { color: #111827; }
          .success-badge { background: #d1fae5; color: #065f46; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Payment Received</h1>
            <p>Thank you for your payment</p>
          </div>
          <div class="content">
            <p>Dear ${booking.customerName},</p>
            <p>We have successfully received your payment for booking <strong>${booking.confirmationNumber}</strong>.</p>
            
            <div class="receipt-box">
              <h2 style="margin-top: 0; color: #10b981;">Payment Receipt</h2>
              <div class="detail-row">
                <span class="detail-label">Payment ID:</span>
                <span class="detail-value">${payment.orderId}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Payment Date:</span>
                <span class="detail-value">${new Date(payment.capturedAt || payment.createdAt).toLocaleString('en-IN')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Amount Paid:</span>
                <span class="detail-value"><strong>₹${payment.amount.toLocaleString('en-IN')}</strong></span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Payment Method:</span>
                <span class="detail-value">${payment.paymentMethod || 'Online'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Payment Status:</span>
                <span class="detail-value"><span class="success-badge">SUCCESS</span></span>
              </div>
              ${payment.reference ? `
              <div class="detail-row">
                <span class="detail-label">Reference:</span>
                <span class="detail-value">${payment.reference}</span>
              </div>
              ` : ''}
            </div>

            <div style="background: #e0e7ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <strong>📦 Package Details:</strong><br>
              ${booking.packageTitle}<br>
              Travel Date: ${booking.travelDate}<br>
              Travelers: ${booking.travelerCount} person(s)
            </div>

            <p>Your invoice will be sent separately. Please keep this receipt for your records.</p>

            ${booking.amountSummary.totalAmount > booking.amountSummary.paidAmount ? `
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <strong>Balance Payment:</strong> ₹${(booking.amountSummary.totalAmount - booking.amountSummary.paidAmount).toLocaleString('en-IN')}<br>
              Please pay the balance amount before your travel date.
            </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>For any payment-related queries, contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Build status update email HTML
   */
  buildStatusUpdateEmail(booking, oldStatus, newStatus) {
    const statusEmoji = {
      pending: '⏳',
      confirmed: '✅',
      paid: '💰',
      cancelled: '❌',
      completed: '🎉',
      refunded: '💸',
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .status-change { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .status-badge { display: inline-block; padding: 10px 20px; border-radius: 20px; font-weight: bold; margin: 10px; }
          .old-status { background: #e5e7eb; color: #6b7280; }
          .new-status { background: #d1fae5; color: #065f46; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📢 Booking Status Update</h1>
          </div>
          <div class="content">
            <p>Dear ${booking.customerName},</p>
            <p>Your booking status has been updated.</p>
            
            <div class="status-change">
              <h3>Booking: ${booking.confirmationNumber}</h3>
              <p>${booking.packageTitle}</p>
              <div style="margin: 20px 0;">
                <span class="status-badge old-status">${statusEmoji[oldStatus] || ''} ${oldStatus.toUpperCase()}</span>
                <span style="font-size: 24px; margin: 0 10px;">→</span>
                <span class="status-badge new-status">${statusEmoji[newStatus] || ''} ${newStatus.toUpperCase()}</span>
              </div>
            </div>

            ${newStatus === 'cancelled' && booking.cancellationReason ? `
            <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
              <strong>Cancellation Reason:</strong><br>${booking.cancellationReason}
            </div>
            ` : ''}

            ${newStatus === 'cancelled' && booking.refundAmount > 0 ? `
            <p><strong>Refund Amount:</strong> ₹${booking.refundAmount.toLocaleString('en-IN')}<br>
            Your refund will be processed within 7-10 business days.</p>
            ` : ''}

            <p>If you have any questions, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>Kerala Tourism Helpline: 1800-425-4747</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Build vendor lead email HTML
   */
  buildVendorLeadEmail(vendor, lead) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .lead-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #8b5cf6; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: bold; color: #6b7280; }
          .detail-value { color: #111827; }
          .priority-badge { background: #fef3c7; color: #92400e; padding: 5px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 New Lead Received</h1>
            <p>Action required</p>
          </div>
          <div class="content">
            <p>Dear ${vendor.name},</p>
            <p>You have received a new tourism lead. Please contact the customer as soon as possible.</p>
            
            <div class="lead-box">
              <h2 style="margin-top: 0; color: #8b5cf6;">Lead Details</h2>
              <div class="detail-row">
                <span class="detail-label">Customer Name:</span>
                <span class="detail-value">${lead.travelerName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Phone:</span>
                <span class="detail-value">${lead.travelerPhone}</span>
              </div>
              ${lead.travelerEmail ? `
              <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${lead.travelerEmail}</span>
              </div>
              ` : ''}
              <div class="detail-row">
                <span class="detail-label">Destination:</span>
                <span class="detail-value">${lead.destination}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Travel Date:</span>
                <span class="detail-value">${lead.startDate || 'Flexible'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">${lead.days} days</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Budget:</span>
                <span class="detail-value">₹${lead.budget.toLocaleString('en-IN')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Traveler Type:</span>
                <span class="detail-value">${lead.travelerType}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Priority:</span>
                <span class="detail-value"><span class="priority-badge">${lead.priority.toUpperCase()}</span></span>
              </div>
              ${lead.note ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                <strong>Customer Note:</strong><br>
                ${lead.note}
              </div>
              ` : ''}
            </div>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <strong>⏰ Action Required:</strong> Contact the customer within 24 hours to maximize conversion.
            </div>

            <p>Log in to your vendor dashboard to update the lead status and send proposals.</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from the Tourism Marketplace.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new TourismNotificationService();
