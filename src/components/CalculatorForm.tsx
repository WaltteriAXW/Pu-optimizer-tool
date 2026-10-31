import React, { useState, useCallback, useEffect, useId } from 'react'
import { useCalculator } from '../context/CalculatorContext'
import { VALIDATION_RANGES, DEFAULTS, type RangeSpec } from '../constants'
import { getDefaultMaterialProvider } from '@/services/MaterialProvider'
import { getLastInputs, getPreferences, saveLastInputs } from '@/services/displayPreferences'
import type {
  ProcessParameters,
  HoseMaterial,
  InsulationMaterial,
  RheologyModelName,
} from '@/calculator_types'
import { AlertCircle, Play, ChevronDown } from 'lucide-react'
import { PopUpSelect, SegmentedControl } from './controls'
import {
  fromSliderPosition,
  SLIDER_STEPS,
  toSliderPosition,
  type SliderScale,
} from './sliderScale'

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
  { min: number; max: number; label: string; unit: string; help: string }
> = {
  ambient_temperature_c: {
    min: -20, max: 60, label: 'Ambient Temperature', unit: '°C',
    help: 'Air around the hose and machine. Supplying this models the material drifting toward it.',
  },
  idle_time_s: {
    min: 0, max: 86400, label: 'Time Since Last Shot', unit: 's',
    help: 'For single-shot work: material standing in the hose approaches ambient temperature.',
  },
  mold_temperature_c: {
    min: 0, max: 120, label: 'Mould Temperature', unit: '°C',
    help: 'Defaults to the data sheet value where one is stated.',
  },
  part_thickness_mm: {
    min: 1, max: 500, label: 'Part Thickness', unit: 'mm',
    help: 'Thicker sections retain reaction heat and run hotter in the core.',
  },
}

/**
 * How the hose is built. Only acts when an ambient temperature is given, because it is the
 * line thermal model it feeds. Labels match the keys in hose_heat_transfer.py.
 */
const HOSE_MATERIAL_OPTIONS: Array<{ value: HoseMaterial; label: string }> = [
  { value: 'rubber', label: 'Rubber / elastomer hose' },
  { value: 'ptfe', label: 'PTFE hose (braided)' },
  { value: 'polyamide', label: 'Polyamide (nylon) tube' },
  { value: 'stainless_steel', label: 'Stainless steel pipe' },
  { value: 'steel', label: 'Carbon steel pipe' },
]

const INSULATION_OPTIONS: Array<{ value: InsulationMaterial; label: string }> = [
  { value: 'elastomeric_foam', label: 'Elastomeric foam (Armaflex type)' },
  { value: 'pe_foam', label: 'Polyethylene foam' },
  { value: 'mineral_wool', label: 'Mineral wool, foil-faced' },
]

const MACHINE_OPTIONS = [
  { value: 'low_pressure', label: 'Low pressure' },
  { value: 'high_pressure', label: 'High pressure' },
] as const

/** A tighter feed-line limit than the machine's own. Blank means the machine's. */
const LINE_LIMIT_RANGE = {
  min: 0.1, max: 500, label: 'Max Feed-Line Pressure', unit: 'bar',
  help: 'Optional. The operating window is solved against this or the machine limit, whichever is lower.',
}

const HOSE_FIELD_RANGES: Record<
  'hose_wall_thickness_mm' | 'insulation_thickness_mm',
  { min: number; max: number; label: string; unit: string; help: string }
> = {
  hose_wall_thickness_mm: {
    min: 0.1, max: 50, label: 'Hose Wall Thickness', unit: 'mm',
    help: 'Blank means 3 mm.',
  },
  insulation_thickness_mm: {
    min: 0, max: 100, label: 'Insulation Thickness', unit: 'mm',
    help: 'Thickness of the lagging around the hose.',
  },
}

/**
 * Viscosity models for a custom material. The power law is the default and needs only a
 * viscosity and flow index; the others want parameters from a measured flow curve.
 */
const RHEOLOGY_MODEL_OPTIONS: Array<{ value: RheologyModelName; label: string }> = [
  { value: 'power_law', label: 'Power law (viscosity + flow index)' },
  { value: 'carreau', label: 'Carreau (measured flow curve)' },
  { value: 'cross', label: 'Cross (measured flow curve)' },
  { value: 'herschel_bulkley', label: 'Herschel–Bulkley (yield stress)' },
]

type RheologyField =
  | 'zero_shear_viscosity_cp'
  | 'infinite_shear_viscosity_cp'
  | 'time_constant_s'
  | 'rheology_index'
  | 'yield_stress_pa'
  | 'consistency_pa_sn'

/** The fields each model takes, in display order, with the values it starts from */
const RHEOLOGY_MODEL_FIELDS: Record<
  Exclude<RheologyModelName, 'power_law'>,
  Partial<Record<RheologyField, number>>
> = {
  carreau: { zero_shear_viscosity_cp: 1500, time_constant_s: 0.05, rheology_index: 0.7 },
  cross: {
    zero_shear_viscosity_cp: 1500,
    infinite_shear_viscosity_cp: 50,
    time_constant_s: 0.1,
    rheology_index: 0.7,
  },
  herschel_bulkley: { yield_stress_pa: 10, consistency_pa_sn: 1.5, rheology_index: 0.8 },
}

const RHEOLOGY_FIELD_KEYS = Object.keys({
  zero_shear_viscosity_cp: 0,
  infinite_shear_viscosity_cp: 0,
  time_constant_s: 0,
  rheology_index: 0,
  yield_stress_pa: 0,
  consistency_pa_sn: 0,
} satisfies Record<RheologyField, number>) as RheologyField[]

/**
 * Ranges for the flow-curve fields. The flow index range depends on the model: Carreau and
 * Cross stop at 1, beyond which their stress can fall with shear rate; Herschel-Bulkley may
 * thicken a little.
 */
const rheologyFieldRange = (
  field: RheologyField,
  model: RheologyModelName | undefined
): { min: number; max: number; label: string; unit: string } => {
  switch (field) {
    case 'zero_shear_viscosity_cp':
      return { min: 1, max: 1_000_000, label: 'Zero-Shear Viscosity η₀', unit: 'cP' }
    case 'infinite_shear_viscosity_cp':
      return { min: 0, max: 100_000, label: 'Infinite-Shear Viscosity η∞', unit: 'cP' }
    case 'time_constant_s':
      return { min: 0.0001, max: 1000, label: 'Time Constant λ', unit: 's' }
    case 'yield_stress_pa':
      return { min: 0, max: 10_000, label: 'Yield Stress τ₀', unit: 'Pa' }
    case 'consistency_pa_sn':
      return { min: 0.001, max: 10_000, label: 'Consistency K', unit: 'Pa·sⁿ' }
    case 'rheology_index':
      return {
        min: 0.05,
        max: model === 'herschel_bulkley' ? 1.5 : 1,
        label: model === 'cross' ? 'Exponent m' : 'Flow Index n',
        unit: '',
      }
  }
}

/**
 * Text-valued optional inputs and the values each may take. Used both to restore a saved
 * setup — an unrecognised value from an older version is dropped rather than sent — and to
 * clear the key entirely when the blank option is chosen.
 */
const OPTIONAL_SELECTS: Record<string, readonly string[]> = {
  hose_material: HOSE_MATERIAL_OPTIONS.map((o) => o.value),
  insulation_material: INSULATION_OPTIONS.map((o) => o.value),
  rheology_model: RHEOLOGY_MODEL_OPTIONS.map((o) => o.value),
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
  { min: number; max: number; label: string; unit: string }
> = {
  viscosity_cp:            { min: 50,   max: 10000,  label: 'Viscosity',         unit: 'cP' },
  density_kg_m3:           { min: 900,  max: 1500,   label: 'Density',           unit: 'kg/m³' },
  flow_index:              { min: 0.01, max: 1.0,    label: 'Flow Index',        unit: '(0–1)' },
  activation_energy_j_mol: { min: 1000, max: 100000, label: 'Activation Energy', unit: 'J/mol' },
}

export function CalculatorForm() {
  const { calculate, isLoading, isReady, error, loadProgress, rememberSetup } = useCalculator()

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

    const stored = getPreferences().rememberSetup ? getLastInputs() : null
    if (!stored) return base

    const restored: ProcessParameters = { ...base }
    for (const [key, value] of Object.entries(stored)) {
      if (key === 'material_key' || key === 'machine_type') {
        if (typeof value === 'string' && value) {
          restored[key] = value
        }
      } else if (key in OPTIONAL_SELECTS) {
        if (typeof value === 'string' && OPTIONAL_SELECTS[key].includes(value)) {
          (restored as unknown as Record<string, unknown>)[key] = value
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
              rheology_model,
              zero_shear_viscosity_cp,
              infinite_shear_viscosity_cp,
              time_constant_s,
              rheology_index,
              yield_stress_pa,
              consistency_pa_sn,
              ...rest
            } = prev
            return { ...rest, material_key: value }
          })
          // Clear any leftover custom-field errors
          setFieldErrors((prev) => {
            const updated = { ...prev }
            for (const key of [...Object.keys(CUSTOM_FIELD_RANGES), ...RHEOLOGY_FIELD_KEYS]) {
              delete updated[key]
            }
            return updated
          })
        }
        return
      }

      // ── Viscosity model (custom materials) ────────────────────────────────
      // Switching model replaces the flow-curve fields with the new model's own, so a
      // Cross η∞ cannot ride along into a Carreau calculation.
      if (name === 'rheology_model') {
        const model = value as RheologyModelName
        setInputs((prev) => {
          const next = { ...prev } as unknown as Record<string, unknown>
          for (const key of RHEOLOGY_FIELD_KEYS) delete next[key]
          if (model === 'power_law') {
            delete next.rheology_model
          } else {
            next.rheology_model = model
            Object.assign(next, RHEOLOGY_MODEL_FIELDS[model])
          }
          return next as unknown as ProcessParameters
        })
        setFieldErrors((prev) => {
          const updated = { ...prev }
          for (const key of RHEOLOGY_FIELD_KEYS) delete updated[key]
          return updated
        })
        return
      }

      // ── Optional choices (hose, insulation) ───────────────────────────────
      // The blank option removes the key, so Python sees "not described" rather than an
      // empty string it would have to interpret.
      if (name in OPTIONAL_SELECTS) {
        setInputs((prev) => {
          const next = { ...prev } as unknown as Record<string, unknown>
          if (value) next[name] = value
          else delete next[name]
          return next as unknown as ProcessParameters
        })
        return
      }

      // ── Optional inputs ───────────────────────────────────────────────────
      // Clearing one must remove the key entirely, not leave the last value behind:
      // an absent ambient temperature is what keeps the calculation as it was.
      const optionalRanges = {
        ...OPTIONAL_FIELD_RANGES,
        ...HOSE_FIELD_RANGES,
        max_line_pressure_bar: LINE_LIMIT_RANGE,
      }
      if (name in optionalRanges && value.trim() === '') {
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
        if (name in optionalRanges) {
          const range = optionalRanges[name as keyof typeof optionalRanges]
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

        // Flow-curve fields are validated during render (rheologyErrors below), because
        // the flow index range depends on the model chosen, which this handler cannot see.
        if ((RHEOLOGY_FIELD_KEYS as string[]).includes(name)) return

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

  // A slider always lands inside the range, so setting from one clears any error the typed
  // value had
  const handleSlide = useCallback((name: string, value: number) => {
    setInputs((prev) => ({ ...prev, [name]: value } as ProcessParameters))
    setFieldErrors((prev) => {
      const updated = { ...prev }
      delete updated[name]
      return updated
    })
  }, [])

  // Saved on submit rather than on every keystroke: what is worth restoring is a setup
  // someone actually calculated with, not a half-typed number.
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (Object.keys(fieldErrors).length === 0 && isReady) {
        if (rememberSetup) saveLastInputs({ ...inputs } as unknown as Record<string, unknown>)
        calculate(inputs)
      }
    },
    [fieldErrors, isReady, inputs, calculate, rememberSetup]
  )

  // Lagging chosen without a thickness would quietly mean "no lagging" in Python, so it is
  // held back here with the reason shown on the thickness field.
  const insulationThicknessError =
    inputs.insulation_material && !((inputs.insulation_thickness_mm ?? 0) > 0)
      ? 'Enter the insulation thickness, or set Insulation to None'
      : undefined

  // Errors on the flow-curve fields, derived from the inputs rather than stored: the flow
  // index range depends on the model, so changing the model must re-judge the index.
  const rheologyErrors: Partial<Record<RheologyField, string>> = {}
  if (inputs.material_key === 'custom' && inputs.rheology_model && inputs.rheology_model !== 'power_law') {
    for (const field of Object.keys(RHEOLOGY_MODEL_FIELDS[inputs.rheology_model]) as RheologyField[]) {
      const value = inputs[field]
      const range = rheologyFieldRange(field, inputs.rheology_model)
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        rheologyErrors[field] = `${range.label} is required`
      } else if (value < range.min || value > range.max) {
        rheologyErrors[field] = `${range.label} must be between ${range.min} and ${range.max} ${range.unit}`.trim()
      }
    }
    if (
      inputs.rheology_model === 'cross' &&
      typeof inputs.infinite_shear_viscosity_cp === 'number' &&
      typeof inputs.zero_shear_viscosity_cp === 'number' &&
      inputs.infinite_shear_viscosity_cp >= inputs.zero_shear_viscosity_cp &&
      !rheologyErrors.infinite_shear_viscosity_cp
    ) {
      rheologyErrors.infinite_shear_viscosity_cp = 'Must be below the zero-shear viscosity'
    }
  }

  const hasErrors =
    Object.keys(fieldErrors).length > 0 ||
    Boolean(insulationThicknessError) ||
    Object.keys(rheologyErrors).length > 0
  const canSubmit = !hasErrors && isReady && !isLoading && inputs.material_key !== ''
  const isCustomMaterial = inputs.material_key === 'custom'

  return (
    // Not clipped on a wide screen, so the Run button can stick to the bottom of the
    // scrolling column; the header rounds its own corners instead.
    <div className="card lg:overflow-visible">
      <div className="card-header rounded-t-card">
        <h2 className="font-semibold text-ink">Process Parameters</h2>
        <p className="text-xs text-ink-2 mt-1">Configure your injection settings</p>
      </div>

      <form onSubmit={handleSubmit} className="card-body space-y-5">
        {/* Pipe Length */}
        <InputField
          label="Pipe Length"
          name="pipe_length_mm"
          value={inputs.pipe_length_mm}
          onChange={handleChange}
          scale="log"
          onSlide={handleSlide}
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
          scale="log"
          onSlide={handleSlide}
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
          scale="linear"
          onSlide={handleSlide}
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
          scale="log"
          onSlide={handleSlide}
          unit={VALIDATION_RANGES.flowRate.unit}
          range={VALIDATION_RANGES.flowRate}
          error={fieldErrors.flow_rate_lpm}
        />

        {/* Material Selection */}
        <div className="mb-5">
          <label
            htmlFor={materialSelectId}
            className="text-sm font-semibold text-ink block mb-1.5"
          >
            Material Type
          </label>
          <PopUpSelect
            id={materialSelectId}
            name="material_key"
            value={inputs.material_key}
            onChange={handleChange}
            aria-invalid={materialError ? true : undefined}
            aria-describedby={materialError ? materialErrorId : undefined}
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
          </PopUpSelect>
          {materialError && (
            <p
              id={materialErrorId}
              role="alert"
              className="mt-1.5 flex items-center gap-1.5 text-xs text-danger"
            >
              <AlertCircle aria-hidden="true" className="w-3 h-3" />
              <span>{materialError}</span>
            </p>
          )}
        </div>

        {/* Custom Material Properties — shown only when Custom is selected */}
        {isCustomMaterial && (
          <div className="rounded-group border border-accent-secondary bg-muted p-4 space-y-4">
            {/* Section title and its help as one full-width row, so the toggle is a real
                target rather than a line of small text. The label stays the same open or
                shut; the chevron and aria-expanded carry the state. */}
            <button
              type="button"
              onClick={() => setShowCustomHelp((v) => !v)}
              aria-expanded={showCustomHelp}
              aria-controls={customPanelId}
              className="-m-2 flex min-h-[44px] w-[calc(100%+1rem)] items-center justify-between gap-2 rounded-group px-2 text-left hover:bg-accent-secondary/25 active:bg-accent-secondary/40 transition-colors"
            >
              <span className="text-sm font-semibold text-highlight">Custom material</span>
              <span className="flex items-center gap-1 text-sm text-highlight">
                What are these?
                <ChevronDown
                  aria-hidden="true"
                  className={`w-4 h-4 motion-safe:transition-transform ${showCustomHelp ? 'rotate-180' : ''}`}
                />
              </span>
            </button>

            {showCustomHelp && (
              <div
                id={customPanelId}
                className="text-sm text-highlight bg-muted rounded-field p-3 space-y-2 leading-relaxed"
              >
                <p><strong>Viscosity (cP):</strong> Dynamic viscosity at reference temperature (25 °C). Controls flow resistance.</p>
                <p><strong>Density (kg/m³):</strong> Bulk liquid density of the mixed material before foaming.</p>
                <p><strong>Flow Index (0–1):</strong> Power-law exponent for non-Newtonian behaviour. 1.0 = Newtonian; typical PU foams: 0.8–0.9.</p>
                <p><strong>Activation Energy (J/mol):</strong> Arrhenius energy controlling how viscosity changes with temperature. Typical range: 20 000–35 000 J/mol.</p>
                <p><strong>Viscosity Model:</strong> The power law suits a data sheet. If you have a measured flow curve, Carreau or Cross level off at low shear where the power law does not, and Herschel–Bulkley adds a yield stress for filled systems. These use the exact laminar pipe solution rather than the apparent-viscosity shortcut. Parameters are at 25 °C; temperature shifts the whole curve by the activation energy.</p>
              </div>
            )}

            <OptionalSelect
              name="rheology_model"
              label="Viscosity Model"
              value={inputs.rheology_model ?? 'power_law'}
              options={RHEOLOGY_MODEL_OPTIONS}
              onChange={handleChange}
            />

            {/* The flow curve: a viscosity and flow index for the power law, or the chosen
                model's own parameters. Density and activation energy apply to every model. */}
            {inputs.rheology_model && inputs.rheology_model !== 'power_law' ? (
              (Object.keys(RHEOLOGY_MODEL_FIELDS[inputs.rheology_model]) as RheologyField[]).map((field) => {
                const range = rheologyFieldRange(field, inputs.rheology_model)
                return (
                  <CustomMaterialField
                    key={field}
                    label={range.label}
                    name={field}
                    value={inputs[field]}
                    onChange={handleChange}
                    unit={range.unit}
                    range={range}
                    error={rheologyErrors[field]}
                  />
                )
              })
            ) : (
              <>
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
                  label="Flow Index"
                  name="flow_index"
                  value={inputs.flow_index ?? CUSTOM_MATERIAL_DEFAULTS.flow_index}
                  onChange={handleChange}
                  unit="(0–1)"
                  range={CUSTOM_FIELD_RANGES.flow_index}
                  error={fieldErrors.flow_index}
                />
              </>
            )}

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

        {/* Machine Type. Two choices, so both are shown at once as a segmented control
            rather than hidden behind a dropdown. */}
        <div className="mb-5">
          <SegmentedControl
            name="machine_type"
            label="Machine Type"
            labelVisible
            fullWidth
            options={MACHINE_OPTIONS}
            value={(inputs.machine_type ?? 'high_pressure') as (typeof MACHINE_OPTIONS)[number]['value']}
            onChange={(machine_type) => setInputs((prev) => ({ ...prev, machine_type }))}
          />
          <div className="mt-3">
            <OptionalField
              name="max_line_pressure_bar"
              value={inputs.max_line_pressure_bar}
              onChange={handleChange}
              spec={LINE_LIMIT_RANGE}
              error={fieldErrors.max_line_pressure_bar}
            />
          </div>
        </div>

        {/* Optional: ambient conditions and part geometry */}
        <div className="rounded-group border border-line bg-canvas p-4 space-y-4">
          <button
            type="button"
            onClick={() => setShowOptional((v) => !v)}
            aria-expanded={showOptional}
            aria-controls={optionalPanelId}
            className="-m-2 flex min-h-[44px] w-[calc(100%+1rem)] items-center justify-between gap-2 rounded-group px-2 text-left hover:bg-canvas active:bg-line transition-colors"
          >
            <span>
              <span className="block text-sm font-semibold text-ink">Optional inputs</span>
              <span className="block text-sm text-ink-2">Ambient conditions, hose &amp; part</span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className={`w-5 h-5 flex-shrink-0 text-ink-2 motion-safe:transition-transform ${showOptional ? 'rotate-180' : ''}`}
            />
          </button>

          {showOptional && (
            <div id={optionalPanelId} className="space-y-4">
              <p className="text-sm text-ink-2 leading-relaxed">
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

              {/* How the hose is built — feeds the line thermal model */}
              {/* The legend floats so it reads as a heading under the divider; left in
                  place, a legend sits ON the fieldset's top border and leaves a gap below */}
              <fieldset className="border-t border-line pt-4">
                <legend className="float-left w-full text-sm font-semibold text-ink">
                  Hose
                </legend>
                <div className="clear-left space-y-4 pt-1">
                <p className="text-sm text-ink-2 leading-relaxed">
                  Used with an ambient temperature. Leave blank for a bare hose in still air;
                  describe it, and lagging in particular, to see how well it holds temperature.
                </p>

                <OptionalSelect
                  name="hose_material"
                  label="Hose Material"
                  value={inputs.hose_material}
                  options={HOSE_MATERIAL_OPTIONS}
                  blankLabel="Not described (bare hose default)"
                  onChange={handleChange}
                />
                {inputs.hose_material && (
                  <OptionalField
                    name="hose_wall_thickness_mm"
                    value={inputs.hose_wall_thickness_mm}
                    onChange={handleChange}
                    spec={HOSE_FIELD_RANGES.hose_wall_thickness_mm}
                    error={fieldErrors.hose_wall_thickness_mm}
                  />
                )}

                <OptionalSelect
                  name="insulation_material"
                  label="Insulation"
                  value={inputs.insulation_material}
                  options={INSULATION_OPTIONS}
                  blankLabel="None"
                  onChange={handleChange}
                />
                {inputs.insulation_material && (
                  <OptionalField
                    name="insulation_thickness_mm"
                    value={inputs.insulation_thickness_mm}
                    onChange={handleChange}
                    spec={HOSE_FIELD_RANGES.insulation_thickness_mm}
                    error={fieldErrors.insulation_thickness_mm ?? insulationThicknessError}
                  />
                )}
                </div>
              </fieldset>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {error && (
          <div
            role="alert"
            className="p-4 bg-danger-soft border border-danger-line rounded-group flex items-start gap-3"
          >
            <AlertCircle aria-hidden="true" className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-danger">Error</h4>
              <p className="text-sm text-danger mt-0.5">{error}</p>
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
            className="p-4 bg-warn-soft border border-warn-line rounded-group flex items-start gap-3"
          >
            <div
              aria-hidden="true"
              className="w-5 h-5 border-2 border-warn border-t-warn rounded-full animate-spin flex-shrink-0 mt-0.5"
            />
            <div className="min-w-0 flex-grow">
              <h4 className="text-sm font-semibold text-warn-ink">Starting the engine</h4>
              <p className="text-sm text-warn-ink mt-0.5">
                {loadProgress?.message ?? 'Loading Python physics engine…'}
              </p>
              {loadProgress?.total ? (
                <>
                  <div
                    className="mt-2 h-1.5 rounded-full bg-warn-soft overflow-hidden"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={loadProgress.total}
                    aria-valuenow={loadProgress.loaded ?? 0}
                    aria-label="Loading the physics engine"
                  >
                    <div
                      className="h-full bg-highlight transition-[width] duration-150"
                      style={{
                        width: `${((loadProgress.loaded ?? 0) / loadProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-warn-ink mt-1 tabular-nums">
                    {loadProgress.loaded} of {loadProgress.total} modules
                  </p>
                </>
              ) : null}
              <p className="text-xs text-warn-ink mt-1">
                Runs entirely in your browser; nothing is uploaded.
              </p>
            </div>
          </div>
        )}

        {/* Submit Button. Pinned to the bottom of the form column on a wide screen, so it
            stays in reach however far the inputs above it run. */}
        <div className="mt-8 bg-surface lg:sticky lg:bottom-0 lg:z-10 lg:-mx-5 lg:-mb-5 lg:rounded-b-card lg:border-t lg:border-line lg:px-5 lg:pb-5 lg:pt-4">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full min-h-[50px] flex items-center justify-center gap-2 py-3 px-4 rounded-full text-base font-semibold transition-colors ${
              !canSubmit
                ? 'bg-line text-ink-2 cursor-not-allowed'
                : 'bg-accent text-on-accent hover:bg-accent/90 active:bg-accent/80'
            }`}
          >
            {isLoading ? (
              <>
                <div
                  aria-hidden="true"
                  className="w-4 h-4 border-2 border-on-accent/30 border-t-on-accent rounded-full animate-spin"
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
  scale,
  onSlide,
}: {
  label: string
  name: string
  value: number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  unit: string
  range: any
  error?: string
  /** Adds a slider under the field; log for ranges spanning orders of magnitude */
  scale?: SliderScale
  onSlide?: (name: string, value: number) => void
}) {
  const id = useId()
  const rangeId = `${id}-range`
  const errorId = `${id}-error`
  const spec = scale ? { min: range.min, max: range.max, scale } : null
  const position = spec && Number.isFinite(value) ? toSliderPosition(value, spec) : 0

  return (
    <div className="mb-5 group">
      <div className="flex flex-wrap justify-between items-baseline gap-x-2 mb-1.5">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        <span id={rangeId} className="whitespace-nowrap text-xs text-ink-2">
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
          className={`block min-h-[44px] w-full bg-surface pl-3 pr-12 py-2.5 text-sm font-medium rounded-field border transition-all outline-none ${
            error
              ? 'border-danger-line text-danger placeholder-danger focus:ring-2 focus:ring-danger focus:border-danger'
              : 'border-line-strong text-ink focus:ring-2 focus:ring-highlight focus:border-highlight hover:border-ink-2'
          }`}
        />
        {/* Repeats the unit already announced with the range, so it is decorative here */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
        >
          <span className={`text-sm font-medium ${error ? 'text-danger' : 'text-ink-2'}`}>
            {unit}
          </span>
        </div>
      </div>
      {/* The slider sets the same value as the field: the field for an exact figure, the
          slider for feeling out how the result moves. Named by the field's label, with the
          value and unit spoken rather than a bare position. */}
      {spec && onSlide && (
        <input
          type="range"
          min={0}
          max={SLIDER_STEPS}
          step={1}
          value={position}
          onChange={(e) => onSlide(name, fromSliderPosition(Number(e.target.value), spec))}
          aria-label={`${label} slider`}
          aria-valuetext={`${Number.isFinite(value) ? value : range.min} ${unit}`}
          className="slider mt-1"
          style={{ '--fill': `${(position / SLIDER_STEPS) * 100}%` } as React.CSSProperties}
          data-testid={`slider-${name}`}
        />
      )}
      {error && (
        <div
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-center gap-1.5 text-xs text-danger"
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
  spec: { min: number; max: number; label: string; unit: string; help: string }
  error?: string
}) {
  const id = useId()
  const rangeId = `${id}-range`
  const helpId = `${id}-help`
  const errorId = `${id}-error`

  return (
    <div>
      <div className="flex flex-wrap justify-between items-baseline gap-x-2 mb-1">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {spec.label}
        </label>
        <span id={rangeId} className="whitespace-nowrap text-xs text-ink-2">
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
          // Any value in range is accepted, as in the main fields: a numeric step makes the
          // browser refuse values off its grid by silently blocking the submit
          step="any"
          aria-invalid={error ? true : undefined}
          // The help text explains what supplying this field switches on, which is the
          // whole point of an optional input — it belongs in the announcement
          aria-describedby={
            error ? `${errorId} ${helpId} ${rangeId}` : `${helpId} ${rangeId}`
          }
          className={`block min-h-[44px] w-full pl-3 pr-16 py-2.5 text-sm font-medium rounded-field border transition-all outline-none placeholder:text-ink-2 ${
            error
              ? 'border-danger-line bg-surface text-danger focus:ring-2 focus:ring-danger focus:border-danger'
              : 'border-line-strong bg-surface text-ink focus:ring-2 focus:ring-highlight focus:border-highlight hover:border-ink-2'
          }`}
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none"
        >
          <span className={`text-xs font-medium ${error ? 'text-danger' : 'text-ink-2'}`}>
            {spec.unit}
          </span>
        </div>
      </div>
      <p id={helpId} className="mt-1 text-sm text-ink-2 leading-snug">
        {spec.help}
      </p>
      {error && (
        <div
          id={errorId}
          role="alert"
          className="mt-1 flex items-center gap-1.5 text-xs text-danger"
        >
          <AlertCircle aria-hidden="true" className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Optional choice. Where there is a blank option it is meaningful — it means "not described"
 * — and removes the key rather than sending an empty string.
 */
function OptionalSelect({
  name,
  label,
  value,
  options,
  blankLabel,
  onChange,
}: {
  name: string
  label: string
  value: string | undefined
  options: ReadonlyArray<{ value: string; label: string }>
  /** Omit for a choice that always has a value */
  blankLabel?: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
}) {
  const id = useId()

  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-ink block mb-1">
        {label}
      </label>
      <PopUpSelect
        id={id}
        name={name}
        value={value ?? ''}
        onChange={onChange}
      >
        {blankLabel !== undefined && <option value="">{blankLabel}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </PopUpSelect>
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
  value: number | undefined
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  unit: string
  range: { min: number; max: number }
  error?: string
}) {
  const id = useId()
  const rangeId = `${id}-range`
  const errorId = `${id}-error`

  return (
    <div>
      <div className="flex flex-wrap justify-between items-baseline gap-x-2 mb-1">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        <span id={rangeId} className="whitespace-nowrap text-xs text-ink-2">
          {range.min}–{range.max} {unit}
        </span>
      </div>
      <div className="relative">
        <input
          id={id}
          type="number"
          name={name}
          value={value ?? ''}
          onChange={onChange}
          step="any"
          min={range.min}
          max={range.max}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${errorId} ${rangeId}` : rangeId}
          className={`block min-h-[44px] w-full bg-surface pl-3 pr-16 py-2 text-sm font-medium rounded-field border transition-all outline-none ${
            error
              ? 'border-danger-line bg-surface text-danger focus:ring-2 focus:ring-danger focus:border-danger'
              : 'border-line-strong bg-surface text-ink focus:ring-2 focus:ring-highlight focus:border-highlight hover:border-ink-2'
          }`}
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none"
        >
          <span className={`text-xs font-medium ${error ? 'text-danger' : 'text-ink-2'}`}>
            {unit}
          </span>
        </div>
      </div>
      {error && (
        <div
          id={errorId}
          role="alert"
          className="mt-1 flex items-center gap-1.5 text-xs text-danger"
        >
          <AlertCircle aria-hidden="true" className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
