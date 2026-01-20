import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  X,
  Send,
  Wallet,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  ShieldAlert,
  ArrowRight,
  Info,
} from 'lucide-react'
import { apiClient } from '@/services/api'

// Redes suportadas
const SUPPORTED_NETWORKS = [
  { value: 'polygon', label: 'Polygon', symbol: 'MATIC' },
  { value: 'ethereum', label: 'Ethereum', symbol: 'ETH' },
  { value: 'bsc', label: 'BNB Smart Chain', symbol: 'BNB' },
  { value: 'base', label: 'Base', symbol: 'ETH' },
  { value: 'avalanche', label: 'Avalanche', symbol: 'AVAX' },
  { value: 'bitcoin', label: 'Bitcoin', symbol: 'BTC' },
  { value: 'tron', label: 'Tron', symbol: 'TRX' },
  { value: 'solana', label: 'Solana', symbol: 'SOL' },
  { value: 'litecoin', label: 'Litecoin', symbol: 'LTC' },
  { value: 'dogecoin', label: 'Dogecoin', symbol: 'DOGE' },
]

// Tokens por rede
const TOKENS_BY_NETWORK: Record<string, { value: string; label: string }[]> = {
  polygon: [
    { value: 'native', label: 'MATIC (Native)' },
    { value: 'USDT', label: 'USDT' },
    { value: 'USDC', label: 'USDC' },
    { value: 'DAI', label: 'DAI' },
  ],
  ethereum: [
    { value: 'native', label: 'ETH (Native)' },
    { value: 'USDT', label: 'USDT' },
    { value: 'USDC', label: 'USDC' },
    { value: 'DAI', label: 'DAI' },
  ],
  bsc: [
    { value: 'native', label: 'BNB (Native)' },
    { value: 'USDT', label: 'USDT' },
    { value: 'USDC', label: 'USDC' },
  ],
  base: [
    { value: 'native', label: 'ETH (Native)' },
    { value: 'USDC', label: 'USDC' },
  ],
  avalanche: [
    { value: 'native', label: 'AVAX (Native)' },
    { value: 'USDT', label: 'USDT' },
    { value: 'USDC', label: 'USDC' },
  ],
  bitcoin: [{ value: 'native', label: 'BTC (Native)' }],
  tron: [
    { value: 'native', label: 'TRX (Native)' },
    { value: 'USDT', label: 'USDT (TRC-20)' },
  ],
  solana: [{ value: 'native', label: 'SOL (Native)' }],
  litecoin: [{ value: 'native', label: 'LTC (Native)' }],
  dogecoin: [{ value: 'native', label: 'DOGE (Native)' }],
}

interface SendModalProps {
  isOpen: boolean
  onClose: () => void
  walletName?: string
  preselectedNetwork?: string
  preselectedToken?: string
  availableBalance?: number
}

interface SendResponse {
  success: boolean
  message: string
  data?: {
    tx_hash: string
    status: string
    explorer_url: string
    from_address: string
    to_address: string
    amount: string
    token: string
    network: string
  }
}

export const SystemWalletSendModal: React.FC<SendModalProps> = ({
  isOpen,
  onClose,
  walletName = 'main_fees_wallet',
  preselectedNetwork,
  preselectedToken,
  availableBalance,
}) => {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<'form' | 'confirm' | 'success' | 'error'>('form')
  const [copied, setCopied] = useState(false)

  // Form state
  const [network, setNetwork] = useState(preselectedNetwork || 'polygon')
  const [token, setToken] = useState(preselectedToken || 'native')
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')

  // Result state
  const [txResult, setTxResult] = useState<SendResponse['data'] | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  // Reset quando modal abre
  useEffect(() => {
    if (isOpen) {
      setStep('form')
      setToAddress('')
      setAmount('')
      setMemo('')
      setTwoFactorCode('')
      setTxResult(null)
      setErrorMessage('')
      if (preselectedNetwork) setNetwork(preselectedNetwork)
      if (preselectedToken) setToken(preselectedToken)
    }
  }, [isOpen, preselectedNetwork, preselectedToken])

  // Atualiza tokens quando muda rede
  useEffect(() => {
    const tokens = TOKENS_BY_NETWORK[network] || []
    if (tokens.length > 0 && !tokens.find(t => t.value === token)) {
      setToken(tokens[0].value)
    }
  }, [network, token])

  // Mutation para enviar
  const sendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<SendResponse>('/admin/system-blockchain-wallet/send', {
        wallet_name: walletName,
        network,
        to_address: toAddress.trim(),
        amount,
        token,
        memo: memo || undefined,
        two_factor_code: twoFactorCode || undefined,
      })
      return response.data
    },
    onSuccess: data => {
      if (data.success && data.data) {
        setTxResult(data.data)
        setStep('success')
        toast.success('Transacao enviada com sucesso!')
        // Invalida cache para atualizar saldos
        queryClient.invalidateQueries({ queryKey: ['admin-system-wallet-status'] })
      } else {
        setErrorMessage('Erro desconhecido ao enviar transacao')
        setStep('error')
      }
    },
    onError: (error: any) => {
      console.error('Erro ao enviar:', error)
      const detail = error.response?.data?.detail
      if (typeof detail === 'object') {
        setErrorMessage(detail.message || 'Erro ao enviar transacao')
      } else {
        setErrorMessage(detail || error.message || 'Erro ao enviar transacao')
      }
      setStep('error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validacoes basicas
    if (!toAddress.trim()) {
      toast.error('Endereco de destino obrigatorio')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Valor deve ser maior que zero')
      return
    }

    // Ir para confirmacao
    setStep('confirm')
  }

  const handleConfirm = () => {
    sendMutation.mutate()
  }

  const copyTxHash = async () => {
    if (txResult?.tx_hash) {
      await navigator.clipboard.writeText(txResult.tx_hash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getNetworkLabel = () => {
    return SUPPORTED_NETWORKS.find(n => n.value === network)?.label || network
  }

  const getTokenLabel = () => {
    const tokens = TOKENS_BY_NETWORK[network] || []
    return tokens.find(t => t.value === token)?.label || token
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* Backdrop */}
      <div className='absolute inset-0 bg-black/70 backdrop-blur-sm' onClick={onClose} />

      {/* Modal */}
      <div className='relative z-10 w-full max-w-lg mx-4 bg-[#1a1a2e] border border-[#2d2d44] rounded-2xl shadow-2xl'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-[#2d2d44]'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-orange-500/10 rounded-lg'>
              <Send className='w-5 h-5 text-orange-500' />
            </div>
            <div>
              <h2 className='text-xl font-bold text-white'>Enviar Crypto</h2>
              <p className='text-sm text-gray-400'>Carteira do Sistema</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-2 text-gray-400 hover:text-white hover:bg-[#2d2d44] rounded-lg transition-colors'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Content */}
        <div className='p-6'>
          {/* STEP: Form */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} className='space-y-5'>
              {/* Network Select */}
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>
                  Rede Blockchain
                </label>
                <select
                  value={network}
                  onChange={e => setNetwork(e.target.value)}
                  className='w-full bg-[#0d0d1a] border border-[#2d2d44] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500'
                >
                  {SUPPORTED_NETWORKS.map(net => (
                    <option key={net.value} value={net.value}>
                      {net.label} ({net.symbol})
                    </option>
                  ))}
                </select>
              </div>

              {/* Token Select */}
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>Token</label>
                <select
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  className='w-full bg-[#0d0d1a] border border-[#2d2d44] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500'
                >
                  {(TOKENS_BY_NETWORK[network] || []).map(tkn => (
                    <option key={tkn.value} value={tkn.value}>
                      {tkn.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* To Address */}
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>
                  Endereco de Destino
                </label>
                <input
                  type='text'
                  value={toAddress}
                  onChange={e => setToAddress(e.target.value)}
                  placeholder='0x... ou endereco da rede selecionada'
                  className='w-full bg-[#0d0d1a] border border-[#2d2d44] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500'
                />
              </div>

              {/* Amount */}
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>
                  Valor a Enviar
                </label>
                <div className='relative'>
                  <input
                    type='number'
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder='0.00'
                    step='any'
                    min='0'
                    className='w-full bg-[#0d0d1a] border border-[#2d2d44] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500'
                  />
                  {availableBalance !== undefined && (
                    <button
                      type='button'
                      onClick={() => setAmount(availableBalance.toString())}
                      className='absolute right-3 top-1/2 -translate-y-1/2 text-xs text-orange-500 hover:text-orange-400'
                    >
                      MAX
                    </button>
                  )}
                </div>
                {availableBalance !== undefined && (
                  <p className='text-xs text-gray-500 mt-1'>
                    Disponivel: {availableBalance.toFixed(6)} {getTokenLabel()}
                  </p>
                )}
              </div>

              {/* Memo */}
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>
                  Nota (opcional)
                </label>
                <input
                  type='text'
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  placeholder='Ex: Transfer para Ledger'
                  className='w-full bg-[#0d0d1a] border border-[#2d2d44] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500'
                />
              </div>

              {/* Warning */}
              <div className='flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg'>
                <AlertTriangle className='w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5' />
                <div className='text-sm text-yellow-200'>
                  <p className='font-medium mb-1'>Atencao</p>
                  <p className='text-yellow-200/70'>
                    Verifique cuidadosamente o endereco de destino. Transacoes blockchain sao
                    irreversiveis.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type='submit'
                className='w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2'
              >
                <ArrowRight className='w-5 h-5' />
                Continuar
              </button>
            </form>
          )}

          {/* STEP: Confirm */}
          {step === 'confirm' && (
            <div className='space-y-5'>
              <div className='text-center mb-6'>
                <div className='w-16 h-16 mx-auto bg-orange-500/10 rounded-full flex items-center justify-center mb-4'>
                  <ShieldAlert className='w-8 h-8 text-orange-500' />
                </div>
                <h3 className='text-lg font-bold text-white'>Confirmar Envio</h3>
                <p className='text-gray-400 text-sm'>Revise os detalhes antes de confirmar</p>
              </div>

              {/* Summary */}
              <div className='bg-[#0d0d1a] rounded-lg p-4 space-y-3'>
                <div className='flex justify-between'>
                  <span className='text-gray-400'>Rede:</span>
                  <span className='text-white font-medium'>{getNetworkLabel()}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-400'>Token:</span>
                  <span className='text-white font-medium'>{getTokenLabel()}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-400'>Valor:</span>
                  <span className='text-orange-500 font-bold'>{amount}</span>
                </div>
                <div className='border-t border-[#2d2d44] my-2' />
                <div>
                  <span className='text-gray-400 text-sm'>Destino:</span>
                  <p className='text-white font-mono text-sm break-all mt-1'>{toAddress}</p>
                </div>
                {memo && (
                  <div>
                    <span className='text-gray-400 text-sm'>Nota:</span>
                    <p className='text-gray-300 text-sm mt-1'>{memo}</p>
                  </div>
                )}
              </div>

              {/* 2FA Input (optional for now) */}
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>
                  Codigo 2FA (opcional)
                </label>
                <input
                  type='text'
                  value={twoFactorCode}
                  onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder='000000'
                  maxLength={6}
                  className='w-full bg-[#0d0d1a] border border-[#2d2d44] rounded-lg px-4 py-3 text-white text-center tracking-widest font-mono text-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500'
                />
              </div>

              {/* Action Buttons */}
              <div className='flex gap-3'>
                <button
                  onClick={() => setStep('form')}
                  disabled={sendMutation.isPending}
                  className='flex-1 py-3 bg-[#2d2d44] text-white font-medium rounded-lg hover:bg-[#3d3d54] transition-colors disabled:opacity-50'
                >
                  Voltar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={sendMutation.isPending}
                  className='flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50'
                >
                  {sendMutation.isPending ? (
                    <>
                      <Loader2 className='w-5 h-5 animate-spin' />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className='w-5 h-5' />
                      Confirmar Envio
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP: Success */}
          {step === 'success' && txResult && (
            <div className='space-y-5 text-center'>
              <div className='w-20 h-20 mx-auto bg-green-500/10 rounded-full flex items-center justify-center'>
                <CheckCircle className='w-10 h-10 text-green-500' />
              </div>

              <div>
                <h3 className='text-xl font-bold text-white mb-2'>Transacao Enviada!</h3>
                <p className='text-gray-400'>
                  Sua transacao foi enviada com sucesso e esta aguardando confirmacao na blockchain.
                </p>
              </div>

              {/* TX Details */}
              <div className='bg-[#0d0d1a] rounded-lg p-4 space-y-3 text-left'>
                <div>
                  <span className='text-gray-400 text-sm'>TX Hash:</span>
                  <div className='flex items-center gap-2 mt-1'>
                    <code className='text-green-400 text-sm font-mono break-all flex-1'>
                      {txResult.tx_hash}
                    </code>
                    <button
                      onClick={copyTxHash}
                      className='p-1.5 text-gray-400 hover:text-white bg-[#2d2d44] rounded'
                    >
                      {copied ? <Check className='w-4 h-4' /> : <Copy className='w-4 h-4' />}
                    </button>
                  </div>
                </div>

                <div className='flex justify-between'>
                  <span className='text-gray-400'>Status:</span>
                  <span className='text-yellow-500 font-medium'>Pendente</span>
                </div>

                <div className='flex justify-between'>
                  <span className='text-gray-400'>Valor:</span>
                  <span className='text-white font-medium'>
                    {txResult.amount} {txResult.token.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Explorer Link */}
              {txResult.explorer_url && (
                <a
                  href={txResult.explorer_url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-2 text-orange-500 hover:text-orange-400 transition-colors'
                >
                  <ExternalLink className='w-4 h-4' />
                  Ver no Explorer
                </a>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className='w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all'
              >
                Fechar
              </button>
            </div>
          )}

          {/* STEP: Error */}
          {step === 'error' && (
            <div className='space-y-5 text-center'>
              <div className='w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center'>
                <AlertTriangle className='w-10 h-10 text-red-500' />
              </div>

              <div>
                <h3 className='text-xl font-bold text-white mb-2'>Erro no Envio</h3>
                <p className='text-gray-400'>{errorMessage}</p>
              </div>

              {/* Action Buttons */}
              <div className='flex gap-3'>
                <button
                  onClick={() => setStep('form')}
                  className='flex-1 py-3 bg-[#2d2d44] text-white font-medium rounded-lg hover:bg-[#3d3d54] transition-colors'
                >
                  Tentar Novamente
                </button>
                <button
                  onClick={onClose}
                  className='flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all'
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SystemWalletSendModal
