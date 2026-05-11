const express = require('express');
const PDFDocument = require('pdfkit');
const Business = require('../models/Business');
const BusinessInvoice = require('../models/BusinessInvoice');
const MiniApp = require('../models/MiniApp');
const MiniAppProduct = require('../models/MiniAppProduct');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function generateInvoiceNumber(business) {
  const prefix = business?.invoiceSettings?.invoicePrefix || 'INV';
  const timestamp = Date.now();
  return `${prefix}-${String(timestamp).slice(-6)}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function calculateInvoiceTotals(items = [], discountAmount = 0) {
  const sanitizedItems = items.map((item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);
    const taxRate = Number(item.taxRate || 0);
    const amount = quantity * unitPrice;
    return { ...item, quantity, unitPrice, taxRate, amount };
  });

  const subtotal = sanitizedItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = sanitizedItems.reduce(
    (sum, item) => sum + (item.amount * (item.taxRate || 0)) / 100,
    0
  );
  const discount = Number(discountAmount || 0);
  const total = subtotal + taxAmount - discount;

  return {
    items: sanitizedItems,
    subtotal,
    taxAmount,
    total,
    discountAmount: discount,
  };
}

function generateInvoicePdfBuffer(invoice, business) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const businessName = business?.businessName || 'Business';
    const businessAddress = [
      business?.address?.street,
      business?.address?.city,
      business?.address?.state,
      business?.address?.pincode,
      business?.address?.country,
    ]
      .filter(Boolean)
      .join(', ');

    doc.fillColor('#111827').fontSize(20).text(businessName, { continued: false });
    if (businessAddress) {
      doc.fontSize(10).fillColor('#4b5563').text(businessAddress);
    }
    if (business?.phone || business?.email) {
      doc.moveDown(0.25);
      doc.fontSize(10).fillColor('#4b5563');
      if (business.phone) doc.text(`Phone: ${business.phone}`);
      if (business.email) doc.text(`Email: ${business.email}`);
    }

    doc.moveDown(1);
    doc.fillColor('#111827').fontSize(18).text('Invoice', { underline: true });
    doc.moveDown(0.5);

    const leftStart = 40;
    const rightStart = 330;
    doc.fontSize(10).fillColor('#374151');
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, leftStart, doc.y);
    doc.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString('en-IN')}`);
    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`);

    doc.moveDown(0.75);
    doc.fontSize(12).fillColor('#111827').text('Bill To:', leftStart);
    doc.fontSize(10).fillColor('#374151');
    doc.text(invoice.customerName || '');
    if (invoice.customerAddress) doc.text(invoice.customerAddress);
    if (invoice.customerPhone) doc.text(`Phone: ${invoice.customerPhone}`);
    if (invoice.customerEmail) doc.text(`Email: ${invoice.customerEmail}`);
    if (invoice.customerGSTIN) doc.text(`GSTIN: ${invoice.customerGSTIN}`);

    doc.moveDown(1);
    const tableTop = doc.y;
    doc.fontSize(10).fillColor('#111827').text('Description', leftStart, tableTop);
    doc.text('Qty', 260, tableTop, { width: 50, align: 'right' });
    doc.text('Rate', 320, tableTop, { width: 70, align: 'right' });
    doc.text('Tax', 400, tableTop, { width: 60, align: 'right' });
    doc.text('Amount', 470, tableTop, { width: 90, align: 'right' });

    doc.moveTo(leftStart, tableTop + 15).lineTo(550, tableTop + 15).stroke('#e5e7eb');

    let y = tableTop + 24;
    invoice.items.forEach((item) => {
      const description = item.name + (item.description ? ` - ${item.description}` : '');
      doc.fontSize(10).fillColor('#374151').text(description, leftStart, y, { width: 220 });
      doc.text(item.quantity.toString(), 260, y, { width: 50, align: 'right' });
      doc.text(item.unitPrice.toFixed(2), 320, y, { width: 70, align: 'right' });
      doc.text(`${item.taxRate || 0}%`, 400, y, { width: 60, align: 'right' });
      doc.text((item.amount || 0).toFixed(2), 470, y, { width: 90, align: 'right' });
      y += 18;
    });

    doc.moveDown(1.5);
    const totalsTop = y + 20;
    doc.text(`Subtotal:`, 360, totalsTop, { width: 120, align: 'right' });
    doc.text(`${invoice.subtotal.toFixed(2)}`, 470, totalsTop, { width: 90, align: 'right' });
    doc.text(`Tax:`, 360, totalsTop + 16, { width: 120, align: 'right' });
    doc.text(`${invoice.taxAmount.toFixed(2)}`, 470, totalsTop + 16, { width: 90, align: 'right' });
    doc.text(`Discount:`, 360, totalsTop + 32, { width: 120, align: 'right' });
    doc.text(`${Number(invoice.discountAmount || 0).toFixed(2)}`, 470, totalsTop + 32, { width: 90, align: 'right' });
    doc.fontSize(12).fillColor('#111827').text(`Total:`, 360, totalsTop + 52, { width: 120, align: 'right' });
    doc.text(`${invoice.total.toFixed(2)}`, 470, totalsTop + 52, { width: 90, align: 'right' });

    if (invoice.notes) {
      doc.moveDown(7);
      doc.fontSize(10).fillColor('#4b5563').text('Notes', { underline: true });
      doc.moveDown(0.2);
      doc.fontSize(10).text(invoice.notes);
    }

    doc.end();
  });
}

router.post('/businesses', authenticate, async (req, res) => {
  try {
    const {
      businessName,
      businessType,
      phone,
      email,
      website,
      gstin,
      address,
      primaryColor,
      secondaryColor,
    } = req.body;

    if (!businessName || !businessType || !phone || !email) {
      return res.status(400).json({ success: false, message: 'Required business fields are missing' });
    }

    let business = await Business.findOne({ userId: req.user._id });
    if (business) {
      business.businessName = businessName;
      business.businessType = businessType;
      business.phone = phone;
      business.email = email;
      business.website = website;
      business.gstin = gstin;
      business.address = address || business.address;
      business.primaryColor = primaryColor || business.primaryColor;
      business.secondaryColor = secondaryColor || business.secondaryColor;
      business.updatedAt = new Date();
      await business.save();
    } else {
      business = new Business({
        userId: req.user._id,
        businessName,
        businessType,
        phone,
        email,
        website,
        gstin,
        address,
        primaryColor,
        secondaryColor,
      });
      await business.save();
    }

    return res.status(201).json({ success: true, business });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/businesses/me', authenticate, async (req, res) => {
  try {
    const business = await Business.findOne({ userId: req.user._id });
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    return res.json({ success: true, business });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/invoices', authenticate, async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      customerGSTIN,
      customerAddress,
      items,
      dueDate,
      discountAmount,
      currency,
      notes,
    } = req.body;
    if (!customerName || !items || !Array.isArray(items) || !items.length || !dueDate) {
      return res.status(400).json({ success: false, message: 'Missing required invoice fields' });
    }

    const business = await Business.findOne({ userId: req.user._id });
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const totals = calculateInvoiceTotals(items, discountAmount);
    const invoice = new BusinessInvoice({
      businessId: business._id,
      invoiceNumber: generateInvoiceNumber(business),
      customerName,
      customerPhone,
      customerEmail,
      customerGSTIN,
      customerAddress,
      items: totals.items,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      total: totals.total,
      currency: currency || 'INR',
      issueDate: new Date(),
      dueDate: new Date(dueDate),
      notes,
      status: 'Sent',
      paymentStatus: 'Pending',
      businessBranding: {
        logo: business.logo,
        primaryColor: business.primaryColor,
        secondaryColor: business.secondaryColor,
      },
    });

    await invoice.save();
    return res.status(201).json({ success: true, invoice });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/invoices', authenticate, async (req, res) => {
  try {
    const business = await Business.findOne({ userId: req.user._id });
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    const invoices = await BusinessInvoice.find({ businessId: business._id }).sort({ createdAt: -1 });
    return res.json({ success: true, invoices });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/invoices/:id', authenticate, async (req, res) => {
  try {
    const business = await Business.findOne({ userId: req.user._id });
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    const invoice = await BusinessInvoice.findOne({ _id: req.params.id, businessId: business._id });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    return res.json({ success: true, invoice });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/invoices/:id/pdf', authenticate, async (req, res) => {
  try {
    const business = await Business.findOne({ userId: req.user._id });
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const invoice = await BusinessInvoice.findOne({ _id: req.params.id, businessId: business._id });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const buffer = await generateInvoicePdfBuffer(invoice, business);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`);
    res.send(buffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/mini-apps', authenticate, async (req, res) => {
  try {
    const { displayName, slug, category, branding, businessProfile, configuration } = req.body;
    if (!displayName || !slug || !category) {
      return res.status(400).json({ success: false, message: 'Missing required mini app fields' });
    }

    const business = await Business.findOne({ userId: req.user._id });
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const existing = await MiniApp.findOne({ slug });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Slug already taken' });
    }

    const miniApp = new MiniApp({
      businessId: business._id,
      displayName,
      slug,
      category,
      branding,
      businessProfile,
      configuration,
      status: 'Active',
      verificationStatus: 'Unverified',
    });

    await miniApp.save();
    return res.status(201).json({ success: true, miniApp });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/mini-apps', authenticate, async (req, res) => {
  try {
    const business = await Business.findOne({ userId: req.user._id });
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const miniApps = await MiniApp.find({ businessId: business._id }).sort({ createdAt: -1 });
    return res.json({ success: true, miniApps });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/mini-apps/:miniAppId/products', authenticate, async (req, res) => {
  try {
    const { miniAppId } = req.params;
    const { name, description, category, price, discountedPrice, stock, images } = req.body;

    if (!name || price == null) {
      return res.status(400).json({ success: false, message: 'Product name and price are required' });
    }

    const business = await Business.findOne({ userId: req.user._id });
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const miniApp = await MiniApp.findOne({ _id: miniAppId, businessId: business._id });
    if (!miniApp) {
      return res.status(404).json({ success: false, message: 'Mini app not found' });
    }

    const product = new MiniAppProduct({
      miniAppId: miniApp._id,
      businessId: business._id,
      name,
      description,
      category,
      price,
      discountedPrice,
      stock: stock == null ? 0 : stock,
      images: Array.isArray(images) ? images : [],
    });

    await product.save();
    return res.status(201).json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/mini-apps/:slug', async (req, res) => {
  try {
    const miniApp = await MiniApp.findOne({ slug: req.params.slug, status: 'Active' });
    if (!miniApp) {
      return res.status(404).json({ success: false, message: 'Mini app not found' });
    }
    return res.json({ success: true, miniApp });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
