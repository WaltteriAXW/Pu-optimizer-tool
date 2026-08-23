import React, { useState, useCallback, useEffect, useId } from 'react'
import { useCalculator } from '../context/CalculatorContext'
import { VALIDATION_RANGES, DEFAULTS, type RangeSpec } from '../constants'
import { getDefaultMaterialProvider } from '@/services/MaterialProvider'
import { getLastInputs, saveLastInputs } from '@/services/displayPreferences'
import type { ProcessParameters } from '@/calculator_types'
import { AlertCircle, Play, ChevronDown, ChevronUp } from 'lucide-react'

/** Default values pre-filled when the user switches to Custom Material */
const CUSTOM_MATERIAL_DEFAULTS: Required<Pick<
  ProcessParameters,
  'viscosity_cp' | 'density_kg_m3' | 'flow_index' | 'activation_energy_j_mol'
>> = {
  viscosity_cp: 350,
  density_kg_m3: 1120,
  flow_index: 0.85,
  activation_energy_j_mol: 25000,
}

/**
 * Optional inputs. Leaving one blank sends nothing, which keeps the calculation exactly
 * as it was before these existed — supplying an ambient temperature switches on the line
 * thermal model, and a part thickness adds the cure prediction.
 */
const OPTIONAL_FIELD_RANGES: Record<
  'ambient_temperature_c' | 'idle_time_s' | 'mold_temperature_c' | 'part_thickness_mm',
  { min: number; max: number; label: string; unit: string; step: string; help: string }
> = {
  ambient_temperature_c: {
    min: -20, max: 60, label: 'Ambient Temperature', unit: '°C', step: '0.5',
    help: 'Air around the hose and machine. Supplying this models the material drifting toward it.',
  },
  idle_time_s: {
    min: 0, max: 86400, label: 'Time Since Last Shot', unit: 's', step: '30',
    help: 'For single-shot work: material standing in the hose approaches ambient temperature.',
  },
  mold_temperature_c: {
    min: 0, max: 120, label: 'Mould Temperature', unit: '°C', step: '1',
    help: 'Defaults to the data sheet value where one is stated.',
  },
  part_thickness_mm: {
    min: 1, max: 500, label: 'Part Thickness', unit: 'mm', step: '1',
    help: 'Thicker sections retain reaction heat and run hotter in the core.',
  },
}

/**
 * The four standard fields, keyed by the input `name` they carry.
 *
 * This table exists because there was no mapping between the two: the change handler called
 * `validateInput(name, …)` with 'pipe_length_mm', while VALIDATION_RANGES is keyed
 * 'pipeLength', and `validateInput` treats a field it does not recognise as valid. The four
 * main inputs therefore accepted anything — 1 mm of pipe, 900 °C — with no inline error and
 * no disabled submit, and the value was only rejected later by the Python layer. The custom
 * and optional fields never had the fault because they already validate against tables keyed
 * this way; these now do the same.
 */
const STANDARD_FIELD_RANGES: Record<
  'pipe_length_mm' | 'pipe_diameter_mm' | 'temperature_c' | 'flow_rate_lpm',
  RangeSpec
> = {
  pipe_length_mm: VALIDATION_RANGES.pipeLength,
  pipe_diameter_mm: VALIDATION_RANGES.pipeDiameter,
  temperature_c: VALIDATION_RANGES.temperature,
  flow_rate_lpm: VALIDATION_RANGES.flowRate,
}

/** Validation ranges for custom material numeric fields */
const CUSTOM_FIELD_RANGES: Record<
  'viscosity_cp' | 'density_kg_m3' | 'flow_index' | 'activation_energy_j_mol',
  { min: number; max: number; label: string; unit: string; step: string }
> = {
  viscosity_cp:             { min: 50,    max: 10000,  label: 'Viscosity',          unit: 'cP',    step: '1'     },
  density_kg_m3:            { min: 900,   max: 1500,   label: 'Density',            unit: 'kg/m³', step: '1'     },
  flow_index:               { min: 0.01,  max: 1.0,    label: 'Flow Index',         unit: '(0–1)', step: '0.01'  },
  activation_energy_j_mol:  { min: 1000,  max: 100000, label: 'Activation Energy',  unit: 'J/mol', step: '100'   },
}

export function CalculatorForm() {
  const { calculate, isLoading, isReady, error, loadProgress } = useCalculator()

  // The last setup comes back on load. Only recognised numeric fields are taken from
  // storage, and the material is deliberately left for the effect below to resolve against
  // the database — a key saved by an older version may no longer exist in the CSV.
  const [inputs, setInputs] = useState<ProcessParameters>(() => {
    const base: ProcessParameters = {
      pipe_length_mm: DEFAULTS.pipeLength,
      pipe_diameter_mm: DEFAULTS.pipeDiameter,
      temperature_c: DEFAULTS.temperature,
      flow_rate_lpm: DEFAULTS.flowRate,
      material_key: '',
      machine_type: 'high_pressure',
    }

    const stored = getLastInputs()
    if (!stored) return base

    const restored: ProcessParameters = { ...base }
    for (const [key, value] of Object.entries(stored)) {
      if (key === 'material_key' || key === 'machine_type') {
        if (typeof value === 'string' && value) {
          restored[key] = value
        }
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        (restored as unknown as Record<string, unknown>)[key] = value
      }
    }
    return restored
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showCustomHelp, setShowCustomHelp] = useState(false)
  const [showOptional, setShowOptional] = useState(false)

  // Ids for the controls this component renders directly. The reusable field components
  // generate their own.
  const materialSelectId = useId()
  const materialErrorId = `${materialSelectId}-error`
  const machineSelectId = useId()
  const customPanelId = useId()
  const optionalPanelId = useId()

  // Materials come from the database CSV, so adding one needs no change here.
  const [materials, setMaterials] = useState<Array<{ id: string; name: string }>>([])
  const [materialError, setMaterialError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    getDefaultMaterialProvider()
      .getAll()
      .then((loaded) => {
        if (cancelled) return
        setMaterials(loaded.map(({ id, name }) => ({ id, name })))
        setInputs((prev) => {
          if (loaded.length === 0) return prev
          // A restored key that is no longer in the database falls back to the first
          // material rather than leaving the form pointing at something that cannot be
          // calculated. 'custom' is always valid — it needs no database entry.
          const known =
            prev.material_key === 'custom' ||
            loaded.some((material) => material.id === prev.material_key)
          return known ? prev : { ...prev, material_key: loaded[0].id }
        })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setMaterialError(e instanceof Error ? e.message : 'Failed to load material database')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target

      // ── Material selector ─────────────────────────────────────────────────
      if (name === 'material_key') {
        if (value === 'custom') {
          // Pre-fill with sensible defaults so the form is immediately valid
          setInputs((prev) => ({
            ...prev,
            material_key: 'custom',
            ...CUSTOM_MATERIAL_DEFAULTS,
          }))
        } else {
          // Strip custom properties; preset values are injected by CalculationService
          setInputs((prev) => {
            const {
              viscosity_cp,
              density_kg_m3,
              flow_index,
              activation_energy_j_mol,
              polyol_sg,
              iso_sg,
              final_density_kg_m3,
              ...rest
            } = prev
            return { ...rest, material_key: value }
          })
          // Clear any leftover custom-field errors
          setFieldErrors((prev) => {
            const updated = { ...prev }
            for (const key of Object.keys(CUSTOM_FIELD_RANGES)) {
              delete updated[key]
            }
            return updated
          })
        }
        return
      }

      // ── Machine type selector ─────────────────────────────────────────────
      if (name === 'machine_type') {
        setInputs((prev) => ({ ...prev, machine_type: value }))
        return
      }

      // ── Optional inputs ───────────────────────────────────────────────────
      // Clearing one must remove the key entirely, not leave the last value behind:
      // an absent ambient temperature is what keeps the calculation as it was.
      if (name in OPTIONAL_FIELD_RANGES && value.trim() === '') {
        setInputs((prev) => {
          const next = { ...prev }
          delete next[name as keyof ProcessParameters]
          return next
        })
        setFieldErrors((prev) => { const u = { ...prev }; delete u[name]; return u })
        return
      }

      // ── All numeric inputs ────────────────────────────────────────────────
      const numValue = parseFloat(value)
      if (!isNaN(numValue)) {
        setInputs((prev) => ({ ...prev, [name]: numValue } as ProcessParameters))

        // Optional field validation
        if (name in OPTIONAL_FIELD_RANGES) {
          const range = OPTIONAL_FIELD_RANGES[name as keyof typeof OPTIONAL_FIELD_RANGES]
          if (numValue < range.min || numValue > range.max) {
            setFieldErrors((prev) => ({
              ...prev,
              [name]: `${range.label} must be between ${range.min} and ${range.max} ${range.unit}`.trim(),
            }))
          } else {
            setFieldErrors((prev) => { const u = { ...prev }; delete u[name]; return u })
          }
          return
        }

        // Custom material field validation
        if (name in CUSTOM_FIELD_RANGES) {
          const range = CUSTOM_FIELD_RANGES[name as keyof typeof CUSTOM_FIELD_RANGES]
          if (numValue < range.min || numValue > range.max) {
            setFieldErrors((prev) => ({
              ...prev,
              [name]: `${range.label} must be between ${range.min} and ${range.max} ${range.unit}`.trim(),
            }))
          } else {
            setFieldErrors((prev) => { const u = { ...prev }; delete u[name]; return u })
          }
          return
        }

        // Standard field validation, against the range this field is actually displayed
        // with rather than a key that never matched
        const standard = STANDARD_FIELD_RANGES[name as keyof typeof STANDARD_FIELD_RANGES]
        if (standard) {
          if (numValue < standard.min) {
            setFieldErrors((prev) => ({
              ...prev,
              [name]: `${standard.name} must be at least ${standard.min} ${standard.unit}`,
            }))
          } else if (numValue > standard.max) {
            setFieldErrors((prev) => ({
              ...prev,
              [name]: `${standard.name} must not exceed ${standard.max} ${standard.unit}`,
            }))
          } else {
            setFieldErrors((prev) => { const u = { ...prev }; delete u[name]; return u })
          }
        }
      }
    },
    []
  )

  // Saved on submit rather than on every keystroke: what is worth restoring is a setup
  // someone actually calculated with, not a half-typed number.
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (Object.keys(fieldErrors).length === 0 && isReady) {
        saveLastInputs({ ...inputs } as unknown as Record<string, unknown>)
        calculate(inputs)
      }
    },
    [fieldErrors, isReady, inputs, calculate]
  )

  const hasErrors = Object.keys(fieldErrors).length > 0
  const canSubmit = !hasErrors && isReady && !isLoading && inputs.material_key !== ''
  const isCustomMaterial = inputs.material_key === 'custom'

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-bold text-slate-800">Process Parameters</h2>
        <p className="text-xs text-slate-500 mt-1">Configure your injection settings</p>
      </div>

      <form onSubmit={handleSubmit} className="card-body space-y-5">
        {/* Pipe Length */}
        <InputField
          label="Pipe Length"
          name="pipe_length_mm"
          value={inputs.pipe_length_mm}
          onChange={handleChange}
          unit={VALIDATION_RANGES.pipeLength.unit}
          range={VALIDATION_RANGES.pipeLength}
          error={fieldErrors.pipe_length_mm}
        />

        {/* Pipe Diameter */}
        <InputField
          label="Pipe Diameter"
          name="pipe_diameter_mm"
          value={inputs.pipe_diameter_mm}
          onChange={handleChange}
          unit={VALIDATION_RANGES.pipeDiameter.unit}
          range={VALIDATION_RANGES.pipeDiameter}
          error={fieldErrors.pipe_diameter_mm}
        />

        {/* Temperature */}
        <InputField
          label="Material Temperature"
          name="temperature_c"
          value={inputs.temperature_c}
          onChange={handleChange}
          unit={VALIDATION_RANGES.temperature.unit}
          range={VALIDATION_RANGES.temperature}
          error={fieldErrors.temperature_c}
        />

        {/* Flow Rate */}
        <InputField
          label="Flow Rate"
          name="flow_rate_lpm"
          value={inputs.flow_rate_lpm}
          onChange={handleChange}
          unit={VALIDATION_RANGES.flowRate.unit}
          range={VALIDATION_RANGES.flowRate}
          error={fieldErrors.flow_rate_lpm}
        />

        {/* Material Selection */}
        <div className="mb-5">
          <label
            htmlFor={materialSelectId}
            className="text-sm font-semibold text-slate-700 block mb-1.5"
          >
            Material Type
          </label>
          <select
            id={materialSelectId}
            name="material_key"
            value={inputs.material_key}
            onChange={handleChange}
            aria-invalid={materialError ? true : undefined}
            aria-describedby={materialError ? materialErrorId : undefined}
            className="block w-full px-3 py-2.5 text-sm font-medium border border-slate-300 rounded-lg shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-slate-400 bg-white"
          >
            {materials.length === 0 && !materialError && (
              <option value="">Loading materials…</option>
            )}
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name}
              </option>
            ))}
            <option value="custom">Custom Material…</option>
          </select>
          {materialError && (
            <p
              id={materialErrorId}
              role="alert"
              className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600"
            >
              <AlertCircle aria-hidden="true" className="w-3 h-3" />
              <span>{materialError}</span>
            </p>
          )}
        </div>

        {/* Custom Material Properties — shown only when Custom is selected */}
        {isCustomMaterial && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                Custom Material Properties
              </p>
              <button
                type="button"
                onClick={() => setShowCustomHelp((v) => !v)}
                aria-expanded={showCustomHelp}
                aria-controls={customPanelId}
                className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
              >
                {showCustomHelp ? (
                  <><ChevronUp aria-hidden="true" className="w-3 h-3" /> Hide help</>
                ) : (
                  <><ChevronDown aria-hidden="true" className="w-3 h-3" /> What are these?</>
                )}
              </button>
            </div>

            {showCustomHelp && (
              <div
                id={customPanelId}
                className="text-xs text-indigo-600 bg-indigo-100 rounded-md p-3 space-y-1 leading-relaxed"
              >
                <p><strong>Viscosity (cP):</strong> Dynamic viscosity at reference temperature (25 °C). Controls flow resistance.</p>
                <p><strong>Density (kg/m³):</strong> Bulk liquid density of the mixed material before foaming.</p>
                <p><strong>Flow Index (0–1):</strong> Power-law exponent for non-Newtonian behaviour. 1.0 = Newtonian; typical PU foams: 0.8–0.9.</p>
                <p><strong>Activation Energy (J/mol):</strong> Arrhenius energy controlling how viscosity changes with temperature. Typical range: 20 000–35 000 J/mol.</p>
              </div>
            )}

            <CustomMaterialField
              label="Viscosity"
              name="viscosity_cp"
              value={inputs.viscosity_cp ?? CUSTOM_MATERIAL_DEFAULTS.viscosity_cp}
              onChange={handleChange}
              unit="cP"
              range={CUSTOM_FIELD_RANGES.viscosity_cp}
              error={fieldErrors.viscosity_cp}
            />

            <CustomMaterialField
              label="Density"
              name="density_kg_m3"
              value={inputs.density_kg_m3 ?? CUSTOM_MATERIAL_DEFAULTS.density_kg_m3}
              onChange={handleChange}
              unit="kg/m³"
              range={CUSTOM_FIELD_RANGES.density_kg_m3}
              error={fieldErrors.density_kg_m3}
            />

            <CustomMaterialField
              label="Flow Index"
              name="flow_index"
              value={inputs.flow_index ?? CUSTOM_MATERIAL_DEFAULTS.flow_index}
              onChange={handleChange}
              unit="(0–1)"
              range={CUSTOM_FIELD_RANGES.flow_index}
              error={fieldErrors.flow_index}
            />

            <CustomMaterialField
              label="Activation Energy"
              name="activation_energy_j_mol"
              value={inputs.activation_energy_j_mol ?? CUSTOM_MATERIAL_DEFAULTS.activation_energy_j_mol}
              onChange={handleChange}
              unit="J/mol"
              range={CUSTOM_FIELD_RANGES.activation_energy_j_mol}
              error={fieldErrors.activation_energy_j_mol}
            />
          </div>
        )}

        {/* Machine Type */}
        <div className="mb-5">
          <label
            htmlFor={machineSelectId}
            className="text-sm font-semibold text-slate-700 block mb-1.5"
          >
            Machine Type
          </label>
          <select
            id={machineSelectId}
            name="machine_type"
            value={inputs.machine_type}
            onChange={handleChange}
            className="block w-full px-3 py-2.5 text-sm font-medium border border-slate-300 rounded-lg shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-slate-400 bg-white"
          >
            <option value="low_pressure">Low Pressure</option>
            <option value="high_pressure">High Pressure</option>
          </select>
        </div>

        {/* Optional: ambient conditions and part geometry */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Optional
            </p>
            <button
              type="button"
              onClick={() => setShowOptional((v) => !v)}
              aria-expanded={showOptional}
              aria-controls={optionalPanelId}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              {showOptional ? (
                <><ChevronUp aria-hidden="true" className="w-3 h-3" /> Hide</>
              ) : (
                <><ChevronDown aria-hidden="true" className="w-3 h-3" /> Ambient conditions &amp; part</>
              )}
            </button>
          </div>

          {showOptional && (
            <div id={optionalPanelId} className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Leave blank to calculate from the set point alone. An ambient temperature models
                the material drifting toward the surrounding air in the hose — which matters
                for single-shot work — and a part thickness adds a cure prediction for the
                moulded part.
              </p>

              {(['ambient_temperature_c', 'idle_time_s', 'mold_temperature_c', 'part_thickness_mm'] as const).map(
                (name) => (
                  <OptionalField
                    key={name}
                    name={name}
                    value={inputs[name]}
                    onChange={handleChange}
                    spec={OPTIONAL_FIELD_RANGES[name]}
                    error={fieldErrors[name]}
                  />
                )
              )}
            </div>
          )}
        </div>

        {/* Status Messages */}
        {error && (
          <div
            role="alert"
            className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
          >
            <AlertCircle aria-hidden="true" className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-900">Error</h4>
              <p className="text-sm text-red-800 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Announced rather than merely shown: the engine takes several seconds to boot on
            a first visit, and until it does the submit button is disabled for a reason a
            screen reader user would otherwise have no way to learn.

            The progress is real where it can be. The runtime download reports nothing until
            it finishes, so that stage says what it is fetching and roughly how large;
            mounting the sources is a loop over a known list, so that stage counts. An
            animated bar standing in for both would be a decoration, not information. */}
        {!isReady && (
          <div
            role="status"
            className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3"
          >
            <div
              aria-hidden="true"
              className="w-5 h-5 border-2 border-amber-400 border-t-amber-600 rounded-full animate-spin flex-shrink-0 mt-0.5"
            />
            <div className="min-w-0 flex-grow">
              <h4 className="text-sm font-semibold text-amber-900">Starting the engine</h4>
              <p className="text-sm text-amber-800 mt-0.5">
                {loadProgress?.message ?? 'Loading Python physics engine…'}
              </p>
              {loadProgress?.total ? (
                <>
                  <div
                    className="mt-2 h-1.5 rounded-full bg-amber-200 overflow-hidden"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={loadProgress.total}
                    aria-valuenow={loadProgress.loaded ?? 0}
                    aria-label="Loading the physics engine"
                  >
                    <div
                      className="h-full bg-amber-500 transition-[width] duration-150"
                      style={{
                        width: `${((loadProgress.loaded ?? 0) / loadProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-amber-700 mt-1 tabular-nums">
                    {loadProgress.loaded} of {loadProgress.total} modules
                  </p>
                </>
              ) : null}
              <p className="text-xs text-amber-700 mt-1">
                Runs entirely in your browser; nothing is uploaded.
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="mt-8">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-white shadow-md transition-all transform active:scale-95 ${
              !canSubmit
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'
            }`}
          >
            {isLoading ? (
              <>
                <div
                  aria-hidden="true"
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                />
                Calculating...
              </>
            ) : !isReady ? (
              'Loading Engine...'
            ) : (
              <>
                Run Simulation <Play aria-hidden="true" className="w-4 h-4 fill-current" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * Reusable input field component with unit badge.
 *
 * The label is tied to the input by id rather than merely sitting above it: without that
 * association a screen reader announces "edit, blank" with no indication of which field it
 * is, and clicking the label does not focus the input.
 */
function InputField({
  label,
  name,
  value,
  onChange,
  unit,
  range,
  error,
}: {
  label: string
  name: string
  value: number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  unit: string
  range: any
  error?: string
}) {
  const id = useId()
  const rangeId = `${id}-range`
  const errorId = `${id}-error`

  return (
    <div className="mb-5 group">
      <div className="flex justify-between items-baseline mb-1.5">
        <label htmlFor={id} className="text-sm font-semibold text-slate-700">
          {label}
        </label>
        <span id={rangeId} className="text-xs text-slate-400">
          {range.min}-{range.max} {unit}
        </span>
      </div>
      <div className="relative">
        <input
          id={id}
          type="number"
          name={name}
          value={value}
          onChange={onChange}
          step="any"
          aria-invalid={error ? true : undefined}
          // The accepted range is read out with the field, and the error too once there is
          // one — otherwise the reason a value was rejected is visible only to sighted users
          aria-describedby={error ? `${errorId} ${rangeId}` : rangeId}
          className={`block w-full pl-3 pr-12 py-2.5 text-sm font-medium rounded-lg border shadow-sm transition-all outline-none ${
            error
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500'
              : 'border-slate-300 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-slate-400'
          }`}
        />
        {/* Repeats the unit already announced with the range, so it is decorative here */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
        >
          <span className={`text-sm font-medium ${error ? 'text-red-500' : 'text-slate-400'}`}>
            {unit}
          </span>
        </div>
      </div>
      {error && (
        <div
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600"
        >
          <AlertCircle aria-hidden="true" className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Optional input. An empty value is meaningful — it means "not supplied" — so this is a
 * controlled field over `number | undefined` rather than defaulting to a number.
 */
function OptionalField({
  name,
  value,
  onChange,
  spec,
  error,
}: {
  name: string
  value: number | undefined
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  spec: { min: number; max: number; label: string; unit: string; step: string; help: string }
  error?: string
}) {
  const id = useId()
  const rangeId = `${id}-range`
  const helpId = `${id}-help`
  const errorId = `${id}-error`

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <label htmlFor={id} className="text-xs font-semibold text-slate-700">
          {spec.label}
        </label>
        <span id={rangeId} className="text-xs text-slate-400">
          {spec.min}–{spec.max} {spec.unit}
        </span>
      </div>
      <div className="relative">
        <input
          id={id}
          type="number"
          name={name}
          value={value ?? ''}
          placeholder="not set"
          onChange={onChange}
          step={spec.step}
          aria-invalid={error ? true : undefined}
          // The help text explains what supplying this field switches on, which is the
          // whole point of an optional input — it belongs in the announcement
          aria-describedby={
            error ? `${errorId} ${helpId} ${rangeId}` : `${helpId} ${rangeId}`
          }
          className={`block w-full pl-3 pr-16 py-2 text-sm font-medium rounded-lg border shadow-sm transition-all outline-none ${
            error
              ? 'border-red-300 bg-white text-red-900 focus:ring-2 focus:ring-red-500 focus:border-red-500'
              : 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-slate-400'
          }`}
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none"
        >
          <span className={`text-xs font-medium ${error ? 'text-red-500' : 'text-slate-400'}`}>
            {spec.unit}
          </span>
        </div>
      </div>
      <p id={helpId} className="mt-1 text-xs text-slate-500 leading-snug">
        {spec.help}
      </p>
      {error && (
        <div
          id={errorId}
          role="alert"
          className="mt-1 flex items-center gap-1.5 text-xs text-red-600"
        >
          <AlertCircle aria-hidden="true" className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Compact input field used inside the Custom Material panel
 */
function CustomMaterialField({
  label,
  name,
  value,
  onChange,
  unit,
  range,
  error,
}: {
  label: string
  name: string
  value: number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  unit: string
  range: { min: number; max: number; step: string }
  error?: string
}) {
  const id = useId()
  const rangeId = `${id}-range`
  const errorId = `${id}-error`

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <label htmlFor={id} className="text-xs font-semibold text-slate-700">
          {label}
        </label>
        <span id={rangeId} className="text-xs text-slate-400">
          {range.min}–{range.max} {unit}
        </span>
      </div>
      <div className="relative">
        <input
          id={id}
          type="number"
          name={name}
          value={value}
          onChange={onChange}
          step={range.step}
          min={range.min}
          max={range.max}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${errorId} ${rangeId}` : rangeId}
          className={`block w-full pl-3 pr-16 py-2 text-sm font-medium rounded-lg border shadow-sm transition-all outline-none ${
            error
              ? 'border-red-300 bg-white text-red-900 focus:ring-2 focus:ring-red-500 focus:border-red-500'
              : 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-slate-400'
          }`}
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none"
        >
          <span className={`text-xs font-medium ${error ? 'text-red-500' : 'text-slate-400'}`}>
            {unit}
          </span>
        </div>
      </div>
      {error && (
        <div
          id={errorId}
          role="alert"
          className="mt-1 flex items-center gap-1.5 text-xs text-red-600"
        >
          <AlertCircle aria-hidden="true" className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
