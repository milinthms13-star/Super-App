const axios = require('axios');
const Tesseract = require('tesseract.js');
const HealthcareLabReport = require('../models/healthcare/HealthcareLabReport');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OCR_ENABLED = process.env.LAB_OCR_ENABLED === 'true';

/**
 * Extract text from image using OCR
 */
const extractTextFromImage = async (imageBuffer) => {
  if (!OCR_ENABLED) {
    console.warn('[LabReportProcessingService] OCR is disabled');
    return { text: '', confidence: 0 };
  }

  try {
    const result = await Tesseract.recognize(imageBuffer, 'eng', {
      logger: (m) => console.log('[Tesseract]', m),
    });

    return {
      text: result.data.text,
      confidence: result.data.confidence,
    };
  } catch (error) {
    console.error('[LabReportProcessingService] OCR error:', error);
    return { text: '', confidence: 0, error: error.message };
  }
};

/**
 * Parse lab report text using AI
 */
const parseLabReportWithAI = async (reportText) => {
  if (!OPENAI_API_KEY) {
    console.warn('[LabReportProcessingService] OpenAI API key not configured');
    return { testResults: [], confidence: 0 };
  }

  try {
    const systemPrompt = `You are a medical lab report parser. Extract test results from lab reports and return structured JSON data.
Return format: { "testResults": [{ "testName": "string", "value": "string", "unit": "string", "referenceRange": "string", "status": "normal|abnormal|critical" }], "patientInfo": { "name": "string", "age": number, "gender": "male|female|other" }, "labInfo": { "labName": "string", "reportDate": "YYYY-MM-DD", "collectionDate": "YYYY-MM-DD" } }`;

    const userPrompt = `Parse this lab report:\n\n${reportText}`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const parsed = JSON.parse(response?.data?.choices?.[0]?.message?.content || '{}');

    return {
      testResults: parsed.testResults || [],
      patientInfo: parsed.patientInfo || {},
      labInfo: parsed.labInfo || {},
      confidence: 85,
    };
  } catch (error) {
    console.error('[LabReportProcessingService] AI parsing error:', error);
    return { testResults: [], confidence: 0, error: error.message };
  }
};

/**
 * Analyze test results and determine overall status
 */
const analyzeTestResults = (testResults) => {
  if (!Array.isArray(testResults) || testResults.length === 0) {
    return { overallStatus: 'pending', criticalAlerts: [] };
  }

  let overallStatus = 'normal';
  const criticalAlerts = [];

  for (const result of testResults) {
    if (result.status === 'critical') {
      overallStatus = 'critical';
      criticalAlerts.push(`Critical: ${result.testName} - ${result.value} ${result.unit}`);
    } else if (result.status === 'abnormal' && overallStatus !== 'critical') {
      overallStatus = 'abnormal';
    }
  }

  return { overallStatus, criticalAlerts };
};

/**
 * Process lab report file and create structured data
 */
const processLabReport = async ({ userId, fileBuffer, fileType, appointmentId = null, recordId = null }) => {
  try {
    let reportText = '';
    let parsingMethod = 'manual';
    let parsingConfidence = 0;

    // Extract text if image
    if (fileType && fileType.startsWith('image/')) {
      const ocrResult = await extractTextFromImage(fileBuffer);
      reportText = ocrResult.text;
      parsingConfidence = ocrResult.confidence;
      parsingMethod = 'ocr';
    }

    // Parse with AI if we have text
    let testResults = [];
    let patientInfo = {};
    let labInfo = {};

    if (reportText && OPENAI_API_KEY) {
      const aiResult = await parseLabReportWithAI(reportText);
      testResults = aiResult.testResults;
      patientInfo = aiResult.patientInfo;
      labInfo = aiResult.labInfo;
      parsingMethod = 'ai';
      parsingConfidence = aiResult.confidence;
    }

    // Analyze results
    const { overallStatus, criticalAlerts } = analyzeTestResults(testResults);

    // Generate report number
    const reportNumber = `LAB-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create lab report record
    const labReport = await HealthcareLabReport.create({
      userId,
      appointmentId,
      recordId,
      reportNumber,
      labName: labInfo.labName || 'Unknown Lab',
      patientName: patientInfo.name || 'Unknown Patient',
      patientAge: patientInfo.age || null,
      patientGender: patientInfo.gender || 'other',
      testCategory: 'General',
      collectionDate: labInfo.collectionDate ? new Date(labInfo.collectionDate) : new Date(),
      reportDate: labInfo.reportDate ? new Date(labInfo.reportDate) : new Date(),
      testResults,
      overallStatus,
      parsedAt: new Date(),
      parsingMethod,
      parsingConfidence,
      criticalAlerts,
    });

    return {
      success: true,
      reportNumber,
      labReport: labReport.toObject(),
      parsingMethod,
      parsingConfidence,
    };
  } catch (error) {
    console.error('[LabReportProcessingService] Processing error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get health trends from lab reports
 */
const getLabTrends = async (userId, testName, options = {}) => {
  try {
    const { days = 180 } = options;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const reports = await HealthcareLabReport.find({
      userId,
      reportDate: { $gte: startDate },
    })
      .sort({ reportDate: 1 })
      .lean();

    const trendData = [];

    for (const report of reports) {
      const testResult = report.testResults.find(
        (t) => t.testName.toLowerCase().includes(testName.toLowerCase())
      );

      if (testResult) {
        trendData.push({
          date: report.reportDate,
          value: parseFloat(testResult.value) || 0,
          unit: testResult.unit,
          status: testResult.status,
          reportNumber: report.reportNumber,
        });
      }
    }

    if (trendData.length === 0) {
      return {
        testName,
        trend: 'no_data',
        dataPoints: [],
        message: 'No historical data available for this test',
      };
    }

    // Calculate trend
    const values = trendData.map((d) => d.value);
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
      testName,
      trend,
      dataPoints: trendData,
      average: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
      min: Math.min(...values),
      max: Math.max(...values),
    };
  } catch (error) {
    console.error('[LabReportProcessingService] Trend analysis error:', error);
    return {
      testName,
      trend: 'error',
      dataPoints: [],
      error: error.message,
    };
  }
};

module.exports = {
  extractTextFromImage,
  parseLabReportWithAI,
  analyzeTestResults,
  processLabReport,
  getLabTrends,
};
