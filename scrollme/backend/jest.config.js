module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  globalSetup: './__tests__/helpers/globalSetup.js',
  globalTeardown: './__tests__/helpers/globalTeardown.js',
  setupFilesAfterEnv: ['./__tests__/helpers/env.js'],
  testTimeout: 30000,
  collectCoverageFrom: ['api/**/*.js'],
};
