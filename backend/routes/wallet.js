const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet');
const { authenticate } = require('../middleware/auth');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const VALID_TRANSACTION_TYPES = new Set(['Credit', 'Debit', 'Refund', 'Transfer']);

const parsePositiveAmount = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100) / 100;
};

const parsePagination = (pageValue, limitValue, defaultLimit = DEFAULT_LIMIT) => {
  const parsedPage = Math.max(1, parseInt(pageValue, 10) || 1);
  const parsedLimit = Math.min(MAX_LIMIT, Math.max(1, parseInt(limitValue, 10) || defaultLimit));

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  };
};

const buildWalletSummary = (wallet = {}) => ({
  balance: Number(wallet.balance || 0),
  currency: wallet.currency || 'INR',
  totalCredited: Number(wallet.totalCredited || 0),
  totalDebited: Number(wallet.totalDebited || 0),
  isActive: wallet.isActive !== false,
  maximumBalance: Number(wallet.maximumBalance || 0),
  lastTransactionDate: wallet.lastTransactionDate || null,
});

const buildTransactionId = () =>
  `txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const ensureWalletForUser = async (user = {}) => {
  let wallet = await Wallet.findOne({ userEmail: user.email });

  if (wallet) {
    return wallet;
  }

  wallet = new Wallet({
    userEmail: user.email,
    userName: user.name,
  });
  await wallet.save();
  return wallet;
};

// Initialize wallet for new user
router.post('/init', authenticate, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ userEmail: req.user.email });

    if (wallet) {
      return res.json({ success: true, data: wallet });
    }

    wallet = await ensureWalletForUser(req.user);
    res.status(201).json({ success: true, data: wallet });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get wallet balance
router.get('/balance', authenticate, async (req, res) => {
  try {
    const wallet = await ensureWalletForUser(req.user);

    res.json({
      success: true,
      data: buildWalletSummary(wallet),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get wallet details with transactions
router.get('/details', authenticate, async (req, res) => {
  try {
    const wallet = await ensureWalletForUser(req.user);

    const { page, limit, skip } = parsePagination(req.query?.page, req.query?.limit);

    const transactions = wallet.transactions
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(skip, skip + limit);

    res.json({
      success: true,
      data: {
        wallet: buildWalletSummary(wallet),
        transactions,
        pagination: {
          page,
          limit,
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
    const amount = parsePositiveAmount(req.body?.amount);

    if (!amount) {
      return res.status(400).json({ success: false, error: 'Amount must be positive' });
    }

    const wallet = await ensureWalletForUser(req.user);

    if (wallet.isActive === false) {
      return res.status(403).json({ success: false, error: 'Wallet is inactive' });
    }

    const maximumBalance = Number(wallet.maximumBalance || 0);
    if (maximumBalance > 0 && Number(wallet.balance || 0) + amount > maximumBalance) {
      return res.status(400).json({
        success: false,
        error: `Wallet balance cannot exceed ${maximumBalance}`,
      });
    }

    const previousBalance = wallet.balance;
    wallet.balance += amount;
    wallet.totalCredited += amount;
    wallet.lastTransactionDate = new Date();

    wallet.transactions.push({
      transactionId: buildTransactionId(),
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
    const amount = parsePositiveAmount(req.body?.amount);
    const { orderId, description } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, error: 'Amount must be positive' });
    }

    const wallet = await Wallet.findOne({ userEmail: req.user.email });

    if (!wallet) {
      return res.status(404).json({ success: false, error: 'Wallet not found' });
    }

    if (wallet.isActive === false) {
      return res.status(403).json({ success: false, error: 'Wallet is inactive' });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
    }

    const previousBalance = wallet.balance;
    wallet.balance -= amount;
    wallet.totalDebited += amount;
    wallet.lastTransactionDate = new Date();

    wallet.transactions.push({
      transactionId: buildTransactionId(),
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
    const amount = parsePositiveAmount(req.body?.amount);
    const { refundId, reason } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, error: 'Amount must be positive' });
    }

    const wallet = await ensureWalletForUser(req.user);

    if (wallet.isActive === false) {
      return res.status(403).json({ success: false, error: 'Wallet is inactive' });
    }

    const maximumBalance = Number(wallet.maximumBalance || 0);
    if (maximumBalance > 0 && Number(wallet.balance || 0) + amount > maximumBalance) {
      return res.status(400).json({
        success: false,
        error: `Wallet balance cannot exceed ${maximumBalance}`,
      });
    }

    const previousBalance = wallet.balance;
    wallet.balance += amount;
    wallet.totalCredited += amount;
    wallet.lastTransactionDate = new Date();

    wallet.transactions.push({
      transactionId: buildTransactionId(),
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
    const { type } = req.query;
    const { page, limit, skip } = parsePagination(req.query?.page, req.query?.limit, 20);

    const wallet = await Wallet.findOne({ userEmail: req.user.email });

    if (!wallet) {
      return res.json({ success: true, data: [] });
    }

    let transactions = wallet.transactions;

    if (type && VALID_TRANSACTION_TYPES.has(type)) {
      transactions = transactions.filter((t) => t.type === type);
    }

    const filteredTotal = transactions.length;

    transactions = transactions
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(skip, skip + limit);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total: filteredTotal,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
