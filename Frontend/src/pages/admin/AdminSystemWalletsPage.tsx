import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Wallet,
  Plus,
  RefreshCw,
  Lock,
  Unlock,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Shield,
  Flame,
  Snowflake,
  DollarSign,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  X,
  Zap,
} from 'lucide-react'
import { apiClient } from '@/services/api'

// Tipos
interface SystemWallet {
  id: string
  name: string
  wallet_type: 'cold' | 'hot' | 'fees'
  is_locked: boolean
  networks_count: number
  total_stables_usd: number
  created_at: string | null
}

interface WalletAddress {
  network: string
  address: string
  cryptocurrency: string
  cached_balance: number
  cached_usdt: number
  cached_usdc: number
  last_update: string | null
}

interface WalletsSummary {
  grand_total_stables_usd: number
  by_type: {
    cold: { count: number; total_stables: number; percentage: number; wallets: any[] }
    hot: { count: number; total_stables: number; percentage: number; wallets: any[] }
    fees: { count: number; total_stables: number; percentage: number; wallets: any[] }
  }
  recommendation: {
    status: string
    message: string
    action?: string
  }
}

// Fetch functions
const fetchWallets = async (): Promise<SystemWallet[]> => {
  const response = await apiClient.get('/admin/system-blockchain-wallet/wallets')
  return response.data.data || []
}

const fetchWalletsSummary = async (): Promise<WalletsSummary> => {
  const response = await apiClient.get('/admin/system-blockchain-wallet/wallets/summary')
  return response.data
}

const fetchWalletAddresses = async (walletName: string): Promise<WalletAddress[]> => {
  const response = await apiClient.get(
    `/admin/system-blockchain-wallet/wallets/${walletName}/addresses`
  )
  return response.data.data || []
}

// Componente de icone por tipo
const WalletTypeIcon: React.FC<{ type: string; className?: string }> = ({
  type,
  className = 'w-5 h-5',
}) => {
  switch (type) {
    case 'cold':
      return <Snowflake className={`${className} text-blue-500`} />
    case 'hot':
      return <Flame className={`${className} text-orange-500`} />
    case 'fees':
      return <DollarSign className={`${className} text-green-500`} />
    default:
      return <Wallet className={`${className} text-gray-500`} />
  }
}

// Modal de criar carteira
const CreateWalletModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}> = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('')
  const [type, setType] = useState<'cold' | 'hot'>('cold')
  const [mnemonic, setMnemonic] = useState<string | null>(null)
  const [showMnemonic, setShowMnemonic] = useState(false)
  const [copied, setCopied] = useState(false)

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(
        `/admin/system-blockchain-wallet/wallets/create?wallet_name=${encodeURIComponent(name)}&wallet_type=${type}`
      )
      return response.data
    },
    onSuccess: data => {
      if (data.data?.mnemonic) {
        setMnemonic(data.data.mnemonic)
        toast.success('Carteira criada! Guarde a mnemonic!')
      }
      onCreated()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao criar carteira')
    },
  })

  const handleClose = () => {
    setName('')
    setType('cold')
    setMnemonic(null)
    setShowMnemonic(false)
    onClose()
  }

  const copyMnemonic = async () => {
    if (mnemonic) {
      await navigator.clipboard.writeText(mnemonic)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      <div className='absolute inset-0 bg-black/70 backdrop-blur-sm' onClick={handleClose} />
      <div className='relative z-10 w-full max-w-lg mx-4 bg-[#1a1a2e] border border-[#2d2d44] rounded-2xl shadow-2xl'>
        <div className='flex items-center justify-between p-6 border-b border-[#2d2d44]'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-blue-500/10 rounded-lg'>
              <Plus className='w-5 h-5 text-blue-500' />
            </div>
            <h2 className='text-xl font-bold text-white'>Nova Carteira</h2>
          </div>
          <button onClick={handleClose} className='p-2 text-gray-400 hover:text-white rounded-lg'>
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-6 space-y-5'>
          {!mnemonic ? (
            <>
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>
                  Nome da Carteira
                </label>
                <input
                  type='text'
                  value={name}
                  onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  placeholder='ex: cold_wallet_01'
                  className='w-full bg-[#0d0d1a] border border-[#2d2d44] rounded-lg px-4 py-3 text-white'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>Tipo</label>
                <div className='grid grid-cols-2 gap-3'>
                  <button
                    onClick={() => setType('cold')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      type === 'cold'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-[#2d2d44] hover:border-blue-500/50'
                    }`}
                  >
                    <Snowflake className='w-8 h-8 text-blue-500 mx-auto mb-2' />
                    <p className='text-white font-medium'>COLD</p>
                    <p className='text-xs text-gray-400'>Armazenamento seguro</p>
                    <p className='text-xs text-blue-400 mt-1'>24 palavras</p>
                  </button>
                  <button
                    onClick={() => setType('hot')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      type === 'hot'
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-[#2d2d44] hover:border-orange-500/50'
                    }`}
                  >
                    <Flame className='w-8 h-8 text-orange-500 mx-auto mb-2' />
                    <p className='text-white font-medium'>HOT</p>
                    <p className='text-xs text-gray-400'>Operacional</p>
                    <p className='text-xs text-orange-400 mt-1'>12 palavras</p>
                  </button>
                </div>
              </div>

              <div className='flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg'>
                <AlertTriangle className='w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5' />
                <div className='text-sm text-yellow-200'>
                  <p className='font-medium'>Importante</p>
                  <p className='text-yellow-200/70'>
                    A frase de recuperacao sera exibida apenas uma vez. Guarde em local seguro!
                  </p>
                </div>
              </div>

              <button
                onClick={() => createMutation.mutate()}
                disabled={!name || createMutation.isPending}
                className='w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2'
              >
                {createMutation.isPending ? (
                  <RefreshCw className='w-5 h-5 animate-spin' />
                ) : (
                  <Plus className='w-5 h-5' />
                )}
                Criar Carteira
              </button>
            </>
          ) : (
            <>
              <div className='text-center'>
                <CheckCircle className='w-16 h-16 text-green-500 mx-auto mb-4' />
                <h3 className='text-xl font-bold text-white mb-2'>Carteira Criada!</h3>
                <p className='text-gray-400'>Guarde a frase de recuperacao abaixo</p>
              </div>

              <div className='bg-[#0d0d1a] rounded-lg p-4'>
                <div className='flex items-center justify-between mb-3'>
                  <span className='text-sm text-gray-400'>Frase de Recuperacao</span>
                  <button
                    onClick={() => setShowMnemonic(!showMnemonic)}
                    className='text-gray-400 hover:text-white'
                  >
                    {showMnemonic ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                  </button>
                </div>
                <p
                  className={`text-white font-mono text-sm break-all ${!showMnemonic && 'blur-sm'}`}
                >
                  {mnemonic}
                </p>
              </div>

              <button
                onClick={copyMnemonic}
                className='w-full py-3 bg-[#2d2d44] text-white font-medium rounded-lg hover:bg-[#3d3d54] flex items-center justify-center gap-2'
              >
                {copied ? <CheckCircle className='w-5 h-5' /> : <Copy className='w-5 h-5' />}
                {copied ? 'Copiado!' : 'Copiar Mnemonic'}
              </button>

              <button
                onClick={handleClose}
                className='w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-green-700'
              >
                Concluir
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente de carteira expandivel
const WalletCard: React.FC<{
  wallet: SystemWallet
  onRefresh: () => void
}> = ({ wallet, onRefresh }) => {
  const [expanded, setExpanded] = useState(false)
  const queryClient = useQueryClient()

  const { data: addresses, isLoading: loadingAddresses } = useQuery({
    queryKey: ['wallet-addresses', wallet.name],
    queryFn: () => fetchWalletAddresses(wallet.name),
    enabled: expanded,
  })

  const lockMutation = useMutation({
    mutationFn: async (lock: boolean) => {
      await apiClient.patch(
        `/admin/system-blockchain-wallet/wallets/${wallet.name}/lock?lock=${lock}`
      )
    },
    onSuccess: () => {
      toast.success(wallet.is_locked ? 'Carteira desbloqueada' : 'Carteira bloqueada')
      onRefresh()
    },
    onError: () => toast.error('Erro ao alterar bloqueio'),
  })

  return (
    <div className='bg-[#1a1a2e] border border-[#2d2d44] rounded-xl overflow-hidden'>
      <div
        className='p-4 flex items-center justify-between cursor-pointer hover:bg-[#2d2d44]/30'
        onClick={() => setExpanded(!expanded)}
      >
        <div className='flex items-center gap-4'>
          <div
            className={`p-3 rounded-lg ${
              wallet.wallet_type === 'cold'
                ? 'bg-blue-500/10'
                : wallet.wallet_type === 'hot'
                  ? 'bg-orange-500/10'
                  : 'bg-green-500/10'
            }`}
          >
            <WalletTypeIcon type={wallet.wallet_type} className='w-6 h-6' />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h3 className='text-white font-semibold'>{wallet.name}</h3>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  wallet.wallet_type === 'cold'
                    ? 'bg-blue-500/20 text-blue-400'
                    : wallet.wallet_type === 'hot'
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-green-500/20 text-green-400'
                }`}
              >
                {wallet.wallet_type.toUpperCase()}
              </span>
              {wallet.is_locked && <Lock className='w-4 h-4 text-red-400' />}
            </div>
            <p className='text-sm text-gray-400'>
              {wallet.networks_count} redes | ${wallet.total_stables_usd.toLocaleString()} em
              stables
            </p>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <button
            onClick={e => {
              e.stopPropagation()
              lockMutation.mutate(!wallet.is_locked)
            }}
            className={`p-2 rounded-lg transition-colors ${
              wallet.is_locked
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
            }`}
            title={wallet.is_locked ? 'Desbloquear' : 'Bloquear'}
          >
            {wallet.is_locked ? <Lock className='w-4 h-4' /> : <Unlock className='w-4 h-4' />}
          </button>
          {expanded ? (
            <ChevronUp className='w-5 h-5 text-gray-400' />
          ) : (
            <ChevronDown className='w-5 h-5 text-gray-400' />
          )}
        </div>
      </div>

      {expanded && (
        <div className='border-t border-[#2d2d44] p-4'>
          {loadingAddresses ? (
            <div className='flex items-center justify-center py-8'>
              <RefreshCw className='w-6 h-6 text-gray-400 animate-spin' />
            </div>
          ) : addresses && addresses.length > 0 ? (
            <div className='space-y-2'>
              {addresses.map(addr => (
                <div
                  key={addr.network}
                  className='flex items-center justify-between p-3 bg-[#0d0d1a] rounded-lg'
                >
                  <div className='flex items-center gap-3'>
                    <span className='text-xs font-medium text-gray-400 w-20'>
                      {addr.network.toUpperCase()}
                    </span>
                    <code className='text-sm text-white font-mono'>
                      {addr.address.slice(0, 10)}...{addr.address.slice(-8)}
                    </code>
                  </div>
                  <div className='flex items-center gap-4'>
                    <div className='text-right'>
                      <p className='text-sm text-white'>{addr.cached_balance.toFixed(4)}</p>
                      {(addr.cached_usdt > 0 || addr.cached_usdc > 0) && (
                        <p className='text-xs text-green-400'>
                          ${(addr.cached_usdt + addr.cached_usdc).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(addr.address)
                        toast.success('Endereco copiado!')
                      }}
                      className='p-1.5 text-gray-400 hover:text-white'
                    >
                      <Copy className='w-4 h-4' />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className='text-center text-gray-400 py-4'>Nenhum endereco encontrado</p>
          )}
        </div>
      )}
    </div>
  )
}

// Pagina principal
export const AdminSystemWalletsPage: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const queryClient = useQueryClient()

  const {
    data: wallets,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['system-wallets'],
    queryFn: fetchWallets,
  })

  const { data: summary } = useQuery({
    queryKey: ['system-wallets-summary'],
    queryFn: fetchWalletsSummary,
  })

  return (
    <div className='p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2'>
            <Shield className='w-7 h-7 text-blue-500' />
            Carteiras do Sistema
          </h1>
          <p className='text-gray-500 dark:text-gray-400'>Gerencie carteiras COLD, HOT e FEES</p>
        </div>
        <div className='flex gap-3'>
          <a
            href='/admin/wallet-automation'
            className='flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-medium rounded-lg hover:from-yellow-600 hover:to-orange-600'
          >
            <Zap className='w-4 h-4' />
            Automação
          </a>
          <button
            onClick={() => refetch()}
            className='flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600'
          >
            <RefreshCw className='w-4 h-4' />
            Atualizar
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className='flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700'
          >
            <Plus className='w-4 h-4' />
            Nova Carteira
          </button>
        </div>
      </div>

      {/* Resumo */}
      {summary && (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <div className='bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2d2d44] rounded-xl p-4'>
            <p className='text-sm text-gray-500 dark:text-gray-400'>Total em Stables</p>
            <p className='text-2xl font-bold text-gray-900 dark:text-white'>
              ${summary.grand_total_stables_usd.toLocaleString()}
            </p>
          </div>
          <div className='bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2d2d44] rounded-xl p-4'>
            <div className='flex items-center gap-2 mb-1'>
              <Snowflake className='w-4 h-4 text-blue-500' />
              <p className='text-sm text-gray-500 dark:text-gray-400'>COLD</p>
            </div>
            <p className='text-xl font-bold text-blue-500'>
              ${summary.by_type.cold.total_stables.toLocaleString()}
            </p>
            <p className='text-xs text-gray-400'>{summary.by_type.cold.percentage}%</p>
          </div>
          <div className='bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2d2d44] rounded-xl p-4'>
            <div className='flex items-center gap-2 mb-1'>
              <Flame className='w-4 h-4 text-orange-500' />
              <p className='text-sm text-gray-500 dark:text-gray-400'>HOT</p>
            </div>
            <p className='text-xl font-bold text-orange-500'>
              ${summary.by_type.hot.total_stables.toLocaleString()}
            </p>
            <p className='text-xs text-gray-400'>{summary.by_type.hot.percentage}%</p>
          </div>
          <div className='bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2d2d44] rounded-xl p-4'>
            <div className='flex items-center gap-2 mb-1'>
              <DollarSign className='w-4 h-4 text-green-500' />
              <p className='text-sm text-gray-500 dark:text-gray-400'>FEES</p>
            </div>
            <p className='text-xl font-bold text-green-500'>
              ${summary.by_type.fees.total_stables.toLocaleString()}
            </p>
            <p className='text-xs text-gray-400'>{summary.by_type.fees.percentage}%</p>
          </div>
        </div>
      )}

      {/* Recomendacao */}
      {summary?.recommendation && summary.recommendation.status === 'warning' && (
        <div className='flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl'>
          <AlertTriangle className='w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5' />
          <div>
            <p className='text-yellow-200 font-medium'>Recomendacao</p>
            <p className='text-yellow-200/70 text-sm'>{summary.recommendation.message}</p>
          </div>
        </div>
      )}

      {/* Lista de carteiras */}
      <div className='space-y-4'>
        <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
          Carteiras ({wallets?.length || 0})
        </h2>

        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <RefreshCw className='w-8 h-8 text-gray-400 animate-spin' />
          </div>
        ) : wallets && wallets.length > 0 ? (
          <div className='space-y-3'>
            {wallets.map(wallet => (
              <WalletCard
                key={wallet.id}
                wallet={wallet}
                onRefresh={() => {
                  refetch()
                  queryClient.invalidateQueries({ queryKey: ['system-wallets-summary'] })
                }}
              />
            ))}
          </div>
        ) : (
          <div className='text-center py-12 bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2d2d44] rounded-xl'>
            <Wallet className='w-12 h-12 text-gray-400 mx-auto mb-4' />
            <p className='text-gray-500 dark:text-gray-400 mb-4'>Nenhuma carteira encontrada</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className='px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'
            >
              Criar primeira carteira
            </button>
          </div>
        )}
      </div>

      {/* Modal de criar */}
      <CreateWalletModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          refetch()
          queryClient.invalidateQueries({ queryKey: ['system-wallets-summary'] })
        }}
      />
    </div>
  )
}

export default AdminSystemWalletsPage
