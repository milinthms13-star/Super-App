const mongoose = require('mongoose');

const financeLeadSchema = new mongoose.Schema(
  {
    leadId: {
      type: String,
      unique: true,
      index: true,
      required: true,
      trim: true,
      uppercase: true,
    },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    district: { type: String, required: true, trim: true, index: true },
    loanCategory: { type: String, required: true, trim: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    callbackWindow: { type: String, default: '', trim: true },
    preferredInterestRate: { type: Number, min: 0, max: 60, default: null },
    preferredTenureMonths: { type: Number, min: 1, max: 600, default: null },
    institution: {
      institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceInstitution', default: null },
      name: { type: String, trim: true, default: '' },
      partnerCode: { type: String, trim: true, default: '' },
    },
    documents: [
      {
        category: {
          type: String,
          enum: ['aadhaar', 'pan', 'salarySlip', 'bankStatement', 'gstProof', 'collateralDocuments'],
          required: true,
        },
        originalName: { type: String, required: true, trim: true },
        filename: { type: String, required: true, trim: true },
        path: { type: String, required: true, trim: true },
        mimeType: { type: String, default: '', trim: true },
        size: { type: Number, default: 0, min: 0 },
        uploadedAt: { type: Date, default: () => new Date() },
      },
    ],
    documentNotes: { type: String, default: '', trim: true },
    consents: {
      privacy: { type: Boolean, default: false },
      kyc: { type: Boolean, default: false },
      disclaimer: { type: Boolean, default: false },
      timestamp: { type: Date, default: null },
    },
    whatsappOptIn: { type: Boolean, default: false },
    eligibilitySnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    status: {
      type: String,
      required: true,
      enum: [
        'lead_received',
        'documents_pending',
        'consultant_assigned',
        'in_review',
        'submitted_to_institution',
        'approved',
        'rejected',
        'disbursed',
      ],
      default: 'lead_received',
      index: true,
    },
    statusTimeline: [
      {
        status: { type: String, required: true, trim: true },
        note: { type: String, default: '', trim: true },
        changedByRole: { type: String, default: 'system', trim: true },
        changedByName: { type: String, default: 'System', trim: true },
        changedAt: { type: Date, default: () => new Date() },
      },
    ],
    consultant: {
      consultantId: { type: String, default: '', trim: true, index: true },
      name: { type: String, default: '', trim: true },
      phone: { type: String, default: '', trim: true },
      assignedAt: { type: Date, default: null },
    },
    commission: {
      model: { type: String, enum: ['percentage', 'flat'], default: 'percentage' },
      value: { type: Number, min: 0, default: 0 },
      expectedAmount: { type: Number, min: 0, default: 0 },
      actualAmount: { type: Number, min: 0, default: 0 },
      status: {
        type: String,
        enum: ['pending', 'eligible', 'paid'],
        default: 'pending',
      },
      paidAt: { type: Date, default: null },
    },
    dataDeletionRequest: {
      requested: { type: Boolean, default: false },
      reason: { type: String, default: '', trim: true },
      requestedAt: { type: Date, default: null },
      status: {
        type: String,
        enum: ['none', 'requested', 'processed'],
        default: 'none',
      },
    },
  },
  { timestamps: true }
);

financeLeadSchema.index({ leadId: 1, phone: 1 });
financeLeadSchema.index({ district: 1, loanCategory: 1 });
financeLeadSchema.index({ 'institution.institutionId': 1, status: 1 });

module.exports = mongoose.model('FinanceLead', financeLeadSchema);
