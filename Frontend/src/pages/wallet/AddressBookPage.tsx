import { useState, useEffect, ReactNode } from 'react'
import {
  BookUser,
  Plus,
  Search,
  Star,
  StarOff,
  Edit,
  Trash2,
  Copy,
  Building2,
  Wallet,
  User,
  MoreHorizontal,
  X,
  ArrowUpRight,
  Landmark,
  Briefcase,
  Shield,
  Lock,
  Users,
  FileText,
  CircleDot,
  Hexagon,
  Gem,
  Moon,
  Rainbow,
  ChevronDown,
  Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@/services/api'
import { CryptoIcon } from '@/components/CryptoIcon'

// Tipos
interface AddressBookEntry {
  id: number
  name: string
  address: string
  network: string
  wallet_type: string
  wallet_category: string
  wallet_info?: {
    name: string
    icon?: string
    color?: string
    category: string
  }
  memo?: string
  notes?: string
  is_favorite: boolean
  is_verified: boolean
  use_count: number
  last_used_at?: string
  created_at: string
  updated_at?: string
}

interface WalletTypeOption {
  value: string
  name: string
  icon?: string
  color?: string
  category: string
}

interface NetworkOption {
  value: string
  name: string
  symbol: string
}

// Mapeamento de ícones de exchanges/wallets usando lucide-react
const getWalletIcon = (walletType: string): ReactNode => {
  const iconClass = 'w-4 h-4'
  const icons: Record<string, { icon: ReactNode; color: string }> = {
    // Exchanges
    binance: { icon: <Landmark className={iconClass} />, color: 'text-yellow-500' },
    bitget: { icon: <Building2 className={iconClass} />, color: 'text-blue-500' },
    bybit: { icon: <Hexagon className={iconClass} />, color: 'text-orange-500' },
    coinbase: { icon: <CircleDot className={iconClass} />, color: 'text-blue-600' },
    kraken: { icon: <Gem className={iconClass} />, color: 'text-purple-500' },
    kucoin: { icon: <Landmark className={iconClass} />, color: 'text-green-500' },
    okx: { icon: <Hexagon className={iconClass} />, color: 'text-gray-800 dark:text-gray-200' },
    'gate.io': { icon: <Building2 className={iconClass} />, color: 'text-green-500' },
    huobi: { icon: <Landmark className={iconClass} />, color: 'text-blue-500' },
    mexc: { icon: <Building2 className={iconClass} />, color: 'text-green-500' },
    // Wallets
    metamask: { icon: <Hexagon className={iconClass} />, color: 'text-orange-500' },
    trust_wallet: { icon: <Shield className={iconClass} />, color: 'text-blue-500' },
    bitget_wallet: { icon: <Briefcase className={iconClass} />, color: 'text-blue-400' },
    phantom: { icon: <Gem className={iconClass} />, color: 'text-purple-400' },
    exodus: { icon: <Moon className={iconClass} />, color: 'text-purple-600' },
    ledger: { icon: <Lock className={iconClass} />, color: 'text-gray-700 dark:text-gray-300' },
    trezor: { icon: <Shield className={iconClass} />, color: 'text-green-600' },
    coinbase_wallet: { icon: <Wallet className={iconClass} />, color: 'text-blue-600' },
    rainbow: { icon: <Rainbow className={iconClass} />, color: 'text-pink-500' },
    // Personal
    personal: { icon: <User className={iconClass} />, color: 'text-green-500' },
    friend: { icon: <Users className={iconClass} />, color: 'text-blue-400' },
    business: {
      icon: <Briefcase className={iconClass} />,
      color: 'text-gray-600 dark:text-gray-300',
    },
    other: { icon: <FileText className={iconClass} />, color: 'text-gray-500' },
  }
  const iconData = icons[walletType] || icons.other
  if (!iconData) return <FileText className={iconClass} />
  return <span className={iconData.color}>{iconData.icon}</span>
}

// Mapeamento de categorias
const getCategoryInfo = (category: string) => {
  const categories: Record<string, { label: string; icon: JSX.Element; color: string }> = {
    exchange: {
      label: 'Exchange',
      icon: <Building2 className='w-4 h-4' />,
      color: 'text-blue-500',
    },
    wallet: { label: 'Wallet', icon: <Wallet className='w-4 h-4' />, color: 'text-purple-500' },
    personal: { label: 'Pessoal', icon: <User className='w-4 h-4' />, color: 'text-green-500' },
    other: { label: 'Outro', icon: <MoreHorizontal className='w-4 h-4' />, color: 'text-gray-500' },
  }
  return categories[category] || categories.other
}

export default function AddressBookPage() {
  // Estados
  const [entries, setEntries] = useState<AddressBookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterNetwork, setFilterNetwork] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<AddressBookEntry | null>(null)
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false)

  // Dados auxiliares
  const [walletTypes, setWalletTypes] = useState<{
    exchanges: WalletTypeOption[]
    wallets: WalletTypeOption[]
    personal: WalletTypeOption[]
    other: WalletTypeOption[]
  }>({ exchanges: [], wallets: [], personal: [], other: [] })
  const [networks, setNetworks] = useState<NetworkOption[]>([])

  // Estatísticas
  const [stats, setStats] = useState({
    total: 0,
    favorites_count: 0,
    exchanges_count: 0,
    wallets_count: 0,
  })

  // Formulário
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    network: 'polygon',
    wallet_type: 'other',
    memo: '',
    notes: '',
    is_favorite: false,
  })

  // Carregar dados iniciais
  useEffect(() => {
    loadAddressBook()
    loadWalletTypes()
    loadNetworks()
  }, [filterNetwork, filterCategory, showFavoritesOnly])

  const loadAddressBook = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterNetwork) params.append('network', filterNetwork)
      if (filterCategory) params.append('category', filterCategory)
      if (showFavoritesOnly) params.append('favorites_only', 'true')
      if (searchTerm) params.append('search', searchTerm)

      const response = await apiClient.get(`/address-book/?${params.toString()}`)
      setEntries(response.data.addresses)
      setStats({
        total: response.data.total,
        favorites_count: response.data.favorites_count,
        exchanges_count: response.data.exchanges_count,
        wallets_count: response.data.wallets_count,
      })
    } catch (error) {
      console.error('Erro ao carregar agenda:', error)
      toast.error('Erro ao carregar endereços')
    } finally {
      setLoading(false)
    }
  }

  const loadWalletTypes = async () => {
    try {
      const response = await apiClient.get('/address-book/types/list')
      setWalletTypes(response.data)
    } catch (error) {
      console.error('Erro ao carregar tipos:', error)
    }
  }

  const loadNetworks = async () => {
    try {
      const response = await apiClient.get('/address-book/networks/list')
      setNetworks(response.data.networks)
    } catch (error) {
      console.error('Erro ao carregar redes:', error)
    }
  }

  // Funções CRUD
  const handleAddEntry = async () => {
    try {
      if (!formData.name || !formData.address || !formData.network) {
        toast.error('Preencha os campos obrigatórios')
        return
      }

      await apiClient.post('/address-book/', formData)
      toast.success('Endereço adicionado com sucesso!')
      setShowAddModal(false)
      resetForm()
      loadAddressBook()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erro ao adicionar endereço')
    }
  }

  const handleUpdateEntry = async () => {
    if (!selectedEntry) return

    try {
      await apiClient.put(`/address-book/${selectedEntry.id}`, {
        name: formData.name,
        wallet_type: formData.wallet_type,
        memo: formData.memo,
        notes: formData.notes,
        is_favorite: formData.is_favorite,
      })
      toast.success('Endereço atualizado!')
      setShowEditModal(false)
      resetForm()
      loadAddressBook()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erro ao atualizar endereço')
    }
  }

  const handleDeleteEntry = async (entry: AddressBookEntry) => {
    if (!confirm(`Remover "${entry.name}" da agenda?`)) return

    try {
      await apiClient.delete(`/address-book/${entry.id}`)
      toast.success('Endereço removido')
      loadAddressBook()
    } catch (error) {
      toast.error('Erro ao remover endereço')
    }
  }

  const handleToggleFavorite = async (entry: AddressBookEntry) => {
    try {
      await apiClient.post(`/address-book/${entry.id}/favorite`)
      loadAddressBook()
    } catch (error) {
      toast.error('Erro ao atualizar favorito')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado!')
  }

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      network: 'polygon',
      wallet_type: 'other',
      memo: '',
      notes: '',
      is_favorite: false,
    })
    setSelectedEntry(null)
  }

  const openEditModal = (entry: AddressBookEntry) => {
    setSelectedEntry(entry)
    setFormData({
      name: entry.name,
      address: entry.address,
      network: entry.network,
      wallet_type: entry.wallet_type,
      memo: entry.memo || '',
      notes: entry.notes || '',
      is_favorite: entry.is_favorite,
    })
    setShowEditModal(true)
  }

  // Pesquisa com debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAddressBook()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Formatar endereço para exibição
  const formatAddress = (address: string) => {
    if (address.length <= 16) return address
    return `${address.slice(0, 8)}...${address.slice(-6)}`
  }

  // Filtrar entradas localmente
  const filteredEntries = entries.filter(entry => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        entry.name.toLowerCase().includes(search) || entry.address.toLowerCase().includes(search)
      )
    }
    return true
  })

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 pb-20'>
      {/* Header */}
      <div className='bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center'>
              <BookUser className='w-5 h-5 text-white' />
            </div>
            <div>
              <h1 className='text-xl font-bold text-gray-900 dark:text-white'>Agenda</h1>
              <p className='text-sm text-gray-500'>{stats.total} endereços salvos</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className='flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors'
          >
            <Plus className='w-4 h-4' />
            <span className='hidden sm:inline'>Adicionar</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className='grid grid-cols-4 gap-2 mb-4'>
          <div className='bg-gray-100 dark:bg-gray-700 rounded-lg p-2 text-center'>
            <p className='text-lg font-bold text-gray-900 dark:text-white'>{stats.total}</p>
            <p className='text-xs text-gray-500'>Total</p>
          </div>
          <div className='bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-2 text-center'>
            <p className='text-lg font-bold text-yellow-600 dark:text-yellow-400'>
              {stats.favorites_count}
            </p>
            <p className='text-xs text-gray-500'>Favoritos</p>
          </div>
          <div className='bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2 text-center'>
            <p className='text-lg font-bold text-blue-600 dark:text-blue-400'>
              {stats.exchanges_count}
            </p>
            <p className='text-xs text-gray-500'>Exchanges</p>
          </div>
          <div className='bg-purple-100 dark:bg-purple-900/30 rounded-lg p-2 text-center'>
            <p className='text-lg font-bold text-purple-600 dark:text-purple-400'>
              {stats.wallets_count}
            </p>
            <p className='text-xs text-gray-500'>Wallets</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className='space-y-3'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
            <input
              type='text'
              placeholder='Buscar por nome ou endereço...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-sm focus:ring-2 focus:ring-blue-500'
            />
          </div>

          <div className='flex gap-2 overflow-x-auto pb-1'>
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                showFavoritesOnly
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              <Star className='w-3.5 h-3.5' />
              Favoritos
            </button>

            <select
              value={filterNetwork}
              onChange={e => setFilterNetwork(e.target.value)}
              className='px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-medium border-0 focus:ring-2 focus:ring-blue-500'
            >
              <option value=''>Todas as redes</option>
              {networks.map(n => (
                <option key={n.value} value={n.value}>
                  {n.name}
                </option>
              ))}
            </select>

            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className='px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-medium border-0 focus:ring-2 focus:ring-blue-500'
            >
              <option value=''>Todas categorias</option>
              <option value='exchange'>Exchanges</option>
              <option value='wallet'>Wallets</option>
              <option value='personal'>Pessoal</option>
              <option value='other'>Outro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Endereços */}
      <div className='p-4 space-y-3'>
        {loading ? (
          <div className='flex items-center justify-center py-12'>
            <div className='w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin' />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className='text-center py-12'>
            <BookUser className='w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4' />
            <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
              Nenhum endereço encontrado
            </h3>
            <p className='text-sm text-gray-500 mb-4'>
              {searchTerm || filterNetwork || filterCategory
                ? 'Tente ajustar os filtros'
                : 'Adicione endereços para acessá-los rapidamente'}
            </p>
            {!searchTerm && !filterNetwork && !filterCategory && (
              <button
                onClick={() => setShowAddModal(true)}
                className='inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl'
              >
                <Plus className='w-4 h-4' />
                Adicionar Endereço
              </button>
            )}
          </div>
        ) : (
          filteredEntries.map(entry => {
            const categoryInfo = getCategoryInfo(entry.wallet_category)
            return (
              <div
                key={entry.id}
                className='bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700'
              >
                <div className='flex items-start justify-between'>
                  <div className='flex items-start gap-3 flex-1 min-w-0'>
                    {/* Ícone da Wallet/Exchange */}
                    <div className='w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-2xl flex-shrink-0'>
                      {getWalletIcon(entry.wallet_type)}
                    </div>

                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 mb-1'>
                        <h3 className='font-semibold text-gray-900 dark:text-white truncate'>
                          {entry.name}
                        </h3>
                        {entry.is_favorite && (
                          <Star className='w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0' />
                        )}
                      </div>

                      {/* Endereço */}
                      <div className='flex items-center gap-2 mb-2'>
                        <code className='text-xs text-gray-500 font-mono'>
                          {formatAddress(entry.address)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(entry.address)}
                          className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
                        >
                          <Copy className='w-3.5 h-3.5 text-gray-400' />
                        </button>
                      </div>

                      {/* Tags */}
                      <div className='flex items-center gap-2 flex-wrap'>
                        {/* Rede */}
                        <span className='inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs'>
                          <CryptoIcon symbol={entry.network} size={12} />
                          {entry.network.toUpperCase()}
                        </span>

                        {/* Categoria */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs ${categoryInfo?.color || 'text-gray-500'}`}
                        >
                          {categoryInfo?.icon}
                          {entry.wallet_info?.name || categoryInfo?.label || 'Outro'}
                        </span>

                        {/* Uso */}
                        {entry.use_count > 0 && (
                          <span className='inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full text-xs text-green-600 dark:text-green-400'>
                            <ArrowUpRight className='w-3 h-3' />
                            {entry.use_count}x
                          </span>
                        )}
                      </div>

                      {/* Memo/Notes */}
                      {(entry.memo || entry.notes) && (
                        <p className='text-xs text-gray-400 mt-2 truncate'>
                          {entry.memo || entry.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className='flex items-center gap-1 ml-2'>
                    <button
                      onClick={() => handleToggleFavorite(entry)}
                      className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
                    >
                      {entry.is_favorite ? (
                        <Star className='w-4 h-4 text-yellow-500 fill-yellow-500' />
                      ) : (
                        <StarOff className='w-4 h-4 text-gray-400' />
                      )}
                    </button>
                    <button
                      onClick={() => openEditModal(entry)}
                      className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
                    >
                      <Edit className='w-4 h-4 text-gray-400' />
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(entry)}
                      className='p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors'
                    >
                      <Trash2 className='w-4 h-4 text-red-400' />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal Adicionar */}
      {showAddModal && (
        <div className='fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto'>
            <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
              <div className='flex items-center justify-between'>
                <h2 className='text-lg font-bold text-gray-900 dark:text-white'>
                  Adicionar Endereço
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
            </div>

            <div className='p-4 space-y-4'>
              {/* Nome */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Nome / Apelido *
                </label>
                <input
                  type='text'
                  placeholder='Ex: Minha Binance, João, etc'
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className='w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 focus:ring-2 focus:ring-blue-500'
                />
              </div>

              {/* Endereço */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Endereço *
                </label>
                <input
                  type='text'
                  placeholder='0x... ou endereço da rede'
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className='w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 font-mono text-sm'
                />
              </div>

              {/* Rede */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Rede Blockchain *
                </label>
                <div className='relative'>
                  <button
                    type='button'
                    onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                    className='w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 flex items-center justify-between text-left'
                  >
                    <div className='flex items-center gap-3'>
                      <CryptoIcon symbol={formData.network} size={20} />
                      <span className='text-gray-900 dark:text-white'>
                        {networks.find(n => n.value === formData.network)?.name || 'Selecionar'} (
                        {networks.find(n => n.value === formData.network)?.symbol || ''})
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform ${showNetworkDropdown ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {showNetworkDropdown && (
                    <div className='absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto'>
                      {networks.map(n => (
                        <button
                          key={n.value}
                          type='button'
                          onClick={() => {
                            setFormData({ ...formData, network: n.value })
                            setShowNetworkDropdown(false)
                          }}
                          className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                            formData.network === n.value ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                          }`}
                        >
                          <CryptoIcon symbol={n.value} size={20} />
                          <span className='flex-1 text-left text-gray-900 dark:text-white'>
                            {n.name}
                          </span>
                          <span className='text-sm text-gray-500'>{n.symbol}</span>
                          {formData.network === n.value && (
                            <Check className='w-4 h-4 text-blue-500' />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tipo de Carteira */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Tipo de Destino
                </label>
                <select
                  value={formData.wallet_type}
                  onChange={e => setFormData({ ...formData, wallet_type: e.target.value })}
                  className='w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 focus:ring-2 focus:ring-blue-500'
                >
                  <optgroup label='— Exchanges —'>
                    {walletTypes.exchanges?.map(w => (
                      <option key={w.value} value={w.value}>
                        {w.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label='— Wallets —'>
                    {walletTypes.wallets?.map(w => (
                      <option key={w.value} value={w.value}>
                        {w.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label='— Pessoal —'>
                    {walletTypes.personal?.map(w => (
                      <option key={w.value} value={w.value}>
                        {w.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label='— Outro —'>
                    {walletTypes.other?.map(w => (
                      <option key={w.value} value={w.value}>
                        {w.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Memo */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Memo / Tag (opcional)
                </label>
                <input
                  type='text'
                  placeholder='Para XRP, BNB, etc'
                  value={formData.memo}
                  onChange={e => setFormData({ ...formData, memo: e.target.value })}
                  className='w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 focus:ring-2 focus:ring-blue-500'
                />
              </div>

              {/* Notas */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Notas (opcional)
                </label>
                <textarea
                  placeholder='Observações sobre este endereço...'
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className='w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 resize-none'
                />
              </div>

              {/* Favorito */}
              <label className='flex items-center gap-3 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={formData.is_favorite}
                  onChange={e => setFormData({ ...formData, is_favorite: e.target.checked })}
                  className='w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                />
                <span className='text-sm text-gray-700 dark:text-gray-300'>
                  Adicionar aos favoritos
                </span>
              </label>
            </div>

            <div className='p-4 border-t border-gray-200 dark:border-gray-700'>
              <button
                onClick={handleAddEntry}
                className='w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors'
              >
                Salvar Endereço
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {showEditModal && selectedEntry && (
        <div className='fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto'>
            <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
              <div className='flex items-center justify-between'>
                <h2 className='text-lg font-bold text-gray-900 dark:text-white'>Editar Endereço</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    resetForm()
                  }}
                  className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
            </div>

            <div className='p-4 space-y-4'>
              {/* Endereço (somente leitura) */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Endereço
                </label>
                <div className='flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl'>
                  <code className='text-sm font-mono text-gray-500 flex-1 truncate'>
                    {selectedEntry.address}
                  </code>
                  <button
                    onClick={() => copyToClipboard(selectedEntry.address)}
                    className='p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded'
                  >
                    <Copy className='w-4 h-4 text-gray-400' />
                  </button>
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Nome / Apelido
                </label>
                <input
                  type='text'
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className='w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 focus:ring-2 focus:ring-blue-500'
                />
              </div>

              {/* Tipo de Carteira */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Tipo de Destino
                </label>
                <select
                  value={formData.wallet_type}
                  onChange={e => setFormData({ ...formData, wallet_type: e.target.value })}
                  className='w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 focus:ring-2 focus:ring-blue-500'
                >
                  <optgroup label='— Exchanges —'>
                    {walletTypes.exchanges?.map(w => (
                      <option key={w.value} value={w.value}>
                        {w.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label='— Wallets —'>
                    {walletTypes.wallets?.map(w => (
                      <option key={w.value} value={w.value}>
                        {w.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label='— Pessoal —'>
                    {walletTypes.personal?.map(w => (
                      <option key={w.value} value={w.value}>
                        {w.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label='— Outro —'>
                    {walletTypes.other?.map(w => (
                      <option key={w.value} value={w.value}>
                        {w.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Memo */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Memo / Tag
                </label>
                <input
                  type='text'
                  value={formData.memo}
                  onChange={e => setFormData({ ...formData, memo: e.target.value })}
                  className='w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 focus:ring-2 focus:ring-blue-500'
                />
              </div>

              {/* Notas */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Notas
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className='w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 resize-none'
                />
              </div>

              {/* Favorito */}
              <label className='flex items-center gap-3 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={formData.is_favorite}
                  onChange={e => setFormData({ ...formData, is_favorite: e.target.checked })}
                  className='w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                />
                <span className='text-sm text-gray-700 dark:text-gray-300'>Favorito</span>
              </label>
            </div>

            <div className='p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3'>
              <button
                onClick={() => handleDeleteEntry(selectedEntry)}
                className='flex-1 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 font-medium rounded-xl transition-colors hover:bg-red-200 dark:hover:bg-red-900/50'
              >
                Excluir
              </button>
              <button
                onClick={handleUpdateEntry}
                className='flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors'
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
