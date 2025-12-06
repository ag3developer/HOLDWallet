import { useState, useEffect } from 'react'
import { Settings, Eye, EyeOff, Check, Bitcoin, Coins } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface NetworkPreferences {
  bitcoin: boolean
  ethereum: boolean
  polygon: boolean
  bsc: boolean
  tron: boolean
  base: boolean
  solana: boolean
  litecoin: boolean
  dogecoin: boolean
  cardano: boolean
  avalanche: boolean
  polkadot: boolean
  chainlink: boolean
  shiba: boolean
  xrp: boolean
}

export const SettingsPage = () => {
  const [showAllNetworks, setShowAllNetworks] = useState(true)
  const [networkPreferences, setNetworkPreferences] = useState<NetworkPreferences>({
    bitcoin: true,
    ethereum: true,
    polygon: true,
    bsc: true,
    tron: true,
    base: true,
    solana: true,
    litecoin: true,
    dogecoin: true,
    cardano: true,
    avalanche: true,
    polkadot: true,
    chainlink: true,
    shiba: true,
    xrp: true
  })

  // Carregar preferências do localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem('wallet_network_preferences')
    const savedShowAll = localStorage.getItem('wallet_show_all_networks')
    
    if (savedPreferences) {
      setNetworkPreferences(JSON.parse(savedPreferences))
    }
    if (savedShowAll !== null) {
      setShowAllNetworks(savedShowAll === 'true')
    }
  }, [])

  const handleToggleNetwork = (network: keyof NetworkPreferences) => {
    const newPreferences = {
      ...networkPreferences,
      [network]: !networkPreferences[network]
    }
    setNetworkPreferences(newPreferences)
    localStorage.setItem('wallet_network_preferences', JSON.stringify(newPreferences))
    toast.success(`Rede ${network.toUpperCase()} ${newPreferences[network] ? 'ativada' : 'desativada'}`, {
      duration: 2000,
      position: 'bottom-center',
    })
  }

  const handleToggleShowAll = () => {
    const newValue = !showAllNetworks
    setShowAllNetworks(newValue)
    localStorage.setItem('wallet_show_all_networks', newValue.toString())
    toast.success(newValue ? 'Mostrando todas as redes' : 'Mostrando apenas redes selecionadas', {
      duration: 2000,
      position: 'bottom-center',
    })
  }

  const handleSelectAll = () => {
    const allEnabled: NetworkPreferences = {
      bitcoin: true,
      ethereum: true,
      polygon: true,
      bsc: true,
      tron: true,
      base: true,
      solana: true,
      litecoin: true,
      dogecoin: true,
      cardano: true,
      avalanche: true,
      polkadot: true,
      chainlink: true,
      shiba: true,
      xrp: true
    }
    setNetworkPreferences(allEnabled)
    localStorage.setItem('wallet_network_preferences', JSON.stringify(allEnabled))
    toast.success('Todas as redes ativadas', {
      duration: 2000,
      position: 'bottom-center',
    })
  }

  const handleDeselectAll = () => {
    const allDisabled: NetworkPreferences = {
      bitcoin: false,
      ethereum: false,
      polygon: false,
      bsc: false,
      tron: false,
      base: false,
      solana: false,
      litecoin: false,
      dogecoin: false,
      cardano: false,
      avalanche: false,
      polkadot: false,
      chainlink: false,
      shiba: false,
      xrp: false
    }
    setNetworkPreferences(allDisabled)
    localStorage.setItem('wallet_network_preferences', JSON.stringify(allDisabled))
    toast.success('Todas as redes desativadas', {
      duration: 2000,
      position: 'bottom-center',
    })
  }

  const networks = [
    { key: 'bitcoin' as const, name: 'Bitcoin', symbol: 'BTC', icon: Bitcoin, color: 'from-orange-400 to-orange-600' },
    { key: 'ethereum' as const, name: 'Ethereum', symbol: 'ETH', icon: Coins, color: 'from-blue-400 to-purple-600', tokens: 'USDT, USDC, DAI, LINK' },
    { key: 'polygon' as const, name: 'Polygon', symbol: 'MATIC', icon: Coins, color: 'from-purple-400 to-purple-600', tokens: 'USDT, USDC, WETH' },
    { key: 'bsc' as const, name: 'BNB Smart Chain', symbol: 'BNB', icon: Coins, color: 'from-yellow-400 to-yellow-600', tokens: 'USDT, BUSD, CAKE' },
    { key: 'tron' as const, name: 'Tron', symbol: 'TRX', icon: Coins, color: 'from-red-400 to-red-600', tokens: 'USDT (TRC-20), USDC' },
    { key: 'base' as const, name: 'Base', symbol: 'BASE', icon: Coins, color: 'from-blue-500 to-blue-700', tokens: 'USDC, ETH' },
    { key: 'solana' as const, name: 'Solana', symbol: 'SOL', icon: Coins, color: 'from-purple-500 to-pink-500' },
    { key: 'litecoin' as const, name: 'Litecoin', symbol: 'LTC', icon: Coins, color: 'from-gray-400 to-gray-600' },
    { key: 'dogecoin' as const, name: 'Dogecoin', symbol: 'DOGE', icon: Coins, color: 'from-yellow-300 to-yellow-500' },
    { key: 'cardano' as const, name: 'Cardano', symbol: 'ADA', icon: Coins, color: 'from-blue-500 to-blue-700' },
    { key: 'avalanche' as const, name: 'Avalanche', symbol: 'AVAX', icon: Coins, color: 'from-red-500 to-red-700' },
    { key: 'polkadot' as const, name: 'Polkadot', symbol: 'DOT', icon: Coins, color: 'from-pink-500 to-pink-700' },
    { key: 'chainlink' as const, name: 'Chainlink', symbol: 'LINK', icon: Coins, color: 'from-blue-600 to-blue-800' },
    { key: 'shiba' as const, name: 'Shiba Inu', symbol: 'SHIB', icon: Coins, color: 'from-orange-500 to-red-500' },
    { key: 'xrp' as const, name: 'XRP (Ripple)', symbol: 'XRP', icon: Coins, color: 'from-gray-600 to-gray-800' }
  ]

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Toaster />
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Configurações de Carteira
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Personalize quais redes você deseja visualizar
          </p>
        </div>
      </div>

      {/* Show All Networks Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Modo de Visualização
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {showAllNetworks 
                ? 'Mostrando endereço multi geral para todas as redes' 
                : 'Mostrando apenas redes selecionadas abaixo'}
            </p>
          </div>
          <button
            onClick={handleToggleShowAll}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              showAllNetworks ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                showAllNetworks ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Network Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Redes Suportadas
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Selecione quais redes você deseja visualizar na sua carteira
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Selecionar Todas
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-3 py-2 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              Desmarcar Todas
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {networks.map((network) => (
            <div
              key={network.key}
              onClick={() => handleToggleNetwork(network.key)}
              className={`relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                networkPreferences[network.key]
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 bg-gradient-to-r ${network.color} rounded-xl flex items-center justify-center`}>
                  <network.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {network.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {network.symbol}
                  </p>
                </div>
              </div>
              
              {networkPreferences[network.key] && (
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
              💡 Sobre as Configurações
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• <strong>Modo Geral:</strong> Mostra um endereço multi para todas as redes EVM (ETH, MATIC, BNB, etc.)</li>
              <li>• <strong>Modo Customizado:</strong> Mostra apenas as redes que você selecionou</li>
              <li>• <strong>Endereços EVM:</strong> Ethereum, Polygon, BSC e Base compartilham o mesmo endereço</li>
              <li>• <strong>Redes Independentes:</strong> Bitcoin e Tron têm endereços únicos</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Token Standards Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Padrões de Tokens Suportados
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">ERC-20</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tokens na rede Ethereum
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">BEP-20</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tokens na BNB Smart Chain
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">TRC-20</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tokens na rede Tron
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Polygon (POL)</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tokens na rede Polygon
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Base</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tokens na rede Base (L2)
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Bitcoin</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              BTC nativo
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
