import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { HelmetProvider } from 'react-helmet-async'

// ⚠️ IMPORTANTE: iOS PWA Startup Check - DEVE ser importado antes do App
// Detecta e resolve problemas de tela branca no Safari iOS PWA
import './utils/iosPWAStartup'

// 🍎 Safari iOS Compatibility - Inicializa fixes para Safari iOS 12-17+
import { initSafariIOSCompat } from './utils/iosSafariCompat'
initSafariIOSCompat()

import App from './App'
import './config/i18n'
import './styles/globals.css'

// Configuração do React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
      retry: (failureCount, error) => {
        // Não retry para erros de autenticação
        if (error instanceof Response && error.status === 401) {
          return false
        }
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
})

// Configuração do root
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

const root = ReactDOM.createRoot(rootElement)

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster
            position='top-right'
            toastOptions={{
              duration: 5000,
              style: {
                background: '#1f2937',
                color: '#fff',
                borderRadius: '12px',
                fontSize: '14px',
                padding: '12px 16px',
                maxWidth: '420px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              },
              success: {
                duration: 4000,
                style: {
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                },
                iconTheme: {
                  primary: '#fff',
                  secondary: '#059669',
                },
              },
              error: {
                duration: 7000, // Mais tempo para erros
                style: {
                  background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  whiteSpace: 'pre-line', // Permite quebras de linha
                },
                iconTheme: {
                  primary: '#fff',
                  secondary: '#dc2626',
                },
              },
            }}
          />
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
)

// Service Worker gerenciado pelo hook usePWAUpdate no App.tsx
// Removido registro manual para evitar conflitos
