const WalletService = require('../services/FoodDeliveryWalletService');
const NotificationService = require('../services/FoodDeliveryNotificationService');

class WalletController {
  /**
   * Get wallet
   */
  static async getWallet(req, res) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const wallet = await WalletService.getWallet(userId);

      res.json({
        success: true,
        data: wallet.toSummary(),
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Add money to wallet
   */
  static async addMoney(req, res) {
    try {
      const userId = req.user?.userId;
      const { amount, source = 'manual', details } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount',
        });
      }

      const wallet = await WalletService.addMoney(userId, amount, source, details);

      // Send notification
      await NotificationService.sendWalletUpdateNotification(userId, {
        type: 'money_added',
        amount,
        newBalance: wallet.balance,
      });

      res.status(201).json({
        success: true,
        data: wallet.toSummary(),
        message: 'Money added to wallet successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get wallet transactions
   */
  static async getTransactions(req, res) {
    try {
      const userId = req.user?.userId;
      const { limit = 20, skip = 0 } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const transactions = await WalletService.getTransactions(
        userId,
        parseInt(limit),
        parseInt(skip)
      );

      res.json({
        success: true,
        data: transactions,
        count: transactions.length,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Add linked payment method
   */
  static async addLinkedPaymentMethod(req, res) {
    try {
      const userId = req.user?.userId;
      const { method, details } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      if (!method || !method.type) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: method',
        });
      }

      const wallet = await WalletService.addLinkedPaymentMethod(userId, method, details);

      res.status(201).json({
        success: true,
        data: wallet.toSummary(),
        message: 'Payment method added successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Set beneficiary (for withdrawal)
   */
  static async setBeneficiary(req, res) {
    try {
      const userId = req.user?.userId;
      const beneficiaryDetails = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      if (!beneficiaryDetails.accountNumber || !beneficiaryDetails.accountHolderName) {
        return res.status(400).json({
          success: false,
          message: 'Missing required beneficiary details',
        });
      }

      const wallet = await WalletService.setBeneficiary(userId, beneficiaryDetails);

      res.json({
        success: true,
        data: wallet.toSummary(),
        message: 'Beneficiary details saved successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update wallet preferences
   */
  static async updatePreferences(req, res) {
    try {
      const userId = req.user?.userId;
      const { preferences } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const wallet = await WalletService.getWallet(userId);
      wallet.preferences = { ...wallet.preferences, ...preferences };
      await wallet.save();

      res.json({
        success: true,
        data: wallet.toSummary(),
        message: 'Preferences updated successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get wallet summary
   */
  static async getWalletSummary(req, res) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const summary = await WalletService.getWalletSummary(userId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Apply promo code (add promotional balance)
   */
  static async applyPromoCode(req, res) {
    try {
      const userId = req.user?.userId;
      const { promoCode, amount, expiryDays } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      if (!promoCode || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: promoCode, amount',
        });
      }

      const wallet = await WalletService.addPromoCredit(
        userId,
        promoCode,
        amount,
        expiryDays || 7
      );

      // Send notification
      await NotificationService.sendPromoAppliedNotification(userId, {
        promoCode,
        amount,
      });

      res.json({
        success: true,
        data: wallet.toSummary(),
        message: 'Promo code applied successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get wallet analytics (admin)
   */
  static async getWalletAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: startDate, endDate',
        });
      }

      const analytics = await WalletService.getWalletAnalytics(startDate, endDate);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = WalletController;
