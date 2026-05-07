module.exports = {
  testEnvironment: 'node',
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
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  maxWorkers: 4,
  forceExit: true,
  detectOpenHandles: true,
  bail: false,
  verbose: true,
  moduleFileExtensions: ['js', 'json'],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/'
  ],
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};
