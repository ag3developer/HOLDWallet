/**
 * WOLK NOW - Push Notifications Hook
 * ====================================
 *
 * Hook para gerenciar Push Notifications no PWA.
 * Funciona em Android (Chrome), iOS (Safari PWA), e Desktop.
 */

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/services/api'

// Estado do Push
interface PushState {
  isSupported: boolean
  permission: NotificationPermission
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
}

// Chave VAPID pública (será buscada do backend)
let cachedVapidKey: string | null = null

/**
 * Hook para gerenciar Push Notifications
 */
export const usePushNotifications = () => {
  const [state, setState] = useState<PushState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: true,
    error: null,
  })

  // Verificar suporte ao carregar
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported =
        'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

      const permission = isSupported ? Notification.permission : 'denied'

      setState(prev => ({
        ...prev,
        isSupported,
        permission,
        isLoading: isSupported,
      }))

      if (isSupported) {
        await checkSubscription()
      } else {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    checkSupport()
  }, [])

  /**
   * Verificar se já está inscrito
   */
  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      setState(prev => ({
        ...prev,
        isSubscribed: !!subscription,
        isLoading: false,
      }))

      return !!subscription
    } catch (error) {
      console.error('[PushNotifications] Erro ao verificar subscription:', error)
      setState(prev => ({ ...prev, isLoading: false }))
      return false
    }
  }

  /**
   * Buscar chave VAPID do backend
   */
  const getVapidKey = async (): Promise<string | null> => {
    if (cachedVapidKey) return cachedVapidKey

    try {
      const response = await apiClient.get<{ vapid_key: string }>('/notifications/vapid-key')
      cachedVapidKey = response.data.vapid_key
      return cachedVapidKey
    } catch (error) {
      console.error('[PushNotifications] Erro ao buscar VAPID key:', error)
      return null
    }
  }

  /**
   * Solicitar permissão e inscrever para push
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      console.warn('[PushNotifications] Push não suportado neste dispositivo')
      return false
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // 1. Pedir permissão ao usuário
      console.log('[PushNotifications] Solicitando permissão...')
      const permission = await Notification.requestPermission()
      setState(prev => ({ ...prev, permission }))

      if (permission !== 'granted') {
        console.warn('[PushNotifications] Permissão negada pelo usuário')
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Permissão para notificações foi negada',
        }))
        return false
      }

      // 2. Buscar chave VAPID do backend
      console.log('[PushNotifications] Buscando VAPID key...')
      const vapidKey = await getVapidKey()

      if (!vapidKey) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Não foi possível obter a chave de autenticação',
        }))
        return false
      }

      // 3. Registrar subscription no Push Manager
      console.log('[PushNotifications] Registrando subscription...')
      console.log('[PushNotifications] Aguardando Service Worker...')

      // Timeout para evitar travamento infinito
      const swReady = navigator.serviceWorker.ready
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Service Worker timeout - tente recarregar a página')),
          10000
        )
      )

      const registration = await Promise.race([swReady, timeoutPromise])
      console.log('[PushNotifications] Service Worker pronto:', registration)
      console.log('[PushNotifications] VAPID Key:', vapidKey.substring(0, 20) + '...')

      // Verificar se já existe subscription
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        console.log('[PushNotifications] Criando nova subscription...')
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
      } else {
        console.log('[PushNotifications] Usando subscription existente')
      }

      console.log(
        '[PushNotifications] Subscription criada:',
        subscription.endpoint.substring(0, 50) + '...'
      )

      // 4. Enviar subscription para o backend
      console.log('[PushNotifications] Enviando subscription para o backend...')
      const p256dh = subscription.getKey('p256dh')
      const auth = subscription.getKey('auth')

      await apiClient.post('/notifications/subscribe', {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: p256dh ? arrayBufferToBase64(p256dh) : '',
          auth: auth ? arrayBufferToBase64(auth) : '',
        },
        device_info: {
          user_agent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          standalone:
            (window.navigator as any).standalone ||
            window.matchMedia('(display-mode: standalone)').matches,
        },
      })

      console.log('[PushNotifications] ✅ Inscrito com sucesso!')
      setState(prev => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
        error: null,
      }))

      return true
    } catch (error: any) {
      console.error('[PushNotifications] Erro ao inscrever:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erro ao ativar notificações',
      }))
      return false
    }
  }, [state.isSupported])

  /**
   * Cancelar inscrição de push
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // 1. Cancelar no navegador
        await subscription.unsubscribe()

        // 2. Remover do backend
        await apiClient.delete('/notifications/unsubscribe', {
          data: { endpoint: subscription.endpoint },
        })
      }

      console.log('[PushNotifications] ✅ Desinscrito com sucesso!')
      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
        error: null,
      }))

      return true
    } catch (error: any) {
      console.error('[PushNotifications] Erro ao desinscrever:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erro ao desativar notificações',
      }))
      return false
    }
  }, [])

  /**
   * Enviar notificação de teste
   */
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    try {
      // Enviar título e body para compatibilidade com backend
      await apiClient.post('/notifications/test', {
        title: 'Notificação de Teste',
        body: 'Esta é uma notificação de teste do WOLK NOW!'
      })
      return true
    } catch (error) {
      console.error('[PushNotifications] Erro ao enviar teste:', error)
      return false
    }
  }, [])

  return {
    // Estado
    isSupported: state.isSupported,
    permission: state.permission,
    isSubscribed: state.isSubscribed,
    isLoading: state.isLoading,
    error: state.error,

    // Ações
    subscribe,
    unsubscribe,
    checkSubscription,
    sendTestNotification,

    // Helpers
    canSubscribe: state.isSupported && state.permission !== 'denied' && !state.isSubscribed,
    isPWA:
      (window.navigator as any).standalone ||
      window.matchMedia('(display-mode: standalone)').matches,
  }
}

// ============ HELPERS ============

/**
 * Converter Base64 URL-safe para Uint8Array (para applicationServerKey)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

/**
 * Converter ArrayBuffer para Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

export default usePushNotifications
