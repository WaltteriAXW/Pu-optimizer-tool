import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    environment: 'node',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**']
  }
});
