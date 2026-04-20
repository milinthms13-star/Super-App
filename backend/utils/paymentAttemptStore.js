const mongoose = require('mongoose');
const PaymentAttempt = require('../models/PaymentAttempt');
const devPaymentAttemptStore = require('./devPaymentAttemptStore');

const useMongoPaymentAttempts = () => mongoose.connection.readyState === 1;

const normalizeAttemptRecord = (record) => {
  if (!record) {
    return null;
  }

  const plainRecord =
    typeof record.toObject === 'function' ? record.toObject() : { ...record };

  if (plainRecord._id && !plainRecord.id) {
    plainRecord.id = String(plainRecord._id);
  }

  return plainRecord;
};

const createAttempt = async (attempt) => {
  if (!useMongoPaymentAttempts()) {
    return devPaymentAttemptStore.createAttempt(attempt);
  }

  const createdAttempt = await PaymentAttempt.create(attempt);
  return normalizeAttemptRecord(createdAttempt);
};

const findAttemptById = async (attemptId) => {
  if (!useMongoPaymentAttempts()) {
    return devPaymentAttemptStore.findAttemptById(attemptId);
  }

  const attempt = await PaymentAttempt.findById(attemptId);
  return normalizeAttemptRecord(attempt);
};

const updateAttempt = async (attemptId, updater) => {
  if (!useMongoPaymentAttempts()) {
    return devPaymentAttemptStore.updateAttempt(attemptId, updater);
  }

  const currentAttempt = await PaymentAttempt.findById(attemptId);
  if (!currentAttempt) {
    return null;
  }

  const nextPayload =
    typeof updater === 'function' ? updater(normalizeAttemptRecord(currentAttempt)) : updater;

  Object.assign(currentAttempt, nextPayload, {
    updatedAt: new Date(),
  });
  await currentAttempt.save();
  return normalizeAttemptRecord(currentAttempt);
};

module.exports = {
  createAttempt,
  findAttemptById,
  updateAttempt,
  normalizeAttemptRecord,
  useMongoPaymentAttempts,
};
