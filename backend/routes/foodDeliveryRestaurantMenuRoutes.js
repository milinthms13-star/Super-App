/**
 * FoodDelivery Phase 2 Routes
 * Restaurant Discovery & Menu Management API endpoints
 * Estimated 250+ lines
 */

const express = require('express');
const router = express.Router();

// Controllers
const FoodDeliveryRestaurantController = require('../controllers/FoodDeliveryRestaurantController');
const FoodDeliveryMenuController = require('../controllers/FoodDeliveryMenuController');

// Middleware
const FoodDeliveryRestaurantValidations = require('../middleware/FoodDeliveryRestaurantValidations');
const { authenticateToken } = require('../middleware/auth'); // Assuming auth middleware exists

/**
 * =====================================
 * RESTAURANT DISCOVERY ROUTES
 * =====================================
 */

/**
 * GET /api/fooddelivery/restaurants/nearby
 * Get nearby restaurants based on coordinates
 */
router.get(
  '/restaurants/nearby',
  FoodDeliveryRestaurantValidations.nearbyRestaurantsValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryRestaurantController.getNearbyRestaurants
);

/**
 * GET /api/fooddelivery/restaurants/search
 * Search restaurants
 */
router.get(
  '/restaurants/search',
  FoodDeliveryRestaurantValidations.searchRestaurantsValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryRestaurantController.searchRestaurants
);

/**
 * GET /api/fooddelivery/restaurants/filtered
 * Get filtered restaurants
 */
router.get(
  '/restaurants/filtered',
  FoodDeliveryRestaurantValidations.filteredRestaurantsValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryRestaurantController.getFilteredRestaurants
);

/**
 * GET /api/fooddelivery/restaurants/featured
 * Get featured restaurants
 */
router.get(
  '/restaurants/featured',
  FoodDeliveryRestaurantValidations.featuredRestaurantsValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryRestaurantController.getFeaturedRestaurants
);

/**
 * GET /api/fooddelivery/restaurants/promoted
 * Get promoted restaurants
 */
router.get(
  '/restaurants/promoted',
  FoodDeliveryRestaurantController.getPromotedRestaurants
);

/**
 * GET /api/fooddelivery/restaurants/trending
 * Get trending restaurants
 */
router.get(
  '/restaurants/trending',
  FoodDeliveryRestaurantValidations.featuredRestaurantsValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryRestaurantController.getTrendingRestaurants
);

/**
 * GET /api/fooddelivery/restaurants/cuisine/:cuisine
 * Get restaurants by cuisine
 */
router.get(
  '/restaurants/cuisine/:cuisine',
  FoodDeliveryRestaurantValidations.restaurantByCuisineValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryRestaurantController.getRestaurantsByCuisine
);

/**
 * GET /api/fooddelivery/restaurants/offers
 * Get active offers from nearby restaurants
 */
router.get(
  '/restaurants/offers',
  FoodDeliveryRestaurantValidations.nearbyRestaurantsValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryRestaurantController.getActiveOffers
);

/**
 * GET /api/fooddelivery/restaurants/:id
 * Get restaurant details
 */
router.get(
  '/restaurants/:id',
  FoodDeliveryRestaurantValidations.restaurantIdValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryRestaurantController.getRestaurantDetails
);

/**
 * GET /api/fooddelivery/restaurants/:id/reviews
 * Get restaurant reviews
 */
router.get(
  '/restaurants/:id/reviews',
  FoodDeliveryRestaurantValidations.restaurantReviewsValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryRestaurantController.getRestaurantReviews
);

/**
 * POST /api/fooddelivery/restaurants/:id/reviews
 * Add review to restaurant (protected)
 */
router.post(
  '/restaurants/:id/reviews',
  authenticateToken,
  FoodDeliveryRestaurantValidations.addReviewValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryRestaurantController.addRestaurantReview
);

/**
 * GET /api/fooddelivery/restaurants/user/nearby
 * Get restaurants for user's default address (protected)
 */
router.get(
  '/restaurants/user/nearby',
  authenticateToken,
  FoodDeliveryRestaurantController.getRestaurantsForUser
);

/**
 * =====================================
 * MENU ROUTES
 * =====================================
 */

/**
 * GET /api/fooddelivery/restaurants/:restaurantId/menu
 * Get complete menu for restaurant
 */
router.get(
  '/restaurants/:restaurantId/menu',
  FoodDeliveryRestaurantValidations.restaurantIdParamValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryMenuController.getRestaurantMenu
);

/**
 * GET /api/fooddelivery/restaurants/:restaurantId/menu/categories
 * Get menu categories
 */
router.get(
  '/restaurants/:restaurantId/menu/categories',
  FoodDeliveryRestaurantValidations.restaurantIdParamValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryMenuController.getMenuCategories
);

/**
 * GET /api/fooddelivery/restaurants/:restaurantId/menu/categories/:category
 * Get items in specific category
 */
router.get(
  '/restaurants/:restaurantId/menu/categories/:category',
  FoodDeliveryRestaurantValidations.menuCategoryValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryMenuController.getMenuItemsByCategory
);

/**
 * GET /api/fooddelivery/restaurants/:restaurantId/menu/items/:itemId
 * Get menu item details
 */
router.get(
  '/restaurants/:restaurantId/menu/items/:itemId',
  FoodDeliveryRestaurantValidations.restaurantIdParamValidation(),
  FoodDeliveryRestaurantValidations.itemIdValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryMenuController.getMenuItemDetails
);

/**
 * GET /api/fooddelivery/restaurants/:restaurantId/menu/search
 * Search menu items
 */
router.get(
  '/restaurants/:restaurantId/menu/search',
  FoodDeliveryRestaurantValidations.searchMenuValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryMenuController.searchMenuItems
);

/**
 * GET /api/fooddelivery/restaurants/:restaurantId/menu/featured
 * Get featured menu items
 */
router.get(
  '/restaurants/:restaurantId/menu/featured',
  FoodDeliveryRestaurantValidations.restaurantIdParamValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryMenuController.getFeaturedMenuItems
);

/**
 * GET /api/fooddelivery/restaurants/:restaurantId/menu/popular
 * Get popular menu items
 */
router.get(
  '/restaurants/:restaurantId/menu/popular',
  FoodDeliveryRestaurantValidations.restaurantIdParamValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryMenuController.getPopularMenuItems
);

/**
 * GET /api/fooddelivery/restaurants/:restaurantId/menu/discounted
 * Get discounted items
 */
router.get(
  '/restaurants/:restaurantId/menu/discounted',
  FoodDeliveryRestaurantValidations.restaurantIdParamValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryMenuController.getDiscountedItems
);

/**
 * GET /api/fooddelivery/restaurants/:restaurantId/menu/vegetarian
 * Get vegetarian items
 */
router.get(
  '/restaurants/:restaurantId/menu/vegetarian',
  FoodDeliveryRestaurantValidations.restaurantIdParamValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryMenuController.getVegetarianItems
);

/**
 * GET /api/fooddelivery/restaurants/:restaurantId/menu/vegan
 * Get vegan items
 */
router.get(
  '/restaurants/:restaurantId/menu/vegan',
  FoodDeliveryRestaurantValidations.restaurantIdParamValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryMenuController.getVeganItems
);

/**
 * GET /api/fooddelivery/restaurants/:restaurantId/menu/dietary
 * Get items by dietary filters
 */
router.get(
  '/restaurants/:restaurantId/menu/dietary',
  FoodDeliveryRestaurantValidations.dietaryFiltersValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryMenuController.getItemsByDietaryFilters
);

/**
 * GET /api/fooddelivery/menu/items/:itemId/variants
 * Get item variants
 */
router.get(
  '/menu/items/:itemId/variants',
  FoodDeliveryRestaurantValidations.itemIdValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryMenuController.getItemVariants
);

/**
 * GET /api/fooddelivery/menu/items/:itemId/addons
 * Get item addons
 */
router.get(
  '/menu/items/:itemId/addons',
  FoodDeliveryRestaurantValidations.itemIdValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryMenuController.getItemAddons
);

/**
 * GET /api/fooddelivery/restaurants/:restaurantId/menu/spice/:spiceLevel
 * Get items by spice level
 */
router.get(
  '/restaurants/:restaurantId/menu/spice/:spiceLevel',
  FoodDeliveryRestaurantValidations.spiceLevelValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryMenuController.getItemsBySpiceLevel
);

/**
 * GET /api/fooddelivery/restaurants/:restaurantId/menu/recommended
 * Get recommended items
 */
router.get(
  '/restaurants/:restaurantId/menu/recommended',
  FoodDeliveryRestaurantValidations.restaurantIdParamValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryMenuController.getRecommendedItems
);

/**
 * GET /api/fooddelivery/restaurants/:restaurantId/menu/addons
 * Get addon groups
 */
router.get(
  '/restaurants/:restaurantId/menu/addons',
  FoodDeliveryRestaurantValidations.restaurantIdParamValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryMenuController.getAddonGroups
);

/**
 * POST /api/fooddelivery/menu/items/:itemId/calculate-price
 * Calculate item price with variants and addons
 */
router.post(
  '/menu/items/:itemId/calculate-price',
  FoodDeliveryRestaurantValidations.calculatePriceValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryMenuController.calculateItemPrice
);

/**
 * GET /api/fooddelivery/menu/items/:itemId/available
 * Check if item is available for ordering
 */
router.get(
  '/menu/items/:itemId/available',
  FoodDeliveryRestaurantValidations.itemIdValidation(),
  FoodDeliveryRestaurantValidations.handleValidationErrors,
  FoodDeliveryMenuController.checkItemAvailability
);

module.exports = router;
