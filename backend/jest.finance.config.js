const base = require('./jest.config');

module.exports = {
  ...base,
  collectCoverageFrom: [
    'routes/finance.js',
    'models/FinanceLead.js',
    'models/FinanceInstitution.js',
    'models/FinanceAuditLog.js',
    'models/FinanceEligibilityRecord.js',
  ],
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 40,
      lines: 40,
      statements: 40,
    },
  },
};
