const axios = require('axios');
const HealthcareWearableData = require('../models/healthcare/HealthcareWearableData');

const APPLE_HEALTH_ENABLED = process.env.APPLE_HEALTH_ENABLED === 'true';
const GOOGLE_FIT_ENABLED = process.env.GOOGLE_FIT_ENABLED === 'true';
const FITBIT_CLIENT_ID = process.env.FITBIT_CLIENT_ID || '';
const FITBIT_CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET || '';

/**
 * Sync data from Apple Health
 * Note: Apple Health data is typically synced from the mobile app
 */
const syncAppleHealthData = async (userId, healthData) => {
  try {
    if (!APPLE_HEALTH_ENABLED) {
      return { success: false, message: 'Apple Health integration not enabled' };
    }

    const syncedRecords = [];

    for (const dataPoint of healthData) {
      const record = await HealthcareWearableData.create({
        userId,
        dataSource: 'apple_health',
        dataType: mapAppleHealthType(dataPoint.type),
        value: dataPoint.value,
        unit: dataPoint.unit,
        recordedAt: new Date(dataPoint.startDate),
        metadata: {
          endDate: dataPoint.endDate,
          sourceType: dataPoint.sourceType,
          sourceName: dataPoint.sourceName,
        },
        deviceInfo: dataPoint.device || 'iPhone',
      });

      syncedRecords.push(record);
    }

    return {
      success: true,
      recordsSynced: syncedRecords.length,
      records: syncedRecords,
    };
  } catch (error) {
    console.error('[WearablesIntegrationService] Apple Health sync error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Map Apple Health data types to our schema
 */
const mapAppleHealthType = (appleType) => {
  const typeMap = {
    'HKQuantityTypeIdentifierStepCount': 'steps',
    'HKQuantityTypeIdentifierHeartRate': 'heart_rate',
    'HKCategoryTypeIdentifierSleepAnalysis': 'sleep',
    'HKQuantityTypeIdentifierBloodPressureSystolic': 'blood_pressure',
    'HKQuantityTypeIdentifierBloodGlucose': 'blood_glucose',
    'HKQuantityTypeIdentifierBodyMass': 'weight',
    'HKQuantityTypeIdentifierActiveEnergyBurned': 'calories',
    'HKQuantityTypeIdentifierDistanceWalkingRunning': 'distance',
    'HKQuantityTypeIdentifierOxygenSaturation': 'oxygen_saturation',
    'HKQuantityTypeIdentifierBodyTemperature': 'body_temperature',
  };

  return typeMap[appleType] || 'other';
};

/**
 * Sync data from Google Fit
 */
const syncGoogleFitData = async (userId, accessToken) => {
  try {
    if (!GOOGLE_FIT_ENABLED) {
      return { success: false, message: 'Google Fit integration not enabled' };
    }

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Fetch step count
    const stepsResponse = await axios.post(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
      {
        aggregateBy: [
          {
            dataTypeName: 'com.google.step_count.delta',
          },
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: oneDayAgo,
        endTimeMillis: now,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const syncedRecords = [];

    if (stepsResponse.data.bucket) {
      for (const bucket of stepsResponse.data.bucket) {
        if (bucket.dataset && bucket.dataset[0].point) {
          for (const point of bucket.dataset[0].point) {
            const record = await HealthcareWearableData.create({
              userId,
              dataSource: 'google_fit',
              dataType: 'steps',
              value: point.value[0].intVal,
              unit: 'steps',
              recordedAt: new Date(parseInt(point.startTimeNanos) / 1000000),
              metadata: {
                endTime: new Date(parseInt(point.endTimeNanos) / 1000000),
              },
              deviceInfo: 'Android Device',
            });

            syncedRecords.push(record);
          }
        }
      }
    }

    // Fetch heart rate
    const heartRateResponse = await axios.post(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
      {
        aggregateBy: [
          {
            dataTypeName: 'com.google.heart_rate.bpm',
          },
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: oneDayAgo,
        endTimeMillis: now,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (heartRateResponse.data.bucket) {
      for (const bucket of heartRateResponse.data.bucket) {
        if (bucket.dataset && bucket.dataset[0].point) {
          for (const point of bucket.dataset[0].point) {
            const record = await HealthcareWearableData.create({
              userId,
              dataSource: 'google_fit',
              dataType: 'heart_rate',
              value: point.value[0].fpVal,
              unit: 'bpm',
              recordedAt: new Date(parseInt(point.startTimeNanos) / 1000000),
              deviceInfo: 'Android Device',
            });

            syncedRecords.push(record);
          }
        }
      }
    }

    return {
      success: true,
      recordsSynced: syncedRecords.length,
      records: syncedRecords,
    };
  } catch (error) {
    console.error('[WearablesIntegrationService] Google Fit sync error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Sync data from Fitbit
 */
const syncFitbitData = async (userId, accessToken) => {
  try {
    if (!FITBIT_CLIENT_ID || !FITBIT_CLIENT_SECRET) {
      return { success: false, message: 'Fitbit credentials not configured' };
    }

    const today = new Date().toISOString().split('T')[0];

    const syncedRecords = [];

    // Fetch activity data
    const activityResponse = await axios.get(
      `https://api.fitbit.com/1/user/-/activities/date/${today}.json`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (activityResponse.data.summary) {
      const summary = activityResponse.data.summary;

      // Steps
      if (summary.steps) {
        const record = await HealthcareWearableData.create({
          userId,
          dataSource: 'fitbit',
          dataType: 'steps',
          value: summary.steps,
          unit: 'steps',
          recordedAt: new Date(),
          deviceInfo: 'Fitbit Device',
        });
        syncedRecords.push(record);
      }

      // Calories
      if (summary.caloriesOut) {
        const record = await HealthcareWearableData.create({
          userId,
          dataSource: 'fitbit',
          dataType: 'calories',
          value: summary.caloriesOut,
          unit: 'kcal',
          recordedAt: new Date(),
          deviceInfo: 'Fitbit Device',
        });
        syncedRecords.push(record);
      }

      // Distance
      if (summary.distances && summary.distances[0]) {
        const record = await HealthcareWearableData.create({
          userId,
          dataSource: 'fitbit',
          dataType: 'distance',
          value: summary.distances[0].distance,
          unit: 'km',
          recordedAt: new Date(),
          deviceInfo: 'Fitbit Device',
        });
        syncedRecords.push(record);
      }
    }

    // Fetch heart rate data
    const heartRateResponse = await axios.get(
      `https://api.fitbit.com/1/user/-/activities/heart/date/${today}/1d.json`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (heartRateResponse.data['activities-heart'] && heartRateResponse.data['activities-heart'][0]) {
      const heartData = heartRateResponse.data['activities-heart'][0].value;
      if (heartData.restingHeartRate) {
        const record = await HealthcareWearableData.create({
          userId,
          dataSource: 'fitbit',
          dataType: 'heart_rate',
          value: heartData.restingHeartRate,
          unit: 'bpm',
          recordedAt: new Date(),
          metadata: { type: 'resting' },
          deviceInfo: 'Fitbit Device',
        });
        syncedRecords.push(record);
      }
    }

    return {
      success: true,
      recordsSynced: syncedRecords.length,
      records: syncedRecords,
    };
  } catch (error) {
    console.error('[WearablesIntegrationService] Fitbit sync error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Detect health anomalies in wearable data
 */
const detectAnomalies = async (userId) => {
  try {
    const anomalies = [];
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check for abnormal heart rate
    const heartRateData = await HealthcareWearableData.find({
      userId,
      dataType: 'heart_rate',
      recordedAt: { $gte: yesterday },
    }).lean();

    for (const reading of heartRateData) {
      if (reading.value > 120 || reading.value < 40) {
        await HealthcareWearableData.findByIdAndUpdate(reading._id, {
          isAnomaly: true,
          anomalyReason: reading.value > 120 ? 'Elevated heart rate' : 'Low heart rate',
        });

        anomalies.push({
          type: 'heart_rate',
          value: reading.value,
          reason: reading.value > 120 ? 'Elevated heart rate' : 'Low heart rate',
          severity: reading.value > 140 || reading.value < 35 ? 'high' : 'medium',
          recordedAt: reading.recordedAt,
        });
      }
    }

    // Check for abnormal blood pressure
    const bpData = await HealthcareWearableData.find({
      userId,
      dataType: 'blood_pressure',
      recordedAt: { $gte: yesterday },
    }).lean();

    for (const reading of bpData) {
      if (reading.value > 140 || reading.value < 90) {
        await HealthcareWearableData.findByIdAndUpdate(reading._id, {
          isAnomaly: true,
          anomalyReason: reading.value > 140 ? 'High blood pressure' : 'Low blood pressure',
        });

        anomalies.push({
          type: 'blood_pressure',
          value: reading.value,
          reason: reading.value > 140 ? 'High blood pressure' : 'Low blood pressure',
          severity: reading.value > 160 || reading.value < 80 ? 'high' : 'medium',
          recordedAt: reading.recordedAt,
        });
      }
    }

    return {
      success: true,
      anomaliesDetected: anomalies.length,
      anomalies,
    };
  } catch (error) {
    console.error('[WearablesIntegrationService] Anomaly detection error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get aggregated health metrics
 */
const getHealthMetrics = async (userId, options = {}) => {
  try {
    const { days = 7 } = options;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const metrics = {};

    // Steps
    const stepsData = await HealthcareWearableData.find({
      userId,
      dataType: 'steps',
      recordedAt: { $gte: startDate },
    }).lean();

    if (stepsData.length > 0) {
      const totalSteps = stepsData.reduce((sum, d) => sum + d.value, 0);
      metrics.steps = {
        total: totalSteps,
        average: Math.round(totalSteps / days),
        data: stepsData,
      };
    }

    // Heart rate
    const heartRateData = await HealthcareWearableData.find({
      userId,
      dataType: 'heart_rate',
      recordedAt: { $gte: startDate },
    }).lean();

    if (heartRateData.length > 0) {
      const values = heartRateData.map((d) => d.value);
      metrics.heartRate = {
        average: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
        min: Math.min(...values),
        max: Math.max(...values),
        data: heartRateData,
      };
    }

    // Sleep
    const sleepData = await HealthcareWearableData.find({
      userId,
      dataType: 'sleep',
      recordedAt: { $gte: startDate },
    }).lean();

    if (sleepData.length > 0) {
      const totalSleep = sleepData.reduce((sum, d) => sum + d.value, 0);
      metrics.sleep = {
        totalHours: totalSleep,
        averageHours: Math.round((totalSleep / sleepData.length) * 10) / 10,
        data: sleepData,
      };
    }

    return {
      success: true,
      metrics,
      period: `${days} days`,
    };
  } catch (error) {
    console.error('[WearablesIntegrationService] Get metrics error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  syncAppleHealthData,
  syncGoogleFitData,
  syncFitbitData,
  detectAnomalies,
  getHealthMetrics,
};
