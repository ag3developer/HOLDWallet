/**
 * 🎙️ Audio Message Input Component
 * Componente moderno para gravar e enviar áudio (estilo WhatsApp/Telegram)
 */

import { useState, useRef, useEffect } from 'react'
import { Mic, X, Send, Trash2 } from 'lucide-react'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'

export interface AudioMessageInputProps {
  readonly onAudioSend: (audio: Blob) => void
  readonly isDisabled?: boolean
}

export function AudioMessageInput({ onAudioSend, isDisabled = false }: AudioMessageInputProps) {
  const [isHolding, setIsHolding] = useState(false)
  const isHoldingRef = useRef(false)
  const { isRecording, recordingTime, startRecording, stopRecording, clearRecording } =
    useAudioRecorder()

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  // Setup global mouse up / touch end listeners
  useEffect(() => {
    const handleStopRecording = async () => {
      if (!isHoldingRef.current) return

      isHoldingRef.current = false
      setIsHolding(false)

      console.log('🎙️ Parando gravação e enviando...')
      try {
        const audioBlob = await stopRecording()
        console.log('📦 AudioBlob recebido:', audioBlob?.size, 'bytes')

        if (audioBlob && audioBlob.size > 0) {
          console.log('📤 Enviando áudio automaticamente:', audioBlob.size, 'bytes')
          onAudioSend(audioBlob)
        } else {
          console.warn('⚠️ Áudio vazio ou nulo')
          clearRecording()
        }
      } catch (error) {
        console.error('❌ Erro ao parar gravação:', error)
        clearRecording()
      }
    }

    const handleMouseUp = () => handleStopRecording()
    const handleTouchEnd = () => handleStopRecording()

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onAudioSend, stopRecording, clearRecording])

  /**
   * Inicia gravação quando pressiona o botão
   */
  const handleMouseDown = async () => {
    if (isDisabled) return
    isHoldingRef.current = true
    setIsHolding(true)
    console.log('🎙️ Press and hold iniciado')
    await startRecording()
  }

  // Se estiver gravando, mostrar visualização moderna integrada
  if (isRecording) {
    return (
      <div className='absolute inset-0 bg-gradient-to-r from-red-500/10 via-pink-500/10 to-red-500/10 dark:from-red-900/30 dark:via-pink-900/30 dark:to-red-900/30 backdrop-blur-sm z-50 flex items-center justify-center'>
        <div className='w-full max-w-2xl mx-auto px-4'>
          {/* Card de Gravação - Design Moderno */}
          <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-red-500/20 dark:border-red-400/30 p-6 animate-fadeIn'>
            {/* Header com Status */}
            <div className='flex items-center justify-between mb-6'>
              <div className='flex items-center gap-3'>
                {/* Ícone de Microfone Pulsante */}
                <div className='relative'>
                  <div className='absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75'></div>
                  <div className='relative w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg'>
                    <Mic className='w-6 h-6 text-white' />
                  </div>
                </div>

                {/* Texto de Status */}
                <div>
                  <h3 className='text-lg font-bold text-gray-900 dark:text-white'>
                    Gravando áudio
                  </h3>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>
                    Solte para enviar ou cancele para descartar
                  </p>
                </div>
              </div>

              {/* Timer - Grande e Visível */}
              <div className='text-right'>
                <div className='text-3xl font-bold text-red-600 dark:text-red-400 tabular-nums'>
                  {formatTime(recordingTime)}
                </div>
                <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>duração</div>
              </div>
            </div>

            {/* Waveform Visual (Barra de Progresso Animada) */}
            <div className='mb-6'>
              <div className='flex items-center gap-1 h-16 justify-center'>
                {[...Array(40)].map((_, i) => (
                  <div
                    key={i}
                    className='w-1 bg-gradient-to-t from-red-500 to-pink-500 rounded-full transition-all duration-150'
                    style={{
                      height: `${Math.random() * 60 + 20}%`,
                      animationDelay: `${i * 0.05}s`,
                      animation: 'pulse 0.8s ease-in-out infinite',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Instruções - Mobile e Desktop */}
            <div className='space-y-3'>
              {/* Desktop */}
              <div className='hidden sm:flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400'>
                <div className='flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg'>
                  <Send className='w-4 h-4 text-green-500' />
                  <span>Solte o mouse para enviar</span>
                </div>
                <div className='flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg'>
                  <X className='w-4 h-4 text-red-500' />
                  <span>ESC para cancelar</span>
                </div>
              </div>

              {/* Mobile */}
              <div className='sm:hidden text-center'>
                <div className='inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full shadow-lg animate-bounce'>
                  <Send className='w-4 h-4' />
                  <span className='font-medium'>Solte para enviar →</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className='mt-4'>
              <div className='h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
                <div
                  className='h-full bg-gradient-to-r from-red-500 via-pink-500 to-red-500 rounded-full transition-all duration-1000'
                  style={{
                    width: `${Math.min((recordingTime / 60) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className='flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1'>
                <span>0:00</span>
                <span>1:00 máximo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Modo normal - botão de mic com press-and-hold
  return (
    <button
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      disabled={isDisabled}
      className='flex items-center justify-center p-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full hover:from-red-600 hover:to-pink-600 transition-all transform hover:scale-110 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
      title='Segure para gravar áudio'
      aria-label='Gravar áudio'
    >
      <Mic className='w-5 h-5' />
    </button>
  )
}

export default AudioMessageInput
