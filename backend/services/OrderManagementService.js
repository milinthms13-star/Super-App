const Order = require('../models/Order');
const Product = require('../models/Product');
const EcommerceTransaction = require('../models/EcommerceTransaction');
const EcommerceSellerProfile = require('../models/EcommerceSellerProfile');
const CommissionCalculationService = require('./CommissionCalculationService');

class OrderManagementService {
  /**
   * Create order with multi-seller support
   */
  async createOrder(userId, orderData) {
    try {
      const { items, shippingAddress, paymentMethod } = orderData;

      // Validate products and group by seller
      const sellerOrders = {};
      let totalAmount = 0;

      for (const item of items) {
        const product = await Product.findById(item.productId)
          .populate('sellerProfile');

        if (!product || product.status !== 'active') {
          throw new Error(`Product ${item.productId} is not available`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        const sellerId = product.sellerProfile._id.toString();
        if (!sellerOrders[sellerId]) {
          sellerOrders[sellerId] = {
            seller: product.sellerProfile,
            items: [],
            subtotal: 0
          };
        }

        const itemTotal = product.price * item.quantity;
        sellerOrders[sellerId].items.push({
          product: product._id,
          productName: product.name,
          price: product.price,
          quantity: item.quantity,
          total: itemTotal
        });
        sellerOrders[sellerId].subtotal += itemTotal;
        totalAmount += itemTotal;
      }

      // Create main order
      const order = new Order({
        user: userId,
        items: Object.values(sellerOrders).flatMap(so => so.items),
        totalAmount,
        shippingAddress,
        paymentMethod,
        paymentStatus: 'pending',
        status: 'pending',
        sellers: Object.keys(sellerOrders)
      });

      await order.save();

      // Create transactions for each seller
      for (const [sellerId, sellerOrder] of Object.entries(sellerOrders)) {
        const commission = await CommissionCalculationService.calculateOrderCommission(
          sellerId,
          sellerOrder.subtotal
        );

        const transaction = new EcommerceTransaction({
          seller: sellerId,
          order: order._id,
          orderAmount: sellerOrder.subtotal,
          commissionRate: commission.commissionRate,
          commissionAmount: commission.commissionAmount,
          gstAmount: commission.gstAmount,
          sellerAmount: commission.sellerEarnings,
          platformAmount: commission.platformEarnings,
          status: 'pending'
        });

        await transaction.save();

        // Update product stock
        for (const item of sellerOrder.items) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.quantity }
          });
        }
      }

      return {
        success: true,
        order,
        message: 'Order created successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get seller orders
   */
  async getSellerOrders(sellerId, filters = {}) {
    try {
      const sellerProfile = await EcommerceSellerProfile.findOne({ user: sellerId });
      if (!sellerProfile) {
        throw new Error('Seller profile not found');
      }

      const { status, page = 1, limit = 20 } = filters;
      const query = { sellers: sellerProfile._id };

      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        Order.find(query)
          .populate('user', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments(query)
      ]);

      return {
        orders,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, sellerId, status, notes = '') {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const sellerProfile = await EcommerceSellerProfile.findOne({ user: sellerId });
      if (!sellerProfile || !order.sellers.includes(sellerProfile._id)) {
        throw new Error('Unauthorized');
      }

      order.status = status;
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status,
        timestamp: new Date(),
        notes
      });

      if (status === 'delivered') {
        order.deliveredAt = new Date();
        // Update transaction status
        await EcommerceTransaction.updateMany(
          { order: orderId, seller: sellerProfile._id },
          { status: 'completed' }
        );
      }

      await order.save();

      return {
        success: true,
        order,
        message: `Order status updated to ${status}`
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new OrderManagementService();
