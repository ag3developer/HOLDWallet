import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { X, Camera, CheckCircle, AlertCircle } from 'lucide-react'

interface QRCodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (address: string) => void
}

// ID fixo para evitar problemas de sincronização com o DOM
const SCANNER_ELEMENT_ID = 'qr-scanner-container'

export const QRCodeScanner = ({ isOpen, onClose, onScan }: QRCodeScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scannedAddress, setScannedAddress] = useState<string | null>(null)
  const [domReady, setDomReady] = useState(false)
  const isMountedRef = useRef(true)
  const isStoppingRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  /**
   * Para o scanner de forma segura, verificando o estado antes
   */
  const stopScanner = useCallback(async (): Promise<void> => {
    if (isStoppingRef.current) {
      return
    }

    const scanner = scannerRef.current
    if (!scanner) {
      return
    }

    try {
      isStoppingRef.current = true

      // Verificar se o scanner está realmente rodando
      const state = scanner.getState()
      if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
        await scanner.stop()
      }

      // Limpar o scanner (remover elementos do DOM)
      try {
        scanner.clear()
      } catch {
        // Ignorar erro de clear - elementos podem já ter sido removidos
      }
    } catch (err) {
      // Ignorar erros de stop - provavelmente já está parado ou DOM foi limpo
      console.debug('[QRCodeScanner] Stop silenciado:', err)
    } finally {
      isStoppingRef.current = false
      scannerRef.current = null
      if (isMountedRef.current) {
        setIsScanning(false)
      }
    }
  }, [])

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setError(null)
      setScannedAddress(null)
      setDomReady(false)
      stopScanner()
    }
  }, [isOpen, stopScanner])

  // Notify when DOM element is ready
  useEffect(() => {
    if (!isOpen || scannedAddress || error) {
      return undefined
    }

    // Use requestAnimationFrame to ensure DOM is painted
    const frameId = requestAnimationFrame(() => {
      const checkElement = () => {
        const element = document.getElementById(SCANNER_ELEMENT_ID)
        if (element) {
          setDomReady(true)
        } else {
          // Retry after a short delay
          setTimeout(checkElement, 50)
        }
      }
      checkElement()
    })

    return () => cancelAnimationFrame(frameId)
  }, [isOpen, scannedAddress, error])

  // Handle successful scan
  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      if (!isMountedRef.current) return

      console.log('[QRCodeScanner] QR Code detectado:', decodedText)
      setScannedAddress(decodedText)
      setIsScanning(false)

      await stopScanner()

      if (isMountedRef.current) {
        onScan(decodedText)
        setTimeout(() => {
          if (isMountedRef.current) {
            onClose()
          }
        }, 1500)
      }
    },
    [stopScanner, onScan, onClose]
  )

  // Start scanner when DOM is ready
  useEffect(() => {
    if (!domReady || !isOpen || scannedAddress || error) return

    const startScanner = async () => {
      // Garantir que scanner anterior foi parado
      await stopScanner()

      if (!isMountedRef.current || !isOpen) return

      const element = document.getElementById(SCANNER_ELEMENT_ID)
      if (!element) {
        console.error('[QRCodeScanner] Elemento não encontrado após domReady')
        setError('Elemento scanner não encontrado. Tente novamente.')
        return
      }

      try {
        console.log('[QRCodeScanner] Iniciando scanner...')
        const html5QrCode = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false })
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          handleScanSuccess,
          () => {
            // Erro ao escanear (normal durante o processo)
          }
        )

        if (isMountedRef.current) {
          setIsScanning(true)
          setError(null)
          console.log('[QRCodeScanner] Scanner iniciado com sucesso')
        }
      } catch (err) {
        console.error('[QRCodeScanner] Erro ao iniciar:', err)
        if (isMountedRef.current) {
          setError('Não foi possível acessar a câmera. Verifique as permissões.')
          setIsScanning(false)
        }
      }
    }

    startScanner()

    return () => {
      stopScanner()
    }
  }, [domReady, isOpen, scannedAddress, error, handleScanSuccess, stopScanner])

  if (!isOpen) return null

  // Renderizar conteúdo baseado no estado
  const renderContent = () => {
    if (error) {
      return (
        <div className='text-center py-12'>
          <AlertCircle className='w-16 h-16 text-red-500 mx-auto mb-4' />
          <p className='text-red-600 dark:text-red-400 mb-4'>{error}</p>
          <button
            onClick={onClose}
            className='px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors'
          >
            Fechar
          </button>
        </div>
      )
    }

    if (scannedAddress) {
      return (
        <div className='text-center py-12'>
          <CheckCircle className='w-16 h-16 text-green-500 mx-auto mb-4 animate-pulse' />
          <p className='text-lg font-semibold text-green-600 dark:text-green-400 mb-2'>
            Endereço Escaneado!
          </p>
          <p className='text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-900 rounded-lg p-3 break-all'>
            {scannedAddress}
          </p>
        </div>
      )
    }

    return (
      <div>
        <div
          id={SCANNER_ELEMENT_ID}
          className='rounded-lg overflow-hidden border-4 border-blue-500 min-h-[300px]'
        />
        {isScanning && (
          <div className='mt-4 text-center'>
            <div className='inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
              <div className='w-2 h-2 bg-blue-500 rounded-full animate-pulse' />
              <p className='text-sm text-blue-600 dark:text-blue-400 font-medium'>
                Procurando QR Code...
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4'>
      <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full animate-in fade-in zoom-in duration-200'>
        {/* Header */}
        <div className='bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-2xl p-6'>
          <div className='flex items-center justify-between text-white'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center'>
                <Camera className='w-6 h-6' />
              </div>
              <div>
                <h3 className='text-xl font-bold'>Escanear QR Code</h3>
                <p className='text-sm text-blue-100'>Aponte para o QR Code da carteira</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className='p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors'
              aria-label='Fechar scanner'
            >
              <X className='w-6 h-6' />
            </button>
          </div>
        </div>

        {/* Scanner Area */}
        <div className='p-6'>
          {renderContent()}

          {/* Instruções */}
          {!error && !scannedAddress && (
            <div className='mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4'>
              <p className='text-xs text-gray-600 dark:text-gray-400 text-center'>
                <strong>Dica:</strong> Posicione o QR Code dentro do quadrado azul para escanear
                automaticamente
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
