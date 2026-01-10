import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { HelmetProvider } from 'react-helmet-async'

// ⚠️ REMOVIDO: iOS PWA Startup Check - causava travamento
// import './utils/iosPWAStartup'

// ⚠️ REMOVIDO: Safari iOS Compatibility na inicialização - adiado para depois do render
// import { initSafariIOSCompat } from './utils/iosSafariCompat'
// initSafariIOSCompat()

// ⚠️ REMOVIDO: IndexedDB Storage auto-inicialização - adiado
// import './utils/indexedDBStorage'

import App from './App'
import './config/i18n'
import './styles/globals.css'

// Tratamento global de erros não capturados (útil para debug em Safari iOS)
if (globalThis.window !== undefined) {
  globalThis.onerror = (message, source, lineno, colno, error) => {
    console.error('[Global Error]', { message, source, lineno, colno, error })
    // Se for erro fatal que impede renderização, mostra alerta
    const msgStr = typeof message === 'string' ? message : ''
    if (msgStr.includes('ChunkLoadError') || msgStr.includes('Loading chunk')) {
      // Erro de cache, força reload
      if ('caches' in globalThis) {
        caches
          .keys()
          .then(names => {
            names.forEach(name => caches.delete(name))
          })
          .finally(() => {
            globalThis.location.reload()
          })
      }
    }
    return false
  }

  globalThis.onunhandledrejection = (event: PromiseRejectionEvent) => {
    console.error('[Unhandled Promise Rejection]', event.reason)
  }
}

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
