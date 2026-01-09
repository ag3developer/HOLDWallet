/**
 * 💰 P2P Payment Details Component - Premium Design
 * ==================================================
 * Mostra dados de pagamento do vendedor com QR Code PIX
 * Design compacto e premium com PIX Copia e Cola
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
  Zap,
  Link2,
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

// Componente auxiliar para exibição do QR Code - Compacto Premium
const QRCodeDisplay = ({
  isGenerating,
  qrCodeUrl,
}: {
  isGenerating: boolean
  qrCodeUrl: string | null
}) => {
  if (isGenerating) {
    return (
      <div className='w-32 h-32 flex items-center justify-center bg-white rounded-xl'>
        <Loader2 className='w-5 h-5 animate-spin text-emerald-600' />
      </div>
    )
  }

  if (qrCodeUrl) {
    return (
      <div className='flex flex-col items-center'>
        <div className='p-2 bg-white rounded-xl shadow-sm'>
          <img src={qrCodeUrl} alt='QR Code PIX' className='w-32 h-32' />
        </div>
        <p className='text-[10px] text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1'>
          <Smartphone className='w-3 h-3' />
          Escaneie com o app do seu banco
        </p>
      </div>
    )
  }

  return (
    <div className='w-32 h-32 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-xl'>
      <AlertCircle className='w-5 h-5 text-gray-400' />
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
  const [pixPayload, setPixPayload] = useState<string | null>(null)
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
        const pixPayloadStr = generatePixPayload(
          selectedMethod.details.pix_key,
          amount,
          paymentIdentifier
        )

        const url = await QRCode.toDataURL(pixPayloadStr, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        })
        setQrCodeUrl(url)
        setPixPayload(pixPayloadStr)
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
    <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden'>
      {/* Header Premium Compacto */}
      <div className='bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className='w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center'>
              <Zap className='w-4 h-4 text-white' />
            </div>
            <div>
              <h3 className='text-white font-bold text-sm'>Dados para Pagamento</h3>
              <p className='text-emerald-100 text-[11px]'>
                Pague {formatCurrency(amount)} para {sellerName}
              </p>
            </div>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
              timeRemaining < 300 ? 'bg-red-500/30 text-red-100' : 'bg-white/20 text-white'
            }`}
          >
            <Clock className='w-3.5 h-3.5' />
            {formatTime(timeRemaining)}
          </div>
        </div>
      </div>

      {/* Identificador do Pedido - Compacto */}
      <div className='px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-[10px] text-amber-700 dark:text-amber-400 font-semibold uppercase'>
              Identificador do Pedido
            </p>
            <p className='text-base font-mono font-bold text-amber-900 dark:text-amber-100'>
              {paymentIdentifier}
            </p>
            <p className='text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5'>
              <AlertCircle className='w-3 h-3' />
              Inclua este código na descrição do PIX
            </p>
          </div>
          <button
            onClick={() => copyToClipboard(paymentIdentifier, 'identifier')}
            className='p-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all shadow-lg shadow-amber-500/25'
          >
            {copiedField === 'identifier' ? (
              <Check className='w-4 h-4' />
            ) : (
              <Copy className='w-4 h-4' />
            )}
          </button>
        </div>
      </div>

      {/* Seleção de Método */}
      {sellerPaymentMethods.length > 1 && (
        <div className='px-4 py-2 border-b border-gray-100 dark:border-gray-700'>
          <div className='flex flex-wrap gap-1.5'>
            {sellerPaymentMethods.map(method => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedMethod?.id === method.id
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-2 border-emerald-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-2 border-transparent'
                }`}
              >
                {getMethodIcon(method.type)}
                {method.type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <div className='p-4'>
        {selectedMethod?.type.toLowerCase() === 'pix' ? (
          <div className='space-y-3'>
            {/* QR Code Centralizado */}
            <div className='flex justify-center py-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl'>
              <QRCodeDisplay isGenerating={isGeneratingQR} qrCodeUrl={qrCodeUrl} />
            </div>

            {/* PIX Copia e Cola (EMV) */}
            {pixPayload && (
              <div>
                <div className='flex items-center justify-between mb-1.5'>
                  <span className='text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase flex items-center gap-1'>
                    <Link2 className='w-3 h-3' />
                    PIX Copia e Cola (EMV)
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl font-mono text-[10px] text-gray-600 dark:text-gray-300 break-all line-clamp-2 overflow-hidden'>
                    {pixPayload}
                  </div>
                  <button
                    onClick={() => copyToClipboard(pixPayload, 'emv')}
                    className='p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex-shrink-0'
                    title='Copiar PIX Copia e Cola'
                  >
                    {copiedField === 'emv' ? (
                      <Check className='w-4 h-4' />
                    ) : (
                      <Copy className='w-4 h-4' />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Chave PIX */}
            <div>
              <span className='text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase'>
                Chave PIX ({selectedMethod.details.pix_key_type?.toUpperCase() || 'CPF'})
              </span>
              <div className='flex items-center gap-2 mt-1.5'>
                <div className='flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl font-mono text-sm text-gray-900 dark:text-white'>
                  {selectedMethod.details.pix_key}
                </div>
                <button
                  onClick={() => copyToClipboard(selectedMethod.details.pix_key!, 'pix')}
                  className='p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/25'
                >
                  {copiedField === 'pix' ? (
                    <Check className='w-4 h-4' />
                  ) : (
                    <Copy className='w-4 h-4' />
                  )}
                </button>
              </div>
            </div>

            {/* Nome do Titular */}
            {selectedMethod.details.holder_name && (
              <div>
                <span className='text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase'>
                  Nome do Titular
                </span>
                <p className='mt-1.5 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white'>
                  {selectedMethod.details.holder_name}
                </p>
              </div>
            )}

            {/* Valor a Pagar */}
            <div>
              <span className='text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase'>
                Valor a Pagar
              </span>
              <div className='flex items-center gap-2 mt-1.5'>
                <div className='flex-1 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800'>
                  <span className='text-xl font-bold text-emerald-600 dark:text-emerald-400'>
                    {formatCurrency(amount)}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(amount.toFixed(2), 'amount')}
                  className='p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/25'
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
        ) : (
          /* Bank Transfer - Compacto */
          <div className='space-y-3'>
            {selectedMethod?.details.bank_name && (
              <div>
                <span className='text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase'>
                  Banco
                </span>
                <p className='mt-1.5 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white'>
                  {selectedMethod.details.bank_name}
                </p>
              </div>
            )}

            {selectedMethod?.details.agency && (
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <span className='text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase'>
                    Agência
                  </span>
                  <div className='flex items-center gap-2 mt-1.5'>
                    <p className='flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-mono text-gray-900 dark:text-white'>
                      {selectedMethod.details.agency}
                    </p>
                    <button
                      onClick={() => copyToClipboard(selectedMethod.details.agency!, 'agency')}
                      className='p-2 text-gray-400 hover:text-emerald-500 transition-colors'
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
                  <span className='text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase'>
                    Conta
                  </span>
                  <div className='flex items-center gap-2 mt-1.5'>
                    <p className='flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-mono text-gray-900 dark:text-white'>
                      {selectedMethod.details.account_number}
                    </p>
                    <button
                      onClick={() =>
                        copyToClipboard(selectedMethod.details.account_number!, 'account')
                      }
                      className='p-2 text-gray-400 hover:text-emerald-500 transition-colors'
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
                <span className='text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase'>
                  Titular
                </span>
                <p className='mt-1.5 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white'>
                  {selectedMethod.details.holder_name}
                </p>
              </div>
            )}

            {/* Valor */}
            <div>
              <span className='text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase'>
                Valor a Transferir
              </span>
              <div className='flex items-center gap-2 mt-1.5'>
                <div className='flex-1 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800'>
                  <span className='text-xl font-bold text-emerald-600 dark:text-emerald-400'>
                    {formatCurrency(amount)}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(amount.toFixed(2), 'amount')}
                  className='p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all'
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
        )}
      </div>

      {/* Footer Premium */}
      <div className='px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700'>
        <div className='flex items-center justify-between text-sm mb-3'>
          <span className='text-gray-500 dark:text-gray-400'>Você receberá:</span>
          <span className='font-bold text-gray-900 dark:text-white'>
            {cryptoAmount} {cryptoCoin}
          </span>
        </div>

        <button
          onClick={onPaymentSent}
          className='w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25'
        >
          <CheckCircle className='w-5 h-5' />
          Já Fiz o Pagamento
        </button>

        <p className='text-[10px] text-center text-gray-400 mt-2'>
          Após o pagamento, o vendedor terá até {timeLimit} minutos para confirmar
        </p>
      </div>
    </div>
  )
}

export default P2PPaymentDetails
