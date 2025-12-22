import React, { createContext, useContext, useState, useCallback } from 'react'
import { PyodideBridge } from '../services/PyodideBridge'
import { CalculationService } from '../services/CalculationService'
import type { ProcessParameters, CalculationResults } from '@/calculator_types'

interface CalculatorContextType {
  results: CalculationResults | null
  isLoading: boolean
  isReady: boolean
  error: string | null
  calculate: (params: ProcessParameters) => Promise<void>
  reset: () => void
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined)

export function CalculatorProvider({ children }: { children: React.ReactNode }) {
  const [results, setResults] = useState<CalculationResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

    try {
      const result = await calculationService.calculate(params)
      setResults(result)
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

  return (
    <CalculatorContext.Provider value={{ results, isLoading, isReady, error, calculate, reset }}>
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
