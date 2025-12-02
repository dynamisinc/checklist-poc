import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './core/styles/global.css'
import { cobraTheme } from './theme/cobraTheme'
import { ErrorBoundary } from './core/components/ErrorBoundary'
import App from './App'

// Initialize API health check utility (exposes window.apiHealthCheck in dev)
import './core/utils/apiHealthCheck'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={cobraTheme}>
      <CssBaseline />
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </ThemeProvider>
  </React.StrictMode>,
)
