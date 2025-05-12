export default {
    preset: 'ts-jest',
    testEnvironment: 'jest-environment-node-single-context',
    testMatch: ['**/spec/**/*.spec.ts'],
    globalSetup: './tests/setup/globalSetup.ts',
    globalTeardown: './tests/setup/globalTeardown.ts',
    verbose: true
};
