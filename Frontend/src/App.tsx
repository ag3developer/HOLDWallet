import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'

// Stores
import { useAuthStore } from '@/stores/useAuthStore'
import { useThemeStore } from '@/stores/useThemeStore'
import { useLanguageStore } from '@/stores/useLanguageStore'

// Hooks
import { usePWAUpdate } from '@/hooks/usePWAUpdate'

// Components
import { Layout } from '@/components/layout/Layout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { IOSPWAUpdateModal } from '@/components/IOSPWAUpdateModal'
import { PushNotificationPrompt } from '@/components/PushNotificationPrompt'

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
import { NotificationsPage } from '@/pages/notifications/NotificationsPage'
import { NotificationSettingsPage } from '@/pages/NotificationSettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

// WolkPay Pages
import { WolkPayPage } from '@/pages/wolkpay/WolkPayPage'
import { WolkPayCheckoutPage } from '@/pages/wolkpay/WolkPayCheckoutPage'
import { WolkPayHistoryPage } from '@/pages/wolkpay/WolkPayHistoryPage'
import { WolkPayWelcomePage } from '@/pages/wolkpay/WolkPayWelcomePage'

// Admin Pages
import {
  AdminDashboardPage,
  AdminUsersPage,
  AdminUserDetailPage,
  AdminUserEditPage,
  AdminTradesPage,
  AdminTradeDetailPage,
  AdminP2PPage,
  AdminReportsPage,
  AdminSettingsPage,
  AdminWalletsPage,
  AdminTransactionsPage,
  AdminFeesPage,
  AdminSystemWalletPage,
  AdminSystemWalletAddressesPage,
  AdminAnalyticsPage,
  AdminSecurityPage,
  AdminWolkPayPage,
  AdminWolkPayDetailPage,
} from '@/pages/admin'

// Protected Route Component (for authenticated users)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to='/login' replace />
  }

  return <>{children}</>
}

// User Route Component (blocks admin users, redirects to /admin)
const UserRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to='/login' replace />
  }

  // Admin users should not access user routes
  if (user?.is_admin) {
    return <Navigate to='/admin' replace />
  }

  return <>{children}</>
}

// Public Route Component (redirects to dashboard if authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (isAuthenticated) {
    // Redirecionar admin para /admin, usuário comum para /dashboard
    if (user?.is_admin) {
      return <Navigate to='/admin' replace />
    }
    return <Navigate to='/dashboard' replace />
  }

  return <>{children}</>
}

// Admin Route Component (only allows admin users)
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to='/login' replace />
  }

  if (!user?.is_admin) {
    return <Navigate to='/dashboard' replace />
  }

  return <>{children}</>
}

// Smart redirect component for root path
const RootRedirect = () => {
  const { user } = useAuthStore()

  if (user?.is_admin) {
    return <Navigate to='/admin' replace />
  }
  return <Navigate to='/dashboard' replace />
}

function App() {
  const { t, i18n } = useTranslation()
  const { initializeAuth } = useAuthStore()
  const { theme, initializeTheme } = useThemeStore()
  const { language } = useLanguageStore()

  // PWA Update - gerencia atualizações automáticas
  usePWAUpdate()

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

        // Service Worker gerenciado pelo hook usePWAUpdate

        // Setup online/offline detection
        const handleOnline = () => {
          console.log('App is online')
        }

        const handleOffline = () => {
          console.log('App is offline')
        }

        globalThis.addEventListener('online', handleOnline)
        globalThis.addEventListener('offline', handleOffline)

        // Return cleanup function
        return () => {
          globalThis.removeEventListener('online', handleOnline)
          globalThis.removeEventListener('offline', handleOffline)
        }
      } catch (error) {
        console.error('Failed to initialize app:', error)
        return undefined
      }
    }

    const cleanup = initializeApp()

    // Cleanup on unmount
    return () => {
      if (cleanup && typeof cleanup === 'object' && 'then' in cleanup) {
        void cleanup.then(cleanupFn => {
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
        defaultTitle={t('common.appName', 'Wolknow')}
        titleTemplate={`%s - ${t('common.appName', 'Wolknow')}`}
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

          {/* User Routes (not accessible by admins) */}
          <Route
            path='/'
            element={
              <UserRoute>
                <Layout />
              </UserRoute>
            }
          >
            {/* Redirect root based on user role */}
            <Route index element={<RootRedirect />} />

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
            <Route path='settings/notifications' element={<NotificationSettingsPage />} />
            <Route path='notifications' element={<NotificationsPage />} />

            {/* WolkPay Routes */}
            <Route path='wolkpay' element={<WolkPayPage />} />
            <Route path='wolkpay/history' element={<WolkPayHistoryPage />} />
          </Route>

          {/* WolkPay Public Checkout (no auth required) */}
          <Route path='/wolkpay/checkout/:token' element={<WolkPayCheckoutPage />} />
          <Route path='/wolkpay/welcome' element={<WolkPayWelcomePage />} />

          {/* Admin Routes with Admin Layout */}
          <Route
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route path='/admin' element={<AdminDashboardPage />} />
            <Route path='/admin/users' element={<AdminUsersPage />} />
            <Route path='/admin/users/:userId' element={<AdminUserDetailPage />} />
            <Route path='/admin/users/:userId/edit' element={<AdminUserEditPage />} />
            <Route path='/admin/trades' element={<AdminTradesPage />} />
            <Route path='/admin/trades/:tradeId' element={<AdminTradeDetailPage />} />
            <Route path='/admin/p2p' element={<AdminP2PPage />} />
            <Route path='/admin/wallets' element={<AdminWalletsPage />} />
            <Route path='/admin/transactions' element={<AdminTransactionsPage />} />
            <Route path='/admin/fees' element={<AdminFeesPage />} />
            <Route path='/admin/system-wallet' element={<AdminSystemWalletPage />} />
            <Route
              path='/admin/system-wallet/addresses'
              element={<AdminSystemWalletAddressesPage />}
            />
            <Route path='/admin/reports' element={<AdminReportsPage />} />
            <Route path='/admin/analytics' element={<AdminAnalyticsPage />} />
            <Route path='/admin/security' element={<AdminSecurityPage />} />
            <Route path='/admin/settings' element={<AdminSettingsPage />} />
            <Route path='/admin/wolkpay' element={<AdminWolkPayPage />} />
            <Route path='/admin/wolkpay/:id' element={<AdminWolkPayDetailPage />} />
          </Route>

          {/* 404 Page */}
          <Route path='*' element={<NotFoundPage />} />
        </Routes>

        {/* PWA Update Modal - Shows when new version is available (all devices) */}
        <IOSPWAUpdateModal />

        {/* Push Notification Prompt - Shows after login to enable notifications */}
        <PushNotificationPrompt delay={5000} />
      </div>
    </ErrorBoundary>
  )
}

export default App
