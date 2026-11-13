/**
 * Where a given Pyodide release lives on the CDN.
 *
 * The runtime itself is served from the app's own origin (see pyodideRuntime.ts), so this is
 * only used for the optional packages that are not in the npm package, such as scikit-learn.
 * Kept free of imports so the build config and the test fixtures can use it too.
 */
export const pyodideCdnUrl = (version: string): string =>
  `https://cdn.jsdelivr.net/pyodide/v${version}/full/`
