const crypto = require('crypto');
const FlashSale = require('../models/FlashSale');
const logger = require('./logger');

const ACTIVE_STATUSES = new Set(['active', 'draft']);

const toObjectIdString = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value._id) {
    return toObjectIdString(value._id);
  }

  return String(value);
};

const isSaleLive = (sale, now = new Date()) => {
  if (!sale || !ACTIVE_STATUSES.has(String(sale.status || '').toLowerCase())) {
    return false;
  }

  const startTime = sale.startTime ? new Date(sale.startTime) : null;
  const endTime = sale.endTime ? new Date(sale.endTime) : null;

  if (startTime && !Number.isNaN(startTime.getTime()) && now < startTime) {
    return false;
  }

  if (endTime && !Number.isNaN(endTime.getTime()) && now > endTime) {
    return false;
  }

  return true;
};

const getReservationWindowMinutes = (sale = {}) =>
  Math.max(1, Number(sale.reservationWindowMinutes || 15));

const getNotifyBeforeMinutes = (sale = {}) =>
  Math.max(0, Number(sale.notifyBeforeMinutes || 10));

const findSaleProductIndex = (sale, productId) =>
  (sale?.products || []).findIndex(
    (entry) => toObjectIdString(entry?.productId) === toObjectIdString(productId)
  );

const getOrCreateUserUsage = (sale, userId) => {
  if (!Array.isArray(sale.userUses)) {
    sale.userUses = [];
  }

  let userUsage = sale.userUses.find((entry) => String(entry.userId || '') === String(userId || ''));
  if (!userUsage) {
    userUsage = {
      userId: String(userId || ''),
      uses: 0,
      reserved: 0,
      usedAt: null,
      reservedAt: null,
    };
    sale.userUses.push(userUsage);
  }

  return userUsage;
};

const recalculateReservedStock = (sale) => {
  const activeReservations = Array.isArray(sale.reservations)
    ? sale.reservations.filter((reservation) => reservation.status === 'active')
    : [];

  sale.products = (sale.products || []).map((entry) => {
    const plainEntry = typeof entry?.toObject === 'function' ? entry.toObject() : entry;
    const reservedStock = activeReservations.reduce((sum, reservation) => (
      toObjectIdString(reservation.productId) === toObjectIdString(entry.productId)
        ? sum + Number(reservation.quantity || 0)
        : sum
    ), 0);

    return {
      ...plainEntry,
      reservedStock,
    };
  });
};

const cleanupExpiredReservations = (sale, now = new Date()) => {
  let changed = false;
  if (!Array.isArray(sale.reservations) || sale.reservations.length === 0) {
    return changed;
  }

  sale.reservations = sale.reservations.map((reservation) => {
    const plainReservation =
      typeof reservation?.toObject === 'function' ? reservation.toObject() : reservation;
    if (reservation.status !== 'active') {
      return reservation;
    }

    const expiresAt = reservation.expiresAt ? new Date(reservation.expiresAt) : null;
    if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt <= now) {
      changed = true;
      const userUsage = getOrCreateUserUsage(sale, reservation.userId);
      userUsage.reserved = Math.max(
        0,
        Number(userUsage.reserved || 0) - Number(reservation.quantity || 0)
      );
      return {
        ...plainReservation,
        status: 'expired',
      };
    }

    return reservation;
  });

  if (changed) {
    recalculateReservedStock(sale);
  }

  return changed;
};

const getActiveReservation = (sale, { reservationId = '', userId = '', productId = '' } = {}) =>
  (sale?.reservations || []).find((reservation) => {
    if (reservation.status !== 'active') {
      return false;
    }

    if (reservationId && reservation.reservationId !== reservationId) {
      return false;
    }

    if (userId && String(reservation.userId || '') !== String(userId || '')) {
      return false;
    }

    if (productId && toObjectIdString(reservation.productId) !== toObjectIdString(productId)) {
      return false;
    }

    return true;
  }) || null;

const buildFlashSaleState = (sale, productEntry, { userId = '', reservation = null, now = new Date() } = {}) => {
  if (!sale || !productEntry) {
    return null;
  }

  const userUsage = userId ? getOrCreateUserUsage(sale, userId) : null;
  const stockLimit = Math.max(0, Number(productEntry.stockLimit || 0));
  const reservedStock = Math.max(0, Number(productEntry.reservedStock || 0));
  const uses = Math.max(0, Number(productEntry.uses || 0));
  const reservationWindowMinutes = getReservationWindowMinutes(sale);
  const remainingStock = Math.max(0, stockLimit - uses - reservedStock);
  const endsAt = sale.endTime ? new Date(sale.endTime) : null;

  return {
    saleId: toObjectIdString(sale._id),
    name: sale.name || 'Flash Sale',
    description: sale.description || '',
    startsAt: sale.startTime || null,
    endsAt: sale.endTime || null,
    timeRemainingMs:
      endsAt && !Number.isNaN(endsAt.getTime())
        ? Math.max(0, endsAt.getTime() - now.getTime())
        : 0,
    notifyBeforeMinutes: getNotifyBeforeMinutes(sale),
    reservationWindowMinutes,
    discountType: sale.discountType || 'percentage',
    discountValue: Number(sale.discountValue || 0),
    originalPrice: Number(productEntry.originalPrice || productEntry.salePrice || 0),
    salePrice: Number(productEntry.salePrice || 0),
    stockLimit,
    reservedStock,
    soldUnits: uses,
    remainingStock,
    maxUsesPerUser: Math.max(1, Number(sale.maxUsesPerUser || 1)),
    userRemainingUses: userUsage
      ? Math.max(0, Number(sale.maxUsesPerUser || 1) - Number(userUsage.uses || 0) - Number(userUsage.reserved || 0))
      : Math.max(1, Number(sale.maxUsesPerUser || 1)),
    reservation: reservation
      ? {
          reservationId: reservation.reservationId,
          quantity: Number(reservation.quantity || 0),
          reservedAt: reservation.reservedAt || null,
          expiresAt: reservation.expiresAt || null,
        }
      : null,
  };
};

const findLiveSaleForProduct = async (productId, { saleId = '', now = new Date() } = {}) => {
  const baseQuery = {
    status: { $in: Array.from(ACTIVE_STATUSES) },
    startTime: { $lte: now },
    endTime: { $gte: now },
    'products.productId': productId,
  };

  if (saleId) {
    baseQuery._id = saleId;
  }

  return FlashSale.findOne(baseQuery).sort({ discountValue: -1, endTime: 1 });
};

const getActiveFlashSaleForProduct = async (productId, { userId = '', saleId = '' } = {}) => {
  try {
    const now = new Date();
    const sale = await findLiveSaleForProduct(productId, { saleId, now });
    if (!sale) {
      return null;
    }

    const changed = cleanupExpiredReservations(sale, now);
    const productIndex = findSaleProductIndex(sale, productId);
    if (productIndex === -1) {
      return null;
    }

    if (changed) {
      await sale.save();
    }

    const reservation = getActiveReservation(sale, { userId, productId });
    return buildFlashSaleState(sale, sale.products[productIndex], { userId, reservation, now });
  } catch (error) {
    logger.warn(`Unable to resolve flash sale for product ${productId}: ${error.message}`);
    return null;
  }
};

const listActiveFlashSales = async ({ userId = '' } = {}) => {
  const now = new Date();
  const sales = await FlashSale.find({
    status: { $in: Array.from(ACTIVE_STATUSES) },
    startTime: { $lte: now },
    endTime: { $gte: now },
  }).populate('products.productId', 'name image imageVariants price mrp stock rating reviewCount');

  const serializedSales = [];
  for (const sale of sales) {
    const changed = cleanupExpiredReservations(sale, now);
    if (changed) {
      await sale.save();
    }

    serializedSales.push({
      id: toObjectIdString(sale._id),
      saleId: sale.saleId,
      name: sale.name,
      description: sale.description || '',
      startsAt: sale.startTime,
      endsAt: sale.endTime,
      timeRemainingMs: Math.max(0, new Date(sale.endTime).getTime() - now.getTime()),
      reservationWindowMinutes: getReservationWindowMinutes(sale),
      notifyBeforeMinutes: getNotifyBeforeMinutes(sale),
      discountType: sale.discountType || 'percentage',
      discountValue: Number(sale.discountValue || 0),
      bannerImage: sale.bannerImage || '',
      products: (sale.products || []).map((entry) => {
        const reservation = getActiveReservation(sale, {
          userId,
          productId: entry.productId,
        });

        return {
          productId: toObjectIdString(entry.productId),
          name: entry.productId?.name || 'Product',
          image: entry.productId?.image || '',
          imageVariants: entry.productId?.imageVariants || null,
          rating: Number(entry.productId?.rating || 0),
          reviews: Number(entry.productId?.reviewCount || 0),
          ...buildFlashSaleState(sale, entry, { userId, reservation, now }),
        };
      }),
    });
  }

  return serializedSales;
};

const reserveFlashSaleStock = async ({ saleId, productId, quantity = 1, userId }) => {
  const now = new Date();
  const normalizedQuantity = Math.max(1, Number(quantity || 1));
  const sale = await FlashSale.findById(saleId);

  if (!sale || !isSaleLive(sale, now)) {
    const error = new Error('Invalid or expired flash sale.');
    error.statusCode = 400;
    throw error;
  }

  cleanupExpiredReservations(sale, now);

  const productIndex = findSaleProductIndex(sale, productId);
  if (productIndex === -1) {
    const error = new Error('Flash sale product not found.');
    error.statusCode = 404;
    throw error;
  }

  const productEntry = sale.products[productIndex];
  const userUsage = getOrCreateUserUsage(sale, userId);
  const reservationWindowMinutes = getReservationWindowMinutes(sale);
  const existingReservation = getActiveReservation(sale, { userId, productId });
  const previousQuantity = Number(existingReservation?.quantity || 0);
  const delta = normalizedQuantity - previousQuantity;

  if (delta > 0) {
    const nextReservedForUser =
      Number(userUsage.uses || 0) + Number(userUsage.reserved || 0) + delta;
    if (nextReservedForUser > Number(sale.maxUsesPerUser || 1)) {
      const error = new Error(`Max ${sale.maxUsesPerUser} use(s) per shopper exceeded.`);
      error.statusCode = 400;
      throw error;
    }

    const nextReservedForProduct =
      Number(productEntry.uses || 0) + Number(productEntry.reservedStock || 0) + delta;
    if (nextReservedForProduct > Number(productEntry.stockLimit || 0)) {
      const error = new Error('Flash sale stock sold out.');
      error.statusCode = 409;
      throw error;
    }
  }

  const expiresAt = new Date(now.getTime() + reservationWindowMinutes * 60 * 1000);
  if (existingReservation) {
    existingReservation.quantity = normalizedQuantity;
    existingReservation.reservedAt = now;
    existingReservation.expiresAt = expiresAt;
  } else {
    sale.reservations.push({
      reservationId: crypto.randomUUID(),
      userId: String(userId || ''),
      productId,
      quantity: normalizedQuantity,
      reservedAt: now,
      expiresAt,
      status: 'active',
    });
  }

  userUsage.reserved = Math.max(0, Number(userUsage.reserved || 0) + delta);
  userUsage.reservedAt = now;
  productEntry.reservedStock = Math.max(0, Number(productEntry.reservedStock || 0) + delta);

  await sale.save();

  const reservation = getActiveReservation(sale, { userId, productId });
  return buildFlashSaleState(sale, productEntry, { userId, reservation, now });
};

const reserveFlashSaleItems = async ({ items = [], userId = '' }) => {
  const reservations = [];
  for (const item of items) {
    const saleId = String(item.flashSaleId || '').trim();
    if (!saleId) {
      continue;
    }

    reservations.push(
      await reserveFlashSaleStock({
        saleId,
        productId: item.productId || item.id,
        quantity: item.quantity || 1,
        userId,
      })
    );
  }

  return reservations;
};

const consumeFlashSaleReservation = async ({
  saleId,
  productId,
  quantity = 1,
  userId = '',
  reservationId = '',
}) => {
  const now = new Date();
  const normalizedQuantity = Math.max(1, Number(quantity || 1));
  const sale = await FlashSale.findById(saleId);

  if (!sale) {
    return null;
  }

  cleanupExpiredReservations(sale, now);
  const productIndex = findSaleProductIndex(sale, productId);
  if (productIndex === -1) {
    return null;
  }

  const productEntry = sale.products[productIndex];
  const userUsage = getOrCreateUserUsage(sale, userId);
  const reservation = getActiveReservation(sale, { reservationId, userId, productId });

  if (reservation) {
    const reservedQuantity = Number(reservation.quantity || 0);
    if (reservedQuantity < normalizedQuantity) {
      const error = new Error('Flash sale reservation does not cover this quantity.');
      error.statusCode = 409;
      throw error;
    }

    reservation.status = 'consumed';
    productEntry.reservedStock = Math.max(0, Number(productEntry.reservedStock || 0) - reservedQuantity);
    userUsage.reserved = Math.max(0, Number(userUsage.reserved || 0) - reservedQuantity);
  } else {
    if (!isSaleLive(sale, now)) {
      return null;
    }

    const projectedUsage = Number(userUsage.uses || 0) + normalizedQuantity;
    if (projectedUsage > Number(sale.maxUsesPerUser || 1)) {
      const error = new Error(`Max ${sale.maxUsesPerUser} use(s) per shopper exceeded.`);
      error.statusCode = 400;
      throw error;
    }

    const projectedTotal = Number(productEntry.uses || 0) + normalizedQuantity;
    if (projectedTotal > Number(productEntry.stockLimit || 0)) {
      const error = new Error('Flash sale stock sold out.');
      error.statusCode = 409;
      throw error;
    }
  }

  productEntry.uses = Number(productEntry.uses || 0) + normalizedQuantity;
  userUsage.uses = Number(userUsage.uses || 0) + normalizedQuantity;
  userUsage.usedAt = now;

  recalculateReservedStock(sale);
  await sale.save();
  return buildFlashSaleState(sale, productEntry, { userId, now });
};

module.exports = {
  buildFlashSaleState,
  cleanupExpiredReservations,
  consumeFlashSaleReservation,
  getActiveFlashSaleForProduct,
  isSaleLive,
  listActiveFlashSales,
  reserveFlashSaleItems,
  reserveFlashSaleStock,
};
