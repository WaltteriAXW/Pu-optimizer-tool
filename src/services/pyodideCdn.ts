import { version as pyodideVersion } from 'pyodide'

/**
 * Where the browser loads the Pyodide runtime from.
 *
 * The version is taken from the installed `pyodide` package rather than written out. It used
 * to be spelled literally here and again in the end-to-end fixture that intercepts this URL
 * to serve the runtime out of node_modules. Had those two drifted, the suite would have gone
 * on testing the old runtime from disk and passed — a green suite proving nothing about the
 * Pyodide the application actually loads. One `npm install pyodide@x` now moves the app, the
 * interceptor and the served runtime together.
 *
 * `version` comes from the same module that provides `loadPyodide`, so the URL is derived
 * from the very package being loaded rather than from anything describing it.
 */
export const PYODIDE_CDN_URL = `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`
