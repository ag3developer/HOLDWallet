/**
 * 🎙️ Audio Message Input Component
 * Componente moderno para gravar e enviar áudio (estilo WhatsApp/Telegram)
 * Press and hold para gravar, solte para enviar
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic } from 'lucide-react'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'

export interface AudioMessageInputProps {
  readonly onAudioSend: (audio: Blob) => void
  readonly isDisabled?: boolean
}

export function AudioMessageInput({ onAudioSend, isDisabled = false }: AudioMessageInputProps) {
  const [isHolding, setIsHolding] = useState(false)
  const isHoldingRef = useRef(false)
  const hasStartedRef = useRef(false)
  const { isRecording, recordingTime, startRecording, stopRecording, clearRecording } =
    useAudioRecorder()

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  // Função para parar gravação e enviar
  const handleStopAndSend = useCallback(async () => {
    if (!isHoldingRef.current && !isRecording) return

    console.log('🎙️ Parando gravação e enviando...')
    isHoldingRef.current = false
    hasStartedRef.current = false
    setIsHolding(false)

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
  }, [onAudioSend, stopRecording, clearRecording, isRecording])

  // Setup global mouse up / touch end listeners
  useEffect(() => {
    const handleMouseUp = () => {
      if (isHoldingRef.current || isRecording) {
        handleStopAndSend()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      // Prevenir comportamento padrão para evitar cliques fantasma
      if (isHoldingRef.current || isRecording) {
        e.preventDefault()
        handleStopAndSend()
      }
    }

    // Cancelar com ESC
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRecording) {
        isHoldingRef.current = false
        hasStartedRef.current = false
        setIsHolding(false)
        clearRecording()
      }
    }

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchend', handleTouchEnd, { passive: false })
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleStopAndSend, isRecording, clearRecording])

  /**
   * Inicia gravação quando pressiona o botão
   */
  const handleStart = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isDisabled || hasStartedRef.current) return

    isHoldingRef.current = true
    hasStartedRef.current = true
    setIsHolding(true)
    console.log('🎙️ Press and hold iniciado')

    try {
      await startRecording()
    } catch (error) {
      console.error('❌ Erro ao iniciar gravação:', error)
      isHoldingRef.current = false
      hasStartedRef.current = false
      setIsHolding(false)
    }
  }

  // Se estiver gravando, mostrar indicador compacto inline
  if (isRecording || isHolding) {
    return (
      <div className='flex items-center gap-2'>
        {/* Indicador de gravação compacto */}
        <div className='flex items-center gap-2 px-3 py-2 bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 rounded-xl animate-pulse'>
          {/* Dot pulsante */}
          <div className='relative'>
            <div className='w-2.5 h-2.5 bg-red-500 rounded-full animate-ping absolute'></div>
            <div className='w-2.5 h-2.5 bg-red-500 rounded-full relative'></div>
          </div>

          {/* Timer */}
          <span className='text-sm font-mono font-semibold text-red-600 dark:text-red-400 min-w-[40px]'>
            {formatTime(recordingTime)}
          </span>

          {/* Texto */}
          <span className='text-xs text-red-600 dark:text-red-400 hidden sm:inline'>
            Solte para enviar
          </span>
        </div>

        {/* Botão de mic (pressionado) */}
        <div className='flex items-center justify-center p-2.5 sm:p-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl shadow-lg shadow-red-500/30 scale-110'>
          <Mic className='w-5 h-5 animate-pulse' />
        </div>
      </div>
    )
  }

  // Modo normal - botão de mic com press-and-hold
  return (
    <button
      onMouseDown={handleStart}
      onTouchStart={handleStart}
      disabled={isDisabled}
      className='flex items-center justify-center p-2.5 sm:p-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed'
      title='Segure para gravar áudio'
      aria-label='Gravar áudio'
    >
      <Mic className='w-5 h-5' />
    </button>
  )
}

export default AudioMessageInput
