/**
 * Accessibility Utilities Module
 *
 * @module accessibility
 * @description Helper functions and utilities for improving web accessibility (a11y).
 * Provides ARIA attributes, screen reader announcements, keyboard navigation,
 * and focus management utilities to help meet WCAG 2.1 Level AA compliance.
 *
 * @example
 * import {
 *   getInputAriaAttributes,
 *   announceToScreenReader,
 *   KeyboardNav
 * } from './utils/accessibility';
 *
 * // Add ARIA attributes to input
 * const attrs = getInputAriaAttributes({
 *   label: 'Pipe Length',
 *   error: validationError,
 *   required: true
 * });
 * <input {...attrs} />
 *
 * // Announce to screen readers
 * announceToScreenReader('Calculation complete', 'polite');
 */

/**
 * Internal counter for unique ID generation
 * @private
 * @type {number}
 */
let idCounter = 0;

/**
 * Generate a unique ID for form elements
 *
 * Creates collision-free IDs by combining a prefix, incrementing counter,
 * and timestamp. Useful for dynamically generated form elements.
 *
 * @param {string} [prefix='id'] - Prefix for the ID
 * @returns {string} Unique ID in format "prefix-counter-timestamp"
 *
 * @example
 * generateId('input')  // "input-1-1704067200000"
 * generateId('error')  // "error-2-1704067200001"
 */
export function generateId(prefix = 'id') {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now()}`;
}

/**
 * Get ARIA attributes for an input field
 * @param {Object} options - Configuration options
 * @param {string} options.label - Label text
 * @param {string} options.error - Error message
 * @param {string} options.helpText - Help text
 * @param {boolean} options.required - Whether field is required
 * @param {boolean} options.disabled - Whether field is disabled
 * @param {string} options.id - Custom ID (optional)
 * @returns {Object} ARIA attributes
 */
export function getInputAriaAttributes({
  label,
  error,
  helpText,
  required = false,
  disabled = false,
  id
}) {
  const inputId = id || generateId('input');
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;

  const attributes = {
    id: inputId,
    'aria-label': label,
    'aria-required': required,
    'aria-disabled': disabled
  };

  if (error) {
    attributes['aria-invalid'] = 'true';
    attributes['aria-describedby'] = errorId;
  } else if (helpText) {
    attributes['aria-describedby'] = helpId;
  }

  return attributes;
}

/**
 * Get ARIA attributes for a button
 * @param {Object} options - Configuration options
 * @param {string} options.label - Button label
 * @param {boolean} options.disabled - Whether button is disabled
 * @param {boolean} options.loading - Whether button is in loading state
 * @param {boolean} options.pressed - Whether button is pressed (toggle)
 * @returns {Object} ARIA attributes
 */
export function getButtonAriaAttributes({
  label,
  disabled = false,
  loading = false,
  pressed
}) {
  const attributes = {
    'aria-label': label,
    'aria-disabled': disabled || loading
  };

  if (loading) {
    attributes['aria-busy'] = 'true';
  }

  if (pressed !== undefined) {
    attributes['aria-pressed'] = pressed;
  }

  return attributes;
}

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - Priority level ('polite' or 'assertive')
 */
export function announceToScreenReader(message, priority = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Get ARIA attributes for a loading indicator
 * @param {string} message - Loading message
 * @returns {Object} ARIA attributes
 */
export function getLoadingAriaAttributes(message = 'Loading...') {
  return {
    role: 'status',
    'aria-live': 'polite',
    'aria-busy': 'true',
    'aria-label': message
  };
}

/**
 * Get ARIA attributes for an alert/notification
 * @param {string} type - Alert type ('error', 'warning', 'info', 'success')
 * @param {string} message - Alert message
 * @returns {Object} ARIA attributes
 */
export function getAlertAriaAttributes(type, message) {
  const roleMap = {
    error: 'alert',
    warning: 'alert',
    info: 'status',
    success: 'status'
  };

  return {
    role: roleMap[type] || 'status',
    'aria-live': type === 'error' ? 'assertive' : 'polite',
    'aria-atomic': 'true',
    'aria-label': `${type}: ${message}`
  };
}

/**
 * Get ARIA attributes for a progress indicator
 * @param {number} value - Current value
 * @param {number} max - Maximum value
 * @param {string} label - Progress label
 * @returns {Object} ARIA attributes
 */
export function getProgressAriaAttributes(value, max = 100, label) {
  return {
    role: 'progressbar',
    'aria-valuenow': value,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-label': label || `${Math.round((value / max) * 100)}% complete`
  };
}

/**
 * Get ARIA attributes for a dialog/modal
 * @param {string} label - Dialog label
 * @param {string} describedBy - ID of description element
 * @returns {Object} ARIA attributes
 */
export function getDialogAriaAttributes(label, describedBy) {
  const attributes = {
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': label
  };

  if (describedBy) {
    attributes['aria-describedby'] = describedBy;
  }

  return attributes;
}

/**
 * Get ARIA attributes for tabs
 * @param {Object} options - Configuration
 * @param {number} options.index - Tab index
 * @param {boolean} options.selected - Whether tab is selected
 * @param {string} options.controls - ID of tab panel
 * @returns {Object} ARIA attributes
 */
export function getTabAriaAttributes({ index, selected, controls }) {
  return {
    role: 'tab',
    'aria-selected': selected,
    'aria-controls': controls,
    tabIndex: selected ? 0 : -1,
    id: `tab-${index}`
  };
}

/**
 * Get ARIA attributes for tab panel
 * @param {Object} options - Configuration
 * @param {number} options.index - Panel index
 * @param {boolean} options.hidden - Whether panel is hidden
 * @returns {Object} ARIA attributes
 */
export function getTabPanelAriaAttributes({ index, hidden }) {
  return {
    role: 'tabpanel',
    'aria-labelledby': `tab-${index}`,
    hidden,
    id: `tabpanel-${index}`,
    tabIndex: 0
  };
}

/**
 * Keyboard navigation utilities
 */
export const KeyboardNav = {
  KEYS: {
    ENTER: 'Enter',
    SPACE: ' ',
    ESCAPE: 'Escape',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    TAB: 'Tab',
    HOME: 'Home',
    END: 'End'
  },

  /**
   * Handle keyboard navigation for a list
   * @param {KeyboardEvent} event - Keyboard event
   * @param {Array} items - List of items
   * @param {number} currentIndex - Current focused index
   * @param {Function} onSelect - Callback when item selected
   * @returns {number} New index
   */
  handleListNav(event, items, currentIndex, onSelect) {
    const { key } = event;
    let newIndex = currentIndex;

    switch (key) {
      case this.KEYS.ARROW_DOWN:
        event.preventDefault();
        newIndex = Math.min(currentIndex + 1, items.length - 1);
        break;

      case this.KEYS.ARROW_UP:
        event.preventDefault();
        newIndex = Math.max(currentIndex - 1, 0);
        break;

      case this.KEYS.HOME:
        event.preventDefault();
        newIndex = 0;
        break;

      case this.KEYS.END:
        event.preventDefault();
        newIndex = items.length - 1;
        break;

      case this.KEYS.ENTER:
      case this.KEYS.SPACE:
        event.preventDefault();
        if (onSelect) onSelect(items[currentIndex]);
        break;

      default:
        break;
    }

    return newIndex;
  },

  /**
   * Trap focus within an element
   * @param {HTMLElement} element - Container element
   */
  trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    function handleTabKey(event) {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    }

    element.addEventListener('keydown', handleTabKey);

    // Return cleanup function
    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  }
};

/**
 * Create visually hidden element (screen reader only)
 * @param {string} text - Text content
 * @returns {HTMLElement} Screen reader only element
 */
export function createSROnly(text) {
  const element = document.createElement('span');
  element.className = 'sr-only';
  element.textContent = text;
  return element;
}

/**
 * Check if element is focusable
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} Whether element is focusable
 */
export function isFocusable(element) {
  if (!element || element.disabled) return false;

  const tabIndex = element.getAttribute('tabindex');
  if (tabIndex !== null && parseInt(tabIndex, 10) < 0) return false;

  const focusableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
  return focusableTags.includes(element.tagName);
}

export default {
  generateId,
  getInputAriaAttributes,
  getButtonAriaAttributes,
  announceToScreenReader,
  getLoadingAriaAttributes,
  getAlertAriaAttributes,
  getProgressAriaAttributes,
  getDialogAriaAttributes,
  getTabAriaAttributes,
  getTabPanelAriaAttributes,
  KeyboardNav,
  createSROnly,
  isFocusable
};
