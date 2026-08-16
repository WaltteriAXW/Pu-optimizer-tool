import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import fs from 'fs'
import path from 'path'

// Files the Python runtime needs at runtime: the modules themselves, plus the
// material database CSV, which Pyodide reads from its virtual filesystem.
const isSyncedAsset = (name: string) => name.endsWith('.py') || name.endsWith('.csv')

// Custom plugin to sync Python files to the build folder and dev server
const pythonSyncPlugin = () => {
  return {
    name: 'python-sync',
    // Copy Python files to dist/python after build completes
    closeBundle() {
      const srcDir = path.resolve(__dirname, 'src')
      const destDir = path.resolve(__dirname, 'dist/python/src')

      const copyRecursive = (src: string, dest: string) => {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
        const entries = fs.readdirSync(src, { withFileTypes: true })
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name)
          const destPath = path.join(dest, entry.name)
          if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath)
          } else if (isSyncedAsset(entry.name)) {
            fs.copyFileSync(srcPath, destPath)
          }
        }
      }

      if (fs.existsSync(srcDir)) {
        copyRecursive(srcDir, destDir)
        console.log('[python-sync] Synced Python files to dist/python/src')
      }

      // Create .nojekyll file to prevent GitHub from ignoring files with underscores
      fs.writeFileSync(path.resolve(__dirname, 'dist/.nojekyll'), '')
      console.log('[python-sync] Created .nojekyll for GitHub Pages')

      // Create _config.yml to disable Jekyll processing entirely
      const configContent = `# GitHub Pages Jekyll configuration
# This disables Jekyll processing since we're using a pre-built Vite app

# Skip Jekyll build
skip_jekyll: true

# Exclude all files from processing
exclude:
  - '*'
  - '.*'

# Theme (use default minimal theme, but don't process anything)
theme: jekyll-theme-minimal

# Override any settings
collections:
  - name: null
`
      fs.writeFileSync(path.resolve(__dirname, 'dist/_config.yml'), configContent)
      console.log('[python-sync] Created _config.yml to disable Jekyll')
    },
    // Copy Python files to public/python during dev server startup
    configureServer() {
      const srcDir = path.resolve(__dirname, 'src')
      const publicDir = path.resolve(__dirname, 'public/python/src')

      const copyRecursive = (src: string, dest: string) => {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
        const entries = fs.readdirSync(src, { withFileTypes: true })

        for (const entry of entries) {
          const srcPath = path.join(src, entry.name)
          const destPath = path.join(dest, entry.name)

          if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath)
          } else if (isSyncedAsset(entry.name)) {
            fs.copyFileSync(srcPath, destPath)
          }
        }
      }

      if (fs.existsSync(srcDir)) {
        if (fs.existsSync(publicDir)) fs.rmSync(publicDir, { recursive: true, force: true })
        copyRecursive(srcDir, publicDir)
        console.log('[python-sync] Synced Python files to public/python/src')
      }
    },
    // Watch for changes in .py files during dev
    handleHotUpdate({ file }: { file: string }) {
      if (isSyncedAsset(file)) {
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
  // Set base URL for GitHub Pages deployment
  // Change '/Pu-optimizer-tool/' if your repository has a different name
  base: '/Pu-optimizer-tool/',

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
