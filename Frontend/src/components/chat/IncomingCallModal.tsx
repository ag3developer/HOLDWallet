/**
 * 📞 Incoming Call Modal Component
 * Componente para exibir chamadas recebidas (do bot ou outro usuário)
 */

import { useEffect } from 'react'
import { Phone, PhoneOff, Video, X } from 'lucide-react'

export interface IncomingCallModalProps {
  readonly isOpen: boolean
  readonly callerName: string
  readonly callerAvatar?: string
  readonly callType: 'audio' | 'video'
  readonly onAccept: () => void
  readonly onReject: () => void
}

export function IncomingCallModal({
  isOpen,
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    // Criar tom de chamada
    const audioContext = new (globalThis.AudioContext || (globalThis as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.type = 'sine'

    // Simular toque de telefone (alternando frequências)
    let isHigh = false
    const interval = setInterval(() => {
      oscillator.frequency.setValueAtTime(isHigh ? 440 : 350, audioContext.currentTime)
      isHigh = !isHigh
    }, 200)

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.start()

    // Cleanup
    return () => {
      clearInterval(interval)
      oscillator.stop()
      gainNode.disconnect()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80'>
      <div className='w-full max-w-sm mx-4 rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 to-black shadow-2xl'>
        {/* Close Button */}
        <div className='absolute top-4 right-4'>
          <button
            onClick={onReject}
            className='p-2 rounded-full hover:bg-white/10 transition-colors'
            title='Recusar chamada'
          >
            <X className='w-6 h-6 text-gray-400' />
          </button>
        </div>

        {/* Caller Info */}
        <div className='pt-12 pb-8 px-6 text-center'>
          {/* Avatar */}
          <div className='mb-6 flex justify-center'>
            <div className='relative'>
              {callerAvatar ? (
                <img
                  src={callerAvatar}
                  alt={callerName}
                  className='w-24 h-24 rounded-full object-cover border-4 border-blue-500'
                />
              ) : (
                <div className='w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-4xl font-bold border-4 border-blue-500'>
                  {callerName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className='absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white animate-pulse' />
            </div>
          </div>

          {/* Caller Name */}
          <h2 className='text-3xl font-bold text-white mb-2'>{callerName}</h2>

          {/* Call Type Badge */}
          <div className='inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 rounded-full border border-blue-500/50 mb-6'>
            {callType === 'video' ? (
              <>
                <Video className='w-4 h-4 text-blue-400' />
                <span className='text-sm font-semibold text-blue-300'>Chamada de vídeo</span>
              </>
            ) : (
              <>
                <Phone className='w-4 h-4 text-green-400' />
                <span className='text-sm font-semibold text-green-300'>Chamada de voz</span>
              </>
            )}
          </div>

          {/* Ringing Animation */}
          <div className='flex justify-center gap-2 mb-8'>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`w-2 h-2 bg-blue-500 rounded-full animate-pulse ring-delay-${i * 200}`}
              />
            ))}
          </div>

          <p className='text-gray-400 text-sm'>Chamada recebida...</p>
        </div>

        {/* Action Buttons */}
        <div className='bg-gray-800/50 px-6 py-6 flex gap-4'>
          {/* Reject Button */}
          <button
            onClick={onReject}
            className='flex-1 py-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold transition-colors flex items-center justify-center gap-2'
          >
            <PhoneOff className='w-5 h-5' />
            Recusar
          </button>

          {/* Accept Button */}
          <button
            onClick={onAccept}
            className='flex-1 py-4 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold transition-colors flex items-center justify-center gap-2'
          >
            <Phone className='w-5 h-5' />
            Aceitar
          </button>
        </div>

        {/* Info Text */}
        <div className='px-6 py-4 text-center text-xs text-gray-500'>
          <p>Seu microfone estará ativado quando você aceitar</p>
        </div>
      </div>
    </div>
  )
}

export default IncomingCallModal
