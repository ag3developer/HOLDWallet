import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  CopyIcon,
  CheckIcon,
  RefreshCwIcon,
  NetworkIcon,
  WalletIcon,
  ExternalLinkIcon,
} from 'lucide-react'
import { apiClient } from '@/services/api'

interface AddressData {
  address: string
  network: string
  cryptocurrency: string
  label: string
  cached_balance: number
  cached_balance_usd: number
  last_updated: string | null
}

// Cores e ícones por rede
const NETWORK_CONFIG: Record<string, { color: string; bgColor: string; explorer: string }> = {
  avalanche: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    explorer: 'https://snowtrace.io/address/',
  },
  base: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    explorer: 'https://basescan.org/address/',
  },
  bitcoin: {
    color: 'text-orange-500',
    bgColor: 'bg-orange-100',
    explorer: 'https://blockchair.com/bitcoin/address/',
  },
  bsc: {
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100',
    explorer: 'https://bscscan.com/address/',
  },
  cardano: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-100',
    explorer: 'https://cardanoscan.io/address/',
  },
  chainlink: {
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
    explorer: 'https://etherscan.io/address/',
  },
  dogecoin: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    explorer: 'https://blockchair.com/dogecoin/address/',
  },
  ethereum: {
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    explorer: 'https://etherscan.io/address/',
  },
  litecoin: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    explorer: 'https://blockchair.com/litecoin/address/',
  },
  multi: { color: 'text-purple-600', bgColor: 'bg-purple-100', explorer: '' },
  polkadot: {
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    explorer: 'https://polkadot.subscan.io/account/',
  },
  polygon: {
    color: 'text-purple-500',
    bgColor: 'bg-purple-100',
    explorer: 'https://polygonscan.com/address/',
  },
  shiba: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    explorer: 'https://etherscan.io/address/',
  },
  solana: {
    color: 'text-green-500',
    bgColor: 'bg-green-100',
    explorer: 'https://solscan.io/account/',
  },
  tron: {
    color: 'text-red-500',
    bgColor: 'bg-red-100',
    explorer: 'https://tronscan.org/#/address/',
  },
  xrp: { color: 'text-gray-700', bgColor: 'bg-gray-100', explorer: 'https://xrpscan.com/account/' },
}

export const AdminSystemWalletAddressesPage: React.FC = () => {
  const navigate = useNavigate()
  const [addresses, setAddresses] = useState<AddressData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadAddresses()
  }, [])

  const loadAddresses = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.get('/admin/system-blockchain-wallet/addresses')
      if (response.data.success) {
        setAddresses(response.data.data || [])
      }
    } catch (error: any) {
      console.error('Erro ao carregar endereços:', error)
      toast.error('Erro ao carregar endereços')
    } finally {
      setIsLoading(false)
    }
  }

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(address)
      toast.success('Endereço copiado!')
      setTimeout(() => setCopiedAddress(null), 2000)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  const openExplorer = (network: string, address: string) => {
    const config = NETWORK_CONFIG[network]
    if (config?.explorer) {
      window.open(`${config.explorer}${address}`, '_blank')
    }
  }

  const filteredAddresses =
    filter === 'all' ? addresses : addresses.filter(a => a.network === filter)

  const uniqueNetworks = [...new Set(addresses.map(a => a.network))]

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <RefreshCwIcon className='w-12 h-12 text-blue-600 animate-spin mx-auto mb-4' />
          <p className='text-gray-600 dark:text-gray-400'>Carregando endereços...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-8'>
      <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='flex items-center justify-between mb-8'>
          <div className='flex items-center gap-4'>
            <button
              onClick={() => navigate('/admin/system-wallet')}
              className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
              title='Voltar à carteira do sistema'
              aria-label='Voltar à carteira do sistema'
            >
              <ArrowLeftIcon className='w-5 h-5' />
            </button>
            <div>
              <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
                Endereços do Sistema
              </h1>
              <p className='text-gray-600 dark:text-gray-400'>
                {addresses.length} endereços em {uniqueNetworks.length} redes
              </p>
            </div>
          </div>
          <button
            onClick={loadAddresses}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
            title='Atualizar endereços'
            aria-label='Atualizar endereços'
          >
            <RefreshCwIcon className='w-5 h-5' />
          </button>
        </div>

        {/* Filtro por Rede */}
        <div className='mb-6'>
          <div className='flex flex-wrap gap-2'>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Todas ({addresses.length})
            </button>
            {uniqueNetworks.map(network => {
              const config = NETWORK_CONFIG[network] || {
                color: 'text-gray-600',
                bgColor: 'bg-gray-100',
              }
              return (
                <button
                  key={network}
                  onClick={() => setFilter(network)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === network
                      ? 'bg-blue-600 text-white'
                      : `${config.bgColor} dark:bg-gray-800 ${config.color} hover:opacity-80`
                  }`}
                >
                  {network.toUpperCase()}
                </button>
              )
            })}
          </div>
        </div>

        {/* Lista de Endereços */}
        <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden'>
          {filteredAddresses.length === 0 ? (
            <div className='text-center py-12'>
              <WalletIcon className='w-16 h-16 text-gray-300 mx-auto mb-4' />
              <p className='text-gray-500'>Nenhum endereço encontrado</p>
            </div>
          ) : (
            <div className='divide-y divide-gray-200 dark:divide-gray-700'>
              {filteredAddresses.map((addr, index) => {
                const config = NETWORK_CONFIG[addr.network] || {
                  color: 'text-gray-600',
                  bgColor: 'bg-gray-100',
                  explorer: '',
                }
                return (
                  <div
                    key={`${addr.network}-${addr.address}`}
                    className='p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'
                  >
                    <div className='flex items-start justify-between gap-4'>
                      {/* Info da Rede */}
                      <div className='flex items-center gap-3 min-w-0'>
                        <div
                          className={`w-10 h-10 ${config.bgColor} dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0`}
                        >
                          <NetworkIcon className={`w-5 h-5 ${config.color}`} />
                        </div>
                        <div className='min-w-0'>
                          <div className='flex items-center gap-2'>
                            <span className={`font-semibold ${config.color}`}>
                              {addr.network.toUpperCase()}
                            </span>
                            <span className='text-gray-500 text-sm'>({addr.cryptocurrency})</span>
                          </div>
                          <p className='text-xs text-gray-500 truncate max-w-[200px] sm:max-w-none'>
                            {addr.label}
                          </p>
                        </div>
                      </div>

                      {/* Saldo */}
                      <div className='text-right flex-shrink-0'>
                        <p className='font-mono font-semibold text-gray-900 dark:text-white'>
                          {addr.cached_balance.toFixed(8)} {addr.cryptocurrency}
                        </p>
                        {addr.cached_balance_usd > 0 && (
                          <p className='text-sm text-gray-500'>
                            ≈ ${addr.cached_balance_usd.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Endereço */}
                    <div className='mt-3 flex items-center gap-2'>
                      <code className='flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto'>
                        {addr.address}
                      </code>
                      <button
                        onClick={() => copyAddress(addr.address)}
                        className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0'
                        title='Copiar endereço'
                      >
                        {copiedAddress === addr.address ? (
                          <CheckIcon className='w-4 h-4 text-green-500' />
                        ) : (
                          <CopyIcon className='w-4 h-4 text-gray-400' />
                        )}
                      </button>
                      {config.explorer && (
                        <button
                          onClick={() => openExplorer(addr.network, addr.address)}
                          className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0'
                          title='Ver no explorer'
                        >
                          <ExternalLinkIcon className='w-4 h-4 text-gray-400' />
                        </button>
                      )}
                    </div>

                    {/* Última atualização */}
                    {addr.last_updated && (
                      <p className='mt-2 text-xs text-gray-400'>
                        Última atualização: {new Date(addr.last_updated).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Info */}
        <div className='mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4'>
          <p className='text-sm text-blue-700 dark:text-blue-300'>
            <strong>💡 Dica:</strong> Use estes endereços para receber as taxas e comissões da
            plataforma. As taxas coletadas nos trades P2P serão enviadas automaticamente para os
            endereços correspondentes.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AdminSystemWalletAddressesPage
