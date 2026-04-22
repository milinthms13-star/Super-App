const mongoose = require('mongoose');
const Shop = require('../models/Shop');
const LocalMarketProduct = require('../models/LocalMarketProduct');
const LocalMarketOrder = require('../models/LocalMarketOrder');
const devLocalMarketStore = require('./devLocalMarketStore');

const useMongoLocalMarket = () => mongoose.connection.readyState === 1;

const serializeRecord = (record) => {
  if (!record) {
    return null;
  }

  const plainRecord =
    typeof record.toObject === 'function' ? record.toObject() : JSON.parse(JSON.stringify(record));

  if (plainRecord._id && !plainRecord.id) {
    plainRecord.id = String(plainRecord._id);
  }

  return plainRecord;
};

const buildShopQuery = ({ type = '', search = '' } = {}) => {
  const query = {};

  if (type) {
    query.type = type;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { type: { $regex: search, $options: 'i' } },
    ];
  }

  return query;
};

const sortShops = (shops = [], sort = '') => {
  const nextShops = [...shops];

  if (sort === 'rating') {
    nextShops.sort((left, right) => Number(right.rating || 0) - Number(left.rating || 0));
  } else if (sort === 'delivery') {
    nextShops.sort((left, right) => {
      const leftTime = Number.parseInt(left.deliveryTime, 10) || 30;
      const rightTime = Number.parseInt(right.deliveryTime, 10) || 30;
      return leftTime - rightTime;
    });
  }

  return nextShops;
};

const listShops = async ({ type = '', search = '', sort = '' } = {}) => {
  if (!useMongoLocalMarket()) {
    return devLocalMarketStore.listShops({ type, search, sort });
  }

  const shops = await Shop.find(buildShopQuery({ type, search })).populate('products');
  return sortShops(shops.map((shop) => serializeRecord(shop)), sort);
};

const findShopById = async (shopId, { includeProducts = false } = {}) => {
  if (!useMongoLocalMarket()) {
    return devLocalMarketStore.findShopById(shopId, { includeProducts });
  }

  const query = Shop.findById(shopId);
  if (includeProducts) {
    query.populate('products');
  }

  const shop = await query;
  return serializeRecord(shop);
};

const createShop = async (payload) => {
  if (!useMongoLocalMarket()) {
    return devLocalMarketStore.createShop(payload);
  }

  const shop = new Shop(payload);
  await shop.save();
  return serializeRecord(shop);
};

const updateShop = async (shopId, updates = {}) => {
  if (!useMongoLocalMarket()) {
    return devLocalMarketStore.updateShop(shopId, updates);
  }

  const shop = await Shop.findByIdAndUpdate(
    shopId,
    {
      ...updates,
      updatedAt: new Date(),
    },
    {
      new: true,
      runValidators: true,
    }
  );

  return serializeRecord(shop);
};

const listProducts = async ({ shopId = '', category = '' } = {}) => {
  if (!useMongoLocalMarket()) {
    return devLocalMarketStore.listProducts({ shopId, category });
  }

  const query = {
    shopId,
  };

  if (category) {
    query.category = category;
  }

  const products = await LocalMarketProduct.find(query);
  return products.map((product) => serializeRecord(product));
};

const findProductById = async (productId) => {
  if (!useMongoLocalMarket()) {
    return devLocalMarketStore.findProductById(productId);
  }

  const product = await LocalMarketProduct.findById(productId);
  return serializeRecord(product);
};

const createProduct = async (payload) => {
  if (!useMongoLocalMarket()) {
    return devLocalMarketStore.createProduct(payload);
  }

  const product = new LocalMarketProduct(payload);
  await product.save();

  const shop = await Shop.findById(payload.shopId);
  if (shop) {
    shop.products.push(product._id);
    await shop.save();
  }

  return serializeRecord(product);
};

const updateProduct = async (productId, updates = {}) => {
  if (!useMongoLocalMarket()) {
    return devLocalMarketStore.updateProduct(productId, updates);
  }

  const product = await LocalMarketProduct.findByIdAndUpdate(
    productId,
    {
      ...updates,
      updatedAt: new Date(),
    },
    {
      new: true,
      runValidators: true,
    }
  );

  return serializeRecord(product);
};

const deleteProduct = async (productId) => {
  if (!useMongoLocalMarket()) {
    return devLocalMarketStore.deleteProduct(productId);
  }

  const product = await LocalMarketProduct.findById(productId);
  if (!product) {
    return null;
  }

  await LocalMarketProduct.deleteOne({ _id: productId });
  await Shop.findByIdAndUpdate(product.shopId, {
    $pull: { products: product._id },
    updatedAt: new Date(),
  });

  return serializeRecord(product);
};

const createOrder = async (payload) => {
  if (!useMongoLocalMarket()) {
    return devLocalMarketStore.createOrder(payload);
  }

  const order = new LocalMarketOrder(payload);
  await order.save();
  return serializeRecord(order);
};

const listOrdersByUser = async (userId) => {
  if (!useMongoLocalMarket()) {
    return devLocalMarketStore.listOrdersByUser(userId, { populateShop: true });
  }

  const orders = await LocalMarketOrder.find({ userId }).populate('shopId').sort({ createdAt: -1 });
  return orders.map((order) => serializeRecord(order));
};

const listOrdersByShop = async (shopId) => {
  if (!useMongoLocalMarket()) {
    return devLocalMarketStore.listOrdersByShop(shopId);
  }

  const orders = await LocalMarketOrder.find({ shopId }).sort({ createdAt: -1 });
  return orders.map((order) => serializeRecord(order));
};

const findOrderById = async (orderId) => {
  if (!useMongoLocalMarket()) {
    return devLocalMarketStore.findOrderById(orderId);
  }

  const order = await LocalMarketOrder.findById(orderId);
  return serializeRecord(order);
};

const updateOrder = async (orderId, updates = {}) => {
  if (!useMongoLocalMarket()) {
    return devLocalMarketStore.updateOrder(orderId, updates);
  }

  const order = await LocalMarketOrder.findByIdAndUpdate(
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

  return serializeRecord(order);
};

module.exports = {
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
  serializeRecord,
  updateOrder,
  updateProduct,
  updateShop,
  useMongoLocalMarket,
};
