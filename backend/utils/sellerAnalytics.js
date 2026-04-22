/**
 * Comprehensive seller analytics and dashboard metrics
 */

const { calculateSellerScore, calculateConversionRate, calculateEngagementRate } = require('./analyticsHelper');

/**
 * Get comprehensive seller dashboard data
 */
const getSellerDashboard = (listings = [], sellers = [}) => {
  if (!listings.length) {
    return null;
  }

  const totalListings = listings.length;
  const activeListings = listings.filter((l) => !l.isDraft && l.moderationStatus === 'approved').length;
  const draftListings = listings.filter((l) => l.isDraft).length;

  const totalViews = listings.reduce((sum, l) => sum + (l.views || 0), 0);
  const totalChats = listings.reduce((sum, l) => sum + (l.chats || 0), 0);
  const totalFavorites = listings.reduce((sum, l) => sum + (l.favorites || 0), 0);

  const totalRevenue = listings.reduce((sum, l) => {
    if (l.monetizationPlan === 'Featured') return sum + 299;
    if (l.monetizationPlan === 'Urgent') return sum + 149;
    if (l.monetizationPlan === 'Seller Pro') return sum + 999;
    return sum;
  }, 0);

  const avgPrice = listings.length > 0
    ? Math.round(listings.reduce((sum, l) => sum + (l.price || 0), 0) / listings.length)
    : 0;

  const conversionRate = calculateConversionRate(totalViews, totalChats);
  const engagementRate = calculateEngagementRate(totalViews, totalFavorites, totalChats);

  // Category breakdown
  const categoryBreakdown = listings.reduce((acc, l) => {
    if (!acc[l.category]) {
      acc[l.category] = { count: 0, views: 0, chats: 0 };
    }
    acc[l.category].count += 1;
    acc[l.category].views += l.views || 0;
    acc[l.category].chats += l.chats || 0;
    return acc;
  }, {});

  // Best performing listings
  const topListings = [...listings]
    .sort((a, b) => (b.chats + b.favorites) - (a.chats + a.favorites))
    .slice(0, 5)
    .map((l) => ({
      id: l.id,
      title: l.title,
      price: l.price,
      chats: l.chats,
      favorites: l.favorites,
      views: l.views,
    }));

  // Worst performing listings
  const bottomListings = [...listings]
    .sort((a, b) => (a.chats + a.favorites) - (b.chats + b.favorites))
    .slice(0, 5)
    .map((l) => ({
      id: l.id,
      title: l.title,
      views: l.views,
      chats: l.chats,
    }));

  // Time-based trends (simplified - would be more complex with time series data)
  const recentListingsCount = listings.filter((l) => {
    const daysOld = (Date.now() - new Date(l.createdAt).getTime()) / (24 * 60 * 60 * 1000);
    return daysOld <= 7;
  }).length;

  return {
    summary: {
      totalListings,
      activeListings,
      draftListings,
      totalViews,
      totalChats,
      totalFavorites,
      totalRevenue,
      avgPrice,
      conversionRate,
      engagementRate,
    },
    categoryBreakdown,
    topListings,
    bottomListings,
    trends: {
      recentListingsCount,
      listingsPerDay: (activeListings / 30).toFixed(2),
    },
  };
};

/**
 * Get performance recommendations for seller
 */
const getSellerRecommendations = (dashboard) => {
  const recommendations = [];

  if (!dashboard) {
    return [
      {
        priority: 'high',
        message: 'Post your first listing to get started!',
        action: 'create-listing',
      },
    ];
  }

  const { summary, topListings, bottomListings } = dashboard;

  // Conversion rate suggestions
  if (summary.conversionRate < 5) {
    recommendations.push({
      priority: 'high',
      message: 'Your conversion rate is below average. Improve images and descriptions.',
      action: 'improve-listings',
    });
  }

  // Engagement suggestions
  if (summary.engagementRate < 3) {
    recommendations.push({
      priority: 'medium',
      message: 'Low engagement rate. Consider using featured promotions.',
      action: 'promote-listings',
    });
  }

  // Active listings suggestion
  if (summary.activeListings < 5 && summary.totalListings > 5) {
    recommendations.push({
      priority: 'medium',
      message: 'You have draft listings. Publish them to increase visibility.',
      action: 'publish-drafts',
    });
  }

  // Price suggestion based on top listings
  if (topListings.length > 0) {
    const avgTopPrice = topListings.reduce((sum, l) => sum + l.price, 0) / topListings.length;
    if (summary.avgPrice < avgTopPrice * 0.5) {
      recommendations.push({
        priority: 'low',
        message: `Your prices are significantly lower than top performers. Check pricing.`,
        action: 'review-pricing',
      });
    }
  }

  // Response time suggestion (if data available)
  if (summary.totalChats > 0) {
    recommendations.push({
      priority: 'medium',
      message: 'Quick responses lead to better sales. Aim to reply within 1 hour.',
      action: 'improve-response-time',
    });
  }

  // Subscription suggestion
  if (summary.totalListings >= 10 && !dashboard.subscriptionTier || dashboard.subscriptionTier === 'none') {
    recommendations.push({
      priority: 'low',
      message: 'Consider a Seller Pro subscription for unlimited listings and better visibility.',
      action: 'upgrade-subscription',
    });
  }

  return recommendations.slice(0, 5); // Return top 5 recommendations
};

/**
 * Calculate seller health score (0-100)
 */
const calculateSellerHealthScore = (dashboard) => {
  if (!dashboard) return 0;

  let score = 0;
  const { summary } = dashboard;

  // Listings health (0-30 points)
  if (summary.totalListings === 0) score += 0;
  else if (summary.totalListings < 3) score += 10;
  else if (summary.totalListings < 10) score += 20;
  else score += 30;

  // Engagement health (0-30 points)
  if (summary.totalViews === 0) score += 0;
  else if (summary.conversionRate < 2) score += 5;
  else if (summary.conversionRate < 5) score += 15;
  else if (summary.conversionRate < 10) score += 25;
  else score += 30;

  // Response health (0-20 points)
  if (summary.totalChats === 0) score += 10; // Neutral
  else if (summary.conversionRate > 5) score += 20;
  else if (summary.conversionRate > 2) score += 15;
  else score += 5;

  // Consistency health (0-20 points)
  if (summary.draftListings === 0) score += 20;
  else if (summary.draftListings / (summary.totalListings || 1) < 0.25) score += 15;
  else if (summary.draftListings / (summary.totalListings || 1) < 0.5) score += 10;
  else score += 5;

  return Math.min(100, Math.round(score));
};

/**
 * Get comparison data with platform averages
 */
const getSellerComparison = (sellerDashboard, platformAverage = {}) => {
  if (!sellerDashboard) return null;

  const defaults = {
    avgConversionRate: 5,
    avgEngagementRate: 3,
    avgListingsPerSeller: 12,
    avgViewsPerListing: 45,
  };

  const average = { ...defaults, ...platformAverage };
  const { summary } = sellerDashboard;

  return {
    conversionRateVsAvg: {
      value: summary.conversionRate,
      average: average.avgConversionRate,
      difference: summary.conversionRate - average.avgConversionRate,
      percentile: summary.conversionRate > average.avgConversionRate ? 'above' : 'below',
    },
    engagementRateVsAvg: {
      value: summary.engagementRate,
      average: average.avgEngagementRate,
      difference: summary.engagementRate - average.avgEngagementRate,
      percentile: summary.engagementRate > average.avgEngagementRate ? 'above' : 'below',
    },
    listingsVsAvg: {
      value: summary.activeListings,
      average: average.avgListingsPerSeller,
      difference: summary.activeListings - average.avgListingsPerSeller,
      percentile: summary.activeListings > average.avgListingsPerSeller ? 'above' : 'below',
    },
    avgViewsPerListing: {
      value: summary.totalViews / (summary.activeListings || 1),
      average: average.avgViewsPerListing,
      percentile: (summary.totalViews / (summary.activeListings || 1)) > average.avgViewsPerListing ? 'above' : 'below',
    },
  };
};

/**
 * Generate seller monthly report
 */
const generateMonthlyReport = (listings = [], monthOffset = 0) => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1 - monthOffset, 0);

  const monthListings = listings.filter((l) => {
    const listDate = new Date(l.createdAt);
    return listDate >= startDate && listDate <= endDate;
  });

  const totalViews = monthListings.reduce((sum, l) => sum + (l.views || 0), 0);
  const totalChats = monthListings.reduce((sum, l) => sum + (l.chats || 0), 0);
  const totalRevenue = monthListings.reduce((sum, l) => {
    if (l.monetizationPlan === 'Featured') return sum + 299;
    if (l.monetizationPlan === 'Urgent') return sum + 149;
    return sum;
  }, 0);

  return {
    month: startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    period: { start: startDate, end: endDate },
    listingsCreated: monthListings.length,
    totalViews,
    totalChats,
    conversionRate: calculateConversionRate(totalViews, totalChats),
    totalRevenue,
    avgListingPrice: monthListings.length > 0
      ? Math.round(monthListings.reduce((sum, l) => sum + (l.price || 0), 0) / monthListings.length)
      : 0,
  };
};

module.exports = {
  getSellerDashboard,
  getSellerRecommendations,
  calculateSellerHealthScore,
  getSellerComparison,
  generateMonthlyReport,
};
