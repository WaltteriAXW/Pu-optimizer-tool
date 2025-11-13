# UI Components & Styling - Quick Reference Guide

## Key Files
- **Main Styles**: `/src/index.css` (109 lines)
- **Config**: `/tailwind.config.js`
- **Main Component**: `/src/polyurethane_optimizer_component.jsx` (2700+ lines)
- **UI Primitives**: `/src/{button,card,input,alert,slider_input}.jsx`

## Current Tech Stack
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.2.0 | Framework |
| Tailwind CSS | 3.3.3 | Styling |
| Lucide React | 0.263.1 | Icons (30+) |
| Recharts | 2.9.0 | Charts |
| Vite | 7.1.12 | Build tool |

## Built-in Animations
```
fadeIn:   0.3s ease-in (opacity)
slideIn:  0.4s ease-out (Y + opacity)
slideUp:  0.5s ease-out (Y + opacity)
pulse:    Continuous (opacity oscillation)
hover:    0.2s transitions on scale, color, shadow
```

## Color System
- **Light Mode**: Gray/Blue/Green/Red/Yellow/Purple/Indigo
- **Dark Mode**: Gray-800/900 with opacity variants (/20, /30, /50)
- **Gradients**: `to-r`, `to-br` directions with light/dark variants
- **Icons**: Color-coded by context (blue=default, green=success, red=error, yellow=warning)

## Responsive Breakpoints
- `sm`: 640px - Mobile devices
- `md`: 768px - Tablets
- `lg`: 1024px - Desktop
- `2xl`: 1400px - Extra large

## Key UI Patterns
1. **Card with gradient header** - Machine/Material/Results sections
2. **Collapsible sections** - Mold dimensions, mix ratio
3. **Dual-mode inputs** - Number input + slider
4. **Status-colored cards** - Success/warning/error states
5. **Info boxes** - Blue/green/yellow colored information
6. **Grid layout** - 1 col (mobile), 2 col (tablet), 3 col (desktop)

## Enhancement Opportunities
1. **Animations**: Stagger, bounce, shimmer, flip, glow effects
2. **Gradients**: Animated gradients, multi-color transitions
3. **Icons**: Animated icons, icon transitions, rotating loaders
4. **Polish**: Glassmorphism, neumorphism, parallax, custom cursors
5. **Responsive**: Better mobile menu, touch-friendly interactions

## Most Used Classes
```
// Spacing: p-4, px-3, py-2, gap-4, space-y-4
// Colors: text-blue-600, bg-blue-50, border-blue-200
// Shadows: shadow-md, shadow-lg, shadow-xl, shadow-inner
// Effects: rounded-lg, transition-all, hover:scale-105
// Grid: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
// Flex: flex items-center justify-between flex-wrap
// Dark: dark:bg-gray-800, dark:text-white, dark:border-gray-600
```

## Component Organization
```
src/
├── components/           # Feature sections
├── UI Primitives/        # button, card, input, alert, slider_input
├── hooks/                # useDebounce
├── utils/                # Calculations, ML, logging
├── reducers/             # State management
└── Main Entry Points/    # app_component, polyurethane_optimizer_component
```

## Visual Hierarchy
1. **Headers**: Gradient bg + Icons + Step numbers (1, 2, 3)
2. **Cards**: White/Gray-800 bg + colored left border + shadow
3. **Info Boxes**: Colored gradient bg + icon + left border
4. **Buttons**: Colored buttons with hover scale & shadow
5. **Results**: Status-colored cards with icons + animations

## Accessibility Features
- Focus states: Blue 2px outline with offset
- Semantic HTML: Proper heading hierarchy
- Dark mode: Proper contrast ratios
- Icons: Paired with text labels
- Forms: Proper label associations

## Dark Mode Implementation
- **Type**: CSS class-based (not media query)
- **Prefix**: `dark:` utility classes
- **Colors**: Gray-800/900 backgrounds, opacity modifiers
- **Pattern**: Every color has light + dark variant

## Design Principles
- **Professional**: Gradient backgrounds, clean lines
- **Accessible**: High contrast, keyboard friendly
- **Responsive**: Mobile-first, flexible layouts
- **Interactive**: Hover effects, smooth transitions
- **User-friendly**: Status indicators, help text, simple explanations

