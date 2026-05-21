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
      branches: 10,
      functions: 20,
      lines: 20,
      statements: 20,
    },
  },
};
