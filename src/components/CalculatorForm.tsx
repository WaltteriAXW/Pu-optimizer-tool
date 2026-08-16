import React, { useState, useCallback, useEffect } from 'react'
import { useCalculator } from '../context/CalculatorContext'
import { VALIDATION_RANGES, DEFAULTS, validateInput } from '../constants'
import { getDefaultMaterialProvider } from '@/services/MaterialProvider'
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
  const { calculate, isLoading, isReady, error } = useCalculator()

  const [inputs, setInputs] = useState<ProcessParameters>({
    pipe_length_mm: DEFAULTS.pipeLength,
    pipe_diameter_mm: DEFAULTS.pipeDiameter,
    temperature_c: DEFAULTS.temperature,
    flow_rate_lpm: DEFAULTS.flowRate,
    material_key: '',
    machine_type: 'high_pressure',
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showCustomHelp, setShowCustomHelp] = useState(false)

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
        // Select the first material once, without clobbering a user's choice
        setInputs((prev) =>
          prev.material_key === '' && loaded.length > 0
            ? { ...prev, material_key: loaded[0].id }
            : prev
        )
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

      // ── All numeric inputs ────────────────────────────────────────────────
      const numValue = parseFloat(value)
      if (!isNaN(numValue)) {
        setInputs((prev) => ({ ...prev, [name]: numValue } as ProcessParameters))

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

        // Standard field validation
        const validation = validateInput(name, numValue)
        if (!validation.valid) {
          setFieldErrors((prev) => ({ ...prev, [name]: validation.error || 'Invalid' }))
        } else {
          setFieldErrors((prev) => { const updated = { ...prev }; delete updated[name]; return updated })
        }
      }
    },
    []
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (Object.keys(fieldErrors).length === 0 && isReady) {
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
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">
            Material Type
          </label>
          <select
            name="material_key"
            value={inputs.material_key}
            onChange={handleChange}
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
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="w-3 h-3" />
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
                className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
              >
                {showCustomHelp ? (
                  <><ChevronUp className="w-3 h-3" /> Hide help</>
                ) : (
                  <><ChevronDown className="w-3 h-3" /> What are these?</>
                )}
              </button>
            </div>

            {showCustomHelp && (
              <div className="text-xs text-indigo-600 bg-indigo-100 rounded-md p-3 space-y-1 leading-relaxed">
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
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">
            Machine Type
          </label>
          <select
            name="machine_type"
            value={inputs.machine_type}
            onChange={handleChange}
            className="block w-full px-3 py-2.5 text-sm font-medium border border-slate-300 rounded-lg shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-slate-400 bg-white"
          >
            <option value="low_pressure">Low Pressure</option>
            <option value="high_pressure">High Pressure</option>
          </select>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-900">Error</h4>
              <p className="text-sm text-red-800 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {!isReady && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <div className="w-5 h-5 border-2 border-amber-400 border-t-amber-600 rounded-full animate-spin flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900">Initializing Engine</h4>
              <p className="text-sm text-amber-800 mt-0.5">
                Loading Python physics engine...
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
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Calculating...
              </>
            ) : !isReady ? (
              'Loading Engine...'
            ) : (
              <>
                Run Simulation <Play className="w-4 h-4 fill-current" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * Reusable input field component with unit badge
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
  return (
    <div className="mb-5 group">
      <div className="flex justify-between items-baseline mb-1.5">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        <span className="text-xs text-slate-400">
          {range.min}-{range.max} {unit}
        </span>
      </div>
      <div className="relative">
        <input
          type="number"
          name={name}
          value={value}
          onChange={onChange}
          step="any"
          className={`block w-full pl-3 pr-12 py-2.5 text-sm font-medium rounded-lg border shadow-sm transition-all outline-none ${
            error
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500'
              : 'border-slate-300 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-slate-400'
          }`}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className={`text-sm font-medium ${error ? 'text-red-500' : 'text-slate-400'}`}>
            {unit}
          </span>
        </div>
      </div>
      {error && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3 h-3" />
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
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <label className="text-xs font-semibold text-slate-700">{label}</label>
        <span className="text-xs text-slate-400">
          {range.min}–{range.max} {unit}
        </span>
      </div>
      <div className="relative">
        <input
          type="number"
          name={name}
          value={value}
          onChange={onChange}
          step={range.step}
          min={range.min}
          max={range.max}
          className={`block w-full pl-3 pr-16 py-2 text-sm font-medium rounded-lg border shadow-sm transition-all outline-none ${
            error
              ? 'border-red-300 bg-white text-red-900 focus:ring-2 focus:ring-red-500 focus:border-red-500'
              : 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-slate-400'
          }`}
        />
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
          <span className={`text-xs font-medium ${error ? 'text-red-500' : 'text-slate-400'}`}>
            {unit}
          </span>
        </div>
      </div>
      {error && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
