const HealthcareWearableData = require('../models/healthcare/HealthcareWearableData');
const HealthcareLabReport = require('../models/healthcare/HealthcareLabReport');
const HealthcareAppointment = require('../models/healthcare/HealthcareAppointment');
const HealthcarePrescription = require('../models/healthcare/HealthcarePrescription');
const PDFDocument = require('pdfkit');

const calculateHealthScore = async (userId, options = {}) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let score = 50; // Base score
    const factors = [];

    // Check recent appointments
    const recentAppointments = await HealthcareAppointment.countDocuments({
      userId,
      appointmentDate: { $gte: thirtyDaysAgo.toISOString().split('T')[0] },
      status: { $in: ['completed', 'confirmed'] },
    });

    if (recentAppointments > 0) {
      score += 10;
      factors.push({ factor: 'Regular checkups', impact: 10, positive: true });
    }

    // Check lab reports
    const recentLabReports = await HealthcareLabReport.countDocuments({
      userId,
      reportDate: { $gte: thirtyDaysAgo },
      overallStatus: 'normal',
    });

    if (recentLabReports > 0) {
      score += 15;
      factors.push({ factor: 'Normal lab results', impact: 15, positive: true });
    }

    const abnormalReports = await HealthcareLabReport.countDocuments({
      userId,
      reportDate: { $gte: thirtyDaysAgo },
      overallStatus: { $in: ['abnormal', 'critical'] },
    });

    if (abnormalReports > 0) {
      score -= abnormalReports * 5;
      factors.push({ factor: 'Abnormal lab results', impact: -abnormalReports * 5, positive: false });
    }

    // Check wearable data - activity level
    const stepsData = await HealthcareWearableData.find({
      userId,
      dataType: 'steps',
      recordedAt: { $gte: thirtyDaysAgo },
    })
      .sort({ recordedAt: -1 })
      .limit(30)
      .lean();

    if (stepsData.length > 0) {
      const avgSteps = stepsData.reduce((sum, d) => sum + d.value, 0) / stepsData.length;
      if (avgSteps >= 10000) {
        score += 20;
        factors.push({ factor: 'Excellent activity level', impact: 20, positive: true });
      } else if (avgSteps >= 7000) {
        score += 10;
        factors.push({ factor: 'Good activity level', impact: 10, positive: true });
      } else if (avgSteps < 3000) {
        score -= 10;
        factors.push({ factor: 'Low activity level', impact: -10, positive: false });
      }
    }

    // Check active prescriptions
    const activePrescriptions = await HealthcarePrescription.countDocuments({
      userId,
      isActive: true,
      validUntil: { $gte: now },
    });

    if (activePrescriptions > 3) {
      score -= 5;
      factors.push({ factor: 'Multiple active medications', impact: -5, positive: false });
    }

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    return {
      score: Math.round(score),
      factors,
      calculatedAt: now,
      period: '30 days',
    };
  } catch (error) {
    console.error('[HealthcareAnalyticsService] Health score calculation error:', error);
    return {
      score: 50,
      factors: [],
      calculatedAt: new Date(),
      period: '30 days',
      error: error.message,
    };
  }
};

const getHealthTrends = async (userId, options = {}) => {
  try {
    const { dataType = 'steps', days = 30 } = options;
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const data = await HealthcareWearableData.find({
      userId,
      dataType,
      recordedAt: { $gte: startDate },
    })
      .sort({ recordedAt: 1 })
      .lean();

    if (data.length === 0) {
      return {
        dataType,
        trend: 'insufficient_data',
        dataPoints: [],
        average: 0,
        min: 0,
        max: 0,
      };
    }

    const values = data.map((d) => d.value);
    const average = values.reduce((sum, v) => sum + v, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate trend (increasing, decreasing, stable)
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    let trend = 'stable';
    if (secondAvg > firstAvg * 1.1) {
      trend = 'increasing';
    } else if (secondAvg < firstAvg * 0.9) {
      trend = 'decreasing';
    }

    return {
      dataType,
      trend,
      dataPoints: data.map((d) => ({
        date: d.recordedAt,
        value: d.value,
        unit: d.unit,
      })),
      average: Math.round(average),
      min,
      max,
      period: `${days} days`,
    };
  } catch (error) {
    console.error('[HealthcareAnalyticsService] Health trends error:', error);
    return {
      dataType: options.dataType || 'unknown',
      trend: 'error',
      dataPoints: [],
      average: 0,
      min: 0,
      max: 0,
      error: error.message,
    };
  }
};

const getPredictiveInsights = async (userId, options = {}) => {
  try {
    const insights = [];

    // Check for potential health risks based on lab trends
    const recentLabReports = await HealthcareLabReport.find({
      userId,
      reportDate: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      overallStatus: { $in: ['abnormal', 'critical'] },
    })
      .sort({ reportDate: -1 })
      .limit(10)
      .lean();

    if (recentLabReports.length >= 2) {
      insights.push({
        type: 'health_risk',
        severity: 'medium',
        message: 'Multiple abnormal lab results detected in the past 3 months. Consider scheduling a follow-up consultation.',
        recommendation: 'Book appointment with your doctor',
        confidence: 0.75,
      });
    }

    // Check activity level trends
    const stepsTrend = await getHealthTrends(userId, { dataType: 'steps', days: 30 });
    if (stepsTrend.trend === 'decreasing' && stepsTrend.average < 5000) {
      insights.push({
        type: 'lifestyle',
        severity: 'low',
        message: 'Your daily activity has been decreasing. Low physical activity may impact your health.',
        recommendation: 'Try to increase daily steps to at least 7,000',
        confidence: 0.8,
      });
    }

    // Check for prescription refill needs
    const expiringPrescriptions = await HealthcarePrescription.find({
      userId,
      isActive: true,
      validUntil: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }).lean();

    if (expiringPrescriptions.length > 0) {
      insights.push({
        type: 'medication',
        severity: 'medium',
        message: `${expiringPrescriptions.length} prescription(s) expiring within 7 days.`,
        recommendation: 'Request prescription renewal from your doctor',
        confidence: 1.0,
      });
    }

    return {
      insights,
      generatedAt: new Date(),
      userId,
    };
  } catch (error) {
    console.error('[HealthcareAnalyticsService] Predictive insights error:', error);
    return {
      insights: [],
      generatedAt: new Date(),
      userId,
      error: error.message,
    };
  }
};

const generateHealthReportPDF = async (userId, userData, options = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('Health Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);

      // Patient Info
      doc.fontSize(14).font('Helvetica-Bold').text('Patient Information');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(`Name: ${userData.name || 'N/A'}`);
      doc.text(`Email: ${userData.email || 'N/A'}`);
      doc.text(`Report Period: Last 30 days`);
      doc.moveDown(2);

      // Health Score
      const healthScore = await calculateHealthScore(userId);
      doc.fontSize(14).font('Helvetica-Bold').text('Health Score');
      doc.moveDown(0.5);
      doc.fontSize(24).font('Helvetica-Bold').text(`${healthScore.score}/100`, { align: 'center' });
      doc.moveDown();

      if (healthScore.factors && healthScore.factors.length > 0) {
        doc.fontSize(11).font('Helvetica').text('Contributing Factors:');
        doc.moveDown(0.3);
        healthScore.factors.forEach((factor) => {
          const sign = factor.positive ? '+' : '';
          doc.text(`  • ${factor.factor}: ${sign}${factor.impact}`);
        });
      }
      doc.moveDown(2);

      // Activity Trends
      const stepsTrend = await getHealthTrends(userId, { dataType: 'steps', days: 30 });
      doc.fontSize(14).font('Helvetica-Bold').text('Activity Summary');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(`Average Daily Steps: ${stepsTrend.average}`);
      doc.text(`Trend: ${stepsTrend.trend}`);
      doc.moveDown(2);

      // Predictive Insights
      const insights = await getPredictiveInsights(userId);
      if (insights.insights && insights.insights.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Health Insights & Recommendations');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica');
        insights.insights.forEach((insight, index) => {
          doc.text(`${index + 1}. ${insight.message}`);
          doc.text(`   Recommendation: ${insight.recommendation}`, { indent: 20 });
          doc.moveDown(0.5);
        });
      }

      // Footer
      doc.moveDown(3);
      doc.fontSize(9).font('Helvetica').text('This report is for informational purposes only and does not constitute medical advice.', {
        align: 'center',
      });
      doc.text('Consult with healthcare professionals for medical decisions.', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  calculateHealthScore,
  getHealthTrends,
  getPredictiveInsights,
  generateHealthReportPDF,
};
