/**
 * The Polyurethane Optimizer mark: three foam cells of different sizes, rising, on a tile in
 * the accent colour — Deep Forest with white cells in light, Champagne with Obsidian in dark,
 * following the brand guide's role inversion. Polyurethane is the foam; the cells are what the injection is made to produce.
 *
 * Drawn as one bold, simple shape so it still reads at favicon size. The same geometry is in
 * public/favicon.svg and is drawn into the PDF header (src/utils/generateReport.ts) — keep the
 * three in step.
 */
export const BRAND_CELLS = [
  { cx: 12, cy: 19.5, r: 6 },
  { cx: 22, cy: 10, r: 3.75 },
  { cx: 24, cy: 22, r: 2.25 },
] as const

export function BrandMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="8" className="fill-accent" />
      {BRAND_CELLS.map(({ cx, cy, r }) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          className="stroke-on-accent"
          strokeWidth="2.25"
        />
      ))}
    </svg>
  )
}

export const BRAND_NAME = 'Polyurethane Optimizer'
export const BRAND_TAGLINE = 'Pressure, flow and cure — before the first shot'
