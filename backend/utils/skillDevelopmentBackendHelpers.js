const MAX_CERTIFICATE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_CERTIFICATE_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

function validateCertificateUploadPayload(body = {}, file) {
  const errors = [];

  if (!body.title || body.title.trim().length < 3) {
    errors.push("Certificate title must have at least 3 characters.");
  }

  if (!body.completedOn || Number.isNaN(new Date(body.completedOn).getTime())) {
    errors.push("Valid completed date is required.");
  }

  if (body.credentialId && body.credentialId.length > 80) {
    errors.push("Credential ID is too long.");
  }

  if (file) {
    if (!ALLOWED_CERTIFICATE_MIME_TYPES.has(file.mimetype)) {
      errors.push("Only PDF, JPG and PNG certificates are allowed.");
    }

    if (file.size > MAX_CERTIFICATE_SIZE_BYTES) {
      errors.push("Certificate file must be below 5 MB.");
    }
  }

  return errors;
}

function buildSkillWalletShareText(certificates = []) {
  if (!certificates.length) return "My NilaHub Skill Wallet is ready.";

  const topCertificates = certificates
    .slice(0, 5)
    .map((item, index) => `${index + 1}. ${item.title} - ${item.issuer || "Verified learning"}`)
    .join("\n");

  return `My NilaHub Skill Wallet certificates:\n${topCertificates}`;
}

module.exports = {
  validateCertificateUploadPayload,
  buildSkillWalletShareText,
};
