/**
 * FraudMLModel Schema
 * Manages machine learning models for fraud detection
 * Supports model versioning, performance tracking, and feature importance
 */

const mongoose = require('mongoose');

const fraudMLModelSchema = new mongoose.Schema(
  {
    modelId: {
      type: String,
      unique: true,
      required: true,
      index: true,
      description: 'Unique identifier for the ML model',
    },

    modelName: {
      type: String,
      required: true,
      description: 'Human-readable model name',
    },

    modelType: {
      type: String,
      enum: ['xgboost', 'random_forest', 'neural_network', 'ensemble', 'logistic_regression'],
      required: true,
      description: 'Type of machine learning model',
    },

    version: {
      type: String,
      required: true,
      description: 'Semantic version (e.g., 1.0.0)',
    },

    description: {
      type: String,
      description: 'Detailed description of model purpose and improvements',
    },

    status: {
      type: String,
      enum: ['training', 'active', 'inactive', 'deprecated', 'archived'],
      default: 'active',
      index: true,
      description: 'Current status of the model',
    },

    trainingMetrics: {
      accuracy: {
        type: Number,
        min: 0,
        max: 1,
        description: 'Model accuracy on test set',
      },
      precision: {
        type: Number,
        min: 0,
        max: 1,
        description: 'Precision score (true positives / total positives)',
      },
      recall: {
        type: Number,
        min: 0,
        max: 1,
        description: 'Recall score (true positives / actual positives)',
      },
      f1Score: {
        type: Number,
        min: 0,
        max: 1,
        description: 'F1 score (harmonic mean of precision and recall)',
      },
      auc: {
        type: Number,
        min: 0,
        max: 1,
        description: 'Area under ROC curve',
      },
      falsePositiveRate: {
        type: Number,
        min: 0,
        max: 1,
        description: 'Rate of false positives on test set',
      },
      falseNegativeRate: {
        type: Number,
        min: 0,
        max: 1,
        description: 'Rate of false negatives on test set',
      },
    },

    productionMetrics: {
      totalPredictions: {
        type: Number,
        default: 0,
        description: 'Number of predictions made in production',
      },
      correctPredictions: {
        type: Number,
        default: 0,
        description: 'Number of correct predictions',
      },
      actualAccuracy: {
        type: Number,
        min: 0,
        max: 1,
        description: 'Accuracy calculated from production predictions',
      },
      detectedFrauds: {
        type: Number,
        default: 0,
        description: 'Number of frauds correctly detected',
      },
      falseAlerts: {
        type: Number,
        default: 0,
        description: 'Number of false fraud alerts in production',
      },
      lastUpdatedAt: {
        type: Date,
        description: 'Last time production metrics were updated',
      },
    },

    featureImportance: {
      type: Map,
      of: Number,
      description: 'Feature importance scores (feature_name -> importance_score)',
    },

    features: {
      type: [String],
      description: 'List of input features used by the model',
    },

    trainingData: {
      datasetSize: {
        type: Number,
        description: 'Number of records used for training',
      },
      trainingDate: {
        type: Date,
        description: 'Date when model was trained',
      },
      dataDistribution: {
        fraudCases: Number,
        legitimateCases: Number,
        fraudPercentage: Number,
      },
      timeRange: {
        startDate: Date,
        endDate: Date,
      },
    },

    hyperparameters: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      description: 'Model hyperparameters (learning_rate, max_depth, etc.)',
    },

    modelPath: {
      type: String,
      description: 'Path to model file in storage',
    },

    deploymentHistory: [
      {
        deployedAt: Date,
        deployedBy: String,
        environment: String,
        notes: String,
      },
    ],

    performanceThresholds: {
      riskScoreThreshold: {
        type: Number,
        default: 0.7,
        description: 'Threshold above which transaction is flagged as risky',
      },
      confidenceThreshold: {
        type: Number,
        default: 0.85,
        description: 'Minimum confidence required for predictions',
      },
      autoBlockThreshold: {
        type: Number,
        default: 0.95,
        description: 'Risk score above which auto-block is triggered',
      },
    },

    trainingConfig: {
      algorithm: String,
      optimizationMethod: String,
      regularization: String,
      batchSize: Number,
      epochs: Number,
      validationSplit: Number,
      randomSeed: Number,
    },

    comparisonWithPrevious: {
      previousModelId: String,
      accuracyImprovement: Number,
      precisionImprovement: Number,
      recallImprovement: Number,
      performanceNotes: String,
    },

    tags: {
      type: [String],
      description: 'Tags for easy filtering (e.g., payment, refund, wallet)',
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: String,
      required: true,
      description: 'User who created the model',
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: -1,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },

    retiredAt: {
      type: Date,
      description: 'Date when model was retired',
    },
  },
  {
    timestamps: true,
    collection: 'fraudmlmodels',
    toJSON: { virtuals: true },
  }
);

// Indexes for fast queries
fraudMLModelSchema.index({ status: 1, createdAt: -1 });
fraudMLModelSchema.index({ modelType: 1, version: 1 });
fraudMLModelSchema.index({ tags: 1 });
fraudMLModelSchema.index({ active: 1, status: 1 });

// Virtual for model readiness
fraudMLModelSchema.virtual('isReady').get(function () {
  return this.status === 'active' && this.active === true;
});

// Virtual for production performance
fraudMLModelSchema.virtual('productionPerformance').get(function () {
  if (!this.productionMetrics.totalPredictions) return null;
  return {
    accuracy: this.productionMetrics.actualAccuracy,
    detectionRate: this.productionMetrics.detectedFrauds / Math.max(this.productionMetrics.totalPredictions, 1),
    falseAlertRate: this.productionMetrics.falseAlerts / Math.max(this.productionMetrics.totalPredictions, 1),
  };
});

// Method to get feature importance sorted
fraudMLModelSchema.methods.getTopFeatures = function (limit = 10) {
  if (!this.featureImportance || this.featureImportance.size === 0) {
    return [];
  }

  return Array.from(this.featureImportance.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([feature, importance]) => ({ feature, importance }));
};

// Method to update production metrics
fraudMLModelSchema.methods.updateProductionMetrics = function (correct, total, fraudDetected, falseAlert) {
  this.productionMetrics.totalPredictions += total;
  this.productionMetrics.correctPredictions += correct;
  this.productionMetrics.detectedFrauds += fraudDetected;
  this.productionMetrics.falseAlerts += falseAlert;
  this.productionMetrics.actualAccuracy =
    this.productionMetrics.correctPredictions / Math.max(this.productionMetrics.totalPredictions, 1);
  this.productionMetrics.lastUpdatedAt = new Date();
  return this.save();
};

// Method to check if model is performing well
fraudMLModelSchema.methods.isPerformingWell = function (minAccuracy = 0.85) {
  return (
    this.trainingMetrics?.accuracy >= minAccuracy &&
    this.productionMetrics?.actualAccuracy >= minAccuracy
  );
};

module.exports = mongoose.model('FraudMLModel', fraudMLModelSchema);
