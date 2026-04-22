const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  createOrder,
  createProduct,
  createShop,
  deleteProduct,
  findOrderById,
  findProductById,
  findShopById,
  listOrdersByShop,
  listOrdersByUser,
  listProducts,
  listShops,
  updateOrder,
  updateProduct,
  updateShop,
} = require("../utils/localMarketStore");

const getComparableId = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return String(value);
};

const getAuthenticatedUserId = (req) =>
  String(req.user?.id || req.user?._id || req.auth?.sub || "");

// GET all shops
router.get("/shops", async (req, res) => {
  try {
    const { type, search, sort } = req.query;
    const shops = await listShops({ type, search, sort });

    res.json({ success: true, data: shops });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET specific shop with products
router.get("/shops/:shopId", async (req, res) => {
  try {
    const shop = await findShopById(req.params.shopId, { includeProducts: true });
    if (!shop) {
      return res.status(404).json({ success: false, error: "Shop not found" });
    }
    res.json({ success: true, data: shop });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET products for a shop
router.get("/shops/:shopId/products", async (req, res) => {
  try {
    const { category } = req.query;
    const products = await listProducts({ shopId: req.params.shopId, category });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// CREATE a new shop (shop owner)
router.post("/shops", authenticate, async (req, res) => {
  try {
    const { name, type, deliveryCharge, minOrder, freeDeliveryAbove, location, contact } = req.body;

    const shop = await createShop({
      name,
      type,
      ownerId: getAuthenticatedUserId(req),
      deliveryCharge,
      minOrder,
      freeDeliveryAbove,
      location,
      contact,
    });

    res.status(201).json({ success: true, data: shop });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// UPDATE shop
router.put("/shops/:shopId", authenticate, async (req, res) => {
  try {
    const shop = await findShopById(req.params.shopId);

    if (!shop) {
      return res.status(404).json({ success: false, error: "Shop not found" });
    }

    if (getComparableId(shop.ownerId) !== getAuthenticatedUserId(req)) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const updatedShop = await updateShop(req.params.shopId, req.body);

    res.json({ success: true, data: updatedShop });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ADD product to shop
router.post("/shops/:shopId/products", authenticate, async (req, res) => {
  try {
    const shop = await findShopById(req.params.shopId);

    if (!shop) {
      return res.status(404).json({ success: false, error: "Shop not found" });
    }

    if (getComparableId(shop.ownerId) !== getAuthenticatedUserId(req)) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const product = await createProduct({
      ...req.body,
      shopId: req.params.shopId,
    });

    if (!product) {
      return res.status(404).json({ success: false, error: "Shop not found" });
    }

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// UPDATE product
router.put("/products/:productId", authenticate, async (req, res) => {
  try {
    const product = await findProductById(req.params.productId);

    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    const shop = await findShopById(product.shopId);
    if (getComparableId(shop?.ownerId) !== getAuthenticatedUserId(req)) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const updatedProduct = await updateProduct(req.params.productId, req.body);

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE product
router.delete("/products/:productId", authenticate, async (req, res) => {
  try {
    const product = await findProductById(req.params.productId);

    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    const shop = await findShopById(product.shopId);
    if (getComparableId(shop?.ownerId) !== getAuthenticatedUserId(req)) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    await deleteProduct(req.params.productId);

    res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// CREATE order
router.post("/orders", authenticate, async (req, res) => {
  try {
    const { shopId, items, subtotal, discount, deliveryCharge, deliveryType, deliveryAddress, paymentMethod, promoCode, specialInstructions } = req.body;

    const orderId = `LM-${Date.now()}`;
    const order = await createOrder({
      orderId,
      userId: getAuthenticatedUserId(req),
      shopId,
      items,
      subtotal,
      discount,
      deliveryCharge,
      total: subtotal - discount + deliveryCharge,
      deliveryType,
      deliveryAddress,
      paymentMethod,
      promoCode,
      specialInstructions,
      estimatedDelivery: deliveryType === "Home Delivery" ? "30-45 mins" : "20 mins",
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET user orders
router.get("/orders", authenticate, async (req, res) => {
  try {
    const orders = await listOrdersByUser(getAuthenticatedUserId(req));

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET shop orders
router.get("/shops/:shopId/orders", authenticate, async (req, res) => {
  try {
    const shop = await findShopById(req.params.shopId);

    if (!shop) {
      return res.status(404).json({ success: false, error: "Shop not found" });
    }

    if (getComparableId(shop.ownerId) !== getAuthenticatedUserId(req)) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const orders = await listOrdersByShop(req.params.shopId);

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// UPDATE order status
router.put("/orders/:orderId/status", authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await findOrderById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const shop = await findShopById(order.shopId);
    if (getComparableId(shop?.ownerId) !== getAuthenticatedUserId(req)) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const updatedOrder = await updateOrder(req.params.orderId, {
      status,
      deliveredAt: status === "Delivered" ? new Date() : order.deliveredAt || null,
    });
    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ADD review for order
router.post("/orders/:orderId/review", authenticate, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const order = await findOrderById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    if (getComparableId(order.userId) !== getAuthenticatedUserId(req)) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const review = {
      rating,
      comment,
      createdAt: new Date(),
    };

    // Update shop rating
    const shop = await findShopById(order.shopId);
    const reviews = [
      ...(Array.isArray(shop?.reviews) ? shop.reviews : []),
      {
        userId: getAuthenticatedUserId(req),
        rating,
        comment,
        createdAt: new Date(),
      },
    ];
    const avgRating =
      reviews.reduce((sum, currentReview) => sum + Number(currentReview.rating || 0), 0) /
      reviews.length;

    const updatedOrder = await updateOrder(req.params.orderId, {
      review,
    });
    await updateShop(order.shopId, {
      reviews,
      rating: avgRating,
      totalReviews: reviews.length,
    });

    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ADD review for shop
router.post("/shops/:shopId/review", authenticate, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const shop = await findShopById(req.params.shopId);

    if (!shop) {
      return res.status(404).json({ success: false, error: "Shop not found" });
    }

    const reviews = [
      ...(Array.isArray(shop.reviews) ? shop.reviews : []),
      {
        userId: getAuthenticatedUserId(req),
        rating,
        comment,
        createdAt: new Date(),
      },
    ];
    const avgRating =
      reviews.reduce((sum, currentReview) => sum + Number(currentReview.rating || 0), 0) /
      reviews.length;

    const updatedShop = await updateShop(req.params.shopId, {
      reviews,
      rating: avgRating,
      totalReviews: reviews.length,
    });

    res.json({ success: true, data: updatedShop });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
