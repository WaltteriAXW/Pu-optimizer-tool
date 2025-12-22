import React, { createContext, useContext, useState, useCallback } from 'react'
import { PyodideBridge } from '../services/PyodideBridge'
import { CalculationService } from '../services/CalculationService'
import type { ProcessParameters, CalculationResults } from '@/calculator_types'

export interface HistoryEntry {
  id: string
  timestamp: Date
  parameters: ProcessParameters
  results: CalculationResults
}

interface CalculatorContextType {
  results: CalculationResults | null
  isLoading: boolean
  isReady: boolean
  error: string | null
  history: HistoryEntry[]
  lastParams: ProcessParameters | null
  calculate: (params: ProcessParameters) => Promise<void>
  reset: () => void
  deleteHistory: (id: string) => void
  clearHistory: () => void
  loadFromHistory: (entry: HistoryEntry) => void
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined)

export function CalculatorProvider({ children }: { children: React.ReactNode }) {
  const [results, setResults] = useState<CalculationResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [lastParams, setLastParams] = useState<ProcessParameters | null>(null)

  const [calculationService] = useState(() => {
    const bridge = new PyodideBridge()
    bridge.initialize().then(() => setIsReady(true)).catch(err => {
      console.error('Failed to initialize Pyodide:', err)
      setError('Failed to initialize calculation engine')
    })
    return new CalculationService(bridge)
  })

  const calculate = useCallback(async (params: ProcessParameters) => {
    setIsLoading(true)
    setError(null)
    setLastParams(params)

    try {
      const result = await calculationService.calculate(params)
      setResults(result)

      // Add to history
      const entry: HistoryEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        parameters: params,
        results: result,
      }
      setHistory(prev => [...prev, entry])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Calculation failed'
      setError(message)
      console.error('Calculation error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [calculationService])

  const reset = useCallback(() => {
    setResults(null)
    setError(null)
  }, [])

  const deleteHistory = useCallback((id: string) => {
    setHistory(prev => prev.filter(entry => entry.id !== id))
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

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
        reset,
        deleteHistory,
        clearHistory,
        loadFromHistory,
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
