import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'

// Stores
import { useAuthStore } from '@/stores/useAuthStore'
import { useThemeStore } from '@/stores/useThemeStore'
import { useLanguageStore } from '@/stores/useLanguageStore'

// Components
import { Layout } from '@/components/layout/Layout'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

// Pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { WalletPage } from '@/pages/wallet/WalletPage'
import { P2PPage } from '@/pages/p2p/P2PPage'
import { CreateOrderPage } from '@/pages/p2p/CreateOrderPage'
import { MyOrdersPage } from '@/pages/p2p/MyOrdersPage'
import { OrderDetailsPage } from '@/pages/p2p/OrderDetailsPage'
import { EditOrderPage } from '@/pages/p2p/EditOrderPage'
import { TradeProcessPage } from '@/pages/p2p/TradeProcessPage'
import { InstantTradePage } from '@/pages/trading/InstantTradePage'
import { ChatPage } from '@/pages/chat/ChatPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { KYCPage } from '@/pages/kyc/KYCPage'
import { ServicesPage } from '@/pages/services/ServicesPage'
import { ContactPage } from '@/pages/contact/ContactPage'
import { SupportPage } from '@/pages/support/SupportPage'
import { PortfolioPage } from '@/pages/portfolio/PortfolioPage'
import { InstitutionalPage } from '@/pages/institutional/InstitutionalPage'
import { EducationPage } from '@/pages/education/EducationPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { CreateWalletPage } from '@/pages/wallet/CreateWalletPage'
import { SettingsPage as WalletSettingsPage } from '@/pages/wallet/SettingsPage'
import { NetworkComparison } from '@/components/NetworkComparison'
import { TraderProfileEditPage } from '@/pages/p2p/TraderProfileEditPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore()

  console.log(
    'ProtectedRoute - isAuthenticated:',
    isAuthenticated,
    'isLoading:',
    isLoading,
    'user:',
    user
  )

  if (isLoading) {
    console.log('ProtectedRoute - Loading, showing loading screen')
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute - Not authenticated, redirecting to login')
    return <Navigate to='/login' replace />
  }

  console.log('ProtectedRoute - Authenticated, rendering protected content')
  return <>{children}</>
}

// Public Route Component (redirects to dashboard if authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (isAuthenticated) {
    return <Navigate to='/dashboard' replace />
  }

  return <>{children}</>
}

function App() {
  const { t, i18n } = useTranslation()
  const { initializeAuth } = useAuthStore()
  const { theme, initializeTheme } = useThemeStore()
  const { language } = useLanguageStore()

  // Initialize app on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize theme
        initializeTheme()

        // Initialize language from store
        if (language) {
          const languageMap: { [key: string]: string } = {
            pt: 'pt-BR',
            en: 'en-US',
            es: 'es-ES',
          }
          const fullLanguageCode = languageMap[language] || language
          if (i18n.language !== fullLanguageCode) {
            await i18n.changeLanguage(fullLanguageCode)
          }
        }

        // Initialize authentication
        await initializeAuth()

        // Register service worker for PWA
        if ('serviceWorker' in navigator && import.meta.env.PROD) {
          navigator.serviceWorker.register('/sw.js')
        }

        // Setup online/offline detection
        const handleOnline = () => {
          console.log('App is online')
        }

        const handleOffline = () => {
          console.log('App is offline')
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        // Return cleanup function
        return () => {
          window.removeEventListener('online', handleOnline)
          window.removeEventListener('offline', handleOffline)
        }
      } catch (error) {
        console.error('Failed to initialize app:', error)
      }
    }

    const cleanup = initializeApp()

    // Cleanup on unmount
    return () => {
      if (cleanup && typeof cleanup === 'object' && 'then' in cleanup) {
        cleanup.then(cleanupFn => {
          if (typeof cleanupFn === 'function') {
            cleanupFn()
          }
        })
      }
    }
  }, [initializeAuth, initializeTheme])

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement

    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return (
    <ErrorBoundary>
      <Helmet
        defaultTitle={t('common.appName', 'HOLD Wallet')}
        titleTemplate={`%s - ${t('common.appName', 'HOLD Wallet')}`}
      >
        <html lang={t('common.language', 'pt-BR')} />
        <meta
          name='description'
          content={t(
            'common.appDescription',
            'Carteira digital P2P com sistema de chat e reputação'
          )}
        />
        <meta name='theme-color' content='#3b82f6' media='(prefers-color-scheme: light)' />
        <meta name='theme-color' content='#1f2937' media='(prefers-color-scheme: dark)' />
      </Helmet>

      <div className='App min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200'>
        <Routes>
          {/* Public Routes */}
          <Route
            path='/login'
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path='/register'
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
          <Route
            path='/forgot-password'
            element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path='/'
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Redirect root to dashboard */}
            <Route index element={<Navigate to='/dashboard' replace />} />

            {/* Main app routes */}
            <Route path='dashboard' element={<DashboardPage />} />
            <Route path='wallet/*' element={<WalletPage />} />
            <Route path='wallet/create' element={<CreateWalletPage />} />
            <Route path='wallet/settings' element={<WalletSettingsPage />} />
            <Route path='wallet/networks' element={<NetworkComparison />} />
            <Route path='p2p' element={<P2PPage />} />
            <Route path='p2p/create-order' element={<CreateOrderPage />} />
            <Route path='p2p/my-orders' element={<MyOrdersPage />} />
            <Route path='p2p/order/:orderId' element={<OrderDetailsPage />} />
            <Route path='p2p/edit-order/:orderId' element={<EditOrderPage />} />
            <Route path='p2p/trade/:tradeId' element={<TradeProcessPage />} />
            <Route path='p2p/trader-profile/edit' element={<TraderProfileEditPage />} />
            <Route path='instant-trade' element={<InstantTradePage />} />
            <Route path='chat/*' element={<ChatPage />} />
            <Route path='profile/*' element={<ProfilePage />} />
            <Route path='kyc/*' element={<KYCPage />} />
            <Route path='services' element={<ServicesPage />} />
            <Route path='contact' element={<ContactPage />} />
            <Route path='support' element={<SupportPage />} />
            <Route path='portfolio' element={<PortfolioPage />} />
            <Route path='institutional' element={<InstitutionalPage />} />
            <Route path='education' element={<EducationPage />} />
            <Route path='settings/*' element={<SettingsPage />} />
          </Route>

          {/* 404 Page */}
          <Route path='*' element={<NotFoundPage />} />
        </Routes>
      </div>
    </ErrorBoundary>
  )
}

export default App
