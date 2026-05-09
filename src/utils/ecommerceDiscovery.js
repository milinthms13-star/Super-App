import { formatCurrency } from "./ecommerceHelpers";

const MALAYALAM_TERM_MAP = {
  "ചിപ്സ്": "chips",
  "സ്നാക്സ്": "snacks",
  "കട": "shop",
  "ലോകൽ": "local",
  "അടുത്തുള്ള": "nearby",
  "പച്ചക്കറി": "vegetables",
  "ഗ്രോസറി": "groceries",
  "അരി": "rice",
  "മൊബൈൽ": "mobile",
  "ഫോൺ": "phone",
  "ചാർജർ": "charger",
  "പെട്ടെന്ന്": "fast",
};

const CATEGORY_ALIASES = {
  Snacks: ["snack", "snacks", "chips", "banana chips", "mixture", "namkeen"],
  Groceries: ["grocery", "groceries", "rice", "vegetables", "daily needs", "essentials"],
  Electronics: ["electronics", "mobile", "phone", "charger", "headphone", "cable", "gadget"],
  Fashion: ["fashion", "dress", "shirt", "kurti", "wear"],
  Beauty: ["beauty", "soap", "shampoo", "skin care", "cosmetics", "makeup"],
  Household: ["household", "home", "cleaning", "kitchen", "storage"],
};

const LOCAL_KEYWORDS = ["local", "nearby", "hyperlocal", "near me", "shop near me"];
const FAST_KEYWORDS = ["fast", "instant", "same day", "today", "urgent"];
const STOCK_KEYWORDS = ["in stock", "available", "ready to ship", "available now"];
const TOP_RATED_KEYWORDS = ["best rated", "top rated", "highly rated", "popular"];
const BUDGET_KEYWORDS = ["budget", "cheap", "affordable", "value"];
const DEFAULT_PRICE_SUGGESTIONS = [
  { id: "budget", label: "Budget picks under INR 500", query: "budget", filters: { maxPrice: "500", sort: "price-asc" } },
  { id: "top-rated", label: "Top rated 4+ stars", query: "top rated", filters: { minRating: "4", sort: "rating" } },
];

const normalizeWhitespace = (value = "") => String(value || "").replace(/\s+/g, " ").trim();

export const normalizeSearchQuery = (query = "") => {
  let normalized = normalizeWhitespace(String(query || "").toLowerCase());

  Object.entries(MALAYALAM_TERM_MAP).forEach(([source, replacement]) => {
    normalized = normalized.replace(new RegExp(source, "gi"), replacement);
  });

  return normalized
    .replace(/[^\p{L}\p{N}\s.+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const toCategoryLookup = (categories = []) =>
  (categories || [])
    .filter(Boolean)
    .map((category) => String(category))
    .map((category) => ({
      name: category,
      normalizedName: normalizeSearchQuery(category),
    }));

const findCategoryMatch = (normalizedQuery = "", categories = []) => {
  const categoryLookup = toCategoryLookup(categories);
  const exactMatch = categoryLookup.find((category) =>
    normalizedQuery.includes(category.normalizedName)
  );

  if (exactMatch) {
    return exactMatch.name;
  }

  const aliasMatch = Object.entries(CATEGORY_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => normalizedQuery.includes(normalizeSearchQuery(alias)))
  );

  if (!aliasMatch) {
    return "";
  }

  const [categoryLabel] = aliasMatch;
  return categoryLookup.find((category) => category.normalizedName === normalizeSearchQuery(categoryLabel))?.name
    || categoryLabel;
};

const extractPriceCeiling = (normalizedQuery = "") => {
  const match = normalizedQuery.match(
    /(?:under|below|less than|max|within)\s*(?:rs|inr|rupees)?\s*(\d{2,6})/i
  );

  if (!match?.[1]) {
    return "";
  }

  return String(Number.parseInt(match[1], 10));
};

const extractMinRating = (normalizedQuery = "") => {
  const directMatch = normalizedQuery.match(/([2345](?:\.\d)?)\s*(?:\+|plus)?\s*(?:star|stars|rating)/i);
  if (directMatch?.[1]) {
    return String(Number(directMatch[1]));
  }

  if (TOP_RATED_KEYWORDS.some((keyword) => normalizedQuery.includes(keyword))) {
    return "4";
  }

  return "";
};

const getPreferredSort = (normalizedQuery = "") => {
  if (TOP_RATED_KEYWORDS.some((keyword) => normalizedQuery.includes(keyword))) {
    return "rating";
  }

  if (BUDGET_KEYWORDS.some((keyword) => normalizedQuery.includes(keyword))) {
    return "price-asc";
  }

  return "";
};

export const deriveSmartSearchPlan = (query = "", categories = []) => {
  const normalizedQuery = normalizeSearchQuery(query);
  const category = findCategoryMatch(normalizedQuery, categories);
  const maxPrice = extractPriceCeiling(normalizedQuery);
  const minRating = extractMinRating(normalizedQuery);
  const inStockOnly = STOCK_KEYWORDS.some((keyword) => normalizedQuery.includes(keyword));
  const wantsLocal = LOCAL_KEYWORDS.some((keyword) => normalizedQuery.includes(keyword));
  const wantsFastDelivery = FAST_KEYWORDS.some((keyword) => normalizedQuery.includes(keyword));
  const sort = getPreferredSort(normalizedQuery);

  const summaryParts = [];

  if (category) {
    summaryParts.push(category);
  }
  if (maxPrice) {
    summaryParts.push(`under INR ${maxPrice}`);
  }
  if (minRating) {
    summaryParts.push(`${minRating}+ rating`);
  }
  if (inStockOnly) {
    summaryParts.push("in-stock only");
  }
  if (wantsLocal) {
    summaryParts.push("local sellers");
  }
  if (wantsFastDelivery) {
    summaryParts.push("quick delivery intent");
  }

  return {
    normalizedQuery,
    searchText: normalizeWhitespace(query),
    category,
    maxPrice,
    minRating,
    inStockOnly,
    wantsLocal,
    wantsFastDelivery,
    sort,
    canApply: Boolean(category || maxPrice || minRating || inStockOnly || sort || wantsLocal || wantsFastDelivery),
    summary: summaryParts.join(", "),
  };
};

const incrementCount = (map, key, weight = 1) => {
  if (!key) {
    return;
  }

  map.set(key, (map.get(key) || 0) + weight);
};

const buildPreferenceMaps = ({ favorites = [], cart = [], orders = [], recentlyViewed = [] } = {}) => {
  const categoryScores = new Map();
  const businessScores = new Map();

  favorites.forEach((product) => {
    incrementCount(categoryScores, product.category, 4);
    incrementCount(businessScores, product.businessName, 2);
  });

  recentlyViewed.forEach((product) => {
    incrementCount(categoryScores, product.category, 3);
    incrementCount(businessScores, product.businessName, 1);
  });

  cart.forEach((product) => {
    incrementCount(categoryScores, product.category, 2);
    incrementCount(businessScores, product.businessName, 1);
  });

  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      incrementCount(categoryScores, item.category, 2);
      incrementCount(businessScores, item.businessName || item.sellerName, 1);
    });
  });

  return { categoryScores, businessScores };
};

export const buildPersonalizedRecommendations = ({
  products = [],
  favorites = [],
  cart = [],
  orders = [],
  recentlyViewed = [],
  limit = 4,
} = {}) => {
  const { categoryScores, businessScores } = buildPreferenceMaps({
    favorites,
    cart,
    orders,
    recentlyViewed,
  });
  const recentIds = new Set((recentlyViewed || []).map((product) => product.id));

  return [...(products || [])]
    .map((product) => {
      const categoryScore = categoryScores.get(product.category) || 0;
      const businessScore = businessScores.get(product.businessName) || 0;
      const discountScore = Number(product.discountPercentage || 0) / 10;
      const ratingScore = Number(product.rating || 0);
      const stockScore = Number(product.stock || 0) > 0 ? 1 : -5;
      const recentPenalty = recentIds.has(product.id) ? -1 : 0;
      const totalScore =
        categoryScore * 3 +
        businessScore * 2 +
        discountScore +
        ratingScore +
        stockScore +
        recentPenalty;

      let reason = "Trending across GlobeMart";
      if (categoryScore > 0) {
        reason = `Matches your ${product.category || "favorite"} shopping pattern`;
      } else if (businessScore > 0) {
        reason = `More from ${product.businessName || "a seller you viewed"}`;
      } else if (Number(product.discountPercentage || 0) > 0) {
        reason = "Strong value pick based on current discounts";
      }

      return {
        ...product,
        recommendationReason: reason,
        recommendationScore: totalScore,
      };
    })
    .filter((product) => Number(product.stock || 0) > 0)
    .sort((left, right) => right.recommendationScore - left.recommendationScore)
    .slice(0, limit);
};

const getTopCategories = (products = [], limit = 2) => {
  const counts = new Map();
  (products || []).forEach((product) => incrementCount(counts, product.category));

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([category]) => category);
};

export const buildDiscoverySuggestions = ({
  products = [],
  searchHistory = [],
  favorites = [],
  recentlyViewed = [],
} = {}) => {
  const suggestions = [...DEFAULT_PRICE_SUGGESTIONS];
  const historySuggestions = (searchHistory || [])
    .map((entry) => String(entry?.query || entry || "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((query, index) => ({
      id: `history-${index}`,
      label: `Search again: ${query}`,
      query,
      filters: {},
    }));

  const preferenceCategories = [
    ...getTopCategories(favorites, 1),
    ...getTopCategories(recentlyViewed, 1),
    ...getTopCategories(products, 1),
  ].filter(Boolean);

  const categorySuggestions = [...new Set(preferenceCategories)]
    .slice(0, 3)
    .map((category) => ({
      id: `category-${category}`,
      label: `${category} picks`,
      query: category,
      filters: { category },
    }));

  return [...historySuggestions, ...categorySuggestions, ...suggestions].slice(0, 8);
};

export const buildProductShareMessage = (product = {}) => {
  const name = product.name || "this product";
  const businessName = product.businessName ? ` from ${product.businessName}` : "";
  const price = Number.isFinite(Number(product.price))
    ? `INR ${formatCurrency(product.price)}`
    : "the listed price";
  const discountCopy = product.isDiscountActive
    ? ` Save INR ${formatCurrency(product.discountAmount)} right now.`
    : "";
  const locationCopy = product.batchLocation || product.location
    ? ` Dispatches from ${product.batchLocation || product.location}.`
    : "";

  return `Check out ${name}${businessName} on NilaHub GlobeMart for ${price}.${discountCopy}${locationCopy}`.trim();
};

export const getDefaultRefillCadenceDays = (product = {}) => {
  const normalizedProductText = normalizeSearchQuery(
    [product.category, product.subcategory, product.name].filter(Boolean).join(" ")
  );

  if (/(grocery|groceries|vegetable|rice|milk|daily needs|essentials)/i.test(normalizedProductText)) {
    return 7;
  }

  if (/(snack|snacks|chips|banana chips|namkeen)/i.test(normalizedProductText)) {
    return 14;
  }

  if (/(beauty|soap|shampoo|cosmetic|skin care)/i.test(normalizedProductText)) {
    return 21;
  }

  if (/(household|cleaning|kitchen|storage)/i.test(normalizedProductText)) {
    return 30;
  }

  if (/(electronics|mobile|phone|charger|headphone|cable)/i.test(normalizedProductText)) {
    return 45;
  }

  return 21;
};
