const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const messageBatcher = require('../services/messageBatcher');
const deltaSync = require('../services/deltaSync');
const compressionUtil = require('../services/compressionUtil');
const logger = require('../config/logger');

/**
 * Optimization Routes - Phase 2 Feature 4
 * REST endpoints for real-time optimization features
 */

// Middleware: Verify admin role
const verifyAdmin = async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization error' });
  }
};

// ============ MESSAGE BATCHING ENDPOINTS ============

/**
 * GET /batching/stats - Get batching statistics
 */
router.get('/batching/stats', auth, verifyAdmin, (req, res) => {
  try {
    const stats = messageBatcher.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching batching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /batching/sizes - Get current batch sizes for all users
 */
router.get('/batching/sizes', auth, verifyAdmin, (req, res) => {
  try {
    const sizes = messageBatcher.getAllBatchSizes();
    res.json({ batches: sizes, count: Object.keys(sizes).length });
  } catch (error) {
    logger.error('Error fetching batch sizes:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /batching/flush - Force flush all batches
 */
router.post('/batching/flush', auth, verifyAdmin, (req, res) => {
  try {
    const results = messageBatcher.flushAll();
    res.json({
      message: 'All batches flushed',
      count: results.length,
      batches: results
    });
  } catch (error) {
    logger.error('Error flushing batches:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /batching/reset - Reset batching statistics
 */
router.post('/batching/reset', auth, verifyAdmin, (req, res) => {
  try {
    messageBatcher.resetStats();
    res.json({ message: 'Batching statistics reset' });
  } catch (error) {
    logger.error('Error resetting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ DELTA SYNC ENDPOINTS ============

/**
 * GET /delta-sync/stats - Get delta sync statistics
 */
router.get('/delta-sync/stats', auth, verifyAdmin, (req, res) => {
  try {
    const stats = deltaSync.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching delta stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /delta-sync/calculate - Calculate delta for given data
 * Body: { key, current, previous }
 */
router.post('/delta-sync/calculate', auth, verifyAdmin, (req, res) => {
  try {
    const { key, current, previous } = req.body;

    if (!key || !current) {
      return res.status(400).json({ error: 'Key and current data required' });
    }

    const delta = deltaSync.calculateDelta(key, current, previous);

    res.json({
      delta,
      stats: deltaSync.getStats()
    });
  } catch (error) {
    logger.error('Error calculating delta:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /delta-sync/batch-calculate - Calculate deltas for multiple updates
 * Body: { updates: [{ key, current, previous }] }
 */
router.post('/delta-sync/batch-calculate', auth, verifyAdmin, (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates array required' });
    }

    const deltas = deltaSync.calculateBatchDeltas(updates);

    res.json({
      count: deltas.length,
      deltas,
      stats: deltaSync.getStats()
    });
  } catch (error) {
    logger.error('Error calculating batch deltas:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /delta-sync/apply - Apply delta to reconstruct state
 * Body: { previous, delta }
 */
router.post('/delta-sync/apply', auth, verifyAdmin, (req, res) => {
  try {
    const { previous, delta } = req.body;

    if (!previous || !delta) {
      return res.status(400).json({ error: 'Previous state and delta required' });
    }

    const reconstructed = deltaSync.applyDelta(previous, delta);

    res.json({
      reconstructed,
      isValid: JSON.stringify(reconstructed) === JSON.stringify(delta.data)
    });
  } catch (error) {
    logger.error('Error applying delta:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /delta-sync/reset - Reset delta sync statistics
 */
router.post('/delta-sync/reset', auth, verifyAdmin, (req, res) => {
  try {
    deltaSync.resetStats();
    deltaSync.clearAllStates();
    res.json({ message: 'Delta sync statistics and states reset' });
  } catch (error) {
    logger.error('Error resetting delta sync:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ COMPRESSION ENDPOINTS ============

/**
 * GET /compression/stats - Get compression statistics
 */
router.get('/compression/stats', auth, verifyAdmin, (req, res) => {
  try {
    const stats = compressionUtil.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching compression stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /compression/compress - Compress data
 * Body: { data }
 */
router.post('/compression/compress', auth, verifyAdmin, async (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data required' });
    }

    const result = await compressionUtil.compress(data);

    res.json({
      ...result,
      stats: compressionUtil.getStats()
    });
  } catch (error) {
    logger.error('Error compressing:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /compression/decompress - Decompress data
 * Body: { compressed }
 */
router.post('/compression/decompress', auth, verifyAdmin, async (req, res) => {
  try {
    const { compressed } = req.body;

    if (!compressed) {
      return res.status(400).json({ error: 'Compressed data required' });
    }

    const decompressed = await compressionUtil.decompress(compressed);

    res.json({
      decompressed,
      stats: compressionUtil.getStats()
    });
  } catch (error) {
    logger.error('Error decompressing:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /compression/should-compress - Check if data should be compressed
 * Query: ?size=1024
 */
router.get('/compression/should-compress', auth, verifyAdmin, (req, res) => {
  try {
    const { size } = req.query;

    if (!size) {
      return res.status(400).json({ error: 'Size parameter required' });
    }

    const should = parseInt(size) > 1024;

    res.json({
      size: parseInt(size),
      shouldCompress: should,
      threshold: 1024
    });
  } catch (error) {
    logger.error('Error checking compression threshold:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /compression/reset - Reset compression statistics
 */
router.post('/compression/reset', auth, verifyAdmin, (req, res) => {
  try {
    compressionUtil.resetStats();
    res.json({ message: 'Compression statistics reset' });
  } catch (error) {
    logger.error('Error resetting compression stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ OPTIMIZATION DASHBOARD ============

/**
 * GET /stats - Get all optimization statistics
 */
router.get('/stats', auth, verifyAdmin, (req, res) => {
  try {
    const allStats = {
      batching: messageBatcher.getStats(),
      deltaSync: deltaSync.getStats(),
      compression: compressionUtil.getStats(),
      timestamp: new Date()
    };

    // Calculate overall savings
    const totalBandwidthSaved =
      (deltaSync.getStats().bandwidthSaved || 0) +
      (compressionUtil.getStats().bandwidthSaved || 0);

    res.json({
      ...allStats,
      totalBandwidthSaved
    });
  } catch (error) {
    logger.error('Error fetching optimization stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
