/**
 * 📞 Call Modal Component
 * Componente para exibir chamada de voz/vídeo em andamento
 */

import { useState, useEffect, useRef } from 'react'
import { X, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from 'lucide-react'

export interface CallModalProps {
  readonly isOpen: boolean
  readonly callType: 'audio' | 'video'
  readonly contactName: string
  readonly contactAvatar?: string
  readonly duration: number
  readonly isAudioEnabled: boolean
  readonly isVideoEnabled: boolean
  readonly onToggleAudio: (enabled: boolean) => void
  readonly onToggleVideo: (enabled: boolean) => void
  readonly onEndCall: () => void
  readonly remoteVideoRef?: React.RefObject<HTMLVideoElement>
  readonly localVideoRef?: React.RefObject<HTMLVideoElement>
}

export function CallModal({
  isOpen,
  callType,
  contactName,
  contactAvatar,
  duration,
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  remoteVideoRef,
  localVideoRef,
}: CallModalProps) {
  const [displayDuration, setDisplayDuration] = useState('00:00')
  const [isMuted, setIsMuted] = useState(false)
  const durationRef = useRef(duration)

  useEffect(() => {
    durationRef.current = duration
  }, [duration])

  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      const minutes = Math.floor(durationRef.current / 60)
      const seconds = durationRef.current % 60
      setDisplayDuration(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
      durationRef.current += 1
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80'>
      {/* Container Principal */}
      <div className='w-full max-w-2xl mx-4 rounded-2xl overflow-hidden bg-gray-900 shadow-2xl'>
        {/* Header */}
        <div className='bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='relative'>
              {contactAvatar ? (
                <img
                  src={contactAvatar}
                  alt={contactName}
                  className='w-12 h-12 rounded-full object-cover'
                />
              ) : (
                <div className='w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold'>
                  {contactName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className='absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white' />
            </div>
            <div className='flex-1'>
              <h3 className='text-lg font-semibold text-white'>{contactName}</h3>
              <p className='text-sm text-blue-100'>{displayDuration}</p>
            </div>
          </div>
          <button
            onClick={onEndCall}
            className='p-2 rounded-full hover:bg-white/20 transition-colors'
            title='Fechar chamada'
          >
            <X className='w-6 h-6 text-white' />
          </button>
        </div>

        {/* Conteúdo da Chamada */}
        <div className='relative bg-black'>
          {callType === 'video' ? (
            <>
              {/* Vídeo Remoto (grande) */}
              <div className='aspect-video bg-gray-800 relative overflow-hidden'>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className='w-full h-full object-cover'
                >
                  <track kind='captions' />
                </video>

                {/* Vídeo Local (pequeno, canto) */}
                <div className='absolute bottom-4 right-4 w-32 h-32 bg-gray-700 rounded-lg overflow-hidden border-2 border-white shadow-lg'>
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className='w-full h-full object-cover scale-x-[-1]'
                  >
                    <track kind='captions' />
                  </video>
                </div>
              </div>
            </>
          ) : (
            /* Audio Only */
            <div className='aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center'>
              <div className='text-center'>
                <div className='w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center mx-auto mb-4'>
                  {contactAvatar ? (
                    <img
                      src={contactAvatar}
                      alt={contactName}
                      className='w-24 h-24 rounded-full object-cover'
                    />
                  ) : (
                    <span className='text-5xl font-bold text-white'>
                      {contactName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <h2 className='text-2xl font-bold text-white mb-2'>{contactName}</h2>
                <p className='text-lg text-gray-400'>Chamada de voz em andamento...</p>

                {/* Animação de áudio */}
                <div className='flex justify-center gap-1 mt-6'>
                  {[0, 1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`w-1 bg-blue-500 rounded-full animate-pulse ${
                        i === 0
                          ? 'h-5'
                          : i === 1
                            ? 'h-8'
                            : i === 2
                              ? 'h-11'
                              : i === 3
                                ? 'h-8'
                                : 'h-5'
                      }`}
                      style={{
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controles */}
        <div className='bg-gray-800 px-6 py-4 flex items-center justify-center gap-4'>
          {/* Mute Audio */}
          <button
            onClick={() => {
              onToggleAudio(!isAudioEnabled)
              setIsMuted(!isAudioEnabled)
            }}
            className={`p-3 rounded-full transition-colors ${
              isAudioEnabled
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={isAudioEnabled ? 'Mutar áudio' : 'Desmutar áudio'}
          >
            {isAudioEnabled ? <Mic className='w-6 h-6' /> : <MicOff className='w-6 h-6' />}
          </button>

          {/* Toggle Video (apenas para video calls) */}
          {callType === 'video' && (
            <button
              onClick={() => onToggleVideo(!isVideoEnabled)}
              className={`p-3 rounded-full transition-colors ${
                isVideoEnabled
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              title={isVideoEnabled ? 'Desligar câmera' : 'Ligar câmera'}
            >
              {isVideoEnabled ? <Video className='w-6 h-6' /> : <VideoOff className='w-6 h-6' />}
            </button>
          )}

          {/* Volume Control */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className='p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors'
            title={isMuted ? 'Som ligado' : 'Som desligado'}
          >
            {isMuted ? <VolumeX className='w-6 h-6' /> : <Volume2 className='w-6 h-6' />}
          </button>

          {/* End Call - Botão Vermelho Grande */}
          <div className='ml-4 pl-4 border-l border-gray-600'>
            <button
              onClick={onEndCall}
              className='p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors shadow-lg'
              title='Encerrar chamada'
            >
              <PhoneOff className='w-6 h-6' />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className='bg-gray-900 px-6 py-3 flex items-center justify-center gap-2 text-sm text-gray-400'>
          <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse' />
          <span>{callType === 'video' ? 'Chamada de vídeo' : 'Chamada de voz'} em andamento</span>
        </div>
      </div>
    </div>
  )
}

export default CallModal
