const express = require('express');
const { authenticate } = require('../middleware/auth');
const businessBuilderService = require('../services/businessBuilderService');

const router = express.Router();
const publicRouter = express.Router();
const WEBHOOK_AUTH_HEADER = 'x-businessbuilder-webhook-token';

const getRequestMeta = (req) => ({
  ip: String(req.headers['x-forwarded-for'] || req.ip || '')
    .split(',')[0]
    .trim(),
  userAgent: String(req.headers['user-agent'] || '').slice(0, 220),
  sessionId: String(req.headers['x-session-id'] || req.query?.sessionId || '').slice(0, 100),
});

const canAcceptWebhook = (req) => {
  const configuredSecret = String(process.env.BUSINESS_BUILDER_WEBHOOK_SECRET || '').trim();
  if (!configuredSecret) {
    return process.env.NODE_ENV !== 'production';
  }
  const incomingSecret = String(req.headers[WEBHOOK_AUTH_HEADER] || '').trim();
  return incomingSecret && incomingSecret === configuredSecret;
};

// Public customer-facing runtime routes
publicRouter.get('/mini-apps/:slug', async (req, res) => {
  try {
    const data = await businessBuilderService.getPublicMiniAppBySlug(req.params.slug, { incrementView: true });
    res.json({ success: true, data });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
});

publicRouter.get('/directory', async (req, res) => {
  try {
    const data = await businessBuilderService.getPublicDirectory(req.query || {});
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

publicRouter.post('/mini-apps/:slug/events', async (req, res) => {
  try {
    const event = await businessBuilderService.recordMiniAppEventBySlug(
      req.params.slug,
      req.body || {},
      getRequestMeta(req)
    );
    res.status(201).json({ success: true, data: event, message: 'Event recorded' });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
});

publicRouter.post('/mini-apps/:slug/leads', async (req, res) => {
  try {
    const lead = await businessBuilderService.createLeadBySlug(req.params.slug, req.body || {});
    res.status(201).json({ success: true, data: lead, message: 'Lead captured' });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
});

publicRouter.post('/mini-apps/:slug/orders', async (req, res) => {
  try {
    const order = await businessBuilderService.createOrderBySlug(req.params.slug, req.body || {});
    res.status(201).json({ success: true, data: order, message: 'Order created' });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
});

publicRouter.post('/orders/:orderId/payment/initiate', async (req, res) => {
  try {
    const paymentSession = await businessBuilderService.initiateOrderPayment(req.params.orderId, req.body || {});
    res.json({ success: true, data: paymentSession, message: 'Payment initiated' });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
});

publicRouter.post('/payments/webhook', async (req, res) => {
  if (!canAcceptWebhook(req)) {
    return res.status(403).json({
      success: false,
      message: 'Webhook authentication failed.',
    });
  }

  try {
    const order = await businessBuilderService.processPaymentWebhook(req.body || {});
    return res.json({
      success: true,
      data: order,
      message: 'Payment webhook processed',
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
});

router.use('/public', publicRouter);

// All admin/owner routes require authentication
router.use(authenticate);

// Business CRUD routes
router.post('/businesses', async (req, res) => {
  try {
    const business = await businessBuilderService.createBusiness(req.user.id, req.body);
    res.status(201).json({
      success: true,
      data: business,
      message: 'Business created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/businesses', async (req, res) => {
  try {
    const businesses = await businessBuilderService.getBusinesses(req.user.id);
    res.json({
      success: true,
      data: businesses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/businesses/me', async (req, res) => {
  try {
    const businesses = await businessBuilderService.getBusinesses(req.user.id);
    const business = Array.isArray(businesses) && businesses.length > 0 ? businesses[0] : null;
    res.json({
      success: true,
      data: business,
      business
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/businesses/:businessId', async (req, res) => {
  try {
    const business = await businessBuilderService.getBusinessById(req.params.businessId, req.user.id);
    res.json({
      success: true,
      data: business
    });
  } catch (error) {
    const statusCode = error.message === 'Business not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

router.put('/businesses/:businessId', async (req, res) => {
  try {
    const business = await businessBuilderService.updateBusiness(req.params.businessId, req.user.id, req.body);
    res.json({
      success: true,
      data: business,
      message: 'Business updated successfully'
    });
  } catch (error) {
    const statusCode = error.message === 'Business not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

router.put('/businesses/:businessId/subscription', async (req, res) => {
  try {
    const data = await businessBuilderService.updateBusinessSubscription(
      req.params.businessId,
      req.user.id,
      req.body || {}
    );
    res.json({
      success: true,
      data,
      message: 'Subscription updated successfully',
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
});

router.get('/businesses/:businessId/entitlements', async (req, res) => {
  try {
    const data = await businessBuilderService.getBusinessEntitlements(req.params.businessId, req.user.id);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
});

router.delete('/businesses/:businessId', async (req, res) => {
  try {
    await businessBuilderService.deleteBusiness(req.params.businessId, req.user.id);
    res.json({
      success: true,
      message: 'Business deleted successfully'
    });
  } catch (error) {
    const statusCode = error.message === 'Business not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

// Business Plan routes
router.post('/businesses/:businessId/generate-plan', async (req, res) => {
  try {
    const businessPlan = await businessBuilderService.generateBusinessPlan(req.params.businessId, req.user.id);
    res.json({
      success: true,
      data: businessPlan,
      message: 'Business plan generated successfully'
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/businesses/:businessId/schemes', async (req, res) => {
  try {
    const schemes = await businessBuilderService.getEligibleSchemes(req.params.businessId, req.user.id);
    res.json({
      success: true,
      data: schemes
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/businesses/:businessId/ai/assets/generate', async (req, res) => {
  try {
    const data = await businessBuilderService.generateAIAsset(req.user.id, req.params.businessId, req.body || {});
    res.status(201).json({
      success: true,
      data,
      message: 'AI asset generated successfully',
    });
  } catch (error) {
    const statusCode =
      error.message.includes('not found') || error.message.includes('limit reached') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
});

router.get('/businesses/:businessId/ai/assets', async (req, res) => {
  try {
    const data = await businessBuilderService.getAIAssets(req.user.id, req.params.businessId, req.query || {});
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
});

router.get('/businesses/:businessId/analytics/dashboard', async (req, res) => {
  try {
    const data = await businessBuilderService.getBusinessAnalyticsDashboard(
      req.user.id,
      req.params.businessId,
      req.query || {}
    );
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
});

// Checklist routes
router.put('/businesses/:businessId/checklist', async (req, res) => {
  try {
    const { checklistUpdates } = req.body;
    const checklist = await businessBuilderService.updateChecklist(req.params.businessId, req.user.id, checklistUpdates);
    res.json({
      success: true,
      data: checklist,
      message: 'Checklist updated successfully'
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

// Invoice CRUD routes
router.post('/invoices', async (req, res) => {
  try {
    const invoice = await businessBuilderService.createInvoice(req.user.id, req.body);
    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Invoice created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/invoices', async (req, res) => {
  try {
    const { businessId } = req.query;
    const invoices = await businessBuilderService.getInvoices(req.user.id, businessId);
    res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/invoices/:invoiceId', async (req, res) => {
  try {
    const invoice = await businessBuilderService.getInvoiceById(req.params.invoiceId, req.user.id);
    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    const statusCode = error.message === 'Invoice not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

router.put('/invoices/:invoiceId', async (req, res) => {
  try {
    const invoice = await businessBuilderService.updateInvoice(req.params.invoiceId, req.user.id, req.body);
    res.json({
      success: true,
      data: invoice,
      message: 'Invoice updated successfully'
    });
  } catch (error) {
    const statusCode = error.message === 'Invoice not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

router.delete('/invoices/:invoiceId', async (req, res) => {
  try {
    await businessBuilderService.deleteInvoice(req.params.invoiceId, req.user.id);
    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    const statusCode = error.message === 'Invoice not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

// Invoice PDF generation
router.get('/invoices/:invoiceId/pdf', async (req, res) => {
  try {
    const pdfBuffer = await businessBuilderService.generateInvoicePDF(req.params.invoiceId, req.user.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${req.params.invoiceId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

// Mini App CRUD routes
router.post('/mini-apps', async (req, res) => {
  try {
    const miniApp = await businessBuilderService.createMiniApp(req.user.id, req.body);
    res.status(201).json({
      success: true,
      data: miniApp,
      message: 'Mini app created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/mini-apps', async (req, res) => {
  try {
    const { businessId } = req.query;
    const miniApps = await businessBuilderService.getMiniApps(req.user.id, businessId);
    res.json({
      success: true,
      data: miniApps
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/mini-apps/:miniAppId', async (req, res) => {
  try {
    const miniApp = await businessBuilderService.getMiniAppById(req.params.miniAppId, req.user.id);
    res.json({
      success: true,
      data: miniApp
    });
  } catch (error) {
    const statusCode = error.message === 'Mini app not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

router.put('/mini-apps/:miniAppId', async (req, res) => {
  try {
    const miniApp = await businessBuilderService.updateMiniApp(req.params.miniAppId, req.user.id, req.body);
    res.json({
      success: true,
      data: miniApp,
      message: 'Mini app updated successfully'
    });
  } catch (error) {
    const statusCode = error.message === 'Mini app not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

router.delete('/mini-apps/:miniAppId', async (req, res) => {
  try {
    await businessBuilderService.deleteMiniApp(req.params.miniAppId, req.user.id);
    res.json({
      success: true,
      message: 'Mini app deleted successfully'
    });
  } catch (error) {
    const statusCode = error.message === 'Mini app not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/mini-apps/:miniAppId/products', async (req, res) => {
  try {
    const data = await businessBuilderService.createMiniAppProduct(
      req.user.id,
      req.params.miniAppId,
      req.body || {}
    );
    res.status(201).json({
      success: true,
      data,
      message: 'Mini app product created successfully',
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
});

router.get('/mini-apps/:miniAppId/products', async (req, res) => {
  try {
    const data = await businessBuilderService.getMiniAppProducts(req.user.id, req.params.miniAppId);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
});

router.put('/mini-apps/:miniAppId/products/:productId', async (req, res) => {
  try {
    const data = await businessBuilderService.updateMiniAppProduct(
      req.user.id,
      req.params.miniAppId,
      req.params.productId,
      req.body || {}
    );
    res.json({
      success: true,
      data,
      message: 'Mini app product updated successfully',
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
});

router.delete('/mini-apps/:miniAppId/products/:productId', async (req, res) => {
  try {
    await businessBuilderService.deleteMiniAppProduct(
      req.user.id,
      req.params.miniAppId,
      req.params.productId
    );
    res.json({
      success: true,
      message: 'Mini app product deleted successfully',
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
});

router.get('/mini-apps/:miniAppId/orders', async (req, res) => {
  try {
    const data = await businessBuilderService.getMiniAppOrders(req.user.id, req.params.miniAppId, req.query || {});
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
});

router.get('/mini-apps/:miniAppId/funnel', async (req, res) => {
  try {
    const data = await businessBuilderService.getMiniAppFunnel(req.user.id, req.params.miniAppId, req.query || {});
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
});

router.patch('/orders/:orderId/status', async (req, res) => {
  try {
    const data = await businessBuilderService.updateOrderStatus(
      req.user.id,
      req.params.orderId,
      req.body || {}
    );
    res.json({
      success: true,
      data,
      message: 'Order status updated successfully',
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
});

// Mini app analytics
router.post('/mini-apps/:miniAppId/view', async (req, res) => {
  try {
    const miniApp = await businessBuilderService.getMiniAppById(req.params.miniAppId, req.user.id);
    await miniApp.incrementView();
    res.json({
      success: true,
      message: 'View recorded'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
