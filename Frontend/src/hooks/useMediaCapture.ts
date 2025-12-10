/**
 * 🎥 useMediaCapture Hook
 * Hook para capturar áudio e vídeo da câmera/microfone
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseMediaCaptureResult {
  localVideoRef: React.RefObject<HTMLVideoElement>
  remoteVideoRef: React.RefObject<HTMLVideoElement>
  startMediaCapture: (callType: 'audio' | 'video') => Promise<void>
  stopMediaCapture: () => void
  isMediaReady: boolean
  mediaError: string | null
}

export function useMediaCapture(): UseMediaCaptureResult {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const videoStreamRef = useRef<MediaStream | null>(null)

  const [isMediaReady, setIsMediaReady] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)

  const startMediaCapture = useCallback(async (callType: 'audio' | 'video') => {
    try {
      setMediaError(null)
      setIsMediaReady(false)

      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          callType === 'video'
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user',
              }
            : false,
      }

      console.log('🎤 Solicitando permissões de mídia:', callType)

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)

      console.log('✅ Mídia capturada:', {
        audio: mediaStream.getAudioTracks().length > 0,
        video: mediaStream.getVideoTracks().length > 0,
      })

      if (callType === 'audio') {
        audioStreamRef.current = mediaStream
      } else {
        videoStreamRef.current = mediaStream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream
          console.log('📹 Vídeo local conectado')
        }
      }

      if (callType === 'video' && remoteVideoRef.current) {
        createRemoteVideoSimulation(remoteVideoRef.current)
      }

      setIsMediaReady(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao acessar mídia'
      console.error('❌ Erro:', message)

      if (message.includes('NotAllowedError')) {
        setMediaError('❌ Permissão negada. Permita acesso à câmera/microfone.')
      } else if (message.includes('NotFoundError')) {
        setMediaError('❌ Nenhuma câmera/microfone encontrado.')
      } else {
        setMediaError(`❌ ${message}`)
      }

      setIsMediaReady(false)
    }
  }, [])

  const stopMediaCapture = useCallback(() => {
    console.log('⏹️ Parando mídia...')

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop())
      audioStreamRef.current = null
    }

    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop())
      videoStreamRef.current = null
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }

    setIsMediaReady(false)
    setMediaError(null)
  }, [])

  useEffect(() => {
    return () => {
      stopMediaCapture()
    }
  }, [stopMediaCapture])

  return {
    localVideoRef,
    remoteVideoRef,
    startMediaCapture,
    stopMediaCapture,
    isMediaReady,
    mediaError,
  }
}

function createRemoteVideoSimulation(videoElement: HTMLVideoElement) {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1280
    canvas.height = 720

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, '#1e293b')
    gradient.addColorStop(1, '#0f172a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = '#10b981'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('🤖 Bot Simulado', canvas.width / 2, canvas.height / 2 - 50)

    ctx.fillStyle = '#6b7280'
    ctx.font = '24px Arial'
    ctx.fillText('(Vídeo do Bot)', canvas.width / 2, canvas.height / 2 + 50)

    const stream = canvas.captureStream(30)
    videoElement.srcObject = stream

    console.log('🎬 Vídeo remoto simulado')
  } catch (error) {
    console.warn('Erro ao criar vídeo simulado:', error)
  }
}
