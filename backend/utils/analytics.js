const Order = require('../models/Order');
const Product = require('../models/Product');
const Wallet = require('../models/Wallet');
const logger = require('./logger');
const redis = require('../config/redis');

const ANALYTICS_CACHE_TTL = 300; // 5 minutes

async function getSellerDashboardMetrics(sellerEmail, period = '30d') {
  const cacheKey = `analytics:${sellerEmail}:${period}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const now = new Date();
  const startDate = new Date(now.getTime() - getPeriodMs(period));

  try {
    // Revenue
    const sellerOrders = await Order.find({
      'sellerFulfillments.sellerEmail': sellerEmail,
      status: 'Delivered',
      'sellerFulfillments.updatedAt': { $gte: startDate }
    }).lean();

    const revenue = sellerOrders.reduce((sum, order) => {
      const sellerFulfillment = order.sellerFulfillments.find(f => f.sellerEmail === sellerEmail);
      return sum + parseFloat(sellerFulfillment?.totalAmount || order.amount || 0);
    }, 0);

    // Orders count
    const orderCount = sellerOrders.length;

    // Top products
    const productStats = sellerOrders.reduce((stats, order) => {
      order.items.forEach(item => {
        const sellerItem = item.sellerKey === sellerEmail;
        if (sellerItem) {
          stats[item.productId || item.id] = (stats[item.productId || item.id] || 0) + 1;
        }
      });
      return stats;
    }, {});

    const topProducts = Object.entries(productStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, count]) => ({ id, count }));

    // Fill product details
    const topProductDetails = await Product.find({
      _id: { $in: topProducts.map(p => p.id) }
    }).lean();

    // Conversion rate
    const totalViews = await redis.get(`product_views:${sellerEmail}`) || 0;
    const conversionRate = totalViews > 0 ? (orderCount / parseInt(totalViews)) * 100 : 0;

    const metrics = {
      revenue: Math.round(revenue),
      orders: orderCount,
      conversionRate: Math.round(conversionRate * 100) / 100,
      topProducts: topProducts.map(tp => {
        const details = topProductDetails.find(p => p._id.toString() === tp.id);
        return {
          ...tp,
          name: details?.name || 'Unknown Product',
          image: details?.image
        };
      }),
      avgOrderValue: orderCount > 0 ? Math.round(revenue / orderCount) : 0,
      period
    };

    await redis.setex(cacheKey, ANALYTICS_CACHE_TTL, JSON.stringify(metrics));
    return metrics;
  } catch (error) {
    logger.error('Analytics failed:', error);
    return { revenue: 0, orders: 0, error: 'Analytics unavailable' };
  }
}

function getPeriodMs(period) {
  const periods = {
    '1d': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000
  };
  return periods[period] || periods['30d'];
}

async function recordProductView(productId, sellerEmail) {
  const key = `product_views:${sellerEmail || 'global'}:${new Date().toISOString().split('T')[0]}`;
  await redis.incr(key);
}

module.exports = {
  getSellerDashboardMetrics,
  recordProductView
};

