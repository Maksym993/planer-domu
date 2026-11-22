import '@fontsource-variable/inter'
import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'

// Wizualizacja willi pod adresem ?willa, osobno od edytora rzutu.
const Willa = lazy(() => import('./willa/Willa'))
const willa = new URLSearchParams(location.search).has('willa')

createRoot(document.getElementById('root')!).render(
  <StrictMode>{willa ? <Suspense fallback={null}><Willa /></Suspense> : <App />}</StrictMode>,
)
