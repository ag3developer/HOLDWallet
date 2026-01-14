/**
 * BarcodeScanner - Scanner de Código de Barras (iOS Safari PWA Optimizado)
 * ========================================================================
 *
 * Usa html5-qrcode que é muito mais estável em Safari iOS e PWA.
 * A câmera permanece aberta até leitura bem-sucedida ou fechamento manual.
 *
 * Formatos suportados:
 * - ITF (Interleaved 2 of 5) - Usado em boletos bancários
 * - CODE_128, CODE_39, CODABAR
 * - EAN_13, EAN_8, UPC_A
 * - QR_CODE (para PIX)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
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
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

interface BarcodeScannerProps {
  readonly onScan: (barcode: string) => void
  readonly onClose: () => void
  readonly isOpen: boolean
}

type CameraState = 'idle' | 'requesting' | 'active' | 'error'

// ID único para o container do scanner
const SCANNER_CONTAINER_ID = 'barcode-scanner-container'

export function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInitializingRef = useRef(false)
  const hasScannedRef = useRef(false)

  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [scannedCode, setScannedCode] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [torchOn, setTorchOn] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0)

  // Detectar iOS
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  // Formatos de código de barras suportados
  const supportedFormats = [
    Html5QrcodeSupportedFormats.ITF,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.CODABAR,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.QR_CODE,
  ]

  // Parar scanner de forma segura
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState()
        if (state === 2) {
          // SCANNING
          await scannerRef.current.stop()
        }
      } catch (err) {
        console.warn('Erro ao parar scanner:', err)
      }

      try {
        scannerRef.current.clear()
      } catch {
        // Ignorar erro de clear
      }

      scannerRef.current = null
    }

    setCameraState('idle')
    hasScannedRef.current = false
  }, [])

  // Processar código escaneado
  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      // Evitar múltiplas leituras
      if (hasScannedRef.current) return

      // Validar se parece um código de boleto (44-48 dígitos numéricos)
      const cleanCode = decodedText.replaceAll(/\D/g, '')

      if (cleanCode.length >= 44 && cleanCode.length <= 48) {
        hasScannedRef.current = true
        setScannedCode(cleanCode)

        // Vibrar para feedback tátil
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100])
        }

        console.log('✅ Código detectado:', cleanCode.substring(0, 20) + '...')

        // Delay para mostrar feedback visual antes de fechar
        setTimeout(async () => {
          await stopScanner()
          onScan(cleanCode)
          setScannedCode(null)
        }, 1500)
      }
    },
    [onScan, stopScanner]
  )

  // Iniciar scanner
  const startScanner = useCallback(async () => {
    if (isInitializingRef.current || !containerRef.current) return

    isInitializingRef.current = true
    setCameraState('requesting')
    setError(null)
    hasScannedRef.current = false

    // Parar scanner anterior se existir
    await stopScanner()

    // Pequeno delay para garantir que o DOM está pronto
    await new Promise(resolve => setTimeout(resolve, 100))

    try {
      // Listar câmeras disponíveis
      const devices = await Html5Qrcode.getCameras()

      if (!devices || devices.length === 0) {
        throw new Error('Nenhuma câmera encontrada')
      }

      setCameras(devices)
      console.log(
        '📷 Câmeras disponíveis:',
        devices.map(d => d.label)
      )

      // Selecionar câmera (preferir traseira)
      let selectedCamera = devices[0]

      if (facingMode === 'environment') {
        // Procurar câmera traseira
        const backCamera = devices.find(
          d =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('traseira') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
        )
        if (backCamera) selectedCamera = backCamera
      } else {
        // Procurar câmera frontal
        const frontCamera = devices.find(
          d =>
            d.label.toLowerCase().includes('front') ||
            d.label.toLowerCase().includes('frontal') ||
            d.label.toLowerCase().includes('user')
        )
        if (frontCamera) selectedCamera = frontCamera
      }

      // Se temos índice manual, usar
      if (currentCameraIndex < devices.length) {
        selectedCamera = devices[currentCameraIndex]
      }

      if (!selectedCamera) {
        throw new Error('Nenhuma câmera selecionada')
      }

      console.log('📸 Usando câmera:', selectedCamera.label)

      // Criar instância do scanner
      scannerRef.current = new Html5Qrcode(SCANNER_CONTAINER_ID, {
        formatsToSupport: supportedFormats,
        verbose: false,
      })

      // Configuração otimizada para iOS Safari
      const config = {
        fps: 10, // Frames por segundo
        qrbox: { width: 300, height: 150 }, // Área de scan retangular para boletos
        aspectRatio: isIOS ? 1.777778 : undefined, // 16:9 para iOS
        disableFlip: false,
        // Configurações experimentais para melhor compatibilidade
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true, // Usar API nativa se disponível
        },
      }

      await scannerRef.current.start(selectedCamera.id, config, handleScanSuccess, () => {
        // Callback de erro de scan (silencioso - normal não achar código em cada frame)
      })

      // Verificar se torch está disponível
      try {
        const capabilities = scannerRef.current.getRunningTrackCameraCapabilities()
        const torchFeature = capabilities.torchFeature()
        setTorchAvailable(torchFeature?.isSupported() ?? false)
      } catch {
        setTorchAvailable(false)
      }

      setCameraState('active')
      console.log('✅ Scanner iniciado com sucesso')
    } catch (err) {
      console.error('❌ Erro ao iniciar scanner:', err)

      let errorMessage = 'Não foi possível acessar a câmera.'

      if (err instanceof Error) {
        if (err.message.includes('Permission') || err.message.includes('NotAllowed')) {
          errorMessage = 'Permissão de câmera negada. Verifique as configurações do navegador.'
        } else if (err.message.includes('NotFound') || err.message.includes('Nenhuma câmera')) {
          errorMessage = 'Nenhuma câmera encontrada no dispositivo.'
        } else if (err.message.includes('NotReadable') || err.message.includes('in use')) {
          errorMessage = 'A câmera está sendo usada por outro aplicativo.'
        } else if (err.message.includes('Overconstrained')) {
          errorMessage = 'Configurações de câmera não suportadas.'
        }
      }

      setError(errorMessage)
      setCameraState('error')
    } finally {
      isInitializingRef.current = false
    }
  }, [facingMode, currentCameraIndex, isIOS, supportedFormats, handleScanSuccess, stopScanner])

  // Controlar viewport para comportamento de app nativo
  useEffect(() => {
    if (!isOpen) return

    const viewportMeta = document.querySelector('meta[name="viewport"]')
    const originalContent = viewportMeta?.getAttribute('content') || ''

    if (viewportMeta) {
      viewportMeta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      )
    }

    // Prevenir scroll do body
    const originalOverflow = document.body.style.overflow
    const originalPosition = document.body.style.position
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'

    return () => {
      if (viewportMeta && originalContent) {
        viewportMeta.setAttribute('content', originalContent)
      }
      document.body.style.overflow = originalOverflow
      document.body.style.position = originalPosition
      document.body.style.width = ''
    }
  }, [isOpen])

  // Iniciar/parar scanner quando modal abre/fecha
  useEffect(() => {
    if (isOpen) {
      // Delay para garantir que o container está no DOM
      const timer = setTimeout(() => {
        startScanner()
      }, 300)
      return () => clearTimeout(timer)
    } else {
      stopScanner()
      return undefined
    }
  }, [isOpen, startScanner, stopScanner])

  // Alternar câmera
  const toggleCamera = useCallback(async () => {
    await stopScanner()

    if (cameras.length > 1) {
      setCurrentCameraIndex(prev => (prev + 1) % cameras.length)
    }

    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'))
    setRetryCount(0)

    // Reiniciar após mudança
    setTimeout(() => {
      startScanner()
    }, 200)
  }, [cameras.length, stopScanner, startScanner])

  // Alternar flash
  const toggleTorch = useCallback(async () => {
    if (!torchAvailable || !scannerRef.current) return

    try {
      const capabilities = scannerRef.current.getRunningTrackCameraCapabilities()
      const torchFeature = capabilities.torchFeature()
      if (torchFeature?.isSupported()) {
        torchFeature.apply(!torchOn)
        setTorchOn(!torchOn)
      }
    } catch (err) {
      console.error('Erro ao alternar flash:', err)
    }
  }, [torchAvailable, torchOn])

  // Tentar novamente
  const handleRetry = useCallback(async () => {
    setRetryCount(prev => prev + 1)
    await stopScanner()
    setTimeout(() => {
      startScanner()
    }, 200)
  }, [stopScanner, startScanner])

  // Fechar scanner
  const handleClose = useCallback(async () => {
    await stopScanner()
    setScannedCode(null)
    setError(null)
    setRetryCount(0)
    onClose()
  }, [stopScanner, onClose])

  if (!isOpen) return null

  return (
    <div
      className='fixed inset-0 z-50 bg-black'
      style={{
        width: '100vw',
        height: '100dvh',
      }}
    >
      {/* Header */}
      <div className='absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/90 to-transparent p-4 pt-safe'>
        <div className='flex items-center justify-between'>
          <button
            onClick={handleClose}
            className='flex items-center gap-2 text-white hover:text-gray-300 transition-colors p-2'
          >
            <X className='w-6 h-6' />
            <span className='text-sm font-medium'>Fechar</span>
          </button>

          <div className='flex items-center gap-3'>
            {torchAvailable && (
              <button
                onClick={toggleTorch}
                aria-label='Ligar ou desligar flash'
                className={`p-3 rounded-full transition-colors ${
                  torchOn ? 'bg-yellow-500 text-black' : 'bg-white/20 text-white'
                }`}
              >
                <Flashlight className='w-5 h-5' />
              </button>
            )}

            <button
              onClick={toggleCamera}
              aria-label='Trocar câmera'
              className='p-3 rounded-full bg-white/20 text-white'
            >
              <SwitchCamera className='w-5 h-5' />
            </button>
          </div>
        </div>
      </div>

      {/* Área do Scanner */}
      <div className='relative w-full h-full flex items-center justify-center'>
        {/* Container do html5-qrcode - IMPORTANTE: deve ter este ID */}
        <div
          id={SCANNER_CONTAINER_ID}
          ref={containerRef}
          className='w-full h-full'
          style={{
            display: cameraState === 'active' ? 'block' : 'none',
          }}
        />

        {/* Estado: Erro */}
        {cameraState === 'error' && (
          <div className='absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black'>
            <CameraOff className='w-16 h-16 text-red-500 mb-4' />
            <h3 className='text-xl font-semibold text-white mb-2'>Câmera não disponível</h3>
            <p className='text-gray-400 mb-6 max-w-xs'>{error}</p>
            <div className='flex gap-3'>
              <button
                onClick={handleRetry}
                className='flex items-center gap-2 px-5 py-3 bg-violet-600 text-white rounded-xl'
              >
                <RefreshCw className='w-4 h-4' />
                Tentar novamente
              </button>
              <button
                onClick={toggleCamera}
                className='flex items-center gap-2 px-5 py-3 bg-gray-700 text-white rounded-xl'
              >
                <SwitchCamera className='w-4 h-4' />
                Trocar câmera
              </button>
            </div>
            {isIOS && (
              <p className='text-amber-400 text-sm mt-6'>
                💡 No iOS, vá em Ajustes → Safari → Câmera e permita acesso
              </p>
            )}
            {retryCount > 0 && (
              <p className='text-gray-500 text-sm mt-2'>Tentativa {retryCount + 1}</p>
            )}
          </div>
        )}

        {/* Estado: Carregando */}
        {cameraState === 'requesting' && (
          <div className='absolute inset-0 flex flex-col items-center justify-center bg-black'>
            <Loader2 className='w-12 h-12 text-violet-500 animate-spin mb-4' />
            <p className='text-gray-400'>Iniciando câmera...</p>
            {isIOS && (
              <p className='text-gray-500 text-sm mt-2 max-w-xs text-center'>
                Permita o acesso à câmera quando solicitado
              </p>
            )}
          </div>
        )}

        {/* Overlay com feedback de sucesso */}
        {scannedCode && (
          <div className='absolute inset-0 flex items-center justify-center bg-black/80 z-30'>
            <div className='flex flex-col items-center gap-4 p-8 bg-green-500/20 rounded-2xl border-2 border-green-500'>
              <CheckCircle className='w-20 h-20 text-green-500 animate-bounce' />
              <p className='text-green-400 font-bold text-xl'>Código lido!</p>
              <p className='text-gray-400 text-sm font-mono'>{scannedCode.substring(0, 25)}...</p>
            </div>
          </div>
        )}

        {/* Overlay com guia de scan */}
        {cameraState === 'active' && !scannedCode && (
          <div className='absolute inset-0 pointer-events-none z-10'>
            {/* Escurecimento */}
            <div className='absolute inset-0 bg-black/40' />

            {/* Área de scan */}
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='relative w-[85%] max-w-md h-36'>
                {/* Cantos */}
                <div className='absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-violet-500 rounded-tl-xl' />
                <div className='absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-violet-500 rounded-tr-xl' />
                <div className='absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-violet-500 rounded-bl-xl' />
                <div className='absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-violet-500 rounded-br-xl' />

                {/* Área transparente */}
                <div
                  className='absolute inset-0'
                  style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)' }}
                />

                {/* Linha animada */}
                <div className='absolute inset-x-0 top-1/2 -translate-y-1/2'>
                  <div className='h-0.5 bg-gradient-to-r from-transparent via-violet-500 to-transparent animate-pulse' />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className='absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 to-transparent p-6 pb-safe'>
        {cameraState === 'active' && !scannedCode && (
          <div className='text-center'>
            <div className='flex items-center justify-center gap-2 mb-2'>
              <ScanLine className='w-5 h-5 text-violet-400' />
              <p className='text-white font-medium'>Aponte para o código de barras</p>
            </div>
            <p className='text-gray-400 text-sm'>Posicione o código dentro da área destacada</p>
            <div className='mt-4 flex items-center justify-center gap-2 text-xs text-gray-500'>
              <AlertCircle className='w-4 h-4' />
              <span>Boletos, contas de consumo e PIX</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BarcodeScanner
