module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/routes'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'routes/freelancer.js',
    'routes/freelancer/**/*.js',
    'models/FreelancerProvider.js',
    'models/FreelancerJob.js',
    'models/FreelancerBooking.js',
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
