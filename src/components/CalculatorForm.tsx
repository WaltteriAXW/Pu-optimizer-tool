import React, { useState, useCallback } from 'react'
import { useCalculator } from '../context/CalculatorContext'
import { VALIDATION_RANGES, DEFAULTS, validateInput } from '../constants'
import type { ProcessParameters } from '@/calculator_types'
import { AlertCircle, Play } from 'lucide-react'

export function CalculatorForm() {
  const { calculate, isLoading, isReady, error } = useCalculator()

  const [inputs, setInputs] = useState<ProcessParameters>({
    pipe_length_mm: DEFAULTS.pipeLength,
    pipe_diameter_mm: DEFAULTS.pipeDiameter,
    temperature_c: DEFAULTS.temperature,
    flow_rate_lpm: DEFAULTS.flowRate,
    material_key: DEFAULTS.material,
    machine_type: 'high_pressure',
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target

      // Handle numeric inputs
      if (name !== 'material_key' && name !== 'machine_type') {
        const numValue = parseFloat(value)
        if (!isNaN(numValue)) {
          setInputs((prev) => ({ ...prev, [name]: numValue as any }))

          // Validate
          const validation = validateInput(name, numValue)
          if (!validation.valid) {
            setFieldErrors((prev) => ({ ...prev, [name]: validation.error || 'Invalid' }))
          } else {
            setFieldErrors((prev) => {
              const updated = { ...prev }
              delete updated[name]
              return updated
            })
          }
          return
        }
      }

      // Handle select inputs
      if (name === 'material_key' || name === 'machine_type') {
        setInputs((prev) => ({ ...prev, [name]: value as any }))
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
  const canSubmit = !hasErrors && isReady && !isLoading

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
            <option value="ecofoam_standard">EcoFoam Standard</option>
            <option value="ecofoam_hc">EcoFoam HC</option>
            <option value="ecofoam_water">EcoFoam Water-Blown</option>
            <option value="ecofoam_hfo">EcoFoam HFO</option>
          </select>
        </div>

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
            <option value="dispensing">Dispensing</option>
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
