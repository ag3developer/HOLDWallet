/**
 * iOS PWA Update Modal
 * ========================
 *
 * Modal específico para atualização em iOS Safari PWA (webapp instalado).
 * Resolve o problema de cache agressivo do Safari que causa tela branca.
 *
 * APENAS exibido para usuários iOS com PWA instalada (standalone mode).
 */

import { useEffect, useState, useCallback } from 'react'
import { Smartphone, RefreshCw, Download, AlertTriangle, CheckCircle2 } from 'lucide-react'

// Detecta se é iOS
const isIOS = (): boolean => {
  if (globalThis.window === undefined) return false
  const userAgent = globalThis.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(userAgent)
}

// Detecta se está em modo standalone (PWA instalada)
const isPWAStandalone = (): boolean => {
  if (globalThis.window === undefined) return false
  // Safari iOS
  const isStandalone =
    (globalThis.navigator as Navigator & { standalone?: boolean }).standalone === true
  // Fallback para outras formas de detecção
  const isDisplayModeStandalone = globalThis.matchMedia('(display-mode: standalone)').matches
  return isStandalone || isDisplayModeStandalone
}

// Detecta se é iOS PWA
const isIOSPWA = (): boolean => {
  return isIOS() && isPWAStandalone()
}

// Chaves para localStorage
const IOS_VERSION_KEY = 'wolknow_ios_version'
const IOS_LAST_UPDATE_KEY = 'wolknow_ios_last_update'
const IOS_FORCE_UPDATE_KEY = 'wolknow_ios_force_update'

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div className='fixed inset-0 z-[99999] bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 flex flex-col items-center justify-center p-6'>
    {/* Logo animado */}
    <div className='relative mb-8'>
      <div className='w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center animate-pulse'>
        <RefreshCw className='w-10 h-10 text-white animate-spin' />
      </div>
      <div className='absolute -inset-2 bg-purple-500/30 rounded-3xl blur-xl animate-pulse' />
    </div>

    {/* Texto */}
    <h2 className='text-white text-xl font-bold mb-2 animate-pulse'>Atualizando WOLK NOW®</h2>
    <p className='text-gray-300 text-sm text-center mb-8'>
      Limpando cache e carregando nova versão...
    </p>

    {/* Progress bar */}
    <div className='w-64 h-2 bg-gray-700 rounded-full overflow-hidden'>
      <div className='h-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 rounded-full animate-ios-progress' />
    </div>

    {/* Skeleton cards simulando conteúdo */}
    <div className='mt-10 w-full max-w-sm space-y-3'>
      <div className='h-12 bg-white/10 rounded-xl animate-pulse' />
      <div className='h-20 bg-white/10 rounded-xl animate-pulse animation-delay-100' />
      <div className='h-16 bg-white/10 rounded-xl animate-pulse animation-delay-200' />
    </div>

    <style>{`
      @keyframes ios-progress {
        0% { width: 0%; }
        50% { width: 80%; }
        100% { width: 100%; }
      }
      .animate-ios-progress {
        animation: ios-progress 2s ease-in-out infinite;
      }
      .animation-delay-100 {
        animation-delay: 0.1s;
      }
      .animation-delay-200 {
        animation-delay: 0.2s;
      }
    `}</style>
  </div>
)

interface IOSPWAUpdateModalProps {
  forceShow?: boolean
}

export const IOSPWAUpdateModal = ({ forceShow = false }: IOSPWAUpdateModalProps) => {
  const [showModal, setShowModal] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [serverVersion, setServerVersion] = useState<string | null>(null)

  // Verifica se há nova versão disponível
  const checkForUpdate = useCallback(async () => {
    // Só verifica em iOS PWA (ou se forçado para teste)
    if (!isIOSPWA() && !forceShow) return

    try {
      // Busca version.json do servidor sem cache
      const response = await fetch(`/version.json?nocache=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      })

      if (!response.ok) {
        console.log('[iOS PWA] version.json não encontrado')
        return
      }

      const data = await response.json()
      const newVersion = data.version || data.buildTime
      const storedVersion = localStorage.getItem(IOS_VERSION_KEY)

      console.log('[iOS PWA] Versão servidor:', newVersion, '| Local:', storedVersion)

      if (storedVersion && storedVersion !== newVersion) {
        // Nova versão disponível!
        setServerVersion(newVersion)
        setUpdateAvailable(true)
        setShowModal(true)
        console.log('[iOS PWA] 🚀 Nova versão detectada!')
      } else if (!storedVersion) {
        // Primeira vez - salva versão atual
        localStorage.setItem(IOS_VERSION_KEY, newVersion)
      }
    } catch (error) {
      console.error('[iOS PWA] Erro ao verificar versão:', error)
    }
  }, [forceShow])

  // Limpa todos os caches do iOS Safari
  const clearIOSCaches = useCallback(async () => {
    console.log('[iOS PWA] Limpando caches do Safari...')

    // 1. Limpar Cache Storage
    if ('caches' in globalThis) {
      try {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
        console.log('[iOS PWA] Cache Storage limpo:', cacheNames.length, 'caches')
      } catch (e) {
        console.error('[iOS PWA] Erro ao limpar Cache Storage:', e)
      }
    }

    // 2. Desregistrar Service Workers
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const reg of registrations) {
          await reg.unregister()
        }
        console.log('[iOS PWA] Service Workers desregistrados:', registrations.length)
      } catch (e) {
        console.error('[iOS PWA] Erro ao desregistrar SW:', e)
      }
    }

    // 3. Limpar localStorage relacionado ao PWA (mantém dados do usuário)
    const keysToRemove = [
      'wolknow_app_version',
      'wolknow_server_version',
      'wolknow_last_update_check',
      IOS_FORCE_UPDATE_KEY,
    ]
    keysToRemove.forEach(key => localStorage.removeItem(key))

    // 4. Salvar nova versão
    if (serverVersion) {
      localStorage.setItem(IOS_VERSION_KEY, serverVersion)
      localStorage.setItem(IOS_LAST_UPDATE_KEY, Date.now().toString())
    }

    console.log('[iOS PWA] ✅ Caches limpos com sucesso!')
  }, [serverVersion])

  // Executa a atualização
  const handleUpdate = useCallback(async () => {
    setIsUpdating(true)

    try {
      await clearIOSCaches()

      // Aguarda um pouco para mostrar a animação
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Força reload da página com URL única para evitar cache
      const newUrl = new URL(globalThis.location.href)
      newUrl.searchParams.set('v', Date.now().toString())
      globalThis.location.replace(newUrl.toString())
    } catch (error) {
      console.error('[iOS PWA] Erro durante atualização:', error)
      // Tenta reload normal como fallback
      globalThis.location.reload()
    }
  }, [clearIOSCaches])

  // Fechar modal sem atualizar
  const handleDismiss = () => {
    setShowModal(false)
    // Não mostra novamente por 1 hora
    localStorage.setItem(IOS_FORCE_UPDATE_KEY, (Date.now() + 60 * 60 * 1000).toString())
  }

  // Verifica ao montar e a cada 2 minutos
  useEffect(() => {
    // Verificação inicial com delay
    const initialCheck = setTimeout(() => {
      checkForUpdate()
    }, 3000) // Aguarda 3s após carregar

    // Verificação periódica
    const interval = setInterval(checkForUpdate, 2 * 60 * 1000) // 2 minutos

    return () => {
      clearTimeout(initialCheck)
      clearInterval(interval)
    }
  }, [checkForUpdate])

  // Verifica quando volta para a aba/app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [checkForUpdate])

  // Se está atualizando, mostra skeleton
  if (isUpdating) {
    return <LoadingSkeleton />
  }

  // Se não tem modal para mostrar, retorna null
  if (!showModal || !updateAvailable) {
    return null
  }

  return (
    <div className='fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4'>
      <div className='bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl border border-purple-500/30 max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-300'>
        {/* Header com ícone */}
        <div className='bg-gradient-to-r from-purple-600 to-blue-600 p-6 relative overflow-hidden'>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMSIgY3g9IjIwIiBjeT0iMjAiIHI9IjIiLz48L2c+PC9zdmc+')] opacity-30" />

          <div className='relative flex items-center gap-4'>
            <div className='w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm'>
              <Smartphone className='w-8 h-8 text-white' />
            </div>
            <div>
              <h2 className='text-white text-xl font-bold'>Atualização Disponível</h2>
              <p className='text-white/80 text-sm'>WOLK NOW® PWA</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className='p-6'>
          <div className='flex items-start gap-3 mb-4 p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20'>
            <AlertTriangle className='w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5' />
            <p className='text-sm text-yellow-200/90'>
              Uma nova versão está disponível. Atualize para evitar problemas de carregamento e tela
              branca.
            </p>
          </div>

          <div className='space-y-3 mb-6'>
            <div className='flex items-center gap-3 text-gray-300'>
              <CheckCircle2 className='w-4 h-4 text-green-500' />
              <span className='text-sm'>Correções de bugs e melhorias</span>
            </div>
            <div className='flex items-center gap-3 text-gray-300'>
              <CheckCircle2 className='w-4 h-4 text-green-500' />
              <span className='text-sm'>Performance otimizada</span>
            </div>
            <div className='flex items-center gap-3 text-gray-300'>
              <CheckCircle2 className='w-4 h-4 text-green-500' />
              <span className='text-sm'>Cache limpo automaticamente</span>
            </div>
          </div>

          {/* Buttons */}
          <div className='space-y-3'>
            <button
              onClick={handleUpdate}
              className='w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2 active:scale-[0.98]'
            >
              <Download className='w-5 h-5' />
              Atualizar Agora
            </button>

            <button
              onClick={handleDismiss}
              className='w-full bg-gray-700/50 text-gray-300 font-medium py-3 px-6 rounded-xl hover:bg-gray-700 transition-all duration-200 border border-gray-600/50'
            >
              Lembrar mais tarde
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className='px-6 pb-4'>
          <p className='text-xs text-gray-500 text-center'>
            Seus dados estão seguros e serão preservados
          </p>
        </div>
      </div>
    </div>
  )
}

export default IOSPWAUpdateModal
