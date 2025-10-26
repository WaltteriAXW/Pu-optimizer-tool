# Accessibility Guide

## Overview

Comprehensive guide for maintaining and improving accessibility (a11y) in the Polyurethane Injection Optimizer.

## Quick Reference

### Screen Reader Only Content

Use the `.sr-only` class for content that should only be announced to screen readers:

```jsx
<span className="sr-only">Temperature input:</span>
<input type="number" value={temperature} />
```

Add to your CSS:
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### Using Accessibility Utilities

```javascript
import {
  getInputAriaAttributes,
  getButtonAriaAttributes,
  announceToScreenReader
} from './utils/accessibility';

// For inputs
const inputAttrs = getInputAriaAttributes({
  label: 'Pipe Length',
  error: validationError,
  helpText: 'Length in millimeters',
  required: true
});

<input {...inputAttrs} />

// For buttons
const buttonAttrs = getButtonAriaAttributes({
  label: 'Calculate Parameters',
  loading: isCalculating,
  disabled: hasErrors
});

<button {...buttonAttrs}>Calculate</button>

// Announce to screen readers
announceToScreenReader('Calculation complete', 'polite');
```

## WCAG 2.1 Compliance Checklist

### Level A (Must Have)

- [ ] **1.1.1 Non-text Content**: All images have alt text
- [ ] **1.3.1 Info and Relationships**: Proper semantic HTML
- [ ] **1.4.1 Use of Color**: Don't rely solely on color
- [ ] **2.1.1 Keyboard**: All functionality via keyboard
- [ ] **2.4.1 Bypass Blocks**: Skip navigation links
- [ ] **3.1.1 Language**: HTML lang attribute set
- [ ] **4.1.1 Parsing**: Valid HTML
- [ ] **4.1.2 Name, Role, Value**: Proper ARIA labels

### Level AA (Should Have)

- [ ] **1.4.3 Contrast**: 4.5:1 text contrast ratio
- [ ] **2.4.6 Headings and Labels**: Descriptive labels
- [ ] **3.2.3 Consistent Navigation**: Consistent UI
- [ ] **3.3.1 Error Identification**: Clear error messages
- [ ] **3.3.2 Labels or Instructions**: Form labels present

### Level AAA (Nice to Have)

- [ ] **1.4.6 Contrast (Enhanced)**: 7:1 contrast ratio
- [ ] **2.4.9 Link Purpose**: Clear link text
- [ ] **3.3.5 Help**: Context-sensitive help

## Common Patterns

### Form Inputs

```jsx
import { getInputAriaAttributes } from './utils/accessibility';

const InputField = ({ label, value, onChange, error, helpText, required }) => {
  const attrs = getInputAriaAttributes({
    label,
    error,
    helpText,
    required
  });

  return (
    <div className="form-field">
      <label htmlFor={attrs.id}>
        {label}
        {required && <span aria-label="required">*</span>}
      </label>

      {helpText && (
        <p id={`${attrs.id}-help`} className="help-text">
          {helpText}
        </p>
      )}

      <input
        {...attrs}
        type="number"
        value={value}
        onChange={onChange}
      />

      {error && (
        <p id={`${attrs.id}-error`} className="error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
```

### Buttons

```jsx
import { getButtonAriaAttributes } from './utils/accessibility';

const LoadingButton = ({ onClick, loading, disabled, children }) => {
  const attrs = getButtonAriaAttributes({
    label: typeof children === 'string' ? children : 'Button',
    loading,
    disabled
  });

  return (
    <button
      {...attrs}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && (
        <span role="status" aria-live="polite">
          <span className="sr-only">Loading...</span>
          <LoadingSpinner />
        </span>
      )}
      {children}
    </button>
  );
};
```

### Alerts and Notifications

```jsx
import { getAlertAriaAttributes } from './utils/accessibility';

const Alert = ({ type, message }) => {
  const attrs = getAlertAriaAttributes(type, message);

  return (
    <div {...attrs} className={`alert alert-${type}`}>
      <Icon type={type} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
};
```

### Loading States

```jsx
import { getLoadingAriaAttributes } from './utils/accessibility';

const LoadingIndicator = ({ message = 'Loading...' }) => {
  const attrs = getLoadingAriaAttributes(message);

  return (
    <div {...attrs} className="loading">
      <Spinner aria-hidden="true" />
      <span className="sr-only">{message}</span>
    </div>
  );
};
```

### Progress Indicators

```jsx
import { getProgressAriaAttributes } from './utils/accessibility';

const ProgressBar = ({ value, max = 100, label }) => {
  const attrs = getProgressAriaAttributes(value, max, label);

  return (
    <div className="progress-container">
      <div {...attrs} className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
      <span className="sr-only">
        {label || `${Math.round((value / max) * 100)}% complete`}
      </span>
    </div>
  );
};
```

### Modals/Dialogs

```jsx
import { getDialogAriaAttributes, KeyboardNav } from './utils/accessibility';
import { useEffect, useRef } from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef();

  useEffect(() => {
    if (!isOpen) return;

    const cleanup = KeyboardNav.trapFocus(modalRef.current);

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      cleanup();
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const attrs = getDialogAriaAttributes(title, 'modal-description');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        {...attrs}
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title">{title}</h2>
        <div id="modal-description">{children}</div>
        <button onClick={onClose} aria-label="Close modal">
          Close
        </button>
      </div>
    </div>
  );
};
```

## Keyboard Navigation

### Required Keyboard Support

| Element | Keys | Action |
|---------|------|--------|
| Button | Enter, Space | Activate |
| Link | Enter | Navigate |
| Input | Tab, Shift+Tab | Focus |
| Select | Arrow Up/Down | Navigate options |
| Modal | Escape | Close |
| Tabs | Arrow Left/Right | Switch tabs |

### Implementation Example

```jsx
const handleKeyDown = (event) => {
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault();
      handleClick();
      break;
    case 'Escape':
      handleClose();
      break;
    default:
      break;
  }
};

<div
  role="button"
  tabIndex={0}
  onKeyDown={handleKeyDown}
  onClick={handleClick}
>
  Click me
</div>
```

## Focus Management

### Managing Focus on Navigation

```jsx
const navigateToResults = () => {
  // Navigate to results
  setActiveView('results');

  // Focus the first heading in results
  setTimeout(() => {
    document.getElementById('results-heading')?.focus();
  }, 0);
};
```

### Focus Trap for Modals

```jsx
import { KeyboardNav } from './utils/accessibility';

useEffect(() => {
  if (!modalOpen) return;

  const cleanup = KeyboardNav.trapFocus(modalElement);
  return cleanup;
}, [modalOpen]);
```

## Screen Reader Announcements

### Announce Important Changes

```jsx
import { announceToScreenReader } from './utils/accessibility';

// After calculation completes
useEffect(() => {
  if (results) {
    announceToScreenReader(
      `Calculation complete. Required pressure: ${results.pressure} bar`,
      'polite'
    );
  }
}, [results]);

// For errors
useEffect(() => {
  if (error) {
    announceToScreenReader(
      `Error: ${error}`,
      'assertive'
    );
  }
}, [error]);
```

## Testing Accessibility

### Automated Testing

```bash
# Install axe-core
npm install --save-dev @axe-core/react

# Use in tests
import { axe } from 'jest-axe';

test('should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Manual Testing Checklist

- [ ] **Keyboard Only**: Navigate entire app using only keyboard
- [ ] **Screen Reader**: Test with NVDA (Windows) or VoiceOver (Mac)
- [ ] **Zoom**: Test at 200% zoom
- [ ] **High Contrast**: Test with high contrast mode
- [ ] **Color Blindness**: Test with color blindness simulators
- [ ] **Focus Visible**: Ensure focus indicators are visible
- [ ] **Tab Order**: Logical tab order throughout

### Tools

1. **Browser Extensions**
   - [axe DevTools](https://www.deque.com/axe/devtools/)
   - [WAVE](https://wave.webaim.org/extension/)
   - [Lighthouse](https://developers.google.com/web/tools/lighthouse)

2. **Screen Readers**
   - Windows: [NVDA](https://www.nvaccess.org/)
   - Mac: VoiceOver (built-in)
   - Linux: Orca

3. **Color Contrast Checkers**
   - [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
   - [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)

## Common Mistakes to Avoid

### ❌ DON'T

```jsx
// Don't use divs as buttons
<div onClick={handleClick}>Click me</div>

// Don't forget alt text
<img src="chart.png" />

// Don't rely on color alone
<span style={{color: 'red'}}>Error</span>

// Don't use placeholder as label
<input placeholder="Enter name" />
```

### ✅ DO

```jsx
// Use proper button element
<button onClick={handleClick}>Click me</button>

// Provide meaningful alt text
<img src="chart.png" alt="Pressure distribution chart" />

// Use icons AND text
<span className="error">
  <ErrorIcon aria-hidden="true" />
  Error: Invalid input
</span>

// Use proper labels
<label htmlFor="name-input">Name</label>
<input id="name-input" placeholder="e.g., John Smith" />
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM](https://webaim.org/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

---

**Status**: ✅ Accessibility utilities ready
**WCAG Level**: Targeting AA compliance
**Priority**: High - Accessibility is essential
