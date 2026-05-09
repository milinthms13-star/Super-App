/**
 * internationalizationRoutes.js
 * Routes for multi-language support, currency conversion, localization
 */

const express = require('express');
const router = express.Router();
const InternationalizationService = require('../services/InternationalizationService');
const { verifyToken } = require('../middleware/authMiddleware');

// Language preference
router.post('/language/:language', verifyToken, async (req, res) => {
  try {
    const result = await InternationalizationService.setUserLanguage(
      req.user.userId,
      req.params.language
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Currency preference
router.post('/currency/:currency', verifyToken, async (req, res) => {
  try {
    const result = await InternationalizationService.setUserCurrency(
      req.user.userId,
      req.params.currency
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Locale strings
router.get('/strings/:language', async (req, res) => {
  try {
    const result = await InternationalizationService.getLocaleStrings(
      req.params.language
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Price conversion
router.post('/convert-price', async (req, res) => {
  try {
    const { priceUSD, currency } = req.body;
    const result = await InternationalizationService.convertPrice(priceUSD, currency);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Bulk price conversion
router.post('/convert-prices', async (req, res) => {
  try {
    const { prices, currency } = req.body;
    const result = await InternationalizationService.bulkConvertPrices(prices, currency);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Localized product
router.get('/products/:productId/:language', async (req, res) => {
  try {
    const result = await InternationalizationService.getLocalizedProduct(
      req.params.productId,
      req.params.language
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Formatting
router.post('/format/datetime', async (req, res) => {
  try {
    const result = InternationalizationService.formatDateTime(
      req.body.date,
      req.body.language
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/format/currency', async (req, res) => {
  try {
    const result = InternationalizationService.formatCurrency(
      req.body.amount,
      req.body.currency,
      req.body.language
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Translation status
router.get('/status', async (req, res) => {
  try {
    const result = await InternationalizationService.getTranslationStatus();
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
