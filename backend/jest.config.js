module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js', '**/*.spec.js'],
  collectCoverageFrom: [
    'services/**/*.js',
    'routes/**/*.js',
    'models/**/*.js',
    '!**/node_modules/**',
    '!**/test/**'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  testTimeout: 30000,
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true,
  bail: false,
  verbose: true,
  moduleFileExtensions: ['js', 'json'],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
// Jest is running in CJS mode, but some dependencies (e.g. `uuid` v9+) ship ESM.
// Without transforming them, Jest throws "Unexpected token export".
  transformIgnorePatterns: [
    'node_modules/'
  ],
  // uuid v14 is ESM-only; map to a test-safe CJS mock so legacy CJS tests can run.
  moduleNameMapper: {
    '^uuid$': '<rootDir>/tests/mocks/uuid.js',
    '^uuid/(.*)$': '<rootDir>/tests/mocks/uuid.js',
    '^ffmpeg-static$': '<rootDir>/tests/mocks/ffmpeg-static.js'
  }
};

