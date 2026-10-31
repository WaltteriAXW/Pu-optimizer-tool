"""
Write src/theme.css from the Stone & Forest brand guide (v1.2).

    python3 scripts/generate_theme.py > src/theme.css

Only the guide's own colours are used: the six core colours, the light and dark tokens, the
status colours, the dark elevation levels and the Increase Contrast variants. Each role below
picks one of them per appearance. The chart palette is listed too, for the chart and the test;
the guide keeps it apart from status colours, and so does the app.

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
    # Dark elevation, level 2: menus, popovers, toasts
    'Basalt Level 2': '1E2320',
    # Status colours: text and icon, then tint fill
    'Success': '1E7347', 'Success Tint': 'E2F0E6',
    'Success Dark': '4FCB86', 'Success Tint Dark': '14301F',
    'Warning': '8A5A00', 'Warning Tint': 'FAEED3',
    'Warning Dark': 'F2B54A', 'Warning Tint Dark': '33280F',
    'Error Tint': 'F7E2DC', 'Error Tint Dark': '3A1F1A',
    'Info': '2F5E94', 'Info Tint': 'E2EAF4',
    'Info Dark': '82B4EC', 'Info Tint Dark': '16263A',
}

# Categorical chart colours, assigned in order and never used for status
CHART = {
    'light': ['1A7F58', 'B77F12', '3E6FB0', 'C2553A', '8A4F9E', '5F8A1E'],
    'dark': ['2FA877', 'C08A1C', '5B8FD6', 'D9694E', 'A574C4', '6E9A2C'],
}
PALETTE.update({f'Chart {i + 1}': v for i, v in enumerate(CHART['light'])})
PALETTE.update({f'Chart {i + 1} Dark': v for i, v in enumerate(CHART['dark'])})

# role: (light, dark, what it is for)
ROLES = {
    'canvas': ('Pale Limestone', 'Deep Obsidian', 'bg-primary: the page'),
    'surface': ('Pure White', 'Dark Basalt', 'bg-surface: cards, sheets, inputs'),
    'raised': ('Pure White', 'Muted Graphite', 'the chosen segment, raised on its track'),
    # Elevation: light lifts with a forest-tinted shadow; dark with a lighter surface and a border
    'level-2': ('Pure White', 'Basalt Level 2', 'menus, popovers, toasts'),
    'level-3': ('Pale Limestone', 'Muted Graphite', 'sheets and dialogs'),
    'overlay': ('Pure White', 'Muted Graphite', 'side panels over the page'),
    'track': ('Warm Stone', 'Deep Obsidian', 'segmented control and switch tracks'),
    'accent': ('Deep Forest', 'Champagne Beige', 'accent-primary: the one main action'),
    'on-accent': ('Pure White', 'Deep Obsidian', 'text-on-accent'),
    'highlight': ('Deep Forest', 'Jade Mint', 'accent text, the focus ring, the switch'),
    'accent-secondary': ('Muted Sage', 'Jade Mint', 'charts, progress; decorative in light'),
    'band': ('Muted Sage', 'Deep Forest Fill', 'the in-range band of a gauge, behind its marker'),
    'muted': ('Pale Mist Green', 'Deep Forest Fill', 'accent-muted: pills, badges, selected rows'),
    'line': ('Warm Stone', 'Muted Graphite', 'border-subtle: dividers, card edges'),
    'line-strong': ('Warm Stone HC', 'Muted Graphite HC', 'input edges'),
    'ink': ('Charcoal Moss', 'Frost', 'text-primary'),
    'ink-2': ('Olive Slate', 'Lichen Grey', 'text-secondary'),
    'success': ('Success', 'Success Dark', 'status-success: text and icon'),
    'success-bg': ('Success Tint', 'Success Tint Dark', 'status-success: tint fill'),
    'warning': ('Warning', 'Warning Dark', 'status-warning: text and icon'),
    'warning-bg': ('Warning Tint', 'Warning Tint Dark', 'status-warning: tint fill'),
    'danger': ('Clay Red', 'Ember Coral', 'status-error and destructive: text and icon'),
    'danger-bg': ('Error Tint', 'Error Tint Dark', 'status-error: tint fill'),
    'info': ('Info', 'Info Dark', 'status-info: text and icon'),
    'info-bg': ('Info Tint', 'Info Tint Dark', 'status-info: tint fill'),
    'scrim': ('Charcoal Moss', 'Deep Obsidian', 'the backdrop behind a sheet'),
    'shadow': ('Deep Forest', 'Deep Obsidian', 'shadows: forest-tinted by day'),
    'knob': ('Pure White', 'Pure White', 'switch and slider knobs'),
}

# Opacities, per appearance: the backdrop behind a sheet (40% ink by day, 60% by night), and
# the card edge, which light leaves to the shadow and dark draws as a 1 pt border
ALPHAS = {
    'scrim': (0.4, 0.6),
    'edge': (0, 1),
}

# Elevation shadows: soft forest by day, none by night (dark lifts with lighter surfaces)
SHADOWS = {
    'shadow-1': ('0 1px 6px rgb(var(--c-shadow) / 0.10)', 'none'),
    'shadow-2': ('0 6px 18px rgb(var(--c-shadow) / 0.14)', 'none'),
    'shadow-3': ('0 12px 32px rgb(var(--c-shadow) / 0.20)', 'none'),
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
    lines += [f'{indent}--{name}: {values[i]};' for name, values in SHADOWS.items()]
    lines += [f'{indent}--c-chart-{n + 1}: {rgb(f"Chart {n + 1}" + ("" if i == 0 else " Dark"))};' for n in range(6)]
    return '\n'.join(lines)


def high_contrast(mode, indent):
    return '\n'.join(f'{indent}--c-{role}: {rgb(name)}; /* {name} */' for role, name in HIGH_CONTRAST[mode].items())


roles_doc = '\n'.join(f' *   {role:<17}{names[0]} / {names[1]}: {names[2]}' for role, names in ROLES.items())

print(f'''/*
 * Stone & Forest: colour roles for light, dark and Increase Contrast.
 *
 * Only colours from the Stone & Forest brand guide (v1.2) appear here, and so in the app: every
 * colour class (bg-surface, text-ink-2, border-line and so on) resolves through these
 * variables (see tailwind.config.js), and Tailwind's own palette is switched off. A theme
 * switch swaps the whole set; no component changes.
 *
 * Roles, light / dark:
{roles_doc}
 *
 * Status colours (success, warning, danger, info) come in pairs: text and icon, and a tint fill.
 * They always travel with an icon and words, and are never a chart series; the chart has its
 * own six colours (--c-chart-*). Elevation: light lifts a card with a forest-tinted shadow
 * (--shadow-1 to 3), dark with a lighter surface and a 1 pt border (--a-edge). Muted Sage is
 * 2.3:1 on white, so in light it is decorative only.
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
