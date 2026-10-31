"""
Write src/theme.css from the Stone & Forest brand guide's tokens.

    python3 scripts/generate_theme.py > src/theme.css

Then run `npx vitest --run src/theme.test.ts`: it checks every pairing the app uses against
WCAG AA in light, dark and Increase Contrast.
"""
S = ['50','100','200','300','400','500','600','700','800','900','950']
h = lambda x: ' '.join(str(int(x[i:i+2],16)) for i in (0,2,4))

# ── Light ──────────────────────────────────────────────────────────────────────
light_roles = {
  'canvas': 'F2EFE9',          # bg-primary, Pale Limestone
  'surface': 'FFFFFF',         # bg-surface, Pure White
  'raised': 'FFFFFF',          # the chosen segment, on its track
  'accent': '1B3B2B',          # accent-primary, Deep Forest
  'accent-pressed': '132B1F',
  'on-accent': 'FFFFFF',       # text-on-accent
}
stone_l = dict(zip(S, ['F2EFE9','EAE6DF','E2DDD5','D1CBC1','8F8B82','5C6058','4D5149','3B3E37','2B2D28','1C1D1A','121311']))
forest_l = dict(zip(S, ['E6ECE8','D6E1DA','BFCFC5','A3B19B','6E7D66','3D5A49','1B3B2B','132B1F','11281E','0D2018','08140F']))
# Success is a forest green, so a good result reads as the brand rather than a stock mint
emerald_l = dict(zip(S, ['EAF2EC','D4E6D9','B5D4BE','8DBD9B','5C9E70','3A8452','2A6E41','1F5A34','184A2B','133B23','0A2214']))
amber_l = dict(zip(S, ['FFFBEB','FEF3C7','FDE68A','FCD34D','FBBF24','F59E0B','D97706','B45309','92400E','78350F','451A03']))
red_l = dict(zip(S, ['FBEDEA','F5DDD7','EDC2B9','DE9A8E','CF6A5C','C04A3C','B23A2E','9C3127','7F281F','66201A','3A120E']))
orange_l = dict(zip(S, ['FFF7ED','FFEDD5','FED7AA','FDBA74','FB923C','F97316','EA580C','C2410C','9A3412','7C2D12','431407']))

# ── Dark ───────────────────────────────────────────────────────────────────────
dark_roles = {
  'canvas': '0C0E0D',          # Deep Obsidian
  'surface': '161A18',         # Dark Basalt
  'raised': '2A302D',
  'accent': 'E8DCCB',          # Champagne Beige takes the action after dark
  'accent-pressed': 'D4C6B1',
  'on-accent': '0C0E0D',
}
stone_d = dict(zip(S, ['0C0E0D','1E2320','262C29','343B37','6E7671','9CA39E','B3B9B5','CAD0CC','E0E4E1','F4F6F5','FAFBFA']))
# Forest lives on as a tinted fill; Jade Mint does the glowing
forest_d = dict(zip(S, ['1A2E26','1F3A2F','28493C','35604F','4FC793','5CE1A6','5CE1A6','7EE8BA','A6F0CF','CFF7E5','E9FCF3']))
emerald_d = dict(zip(S, ['142620','18332A','1D4536','25604A','5CE1A6','5CE1A6','5CE1A6','85E9BD','B0F2D4','D6F9E9','ECFCF4']))
amber_d = dict(zip(S, ['2A2416','3A3019','52421C','7A5F1F','FBBF24','FBBF24','FBBF24','FCD34D','FDE68A','FEF3C7','FFFBEB']))
red_d = dict(zip(S, ['2A1A17','3A201B','52281F','7A3529','FF7A66','FF7A66','FF7A66','FF9A8A','FFC0B5','FFDCD5','FFEEEA']))
orange_d = dict(zip(S, ['2B1E15','3C2618','55321A','7D451D','FB923C','FB923C','FB923C','FDBA74','FED7AA','FFEDD5','FFF7ED']))

# Increase Contrast variants from the guide
hc_l = {'stone-200':'B9B2A6','stone-300':'A39C90','stone-400':'6E6A62','stone-500':'3F433C','forest-400':'4F5E48'}
hc_d = {'stone-200':'4A524D','stone-400':'9CA39E','stone-500':'C4CAC6'}

def decls(roles, fams, indent):
    out = [f'{indent}--c-{k}: {h(v)};' for k, v in roles.items()]
    for name, scale in fams:
        out += [f'{indent}--c-{name}-{s}: {h(scale[s])};' for s in S]
    return '\n'.join(out)

L = [('stone', stone_l), ('forest', forest_l), ('emerald', emerald_l), ('amber', amber_l), ('red', red_l), ('orange', orange_l)]
D = [('stone', stone_d), ('forest', forest_d), ('emerald', emerald_d), ('amber', amber_d), ('red', red_d), ('orange', orange_d)]
hc = lambda m, i: '\n'.join(f'{i}--c-{k}: {h(v)};' for k, v in m.items())

print(f'''/*
 * Stone & Forest: colour roles for light, dark and Increase Contrast.
 *
 * Values come from the Stone & Forest brand guide (v1.1). Every colour class in the app
 * (bg-stone-50, text-forest-600 and so on) resolves through these variables (see
 * tailwind.config.js), so a theme switch swaps whole token sets and no component changes.
 *
 * The guide's roles and where they live here:
 *   bg-primary (60%)  canvas, also stone-50     Pale Limestone / Deep Obsidian
 *   bg-surface (30%)  surface                   Pure White / Dark Basalt
 *   accent-primary    accent, on-accent         Deep Forest / Champagne, for the one main action
 *   accent-secondary  forest-500/600            Forest in light; Jade Mint glows in dark
 *   accent-muted      forest-50                 Pale Mist Green / Deep Forest Fill
 *   border-subtle     stone-200                 Warm Stone / Muted Graphite
 *   text-primary      stone-900                 Charcoal Moss / Frost
 *   text-secondary    stone-500                 Olive Slate / Lichen Grey
 *   destructive       red-600                   Clay Red / Ember Coral
 *
 * Muted Sage (forest-300) is decorative only: it is 2.3:1 on white, so it never carries text.
 * The pairings the app uses are checked against WCAG AA in src/theme.test.ts.
 *
 * data-theme on the root overrides the device: "light" or "dark" from Settings, and "light"
 * for the PDF capture of the chart. Without it, the device's appearance decides.
 *
 * Generated by scripts/generate_theme.py. Edit the scales there, as a set, not here.
 */

:root {{
  color-scheme: light dark;
{decls(light_roles, L, '  ')}
}}

:root[data-theme='light'] {{
  color-scheme: light;
}}

@media (prefers-color-scheme: dark) {{
  :root:not([data-theme='light']) {{
{decls(dark_roles, D, '    ')}
  }}
}}

/* Increase Contrast: the guide's high-contrast text-secondary, border and sage */
@media (prefers-contrast: more) {{
  :root {{
{hc(hc_l, '    ')}
  }}
}}

@media (prefers-color-scheme: dark) and (prefers-contrast: more) {{
  :root:not([data-theme='light']) {{
{hc(hc_d, '    ')}
  }}
}}

/* Chosen in Settings: dark whatever the device says */
:root[data-theme='dark'] {{
  color-scheme: dark;
{decls(dark_roles, D, '  ')}
}}

@media (prefers-contrast: more) {{
  :root[data-theme='dark'] {{
{hc(hc_d, '    ')}
  }}
}}''')
