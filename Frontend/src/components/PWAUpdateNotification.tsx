import { useEffect, useState } from 'react'
import { FiDownload, FiX } from 'react-icons/fi'
import { Rocket } from 'lucide-react'

/**
 * Componente que exibe notificação quando há uma nova versão da PWA disponível
 * Permite que o usuário atualize manualmente ou ignore
 */
export const PWAUpdateNotification = () => {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    // Detectar atualização do Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        setRegistration(reg)

        // Verificar atualizações a cada 60 segundos
        setInterval(() => {
          reg.update()
        }, 60000)

        // Escutar por novas atualizações
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nova versão disponível
                setShowUpdatePrompt(true)
              }
            })
          }
        })
      })

      // Escutar mensagens do Service Worker
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Service Worker foi atualizado, recarregar página
        window.location.reload()
      })
    }
  }, [])

  const close = () => {
    setShowUpdatePrompt(false)
  }

  const handleUpdate = () => {
    if (registration?.waiting) {
      // Avisar o Service Worker para pular a espera e ativar
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
    setShowUpdatePrompt(false)
  }

  if (!showUpdatePrompt) return null

  return (
    <div className='fixed bottom-4 right-4 z-[9999] max-w-md animate-in slide-in-from-bottom-4'>
      <div className='bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-2xl shadow-2xl border border-white/20 backdrop-blur-xl overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b border-white/10'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse'>
              <FiDownload className='w-5 h-5' />
            </div>
            <div>
              <h3 className='font-bold text-lg'>Nova Versão Disponível!</h3>
              <p className='text-xs text-white/80'>WOLK NOW® foi atualizado</p>
            </div>
          </div>
          <button
            onClick={close}
            className='text-white/70 hover:text-white transition-colors'
            aria-label='Fechar'
          >
            <FiX className='w-5 h-5' />
          </button>
        </div>

        {/* Content */}
        <div className='p-4'>
          <p className='text-sm text-white/90 mb-4'>
            Uma nova versão do WOLK NOW está disponível. Atualize agora para obter as últimas
            melhorias, recursos e correções de segurança.
          </p>

          {/* Actions */}
          <div className='flex gap-2'>
            <button
              onClick={handleUpdate}
              className='flex-1 bg-white text-purple-600 font-semibold py-2.5 px-4 rounded-lg hover:bg-white/90 transition-all duration-200 shadow-lg hover:scale-105 flex items-center justify-center gap-2'
            >
              <Rocket className='w-4 h-4' />
              Atualizar Agora
            </button>
            <button
              onClick={close}
              className='flex-1 bg-white/10 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20'
            >
              Mais Tarde
            </button>
          </div>
        </div>

        {/* Progress bar animation */}
        <div className='h-1 bg-white/10'>
          <div className='h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 bg-[length:200%_100%] animate-[gradient_2s_ease_infinite]' />
        </div>
      </div>
    </div>
  )
}
