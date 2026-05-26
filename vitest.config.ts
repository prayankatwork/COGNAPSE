import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'api/**/*.test.js'],
    globals: true,
    environment: 'node',
    setupFiles: [],
    testTimeout: 10_000,
  },
});
