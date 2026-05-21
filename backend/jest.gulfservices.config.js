const base = require('./jest.config');

module.exports = {
  ...base,
  collectCoverageFrom: [
    'routes/gulfservices.js',
    'models/gulfservices.js',
  ],
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 5,
      lines: 5,
      statements: 5,
    },
  },
};
