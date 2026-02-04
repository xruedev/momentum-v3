import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import './index.css'

// Verificar que el elemento root existe
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ No se encontró el elemento #root en el HTML');
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: No se encontró el elemento #root. Verifica index.html</div>';
} else {
  console.log('✅ Aplicación iniciando...');
  
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>,
  )
}

