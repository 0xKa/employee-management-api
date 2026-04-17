/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { types: ['jest', 'node'] } }],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFiles: ['./src/__tests__/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/app.ts',
    '!src/config/swagger.ts',
  ],
};
