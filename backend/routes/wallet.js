const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet');
const { authenticate } = require('../middleware/auth');

// Initialize wallet for new user
router.post('/init', authenticate, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ userEmail: req.user.email });

    if (wallet) {
      return res.json({ success: true, data: wallet });
    }

    wallet = new Wallet({
      userEmail: req.user.email,
      userName: req.user.name,
      balance: 0,
    });

    await wallet.save();
    res.status(201).json({ success: true, data: wallet });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get wallet balance
router.get('/balance', authenticate, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ userEmail: req.user.email });

    if (!wallet) {
      wallet = new Wallet({
        userEmail: req.user.email,
        userName: req.user.name,
      });
      await wallet.save();
    }

    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        currency: wallet.currency,
        isActive: wallet.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get wallet details with transactions
router.get('/details', authenticate, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ userEmail: req.user.email });

    if (!wallet) {
      wallet = new Wallet({
        userEmail: req.user.email,
        userName: req.user.name,
      });
      await wallet.save();
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const transactions = wallet.transactions
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: {
        wallet: {
          balance: wallet.balance,
          currency: wallet.currency,
          totalCredited: wallet.totalCredited,
          totalDebited: wallet.totalDebited,
          isActive: wallet.isActive,
        },
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: wallet.transactions.length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add money to wallet
router.post('/add-money', authenticate, async (req, res) => {
  try {
    const { amount } = req.body;

    if (amount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be positive' });
    }

    let wallet = await Wallet.findOne({ userEmail: req.user.email });

    if (!wallet) {
      wallet = new Wallet({
        userEmail: req.user.email,
        userName: req.user.name,
      });
    }

    const previousBalance = wallet.balance;
    wallet.balance += amount;
    wallet.totalCredited += amount;
    wallet.lastTransactionDate = new Date();

    wallet.transactions.push({
      transactionId: `txn-${Date.now()}`,
      type: 'Credit',
      amount,
      description: 'Added money to wallet',
      previousBalance,
      newBalance: wallet.balance,
      status: 'Completed',
    });

    await wallet.save();

    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        transaction: wallet.transactions[wallet.transactions.length - 1],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Use wallet balance for purchase
router.post('/use', authenticate, async (req, res) => {
  try {
    const { amount, orderId, description } = req.body;

    if (amount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be positive' });
    }

    let wallet = await Wallet.findOne({ userEmail: req.user.email });

    if (!wallet) {
      return res.status(404).json({ success: false, error: 'Wallet not found' });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
    }

    const previousBalance = wallet.balance;
    wallet.balance -= amount;
    wallet.totalDebited += amount;
    wallet.lastTransactionDate = new Date();

    wallet.transactions.push({
      transactionId: `txn-${Date.now()}`,
      type: 'Debit',
      amount,
      description: description || 'Used wallet balance for purchase',
      relatedOrderId: orderId,
      previousBalance,
      newBalance: wallet.balance,
      status: 'Completed',
    });

    await wallet.save();

    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        transaction: wallet.transactions[wallet.transactions.length - 1],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Refund to wallet
router.post('/refund', authenticate, async (req, res) => {
  try {
    const { amount, refundId, reason } = req.body;

    if (amount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be positive' });
    }

    let wallet = await Wallet.findOne({ userEmail: req.user.email });

    if (!wallet) {
      wallet = new Wallet({
        userEmail: req.user.email,
        userName: req.user.name,
      });
    }

    const previousBalance = wallet.balance;
    wallet.balance += amount;
    wallet.totalCredited += amount;
    wallet.lastTransactionDate = new Date();

    wallet.transactions.push({
      transactionId: `txn-${Date.now()}`,
      type: 'Refund',
      amount,
      description: reason || 'Refund credited to wallet',
      relatedRefundId: refundId,
      previousBalance,
      newBalance: wallet.balance,
      status: 'Completed',
    });

    await wallet.save();

    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        transaction: wallet.transactions[wallet.transactions.length - 1],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get wallet transaction history
router.get('/transactions/history', authenticate, async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;

    let wallet = await Wallet.findOne({ userEmail: req.user.email });

    if (!wallet) {
      return res.json({ success: true, data: [] });
    }

    let transactions = wallet.transactions;

    if (type) {
      transactions = transactions.filter((t) => t.type === type);
    }

    transactions = transactions
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: wallet.transactions.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
