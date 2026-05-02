import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Use the node environment
    environment: 'node',

    // Test timeout for E2E tests
    testTimeout: 30000,

    // Setup files
    setupFiles: ['tests/e2e/security/setup.ts'],

    // Include glob patterns
    include: ['tests/**/*.test.ts'],

    // Reporter
    reporters: ['verbose'],

    // Coverage configuration (optional)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '.next/',
        'dist/',
      ],
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
