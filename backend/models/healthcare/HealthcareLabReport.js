const mongoose = require('mongoose');

const labTestResultSchema = new mongoose.Schema(
  {
    testName: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    unit: { type: String, default: '', trim: true },
    referenceRange: { type: String, default: '', trim: true },
    normalRange: { type: String, default: '', trim: true },
    status: { type: String, enum: ['normal', 'abnormal', 'critical', 'pending'], default: 'pending' },
    notes: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const healthcareLabReportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthcareAppointment', index: true },
    recordId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthcareRecord', index: true },
    reportNumber: { type: String, required: true, unique: true, trim: true, index: true },
    labName: { type: String, required: true, trim: true },
    labAddress: { type: String, default: '', trim: true },
    patientName: { type: String, required: true, trim: true },
    patientAge: { type: Number, default: null },
    patientGender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    testCategory: { type: String, required: true, trim: true },
    collectionDate: { type: Date, required: true },
    reportDate: { type: Date, required: true },
    testResults: { type: [labTestResultSchema], default: [] },
    overallStatus: { type: String, enum: ['normal', 'abnormal', 'critical', 'pending'], default: 'pending', index: true },
    doctorRemarks: { type: String, default: '', trim: true },
    technicalRemarks: { type: String, default: '', trim: true },
    reportUrl: { type: String, default: '', trim: true },
    reportStorageKey: { type: String, default: '', trim: true },
    parsedAt: { type: Date, default: null },
    parsingMethod: { type: String, enum: ['manual', 'ocr', 'api', 'ai'], default: 'manual' },
    parsingConfidence: { type: Number, default: 0, min: 0, max: 100 },
    reviewedByDoctor: { type: Boolean, default: false },
    reviewedAt: { type: Date, default: null },
    criticalAlerts: { type: [String], default: [] },
    trendAnalysis: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

healthcareLabReportSchema.index({ userId: 1, reportDate: -1 });
healthcareLabReportSchema.index({ testCategory: 1, overallStatus: 1 });

module.exports = mongoose.model('HealthcareLabReport', healthcareLabReportSchema);
