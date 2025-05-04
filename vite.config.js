import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: '/Pu-optimizer-tool/', // GitHub Pages repository name
  build: {
    outDir: 'dist',
    sourcemap: true, // Add source maps for better debugging
  },
});
