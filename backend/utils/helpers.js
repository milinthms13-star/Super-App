/**
 * Common utility functions
 */

/**
 * Sanitize text by removing null bytes and trimming
 */
function sanitizeText(value = '') {
  return String(value).replace(/\u0000/g, '').trim();
}

/**
 * Escape XML/SVG special characters
 */
function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Safe filename from any string
 */
function safeFileName(value) {
  return sanitizeText(value).replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
}

module.exports = {
  sanitizeText,
  escapeXml,
  safeFileName,
};
