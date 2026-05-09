/**
 * DataExportImportService.js
 * CSV/Excel export, bulk import, data migration
 */

const logger = require('../config/logger');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const ExportJob = require('../models/ExportJob');
const ImportJob = require('../models/ImportJob');
const csv = require('csv-parser'); // CSV parsing
const { Parser } = require('json2csv'); // JSON to CSV

class DataExportImportService {
  /**
   * Export products to CSV
   */
  static async exportProductsToCSV(filters = {}) {
    try {
      const query = {};
      if (filters.vendorId) query.vendorId = filters.vendorId;
      if (filters.category) query.category = filters.category;

      const products = await Product.find(query).lean();

      const fields = ['_id', 'name', 'price', 'category', 'vendorId', 'stock', 'averageRating', 'reviews'];
      const parser = new Parser({ fields });
      const csv = parser.parse(products);

      const job = await ExportJob.create({
        type: 'products',
        status: 'completed',
        fileSize: Buffer.byteLength(csv),
        records: products.length,
        data: csv
      });

      logger.info(`Products exported: ${products.length} records`);
      return { success: true, job, csv };
    } catch (error) {
      logger.error(`Export products error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export orders to CSV
   */
  static async exportOrdersToCSV(userId, filters = {}) {
    try {
      let query = { $or: [{ buyerId: userId }, { vendorId: userId }] };

      if (filters.status) query.status = filters.status;
      if (filters.dateFrom) query.createdAt = { $gte: new Date(filters.dateFrom) };

      const orders = await Order.find(query).lean();

      const fields = ['_id', 'buyerId', 'vendorId', 'status', 'totalAmount', 'items', 'createdAt'];
      const parser = new Parser({ fields });
      const csv = parser.parse(orders);

      const job = await ExportJob.create({
        type: 'orders',
        userId,
        status: 'completed',
        fileSize: Buffer.byteLength(csv),
        records: orders.length,
        data: csv
      });

      logger.info(`Orders exported: ${orders.length} records`);
      return { success: true, job, csv };
    } catch (error) {
      logger.error(`Export orders error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Import products from CSV (bulk upload)
   */
  static async importProductsFromCSV(csvContent, vendorId) {
    try {
      const rows = [];
      let imported = 0;
      let errors = [];

      // Parse CSV
      csv()
        .on('data', (row) => {
          try {
            const product = {
              name: row.name,
              description: row.description || '',
              price: parseFloat(row.price),
              category: row.category,
              vendorId,
              stock: parseInt(row.stock) || 0,
              images: (row.images || '').split(';').filter(Boolean),
              tags: (row.tags || '').split(',').map(t => t.trim())
            };
            rows.push(product);
            imported++;
          } catch (e) {
            errors.push({ row: imported, error: e.message });
          }
        })
        .on('end', async () => {
          // Bulk insert
          await Product.insertMany(rows);
        });

      const job = await ImportJob.create({
        type: 'products',
        userId: vendorId,
        status: 'completed',
        totalRecords: imported,
        successCount: imported - errors.length,
        errorCount: errors.length,
        errors
      });

      logger.info(`Products imported: ${imported} records`);
      return { success: true, job, imported, errors };
    } catch (error) {
      logger.error(`Import products error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Import orders from CSV
   */
  static async importOrdersFromCSV(csvContent, userId) {
    try {
      const rows = [];
      let imported = 0;

      csv()
        .on('data', (row) => {
          const order = {
            buyerId: row.buyerId,
            vendorId: row.vendorId,
            products: JSON.parse(row.products || '[]'),
            totalAmount: parseFloat(row.totalAmount),
            status: row.status || 'pending'
          };
          rows.push(order);
          imported++;
        })
        .on('end', async () => {
          await Order.insertMany(rows);
        });

      const job = await ImportJob.create({
        type: 'orders',
        userId,
        status: 'completed',
        totalRecords: imported,
        successCount: imported
      });

      logger.info(`Orders imported: ${imported} records`);
      return { success: true, job, imported };
    } catch (error) {
      logger.error(`Import orders error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export user data (GDPR compliance)
   */
  static async exportUserData(userId) {
    try {
      const user = await User.findById(userId).lean();
      const orders = await Order.find({ $or: [{ buyerId: userId }, { vendorId: userId }] }).lean();
      const products = await Product.find({ vendorId: userId }).lean();

      const userData = {
        profile: user,
        orders,
        products,
        exportedAt: new Date()
      };

      const job = await ExportJob.create({
        type: 'user-data',
        userId,
        status: 'completed',
        fileSize: Buffer.byteLength(JSON.stringify(userData)),
        data: JSON.stringify(userData, null, 2)
      });

      logger.info(`User data exported for ${userId}`);
      return { success: true, job, userData };
    } catch (error) {
      logger.error(`Export user data error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Schedule export job
   */
  static async scheduleExport(type, userId, schedule = '0 0 * * 0') { // Weekly
    try {
      const job = await ExportJob.create({
        type,
        userId,
        status: 'scheduled',
        schedule,
        nextRun: new Date()
      });

      logger.info(`Export job scheduled: ${job._id}`);
      return { success: true, job };
    } catch (error) {
      logger.error(`Schedule export error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get export/import history
   */
  static async getDataHistory(userId, type = null) {
    try {
      let query = { userId };
      if (type) query.type = type;

      const [exports, imports] = await Promise.all([
        ExportJob.find(query).sort({ createdAt: -1 }).limit(50),
        ImportJob.find(query).sort({ createdAt: -1 }).limit(50)
      ]);

      return {
        success: true,
        exports,
        imports,
        total: exports.length + imports.length
      };
    } catch (error) {
      logger.error(`Get history error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Data migration (between systems)
   */
  static async migrateData(sourceData, targetModel) {
    try {
      const transformed = sourceData.map(item => ({
        ...item,
        migratedAt: new Date(),
        migrationSource: 'legacy-system'
      }));

      const result = await targetModel.insertMany(transformed);

      logger.info(`Data migrated: ${result.length} records`);
      return { success: true, migratedCount: result.length };
    } catch (error) {
      logger.error(`Migration error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate import data before ingestion
   */
  static async validateImportData(csvContent, type) {
    try {
      const errors = [];
      let rowCount = 0;

      csv()
        .on('data', (row) => {
          rowCount++;
          
          if (type === 'products') {
            if (!row.name) errors.push({ row: rowCount, field: 'name', error: 'Required' });
            if (!row.price || isNaN(row.price)) errors.push({ row: rowCount, field: 'price', error: 'Invalid number' });
          } else if (type === 'orders') {
            if (!row.buyerId) errors.push({ row: rowCount, field: 'buyerId', error: 'Required' });
            if (!row.totalAmount) errors.push({ row: rowCount, field: 'totalAmount', error: 'Required' });
          }
        })
        .on('end', () => {
          logger.info(`Import validation complete: ${rowCount} rows, ${errors.length} errors`);
        });

      return {
        success: errors.length === 0,
        rowCount,
        errors,
        message: errors.length === 0 ? 'Valid' : `${errors.length} validation errors`
      };
    } catch (error) {
      logger.error(`Validate import error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = DataExportImportService;
