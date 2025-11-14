import React from 'react'
import ReactDOM from 'react-dom/client'
import AppComponent from './app_component'
import { ThemeProvider } from './components/ThemeProvider'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AppComponent />
    </ThemeProvider>
  </React.StrictMode>,
)
