const base = require('./jest.config');

module.exports = {
  ...base,
  collectCoverageFrom: [
    'routes/gulfservices.js',
    'models/gulfservices.js',
  ],
  coverageThreshold: {
    global: {
      branches: 8,
      functions: 10,
      lines: 20,
      statements: 20,
    },
  },
};
