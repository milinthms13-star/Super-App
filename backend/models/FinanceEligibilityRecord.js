const mongoose = require('mongoose');

const financeEligibilityRecordSchema = new mongoose.Schema(
  {
    recordId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true, index: true },
    state: { type: String, default: '', trim: true },
    district: { type: String, default: '', trim: true },
    loanCategory: { type: String, default: '', trim: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    result: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FinanceEligibilityRecord', financeEligibilityRecordSchema);
