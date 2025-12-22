import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import fs from 'fs'
import path from 'path'

// Custom plugin to sync Python files to public/python
const pythonSyncPlugin = () => {
  return {
    name: 'python-sync',
    buildStart() {
      const srcDir = path.resolve(__dirname, 'src')
      const publicDir = path.resolve(__dirname, 'public/python/src')

      // Helper to copy directory recursively
      const copyRecursive = (src: string, dest: string) => {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
        const entries = fs.readdirSync(src, { withFileTypes: true })

        for (const entry of entries) {
          const srcPath = path.join(src, entry.name)
          const destPath = path.join(dest, entry.name)

          if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath)
          } else if (entry.name.endsWith('.py')) {
            fs.copyFileSync(srcPath, destPath)
          }
        }
      }

      // Run copy
      if (fs.existsSync(srcDir)) {
        // Clear destination first to avoid stale files
        if (fs.existsSync(publicDir)) fs.rmSync(publicDir, { recursive: true, force: true })
        copyRecursive(srcDir, publicDir)
        console.log('[python-sync] Synced Python files to public/python/src')
      }
    },
    // Watch for changes in .py files during dev
    handleHotUpdate({ file }: { file: string }) {
      if (file.endsWith('.py')) {
        const srcDir = path.resolve(__dirname, 'src')
        if (file.startsWith(srcDir)) {
          const relativePath = path.relative(srcDir, file)
          const publicPath = path.resolve(__dirname, 'public/python/src', relativePath)
          const publicDirPath = path.dirname(publicPath)

          if (!fs.existsSync(publicDirPath)) fs.mkdirSync(publicDirPath, { recursive: true })
          fs.copyFileSync(file, publicPath)
          console.log(`[python-sync] Updated: ${relativePath}`)
        }
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), pythonSyncPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
    headers: {
      // Required for Pyodide (SharedArrayBuffer)
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      external: ['node-fetch', 'fs', 'path'],
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'pyodide-vendor': ['pyodide'],
        },
      },
    },
  },
})
