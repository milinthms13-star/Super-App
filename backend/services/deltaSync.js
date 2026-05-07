const logger = require('../config/logger');

/**
 * Delta Sync - Phase 2 Feature 4: Real-Time Optimization
 * Efficiently syncs only changed fields instead of entire objects
 */

class DeltaSync {
  constructor() {
    this.lastStates = new Map(); // userId -> { messageId -> fullState }
    this.stats = {
      deltas: 0,
      fullUpdates: 0,
      bandwidthSaved: 0
    };
  }

  /**
   * Calculate delta (difference) between current and previous state
   */
  calculateDelta(key, currentState, previousState = null) {
    try {
      if (!previousState) {
        // First time seeing this state
        this.setLastState(key, currentState);
        return { type: 'full', data: currentState };
      }

      // Compare objects
      const delta = {};
      let hasChanges = false;

      for (const field in currentState) {
        if (currentState[field] !== previousState[field]) {
          delta[field] = currentState[field];
          hasChanges = true;
        }
      }

      if (!hasChanges) {
        return null; // No changes
      }

      // Store new state
      this.setLastState(key, currentState);

      // Calculate savings
      const fullSize = JSON.stringify(currentState).length;
      const deltaSize = JSON.stringify(delta).length;
      const savings = fullSize - deltaSize;

      if (savings > 0) {
        this.stats.bandwidthSaved += savings;
        this.stats.deltas++;
      }

      return {
        type: 'delta',
        data: delta,
        savings
      };
    } catch (error) {
      logger.error('Error calculating delta:', error);
      return { type: 'full', data: currentState };
    }
  }

  /**
   * Apply delta to previous state to reconstruct current state
   */
  applyDelta(previousState, delta) {
    try {
      if (!delta || delta.type === 'full') {
        return delta?.data || previousState;
      }

      return {
        ...previousState,
        ...delta.data
      };
    } catch (error) {
      logger.error('Error applying delta:', error);
      return previousState;
    }
  }

  /**
   * Set last known state
   */
  setLastState(key, state) {
    try {
      this.lastStates.set(key, JSON.parse(JSON.stringify(state))); // Deep copy
    } catch (error) {
      logger.error('Error setting last state:', error);
    }
  }

  /**
   * Get last known state
   */
  getLastState(key) {
    return this.lastStates.get(key);
  }

  /**
   * Batch calculate deltas for multiple messages
   */
  calculateBatchDeltas(updates) {
    try {
      const deltas = [];

      for (const update of updates) {
        const lastState = this.getLastState(update.key);
        const delta = this.calculateDelta(update.key, update.current, lastState);

        if (delta) {
          deltas.push({
            key: update.key,
            ...delta
          });
        }
      }

      return deltas;
    } catch (error) {
      logger.error('Error calculating batch deltas:', error);
      return [];
    }
  }

  /**
   * Clear state for key
   */
  clearState(key) {
    this.lastStates.delete(key);
  }

  /**
   * Clear all states
   */
  clearAllStates() {
    this.lastStates.clear();
    logger.info('All delta sync states cleared');
  }

  /**
   * Get statistics
   */
  getStats() {
    const totalUpdates = this.stats.deltas + this.stats.fullUpdates;

    return {
      totalDeltas: this.stats.deltas,
      totalFullUpdates: this.stats.fullUpdates,
      totalUpdates,
      deltaPercentage:
        totalUpdates > 0 ? ((this.stats.deltas / totalUpdates) * 100).toFixed(2) : 0,
      bandwidthSaved: this.stats.bandwidthSaved,
      averageSavingsPerDelta:
        this.stats.deltas > 0
          ? (this.stats.bandwidthSaved / this.stats.deltas).toFixed(2)
          : 0,
      trackedStates: this.lastStates.size
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      deltas: 0,
      fullUpdates: 0,
      bandwidthSaved: 0
    };
  }
}

module.exports = new DeltaSync();
