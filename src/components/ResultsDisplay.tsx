import React from 'react'
import { useCalculator } from '../context/CalculatorContext'
import { PressureChart } from './PressureChart'
import { ExportButtons } from './ExportButtons'
import { isNumber, formatTemperature, isSameTemperature } from './resultFormatting'
import { formatPressure, type PressureUnit } from '../services/displayPreferences'
import type { CalculationResults, LaminarEnvelope } from '../calculator_types'
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Wind,
  Gauge,
  Timer,
} from 'lucide-react'

/** Presentation for the blowing-agent volatility states */
const VOLATILITY_LABEL: Record<string, string> = {
  ok: '✓ Stays in solution',
  marginal: '⚠ Close to boiling',
  flash_risk: '⚠ Flash-off risk',
  not_volatile: 'No volatile agent',
  no_boiling_point_data: 'Not evaluated',
  unknown_agent: 'Not evaluated',
}

const VOLATILITY_TONE: Record<string, string> = {
  ok: 'text-emerald-700',
  marginal: 'text-amber-700',
  flash_risk: 'text-red-700',
  not_volatile: 'text-slate-700',
  no_boiling_point_data: 'text-slate-500',
  unknown_agent: 'text-slate-500',
}

const SCORCH_TONE: Record<string, string> = {
  low: 'text-emerald-700',
  moderate: 'text-amber-700',
  high: 'text-orange-700',
  critical: 'text-red-700',
}

const MOLD_SOURCE_LABEL: Record<string, string> = {
  user: 'entered',
  data_sheet: 'from data sheet',
  default: 'model default',
}

export function ResultsDisplay() {
  const { results, lastParams, pressureUnit, error: calculatorError } = useCalculator()

  if (calculatorError) {
    return (
      <div
        role="alert"
        className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-red-100 shadow-sm text-center"
      >
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <AlertTriangle aria-hidden="true" className="w-8 h-8 text-red-600" />
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
          <Info aria-hidden="true" className="w-8 h-8 text-indigo-600" />
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
    // Results replace the panel in place with no navigation, so without a live region a
    // screen reader user gets no indication that pressing Run produced anything. The
    // headline figures are announced; the detail below is there to be read at leisure.
    <div
      className="space-y-6 animate-fadeIn"
      aria-live="polite"
      aria-atomic="false"
      role="region"
      aria-label="Calculation results"
    >
      {/* Export Buttons. Offered only once the parameters behind these results are known —
          exporting a report whose inputs had to be invented is worse than not offering it. */}
      {lastParams && (
        <div className="flex justify-end">
          <ExportButtons results={results} params={lastParams} />
        </div>
      )}

      {/* The number the operator sets, and the margin before the line turns turbulent */}
      <SetPressureCard results={results} unit={pressureUnit} />
      <LaminarEnvelopeCard envelope={results.flow?.laminar_envelope} />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Pipe Pressure Drop"
          value={formatPressure(results.pressure?.pressure_with_fittings_bar, pressureUnit)}
          unit={pressureUnit}
          icon={<Gauge className="w-5 h-5" />}
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
              <PressureChart results={results} unit={pressureUnit} />

              {/* Pressure Details */}
              <div className="space-y-3">
                <PressureDetail
                  label="Base Pressure Drop"
                  value={results.pressure?.base_pressure_drop_bar}
                  unit={pressureUnit}
                />
                <PressureDetail
                  label="Pressure with Fittings"
                  value={results.pressure?.pressure_with_fittings_bar}
                  unit={pressureUnit}
                />
                <PressureDetail
                  label="Fitting Loss"
                  value={results.pressure?.fitting_loss_bar}
                  unit={pressureUnit}
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
                <AlertTriangle aria-hidden="true" className="w-4 h-4" /> Attention Needed
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
                <CheckCircle2 aria-hidden="true" className="w-4 h-4" /> Process Optimized
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
                  label={
                    isNumber(results.thermal.reference_temp_c)
                      ? `Viscosity at ${formatTemperature(results.thermal.reference_temp_c)}`
                      : 'Reference Viscosity'
                  }
                  value={results.thermal.reference_viscosity_cp}
                  unit="cP"
                />
                {/* Only when the material is not at its reference temperature. Otherwise
                    this row is character-for-character the row above it. */}
                {!isSameTemperature(
                  results.thermal.temperature_c,
                  results.thermal.reference_temp_c
                ) && (
                  <DetailRow
                    label={`Viscosity at ${formatTemperature(results.thermal.temperature_c)}`}
                    value={results.thermal.current_viscosity_cp}
                    unit="cP"
                  />
                )}
                {isNumber(results.thermal.heat_generated_w) && (
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
                {isNumber(results.environmental.gwp_per_kg) && (
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

      {/* Blowing agent volatility */}
      {results.volatility && (
        <div className="card">
          <div className="card-header">
            <h4 className="font-bold text-slate-800">Blowing Agent</h4>
          </div>
          <div className="card-body space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">{results.volatility.agent}</p>
                <p className={`text-lg font-bold ${VOLATILITY_TONE[results.volatility.status] ?? 'text-slate-700'}`}>
                  {VOLATILITY_LABEL[results.volatility.status] ?? results.volatility.status}
                </p>
              </div>
              {isNumber(results.volatility.boiling_point_c) && (
                <div className="text-right">
                  <p className="text-sm text-slate-600 mb-1">Boiling Point</p>
                  <p className="text-lg font-bold text-slate-900">
                    {results.volatility.boiling_point_c.toFixed(1)} °C
                  </p>
                </div>
              )}
            </div>

            <p className="text-sm text-slate-600">{results.volatility.message}</p>

            {results.volatility.warning && (
              <p className={`p-3 rounded text-sm border ${
                results.volatility.status === 'flash_risk'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                {results.volatility.warning}
              </p>
            )}

            {/* Absent constants must read as "not evaluated", never as a pass */}
            {results.volatility.is_volatile && !isNumber(results.volatility.vapour_pressure_bar) && (
              <p className="text-xs text-slate-500">
                Vapour-pressure margin not evaluated — no vapour-pressure data on file for
                this agent.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Line temperature — why the pressure above may differ from the set point */}
      {results.line_temperature && (
        <div className="card">
          <div className="card-header">
            <h4 className="font-bold text-slate-800">Temperature at the Mix Head</h4>
          </div>
          <div className="card-body space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Set point</p>
                <p className="text-lg font-bold text-slate-900">
                  {results.line_temperature.set_temperature_c.toFixed(1)} °C
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Ambient</p>
                <p className="text-lg font-bold text-slate-900">
                  {results.line_temperature.ambient_temperature_c.toFixed(1)} °C
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">At mix head</p>
                <p className={`text-lg font-bold ${
                  Math.abs(results.line_temperature.drift_c) >= 2 ? 'text-amber-700' : 'text-emerald-700'
                }`}>
                  {results.line_temperature.effective_temperature_c.toFixed(1)} °C
                </p>
              </div>
            </div>
            <DetailRow
              label="Line thermal time constant"
              value={results.line_temperature.time_constant_s / 60}
              unit="min"
            />
            {results.line_temperature.warning && (
              <p className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                {results.line_temperature.warning}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Cure & Exotherm — the moulded part, not the feed line */}
      {results.cure && (
        <div className="card border-2 border-slate-200">
          <div className="card-header bg-slate-50">
            <h4 className="font-bold text-slate-800">Cure &amp; Exotherm</h4>
            <p className="text-xs text-slate-500 mt-1">
              Describes the moulded part after the mix head — not the feed line above.
            </p>
          </div>
          <div className="card-body space-y-3">
            <DetailRow label="Part Thickness" value={results.cure.part_thickness_mm} unit="mm" />
            {isNumber(results.cure.mold_temperature_c) && (
              <DetailRow
                label={`Mould Temperature (${MOLD_SOURCE_LABEL[results.cure.mold_temperature_source]})`}
                value={results.cure.mold_temperature_c}
                unit="°C"
              />
            )}
            {isNumber(results.cure.cream_time_s) && (
              <DetailRow label="Cream Time" value={results.cure.cream_time_s} unit="s" />
            )}
            {isNumber(results.cure.gel_time_s) && (
              <DetailRow label="Gel Time" value={results.cure.gel_time_s} unit="s" />
            )}
            {results.cure.processing_window && (
              <DetailRow
                label="Working Time"
                value={results.cure.processing_window.work_time_s}
                unit="s"
              />
            )}

            <div className="pt-3 border-t border-slate-100 space-y-3">
              {isNumber(results.cure.adiabatic_rise_c) && (
                <DetailRow
                  label="Reaction Heat (adiabatic rise)"
                  value={results.cure.adiabatic_rise_c}
                  unit="°C"
                />
              )}
              {isNumber(results.cure.peak_temperature_c) && (
                <DetailRow
                  label="Peak Core Temperature"
                  value={results.cure.peak_temperature_c}
                  unit="°C"
                />
              )}
              {results.cure.scorch_risk && (
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-slate-600">Scorch Risk</span>
                  <span className={`text-sm font-bold ${SCORCH_TONE[results.cure.scorch_risk] ?? 'text-slate-700'}`}>
                    {results.cure.scorch_risk}
                    {isNumber(results.cure.scorch_margin_c) &&
                      ` (${results.cure.scorch_margin_c.toFixed(0)} °C margin)`}
                  </span>
                </div>
              )}
            </div>

            {results.cure.heat_of_reaction_is_estimated && (
              <p className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
                Exotherm figures are <strong>estimated</strong>. This material&rsquo;s data
                sheet states no heat of reaction, so a literature-typical value for rigid
                polyurethane was used. Add <code>Heat_Of_Reaction_kJ_kg</code> or{' '}
                <code>Peak_Exotherm_C</code> to the material database to replace it with a
                measured value.
              </p>
            )}
          </div>
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
              {isNumber(results.machine_compatibility.required_pressure_bar) && (
                <div className="text-right">
                  <p className="text-sm text-slate-600 mb-1">Required / Max Pressure</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatPressure(
                      results.machine_compatibility.required_pressure_bar,
                      pressureUnit
                    )}
                    {isNumber(results.machine_compatibility.max_pressure_bar) &&
                      ` / ${formatPressure(
                        results.machine_compatibility.max_pressure_bar,
                        pressureUnit
                      )}`}{' '}
                    {pressureUnit}
                  </p>
                </div>
              )}
            </div>
            {results.machine_compatibility.warning && (
              <p className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                {results.machine_compatibility.warning}
              </p>
            )}
            {results.machine_compatibility.note && (
              <p className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600">
                {results.machine_compatibility.note}
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

/**
 * The pressure the operator dials in.
 *
 * This used to be called "Required Pressure" and showed the pipe drop — 0.25 bar on the
 * default line, which is not a number anyone sets on a machine. The two were also given the
 * same name in two places, differing by a factor of a hundred. The set point is whichever
 * binds: what the line demands, or the machine's minimum. Which one governs is stated,
 * because a headline figure nobody can trace back is worse than no headline at all.
 */
function SetPressureCard({
  results,
  unit,
}: {
  results: CalculationResults
  unit: PressureUnit
}) {
  const machine = results.machine_compatibility
  if (!machine || !isNumber(machine.set_pressure_bar)) return null

  const governedByMachine = machine.set_pressure_governed_by === 'machine_minimum'
  const demand = machine.required_pressure_bar
  const pipeDrop = results.pressure?.pressure_with_fittings_bar
  const p = (bar: number | undefined) => formatPressure(bar, unit)

  return (
    <div className="card overflow-hidden" data-testid="set-pressure">
      <div className="flex items-stretch">
        <div className="w-1.5 bg-indigo-600 flex-shrink-0" />
        <div className="card-body flex-grow flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Required Pressure
            </p>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-4xl font-extrabold tracking-tight tabular-nums text-slate-900">
                {p(machine.set_pressure_bar)}
              </span>
              <span className="text-lg font-semibold text-slate-500">{unit}</span>
            </div>
            <p className="text-sm text-slate-600 mt-2.5 max-w-lg leading-relaxed">
              {governedByMachine ? (
                <>
                  The machine minimum governs. Impingement mixing needs{' '}
                  {isNumber(machine.min_pressure_bar) && (
                    <strong className="text-slate-900">
                      {p(machine.min_pressure_bar)} {unit}
                    </strong>
                  )}{' '}
                  whatever the line asks for — and this line asks for only{' '}
                  {isNumber(demand) && (
                    <strong className="text-slate-900">{p(demand)} {unit}</strong>
                  )}
                  {isNumber(pipeDrop) && (
                    <> ({p(pipeDrop)} {unit} of pipe drop plus machine losses)</>
                  )}.
                </>
              ) : (
                <>
                  The line demand governs:{' '}
                  {isNumber(pipeDrop) && (
                    <strong className="text-slate-900">{p(pipeDrop)} {unit}</strong>
                  )}{' '}
                  of pipe drop plus the machine's own internal losses.
                </>
              )}
            </p>
          </div>

          <div className="flex-shrink-0 md:w-72">
            <p className="text-xs font-semibold text-slate-500 mb-2">Machine operating window</p>
            <MachineWindow
              min={machine.min_pressure_bar}
              max={machine.max_pressure_bar}
              setPoint={machine.set_pressure_bar}
              unit={unit}
            />
            <div
              className={`mt-3 badge ${machine.is_compatible ? 'badge-success' : 'badge-error'}`}
            >
              {machine.is_compatible ? (
                <><CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 mr-1" /> Machine is compatible</>
              ) : (
                <><AlertTriangle aria-hidden="true" className="w-3.5 h-3.5 mr-1" /> Outside the machine's range</>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Where the set point falls inside the machine's pressure range. */
function MachineWindow({
  min,
  max,
  setPoint,
  unit,
}: {
  min?: number
  max?: number
  setPoint: number
  unit: PressureUnit
}) {
  if (!isNumber(min) || !isNumber(max) || max <= 0) return null

  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  const minPct = clamp((min / max) * 100)
  const setPct = clamp((setPoint / max) * 100)

  return (
    <>
      <div className="relative h-2.5 rounded-full bg-slate-100 overflow-hidden">
        {/* Below the minimum the machine cannot hold — hatched rather than coloured */}
        <div
          className="absolute inset-y-0 left-0 bg-slate-200"
          style={{ width: `${minPct}%` }}
        />
        <div
          className="absolute inset-y-0 bg-indigo-200"
          style={{ left: `${minPct}%`, right: 0 }}
        />
        <div
          className="absolute -top-1 w-1 h-4.5 rounded bg-indigo-600"
          style={{ left: `calc(${setPct}% - 2px)`, height: '1.125rem' }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-slate-500 mt-1.5 tabular-nums">
        <span>0</span>
        <span className="text-indigo-700 font-bold">{formatPressure(min, unit)} min</span>
        <span>{formatPressure(max, unit)} max</span>
      </div>
    </>
  )
}

/**
 * How much room is left before the line turns turbulent.
 *
 * Reporting "laminar" and stopping tells an operator the state they are in but not how close
 * to the edge it is, nor which dial to move if they have crossed it. Avoiding turbulence is
 * the reason this tool exists, so the margin is a headline, not a detail.
 */
function LaminarEnvelopeCard({ envelope }: { envelope?: LaminarEnvelope }) {
  if (!envelope || !envelope.recommendation) return null

  const laminar = envelope.is_laminar
  const ratio = envelope.flow_headroom_ratio
  const tight = laminar && isNumber(ratio) && ratio < 1.25

  const tone = !laminar
    ? 'bg-red-50 border-red-100'
    : tight
      ? 'bg-amber-50 border-amber-100'
      : 'bg-emerald-50 border-emerald-100'

  const textTone = !laminar
    ? 'text-red-800'
    : tight
      ? 'text-amber-800'
      : 'text-emerald-800'

  return (
    <div className={`rounded-xl border p-5 ${tone}`} data-testid="laminar-envelope">
      <div className="flex items-start gap-3">
        {laminar && !tight ? (
          <CheckCircle2 aria-hidden="true" className={`w-5 h-5 flex-shrink-0 mt-0.5 ${textTone}`} />
        ) : (
          <AlertTriangle aria-hidden="true" className={`w-5 h-5 flex-shrink-0 mt-0.5 ${textTone}`} />
        )}
        <div className="min-w-0">
          <h4 className={`font-bold ${textTone}`}>
            {laminar ? (tight ? 'Laminar, with little margin' : 'Laminar flow') : 'Turbulent flow'}
          </h4>
          <p className={`text-sm mt-1 leading-relaxed ${textTone}`}>
            {envelope.recommendation}
          </p>
          {isNumber(envelope.max_laminar_flow_lpm) && (
            <p className="text-xs text-slate-600 mt-2 tabular-nums">
              Re {envelope.reynolds_number.toFixed(0)} now · turbulence at Re{' '}
              {envelope.laminar_limit?.toFixed(0) ?? '2300'}
              {isNumber(envelope.min_laminar_diameter_mm) &&
                envelope.min_laminar_diameter_mm > 1 && (
                  <> · needs a line of at least {envelope.min_laminar_diameter_mm.toFixed(1)} mm
                  at this flow rate</>
                )}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  unit,
  icon,
  status = 'neutral',
}: {
  title: string
  value: string | number
  unit: string
  icon: React.ReactNode
  status?: 'success' | 'warning' | 'neutral'
}) {
  const statusColors = {
    success: 'bg-emerald-100 text-emerald-600',
    warning: 'bg-amber-100 text-amber-600',
    neutral: 'bg-slate-100 text-slate-600',
  }

  // Stable hook for the end-to-end tests. Titles are styled text inside nested divs, so
  // matching on them alone selects the label element rather than the card holding the value.
  const testId = `kpi-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  return (
    <div className="card hover:shadow-md transition-shadow" data-testid={testId}>
      <div className="card-body">
        <div className="flex justify-between items-start mb-2">
          <span className="text-sm font-medium text-slate-500">{title}</span>
          {/* Decorative: every icon here restates the title beside it */}
          <div aria-hidden="true" className={`p-2 rounded-lg ${statusColors[status]}`}>
            {icon}
          </div>
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

/** Always a pressure, so it converts to the chosen unit rather than taking a raw number. */
function PressureDetail({
  label,
  value,
  unit,
}: {
  label: string
  value?: number
  unit: PressureUnit
}) {
  if (value === undefined || value === null) return null

  return (
    <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="text-2xl font-bold text-indigo-600 tabular-nums">
        {formatPressure(value, unit)}{' '}
        <span className="text-sm font-medium text-slate-500">{unit}</span>
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
