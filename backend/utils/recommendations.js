const orderStore = require('./orderStore');
const devAppDataStore = require('./devAppDataStore');
const logger = require('./logger');
const redis = require('../config/redis');

const RECS_CACHE_TTL = 3600; // 1 hour

// Simple item-item collaborative filtering
async function getRecommendations(userId, limit = 12) {
  try {
    // Check Redis cache
    const cacheKey = `recs:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Get user orders
    const userOrders = await orderStore.listOrdersByEmail(userId);
    const boughtProductIds = new Set();
    
    userOrders.forEach(order => {
      order.items.forEach(item => boughtProductIds.add(item.productId || item.id));
    });

    if (boughtProductIds.size === 0) {
      // No orders: return popular products
      const appData = await devAppDataStore.readAppData();
      const popular = appData.moduleData?.ecommerceProducts
        ?.filter(p => p.stock > 0)
        .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0))
        .slice(0, limit) || [];
      return popular;
    }

    // Co-purchase matrix (simplified)
    const allOrders = await orderStore.listOrders();
    const coPurchase = new Map();
    
    allOrders.forEach(order => {
      const orderProducts = order.items.map(item => item.productId || item.id);
      orderProducts.forEach((pid1, i) => {
        orderProducts.slice(i + 1).forEach(pid2 => {
          const key = `${pid1}-${pid2}`.split('-').sort().join('-');
          coPurchase.set(key, (coPurchase.get(key) || 0) + 1);
        });
      });
    });

    // Get top recommendations
    const recs = new Set();
    boughtProductIds.forEach(pid => {
      Array.from(coPurchase.entries())
        .filter(([pair, score]) => pair.includes(pid) && score > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([pair]) => {
          const [p1, p2] = pair.split('-');
          if (p1 !== pid) recs.add(p1);
          if (p2 !== pid) recs.add(p2);
        });
    });

    // Fetch full product data
    const appData = await devAppDataStore.readAppData();
    const recommendations = Array.from(recs)
      .slice(0, limit)
      .map(id => {
        const product = appData.moduleData?.ecommerceProducts.find(p => 
          (p.id === id || p._id === id)
        );
        return product && product.stock > 0 ? product : null;
      })
      .filter(Boolean);

    // Cache result
    await redis.setex(cacheKey, RECS_CACHE_TTL, JSON.stringify(recommendations));
    
    return recommendations;
  } catch (error) {
    logger.error('Recommendations error:', error);
    return [];
  }
}

module.exports = { getRecommendations };

