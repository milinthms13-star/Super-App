const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(__dirname, '..', 'data');
const dataFilePath = path.join(dataDir, 'orders.json');

const ensureFile = async () => {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dataFilePath);
  } catch (error) {
    await fs.writeFile(dataFilePath, '[]', 'utf8');
  }
};

const readOrders = async () => {
  await ensureFile();
  const raw = await fs.readFile(dataFilePath, 'utf8');

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const writeOrders = async (orders) => {
  await ensureFile();
  await fs.writeFile(dataFilePath, JSON.stringify(orders, null, 2), 'utf8');
};

const createOrder = async (order) => {
  const orders = await readOrders();
  const nextOrder = {
    id: crypto.randomUUID(),
    ...order,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  orders.unshift(nextOrder);
  await writeOrders(orders);
  return nextOrder;
};

const listOrders = async () => {
  return readOrders();
};

const listOrdersByEmail = async (email) => {
  const orders = await readOrders();
  return orders.filter((order) => order.customerEmail === email);
};

const findOrderById = async (orderId) => {
  const orders = await readOrders();
  return orders.find((order) => order.id === orderId) || null;
};

const listOrdersForSeller = async ({ email = '', businessName = '' } = {}) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedBusinessName = String(businessName || '').trim().toLowerCase();
  const orders = await readOrders();

  return orders.filter((order) => {
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
  const orders = await readOrders();
  const index = orders.findIndex((order) => order.id === orderId);

  if (index === -1) {
    return null;
  }

  const nextOrder = {
    ...orders[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  orders[index] = nextOrder;
  await writeOrders(orders);
  return nextOrder;
};

module.exports = {
  listOrders,
  createOrder,
  listOrdersByEmail,
  findOrderById,
  listOrdersForSeller,
  updateOrder,
};
