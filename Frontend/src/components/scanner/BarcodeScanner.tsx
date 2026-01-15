/**
 * BarcodeScanner - Scanner Universal de Código de Barras
 * =======================================================
 *
 * Versão otimizada para funcionar em:
 * - iOS Safari (PWA e navegador)
 * - Android Chrome
 * - Desktop (Chrome, Firefox, Safari)
 *
 * Usa html5-qrcode com fallbacks e tratamento especial para iOS.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  Camera,
  CameraOff,
  AlertCircle,
  CheckCircle,
  Loader2,
  ScanLine,
  RefreshCw,
  Keyboard,
} from 'lucide-react'

interface BarcodeScannerProps {
  readonly onScan: (barcode: string) => void
  readonly onClose: () => void
  readonly isOpen: boolean
}

type ScannerStatus = 'idle' | 'loading' | 'active' | 'success' | 'error' | 'manual'

// Detecta iOS
const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent))
  )
}

// Detecta se é PWA
const isPWA = (): boolean => {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scannerRef = useRef<unknown>(null)
  const animationRef = useRef<number>(0)

  const [status, setStatus] = useState<ScannerStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [scannedCode, setScannedCode] = useState('')
  const [manualCode, setManualCode] = useState('')
  const hasScanned = useRef(false)

  // Para o stream de vídeo
  const stopStream = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = 0
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    scannerRef.current = null
  }, [])

  // Processa código escaneado
  const handleCodeDetected = useCallback(
    (code: string) => {
      if (hasScanned.current) return

      const cleanCode = code.replace(/\D/g, '')

      // Valida se é um código de boleto (44-48 dígitos)
      if (cleanCode.length >= 44 && cleanCode.length <= 48) {
        hasScanned.current = true
        setScannedCode(cleanCode)
        setStatus('success')

        // Feedback tátil
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100])
        }

        console.log('✅ Código detectado:', cleanCode.substring(0, 20) + '...')

        // Fecha e envia após feedback visual
        setTimeout(() => {
          stopStream()
          onScan(cleanCode)
        }, 1200)
      }
    },
    [onScan, stopStream]
  )

  // Inicia a câmera
  const startCamera = useCallback(async () => {
    setStatus('loading')
    setErrorMsg('')
    hasScanned.current = false

    // Flag para verificar se ainda está montado
    let isMounted = true

    try {
      // Configurações otimizadas para cada plataforma
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
        audio: false,
      }

      // iOS Safari precisa de tratamento especial
      if (isIOS()) {
        ;(constraints.video as MediaTrackConstraints).facingMode = { exact: 'environment' }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      // Verifica se componente ainda está montado
      if (!isMounted || !videoRef.current) {
        stream.getTracks().forEach(track => track.stop())
        return
      }

      streamRef.current = stream
      videoRef.current.srcObject = stream
      videoRef.current.setAttribute('playsinline', 'true') // Importante para iOS
      videoRef.current.setAttribute('autoplay', 'true')
      videoRef.current.muted = true

      try {
        await videoRef.current.play()
      } catch (playError) {
        // Ignora AbortError - acontece quando componente é desmontado
        if (playError instanceof Error && playError.name === 'AbortError') {
          console.log('⚠️ Play interrompido - componente desmontado')
          return
        }
        throw playError
      }

      // Verifica novamente se ainda está montado após o play
      if (!isMounted || !videoRef.current) {
        return
      }

      // Aguarda o vídeo estar pronto
      await new Promise<void>(resolve => {
        if (videoRef.current) {
          if (videoRef.current.readyState >= 2) {
            resolve()
          } else {
            videoRef.current.onloadeddata = () => resolve()
          }
        } else {
          resolve()
        }
      })

      if (!isMounted) return

      // Debug - verificar se vídeo tem dimensões
      console.log(
        '📹 Video dimensions:',
        videoRef.current?.videoWidth,
        'x',
        videoRef.current?.videoHeight
      )
      console.log('📹 Video readyState:', videoRef.current?.readyState)

      setStatus('active')
      console.log('✅ Câmera iniciada com sucesso')

      // Inicia detecção de código de barras
      startBarcodeDetection()
    } catch (err) {
      // Ignora erros se componente foi desmontado
      if (!isMounted) return

      console.error('❌ Erro ao acessar câmera:', err)

      let msg = 'Não foi possível acessar a câmera.'

      if (err instanceof Error) {
        const errorName = err.name || ''
        const errorMessage = err.message || ''

        // Ignora AbortError
        if (errorName === 'AbortError') {
          return
        }

        if (errorName === 'NotAllowedError' || errorMessage.includes('Permission')) {
          msg = isIOS()
            ? 'Permissão negada. Vá em Ajustes > Safari > Câmera e permita o acesso.'
            : 'Permissão de câmera negada. Clique no ícone de câmera na barra de endereço.'
        } else if (errorName === 'NotFoundError' || errorMessage.includes('not found')) {
          msg = 'Nenhuma câmera encontrada neste dispositivo.'
        } else if (errorName === 'NotReadableError' || errorMessage.includes('in use')) {
          msg = 'A câmera está sendo usada por outro aplicativo.'
        } else if (errorName === 'OverconstrainedError') {
          // Tenta novamente sem restricoes estritas
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            })
            streamRef.current = fallbackStream
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream
              await videoRef.current.play()
              setStatus('active')
              startBarcodeDetection()
              return
            }
          } catch {
            msg = 'Configurações de câmera não suportadas.'
          }
        }
      }

      setErrorMsg(msg)
      setStatus('error')
    }
  }, [])

  // Detecção de código de barras usando BarcodeDetector API (nativa) ou fallback
  const startBarcodeDetection = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    // Tenta usar BarcodeDetector API nativa (Chrome, Safari 16.4+)
    const BarcodeDetectorAPI = (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector

    if (BarcodeDetectorAPI) {
      try {
        const detector = new (BarcodeDetectorAPI as new (options: { formats: string[] }) => {
          detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>
        })({
          formats: ['itf', 'code_128', 'code_39', 'ean_13', 'qr_code'],
        })

        scannerRef.current = detector

        const detectFrame = async () => {
          if (!video || video.paused || video.ended || hasScanned.current) return

          try {
            const codes = await detector.detect(video)
            if (codes.length > 0) {
              handleCodeDetected(codes[0].rawValue)
              return
            }
          } catch {
            // Ignora erros de detecção individuais
          }

          animationRef.current = requestAnimationFrame(detectFrame)
        }

        detectFrame()
        console.log('📷 Usando BarcodeDetector API nativa')
        return
      } catch {
        console.log('⚠️ BarcodeDetector não disponível, usando fallback')
      }
    }

    // Fallback: usa html5-qrcode para decodificação
    try {
      const { Html5Qrcode } = await import('html5-qrcode')

      // Cria elemento temporário para o scanner
      const scannerId = 'barcode-scanner-fallback'
      let scannerDiv = document.getElementById(scannerId)

      if (!scannerDiv) {
        scannerDiv = document.createElement('div')
        scannerDiv.id = scannerId
        scannerDiv.style.display = 'none'
        document.body.appendChild(scannerDiv)
      }

      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      const detectFrame = () => {
        if (!video || video.paused || video.ended || hasScanned.current) return

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // A cada 200ms tenta decodificar
        animationRef.current = requestAnimationFrame(detectFrame)
      }

      // Usa o html5-qrcode para escanear da câmera diretamente
      const html5Scanner = new Html5Qrcode(scannerId)
      scannerRef.current = html5Scanner

      await html5Scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 280, height: 120 },
          aspectRatio: 16 / 9,
        },
        decodedText => {
          handleCodeDetected(decodedText)
        },
        () => {} // ignora erros de frame
      )

      console.log('📷 Usando html5-qrcode fallback')
    } catch (err) {
      console.error('Erro ao iniciar detecção:', err)
      // Continua mesmo sem detecção automática - usuário pode digitar manualmente
    }
  }, [handleCodeDetected])

  // Limpa recursos ao fechar
  useEffect(() => {
    if (!isOpen) {
      stopStream()
      setStatus('idle')
      setScannedCode('')
      setManualCode('')
      setErrorMsg('')
      hasScanned.current = false
    }
  }, [isOpen, stopStream])

  // Inicia câmera quando abre
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    if (isOpen && status === 'idle') {
      // Pequeno delay para garantir que o modal está renderizado
      timer = setTimeout(() => {
        startCamera()
      }, 300)
    }

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [isOpen, status, startCamera])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      stopStream()
    }
  }, [stopStream])

  // Handler para entrada manual
  const handleManualSubmit = () => {
    const cleanCode = manualCode.replace(/\D/g, '')
    if (cleanCode.length >= 44 && cleanCode.length <= 48) {
      handleCodeDetected(cleanCode)
    } else {
      setErrorMsg('Código inválido. Digite os 47 dígitos do boleto.')
    }
  }

  // Fecha o scanner
  const handleClose = () => {
    stopStream()
    setStatus('idle')
    onClose()
  }

  // Retry
  const handleRetry = () => {
    stopStream()
    setStatus('idle')
    setErrorMsg('')
    hasScanned.current = false
    setTimeout(() => startCamera(), 100)
  }

  // Alterna para modo manual
  const toggleManualMode = () => {
    if (status === 'manual') {
      setStatus('idle')
      setTimeout(() => startCamera(), 100)
    } else {
      stopStream()
      setStatus('manual')
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 bg-black flex flex-col'>
      {/* Header */}
      <div className='flex-shrink-0 flex items-center justify-between p-4 bg-gradient-to-b from-black to-transparent z-20'>
        <button
          onClick={handleClose}
          className='flex items-center gap-2 text-white p-2 rounded-lg active:bg-white/10'
        >
          <X className='w-6 h-6' />
          <span className='font-medium'>Fechar</span>
        </button>

        <button
          onClick={toggleManualMode}
          className='flex items-center gap-2 text-white p-2 rounded-lg active:bg-white/10'
        >
          {status === 'manual' ? (
            <>
              <Camera className='w-5 h-5' />
              <span className='text-sm'>Câmera</span>
            </>
          ) : (
            <>
              <Keyboard className='w-5 h-5' />
              <span className='text-sm'>Digitar</span>
            </>
          )}
        </button>
      </div>

      {/* Área principal */}
      <div className='flex-1 relative flex items-center justify-center overflow-hidden'>
        {/* Vídeo da câmera - z-index 5 para ficar ACIMA do overlay escuro */}
        <video
          ref={videoRef}
          className='absolute inset-0 w-full h-full object-cover'
          style={{
            zIndex: 5,
            opacity: status === 'active' || status === 'success' ? 1 : 0,
            pointerEvents: status === 'active' ? 'auto' : 'none',
          }}
          playsInline
          autoPlay
          muted
        />

        {/* Canvas para processamento (invisível) */}
        <canvas ref={canvasRef} className='hidden' />

        {/* Loading */}
        {status === 'loading' && (
          <div className='absolute inset-0 flex flex-col items-center justify-center bg-black z-10'>
            <Loader2 className='w-14 h-14 text-violet-500 animate-spin mb-4' />
            <p className='text-white text-lg font-medium'>Iniciando câmera...</p>
            <p className='text-gray-400 text-sm mt-2'>
              {isIOS() ? 'Permita o acesso quando solicitado' : 'Aguarde um momento'}
            </p>
          </div>
        )}

        {/* Erro */}
        {status === 'error' && (
          <div className='absolute inset-0 flex flex-col items-center justify-center bg-black p-8 z-10'>
            <CameraOff className='w-20 h-20 text-red-500 mb-6' />
            <h3 className='text-2xl font-bold text-white mb-3'>Câmera indisponível</h3>
            <p className='text-gray-400 mb-8 text-center max-w-sm'>{errorMsg}</p>

            <div className='flex flex-col gap-3 w-full max-w-xs'>
              <button
                onClick={handleRetry}
                className='flex items-center justify-center gap-2 w-full py-4 bg-violet-600 text-white rounded-xl font-medium active:bg-violet-700'
              >
                <RefreshCw className='w-5 h-5' />
                Tentar novamente
              </button>

              <button
                onClick={toggleManualMode}
                className='flex items-center justify-center gap-2 w-full py-4 bg-gray-700 text-white rounded-xl font-medium active:bg-gray-600'
              >
                <Keyboard className='w-5 h-5' />
                Digitar código manualmente
              </button>
            </div>

            {isIOS() && isPWA() && (
              <p className='text-amber-400 text-sm mt-8 text-center max-w-sm'>
                No iOS, vá em Ajustes → Safari → Câmera e verifique as permissões
              </p>
            )}
          </div>
        )}

        {/* Modo manual */}
        {status === 'manual' && (
          <div className='absolute inset-0 flex flex-col items-center justify-center bg-black p-8 z-10'>
            <Keyboard className='w-16 h-16 text-violet-500 mb-6' />
            <h3 className='text-xl font-bold text-white mb-2'>Digite o código</h3>
            <p className='text-gray-400 mb-6 text-center'>
              Insira os 47 números da linha digitável
            </p>

            <input
              type='text'
              inputMode='numeric'
              value={manualCode}
              onChange={e => setManualCode(e.target.value.replace(/\D/g, ''))}
              placeholder='00000.00000 00000.000000 00000.000000 0 00000000000000'
              className='w-full max-w-md px-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white text-center font-mono text-lg placeholder:text-gray-600 focus:outline-none focus:border-violet-500'
              maxLength={48}
              autoFocus
            />

            <p className='text-gray-500 text-sm mt-3 mb-6'>{manualCode.length}/47 dígitos</p>

            {errorMsg && <p className='text-red-400 text-sm mb-4'>{errorMsg}</p>}

            <button
              onClick={handleManualSubmit}
              disabled={manualCode.length < 44}
              className='w-full max-w-md py-4 bg-violet-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed active:bg-violet-700'
            >
              Validar código
            </button>
          </div>
        )}

        {/* Sucesso */}
        {status === 'success' && (
          <div className='absolute inset-0 flex items-center justify-center bg-black/90 z-30'>
            <div className='flex flex-col items-center gap-6 p-10 bg-green-500/10 rounded-3xl border-2 border-green-500'>
              <CheckCircle className='w-24 h-24 text-green-500 animate-bounce' />
              <p className='text-green-400 font-bold text-2xl'>Código lido!</p>
              <p className='text-gray-400 text-sm font-mono bg-black/50 px-4 py-2 rounded-lg'>
                {scannedCode.substring(0, 25)}...
              </p>
            </div>
          </div>
        )}

        {/* Overlay com guia de scan - usa 4 divs para criar a área escurecida sem cobrir o centro */}
        {status === 'active' && (
          <>
            {/* Top dark area */}
            <div
              className='absolute top-0 left-0 right-0 bg-black/50 pointer-events-none'
              style={{ zIndex: 10, height: 'calc(50% - 64px)' }}
            />
            {/* Bottom dark area */}
            <div
              className='absolute bottom-0 left-0 right-0 bg-black/50 pointer-events-none'
              style={{ zIndex: 10, height: 'calc(50% - 64px)' }}
            />
            {/* Left dark area */}
            <div
              className='absolute left-0 bg-black/50 pointer-events-none'
              style={{
                zIndex: 10,
                top: 'calc(50% - 64px)',
                height: '128px',
                width: 'calc(50% - 160px)',
              }}
            />
            {/* Right dark area */}
            <div
              className='absolute right-0 bg-black/50 pointer-events-none'
              style={{
                zIndex: 10,
                top: 'calc(50% - 64px)',
                height: '128px',
                width: 'calc(50% - 160px)',
              }}
            />

            {/* Moldura de scan */}
            <div
              className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-32 pointer-events-none'
              style={{ zIndex: 15 }}
            >
              {/* Cantos */}
              <div className='absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-violet-500 rounded-tl-2xl' />
              <div className='absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-violet-500 rounded-tr-2xl' />
              <div className='absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-violet-500 rounded-bl-2xl' />
              <div className='absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-violet-500 rounded-br-2xl' />

              {/* Linha de scan animada */}
              <div className='absolute inset-x-2 top-0 h-full overflow-hidden'>
                <div
                  className='absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent rounded-full animate-pulse'
                  style={{
                    animation: 'scanline 2s ease-in-out infinite',
                    top: '50%',
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className='flex-shrink-0 p-6 bg-gradient-to-t from-black to-transparent z-20'>
        {status === 'active' && (
          <div className='text-center'>
            <div className='flex items-center justify-center gap-2 mb-2'>
              <ScanLine className='w-5 h-5 text-violet-400' />
              <p className='text-white font-semibold'>Aponte para o código de barras</p>
            </div>
            <p className='text-gray-400 text-sm'>Posicione o código dentro da área destacada</p>
            <div className='mt-4 flex items-center justify-center gap-2 text-xs text-gray-500'>
              <AlertCircle className='w-4 h-4' />
              <span>Boletos, contas de consumo e PIX</span>
            </div>
          </div>
        )}
      </div>

      {/* CSS para animação da linha de scan */}
      <style>{`
        @keyframes scanline {
          0%, 100% { transform: translateY(-50%); opacity: 0.5; }
          50% { transform: translateY(0%); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default BarcodeScanner
