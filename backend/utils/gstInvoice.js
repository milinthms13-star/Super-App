const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class GSTInvoicing {
  static async generateGSTInvoice(order, customerGST = null) {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filename = `invoice-${order.id}-${Date.now()}.pdf`;
      const filepath = path.join(__dirname, '../invoices', filename);
      
      // Ensure invoices dir
      if (!fs.existsSync(path.dirname(filepath))) {
        fs.mkdirSync(path.dirname(filepath), { recursive: true });
      }

      // Header
      doc.fontSize(20).text('GST TAX INVOICE', { align: 'center' });
      doc.moveDown();
      
      // Seller details
      doc.fontSize(12).text('Seller:', 50, 100);
      const sellerFulfillment = order.sellerFulfillments[0];
      doc.text(`${sellerFulfillment.sellerName || 'Seller'}`, 150, 100);
      doc.text(`${sellerFulfillment.businessName || 'Business'}`, 150, 120);
      doc.text('GSTIN: 32ABCDE1234F1Z5', 150, 140); // Replace with dynamic
      
      // Buyer details
      doc.text('Buyer:', 400, 100);
      doc.text(order.customerName, 480, 100);
      doc.text(order.customerEmail, 480, 120);
      
      if (customerGST) {
        doc.text(`GSTIN: ${customerGST}`, 480, 140);
      }

      // Invoice details
      doc.moveDown(2);
      doc.text(`Invoice #: ${order.id.slice(-8)}`, { continued: true });
      doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });

      // Table headers
      const tableTop = doc.y + 20;
      doc.fontSize(10)
        .text('Description', 50, tableTop)
        .text('HSN', 250, tableTop)
        .text('Qty', 320, tableTop)
        .text('Rate', 380, tableTop)
        .text('Taxable Value', 440, tableTop)
        .text('GST @%', 520, tableTop)
        .text('GST Amt', 580, tableTop)
        .text('Total', 640, tableTop);

      // Items table
      let yPosition = tableTop + 20;
      let subtotal = 0;
      
      order.items.forEach((item, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        const rate = parseFloat(item.price || 0);
        const qty = parseInt(item.quantity || 1);
        const taxableValue = rate * qty;
        const cgst = taxableValue * 0.09; // 18% total GST (9% CGST + 9% SGST)
        const sgst = taxableValue * 0.09;
        const total = taxableValue + cgst + sgst;

        doc.text(item.name || 'Product', 50, yPosition)
          .text(item.category || 'NA', 250, yPosition)
          .text(qty.toString(), 320, yPosition)
          .text(`₹${rate.toFixed(2)}`, 380, yPosition)
          .text(`₹${taxableValue.toFixed(2)}`, 440, yPosition)
          .text('18%', 520, yPosition)
          .text(`₹${(cgst + sgst).toFixed(2)}`, 580, yPosition)
          .text(`₹${total.toFixed(2)}`, 640, yPosition);

        subtotal += taxableValue;
        yPosition += 20;
      });

      // Totals
      doc.moveDown();
      doc.text(`Subtotal: ₹${subtotal.toFixed(2)}`, 440);
      
      const grandTotal = parseFloat(order.amount.replace(/[^\d.]/g, '')) || 0;
      const totalGST = grandTotal - subtotal;
      
      doc.text(`Total GST (18%): ₹${totalGST.toFixed(2)}`, 440);
      doc.text(`Grand Total: ₹${grandTotal.toFixed(2)}`, 440, { underline: true });

      // GST Summary table
      yPosition += 30;
      doc.text('GST BREAKUP:', 50, yPosition);
      doc.text('CGST (9%):', 400, yPosition);
      doc.text(`₹${(totalGST / 2).toFixed(2)}`, 500, yPosition);
      doc.text('SGST (9%):', 400, yPosition + 20);
      doc.text(`₹${(totalGST / 2).toFixed(2)}`, 500, yPosition + 20);

      // Footer
      doc.moveDown(3);
      doc.fontSize(8).text('Thank you for your business!', { align: 'center' });
      
      // Save file
      return new Promise((resolve, reject) => {
        doc.pipe(fs.createWriteStream(filepath));
        doc.end();
        doc.on('end', () => resolve(filepath));
        doc.on('error', reject);
      });

    } catch (error) {
      logger.error('GST invoice generation failed:', error);
      throw error;
    }
  }

  static validateGSTIN(gstin) {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}?$/i;
    return gstinRegex.test(gstin);
  }

  static getTaxRates(productCategory = 'default') {
    const taxRates = {
      'electronics': 18,
      'apparel': 12,
      'food': 5,
      'default': 18
    };
    return taxRates[productCategory.toLowerCase()] || 18;
  }

module.exports = GSTInvoicing;

