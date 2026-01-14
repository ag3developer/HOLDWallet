/**
 * BarcodeScanner - Scanner de Código de Barras (iOS Safari Optimizado)
 * ====================================================================
 *
 * Componente otimizado para escanear códigos de barras em dispositivos iOS.
 *
 * Melhorias para Safari iOS:
 * - Uso correto do playsinline para iOS
 * - Constraints de vídeo específicas para iOS
 * - Inicialização explícita do stream
 * - Tratamento de erros específicos do Safari
 * - Timeout para evitar travamento
 *
 * Formatos suportados:
 * - ITF (Interleaved 2 of 5) - Usado em boletos bancários
 * - CODE_128
 * - EAN_13
 * - QR_CODE (para PIX)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  CameraOff,
  X,
  SwitchCamera,
  Flashlight,
  AlertCircle,
  CheckCircle,
  Loader2,
  ScanLine,
  RefreshCw,
} from 'lucide-react'
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library'

interface BarcodeScannerProps {
  readonly onScan: (barcode: string) => void
  readonly onClose: () => void
  readonly isOpen: boolean
}

type CameraState = 'idle' | 'requesting' | 'active' | 'error'

export function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [scannedCode, setScannedCode] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [torchOn, setTorchOn] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // Detectar iOS
  const ua = navigator.userAgent
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  // Inicializar o reader de código de barras
  useEffect(() => {
    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.ITF,
      BarcodeFormat.CODE_128,
      BarcodeFormat.EAN_13,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODABAR,
    ])
    hints.set(DecodeHintType.TRY_HARDER, true)

    readerRef.current = new BrowserMultiFormatReader(hints)

    return () => {
      readerRef.current?.reset()
    }
  }, [])

  // Função para parar a câmera
  const stopCamera = useCallback(() => {
    // Parar scanning
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    // Parar stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }

    // Limpar video
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraState('idle')
  }, [])

  // Processar código escaneado
  const handleScan = useCallback(
    (code: string) => {
      if (isProcessing || scannedCode) return

      // Validar se parece um código de boleto (44-48 dígitos numéricos)
      const cleanCode = code.replaceAll(/\D/g, '')

      if (cleanCode.length >= 44 && cleanCode.length <= 48) {
        setIsProcessing(true)
        setScannedCode(cleanCode)

        // Vibrar para feedback tátil
        if (navigator.vibrate) {
          navigator.vibrate(200)
        }

        console.log('✅ Código detectado:', cleanCode.substring(0, 20) + '...')

        // Delay para mostrar feedback visual
        setTimeout(() => {
          onScan(cleanCode)
          setIsProcessing(false)
          setScannedCode(null)
        }, 500)
      }
    },
    [isProcessing, scannedCode, onScan]
  )

  // Scanning contínuo
  const startScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
    }

    // Escanear a cada 250ms (um pouco mais lento para iOS)
    scanIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !readerRef.current || isProcessing || scannedCode) return

      const video = videoRef.current

      // Verificar se o video está pronto
      if (video.readyState < 2 || video.videoWidth === 0) return

      try {
        // Tentar decodificar diretamente do video element
        readerRef.current
          .decodeFromVideoElement(video)
          .then(result => {
            if (result) {
              handleScan(result.getText())
            }
          })
          .catch(() => {
            // Silencioso - é normal não encontrar código em cada frame
          })
      } catch {
        // Silencioso
      }
    }, 250)
  }, [isProcessing, scannedCode, handleScan])

  // Função para iniciar a câmera (otimizada para iOS)
  const startCamera = useCallback(async () => {
    setCameraState('requesting')
    setError(null)

    // Parar qualquer stream anterior
    stopCamera()

    // Pequeno delay para iOS processar
    await new Promise(resolve => setTimeout(resolve, 100))

    try {
      // Constraints otimizadas para iOS Safari
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          // iOS funciona melhor com resoluções específicas
          width: isIOS ? { ideal: 1280, max: 1920 } : { ideal: 1280 },
          height: isIOS ? { ideal: 720, max: 1080 } : { ideal: 720 },
        },
      }

      console.log('📸 Solicitando câmera...', { facingMode, isIOS })

      // Timeout para evitar travamento no iOS
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao acessar câmera')), 15000)
      })

      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia(constraints),
        timeoutPromise,
      ])

      console.log('✅ Stream obtido:', stream.getVideoTracks()[0]?.label)

      streamRef.current = stream

      // Verificar se torch está disponível
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        try {
          const capabilities = videoTrack.getCapabilities?.()
          setTorchAvailable(!!(capabilities as { torch?: boolean })?.torch)
        } catch {
          setTorchAvailable(false)
        }
      }

      // Configurar video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream

        // iOS requer que o play seja chamado após srcObject
        const playVideo = async () => {
          try {
            await videoRef.current?.play()
            console.log('▶️ Video playing')
            return true
          } catch (playError) {
            console.warn('Play error:', playError)
            return false
          }
        }

        // Tentar play várias vezes para iOS
        let playSuccess = await playVideo()
        if (!playSuccess && isIOS) {
          await new Promise(resolve => setTimeout(resolve, 200))
          playSuccess = await playVideo()
        }
        if (!playSuccess && isIOS) {
          await new Promise(resolve => setTimeout(resolve, 500))
          await playVideo()
        }

        // Aguardar video estar pronto
        await new Promise<void>(resolve => {
          const video = videoRef.current
          if (!video) return resolve()

          if (video.readyState >= 2) {
            resolve()
          } else {
            const handleCanPlay = () => {
              video.removeEventListener('canplay', handleCanPlay)
              video.removeEventListener('loadedmetadata', handleCanPlay)
              resolve()
            }
            video.addEventListener('canplay', handleCanPlay)
            video.addEventListener('loadedmetadata', handleCanPlay)

            // Timeout de segurança
            setTimeout(resolve, 5000)
          }
        })

        setCameraState('active')

        // Pequeno delay antes de iniciar scanning
        setTimeout(() => {
          startScanning()
        }, 500)
      }
    } catch (err) {
      console.error('❌ Erro ao acessar câmera:', err)

      let errorMessage = 'Não foi possível acessar a câmera.'

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Permissão de câmera negada. Verifique as configurações do navegador.'
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'Nenhuma câmera encontrada no dispositivo.'
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'A câmera está sendo usada por outro aplicativo.'
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Configurações de câmera não suportadas. Tente trocar a câmera.'
        } else if (err.message === 'Timeout ao acessar câmera') {
          errorMessage = 'A câmera demorou muito para responder. Tente novamente.'
        }
      }

      setError(errorMessage)
      setCameraState('error')
    }
  }, [facingMode, isIOS, stopCamera, startScanning])

  // Iniciar câmera quando abrir
  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen, facingMode, startCamera, stopCamera])

  // Alternar câmera frontal/traseira
  const toggleCamera = useCallback(() => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'))
    setRetryCount(0)
  }, [])

  // Alternar flash
  const toggleTorch = useCallback(async () => {
    if (!torchAvailable || !streamRef.current) return

    const videoTrack = streamRef.current.getVideoTracks()[0]
    if (!videoTrack) return

    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: !torchOn } as MediaTrackConstraintSet],
      })
      setTorchOn(!torchOn)
    } catch (err) {
      console.error('Erro ao alternar flash:', err)
    }
  }, [torchAvailable, torchOn])

  // Tentar novamente
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1)
    startCamera()
  }, [startCamera])

  // Fechar scanner
  const handleClose = useCallback(() => {
    stopCamera()
    setScannedCode(null)
    setIsProcessing(false)
    setError(null)
    setRetryCount(0)
    onClose()
  }, [stopCamera, onClose])

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 bg-black'>
      {/* Header */}
      <div className='absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4'>
        <div className='flex items-center justify-between pt-safe'>
          <button
            onClick={handleClose}
            className='flex items-center gap-2 text-white hover:text-gray-300 transition-colors'
          >
            <X className='w-6 h-6' />
            <span className='text-sm font-medium'>Fechar</span>
          </button>

          <div className='flex items-center gap-3'>
            {/* Botão Flash */}
            {torchAvailable && (
              <button
                onClick={toggleTorch}
                title='Ligar/Desligar Flash'
                aria-label='Ligar ou desligar flash'
                className={`p-2 rounded-full transition-colors ${
                  torchOn ? 'bg-yellow-500 text-black' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Flashlight className='w-5 h-5' />
              </button>
            )}

            {/* Botão Trocar Câmera */}
            <button
              onClick={toggleCamera}
              title='Trocar Câmera'
              aria-label='Trocar entre câmera frontal e traseira'
              className='p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors'
            >
              <SwitchCamera className='w-5 h-5' />
            </button>
          </div>
        </div>
      </div>

      {/* Área do Scanner */}
      <div className='relative w-full h-full flex items-center justify-center'>
        {/* Video element - sempre presente para iOS */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${cameraState !== 'active' ? 'hidden' : ''}`}
          playsInline
          muted
          autoPlay
          webkit-playsinline='true'
        />

        {/* Estado: Erro */}
        {cameraState === 'error' && (
          <div className='flex flex-col items-center justify-center p-8 text-center'>
            <CameraOff className='w-16 h-16 text-red-500 mb-4' />
            <h3 className='text-xl font-semibold text-white mb-2'>Câmera não disponível</h3>
            <p className='text-gray-400 mb-4 max-w-xs'>{error}</p>
            <div className='flex gap-3'>
              <button
                onClick={handleRetry}
                className='flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors'
              >
                <RefreshCw className='w-4 h-4' />
                Tentar novamente
              </button>
              <button
                onClick={toggleCamera}
                className='flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors'
              >
                <SwitchCamera className='w-4 h-4' />
                Trocar câmera
              </button>
            </div>
            {isIOS && (
              <p className='text-amber-400 text-sm mt-4'>
                💡 Dica iOS: Tente trocar para câmera frontal e depois voltar para traseira
              </p>
            )}
            {retryCount > 0 && (
              <p className='text-gray-500 text-sm mt-2'>Tentativa {retryCount + 1}</p>
            )}
          </div>
        )}

        {/* Estado: Solicitando */}
        {cameraState === 'requesting' && (
          <div className='flex flex-col items-center justify-center'>
            <Loader2 className='w-12 h-12 text-violet-500 animate-spin mb-4' />
            <p className='text-gray-400'>Iniciando câmera...</p>
            {isIOS && (
              <p className='text-gray-500 text-sm mt-2 max-w-xs text-center'>
                No iOS, pode ser necessário permitir acesso à câmera nas configurações do Safari
              </p>
            )}
          </div>
        )}

        {/* Overlay com Guia de Scan - Apenas quando ativo */}
        {cameraState === 'active' && (
          <div className='absolute inset-0 pointer-events-none'>
            {/* Escurecimento das bordas */}
            <div className='absolute inset-0 bg-black/50' />

            {/* Área de scan transparente */}
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='relative w-[85%] max-w-md h-32'>
                {/* Cantos do quadro */}
                <div className='absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-violet-500 rounded-tl-lg' />
                <div className='absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-violet-500 rounded-tr-lg' />
                <div className='absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-violet-500 rounded-bl-lg' />
                <div className='absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-violet-500 rounded-br-lg' />

                {/* Área transparente */}
                <div
                  className='absolute inset-0 bg-transparent'
                  style={{
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                  }}
                />

                {/* Linha de scan animada */}
                {!scannedCode && (
                  <div className='absolute inset-x-0 top-1/2 -translate-y-1/2'>
                    <div className='h-0.5 bg-gradient-to-r from-transparent via-violet-500 to-transparent animate-pulse' />
                  </div>
                )}

                {/* Feedback de sucesso */}
                {scannedCode && (
                  <div className='absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-lg'>
                    <CheckCircle className='w-12 h-12 text-green-500 animate-bounce' />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer com Instruções */}
      <div className='absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-6 pb-safe'>
        <div className='text-center'>
          {scannedCode ? (
            <div className='flex flex-col items-center gap-2'>
              <CheckCircle className='w-8 h-8 text-green-500' />
              <p className='text-white font-medium'>Código detectado!</p>
              <p className='text-gray-400 text-sm font-mono'>{scannedCode.substring(0, 20)}...</p>
            </div>
          ) : cameraState === 'active' ? (
            <>
              <div className='flex items-center justify-center gap-2 mb-2'>
                <ScanLine className='w-5 h-5 text-violet-400' />
                <p className='text-white font-medium'>Aponte para o código de barras</p>
              </div>
              <p className='text-gray-400 text-sm'>
                Posicione o código de barras do boleto dentro da área destacada
              </p>
            </>
          ) : null}
        </div>

        {/* Dica de formato */}
        {cameraState === 'active' && (
          <div className='mt-4 flex items-center justify-center gap-2 text-xs text-gray-500'>
            <AlertCircle className='w-4 h-4' />
            <span>Formatos suportados: Boleto bancário, contas de consumo</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default BarcodeScanner
