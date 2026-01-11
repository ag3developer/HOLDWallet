/**
 * WolkPay Admin Detail Page
 * =========================
 *
 * Pagina de detalhes da fatura com acoes de aprovacao/rejeicao.
 */

import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
} from 'lucide-react'
import {
  getInvoiceDetails,
  confirmPayment,
  approveInvoice,
  rejectInvoice,
  type WolkPayInvoiceDetail,
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

export const AdminWolkPayDetailPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<WolkPayInvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [bankTransactionId, setBankTransactionId] = useState('')
  const [approveNotes, setApproveNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [rejectNotes, setRejectNotes] = useState('')
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
      const result = await getInvoiceDetails(id)
      setData(result)
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
            <button
              onClick={() => setShowConfirmModal(true)}
              className='flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors'
            >
              <Banknote className='w-4 h-4' />
              Confirmar Pagamento PIX
            </button>
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
    </div>
  )
}
