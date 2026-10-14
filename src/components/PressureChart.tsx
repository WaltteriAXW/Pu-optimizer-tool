import { useId } from 'react'
import type { CalculationResults } from '@/calculator_types'
import {
  formatPressure,
  toPressureUnit,
  type PressureUnit,
} from '@/services/displayPreferences'

/**
 * Chart colours, as values rather than classes. The PDF export rasterises this chart with
 * html2canvas, which serialises the SVG on its own: stylesheet classes inside it are lost and
 * everything comes out black. Inline values survive.
 */
const CHART_COLORS = {
  grid: '#e2e8f0', // slate-200
  axis: '#94a3b8', // slate-400
  tick: '#64748b', // slate-500
  title: '#475569', // slate-600
  primary: '#4f46e5', // indigo-600
  secondary: '#64748b', // slate-500
}

interface PressureChartProps {
  results: CalculationResults
  /** Unit the axis and figures are labelled in. The data itself stays in bar. */
  unit: PressureUnit
}

/**
 * Interactive SVG pressure profile chart
 * Shows base pressure drop and pressure with fittings over pipe length
 */
export function PressureChart({ results, unit }: PressureChartProps) {
  const chartId = useId()

  if (!results.pressure || !results.input) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200 text-slate-500">
        No pressure data available
      </div>
    )
  }

  // Chart dimensions. The top padding leaves a row for the axis title, which used to sit on
  // top of the highest tick label.
  const width = 600
  const height = 300
  const padding = { top: 36, right: 20, bottom: 44, left: 60 }

  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Data points
  const pipeLength = results.input.pipe_length_mm
  const basePressure = results.pressure.base_pressure_drop_bar
  const totalPressure = results.pressure.pressure_with_fittings_bar
  const fittingLoss = results.pressure.fitting_loss_bar

  // Generate points for lines
  const basePressurePoints = generateLinePoints(0, 0, pipeLength, basePressure, 5)
  const totalPressurePoints = generateLinePoints(0, 0, pipeLength, totalPressure, 5)

  // Scales. The vertical span falls back to 1 bar when the pressure is zero — dividing by
  // it produced NaN for every coordinate and an SVG that rendered as blank space.
  const yAxisMax = totalPressure > 0 ? totalPressure * 1.2 : 1

  // Decimals enough to tell one tick from the next. Fixed at one, a 0.2 bar axis labelled
  // itself "0.2, 0.2, 0.1, 0.1, 0.0, 0.0" — six ticks showing three values, which reads as
  // a broken chart rather than a finely divided one.
  const axisTop = toPressureUnit(yAxisMax, unit)
  const tickDecimals = axisTop >= 100 ? 0 : axisTop >= 10 ? 1 : axisTop >= 1 ? 2 : 3
  const xScale = (val: number) =>
    padding.left + (pipeLength > 0 ? (val / pipeLength) * chartWidth : 0)
  const yScale = (val: number) =>
    padding.top + chartHeight - (val / yAxisMax) * chartHeight

  // Convert points to path
  const basePressurePath = basePressurePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.x)} ${yScale(p.y)}`)
    .join(' ')

  const totalPressurePath = totalPressurePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.x)} ${yScale(p.y)}`)
    .join(' ')

  // Fill area under the line that matters — the pressure the line actually needs
  const fillPath = `${totalPressurePath} L ${xScale(pipeLength)} ${yScale(0)} Z`

  return (
    <div className="w-full rounded-lg border border-slate-200 bg-white p-6" data-chart="pressure-profile">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h3 className="text-lg font-bold text-slate-800">Pressure Profile</h3>
        {/* The legend sits outside the plot. Inside it, it covered the end of the line —
            the one point on the chart that matters most. The two series differ by line
            style as well as colour, so the legend does not rely on colour alone. */}
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600" aria-hidden="true">
          <li className="flex items-center gap-2">
            <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke={CHART_COLORS.primary} strokeWidth="3" /></svg>
            With fittings
          </li>
          <li className="flex items-center gap-2">
            <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke={CHART_COLORS.secondary} strokeWidth="2" strokeDasharray="4 3" /></svg>
            Pipe only
          </li>
        </ul>
      </div>

      {/* viewBox rather than fixed width/height, so the chart scales down to the
          container instead of forcing a horizontal scrollbar on a narrow screen. */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="auto"
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto block max-w-full"
        style={{ maxWidth: width }}
        role="img"
        aria-labelledby={`${chartId}-title ${chartId}-desc`}
      >
        {/* The chart is the only place these figures appear as a shape rather than a
            number, so the description carries the same information as prose. */}
        <title id={`${chartId}-title`}>
          Pressure profile along the pipe
        </title>
        <desc id={`${chartId}-desc`}>
          {`Pressure builds linearly over ${pipeLength.toFixed(0)} mm of pipe, reaching `
            + `${formatPressure(basePressure, unit)} ${unit} from pipe friction alone and `
            + `${formatPressure(totalPressure, unit)} ${unit} once `
            + `${formatPressure(fittingLoss, unit)} ${unit} of fitting losses are included.`}
        </desc>

        {/* Grid lines */}
        <g stroke={CHART_COLORS.grid} strokeWidth="1">
          {Array.from({ length: 6 }).map((_, i) => {
            const y = padding.top + (i * chartHeight) / 5
            return <line key={`h-${i}`} x1={padding.left} y1={y} x2={width - padding.right} y2={y} />
          })}
          {Array.from({ length: 6 }).map((_, i) => {
            const x = padding.left + (i * chartWidth) / 5
            return <line key={`v-${i}`} x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} />
          })}
        </g>

        {/* Axes */}
        <g stroke={CHART_COLORS.axis} strokeWidth="1.5">
          <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} />
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} />
        </g>

        {/* Fill under the line demand */}
        <path d={fillPath} fill={CHART_COLORS.primary} opacity="0.08" />

        {/* Pipe friction alone: dashed, secondary */}
        <path
          d={basePressurePath}
          fill="none"
          stroke={CHART_COLORS.secondary}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="6 5"
        />

        {/* With fittings: the pressure the line actually needs */}
        <path
          d={totalPressurePath}
          fill="none"
          stroke={CHART_COLORS.primary}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Tick labels */}
        <g fontSize="12" fill={CHART_COLORS.tick}>
          {Array.from({ length: 6 }).map((_, i) => {
            const value = toPressureUnit((i * yAxisMax) / 5, unit).toFixed(tickDecimals)
            const y = padding.top + ((5 - i) * chartHeight) / 5 + 4
            return (
              <text key={`label-y-${i}`} x={padding.left - 10} y={y} textAnchor="end">
                {value}
              </text>
            )
          })}
          {Array.from({ length: 6 }).map((_, i) => {
            const value = ((i * pipeLength) / 5).toFixed(0)
            const x = padding.left + (i * chartWidth) / 5
            return (
              <text key={`label-x-${i}`} x={x} y={height - padding.bottom + 20} textAnchor="middle">
                {value}
              </text>
            )
          })}
        </g>

        {/* Axis titles: the vertical one above its axis, clear of the tick labels */}
        <g fontSize="12" fill={CHART_COLORS.title} fontWeight="600">
          <text x={padding.left - 10} y={14} textAnchor="start">
            Pressure ({unit})
          </text>
          <text x={padding.left + chartWidth / 2} y={height - 6} textAnchor="middle">
            Pipe length (mm)
          </text>
        </g>
      </svg>

      {/* The three figures behind the chart. Neutral tiles with the headline figure — the
          pressure the line needs — emphasised; red is kept for things that are wrong. */}
      <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-indigo-50 p-4">
          <dt className="text-sm font-medium text-indigo-800">With fittings</dt>
          <dd className="mt-1 text-2xl font-bold text-indigo-900 tabular-nums">
            {formatPressure(totalPressure, unit)} <span className="text-sm font-medium">{unit}</span>
          </dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <dt className="text-sm font-medium text-slate-600">Pipe only</dt>
          <dd className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            {formatPressure(basePressure, unit)} <span className="text-sm font-medium">{unit}</span>
          </dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <dt className="text-sm font-medium text-slate-600">Fitting loss</dt>
          <dd className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            {formatPressure(fittingLoss, unit)} <span className="text-sm font-medium">{unit}</span>
          </dd>
        </div>
      </dl>
    </div>
  )
}

/**
 * Generate linear interpolation points for smooth curves
 */
function generateLinePoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  points: number = 10
) {
  const result = []
  for (let i = 0; i <= points; i++) {
    const t = i / points
    result.push({
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    })
  }
  return result
}
