const mongoose = require('mongoose');

const SkillCertificateSchema = new mongoose.Schema(
  {
    certificateId: { type: String, required: true, unique: true },
    userEmail: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    issuer: { type: String, trim: true, default: '' },
    completedOn: { type: Date, required: true },
    credentialId: { type: String, trim: true, default: '' },
    verificationUrl: { type: String, trim: true, default: '' },
    badgeUrl: { type: String, trim: true, default: '' },
    fileName: { type: String, trim: true, default: '' },
    fileUrl: { type: String, trim: true, default: '' },
    uploadedAt: { type: Date, default: () => new Date() },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SkillCertificate', SkillCertificateSchema);
