import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import fs from 'fs'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import { pyodideCdnUrl } from './src/services/pyodideCdnUrl'

// Files the Python runtime needs at runtime: the modules themselves, plus the
// material database CSV, which Pyodide reads from its virtual filesystem.
const isSyncedAsset = (name: string) => name.endsWith('.py') || name.endsWith('.csv')

// Custom plugin to sync Python files to the build folder and dev server
const pythonSyncPlugin = () => {
  return {
    name: 'python-sync',
    // Copy Python files to dist/python once the bundle is written. writeBundle, not
    // closeBundle: the service worker is generated in closeBundle and must see these files
    // to precache them.
    writeBundle() {
      const srcDir = path.resolve(__dirname, 'src')
      const destDir = path.resolve(__dirname, 'dist/python/src')

      const copyRecursive = (src: string, dest: string) => {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
        const entries = fs.readdirSync(src, { withFileTypes: true })
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name)
          const destPath = path.join(dest, entry.name)
          if (entry.isDirectory()) {
            // __pycache__ holds compiled bytecode from running the tests locally. It is
            // gitignored, so it shipped whatever happened to be on the machine that built —
            // and it kept deleted modules alive in the output after their sources were gone.
            if (entry.name === '__pycache__') continue
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
            // __pycache__ holds compiled bytecode from running the tests locally. It is
            // gitignored, so it shipped whatever happened to be on the machine that built —
            // and it kept deleted modules alive in the output after their sources were gone.
            if (entry.name === '__pycache__') continue
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

// The Pyodide runtime, served from the app's own origin so the service worker can precache it
// and the engine starts offline. Copied from the installed npm package, so the runtime always
// matches the `loadPyodide` the app bundles.
const PYODIDE_DIR = path.resolve(__dirname, 'node_modules/pyodide')
const PYODIDE_FILES = ['pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']
const pyodideVersion = JSON.parse(
  fs.readFileSync(path.join(PYODIDE_DIR, 'package.json'), 'utf-8')
).version
const PYODIDE_PACKAGE_CDN = pyodideCdnUrl(pyodideVersion)

/**
 * One runtime file's contents. The npm package carries no package wheels, so the lock file is
 * rewritten to point each wheel at the CDN for the same release: loadPackage('scikit-learn')
 * still works, and the service worker keeps each wheel after its first download.
 */
const pyodideFile = (name: string): Buffer => {
  const data = fs.readFileSync(path.join(PYODIDE_DIR, name))
  if (name !== 'pyodide-lock.json') return data
  const lock = JSON.parse(data.toString('utf-8'))
  for (const pkg of Object.values(lock.packages) as Array<{ file_name: string }>) {
    pkg.file_name = new URL(pkg.file_name, PYODIDE_PACKAGE_CDN).toString()
  }
  return Buffer.from(JSON.stringify(lock))
}

const PYODIDE_TYPES: Record<string, string> = {
  '.js': 'text/javascript',
  '.wasm': 'application/wasm',
  '.zip': 'application/zip',
  '.json': 'application/json',
}

const pyodideRuntimePlugin = () => ({
  name: 'pyodide-runtime',
  writeBundle() {
    const dest = path.resolve(__dirname, 'dist/pyodide')
    fs.mkdirSync(dest, { recursive: true })
    for (const name of PYODIDE_FILES) fs.writeFileSync(path.join(dest, name), pyodideFile(name))
    console.log(`[pyodide-runtime] Copied Pyodide ${pyodideVersion} to dist/pyodide`)
  },
  configureServer(server: import('vite').ViteDevServer) {
    const prefix = `${server.config.base}pyodide/`
    server.middlewares.use((req, res, next) => {
      const url = req.url?.split('?')[0] ?? ''
      if (!url.startsWith(prefix)) return next()
      const name = url.slice(prefix.length)
      if (!PYODIDE_FILES.includes(name)) return next()
      res.setHeader('Content-Type', PYODIDE_TYPES[path.extname(name)] ?? 'application/octet-stream')
      res.end(pyodideFile(name))
    })
  },
})

// Pyodide's loader has a Node-only `import("node-fetch")` that never runs in a browser.
// node-fetch is not installed, so the dev server could not resolve it and `npm run dev`
// crashed on startup. In dev, Pyodide is left out of pre-bundling (optimizeDeps below) and
// node-fetch resolves to an empty module; the production build already lists it under
// rollupOptions.external.
const NODE_FETCH_STUB = '\0node-fetch-stub'
const nodeFetchStubPlugin = () => ({
  name: 'node-fetch-stub',
  apply: 'serve' as const,
  enforce: 'pre' as const,
  resolveId: (id: string) => (id === 'node-fetch' ? NODE_FETCH_STUB : null),
  load: (id: string) => (id === NODE_FETCH_STUB ? 'export default undefined' : null),
})

// The version shown in generated reports. Read from package.json so there is one number
// rather than three: the PDF used to print "v2.1.0-alpha" in its header and "v2.1.0" in
// its footer while package.json said 2.0.0, and nothing kept the three in step.
const packageVersion = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
).version

export default defineConfig({
  // Set base URL for GitHub Pages deployment
  // Change '/Pu-optimizer-tool/' if your repository has a different name
  base: '/Pu-optimizer-tool/',

  define: {
    __APP_VERSION__: JSON.stringify(packageVersion),
  },

  plugins: [
    react(),
    nodeFetchStubPlugin(),
    pythonSyncPlugin(),
    pyodideRuntimePlugin(),
    // Service worker: precaches the app, the Python modules, the user guide and the Pyodide
    // runtime, so everything works offline after the first load. A new deploy is picked up on
    // the next load and old caches are cleared.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      manifest: false,
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,svg,woff2,webp}',
          'python/**/*.{py,csv}',
          'pyodide/*.{js,wasm,zip,json}',
        ],
        // The Pyodide runtime files are about 9 MB each
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // Take over the open page as soon as the cache is ready, so the first visit already
        // works offline, and let a new deploy replace the old worker without waiting
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Optional package wheels (scikit-learn and its dependencies), fetched on first use
            urlPattern: ({ url }) => url.href.startsWith(PYODIDE_PACKAGE_CDN),
            handler: 'CacheFirst',
            options: {
              cacheName: `pyodide-packages-${pyodideVersion}`,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  // See nodeFetchStubPlugin
  optimizeDeps: {
    exclude: ['pyodide'],
  },
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
