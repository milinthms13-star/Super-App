/**
 * eCommerce Module Integration Routes
 * 
 * This file exports all eCommerce-related routes to be integrated into server.js
 * 
 * Usage in server.js:
 * const ecommerceRoutes = require('./routes/ecommerceIntegration');
 * app.use('/api', ecommerceRoutes);
 */

const express = require('express');
const router = express.Router();

// Import all eCommerce route modules
const subscriptionRoutes = require('./ecommerceSubscriptionRoutes');
const commissionRoutes = require('./ecommerceCommissionRoutes');
const categoryRoutes = require('./ecommerceCategoryRoutes');
const productListingRoutes = require('./productListingRoutes');
const marketplaceRoutes = require('./marketplaceRoutes');
const payoutRoutes = require('./payoutRoutes');

// Mount routes with appropriate prefixes
router.use('/ecommerce/subscription', subscriptionRoutes);
router.use('/ecommerce/commission', commissionRoutes);
router.use('/ecommerce/categories', categoryRoutes);
router.use('/products/listing', productListingRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/payouts', payoutRoutes);

module.exports = router;
