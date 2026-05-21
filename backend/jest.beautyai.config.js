const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  testMatch: ['<rootDir>/routes/beautyAI.routes.integration.test.js'],
  collectCoverageFrom: ['routes/beautyAI.js'],
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 10,
      lines: 10,
      statements: 10,
    },
  },
  coverageReporters: ['json-summary', 'text', 'lcov'],
};
