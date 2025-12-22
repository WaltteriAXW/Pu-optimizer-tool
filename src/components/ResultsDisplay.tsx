import React from 'react'
import { useCalculator } from '../context/CalculatorContext'
import { PressureChart } from './PressureChart'
import { ExportButtons } from './ExportButtons'
import type { CalculationResults } from '@/calculator_types'
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Wind,
  Gauge,
  Timer,
  Activity,
} from 'lucide-react'

export function ResultsDisplay() {
  const { results, error: calculatorError } = useCalculator()

  if (calculatorError) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-red-100 shadow-sm text-center">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Calculation Failed</h3>
        <p className="text-slate-500 mt-2 max-w-sm">{calculatorError}</p>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-slate-300 text-center">
        <div className="bg-indigo-50 p-4 rounded-full mb-4">
          <Info className="w-8 h-8 text-indigo-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Ready to Simulate</h3>
        <p className="text-slate-500 mt-2 max-w-xs">
          Enter your process parameters on the left and hit calculate to generate a pressure
          profile.
        </p>
      </div>
    )
  }

  const isLaminar = results.flow?.flow_regime === 'laminar'

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Export Buttons */}
      <div className="flex justify-end">
        <ExportButtons results={results} params={useCalculator().lastParams!} />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Required Pressure"
          value={results.pressure?.base_pressure_drop_bar?.toFixed(2) || 'N/A'}
          unit="bar"
          icon={<Gauge className="w-5 h-5" />}
          trend={
            (results.pressure?.base_pressure_drop_bar || 0) > 150 ? 'high' : 'normal'
          }
        />
        <KpiCard
          title="Flow Regime"
          value={results.flow?.flow_regime || 'N/A'}
          unit={`Re: ${results.flow?.reynolds_number?.toFixed(0) || 'N/A'}`}
          icon={<Wind className="w-5 h-5" />}
          status={isLaminar ? 'success' : 'warning'}
        />
        <KpiCard
          title="Shear Rate"
          value={results.flow?.shear_rate_s_inv?.toFixed(0) || 'N/A'}
          unit="s⁻¹"
          icon={<ActivityIcon className="w-5 h-5" />}
        />
        <KpiCard
          title="Viscosity"
          value={results.flow?.apparent_viscosity_cp?.toFixed(1) || 'N/A'}
          unit="cP"
          icon={<Timer className="w-5 h-5" />}
        />
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pressure Chart Card */}
        <div className="lg:col-span-2 card">
          <div className="card-header">
            <h3 className="text-lg font-bold text-slate-800">Pressure Analysis</h3>
          </div>
          <div className="card-body">
            <div className="space-y-6">
              {/* Pressure Chart */}
              <PressureChart results={results} />

              {/* Pressure Details */}
              <div className="space-y-3">
                <PressureDetail
                  label="Base Pressure Drop"
                  value={results.pressure?.base_pressure_drop_bar}
                  unit="bar"
                />
                <PressureDetail
                  label="Pressure with Fittings"
                  value={results.pressure?.pressure_with_fittings_bar}
                  unit="bar"
                />
                <PressureDetail
                  label="Fitting Loss"
                  value={results.pressure?.fitting_loss_bar}
                  unit="bar"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Details & Warnings Card */}
        <div className="lg:col-span-1 space-y-6">
          {/* Status Box */}
          {results.warnings && results.warnings.length > 0 ? (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
              <h4 className="text-amber-900 font-bold flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" /> Attention Needed
              </h4>
              <ul className="space-y-2">
                {results.warnings.map((warn, i) => (
                  <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    {warn}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
              <h4 className="text-emerald-900 font-bold flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4" /> Process Optimized
              </h4>
              <p className="text-sm text-emerald-700">No critical warnings detected.</p>
            </div>
          )}

          {/* Detailed Stats */}
          <div className="card">
            <div className="card-header">
              <h4 className="font-bold text-slate-800">Flow Properties</h4>
            </div>
            <div className="card-body space-y-3">
              <DetailRow
                label="Apparent Viscosity"
                value={results.flow?.apparent_viscosity_cp}
                unit="cP"
              />
              <DetailRow
                label="Reynolds Number"
                value={results.flow?.reynolds_number}
                unit=""
              />
              <DetailRow
                label="Velocity"
                value={results.flow?.velocity_m_s}
                unit="m/s"
              />
              <DetailRow
                label="Shear Rate"
                value={results.flow?.shear_rate_s_inv}
                unit="s⁻¹"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Thermal & Environmental Data (if available) */}
      {(results.thermal || results.environmental) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {results.thermal && (
            <div className="card">
              <div className="card-header">
                <h4 className="font-bold text-slate-800">Thermal Properties</h4>
              </div>
              <div className="card-body space-y-3">
                <DetailRow
                  label="Temperature"
                  value={results.thermal.temperature_c}
                  unit="°C"
                />
                <DetailRow
                  label="Reference Viscosity"
                  value={results.thermal.reference_viscosity_cp}
                  unit="cP"
                />
                <DetailRow
                  label="Current Viscosity"
                  value={results.thermal.current_viscosity_cp}
                  unit="cP"
                />
                {results.thermal.heat_generated_w && (
                  <DetailRow
                    label="Heat Generated"
                    value={results.thermal.heat_generated_w}
                    unit="W"
                  />
                )}
              </div>
            </div>
          )}

          {results.environmental && (
            <div className="card">
              <div className="card-header">
                <h4 className="font-bold text-slate-800">Environmental Impact</h4>
              </div>
              <div className="card-body space-y-3">
                <DetailRow label="Material" value={results.environmental.material} unit="" />
                {results.environmental.blowing_agent && (
                  <DetailRow
                    label="Blowing Agent"
                    value={results.environmental.blowing_agent}
                    unit=""
                  />
                )}
                {results.environmental.gwp_per_kg && (
                  <DetailRow
                    label="GWP"
                    value={results.environmental.gwp_per_kg}
                    unit="kg CO₂eq/kg"
                  />
                )}
                {results.environmental.recommendation && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-600">
                      <span className="font-semibold">Recommendation:</span>{' '}
                      {results.environmental.recommendation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Machine Compatibility (if available) */}
      {results.machine_compatibility && (
        <div className="card">
          <div className="card-header">
            <h4 className="font-bold text-slate-800">Machine Compatibility</h4>
          </div>
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Compatibility Status</p>
                <p
                  className={`text-lg font-bold ${
                    results.machine_compatibility.is_compatible
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {results.machine_compatibility.is_compatible
                    ? '✓ Compatible'
                    : '⚠ Incompatible'}
                </p>
              </div>
              {results.machine_compatibility.max_pressure_bar && (
                <div className="text-right">
                  <p className="text-sm text-slate-600 mb-1">Max Pressure</p>
                  <p className="text-lg font-bold text-slate-900">
                    {results.machine_compatibility.max_pressure_bar.toFixed(1)} bar
                  </p>
                </div>
              )}
            </div>
            {results.machine_compatibility.warning && (
              <p className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                {results.machine_compatibility.warning}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function KpiCard({
  title,
  value,
  unit,
  icon,
  status = 'neutral',
  trend,
}: {
  title: string
  value: string | number
  unit: string
  icon: React.ReactNode
  status?: 'success' | 'warning' | 'neutral'
  trend?: 'high' | 'normal' | 'low'
}) {
  const statusColors = {
    success: 'bg-emerald-100 text-emerald-600',
    warning: 'bg-amber-100 text-amber-600',
    neutral: 'bg-slate-100 text-slate-600',
  }

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="card-body">
        <div className="flex justify-between items-start mb-2">
          <span className="text-sm font-medium text-slate-500">{title}</span>
          <div className={`p-2 rounded-lg ${statusColors[status]}`}>{icon}</div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900 tabular-nums">{value}</span>
          {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
        </div>
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
  unit,
}: {
  label: string
  value?: number | string
  unit: string
}) {
  if (value === undefined || value === null) return null

  const numValue = typeof value === 'number' ? value.toFixed(2) : value

  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900 tabular-nums">
        {numValue} <span className="text-slate-400 font-normal">{unit}</span>
      </span>
    </div>
  )
}

function PressureDetail({
  label,
  value,
  unit,
}: {
  label: string
  value?: number
  unit: string
}) {
  if (value === undefined || value === null) return null

  return (
    <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="text-2xl font-bold text-indigo-600 tabular-nums">
        {value.toFixed(2)} <span className="text-sm font-medium text-slate-500">{unit}</span>
      </span>
    </div>
  )
}

// Mock icon component if needed
const ActivityIcon = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
)
