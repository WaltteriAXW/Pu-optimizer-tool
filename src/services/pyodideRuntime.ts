/**
 * Where the browser loads the Pyodide runtime from: the app's own origin.
 *
 * The build copies the runtime out of node_modules/pyodide into `pyodide/` next to the app
 * (see vite.config.ts), so the service worker can precache it and the engine starts with no
 * connection. Optional packages (scikit-learn) are not in the npm package: the copied lock file
 * points them at the CDN for the same release, and the service worker keeps each one after its
 * first download.
 */
export const PYODIDE_INDEX_URL = `${import.meta.env.BASE_URL}pyodide/`

