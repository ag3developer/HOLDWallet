/**
 * BarcodeScanner - Scanner de Código de Barras
 * =============================================
 *
 * Componente para escanear códigos de barras de boletos usando a câmera do celular.
 * Usa a biblioteca react-zxing que suporta múltiplos formatos de código de barras.
 *
 * Formatos suportados:
 * - ITF (Interleaved 2 of 5) - Usado em boletos bancários
 * - CODE_128
 * - EAN_13
 * - QR_CODE (para PIX)
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useZxing } from 'react-zxing'
import {
  CameraOff,
  X,
  SwitchCamera,
  Flashlight,
  AlertCircle,
  CheckCircle,
  Loader2,
  ScanLine,
} from 'lucide-react'

interface BarcodeScannerProps {
  readonly onScan: (barcode: string) => void
  readonly onClose: () => void
  readonly isOpen: boolean
}

export function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scannedCode, setScannedCode] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [torchOn, setTorchOn] = useState(false)

  // Configuração do scanner
  const {
    ref,
    torch: { on: enableTorch, off: disableTorch, isOn: isTorchOn, isAvailable: torchAvailable },
  } = useZxing({
    onDecodeResult(result) {
      const code = result.getText()
      handleScan(code)
    },
    onError(err) {
      console.error('Scanner error:', err)
      // Não mostrar erro para cada frame sem código
      const errorMessage = err instanceof Error ? err.message : String(err)
      if (errorMessage.includes('permission')) {
        setError('Permissão de câmera negada')
        setHasPermission(false)
      }
    },
    constraints: {
      video: {
        facingMode: facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    paused: !isOpen,
  })

  // Verificar permissão de câmera
  useEffect(() => {
    if (isOpen) {
      checkCameraPermission()
    }
  }, [isOpen])

  const checkCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(track => track.stop())
      setHasPermission(true)
      setError(null)
    } catch (err) {
      console.error('Camera permission error:', err)
      setHasPermission(false)
      setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.')
    }
  }

  // Processar código escaneado
  const handleScan = useCallback(
    (code: string) => {
      if (isProcessing || scannedCode) return

      // Validar se parece um código de boleto (44-48 dígitos numéricos)
      const cleanCode = code.replaceAll(/\D/g, '')

      if (cleanCode.length >= 44 && cleanCode.length <= 48) {
        setIsProcessing(true)
        setScannedCode(cleanCode)

        // Vibrar para feedback tátil (se disponível)
        if (navigator.vibrate) {
          navigator.vibrate(200)
        }

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

  // Alternar câmera frontal/traseira
  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'))
  }

  // Alternar flash
  const toggleTorch = () => {
    if (torchAvailable) {
      if (isTorchOn) {
        disableTorch()
      } else {
        enableTorch()
      }
      setTorchOn(!torchOn)
    }
  }

  // Fechar scanner
  const handleClose = () => {
    setScannedCode(null)
    setIsProcessing(false)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 bg-black'>
      {/* Header */}
      <div className='absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4'>
        <div className='flex items-center justify-between'>
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
        {/* Sem Permissão */}
        {hasPermission === false && (
          <div className='flex flex-col items-center justify-center p-8 text-center'>
            <CameraOff className='w-16 h-16 text-red-500 mb-4' />
            <h3 className='text-xl font-semibold text-white mb-2'>Câmera não disponível</h3>
            <p className='text-gray-400 mb-4'>{error || 'Permissão de câmera negada'}</p>
            <button
              onClick={checkCameraPermission}
              className='px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors'
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Carregando */}
        {hasPermission === null && (
          <div className='flex flex-col items-center justify-center'>
            <Loader2 className='w-12 h-12 text-violet-500 animate-spin mb-4' />
            <p className='text-gray-400'>Iniciando câmera...</p>
          </div>
        )}

        {/* Scanner Ativo */}
        {hasPermission && (
          <>
            {/* Vídeo da Câmera */}
            <video ref={ref} className='w-full h-full object-cover' playsInline muted autoPlay />

            {/* Overlay com Guia de Scan */}
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
          </>
        )}
      </div>

      {/* Footer com Instruções */}
      <div className='absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-6'>
        <div className='text-center'>
          {scannedCode ? (
            <div className='flex flex-col items-center gap-2'>
              <CheckCircle className='w-8 h-8 text-green-500' />
              <p className='text-white font-medium'>Código detectado!</p>
              <p className='text-gray-400 text-sm font-mono'>{scannedCode.substring(0, 20)}...</p>
            </div>
          ) : (
            <>
              <div className='flex items-center justify-center gap-2 mb-2'>
                <ScanLine className='w-5 h-5 text-violet-400' />
                <p className='text-white font-medium'>Aponte para o código de barras</p>
              </div>
              <p className='text-gray-400 text-sm'>
                Posicione o código de barras do boleto dentro da área destacada
              </p>
            </>
          )}
        </div>

        {/* Dica de formato */}
        <div className='mt-4 flex items-center justify-center gap-2 text-xs text-gray-500'>
          <AlertCircle className='w-4 h-4' />
          <span>Formatos suportados: Boleto bancário, contas de consumo</span>
        </div>
      </div>
    </div>
  )
}

export default BarcodeScanner
