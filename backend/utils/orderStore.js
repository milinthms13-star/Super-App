const mongoose = require('mongoose');
const Order = require('../models/Order');
const devOrderStore = require('./devOrderStore');

const useMongoOrders = () => mongoose.connection.readyState === 1;

const normalizeOrderRecord = (record) => {
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

const createOrder = async (order) => {
  if (!useMongoOrders()) {
    return devOrderStore.createOrder(order);
  }

  const createdOrder = await Order.create(order);
  return normalizeOrderRecord(createdOrder);
};

const listOrders = async () => {
  if (!useMongoOrders()) {
    return devOrderStore.listOrders();
  }

  const orders = await Order.find().sort({ createdAt: -1 });
  return orders.map(normalizeOrderRecord);
};

const listOrdersByEmail = async (email) => {
  if (!useMongoOrders()) {
    return devOrderStore.listOrdersByEmail(email);
  }

  const orders = await Order.find({
    customerEmail: String(email || '').trim().toLowerCase(),
  }).sort({ createdAt: -1 });
  return orders.map(normalizeOrderRecord);
};

const findOrderById = async (orderId) => {
  if (!useMongoOrders()) {
    return devOrderStore.findOrderById(orderId);
  }

  const order = await Order.findById(orderId);
  return normalizeOrderRecord(order);
};

const listOrdersForSeller = async ({ email = '', businessName = '' } = {}) => {
  if (!useMongoOrders()) {
    return devOrderStore.listOrdersForSeller({ email, businessName });
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedBusinessName = String(businessName || '').trim().toLowerCase();
  const orders = await Order.find().sort({ createdAt: -1 });

  return orders
    .map(normalizeOrderRecord)
    .filter((order) => {
      const fulfillments = Array.isArray(order.sellerFulfillments) ? order.sellerFulfillments : [];

      return fulfillments.some((fulfillment) => {
        const fulfillmentEmail = String(fulfillment.sellerEmail || '').trim().toLowerCase();
        const fulfillmentBusinessName = String(fulfillment.businessName || '').trim().toLowerCase();

        if (normalizedEmail && fulfillmentEmail && fulfillmentEmail === normalizedEmail) {
          return true;
        }

        if (
          normalizedBusinessName &&
          fulfillmentBusinessName &&
          fulfillmentBusinessName === normalizedBusinessName
        ) {
          return true;
        }

        return false;
      });
    });
};

const updateOrder = async (orderId, updates) => {
  if (!useMongoOrders()) {
    return devOrderStore.updateOrder(orderId, updates);
  }

  const updatedOrder = await Order.findByIdAndUpdate(
    orderId,
    {
      ...updates,
      updatedAt: new Date(),
    },
    {
      new: true,
      runValidators: true,
    }
  );

  return normalizeOrderRecord(updatedOrder);
};

module.exports = {
  createOrder,
  listOrders,
  listOrdersByEmail,
  findOrderById,
  listOrdersForSeller,
  updateOrder,
  normalizeOrderRecord,
  useMongoOrders,
};
