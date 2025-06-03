export default {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-node-single-context',
  setupFiles: ['./jest.setup.ts'],
  testMatch: ['**/spec/**/*.spec.ts'],
  globalSetup: './tests/setup/global-setup.ts',
  globalTeardown: './tests/setup/global-teardown.ts',
  verbose: true
};
