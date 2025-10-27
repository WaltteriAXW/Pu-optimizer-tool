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
    outDir: 'docs',
    sourcemap: true, // Add source maps for better debugging
    chunkSizeWarningLimit: 600, // Increase threshold slightly for better UX
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching and load performance
        manualChunks: {
          // React core (changes infrequently)
          'react-vendor': ['react', 'react-dom'],
          // Chart library (large, used only in results)
          'charts': ['recharts'],
          // Icon library (large, used throughout)
          'icons': ['lucide-react'],
          // Pyodide stays separate (already excluded from deps)
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['pyodide'],
  },
});
