import React from 'react'
import ReactDOM from 'react-dom/client'
import PolyurethaneOptimizer from './polyurethane_optimizer_component'
import PythonCalculationErrorBoundary from './error_boundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PythonCalculationErrorBoundary>
      <PolyurethaneOptimizer />
    </PythonCalculationErrorBoundary>
  </React.StrictMode>,
)
