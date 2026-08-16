import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    // Mirrors the alias in vite.config.ts. Without it the dynamic import of
    // '@/utils/database_loader' fails at runtime and material data silently never loads.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    environment: 'node',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**']
  }
});
