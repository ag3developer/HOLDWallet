/**
 * GatewayApp - App separado para o portal de merchants
 * Renderizado quando o domínio é gateway.wolknow.com
 */

import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'

// Stores
import { useAuthStore } from '@/stores/useAuthStore'
import { useThemeStore } from '@/stores/useThemeStore'

// Components
import { GatewayLayout } from '@/components/layout/GatewayLayout'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

// Services
import { getMerchantProfile } from '@/services/gatewayService'

// Gateway Pages
import {
  GatewayLandingPage,
  GatewayLoginPage,
  GatewayCheckoutPage,
  GatewayDashboardPage,
  GatewayPaymentsPage,
  GatewayApiKeysPage,
  GatewayWebhooksPage,
  GatewaySettingsPage,
  GatewayRegisterPage,
} from '@/pages/gateway'
import GatewayDocsPage from '@/pages/gateway/GatewayDocsPage'

// Hook para verificar se usuário é merchant
const useMerchantCheck = () => {
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore()
  const [isMerchant, setIsMerchant] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [lastUserId, setLastUserId] = useState<string | null>(null)

  useEffect(() => {
    const checkMerchant = async () => {
      // Aguardar autenticação terminar de carregar
      if (authLoading) {
        return
      }

      if (!isAuthenticated || !user) {
        setIsMerchant(false)
        setIsChecking(false)
        setLastUserId(null)
        return
      }

      // Se o usuário mudou, precisa re-verificar
      const currentUserId = user.id
      if (currentUserId === lastUserId && isMerchant !== null) {
        // Já verificamos este usuário
        return
      }

      setIsChecking(true)

      try {
        console.log('[GatewayApp] Checking if user is merchant...')
        const profile = await getMerchantProfile()
        console.log('[GatewayApp] ✅ User is merchant:', profile.id)
        setIsMerchant(true)
        setLastUserId(currentUserId)
      } catch (error) {
        console.log('[GatewayApp] ❌ User is NOT a merchant:', error)
        setIsMerchant(false)
        setLastUserId(currentUserId)
      } finally {
        setIsChecking(false)
      }
    }

    checkMerchant()
  }, [isAuthenticated, authLoading, user, lastUserId, isMerchant])

  return { isMerchant, isChecking: isChecking || authLoading }
}

// Protected Route for Merchants
const MerchantRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore()
  const { isMerchant, isChecking } = useMerchantCheck()

  if (isLoading || isChecking) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to='/login' replace />
  }

  // Usuário autenticado mas não é merchant
  if (!isMerchant) {
    return <Navigate to='/register' replace />
  }

  return <>{children}</>
}

// Public Route (redirects to dashboard if authenticated AND is merchant)
const GatewayPublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore()
  const { isMerchant, isChecking } = useMerchantCheck()

  if (isLoading || isChecking) {
    return <LoadingScreen />
  }

  // Se é merchant autenticado, vai direto pro dashboard
  if (isAuthenticated && isMerchant) {
    return <Navigate to='/dashboard' replace />
  }

  return <>{children}</>
}

export function GatewayApp() {
  const { t } = useTranslation()
  const { initializeAuth } = useAuthStore()
  const { theme, initializeTheme } = useThemeStore()

  // Initialize app on mount
  useEffect(() => {
    initializeTheme()
    initializeAuth()
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
      <Helmet defaultTitle='WolkPay Gateway' titleTemplate='%s - WolkPay Gateway'>
        <html lang={t('common.language', 'pt-BR')} />
        <meta
          name='description'
          content='Gateway de pagamentos PIX e Criptomoedas para empresas. Integre em minutos, receba em segundos.'
        />
        <meta name='theme-color' content='#4f46e5' media='(prefers-color-scheme: light)' />
        <meta name='theme-color' content='#1e1b4b' media='(prefers-color-scheme: dark)' />
      </Helmet>

      <div className='GatewayApp min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200'>
        <Routes>
          {/* Landing Page (public) */}
          <Route path='/' element={<GatewayLandingPage />} />

          {/* Documentation (public) */}
          <Route path='/docs' element={<GatewayDocsPage />} />

          {/* Auth Routes */}
          <Route
            path='/login'
            element={
              <GatewayPublicRoute>
                <GatewayLoginPage />
              </GatewayPublicRoute>
            }
          />
          <Route
            path='/register'
            element={
              <GatewayPublicRoute>
                <GatewayRegisterPage />
              </GatewayPublicRoute>
            }
          />

          {/* Public Checkout (no auth required) */}
          <Route path='/checkout/:token' element={<GatewayCheckoutPage />} />

          {/* Protected Merchant Dashboard */}
          <Route
            element={
              <MerchantRoute>
                <GatewayLayout />
              </MerchantRoute>
            }
          >
            <Route path='/dashboard' element={<GatewayDashboardPage />} />
            <Route path='/payments' element={<GatewayPaymentsPage />} />
            <Route path='/payments/:paymentId' element={<GatewayPaymentsPage />} />
            <Route path='/api-keys' element={<GatewayApiKeysPage />} />
            <Route path='/webhooks' element={<GatewayWebhooksPage />} />
            <Route path='/settings' element={<GatewaySettingsPage />} />
          </Route>

          {/* 404 - Redirect to landing */}
          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      </div>
    </ErrorBoundary>
  )
}

export default GatewayApp
