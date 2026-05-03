import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      PORT: '3000',
    },
    // e2e tests share DB state and must run sequentially
    // unit tests have no DB and could run in parallel, but keeping one config simple
    fileParallelism: false,
    reporters: ['verbose'],
    include: [
      'tests/e2e/**/*.test.ts',
      'tests/unit/**/*.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
