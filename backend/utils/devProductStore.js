const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(__dirname, '..', 'data');
const dataFilePath = path.join(dataDir, 'products.json');

const ensureFile = async () => {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dataFilePath);
  } catch (error) {
    await fs.writeFile(dataFilePath, '[]', 'utf8');
  }
};

const { getRedisClient } = require('../config/redis');
const logger = require('./logger');

const PRODUCT_LIST_CACHE_KEY = 'devProducts:list';
const PRODUCT_CACHE_TTL = 60; // 1min

const readProducts = async () => {
  const client = getRedisClient();
  if (client) {
    try {
      const cached = await client.get(PRODUCT_LIST_CACHE_KEY);
      if (cached) {
        logger.debug('devProductStore cache HIT');
        return JSON.parse(cached);
      }
    } catch (cacheErr) {
      logger.warn('Redis read failed:', cacheErr.message);
    }
  }

  await ensureFile();
  const raw = await fs.readFile(dataFilePath, 'utf8');
  const products = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];

  if (client) {
    try {
      await client.setEx(PRODUCT_LIST_CACHE_KEY, PRODUCT_CACHE_TTL, JSON.stringify(products));
    } catch (cacheErr) {
      logger.warn('Redis write failed:', cacheErr.message);
    }
  }

  return products;
};

const invalidateProductCache = async () => {
  const client = getRedisClient();
  if (client) {
    try {
      await client.del(PRODUCT_LIST_CACHE_KEY);
      logger.debug('Product cache invalidated');
    } catch (err) {
      logger.warn('Cache invalidate failed:', err.message);
    }
  }
};

const writeProducts = async (products) => {
  await ensureFile();
  await fs.writeFile(dataFilePath, JSON.stringify(products, null, 2), 'utf8');
  await invalidateProductCache();
};

const createId = () => crypto.randomUUID();

const normalizeProduct = (product) => ({
  ...product,
  isActive: product.isActive !== false,
  _id: product._id || createId(),
  createdAt: product.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const listProducts = async () => {
  const products = await readProducts();
  return products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const createProduct = async (product) => {
  const products = await readProducts();
  const nextProduct = normalizeProduct(product);
  products.unshift(nextProduct);
  await writeProducts(products);
  return nextProduct;
};

const updateProduct = async (productId, updates) => {
  const products = await readProducts();
  const index = products.findIndex((product) => product._id === productId);

  if (index === -1) {
    return null;
  }

  const nextProduct = {
    ...products[index],
    ...updates,
    _id: products[index]._id,
    updatedAt: new Date().toISOString(),
  };

  products[index] = nextProduct;
  await writeProducts(products);
  return nextProduct;
};

const findProductById = async (productId) => {
  const client = getRedisClient();
  const cacheKey = `devProduct:${productId}`;
  
  if (client) {
    try {
      const cached = await client.get(cacheKey);
      if (cached) {
        logger.debug(`devProduct single cache HIT: ${productId}`);
        return JSON.parse(cached);
      }
    } catch (err) {
      logger.warn('Redis single read failed:', err.message);
    }
  }

  const products = await readProducts();
  const product = products.find((p) => p._id === productId) || null;

  if (client && product) {
    try {
      await client.setEx(cacheKey, PRODUCT_CACHE_TTL, JSON.stringify(product));
    } catch (err) {
      logger.warn('Redis single write failed:', err.message);
    }
  }

  return product;
};

module.exports = {
  listProducts,
  createProduct,
  updateProduct,
  findProductById,
};
