const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const EMPTY_STATE = {
  shops: [],
  products: [],
  orders: [],
};

const defaultDataFilePath = path.join(__dirname, '..', 'data', 'localmarket.json');

const getDataFilePath = () => process.env.LOCALMARKET_DATA_FILE || defaultDataFilePath;

const clone = (value) => JSON.parse(JSON.stringify(value));
const createId = () => crypto.randomUUID();

const ensureFile = async () => {
  const dataFilePath = getDataFilePath();
  await fs.mkdir(path.dirname(dataFilePath), { recursive: true });

  try {
    await fs.access(dataFilePath);
  } catch (error) {
    await fs.writeFile(dataFilePath, JSON.stringify(EMPTY_STATE, null, 2), 'utf8');
  }
};

const readState = async () => {
  await ensureFile();
  const raw = await fs.readFile(getDataFilePath(), 'utf8');

  try {
    const parsed = JSON.parse(raw);
    return {
      shops: Array.isArray(parsed?.shops) ? parsed.shops : [],
      products: Array.isArray(parsed?.products) ? parsed.products : [],
      orders: Array.isArray(parsed?.orders) ? parsed.orders : [],
    };
  } catch (error) {
    return clone(EMPTY_STATE);
  }
};

const writeState = async (state) => {
  await ensureFile();
  await fs.writeFile(
    getDataFilePath(),
    JSON.stringify(
      {
        shops: Array.isArray(state?.shops) ? state.shops : [],
        products: Array.isArray(state?.products) ? state.products : [],
        orders: Array.isArray(state?.orders) ? state.orders : [],
      },
      null,
      2
    ),
    'utf8'
  );
};

const normalizeCoordinates = (coordinates = {}) => ({
  latitude:
    coordinates?.latitude === undefined || coordinates?.latitude === null
      ? null
      : Number(coordinates.latitude),
  longitude:
    coordinates?.longitude === undefined || coordinates?.longitude === null
      ? null
      : Number(coordinates.longitude),
});

const normalizeLocation = (location = {}) => {
  if (typeof location === 'string') {
    return {
      street: location,
      city: '',
      state: '',
      zipCode: '',
      coordinates: normalizeCoordinates(),
    };
  }

  return {
    street: String(location?.street || '').trim(),
    city: String(location?.city || '').trim(),
    state: String(location?.state || '').trim(),
    zipCode: String(location?.zipCode || '').trim(),
    coordinates: normalizeCoordinates(location?.coordinates),
  };
};

const normalizeContact = (contact = {}) => ({
  phone: String(contact?.phone || '').trim(),
  email: String(contact?.email || '').trim().toLowerCase(),
});

const normalizeReview = (review = {}) => ({
  userId: String(review?.userId || ''),
  rating: Number(review?.rating || 0),
  comment: String(review?.comment || '').trim(),
  createdAt: review?.createdAt || new Date().toISOString(),
});

const normalizeReviews = (reviews = []) =>
  Array.isArray(reviews) ? reviews.map((review) => normalizeReview(review)) : [];

const calculateAverageRating = (reviews = [], fallback = 4.5) => {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return Number(fallback || 4.5);
  }

  const total = reviews.reduce((sum, review) => sum + Number(review?.rating || 0), 0);
  return Math.round((total / reviews.length) * 10) / 10;
};

const normalizeShop = (shop = {}, existingShop = {}) => {
  const reviews = normalizeReviews(shop?.reviews ?? existingShop?.reviews ?? []);
  const rating =
    shop?.rating !== undefined && shop?.rating !== null
      ? Number(shop.rating)
      : existingShop?.rating !== undefined && existingShop?.rating !== null
        ? Number(existingShop.rating)
        : calculateAverageRating(reviews, 4.5);

  const id = String(shop?._id || shop?.id || existingShop?._id || existingShop?.id || createId());

  return {
    _id: id,
    id,
    name: String(shop?.name ?? existingShop?.name ?? '').trim(),
    ownerId: String(shop?.ownerId ?? existingShop?.ownerId ?? ''),
    type: String(shop?.type ?? existingShop?.type ?? 'Grocery Store'),
    description: String(shop?.description ?? existingShop?.description ?? '').trim(),
    rating,
    deliveryCharge: Number(shop?.deliveryCharge ?? existingShop?.deliveryCharge ?? 40),
    minOrder: Number(shop?.minOrder ?? existingShop?.minOrder ?? 150),
    freeDeliveryAbove: Number(shop?.freeDeliveryAbove ?? existingShop?.freeDeliveryAbove ?? 500),
    location: normalizeLocation(shop?.location ?? existingShop?.location),
    contact: normalizeContact(shop?.contact ?? existingShop?.contact),
    licenseStatus: String(
      shop?.licenseStatus ?? existingShop?.licenseStatus ?? 'Verified License'
    ),
    avgDeliveryRating: Number(
      shop?.avgDeliveryRating ?? existingShop?.avgDeliveryRating ?? 4.5
    ),
    products: Array.isArray(shop?.products)
      ? shop.products.map(String)
      : Array.isArray(existingShop?.products)
        ? existingShop.products.map(String)
        : [],
    isOpen:
      shop?.isOpen !== undefined
        ? Boolean(shop.isOpen)
        : existingShop?.isOpen !== undefined
          ? Boolean(existingShop.isOpen)
          : true,
    totalReviews: Number(shop?.totalReviews ?? reviews.length),
    reviews,
    createdAt: shop?.createdAt || existingShop?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const normalizeProduct = (product = {}, existingProduct = {}) => {
  const reviews = normalizeReviews(product?.reviews ?? existingProduct?.reviews ?? []);
  const rating =
    product?.rating !== undefined && product?.rating !== null
      ? Number(product.rating)
      : existingProduct?.rating !== undefined && existingProduct?.rating !== null
        ? Number(existingProduct.rating)
        : calculateAverageRating(reviews, 4.5);
  const id = String(
    product?._id || product?.id || existingProduct?._id || existingProduct?.id || createId()
  );

  return {
    _id: id,
    id,
    shopId: String(product?.shopId ?? existingProduct?.shopId ?? ''),
    name: String(product?.name ?? existingProduct?.name ?? '').trim(),
    description: String(product?.description ?? existingProduct?.description ?? '').trim(),
    category: String(product?.category ?? existingProduct?.category ?? ''),
    price: Number(product?.price ?? existingProduct?.price ?? 0),
    mrp: Number(product?.mrp ?? existingProduct?.mrp ?? 0),
    quantity: String(product?.quantity ?? existingProduct?.quantity ?? '').trim(),
    inStock:
      product?.inStock !== undefined
        ? Boolean(product.inStock)
        : existingProduct?.inStock !== undefined
          ? Boolean(existingProduct.inStock)
          : true,
    image: String(product?.image ?? existingProduct?.image ?? '').trim(),
    rating,
    reviews,
    createdAt: product?.createdAt || existingProduct?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const normalizeOrderItem = (item = {}) => ({
  productId: String(item?.productId || ''),
  productName: String(item?.productName || '').trim(),
  price: Number(item?.price || 0),
  quantity: Number(item?.quantity || 0),
  category: String(item?.category || '').trim(),
});

const normalizeOrderReview = (review) => {
  if (!review) {
    return null;
  }

  return {
    rating: Number(review?.rating || 0),
    comment: String(review?.comment || '').trim(),
    createdAt: review?.createdAt || new Date().toISOString(),
  };
};

const normalizeOrder = (order = {}, existingOrder = {}) => {
  const subtotal = Number(order?.subtotal ?? existingOrder?.subtotal ?? 0);
  const discount = Number(order?.discount ?? existingOrder?.discount ?? 0);
  const deliveryCharge = Number(order?.deliveryCharge ?? existingOrder?.deliveryCharge ?? 0);
  const id = String(
    order?._id || order?.id || existingOrder?._id || existingOrder?.id || createId()
  );

  return {
    _id: id,
    id,
    orderId: String(order?.orderId || existingOrder?.orderId || `LM-${Date.now()}`),
    userId: String(order?.userId ?? existingOrder?.userId ?? ''),
    shopId: String(order?.shopId ?? existingOrder?.shopId ?? ''),
    items: Array.isArray(order?.items)
      ? order.items.map((item) => normalizeOrderItem(item))
      : Array.isArray(existingOrder?.items)
        ? existingOrder.items.map((item) => normalizeOrderItem(item))
        : [],
    subtotal,
    discount,
    deliveryCharge,
    total: Number(order?.total ?? existingOrder?.total ?? subtotal - discount + deliveryCharge),
    status: String(order?.status ?? existingOrder?.status ?? 'Order Confirmed'),
    paymentMethod: String(order?.paymentMethod ?? existingOrder?.paymentMethod ?? 'UPI'),
    paymentStatus: String(order?.paymentStatus ?? existingOrder?.paymentStatus ?? 'Pending'),
    deliveryType: String(order?.deliveryType ?? existingOrder?.deliveryType ?? 'Home Delivery'),
    deliveryAddress: normalizeLocation(order?.deliveryAddress ?? existingOrder?.deliveryAddress),
    promoCode: String(order?.promoCode ?? existingOrder?.promoCode ?? '').trim(),
    specialInstructions: String(
      order?.specialInstructions ?? existingOrder?.specialInstructions ?? ''
    ).trim(),
    estimatedDelivery: String(
      order?.estimatedDelivery ?? existingOrder?.estimatedDelivery ?? ''
    ).trim(),
    deliveredAt: order?.deliveredAt ?? existingOrder?.deliveredAt ?? null,
    review: normalizeOrderReview(order?.review ?? existingOrder?.review),
    createdAt: order?.createdAt || existingOrder?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const populateShopProducts = (shop, products) => ({
  ...clone(shop),
  products: products
    .filter((product) => String(product.shopId) === String(shop._id))
    .map((product) => clone(product)),
});

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
  const state = await readState();
  const normalizedSearch = String(search || '').trim().toLowerCase();
  const filteredShops = state.shops.filter((shop) => {
    if (type && shop.type !== type) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return (
      shop.name.toLowerCase().includes(normalizedSearch) ||
      shop.type.toLowerCase().includes(normalizedSearch)
    );
  });

  const populatedShops = filteredShops.map((shop) => populateShopProducts(shop, state.products));
  return sortShops(populatedShops, sort);
};

const findShopById = async (shopId, { includeProducts = false } = {}) => {
  const state = await readState();
  const shop = state.shops.find((entry) => String(entry._id) === String(shopId));

  if (!shop) {
    return null;
  }

  return includeProducts ? populateShopProducts(shop, state.products) : clone(shop);
};

const createShop = async (payload) => {
  const state = await readState();
  const shop = normalizeShop(payload);
  state.shops.unshift(shop);
  await writeState(state);
  return clone(shop);
};

const updateShop = async (shopId, updates = {}) => {
  const state = await readState();
  const index = state.shops.findIndex((entry) => String(entry._id) === String(shopId));

  if (index === -1) {
    return null;
  }

  state.shops[index] = normalizeShop(
    {
      ...state.shops[index],
      ...updates,
    },
    state.shops[index]
  );

  await writeState(state);
  return clone(state.shops[index]);
};

const listProducts = async ({ shopId = '', category = '' } = {}) => {
  const state = await readState();
  return state.products
    .filter(
      (product) =>
        String(product.shopId) === String(shopId) && (!category || product.category === category)
    )
    .map((product) => clone(product));
};

const findProductById = async (productId) => {
  const state = await readState();
  const product = state.products.find((entry) => String(entry._id) === String(productId));
  return product ? clone(product) : null;
};

const createProduct = async (payload) => {
  const state = await readState();
  const product = normalizeProduct(payload);
  const shopIndex = state.shops.findIndex((entry) => String(entry._id) === String(product.shopId));

  if (shopIndex === -1) {
    return null;
  }

  state.products.unshift(product);
  state.shops[shopIndex] = normalizeShop(
    {
      ...state.shops[shopIndex],
      products: [...new Set([...(state.shops[shopIndex].products || []), product._id])],
    },
    state.shops[shopIndex]
  );

  await writeState(state);
  return clone(product);
};

const updateProduct = async (productId, updates = {}) => {
  const state = await readState();
  const index = state.products.findIndex((entry) => String(entry._id) === String(productId));

  if (index === -1) {
    return null;
  }

  state.products[index] = normalizeProduct(
    {
      ...state.products[index],
      ...updates,
    },
    state.products[index]
  );

  await writeState(state);
  return clone(state.products[index]);
};

const deleteProduct = async (productId) => {
  const state = await readState();
  const index = state.products.findIndex((entry) => String(entry._id) === String(productId));

  if (index === -1) {
    return null;
  }

  const [removedProduct] = state.products.splice(index, 1);
  const shopIndex = state.shops.findIndex(
    (entry) => String(entry._id) === String(removedProduct.shopId)
  );

  if (shopIndex !== -1) {
    state.shops[shopIndex] = normalizeShop(
      {
        ...state.shops[shopIndex],
        products: (state.shops[shopIndex].products || []).filter(
          (entry) => String(entry) !== String(productId)
        ),
      },
      state.shops[shopIndex]
    );
  }

  await writeState(state);
  return clone(removedProduct);
};

const createOrder = async (payload) => {
  const state = await readState();
  const order = normalizeOrder(payload);
  state.orders.unshift(order);
  await writeState(state);
  return clone(order);
};

const listOrdersByUser = async (userId, { populateShop = false } = {}) => {
  const state = await readState();
  return state.orders
    .filter((order) => String(order.userId) === String(userId))
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .map((order) => {
      const nextOrder = clone(order);
      if (populateShop) {
        nextOrder.shopId =
          state.shops.find((shop) => String(shop._id) === String(order.shopId)) || order.shopId;
      }
      return nextOrder;
    });
};

const listOrdersByShop = async (shopId) => {
  const state = await readState();
  return state.orders
    .filter((order) => String(order.shopId) === String(shopId))
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .map((order) => clone(order));
};

const findOrderById = async (orderId) => {
  const state = await readState();
  const order = state.orders.find((entry) => String(entry._id) === String(orderId));
  return order ? clone(order) : null;
};

const updateOrder = async (orderId, updates = {}) => {
  const state = await readState();
  const index = state.orders.findIndex((entry) => String(entry._id) === String(orderId));

  if (index === -1) {
    return null;
  }

  state.orders[index] = normalizeOrder(
    {
      ...state.orders[index],
      ...updates,
    },
    state.orders[index]
  );

  await writeState(state);
  return clone(state.orders[index]);
};

const resetStore = async () => {
  await writeState(EMPTY_STATE);
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
  resetStore,
  updateOrder,
  updateProduct,
  updateShop,
};
