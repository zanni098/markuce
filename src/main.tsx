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
              background: '#FFFFFF',
              color:      '#15140F',
              border:     '1px solid #E4E1D8',
              borderRadius: '12px',
              fontSize:   '14px',
              boxShadow:  '0 10px 30px -12px rgba(21,20,15,0.25)',
            },
            success: { iconTheme: { primary: '#0E7A5F', secondary: '#FFFFFF' } },
            error:   { iconTheme: { primary: '#C0392B', secondary: '#FFFFFF' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
