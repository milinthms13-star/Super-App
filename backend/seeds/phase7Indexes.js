/**
 * Phase 7 Database Index Seeding
 * Run: npm run seed:phase7
 */

require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/malabarbazaar', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('MongoDB connected for Phase 7 seeding');
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

const createPhase7Indexes = async () => {
  try {
    logger.info('Creating Phase 7 indexes...');

    // FraudMLModel indexes
    const fraudMLModelDB = mongoose.connection.collection('fraudmlmodels');
    await fraudMLModelDB.createIndex({ status: 1, createdAt: -1 }, { background: true });
    await fraudMLModelDB.createIndex({ modelType: 1, version: 1 }, { background: true });
    await fraudMLModelDB.createIndex({ tags: 1 }, { background: true });
    await fraudMLModelDB.createIndex({ active: 1, status: 1 }, { background: true });
    logger.info('✓ FraudMLModel indexes created');

    // BehavioralPattern indexes
    const behavioralPatternDB = mongoose.connection.collection('behavioralpatterns');
    await behavioralPatternDB.createIndex({ userId: 1, patternType: 1, status: 1 }, { background: true });
    await behavioralPatternDB.createIndex({ entityType: 1, entityId: 1 }, { background: true });
    await behavioralPatternDB.createIndex({ 'learningStatus.confidenceScore': -1 }, { background: true });
    await behavioralPatternDB.createIndex({ 'anomalies.detectedCount': -1 }, { background: true });
    await behavioralPatternDB.createIndex({ createdAt: -1 }, { background: true });
    logger.info('✓ BehavioralPattern indexes created');

    // FraudAlert indexes
    const fraudAlertDB = mongoose.connection.collection('fraudalerts');
    await fraudAlertDB.createIndex({ userId: 1, status: 1, createdAt: -1 }, { background: true });
    await fraudAlertDB.createIndex({ severity: 1, status: 1 }, { background: true });
    await fraudAlertDB.createIndex({ entityType: 1, entityId: 1 }, { background: true });
    await fraudAlertDB.createIndex({ status: 1, priority: -1 }, { background: true });
    await fraudAlertDB.createIndex({ riskScore: -1, status: 1 }, { background: true });
    await fraudAlertDB.createIndex({ createdAt: -1 }, { background: true });
    await fraudAlertDB.createIndex({ mlModelId: 1, createdAt: -1 }, { background: true });
    // TTL index for alert expiration (30 days)
    await fraudAlertDB.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    logger.info('✓ FraudAlert indexes created');

    logger.info('✅ All Phase 7 indexes created successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Error creating indexes:', error);
    process.exit(1);
  }
};

const seedInitialData = async () => {
  try {
    logger.info('Seeding initial Phase 7 data...');

    const FraudMLModel = require('../models/FraudMLModel');

    // Check if seed data already exists
    const existingModels = await FraudMLModel.countDocuments();
    if (existingModels > 0) {
      logger.info('Initial data already seeded, skipping...');
      return;
    }

    // Create initial ML models
    const initialModels = [
      {
        modelId: 'xgb_v1_0_0',
        modelName: 'XGBoost Fraud Detector v1',
        modelType: 'xgboost',
        version: '1.0.0',
        description: 'Initial XGBoost model for fraud detection',
        status: 'active',
        active: true,
        features: [
          'transaction_amount',
          'is_new_device',
          'is_new_account',
          'transactions_last_hour',
          'is_vpn_detected',
          'merchant_risk_score',
          'refunds_last_day',
          'country_risk_score',
        ],
        trainingMetrics: {
          accuracy: 0.92,
          precision: 0.89,
          recall: 0.91,
          f1Score: 0.90,
          auc: 0.94,
          falsePositiveRate: 0.08,
          falseNegativeRate: 0.09,
        },
        productionMetrics: {
          totalPredictions: 0,
          correctPredictions: 0,
          actualAccuracy: 0.92,
          detectedFrauds: 0,
          falseAlerts: 0,
        },
        performanceThresholds: {
          riskScoreThreshold: 0.7,
          confidenceThreshold: 0.85,
          autoBlockThreshold: 0.95,
        },
        trainingData: {
          datasetSize: 500000,
          trainingDate: new Date(),
          dataDistribution: {
            fraudCases: 25000,
            legitimateCases: 475000,
            fraudPercentage: 5,
          },
        },
        createdBy: 'system',
        tags: ['xgboost', 'production', 'initial'],
      },
      {
        modelId: 'rf_v1_0_0',
        modelName: 'Random Forest Fraud Detector v1',
        modelType: 'random_forest',
        version: '1.0.0',
        description: 'Random Forest ensemble model for fraud detection',
        status: 'active',
        active: true,
        features: [
          'transaction_amount',
          'is_new_device',
          'is_new_account',
          'transactions_last_hour',
          'is_vpn_detected',
          'merchant_risk_score',
          'refunds_last_day',
        ],
        trainingMetrics: {
          accuracy: 0.90,
          precision: 0.87,
          recall: 0.89,
          f1Score: 0.88,
          auc: 0.92,
          falsePositiveRate: 0.10,
          falseNegativeRate: 0.11,
        },
        productionMetrics: {
          totalPredictions: 0,
          correctPredictions: 0,
          actualAccuracy: 0.90,
          detectedFrauds: 0,
          falseAlerts: 0,
        },
        performanceThresholds: {
          riskScoreThreshold: 0.72,
          confidenceThreshold: 0.84,
          autoBlockThreshold: 0.96,
        },
        createdBy: 'system',
        tags: ['random_forest', 'production', 'initial'],
      },
    ];

    await FraudMLModel.insertMany(initialModels);
    logger.info(`✓ Created ${initialModels.length} initial ML models`);
  } catch (error) {
    logger.error('Error seeding initial data:', error);
  }
};

const main = async () => {
  await connectDB();
  await seedInitialData();
  await createPhase7Indexes();
};

main();
