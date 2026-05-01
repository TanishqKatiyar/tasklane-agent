/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@tasklane/shared(.*)$': '<rootDir>/../../../packages/shared/src$1',
  },
  // Longer timeout for integration tests that hit real DB
  testTimeout: 30000,
};
