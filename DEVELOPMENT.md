# Development Guide

This document serves as the central reference for developers working on the Polyurethane Injection Optimizer.

## Quick Navigation

- **[README.md](./README.md)** - Project overview and features
- **[IMPROVEMENTS.md](./IMPROVEMENTS.md)** - All enhancements and features added
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - How to run tests and test coverage
- **[ACCESSIBILITY_GUIDE.md](./ACCESSIBILITY_GUIDE.md)** - Accessibility standards and guidelines
- **[LOGGING_GUIDE.md](./LOGGING_GUIDE.md)** - Error tracking and logging
- **[MACHINE_SYSTEM_DOCUMENTATION.md](./MACHINE_SYSTEM_DOCUMENTATION.md)** - System architecture
- **[DATABASE_INTEGRATION.md](./DATABASE_INTEGRATION.md)** - Database schema and integration
- **[ML_FEATURES.md](./ML_FEATURES.md)** - Machine learning models and insights
- **[JSDOC_GUIDE.md](./JSDOC_GUIDE.md)** - Documentation standards
- **[REDUCER_MIGRATION_GUIDE.md](./REDUCER_MIGRATION_GUIDE.md)** - State management patterns
- **[CONSTANTS_USAGE_EXAMPLES.md](./CONSTANTS_USAGE_EXAMPLES.md)** - Configuration constants
- **[COMPREHENSIVE_UI_FEATURES.md](./COMPREHENSIVE_UI_FEATURES.md)** - UI component features

## Architecture Overview

### Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS 3
- **Visualization**: Three.js (3D), Recharts (2D charts)
- **Build Tool**: Vite 7
- **Calculation Engine**: Python via Pyodide (WASM)
- **State Management**: React hooks with reducer pattern
- **Testing**: Vitest + Testing Library

### Project Structure

```
src/
├── components/              # React components
│   ├── shared/             # Reusable form components
│   ├── FormInputsSection.jsx
│   ├── MoldVisualization3D.jsx
│   ├── MoldDimensionsSection.jsx
│   └── ...
├── hooks/                  # Custom React hooks
│   ├── useCalculatorState.js
│   └── useDebounce.ts
├── reducers/               # State management
│   └── calculatorReducer.js
├── utils/                  # Business logic
│   ├── calculationHelpers.js
│   ├── warningGenerator.js
│   ├── mlInsights.js
│   └── errorTracking.js
├── config/                 # Configuration
│   ├── materialPresets.js
│   └── machineSpecs.js
├── polyurethane_optimizer_component.jsx  # Main component
├── index.css               # Global styles (Tailwind + animations)
└── ...
```

## UI/UX Principles

The application follows **modern industrial UI/UX design principles**:

### Core Values
- **Information Hierarchy Over Decoration**: Colors and borders guide attention to critical data
- **Reliability as Design**: Instant visual feedback, predictable behavior
- **Accessibility Under Real Conditions**: High contrast, large touch targets (48x48px minimum), readable fonts
- **Color with Purpose**: Red=critical, Amber=warning, Green=success, Gray=neutral
- **Dark Backgrounds**: Reduces eye strain in industrial environments
- **Purposeful Animations**: Only functional animations (fadeIn, slideUp, pulse, shimmer, rotate)

### Key Design Decisions

1. **Solid Colors Over Gradients**: Use semantic colors for clear state communication
2. **Minimal Animations**: Only 100-300ms transitions for feedback
3. **Border Accents**: 4px left borders for section hierarchy
4. **Clear Typography**: Bold titles, proper contrast ratios
5. **No Decorative Effects**: Remove hover:scale, 3D effects, bouncing animations

## Development Workflow

### 1. Setup
```bash
npm install
npm run dev
```

### 2. Code Style

- Use TypeScript for type safety
- Follow JSDoc comments for functions
- Use semantic HTML and accessibility attributes
- Use Tailwind utility classes for styling
- Keep components under 200 lines when possible

### 3. Testing

```bash
npm run test                # Run all tests
npm run test:ui             # Interactive test UI
npm run test:coverage       # Coverage report
```

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for detailed testing practices.

### 4. Building

```bash
npm run build               # Production build
npm run deploy              # Deploy to GitHub Pages
```

## State Management

The application uses a reducer pattern (see [REDUCER_MIGRATION_GUIDE.md](./REDUCER_MIGRATION_GUIDE.md)):

```javascript
// Custom hook for state management
const { state, dispatch } = useCalculatorState();

// Dispatch actions
dispatch({ type: 'SET_INPUT_VALUE', payload: { key, value } });
dispatch({ type: 'SET_RESULTS', payload: results });
dispatch({ type: 'SET_ERROR', payload: error });
```

Actions include:
- `SET_INPUT_VALUE` - Update form input
- `SET_RESULTS` - Set calculation results
- `SET_ERROR` - Set error state
- `SET_VIEW_MODE` - Toggle simple/advanced view
- `SET_LOADING` - Set loading state

## Configuration

### Material Presets
Defined in `src/config/materialPresets.js`:
- Ecofoam Standard
- Ecofoam XHD RC
- Ecomate Spray EC

### Machine Specifications
Defined in `src/config/machineSpecs.js`:
- Cannon A-System series
- AMA Gusberti series
- SAIP series
- ISC Italy series

See [CONSTANTS_USAGE_EXAMPLES.md](./CONSTANTS_USAGE_EXAMPLES.md) for usage examples.

## Calculation Engine

Python calculations run in the browser via Pyodide (WebAssembly):

1. Unit conversion (display → SI)
2. Viscosity calculations (Arrhenius + Power Law)
3. Pressure drop (Modified Hagen-Poiseuille)
4. Reynolds number calculation
5. Flow regime determination
6. Warning generation

See [IMPROVEMENTS.md](./IMPROVEMENTS.md) for calculation details.

## Error Handling

The application uses specialized error boundaries and error tracking:

- `error_boundary.jsx` - Generic error boundary
- `specialized_error_boundaries.jsx` - Python/calculation errors
- `errorTracking.js` - Logging system with levels (info, warn, error, debug)

See [LOGGING_GUIDE.md](./LOGGING_GUIDE.md) for logging practices.

## Accessibility

All components follow WCAG 2.1 Level AA standards:

- Semantic HTML
- ARIA labels where needed
- Keyboard navigation support
- Color contrast ratios > 4.5:1
- Touch targets ≥ 48x48px
- Focus indicators (3px blue outline)

See [ACCESSIBILITY_GUIDE.md](./ACCESSIBILITY_GUIDE.md) for detailed guidelines.

## Testing Standards

- Unit tests for utilities and hooks
- Component tests with Testing Library
- Integration tests for workflows
- At least 70% code coverage target

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for testing practices.

## Git Workflow

1. Create feature branch: `git checkout -b feature-name`
2. Commit with clear messages: `git commit -m "Description of changes"`
3. Push to remote: `git push origin feature-name`
4. Create pull request on GitHub
5. Merge when approved and CI passes

**Important**: Branch names starting with `claude/` are for AI-assisted development and should match the session ID format.

## Performance Optimization

- Debounce input changes (prevents excessive calculations)
- Memoize expensive calculations with `useMemo`
- Use React.memo for component memoization
- Lazy load 3D visualization
- Manual chunk splitting in Vite for caching

## Common Tasks

### Adding a New Material Preset
1. Add to `src/config/materialPresets.js`
2. Include: density, viscosity, flow index, activation energy
3. Add tests in `materialsPresets.test.js`

### Adding a New Machine Specification
1. Add to `src/config/machineSpecs.js`
2. Include: name, manufacturer, output range, max pressure, tank capacity
3. Update `MACHINE_SYSTEM_DOCUMENTATION.md`

### Updating Calculation Logic
1. Modify `src/utils/calculationHelpers.js`
2. Update corresponding tests
3. Document changes in `IMPROVEMENTS.md`

### Adding a New Feature
1. Create component in `src/components/`
2. Add tests alongside
3. Integrate with state management in `useCalculatorState`
4. Update `COMPREHENSIVE_UI_FEATURES.md`

## Troubleshooting

### Calculation Errors
- Check input parameter ranges in `validation.js`
- Review calculation logic in `calculationHelpers.js`
- Check Python error logs in browser console

### Python Environment Errors
- Refresh page to reinitialize Pyodide
- Check browser WebAssembly support
- See `pyodide_loader.ts` for initialization

### Performance Issues
- Check for unnecessary re-renders with React DevTools
- Review debounce delays in `UI_CONFIG`
- Check bundle size: `npm run build`

### Test Failures
- Run tests with `npm run test:ui` for debugging
- Check test files for setup requirements
- Review test documentation

## Related Documentation

- Physics/Math: See [IMPROVEMENTS.md](./IMPROVEMENTS.md)
- Database Schema: See [DATABASE_INTEGRATION.md](./DATABASE_INTEGRATION.md)
- Machine Learning: See [ML_FEATURES.md](./ML_FEATURES.md)
- Code Standards: See [JSDOC_GUIDE.md](./JSDOC_GUIDE.md)

## Questions?

Refer to the specific documentation files linked above or review the source code comments.
