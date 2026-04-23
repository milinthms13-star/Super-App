const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const INVOICE_DIR = path.join(__dirname, '..', 'invoices');

const parseAmount = (value) => {
  if (typeof value === 'number') {
    return value;
  }

  const numericValue = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const formatInr = (value) => `INR ${parseAmount(value).toFixed(2)}`;

const ensureInvoiceDirectory = () => {
  if (!fs.existsSync(INVOICE_DIR)) {
    fs.mkdirSync(INVOICE_DIR, { recursive: true });
  }
};

const getTaxRate = (category = 'default') => {
  const normalizedCategory = String(category || '').trim().toLowerCase();
  const taxRates = {
    electronics: 18,
    apparel: 12,
    food: 5,
    grocery: 5,
    beauty: 18,
    default: 18,
  };

  return taxRates[normalizedCategory] || taxRates.default;
};

const validateGSTIN = (gstin = '') => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(String(gstin || '').trim());

const buildInvoiceRows = (order = {}) => {
  const items = Array.isArray(order.items) ? order.items : [];

  return items.map((item) => {
    const quantity = Math.max(1, Number(item.quantity || 1));
    const rate = parseAmount(item.price);
    const taxableValue = quantity * rate;
    const taxRate = getTaxRate(item.category);
    const gstAmount = (taxableValue * taxRate) / 100;

    return {
      name: item.name || 'Product',
      hsn: item.category || 'NA',
      quantity,
      rate,
      taxableValue,
      taxRate,
      gstAmount,
      total: taxableValue + gstAmount,
    };
  });
};

const generateGSTInvoice = async (order, options = {}) => {
  try {
    ensureInvoiceDirectory();

    const invoiceId = options.invoiceId || `INV-${String(order.id || order._id || Date.now()).slice(-8).toUpperCase()}`;
    const filename = `${invoiceId}.pdf`;
    const filePath = path.join(INVOICE_DIR, filename);
    const rows = buildInvoiceRows(order);
    const subtotal = rows.reduce((sum, row) => sum + row.taxableValue, 0);
    const totalTax = rows.reduce((sum, row) => sum + row.gstAmount, 0);
    const grandTotal = parseAmount(order.amount || subtotal + totalTax);
    const sellerFulfillment = Array.isArray(order.sellerFulfillments) ? order.sellerFulfillments[0] || {} : {};
    const customerGSTIN = String(options.customerGSTIN || '').trim();

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    await new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      doc.fontSize(20).text('GST TAX INVOICE', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Invoice ID: ${invoiceId}`, { align: 'right' });
      doc.text(`Invoice Date: ${new Date().toLocaleDateString('en-IN')}`, { align: 'right' });
      doc.moveDown();

      doc.fontSize(12).text('Seller', 40, 110);
      doc.fontSize(10)
        .text(sellerFulfillment.businessName || sellerFulfillment.sellerName || 'Marketplace Seller', 40, 128)
        .text(`Contact: ${sellerFulfillment.sellerEmail || 'Not available'}`, 40, 144)
        .text(`GSTIN: ${options.sellerGSTIN || '32ABCDE1234F1Z5'}`, 40, 160);

      doc.fontSize(12).text('Buyer', 320, 110);
      doc.fontSize(10)
        .text(order.customerName || 'Customer', 320, 128)
        .text(order.customerEmail || 'Not available', 320, 144)
        .text(`Address: ${order.deliveryAddress || 'Not available'}`, 320, 160, { width: 220 });

      if (customerGSTIN && validateGSTIN(customerGSTIN)) {
        doc.text(`GSTIN: ${customerGSTIN}`, 320, 194);
      }

      let y = 240;
      doc.fontSize(10)
        .text('Item', 40, y)
        .text('HSN', 210, y)
        .text('Qty', 260, y)
        .text('Rate', 300, y)
        .text('Taxable', 360, y)
        .text('GST %', 440, y)
        .text('GST Amt', 490, y)
        .text('Total', 550, y);

      y += 18;
      doc.moveTo(40, y - 4).lineTo(570, y - 4).strokeColor('#cccccc').stroke();

      rows.forEach((row) => {
        if (y > 740) {
          doc.addPage();
          y = 60;
        }

        doc
          .fontSize(9)
          .fillColor('#111111')
          .text(row.name, 40, y, { width: 160 })
          .text(row.hsn, 210, y)
          .text(String(row.quantity), 260, y)
          .text(formatInr(row.rate), 300, y)
          .text(formatInr(row.taxableValue), 360, y)
          .text(`${row.taxRate}%`, 440, y)
          .text(formatInr(row.gstAmount), 490, y)
          .text(formatInr(row.total), 550, y);

        y += 22;
      });

      y += 20;
      doc.moveTo(330, y - 8).lineTo(570, y - 8).strokeColor('#cccccc').stroke();
      doc.fontSize(10)
        .text(`Subtotal: ${formatInr(subtotal)}`, 360, y)
        .text(`CGST: ${formatInr(totalTax / 2)}`, 360, y + 18)
        .text(`SGST: ${formatInr(totalTax / 2)}`, 360, y + 36)
        .font('Helvetica-Bold')
        .text(`Grand Total: ${formatInr(grandTotal)}`, 360, y + 58);

      doc.font('Helvetica').fontSize(9).text(
        'This invoice was auto-generated by Malabar Bazaar at order completion.',
        40,
        y + 110,
        { align: 'center', width: 530 }
      );

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
      doc.on('error', reject);
    });

    return {
      invoiceId,
      fileName: filename,
      filePath,
      generatedAt: new Date().toISOString(),
      subtotal,
      totalTax,
      grandTotal,
    };
  } catch (error) {
    logger.error('GST invoice generation failed:', error);
    throw error;
  }
};

module.exports = {
  buildInvoiceRows,
  formatInr,
  generateGSTInvoice,
  getTaxRate,
  validateGSTIN,
};
