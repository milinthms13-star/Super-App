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

const readProducts = async () => {
  await ensureFile();
  const raw = await fs.readFile(dataFilePath, 'utf8');

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const writeProducts = async (products) => {
  await ensureFile();
  await fs.writeFile(dataFilePath, JSON.stringify(products, null, 2), 'utf8');
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
  const products = await readProducts();
  return products.find((product) => product._id === productId) || null;
};

module.exports = {
  listProducts,
  createProduct,
  updateProduct,
  findProductById,
};
