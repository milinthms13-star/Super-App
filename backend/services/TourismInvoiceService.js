const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class TourismInvoiceService {
  constructor() {
    this.invoicesDir = path.join(__dirname, '..', 'invoices', 'tourism');
    this.ensureInvoicesDirectory();
  }

  ensureInvoicesDirectory() {
    if (!fs.existsSync(this.invoicesDir)) {
      fs.mkdirSync(this.invoicesDir, { recursive: true });
    }
  }

  /**
   * Generate invoice for a booking
   */
  async generateInvoice(booking, payment) {
    try {
      const invoiceNumber = this.generateInvoiceNumber(booking);
      const fileName = `${invoiceNumber}.pdf`;
      const filePath = path.join(this.invoicesDir, fileName);

      // Create PDF document
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Add content to PDF
      this.addHeader(doc);
      this.addInvoiceDetails(doc, booking, invoiceNumber);
      this.addCustomerDetails(doc, booking);
      this.addPackageDetails(doc, booking);
      this.addPaymentDetails(doc, booking, payment);
      this.addFooter(doc);

      doc.end();

      // Wait for PDF to be written
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      // Update booking with invoice details
      booking.invoiceNumber = invoiceNumber;
      booking.invoiceUrl = `/invoices/tourism/${fileName}`;
      await booking.save();

      logger.info(`Invoice generated: ${invoiceNumber} for booking ${booking._id}`);

      return {
        success: true,
        invoiceNumber,
        filePath,
        fileName,
      };
    } catch (error) {
      logger.error('Error generating invoice:', error);
      throw error;
    }
  }

  generateInvoiceNumber(booking) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-TOUR-${year}${month}-${random}`;
  }

  addHeader(doc) {
    doc
      .fontSize(20)
      .fillColor('#667eea')
      .text('NILATRAVEL TOURISM', { align: 'center' })
      .fontSize(10)
      .fillColor('#6b7280')
      .text('Kerala Tourism Marketplace', { align: 'center' })
      .moveDown(0.5)
      .text('Email: support@nilatravel.com | Phone: 1800-425-4747', { align: 'center' })
      .moveDown(2);
  }

  addInvoiceDetails(doc, booking, invoiceNumber) {
    const currentY = doc.y;
    
    doc
      .fontSize(16)
      .fillColor('#111827')
      .text('TAX INVOICE', 50, currentY)
      .fontSize(10)
      .fillColor('#6b7280');

    doc
      .text(`Invoice No: ${invoiceNumber}`, 350, currentY)
      .text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 350, currentY + 15)
      .text(`Booking ID: ${booking.confirmationNumber}`, 350, currentY + 30);

    doc.moveDown(2);
  }

  addCustomerDetails(doc, booking) {
    doc
      .fontSize(12)
      .fillColor('#111827')
      .text('Bill To:', 50)
      .fontSize(10)
      .fillColor('#374151')
      .text(booking.customerName, 50, doc.y + 5)
      .text(booking.customerEmail)
      .text(booking.customerPhone)
      .moveDown(1.5);
  }

  addPackageDetails(doc, booking) {
    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 300;
    const col3 = 450;

    // Table header
    doc
      .fontSize(10)
      .fillColor('#ffffff')
      .rect(col1, tableTop, 495, 25)
      .fill('#667eea')
      .fillColor('#ffffff')
      .text('Description', col1 + 10, tableTop + 8)
      .text('Quantity', col2 + 10, tableTop + 8)
      .text('Amount (₹)', col3 + 10, tableTop + 8);

    let currentY = tableTop + 35;

    // Package details
    doc
      .fillColor('#374151')
      .text(booking.packageTitle, col1 + 10, currentY)
      .text(`${booking.travelerCount} pax`, col2 + 10, currentY)
      .text(booking.amountSummary.baseAmount.toLocaleString('en-IN'), col3 + 10, currentY);

    currentY += 20;

    // Subtotal
    doc
      .text('Subtotal:', col2 + 10, currentY)
      .text(booking.amountSummary.totalAmount.toLocaleString('en-IN'), col3 + 10, currentY);

    currentY += 20;

    // Discount if any
    if (booking.amountSummary.discountAmount > 0) {
      doc
        .fillColor('#059669')
        .text(`Discount (${booking.amountSummary.couponCode || 'Applied'}):`, col2 + 10, currentY)
        .text(`-${booking.amountSummary.discountAmount.toLocaleString('en-IN')}`, col3 + 10, currentY);
      currentY += 20;
    }

    // GST calculation (5%)
    const gstAmount = Math.round((booking.amountSummary.chargeableAmount * 5) / 100);
    doc
      .fillColor('#374151')
      .text('GST (5%):', col2 + 10, currentY)
      .text(gstAmount.toLocaleString('en-IN'), col3 + 10, currentY);

    currentY += 20;

    // Service charge (2%)
    const serviceCharge = Math.round((booking.amountSummary.chargeableAmount * 2) / 100);
    doc
      .text('Service Charge (2%):', col2 + 10, currentY)
      .text(serviceCharge.toLocaleString('en-IN'), col3 + 10, currentY);

    currentY += 30;

    // Total
    const finalTotal = booking.amountSummary.chargeableAmount + gstAmount + serviceCharge;
    doc
      .fontSize(12)
      .fillColor('#111827')
      .rect(col2, currentY - 5, 245, 25)
      .fill('#f3f4f6')
      .fillColor('#111827')
      .text('Total Amount:', col2 + 10, currentY)
      .text(`₹${finalTotal.toLocaleString('en-IN')}`, col3 + 10, currentY);

    doc.moveDown(2);
  }

  addPaymentDetails(doc, booking, payment) {
    const currentY = doc.y + 20;

    doc
      .fontSize(12)
      .fillColor('#111827')
      .text('Payment Details:', 50, currentY)
      .fontSize(10)
      .fillColor('#374151')
      .text(`Payment Type: ${booking.amountSummary.paymentType === 'advance' ? 'Advance (30%)' : 'Full Payment'}`, 50, currentY + 20)
      .text(`Amount Paid: ₹${booking.amountSummary.paidAmount.toLocaleString('en-IN')}`, 50, currentY + 35);

    if (payment) {
      doc
        .text(`Payment Method: ${payment.paymentMethod || 'Online'}`, 50, currentY + 50)
        .text(`Payment Date: ${new Date(payment.capturedAt || payment.createdAt).toLocaleDateString('en-IN')}`, 50, currentY + 65)
        .text(`Transaction ID: ${payment.providerPaymentId || payment.orderId}`, 50, currentY + 80);
    }

    const balanceAmount = booking.amountSummary.totalAmount - booking.amountSummary.paidAmount;
    if (balanceAmount > 0) {
      doc
        .fillColor('#dc2626')
        .text(`Balance Due: ₹${balanceAmount.toLocaleString('en-IN')}`, 50, currentY + 110)
        .fillColor('#374151')
        .fontSize(8)
        .text('* Balance payment to be made before travel date', 50, currentY + 125);
    }

    doc.moveDown(3);
  }

  addFooter(doc) {
    const bottomY = doc.page.height - 100;

    doc
      .fontSize(8)
      .fillColor('#6b7280')
      .text('Terms & Conditions:', 50, bottomY)
      .text('1. Cancellation policy as per package terms applies.', 50, bottomY + 12)
      .text('2. Refunds will be processed within 7-10 business days.', 50, bottomY + 24)
      .text('3. Please carry valid ID proof during travel.', 50, bottomY + 36)
      .moveDown(1)
      .text('Thank you for choosing NilaTravel Tourism!', { align: 'center' })
      .text('For support: support@nilatravel.com | 1800-425-4747', { align: 'center' });
  }

  /**
   * Get invoice file path
   */
  getInvoicePath(invoiceNumber) {
    return path.join(this.invoicesDir, `${invoiceNumber}.pdf`);
  }

  /**
   * Check if invoice exists
   */
  invoiceExists(invoiceNumber) {
    const filePath = this.getInvoicePath(invoiceNumber);
    return fs.existsSync(filePath);
  }
}

module.exports = new TourismInvoiceService();
