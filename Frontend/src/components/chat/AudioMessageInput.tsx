/**
 * 🎙️ Audio Message Input Component
 * Componente para gravar e enviar áudio como mensagem (estilo WhatsApp/Telegram)
 */

import { useState, useRef, useEffect } from 'react'
import { Mic } from 'lucide-react'
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
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
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

  // Se estiver gravando, mostrar visualização com tempo
  if (isRecording) {
    return (
      <div className='bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 p-3 sm:p-4'>
        <div className='flex items-center gap-3'>
          {/* Status de Gravação */}
          <div className='flex-1 flex items-center gap-3 bg-white dark:bg-gray-800 rounded-full px-4 py-2'>
            <div className='w-2 h-2 bg-red-500 rounded-full animate-pulse' />
            <span className='text-sm font-semibold text-red-600 dark:text-red-400'>
              🎙️ Segure para gravar: {formatTime(recordingTime)}
            </span>
          </div>

          {/* Info - Solte para enviar */}
          <div className='text-xs text-red-600 dark:text-red-400 whitespace-nowrap'>
            Solte para enviar →
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
      className='hidden xs:flex items-center justify-center p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
      title='Segure para gravar áudio'
      aria-label='Gravar áudio'
    >
      <Mic className='w-4 h-4 sm:w-5 sm:h-5' />
    </button>
  )
}

export default AudioMessageInput
