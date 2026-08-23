/// <reference types="vite/client" />

/**
 * Application version, injected at build time from package.json by vite.config.ts.
 * Declared here so the generated report can quote a version without a second copy of
 * the number living in the source.
 */
declare const __APP_VERSION__: string
