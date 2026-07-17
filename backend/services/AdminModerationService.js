const Product = require('../models/Product');
const EcommerceSellerProfile = require('../models/EcommerceSellerProfile');
const Order = require('../models/Order');
const EcommercePayout = require('../models/EcommercePayout');

class AdminModerationService {
  /**
   * Get pending product approvals
   */
  async getPendingProducts(page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;
      
      const [products, total] = await Promise.all([
        Product.find({ status: 'pending_approval' })
          .populate('sellerProfile', 'businessName')
          .populate('category', 'name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments({ status: 'pending_approval' })
      ]);

      return { products, pagination: { total, page, pages: Math.ceil(total / limit) } };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Approve product
   */
  async approveProduct(productId, adminId) {
    try {
      const product = await Product.findByIdAndUpdate(
        productId,
        { status: 'active', approvedBy: adminId, approvedAt: new Date() },
        { new: true }
      );
      
      return { success: true, product, message: 'Product approved' };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reject product
   */
  async rejectProduct(productId, adminId, reason) {
    try {
      const product = await Product.findByIdAndUpdate(
        productId,
        { status: 'rejected', rejectedBy: adminId, rejectionReason: reason },
        { new: true }
      );
      
      return { success: true, message: 'Product rejected' };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get sellers awaiting verification
   */
  async getPendingVerifications(page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const [sellers, total] = await Promise.all([
        EcommerceSellerProfile.find({ 'verification.status': 'in_review' })
          .populate('userId', 'email username')
          .sort({ 'verification.documentsSubmitted': -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EcommerceSellerProfile.countDocuments({ 'verification.status': 'in_review' })
      ]);

      return { sellers, pagination: { total, page, pages: Math.ceil(total / limit) } };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Suspend seller
   */
  async suspendSeller(sellerId, adminId, reason) {
    try {
      const seller = await EcommerceSellerProfile.findByIdAndUpdate(
        sellerId,
        {
          accountStatus: 'suspended',
          suspensionReason: reason,
          suspendedBy: adminId,
          suspendedAt: new Date()
        },
        { new: true }
      );

      // Deactivate all products
      await Product.updateMany(
        { sellerProfile: sellerId },
        { status: 'inactive' }
      );

      return { success: true, message: 'Seller suspended' };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get platform statistics
   */
  async getPlatformStatistics() {
    try {
      const [
        totalSellers,
        activeSellers,
        totalProducts,
        activeProducts,
        totalOrders,
        pendingVerifications,
        pendingProducts,
        pendingPayouts
      ] = await Promise.all([
        EcommerceSellerProfile.countDocuments(),
        EcommerceSellerProfile.countDocuments({ accountStatus: 'active' }),
        Product.countDocuments(),
        Product.countDocuments({ status: 'active' }),
        Order.countDocuments(),
        EcommerceSellerProfile.countDocuments({ 'verification.status': 'in_review' }),
        Product.countDocuments({ status: 'pending_approval' }),
        EcommercePayout.countDocuments({ status: 'pending_approval' })
      ]);

      return {
        sellers: { total: totalSellers, active: activeSellers },
        products: { total: totalProducts, active: activeProducts },
        orders: { total: totalOrders },
        pending: { verifications: pendingVerifications, products: pendingProducts, payouts: pendingPayouts }
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AdminModerationService();
