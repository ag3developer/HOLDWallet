/**
 * BarcodeScanner - Scanner de Código de Barras
 * =============================================
 *
 * Versão simplificada usando html5-qrcode.
 */

import { useState, useEffect, useRef } from 'react'
import { CameraOff, X, AlertCircle, CheckCircle, Loader2, ScanLine, RefreshCw } from 'lucide-react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

interface BarcodeScannerProps {
  readonly onScan: (barcode: string) => void
  readonly onClose: () => void
  readonly isOpen: boolean
}

const SCANNER_ID = 'html5-qrcode-scanner'

export function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'active' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [scannedCode, setScannedCode] = useState('')
  const hasScanned = useRef(false)

  // Iniciar scanner
  useEffect(() => {
    if (!isOpen) return

    let mounted = true
    hasScanned.current = false

    const initCamera = async () => {
      // Aguarda o DOM
      await new Promise(r => setTimeout(r, 300))

      if (!mounted) return

      const container = document.getElementById(SCANNER_ID)
      if (!container) {
        console.error('Container não encontrado')
        return
      }

      setStatus('loading')
      setErrorMsg('')

      try {
        // Limpa instância anterior se existir
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop()
            scannerRef.current.clear()
          } catch {
            // ignora
          }
          scannerRef.current = null
        }

        // Cria nova instância
        const scanner = new Html5Qrcode(SCANNER_ID, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        })

        scannerRef.current = scanner

        // Callback de sucesso
        const onSuccess = (code: string) => {
          if (hasScanned.current) return

          const clean = code.replace(/\D/g, '')

          // Aceita códigos de 44-48 dígitos (boletos)
          if (clean.length >= 44 && clean.length <= 48) {
            hasScanned.current = true
            setScannedCode(clean)
            setStatus('success')

            // Vibra
            if (navigator.vibrate) {
              navigator.vibrate([100, 50, 100])
            }

            console.log('✅ Código lido:', clean.substring(0, 20) + '...')

            // Fecha após 1.5s
            setTimeout(async () => {
              try {
                await scanner.stop()
                scanner.clear()
              } catch {
                // ignora
              }
              scannerRef.current = null
              onScan(clean)
            }, 1500)
          }
        }

        // Inicia com câmera traseira
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 120 },
          },
          onSuccess,
          () => {} // ignora erros de frame
        )

        if (mounted) {
          setStatus('active')
          console.log('✅ Câmera iniciada')
        }
      } catch (err) {
        console.error('❌ Erro ao iniciar câmera:', err)

        if (!mounted) return

        let msg = 'Não foi possível acessar a câmera.'

        if (err instanceof Error) {
          if (err.message.includes('Permission') || err.message.includes('NotAllowed')) {
            msg = 'Permissão de câmera negada. Permita o acesso nas configurações.'
          } else if (err.message.includes('NotFound')) {
            msg = 'Nenhuma câmera encontrada.'
          } else if (err.message.includes('NotReadable') || err.message.includes('in use')) {
            msg = 'Câmera em uso por outro app.'
          }
        }

        setErrorMsg(msg)
        setStatus('error')
      }
    }

    initCamera()

    // Cleanup
    return () => {
      mounted = false
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        try {
          scannerRef.current.clear()
        } catch {
          // ignora
        }
        scannerRef.current = null
      }
    }
  }, [isOpen, onScan])

  // Retry
  const handleRetry = () => {
    setStatus('idle')
    setErrorMsg('')
    hasScanned.current = false
    // Re-trigger useEffect
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
      try {
        scannerRef.current.clear()
      } catch {
        // ignora
      }
      scannerRef.current = null
    }
    // Força re-render
    setTimeout(() => {
      setStatus('loading')
    }, 100)
  }

  // Fechar
  const handleClose = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch {
        // ignora
      }
      scannerRef.current = null
    }
    setStatus('idle')
    setScannedCode('')
    setErrorMsg('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 bg-black flex flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between p-4 bg-black/80'>
        <button onClick={handleClose} className='flex items-center gap-2 text-white p-2'>
          <X className='w-6 h-6' />
          <span>Fechar</span>
        </button>
      </div>

      {/* Área do Scanner */}
      <div className='flex-1 relative flex items-center justify-center'>
        {/* Container da câmera - sempre visível para html5-qrcode funcionar */}
        <div
          id={SCANNER_ID}
          className={`w-full h-full ${status === 'active' || status === 'success' ? 'block' : 'hidden'}`}
        />

        {/* Loading */}
        {status === 'loading' && (
          <div className='absolute inset-0 flex flex-col items-center justify-center bg-black'>
            <Loader2 className='w-12 h-12 text-violet-500 animate-spin mb-4' />
            <p className='text-gray-400'>Iniciando câmera...</p>
          </div>
        )}

        {/* Erro */}
        {status === 'error' && (
          <div className='absolute inset-0 flex flex-col items-center justify-center bg-black p-8'>
            <CameraOff className='w-16 h-16 text-red-500 mb-4' />
            <h3 className='text-xl font-semibold text-white mb-2'>Câmera indisponível</h3>
            <p className='text-gray-400 mb-6 text-center max-w-xs'>{errorMsg}</p>
            <button
              onClick={handleRetry}
              className='flex items-center gap-2 px-5 py-3 bg-violet-600 text-white rounded-xl'
            >
              <RefreshCw className='w-4 h-4' />
              Tentar novamente
            </button>
          </div>
        )}

        {/* Sucesso */}
        {status === 'success' && (
          <div className='absolute inset-0 flex items-center justify-center bg-black/80 z-30'>
            <div className='flex flex-col items-center gap-4 p-8 bg-green-500/20 rounded-2xl border-2 border-green-500'>
              <CheckCircle className='w-20 h-20 text-green-500 animate-bounce' />
              <p className='text-green-400 font-bold text-xl'>Código lido!</p>
              <p className='text-gray-400 text-sm font-mono'>{scannedCode.substring(0, 25)}...</p>
            </div>
          </div>
        )}

        {/* Overlay de guia */}
        {status === 'active' && (
          <div className='absolute inset-0 pointer-events-none z-10'>
            <div className='absolute inset-0 bg-black/40' />
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='relative w-[85%] max-w-md h-32'>
                {/* Cantos */}
                <div className='absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-violet-500 rounded-tl-lg' />
                <div className='absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-violet-500 rounded-tr-lg' />
                <div className='absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-violet-500 rounded-bl-lg' />
                <div className='absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-violet-500 rounded-br-lg' />
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
      {status === 'active' && (
        <div className='p-6 bg-black/80 text-center'>
          <div className='flex items-center justify-center gap-2 mb-2'>
            <ScanLine className='w-5 h-5 text-violet-400' />
            <p className='text-white font-medium'>Aponte para o código de barras</p>
          </div>
          <p className='text-gray-400 text-sm'>Posicione dentro da área destacada</p>
          <div className='mt-3 flex items-center justify-center gap-2 text-xs text-gray-500'>
            <AlertCircle className='w-4 h-4' />
            <span>Boletos e contas de consumo</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default BarcodeScanner
