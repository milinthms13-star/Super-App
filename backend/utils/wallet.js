const Wallet = require('../models/Wallet');
const logger = require('./logger');
const redis = require('../config/redis');
const { ADMIN_EMAIL } = require('../config/constants');

const WALLET_BALANCE_CACHE_TTL = 300; // 5 min

async function getWalletBalance(userEmail) {
  const cacheKey = `wallet:${userEmail}`;
  let cachedBalance = await redis.get(cacheKey);
  
  if (cachedBalance !== null) {
    return parseFloat(cachedBalance);
  }

  let wallet;
  try {
    wallet = await Wallet.findOne({ userEmail }).lean();
  } catch (error) {
    logger.error('Wallet balance query failed:', error);
    return 0;
  }

  const balance = wallet?.balance || 0;
  await redis.setex(cacheKey, WALLET_BALANCE_CACHE_TTL, balance);
  return balance;
}

async function deductWalletBalance(userEmail, amount, orderId, description = 'Order payment') {
  if (amount <= 0) throw new Error('Invalid amount');

  const session = await Wallet.startSession();
  try {
    await session.withTransaction(async () => {
      const wallet = await Wallet.findOne({ userEmail }).session(session);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const currentBalance = wallet.balance;
      if (currentBalance < amount) {
        throw new Error('Insufficient balance');
      }

      const newBalance = currentBalance - amount;

      wallet.transactions.push({
        transactionId: `txn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'Debit',
        amount: -amount,
        description,
        relatedOrderId: orderId,
        previousBalance: currentBalance,
        newBalance,
        status: 'Completed'
      });

      wallet.balance = newBalance;
      wallet.totalDebited += amount;
      wallet.lastTransactionDate = new Date();
      wallet.updatedAt = new Date();

      await wallet.save({ session });
    });

    // Invalidate cache
    await redis.del(`wallet:${userEmail}`);
    return true;
  } catch (error) {
    logger.error('Wallet deduction failed:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

async function creditWallet(userEmail, amount, description = 'Credit added', relatedId = '') {
  if (amount <= 0) throw new Error('Invalid amount');

  const session = await Wallet.startSession();
  try {
    await session.withTransaction(async () => {
      let wallet = await Wallet.findOne({ userEmail }).session(session);
      if (!wallet) {
        // Auto-create wallet
        wallet = new Wallet({
          walletId: `wallet-${Date.now()}`,
          userEmail,
          balance: 0
        });
      }

      const newBalance = wallet.balance + amount;

      wallet.transactions.push({
        transactionId: `txn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'Credit',
        amount,
        description,
        relatedOrderId: relatedId,
        previousBalance: wallet.balance,
        newBalance,
        status: 'Completed'
      });

      wallet.balance = newBalance;
      wallet.totalCredited += amount;
      wallet.lastTransactionDate = new Date();
      wallet.updatedAt = new Date();

      await wallet.save({ session });
    });

    await redis.del(`wallet:${userEmail}`);
    return true;
  } catch (error) {
    logger.error('Wallet credit failed:', error);
    throw error;
  }
}

module.exports = {
  getWalletBalance,
  deductWalletBalance,
  creditWallet
};

