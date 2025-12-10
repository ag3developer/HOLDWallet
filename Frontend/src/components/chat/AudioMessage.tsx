/**
 * 🎙️ Audio Message Component
 * Componente para renderizar e reproduzir mensagens de áudio no chat
 */

import { useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'

export interface AudioMessageProps {
  readonly audioBlob: Blob
  readonly isOwn: boolean
}

export function AudioMessage({ audioBlob, isOwn }: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
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

  const audioUrl = URL.createObjectURL(audioBlob)

  return (
    <div className='flex items-center gap-2 bg-white/20 dark:bg-black/20 rounded-full px-3 py-2 w-full max-w-xs'>
      {/* Play Button */}
      <button
        onClick={handlePlay}
        className='flex-shrink-0 p-2 rounded-full hover:bg-white/30 dark:hover:bg-white/10 transition-colors'
        title={isPlaying ? 'Pausar' : 'Reproduzir'}
      >
        {isPlaying ? (
          <Pause className='w-4 h-4 text-white' />
        ) : (
          <Play className='w-4 h-4 text-white' />
        )}
      </button>

      {/* Audio Element (Hidden) */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      >
        <track kind='captions' />
      </audio>

      {/* Progress Bar */}
      <div className='flex-1 flex items-center gap-2'>
        <div className='flex-1 h-1.5 bg-white/30 dark:bg-white/10 rounded-full overflow-hidden'>
          <div
            className='h-full bg-white/80 dark:bg-white/60 rounded-full transition-all duration-100'
            style={{
              width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
            }}
          />
        </div>
      </div>

      {/* Time Display */}
      <span className='text-xs text-white/70 dark:text-white/60 whitespace-nowrap'>
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  )
}

export default AudioMessage
