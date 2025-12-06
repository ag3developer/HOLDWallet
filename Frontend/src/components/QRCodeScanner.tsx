import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Camera, CheckCircle, AlertCircle } from 'lucide-react'

interface QRCodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (address: string) => void
}

export const QRCodeScanner = ({ isOpen, onClose, onScan }: QRCodeScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scannedAddress, setScannedAddress] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      // Limpar estado
      setError(null)
      setScannedAddress(null)
      
      // Parar scanner se estiver rodando
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop()
          .then(() => {
            if (isMountedRef.current) {
              setIsScanning(false)
              setIsInitialized(false)
            }
          })
          .catch((err) => {
            console.warn('Erro ao parar scanner:', err)
            if (isMountedRef.current) {
              setIsScanning(false)
              setIsInitialized(false)
            }
          })
          .finally(() => {
            scannerRef.current = null
          })
      } else {
        setIsScanning(false)
        setIsInitialized(false)
        scannerRef.current = null
      }
      return
    }

    const startScanner = async () => {
      // Aguardar o DOM estar pronto
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const element = document.getElementById('qr-reader')
      if (!element) {
        setError('Elemento scanner não encontrado')
        return
      }

      try {
        const html5QrCode = new Html5Qrcode('qr-reader')
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' }, // Câmera traseira
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText: string) => {
            // QR Code escaneado com sucesso
            if (!isMountedRef.current) return
            
            setScannedAddress(decodedText)
            setIsScanning(false)
            
            // Parar scanner
            if (scannerRef.current) {
              scannerRef.current.stop()
                .then(() => {
                  if (isMountedRef.current) {
                    onScan(decodedText)
                    setTimeout(() => {
                      onClose()
                    }, 1500)
                  }
                })
                .catch((err) => {
                  console.warn('Erro ao parar scanner após scan:', err)
                  if (isMountedRef.current) {
                    onScan(decodedText)
                    onClose()
                  }
                })
            }
          },
          () => {
            // Erro ao escanear (normal durante o processo)
            // Silenciar para não poluir console
          }
        )

        setIsScanning(true)
        setIsInitialized(true)
        setError(null)
      } catch (err) {
        console.error('Erro ao iniciar scanner:', err)
        if (isMountedRef.current) {
          setError('Não foi possível acessar a câmera. Verifique as permissões.')
          setIsScanning(false)
        }
      }
    }

    startScanner()

    return () => {
      // Cleanup ao desmontar
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop()
          .catch((err) => {
            // Ignorar erro de stop se já estiver parado
            console.warn('Erro ao parar scanner no cleanup:', err)
          })
          .finally(() => {
            scannerRef.current = null
          })
      }
    }
  }, [isOpen, onScan, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-2xl p-6">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Escanear QR Code</h3>
                <p className="text-sm text-blue-100">Aponte para o QR Code da carteira</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              aria-label="Fechar scanner"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scanner Area */}
        <div className="p-6">
          {error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Fechar
              </button>
            </div>
          ) : scannedAddress ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 animate-pulse" />
              <p className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
                Endereço Escaneado!
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-900 rounded-lg p-3 break-all">
                {scannedAddress}
              </p>
            </div>
          ) : (
            <div>
              <div
                id="qr-reader"
                className="rounded-lg overflow-hidden border-4 border-blue-500"
              />
              {isScanning && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      Procurando QR Code...
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instruções */}
          {!error && !scannedAddress && (
            <div className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                <strong>Dica:</strong> Posicione o QR Code dentro do quadrado azul para escanear automaticamente
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
