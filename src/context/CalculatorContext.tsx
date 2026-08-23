import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { PyodideBridge } from '../services/PyodideBridge'
import { CalculationService } from '../services/CalculationService'
import {
  ResidualModelService,
  type ModelReadiness,
  type TrainingResult,
} from '../services/ResidualModelService'
import {
  getRecords,
  saveRecord,
  setOutcome as persistOutcome,
  deleteRecord,
  clearRecords,
  type ShotRecord,
  type ShotOutcome,
} from '../services/ShotRecordStore'
import {
  getPreferences,
  savePreferences,
  type PressureUnit,
} from '../services/displayPreferences'
import type { ProcessParameters, CalculationResults } from '@/calculator_types'

/**
 * A past run.
 *
 * This is now the stored record itself rather than a separate in-memory shape. History used
 * to live only in component state, so every run vanished on reload — and with it any chance
 * of ever accumulating a dataset.
 */
export type HistoryEntry = ShotRecord

interface CalculatorContextType {
  results: CalculationResults | null
  isLoading: boolean
  isReady: boolean
  error: string | null
  history: HistoryEntry[]
  lastParams: ProcessParameters | null
  calculate: (params: ProcessParameters) => Promise<void>
  deleteHistory: (id: string) => void
  clearHistory: () => void
  loadFromHistory: (entry: HistoryEntry) => void
  /** Record how the part came out. Turns a saved run into training data. */
  recordOutcome: (id: string, outcome: ShotOutcome, notes?: string) => void
  /** Re-read from storage, after an import for instance */
  refreshHistory: () => void
  /** Whether the recorded shots could support a model, and what is missing if not */
  checkModelReadiness: () => Promise<ModelReadiness>
  /** Fit a model on the recorded outcomes. Rejects with the shortfall when it cannot. */
  trainModel: () => Promise<TrainingResult>
  /** The unit pressures are shown in. Display only — the engine and the records hold bar. */
  pressureUnit: PressureUnit
  setPressureUnit: (unit: PressureUnit) => void
  /** How far the Python engine has got, while it is still starting up */
  loadProgress: EngineProgress | null
}

/** Progress reported while the Python engine boots. */
export interface EngineProgress {
  phase: 'runtime' | 'modules'
  message: string
  /** Files mounted so far, during the modules phase */
  loaded?: number
  total?: number
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined)

export function CalculatorProvider({ children }: { children: React.ReactNode }) {
  const [results, setResults] = useState<CalculationResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [lastParams, setLastParams] = useState<ProcessParameters | null>(null)
  const [pressureUnit, setPressureUnitState] = useState<PressureUnit>(
    () => getPreferences().pressureUnit
  )
  const [loadProgress, setLoadProgress] = useState<EngineProgress | null>(null)

  // Past runs come back from storage on load rather than starting empty
  useEffect(() => {
    setHistory(getRecords())
  }, [])

  const [{ calculationService, residualModelService }] = useState(() => {
    const bridge = new PyodideBridge()
    bridge
      .initialize((progress) => setLoadProgress(progress))
      .then(() => {
        setIsReady(true)
        setLoadProgress(null)
      })
      .catch(err => {
        console.error('Failed to initialize Pyodide:', err)
        setError('Failed to initialize calculation engine')
        setLoadProgress(null)
      })
    return {
      calculationService: new CalculationService(bridge),
      residualModelService: new ResidualModelService(bridge),
    }
  })

  const setPressureUnit = useCallback((unit: PressureUnit) => {
    setPressureUnitState(unit)
    savePreferences({ pressureUnit: unit })
  }, [])

  const calculate = useCallback(async (params: ProcessParameters) => {
    setIsLoading(true)
    setError(null)
    setLastParams(params)

    try {
      const result = await calculationService.calculate(params)
      setResults(result)

      // Persist before showing it. Every run is a potential training sample, and one that
      // is never written down cannot become one later.
      const entry = saveRecord(params, result)
      setHistory(prev => [entry, ...prev])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Calculation failed'
      setError(message)
      console.error('Calculation error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [calculationService])

  const deleteHistory = useCallback((id: string) => {
    deleteRecord(id)
    setHistory(prev => prev.filter(entry => entry.id !== id))
  }, [])

  const clearHistory = useCallback(() => {
    clearRecords()
    setHistory([])
  }, [])

  const recordOutcome = useCallback(
    (id: string, outcome: ShotOutcome, notes = '') => {
      persistOutcome(id, outcome, notes)
      setHistory(prev =>
        prev.map(entry => (entry.id === id ? { ...entry, outcome, notes } : entry))
      )
    },
    []
  )

  const refreshHistory = useCallback(() => {
    setHistory(getRecords())
  }, [])

  const checkModelReadiness = useCallback(
    () => residualModelService.checkReadiness(),
    [residualModelService]
  )

  const trainModel = useCallback(
    () => residualModelService.train(),
    [residualModelService]
  )

  const loadFromHistory = useCallback((entry: HistoryEntry) => {
    setResults(entry.results)
    setLastParams(entry.parameters)
  }, [])

  return (
    <CalculatorContext.Provider
      value={{
        results,
        isLoading,
        isReady,
        error,
        history,
        lastParams,
        calculate,
        deleteHistory,
        clearHistory,
        loadFromHistory,
        recordOutcome,
        refreshHistory,
        checkModelReadiness,
        trainModel,
        pressureUnit,
        setPressureUnit,
        loadProgress,
      }}
    >
      {children}
    </CalculatorContext.Provider>
  )
}

export function useCalculator() {
  const context = useContext(CalculatorContext)
  if (context === undefined) {
    throw new Error('useCalculator must be used within CalculatorProvider')
  }
  return context
}
