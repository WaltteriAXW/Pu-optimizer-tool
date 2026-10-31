import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
// Inter, self-hosted so the app keeps its type offline. The optical-size build gives titles
// the Display cut automatically, as the brand guide asks.
import '@fontsource-variable/inter/opsz.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
