/**
 * Accessibility Testing Utilities
 *
 * Helper functions for testing accessibility compliance with jest-axe
 * Provides common patterns for WCAG 2.1 AA compliance testing
 *
 * @module utils/testA11y
 * @example
 * import { axe, toHaveNoViolations } from './utils/testA11y';
 * import { render } from '@testing-library/react';
 *
 * expect.extend(toHaveNoViolations);
 *
 * it('should have no accessibility violations', async () => {
 *   const { container } = render(<YourComponent />);
 *   const results = await axe(container);
 *   expect(results).toHaveNoViolations();
 * });
 */

import { axe as jestAxe, toHaveNoViolations } from 'jest-axe';

/**
 * axe accessibility testing function
 *
 * Runs the axe-core accessibility checker on a DOM element
 *
 * @param {HTMLElement} container - DOM container to test
 * @param {Object} [options] - axe-core configuration options
 * @returns {Promise<any>} axe results object with violations and passes
 *
 * @example
 * const { container } = render(<MyComponent />);
 * const results = await axe(container);
 * if (results.violations.length > 0) {
 *   console.log('A11y violations found:', results.violations);
 * }
 */
export const axe = jestAxe;

/**
 * Matcher for jest-axe results
 *
 * Use this to extend expect() with toHaveNoViolations() matcher
 *
 * @example
 * expect.extend(toHaveNoViolations);
 *
 * it('should have no violations', async () => {
 *   const results = await axe(container);
 *   expect(results).toHaveNoViolations();
 * });
 */
export const a11yMatchers = toHaveNoViolations;

/**
 * Common accessibility check configuration
 *
 * Recommended rules for WCAG 2.1 AA compliance
 */
export const a11yConfig = {
  // Check all rules
  rules: {
    // Lower severity issues that might be false positives
    'color-contrast': { enabled: true },
    'image-alt': { enabled: true },
    'label': { enabled: true },
    'aria-required-attr': { enabled: true },
    'button-name': { enabled: true }
  }
};

/**
 * Helper to run accessibility checks with common options
 *
 * @param {HTMLElement} container - DOM element to test
 * @param {Object} [customOptions] - Additional axe options to merge
 * @returns {Promise<any>} axe results
 *
 * @example
 * const results = await checkA11y(container, {
 *   rules: { 'color-contrast': { enabled: false } }
 * });
 */
export async function checkA11y(container, customOptions = {}) {
  const options = {
    ...a11yConfig,
    ...customOptions
  };

  return axe(container, options);
}

/**
 * Helper to check and report accessibility violations
 *
 * Useful for CI/CD pipelines to fail tests with detailed reports
 *
 * @param {HTMLElement} container - DOM element to test
 * @param {boolean} [throwOnViolations=true] - Throw error if violations found
 * @returns {Promise<Object>} Results object with violations and count
 *
 * @example
 * const results = await checkAccessibility(container);
 * console.log(`Found ${results.count} violations`);
 * results.violations.forEach(v => console.log(v.description));
 */
export async function checkAccessibility(container, throwOnViolations = true) {
  const results = await checkA11y(container);

  const violations = results.violations || [];
  const count = violations.length;

  if (count > 0 && throwOnViolations) {
    const messages = violations
      .map((v) => `${v.id}: ${v.description}`)
      .join('\n  ');

    throw new Error(`
Accessibility violations found (${count}):
  ${messages}
    `);
  }

  return {
    violations,
    count,
    passes: results.passes || []
  };
}

export default {
  axe,
  a11yMatchers,
  a11yConfig,
  checkA11y,
  checkAccessibility
};
