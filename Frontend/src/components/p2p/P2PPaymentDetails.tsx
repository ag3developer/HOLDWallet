/**
 * 💰 P2P Payment Details Component
 * =================================
 * Mostra dados de pagamento do vendedor com QR Code PIX
 * Inclui identificador único para rastreamento
 */

import { useState, useEffect } from 'react'
import {
  Copy,
  Check,
  QrCode,
  Smartphone,
  CreditCard,
  Building2,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import QRCode from 'qrcode'

interface PaymentMethod {
  id: string
  type: string
  details: {
    pix_key?: string
    pix_key_type?: string
    bank_name?: string
    account_number?: string
    account_type?: string
    agency?: string
    holder_name?: string
  }
}

interface P2PPaymentDetailsProps {
  tradeId: string
  orderId: string
  sellerPaymentMethods: PaymentMethod[]
  amount: number
  fiatCurrency: string
  cryptoAmount: string
  cryptoCoin: string
  sellerName: string
  timeLimit: number // em minutos
  onPaymentSent?: () => void
}

// Componente auxiliar para exibição do QR Code - Compacto
const QRCodeDisplay = ({
  isGenerating,
  qrCodeUrl,
}: {
  isGenerating: boolean
  qrCodeUrl: string | null
}) => {
  if (isGenerating) {
    return (
      <div className='w-40 h-40 flex items-center justify-center'>
        <Loader2 className='w-6 h-6 animate-spin text-green-600' />
      </div>
    )
  }

  if (qrCodeUrl) {
    return (
      <>
        <img src={qrCodeUrl} alt='QR Code PIX' className='w-40 h-40 rounded-lg' />
        <p className='text-xs text-gray-500 dark:text-gray-400 mt-1 text-center'>
          <Smartphone className='w-3 h-3 inline mr-1' />
          Escaneie com o app do seu banco
        </p>
      </>
    )
  }

  return (
    <div className='w-40 h-40 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-lg'>
      <AlertCircle className='w-6 h-6 text-gray-400' />
    </div>
  )
}

export const P2PPaymentDetails = ({
  tradeId,
  orderId,
  sellerPaymentMethods,
  amount,
  fiatCurrency,
  cryptoAmount,
  cryptoCoin,
  sellerName,
  timeLimit,
  onPaymentSent,
}: P2PPaymentDetailsProps) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    sellerPaymentMethods[0] || null
  )
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(timeLimit * 60) // segundos

  // Gerar identificador único do pedido
  const paymentIdentifier = `P2P-${tradeId.slice(-7).toUpperCase()}`

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Formatar tempo restante
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Função para calcular CRC16-CCITT
  const calculateCRC16 = (str: string): string => {
    let crc = 0xffff
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021
        } else {
          crc <<= 1
        }
      }
      crc &= 0xffff
    }
    return crc.toString(16).toUpperCase().padStart(4, '0')
  }

  // Função auxiliar para formatar campo TLV (Tag-Length-Value)
  const formatTLV = (tag: string, value: string): string => {
    const length = value.length.toString().padStart(2, '0')
    return `${tag}${length}${value}`
  }

  // Gerar PIX Copia e Cola (formato EMV oficial do Banco Central)
  const generatePixPayload = (pixKey: string, value: number, txId: string): string => {
    // Remove espaços e caracteres especiais da chave PIX
    const cleanPixKey = pixKey.trim()

    // Formatar valor com 2 casas decimais
    const formattedValue = value.toFixed(2)

    // Limpar nome do vendedor (máx 25 caracteres, sem acentos)
    const cleanSellerName =
      sellerName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .substring(0, 25)
        .trim() || 'Vendedor'

    // Cidade (máx 15 caracteres)
    const city = 'SAO PAULO'

    // Transaction ID (máx 25 caracteres, sem espaços)
    // Formato: WOLK + últimos 8 chars do tradeId
    const shortTradeId = txId
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(-8)
      .toUpperCase()
    const cleanTxId = `WOLK${shortTradeId}`.substring(0, 25)

    // Descrição do pagamento (será exibida no extrato)
    // Descrição neutra sem mencionar cripto - apenas identificador
    // Máx 72 caracteres, sem acentos ou caracteres especiais
    const description = `WOLK P2P ${cleanTxId}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .substring(0, 72)

    // Construir Merchant Account Information (ID 26)
    // GUI do PIX: BR.GOV.BCB.PIX
    // 00 - GUI (obrigatório)
    // 01 - Chave PIX (obrigatório)
    // 02 - Descrição (opcional - aparece no extrato)
    const gui = formatTLV('00', 'BR.GOV.BCB.PIX')
    const key = formatTLV('01', cleanPixKey)
    const desc = formatTLV('02', description)
    const merchantAccountInfo = formatTLV('26', gui + key + desc)

    // Construir o payload PIX EMV
    let payload = ''

    // 00 - Payload Format Indicator (obrigatório)
    payload += formatTLV('00', '01')

    // 26 - Merchant Account Information - PIX (obrigatório)
    payload += merchantAccountInfo

    // 52 - Merchant Category Code (obrigatório) - 0000 = não informado
    payload += formatTLV('52', '0000')

    // 53 - Transaction Currency (obrigatório) - 986 = BRL
    payload += formatTLV('53', '986')

    // 54 - Transaction Amount (opcional, mas recomendado)
    payload += formatTLV('54', formattedValue)

    // 58 - Country Code (obrigatório)
    payload += formatTLV('58', 'BR')

    // 59 - Merchant Name (obrigatório)
    payload += formatTLV('59', cleanSellerName)

    // 60 - Merchant City (obrigatório)
    payload += formatTLV('60', city)

    // 62 - Additional Data Field Template (opcional)
    const txIdField = formatTLV('05', cleanTxId)
    payload += formatTLV('62', txIdField)

    // 63 - CRC16 (obrigatório) - adicionar placeholder primeiro
    payload += '6304'

    // Calcular CRC16 e adicionar ao final
    const crc = calculateCRC16(payload)
    payload = payload.slice(0, -4) + '6304' + crc

    console.log('[PIX] Generated payload:', payload)
    console.log('[PIX] Key:', cleanPixKey)
    console.log('[PIX] Amount:', formattedValue)
    console.log('[PIX] TxID:', cleanTxId)

    return payload
  }

  // Gerar QR Code
  useEffect(() => {
    const generateQR = async () => {
      console.log('[PIX] selectedMethod:', selectedMethod)
      console.log('[PIX] selectedMethod?.details:', selectedMethod?.details)
      console.log('[PIX] pix_key:', selectedMethod?.details?.pix_key)

      if (!selectedMethod?.details?.pix_key) {
        console.warn('[PIX] No pix_key found in payment method details')
        setQrCodeUrl(null)
        return
      }

      setIsGeneratingQR(true)
      try {
        const pixPayload = generatePixPayload(
          selectedMethod.details.pix_key,
          amount,
          paymentIdentifier
        )

        const url = await QRCode.toDataURL(pixPayload, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        })
        setQrCodeUrl(url)
      } catch (error) {
        console.error('Error generating QR code:', error)
      } finally {
        setIsGeneratingQR(false)
      }
    }

    generateQR()
  }, [selectedMethod, amount, paymentIdentifier])

  // Copiar para clipboard
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // Formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: fiatCurrency,
    }).format(value)
  }

  // Ícone do método de pagamento
  const getMethodIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pix':
        return <QrCode className='w-5 h-5' />
      case 'bank_transfer':
      case 'ted':
      case 'doc':
        return <Building2 className='w-5 h-5' />
      default:
        return <CreditCard className='w-5 h-5' />
    }
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden'>
      {/* Header Compacto */}
      <div className='bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-white font-bold text-base'>Dados para Pagamento</h3>
            <p className='text-green-100 text-xs'>
              Pague {formatCurrency(amount)} para {sellerName}
            </p>
          </div>
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              timeRemaining < 300 ? 'bg-red-500/20 text-red-100' : 'bg-white/20 text-white'
            }`}
          >
            <Clock className='w-3 h-3 inline mr-1' />
            {formatTime(timeRemaining)}
          </div>
        </div>
      </div>

      {/* Identificador do Pedido - Compacto */}
      <div className='px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-xs text-blue-600 dark:text-blue-400 font-medium'>
              IDENTIFICADOR DO PEDIDO
            </p>
            <p className='text-lg font-mono font-bold text-blue-900 dark:text-blue-100'>
              {paymentIdentifier}
            </p>
            <p className='text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1'>
              <AlertCircle className='w-3 h-3' />
              Inclua este código na descrição do PIX
            </p>
          </div>
          <button
            onClick={() => copyToClipboard(paymentIdentifier, 'identifier')}
            className='p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors'
          >
            {copiedField === 'identifier' ? (
              <Check className='w-4 h-4' />
            ) : (
              <Copy className='w-4 h-4' />
            )}
          </button>
        </div>
      </div>

      {/* Seleção de Método - Compacto */}
      {sellerPaymentMethods.length > 1 && (
        <div className='px-4 py-2 border-b border-gray-200 dark:border-gray-700'>
          <div className='flex flex-wrap gap-1'>
            {sellerPaymentMethods.map(method => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedMethod?.id === method.id
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-transparent'
                }`}
              >
                {getMethodIcon(method.type)}
                {method.type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conteúdo Principal - Compacto */}
      <div className='px-4 py-3'>
        {selectedMethod?.type.toLowerCase() === 'pix' ? (
          /* PIX Payment - Layout Compacto */
          <div className='space-y-3'>
            {/* QR Code - Centralizado e menor */}
            <div className='flex flex-col items-center py-2 bg-gray-50 dark:bg-gray-700 rounded-xl'>
              <QRCodeDisplay isGenerating={isGeneratingQR} qrCodeUrl={qrCodeUrl} />
            </div>

            {/* PIX Copia e Cola - Compacto */}
            <div className='space-y-2'>
              <div>
                <span className='text-xs text-gray-500 dark:text-gray-400 font-medium'>
                  CHAVE PIX ({selectedMethod.details.pix_key_type?.toUpperCase() || 'CHAVE'})
                </span>
                <div className='flex items-center gap-2 mt-1'>
                  <div className='flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-sm break-all'>
                    {selectedMethod.details.pix_key}
                  </div>
                  <button
                    onClick={() => copyToClipboard(selectedMethod.details.pix_key!, 'pix')}
                    className='p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors'
                  >
                    {copiedField === 'pix' ? (
                      <Check className='w-4 h-4' />
                    ) : (
                      <Copy className='w-4 h-4' />
                    )}
                  </button>
                </div>
              </div>

              {/* Nome do Titular - Compacto */}
              {selectedMethod.details.holder_name && (
                <div>
                  <span className='text-xs text-gray-500 dark:text-gray-400 font-medium'>
                    NOME DO TITULAR
                  </span>
                  <p className='mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm'>
                    {selectedMethod.details.holder_name}
                  </p>
                </div>
              )}

              {/* Valor - Compacto */}
              <div>
                <span className='text-xs text-gray-500 dark:text-gray-400 font-medium'>
                  VALOR A PAGAR
                </span>
                <div className='flex items-center gap-2 mt-1'>
                  <div className='flex-1 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg'>
                    <span className='text-xl font-bold text-green-600 dark:text-green-400'>
                      {formatCurrency(amount)}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(amount.toFixed(2), 'amount')}
                    className='p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors'
                  >
                    {copiedField === 'amount' ? (
                      <Check className='w-4 h-4' />
                    ) : (
                      <Copy className='w-4 h-4' />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Bank Transfer */
          <div className='space-y-3'>
            {selectedMethod?.details.bank_name && (
              <div>
                <span className='text-xs text-gray-500 dark:text-gray-400 font-medium'>BANCO</span>
                <p className='mt-1 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium'>
                  {selectedMethod.details.bank_name}
                </p>
              </div>
            )}

            {selectedMethod?.details.agency && (
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <span className='text-xs text-gray-500 dark:text-gray-400 font-medium'>
                    AGÊNCIA
                  </span>
                  <div className='flex items-center gap-2 mt-1'>
                    <p className='flex-1 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-mono'>
                      {selectedMethod.details.agency}
                    </p>
                    <button
                      onClick={() => copyToClipboard(selectedMethod.details.agency!, 'agency')}
                      className='p-2 text-gray-400 hover:text-green-600 transition-colors'
                    >
                      {copiedField === 'agency' ? (
                        <Check className='w-4 h-4' />
                      ) : (
                        <Copy className='w-4 h-4' />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <span className='text-xs text-gray-500 dark:text-gray-400 font-medium'>
                    CONTA
                  </span>
                  <div className='flex items-center gap-2 mt-1'>
                    <p className='flex-1 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-mono'>
                      {selectedMethod.details.account_number}
                    </p>
                    <button
                      onClick={() =>
                        copyToClipboard(selectedMethod.details.account_number!, 'account')
                      }
                      className='p-2 text-gray-400 hover:text-green-600 transition-colors'
                    >
                      {copiedField === 'account' ? (
                        <Check className='w-4 h-4' />
                      ) : (
                        <Copy className='w-4 h-4' />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedMethod?.details.holder_name && (
              <div>
                <span className='text-xs text-gray-500 dark:text-gray-400 font-medium'>
                  TITULAR
                </span>
                <p className='mt-1 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm'>
                  {selectedMethod.details.holder_name}
                </p>
              </div>
            )}

            {/* Valor */}
            <div>
              <span className='text-xs text-gray-500 dark:text-gray-400 font-medium'>
                VALOR A TRANSFERIR
              </span>
              <div className='flex items-center gap-2 mt-1'>
                <div className='flex-1 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg'>
                  <span className='text-2xl font-bold text-green-600 dark:text-green-400'>
                    {formatCurrency(amount)}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(amount.toFixed(2), 'amount')}
                  className='p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors'
                >
                  {copiedField === 'amount' ? (
                    <Check className='w-5 h-5' />
                  ) : (
                    <Copy className='w-5 h-5' />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Resumo */}
      <div className='p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700'>
        <div className='flex items-center justify-between text-sm mb-3'>
          <span className='text-gray-600 dark:text-gray-400'>Você receberá:</span>
          <span className='font-bold text-gray-900 dark:text-white'>
            {cryptoAmount} {cryptoCoin}
          </span>
        </div>

        <button
          onClick={onPaymentSent}
          className='w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2'
        >
          <CheckCircle className='w-5 h-5' />
          Já Fiz o Pagamento
        </button>

        <p className='text-xs text-center text-gray-500 dark:text-gray-400 mt-3'>
          Após o pagamento, o vendedor terá até 15 minutos para confirmar
        </p>
      </div>
    </div>
  )
}

export default P2PPaymentDetails
