/**
 * 🎙️ Audio Message Component
 * Componente moderno para renderizar e reproduzir mensagens de áudio (estilo WhatsApp/Telegram)
 */

import { useRef, useState, useEffect } from 'react'
import { Play, Pause, Mic2 } from 'lucide-react'

export interface AudioMessageProps {
  readonly audioBlob: Blob
  readonly isOwn: boolean
}

export function AudioMessage({ audioBlob, isOwn }: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string>('')
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const url = URL.createObjectURL(audioBlob)
    setAudioUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [audioBlob])

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const handlePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = x / rect.width
      const newTime = percentage * duration
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className={`flex items-center gap-2 min-w-[280px] max-w-[320px] ${
        isOwn ? 'bg-white/10 backdrop-blur-sm' : 'bg-gray-100 dark:bg-gray-700/50'
      } rounded-2xl px-3 py-2.5`}
    >
      {/* Play/Pause Button - Estilo moderno circular */}
      <button
        onClick={handlePlay}
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isOwn
            ? 'bg-white/20 hover:bg-white/30 active:scale-95'
            : 'bg-blue-500 hover:bg-blue-600 active:scale-95'
        }`}
        title={isPlaying ? 'Pausar' : 'Reproduzir'}
        aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
      >
        {isPlaying ? (
          <Pause className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-white'} fill-current`} />
        ) : (
          <Play className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-white'} fill-current ml-0.5`} />
        )}
      </button>

      {/* Audio Element (Hidden) */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload='metadata'
      >
        <track kind='captions' />
      </audio>

      {/* Waveform/Progress Section */}
      <div className='flex-1 flex flex-col gap-1'>
        {/* Ícone + Progress Bar */}
        <div className='flex items-center gap-2'>
          <Mic2
            className={`w-3.5 h-3.5 flex-shrink-0 ${
              isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
            }`}
          />

          {/* Progress Bar Clicável - Estilo WhatsApp */}
          <div
            onClick={handleProgressClick}
            className='flex-1 h-6 flex items-center cursor-pointer group'
            role='slider'
            aria-label='Progresso do áudio'
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`relative w-full h-1 rounded-full overflow-hidden ${
                isOwn ? 'bg-white/20' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              {/* Barra de progresso */}
              <div
                className={`h-full rounded-full transition-all duration-100 ${
                  isOwn ? 'bg-white/80' : 'bg-blue-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />

              {/* Ponto de progresso (aparece no hover) */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                  isOwn ? 'bg-white shadow-lg' : 'bg-blue-600 shadow-lg'
                }`}
                style={{ left: `${progressPercentage}%`, transform: 'translate(-50%, -50%)' }}
              />
            </div>
          </div>
        </div>

        {/* Time Display */}
        <div className='flex items-center justify-between'>
          <span
            className={`text-[10px] font-medium ${
              isOwn ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {isPlaying || currentTime > 0 ? formatTime(currentTime) : formatTime(duration)}
          </span>

          {/* Tamanho do arquivo */}
          <span
            className={`text-[10px] ${
              isOwn ? 'text-white/50' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {(audioBlob.size / 1024).toFixed(1)} KB
          </span>
        </div>
      </div>
    </div>
  )
}

export default AudioMessage
