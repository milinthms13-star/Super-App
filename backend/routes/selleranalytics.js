const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Review = require('../models/Review');
const orderStore = require('../utils/orderStore');
const devProductStore = require('../utils/devProductStore');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const LOW_STOCK_THRESHOLD = 5;
const DEFAULT_TREND_DAYS = 14;

const normalizeText = (value = '') => String(value || '').trim().toLowerCase();
const round = (value) => Math.round(Number(value || 0) * 100) / 100;

const normalizeOrderStatus = (status = '') => {
  const normalizedStatus = normalizeText(status);

  if (!normalizedStatus || normalizedStatus === 'paid' || normalizedStatus === 'cash on delivery') {
    return 'Confirmed';
  }

  if (normalizedStatus.includes('cancel')) {
    return 'Cancelled';
  }

  if (normalizedStatus.includes('return')) {
    return 'Returned';
  }

  if (normalizedStatus.includes('deliver')) {
    return 'Delivered';
  }

  if (normalizedStatus.includes('ship') || normalizedStatus.includes('transit')) {
    return 'Shipped';
  }

  if (normalizedStatus.includes('pack') || normalizedStatus.includes('process')) {
    return 'Packed';
  }

  return 'Confirmed';
};

const normalizeBusinessName = (req) =>
  normalizeText(req.auth?.businessName || req.user?.businessName || req.user?.name || '');

const isMongoReady = () => mongoose.connection.readyState === 1;

const parseDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolveDateRange = ({ period = 'This Month', startDate, endDate } = {}) => {
  const now = new Date();
  let start = new Date(now.getFullYear(), now.getMonth(), 1);
  let end = new Date(now);

  switch (String(period || 'This Month')) {
    case 'Today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'This Week':
      start = new Date(now);
      start.setDate(now.getDate() - 6);
      break;
    case 'This Quarter':
      start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      break;
    case 'This Year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'Custom': {
      const parsedStart = parseDate(startDate);
      const parsedEnd = parseDate(endDate);
      start = parsedStart || start;
      end = parsedEnd || end;
      break;
    }
    case 'This Month':
    default:
      break;
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return {
    period: String(period || 'This Month'),
    start,
    end,
  };
};

const listSellerProducts = async (sellerEmail = '') => {
  const normalizedSellerEmail = normalizeText(sellerEmail);

  if (isMongoReady()) {
    return Product.find({ sellerEmail: normalizedSellerEmail }).lean();
  }

  const products = await devProductStore.listProducts();
  return products.filter((product) => normalizeText(product.sellerEmail) === normalizedSellerEmail);
};

const resolveOwnedFulfillment = (order = {}, sellerEmail = '', businessName = '') => {
  const fulfillments = Array.isArray(order.sellerFulfillments) ? order.sellerFulfillments : [];
  const normalizedSellerEmail = normalizeText(sellerEmail);
  const normalizedBusinessName = normalizeText(businessName);

  return (
    fulfillments.find((fulfillment) => {
      if (
        normalizedSellerEmail &&
        normalizeText(fulfillment.sellerEmail) === normalizedSellerEmail
      ) {
        return true;
      }

      if (
        normalizedBusinessName &&
        normalizeText(fulfillment.businessName || fulfillment.sellerName) === normalizedBusinessName
      ) {
        return true;
      }

      return false;
    }) || null
  );
};

const buildSellerSegments = (orders = [], sellerEmail = '', businessName = '') =>
  orders
    .map((order) => {
      const fulfillment = resolveOwnedFulfillment(order, sellerEmail, businessName);
      if (!fulfillment) {
        return null;
      }

      const items = (order.items || []).filter(
        (item) => String(item.sellerKey || '') === String(fulfillment.sellerKey || '')
      );
      const revenue = round(
        items.reduce(
          (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
          0
        )
      );

      return {
        orderId: order.id || order._id,
        createdAt: order.createdAt || null,
        customerEmail: order.customerEmail || '',
        customerName: order.customerName || '',
        status: normalizeOrderStatus(fulfillment.status || order.status),
        items,
        revenue,
        deliveryDetails: order.deliveryDetails || {},
      };
    })
    .filter(Boolean);

const isSegmentInRange = (segment = {}, start, end) => {
  const createdAt = parseDate(segment.createdAt);
  if (!createdAt) {
    return false;
  }

  return createdAt >= start && createdAt <= end;
};

const buildOrdersByStatus = (segments = []) =>
  segments.reduce(
    (accumulator, segment) => {
      const status = normalizeOrderStatus(segment.status);

      if (status === 'Delivered') {
        accumulator.delivered += 1;
      } else if (status === 'Shipped') {
        accumulator.shipped += 1;
      } else if (status === 'Packed') {
        accumulator.packed += 1;
      } else if (status === 'Returned') {
        accumulator.returned += 1;
      } else if (status === 'Cancelled') {
        accumulator.cancelled += 1;
      } else {
        accumulator.confirmed += 1;
      }

      return accumulator;
    },
    {
      confirmed: 0,
      packed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
    }
  );

const buildRevenueTrend = (segments = []) => {
  const trendMap = new Map();

  segments.forEach((segment) => {
    const createdAt = parseDate(segment.createdAt);
    if (!createdAt) {
      return;
    }

    const dateKey = createdAt.toISOString().slice(0, 10);
    if (!trendMap.has(dateKey)) {
      trendMap.set(dateKey, {
        date: dateKey,
        revenue: 0,
        orderCount: 0,
      });
    }

    const entry = trendMap.get(dateKey);
    entry.revenue = round(entry.revenue + Number(segment.revenue || 0));
    entry.orderCount += 1;
  });

  return Array.from(trendMap.values()).sort((left, right) => left.date.localeCompare(right.date));
};

const getAvailableStock = (product = {}) => {
  if (Array.isArray(product.inventoryBatches) && product.inventoryBatches.length > 0) {
    return product.inventoryBatches.reduce((sum, batch) => {
      if (batch?.isActive === false || batch?.isExpired === true) {
        return sum;
      }

      return sum + Math.max(0, Number(batch?.stock || 0));
    }, 0);
  }

  return Math.max(0, Number(product.stock || 0));
};

const buildProductVelocity = (products = [], segments = []) => {
  const metricsByProduct = new Map();

  segments.forEach((segment) => {
    segment.items.forEach((item) => {
      const productId = String(item.productId || item.id || '');
      if (!productId) {
        return;
      }

      if (!metricsByProduct.has(productId)) {
        metricsByProduct.set(productId, {
          unitsSold: 0,
          revenue: 0,
          orders: 0,
        });
      }

      const entry = metricsByProduct.get(productId);
      entry.unitsSold += Number(item.quantity || 0);
      entry.revenue = round(
        entry.revenue + Number(item.price || 0) * Number(item.quantity || 0)
      );
      entry.orders += 1;
    });
  });

  return products.map((product) => {
    const productId = String(product._id || product.id || '');
    const performance = metricsByProduct.get(productId) || {
      unitsSold: Number(product.unitsSold || 0),
      revenue: round(Number(product.unitsSold || 0) * Number(product.price || 0)),
      orders: 0,
    };
    const stock = getAvailableStock(product);
    const views = Number(product.views || 0);
    const clicks = Number(product.clicks || 0);
    const rating = Number(product.rating || 0);
    const reviews = Number(product.reviewCount || 0);
    const lastSoldAt = parseDate(product.lastSoldAt);
    const daysSinceLastSale = lastSoldAt
      ? Math.max(0, Math.floor((Date.now() - lastSoldAt.getTime()) / (1000 * 60 * 60 * 24)))
      : null;
    const totalPotentialUnits = performance.unitsSold + stock;

    return {
      productId,
      productName: product.name || 'Product',
      category: product.category || '',
      views,
      clicks,
      stock,
      unitsSold: Number(performance.unitsSold || 0),
      revenue: round(performance.revenue || 0),
      orderCount: Number(performance.orders || 0),
      rating,
      reviews,
      conversionRate: views > 0 ? round((clicks / views) * 100) : 0,
      sellThroughRate: totalPotentialUnits > 0 ? round((performance.unitsSold / totalPotentialUnits) * 100) : 0,
      daysSinceLastSale,
      lastSoldAt: lastSoldAt ? lastSoldAt.toISOString() : null,
    };
  });
};

const buildCustomerInsights = (segments = []) => {
  const customerMap = new Map();

  segments.forEach((segment) => {
    const customerEmail = normalizeText(segment.customerEmail);
    if (!customerEmail) {
      return;
    }

    if (!customerMap.has(customerEmail)) {
      customerMap.set(customerEmail, {
        customerEmail,
        customerName: segment.customerName || 'Customer',
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: segment.createdAt || null,
      });
    }

    const customer = customerMap.get(customerEmail);
    customer.totalOrders += 1;
    customer.totalSpent = round(customer.totalSpent + Number(segment.revenue || 0));
    customer.lastOrderDate = segment.createdAt || customer.lastOrderDate;
  });

  const customers = Array.from(customerMap.values()).sort(
    (left, right) => right.totalSpent - left.totalSpent
  );
  const repeatCustomers = customers.filter((customer) => customer.totalOrders > 1).length;

  return {
    totalCustomers: customers.length,
    repeatCustomers,
    averageCustomerValue:
      customers.length > 0
        ? round(
            customers.reduce((sum, customer) => sum + Number(customer.totalSpent || 0), 0) /
              customers.length
          )
        : 0,
    topCustomers: customers.slice(0, 10),
  };
};

const buildGeographyHeatmap = (segments = []) => {
  const geographyMap = new Map();

  segments.forEach((segment) => {
    const state = String(segment.deliveryDetails?.state || 'Unknown').trim() || 'Unknown';
    const district = String(segment.deliveryDetails?.district || 'Unknown').trim() || 'Unknown';
    const label = `${district}, ${state}`;

    if (!geographyMap.has(label)) {
      geographyMap.set(label, {
        label,
        state,
        district,
        orderCount: 0,
        revenue: 0,
      });
    }

    const entry = geographyMap.get(label);
    entry.orderCount += 1;
    entry.revenue = round(entry.revenue + Number(segment.revenue || 0));
  });

  return Array.from(geographyMap.values()).sort((left, right) => {
    if (right.revenue !== left.revenue) {
      return right.revenue - left.revenue;
    }

    return right.orderCount - left.orderCount;
  });
};

const buildFallbackReviewStats = (products = []) => {
  const totalReviews = products.reduce((sum, product) => sum + Number(product.reviewCount || 0), 0);
  const weightedRating = products.reduce(
    (sum, product) => sum + Number(product.rating || 0) * Number(product.reviewCount || 0),
    0
  );

  const ratingDistribution = {
    fiveStar: 0,
    fourStar: 0,
    threeStar: 0,
    twoStar: 0,
    oneStar: 0,
  };

  products.forEach((product) => {
    const ratingBucket = Math.min(5, Math.max(1, Math.round(Number(product.rating || 0))));
    const reviewCount = Number(product.reviewCount || 0);

    if (ratingBucket === 5) {
      ratingDistribution.fiveStar += reviewCount;
    } else if (ratingBucket === 4) {
      ratingDistribution.fourStar += reviewCount;
    } else if (ratingBucket === 3) {
      ratingDistribution.threeStar += reviewCount;
    } else if (ratingBucket === 2) {
      ratingDistribution.twoStar += reviewCount;
    } else {
      ratingDistribution.oneStar += reviewCount;
    }
  });

  return {
    totalReviews,
    averageRating: totalReviews > 0 ? round(weightedRating / totalReviews) : 0,
    ratingDistribution,
    positiveReviews: [],
    negativeReviews: [],
  };
};

const buildReviewStats = async (products = []) => {
  const productIds = products
    .map((product) => String(product._id || product.id || ''))
    .filter(Boolean);

  if (!isMongoReady() || productIds.length === 0) {
    return buildFallbackReviewStats(products);
  }

  try {
    const reviews = await Review.find({
      productId: { $in: productIds },
      status: 'Approved',
    }).sort({ createdAt: -1 }).lean();

    if (!reviews.length) {
      return buildFallbackReviewStats(products);
    }

    const totalReviews = reviews.length;
    const averageRating = round(
      reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / totalReviews
    );

    return {
      totalReviews,
      averageRating,
      ratingDistribution: {
        fiveStar: reviews.filter((review) => Number(review.rating) === 5).length,
        fourStar: reviews.filter((review) => Number(review.rating) === 4).length,
        threeStar: reviews.filter((review) => Number(review.rating) === 3).length,
        twoStar: reviews.filter((review) => Number(review.rating) === 2).length,
        oneStar: reviews.filter((review) => Number(review.rating) === 1).length,
      },
      positiveReviews: reviews
        .filter((review) => Number(review.rating || 0) >= 4)
        .slice(0, 5)
        .map((review) => ({
          reviewId: review._id,
          productName: review.productName || 'Product',
          rating: Number(review.rating || 0),
          comment: review.comment || '',
          customerName: review.reviewerName || 'Customer',
          createdAt: review.createdAt || null,
        })),
      negativeReviews: reviews
        .filter((review) => Number(review.rating || 0) <= 2)
        .slice(0, 5)
        .map((review) => ({
          reviewId: review._id,
          productName: review.productName || 'Product',
          rating: Number(review.rating || 0),
          comment: review.comment || '',
          customerName: review.reviewerName || 'Customer',
          createdAt: review.createdAt || null,
        })),
    };
  } catch (error) {
    return buildFallbackReviewStats(products);
  }
};

const buildInventoryMetrics = (products = []) => ({
  totalItems: products.reduce((sum, product) => sum + getAvailableStock(product), 0),
  outOfStockItems: products.filter((product) => getAvailableStock(product) === 0).length,
  lowStockItems: products.filter((product) => {
    const stock = getAvailableStock(product);
    return stock > 0 && stock <= LOW_STOCK_THRESHOLD;
  }).length,
  inventoryValue: round(
    products.reduce((sum, product) => sum + getAvailableStock(product) * Number(product.price || 0), 0)
  ),
});

const buildSellerAnalytics = async (req, options = {}) => {
  const sellerEmail = req.user?.email || '';
  const businessName = normalizeBusinessName(req);
  const { start, end, period } = resolveDateRange(options);
  const [orders, products] = await Promise.all([
    orderStore.listOrdersForSeller({
      email: sellerEmail,
      businessName: req.auth?.businessName || req.user?.businessName || req.user?.name || '',
    }),
    listSellerProducts(sellerEmail),
  ]);

  const allSegments = buildSellerSegments(orders, sellerEmail, businessName);
  const segments = allSegments.filter((segment) => isSegmentInRange(segment, start, end));
  const ordersByStatus = buildOrdersByStatus(segments);
  const totalRevenue = round(
    segments.reduce((sum, segment) => sum + Number(segment.revenue || 0), 0)
  );
  const productVelocity = buildProductVelocity(products, segments);
  const customerInsights = buildCustomerInsights(segments);
  const geographyHeatmap = buildGeographyHeatmap(segments);
  const reviews = await buildReviewStats(products);
  const inventory = buildInventoryMetrics(products);
  const totalOrders = segments.length;
  const returnedItemCount = segments.reduce(
    (sum, segment) =>
      sum +
      segment.items.filter((item) => item.returnRequest && item.returnRequest.status !== 'rejected').length,
    0
  );

  return {
    sellerEmail,
    sellerName: req.user?.name || '',
    period,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    sales: {
      totalOrders,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? round(totalRevenue / totalOrders) : 0,
      ordersByStatus,
      revenueTrend: buildRevenueTrend(segments),
    },
    products: {
      totalProducts: products.length,
      activeProducts: products.filter((product) => product.isActive !== false).length,
      totalUnitsSold: productVelocity.reduce((sum, product) => sum + Number(product.unitsSold || 0), 0),
      topSellingProducts: [...productVelocity]
        .sort((left, right) => right.unitsSold - left.unitsSold || right.revenue - left.revenue)
        .slice(0, 5),
      slowMovingProducts: [...productVelocity]
        .sort((left, right) => left.unitsSold - right.unitsSold || right.stock - left.stock)
        .slice(0, 5),
      productVelocity,
    },
    geography: {
      heatmap: geographyHeatmap.slice(0, 12),
      topStates: geographyHeatmap
        .reduce((accumulator, region) => {
          const current = accumulator.get(region.state) || {
            state: region.state,
            orderCount: 0,
            revenue: 0,
          };
          current.orderCount += region.orderCount;
          current.revenue = round(current.revenue + Number(region.revenue || 0));
          accumulator.set(region.state, current);
          return accumulator;
        }, new Map()),
    },
    customers: customerInsights,
    inventory,
    reviews,
    kpis: {
      orderFulfillmentRate:
        totalOrders > 0 ? round((ordersByStatus.delivered / totalOrders) * 100) : 0,
      returnRate: totalOrders > 0 ? round((returnedItemCount / totalOrders) * 100) : 0,
      cancellationRate:
        totalOrders > 0 ? round((ordersByStatus.cancelled / totalOrders) * 100) : 0,
      customerSatisfactionScore:
        reviews.averageRating > 0 ? round((reviews.averageRating / 5) * 100) : 0,
      repeatCustomerRate:
        customerInsights.totalCustomers > 0
          ? round((customerInsights.repeatCustomers / customerInsights.totalCustomers) * 100)
          : 0,
    },
    lastUpdated: new Date().toISOString(),
  };
};

router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const analytics = await buildSellerAnalytics(req, req.query || {});

    const topStates = Array.from(analytics.geography.topStates.values())
      .sort((left, right) => right.revenue - left.revenue || right.orderCount - left.orderCount)
      .slice(0, 8);

    return res.json({
      success: true,
      data: {
        ...analytics,
        geography: {
          ...analytics.geography,
          topStates,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching analytics dashboard',
      error: error.message,
    });
  }
});

router.get('/trends/sales', authenticate, async (req, res) => {
  try {
    const analytics = await buildSellerAnalytics(req, {
      period: req.query?.period || 'This Month',
      startDate: req.query?.startDate,
      endDate: req.query?.endDate,
    });

    const trend = analytics.sales.revenueTrend;
    const sliceStart = Math.max(0, trend.length - Number(req.query?.days || DEFAULT_TREND_DAYS));

    return res.json({
      success: true,
      data: trend.slice(sliceStart),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching sales trends',
      error: error.message,
    });
  }
});

router.get('/products/performance', authenticate, async (req, res) => {
  try {
    const analytics = await buildSellerAnalytics(req, req.query || {});

    return res.json({
      success: true,
      data: analytics.products.productVelocity,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching product performance',
      error: error.message,
    });
  }
});

router.get('/customers/insights', authenticate, async (req, res) => {
  try {
    const analytics = await buildSellerAnalytics(req, req.query || {});

    return res.json({
      success: true,
      data: analytics.customers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching customer insights',
      error: error.message,
    });
  }
});

router.get('/inventory/metrics', authenticate, async (req, res) => {
  try {
    const analytics = await buildSellerAnalytics(req, req.query || {});

    return res.json({
      success: true,
      data: analytics.inventory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching inventory metrics',
      error: error.message,
    });
  }
});

router.get('/geography/heatmap', authenticate, async (req, res) => {
  try {
    const analytics = await buildSellerAnalytics(req, req.query || {});

    return res.json({
      success: true,
      data: analytics.geography.heatmap,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching geographic heatmap',
      error: error.message,
    });
  }
});

module.exports = router;
