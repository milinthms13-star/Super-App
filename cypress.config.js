const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    apiUrl: 'http://localhost:5000/api',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    chromeWebSecurity: false,
    video: true,
    screenshotOnRunFailure: true,
    videoCompression: 32,
    
    setupNodeEvents(on, config) {
      // Plugin code here
      return config;
    },

    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
  },

  component: {
    devServer: {
      framework: 'react',
      bundler: 'webpack',
    },
    specPattern: 'src/**/*.cy.jsx',
  },
});
