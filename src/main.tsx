import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/lib/auth'
import App from './App'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#131D35',
              color:      '#E8EDF5',
              border:     '1px solid #1C2B4A',
              borderRadius: '10px',
              fontSize:   '14px',
            },
            success: { iconTheme: { primary: '#00C9A7', secondary: '#131D35' } },
            error:   { iconTheme: { primary: '#F43F5E', secondary: '#131D35' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
