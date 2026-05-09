/**
 * Revenue Forecasting Service - Phase 14
 * Predict future revenue using time-series analysis
 */

const Payment = require('../models/Payment');
const Order = require('../models/Order');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');

class RevenueForecastingService {
  /**
   * Forecast revenue for next N days
   */
  static async forecastRevenue(days = 30, lookbackDays = 90) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - lookbackDays);

      // Fetch historical revenue
      const historicalData = await this.getHistoricalRevenue(startDate, endDate);

      if (historicalData.length === 0) {
        return { forecast: [], error: 'Insufficient historical data' };
      }

      // Calculate trend
      const trend = this.calculateTrend(historicalData);

      // Generate forecast
      const forecast = this.generateForecast(historicalData, trend, days);

      // Calculate confidence intervals
      const forecastWithCI = this.addConfidenceIntervals(forecast, historicalData);

      logger.info(`Revenue forecast generated for ${days} days`, {
        lookbackDays,
        trendType: trend.type,
        averageRevenue: trend.average
      });

      return {
        forecast: forecastWithCI,
        trend,
        metadata: {
          generatedAt: new Date(),
          lookbackDays,
          confidenceLevel: 95
        }
      };
    } catch (error) {
      logger.error('Error forecasting revenue:', error);
      throw error;
    }
  }

  /**
   * Get historical revenue data
   */
  static async getHistoricalRevenue(startDate, endDate) {
    const payments = await Payment.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'completed'
    });

    const dailyRevenue = {};
    let current = new Date(startDate);

    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      dailyRevenue[dateKey] = 0;
      current.setDate(current.getDate() + 1);
    }

    payments.forEach(payment => {
      const dateKey = new Date(payment.createdAt).toISOString().split('T')[0];
      if (dailyRevenue[dateKey] !== undefined) {
        dailyRevenue[dateKey] += payment.amount || 0;
      }
    });

    return Object.entries(dailyRevenue)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Calculate trend from historical data
   */
  static calculateTrend(historicalData) {
    if (historicalData.length < 2) {
      return { type: 'flat', slope: 0, average: 0 };
    }

    const revenues = historicalData.map(d => d.revenue);
    const average = revenues.reduce((a, b) => a + b, 0) / revenues.length;

    // Simple linear regression for trend
    const n = revenues.length;
    const x = Array.from({ length: n }, (_, i) => i + 1);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = revenues.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * revenues[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    let type = 'stable';
    if (slope > average * 0.05) type = 'uptrend';
    if (slope < -average * 0.05) type = 'downtrend';

    return { type, slope, average };
  }

  /**
   * Generate forecast using exponential smoothing
   */
  static generateForecast(historicalData, trend, days) {
    const revenues = historicalData.map(d => d.revenue);
    const alpha = 0.3; // Smoothing factor
    let lastValue = revenues[revenues.length - 1];
    let lastSmoothed = revenues[revenues.length - 1];

    const forecast = [];
    let current = new Date();
    current.setDate(current.getDate() + 1);

    for (let i = 0; i < days; i++) {
      const dateKey = current.toISOString().split('T')[0];

      // Simple exponential smoothing with trend
      const smoothed = alpha * lastValue + (1 - alpha) * lastSmoothed;
      const forecastValue = Math.max(0, smoothed + (trend.slope * (i + 1)) / 365);

      forecast.push({
        date: dateKey,
        revenue: Math.round(forecastValue * 100) / 100,
        lower: Math.round(forecastValue * 0.85 * 100) / 100,
        upper: Math.round(forecastValue * 1.15 * 100) / 100
      });

      lastSmoothed = smoothed;
      current.setDate(current.getDate() + 1);
    }

    return forecast;
  }

  /**
   * Add confidence intervals
   */
  static addConfidenceIntervals(forecast, historicalData) {
    // Calculate standard deviation
    const revenues = historicalData.map(d => d.revenue);
    const avg = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const variance = revenues.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / revenues.length;
    const stdDev = Math.sqrt(variance);

    return forecast.map(item => ({
      ...item,
      lower: Math.max(0, item.revenue - 1.96 * stdDev),
      upper: item.revenue + 1.96 * stdDev
    }));
  }

  /**
   * Get seasonal patterns
   */
  static async getSeasonalPatterns(lookbackDays = 365) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - lookbackDays);

      const historicalData = await this.getHistoricalRevenue(startDate, endDate);

      const seasonal = {};
      historicalData.forEach(item => {
        const date = new Date(item.date);
        const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' });
        const week = Math.ceil(date.getDate() / 7);

        if (!seasonal[dayOfWeek]) {
          seasonal[dayOfWeek] = { values: [], average: 0 };
        }
        seasonal[dayOfWeek].values.push(item.revenue);
      });

      // Calculate averages
      Object.keys(seasonal).forEach(key => {
        const values = seasonal[key].values;
        seasonal[key].average = values.reduce((a, b) => a + b, 0) / values.length;
      });

      return seasonal;
    } catch (error) {
      logger.error('Error analyzing seasonal patterns:', error);
      throw error;
    }
  }
}

module.exports = RevenueForecastingService;
