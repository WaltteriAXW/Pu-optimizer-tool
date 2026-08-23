import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';

const packageVersion = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8')
).version;

export default defineConfig({
  // Mirrors the define in vite.config.ts, so anything importing the report generator
  // resolves the same version constant under test as it does in a build.
  define: {
    __APP_VERSION__: JSON.stringify(packageVersion),
  },
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
