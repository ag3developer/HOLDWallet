/**
 * WolkPay Admin Detail Page
 * =========================
 *
 * Pagina de detalhes da fatura com acoes de aprovacao/rejeicao.
 */

import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowLeft,
  User,
  Building,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Ban,
  RefreshCw,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Hash,
  Wallet,
  Copy,
  Check,
  AlertCircle,
  Banknote,
  ExternalLink,
  Send,
  QrCode,
  Link,
  Globe,
  type LucideIcon,
} from 'lucide-react'
import {
  getInvoiceDetails,
  getInvoiceTimeline,
  confirmPayment,
  approveInvoice,
  rejectInvoice,
  markInvoiceCompleted,
  type WolkPayInvoiceDetail,
  type TimelineResponse,
} from '@/services/admin/adminWolkpay'
import { toast } from 'react-hot-toast'

// Crypto logos
const CRYPTO_LOGOS: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',
  POL: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
}

const getCryptoLogo = (symbol?: string) => {
  if (!symbol) return null
  return CRYPTO_LOGOS[symbol.toUpperCase()] || null
}

// Status config
const STATUS_CONFIG: Record<string, { label: string; bgClass: string; icon: React.ReactNode }> = {
  PENDING: {
    label: 'Pendente',
    bgClass: 'bg-gray-500/20 text-gray-400',
    icon: <Clock className='w-4 h-4' />,
  },
  AWAITING_PAYMENT: {
    label: 'Aguardando PIX',
    bgClass: 'bg-yellow-500/20 text-yellow-400',
    icon: <Clock className='w-4 h-4' />,
  },
  PAID: {
    label: 'Pago - Aguardando Aprovacao',
    bgClass: 'bg-blue-500/20 text-blue-400',
    icon: <ShieldCheck className='w-4 h-4' />,
  },
  APPROVED: {
    label: 'Aprovado',
    bgClass: 'bg-emerald-500/20 text-emerald-400',
    icon: <CheckCircle className='w-4 h-4' />,
  },
  COMPLETED: {
    label: 'Concluido',
    bgClass: 'bg-green-500/20 text-green-400',
    icon: <CheckCircle className='w-4 h-4' />,
  },
  EXPIRED: {
    label: 'Expirado',
    bgClass: 'bg-gray-500/20 text-gray-400',
    icon: <XCircle className='w-4 h-4' />,
  },
  CANCELLED: {
    label: 'Cancelado',
    bgClass: 'bg-red-500/20 text-red-400',
    icon: <XCircle className='w-4 h-4' />,
  },
  REJECTED: {
    label: 'Rejeitado',
    bgClass: 'bg-red-500/20 text-red-400',
    icon: <Ban className='w-4 h-4' />,
  },
}

const getStatusConfig = (status: string) => {
  return (
    STATUS_CONFIG[status.toUpperCase()] || {
      label: status,
      bgClass: 'bg-gray-500/20 text-gray-400',
      icon: null,
    }
  )
}

// Format functions
const formatBRL = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const formatCrypto = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return '0.00'
  const numAmount = Number(amount)
  if (Number.isNaN(numAmount)) return '0.00'
  if (numAmount >= 1000) return numAmount.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  if (numAmount >= 1) return numAmount.toFixed(4)
  return numAmount.toFixed(8)
}

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDocument = (doc: string | null | undefined) => {
  if (!doc) return '-'
  // CPF: 000.000.000-00
  if (doc.length === 11) {
    return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  // CNPJ: 00.000.000/0000-00
  if (doc.length === 14) {
    return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return doc
}

// Info Row Component
const InfoRow: React.FC<{
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  className?: string
}> = ({ icon, label, value, className = '' }) => (
  <div className={`flex items-start gap-3 ${className}`}>
    <div className='w-8 h-8 bg-gray-700/50 rounded-lg flex items-center justify-center flex-shrink-0'>
      {icon}
    </div>
    <div className='flex-1 min-w-0'>
      <p className='text-xs text-gray-500'>{label}</p>
      <p className='text-sm text-white break-all'>{value || '-'}</p>
    </div>
  </div>
)

// Copy Button
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      title='Copiar'
      className='p-1 text-gray-400 hover:text-white transition-colors'
    >
      {copied ? <Check className='w-4 h-4 text-green-400' /> : <Copy className='w-4 h-4' />}
    </button>
  )
}

// Mapeamento de nomes de ícones para componentes Lucide
const TIMELINE_ICONS: Record<string, LucideIcon> = {
  FileText,
  User,
  QrCode,
  CheckCircle,
  Banknote,
  Send,
  Check,
  XCircle,
  Ban,
  Clock,
  AlertCircle,
}

// Renderiza ícone da timeline
const TimelineIcon: React.FC<{ iconName: string; className?: string }> = ({
  iconName,
  className = 'w-3 h-3',
}) => {
  const IconComponent = TIMELINE_ICONS[iconName]
  if (IconComponent) {
    return <IconComponent className={className} />
  }
  return null
}

export const AdminWolkPayDetailPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<WolkPayInvoiceDetail | null>(null)
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showMarkCompletedModal, setShowMarkCompletedModal] = useState(false)
  const [bankTransactionId, setBankTransactionId] = useState('')
  const [approveNotes, setApproveNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [rejectNotes, setRejectNotes] = useState('')
  const [markCompletedTxHash, setMarkCompletedTxHash] = useState('')
  const [markCompletedNetwork, setMarkCompletedNetwork] = useState('polygon')
  const [markCompletedNotes, setMarkCompletedNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState('polygon')

  // Network config - redes suportadas pelo sistema
  const getDefaultNetworkForSymbol = (symbol: string): string => {
    const symbolNetworks: Record<string, string> = {
      // Redes nativas
      BTC: 'bitcoin',
      LTC: 'litecoin',
      DOGE: 'dogecoin',
      // EVM
      ETH: 'ethereum',
      MATIC: 'polygon',
      POL: 'polygon',
      BNB: 'bsc',
      // Stablecoins - Polygon como default (mais barato)
      USDT: 'polygon',
      USDC: 'polygon',
    }
    return symbolNetworks[symbol?.toUpperCase()] || 'polygon'
  }

  const getAvailableNetworksForSymbol = (symbol: string): { value: string; label: string }[] => {
    const s = symbol?.toUpperCase()

    // =====================================================
    // REDES SUPORTADAS PELO SISTEMA
    // Baseado no multi_chain_service e system wallet
    // Apenas redes onde temos funds para gas
    // =====================================================

    // Criptos nativas - só podem usar sua própria rede
    if (s === 'BTC') return [{ value: 'bitcoin', label: 'Bitcoin' }]
    if (s === 'LTC') return [{ value: 'litecoin', label: 'Litecoin' }]
    if (s === 'DOGE') return [{ value: 'dogecoin', label: 'Dogecoin' }]

    // ETH pode ser enviado em múltiplas redes EVM
    if (s === 'ETH')
      return [
        { value: 'ethereum', label: 'Ethereum' },
        { value: 'polygon', label: 'Polygon' },
        { value: 'base', label: 'Base' },
      ]

    // MATIC/POL só na Polygon
    if (s === 'MATIC' || s === 'POL') return [{ value: 'polygon', label: 'Polygon' }]

    // BNB só na BSC
    if (s === 'BNB') return [{ value: 'bsc', label: 'BSC' }]

    // Stablecoins - APENAS redes EVM onde temos gas
    // NÃO incluir TRON pois não temos TRX para gas
    if (s === 'USDT' || s === 'USDC')
      return [
        { value: 'polygon', label: 'Polygon (Recomendado)' },
        { value: 'ethereum', label: 'Ethereum' },
        { value: 'base', label: 'Base' },
      ]

    // Default para outras criptos EVM
    return [{ value: 'polygon', label: 'Polygon' }]
  }

  const fetchData = async (isRefresh = false) => {
    if (!id) return

    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      const [result, timelineResult] = await Promise.all([
        getInvoiceDetails(id),
        getInvoiceTimeline(id).catch(() => null), // Timeline é opcional
      ])
      setData(result)
      setTimeline(timelineResult)
    } catch (err: any) {
      console.error('Erro ao carregar detalhes:', err)
      toast.error(err.response?.data?.detail || 'Erro ao carregar detalhes')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  // Set default network when data is loaded
  useEffect(() => {
    if (data?.invoice) {
      const defaultNet =
        data.invoice.crypto_network || getDefaultNetworkForSymbol(data.invoice.crypto_currency)
      setSelectedNetwork(defaultNet)
    }
  }, [data?.invoice?.crypto_currency, data?.invoice?.crypto_network])

  // Action handlers
  const handleConfirmPayment = async () => {
    if (!id || !bankTransactionId.trim()) {
      toast.error('Informe o ID da transacao bancaria')
      return
    }

    try {
      setActionLoading(true)
      await confirmPayment(id, bankTransactionId.trim())
      toast.success('Pagamento confirmado com sucesso!')
      setShowConfirmModal(false)
      setBankTransactionId('')
      fetchData(true)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao confirmar pagamento')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!id) return

    try {
      setActionLoading(true)
      const result = await approveInvoice(id, selectedNetwork, approveNotes || undefined)
      toast.success(result.message)
      setShowApproveModal(false)
      setApproveNotes('')
      fetchData(true)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao aprovar fatura')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!id || !rejectReason.trim()) {
      toast.error('Informe o motivo da rejeicao')
      return
    }

    try {
      setActionLoading(true)
      const result = await rejectInvoice(id, rejectReason.trim(), rejectNotes || undefined)
      toast.success(result.message)
      setShowRejectModal(false)
      setRejectReason('')
      setRejectNotes('')
      fetchData(true)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao rejeitar fatura')
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkCompleted = async () => {
    if (!id || !markCompletedTxHash.trim() || !markCompletedNetwork.trim()) {
      toast.error('Informe o hash da transacao e a rede')
      return
    }

    try {
      setActionLoading(true)
      const result = await markInvoiceCompleted(
        id,
        markCompletedTxHash.trim(),
        markCompletedNetwork.trim(),
        markCompletedNotes || undefined
      )
      toast.success(result.message)
      setShowMarkCompletedModal(false)
      setMarkCompletedTxHash('')
      setMarkCompletedNetwork('polygon')
      setMarkCompletedNotes('')
      fetchData(true)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao marcar como concluido')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <div className='animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500' />
      </div>
    )
  }

  if (!data) {
    return (
      <div className='p-6 text-center'>
        <AlertCircle className='w-16 h-16 text-gray-600 mx-auto mb-4' />
        <h2 className='text-xl font-bold text-white mb-2'>Fatura nao encontrada</h2>
        <p className='text-gray-400 mb-4'>A fatura solicitada nao existe ou foi removida.</p>
        <button
          onClick={() => navigate('/admin/wolkpay')}
          className='px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors'
        >
          Voltar para lista
        </button>
      </div>
    )
  }

  const { invoice, payer, payment, approval } = data
  const statusConfig = getStatusConfig(invoice.status)
  const cryptoLogo = getCryptoLogo(invoice.crypto_currency)
  const canConfirmPayment = invoice.status === 'AWAITING_PAYMENT'
  const canApproveReject = invoice.status === 'PAID'

  return (
    <div className='space-y-4 p-4'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => navigate('/admin/wolkpay')}
            title='Voltar'
            className='p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors'
          >
            <ArrowLeft className='w-5 h-5 text-white' />
          </button>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-xl font-bold text-white'>{invoice.invoice_number}</h1>
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgClass}`}
              >
                {statusConfig.icon}
                {statusConfig.label}
              </span>
            </div>
            <p className='text-xs text-gray-400'>Detalhes da fatura WolkPay</p>
          </div>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className='flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors'
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Action Buttons */}
      {(canConfirmPayment || canApproveReject) && (
        <div className='flex flex-wrap gap-3 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50'>
          {canConfirmPayment && (
            <>
              {/* Alerta quando pagador já confirmou que pagou */}
              {payment?.payer_confirmed_at && (
                <div className='w-full mb-3 p-3 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/50 rounded-lg'>
                  <div className='flex items-center gap-2'>
                    <AlertCircle className='w-6 h-6 text-red-400' />
                    <div>
                      <p className='text-red-400 font-bold'>Pagador confirmou que pagou!</p>
                      <p className='text-red-400/80 text-sm'>
                        Data: {formatDate(payment.payer_confirmed_at)} - Verifique no banco se o PIX
                        foi recebido.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={() => setShowConfirmModal(true)}
                className='flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors'
              >
                <Banknote className='w-4 h-4' />
                Confirmar Pagamento PIX
              </button>
            </>
          )}
          {canApproveReject && (
            <>
              <button
                onClick={() => setShowApproveModal(true)}
                className='flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium transition-colors'
              >
                <CheckCircle className='w-4 h-4' />
                Aprovar e Enviar Crypto
              </button>
              <button
                onClick={() => {
                  // Pré-preencher com dados da aprovação se existirem
                  if (approval?.crypto_tx_hash) {
                    setMarkCompletedTxHash(approval.crypto_tx_hash)
                  }
                  if (approval?.crypto_network) {
                    setMarkCompletedNetwork(approval.crypto_network)
                  } else if (invoice.crypto_network) {
                    setMarkCompletedNetwork(invoice.crypto_network)
                  }
                  setShowMarkCompletedModal(true)
                }}
                className='flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-medium transition-colors'
                title='Use quando a crypto já foi enviada e você só precisa atualizar o status'
              >
                <Check className='w-4 h-4' />
                Marcar como Concluído
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className='flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors'
              >
                <XCircle className='w-4 h-4' />
                Rejeitar
              </button>
            </>
          )}
        </div>
      )}

      {/* Timeline */}
      {timeline && timeline.timeline.length > 0 && (
        <div className='bg-gray-800/50 rounded-xl border border-gray-700/50 p-4'>
          <div className='flex items-center gap-2 mb-4'>
            <Clock className='w-5 h-5 text-purple-400' />
            <h2 className='text-lg font-semibold text-white'>Timeline da Fatura</h2>
            <span className='text-xs text-gray-500'>({timeline.total_events} eventos)</span>
          </div>

          <div className='relative'>
            {/* Linha vertical */}
            <div className='absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700' />

            <div className='space-y-4'>
              {timeline.timeline.map((event, index) => (
                <div key={`${event.action}-${index}`} className='relative pl-10'>
                  {/* Dot */}
                  <div
                    className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center text-sm
                    ${event.color === 'blue' ? 'bg-blue-500/20 border border-blue-500 text-blue-400' : ''}
                    ${event.color === 'purple' ? 'bg-purple-500/20 border border-purple-500 text-purple-400' : ''}
                    ${event.color === 'cyan' ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-400' : ''}
                    ${event.color === 'yellow' ? 'bg-yellow-500/20 border border-yellow-500 text-yellow-400' : ''}
                    ${event.color === 'green' ? 'bg-green-500/20 border border-green-500 text-green-400' : ''}
                    ${event.color === 'emerald' ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400' : ''}
                    ${event.color === 'red' ? 'bg-red-500/20 border border-red-500 text-red-400' : ''}
                    ${event.color === 'gray' ? 'bg-gray-500/20 border border-gray-500 text-gray-400' : ''}
                  `}
                  >
                    <TimelineIcon iconName={event.icon} />
                  </div>

                  {/* Content */}
                  <div className='bg-gray-900/50 rounded-lg p-3'>
                    <div className='flex items-center justify-between mb-1'>
                      <span
                        className={`font-medium text-sm
                        ${event.color === 'blue' ? 'text-blue-400' : ''}
                        ${event.color === 'purple' ? 'text-purple-400' : ''}
                        ${event.color === 'cyan' ? 'text-cyan-400' : ''}
                        ${event.color === 'yellow' ? 'text-yellow-400' : ''}
                        ${event.color === 'green' ? 'text-green-400' : ''}
                        ${event.color === 'emerald' ? 'text-emerald-400' : ''}
                        ${event.color === 'red' ? 'text-red-400' : ''}
                        ${event.color === 'gray' ? 'text-gray-400' : ''}
                      `}
                      >
                        {event.label}
                      </span>
                      <span className='text-xs text-gray-500'>
                        {event.timestamp ? formatDate(event.timestamp) : '-'}
                      </span>
                    </div>
                    {event.description && (
                      <p className='text-xs text-gray-400'>{event.description}</p>
                    )}
                    {event.crypto_tx_hash && (
                      <div className='mt-2 flex items-center gap-2'>
                        <span className='text-xs text-gray-500'>TX:</span>
                        <code className='text-xs text-emerald-400 font-mono break-all flex-1'>
                          {event.crypto_tx_hash}
                        </code>
                        <CopyButton text={event.crypto_tx_hash} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        {/* Invoice Details */}
        <div className='bg-gray-800/50 rounded-xl border border-gray-700/50 p-4'>
          <div className='flex items-center gap-2 mb-4'>
            <FileText className='w-5 h-5 text-purple-400' />
            <h2 className='text-lg font-semibold text-white'>Dados da Fatura</h2>
          </div>

          <div className='space-y-4'>
            {/* Crypto Amount */}
            <div className='p-4 bg-gray-900/50 rounded-xl'>
              <div className='flex items-center gap-3'>
                {cryptoLogo && (
                  <img src={cryptoLogo} alt={invoice.crypto_currency} className='w-10 h-10' />
                )}
                <div>
                  <p className='text-2xl font-bold text-white'>
                    {formatCrypto(invoice.crypto_amount)} {invoice.crypto_currency}
                  </p>
                  <p className='text-sm text-gray-400'>
                    Rede: {invoice.crypto_network || 'Padrao'}
                  </p>
                </div>
              </div>
            </div>

            {/* Values */}
            <div className='grid grid-cols-2 gap-3'>
              <div className='p-3 bg-gray-900/50 rounded-lg'>
                <p className='text-xs text-gray-500'>Valor Base</p>
                <p className='text-lg font-semibold text-white'>
                  {formatBRL(invoice.base_amount_brl)}
                </p>
              </div>
              <div className='p-3 bg-gray-900/50 rounded-lg'>
                <p className='text-xs text-gray-500'>
                  Taxa Servico ({invoice.service_fee_percent}%)
                </p>
                <p className='text-lg font-semibold text-yellow-400'>
                  {formatBRL(invoice.service_fee_brl)}
                </p>
              </div>
              <div className='p-3 bg-gray-900/50 rounded-lg'>
                <p className='text-xs text-gray-500'>Taxa Rede ({invoice.network_fee_percent}%)</p>
                <p className='text-lg font-semibold text-yellow-400'>
                  {formatBRL(invoice.network_fee_brl)}
                </p>
              </div>
              <div className='p-3 bg-emerald-900/30 rounded-lg border border-emerald-700/50'>
                <p className='text-xs text-emerald-400'>Total a Pagar</p>
                <p className='text-lg font-bold text-emerald-400'>
                  {formatBRL(invoice.total_amount_brl)}
                </p>
              </div>
            </div>

            {/* Rates */}
            <div className='grid grid-cols-2 gap-3 text-sm'>
              <InfoRow
                icon={<Hash className='w-4 h-4 text-gray-400' />}
                label='Cotacao USD'
                value={`$${invoice.usd_rate?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '-'}`}
              />
              <InfoRow
                icon={<Hash className='w-4 h-4 text-gray-400' />}
                label='Cotacao BRL'
                value={`R$ ${invoice.brl_rate?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '-'}`}
              />
            </div>

            {/* Dates */}
            <div className='space-y-3'>
              <InfoRow
                icon={<Calendar className='w-4 h-4 text-gray-400' />}
                label='Criada em'
                value={formatDate(invoice.created_at)}
              />
              <InfoRow
                icon={<Clock className='w-4 h-4 text-gray-400' />}
                label='Expira em'
                value={formatDate(invoice.expires_at)}
              />
            </div>

            {/* Checkout Link */}
            {invoice.checkout_url && (
              <div className='p-3 bg-purple-900/30 rounded-lg border border-purple-700/50'>
                <p className='text-xs text-purple-400 mb-2 flex items-center gap-1'>
                  <ExternalLink className='w-3 h-3' /> Link de Checkout
                </p>
                <div className='flex items-start gap-4'>
                  {/* QR Code do Checkout */}
                  <div className='bg-white p-2 rounded-lg shrink-0'>
                    <QRCodeSVG value={invoice.checkout_url} size={100} />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs text-gray-500 mb-2'>
                      Compartilhe este link ou QR Code com o pagador
                    </p>
                    <div className='flex items-center gap-2'>
                      <a
                        href={invoice.checkout_url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-sm text-purple-300 hover:text-purple-100 underline truncate flex-1'
                      >
                        {invoice.checkout_url}
                      </a>
                      <CopyButton text={invoice.checkout_url} />
                      <a
                        href={invoice.checkout_url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='p-2 bg-purple-600/30 rounded-lg hover:bg-purple-600/50 transition-colors'
                        title='Abrir checkout'
                      >
                        <ExternalLink className='w-4 h-4 text-purple-400' />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Beneficiary */}
            <div className='p-3 bg-gray-900/50 rounded-lg'>
              <p className='text-xs text-gray-500 mb-1'>Beneficiario</p>
              <p className='text-sm text-white font-medium'>{invoice.beneficiary_name}</p>
              <p className='text-xs text-gray-400'>{invoice.beneficiary_email}</p>
            </div>
          </div>
        </div>

        {/* Payer Details */}
        <div className='bg-gray-800/50 rounded-xl border border-gray-700/50 p-4'>
          <div className='flex items-center gap-2 mb-4'>
            {payer?.person_type === 'PJ' ? (
              <Building className='w-5 h-5 text-purple-400' />
            ) : (
              <User className='w-5 h-5 text-purple-400' />
            )}
            <h2 className='text-lg font-semibold text-white'>
              Dados do Pagador ({payer?.person_type === 'PJ' ? 'Pessoa Juridica' : 'Pessoa Fisica'})
            </h2>
          </div>

          {payer ? (
            <div className='space-y-3'>
              {payer.person_type === 'PF' ? (
                <>
                  <InfoRow
                    icon={<User className='w-4 h-4 text-gray-400' />}
                    label='Nome Completo'
                    value={payer.full_name}
                  />
                  <InfoRow
                    icon={<FileText className='w-4 h-4 text-gray-400' />}
                    label='CPF'
                    value={
                      <span className='flex items-center gap-2'>
                        {formatDocument(payer.cpf)}
                        {payer.cpf && <CopyButton text={payer.cpf} />}
                      </span>
                    }
                  />
                  <InfoRow
                    icon={<Calendar className='w-4 h-4 text-gray-400' />}
                    label='Data de Nascimento'
                    value={
                      payer.birth_date
                        ? new Date(payer.birth_date).toLocaleDateString('pt-BR')
                        : '-'
                    }
                  />
                  <InfoRow
                    icon={<Phone className='w-4 h-4 text-gray-400' />}
                    label='Telefone'
                    value={payer.phone}
                  />
                  <InfoRow
                    icon={<Mail className='w-4 h-4 text-gray-400' />}
                    label='Email'
                    value={payer.email}
                  />
                </>
              ) : (
                <>
                  <InfoRow
                    icon={<Building className='w-4 h-4 text-gray-400' />}
                    label='Razao Social'
                    value={payer.company_name}
                  />
                  <InfoRow
                    icon={<FileText className='w-4 h-4 text-gray-400' />}
                    label='CNPJ'
                    value={
                      <span className='flex items-center gap-2'>
                        {formatDocument(payer.cnpj)}
                        {payer.cnpj && <CopyButton text={payer.cnpj} />}
                      </span>
                    }
                  />
                  <InfoRow
                    icon={<Building className='w-4 h-4 text-gray-400' />}
                    label='Nome Fantasia'
                    value={payer.trade_name}
                  />
                  <InfoRow
                    icon={<Phone className='w-4 h-4 text-gray-400' />}
                    label='Telefone'
                    value={payer.business_phone}
                  />
                  <InfoRow
                    icon={<Mail className='w-4 h-4 text-gray-400' />}
                    label='Email'
                    value={payer.business_email}
                  />
                  <InfoRow
                    icon={<User className='w-4 h-4 text-gray-400' />}
                    label='Responsavel'
                    value={payer.responsible_name}
                  />
                  <InfoRow
                    icon={<FileText className='w-4 h-4 text-gray-400' />}
                    label='CPF Responsavel'
                    value={formatDocument(payer.responsible_cpf)}
                  />
                </>
              )}

              {/* Address */}
              <div className='pt-3 border-t border-gray-700/50'>
                <p className='text-xs text-gray-500 mb-2 flex items-center gap-1'>
                  <MapPin className='w-3 h-3' /> Endereco
                </p>
                <p className='text-sm text-white'>
                  {payer.street}, {payer.number}
                  {payer.complement ? ` - ${payer.complement}` : ''}
                </p>
                <p className='text-sm text-gray-400'>
                  {payer.neighborhood} - {payer.city}/{payer.state}
                </p>
                <p className='text-sm text-gray-400'>CEP: {payer.zip_code}</p>
              </div>

              {/* Compliance */}
              <div className='pt-3 border-t border-gray-700/50'>
                <p className='text-xs text-gray-500 mb-2 flex items-center gap-1'>
                  <ShieldCheck className='w-3 h-3' /> Compliance
                </p>
                <div className='space-y-2 text-xs'>
                  <p className='text-gray-400'>
                    <span className='text-gray-500'>IP:</span> {payer.ip_address || '-'}
                  </p>
                  <p className='text-gray-400'>
                    <span className='text-gray-500'>Termos aceitos em:</span>{' '}
                    {formatDate(payer.terms_accepted_at)}
                  </p>
                  <p className='text-gray-400'>
                    <span className='text-gray-500'>Versao dos termos:</span>{' '}
                    {payer.terms_version || '-'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className='text-center py-8'>
              <User className='w-12 h-12 text-gray-600 mx-auto mb-2' />
              <p className='text-gray-400'>Dados do pagador nao preenchidos</p>
            </div>
          )}
        </div>

        {/* Payment Details */}
        <div className='bg-gray-800/50 rounded-xl border border-gray-700/50 p-4'>
          <div className='flex items-center gap-2 mb-4'>
            <Banknote className='w-5 h-5 text-purple-400' />
            <h2 className='text-lg font-semibold text-white'>Dados do Pagamento PIX</h2>
          </div>

          {payment ? (
            <div className='space-y-3'>
              <InfoRow
                icon={<Hash className='w-4 h-4 text-gray-400' />}
                label='Status'
                value={
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      payment.status === 'PAID'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {payment.status === 'PAID' ? 'Pago' : 'Pendente'}
                  </span>
                }
              />
              <InfoRow
                icon={<Banknote className='w-4 h-4 text-gray-400' />}
                label='Valor'
                value={formatBRL(payment.amount_brl)}
              />
              <InfoRow
                icon={<Hash className='w-4 h-4 text-gray-400' />}
                label='Chave PIX'
                value={
                  <span className='flex items-center gap-2'>
                    {payment.pix_key}
                    {payment.pix_key && <CopyButton text={payment.pix_key} />}
                  </span>
                }
              />

              {/* PIX QR Code e Copia-e-Cola */}
              {payment.pix_qrcode && (
                <div className='pt-3 border-t border-gray-700/50'>
                  <p className='text-xs text-gray-500 mb-2 flex items-center gap-1'>
                    <Hash className='w-3 h-3' /> PIX Copia e Cola
                  </p>
                  <div className='bg-gray-900/50 rounded-lg p-3'>
                    <div className='flex items-start gap-2'>
                      <p className='text-xs text-gray-400 font-mono break-all flex-1'>
                        {payment.pix_qrcode.substring(0, 100)}...
                      </p>
                      <CopyButton text={payment.pix_qrcode} />
                    </div>
                  </div>
                </div>
              )}

              {/* QR Code Image */}
              {payment.pix_qrcode_image && (
                <div className='pt-3 border-t border-gray-700/50'>
                  <p className='text-xs text-gray-500 mb-2 flex items-center gap-1'>
                    <Hash className='w-3 h-3' /> QR Code PIX
                  </p>
                  <div className='bg-white p-3 rounded-lg inline-block'>
                    <img
                      src={
                        payment.pix_qrcode_image.startsWith('data:')
                          ? payment.pix_qrcode_image
                          : `data:image/png;base64,${payment.pix_qrcode_image}`
                      }
                      alt='QR Code PIX'
                      className='w-40 h-40'
                    />
                  </div>
                </div>
              )}

              {/* Pagador confirmou pagamento */}
              {payment.payer_confirmed_at && (
                <InfoRow
                  icon={<CheckCircle className='w-4 h-4 text-blue-400' />}
                  label='Pagador confirmou em'
                  value={
                    <span className='text-blue-400'>{formatDate(payment.payer_confirmed_at)}</span>
                  }
                />
              )}

              {payment.bank_transaction_id && (
                <InfoRow
                  icon={<Hash className='w-4 h-4 text-gray-400' />}
                  label='ID Transacao Banco'
                  value={
                    <span className='flex items-center gap-2'>
                      {payment.bank_transaction_id}
                      <CopyButton text={payment.bank_transaction_id} />
                    </span>
                  }
                />
              )}
              {payment.paid_at && (
                <InfoRow
                  icon={<Calendar className='w-4 h-4 text-gray-400' />}
                  label='Pago em'
                  value={formatDate(payment.paid_at)}
                />
              )}
              {payment.payer_name_from_bank && (
                <InfoRow
                  icon={<User className='w-4 h-4 text-gray-400' />}
                  label='Nome no Banco'
                  value={payment.payer_name_from_bank}
                />
              )}
              {payment.payer_document_from_bank && (
                <InfoRow
                  icon={<FileText className='w-4 h-4 text-gray-400' />}
                  label='Doc. no Banco'
                  value={formatDocument(payment.payer_document_from_bank)}
                />
              )}
            </div>
          ) : (
            <div className='text-center py-8'>
              <Banknote className='w-12 h-12 text-gray-600 mx-auto mb-2' />
              <p className='text-gray-400'>PIX ainda nao gerado</p>
            </div>
          )}
        </div>

        {/* Approval Details */}
        <div className='bg-gray-800/50 rounded-xl border border-gray-700/50 p-4'>
          <div className='flex items-center gap-2 mb-4'>
            <ShieldCheck className='w-5 h-5 text-purple-400' />
            <h2 className='text-lg font-semibold text-white'>Aprovacao</h2>
          </div>

          {approval ? (
            <div className='space-y-3'>
              <InfoRow
                icon={
                  approval.action === 'APPROVED' ? (
                    <CheckCircle className='w-4 h-4 text-green-400' />
                  ) : (
                    <XCircle className='w-4 h-4 text-red-400' />
                  )
                }
                label='Acao'
                value={
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      approval.action === 'APPROVED'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {approval.action === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                  </span>
                }
              />
              <InfoRow
                icon={<User className='w-4 h-4 text-gray-400' />}
                label='Aprovado por'
                value={approval.approved_by_name}
              />
              <InfoRow
                icon={<Calendar className='w-4 h-4 text-gray-400' />}
                label='Data'
                value={formatDate(approval.created_at)}
              />
              {approval.crypto_tx_hash && (
                <InfoRow
                  icon={<ExternalLink className='w-4 h-4 text-gray-400' />}
                  label='Hash da Transacao'
                  value={
                    <span className='flex items-center gap-2'>
                      <span className='font-mono text-xs truncate max-w-[200px]'>
                        {approval.crypto_tx_hash}
                      </span>
                      <CopyButton text={approval.crypto_tx_hash} />
                    </span>
                  }
                />
              )}
              {approval.wallet_address && (
                <InfoRow
                  icon={<Wallet className='w-4 h-4 text-gray-400' />}
                  label='Carteira Destino'
                  value={
                    <span className='flex items-center gap-2'>
                      <span className='font-mono text-xs truncate max-w-[200px]'>
                        {approval.wallet_address}
                      </span>
                      <CopyButton text={approval.wallet_address} />
                    </span>
                  }
                />
              )}
              {approval.rejection_reason && (
                <InfoRow
                  icon={<AlertCircle className='w-4 h-4 text-red-400' />}
                  label='Motivo da Rejeicao'
                  value={<span className='text-red-400'>{approval.rejection_reason}</span>}
                />
              )}
              {approval.notes && (
                <InfoRow
                  icon={<FileText className='w-4 h-4 text-gray-400' />}
                  label='Observacoes'
                  value={approval.notes}
                />
              )}
            </div>
          ) : (
            <div className='text-center py-8'>
              <ShieldCheck className='w-12 h-12 text-gray-600 mx-auto mb-2' />
              <p className='text-gray-400'>Aguardando aprovacao</p>
            </div>
          )}
        </div>
      </div>

      {/* Blockchain Transaction Data */}
      {invoice.crypto_tx_hash && (
        <div className='bg-gradient-to-br from-purple-900/30 to-indigo-900/20 rounded-xl border border-purple-700/50 p-4'>
          <div className='flex items-center gap-2 mb-4'>
            <Link className='w-5 h-5 text-purple-400' />
            <h2 className='text-lg font-semibold text-white'>Transação Blockchain</h2>
            <span className='ml-auto text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400'>
              Crypto Enviada
            </span>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* TX Hash */}
            <div className='p-3 bg-gray-900/50 rounded-lg col-span-full'>
              <p className='text-xs text-gray-500 mb-1'>Hash da Transação (TX)</p>
              <div className='flex items-center gap-2'>
                <span className='font-mono text-sm text-white truncate flex-1'>
                  {invoice.crypto_tx_hash}
                </span>
                <CopyButton text={invoice.crypto_tx_hash} />
                {invoice.crypto_explorer_url && (
                  <a
                    href={invoice.crypto_explorer_url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='p-2 bg-purple-600/30 rounded-lg hover:bg-purple-600/50 transition-colors'
                    title='Ver no Explorer'
                  >
                    <ExternalLink className='w-4 h-4 text-purple-400' />
                  </a>
                )}
              </div>
            </div>

            {/* Wallet Address */}
            <div className='p-3 bg-gray-900/50 rounded-lg'>
              <p className='text-xs text-gray-500 mb-1'>Carteira Destino</p>
              <div className='flex items-center gap-2'>
                <Wallet className='w-4 h-4 text-gray-400' />
                <span className='font-mono text-sm text-white truncate'>
                  {invoice.crypto_wallet_address || '-'}
                </span>
                {invoice.crypto_wallet_address && (
                  <CopyButton text={invoice.crypto_wallet_address} />
                )}
              </div>
            </div>

            {/* Network */}
            <div className='p-3 bg-gray-900/50 rounded-lg'>
              <p className='text-xs text-gray-500 mb-1'>Rede Blockchain</p>
              <div className='flex items-center gap-2'>
                <Globe className='w-4 h-4 text-gray-400' />
                <span className='text-sm text-white'>
                  {invoice.crypto_tx_network?.toUpperCase() || invoice.crypto_network || '-'}
                </span>
              </div>
            </div>

            {/* Sent At */}
            <div className='p-3 bg-gray-900/50 rounded-lg'>
              <p className='text-xs text-gray-500 mb-1'>Data do Envio</p>
              <div className='flex items-center gap-2'>
                <Clock className='w-4 h-4 text-gray-400' />
                <span className='text-sm text-white'>
                  {invoice.crypto_sent_at ? formatDate(invoice.crypto_sent_at) : '-'}
                </span>
              </div>
            </div>

            {/* Amount */}
            <div className='p-3 bg-gray-900/50 rounded-lg'>
              <p className='text-xs text-gray-500 mb-1'>Valor Enviado</p>
              <div className='flex items-center gap-2'>
                {cryptoLogo && (
                  <img src={cryptoLogo} alt={invoice.crypto_currency} className='w-5 h-5' />
                )}
                <span className='text-sm font-bold text-emerald-400'>
                  {formatCrypto(invoice.crypto_amount)} {invoice.crypto_currency}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Payment Modal */}
      {showConfirmModal && (
        <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4'>
          <div className='bg-gray-800 rounded-xl w-full max-w-md p-6'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center'>
                <Banknote className='w-5 h-5 text-blue-400' />
              </div>
              <h3 className='text-lg font-semibold text-white'>Confirmar Pagamento PIX</h3>
            </div>

            <p className='text-gray-400 text-sm mb-4'>
              Confirme que o pagamento PIX de {formatBRL(invoice.total_amount_brl)} foi recebido na
              conta.
            </p>

            <div className='mb-4'>
              <label htmlFor='bank-tx-id' className='block text-sm text-gray-400 mb-2'>
                ID da Transacao Bancaria *
              </label>
              <input
                id='bank-tx-id'
                type='text'
                value={bankTransactionId}
                onChange={e => setBankTransactionId(e.target.value)}
                placeholder='Ex: E12345678901234567890123456789012'
                className='w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50'
              />
            </div>

            <div className='flex gap-3'>
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setBankTransactionId('')
                }}
                disabled={actionLoading}
                className='flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors'
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={actionLoading || !bankTransactionId.trim()}
                className='flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors'
              >
                {actionLoading ? 'Confirmando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal - Assinar e Enviar Crypto */}
      {showApproveModal && (
        <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4'>
          <div className='bg-gray-800 rounded-xl w-full max-w-lg p-6'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='w-10 h-10 bg-emerald-600/20 rounded-full flex items-center justify-center'>
                <Wallet className='w-5 h-5 text-emerald-400' />
              </div>
              <div>
                <h3 className='text-lg font-semibold text-white'>Assinar e Enviar Crypto</h3>
                <p className='text-xs text-gray-400'>Transacao blockchain sera executada</p>
              </div>
            </div>

            {/* Transaction Summary */}
            <div className='p-4 bg-gray-900/50 rounded-lg border border-gray-700/50 mb-4'>
              <div className='flex items-center gap-3 mb-3'>
                {cryptoLogo && (
                  <img src={cryptoLogo} alt={invoice.crypto_currency} className='w-8 h-8' />
                )}
                <div>
                  <p className='text-xl font-bold text-white'>
                    {formatCrypto(invoice.crypto_amount)} {invoice.crypto_currency}
                  </p>
                  <p className='text-xs text-gray-400'>
                    Valor: {formatBRL(invoice.total_amount_brl)}
                  </p>
                </div>
              </div>

              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-gray-400'>Beneficiario:</span>
                  <span className='text-white font-medium'>{invoice.beneficiary_name}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-400'>Fatura:</span>
                  <span className='text-white font-mono'>{invoice.invoice_number}</span>
                </div>
              </div>
            </div>

            {/* Network Selection */}
            <div className='mb-4'>
              <label htmlFor='network-select' className='block text-sm text-gray-400 mb-2'>
                Rede Blockchain *
              </label>
              <select
                id='network-select'
                value={selectedNetwork}
                onChange={e => setSelectedNetwork(e.target.value)}
                className='w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50'
              >
                {getAvailableNetworksForSymbol(invoice.crypto_currency).map(net => (
                  <option key={net.value} value={net.value}>
                    {net.label}
                  </option>
                ))}
              </select>
              <p className='text-xs text-gray-500 mt-1'>
                A crypto sera enviada pela rede {selectedNetwork.toUpperCase()}
              </p>
            </div>

            {/* Warning Box */}
            <div className='p-3 bg-yellow-900/20 rounded-lg border border-yellow-700/50 mb-4'>
              <div className='flex items-start gap-2'>
                <AlertCircle className='w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0' />
                <div className='text-xs text-yellow-300'>
                  <p className='font-medium'>Acao irreversivel</p>
                  <p className='text-yellow-400/80 mt-1'>
                    A transacao blockchain sera assinada e enviada automaticamente. Certifique-se de
                    que o pagamento PIX foi confirmado.
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className='mb-4'>
              <label htmlFor='approve-notes' className='block text-sm text-gray-400 mb-2'>
                Observacoes (opcional)
              </label>
              <textarea
                id='approve-notes'
                value={approveNotes}
                onChange={e => setApproveNotes(e.target.value)}
                placeholder='Adicione observacoes se necessario...'
                rows={2}
                className='w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none'
              />
            </div>

            <div className='flex gap-3'>
              <button
                onClick={() => {
                  setShowApproveModal(false)
                  setApproveNotes('')
                }}
                disabled={actionLoading}
                className='flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors'
              >
                Cancelar
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className='flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors'
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className='w-4 h-4 animate-spin' />
                    Assinando...
                  </>
                ) : (
                  <>
                    <CheckCircle className='w-4 h-4' />
                    Assinar e Enviar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4'>
          <div className='bg-gray-800 rounded-xl w-full max-w-md p-6'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center'>
                <XCircle className='w-5 h-5 text-red-400' />
              </div>
              <h3 className='text-lg font-semibold text-white'>Rejeitar Fatura</h3>
            </div>

            <div className='p-4 bg-red-900/20 rounded-lg border border-red-700/50 mb-4'>
              <p className='text-sm text-red-300'>
                Ao rejeitar, o pagador sera notificado e devera solicitar estorno ao banco.
              </p>
            </div>

            <div className='mb-4'>
              <label htmlFor='reject-reason' className='block text-sm text-gray-400 mb-2'>
                Motivo da Rejeicao *
              </label>
              <select
                id='reject-reason'
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className='w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500/50'
              >
                <option value=''>Selecione um motivo...</option>
                <option value='Pagamento não identificado'>Pagamento nao identificado</option>
                <option value='Valor incorreto'>Valor incorreto</option>
                <option value='Documento inválido'>Documento invalido</option>
                <option value='Suspeita de fraude'>Suspeita de fraude</option>
                <option value='Dados inconsistentes'>Dados inconsistentes</option>
                <option value='Outro'>Outro</option>
              </select>
            </div>

            <div className='mb-4'>
              <label htmlFor='reject-notes' className='block text-sm text-gray-400 mb-2'>
                Observacoes adicionais (opcional)
              </label>
              <textarea
                id='reject-notes'
                value={rejectNotes}
                onChange={e => setRejectNotes(e.target.value)}
                placeholder='Detalhes adicionais...'
                rows={3}
                className='w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none'
              />
            </div>

            <div className='flex gap-3'>
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason('')
                  setRejectNotes('')
                }}
                disabled={actionLoading}
                className='flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors'
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className='flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors'
              >
                {actionLoading ? 'Rejeitando...' : 'Rejeitar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Completed Modal */}
      {showMarkCompletedModal && (
        <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4'>
          <div className='bg-gray-800 rounded-xl w-full max-w-md p-6'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='w-10 h-10 bg-cyan-600/20 rounded-full flex items-center justify-center'>
                <Check className='w-5 h-5 text-cyan-400' />
              </div>
              <h3 className='text-lg font-semibold text-white'>Marcar como Concluído</h3>
            </div>

            <div className='p-4 bg-cyan-900/20 rounded-lg border border-cyan-700/50 mb-4'>
              <div className='flex items-start gap-2'>
                <AlertCircle className='w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5' />
                <div>
                  <p className='text-sm text-cyan-300'>
                    Use esta opção quando a crypto JÁ FOI ENVIADA e você só precisa atualizar o
                    status no sistema.
                  </p>
                  <p className='text-sm text-cyan-300/80 mt-2'>
                    Esta ação NÃO enviará crypto novamente.
                  </p>
                </div>
              </div>
            </div>

            <div className='mb-4'>
              <label htmlFor='mark-tx-hash' className='block text-sm text-gray-400 mb-2'>
                Hash da Transação (TX) *
              </label>
              <input
                id='mark-tx-hash'
                type='text'
                value={markCompletedTxHash}
                onChange={e => setMarkCompletedTxHash(e.target.value)}
                placeholder='0x... ou txid da transação'
                className='w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono text-sm'
              />
            </div>

            <div className='mb-4'>
              <label htmlFor='mark-network' className='block text-sm text-gray-400 mb-2'>
                Rede Blockchain *
              </label>
              <select
                id='mark-network'
                value={markCompletedNetwork}
                onChange={e => setMarkCompletedNetwork(e.target.value)}
                className='w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50'
              >
                <option value='polygon'>Polygon</option>
                <option value='ethereum'>Ethereum</option>
                <option value='base'>Base</option>
                <option value='bsc'>BSC</option>
                <option value='bitcoin'>Bitcoin</option>
                <option value='litecoin'>Litecoin</option>
                <option value='dogecoin'>Dogecoin</option>
                <option value='tron'>Tron</option>
              </select>
            </div>

            <div className='mb-4'>
              <label htmlFor='mark-notes' className='block text-sm text-gray-400 mb-2'>
                Observações (opcional)
              </label>
              <textarea
                id='mark-notes'
                value={markCompletedNotes}
                onChange={e => setMarkCompletedNotes(e.target.value)}
                placeholder='Ex: Crypto já enviada manualmente em...'
                rows={2}
                className='w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none'
              />
            </div>

            <div className='flex gap-3'>
              <button
                onClick={() => {
                  setShowMarkCompletedModal(false)
                  setMarkCompletedTxHash('')
                  setMarkCompletedNetwork('polygon')
                  setMarkCompletedNotes('')
                }}
                disabled={actionLoading}
                className='flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors'
              >
                Cancelar
              </button>
              <button
                onClick={handleMarkCompleted}
                disabled={actionLoading || !markCompletedTxHash.trim()}
                className='flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors'
              >
                {actionLoading ? 'Salvando...' : 'Marcar Concluído'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
