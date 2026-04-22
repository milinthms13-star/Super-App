/**
 * Analytics tracking and metrics calculation for classified listings
 */

/**
 * Calculate conversion rate
 */
const calculateConversionRate = (views = 0, chats = 0) => {
  if (views === 0) return 0;
  return Math.round((chats / views) * 100 * 100) / 100; // Two decimal places
};

/**
 * Calculate engagement rate
 */
const calculateEngagementRate = (views = 0, favorites = 0, chats = 0) => {
  if (views === 0) return 0;
  const engagements = favorites + chats;
  return Math.round((engagements / views) * 100 * 100) / 100;
};

/**
 * Calculate click-through rate
 */
const calculateClickThroughRate = (impressions = 0, clicks = 0) => {
  if (impressions === 0) return 0;
  return Math.round((clicks / impressions) * 100 * 100) / 100;
};

/**
 * Score listing popularity (0-100)
 */
const calculatePopularityScore = (listing = {}) => {
  const { views = 0, chats = 0, favorites = 0, featured = false, urgent = false } = listing;

  let score = 0;

  // Views contribution (max 30 points)
  if (views < 10) score += views * 3;
  else if (views < 50) score += 30;
  else if (views < 200) score += Math.min(40, 30 + Math.log(views) * 5);
  else score += 40;

  // Chats contribution (max 30 points)
  if (chats < 5) score += chats * 6;
  else if (chats < 20) score += 30;
  else score += Math.min(35, 30 + Math.log(chats) * 3);

  // Favorites contribution (max 20 points)
  if (favorites < 5) score += favorites * 4;
  else if (favorites < 25) score += 20;
  else score += Math.min(25, 20 + Math.log(favorites) * 2);

  // Promotion boost
  if (featured) score += 15;
  if (urgent) score += 10;

  // Freshness factor (newer is better, but with diminishing returns)
  const hoursSincePost = Date.now() - new Date(listing.createdAt || Date.now()).getTime();
  const daysSincePost = hoursSincePost / (24 * 60 * 60 * 1000);
  if (daysSincePost < 1) score += 10;
  else if (daysSincePost < 7) score += Math.max(0, 10 - daysSincePost);

  return Math.min(100, Math.round(score));
};

/**
 * Calculate seller performance score (0-100)
 */
const calculateSellerScore = (sellerData = {}) => {
  const {
    rating = 5,
    reviewCount = 0,
    responseTime = 0,
    completionRate = 100,
    verificationLevel = 'unverified',
  } = sellerData;

  let score = 0;

  // Rating contribution (max 40 points)
  score += (rating / 5) * 40;

  // Review count contribution (max 25 points)
  if (reviewCount === 0) score += 0;
  else if (reviewCount < 5) score += reviewCount * 5;
  else if (reviewCount < 20) score += 25;
  else score += Math.min(35, 25 + Math.log(reviewCount) * 3);

  // Response time (max 15 points)
  if (responseTime === 0) score += 0;
  else if (responseTime <= 1) score += 15; // Within 1 hour
  else if (responseTime <= 24) score += 12; // Within 24 hours
  else if (responseTime <= 72) score += 8; // Within 3 days
  else score += Math.max(0, 15 - responseTime / 24);

  // Completion rate contribution (max 10 points)
  score += (completionRate / 100) * 10;

  // Verification bonus (max 10 points)
  const verificationBonus = {
    'unverified': 0,
    'email-verified': 2,
    'phone-verified': 5,
    'identity-verified': 10,
  };
  score += verificationBonus[verificationLevel] || 0;

  return Math.min(100, Math.round(score));
};

/**
 * Estimate price based on similar listings
 */
const estimateMarketPrice = (currentListing = {}, similarListings = []) => {
  if (similarListings.length === 0) {
    return currentListing.price || 0;
  }

  // Calculate median price of similar listings
  const prices = similarListings
    .map((l) => l.price)
    .sort((a, b) => a - b);

  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 !== 0
    ? prices[mid]
    : (prices[mid - 1] + prices[mid]) / 2;

  // Calculate deviation percentage
  const currentPrice = currentListing.price || median;
  const deviation = ((currentPrice - median) / median) * 100;

  return {
    marketMedianPrice: Math.round(median),
    currentPrice,
    deviationPercent: Math.round(deviation * 100) / 100,
    isFairlyPriced: Math.abs(deviation) <= 20, // Within 20% is considered fair
  };
};

/**
 * Get analytics summary for a listing
 */
const getListingAnalytics = (listing = {}) => {
  return {
    impressions: listing.views || 0,
    clicks: listing.chats || 0,
    saves: listing.favorites || 0,
    conversionRate: calculateConversionRate(listing.views, listing.chats),
    engagementRate: calculateEngagementRate(listing.views, listing.favorites, listing.chats),
    popularityScore: calculatePopularityScore(listing),
    ageInDays: Math.floor(
      (Date.now() - new Date(listing.createdAt || Date.now()).getTime()) / (24 * 60 * 60 * 1000)
    ),
  };
};

module.exports = {
  calculateConversionRate,
  calculateEngagementRate,
  calculateClickThroughRate,
  calculatePopularityScore,
  calculateSellerScore,
  estimateMarketPrice,
  getListingAnalytics,
};
