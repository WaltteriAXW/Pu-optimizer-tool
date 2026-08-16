import type { CalculationResults } from '@/calculator_types'

interface PressureChartProps {
  results: CalculationResults
}

/**
 * Interactive SVG pressure profile chart
 * Shows base pressure drop and pressure with fittings over pipe length
 */
export function PressureChart({ results }: PressureChartProps) {
  if (!results.pressure || !results.input) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200 text-slate-500">
        No pressure data available
      </div>
    )
  }

  // Chart dimensions
  const width = 600
  const height = 300
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }

  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Data points
  const pipeLength = results.input.pipe_length_mm
  const basePressure = results.pressure.base_pressure_drop_bar
  const totalPressure = results.pressure.pressure_with_fittings_bar
  const fittingLoss = results.pressure.fitting_loss_bar

  // Generate points for lines
  const basePressurePoints = generateLinePoints(
    0,
    0,
    pipeLength,
    basePressure,
    5
  )
  const totalPressurePoints = generateLinePoints(
    0,
    0,
    pipeLength,
    totalPressure,
    5
  )

  // Scales
  const xScale = (val: number) => padding.left + (val / pipeLength) * chartWidth
  const yScale = (val: number) =>
    padding.top + chartHeight - (val / (totalPressure * 1.2)) * chartHeight

  // Convert points to path
  const basePressurePath = basePressurePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.x)} ${yScale(p.y)}`)
    .join(' ')

  const totalPressurePath = totalPressurePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.x)} ${yScale(p.y)}`)
    .join(' ')

  // Fill area under base pressure
  const fillPath = `${basePressurePath} L ${xScale(pipeLength)} ${yScale(0)} Z`

  return (
    <div className="w-full bg-white rounded-lg border border-slate-200 p-6" data-chart="pressure-profile">
      <h3 className="text-lg font-bold text-slate-800 mb-4">
        Pressure Profile Analysis
      </h3>

      <div className="overflow-x-auto">
        <svg width={width} height={height} className="mx-auto">
          {/* Background */}
          <rect width={width} height={height} fill="white" />

          {/* Grid lines */}
          <g stroke="#e2e8f0" strokeWidth="1">
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
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke="#94a3b8"
            strokeWidth="2"
          />

          {/* Fill under base pressure */}
          <path d={fillPath} fill="#818cf8" opacity="0.1" />

          {/* Base pressure line */}
          <path
            d={basePressurePath}
            fill="none"
            stroke="#4f46e5"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Total pressure line */}
          <path
            d={totalPressurePath}
            fill="none"
            stroke="#dc2626"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="5,5"
          />

          {/* Y-axis labels */}
          <g fontSize="12" fill="#64748b" textAnchor="end">
            {Array.from({ length: 6 }).map((_, i) => {
              const value = ((i * totalPressure * 1.2) / 5).toFixed(1)
              const y = padding.top + ((5 - i) * chartHeight) / 5 + 4
              return (
                <text key={`label-y-${i}`} x={padding.left - 10} y={y}>
                  {value}
                </text>
              )
            })}
          </g>

          {/* X-axis labels */}
          <g fontSize="12" fill="#64748b" textAnchor="middle">
            {Array.from({ length: 6 }).map((_, i) => {
              const value = ((i * pipeLength) / 5).toFixed(0)
              const x = padding.left + (i * chartWidth) / 5
              return (
                <text key={`label-x-${i}`} x={x} y={height - padding.bottom + 20}>
                  {value}
                </text>
              )
            })}
          </g>

          {/* Axis labels */}
          <text x={padding.left - 45} y={padding.top - 5} fontSize="12" fill="#64748b">
            Pressure (bar)
          </text>
          <text x={width / 2} y={height - 5} fontSize="12" fill="#64748b" textAnchor="middle">
            Pipe Length (mm)
          </text>

          {/* Legend */}
          <g transform={`translate(${width - 180}, ${padding.top + 10})`}>
            <rect width="170" height="60" fill="white" stroke="#e2e8f0" rx="4" />

            {/* Base pressure */}
            <line x1="10" y1="15" x2="30" y2="15" stroke="#4f46e5" strokeWidth="2" />
            <text x="40" y="20" fontSize="12" fill="#1e293b">
              Base Drop
            </text>

            {/* Total pressure */}
            <line x1="10" y1="40" x2="30" y2="40" stroke="#dc2626" strokeWidth="2" strokeDasharray="3,3" />
            <text x="40" y="45" fontSize="12" fill="#1e293b">
              With Fittings
            </text>
          </g>
        </svg>
      </div>

      {/* Data summary */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="p-4 bg-indigo-50 rounded-lg">
          <p className="text-xs text-indigo-600 font-medium">Base Pressure Drop</p>
          <p className="text-2xl font-bold text-indigo-900 mt-1">
            {basePressure.toFixed(2)} <span className="text-sm">bar</span>
          </p>
        </div>

        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-xs text-red-600 font-medium">Total with Fittings</p>
          <p className="text-2xl font-bold text-red-900 mt-1">
            {totalPressure.toFixed(2)} <span className="text-sm">bar</span>
          </p>
        </div>

        <div className="p-4 bg-amber-50 rounded-lg">
          <p className="text-xs text-amber-600 font-medium">Fitting Loss</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">
            {fittingLoss.toFixed(2)} <span className="text-sm">bar</span>
          </p>
        </div>
      </div>
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
