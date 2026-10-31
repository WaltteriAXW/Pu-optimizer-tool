"""
Write src/theme.css from the Stone & Forest brand guide (v1.1).

    python3 scripts/generate_theme.py > src/theme.css

Only the guide's own colours are used: the six core colours, the light and dark tokens, and
the Increase Contrast variants. Each role below picks one of them per appearance. Tints (the
fill behind a warning or an error) are those colours at reduced opacity, as the guide's own
tinted buttons are, never a new hue.

Then run `npx vitest --run src/theme.test.ts`: it checks that every value is in the palette and
that every pairing the app uses meets WCAG AA in light, dark and Increase Contrast.
"""

# The palette, by the guide's names. Nothing else may appear in the app.
PALETTE = {
    # Core
    'Deep Forest': '1B3B2B',
    'Pale Limestone': 'F2EFE9',
    'Muted Sage': 'A3B19B',
    'Deep Obsidian': '0C0E0D',
    'Champagne Beige': 'E8DCCB',
    'Jade Mint': '5CE1A6',
    # Light tokens
    'Pure White': 'FFFFFF',
    'Pale Mist Green': 'E6ECE8',
    'Warm Stone': 'E2DDD5',
    'Charcoal Moss': '1C1D1A',
    'Olive Slate': '5C6058',
    'Clay Red': 'B23A2E',
    # Dark tokens
    'Dark Basalt': '161A18',
    'Deep Forest Fill': '1A2E26',
    'Muted Graphite': '262C29',
    'Frost': 'F4F6F5',
    'Lichen Grey': '9CA39E',
    'Ember Coral': 'FF7A66',
    # Increase Contrast variants
    'Olive Slate HC': '3F433C',
    'Muted Sage HC': '6E7D66',
    'Warm Stone HC': 'B9B2A6',
    'Lichen Grey HC': 'C4CAC6',
    'Muted Graphite HC': '4A524D',
}

# role: (light, dark, what it is for)
ROLES = {
    'canvas': ('Pale Limestone', 'Deep Obsidian', 'bg-primary: the page'),
    'surface': ('Pure White', 'Dark Basalt', 'bg-surface: cards, sheets, inputs'),
    'raised': ('Pure White', 'Muted Graphite', 'the chosen segment, raised on its track'),
    'track': ('Warm Stone', 'Deep Obsidian', 'segmented control and switch tracks'),
    'accent': ('Deep Forest', 'Champagne Beige', 'accent-primary: the one main action'),
    'on-accent': ('Pure White', 'Deep Obsidian', 'text-on-accent'),
    'highlight': ('Deep Forest', 'Jade Mint', 'accent text, active icons, success, the switch'),
    'accent-secondary': ('Muted Sage', 'Jade Mint', 'charts, progress; decorative in light'),
    'band': ('Muted Sage', 'Deep Forest Fill', 'the in-range band of a gauge, behind its marker'),
    'muted': ('Pale Mist Green', 'Deep Forest Fill', 'accent-muted: pills, selected rows, success fill'),
    'line': ('Warm Stone', 'Muted Graphite', 'border-subtle: dividers, card edges'),
    'line-strong': ('Warm Stone HC', 'Muted Graphite HC', 'input edges'),
    'ink': ('Charcoal Moss', 'Frost', 'text-primary'),
    'ink-2': ('Olive Slate', 'Lichen Grey', 'text-secondary'),
    'danger': ('Clay Red', 'Ember Coral', 'destructive: errors, delete'),
    'warn': ('Champagne Beige', 'Champagne Beige', 'warnings: fill and edge'),
    'warn-ink': ('Charcoal Moss', 'Champagne Beige', 'warning text and icons'),
    'scrim': ('Deep Obsidian', 'Deep Obsidian', 'backdrops and shadows, never pure black'),
    'knob': ('Pure White', 'Pure White', 'switch and slider knobs'),
}

# Opacity of the tinted fills and edges, per appearance
ALPHAS = {
    'warn-soft': (0.55, 0.12),
    'warn-line': (1, 0.4),
    'danger-soft': (0.08, 0.14),
    'danger-line': (0.35, 0.45),
}

HIGH_CONTRAST = {
    'light': {'ink-2': 'Olive Slate HC', 'line': 'Warm Stone HC', 'accent-secondary': 'Muted Sage HC'},
    'dark': {'ink-2': 'Lichen Grey HC', 'line': 'Muted Graphite HC'},
}


def rgb(name):
    hex_ = PALETTE[name]
    return ' '.join(str(int(hex_[i:i + 2], 16)) for i in (0, 2, 4))


def declarations(mode, indent):
    i = 0 if mode == 'light' else 1
    lines = [f'{indent}--c-{role}: {rgb(names[i])}; /* {names[i]} */' for role, names in ROLES.items()]
    lines += [f'{indent}--a-{name}: {values[i]};' for name, values in ALPHAS.items()]
    return '\n'.join(lines)


def high_contrast(mode, indent):
    return '\n'.join(f'{indent}--c-{role}: {rgb(name)}; /* {name} */' for role, name in HIGH_CONTRAST[mode].items())


roles_doc = '\n'.join(f' *   {role:<17}{names[0]} / {names[1]}: {names[2]}' for role, names in ROLES.items())

print(f'''/*
 * Stone & Forest: colour roles for light, dark and Increase Contrast.
 *
 * Only colours from the Stone & Forest brand guide (v1.1) appear here, and so in the app: every
 * colour class (bg-surface, text-ink-2, border-line and so on) resolves through these
 * variables (see tailwind.config.js), and Tailwind's own palette is switched off. A theme
 * switch swaps the whole set; no component changes.
 *
 * Roles, light / dark:
{roles_doc}
 *
 * Tints behind a warning or an error are the role colour at reduced opacity (--a-*), as the
 * guide's tinted buttons are. Muted Sage is 2.3:1 on white, so in light it is decorative only.
 * src/theme.test.ts checks that every value is in the palette and every pairing meets WCAG AA.
 *
 * data-theme on the root overrides the device: "light" or "dark" from Settings, and "light"
 * for the PDF capture of the chart. Without it, the device's appearance decides.
 *
 * Generated by scripts/generate_theme.py. Edit the roles there, not here.
 */

:root {{
  color-scheme: light dark;
{declarations('light', '  ')}
}}

:root[data-theme='light'] {{
  color-scheme: light;
}}

@media (prefers-color-scheme: dark) {{
  :root:not([data-theme='light']) {{
{declarations('dark', '    ')}
  }}
}}

/* Increase Contrast: the guide's high-contrast text-secondary, border and sage */
@media (prefers-contrast: more) {{
  :root {{
{high_contrast('light', '    ')}
  }}
}}

@media (prefers-color-scheme: dark) and (prefers-contrast: more) {{
  :root:not([data-theme='light']) {{
{high_contrast('dark', '    ')}
  }}
}}

/* Chosen in Settings: dark whatever the device says */
:root[data-theme='dark'] {{
  color-scheme: dark;
{declarations('dark', '  ')}
}}

@media (prefers-contrast: more) {{
  :root[data-theme='dark'] {{
{high_contrast('dark', '    ')}
  }}
}}''')
